'use client'

import { useEffect, useState, useCallback } from 'react'
import { Images, RefreshCw, Download, Search, Film, Image as ImageIcon, User, Clock, Sparkles } from 'lucide-react'
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

/** 탭: kind(이미지·영상) 또는 prov(업스케일) 중 하나로 필터 */
const KIND_TABS: { key: string; label: string; kind?: string; prov?: string }[] = [
  { key: '', label: '전체' },
  { key: 'image', label: '이미지', kind: 'image' },
  { key: 'video', label: '영상', kind: 'video' },
  { key: 'upscale', label: '업스케일', prov: 'upscale' },
  { key: 'edit', label: '편집(자막·색보정 등)', prov: 'edit' },
]

/** 업스케일 기록인지 — 브라우저 초해상 · fal Topaz 4K 모두 provider=upscale */
function isUpscale(r: AiGenerationRow): boolean {
  return r.provider === 'upscale' || /업스케일/.test(r.model || '')
}

export default function AdminAiGenerationsPage() {
  const [items, setItems] = useState<AiGenerationRow[]>([])
  const [total, setTotal] = useState(0)
  const [todayRate, setTodayRate] = useState<number | null>(null)
  const [tab, setTab] = useState('')
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)

  const load = useCallback(async (reset: boolean, nextOffset: number, useTab: string, useQ: string) => {
    const t = KIND_TABS.find((x) => x.key === useTab)
    setLoading(true)
    const r = await adminAiGenerations({ limit: PAGE, offset: nextOffset, kind: t?.kind || '', prov: t?.prov || '', q: useQ, days: 3650 })
    setLoading(false)
    if (!r.ok) return
    setTodayRate(r.todayRate ?? null)
    setTotal(r.total ?? 0)
    setItems((prev) => (reset ? r.items || [] : [...prev, ...(r.items || [])]))
    setOffset(nextOffset + (r.items?.length || 0))
  }, [])

  useEffect(() => { load(true, 0, tab, q) }, [load, tab, q])

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
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-violet-600 text-white' : 'text-[var(--text-soft)] hover:text-[var(--text)]',
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
        <Button variant="soft" size="sm" onClick={() => load(true, 0, tab, q)}>
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
          <Button variant="soft" onClick={() => load(false, offset, tab, q)} disabled={loading}>
            {loading ? '불러오는 중…' : `더 보기 (${total - offset}건 남음)`}
          </Button>
        </div>
      )}
    </div>
  )
}

function GenCard({ r }: { r: AiGenerationRow }) {
  const isVideo = looksVideo(r.resultUrl, r.resultKind || r.kind)
  const up = isUpscale(r)
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
        <div className="absolute left-2 top-2 flex items-center gap-1">
          <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            {isVideo ? <Film size={11} /> : <ImageIcon size={11} />} {isVideo ? '영상' : '이미지'}
          </span>
          {up && (
            <span className="flex items-center gap-1 rounded-full bg-violet-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles size={11} /> 업스케일
            </span>
          )}
        </div>
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
            <span className="mr-1 font-semibold text-[var(--text-dim)]">{up ? '업스케일 정보' : '프롬프트'}</span>
            <span className="whitespace-pre-wrap break-words">{r.prompt}</span>
          </div>
        ) : null}

        {/* 레퍼런스 */}
        {r.refs && r.refs.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-semibold text-[var(--text-dim)]">{up ? '원본 (업스케일 전)' : `레퍼런스 ${r.refs.length}`}</div>
            <div className="flex flex-wrap gap-1.5">
              {r.refs.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noopener" className={cn('block overflow-hidden rounded-md border border-[var(--border-soft)] bg-black/20', up ? 'h-20 w-20' : 'h-12 w-12')}>
                  {looksVideo(u, '') ? (
                    <video src={u} muted preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => ((e.currentTarget.style.display = 'none'))} />
                  )}
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

        {/* 이 금액이 나온 계산 — 눈으로 검산할 수 있게 그대로 보여준다 */}
        <CostBreakdown r={r} />
      </div>
    </div>
  )
}

/** 원가 계산 내역 — 단가 × 수량 (+오디오) × 환율. 기록된 값과 안 맞으면 이유를 표시한다. */
function CostBreakdown({ r }: { r: AiGenerationRow }) {
  const c = r.cost
  if (!c) return null
  const f = (n: number) => '$' + (Math.round(n * 10000) / 10000).toFixed(4)
  const cd = c.credit
  const isSelf = cd?.basis === 'fee'
  const warn = !c.priced || !c.krwOk || Math.abs(c.unexplained) > 1e-6 || (cd ? !cd.ok : false)
  const won = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR')
  return (
    <div className={cn('mt-2 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed',
      warn ? 'border-amber-500/40 bg-amber-500/5' : 'border-[var(--border-soft)] bg-[var(--panel-2)]')}>
      <div className="mb-0.5 font-semibold text-[var(--text-dim)]">계산 내역</div>
      {/* 자체 기능(고객 브라우저 처리)은 제공사 비용이 0원 — 원가 줄 대신 요금 줄만 보여준다 */}
      {isSelf ? (
        <div className="text-[var(--text-soft)]">
          제공사 비용 <b className="text-[var(--text)]">₩0</b> (고객 컴퓨터에서 처리한 자체 기능)
        </div>
      ) : (
        <>
          <div className="text-[var(--text-soft)]">
            {f(c.unitPrice)} / {c.unitLabel} × {c.units}{c.unitLabel} = {f(c.baseTotal)}
            {c.audioUsd > 0 && <> {' + '} 오디오 {f(c.audioUsd)}</>}
            {Math.abs(c.unexplained) > 1e-6 && (
              <span className="text-amber-600"> {c.unexplained > 0 ? '+' : '−'} 설명 안 되는 금액 {f(Math.abs(c.unexplained))}</span>
            )}
          </div>
          <div className="text-[var(--text-soft)]">
            = {usd(r.usd)} × ₩{Math.round(c.rate).toLocaleString('ko-KR')} = <b className="text-[var(--text)]">{krw(r.costKrw)}</b>
            {!c.krwOk && <span className="text-amber-600"> (환율 환산 불일치)</span>}
          </div>
        </>
      )}

      {/* 크레딧까지 끝까지 되짚는다 — 이 숫자가 왜 이렇게 나왔는지 눈으로 검산할 수 있게 */}
      {cd && cd.basis === 'free' && (
        <div className="mt-1 text-[var(--text-dim)]">차감 크레딧 <b>0</b> — 무료로 설정된 기능입니다</div>
      )}
      {cd && cd.basis === 'unknown' && (
        <div className="mt-1 text-[var(--text-dim)]">
          차감 크레딧 <b>{cd.recorded.toLocaleString('ko-KR')}</b> — 이 기록에는 배수·매출이 남아 있지 않아
          검산할 수 없습니다 (해당 항목이 생기기 전의 옛 기록입니다)
        </div>
      )}
      {cd && cd.basis !== 'free' && cd.basis !== 'unknown' && (
        <div className="mt-1 border-t border-[var(--border-soft)] pt-1 text-[var(--text-soft)]">
          <span className="text-[var(--text-dim)]">크레딧 </span>
          {isSelf
            ? <>서비스 요금 {won(cd.feeKrw)}/{c.unitLabel} × {cd.feeUnits}{c.unitLabel}</>
            : <>{krw(r.costKrw)}</>}
          {' × 배수 '}{cd.markup || 1}{' = '}<b className="text-[var(--text)]">{won(cd.priceKrw)}</b>
          {' ÷ '}{won(cd.creditKrw)}/크레딧{' = '}
          <b className="text-[var(--text)]">{cd.recorded.toLocaleString('ko-KR')} 크레딧</b>
          {cd.ok
            ? <span className="ml-1 text-emerald-600">✓ 검산 일치</span>
            : <span className="ml-1 text-amber-600">⚠ 계산값 {cd.credits} 와 다름</span>}
        </div>
      )}
      {cd?.feeChanged && (
        <div className="mt-1 text-[var(--text-dim)]">
          이 기록은 요금 {won(cd.feeKrw)} 기준입니다 — 현재 설정은 {won(cd.feeNow || 0)} (요금을 바꾼 뒤의 기록은 새 금액으로 계산됩니다)
        </div>
      )}
      {/* 제공사가 직접 보고한 사용량 — 추정이 아니라 제공사가 센 실제 과금 단위 */}
      {r.provUsage?.completion_tokens != null && (
        <div className="mt-1 rounded bg-emerald-500/10 px-1.5 py-1 text-emerald-700">
          제공사 보고 실사용량: <b>{Number(r.provUsage.completion_tokens).toLocaleString('ko-KR')} 토큰</b>
          {r.provUsage.model ? ` · ${r.provUsage.model}` : ''} — 청구서와 직접 대조 가능한 실측값입니다
        </div>
      )}
      {!c.priced && <div className="mt-1 text-amber-600">⚠ 단가표에 없는 모델 — 기본 단가로 계산된 기록입니다.</div>}
      {c.priced && !c.matchesNow && (
        <div className="mt-1 text-amber-600">
          ⚠ 현재 규칙으로는 {c.nowUnits}{c.unitLabel} 기준 {f(c.nowUsd)} · ₩{Math.round(c.nowUsd * c.rate).toLocaleString('ko-KR')} 입니다
          (옛 계산식으로 기록된 건)
        </div>
      )}
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
