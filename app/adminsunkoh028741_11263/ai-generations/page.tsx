'use client'

import { useEffect, useState, useCallback } from 'react'
import { Images, RefreshCw, Download, Search, Film, Image as ImageIcon, User, Clock, Wand2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'
import {
  adminAiGenerations, adminGenStatus, adminGenRecover, adminGenFailures,
  type AiGenerationRow, type GenStatusResp, type GenFailureRow,
} from '@/lib/auth'
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
  const head = ['생성시각(KST)', '사용자', '이메일', '종류', '모델', '제공사', '단위', '크레딧', '실제차감(KRW)', 'AI비용(USD)', '당일환율', 'AI비용(KRW)', '마진(KRW)', '배수', '프롬프트', '결과URL']
  const body = rows.map((r) => [
    kstDateTime(r.createdAt), r.name, r.email, r.resultKind || r.kind, r.model, r.provider,
    r.units, r.credits, r.revenueKrw, r.usd, r.usdKrw, r.costKrw, r.profitKrw, r.markup, r.prompt, r.resultUrl,
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
  //  실패는 다른 표를 읽는다(gen_failures + 결과물이 안 붙은 정산 줄) — 같은 자리에서 넘겨 본다
  { key: 'fail', label: '실패' },
]

/* 실패 한 건. "무엇이 왜 안 됐는지" 가 핵심이라 사유를 접지 않고 그대로 보여 준다 —
   줄여 놓으면 결국 서버 로그를 뒤지게 되고, 그러면 이 화면이 있으나 마나다. */
const STAGE_TONE: Record<string, string> = {
  submit: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  run: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  archive: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  missing: 'bg-slate-500/10 text-[var(--text-soft)] border-[var(--border)]',
}
function FailCard({ r }: { r: GenFailureRow }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', STAGE_TONE[r.stage] || STAGE_TONE.missing)}>
          {r.stageLabel}
        </span>
        {r.refunded > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
            {r.refunded} 크레딧 환불됨
          </span>
        )}
        {r.recoverable && (
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-500">
            [결과물 되찾기]로 살릴 수 있음
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-[var(--text-dim)]">
          <Clock size={12} /> {kstDateTime(r.createdAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          <User size={13} className="text-violet-500" />
          {r.name || '(이름 없음)'}
        </span>
        {r.email && <span className="text-[var(--text-dim)]">{r.email}</span>}
        <span className="text-[var(--text-soft)]">{r.model || r.provider || '(모델 미상)'}</span>
      </div>

      {/* 사유 — 제공사가 준 원문 그대로 */}
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel-2)] px-2.5 py-2 text-xs leading-relaxed">
        <div className="mb-1 font-semibold text-[var(--text-dim)]">사유</div>
        <div className="whitespace-pre-wrap break-words text-[var(--text-soft)]">{r.reason}</div>
      </div>

      {r.prompt && (
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel-2)] px-2.5 py-2 text-xs leading-relaxed">
          <span className="mr-1 font-semibold text-[var(--text-dim)]">프롬프트</span>
          <span className="whitespace-pre-wrap break-words text-[var(--text-soft)]">{r.prompt}</span>
        </div>
      )}

      {/* 결과물이 안 붙은 줄은 제공사에 직접 물어볼 수 있다 */}
      {r.source === 'missing' && r.usageId && <ProviderCheck id={r.usageId} />}
    </div>
  )
}

export default function AdminAiGenerationsPage() {
  const [items, setItems] = useState<AiGenerationRow[]>([])
  const [total, setTotal] = useState(0)
  const [todayRate, setTodayRate] = useState<number | null>(null)
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)

  const [fails, setFails] = useState<GenFailureRow[]>([])

  const load = useCallback(async (reset: boolean, nextOffset: number, useKind: string, useQ: string) => {
    setLoading(true)
    //  실패 탭은 다른 표를 읽는다 — 생성 목록과 섞지 않는다
    if (useKind === 'fail') {
      const f = await adminGenFailures({ limit: PAGE, offset: nextOffset, q: useQ, days: 3650 })
      setLoading(false)
      if (!f.ok) return
      setTotal(f.total ?? 0)
      setFails((prev) => (reset ? f.items || [] : [...prev, ...(f.items || [])]))
      setOffset(nextOffset + (f.items?.length || 0))
      return
    }
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

  /* 결과 주소를 잃은 기록을 제공사에서 되찾아 온다.
     한 번에 다 하면 그 요청이 죽으므로 서버가 조금씩 처리하고 "남았다" 를 알려 준다 —
     여기서 끝날 때까지 다시 부른다. 되찾은 게 없는데 남았다고만 하면 무한히 돌 수 있으니
     "이번에 하나도 못 되찾았으면 멈춘다" 는 조건을 같이 둔다. */
  const [rec, setRec] = useState<
    { busy: boolean; ok: number; fail: number; run: number; gone: number; moved: number; done: boolean } | null>(null)
  const recover = async () => {
    setRec({ busy: true, ok: 0, fail: 0, run: 0, gone: 0, moved: 0, done: false })
    let ok = 0, fail = 0, run = 0, gone = 0, moved = 0
    for (let i = 0; i < 60; i++) {
      const r = await adminGenRecover()
      if (!r.ok) { setRec({ busy: false, ok, fail, run, gone, moved, done: true }); return }
      ok += r.recovered || 0; fail += r.failed || 0; run += r.running || 0; gone += r.gone || 0
      moved += r.moved || 0
      setRec({ busy: true, ok, fail, run, gone, moved, done: false })
      /* ⚠ "되찾은 게 없으면 멈춘다" 만 보면 안 된다. 되찾을 건 없는데 옮길 건 남은 경우
         (= 제공사 주소를 붙들고 있는 만료 위험 줄)에 첫 묶음만 옮기고 끝났다고 보고한다.
         한 바퀴에서 되찾은 것도 옮긴 것도 없을 때만 멈춘다. */
      if (!(r.remaining || 0)) break
      if (!(r.recovered || 0) && !(r.moved || 0)) break
    }
    setRec({ busy: false, ok, fail, run, gone, moved, done: true })
    load(true, 0, kind, q)
  }

  return (
    <div>
      <PageHeader
        icon={Images}
        eyebrow="ADMIN"
        title="AI 생성 기록"
        desc="사용자별 AI 이미지·영상·3D 생성물 — 프롬프트·레퍼런스·결과 미디어와 크레딧·비용(당일 환율·USD)"
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
        <Button variant="soft" size="sm" onClick={() => csvDownload(items)} disabled={kind === 'fail' || !items.length}>
          <Download size={14} /> CSV
        </Button>
        <Button variant="soft" size="sm" onClick={recover} disabled={!!rec && rec.busy}>
          <Wand2 size={14} /> {rec?.busy ? '되찾는 중…' : '결과물 되찾기'}
        </Button>
        <div className="ml-auto flex items-center gap-3 text-xs text-[var(--text-soft)]">
          <span>{kind === 'fail' ? '실패' : '총'} <b className={kind === 'fail' ? 'text-rose-500' : 'text-[var(--text)]'}>{total.toLocaleString('ko-KR')}</b>건</span>
          {kind !== 'fail' && todayRate != null && <span>오늘 환율 <b className="text-[var(--text)]">₩{Math.round(todayRate).toLocaleString('ko-KR')}</b>/$</span>}
        </div>
      </div>

      {/* 되찾기 결과 — 무엇을 못 되찾았는지도 같이 말한다. "몇 건 복구" 만 쓰면
          나머지가 왜 그대로인지 알 수 없어 같은 단추를 계속 누르게 된다. */}
      {rec && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-sm">
          <b className="text-[var(--text)]">{rec.busy ? '제공사에서 되찾는 중…' : '되찾기 완료'}</b>
          <span className="ml-2 text-[var(--text-soft)]">
            {/* 만료되기 전에 우리 것으로 옮긴 수 — 되찾기보다 이쪽이 급하다 */}
            우리 저장소로 옮김 <b className="text-violet-500">{rec.moved}</b>건 ·
            되찾음 <b className="text-emerald-500">{rec.ok}</b>건
            {rec.run > 0 && <> · 아직 진행 중 {rec.run}건</>}
            {rec.fail > 0 && <> · 제공사에서 실패했던 건 {rec.fail}건</>}
            {rec.gone > 0 && <> · 원본이 이미 사라진 건 {rec.gone}건</>}
          </span>
          {rec.done && (rec.fail > 0 || rec.gone > 0) && (
            <div className="mt-1 text-xs text-[var(--text-dim)]">
              실패했던 건은 애초에 결과물이 없고, 원본이 사라진 건은 제공사 쪽에서 이미 지워져 되살릴 수 없습니다.
            </div>
          )}
        </div>
      )}

      {kind === 'fail' ? (
        fails.length === 0 && !loading ? (
          <Panel><p className="py-16 text-center text-sm text-[var(--text-dim)]">실패한 생성이 없습니다.</p></Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {fails.map((r) => <FailCard key={r.source + r.id} r={r} />)}
          </div>
        )
      ) : items.length === 0 && !loading ? (
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

/* "미리보기 없음" 한 줄로는 세 가지가 구분되지 않는다 —
   ㉠ 영상은 나왔는데 주소만 안 붙음 ㉡ 회원이 지움 ㉢ 제공사에서 실패.
   ㉢ 만 제공사 요금이 안 나간 경우라, 이걸 못 가르면 "돈이 어디로 갔나" 를 영영 못 본다.
   그래서 눌러서 제공사에 직접 물어보게 한다(조회만 · 아무것도 고치지 않는다). */
function ProviderCheck({ id }: { id: string }) {
  const [st, setSt] = useState<GenStatusResp | null>(null)
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try { setSt(await adminGenStatus(id)) } finally { setBusy(false) }
  }
  const p = st?.provider
  const tone = p?.state === 'succeeded' ? 'text-emerald-500'
    : p?.state === 'failed' ? 'text-rose-500'
    : p?.state === 'running' ? 'text-amber-500' : 'text-[var(--text-dim)]'
  const label = p?.state === 'succeeded' ? '제공사: 완료됨'
    : p?.state === 'failed' ? '제공사: 실패'
    : p?.state === 'running' ? '제공사: 진행 중' : '제공사: 알 수 없음'
  return (
    <div className="col-span-2 mt-1 rounded-md border border-[var(--border-soft)] bg-[var(--panel-2)] px-2 py-1.5 text-[10px]">
      {!st ? (
        <button onClick={go} disabled={busy} className="font-semibold text-violet-500 hover:underline disabled:opacity-50">
          {busy ? '제공사에 묻는 중…' : '제공사에 직접 조회 →'}
        </button>
      ) : !st.ok ? (
        <span className="text-rose-500">조회 실패: {st.error || '알 수 없음'}</span>
      ) : !st.found ? (
        <span className="text-[var(--text-dim)]">{st.note}</span>
      ) : (
        <div className="space-y-0.5">
          <div className={cn('font-semibold', tone)}>{label}{p?.raw ? ` (${p.raw})` : ''}</div>
          <div className="text-[var(--text-dim)]">{st.cost}</div>
          {st.charge?.refunded && <div className="font-semibold text-sky-500">환불됨 — {st.charge.credits} 크레딧 돌려줌</div>}
          {p?.error && <div className="break-words text-rose-500">{p.error}</div>}
          {p?.url && (
            <a href={p.url} target="_blank" rel="noopener" className="text-violet-500 hover:underline">
              제공사에 남아 있는 결과 열기 →
            </a>
          )}
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
        {/* 아직 제공사 주소인 줄 — 지금은 잘 보이지만 며칠이면 만료돼 사라진다.
            표시가 없으면 멀쩡한 줄과 구분이 안 돼서, 사라지고 나서야 알게 된다. */}
        {r.external && (
          <span className="absolute bottom-2 left-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            제공사 주소 · 만료 위험 — [결과물 되찾기]
          </span>
        )}
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

        {/* 모델 · 금액 */}
        <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[var(--border-soft)] pt-2.5 text-[11px]">
          <Meta k="모델" v={r.model || r.provider || '-'} />
          <Meta k={r.kind === 'image' ? '장수' : '길이'} v={r.units ? (r.kind === 'image' ? `${r.units}장` : `${r.units}초`) : '-'} />
          {r.archiveOnly ? (
            /* 금액이 안 붙은 보관 전용 줄 — 차감은 다른 줄에 기록돼 있다.
               ₩0 으로 보여 주면 공짜 생성으로 읽히므로 그렇게 쓰지 않는다. */
            <div className="col-span-2 rounded-md bg-[var(--panel-2)] px-2 py-1.5 text-[10px] text-[var(--text-dim)]">
              보관 전용 기록 — 이 생성의 금액은 정산 줄에 기록돼 있습니다.
            </div>
          ) : (
            <>
              <Meta k="실제 차감" v={`${krw(r.revenueKrw)} · ${r.credits} 크레딧`} strong />
              <Meta k="AI 원가" v={`${krw(r.costKrw)} · ${usd(r.usd)}`} />
              <Meta k="마진" v={`${krw(r.profitKrw)}${r.markup ? ` (×${r.markup})` : ''}`} />
              <Meta k="당일 환율" v={r.usdKrw ? `₩${Math.round(r.usdKrw).toLocaleString('ko-KR')}/$` : '-'} />
            </>
          )}
          {/* 환불된 건은 목록에서 바로 보이게 한다 — 눌러 봐야만 알면 스무 장을 다 눌러야 한다 */}
          {r.chargeStatus === 'refunded' && (
            <div className="col-span-2 rounded-md bg-sky-500/10 px-2 py-1.5 text-[10px] font-semibold text-sky-500">
              환불됨 — 생성이 실패해 크레딧을 돌려줬습니다.
            </div>
          )}
          {/* 결과물이 없는 건만 조회 통로를 연다. 잘 나온 건은 물어볼 것이 없다. */}
          {!r.resultUrl && r.hasTask && <ProviderCheck id={r.id} />}
        </div>
      </div>
    </div>
  )
}

function Meta({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--text-dim)]">{k}</span>
      <span className={strong ? 'truncate font-semibold text-[var(--text)]' : 'truncate font-medium text-[var(--text)]'} title={v}>{v}</span>
    </div>
  )
}
