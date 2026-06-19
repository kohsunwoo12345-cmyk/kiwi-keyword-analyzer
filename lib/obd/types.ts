// OBD-II 진단 도메인 타입 정의

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export type TransportKind = 'serial' | 'bluetooth' | 'demo'

/**
 * 어댑터(ELM327)와의 물리 통신 계층 추상화.
 * Web Serial(USB), Web Bluetooth(BLE), 데모 시뮬레이터가 모두 이 인터페이스를 구현한다.
 */
export interface Transport {
  readonly kind: TransportKind
  /** 장치 연결 (사용자 권한 요청 포함) */
  connect(): Promise<void>
  /** 연결 해제 */
  disconnect(): Promise<void>
  /** 어댑터로 명령 문자열 전송 (개행 포함된 raw 문자열) */
  write(data: string): Promise<void>
  /** 수신 데이터 리스너 등록. 해제 함수를 반환한다. */
  onData(listener: (chunk: string) => void): () => void
  /** 현재 연결 여부 */
  readonly connected: boolean
  /** 연결된 장치에 대한 사람이 읽을 수 있는 설명 */
  label(): string
}

/** 실시간 데이터 PID 정의 */
export interface PidDef {
  id: string
  mode: number
  pid: number
  /** 한글 표시명 */
  name: string
  unit: string
  min: number
  max: number
  /** 디코딩에 필요한 최소 데이터 바이트 수 */
  bytes: number
  /** 원시 데이터 바이트 배열 → 실제 값 */
  decode: (d: number[]) => number
  /** 이 값 이상이면 경고 표시 (선택) */
  warnAbove?: number
}

/** 한 시점의 실시간 측정값 모음 (pidId → 값) */
export type LiveSample = Record<string, number>

/** 고장코드 */
export interface Dtc {
  code: string
  description: string
  status: 'stored' | 'pending' | 'permanent'
}

/** 로그 한 줄 (타임스탬프 + 측정값) */
export interface LogRow {
  t: number
  values: LiveSample
}

/** 연결 후 수집한 차량/어댑터 정보 */
export interface AdapterInfo {
  adapter: string | null
  protocol: string | null
  voltage: string | null
}
