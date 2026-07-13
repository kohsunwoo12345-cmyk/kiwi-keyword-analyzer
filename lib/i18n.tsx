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

function detectInitial(): Lang {
  if (typeof window === 'undefined') return 'ko'
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved && ['ko', 'en', 'ja', 'zh'].includes(saved)) return saved
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || 'ko').slice(0, 2).toLowerCase()
  return (['ko', 'en', 'ja', 'zh'].includes(nav) ? nav : 'ko') as Lang
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const l = detectInitial()
    setLangState(l)
    setReady(true)
    document.documentElement.lang = l
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
