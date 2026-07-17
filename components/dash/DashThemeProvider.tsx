'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'dashTheme'

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: 'light',
  setTheme: () => {},
  toggle: () => {},
})

export const useDashTheme = () => useContext(Ctx)

/**
 * 대시보드 라이트/다크 테마.
 * .dash-shell 래퍼에 site-light / site-dark 클래스를 부여해 토큰을 재매핑한다.
 * 선택값은 localStorage(dashTheme)에 저장된다. 기본값은 라이트.
 */
export function DashThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY)
      if (s === 'dark' || s === 'light') setThemeState(s)
    } catch {}
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try {
      localStorage.setItem(KEY, t)
    } catch {}
  }
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle }}>
      <div className={`dash-shell ${theme === 'dark' ? 'site-dark' : 'site-light'}`}>{children}</div>
    </Ctx.Provider>
  )
}
