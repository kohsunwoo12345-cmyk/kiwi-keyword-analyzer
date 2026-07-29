/* CRM 마케팅 집행 — 화면이 쓰는 타입과 호출 (회원·관리자 공용) */

export type CrmStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'canceled'

export interface CrmCampaign {
  id: string
  user_id: string
  name: string
  run_date: string
  landing_slug: string | null
  landing_url: string | null
  group_id: string | null
  group_name?: string | null
  group_size?: number
  ad_budget: number
  channel: 'sms' | 'alimtalk'
  template_code?: string | null
  sender_key?: string | null
  sender_phone?: string | null
  message: string | null
  scheduled_at: string | null
  status: CrmStatus
  statusLabel?: string
  recipients: number
  sent: number
  failed: number
  msg_kind?: string | null
  unit_points?: number
  points_used?: number
  sent_at?: string | null
  error?: string | null
  memo?: string | null
  owner_name?: string | null
  owner_email?: string | null
  created_at: string
}

export interface CrmOptions {
  ok: boolean
  landings: { slug: string; title: string; status: string; view_count: number }[]
  groups: { id: string; name: string; count: number }[]
  senders: { id: string; phone: string; label: string }[]
  channels: { channel_id: string; channel_name: string; phone_number: string }[]
  templates: { template_id: string; name: string; status: string; senderkey: string }[]
  rates: Record<string, number>
  rateLabels: Record<string, string>
  points: number
  credits: number
  isAdmin: boolean
}

export interface CrmResult {
  sends: { name: string; phone: string; ok: number; reason: string | null; created_at: string }[]
  send: {
    recipients: number; sent: number; failed: number; successRate: number
    unitPoints: number; msgKind: string; pointsUsed: number; sentAt: string
  }
  landing: {
    slug: string; url: string
    views: number; viewsTotal: number; leads: number; leadsTotal: number
    recent: { name: string; phone: string; email: string; created_at: string }[]
    channels: { channel: string; cnt: number }[]
  }
  money: { adBudget: number; sendCost: number; totalCost: number; cpa: number; cpv: number }
  funnel: { sentToView: number; viewToLead: number; sentToLead: number }
}

export interface CrmSummary {
  ok: boolean
  isAdmin: boolean
  totals: {
    campaigns: number; sentCampaigns: number; recipients: number; sent: number; failed: number
    views: number; leads: number; adBudget: number; sendCost: number; totalCost: number
    cpa: number; convRate: number; sentToLead: number
  }
  campaigns: (CrmCampaign & {
    views: number; leads: number; adBudget: number; sendCost: number; totalCost: number
    cpa: number; convRate: number; reachRate: number
  })[]
}

const jsonHeaders = { 'content-type': 'application/json' }

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: 'include', cache: 'no-store', ...init })
  return (await r.json()) as T
}

export const crmOptions = () => req<CrmOptions>('/api/crm/options')

export const crmList = (p: { from?: string; to?: string; all?: boolean } = {}) => {
  const q = new URLSearchParams()
  if (p.from) q.set('from', p.from)
  if (p.to) q.set('to', p.to)
  if (p.all) q.set('all', '1')
  return req<{ ok: boolean; campaigns: CrmCampaign[]; rates: Record<string, number>; isAdmin: boolean }>(
    `/api/crm/campaigns${q.toString() ? '?' + q : ''}`,
  )
}

export const crmDetail = (id: string) =>
  req<{ ok: boolean; error?: string; campaign: CrmCampaign; result: CrmResult; estimate: { unitPoints: number; msgKind: string; targetCount: number; points: number } }>(
    `/api/crm/campaigns/${encodeURIComponent(id)}`,
  )

export const crmCreate = (body: Partial<CrmCampaign>) =>
  req<{ ok: boolean; error?: string; id: string; targetCount: number; estimatePoints: number; unitPoints: number }>(
    '/api/crm/campaigns', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) },
  )

export const crmUpdate = (id: string, body: Partial<CrmCampaign>) =>
  req<{ ok: boolean; error?: string }>(`/api/crm/campaigns/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: jsonHeaders, body: JSON.stringify(body),
  })

export const crmDelete = (id: string) =>
  req<{ ok: boolean; error?: string }>(`/api/crm/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const crmSend = (id: string, action: 'send' | 'cancel' = 'send') =>
  req<{ ok: boolean; error?: string; recipients?: number; sent?: number; failed?: number; pointsUsed?: number; status?: string }>(
    `/api/crm/campaigns/${encodeURIComponent(id)}/send`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ action }) },
  )

export const crmSummary = (p: { from?: string; to?: string; all?: boolean } = {}) => {
  const q = new URLSearchParams()
  if (p.from) q.set('from', p.from)
  if (p.to) q.set('to', p.to)
  if (p.all) q.set('all', '1')
  return req<CrmSummary>(`/api/crm/summary${q.toString() ? '?' + q : ''}`)
}

/* ───────── 달력·표시 헬퍼 ───────── */

export const STATUS_TONE: Record<CrmStatus, { label: string; cls: string; dot: string }> = {
  draft: { label: '작성중', cls: 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)]', dot: '#94a3b8' },
  scheduled: { label: '발송 예약', cls: 'border-amber-500/30 bg-amber-500/12 text-amber-500', dot: '#f59e0b' },
  sending: { label: '발송중', cls: 'border-sky-500/30 bg-sky-500/12 text-sky-500', dot: '#0ea5e9' },
  sent: { label: '발송 완료', cls: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500', dot: '#10b981' },
  failed: { label: '발송 실패', cls: 'border-rose-500/30 bg-rose-500/12 text-rose-500', dot: '#ef4444' },
  canceled: { label: '취소', cls: 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)]', dot: '#64748b' },
}

/** 한국 시간 기준 오늘 (YYYY-MM-DD) — 집행일은 KST 로 다룬다 */
export function kstToday(): string {
  const d = new Date(Date.now() + 9 * 3600_000)
  return d.toISOString().slice(0, 10)
}

/** 그 달의 달력 격자 (일요일 시작, 6주 고정) */
export function monthGrid(year: number, month0: number): { date: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month0, 1))
  const start = new Date(first)
  start.setUTCDate(1 - first.getUTCDay())
  const out: { date: string; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    out.push({ date: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month0 })
  }
  return out
}

export const won = (n: number) => `₩${Math.round(Number(n) || 0).toLocaleString('ko-KR')}`
export const num = (n: number) => (Number(n) || 0).toLocaleString('ko-KR')

/** 로컬 datetime-local 값 ↔ UTC ISO */
export function toIsoFromLocal(v: string): string {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? '' : d.toISOString()
}
export function toLocalFromIso(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 통신사 기준 바이트 (한글 2byte) — 90byte 초과면 LMS 요금 */
export function byteLen(s: string): number {
  let n = 0
  for (const ch of String(s || '')) n += ch.charCodeAt(0) > 0x7f ? 2 : 1
  return n
}
