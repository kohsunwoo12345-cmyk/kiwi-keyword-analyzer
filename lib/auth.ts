'use client'

import { useEffect, useState } from 'react'

// Cloudflare Pages Functions(D1) 기반 실제 인증 클라이언트
export interface User {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  plan: 'Starter' | 'Pro' | 'Business'
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
