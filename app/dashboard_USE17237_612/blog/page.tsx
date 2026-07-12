'use client'

import { useEffect, useState } from 'react'
import { PenSquare, Search, TrendingUp, FileText, Award, Gauge, Loader2, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend } from '@/components/dash/Charts'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { Counter } from '@/components/motion'
import { blogPosts, blogTrend } from '@/lib/mock'
import { formatNumber, cn } from '@/lib/utils'
import { useAuth, analyzeBlog, type BlogAnalysis } from '@/lib/auth'

// 간단한 키워드 진단 로직 (검색량 vs 문서수) — 데모 폴백용
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

// 네이버 응답 제목/설명의 <b> 등 태그 제거
function stripTags(s: string): string {
  return (s || '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

// 지수 등급 배지 색상 (A=green … F=rose)
function gradeBadgeClass(grade?: string): string {
  const g = (grade || '').trim().charAt(0).toUpperCase()
  switch (g) {
    case 'S':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    case 'A':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'B':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'C':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'D':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'E':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'F':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-[var(--border)] bg-slate-100 text-[var(--text-soft)]'
  }
}

export default function BlogPage() {
  const { user, setUser } = useAuth()

  // 데모 폴백 (검색량/문서수 기반)
  const [kw, setKw] = useState('마케팅 자동화')
  const [vol, setVol] = useState(24000)
  const [docs, setDocs] = useState(9800)
  const [result, setResult] = useState<ReturnType<typeof diagnose> | null>(() =>
    diagnose(24000, 9800),
  )

  // 실제 네이버 블로그 분석
  const [realKw, setRealKw] = useState('마케팅 자동화')
  const [loading, setLoading] = useState(false)
  const [real, setReal] = useState<BlogAnalysis | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [barWidth, setBarWidth] = useState(0)

  // 상위노출 확률 바 애니메이션
  useEffect(() => {
    if (!real?.ok) {
      setBarWidth(0)
      return
    }
    const target = real.exposureChance ?? 0
    setBarWidth(0)
    const id = requestAnimationFrame(() => setBarWidth(target))
    return () => cancelAnimationFrame(id)
  }, [real])

  async function runAnalyze() {
    const keyword = realKw.trim()
    if (!keyword || loading) return
    setLoading(true)
    setNote(null)
    try {
      const r = await analyzeBlog(keyword)
      if (r.ok) {
        setReal(r)
        if (typeof r.credits === 'number' && user) {
          setUser({ ...user, credits: r.credits })
        }
      } else {
        setReal(null)
        setNote(
          (r.error || '분석에 실패했습니다.') +
            (r.refunded ? ' (크레딧은 환불되었습니다)' : ''),
        )
        // 폴백: 데모 진단 결과를 표시
        setResult(diagnose(vol, docs))
      }
    } catch {
      setReal(null)
      setNote('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

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

        {/* 실제 네이버 블로그 분석 */}
        <Panel title="네이버 블로그 실시간 분석">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">키워드</label>
              <input
                value={realKw}
                onChange={(e) => setRealKw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runAnalyze()
                }}
                placeholder="예) 마케팅 자동화"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-col items-stretch gap-1.5">
              <span className="text-right text-xs text-[var(--text-dim)]">
                보유 크레딧 {formatNumber(user?.credits ?? 0)}개
              </span>
              <Button
                className="!bg-gradient-to-br !from-emerald-500 !to-green-500"
                onClick={runAnalyze}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                분석하기 · 2 크레딧
              </Button>
            </div>
          </div>

          {note && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-700">
              {note}
            </div>
          )}

          {real?.ok && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card-2 p-4">
                  <p className="text-xs text-[var(--text-dim)]">총 문서수</p>
                  <p className="mt-1 text-2xl font-bold">
                    <Counter to={real.total ?? 0} />
                    <span className="ml-0.5 text-sm font-medium text-[var(--text-soft)]">건</span>
                  </p>
                </div>
                <div className="card-2 p-4">
                  <p className="text-xs text-[var(--text-dim)]">경쟁 난이도</p>
                  <p className="mt-1 text-2xl font-bold">{real.difficulty ?? '-'}</p>
                </div>
                <div className="card-2 flex flex-col justify-between p-4">
                  <p className="text-xs text-[var(--text-dim)]">지수 등급</p>
                  <div className="mt-1">
                    <Badge className={cn('text-sm font-bold', gradeBadgeClass(real.grade))}>
                      {real.grade ?? '-'}
                    </Badge>
                  </div>
                </div>
                <div className="card-2 p-4">
                  <p className="text-xs text-[var(--text-dim)]">상위노출 확률</p>
                  <p className="mt-1 text-2xl font-bold">{real.exposureChance ?? 0}%</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-700 ease-out"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>

              {real.items && real.items.length > 0 && (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                        <th className="px-3 py-2.5 font-medium">제목</th>
                        <th className="px-3 py-2.5 font-medium">블로거</th>
                        <th className="px-3 py-2.5 font-medium">작성일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {real.items.map((it, i) => (
                        <tr
                          key={`${it.link}-${i}`}
                          className="border-b border-[var(--border-soft)] align-top hover:bg-slate-50"
                        >
                          <td className="px-3 py-3">
                            <a
                              href={it.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                            >
                              <span>{stripTags(it.title)}</span>
                              <ExternalLink size={13} className="shrink-0 opacity-60" />
                            </a>
                            {it.desc && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-soft)]">
                                {stripTags(it.desc)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-[var(--text-soft)]">{it.blogger}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-[var(--text-dim)]">{it.postdate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* keyword diagnosis tool (데모 폴백) */}
        <Panel title="키워드 상위노출 진단 (데모)">
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
