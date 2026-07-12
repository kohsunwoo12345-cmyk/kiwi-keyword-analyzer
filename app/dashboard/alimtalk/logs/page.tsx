'use client'

import { BarChart3, Send, Check, MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { StatCard, Panel } from '@/components/ui'

const trend = [
  { name: '월', 발송: 8200, 열람: 7100 },
  { name: '화', 발송: 9100, 열람: 8020 },
  { name: '수', 발송: 8700, 열람: 7680 },
  { name: '목', 발송: 10400, 열람: 9200 },
  { name: '금', 발송: 11800, 열람: 10380 },
  { name: '토', 발송: 7600, 열람: 6540 },
  { name: '일', 발송: 6600, 열람: 5720 },
]

type Row = {
  name: string
  category: string
  sent: number
  success: number
  read: number
  click: number
}

const rows: Row[] = [
  { name: '예약 확인 안내', category: '예약', sent: 18240, success: 99.4, read: 91.2, click: 32.1 },
  { name: '주문 완료 안내', category: '주문', sent: 15120, success: 99.2, read: 88.7, click: 27.4 },
  { name: '배송 출발 안내', category: '배송', sent: 12680, success: 98.9, read: 90.5, click: 41.8 },
  { name: '포인트 적립 안내', category: '포인트', sent: 8940, success: 99.0, read: 82.3, click: 18.6 },
  { name: '이벤트 초대 안내', category: '이벤트', sent: 5320, success: 97.6, read: 74.1, click: 12.3 },
  { name: '휴면 전환 안내', category: '회원', sent: 2100, success: 98.1, read: 68.9, click: 9.4 },
]

const donut = [
  { name: '예약', value: 30, color: '#f59e0b' },
  { name: '주문', value: 24, color: '#22c55e' },
  { name: '배송', value: 20, color: '#0ea5e9' },
  { name: '포인트', value: 14, color: '#7c3aed' },
  { name: '이벤트', value: 8, color: '#ec4899' },
  { name: '회원', value: 4, color: '#94a3b8' },
]

function highlight(r: Row) {
  return r.read >= 90 && r.click >= 30
}

export default function AlimtalkLogsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow="카카오 알림톡"
        title="발송 통계"
        desc="알림톡 발송 성과와 템플릿별 반응 지표를 분석합니다."
        accent="#f59e0b"
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 발송" value="62,400" delta={11} icon={Send} accent="#f59e0b" />
          <StatCard label="성공" value="61,840" delta={0.6} icon={Check} accent="#22c55e" />
          <StatCard label="열람률" value="87.3%" delta={2.4} icon={MessageCircle} accent="#0ea5e9" />
          <StatCard label="버튼 클릭률" value="24.6%" delta={3.1} icon={BarChart3} accent="#7c3aed" />
        </div>

        <Panel title="발송 추이">
          <AreaTrend data={trend} keys={['발송', '열람']} colors={['#f59e0b', '#22c55e']} />
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Panel title="템플릿별 성과">
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-3 py-2.5 font-medium">템플릿명</th>
                    <th className="px-3 py-2.5 font-medium">발송수</th>
                    <th className="px-3 py-2.5 font-medium">성공률</th>
                    <th className="px-3 py-2.5 font-medium">열람률</th>
                    <th className="px-3 py-2.5 font-medium">클릭률</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.name}
                      className={`border-b border-[var(--border-soft)] hover:bg-slate-50 ${
                        highlight(r) ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.name}</span>
                          {highlight(r) && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              우수
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--text-dim)]">{r.category}</span>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{r.sent.toLocaleString()}</td>
                      <td className="px-3 py-3 font-semibold text-emerald-600">{r.success}%</td>
                      <td className="px-3 py-3 font-semibold text-sky-600">{r.read}%</td>
                      <td className="px-3 py-3 font-semibold text-violet-600">{r.click}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="카테고리별 발송 비중">
            <Donut data={donut} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {donut.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[var(--text-soft)]">{d.name}</span>
                  <span className="ml-auto font-semibold">{d.value}%</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
