'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Boxes, RefreshCw, Search, CheckCircle2, AlertTriangle, XCircle, Image as ImageIcon, Clapperboard, Zap, Box, Type } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import { adminAiModels, adminVerifyImageModels, type AiModelRow, type AiModelsResp } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'
const num = (n: number) => (n || 0).toLocaleString('ko-KR')

const STATUS_META: Record<string, { label: string; cls: string; icon: any; desc: string }> = {
  live: { label: '정상 작동', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2,
    desc: 'API 키 연동 + 모델 ID 공식 확인 — 바로 사용 가능' },
  unverified: { label: '미확인', cls: 'border-amber-200 bg-amber-50 text-amber-700', icon: AlertTriangle,
    desc: 'API 키는 있으나 모델 ID 미확인 — 실시간 검증 필요(후보 ID 자동 폴백)' },
  nokey: { label: '연동 없음', cls: 'border-slate-200 bg-slate-50 text-slate-500', icon: XCircle,
    desc: '해당 제공사 API 키가 서버에 없음 — 키 등록 시 즉시 사용 가능' },
}

// 모델 종류·과금 단위 라벨. 3d(3D 파일 1개당)·llm(호출 1회당)이 빠져 있어 '영상 · /장' 으로 잘못 표시됐다.
const KIND_LABEL: Record<string, string> = { image: '이미지', video: '영상', '3d': '3D 생성', llm: '프롬프트 LLM' }
const UNIT_LABEL: Record<string, string> = { sec: '/초', img: '/장', '3d': '/개', tok: '/회' }

export default function AdminAiModelsPage() {
  const [data, setData] = useState<AiModelsResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | 'image' | 'video' | '3d' | 'llm'>('all')
  const [status, setStatus] = useState<'all' | 'live' | 'unverified' | 'nokey'>('all')
  const [verifying, setVerifying] = useState(false)
  const [verify, setVerify] = useState<Record<string, { ok: boolean; error?: string; modelId?: string }>>({})
  const [verifyMsg, setVerifyMsg] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    adminAiModels().then((r) => { setData(r); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])

  // 실시간 검증 — 실제 생성 경로로 이미지 모델을 호출해 진짜 되는지 확인 (모델당 비용 발생)
  const runVerify = useCallback(async () => {
    if (!confirm('모든 이미지 모델을 실제로 1장씩 생성해 검증합니다.\n모델당 소액(약 $0.03~0.08)의 실제 비용이 발생합니다. 진행할까요?')) return
    setVerifying(true); setVerifyMsg('검증 중… (모델 수에 따라 1~3분 소요)')
    const r = await adminVerifyImageModels()
    const map: Record<string, { ok: boolean; error?: string; modelId?: string }> = {}
    for (const it of (r?.items || [])) map[it.model] = { ok: !!it.ok, error: it.error, modelId: it.modelId }
    setVerify(map)
    setVerifyMsg(r?.error ? `검증 실패: ${r.error}` : `검증 완료 — 성공 ${r?.okCount ?? 0} / 실패 ${r?.failCount ?? 0}`)
    setVerifying(false)
  }, [])

  const models = data?.models || []
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return models.filter((m) =>
      (kind === 'all' || m.kind === kind) &&
      (status === 'all' || m.status === status) &&
      (!ql || m.model.toLowerCase().includes(ql) || m.modelId.toLowerCase().includes(ql) || m.providerLabel.toLowerCase().includes(ql)),
    )
  }, [models, q, kind, status])

  // 제공사별 그룹 (표시 순서: 정상 → 미확인 → 연동없음)
  const grouped = useMemo(() => {
    const g: Record<string, AiModelRow[]> = {}
    for (const m of filtered) (g[m.providerLabel] ||= []).push(m)
    const rank = { live: 0, unverified: 1, nokey: 2 } as Record<string, number>
    return Object.entries(g)
      .map(([label, list]) => ({ label, list: [...list].sort((a, b) => rank[a.status] - rank[b.status] || a.model.localeCompare(b.model, 'ko')) }))
      .sort((a, b) => rank[a.list[0].status] - rank[b.list[0].status] || a.label.localeCompare(b.label, 'ko'))
  }, [filtered])

  const s = data?.summary

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Boxes}
        eyebrow="ADMIN"
        title="AI 모델 목록"
        desc="스튜디오에 연결된 모든 AI 모델과 실제 호출 가능 상태를 한눈에 봅니다. 정상 작동 중인 모델과 미확인 모델을 구분해 표시하며, 실시간 검증으로 실제 생성 가능 여부를 확인할 수 있습니다."
        accent={ACCENT}
        action={
          <div className="flex gap-2">
            <Button variant="soft" size="sm" onClick={load} disabled={loading}><RefreshCw size={14} /> 새로고침</Button>
            <Button size="sm" onClick={runVerify} disabled={verifying}><Zap size={14} /> {verifying ? '검증 중…' : '실시간 검증'}</Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* 요약 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="전체 모델" value={s ? num(s.total) : '—'} sub={s ? `이미지 ${s.image} · 영상 ${s.video}` : ''} color="#7c3aed" icon={Boxes} />
          <SummaryCard label="정상 작동" value={s ? num(s.live) : '—'} sub="키 연동 + ID 확인" color="#059669" icon={CheckCircle2} />
          <SummaryCard label="미확인" value={s ? num(s.unverified) : '—'} sub="실시간 검증 권장" color="#d97706" icon={AlertTriangle} />
          <SummaryCard label="연동 없음" value={s ? num(s.nokey) : '—'} sub="API 키 미설정" color="#64748b" icon={XCircle} />
        </div>

        {verifyMsg && (
          <div className={cn('rounded-xl border px-4 py-3 text-sm font-medium',
            verifyMsg.startsWith('검증 실패') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-violet-200 bg-violet-50 text-violet-700')}>
            {verifyMsg}
          </div>
        )}

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5">
            <Search size={15} className="text-[var(--text-dim)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="모델·모델ID·제공사 검색" className="w-56 bg-transparent text-sm outline-none" />
          </div>
          <Seg value={kind} onChange={setKind} options={[['all', '전체'], ['image', '이미지'], ['video', '영상'], ['3d', '3D'], ['llm', '프롬프트']]} />
          <Seg value={status} onChange={setStatus} options={[['all', '전체'], ['live', '정상'], ['unverified', '미확인'], ['nokey', '연동없음']]} />
          <span className="ml-auto text-xs text-[var(--text-dim)]">
            {num(filtered.length)}개 표시{data?.usdKrw ? ` · 환율 $1=₩${num(Math.round(data.usdKrw))}` : ''}
          </span>
        </div>

        {/* 상태 설명 */}
        <div className="grid gap-2 sm:grid-cols-3">
          {(['live', 'unverified', 'nokey'] as const).map((k) => {
            const m = STATUS_META[k]; const Icon = m.icon
            return (
              <div key={k} className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5">
                <Icon size={15} className="mt-0.5 flex-shrink-0" style={{ color: k === 'live' ? '#059669' : k === 'unverified' ? '#d97706' : '#94a3b8' }} />
                <div className="min-w-0">
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-dim)]">{m.desc}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 제공사별 목록 */}
        {loading ? (
          <Panel><p className="py-16 text-center text-sm text-[var(--text-dim)]">불러오는 중…</p></Panel>
        ) : grouped.length === 0 ? (
          <Panel><p className="py-16 text-center text-sm text-[var(--text-dim)]">조건에 맞는 모델이 없습니다.</p></Panel>
        ) : (
          grouped.map((g) => (
            <Panel key={g.label}>
              <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
                <h3 className="text-sm font-bold">{g.label}</h3>
                <span className="text-xs text-[var(--text-dim)]">{g.list.length}개 모델</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                      <th className="px-4 py-2.5 font-medium">모델</th>
                      <th className="px-4 py-2.5 font-medium">실제 모델 ID</th>
                      <th className="px-4 py-2.5 font-medium">종류</th>
                      <th className="px-4 py-2.5 text-right font-medium">원가</th>
                      <th className="px-4 py-2.5 text-right font-medium">예상 크레딧</th>
                      <th className="px-4 py-2.5 font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.list.map((m) => {
                      const v = verify[m.model]
                      const meta = STATUS_META[m.status]
                      return (
                        <tr key={m.model} className="border-b border-[var(--border-soft)] last:border-0">
                          <td className="px-4 py-2.5">
                            <div className="font-medium">{m.model}</div>
                            {m.isPipeline && <div className="text-[11px] text-[var(--text-dim)]">복합 파이프라인(여러 제공사 조합)</div>}
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[11px] text-[var(--text-soft)]">{m.modelId}</code>
                            {v?.ok && v.modelId && v.modelId !== m.modelId && (
                              <div className="mt-0.5 text-[11px] text-emerald-600">실동작 ID: {v.modelId}</div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-soft)]">
                              {m.kind === 'image' ? <ImageIcon size={13} /> : m.kind === '3d' ? <Box size={13} /> : m.kind === 'llm' ? <Type size={13} /> : <Clapperboard size={13} />}
                              {KIND_LABEL[m.kind] || m.kind}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right text-[var(--text-soft)]">
                            ${m.usd}{UNIT_LABEL[m.unit] || '/장'}
                            {m.audioUsd > 0 && <span className="text-[11px] text-[var(--text-dim)]"> +${m.audioUsd}/초(음성)</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                            {m.credits}
                            <span className="ml-1 text-[11px] font-normal text-[var(--text-dim)]">{m.unit === 'sec' ? '/8초' : '/장'}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge className={meta.cls}>{meta.label}</Badge>
                              {v && (
                                <Badge className={v.ok ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}>
                                  {v.ok ? '검증 성공' : '검증 실패'}
                                </Badge>
                              )}
                            </div>
                            {v && !v.ok && v.error && (
                              <div className="mt-1 max-w-xs break-words text-[11px] text-rose-600">{v.error}</div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))
        )}

        <p className="text-xs leading-relaxed text-[var(--text-dim)]">
          · <b>실시간 검증</b>은 이미지 모델을 실제 생성 경로로 호출합니다(모델당 실제 비용 발생). 영상 모델은
          <code className="mx-1 rounded bg-[var(--panel-2)] px-1">/api/generate?diag=seedance-all</code>로 무과금 구조검증할 수 있습니다.<br />
          · 모델 ID가 콘솔과 다르면 <b>후보 ID로 자동 재시도</b>하며, 환경변수(<code className="rounded bg-[var(--panel-2)] px-1">SEEDREAM_MODEL_ID</code> 등)로 강제 지정할 수 있습니다.
        </p>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub: string; color: string; icon: any }) {
  return (
    <div className="card-2 flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-dim)]">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
        {sub && <p className="truncate text-[11px] text-[var(--text-dim)]">{sub}</p>}
      </div>
    </div>
  )
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
            value === v ? 'bg-violet-600 text-white' : 'text-[var(--text-soft)] hover:text-[var(--text)]')}>
          {label}
        </button>
      ))}
    </div>
  )
}
