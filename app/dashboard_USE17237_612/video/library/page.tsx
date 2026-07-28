'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Film,
  Play,
  Download,
  Trash2,
  Sparkles,
  Search,
  RefreshCw,
  ImageIcon,
  Clapperboard,
  AlertTriangle,
  Pause,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { kstDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

const ACCENT = '#a855f7'
const STUDIO_URL = '/studio-nvc-prv-8b3k2/#chat'

/** /api/studio/gallery 응답 — 노드 스튜디오 보관함과 같은 소스를 본다 */
type GalleryItem = {
  id: string
  kind: 'video' | 'image'
  url: string
  model: string
  prompt: string
  ts: number
}

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'video', label: '영상' },
  { key: 'image', label: '이미지' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

/** 프롬프트 첫 줄을 제목처럼 쓴다 (보관함에는 별도 제목이 없다) */
function titleOf(it: GalleryItem): string {
  const first = (it.prompt || '').split('\n').find((l) => l.trim())
  const t = (first || '').trim()
  if (!t) return it.kind === 'video' ? '제목 없는 영상' : '제목 없는 이미지'
  return t.length > 60 ? `${t.slice(0, 60)}…` : t
}

export default function VideoLibraryPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const [playing, setPlaying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/studio/gallery', { credentials: 'include', cache: 'no-store' })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || '보관함을 불러오지 못했습니다.')
      setItems((d.items || []).filter((i: GalleryItem) => i.url))
    } catch (e) {
      setError(e instanceof Error ? e.message : '보관함을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function remove(it: GalleryItem) {
    if (!window.confirm(`"${titleOf(it)}"을(를) 보관함에서 삭제할까요?`)) return
    setDeleting(it.id)
    const before = items
    setItems((prev) => prev.filter((x) => x.id !== it.id)) // 먼저 지우고, 실패하면 되돌린다
    try {
      const r = await fetch(`/api/studio/gallery?id=${encodeURIComponent(it.id)}`, { method: 'DELETE', credentials: 'include' })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || '삭제하지 못했습니다.')
    } catch (e) {
      setItems(before)
      setError(e instanceof Error ? e.message : '삭제하지 못했습니다.')
    } finally {
      setDeleting(null)
    }
  }

  const counts = useMemo(() => {
    const video = items.filter((i) => i.kind === 'video').length
    return { all: items.length, video, image: items.length - video }
  }, [items])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (filter !== 'all' && i.kind !== filter) return false
      if (!q) return true
      return i.prompt.toLowerCase().includes(q) || i.model.toLowerCase().includes(q)
    })
  }, [items, filter, query])

  const thisMonth = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7)
    return items.filter((i) => i.ts && new Date(i.ts).toISOString().slice(0, 7) === m).length
  }, [items])

  const topModel = useMemo(() => {
    const tally = new Map<string, number>()
    for (const i of items) if (i.model) tally.set(i.model, (tally.get(i.model) || 0) + 1)
    let best = ''
    let n = 0
    for (const [k, v] of tally) if (v > n) { best = k; n = v }
    return { name: best, count: n }
  }, [items])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Film}
        eyebrow="영상 제작"
        title="내 영상 관리"
        desc="노드 스튜디오에서 만든 영상·이미지를 한 곳에서 확인하고 내려받습니다."
        accent={ACCENT}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침
            </button>
            <Button href={STUDIO_URL} className="!bg-gradient-to-br !from-purple-500 !to-fuchsia-500">
              <Sparkles size={16} /> 새 영상 생성
            </Button>
          </div>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/12 px-3.5 py-2.5 text-[13px] text-rose-500">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={load} className="flex-shrink-0 font-semibold underline">다시 시도</button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="보관함 전체" icon={Film} accent="#a855f7" value={loading ? '—' : `${counts.all}개`} sub="스튜디오 생성 결과물" />
          <Metric label="영상" icon={Clapperboard} accent="#8b5cf6" value={loading ? '—' : `${counts.video}개`} sub="다운로드 가능한 영상" />
          <Metric label="이미지" icon={ImageIcon} accent="#0ea5e9" value={loading ? '—' : `${counts.image}개`} sub="썸네일·컷 이미지 포함" />
          <Metric
            label="이번달 생성"
            icon={Sparkles}
            accent="#f59e0b"
            value={loading ? '—' : `${thisMonth}개`}
            sub={topModel.name ? `가장 많이 쓴 모델 ${topModel.name}` : '모델 사용 기록 없음'}
          />
        </div>

        <Card
          title="보관함"
          desc={loading ? '불러오는 중…' : `${shown.length}개 표시 중 / 전체 ${counts.all}개`}
          bodyClassName={shown.length === 0 && !loading ? 'p-5' : 'p-5'}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="프롬프트·모델 검색"
                  className="w-36 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] py-1.5 pl-8 pr-2.5 text-[12px] outline-none transition-colors focus:border-violet-500 sm:w-48"
                />
              </div>
              <div className="flex gap-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition',
                      filter === f.key
                        ? 'border-violet-500/40 bg-violet-500/15 text-violet-400'
                        : 'border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--panel-2)]',
                    )}
                  >
                    {f.label} <span className="opacity-70">{counts[f.key]}</span>
                  </button>
                ))}
              </div>
            </div>
          }
        >
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="aspect-[9/16] animate-pulse bg-[var(--panel-2)]" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--panel-2)]" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-[var(--panel-2)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={Film}
              title={counts.all === 0 ? '보관함이 비어 있습니다' : '조건에 맞는 결과물이 없습니다'}
              hint={
                counts.all === 0
                  ? '노드 스튜디오에서 영상이나 이미지를 만들면 이곳에 자동으로 쌓입니다.'
                  : '검색어를 지우거나 다른 종류를 선택해 보세요.'
              }
              action={
                counts.all === 0 ? (
                  <a
                    href={STUDIO_URL}
                    className="brand-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold text-white transition hover:brightness-105"
                  >
                    <Sparkles size={14} /> 스튜디오로 이동
                  </a>
                ) : (
                  <button
                    onClick={() => { setQuery(''); setFilter('all') }}
                    className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                  >
                    조건 초기화
                  </button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((it, i) => {
                const isVideo = it.kind === 'video'
                const isPlaying = playing === it.id
                return (
                  <div
                    key={it.id}
                    className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.45)]"
                    style={{ animation: `fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(i, 11) * 45}ms both` }}
                  >
                    <div className="relative aspect-[9/16] overflow-hidden bg-[var(--panel-2)]">
                      {/* 첫 프레임을 아직 못 받았거나 URL이 깨졌을 때 빈 칸 대신 보이는 자리 */}
                      <span className="absolute inset-0 grid place-items-center text-[var(--text-dim)]">
                        {isVideo ? <Clapperboard size={26} /> : <ImageIcon size={26} />}
                      </span>

                      {isVideo ? (
                        <video
                          src={it.url}
                          preload="metadata"
                          playsInline
                          muted={!isPlaying}
                          controls={isPlaying}
                          className="relative h-full w-full object-cover"
                          onPause={() => isPlaying && setPlaying(null)}
                          ref={(el) => {
                            if (!el) return
                            if (isPlaying) el.play().catch(() => setPlaying(null))
                            else el.pause()
                          }}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.url} alt={titleOf(it)} loading="lazy" className="relative h-full w-full object-cover" />
                      )}

                      {isVideo && !isPlaying && (
                        <button
                          onClick={() => setPlaying(it.id)}
                          className="group/play absolute inset-0 grid place-items-center bg-black/0 transition-colors hover:bg-black/20"
                          aria-label="재생"
                        >
                          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/35 opacity-80 backdrop-blur transition group-hover/play:scale-110 group-hover/play:bg-white/30 group-hover/play:opacity-100">
                            <Play size={24} className="ml-0.5 text-white" fill="currentColor" />
                          </span>
                        </button>
                      )}
                      {isVideo && isPlaying && (
                        <button
                          onClick={() => setPlaying(null)}
                          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
                          aria-label="정지"
                        >
                          <Pause size={14} />
                        </button>
                      )}

                      <span
                        className={cn(
                          'pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold backdrop-blur',
                          isVideo ? 'bg-violet-500/80 text-white' : 'bg-sky-500/80 text-white',
                        )}
                      >
                        {isVideo ? <Clapperboard size={11} /> : <ImageIcon size={11} />}
                        {isVideo ? '영상' : '이미지'}
                      </span>
                    </div>

                    <div className="p-3">
                      <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug" title={it.prompt}>
                        {titleOf(it)}
                      </p>
                      <p className="mt-1 truncate text-[10.5px] text-[var(--text-dim)]">
                        {it.model || '모델 미상'}
                        {it.ts ? ` · ${kstDateTime(new Date(it.ts).toISOString())}` : ''}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <a
                          href={it.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                        >
                          <Download size={13} /> 다운로드
                        </a>
                        <button
                          onClick={() => remove(it)}
                          disabled={deleting === it.id}
                          className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-rose-500/12 hover:text-rose-500 disabled:opacity-40"
                          aria-label="삭제"
                        >
                          {deleting === it.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
