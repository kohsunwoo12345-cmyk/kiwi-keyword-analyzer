'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, FileSpreadsheet, FileText, RefreshCw, Filter } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'
import { adminDbExportPreview, adminDbExportUrl, type DbExportQuery, type DbExportPreview } from '@/lib/auth'
import { cn } from '@/lib/utils'

const SEGMENTS: { key: string; label: string; desc: string }[] = [
  { key: 'all', label: '전체', desc: '관리자 제외 전 회원' },
  { key: 'inactive', label: '미접속 유저', desc: '최근 N일간 접속 없음' },
  { key: 'paid_inactive', label: '결제O · 미접속', desc: '요금제 있는데 접속 안 함' },
  { key: 'active_unpaid', label: '접속O · 미결제', desc: '최근 접속하나 미결제' },
]
const PLANS: { key: string; label: string }[] = [
  { key: '', label: '요금제 전체' },
  { key: 'none', label: '미가입' },
  { key: 'team', label: '팀 요금제' },
  { key: 'marketer:Plus', label: '마케터 Plus' }, { key: 'marketer:Pro', label: '마케터 Pro' }, { key: 'marketer:Max', label: '마케터 Max' },
  { key: 'video:Plus', label: '영상 Plus' }, { key: 'video:Pro', label: '영상 Pro' }, { key: 'video:Max', label: '영상 Max' },
]
const num = (n: number) => (n || 0).toLocaleString('ko-KR')

export default function AdminDbDownloadPage() {
  const [segment, setSegment] = useState('all')
  const [country, setCountry] = useState('')
  const [plan, setPlan] = useState('')
  const [days, setDays] = useState(14)
  const [data, setData] = useState<DbExportPreview | null>(null)
  const [loading, setLoading] = useState(false)

  const query: DbExportQuery = { segment, country, plan, days }
  const usesDays = segment !== 'all'

  const load = useCallback(() => {
    setLoading(true)
    adminDbExportPreview({ segment, country, plan, days }).then((d) => { setData(d); setLoading(false) })
  }, [segment, country, plan, days])
  useEffect(() => { load() }, [load])

  const sel = 'rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-violet-400'

  return (
    <div>
      <PageHeader
        icon={Download}
        title="회원 DB 다운로드"
        description="국가·요금제·접속/결제 상태로 타깃을 좁혀 목록을 불러오고, 각 타깃마다 CSV 또는 XLSX(엑셀)로 따로 다운로드합니다."
      />

      {/* 세그먼트 타깃 */}
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={cn(
              'rounded-2xl border p-3 text-left transition-colors',
              segment === s.key ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300' : 'border-[var(--border)] bg-[var(--panel)] hover:border-violet-300',
            )}
          >
            <div className="text-sm font-bold">{s.label}</div>
            <div className="mt-0.5 text-xs text-[var(--text-dim)]">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* 필터 */}
      <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-dim)]">국가</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={sel}>
              <option value="">국가 전체</option>
              {(data?.countries || []).map((c) => (
                <option key={c.country} value={c.country}>{c.country} ({num(c.count)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-dim)]">요금제</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={sel}>
              {PLANS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          {usesDays && (
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-dim)]">미접속 기준 (일)</label>
              <input type="number" min={1} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} className={cn(sel, 'w-28 text-right')} />
            </div>
          )}
          <Button variant="soft" size="sm" onClick={load} disabled={loading}><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 목록 불러오기</Button>
          <div className="ml-auto flex items-center gap-2">
            <a href={adminDbExportUrl(query, 'csv')} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <FileText size={15} /> CSV 다운로드
            </a>
            <a href={adminDbExportUrl(query, 'xlsx')} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110">
              <FileSpreadsheet size={15} /> XLSX 다운로드
            </a>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          <Filter size={12} /> 현재 타깃 <b className="text-[var(--text)]">{SEGMENTS.find((s) => s.key === segment)?.label}</b>
          {country && <> · {country}</>}{plan && <> · {PLANS.find((p) => p.key === plan)?.label}</>} · 총 <b className="text-violet-600">{num(data?.total || 0)}</b>명 (다운로드는 필터 그대로 적용)
        </p>
      </Panel>

      {/* 미리보기 */}
      <Panel title={<span>미리보기 <span className="text-xs font-normal text-[var(--text-dim)]">(최대 500행)</span></span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-dim)]">
                {(data?.headers || []).map((h) => <th key={h} className="whitespace-nowrap px-2.5 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(data?.rows || []).map((row, i) => (
                <tr key={i} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                  {row.map((v, j) => <td key={j} className="whitespace-nowrap px-2.5 py-1.5 text-[var(--text-soft)]">{String(v)}</td>)}
                </tr>
              ))}
              {(!data?.rows || data.rows.length === 0) && (
                <tr><td colSpan={16} className="py-10 text-center text-[var(--text-dim)]">{loading ? '불러오는 중…' : '해당 조건의 회원이 없습니다.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
