import type { Transport } from './types'

const PROMPT = '>'

function hex2(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, '0')
}

/** ELM327 에러/무응답 문자열 판별 */
function isNoData(resp: string): boolean {
  const r = resp.toUpperCase()
  return (
    r.includes('NO DATA') ||
    r.includes('UNABLE TO CONNECT') ||
    r.includes('STOPPED') ||
    r.includes('CAN ERROR') ||
    r.includes('BUFFER FULL') ||
    r.includes('BUS INIT') && r.includes('ERROR') ||
    /^\s*\?\s*$/.test(r)
  )
}

/**
 * PID 응답에서 데이터 바이트 배열을 추출.
 * 헤더 off(ATH0), 단일 ECU 응답 기준. 예) "41 0C 1A F8" → [0x1A, 0xF8]
 */
export function parsePidResponse(resp: string, mode: number, pid: number): number[] | null {
  const cleaned = resp.toUpperCase().replace(/SEARCHING\.\.\./g, '').replace(/[\r\n]/g, ' ')
  if (isNoData(cleaned)) return null

  const respMode = hex2(mode + 0x40)
  const pidHex = hex2(pid)
  const compact = cleaned.replace(/\s+/g, '')
  const marker = respMode + pidHex
  const idx = compact.indexOf(marker)
  if (idx < 0) return null

  const after = compact.slice(idx + marker.length)
  const bytes: number[] = []
  for (let k = 0; k + 1 < after.length; k += 2) {
    const b = parseInt(after.slice(k, k + 2), 16)
    if (Number.isNaN(b)) break
    bytes.push(b)
  }
  return bytes.length ? bytes : null
}

/** Mode 03 응답 → 고장코드 문자열 배열 */
export function parseDtcResponse(resp: string): string[] {
  const cleaned = resp.toUpperCase().replace(/SEARCHING\.\.\./g, '').replace(/[\r\n]/g, ' ')
  if (isNoData(cleaned)) return []
  const compact = cleaned.replace(/\s+/g, '')
  const idx = compact.indexOf('43')
  if (idx < 0) return []

  const after = compact.slice(idx + 2)
  const codes: string[] = []
  for (let k = 0; k + 3 < after.length; k += 4) {
    const a = parseInt(after.slice(k, k + 2), 16)
    const b = parseInt(after.slice(k + 2, k + 4), 16)
    if (Number.isNaN(a) || Number.isNaN(b)) break
    if (a === 0 && b === 0) continue
    codes.push(decodeDtc(a, b))
  }
  return Array.from(new Set(codes))
}

/** 2바이트 → 표준 고장코드 문자열 (예: 0x03,0x01 → "P0301") */
export function decodeDtc(a: number, b: number): string {
  const letters = ['P', 'C', 'B', 'U']
  const letter = letters[(a >> 6) & 0x03]
  const d1 = (a >> 4) & 0x03
  const d2 = a & 0x0f
  const d3 = (b >> 4) & 0x0f
  const d4 = b & 0x0f
  return `${letter}${d1}${d2.toString(16).toUpperCase()}${d3.toString(16).toUpperCase()}${d4.toString(16).toUpperCase()}`
}

interface Waiter {
  resolve: (s: string) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * ELM327 명령 클라이언트.
 * - 어댑터는 반이중(half-duplex)이라 명령을 직렬화(큐)해서 보낸다.
 * - 각 응답은 '>' 프롬프트로 끝난다.
 */
export class Elm327Client {
  private transport: Transport
  private buffer = ''
  private waiter: Waiter | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private unsub: (() => void) | null = null

  constructor(transport: Transport) {
    this.transport = transport
  }

  get connected(): boolean {
    return this.transport.connected
  }

  label(): string {
    return this.transport.label()
  }

  async open(): Promise<void> {
    await this.transport.connect()
    this.unsub = this.transport.onData(chunk => this.onChunk(chunk))
  }

  async close(): Promise<void> {
    this.unsub?.()
    this.unsub = null
    await this.transport.disconnect()
  }

  private onChunk(chunk: string): void {
    this.buffer += chunk
    const idx = this.buffer.indexOf(PROMPT)
    if (idx >= 0 && this.waiter) {
      const text = this.buffer.slice(0, idx)
      this.buffer = this.buffer.slice(idx + 1)
      const w = this.waiter
      this.waiter = null
      clearTimeout(w.timer)
      w.resolve(text.trim())
    }
  }

  /** raw 명령 전송 후 프롬프트까지의 응답 문자열 반환 (큐를 통해 직렬화) */
  send(cmd: string, timeoutMs = 5000): Promise<string> {
    const run = () =>
      new Promise<string>((resolve, reject) => {
        this.buffer = ''
        const timer = setTimeout(() => {
          this.waiter = null
          reject(new Error(`응답 시간 초과: ${cmd}`))
        }, timeoutMs)
        this.waiter = { resolve, reject, timer }
        this.transport.write(cmd + '\r').catch(err => {
          if (this.waiter) {
            clearTimeout(this.waiter.timer)
            this.waiter = null
          }
          reject(err instanceof Error ? err : new Error(String(err)))
        })
      })
    const next = this.queue.then(run, run)
    // 큐 체인이 거부로 멈추지 않도록 흡수
    this.queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  /** 초기화 시퀀스: 에코/개행/스페이스 off, 헤더 off, 자동 프로토콜 */
  async initialize(): Promise<void> {
    await this.send('ATZ', 6000) // reset
    await this.send('ATE0') // echo off
    await this.send('ATL0') // linefeed off
    await this.send('ATS0') // spaces off
    await this.send('ATH0') // headers off
    await this.send('ATSP0') // auto protocol
    // 통신 깨우기 (실패해도 무시)
    try {
      await this.send('0100', 8000)
    } catch {
      /* 일부 어댑터/차량은 첫 시도에서 실패할 수 있음 */
    }
  }

  /** 어댑터 식별 문자열 (예: "ELM327 v1.5") */
  async readAdapterId(): Promise<string | null> {
    try {
      const r = await this.send('ATI')
      const line = r.replace(/[\r\n]+/g, ' ').trim()
      return line || null
    } catch {
      return null
    }
  }

  /** 현재 사용 중인 통신 프로토콜 설명 */
  async readProtocol(): Promise<string | null> {
    try {
      const r = await this.send('ATDP')
      const line = r.replace(/[\r\n]+/g, ' ').trim()
      return line || null
    } catch {
      return null
    }
  }

  /** 어댑터가 읽은 차량 배터리 전압 (예: "12.4V") */
  async readVoltage(): Promise<string | null> {
    try {
      const r = await this.send('ATRV')
      const line = r.replace(/[\r\n]+/g, ' ').trim()
      return line || null
    } catch {
      return null
    }
  }

  /** PID 조회 → 데이터 바이트 배열 (미지원/무응답 시 null) */
  async query(mode: number, pid: number, timeoutMs = 3000): Promise<number[] | null> {
    const cmd = hex2(mode) + hex2(pid)
    const resp = await this.send(cmd, timeoutMs)
    return parsePidResponse(resp, mode, pid)
  }

  /** 저장된 고장코드 읽기 (Mode 03) */
  async readDtcs(): Promise<string[]> {
    const resp = await this.send('03', 5000)
    return parseDtcResponse(resp)
  }

  /** 대기(pending) 고장코드 읽기 (Mode 07) */
  async readPendingDtcs(): Promise<string[]> {
    const resp = await this.send('07', 5000)
    return parseDtcResponse(resp)
  }

  /** 고장코드 및 경고등 삭제 (Mode 04) */
  async clearDtcs(): Promise<void> {
    await this.send('04', 5000)
  }
}
