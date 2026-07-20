'use client'

import { useEffect, useState } from 'react'
import { Ticket, Plus, RefreshCw, Power, Trash2, Percent, BadgePercent, Users, Coins, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminCoupons, adminCouponCreate, adminCouponAction, type Coupon, type CouponRedemption } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#ec4899'
const won = (n: number) => '₩' + (n || 0).toLocaleString('ko-KR')
const kst = (iso?: string | null) => { if (!iso) return '-'; try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso || '-' } }
const INPUT = 'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none focus:border-pink-500'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [reds, setReds] = useState<CouponRedemption[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, totalUses: 0, totalDiscount: 0 })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // 생성 폼
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('10')
  const [scopeTrack, setScopeTrack] = useState('')
  const [scopePlan, setScopePlan] = useState('')
  const [minMonths, setMinMonths] = useState('1')
  const [maxUses, setMaxUses] = useState('0')
  const [perUserLimit, setPerUserLimit] = useState('1')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const load = () => { setLoading(true); adminCoupons().then((d) => { setCoupons(d.coupons); setReds(d.redemptions); setStats(d.stats); setLoading(false) }) }
  useEffect(() => { load() }, [])

  async function create() {
    if (!code.trim()) { setMsg({ ok: false, text: '쿠폰 코드를 입력하세요.' }); return }
    if (!Number(discountValue)) { setMsg({ ok: false, text: '할인 값을 입력하세요.' }); return }
    setBusy(true); setMsg(null)
    const r = await adminCouponCreate({
      code: code.trim(), description: description.trim(), discountType, discountValue: Number(discountValue),
      scopeTrack, scopePlan, minMonths: Number(minMonths), maxUses: Number(maxUses), perUserLimit: Number(perUserLimit),
      startsAt: startsAt || undefined, expiresAt: expiresAt || undefined,
    })
    setBusy(false)
    if (r.ok) { setMsg({ ok: true, text: `✅ 쿠폰 ${r.code} 생성 완료` }); setCode(''); setDescription(''); load() }
    else setMsg({ ok: false, text: '❌ ' + (r.error || '생성 실패') })
  }
  async function toggle(id: string) { await adminCouponAction('toggle', id); load() }
  async function remove(id: string, code: string) { if (typeof window !== 'undefined' && !window.confirm(`쿠폰 ${code} 을(를) 삭제할까요?`)) return; await adminCouponAction('delete', id); load() }

  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''; for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
    setCode(s)
  }

  const scopeLabel = (c: Coupon) => {
    const t = c.scope_track === 'video' ? 'AI영상' : c.scope_track === 'marketer' ? '마케터' : '전체'
    const p = c.scope_plan || '전체'
    return `${t} · ${p}`
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Ticket}
        eyebrow="MARKETING"
        title="쿠폰 · 할인코드"
        desc="마케팅용 할인코드를 만들고 관리합니다. 발급된 코드는 요금제 활성화(/activate)에서 회원이 입력해 즉시 할인됩니다."
        accent={ACCENT}
        action={<Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침</Button>}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="전체 쿠폰" value={String(stats.total)} icon={Ticket} accent="#ec4899" />
            <StatCard label="활성 쿠폰" value={String(stats.active)} icon={BadgePercent} accent="#10b981" />
            <StatCard label="총 사용" value={String(stats.totalUses)} icon={Users} accent="#0ea5e9" />
            <StatCard label="총 할인액" value={won(stats.totalDiscount)} icon={Coins} accent="#f59e0b" />
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* 생성 */}
          <Reveal>
            <Panel title={<span className="flex items-center gap-2"><Plus size={16} className="text-pink-600" /> 쿠폰 만들기</span>}>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">쿠폰 코드</label>
                  <div className="flex gap-2">
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="예: WELCOME20" className={INPUT} />
                    <Button variant="outline" size="sm" onClick={genCode}>자동생성</Button>
                  </div>
                </div>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택, 예: 신규가입 20% 할인)" className={INPUT} />

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">할인 방식</label>
                  <div className="flex gap-2">
                    {([['percent', '정률(%)'], ['fixed', '정액(원)']] as ['percent' | 'fixed', string][]).map(([v, l]) => (
                      <button key={v} onClick={() => setDiscountType(v)} className={cn('flex-1 rounded-lg border px-3 py-2 text-xs font-semibold', discountType === v ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50')}>{l}</button>
                    ))}
                    <div className="relative flex-1">
                      <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value.replace(/[^0-9]/g, ''))} className={cn(INPUT, 'pr-8 text-right')} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-dim)]">{discountType === 'percent' ? '%' : '원'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">적용 트랙</label>
                    <select value={scopeTrack} onChange={(e) => setScopeTrack(e.target.value)} className={INPUT}>
                      <option value="">전체</option><option value="marketer">마케터</option><option value="video">AI 영상</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">적용 플랜</label>
                    <select value={scopePlan} onChange={(e) => setScopePlan(e.target.value)} className={INPUT}>
                      <option value="">전체</option><option value="Plus">Plus</option><option value="Pro">Pro</option><option value="Max">Max</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">최소 개월</label>
                    <input value={minMonths} onChange={(e) => setMinMonths(e.target.value.replace(/[^0-9]/g, ''))} className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">총 사용한도</label>
                    <input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0=무제한" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">1인 한도</label>
                    <input value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0=무제한" className={INPUT} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">시작일 (선택)</label>
                    <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">만료일 (선택)</label>
                    <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={INPUT} />
                  </div>
                </div>

                {msg && <div className={cn('rounded-lg px-3 py-2 text-sm font-semibold', msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{msg.text}</div>}
                <Button variant="primary" size="md" className="w-full !bg-pink-600 hover:!bg-pink-700" disabled={busy} onClick={create}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 쿠폰 생성
                </Button>
              </div>
            </Panel>
          </Reveal>

          {/* 목록 */}
          <Reveal>
            <Panel title={<span className="flex items-center gap-2"><Percent size={16} className="text-pink-600" /> 발급된 쿠폰</span>}>
              {coupons.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '발급된 쿠폰이 없습니다.'}</p>
              ) : (
                <div className="space-y-2">
                  {coupons.map((c) => {
                    const expired = c.expires_at && new Date(c.expires_at).getTime() < Date.now()
                    const exhausted = c.max_uses > 0 && c.used_count >= c.max_uses
                    return (
                      <div key={c.id} className="rounded-xl border border-[var(--border)] p-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-sm font-bold tracking-wider text-white">{c.code}</span>
                          <span className="text-sm font-bold text-pink-600">{c.discount_type === 'percent' ? `${c.discount_value}%` : won(c.discount_value)}</span>
                          {c.active && !expired && !exhausted ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">활성</Badge>
                          ) : (
                            <Badge className="border-slate-200 bg-slate-50 text-slate-500">{expired ? '만료' : exhausted ? '소진' : '비활성'}</Badge>
                          )}
                          <div className="ml-auto flex gap-1">
                            <button onClick={() => toggle(c.id)} title={c.active ? '비활성화' : '활성화'} className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-soft)] hover:bg-slate-100"><Power size={14} /></button>
                            <button onClick={() => remove(c.id, c.code)} title="삭제" className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        {c.description && <p className="mt-1.5 text-xs text-[var(--text-soft)]">{c.description}</p>}
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-dim)]">
                          <span>범위 {scopeLabel(c)}</span>
                          <span>최소 {c.min_months}개월</span>
                          <span>사용 {c.used_count}{c.max_uses > 0 ? `/${c.max_uses}` : ''}회</span>
                          <span>1인 {c.per_user_limit === 0 ? '무제한' : `${c.per_user_limit}회`}</span>
                          {c.expires_at && <span>~ {kst(c.expires_at)}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
          </Reveal>
        </div>

        {/* 사용 내역 */}
        <Reveal>
          <Panel title={<span className="flex items-center gap-2"><Users size={16} className="text-pink-600" /> 쿠폰 사용 내역</span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">사용시각 (KST)</th>
                    <th className="pb-2.5 font-medium">코드</th>
                    <th className="pb-2.5 font-medium">회원</th>
                    <th className="pb-2.5 font-medium">플랜</th>
                    <th className="pb-2.5 text-right font-medium">정가</th>
                    <th className="pb-2.5 text-right font-medium">할인</th>
                    <th className="pb-2.5 text-right font-medium">결제액</th>
                  </tr>
                </thead>
                <tbody>
                  {reds.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border-soft)] last:border-0">
                      <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{kst(r.created_at)}</td>
                      <td className="py-2.5 font-mono text-xs font-semibold">{r.code}</td>
                      <td className="py-2.5">{r.name || '-'} <span className="text-xs text-[var(--text-dim)]">{r.email || ''}</span></td>
                      <td className="py-2.5 text-[var(--text-soft)]">{r.track === 'video' ? '영상' : '마케터'} {r.plan} {r.months}개월</td>
                      <td className="py-2.5 text-right text-[var(--text-dim)] line-through">{won(r.original_krw)}</td>
                      <td className="py-2.5 text-right font-semibold text-pink-600">-{won(r.discount_krw)}</td>
                      <td className="py-2.5 text-right font-bold">{won(r.final_krw)}</td>
                    </tr>
                  ))}
                  {reds.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[var(--text-dim)]">사용 내역이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}
