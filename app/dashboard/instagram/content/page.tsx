'use client'

import { useState } from 'react'
import { Image as ImageIcon, Camera, Calendar, Trash2, Plus, Send } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { cn } from '@/lib/utils'

const ACCENT = '#ec4899'

type Status = '예약됨' | '게시됨' | '초안'
type Post = {
  id: string
  caption: string
  hashtags: string
  scheduledAt: string
  status: Status
  gradient: string
}

const gradients = [
  'from-pink-400 to-rose-500',
  'from-fuchsia-400 to-purple-500',
  'from-rose-400 to-orange-400',
  'from-violet-400 to-fuchsia-500',
  'from-amber-400 to-pink-500',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-purple-400 to-pink-500',
]

const SEED: Post[] = [
  {
    id: 's1',
    caption: '여름 신상 컬렉션이 도착했어요! 지금 매장에서 만나보세요 🌸',
    hashtags: '#바이전시 #여름신상 #뷰티',
    scheduledAt: '2026-07-14T10:00',
    status: '예약됨',
    gradient: 'from-pink-400 to-rose-500',
  },
  {
    id: 's2',
    caption: '베스트셀러 립 컬렉션 재입고 안내 💄 놓치지 마세요',
    hashtags: '#립스틱 #재입고 #바이전시',
    scheduledAt: '2026-07-15T18:30',
    status: '예약됨',
    gradient: 'from-fuchsia-400 to-purple-500',
  },
  {
    id: 's3',
    caption: '고객님들의 생생한 후기 모음 ✨ 감사합니다!',
    hashtags: '#고객후기 #리뷰 #바이전시',
    scheduledAt: '2026-07-10T12:00',
    status: '게시됨',
    gradient: 'from-rose-400 to-orange-400',
  },
  {
    id: 's4',
    caption: '주말 한정 특가 이벤트 진행 중! 최대 40% 할인',
    hashtags: '#세일 #이벤트 #할인',
    scheduledAt: '2026-07-08T09:00',
    status: '게시됨',
    gradient: 'from-violet-400 to-fuchsia-500',
  },
  {
    id: 's5',
    caption: '가을 신상 티저 (작성 중)',
    hashtags: '#가을신상 #티저',
    scheduledAt: '',
    status: '초안',
    gradient: 'from-amber-400 to-pink-500',
  },
]

const TABS: Array<'전체' | Status> = ['전체', '예약됨', '게시됨', '초안']

const statusBadge: Record<Status, string> = {
  예약됨: 'border-sky-200 bg-sky-50 text-sky-700',
  게시됨: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  초안: 'border-amber-200 bg-amber-50 text-amber-700',
}

export default function InstagramContentPage() {
  const [posts, setPosts] = useLocalStorage<Post[]>('bivience_ig_posts', SEED)
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [tab, setTab] = useState<'전체' | Status>('전체')
  const [toast, setToast] = useState('')

  function schedule() {
    if (!caption.trim()) return
    const id = `p${Date.now()}`
    const gradient = gradients[Math.floor(Math.random() * gradients.length)]
    setPosts((prev) => [
      { id, caption, hashtags, scheduledAt, status: scheduledAt ? '예약됨' : '초안', gradient },
      ...prev,
    ])
    setCaption('')
    setHashtags('')
    setScheduledAt('')
    setToast('게시물이 예약 목록에 추가되었습니다')
    setTimeout(() => setToast(''), 3000)
  }

  function remove(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const filtered = tab === '전체' ? posts : posts.filter((p) => p.status === tab)
  const feedPosts = posts.filter((p) => p.status !== '초안')

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ImageIcon}
        eyebrow="인스타그램"
        title="콘텐츠 관리"
        desc="게시물을 작성·예약하고 예약된 콘텐츠와 피드 미리보기를 관리합니다."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        {toast && (
          <div className="animate-fade-in rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
            {toast}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* New post */}
          <Panel title="새 게시물">
            <div className="space-y-4">
              <div className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)] transition-colors hover:border-pink-400 hover:text-pink-500">
                <Camera size={28} />
                <p className="text-sm font-medium">이미지 업로드</p>
                <p className="text-xs">클릭하거나 파일을 끌어다 놓으세요</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">캡션</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  placeholder="게시물 문구를 입력하세요."
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">해시태그</label>
                <input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#바이전시 #신상 #뷰티"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">예약 일시</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <Button
                onClick={schedule}
                disabled={!caption.trim()}
                className="w-full !bg-gradient-to-br !from-pink-500 !to-fuchsia-500"
              >
                <Calendar size={16} /> 예약
              </Button>
            </div>
          </Panel>

          {/* Scheduled content */}
          <Panel title="예약된 콘텐츠">
            <div className="mb-4 flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors',
                    tab === t
                      ? 'bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white'
                      : 'border border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">해당 상태의 콘텐츠가 없습니다.</p>
              )}
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center gap-3 rounded-xl border border-[var(--border)] p-2.5 transition-colors hover:bg-slate-50"
                >
                  <span className={`h-14 w-14 flex-shrink-0 rounded-lg bg-gradient-to-br ${p.gradient}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.caption}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-dim)]">
                      <Calendar size={12} /> {p.scheduledAt ? p.scheduledAt.replace('T', ' ') : '미정'}
                    </p>
                  </div>
                  <Badge className={statusBadge[p.status]}>{p.status}</Badge>
                  <button
                    onClick={() => remove(p.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-dim)] hover:bg-rose-50 hover:text-rose-500"
                    aria-label="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Feed preview */}
        <Panel
          title="피드 미리보기"
          action={<span className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]"><Send size={13} /> 예약 · 게시 콘텐츠</span>}
        >
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {feedPosts.map((p) => (
              <div key={p.id} className={`relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br ${p.gradient}`}>
                <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {p.caption}
                </span>
              </div>
            ))}
            {feedPosts.length === 0 && (
              <p className="col-span-3 py-8 text-center text-sm text-[var(--text-dim)]">
                예약 또는 게시된 콘텐츠가 없습니다.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
