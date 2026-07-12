'use client'

import { useState } from 'react'
import { PenSquare, Search, TrendingUp, FileText, Award, Gauge } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend } from '@/components/dash/Charts'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { blogPosts, blogTrend } from '@/lib/mock'
import { formatNumber } from '@/lib/utils'

// 간단한 키워드 진단 로직 (검색량 vs 문서수)
function diagnose(vol: number, docs: number) {
  const ratio = docs / Math.max(vol, 1)
  let grade = 'C',
    color = '#f59e0b',
    label = '보통'
  if (ratio < 0.3) {
    grade = 'S'
    color = '#a855f7'
    label = '매우 좋음'
  } else if (ratio < 0.7) {
    grade = 'A'
    color = '#22c55e'
    label = '좋음'
  } else if (ratio < 1.5) {
    grade = 'B'
    color = '#0ea5e9'
    label = '보통'
  } else if (ratio < 3) {
    grade = 'C'
    color = '#f59e0b'
    label = '경쟁 높음'
  } else {
    grade = 'D'
    color = '#f87171'
    label = '포화'
  }
  const chance = Math.max(4, Math.min(96, Math.round(100 - ratio * 28)))
  return { grade, color, label, chance }
}

const indexColor: Record<string, string> = {
  'S': 'border-violet-200 bg-violet-50 text-violet-700',
  'A+': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'A': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'A-': 'border-green-200 bg-green-50 text-green-700',
  'B+': 'border-sky-200 bg-sky-50 text-sky-700',
}

export default function BlogPage() {
  const [kw, setKw] = useState('마케팅 자동화')
  const [vol, setVol] = useState(24000)
  const [docs, setDocs] = useState(9800)
  const [result, setResult] = useState<ReturnType<typeof diagnose> | null>(() =>
    diagnose(24000, 9800),
  )

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={PenSquare}
        eyebrow="03 · 블로그"
        title="블로그 분석"
        desc="블로그 지수와 키워드 상위노출 가능성을 진단합니다. (네이버·티스토리)"
        accent="#10b981"
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="블로그 지수" value="A+" delta={5} icon={Award} accent="#10b981" />
          <StatCard label="상위노출 포스팅" value="18개" delta={12} icon={FileText} accent="#22c55e" />
          <StatCard label="일 방문자" value="2,240" delta={8.4} icon={TrendingUp} accent="#0ea5e9" />
          <StatCard label="평균 순위" value="3.4위" delta={6.1} icon={Gauge} accent="#7c3aed" />
        </div>

        {/* keyword diagnosis tool */}
        <Panel title="키워드 상위노출 진단">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">키워드</label>
              <input
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">월 검색량</label>
              <input
                type="number"
                value={vol}
                onChange={(e) => setVol(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">문서수</label>
              <input
                type="number"
                value={docs}
                onChange={(e) => setDocs(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <Button
              className="!bg-gradient-to-br !from-emerald-500 !to-green-500"
              onClick={() => setResult(diagnose(vol, docs))}
            >
              <Search size={16} /> 진단
            </Button>
          </div>

          {result && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="card-2 flex items-center gap-4 p-4">
                <span
                  className="grid h-14 w-14 place-items-center rounded-xl text-2xl font-bold"
                  style={{ background: `${result.color}22`, color: result.color }}
                >
                  {result.grade}
                </span>
                <div>
                  <p className="text-xs text-[var(--text-dim)]">키워드 등급</p>
                  <p className="text-lg font-bold" style={{ color: result.color }}>
                    {result.label}
                  </p>
                </div>
              </div>
              <div className="card-2 p-4">
                <p className="text-xs text-[var(--text-dim)]">상위노출 가능성</p>
                <p className="mt-1 text-2xl font-bold">{result.chance}%</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${result.chance}%`, background: result.color }}
                  />
                </div>
              </div>
              <div className="card-2 p-4">
                <p className="text-xs text-[var(--text-dim)]">경쟁 강도 (문서/검색)</p>
                <p className="mt-1 text-2xl font-bold">{(docs / Math.max(vol, 1)).toFixed(2)}</p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">낮을수록 상위노출 유리</p>
              </div>
            </div>
          )}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Panel title="내 포스팅 순위">
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-3 py-2.5 font-medium">순위</th>
                    <th className="px-3 py-2.5 font-medium">포스팅</th>
                    <th className="px-3 py-2.5 font-medium">키워드</th>
                    <th className="px-3 py-2.5 font-medium">지수</th>
                  </tr>
                </thead>
                <tbody>
                  {blogPosts.map((p) => (
                    <tr key={p.title} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold ${
                            p.rank <= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-[var(--text-soft)]'
                          }`}
                        >
                          {p.rank}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium">{p.title}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">
                        {p.kw}
                        <span className="ml-1 text-xs text-[var(--text-dim)]">({formatNumber(p.vol)})</span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={indexColor[p.index] || 'border-[var(--border)] bg-slate-100 text-[var(--text-soft)]'}>
                          {p.index}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="유입 & 순위 추이 (4주)">
            <AreaTrend data={blogTrend} keys={['유입']} colors={['#10b981']} height={180} />
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-700">📈 C-Rank 대응 리포트</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-soft)]">
                주제 집중도가 높아 C-Rank 점수가 상승 중입니다. &lsquo;마케팅 자동화&rsquo; 계열
                키워드로 주 2회 발행 시 4주 내 1페이지 진입이 예상됩니다.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
