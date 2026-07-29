/* 문자·알림톡 발송 단가 — 관리자 화면에서 쓰는 타입과 호출 래퍼 */

export type MsgKind = 'sms' | 'lms' | 'mms' | 'alimtalk'
export type RateSource = 'global' | 'member-multiplier' | 'member-fixed'

export const RATE_KINDS: [MsgKind, string][] = [
  ['sms', '단문 SMS'],
  ['lms', '장문 LMS'],
  ['mms', '사진 MMS'],
  ['alimtalk', '카카오 알림톡'],
]

export const SOURCE_LABEL: Record<RateSource, string> = {
  global: '전체 기본',
  'member-multiplier': '회원 배수',
  'member-fixed': '회원 고정',
}

export interface MemberOverride {
  userId: string
  multiplier: number | null
  charge: Partial<Record<MsgKind, number>>
  memo: string
  updatedAt: string
  updatedBy: string
}

export interface MemberRow {
  userId: string
  name: string
  email: string
  plan: string
  points: number
}

export interface OverrideRow extends MemberRow {
  multiplier: number | null
  charge: Record<MsgKind, number>
  source: Record<MsgKind, RateSource>
  fixed: Partial<Record<MsgKind, number>>
  memo: string
  updatedAt: string
  updatedBy: string
}

export interface RatesResponse {
  ok: boolean
  error?: string
  charge?: Record<MsgKind, number>
  labels?: Record<string, string>
  base?: Record<MsgKind, number>
  multiplier?: number
  defaults?: { base: Record<MsgKind, number>; multiplier: number }
  overrides?: OverrideRow[]
  member?: (MemberRow & { charge: Record<MsgKind, number>; source: Record<MsgKind, RateSource>; override: MemberOverride | null }) | null
  found?: MemberRow[]
}

/** 서버와 같은 식으로 미리 계산 — 저장 전에 얼마가 될지 보여준다(올림, 최소 1P) */
export function previewCharge(base: number | string, multiplier: number | string): number | null {
  const b = Number(base)
  const m = Number(multiplier)
  if (!Number.isFinite(b) || !Number.isFinite(m) || b < 0 || m <= 0) return null
  return Math.max(1, Math.ceil(b * m))
}

async function get(qs: string): Promise<RatesResponse> {
  try {
    const r = await fetch(`/api/admin/msg-rates${qs}`, { credentials: 'include', cache: 'no-store' })
    return await r.json()
  } catch {
    return { ok: false, error: '네트워크 오류' }
  }
}
async function post(body: any): Promise<any> {
  try {
    const r = await fetch('/api/admin/msg-rates', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return await r.json()
  } catch {
    return { ok: false, error: '네트워크 오류' }
  }
}

export const loadRates = (opts: { list?: boolean; userId?: string; q?: string } = {}) => {
  const p = new URLSearchParams()
  if (opts.list) p.set('list', '1')
  if (opts.userId) p.set('userId', opts.userId)
  if (opts.q) p.set('q', opts.q)
  const qs = p.toString()
  return get(qs ? `?${qs}` : '')
}

export const saveGlobalRates = (base: Record<string, number>, multiplier: number) => post({ base, multiplier })

export const saveMemberRate = (userId: string, o: { multiplier?: number | null; charge?: Partial<Record<MsgKind, number>>; memo?: string }) =>
  post({ action: 'member', userId, ...o })

export const clearMemberRate = (userId: string) => post({ action: 'member', userId, clear: true })
