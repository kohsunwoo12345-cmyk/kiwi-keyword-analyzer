'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Wallet,
  Coins,
  TrendingUp,
  TrendingDown,
  Activity as ActivityIcon,
  Inbox,
  Receipt,
  Video,
  Send,
  FileText,
  CalendarDays,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric, Spark, BarTrend, ListRow } from '@/components/dash/Kit'
import { Counter } from '@/components/motion'
import { accountOverview, useAuth, type Tx, type ActivityRow, type User } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'

const ACCENT = '#8b5cf6'

const KIND_LABEL: Record<string, string> = { point: '포인트', credit: '크레딧', purchase: '구매' }
/** 표에서 줄마다 반복되는 값이라 알약 대신 점 하나로 구분한다 */
const KIND_DOT: Record<string, string> = {
  credit: '#f59e0b',
  point: '#8b5cf6',
  purchase: '#0ea5e9',
}

/** 기간 선택 — 추이 차트와 표를 같은 기준으로 자른다 */
const RANGES = [
  { days: 7, label: '7일' },
  { days: 14, label: '14일' },
  { days: 30, label: '30일' },
] as const

/** 활동 종류에 맞는 아이콘·색 */
function activityLook(text: string): { icon: typeof ActivityIcon; accent: string } {
  const s = text || ''
  if (/영상|video/i.test(s)) return { icon: Video, accent: '#a855f7' }
  if (/발송|문자|알림톡|메일/i.test(s)) return { icon: Send, accent: '#0ea5e9' }
  if (/블로그|글|콘텐츠/i.test(s)) return { icon: FileText, accent: '#10b981' }
  if (/분석|리포트|지수/i.test(s)) return { icon: BarChart3, accent: '#f59e0b' }
  return { icon: ActivityIcon, accent: '#6366f1' }
}

/** KST 기준 YYYY-MM-DD (거래 시각을 하루 단위로 묶을 때 쓴다) */
function kstDayKey(iso: string): string {
  return kstDateTime(iso).slice(0, 10)
}

export default function ReportPage() {
  const { user: authUser } = useAuth()
  const [apiUser, setApiUser] = useState<User | null>(null)
  const [tx, setTx] = useState<Tx[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [ready, setReady] = useState(false)
  const [range, setRange] = useState<number>(14)

  useEffect(() => {
    accountOverview().then((r) => {
      setApiUser(r.user || null)
      setTx(r.transactions)
      setActivity(r.activity)
      setReady(true)
    })
  }, [])

  // overview 응답에 user가 없는 경우도 있어 로그인 정보로 보완한다
  const user = apiUser || authUser

  // 선택한 기간의 날짜 축 (사용이 0인 날도 자리를 지킨다)
  const days = useMemo(() => {
    const out: { key: string; label: string; used: number }[] = []
    const base = new Date()
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(base.getDate() - i)
      out.push({
        key: d.toISOString().slice(0, 10),
        label: `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`,
        used: 0,
      })
    }
    return out
  }, [range])

  const trend = useMemo(() => {
    const map = new Map(days.map((d) => [d.key, { ...d }]))
    for (const t of tx) {
      if (t.kind !== 'credit' || t.amount >= 0) continue
      const row = map.get(kstDayKey(t.created_at))
      if (row) row.used += -t.amount
    }
    return Array.from(map.values())
  }, [days, tx])

  const from = days[0]?.key ?? ''
  /** 기간 안의 거래만 — 표와 지표가 차트와 같은 범위를 본다 */
  const rangedTx = useMemo(() => tx.filter((t) => kstDayKey(t.created_at) >= from), [tx, from])

  const stats = useMemo(() => {
    let usedCredit = 0
    let chargedCredit = 0
    let usedPoint = 0
    for (const t of rangedTx) {
      if (t.kind === 'credit') t.amount < 0 ? (usedCredit += -t.amount) : (chargedCredit += t.amount)
      if (t.kind === 'point' && t.amount < 0) usedPoint += -t.amount
    }
    return { usedCredit, chargedCredit, usedPoint }
  }, [rangedTx])

  const rangedActivity = useMemo(
    () => activity.filter((a) => kstDayKey(a.created_at) >= from),
    [activity, from],
  )

  const usedTotal = trend.reduce((s, d) => s + d.used, 0)
  const avg = Math.round(usedTotal / Math.max(1, range))
  const activeDays = trend.filter((d) => d.used > 0).length
  const peak = trend.reduce((a, b) => (b.used > a.used ? b : a), trend[0] ?? { label: '-', used: 0 })

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow="리포트"
        title="통합 리포트"
        desc="크레딧·포인트 사용과 활동을 기간별로 확인합니다. (한국시간 기준)"
        accent={ACCENT}
        action={
          <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setRange(r.days)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  range === r.days
                    ? 'bg-violet-500/15 text-violet-400'
                    : 'text-[var(--text-dim)] hover:bg-[var(--panel-2)]'
                }`}
              >
                최근 {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="보유 크레딧" icon={Wallet} accent="#f59e0b" value={<Counter to={user?.credits ?? 0} />} sub="현재 잔액" />
          <Metric label="보유 포인트" icon={Coins} accent="#8b5cf6" value={<Counter to={user?.points ?? 0} />} sub={stats.usedPoint ? `기간 내 ${stats.usedPoint.toLocaleString('ko-KR')} 사용` : '크레딧 전환에 사용'} />
          <Metric
            label={`사용 크레딧 (${range}일)`}
            icon={TrendingDown}
            accent="#ef4444"
            value={<Counter to={stats.usedCredit} />}
            sub={`하루 평균 ${avg.toLocaleString('ko-KR')}`}
            chart={<Spark data={trend.map((d) => d.used)} accent="#ef4444" />}
          />
          <Metric
            label={`충전 크레딧 (${range}일)`}
            icon={TrendingUp}
            accent="#22c55e"
            value={<Counter to={stats.chargedCredit} />}
            sub={activeDays ? `사용한 날 ${activeDays}일 / ${range}일` : '기간 내 사용 없음'}
          />
        </div>

        <Card
          title={`최근 ${range}일 크레딧 사용 추이`}
          desc={
            usedTotal > 0
              ? `합계 ${usedTotal.toLocaleString('ko-KR')} · 최다 사용일 ${peak.label} (${peak.used.toLocaleString('ko-KR')})`
              : '실제 사용량이 그대로 집계됩니다'
          }
        >
          {usedTotal === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="이 기간에 사용한 크레딧이 없습니다"
              hint="도구를 실행하면 하루 단위로 이곳에 쌓입니다. 기간을 넓혀서 다시 확인해 보세요."
            />
          ) : (
            <BarTrend data={trend.map((d) => ({ label: d.label, value: d.used }))} accent={ACCENT} unit=" 크레딧" />
          )}
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="거래 내역" desc={`${rangedTx.length}건 · 최근 ${range}일`} bodyClassName="p-0">
            {!ready ? (
              <p className="py-14 text-center text-sm text-[var(--text-dim)]">불러오는 중…</p>
            ) : rangedTx.length === 0 ? (
              <EmptyState icon={Receipt} title="거래 내역이 없습니다" hint="크레딧을 충전하거나 사용하면 이곳에 기록됩니다." />
            ) : (
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 z-10 bg-[var(--panel)]">
                    <tr className="border-b border-[var(--border)] text-left text-[11.5px] text-[var(--text-dim)]">
                      <th className="px-5 py-2.5 font-semibold">일시</th>
                      <th className="px-5 py-2.5 font-semibold">종류</th>
                      <th className="px-5 py-2.5 font-semibold">내용</th>
                      <th className="px-5 py-2.5 text-right font-semibold">증감</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangedTx.map((t, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0">
                        <td className="whitespace-nowrap px-5 py-2.5 tabular-nums text-[var(--text-soft)]">{kstDateTime(t.created_at)}</td>
                        <td className="whitespace-nowrap px-5 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-soft)]">
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: KIND_DOT[t.kind] || 'var(--text-dim)' }} />
                            {KIND_LABEL[t.kind] || t.kind}
                          </span>
                        </td>
                        <td className="max-w-[180px] truncate px-5 py-2.5 text-[var(--text-soft)]">{t.memo || '-'}</td>
                        <td className={`whitespace-nowrap px-5 py-2.5 text-right font-bold tabular-nums ${t.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {t.amount >= 0 ? '+' : ''}
                          {t.amount.toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="활동 기록" desc={`${rangedActivity.length}건 · 최근 ${range}일`} bodyClassName="p-3">
            {!ready ? (
              <p className="py-14 text-center text-sm text-[var(--text-dim)]">불러오는 중…</p>
            ) : rangedActivity.length === 0 ? (
              <EmptyState icon={Inbox} title="활동 기록이 없습니다" hint="도구를 사용하면 실행 기록이 이곳에 남습니다." />
            ) : (
              <div className="no-scrollbar max-h-[360px] space-y-0.5 overflow-y-auto">
                {rangedActivity.map((a, i) => {
                  const look = activityLook(a.detail || a.type)
                  return <ListRow key={i} icon={look.icon} accent={look.accent} title={a.detail || a.type} meta={kstDateTime(a.created_at)} />
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
