'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'ko' | 'en' | 'ja' | 'zh'

export const LANGS: { code: Lang; native: string; label: string; flag: string }[] = [
  { code: 'ko', native: '한국어', label: 'Korean', flag: '🇰🇷' },
  { code: 'en', native: 'English', label: 'English', flag: '🇺🇸' },
  { code: 'ja', native: '日本語', label: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', native: '中文', label: 'Chinese', flag: '🇨🇳' },
]

/** 한국어 원문(key) → 각 언어 번역. 없는 언어는 한국어로 폴백. */
export type Dict = Record<string, Partial<Record<Lang, string>>>

interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  ready: boolean
}
const I18nContext = createContext<I18nValue>({ lang: 'ko', setLang: () => {}, ready: false })

const STORAGE_KEY = 'bg_lang'
const VALID: Lang[] = ['ko', 'en', 'ja', 'zh']

function savedLang(): Lang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved && VALID.includes(saved)) return saved
  } catch {
    /* ignore */
  }
  return null
}

function browserLang(): Lang {
  if (typeof navigator === 'undefined') return 'ko'
  const nav = (navigator.language || 'ko').slice(0, 2).toLowerCase()
  return (VALID.includes(nav as Lang) ? nav : 'ko') as Lang
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // 1) 사용자가 직접 선택한 언어가 있으면 그대로 사용 (지오보다 우선)
    const explicit = savedLang()
    if (explicit) {
      setLangState(explicit)
      document.documentElement.lang = explicit
      setReady(true)
      return
    }
    // 2) 선택 이력이 없으면 우선 브라우저 언어로 즉시 표시(깜빡임 최소화)
    const guess = browserLang()
    setLangState(guess)
    document.documentElement.lang = guess
    setReady(true)
    // 3) 접속 IP(국가) 기반으로 언어 확정 — 미선택 사용자만, localStorage에 저장하지 않음
    let aborted = false
    fetch('/api/geo', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { lang?: string }) => {
        if (aborted || !d) return
        const gl = d.lang as Lang
        if (gl && VALID.includes(gl) && !savedLang()) {
          setLangState(gl)
          document.documentElement.lang = gl
        }
      })
      .catch(() => {
        /* geo 실패 시 브라우저 추정 유지 */
      })
    return () => {
      aborted = true
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') document.documentElement.lang = l
  }

  return <I18nContext.Provider value={{ lang, setLang, ready }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

/** 페이지/컴포넌트가 자체 사전으로 번역. t('한국어') → 현재 언어 문자열(없으면 한국어). */
export function useT(messages: Dict = {}) {
  const { lang } = useI18n()
  return (ko: string): string => {
    if (lang === 'ko') return ko
    return messages[ko]?.[lang] ?? ko
  }
}
