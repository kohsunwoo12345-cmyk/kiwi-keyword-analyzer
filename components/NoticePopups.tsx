'use client'

import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { fetchNotices, markNoticeRead, type NoticeItem } from '@/lib/auth'
import { NoticeMedia } from '@/components/NoticeMedia'

// 관리자가 발송한 팝업 알림 — 하단에서 상단으로 슬라이드로 올라온다.
// X 버튼을 눌러야만 사라지고(= 읽음 처리), 사진/CTA 버튼(이동 URL)을 담을 수 있다.
export function NoticePopups() {
  const [items, setItems] = useState<NoticeItem[]>([])
  const [closing, setClosing] = useState<Record<string, boolean>>({})
  const [shown, setShown] = useState(false)

  const poll = useCallback(() => {
    fetchNotices().then((d) => {
      if (d.ok) setItems((prev) => {
        // 이미 닫는 중인 것은 유지, 새 항목만 병합
        const map = new Map(prev.map((n) => [n.id, n]))
        d.notices.forEach((n) => { if (!map.has(n.id)) map.set(n.id, n) })
        return Array.from(map.values())
      })
    })
  }, [])

  useEffect(() => {
    poll()
    const iv = setInterval(poll, 45000)
    // 마운트 직후 슬라이드-업 트리거
    const t = setTimeout(() => setShown(true), 60)
    return () => { clearInterval(iv); clearTimeout(t) }
  }, [poll])

  const dismiss = (id: string) => {
    setClosing((c) => ({ ...c, [id]: true }))
    markNoticeRead(id).catch(() => {})
    setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id))
      setClosing((c) => { const n = { ...c }; delete n[id]; return n })
    }, 320)
  }

  const go = (n: NoticeItem) => {
    if (!n.ctaUrl) return
    if (/^https?:\/\//i.test(n.ctaUrl)) window.open(n.ctaUrl, '_blank', 'noopener,noreferrer')
    else window.location.href = n.ctaUrl
    dismiss(n.id)
  }

  if (items.length === 0) return null

  // 가장 최근 것을 맨 아래(가장 잘 보이게) — 최대 3개 스택 표시
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
                  className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  {n.ctaLabel}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
