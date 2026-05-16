'use client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { GradeChip } from '@/components/ui/GradeChip'
import { formatNumberFull, formatNumber } from '@/lib/utils'
import type { AnalysisData } from '../KeywordAnalysis'
import {
  Monitor, Smartphone, FileText, Coffee, TrendingUp, Calendar,
  Globe, Newspaper, Activity, Target, Zap,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, Legend,
} from 'recharts'

const SATURATION_BAR = ['매우낮음', '낮음', '보통', '높음', '매우높음']
const WEEKDAY_COLORS = ['#6366f1', '#6366f1', '#6366f1', '#6366f1', '#6366f1', '#f59e0b', '#f97316']

interface Props {
  data: AnalysisData
  onKeywordClick: (kw: string) => void
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-green-600' : 'text-gray-800'}`}>
        {typeof value === 'number' ? formatNumberFull(value) : value}
      </span>
    </div>
  )
}

export function TabBasicInfo({ data, onKeywordClick }: Props) {
  const totalDoc = data.blogCount + data.cafeCount
  const satRatio = data.totalSearch > 0 ? Math.round((totalDoc / data.totalSearch) * 100) : 0
  const pcRatio = data.totalSearch > 0 ? Math.round((data.pcSearch / data.totalSearch) * 100) : 30
  const mobileRatio = data.totalSearch > 0 ? Math.round((data.mobileSearch / data.totalSearch) * 100) : 70

  // 월별 차트 데이터
  const monthlyChartData = data.monthlyTrends.map((m, i) => ({
    name: m.month.replace(/\d{4}-/, '').replace(/^0/, '') + '월',
    PC: m.pc,
    모바일: m.mobile,
    합계: m.pc + m.mobile,
    ratio: data.monthlyRatio?.[i]?.ratio || 0,
  }))

  // 요일별 차트 데이터
  const weekdayChartData = data.weekdayTrends.map(w => ({
    name: w.day,
    비율: w.ratio,
  }))

  const maxMonthly = Math.max(...monthlyChartData.map(d => d.합계), 1)

  return (
    <div className="space-y-6">

      {/* ── 상단 3열 카드 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 키워드 등급 */}
        <Card className="border-0 bg-gradient-to-br from-gray-50 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              키워드 등급
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-col items-center py-3">
              <GradeChip grade={data.grade.grade} size="xl" />
              <p className="text-xs text-gray-400 mt-2">15단계 종합 평가</p>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
              {[
                { k: '검색량', v: formatNumberFull(data.totalSearch) + '회' },
                { k: '발행량', v: formatNumberFull(totalDoc) + '건' },
                { k: '포화지수', v: satRatio + '%' },
                { k: '경쟁도', v: data.competitionLevel },
                { k: '이슈성', v: data.issueIndex + '%' },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <strong className="text-gray-700">{v}</strong>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* 포화 지수 */}
        <Card className="border-0 bg-gradient-to-br from-gray-50 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              콘텐츠 포화 지수
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="text-center py-1">
              <span className={`text-3xl font-black ${data.saturation.color}`}>{data.saturation.label}</span>
              <div className="text-sm text-gray-400 mt-1">포화율 {satRatio}%</div>
            </div>
            <div className="flex gap-1.5">
              {SATURATION_BAR.map((s, i) => (
                <div
                  key={s}
                  className={`flex-1 h-2.5 rounded-full transition-all ${
                    i < data.saturation.level
                      ? ['bg-blue-300', 'bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500'][i]
                      : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
              <span>매우낮음</span><span>매우높음</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs">
              <InfoRow label="블로그 발행량" value={data.blogCount} />
              <InfoRow label="카페 발행량" value={data.cafeCount} />
              <InfoRow label="뉴스 발행량" value={data.newsCount} />
              <InfoRow label="총 발행량" value={totalDoc} highlight />
            </div>
          </CardBody>
        </Card>

        {/* 부가 정보 */}
        <Card className="border-0 bg-gradient-to-br from-gray-50 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              부가 정보
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-0">
            <InfoRow label="최초 등장일(추정)" value={data.firstAppearDate} />
            <InfoRow label="예상 검색량(당월)" value={data.estimatedSearch} highlight />
            <InfoRow label="이슈성 지수" value={`${data.issueIndex}% (${
              data.issueIndex > 10 ? '고이슈' : data.issueIndex > 3 ? '보통' : '안정'
            })`} />
            <InfoRow label="광고 경쟁도" value={data.competitionLevel} />
            <InfoRow
              label="PC CPC"
              value={data.pcBid ? `₩${formatNumberFull(data.pcBid)}` : '데이터 없음'}
            />
            <InfoRow
              label="모바일 CPC"
              value={data.mobileBid ? `₩${formatNumberFull(data.mobileBid)}` : '데이터 없음'}
            />
            <InfoRow
              label="PC CTR"
              value={data.pcCtr ? `${data.pcCtr}%` : '-'}
            />
            <InfoRow
              label="모바일 CTR"
              value={data.mobileCtr ? `${data.mobileCtr}%` : '-'}
            />
          </CardBody>
        </Card>
      </div>

      {/* ── 구글 검색 데이터 ── */}
      {data.google && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              구글 검색 결과
              <span className="ml-auto text-sm font-normal text-gray-500">
                약 <strong className="text-blue-600">{data.google.totalResults}</strong>개 결과
              </span>
            </CardTitle>
          </CardHeader>
          {data.google.topResults && data.google.topResults.length > 0 && (
            <CardBody className="space-y-3">
              {data.google.topResults.map((r, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-blue-100 text-blue-600 text-xs font-bold rounded-lg">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-700 hover:underline line-clamp-1 group-hover:text-blue-800"
                    >
                      {r.title || r.link}
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1 truncate">{r.link}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          )}
          {(!data.google.topResults || data.google.topResults.length === 0) && (
            <CardBody>
              <p className="text-sm text-gray-400 text-center py-4">구글 검색 결과를 가져오는 중입니다...</p>
            </CardBody>
          )}
        </Card>
      )}

      {/* ── 최근 12개월 검색량 추이 (스택바) ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            최근 12개월 검색량 추이
          </CardTitle>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => formatNumber(v)} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number, name: string) => [formatNumberFull(v), name]}
                contentStyle={{ fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', borderRadius: 12 }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="PC" stackId="a" fill="#60a5fa" name="PC" radius={[0, 0, 0, 0]} />
              <Bar dataKey="모바일" stackId="a" fill="#34d399" name="모바일" radius={[4, 4, 0, 0]}>
                {monthlyChartData.map((d, i) => (
                  <Cell key={i} fill={d.합계 === maxMonthly ? '#10b981' : '#34d399'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* ── 월별 검색 비율 (시즌 분석) ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            월별 검색 비율 (시즌 분석)
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {data.monthlyRatio.map((m, i) => {
              const ratio = m.ratio
              const isMax = ratio === Math.max(...data.monthlyRatio.map(x => x.ratio))
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-bold ${isMax ? 'text-green-600' : 'text-gray-400'}`}>
                    {ratio}%
                  </span>
                  <div className="w-full flex flex-col justify-end rounded-lg overflow-hidden bg-gray-100" style={{ height: 64 }}>
                    <div
                      className={`w-full transition-all rounded-t-lg ${isMax ? 'bg-green-500' : 'bg-green-300'}`}
                      style={{ height: `${ratio}%`, minHeight: 3 }}
                    />
                  </div>
                  <span className={`text-[10px] ${isMax ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                    {m.month.replace(/\d{4}-/, '').replace(/^0/, '')}월
                  </span>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* ── 요일별 검색 비율 ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            요일별 검색 비율
          </CardTitle>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekdayChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 100]} tickFormatter={v => `${v}`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v}%`, '검색 비율']} contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="비율" radius={[6, 6, 0, 0]}>
                {weekdayChartData.map((_, i) => (
                  <Cell key={i} fill={WEEKDAY_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />평일</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />토요일</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />일요일</span>
          </div>
        </CardBody>
      </Card>

    </div>
  )
}
