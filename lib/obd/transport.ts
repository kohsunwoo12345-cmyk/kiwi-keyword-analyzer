import type { Transport, TransportKind } from './types'

/* -------------------------------------------------------------------------- */
/*  브라우저 하드웨어 API 최소 타입 정의 (전역 충돌을 피하려 로컬에 선언)        */
/* -------------------------------------------------------------------------- */

interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  getInfo?: () => { usbVendorId?: number; usbProductId?: number }
}
interface SerialLike {
  requestPort(): Promise<SerialPortLike>
}
function getSerial(): SerialLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as unknown as { serial?: SerialLike }).serial
}

interface BleCharacteristicLike {
  uuid: string
  properties: { write: boolean; writeWithoutResponse: boolean; notify: boolean }
  writeValueWithoutResponse?: (data: BufferSource) => Promise<void>
  writeValue?: (data: BufferSource) => Promise<void>
  startNotifications(): Promise<BleCharacteristicLike>
  addEventListener(type: 'characteristicvaluechanged', cb: (e: Event) => void): void
  value?: DataView
}
interface BleServiceLike {
  getCharacteristics(): Promise<BleCharacteristicLike[]>
}
interface BleServerLike {
  connect(): Promise<BleServerLike>
  disconnect(): void
  getPrimaryServices(): Promise<BleServiceLike[]>
}
interface BleDeviceLike {
  name?: string
  gatt?: BleServerLike
}
interface BluetoothLike {
  requestDevice(options: {
    acceptAllDevices?: boolean
    optionalServices?: (number | string)[]
  }): Promise<BleDeviceLike>
}
function getBluetooth(): BluetoothLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth
}

/* -------------------------------------------------------------------------- */
/*  Web Serial (USB) 트랜스포트 — 노트북에서 가장 안정적                        */
/* -------------------------------------------------------------------------- */

export class SerialTransport implements Transport {
  readonly kind: TransportKind = 'serial'
  private port: SerialPortLike | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private listeners = new Set<(chunk: string) => void>()
  private decoder = new TextDecoder()
  private encoder = new TextEncoder()
  private readLoopActive = false

  get connected(): boolean {
    return this.port !== null
  }

  async connect(): Promise<void> {
    const serial = getSerial()
    if (!serial) {
      throw new Error('이 브라우저는 Web Serial을 지원하지 않습니다. 데스크톱 크롬/엣지를 사용하세요.')
    }
    const port = await serial.requestPort()
    await port.open({ baudRate: 38400 })
    this.port = port
    if (port.writable) this.writer = port.writable.getWriter()
    this.startReadLoop()
  }

  private startReadLoop(): void {
    if (!this.port?.readable) return
    this.reader = this.port.readable.getReader()
    this.readLoopActive = true
    const pump = async () => {
      const reader = this.reader
      if (!reader) return
      try {
        while (this.readLoopActive) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) {
            const text = this.decoder.decode(value, { stream: true })
            for (const fn of this.listeners) fn(text)
          }
        }
      } catch {
        /* 연결 해제 시 read가 throw — 무시 */
      }
    }
    void pump()
  }

  async write(data: string): Promise<void> {
    if (!this.writer) throw new Error('직렬 포트 쓰기 채널이 없습니다.')
    await this.writer.write(this.encoder.encode(data))
  }

  onData(listener: (chunk: string) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async disconnect(): Promise<void> {
    this.readLoopActive = false
    this.listeners.clear()
    try {
      await this.reader?.cancel()
    } catch {
      /* noop */
    }
    try {
      this.reader?.releaseLock()
      this.writer?.releaseLock()
    } catch {
      /* noop */
    }
    try {
      await this.port?.close()
    } catch {
      /* noop */
    }
    this.reader = null
    this.writer = null
    this.port = null
  }

  label(): string {
    const info = this.port?.getInfo?.()
    if (info?.usbVendorId) {
      return `USB 직렬 어댑터 (VID ${info.usbVendorId.toString(16)})`
    }
    return 'USB 직렬 어댑터'
  }
}

/* -------------------------------------------------------------------------- */
/*  Web Bluetooth (BLE) 트랜스포트                                             */
/*  ※ 저가형 ELM327은 대부분 Bluetooth Classic(SPP)이라 브라우저에서 불가.     */
/*    BLE 4.0 기반 어댑터(예: Vgate iCar Pro BLE)만 동작한다.                  */
/* -------------------------------------------------------------------------- */

// 16비트 UUID → 128비트 풀 UUID
const u16 = (x: number) => `0000${x.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`

// 흔한 ELM327 BLE 서비스 UUID 후보
const BLE_SERVICE_CANDIDATES = [u16(0xfff0), u16(0xffe0), u16(0xffe5), '6e400001-b5a3-f393-e0a9-e50e24dcca9e']

export class BluetoothTransport implements Transport {
  readonly kind: TransportKind = 'bluetooth'
  private device: BleDeviceLike | null = null
  private server: BleServerLike | null = null
  private writeChar: BleCharacteristicLike | null = null
  private listeners = new Set<(chunk: string) => void>()
  private decoder = new TextDecoder()
  private encoder = new TextEncoder()

  get connected(): boolean {
    return this.server !== null
  }

  async connect(): Promise<void> {
    const bt = getBluetooth()
    if (!bt) {
      throw new Error('이 브라우저는 Web Bluetooth를 지원하지 않습니다. (BLE 방식 ELM327만 가능)')
    }
    const device = await bt.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_SERVICE_CANDIDATES,
    })
    if (!device.gatt) throw new Error('선택한 장치에 GATT 서버가 없습니다.')
    this.device = device
    this.server = await device.gatt.connect()

    // 쓰기 채널 + 알림(notify) 채널 탐색
    const services = await this.server.getPrimaryServices()
    let notifyChar: BleCharacteristicLike | null = null
    for (const svc of services) {
      const chars = await svc.getCharacteristics()
      for (const c of chars) {
        if (!this.writeChar && (c.properties.write || c.properties.writeWithoutResponse)) {
          this.writeChar = c
        }
        if (!notifyChar && c.properties.notify) {
          notifyChar = c
        }
      }
    }
    if (!this.writeChar || !notifyChar) {
      throw new Error('호환되는 ELM327 BLE 특성을 찾지 못했습니다. (SPP 전용 어댑터일 수 있음)')
    }
    await notifyChar.startNotifications()
    notifyChar.addEventListener('characteristicvaluechanged', (e: Event) => {
      const target = e.target as unknown as { value?: DataView }
      if (target.value) {
        const text = this.decoder.decode(target.value)
        for (const fn of this.listeners) fn(text)
      }
    })
  }

  async write(data: string): Promise<void> {
    if (!this.writeChar) throw new Error('BLE 쓰기 특성이 없습니다.')
    const bytes = this.encoder.encode(data)
    if (this.writeChar.writeValueWithoutResponse) {
      await this.writeChar.writeValueWithoutResponse(bytes)
    } else if (this.writeChar.writeValue) {
      await this.writeChar.writeValue(bytes)
    }
  }

  onData(listener: (chunk: string) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async disconnect(): Promise<void> {
    this.listeners.clear()
    try {
      this.server?.disconnect()
    } catch {
      /* noop */
    }
    this.server = null
    this.writeChar = null
    this.device = null
  }

  label(): string {
    return this.device?.name ? `BLE: ${this.device.name}` : 'BLE ELM327 어댑터'
  }
}

/** 브라우저의 하드웨어 통신 지원 여부 */
export function transportSupport(): { serial: boolean; bluetooth: boolean } {
  return {
    serial: !!getSerial(),
    bluetooth: !!getBluetooth(),
  }
}
