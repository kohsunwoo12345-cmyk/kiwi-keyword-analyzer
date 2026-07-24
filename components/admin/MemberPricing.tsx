'use client'

import { useEffect, useMemo, useState } from 'react'
import { Coins, Search, RefreshCw, X, Wallet, Gauge, Check, AlertCircle } from 'lucide-react'
import { Panel, Button } from '@/components/ui'
import { adminUsers, adminAction, type User } from '@/lib/auth'
import { cn } from '@/lib/utils'

const CREDIT_KRW = 50
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100
const num = (n: number) => (Number(n) || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })

/** 회원 목록 + 회원별 가격(AI 과금 배수) 조정 · 크레딧 지급 */
export function MemberPricing() {
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    adminUsers().then((r) => {
      setMembers(r.users || [])
      setLoading(false)
    })
  }
  useEffect(load, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return members
    return members.filter((m) => m.name?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s))
  }, [members, q])

  const editing = members.find((m) => m.id === editId) || null

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Wallet size={16} className="text-violet-500" /> 회원 가격 관리
        </span>
      }
      action={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름·이메일 검색"
              className="w-48 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] py-1.5 pl-8 pr-2.5 text-sm outline-none focus:border-violet-300"
            />
          </div>
          <button onClick={load} className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      }
    >
      <p className="mb-3 text-xs text-[var(--text-dim)]">
        회원별 AI 과금 배수(원가=×1, 1배 미만 불가)를 정하면, 실제 API 비용 × 환율 × 배수를 <b>회원 1크레딧 단가(기본 65원)</b> 기준
        소수 크레딧으로 차감합니다. (예: ×1·원가 6,500원 → 100크레딧, ×2 → 200크레딧)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
              <th className="px-3 py-2.5 font-medium">회원</th>
              <th className="px-3 py-2.5 text-right font-medium">보유 크레딧</th>
              <th className="px-3 py-2.5 font-medium">AI 과금 배수</th>
              <th className="px-3 py-2.5 text-right font-medium">조정</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((m) => (
              <tr key={m.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <div className="font-semibold">{m.name || '이름없음'}</div>
                  <div className="text-xs text-[var(--text-dim)]">{m.email}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{num(m.credits)} C</td>
                <td className="px-3 py-2.5">
                  {m.creditMarkup && m.creditMarkup > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                      ×{m.creditMarkup}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      기본 (×2.5~3)
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => setEditId(m.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:border-violet-300 hover:bg-violet-50"
                  >
                    <Gauge size={13} /> 가격 조정
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-[var(--text-dim)]">
                  {loading ? '불러오는 중…' : '회원이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[var(--text-dim)]">전체 {num(filtered.length)}명 · 최대 300명 표시</p>

      {editing && <PricingModal member={editing} onClose={() => setEditId(null)} onSaved={load} />}
    </Panel>
  )
}

function PricingModal({ member, onClose, onSaved }: { member: User; onClose: () => void; onSaved: () => void }) {
  const [markup, setMarkup] = useState(member.creditMarkup && member.creditMarkup > 0 ? String(member.creditMarkup) : '')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // 예시 계산: 실제 API 비용 100원 기준
  const effMarkup = markup.trim() ? Math.max(1, Number(markup) || 1) : 0
  const sampleCost = 100
  const sampleMarkup = effMarkup || 3
  const sampleCredits = round2((sampleCost * sampleMarkup) / CREDIT_KRW)

  async function saveMarkup(reset = false) {
    setBusy(true)
    setMsg(null)
    const val = reset ? 0 : Math.max(1, Number(markup) || 1)
    const r = await adminAction('markup', member.id, { markup: val })
    setBusy(false)
    if (r.ok) {
      setMsg({ ok: true, text: reset ? '기본 배수로 초기화했습니다.' : `AI 과금 배수를 ×${round2(val)} 로 설정했습니다.` })
      if (reset) setMarkup('')
      onSaved()
    } else setMsg({ ok: false, text: r.error || '저장 실패' })
  }

  async function grant() {
    const amt = round2(Number(amount))
    if (!amt) {
      setMsg({ ok: false, text: '지급/차감할 크레딧 수량을 입력하세요. (음수=차감)' })
      return
    }
    setBusy(true)
    setMsg(null)
    const r = await adminAction('credits', member.id, { amount: amt, memo: reason.trim() || (amt > 0 ? '관리자 크레딧 지급' : '관리자 크레딧 차감') })
    setBusy(false)
    if (r.ok) {
      setMsg({ ok: true, text: `${amt > 0 ? '+' : ''}${round2(amt)} 크레딧 ${amt > 0 ? '지급' : '차감'} 완료` })
      setAmount('')
      setReason('')
      onSaved()
    } else setMsg({ ok: false, text: r.error || '처리 실패' })
  }

  const inp = 'w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-violet-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <div>
            <div className="font-semibold">{member.name} · 가격 조정</div>
            <div className="text-xs text-[var(--text-dim)]">{member.email}</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-soft)] hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {msg && (
            <div className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-sm', msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600')}>
              {msg.ok ? <Check size={15} className="mt-0.5" /> : <AlertCircle size={15} className="mt-0.5" />}
              {msg.text}
            </div>
          )}

          {/* AI 과금 배수 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
              <Gauge size={14} className="text-violet-500" /> AI 과금 배수 (원가 = ×1)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-dim)]">×</span>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  placeholder="예: 1 (원가) · 3 (3배)"
                  className={inp + ' pl-7'}
                />
              </div>
              <Button size="sm" onClick={() => saveMarkup(false)} disabled={busy}>적용</Button>
              <button onClick={() => saveMarkup(true)} disabled={busy} className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs font-medium text-[var(--text-soft)] hover:bg-slate-50">
                기본값
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--text-dim)]">
              1배 미만은 설정할 수 없습니다. 미설정 시 모델 기본(씨댄스2.0·이미지 ×2.5, 그 외 ×3)이 적용됩니다.
            </p>
            <div className="mt-2 rounded-lg bg-violet-50/60 px-3 py-2 text-xs text-violet-700">
              예시 · 실제 API 비용 <b>100원</b> → ×{sampleMarkup} = {num(sampleCost * sampleMarkup)}원 →
              <b> {num(sampleCredits)} 크레딧</b> 차감 (실제 서비스는 그날 환율로 계산)
            </div>
          </div>

          <div className="h-px bg-[var(--border)]" />

          {/* 크레딧 지급/차감 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
              <Coins size={14} className="text-amber-500" /> 크레딧 지급 / 차감
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step={0.05}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="수량 (음수=차감)"
                className={inp}
              />
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="제공 사유" className={inp} />
            </div>
            <Button size="sm" onClick={grant} disabled={busy} className="mt-2 w-full">
              {busy ? '처리 중…' : '적용'}
            </Button>
            <p className="mt-1.5 text-xs text-[var(--text-dim)]">현재 보유: {num(member.credits)} 크레딧 · 소수(0.05 등) 지급/차감 가능</p>
          </div>
        </div>
      </div>
    </div>
  )
}
