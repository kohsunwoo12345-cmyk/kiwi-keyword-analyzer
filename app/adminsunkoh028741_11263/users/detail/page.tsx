'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, UserCircle, Coins, Film, LayoutTemplate, Activity as ActivityIcon,
  MapPin, Share2, Crown, RefreshCw, Mail, Phone, Hash, Clapperboard,
} from 'lucide-react'
import { Panel } from '@/components/ui'
import { adminUserFull, type AdminUserFull } from '@/lib/auth'
import { ADMIN_BASE } from '../../layout'
import { cn } from '@/lib/utils'

function fmt(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const num = (n: number) => (n || 0).toLocaleString('ko-KR')

const THEAD = 'border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]'
const TH = 'px-3 py-2.5 font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5'
const TR = 'border-b border-[var(--border-soft)] last:border-0'

function Empty({ label }: { label: string }) {
  return <p className="py-8 text-center text-sm text-[var(--text-dim)]">{label}</p>
}

function DetailInner() {
  const sp = useSearchParams()
  const id = sp.get('id') || ''
  const [data, setData] = useState<AdminUserFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    adminUserFull(id).then((d) => { setData(d); setLoading(false) })
  }, [id])

  if (!id) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-[var(--text-dim)]">회원 id가 지정되지 않았습니다.</p>
        <Link href={`${ADMIN_BASE}/users`} className="mt-3 inline-block text-sm font-semibold text-violet-600 hover:underline">← 회원 목록으로</Link>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="grid place-items-center py-32">
        <RefreshCw size={28} className="animate-spin text-violet-400" />
      </div>
    )
  }
  if (!data?.ok || !data.user) {
    return (
      <div className="p-10 text-center">
        <p className="font-semibold">{data?.error || '회원을 찾을 수 없습니다.'}</p>
        <Link href={`${ADMIN_BASE}/users`} className="mt-3 inline-block text-sm font-semibold text-violet-600 hover:underline">← 회원 목록으로</Link>
      </div>
    )
  }

  const u = data.user
  const via = data.referredByName
    ? `추천 가입 · ${data.referredByName}`
    : '직접 가입'
  const creditTx = data.transactions.filter((t) => t.kind === 'credit')
  const addr = [u.country, u.postalCode].filter(Boolean).join(' ') + (u.address1 ? `\n${u.address1} ${u.address2 || ''}` : '')

  return (
    <div className="animate-fade-in space-y-6 p-6 lg:p-8">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <Link href={`${ADMIN_BASE}/users`} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-soft)] hover:text-[var(--text)]">
          <ArrowLeft size={16} /> 회원 목록
        </Link>
      </div>

      {/* 프로필 헤더 */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-bold text-white">
            {(u.name || '?').charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{u.name || '이름없음'}</h1>
              {u.role === 'admin' && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600"><Crown size={12} /> 관리자</span>}
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', u.status === 'suspended' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600')}>
                {u.status === 'suspended' ? '정지' : '활성'}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--text-soft)]">
              <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {u.email}</span>
              {u.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {u.phone}</span>}
              <span className="inline-flex items-center gap-1.5 font-mono text-xs"><Hash size={13} /> {u.id}</span>
            </div>
          </div>
        </div>

        {/* 요약 그리드 */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info icon={Share2} label="가입 경로" value={via} sub={data.referredCount ? `추천한 회원 ${data.referredCount}명` : undefined} />
          <Info icon={Crown} label="플랜" value={[u.plan !== '없음' ? `마케터 ${u.plan}` : '', u.videoPlan !== '없음' ? `영상 ${u.videoPlan}` : ''].filter(Boolean).join(' · ') || '미결제'} />
          <Info icon={Coins} label="보유 크레딧 / 포인트" value={`${num(u.credits)} C · ${num(u.points)} P`} />
          <Info icon={MapPin} label="사업장 주소" value={u.addressComplete ? addr : '미입력'} pre />
        </div>
        <p className="mt-3 text-xs text-[var(--text-dim)]">가입일 {fmt(u.createdAt)} · 최근 접속 {fmt(u.lastActive)}</p>
      </div>

      {/* 크레딧 사용 내역 */}
      <Panel title={<span className="flex items-center gap-2"><Coins size={16} className="text-violet-500" /> 크레딧 사용 내역</span>}>
        {creditTx.length === 0 ? <Empty label="크레딧 사용 내역이 없습니다." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className={THEAD}><th className={TH}>일시</th><th className={TH}>구분</th><th className={cn(TH, 'text-right')}>변동</th><th className={cn(TH, 'text-right')}>잔액</th><th className={TH}>메모</th></tr></thead>
              <tbody>
                {creditTx.map((t, i) => (
                  <tr key={i} className={TR}>
                    <td className={cn(TD, 'whitespace-nowrap text-[var(--text-soft)]')}>{fmt(t.created_at)}</td>
                    <td className={TD}><span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', t.amount < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600')}>{t.amount < 0 ? '사용' : '충전'}</span></td>
                    <td className={cn(TD, 'text-right font-semibold tabular-nums', t.amount < 0 ? 'text-rose-600' : 'text-emerald-600')}>{t.amount > 0 ? '+' : ''}{num(t.amount)}</td>
                    <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{t.balance_after != null ? num(t.balance_after) : '-'}</td>
                    <td className={cn(TD, 'text-[var(--text-soft)]')}>{t.memo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* 영상 제작 사용 모델 */}
      <Panel title={<span className="flex items-center gap-2"><Clapperboard size={16} className="text-violet-500" /> AI 영상 제작 · 사용 모델 내역</span>}>
        {data.aiUsage.length === 0 ? <Empty label="AI 영상/이미지 제작 내역이 없습니다." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className={THEAD}><th className={TH}>일시</th><th className={TH}>모델</th><th className={TH}>제공사</th><th className={TH}>유형</th><th className={cn(TH, 'text-right')}>크레딧</th><th className={cn(TH, 'text-right')}>원가(₩)</th></tr></thead>
              <tbody>
                {data.aiUsage.map((a, i) => (
                  <tr key={i} className={TR}>
                    <td className={cn(TD, 'whitespace-nowrap text-[var(--text-soft)]')}>{fmt(a.created_at)}</td>
                    <td className={cn(TD, 'font-semibold')}>{a.model || '-'}</td>
                    <td className={cn(TD, 'text-[var(--text-soft)]')}>{a.provider || '-'}</td>
                    <td className={TD}><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">{a.kind || '영상'}</span></td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{num(a.credits)}</td>
                    <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(a.cost_krw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* 제작한 페이지 */}
      <Panel title={<span className="flex items-center gap-2"><LayoutTemplate size={16} className="text-violet-500" /> 제작한 랜딩페이지</span>}>
        {data.landings.length === 0 ? <Empty label="제작한 페이지가 없습니다." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className={THEAD}><th className={TH}>생성일</th><th className={TH}>제목 / 주소</th><th className={TH}>상태</th><th className={cn(TH, 'text-right')}>조회수</th><th className={cn(TH, 'text-right')}>수집 DB</th></tr></thead>
              <tbody>
                {data.landings.map((l, i) => (
                  <tr key={i} className={TR}>
                    <td className={cn(TD, 'whitespace-nowrap text-[var(--text-soft)]')}>{fmt(l.created_at)}</td>
                    <td className={TD}>
                      <div className="font-medium">{l.title || '(제목없음)'}</div>
                      <div className="font-mono text-xs text-[var(--text-dim)]">/{l.slug}</div>
                    </td>
                    <td className={TD}>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', l.published ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                        {l.published ? '게시중' : '비공개'}
                      </span>
                    </td>
                    <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(l.views)}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-semibold')}>{num(l.leads)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* 활동 로그 */}
      <Panel title={<span className="flex items-center gap-2"><ActivityIcon size={16} className="text-violet-500" /> 활동 로그</span>}>
        {data.activity.length === 0 ? <Empty label="활동 기록이 없습니다." /> : (
          <ul className="space-y-2">
            {data.activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />
                <span className="w-36 flex-shrink-0 whitespace-nowrap text-xs text-[var(--text-dim)]">{fmt(a.created_at)}</span>
                <span className="text-[var(--text-soft)]"><b className="font-semibold text-[var(--text)]">{a.type}</b> · {a.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function Info({ icon: Icon, label, value, sub, pre }: { icon: typeof Coins; label: string; value: string; sub?: string; pre?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]"><Icon size={13} /> {label}</div>
      <div className={cn('mt-1 text-sm font-semibold', pre && 'whitespace-pre-line leading-snug')}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--text-dim)]">{sub}</div>}
    </div>
  )
}

export default function AdminUserDetailPage() {
  return (
    <Suspense fallback={<div className="grid place-items-center py-32"><RefreshCw size={28} className="animate-spin text-violet-400" /></div>}>
      <DetailInner />
    </Suspense>
  )
}
