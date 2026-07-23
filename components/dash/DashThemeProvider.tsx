'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'          // 실제 적용되는 테마(해석 결과)
type Mode = 'system' | 'light' | 'dark' // 사용자가 고른 값(시스템 = OS 설정 따라감)
const KEY = 'dashTheme'

const Ctx = createContext<{
  theme: Theme            // 현재 실제 적용 테마(system 이면 OS 설정으로 해석)
  mode: Mode              // 사용자가 고른 값
  setMode: (m: Mode) => void
  setTheme: (t: Theme) => void // 하위호환(라이트/다크 직접 지정)
  toggle: () => void
}>({
  theme: 'light',
  mode: 'system',
  setMode: () => {},
  setTheme: () => {},
  toggle: () => {},
})

export const useDashTheme = () => useContext(Ctx)

// OS 다크모드 여부
function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 대시보드 테마 — 시스템 / 라이트 / 다크 3가지.
 *  · 'system' → OS(브라우저) 설정을 그대로 따라가고, 설정이 바뀌면 실시간 반영.
 *  · 'light' / 'dark' → 사용자가 명시적으로 고정.
 * .dash-shell 래퍼에 site-light / site-dark 클래스를 부여해 토큰을 재매핑한다.
 * 선택값(mode)은 localStorage(dashTheme)에 저장. 기본값은 시스템.
 */
export function DashThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('system')
  const [systemDark, setSystemDark] = useState(false)

  // 초기 로드: 저장된 선택값 복원 (기존 'light'/'dark' 값도 그대로 인정)
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY)
      if (s === 'dark' || s === 'light' || s === 'system') setModeState(s)
    } catch {}
    setSystemDark(systemPrefersDark())
  }, [])

  // OS 다크모드 변경 실시간 구독 (system 모드일 때 즉시 반영)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const theme: Theme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  const setMode = (m: Mode) => {
    setModeState(m)
    try { localStorage.setItem(KEY, m) } catch {}
  }
  const setTheme = (t: Theme) => setMode(t)
  const toggle = () => setMode(theme === 'dark' ? 'light' : 'dark')

  return (
    <Ctx.Provider value={{ theme, mode, setMode, setTheme, toggle }}>
      <div className={`dash-shell ${theme === 'dark' ? 'site-dark' : 'site-light'}`}>{children}</div>
    </Ctx.Provider>
  )
}
