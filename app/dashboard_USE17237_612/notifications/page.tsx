'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, Circle, ExternalLink, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { fetchNoticeHistory, type NoticeHistoryItem } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'
import { NoticeMedia } from '@/components/NoticeMedia'

const ACCENT = '#6366f1'

export default function NotificationsPage() {
  const [items, setItems] = useState<NoticeHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchNoticeHistory().then((d) => { setItems(d.history || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Bell}
        eyebrow="알림"
        title="받은 알림 내역"
        desc="지금까지 받은 모든 팝업 알림을 한 곳에서 확인합니다. (읽음/안읽음 표시 · 한국시간)"
        accent={ACCENT}
        action={
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-soft)] hover:bg-[var(--panel-2)]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
        }
      />

      <div className="p-6 lg:p-8">
        <Reveal>
          <Panel title={<span className="flex items-center gap-2"><Bell size={16} className="text-indigo-500" /> 받은 알림 <span className="text-xs font-normal text-[var(--text-dim)]">({items.length}건)</span></span>}>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-dim)]"><RefreshCw size={16} className="animate-spin" /> 불러오는 중…</div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/12 text-indigo-500"><Bell size={26} /></span>
                <p className="mt-4 font-semibold">아직 받은 알림이 없습니다.</p>
                <p className="mt-1 text-sm text-[var(--text-dim)]">공지·프로모션 알림이 오면 여기에 모두 기록됩니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((n) => (
                  <div key={n.id + n.receivedAt} className="overflow-hidden rounded-xl border border-[var(--border)]">
                    {(n.videoUrl || n.imageUrl) && (
                      <div className="max-h-56 overflow-hidden">
                        <NoticeMedia imageUrl={n.imageUrl} videoUrl={n.videoUrl} />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[var(--text)]">{n.title}</div>
                          {n.body && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-soft)]">{n.body}</p>}
                        </div>
                        {n.read
                          ? <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={12} /> 읽음</span>
                          : <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-indigo-500/12 px-2 py-0.5 text-[11px] font-semibold text-indigo-600"><Circle size={12} /> 새 알림</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-dim)]">
                        <span>받은 시각: {kstDateTime(n.receivedAt)}</span>
                        {n.read && n.readAt && <span>· 읽은 시각: {kstDateTime(n.readAt)}</span>}
                        {n.ctaLabel && n.ctaUrl && (
                          <a href={n.ctaUrl} target={/^https?:\/\//.test(n.ctaUrl) ? '_blank' : undefined} rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">
                            {n.ctaLabel} <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}
