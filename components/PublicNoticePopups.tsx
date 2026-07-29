'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { X, MoonStar } from 'lucide-react'
import { NoticeMedia } from '@/components/NoticeMedia'

interface PubNotice {
  id: string; title: string; body: string
  imageUrl: string; videoUrl?: string; ctaLabel: string; ctaUrl: string; createdAt: string
  /** 강력 알림 — 하단 토스트가 아니라 화면 정중앙에 가림막과 함께 띄운다(광고 집행용) */
  strong?: boolean
  /** "N일 동안 보지 않기" 의 N — 집행마다 정한다(기본 3일) */
  snoozeDays?: number
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
  /* "N일 동안 보지 않기" = N일간 숨김(서버 스누즈). 이후 집행 기간이 남아 있으면 다시 노출된다.
     N 은 집행마다 관리자가 정한다(기본 3일). */
  const snoozeDays = (n: PubNotice) => { post(n.id, 'snooze', snoozeN(n)); animateOut(n.id) }

  const go = (n: PubNotice) => {
    post(n.id, 'convert')
    if (n.ctaUrl) {
      if (/^https?:\/\//i.test(n.ctaUrl)) window.open(n.ctaUrl, '_blank', 'noopener,noreferrer')
      else window.location.href = n.ctaUrl
    }
    animateOut(n.id)
  }

  if (skip || items.length === 0) return null
  /* 강력 알림은 화면을 가로막으므로 한 번에 하나만 띄운다(가장 최근 집행).
     나머지는 예전처럼 하단 토스트로 쌓인다 — 두 종류가 동시에 떠도 서로 가리지 않는다. */
  const strongOne = items.find((n) => n.strong)
  const toasts = items.filter((n) => n !== strongOne).slice(0, 3)

  return (
    <>
      {strongOne && (
        <StrongNoticeModal
          n={strongOne}
          closing={!!closing[strongOne.id]}
          onClose={() => dismiss(strongOne.id)}
          onSnooze={() => snoozeDays(strongOne)}
          onCta={() => go(strongOne)}
        />
      )}
      <ToastStack
        items={toasts}
        shown={shown}
        closing={closing}
        onClose={dismiss}
        onSnooze={(n) => snoozeDays(n)}
        onCta={go}
      />
    </>
  )
}

/* ── 하단 토스트(일반 알림) ── */
function ToastStack({
  items, shown, closing, onClose, onSnooze, onCta,
}: {
  items: PubNotice[]; shown: boolean; closing: Record<string, boolean>
  onClose: (id: string) => void; onSnooze: (n: PubNotice) => void; onCta: (n: PubNotice) => void
}) {
  if (items.length === 0) return null
  const visible = items

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
                  onClick={() => onClose(n.id)}
                  aria-label="닫기"
                  className="-mr-1 -mt-1 flex-shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              </div>
              {n.body && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">{n.body}</p>}
              {n.ctaLabel && n.ctaUrl && (
                <button
                  onClick={() => onCta(n)}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110 active:scale-[0.99]"
                >
                  {n.ctaLabel}
                </button>
              )}
              <div className="mt-1.5 text-center">
                <button
                  onClick={() => onSnooze(n)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-slate-600"
                >
                  <MoonStar size={11} /> {snoozeLabel(n)}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* 집행마다 정한 "N일 동안 보지 않기" — 서버가 안 내려주면 3일 */
function snoozeN(n: PubNotice): number {
  const d = Number(n.snoozeDays)
  return Number.isFinite(d) && d >= 1 ? Math.min(30, Math.round(d)) : 3
}
function snoozeLabel(n: PubNotice): string {
  return `${snoozeN(n)}일 동안 보지 않기`
}

/* ── 강력 알림 — 화면 정중앙 + 가림막 ──
   접속하자마자 화면 한가운데를 차지하는 광고 집행이다. 그래서 일반 토스트보다 지켜야 할 게 많다.
     · 가림막을 눌러도 닫히지 않는다 — 실수로 스쳐서 광고가 사라지면 집행이 무의미해진다.
       닫는 길은 X 와 "N일 동안 보지 않기" 두 개로 분명히 둔다.
     · Esc 는 받는다 — 키보드만 쓰는 사람에게 빠져나갈 길이 없으면 안 된다.
     · 열려 있는 동안 뒤 페이지 스크롤을 잠근다(모달 뒤가 같이 움직이면 조작이 어긋난다).
     · 영상이 길어도 모달 안에서만 스크롤되게 한다 — 화면 밖으로 CTA 가 밀려나면 신청을 못 한다. */
function StrongNoticeModal({
  n, closing, onClose, onSnooze, onCta,
}: {
  n: PubNotice; closing: boolean
  onClose: () => void; onSnooze: () => void; onCta: () => void
}) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const open = shown && !closing
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={n.title}
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
    >
      {/* 가림막 — 클릭으로 닫히지 않는다(광고가 실수로 사라지지 않게) */}
      <div
        aria-hidden="true"
        className={[
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <div
        className={[
          'relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 ease-out',
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        ].join(' ')}
        style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,.6)' }}
      >
        <div className="h-1.5 w-full flex-shrink-0 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
        {/* 내용이 길어도 모달 안에서만 스크롤 — CTA 가 화면 밖으로 밀려나지 않는다 */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NoticeMedia imageUrl={n.imageUrl} videoUrl={n.videoUrl} full />
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold leading-snug text-slate-900 sm:text-xl">{n.title}</h2>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="-mr-1.5 -mt-1.5 flex-shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            {n.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 sm:text-[15px]">{n.body}</p>
            )}
          </div>
        </div>
        {/* CTA 는 스크롤 밖에 고정 — 영상이 길어도 신청 버튼은 늘 보인다 */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-5 pb-4 pt-3 sm:px-6">
          {n.ctaLabel && n.ctaUrl && (
            <button
              onClick={onCta}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110 active:scale-[0.99]"
            >
              {n.ctaLabel}
            </button>
          )}
          <div className="mt-2 flex items-center justify-center gap-4">
            <button
              onClick={onSnooze}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-slate-600"
            >
              <MoonStar size={12} /> {snoozeLabel(n)}
            </button>
            <button onClick={onClose} className="text-xs font-medium text-slate-400 transition hover:text-slate-600">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
