'use client'

import { useEffect, useState } from 'react'

// Cloudflare Pages Functions(D1) 기반 실제 인증 클라이언트
export interface User {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  plan: '없음' | 'Starter' | 'Pro' | 'Business'
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  points: number
  credits: number
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
}): Promise<AuthResult> {
  return postJson('/api/signup', input)
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
    byPlan: { Starter: number; Pro: number; Business: number }
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
  action: 'suspend' | 'activate' | 'delete' | 'plan' | 'password' | 'points' | 'credits' | 'notify',
  id: string,
  extra?: {
    plan?: string
    password?: string
    amount?: number
    memo?: string
    title?: string
    body?: string
    sms?: boolean
    phone?: string
  },
): Promise<{ ok: boolean; error?: string; sms?: { sent: boolean; reason?: string } }> {
  return postJson('/api/admin/users', { action, id, ...extra })
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

/** 사용자 본인: 비밀번호 변경 */
export async function changePassword(current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/account/password', { current, next })
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

export interface SecurityBundle {
  ok: boolean; error?: string
  settings: { whitelistMode: boolean }
  blocked: BlockedIp[]; whitelist: WhitelistIp[]; logs: SecLog[]; loginFailures: LoginFail[]
  sessions: SessionRow[]; audit: AuditRow[]; exports: ExportRow[]; reports: ReportRow[]; installs: InstallRow[]
  stats: {
    blockedCount: number; whitelistCount: number; events24: number; threats24: number
    loginFails24: number; activeSessions: number; pendingReports: number; installsTotal: number; pushAllowed: number
  }
}

export async function adminSecurity(): Promise<SecurityBundle> {
  const empty: SecurityBundle = {
    ok: false, settings: { whitelistMode: false }, blocked: [], whitelist: [], logs: [], loginFailures: [],
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

/* ───────── 승인 관리 (관리자) ───────── */
export interface PlanReq { id: string; user_id: string; name: string | null; email: string | null; from_plan: string | null; to_plan: string; status: string; memo: string | null; created_at: string; decided_at: string | null }
export interface SenderReq { id: string; user_id: string; name: string | null; email: string | null; phone: string; label: string | null; status: string; created_at: string; decided_at: string | null }
export interface PointReq { id: string; user_id: string; name: string | null; email: string | null; amount: number; memo: string | null; status: string; created_at: string; decided_at: string | null }
export interface CreditReq { id: string; user_id: string; name: string | null; email: string | null; amount: number; price: number; memo: string | null; status: string; created_at: string; decided_at: string | null }
export interface ContactMsg { id: string; name: string | null; email: string | null; phone: string | null; company: string | null; message: string | null; status: string; created_at: string }
export interface PublicLead { id: string; name: string | null; phone: string | null; email: string | null; source: string | null; country: string | null; created_at: string }

export async function adminApprovals(): Promise<{
  ok: boolean; error?: string
  planRequests: PlanReq[]; senderNumbers: SenderReq[]; pointRequests: PointReq[]; creditRequests: CreditReq[]; signups: User[]
  contacts: ContactMsg[]; leads: PublicLead[]
  stats?: { pendingPlans: number; pendingSenders: number; pendingPoints: number; pendingCredits: number; totalMembers: number; newContacts: number; leadsTotal: number }
}> {
  try {
    const r = await fetch('/api/admin/approvals', { credentials: 'include' })
    const d = await r.json()
    return {
      ok: !!d.ok, error: d.error,
      planRequests: d.planRequests || [], senderNumbers: d.senderNumbers || [],
      pointRequests: d.pointRequests || [], creditRequests: d.creditRequests || [],
      signups: d.signups || [], contacts: d.contacts || [], leads: d.leads || [], stats: d.stats,
    }
  } catch {
    return { ok: false, error: '네트워크 오류', planRequests: [], senderNumbers: [], pointRequests: [], creditRequests: [], signups: [], contacts: [], leads: [] }
  }
}
export async function adminApprovalAction(
  type: 'plan' | 'sender' | 'point' | 'credit',
  id: string,
  decision: 'approve' | 'reject',
): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/admin/approvals', { type, id, decision })
}

/* ───────── 신청 (사용자 본인) ───────── */
export async function requestPlan(to_plan: string, memo?: string): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/account/plan-request', { to_plan, memo })
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
export const CREDIT_PACKAGES: { credits: number; price: number; badge?: string }[] = [
  { credits: 10, price: 9900 },
  { credits: 50, price: 39000, badge: '인기' },
  { credits: 100, price: 69000, badge: '추천' },
  { credits: 300, price: 180000 },
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
