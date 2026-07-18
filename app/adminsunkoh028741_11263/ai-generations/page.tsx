'use client'

import { useEffect, useState, useCallback } from 'react'
import { Images, RefreshCw, Download, Search, Film, Image as ImageIcon, User, Clock } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'
import { adminAiGenerations, type AiGenerationRow } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

const krw = (n: number) => '₩' + Math.round(n || 0).toLocaleString('ko-KR')
const usd = (n: number) => '$' + (n || 0).toFixed(4)
const PAGE = 30

/** /api/media 저장분은 ?dl=1 로 강제 다운로드, 외부 URL 은 그대로 */
function dlHref(u: string): string {
  if (!u) return ''
  if (u.startsWith('/api/media/')) return u + (u.includes('?') ? '&' : '?') + 'dl=1'
  return u
}
function looksVideo(u: string, kind: string): boolean {
  if (kind === 'video') return true
  return /\.(mp4|webm|mov|mkv)(\?|$)/i.test(u) || /video/i.test(u)
}

function csvDownload(rows: AiGenerationRow[]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = ['생성시각(KST)', '사용자', '이메일', '종류', '모델', '제공사', '크레딧', 'AI비용(USD)', '당일환율', 'AI비용(KRW)', '프롬프트', '결과URL']
  const body = rows.map((r) => [
    kstDateTime(r.createdAt), r.name, r.email, r.resultKind || r.kind, r.model, r.provider,
    r.credits, r.usd, r.usdKrw, r.costKrw, r.prompt, r.resultUrl,
  ])
  const text = [head, ...body].map((row) => row.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-generations-${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const KIND_TABS: { key: string; label: string }[] = [
  { key: '', label: '전체' },
  { key: 'image', label: '이미지' },
  { key: 'video', label: '영상' },
]

export default function AdminAiGenerationsPage() {
  const [items, setItems] = useState<AiGenerationRow[]>([])
  const [total, setTotal] = useState(0)
  const [todayRate, setTodayRate] = useState<number | null>(null)
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)

  const load = useCallback(async (reset: boolean, nextOffset: number, useKind: string, useQ: string) => {
    setLoading(true)
    const r = await adminAiGenerations({ limit: PAGE, offset: nextOffset, kind: useKind, q: useQ, days: 3650 })
    setLoading(false)
    if (!r.ok) return
    setTodayRate(r.todayRate ?? null)
    setTotal(r.total ?? 0)
    setItems((prev) => (reset ? r.items || [] : [...prev, ...(r.items || [])]))
    setOffset(nextOffset + (r.items?.length || 0))
  }, [])

  useEffect(() => { load(true, 0, kind, q) }, [load, kind, q])

  const runSearch = () => setQ(qInput.trim())

  return (
    <div>
      <PageHeader
        icon={Images}
        title="AI 생성 기록"
        description="사용자별 AI 이미지·영상 생성물 — 프롬프트·레퍼런스·결과 미디어와 크레딧·비용(당일 환율·USD)"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
          {KIND_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setKind(t.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                kind === t.key ? 'bg-violet-600 text-white' : 'text-[var(--text-soft)] hover:text-[var(--text)]',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5">
          <Search size={15} className="text-[var(--text-dim)]" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="사용자·이메일·모델·프롬프트 검색"
            className="w-56 bg-transparent text-sm outline-none"
          />
          <button onClick={runSearch} className="text-xs font-semibold text-violet-500 hover:text-violet-400">검색</button>
        </div>
        <Button variant="soft" size="sm" onClick={() => load(true, 0, kind, q)}>
          <RefreshCw size={14} /> 새로고침
        </Button>
        <Button variant="soft" size="sm" onClick={() => csvDownload(items)} disabled={!items.length}>
          <Download size={14} /> CSV
        </Button>
        <div className="ml-auto flex items-center gap-3 text-xs text-[var(--text-soft)]">
          <span>총 <b className="text-[var(--text)]">{total.toLocaleString('ko-KR')}</b>건</span>
          {todayRate != null && <span>오늘 환율 <b className="text-[var(--text)]">₩{Math.round(todayRate).toLocaleString('ko-KR')}</b>/$</span>}
        </div>
      </div>

      {items.length === 0 && !loading ? (
        <Panel><p className="py-16 text-center text-sm text-[var(--text-dim)]">생성 기록이 없습니다.</p></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => (
            <GenCard key={r.id} r={r} />
          ))}
        </div>
      )}

      {offset < total && (
        <div className="mt-6 text-center">
          <Button variant="soft" onClick={() => load(false, offset, kind, q)} disabled={loading}>
            {loading ? '불러오는 중…' : `더 보기 (${total - offset}건 남음)`}
          </Button>
        </div>
      )}
    </div>
  )
}

function GenCard({ r }: { r: AiGenerationRow }) {
  const isVideo = looksVideo(r.resultUrl, r.resultKind || r.kind)
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
      {/* 결과 미디어 */}
      <div className="relative aspect-video w-full bg-black/80">
        {r.resultUrl ? (
          isVideo ? (
            <video src={r.resultUrl} controls preload="metadata" className="h-full w-full object-contain" />
          ) : (
            <img src={r.resultUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/50">미리보기 없음 (아카이브 안 됨)</div>
        )}
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
          {isVideo ? <Film size={11} /> : <ImageIcon size={11} />} {isVideo ? '영상' : '이미지'}
        </span>
        {r.resultUrl && (
          <a
            href={dlHref(r.resultUrl)}
            download
            target="_blank"
            rel="noopener"
            className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow hover:bg-white"
          >
            <Download size={12} /> 다운로드
          </a>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        {/* 사용자 · 시간 */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 font-semibold">
            <User size={13} className="flex-shrink-0 text-violet-500" />
            <span className="truncate">{r.name || '게스트'}</span>
          </span>
          <span className="flex flex-shrink-0 items-center gap-1 text-[var(--text-dim)]">
            <Clock size={12} /> {kstDateTime(r.createdAt)}
          </span>
        </div>
        {r.email && <div className="-mt-1.5 truncate text-[11px] text-[var(--text-dim)]">{r.email}</div>}

        {/* 프롬프트 */}
        {r.prompt ? (
          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel-2)] px-2.5 py-2 text-xs leading-relaxed text-[var(--text-soft)]">
            <span className="mr-1 font-semibold text-[var(--text-dim)]">프롬프트</span>
            <span className="whitespace-pre-wrap break-words">{r.prompt}</span>
          </div>
        ) : null}

        {/* 레퍼런스 */}
        {r.refs && r.refs.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-semibold text-[var(--text-dim)]">레퍼런스 {r.refs.length}</div>
            <div className="flex flex-wrap gap-1.5">
              {r.refs.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noopener" className="block h-12 w-12 overflow-hidden rounded-md border border-[var(--border-soft)] bg-black/20">
                  <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => ((e.currentTarget.style.display = 'none'))} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 모델 · 비용 */}
        <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[var(--border-soft)] pt-2.5 text-[11px]">
          <Meta k="모델" v={r.model || r.provider || '-'} />
          <Meta k="크레딧" v={`${r.credits} 크레딧`} />
          <Meta k="AI 원가" v={`${usd(r.usd)} · ${krw(r.costKrw)}`} />
          <Meta k="당일 환율" v={r.usdKrw ? `₩${Math.round(r.usdKrw).toLocaleString('ko-KR')}/$` : '-'} />
        </div>
      </div>
    </div>
  )
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--text-dim)]">{k}</span>
      <span className="truncate font-medium text-[var(--text)]" title={v}>{v}</span>
    </div>
  )
}
