// 문자·알림톡 발송 요금 (_ 프리픽스 = 라우팅 제외, import 전용)
//
// 정책
//  · 발송 비용은 "포인트" 로 나간다. AI 생성에 쓰는 크레딧과는 완전히 별개다.
//  · 회원 청구 단가 = 알리고 기준 단가 × 배수(기본 2배).
//  · 1 포인트 = 1 원 기준.
//
// 알리고 기준 단가는 알리고 정책이 바뀌면 달라지므로 코드에 못 박지 않고
// settings 에 두어 관리자 화면에서 고칠 수 있게 한다. 아래 값은 초기 기본값이다.
import { getSetting, setSetting } from './_utils'

export type MsgKind = 'sms' | 'lms' | 'mms' | 'alimtalk'

/** 알리고 기준 단가(원/건) 초기 기본값 — 관리자 화면에서 수정 가능 */
export const DEFAULT_BASE_KRW: Record<MsgKind, number> = {
  sms: 8.4,      // 단문 90byte
  lms: 25.7,     // 장문 2000byte
  mms: 79.2,     // 사진
  alimtalk: 6.5, // 카카오 알림톡
}
/** 회원 청구 배수 — 알리고 단가의 몇 배로 받을지 */
export const DEFAULT_MULTIPLIER = 2

const SETTING_BASE = 'msg_base_krw'
const SETTING_MULT = 'msg_rate_multiplier'

export interface MsgRates {
  base: Record<MsgKind, number>   // 알리고 기준 단가(원)
  multiplier: number              // 배수
  charge: Record<MsgKind, number> // 실제 청구 포인트/건 (= base × multiplier, 올림)
}

const KINDS: MsgKind[] = ['sms', 'lms', 'mms', 'alimtalk']

function normBase(raw: any): Record<MsgKind, number> {
  const out = { ...DEFAULT_BASE_KRW }
  if (raw && typeof raw === 'object') {
    for (const k of KINDS) {
      const v = Number(raw[k])
      if (Number.isFinite(v) && v >= 0 && v <= 100000) out[k] = v
    }
  }
  return out
}

/** 현재 요금표를 읽는다. 설정이 없으면 기본값. */
export async function getMsgRates(db: D1Database): Promise<MsgRates> {
  let base = { ...DEFAULT_BASE_KRW }
  let multiplier = DEFAULT_MULTIPLIER
  try {
    const rawBase = await getSetting(db, SETTING_BASE)
    if (rawBase) base = normBase(JSON.parse(rawBase))
  } catch { /* 잘못된 값이면 기본값 */ }
  try {
    const rawMult = await getSetting(db, SETTING_MULT)
    const m = Number(rawMult)
    if (Number.isFinite(m) && m > 0 && m <= 100) multiplier = m
  } catch { /* 기본값 */ }
  const charge = {} as Record<MsgKind, number>
  // 포인트는 정수다 — 올림해서 원가 밑으로 내려가지 않게 한다.
  for (const k of KINDS) charge[k] = Math.max(1, Math.ceil(base[k] * multiplier))
  return { base, multiplier, charge }
}

export async function setMsgRates(db: D1Database, o: { base?: any; multiplier?: any }): Promise<MsgRates> {
  if (o.base !== undefined) await setSetting(db, SETTING_BASE, JSON.stringify(normBase(o.base)))
  if (o.multiplier !== undefined) {
    const m = Number(o.multiplier)
    if (Number.isFinite(m) && m > 0 && m <= 100) await setSetting(db, SETTING_MULT, String(m))
  }
  return getMsgRates(db)
}

/** 한글 2byte 기준 바이트 길이 — SMS/LMS 판정 (알리고와 같은 기준) */
export function byteLen(s: string): number {
  let n = 0
  for (const ch of String(s || '')) n += ch.charCodeAt(0) > 0x7f ? 2 : 1
  return n
}

/** 본문 길이로 SMS/LMS 판정 (90byte 초과 → LMS) */
export function smsKindOf(text: string): 'sms' | 'lms' {
  return byteLen(text) > 90 ? 'lms' : 'sms'
}

/** 건당 청구 포인트 */
export async function unitCost(db: D1Database, kind: MsgKind): Promise<number> {
  const r = await getMsgRates(db)
  return r.charge[kind] ?? r.charge.sms
}

/** 총 청구 포인트 */
export async function totalCost(db: D1Database, kind: MsgKind, count: number): Promise<number> {
  const unit = await unitCost(db, kind)
  return unit * Math.max(0, Math.floor(count))
}

export const KIND_LABEL: Record<MsgKind, string> = {
  sms: '단문(SMS)',
  lms: '장문(LMS)',
  mms: '사진(MMS)',
  alimtalk: '카카오 알림톡',
}
