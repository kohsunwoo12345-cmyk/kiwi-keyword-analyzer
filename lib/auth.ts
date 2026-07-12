'use client'

import { useEffect, useState } from 'react'

// 정적 사이트용 클라이언트 목업 인증 (localStorage 기반)
export interface User {
  id: string
  name: string
  email: string
  password: string
  company: string
  plan: 'Starter' | 'Pro' | 'Business'
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  createdAt: string
  lastActive: string
}

const UKEY = 'bygency_users'
const SKEY = 'bygency_session'

function now() {
  return new Date().toISOString()
}

const SEED: User[] = [
  {
    id: 'admin',
    name: '관리자',
    email: 'admin@bygency.com',
    password: 'admin1234',
    company: '(주)Next Vision Company',
    plan: 'Business',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-02T09:00:00.000Z',
    lastActive: now(),
  },
  {
    id: 'u_seoyeon',
    name: '김서연',
    email: 'seoyeon@example.com',
    password: 'test1234',
    company: '뷰티랩',
    plan: 'Pro',
    role: 'user',
    status: 'active',
    createdAt: '2026-06-11T04:20:00.000Z',
    lastActive: '2026-07-12T02:10:00.000Z',
  },
  {
    id: 'u_junho',
    name: '이준호',
    email: 'junho@example.com',
    password: 'test1234',
    company: '커머스노트',
    plan: 'Starter',
    role: 'user',
    status: 'active',
    createdAt: '2026-07-01T01:00:00.000Z',
    lastActive: '2026-07-12T03:40:00.000Z',
  },
  {
    id: 'u_minji',
    name: '박민지',
    email: 'minji@example.com',
    password: 'test1234',
    company: '마케팅탐구소',
    plan: 'Pro',
    role: 'user',
    status: 'active',
    createdAt: '2026-05-22T08:00:00.000Z',
    lastActive: '2026-07-11T11:30:00.000Z',
  },
  {
    id: 'u_doyoon',
    name: '최도윤',
    email: 'doyoon@example.com',
    password: 'test1234',
    company: '헬스핏',
    plan: 'Starter',
    role: 'user',
    status: 'suspended',
    createdAt: '2026-04-15T05:00:00.000Z',
    lastActive: '2026-06-30T09:15:00.000Z',
  },
]

export function getUsers(): User[] {
  if (typeof window === 'undefined') return SEED
  try {
    const raw = window.localStorage.getItem(UKEY)
    if (!raw) {
      window.localStorage.setItem(UKEY, JSON.stringify(SEED))
      return SEED
    }
    return JSON.parse(raw)
  } catch {
    return SEED
  }
}

export function saveUsers(users: User[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(UKEY, JSON.stringify(users))
}

export function signup(input: {
  name: string
  email: string
  password: string
  company?: string
}): { ok: boolean; error?: string; user?: User } {
  const users = getUsers()
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: '이미 가입된 이메일입니다.' }
  }
  const user: User = {
    id: 'u_' + Math.random().toString(36).slice(2, 9),
    name: input.name,
    email: input.email,
    password: input.password,
    company: input.company || '',
    plan: 'Starter',
    role: 'user',
    status: 'active',
    createdAt: now(),
    lastActive: now(),
  }
  saveUsers([user, ...users])
  setSession(user.id)
  return { ok: true, user }
}

export function login(email: string, password: string): { ok: boolean; error?: string; user?: User } {
  const users = getUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || user.password !== password) {
    return { ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }
  if (user.status === 'suspended') {
    return { ok: false, error: '정지된 계정입니다. 관리자에게 문의하세요.' }
  }
  user.lastActive = now()
  saveUsers(users.map((u) => (u.id === user.id ? user : u)))
  setSession(user.id)
  return { ok: true, user }
}

export function logout() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SKEY)
}

function setSession(id: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SKEY, id)
}

export function currentUser(): User | null {
  if (typeof window === 'undefined') return null
  const id = window.localStorage.getItem(SKEY)
  if (!id) return null
  return getUsers().find((u) => u.id === id) || null
}

/** 로그인 상태 훅 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setUser(currentUser())
    setReady(true)
  }, [])
  return { user, ready, setUser }
}
