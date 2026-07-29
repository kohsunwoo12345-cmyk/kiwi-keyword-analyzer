'use client'

import { useEffect, useState } from 'react'
import { BellRing, Check, AlertCircle, Loader2, Info, Smartphone, Mail, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, Field, Section, inputCls } from '@/components/dash/Kit'
import { cn } from '@/lib/utils'

interface Prefs { app: boolean; email: boolean; sms: boolean; extraEmail: string; extraPhone: string }

export default function LeadAlertPage() {
  const [prefs, setPrefs] = useState<Prefs>({ app: true, email: true, sms: false, extraEmail: '', extraPhone: '' })
  const [smsCost, setSmsCost] = useState(0)
  const [defaults, setDefaults] = useState({ email: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    try {
      const r = await fetch('/api/account/lead-alert', { credentials: 'include', cache: 'no-store' })
      const d = await r.json()
      if (d.ok) { setPrefs(d.prefs); setSmsCost(d.smsCost || 0); setDefaults(d.defaults || { email: '', phone: '' }) }
    } catch { /* 무시 */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save() {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/account/lead-alert', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs),
      })
      const d = await r.json()
      setMsg(d.ok ? { ok: true, text: '알림 설정을 저장했습니다.' } : { ok: false, text: d.error || '저장 실패' })
      if (d.ok) setPrefs(d.prefs)
    } catch { setMsg({ ok: false, text: '네트워크 오류' }) }
    setBusy(false)
  }

  const Toggle = ({ on, onChange, icon: Icon, title, desc, cost }: any) => (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors',
      on ? 'border-indigo-500/50 bg-indigo-500/[0.06]' : 'border-[var(--border)] bg-[var(--panel-2)]')}>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon size={14} className={on ? 'text-indigo-500' : 'text-[var(--text-dim)]'} />
          <span className="text-[13px] font-semibold text-[var(--text)]">{title}</span>
          {cost ? <span className="rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">건당 {cost.toLocaleString()}P</span>
            : <span className="rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">무료</span>}
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-dim)]">{desc}</p>
      </div>
    </label>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BellRing}
        eyebrow="ALERT"
        title="신청자 알림 설정"
        desc="랜딩페이지에 새 신청이 들어오면 바로 알려드립니다. 어떤 방법으로 받을지 정하세요."
      />

      {msg && (
        <div className={cn('flex items-start gap-2 rounded-xl border px-4 py-3 text-[12.5px]',
          msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-rose-500/30 bg-rose-500/10 text-rose-600')}>
          {msg.ok ? <Check size={15} className="mt-px flex-shrink-0" /> : <AlertCircle size={15} className="mt-px flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
        <Info size={15} className="mt-px flex-shrink-0 text-indigo-500" />
        <div className="text-[12px] leading-relaxed text-[var(--text-dim)]">
          앱 알림과 이메일은 <b className="text-[var(--text-soft)]">무료</b>입니다. 문자 알림은 발송 건당 포인트가 차감되며,
          포인트가 부족하면 문자만 건너뛰고 앱 알림·이메일은 그대로 갑니다. 발송 결과는 관리자에게도 기록됩니다.
        </div>
      </div>

      <Card title="알림 받는 방법" desc={loading ? '불러오는 중…' : undefined}>
        <div className="space-y-2.5">
          <Toggle on={prefs.app} onChange={(v: boolean) => setPrefs((p) => ({ ...p, app: v }))}
            icon={Smartphone} title="앱 알림" desc="대시보드 알림함으로 받습니다." />
          <Toggle on={prefs.email} onChange={(v: boolean) => setPrefs((p) => ({ ...p, email: v }))}
            icon={Mail} title="이메일" desc={`신청자 정보를 메일로 받습니다. (기본 수신: ${defaults.email || '가입 이메일'})`} />
          <Toggle on={prefs.sms} onChange={(v: boolean) => setPrefs((p) => ({ ...p, sms: v }))}
            icon={MessageSquare} title="문자" cost={smsCost}
            desc={`신청이 들어오는 즉시 휴대폰으로 받습니다. (기본 수신: ${defaults.phone || '등록된 연락처'})`} />
        </div>

        <Section label="받는 곳 바꾸기" hint="비워두면 가입 정보의 이메일·연락처로 갑니다.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="알림 받을 이메일" optional>
              <input value={prefs.extraEmail} onChange={(e) => setPrefs((p) => ({ ...p, extraEmail: e.target.value }))}
                placeholder={defaults.email || 'me@example.com'} className={inputCls} data-f="extra-email" />
            </Field>
            <Field label="알림 받을 휴대폰" optional>
              <input value={prefs.extraPhone} onChange={(e) => setPrefs((p) => ({ ...p, extraPhone: e.target.value }))}
                placeholder={defaults.phone || '010-0000-0000'} className={inputCls} data-f="extra-phone" />
            </Field>
          </div>
        </Section>

        <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
          <button onClick={save} disabled={busy || loading} data-f="save"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-indigo-600 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 저장
          </button>
        </div>
      </Card>
    </div>
  )
}
