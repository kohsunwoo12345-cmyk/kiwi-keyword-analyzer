import type { Transport, TransportKind } from './types'

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).toUpperCase().padStart(2, '0')
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const noise = () => Math.random() - 0.5

/**
 * 데모(시뮬레이션) 트랜스포트.
 * 실제 ELM327 어댑터를 프로토콜 수준에서 흉내 낸다 — 명령을 받으면
 * 살아있는 엔진처럼 변화하는 가짜 데이터를 '>' 프롬프트와 함께 돌려준다.
 * 덕분에 어댑터가 없어도 전체 UI/로직을 실제와 동일한 경로로 시험할 수 있다.
 */
export class DemoTransport implements Transport {
  readonly kind: TransportKind = 'demo'
  private listeners = new Set<(chunk: string) => void>()
  private _connected = false
  private startedAt = 0
  private dtcsCleared = false

  get connected(): boolean {
    return this._connected
  }

  async connect(): Promise<void> {
    this._connected = true
    this.startedAt = Date.now()
    this.dtcsCleared = false
  }

  async disconnect(): Promise<void> {
    this._connected = false
    this.listeners.clear()
  }

  onData(listener: (chunk: string) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async write(data: string): Promise<void> {
    const cmd = data.trim().toUpperCase()
    const response = this.respond(cmd)
    // 어댑터 응답 지연 흉내
    setTimeout(() => {
      for (const fn of this.listeners) fn(`${response}\r\r>`)
    }, 25 + Math.random() * 35)
  }

  label(): string {
    return '데모 시뮬레이터 (가상 차량)'
  }

  private get elapsed(): number {
    return (Date.now() - this.startedAt) / 1000
  }

  private respond(cmd: string): string {
    // AT (어댑터 설정) 명령
    if (cmd === 'ATZ' || cmd === 'ATI') return 'ELM327 v1.5'
    if (cmd === 'ATDP') return 'AUTO, ISO 15765-4 (CAN 11/500)'
    if (cmd === 'ATRV') return `${(14.1 + noise() * 0.2).toFixed(1)}V`
    if (cmd.startsWith('AT')) return 'OK'

    // Mode 03 — 저장된 고장코드
    if (cmd === '03') {
      if (this.dtcsCleared) return '43 00'
      // P0301(1번 실린더 실화), P0420(촉매 효율 저하)
      return '43 03 01 04 20'
    }
    // Mode 07 — 대기 고장코드
    if (cmd === '07') {
      return this.dtcsCleared ? '47 00' : '47 01 71'
    }
    // Mode 04 — 코드 삭제
    if (cmd === '04') {
      this.dtcsCleared = true
      return '44'
    }
    // Mode 01 — 실시간 데이터
    if (cmd.startsWith('01') && cmd.length >= 4) {
      const pid = parseInt(cmd.slice(2, 4), 16)
      return this.livePid(pid)
    }
    return 'NO DATA'
  }

  private livePid(pid: number): string {
    const t = this.elapsed
    const rev = Math.sin(t * 0.8) * 0.5 + 0.5 // 0..1, 천천히 출렁이는 회전수
    const warm = Math.min(t, 120) / 120 // 워밍업 진행도

    const frame = (data: number[]) => ['41', hex2(pid), ...data.map(hex2)].join(' ')

    switch (pid) {
      case 0x00: // 지원 PID 비트마스크 (통신 깨우기용)
        return '41 00 BE 3F A8 13'
      case 0x0c: { // RPM
        const rpm = clamp(1150 + rev * 3400 + noise() * 120, 800, 9000)
        const raw = Math.round(rpm * 4)
        return frame([raw >> 8, raw & 0xff])
      }
      case 0x0d: // 차속
        return frame([clamp(rev * 64 + noise() * 2, 0, 120)])
      case 0x05: // 냉각수
        return frame([clamp(24 + warm * 64 + noise(), 20, 105) + 40])
      case 0x0f: // 흡기온도
        return frame([clamp(26 + warm * 12 + noise(), 20, 45) + 40])
      case 0x11: // 스로틀
        return frame([clamp(8 + rev * 70 + noise() * 3, 0, 100) * 2.55])
      case 0x04: // 엔진 부하
        return frame([clamp(15 + rev * 70 + noise() * 3, 0, 100) * 2.55])
      case 0x42: { // 전압
        const raw = Math.round(clamp(14.1 + noise() * 0.15, 12, 14.8) * 1000)
        return frame([raw >> 8, raw & 0xff])
      }
      case 0x10: { // MAF
        const raw = Math.round(clamp(2 + rev * 40 + noise(), 0, 120) * 100)
        return frame([raw >> 8, raw & 0xff])
      }
      case 0x0b: // MAP
        return frame([clamp(28 + rev * 70 + noise() * 2, 20, 105)])
      case 0x0e: // 점화시기
        return frame([clamp((8 + rev * 22 + noise() * 2 + 64) * 2, 0, 255)])
      case 0x2f: // 연료 잔량
        return frame([clamp(72 - t * 0.02, 5, 100) * 2.55])
      case 0x5c: // 오일 온도
        return frame([clamp(30 + warm * 64 + noise(), 20, 120) + 40])
      case 0x31: // DTC 삭제 후 주행거리
        return frame([137 >> 8, 137 & 0xff])
      // 0xA6(적산거리)는 일부러 미지원 — 오토바이 현실 반영
      default:
        return 'NO DATA'
    }
  }
}
