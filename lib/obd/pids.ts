import type { PidDef } from './types'

/**
 * 실시간으로 폴링할 표준 OBD-II Mode 01 PID 목록.
 * 차량이 지원하지 않는 PID는 연결 후 자동으로 비활성화된다.
 */
export const PID_LIST: PidDef[] = [
  { id: 'rpm',        mode: 0x01, pid: 0x0c, name: '엔진 회전수', unit: 'rpm', min: 0, max: 12000, bytes: 2, decode: d => (d[0] * 256 + d[1]) / 4 },
  { id: 'speed',      mode: 0x01, pid: 0x0d, name: '차속',        unit: 'km/h', min: 0, max: 220, bytes: 1, decode: d => d[0] },
  { id: 'coolant',    mode: 0x01, pid: 0x05, name: '냉각수 온도', unit: '°C', min: -40, max: 150, bytes: 1, decode: d => d[0] - 40, warnAbove: 110 },
  { id: 'throttle',   mode: 0x01, pid: 0x11, name: '스로틀',      unit: '%', min: 0, max: 100, bytes: 1, decode: d => (d[0] * 100) / 255 },
  { id: 'load',       mode: 0x01, pid: 0x04, name: '엔진 부하',   unit: '%', min: 0, max: 100, bytes: 1, decode: d => (d[0] * 100) / 255 },
  { id: 'voltage',    mode: 0x01, pid: 0x42, name: '제어모듈 전압', unit: 'V', min: 0, max: 16, bytes: 2, decode: d => (d[0] * 256 + d[1]) / 1000 },
  { id: 'intakeTemp', mode: 0x01, pid: 0x0f, name: '흡기 온도',   unit: '°C', min: -40, max: 120, bytes: 1, decode: d => d[0] - 40 },
  { id: 'maf',        mode: 0x01, pid: 0x10, name: '공기 유량',   unit: 'g/s', min: 0, max: 200, bytes: 2, decode: d => (d[0] * 256 + d[1]) / 100 },
  { id: 'map',        mode: 0x01, pid: 0x0b, name: '흡기압(MAP)', unit: 'kPa', min: 0, max: 255, bytes: 1, decode: d => d[0] },
  { id: 'timing',     mode: 0x01, pid: 0x0e, name: '점화시기',    unit: '°', min: -64, max: 64, bytes: 1, decode: d => d[0] / 2 - 64 },
  { id: 'fuelLevel',  mode: 0x01, pid: 0x2f, name: '연료 잔량',   unit: '%', min: 0, max: 100, bytes: 1, decode: d => (d[0] * 100) / 255 },
  { id: 'oilTemp',    mode: 0x01, pid: 0x5c, name: '엔진 오일 온도', unit: '°C', min: -40, max: 210, bytes: 1, decode: d => d[0] - 40, warnAbove: 130 },
]

/** 주행거리 관련 PID (표준 지원이 드묾 — 특히 오토바이) */
export const MILEAGE_PIDS = {
  /** DTC 삭제 후 주행거리 (Mode 01 PID 31) */
  distanceSinceCleared: { mode: 0x01, pid: 0x31, bytes: 2, decode: (d: number[]) => d[0] * 256 + d[1] },
  /** 누적 주행거리 / 적산거리 (Mode 01 PID A6, 신형 규격 — 대부분 미지원) */
  odometer: { mode: 0x01, pid: 0xa6, bytes: 4, decode: (d: number[]) => (d[0] * 16777216 + d[1] * 65536 + d[2] * 256 + d[3]) / 10 },
}

/** 자주 보이는 고장코드 한글 설명 (일부) */
const DTC_DESCRIPTIONS: Record<string, string> = {
  P0100: '공기 유량 센서(MAF) 회로 이상',
  P0105: '흡기압 센서(MAP) 회로 이상',
  P0110: '흡기 온도 센서 회로 이상',
  P0115: '냉각수 온도 센서 회로 이상',
  P0120: '스로틀 포지션 센서 회로 이상',
  P0130: '산소(O2) 센서 회로 이상 (뱅크1 센서1)',
  P0135: '산소 센서 히터 회로 이상 (뱅크1 센서1)',
  P0171: '연료 시스템 희박 (뱅크1)',
  P0172: '연료 시스템 농후 (뱅크1)',
  P0201: '인젝터 회로 이상 - 1번 실린더',
  P0202: '인젝터 회로 이상 - 2번 실린더',
  P0220: '스로틀 포지션 센서 B 회로 이상',
  P0300: '다중 실린더 실화 감지',
  P0301: '1번 실린더 실화 감지',
  P0302: '2번 실린더 실화 감지',
  P0303: '3번 실린더 실화 감지',
  P0304: '4번 실린더 실화 감지',
  P0335: '크랭크축 위치 센서 회로 이상',
  P0340: '캠축 위치 센서 회로 이상',
  P0420: '촉매 효율 저하 (뱅크1)',
  P0500: '차속 센서 이상',
  P0505: '공회전 제어 시스템 이상',
  P0560: '시스템 전압 이상',
  P0562: '시스템 전압 낮음',
  P0563: '시스템 전압 높음',
  P0601: 'ECU 내부 메모리 체크섬 오류',
  P0650: '경고등(MIL) 제어 회로 이상',
  P1000: 'OBD 모니터 준비 미완료',
  C0000: '섀시 계통 일반 고장',
  B0000: '바디 계통 일반 고장',
  U0001: 'CAN 통신 버스 이상',
  U0100: 'ECU와의 통신 두절',
}

/** 코드 접두 문자에 따른 계통 분류 */
function categoryOf(code: string): string {
  switch (code[0]) {
    case 'P': return '파워트레인(엔진/변속)'
    case 'C': return '섀시(제동/조향)'
    case 'B': return '바디(전장)'
    case 'U': return '네트워크(통신)'
    default: return '알 수 없음'
  }
}

/** 고장코드 설명 조회. 등록되지 않은 코드는 계통 기반 일반 설명을 반환 */
export function dtcDescription(code: string): string {
  return DTC_DESCRIPTIONS[code] ?? `${categoryOf(code)} 고장코드 (제조사 정비 자료 참고 필요)`
}

/** 게이지/표 표시용 값 포맷 (단위에 따라 정수/소수 자동) */
export function formatValue(v: number, unit: string): string {
  const intUnits = ['rpm', 'km/h', 'kPa']
  if (intUnits.includes(unit)) return Math.round(v).toLocaleString('ko-KR')
  return (Math.round(v * 10) / 10).toString()
}
