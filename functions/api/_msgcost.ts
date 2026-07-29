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
  multiplier: number              // 실제 적용된 배수(회원 배수가 있으면 그 값)
  charge: Record<MsgKind, number> // 실제 청구 포인트/건
  /** 종류별로 어느 규칙이 적용됐는지 — 화면에서 "이 회원만 다름"을 표시하는 데 쓴다 */
  source: Record<MsgKind, RateSource>
  /** 전체(기본) 요금표 — 회원 단가와 비교해 보여줄 때 쓴다 */
  globalMultiplier: number
  globalCharge: Record<MsgKind, number>
  /** 이 회원에게 걸린 개별 설정(없으면 null) */
  override: MemberOverride | null
}

/** 적용 규칙: 전체 기본 / 회원 배수 / 회원 고정단가 */
export type RateSource = 'global' | 'member-multiplier' | 'member-fixed'

export interface MemberOverride {
  userId: string
  multiplier: number | null                     // null = 배수는 전체값 사용
  charge: Partial<Record<MsgKind, number>>      // 종류별 고정 청구 포인트(있는 종류만)
  memo: string
  updatedAt: string
  updatedBy: string
}

export const KINDS: MsgKind[] = ['sms', 'lms', 'mms', 'alimtalk']

function normBase(raw: any): Record<MsgKind, number> {
  const out = { ...DEFAULT_BASE_KRW }
  if (raw && typeof raw === 'object') {
    for (const k of KINDS) {
      const v = numOrNull(raw[k])
      if (v !== null && v >= 0 && v <= 100000) out[k] = v
    }
  }
  return out
}

export async function ensureMsgRateSchema(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS msg_rate_overrides (
        user_id TEXT PRIMARY KEY,
        multiplier REAL,
        charge_json TEXT,
        memo TEXT,
        updated_at TEXT,
        updated_by TEXT
      )`,
    )
    .run()
    .catch(() => {})
}

/**
 * 숫자로 안전하게 바꾼다.
 *  ⚠ Number(v) 를 그냥 쓰면 안 된다 — {"toString":1} 같은 값은 원시값으로 변환할 수 없어
 *    TypeError 를 던지고, 관리자 화면이 500 을 받는다(요금 설정이 통째로 막힌다).
 *    숫자·문자열만 받고 나머지는 "값 없음"으로 취급한다.
 */
function numOrNull(v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') { const n = Number(v.trim()); return v.trim() !== '' && Number.isFinite(n) ? n : null }
  return null
}

function normCharge(raw: any): Partial<Record<MsgKind, number>> {
  const out: Partial<Record<MsgKind, number>> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const k of KINDS) {
      const v = numOrNull((raw as any)[k])
      // 0 은 "무료"가 아니라 "미지정"으로 본다 — 실수로 0 을 넣어 공짜 발송이 되면 안 된다.
      if (v !== null && v >= 1 && v <= 1_000_000) out[k] = Math.round(v)
    }
  }
  return out
}
function normMultiplier(v: any): number | null {
  const m = numOrNull(v)
  return m !== null && m > 0 && m <= 100 ? m : null
}

/** 회원 개별 단가 설정을 읽는다(없으면 null) */
export async function getMemberOverride(db: D1Database, userId: string): Promise<MemberOverride | null> {
  if (!userId) return null
  await ensureMsgRateSchema(db)
  const r: any = await db.prepare('SELECT * FROM msg_rate_overrides WHERE user_id = ?').bind(String(userId)).first().catch(() => null)
  if (!r) return null
  let charge: Partial<Record<MsgKind, number>> = {}
  try { charge = normCharge(JSON.parse(String(r.charge_json || '{}'))) } catch { charge = {} }
  const multiplier = normMultiplier(r.multiplier)
  // 아무 값도 안 남은 행은 설정이 없는 것과 같다.
  if (multiplier === null && Object.keys(charge).length === 0) return null
  return {
    userId: String(r.user_id),
    multiplier,
    charge,
    memo: String(r.memo || ''),
    updatedAt: String(r.updated_at || ''),
    updatedBy: String(r.updated_by || ''),
  }
}

/**
 * 요금표를 읽는다.
 *  userId 를 주면 그 회원에게 실제로 청구되는 단가가 나온다.
 *  우선순위: 회원 종류별 고정단가 > 회원 배수 > 전체 배수
 */
export async function getMsgRates(db: D1Database, userId?: string | null): Promise<MsgRates> {
  let base = { ...DEFAULT_BASE_KRW }
  let multiplier = DEFAULT_MULTIPLIER
  try {
    const rawBase = await getSetting(db, SETTING_BASE)
    if (rawBase) base = normBase(JSON.parse(rawBase))
  } catch { /* 잘못된 값이면 기본값 */ }
  try {
    const m = normMultiplier(await getSetting(db, SETTING_MULT))
    if (m !== null) multiplier = m
  } catch { /* 기본값 */ }

  // 포인트는 정수다 — 올림해서 원가 밑으로 내려가지 않게 한다.
  const calc = (mult: number) => {
    const c = {} as Record<MsgKind, number>
    for (const k of KINDS) c[k] = Math.max(1, Math.ceil(base[k] * mult))
    return c
  }
  const globalCharge = calc(multiplier)

  const override = userId ? await getMemberOverride(db, String(userId)) : null
  const effMultiplier = override?.multiplier ?? multiplier
  const charge = calc(effMultiplier)
  const source = {} as Record<MsgKind, RateSource>
  for (const k of KINDS) source[k] = override?.multiplier != null ? 'member-multiplier' : 'global'
  if (override) {
    for (const k of KINDS) {
      const fixed = override.charge[k]
      if (fixed != null) { charge[k] = fixed; source[k] = 'member-fixed' }
    }
  }

  return { base, multiplier: effMultiplier, charge, source, globalMultiplier: multiplier, globalCharge, override }
}

/** 회원 개별 단가 저장 · 해제 */
export async function setMemberOverride(
  db: D1Database,
  userId: string,
  o: { multiplier?: any; charge?: any; memo?: any; clear?: boolean },
  by = '',
): Promise<MemberOverride | null> {
  await ensureMsgRateSchema(db)
  const uid = String(userId || '')
  if (!uid) return null
  if (o.clear) {
    await db.prepare('DELETE FROM msg_rate_overrides WHERE user_id = ?').bind(uid).run().catch(() => {})
    return null
  }
  const multiplier = o.multiplier === null || o.multiplier === '' ? null : normMultiplier(o.multiplier)
  const charge = normCharge(o.charge)
  // 배수도 고정단가도 없으면 설정을 지운다(빈 행을 남기지 않는다).
  if (multiplier === null && Object.keys(charge).length === 0) {
    await db.prepare('DELETE FROM msg_rate_overrides WHERE user_id = ?').bind(uid).run().catch(() => {})
    return null
  }
  await db
    .prepare(
      `INSERT INTO msg_rate_overrides (user_id, multiplier, charge_json, memo, updated_at, updated_by)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET multiplier=excluded.multiplier, charge_json=excluded.charge_json,
         memo=excluded.memo, updated_at=excluded.updated_at, updated_by=excluded.updated_by`,
    )
    .bind(uid, multiplier, JSON.stringify(charge), String(o.memo || '').slice(0, 200), new Date().toISOString(), String(by || '').slice(0, 120))
    .run()
  return getMemberOverride(db, uid)
}

export async function setMsgRates(db: D1Database, o: { base?: any; multiplier?: any }): Promise<MsgRates> {
  if (o.base !== undefined) await setSetting(db, SETTING_BASE, JSON.stringify(normBase(o.base)))
  if (o.multiplier !== undefined) {
    const m = normMultiplier(o.multiplier)
    if (m !== null) await setSetting(db, SETTING_MULT, String(m))
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

/** 건당 청구 포인트. userId 를 주면 그 회원 개별 단가가 반영된다. */
export async function unitCost(db: D1Database, kind: MsgKind, userId?: string | null): Promise<number> {
  const r = await getMsgRates(db, userId)
  return r.charge[kind] ?? r.charge.sms
}

/** 총 청구 포인트 */
export async function totalCost(db: D1Database, kind: MsgKind, count: number, userId?: string | null): Promise<number> {
  const unit = await unitCost(db, kind, userId)
  return unit * Math.max(0, Math.floor(count))
}

export const KIND_LABEL: Record<MsgKind, string> = {
  sms: '단문(SMS)',
  lms: '장문(LMS)',
  mms: '사진(MMS)',
  alimtalk: '카카오 알림톡',
}
