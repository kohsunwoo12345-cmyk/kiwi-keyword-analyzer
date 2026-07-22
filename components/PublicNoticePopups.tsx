'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { X, MoonStar } from 'lucide-react'
import { NoticeMedia } from '@/components/NoticeMedia'

interface PubNotice {
  id: string; title: string; body: string
  imageUrl: string; videoUrl?: string; ctaLabel: string; ctaUrl: string; createdAt: string
}

// 같은 세션에서 닫은 알림은 새로고침 전까지 다시 뜨지 않게 (기간형은 새 방문 때 다시 노출)
function sessionDismissed(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem('bg_notice_dismissed') || '[]')) } catch { return new Set() }
}
function addSessionDismissed(id: string) {
  try { const s = sessionDismissed(); s.add(id); sessionStorage.setItem('bg_notice_dismissed', JSON.stringify([...s])) } catch { /* noop */ }
}

function getVisitorId(): string {
  try {
    let v = localStorage.getItem('bg_visitor') || ''
    if (!v) { v = 'vz_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('bg_visitor', v) }
    return v
  } catch { return '' }
}

// 홈페이지·공개페이지 방문자(비회원 포함) 팝업 알림 — "접속 전체" 발송.
// 하단→상단 슬라이드로 올라오고, X 를 눌러야 사라진다(=읽음). CTA 클릭 = 전환 기록.
export function PublicNoticePopups() {
  const pathname = usePathname() || '/'
  const [items, setItems] = useState<PubNotice[]>([])
  const [closing, setClosing] = useState<Record<string, boolean>>({})
  const [shown, setShown] = useState(false)

  // 회원 전용 콘솔(대시보드/관리자)에서는 회원용 팝업이 따로 뜨므로 제외
  const skip = pathname.startsWith('/dashboard') || pathname.startsWith('/adminsunkoh')

  const poll = useCallback(() => {
    if (skip) return
    const visitor = getVisitorId()
    fetch(`/api/public-notices?path=${encodeURIComponent(pathname)}&visitor=${encodeURIComponent(visitor)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && Array.isArray(d.notices)) {
          const dismissed = sessionDismissed()
          setItems((prev) => {
            const map = new Map(prev.map((n) => [n.id, n]))
            d.notices.forEach((n: PubNotice) => { if (!map.has(n.id) && !dismissed.has(n.id)) map.set(n.id, n) })
            return Array.from(map.values())
          })
        }
      })
      .catch(() => {})
  }, [pathname, skip])

  useEffect(() => {
    if (skip) { setItems([]); return }
    poll()
    const iv = setInterval(poll, 45000)
    const t = setTimeout(() => setShown(true), 60)
    return () => { clearInterval(iv); clearTimeout(t) }
  }, [poll, skip])

  const post = (campaignId: string, kind: 'read' | 'convert' | 'snooze', days?: number) => {
    try {
      fetch('/api/public-notices', {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ campaignId, visitor: getVisitorId(), kind, days, path: pathname }),
      }).catch(() => {})
    } catch { /* noop */ }
  }

  const animateOut = (id: string) => {
    setClosing((c) => ({ ...c, [id]: true }))
    addSessionDismissed(id)
    setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id))
      setClosing((c) => { const n = { ...c }; delete n[id]; return n })
    }, 320)
  }
  // X = 읽음(닫기). 기간형이면 새 방문 때 다시 뜸(스누즈 아님)
  const dismiss = (id: string) => { post(id, 'read'); animateOut(id) }
  // "3일 동안 보지 않기" = 3일간 숨김(서버 스누즈). 이후 기간 유지 중이면 재노출
  const snooze3 = (id: string) => { post(id, 'snooze', 3); animateOut(id) }

  const go = (n: PubNotice) => {
    post(n.id, 'convert')
    if (n.ctaUrl) {
      if (/^https?:\/\//i.test(n.ctaUrl)) window.open(n.ctaUrl, '_blank', 'noopener,noreferrer')
      else window.location.href = n.ctaUrl
    }
    animateOut(n.id)
  }

  if (skip || items.length === 0) return null
  const visible = items.slice(0, 3)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[300] flex flex-col items-center gap-3 p-4 sm:items-end sm:p-6">
      {visible.map((n) => {
        const isClosing = closing[n.id]
        return (
          <div
            key={n.id}
            className={[
              'pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300 ease-out',
              shown && !isClosing ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
            ].join(' ')}
            style={{ boxShadow: '0 20px 50px -12px rgba(0,0,0,.35)' }}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
            <NoticeMedia imageUrl={n.imageUrl} videoUrl={n.videoUrl} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-extrabold leading-snug text-slate-900">{n.title}</div>
                <button
                  onClick={() => dismiss(n.id)}
                  aria-label="닫기"
                  className="-mr-1 -mt-1 flex-shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              </div>
              {n.body && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">{n.body}</p>}
              {n.ctaLabel && n.ctaUrl && (
                <button
                  onClick={() => go(n)}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110 active:scale-[0.99]"
                >
                  {n.ctaLabel}
                </button>
              )}
              <div className="mt-1.5 text-center">
                <button
                  onClick={() => snooze3(n.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-slate-600"
                >
                  <MoonStar size={11} /> 3일 동안 보지 않기
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
