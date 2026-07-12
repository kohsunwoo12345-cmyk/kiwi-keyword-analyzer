'use client'

import { useEffect, useState } from 'react'

// Cloudflare Pages Functions(D1) 기반 실제 인증 클라이언트
export interface User {
  id: string
  name: string
  email: string
  company: string
  plan: 'Starter' | 'Pro' | 'Business'
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  createdAt: string
  lastActive: string | null
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

/** 관리자: 회원 상태/플랜 변경·삭제 */
export async function adminAction(
  action: 'suspend' | 'activate' | 'delete' | 'plan',
  id: string,
  extra?: { plan?: string },
): Promise<{ ok: boolean; error?: string }> {
  return postJson('/api/admin/users', { action, id, ...extra })
}
