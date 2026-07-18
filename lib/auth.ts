'use client'

import { useEffect, useState } from 'react'

// Cloudflare Pages Functions(D1) 기반 실제 인증 클라이언트
export interface User {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  plan: '없음' | 'Plus' | 'Pro' | 'Max'        // 마케터 전용 플랜
  videoPlan: '없음' | 'Plus' | 'Pro' | 'Max'   // 노드형 AI 영상 제작 플랜
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  points: number
  credits: number
  referralCode?: string
  referredBy?: string
  provider?: string // 'email' | 'google' | 'kakao'
  passwordSet?: number // 1 = 비밀번호 직접 설정함(간편로그인 계정 구분용)
  creditMarkup?: number // 회원별 AI 과금 배수(원가=1). 0 = 모델 기본
  // 동의 내역
  tosConsent?: number
  privacyConsent?: number
  marketingConsent?: number
  aiConsent?: number
  consentAt?: string
  country?: string
  postalCode?: string
  address1?: string
  address2?: string
  addressComplete?: boolean
  accountType?: '' | 'team' | 'individual'
  products?: '' | 'video' | 'marketing' | 'both'
  hasPlan?: number // 1 = 승인된 유료 플랜 보유 (없으면 마케팅·영상 모두 사용 불가)
  createdAt: string
  lastActive: string | null
}

export interface Tx {
  kind: 'point' | 'credit' | 'purchase'
  amount: number
  balance_after: number | null
  memo: string | null
  created_at: string
}
export interface ActivityRow {
  type: string
  detail: string | null
  created_at: string
}
export interface Noti {
  id?: string
  title: string | null
  body: string | null
  read: number
  created_at: string
}

export interface AuthResult {
  ok: boolean
  error?: string
  user?: User
}

async function postJson(url: string, body: unknown): Promise<any> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    return await r.json()
  } catch {
    return { ok: false, error: '네트워크 오류가 발생했습니다.' }
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return postJson('/api/login', { email, password })
}

export async function signup(input: {
  name: string
  email: string
  password: string
  company?: string
  phone?: string
  ref?: string
  marketingConsent?: boolean
  aiConsent?: boolean
}): Promise<AuthResult> {
  return postJson('/api/signup', input)
}

/** 가입 후 사업장 주소(국가·우편번호·주소) 저장 */
export async function saveAddress(input: {
  country: string
  company?: string
  postalCode?: string
  address1: string
  address2?: string
  phone?: string
  ref?: string
  tos?: number
  privacy?: number
  marketing?: number
  accountType?: 'team' | 'individual'
  products?: 'video' | 'marketing' | 'both'
}): Promise<AuthResult> {
  return postJson('/api/account/address', input)
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' })
  } catch {
    /* ignore */
  }
}

export async function fetchMe(): Promise<User | null> {
  try {
    const r = await fetch('/api/me', { credentials: 'include' })
    const d = await r.json()
    return (d && d.user) || null
  } catch {
    return null
  }
}

/** 로그인 상태 훅 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    fetchMe().then((u) => {
      if (alive) {
        setUser(u)
        setReady(true)
      }
    })
    return () => {
      alive = false
    }
  }, [])
  return { user, ready, setUser }
}

/** 관리자: 전체 회원 목록 + 통계 */
export async function adminUsers(): Promise<{
  ok: boolean
  error?: string
  users: User[]
  stats?: {
    total: number
    admins: number
    suspended: number
    newToday: number
    byPlan: { Plus: number; Pro: number; Max: number }
  }
}> {
  try {
    const r = await fetch('/api/admin/users', { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, error: d.error, users: d.users || [], stats: d.stats }
  } catch {
    return { ok: false, error: '네트워크 오류', users: [] }
  }
}

/** 관리자: 회원 상태/플랜/비밀번호/포인트/크레딧/알림·문자 */
export async function adminAction(
  action: 'suspend' | 'activate' | 'delete' | 'plan' | 'password' | 'points' | 'credits' | 'notify' | 'markup',
  id: string,
  extra?: {
    plan?: string
    track?: 'marketer' | 'video'
    password?: string
    amount?: number
    memo?: string
    title?: string
    body?: string
    sms?: boolean
    phone?: string
    markup?: number
  },
): Promise<{ ok: boolean; error?: string; sms?: { sent: boolean; reason?: string } }> {
  return postJson('/api/admin/users', { action, id, ...extra })
}

/* ───────── 접속 통계 / 통합 로그 / 알림 발송 (관리자) ───────── */
/** 방문 기록 (공개 비콘) */
export async function trackVisit(path: string, ref = ''): Promise<void> {
  try {
    let visitor = ''
    if (typeof localStorage !== 'undefined') {
      visitor = localStorage.getItem('bg_visitor') || ''
      if (!visitor) { visitor = 'vz_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('bg_visitor', visitor) }
    }
    await fetch('/api/visit', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ path, ref, visitor }) })
  } catch { /* ignore */ }
}

export interface VisitStats {
  ok: boolean; error?: string; days?: number
  stats?: { totalPv: number; pv24: number; uv: number; uv24: number }
  byDay?: { d: string; pv: number; uv: number }[]
  byPath?: { path: string; n: number }[]
  byCountry?: { country: string; n: number }[]
  byDevice?: { device: string; n: number }[]
  byHour?: { h: string; n: number }[]
  byRef?: { ref: string; n: number }[]
  recent?: { path: string; ip: string; country: string; city?: string; region?: string; device: string; ref: string; created_at: string }[]
  support?: {
    total: number; unread: number; today: number
    recent: { conv_id: string; name: string; email: string; last_at: string; unread: number }[]
  }
}
export async function adminVisitStats(days = 14): Promise<VisitStats> {
  try {
    const r = await fetch(`/api/admin/visit-stats?days=${days}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

export interface AiUsageUser {
  user_id: string; name: string; email: string; count: number
  credits: number; revenue: number; cost: number; profit: number; models: string
}
export interface AiUsageModel {
  model: string; provider: string; kind: string; markup: number
  count: number; credits: number; revenue: number; cost: number; profit: number
}
export interface AiUsageRow {
  created_at: string; name: string; email: string; model: string; provider: string
  kind: string; credits: number; cost: number; revenue: number; profit: number; markup: number; usdKrw?: number
}
export interface AiUsageDay {
  d: string; count: number; credits: number; revenue: number; cost: number; profit: number
  rate: number; rateMin: number; rateMax: number
}
export interface AiUsageStats {
  ok: boolean; error?: string; days?: number; todayRate?: number
  totals?: { count: number; credits: number; revenue: number; cost: number; profit: number }
  byUser?: AiUsageUser[]
  byModel?: AiUsageModel[]
  byDay?: AiUsageDay[]
  recent?: AiUsageRow[]
}
export async function adminAiUsage(days = 30): Promise<AiUsageStats> {
  try {
    const r = await fetch(`/api/admin/ai-usage?days=${days}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

/* ── AI 생성 기록 (관리자) — 각 생성물의 프롬프트·레퍼런스·결과·비용 ── */
export interface AiGenerationRow {
  id: string
  createdAt: string
  userId: string
  name: string
  email: string
  provider: string
  model: string
  kind: string
  credits: number
  costKrw: number
  usd: number
  usdKrw: number
  markup: number
  prompt: string
  refs: string[]
  resultUrl: string
  resultKind: string
}
export interface AiGenerationsResp {
  ok: boolean
  error?: string
  todayRate?: number
  total?: number
  limit?: number
  offset?: number
  items?: AiGenerationRow[]
}
/* ── 매출 (관리자) ── */
export interface RevenueResp {
  ok: boolean; error?: string; days?: number
  totals?: { revenue: number; cost: number; profit: number; margin: number }
  breakdown?: {
    creditCard: { krw: number; count: number }; creditApproval: { krw: number; count: number }
    plan: { krw: number; count: number }; team: { krw: number; count: number }
    creditSales: number; planTotal: number
  }
  aiInternal?: { revenue: number; cost: number; profit: number; credits: number; count: number }
  usage?: { creditSpent: number; smsCount: number }
  byDay?: { d: string; revenue: number; credit: number; plan: number }[]
  recent?: { type: string; name: string; email: string; amount: number; detail: string; at: string }[]
}
export async function adminRevenue(days = 30): Promise<RevenueResp> {
  try {
    const r = await fetch(`/api/admin/revenue?days=${days}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

/* ── 사용자 활동 기록 (관리자) ── */
export interface UserActivityUser {
  id: string; name: string; email: string; plan: string; videoPlan: string; teamPlan: number
  credits: number; points: number; provider: string; status: string; createdAt: string; lastActive: string
  activityCount: number; genCount: number; sharesSent: number; sharesRecv: number
}
export interface ActivityEvent { cat: string; kind: string; title: string; detail: string; amount?: number; unit?: string; at: string }
export async function adminUserActivity(userId?: string): Promise<{ ok: boolean; error?: string; total?: number; users?: UserActivityUser[]; user?: any; events?: ActivityEvent[] }> {
  try {
    const r = await fetch(`/api/admin/user-activity${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

export async function adminAiGenerations(opts: { limit?: number; offset?: number; kind?: string; q?: string; days?: number } = {}): Promise<AiGenerationsResp> {
  try {
    const p = new URLSearchParams()
    if (opts.limit != null) p.set('limit', String(opts.limit))
    if (opts.offset != null) p.set('offset', String(opts.offset))
    if (opts.kind) p.set('kind', opts.kind)
    if (opts.q) p.set('q', opts.q)
    if (opts.days != null) p.set('days', String(opts.days))
    const r = await fetch(`/api/admin/ai-generations?${p.toString()}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

/* ── 고객센터 채팅 (사용자) ── */
export interface ChatMsg { sender: 'user' | 'admin' | 'bot'; text: string; at: string; id?: string; readUser?: number; readAdmin?: number }
export async function chatSend(text: string, convId?: string, name?: string, email?: string): Promise<{ ok: boolean; conv_id?: string; error?: string }> {
  try {
    const r = await fetch('/api/chat/send', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ text, conv_id: convId, name, email }) })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}
export async function chatThread(convId?: string, seen = false): Promise<{ ok: boolean; conv_id?: string; messages?: ChatMsg[] }> {
  try {
    const qs = new URLSearchParams()
    if (convId) qs.set('conv_id', convId)
    if (seen) qs.set('seen', '1') // 채팅창을 연 상태에서만 읽음 처리(정확한 읽음 표시)
    const q = qs.toString()
    const r = await fetch(`/api/chat/thread${q ? `?${q}` : ''}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, messages: [] } }
}

/* ── 고객센터 채팅 (관리자) ── */
export interface SupportConv { conv_id: string; name: string; email: string; user_id: string; total: number; unread: number; userUnread?: number; last_at: string; last_sender: string; last_text: string }
export interface SupportThread { ok: boolean; unread?: number; conv?: { conv_id: string; name: string; email: string; user_id: string }; messages?: ChatMsg[]; conversations?: SupportConv[] }
export async function adminSupport(convId?: string): Promise<SupportThread> {
  try {
    const r = await fetch(`/api/admin/support${convId ? `?conv_id=${encodeURIComponent(convId)}` : ''}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false } }
}
export async function adminSupportReply(convId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch('/api/admin/support', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ conv_id: convId, text }) })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}
export async function adminSupportCount(): Promise<number> {
  try {
    const r = await fetch('/api/admin/support?count=1', { credentials: 'include' })
    const j = await r.json()
    return j?.unread || 0
  } catch { return 0 }
}

/* ── 추천/친구 ── */
export interface RefUser { id: string; name: string; email: string; plan: string; videoPlan: string; paid: boolean; via?: string; since?: string; createdAt: string }
export interface ReferralInfo { ok: boolean; error?: string; code?: string; referredByName?: string; friends?: RefUser[]; referred?: RefUser[]; friendCount?: number; referredCount?: number }
export async function accountReferral(): Promise<ReferralInfo> {
  try {
    const r = await fetch('/api/account/referral', { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}
export async function addFriend(code: string): Promise<{ ok: boolean; error?: string; already?: boolean; friend?: { id: string; name: string; email: string } }> {
  try {
    const r = await fetch('/api/account/add-friend', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ code }) })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

/* ── 관리자: 가입/추천/결제 조회 ── */
export interface ReferralRow { id: string; name: string; email: string; plan: string; videoPlan: string; paid: boolean; credits: number; referralCode: string; referredById: string; referredByName: string; friendCount: number; referredCount: number; company?: string; phone?: string; provider?: string; country?: string; postalCode?: string; address1?: string; address2?: string; addressDone?: boolean; createdAt: string; tosConsent?: number; privacyConsent?: number; marketingConsent?: number; aiConsent?: number; consentAt?: string }
export interface AdminReferrals { ok: boolean; error?: string; totals?: { members: number; paid: number; unpaid: number; referred: number }; rows?: ReferralRow[] }
export async function adminReferrals(q = ''): Promise<AdminReferrals> {
  try {
    const r = await fetch(`/api/admin/referrals${q ? `?q=${encodeURIComponent(q)}` : ''}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

/* ===== 지사 정산 ===== */
export interface BranchRow {
  id: string; name: string; memo: string; createdAt: string
  ownerId: string; ownerName: string; ownerEmail: string; ownerCode: string
  percent: number; costRate: number
  refPaidCount: number
  grossKrw: number; rewardKrw: number; netProfitKrw: number; owedKrw: number; settledKrw: number; outstandingKrw: number
}
export interface SettlementPayment {
  id: string; friendName: string; friendEmail: string; referrerId: string; referrerName: string; referrerCode: string
  branchId: string; branchName: string; track: string; plan: string
  priceKrw: number; rewardCredits: number; rewardKrw: number; netProfitKrw: number; owedKrw: number; createdAt: string
}
export interface SettlementRecord { id: string; branchId: string; branchName: string; amountKrw: number; note: string; createdAt: string }
export interface AdminSettlement {
  ok: boolean; error?: string
  branches?: BranchRow[]
  payments?: SettlementPayment[]
  settlements?: SettlementRecord[]
  totals?: { paymentsCount: number; grossKrw: number; rewardKrw: number; netProfitKrw: number; owedKrw: number; settledKrw: number; outstandingKrw: number }
}
export interface SettlementUser { id: string; name: string; email: string; referralCode: string; plan: string; videoPlan: string }
export async function adminSettlement(): Promise<AdminSettlement> {
  try {
    const r = await fetch('/api/admin/settlement', { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}
export async function adminSettlementUsers(q = ''): Promise<{ ok: boolean; users?: SettlementUser[]; error?: string }> {
  try {
    const r = await fetch(`/api/admin/settlement?users=${encodeURIComponent(q)}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}
export interface SettlementPlanEvent { track: string; plan: string; priceKrw: number; at: string }
export interface BranchMember {
  id: string; name: string; email: string; plan: string; videoPlan: string; credits: number; createdAt: string
  firstPaid: SettlementPlanEvent | null
  planEvents: SettlementPlanEvent[]
  usage: { count: number; credits: number; costKrw: number; lastAt: string }
  grossKrw: number; rewardKrw: number; netProfitKrw: number; owedKrw: number
}
export interface BranchDetail {
  ok: boolean; error?: string
  branch?: { id: string; name: string; ownerId: string; ownerName: string; ownerEmail: string; ownerCode: string; percent: number; costRate: number }
  memberCount?: number
  members?: BranchMember[]
}
export async function adminSettlementBranch(branchId: string): Promise<BranchDetail> {
  try {
    const r = await fetch(`/api/admin/settlement?branch=${encodeURIComponent(branchId)}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

/* ===== 모델별 AI 과금 배수 ===== */
export interface ModelPriceRow {
  model: string; provider: string; kind: string
  baseCredits: number; defaultMarkup: number
  globalMarkup: number; userMarkup: number; effectiveMarkup: number; effectiveCredits: number
}
export interface AdminModelPricing {
  ok: boolean; error?: string
  usdKrw?: number; creditKrw?: number
  userId?: string; userName?: string; userOverall?: number
  models?: ModelPriceRow[]
}
export async function adminModelPricing(userId = ''): Promise<AdminModelPricing> {
  try {
    const r = await fetch('/api/admin/model-pricing' + (userId ? `?userId=${encodeURIComponent(userId)}` : ''), { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}
export async function adminModelPricingAction(
  action: 'set_global' | 'reset_global' | 'set_global_all' | 'reset_global_all' | 'set_user' | 'set_user_all' | 'reset_user' | 'set_user_overall' | 'reset_user_overall' | 'set_user_refsur' | 'reset_user_refsur' | 'set_global_refsur' | 'set_promptgen',
  payload: Record<string, unknown> = {},
): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/admin/model-pricing', { action, ...payload })
}
export interface UserMarkupRow {
  id: string; name: string; email: string; plan: string
  credits: number; overall: number; overrides: number
  refSurcharge: number | null
}
export async function adminUserMarkups(q = ''): Promise<{ ok: boolean; error?: string; users?: UserMarkupRow[]; defaultMarkup?: { video: number; image: number }; refSurchargeDefault?: number; promptgenCredits?: number; promptgenMarkup?: number }> {
  try {
    const r = await fetch('/api/admin/model-pricing?list=users' + (q ? `&q=${encodeURIComponent(q)}` : ''), { credentials: 'include', cache: 'no-store' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}
export interface CreditsRecallInfo {
  ok: boolean
  error?: string
  total?: { users: number; credits: number }
  nonAdmin?: { users: number; credits: number }
}
export async function adminCreditsRecallInfo(): Promise<CreditsRecallInfo> {
  try {
    const r = await fetch('/api/admin/credits-recall', { credentials: 'include', cache: 'no-store' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}
export async function adminCreditsRecall(includeAdmin: boolean): Promise<{ ok: boolean; error?: string; affected?: number; recalled?: number }> {
  return postJson('/api/admin/credits-recall', { confirm: 'RECALL', includeAdmin })
}
export async function adminSettlementAction(
  action: 'create_branch' | 'update_branch' | 'delete_branch' | 'set_owner' | 'settle' | 'delete_settlement',
  payload: Record<string, unknown> = {},
): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/admin/settlement', { action, ...payload })
}

export interface CombinedLogs {
  ok: boolean; error?: string
  activity?: GlobalActivityRow[]
  audit?: AuditRow[]
  security?: SecLog[]
  stats?: { activity24: number; audit24: number; security24: number; threats24: number }
}
export async function adminLogs(kind: 'all' | 'activity' | 'audit' | 'security' = 'all', limit = 300): Promise<CombinedLogs> {
  try {
    const r = await fetch(`/api/admin/logs?kind=${kind}&limit=${limit}`, { credentials: 'include' })
    return await r.json()
  } catch { return { ok: false, error: '네트워크 오류' } }
}

/** 알림 발송: 개인/플랜/다중/전체 */
export async function notifyBroadcast(input: {
  target: 'user' | 'plan' | 'all' | 'multi'; userId?: string; plan?: string; userIds?: string[]; title: string; body: string; sms?: boolean
}): Promise<{ ok: boolean; error?: string; sent?: number; smsSent?: number }> {
  return postJson('/api/admin/notify-broadcast', input)
}

/** 관리자: 전체 사용자 활동 로그 (실시간 감시) */
export interface GlobalActivityRow { type: string; detail: string | null; created_at: string; user_id: string; name: string | null; email: string | null }
export async function adminActivity(limit = 200): Promise<{ ok: boolean; error?: string; activity: GlobalActivityRow[]; stats?: { events24: number; total: number } }> {
  try {
    const r = await fetch(`/api/admin/activity?limit=${limit}`, { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, error: d.error, activity: d.activity || [], stats: d.stats }
  } catch {
    return { ok: false, error: '네트워크 오류', activity: [] }
  }
}

/** 관리자: 회원 상세 (프로필 + 활동로그 + 거래내역 + 알림) */
export async function adminUserDetail(id: string): Promise<{
  ok: boolean
  error?: string
  user?: User
  activity: ActivityRow[]
  transactions: Tx[]
  notifications: Noti[]
}> {
  try {
    const r = await fetch(`/api/admin/user?id=${encodeURIComponent(id)}`, { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, error: d.error, user: d.user, activity: d.activity || [], transactions: d.transactions || [], notifications: d.notifications || [] }
  } catch {
    return { ok: false, error: '네트워크 오류', activity: [], transactions: [], notifications: [] }
  }
}

export interface AiUsageRow { provider: string; model: string; kind: string; units: number; credits: number; cost_krw: number; revenue_krw: number; created_at: string }
export interface LandingRow { slug: string; title: string | null; published: number; views: number; leads: number; created_at: string }
export interface AdminUserFull {
  ok: boolean
  error?: string
  user?: User
  activity: ActivityRow[]
  transactions: Tx[]
  notifications: Noti[]
  aiUsage: AiUsageRow[]
  landings: LandingRow[]
  referredByName: string
  referredCount: number
}

/** 관리자: 회원 상세페이지용 전체 기록 (프로필 + 크레딧 내역 + AI 모델 + 제작 페이지 + 활동) */
export async function adminUserFull(id: string): Promise<AdminUserFull> {
  const empty: AdminUserFull = { ok: false, activity: [], transactions: [], notifications: [], aiUsage: [], landings: [], referredByName: '', referredCount: 0 }
  try {
    const r = await fetch(`/api/admin/user?id=${encodeURIComponent(id)}`, { credentials: 'include' })
    const d = await r.json()
    return {
      ok: !!d.ok, error: d.error, user: d.user,
      activity: d.activity || [], transactions: d.transactions || [], notifications: d.notifications || [],
      aiUsage: d.aiUsage || [], landings: d.landings || [],
      referredByName: d.referredByName || '', referredCount: d.referredCount || 0,
    }
  } catch {
    return { ...empty, error: '네트워크 오류' }
  }
}

/** 사용자 본인: 계정 개요 (프로필 + 크레딧/포인트 내역 + 알림 + 활동) */
export async function accountOverview(): Promise<{
  ok: boolean
  error?: string
  user?: User
  transactions: Tx[]
  notifications: Noti[]
  activity: ActivityRow[]
}> {
  try {
    const r = await fetch('/api/account/overview', { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, error: d.error, user: d.user, transactions: d.transactions || [], notifications: d.notifications || [], activity: d.activity || [] }
  } catch {
    return { ok: false, error: '네트워크 오류', transactions: [], notifications: [], activity: [] }
  }
}

/** 사용자 본인: 비밀번호 변경(또는 간편로그인 계정 최초 설정) */
export async function changePassword(current: string, next: string): Promise<{ ok: boolean; error?: string; firstTimeSet?: boolean }> {
  return postJson('/api/account/password', { current, next })
}

/** 사용자 본인: 계정 영구 삭제 (일반계정=비밀번호, 간편로그인=이메일 확인) */
export async function deleteAccount(input: { password?: string; confirmEmail?: string }): Promise<{ ok: boolean; error?: string; needPassword?: boolean; needEmail?: boolean }> {
  return postJson('/api/account/delete', input)
}

/** 사용자 본인: 알림 읽음 처리 */
export async function markNotificationsRead(): Promise<void> {
  await postJson('/api/account/overview', { action: 'read-notifications' })
}

/* ───────── 보안 (관리자) ───────── */
export interface BlockedIp { ip: string; reason: string | null; source: string | null; country?: string; city?: string; created_at: string }
export interface WhitelistIp { ip: string; label: string | null; created_at: string }
export interface SecLog { ts: string; ip: string; method: string; path: string; status: number; severity: string; detail: string; country?: string; city?: string; ua?: string }
export interface LoginFail { email: string; ip: string; ua: string; country?: string; created_at: string }
export interface SessionRow { token: string; fullToken: string; user_id: string; name: string | null; email: string | null; role: string | null; ip: string; ua: string; country: string; created_at: string; expires_at: string }
export interface AuditRow { admin_email: string; action: string; target: string; detail: string; severity: string; ip: string; created_at: string }
export interface ExportRow { admin_email: string; filename: string; kind: string; rows: number; bytes: number; ip: string; created_at: string }
export interface ReportRow { id: string; reporter_email: string | null; target_type: string; target_id: string; target_desc: string; reason: string; status: string; created_at: string; decided_at: string | null }
export interface InstallRow { id: string; user_email: string | null; endpoint: string; platform: string; allowed: number; ip: string; country: string; city: string; ua: string; created_at: string }

export interface AdminDevice { id: string; label: string; device: string; ip: string; created_at: string }

export interface SecurityBundle {
  ok: boolean; error?: string
  settings: { whitelistMode: boolean; adminLock?: boolean }
  adminDevices?: AdminDevice[]
  currentIp?: string
  currentDevice?: string
  blocked: BlockedIp[]; whitelist: WhitelistIp[]; logs: SecLog[]; loginFailures: LoginFail[]
  sessions: SessionRow[]; audit: AuditRow[]; exports: ExportRow[]; reports: ReportRow[]; installs: InstallRow[]
  stats: {
    blockedCount: number; whitelistCount: number; events24: number; threats24: number
    loginFails24: number; activeSessions: number; pendingReports: number; installsTotal: number; pushAllowed: number
  }
}

export async function adminSecurity(): Promise<SecurityBundle> {
  const empty: SecurityBundle = {
    ok: false, settings: { whitelistMode: false, adminLock: false }, adminDevices: [], currentIp: '', currentDevice: '',
    blocked: [], whitelist: [], logs: [], loginFailures: [],
    sessions: [], audit: [], exports: [], reports: [], installs: [],
    stats: { blockedCount: 0, whitelistCount: 0, events24: 0, threats24: 0, loginFails24: 0, activeSessions: 0, pendingReports: 0, installsTotal: 0, pushAllowed: 0 },
  }
  try {
    const r = await fetch('/api/admin/security', { credentials: 'include' })
    const d = await r.json()
    return { ...empty, ...d, ok: !!d.ok, settings: d.settings || empty.settings, stats: d.stats || empty.stats }
  } catch {
    return { ...empty, error: '네트워크 오류' }
  }
}

export type SecurityAction =
  | 'block' | 'unblock' | 'delete-ip' | 'unblock-many' | 'unblock-all'
  | 'whitelist-add' | 'whitelist-remove' | 'whitelist-mode'
  | 'admin-device-add' | 'admin-device-del' | 'admin-lock'
  | 'clear-logs' | 'clear-login-failures'
  | 'force-logout' | 'force-logout-user' | 'force-logout-all'
  | 'report-action' | 'push-send' | 'export-log'

export async function adminSecurityAction(
  action: SecurityAction,
  extra?: {
    ip?: string; ips?: string[]; reason?: string; label?: string; enabled?: boolean
    token?: string; userId?: string; id?: string; status?: string
    title?: string; body?: string; filename?: string; kind?: string; rows?: number; bytes?: number
  },
): Promise<{ ok: boolean; error?: string; sent?: number }> {
  return postJson('/api/admin/security', { action, ...extra })
}

/** PWA 설치 / 푸시 허용 현황 기록 (공개) */
export async function trackPwa(input: { endpoint?: string; platform?: string; allowed?: boolean }): Promise<void> {
  await postJson('/api/pwa/track', input)
}

/* ───────── 공개 폼 (비로그인 사용 가능) ───────── */
/** 문의하기 접수 */
export async function sendContact(input: {
  name: string; email?: string; phone?: string; company?: string; message: string
}): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/contact', input)
}
/** 랜딩 DB 수집 데모 (실제로 D1에 저장) */
export async function collectLead(input: {
  name: string; phone?: string; email?: string; source?: string
}): Promise<{ ok: boolean; error?: string; total?: number }> {
  return postJson('/api/leads/collect', input)
}

/** 실제 AI 텍스트 생성 (OpenAI). 크레딧 차감, 실패 시 환불 */
export async function aiGenerate(input: {
  prompt: string; system?: string; feature: string; cost?: number; max_tokens?: number
}): Promise<{ ok: boolean; error?: string; text?: string; cost?: number; credits?: number; refunded?: boolean }> {
  return postJson('/api/ai/generate', input)
}

/* ───────── 실제 분석 (네이버 API) ───────── */
export interface BlogAnalysis { ok: boolean; error?: string; refunded?: boolean; keyword?: string; total?: number; difficulty?: string; grade?: string; exposureChance?: number; items?: { title: string; link: string; blogger: string; postdate: string; desc: string }[]; credits?: number }
export async function analyzeBlog(keyword: string): Promise<BlogAnalysis> {
  return postJson('/api/analyze/blog', { keyword })
}
export interface PlaceAnalysis { ok: boolean; error?: string; refunded?: boolean; keyword?: string; total?: number; items?: { rank: number; title: string; category: string; address: string; telephone: string; link: string }[]; credits?: number }
export async function analyzePlace(keyword: string): Promise<PlaceAnalysis> {
  return postJson('/api/analyze/place', { keyword })
}

/* ───────── 랜딩페이지 제작 (실제 DB 수집) ───────── */
export interface LandingPage {
  id: string; slug: string; title: string; headline: string; subtext: string; cta: string
  theme: string; fields: string; published: number; views: number; leads: number; created_at: string; updated_at: string | null
}
export async function saveLanding(input: {
  id?: string; slug?: string; title: string; headline?: string; subtext?: string; cta?: string; theme?: string; fields?: string[]; published?: boolean
}): Promise<{ ok: boolean; error?: string; id?: string; slug?: string; published?: boolean }> {
  return postJson('/api/landing/save', input)
}
export async function listLandings(): Promise<{
  ok: boolean; error?: string; pages: LandingPage[]
  stats?: { totalPages: number; publishedCount: number; totalViews: number; totalLeads: number; convRate: number }
}> {
  try {
    const r = await fetch('/api/landing/list', { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, error: d.error, pages: d.pages || [], stats: d.stats }
  } catch { return { ok: false, error: '네트워크 오류', pages: [] } }
}

/* ───────── 유튜브 분석 (YouTube Data API v3) ───────── */
export interface YtVideo { id: string; title: string; thumbnail: string; publishedAt: string; viewCount: number; likeCount: number; commentCount: number }
export interface YtChannel { id: string; title: string; description: string; thumbnail: string; subscriberCount: number; viewCount: number; videoCount: number; publishedAt: string; country: string }
export interface YtAnalysis {
  ok: boolean; error?: string; refunded?: boolean
  channel?: YtChannel; videos?: YtVideo[]
  metrics?: { avgViews: number; avgLikes: number; avgComments: number; engagementRate: number; uploadsPerMonth: number }
  credits?: number
}
export async function analyzeYoutube(query: string): Promise<YtAnalysis> {
  return postJson('/api/youtube/analyze', { query })
}

/* ───────── 결제 (Toss Payments) ───────── */
export interface PrepareResult { ok: boolean; error?: string; orderId?: string; amount?: number; credits?: number; orderName?: string; clientKey?: string; customerEmail?: string; customerName?: string }
export async function preparePayment(credits: number): Promise<PrepareResult> {
  return postJson('/api/payments/prepare', { credits })
}
export async function confirmPayment(input: { paymentKey: string; orderId: string; amount: number }): Promise<{ ok: boolean; error?: string; credits?: number; user?: User }> {
  return postJson('/api/payments/confirm', input)
}

/* ───────── 이메일 (Resend) / 알림톡 (알리고 Kakao) ───────── */
export async function sendEmail(input: { to: string | string[]; subject: string; html: string }): Promise<{ ok: boolean; error?: string; sent?: number; credits?: number; refunded?: boolean }> {
  return postJson('/api/email/send', input)
}
export async function sendAlimtalk(input: { to: string | string[]; text: string; templateId?: string; senderKey?: string; failover?: boolean }): Promise<{ ok: boolean; error?: string; sent?: number; failed?: number; total?: number; configured?: boolean; note?: string; credits?: number }> {
  return postJson('/api/alimtalk/send', input)
}

/* ── 카카오 알림톡 채널·템플릿 관리 (알리고) ── */
export interface KakaoChannel { channelId: string; channelName: string; searchId?: string; phoneNumber?: string; categoryCode?: string; createdAt?: string }
export interface KakaoTemplate { templateId: string; name: string; content: string; status: string; inspStatus?: string; messageType?: string; rejectReason?: string; buttons?: any[]; dateCreated?: string }

export async function kakaoChannels(): Promise<{ ok: boolean; channels: KakaoChannel[]; error?: string }> {
  try { const r = await fetch('/api/kakao/user/channels', { credentials: 'include' }); const d = await r.json(); return { ok: !!d.ok, channels: d.channels || [], error: d.error } } catch { return { ok: false, channels: [], error: '네트워크 오류' } }
}
export async function kakaoChannelAuth(plusid: string, phone: string): Promise<{ ok: boolean; error?: string; note?: string }> {
  return postJson('/api/kakao/profile/auth', { plusid, phone })
}
export async function kakaoChannelAdd(input: { plusid: string; phone: string; authnum: string; categorycode?: string }): Promise<{ ok: boolean; senderKey?: string; error?: string; note?: string }> {
  return postJson('/api/kakao/profile/add', input)
}
export async function kakaoCategories(): Promise<{ ok: boolean; categories: any[]; error?: string }> {
  try { const r = await fetch('/api/kakao/category/list', { credentials: 'include' }); const d = await r.json(); return { ok: !!d.ok, categories: d.categories || [], error: d.error } } catch { return { ok: false, categories: [], error: '네트워크 오류' } }
}
export async function kakaoTemplates(channelId?: string): Promise<{ ok: boolean; templates: KakaoTemplate[]; error?: string }> {
  try { const r = await fetch(`/api/kakao/alimtalk/templates${channelId ? `?channelId=${encodeURIComponent(channelId)}` : ''}`, { credentials: 'include' }); const d = await r.json(); return { ok: !!d.ok, templates: d.templates || [], error: d.error } } catch { return { ok: false, templates: [], error: '네트워크 오류' } }
}
export async function kakaoTemplateCreate(input: { name: string; content: string; senderkey?: string; buttons?: any }): Promise<{ ok: boolean; templateId?: string; requested?: boolean; error?: string; note?: string }> {
  return postJson('/api/kakao/alimtalk/template-create', input)
}
export async function kakaoTemplateRequest(tplCode: string, senderkey?: string): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/kakao/alimtalk/template-request', { tplCode, senderkey })
}

/** 실제 문자 발송 (알리고). 건당 1 크레딧 차감, 실패분 자동 환불 */
export async function sendSmsCampaign(to: string | string[], text: string): Promise<{
  ok: boolean; error?: string; sent?: number; failed?: number; total?: number
  configured?: boolean; note?: string; reason?: string; user?: User; balance?: number
}> {
  return postJson('/api/sms/send', { to, text })
}

/* ───────── 승인 관리 (관리자) ───────── */
export interface PlanReq { id: string; user_id: string; name: string | null; email: string | null; track: string | null; from_plan: string | null; to_plan: string; status: string; memo: string | null; created_at: string; decided_at: string | null }
export interface SenderReq { id: string; user_id: string; name: string | null; email: string | null; phone: string; label: string | null; status: string; created_at: string; decided_at: string | null }
export interface PointReq { id: string; user_id: string; name: string | null; email: string | null; amount: number; memo: string | null; status: string; created_at: string; decided_at: string | null }
export interface CreditReq { id: string; user_id: string; name: string | null; email: string | null; amount: number; price: number; memo: string | null; status: string; created_at: string; decided_at: string | null }
export interface TeamOrderReq { id: string; user_id: string; name: string | null; email: string | null; seats: number; months: number; amount: number; status: string; created_at: string; paid_at: string | null }
export interface ContactMsg { id: string; name: string | null; email: string | null; phone: string | null; company: string | null; message: string | null; status: string; created_at: string }
export interface PublicLead { id: string; name: string | null; phone: string | null; email: string | null; source: string | null; country: string | null; created_at: string }

export async function adminApprovals(): Promise<{
  ok: boolean; error?: string
  planRequests: PlanReq[]; senderNumbers: SenderReq[]; pointRequests: PointReq[]; creditRequests: CreditReq[]; teamOrders: TeamOrderReq[]; signups: User[]
  contacts: ContactMsg[]; leads: PublicLead[]
  stats?: { pendingPlans: number; pendingSenders: number; pendingPoints: number; pendingCredits: number; pendingTeam: number; totalMembers: number; newContacts: number; leadsTotal: number }
}> {
  try {
    const r = await fetch('/api/admin/approvals', { credentials: 'include' })
    const d = await r.json()
    return {
      ok: !!d.ok, error: d.error,
      planRequests: d.planRequests || [], senderNumbers: d.senderNumbers || [],
      pointRequests: d.pointRequests || [], creditRequests: d.creditRequests || [], teamOrders: d.teamOrders || [],
      signups: d.signups || [], contacts: d.contacts || [], leads: d.leads || [], stats: d.stats,
    }
  } catch {
    return { ok: false, error: '네트워크 오류', planRequests: [], senderNumbers: [], pointRequests: [], creditRequests: [], teamOrders: [], signups: [], contacts: [], leads: [] }
  }
}
export async function adminApprovalAction(
  type: 'plan' | 'sender' | 'point' | 'credit' | 'team',
  id: string,
  decision: 'approve' | 'reject',
): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/admin/approvals', { type, id, decision })
}

/* ───────── 신청 (사용자 본인) ───────── */
export type PlanTrack = 'marketer' | 'video'
export async function requestPlan(track: PlanTrack, to_plan: string, memo?: string): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/account/plan-request', { track, to_plan, memo })
}
/** 구독 취소 — 해당 트랙 플랜을 '없음'으로 즉시 해지 */
export async function cancelPlan(track: PlanTrack): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/account/plan-cancel', { track })
}
export async function requestPoint(amount: number, memo?: string): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/account/point-request', { amount, memo })
}
export async function myPointRequests(): Promise<{ ok: boolean; requests: any[] }> {
  try {
    const r = await fetch('/api/account/point-request', { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, requests: d.requests || [] }
  } catch { return { ok: false, requests: [] } }
}

/* ───────── 크레딧 (충전 신청 / 차감 사용) ───────── */
/** 기능별 크레딧 소모량 */
export const CREDIT_COSTS: Record<string, { cost: number; label: string }> = {
  video: { cost: 5, label: 'AI 영상 제작' },
  landing: { cost: 3, label: '랜딩페이지 생성' },
  blog: { cost: 2, label: '블로그 글 생성' },
  youtube: { cost: 1, label: '유튜브 분석' },
  instagram: { cost: 1, label: '인스타 콘텐츠 생성' },
  place: { cost: 1, label: '플레이스 순위 조회' },
}
/** 크레딧 충전 패키지 */
// 추가 크레딧 구매 단가 = 65원/크레딧 (요금제 정산 기준 50원과 별개)
export const CREDIT_PACKAGES: { credits: number; price: number; badge?: string }[] = [
  { credits: 10, price: 650 },
  { credits: 50, price: 3250, badge: '인기' },
  { credits: 100, price: 6500, badge: '추천' },
  { credits: 300, price: 19500 },
]

export async function requestCredit(amount: number, price?: number, memo?: string): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/account/credit-request', { amount, price, memo })
}
export async function myCreditRequests(): Promise<{ ok: boolean; requests: any[] }> {
  try {
    const r = await fetch('/api/account/credit-request', { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, requests: d.requests || [] }
  } catch { return { ok: false, requests: [] } }
}
/** 기능 사용 시 크레딧 차감. 부족하면 ok:false + error */
export async function useCredit(amount: number, feature: string, memo?: string): Promise<{ ok: boolean; error?: string; balanceAfter?: number; user?: User }> {
  return postJson('/api/account/credit-use', { amount, feature, memo })
}
export async function myPlanRequests(): Promise<{ ok: boolean; requests: any[] }> {
  try {
    const r = await fetch('/api/account/plan-request', { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, requests: d.requests || [] }
  } catch { return { ok: false, requests: [] } }
}
export interface MySender { id: string; phone: string; label: string | null; status: string; created_at: string; decided_at: string | null }
export async function mySenders(): Promise<{ ok: boolean; senders: MySender[] }> {
  try {
    const r = await fetch('/api/account/sender', { credentials: 'include' })
    const d = await r.json()
    return { ok: !!d.ok, senders: d.senders || [] }
  } catch { return { ok: false, senders: [] } }
}
export async function registerSender(phone: string, label?: string): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/account/sender', { phone, label })
}
