'use client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import type { AnalysisData } from '../KeywordAnalysis'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Monitor, Smartphone, Users, Activity, BarChart2 } from 'lucide-react'

interface Props {
  data: AnalysisData
}

const GENDER_COLORS = ['#60a5fa', '#f472b6']
const AGE_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#94a3b8']
const DEVICE_COLORS = ['#3b82f6', '#10b981']

// 커스텀 라벨 (도넛 안)
function DonutLabel({ cx, cy, name, pct }: { cx: number; cy: number; name: string; pct: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-8" fontSize={18} fontWeight={800} fill="#1f2937">{pct}%</tspan>
      <tspan x={cx} dy={22} fontSize={11} fill="#6b7280">{name}</tspan>
    </text>
  )
}

interface DonutChartProps {
  data: { name: string; value: number }[]
  colors: string[]
  title: string
  icon: React.ReactNode
  labelPrimary?: string
}

function DonutChart({ data, colors, title, icon, labelPrimary }: DonutChartProps) {
  const dominant = data.reduce((a, b) => (a.value > b.value ? a : b), data[0] || { name: '-', value: 0 })
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col items-center">
          <div style={{ width: 180, height: 180, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${v}%`, '']}
                  contentStyle={{ fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', borderRadius: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-800">{dominant.value}%</span>
              <span className="text-xs text-gray-500">{labelPrimary || dominant.name}</span>
            </div>
          </div>

          {/* 범례 */}
          <div className="w-full mt-4 space-y-2">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="text-sm text-gray-600 flex-1">{d.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${d.value}%`, backgroundColor: colors[i % colors.length] }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-9 text-right">{d.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export function TabPersonality({ data }: Props) {
  const genderData = [
    { name: '남성', value: data.genderRatio?.male ?? 50 },
    { name: '여성', value: data.genderRatio?.female ?? 50 },
  ]

  const ageData = Object.entries(data.ageGroup || {}).map(([age, pct]) => ({
    name: age, value: typeof pct === 'number' ? pct : Number(pct),
  }))

  const deviceData = [
    { name: 'PC', value: data.deviceRatio?.pc ?? 30 },
    { name: '모바일', value: data.deviceRatio?.mobile ?? 70 },
  ]

  const issueIndex = data.issueIndex || 5
  const isHighIssue = issueIndex > 10
  const isMediumIssue = issueIndex > 3

  const dominantGender = (data.genderRatio?.male ?? 50) > 55 ? '남성' : (data.genderRatio?.female ?? 50) > 55 ? '여성' : '균형'
  const topAge = [...ageData].sort((a, b) => b.value - a.value)[0]?.name || '30대'
  const dominantDevice = (data.deviceRatio?.mobile ?? 70) > 60 ? '모바일' : 'PC'
  const isCommercial = (data.blogCount + data.cafeCount) > data.totalSearch * 0.3

  return (
    <div className="space-y-6">

      {/* ── 핵심 성향 요약 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '주 성별', value: dominantGender, color: 'blue', icon: '👥' },
          { label: '주 연령층', value: topAge, color: 'green', icon: '📊' },
          { label: '주 디바이스', value: dominantDevice, color: 'purple', icon: '📱' },
          {
            label: '검색 목적',
            value: isCommercial ? '상업성' : '정보성',
            color: isCommercial ? 'orange' : 'teal',
            icon: isCommercial ? '🛒' : '📚',
          },
        ].map(({ label, value, color, icon }) => {
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-50 border-blue-100 text-blue-700',
            green: 'bg-green-50 border-green-100 text-green-700',
            purple: 'bg-purple-50 border-purple-100 text-purple-700',
            orange: 'bg-orange-50 border-orange-100 text-orange-700',
            teal: 'bg-teal-50 border-teal-100 text-teal-700',
          }
          return (
            <div key={label} className={`border rounded-2xl p-4 text-center ${colorMap[color]}`}>
              <div className="text-2xl mb-1">{icon}</div>
              <div className={`text-xl font-black`}>{value}</div>
              <div className="text-xs mt-1 opacity-70">{label}</div>
            </div>
          )
        })}
      </div>

      {/* ── 도넛 차트 3개 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <DonutChart
          data={genderData}
          colors={GENDER_COLORS}
          title="성별 분포"
          icon={<Users className="w-4 h-4 text-blue-500" />}
          labelPrimary="주 성별"
        />
        <DonutChart
          data={deviceData}
          colors={DEVICE_COLORS}
          title="PC / 모바일 비율"
          icon={<Monitor className="w-4 h-4 text-green-500" />}
          labelPrimary="주 디바이스"
        />
        {/* 연령대 도넛 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart2 className="w-4 h-4 text-purple-500" />
              연령대 분포
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col items-center">
              <div style={{ width: 180, height: 180, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {ageData.map((_, i) => (
                        <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${v}%`, '']}
                      contentStyle={{ fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', borderRadius: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-gray-800">{topAge}</span>
                  <span className="text-xs text-gray-500">최다 연령</span>
                </div>
              </div>
              <div className="w-full mt-4 space-y-2">
                {ageData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: AGE_COLORS[i % AGE_COLORS.length] }} />
                    <span className="text-sm text-gray-600 flex-1">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${d.value}%`, backgroundColor: AGE_COLORS[i % AGE_COLORS.length] }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-800 w-9 text-right">{d.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── 이슈성 지수 ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500" />
            이슈성 지수 상세
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">이슈성 지수</span>
                <span className={`font-bold ${isHighIssue ? 'text-red-600' : isMediumIssue ? 'text-yellow-600' : 'text-green-600'}`}>
                  {issueIndex}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isHighIssue ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                    isMediumIssue ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                    'bg-gradient-to-r from-green-400 to-emerald-500'
                  }`}
                  style={{ width: `${Math.min(issueIndex, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>안정 (&lt;3%)</span>
                <span>보통 (3~10%)</span>
                <span>고이슈 (&gt;10%)</span>
              </div>
            </div>
          </div>
          <div className={`p-4 rounded-xl text-sm font-medium ${
            isHighIssue ? 'bg-red-50 border border-red-200 text-red-700' :
            isMediumIssue ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
            'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {isHighIssue
              ? '⚠️ 이슈성 키워드: 검색량 변동이 크고 트렌드에 민감합니다. 빠른 콘텐츠 발행이 중요하지만 지속성이 낮을 수 있습니다.'
              : isMediumIssue
              ? '📊 보통 이슈성: 어느 정도 트렌드를 타지만 안정적인 편입니다. 정기적인 콘텐츠 업데이트를 권장합니다.'
              : '✅ 안정 키워드: 검색량이 꾸준하고 트렌드 변동이 낮습니다. 장기적인 SEO 전략에 적합합니다.'
            }
          </div>

          {/* 정보성/상업성 분류 */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-4 rounded-xl border text-center transition-all ${!isCommercial ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-3xl mb-2">📚</div>
              <div className={`text-sm font-bold ${!isCommercial ? 'text-indigo-700' : 'text-gray-300'}`}>정보성</div>
              <div className={`text-xs mt-1 ${!isCommercial ? 'text-indigo-500' : 'text-gray-300'}`}>
                {!isCommercial ? '주요 검색 목적' : '해당 없음'}
              </div>
            </div>
            <div className={`p-4 rounded-xl border text-center transition-all ${isCommercial ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-3xl mb-2">🛒</div>
              <div className={`text-sm font-bold ${isCommercial ? 'text-orange-700' : 'text-gray-300'}`}>상업성</div>
              <div className={`text-xs mt-1 ${isCommercial ? 'text-orange-500' : 'text-gray-300'}`}>
                {isCommercial ? '주요 검색 목적' : '해당 없음'}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

    </div>
  )
}
