'use client'
import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatNumberFull } from '@/lib/utils'
import type { AnalysisData } from '../KeywordAnalysis'
import { TrendingUp, TrendingDown, Minus, Calendar, Activity } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell, Area, AreaChart,
} from 'recharts'

interface Props {
  data: AnalysisData
}

const PERIOD_OPTIONS = [
  { label: '3개월', key: '3m', months: 3 },
  { label: '6개월', key: '6m', months: 6 },
  { label: '1년', key: '1y', months: 12 },
  { label: '2년', key: '2y', months: 24 },
  { label: '전체', key: 'all', months: 9999 },
]

const WEEKDAY_COLORS = ['#818cf8', '#818cf8', '#818cf8', '#818cf8', '#818cf8', '#f59e0b', '#f97316']
const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function TrendIndicator({ change }: { change: number }) {
  if (change > 5) return <span className="flex items-center gap-0.5 text-green-600 text-xs font-bold"><TrendingUp className="w-3 h-3" />{change}%↑</span>
  if (change < -5) return <span className="flex items-center gap-0.5 text-red-500 text-xs font-bold"><TrendingDown className="w-3 h-3" />{Math.abs(change)}%↓</span>
  return <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus className="w-3 h-3" />보합</span>
}

function filterTrends(trends: { period: string; ratio: number }[], months: number) {
  if (months >= 9999) return trends
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  return trends.filter(t => new Date(t.period) >= cutoff)
}

export function TabTrend({ data }: Props) {
  const [period, setPeriod] = useState('1y')
  const selectedOption = PERIOD_OPTIONS.find(p => p.key === period)!

  const trendsFiltered = filterTrends(data.trends, selectedOption.months).map(t => ({
    ...t,
    period: t.period.slice(0, 7),
  }))

  // 트렌드 변화율 계산
  const recent3 = data.trends.slice(-3)
  const prev3 = data.trends.slice(-6, -3)
  const recentAvg = recent3.reduce((a, b) => a + b.ratio, 0) / (recent3.length || 1)
  const prevAvg = prev3.reduce((a, b) => a + b.ratio, 0) / (prev3.length || 1)
  const trendChange = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0

  // 월별 차트 (PC/모바일 스택)
  const monthlyData = data.monthlyTrends.map((m, i) => ({
    name: MONTH_LABELS[i] || m.month,
    PC: m.pc,
    모바일: m.mobile,
    합계: m.pc + m.mobile,
  }))

  // 요일별
  const weekdayData = data.weekdayTrends.map(w => ({ name: w.day, 비율: w.ratio }))

  // 최고/최저 월
  const maxMonth = data.monthlyTrends.reduce((a, b) => (a.pc + a.mobile > b.pc + b.mobile ? a : b), data.monthlyTrends[0] || { month: '-', pc: 0, mobile: 0 })
  const minMonth = data.monthlyTrends.reduce((a, b) => (a.pc + a.mobile < b.pc + b.mobile ? a : b), data.monthlyTrends[0] || { month: '-', pc: 0, mobile: 0 })
  const maxWeekday = data.weekdayTrends.reduce((a, b) => (a.ratio > b.ratio ? a : b), data.weekdayTrends[0] || { day: '-', ratio: 0 })
  const minWeekday = data.weekdayTrends.reduce((a, b) => (a.ratio < b.ratio ? a : b), data.weekdayTrends[0] || { day: '-', ratio: 100 })

  const avgRatio = trendsFiltered.length > 0
    ? Math.round(trendsFiltered.reduce((a, t) => a + t.ratio, 0) / trendsFiltered.length)
    : 50

  return (
    <div className="space-y-6">

      {/* ── 트렌드 요약 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-blue-700">{recentAvg.toFixed(0)}</div>
          <div className="text-xs text-blue-500 mt-0.5">최근 3개월 평균</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendIndicator change={trendChange} />
          </div>
          <div className="text-xs text-gray-500 mt-0.5">전분기 대비</div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
          <div className="text-lg font-black text-purple-700">{maxMonth.month}</div>
          <div className="text-xs text-purple-500 mt-0.5">최고 검색 월</div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
          <div className="text-lg font-black text-orange-700">{maxWeekday.day}요일</div>
          <div className="text-xs text-orange-500 mt-0.5">최고 검색 요일</div>
        </div>
      </div>

      {/* ── 기간 선택 ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">조회기간:</span>
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={`text-sm px-3.5 py-1.5 rounded-xl border transition-all font-medium ${
              period === opt.key
                ? 'border-green-500 bg-green-500 text-white shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-600 bg-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── 트렌드 에리어차트 ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            검색 트렌드 ({selectedOption.label})
            <span className="ml-auto text-xs font-normal text-gray-400">
              기간 평균 <strong className="text-gray-600">{avgRatio}</strong>
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendsFiltered} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                domain={[0, 100]}
                tickFormatter={v => `${v}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`${v}`, '검색지수']}
                contentStyle={{ fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', borderRadius: 12 }}
              />
              <ReferenceLine y={avgRatio} stroke="#d1fae5" strokeDasharray="6 3" label={{ value: '평균', fill: '#6ee7b7', fontSize: 10, position: 'right' }} />
              <Area
                type="monotone"
                dataKey="ratio"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#trendGradient)"
                name="검색지수"
                dot={false}
                activeDot={{ r: 6, fill: '#16a34a', stroke: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-1">0~100 상대값 (네이버 DataLab 기준)</p>
        </CardBody>
      </Card>

      {/* ── 최근 12개월 PC/모바일 분리 바차트 ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            최근 12개월 PC / 모바일 검색량
          </CardTitle>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number, name: string) => [formatNumberFull(v), name]}
                contentStyle={{ fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', borderRadius: 12 }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="PC" fill="#60a5fa" stackId="a" name="PC" />
              <Bar dataKey="모바일" fill="#34d399" stackId="a" radius={[4, 4, 0, 0]} name="모바일" />
            </BarChart>
          </ResponsiveContainer>
          {/* 인사이트 */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <span className="text-green-600 font-bold">📈 최고 검색월</span>
              <div className="text-gray-700 font-medium mt-1">{maxMonth.month} — {formatNumberFull(maxMonth.pc + maxMonth.mobile)}회</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-gray-500 font-bold">📉 최저 검색월</span>
              <div className="text-gray-700 font-medium mt-1">{minMonth.month} — {formatNumberFull(minMonth.pc + minMonth.mobile)}회</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── 요일별 검색 비율 ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            요일별 검색 비율
          </CardTitle>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekdayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 14, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                domain={[0, 100]}
                tickFormatter={v => `${v}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`${v}%`, '검색 비율']}
                contentStyle={{ fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', borderRadius: 12 }}
              />
              <Bar dataKey="비율" radius={[8, 8, 0, 0]}>
                {weekdayData.map((_, i) => (
                  <Cell key={i} fill={WEEKDAY_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
              <span className="text-indigo-600 font-bold">🔝 최고 요일</span>
              <div className="text-gray-700 font-medium mt-1">{maxWeekday.day}요일 — {maxWeekday.ratio}%</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-gray-500 font-bold">⬇️ 최저 요일</span>
              <div className="text-gray-700 font-medium mt-1">{minWeekday.day}요일 — {minWeekday.ratio}%</div>
            </div>
          </div>
        </CardBody>
      </Card>

    </div>
  )
}
