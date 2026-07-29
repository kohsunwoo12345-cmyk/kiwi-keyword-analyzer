'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { MessageCircle, Check, AlertCircle, RefreshCw, KeyRound, Unlink, ShieldCheck, ArrowRight, Info } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Button, Badge } from '@/components/ui'
import { Card, Field, Section, inputCls } from '@/components/dash/Kit'
import { kakaoChannels, kakaoChannelAuth, kakaoChannelAdd, kakaoCategories, type KakaoChannel } from '@/lib/auth'
import { cn } from '@/lib/utils'

const catCode = (c: any) => c.code || c.categorycode || c.value || c.id || ''
const catName = (c: any) => c.name || c.category_name || c.categoryName || c.label || catCode(c)

/**
 * 카카오 알림톡 채널(발신프로필) 등록.
 * 알림톡은 발신번호가 아니라 "카카오 비즈니스 채널"로 나간다 — 채널을 먼저 등록해
 * senderkey 를 받아야 템플릿 등록·발송이 가능하다.
 */
export default function AlimtalkRegisterPage() {
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<KakaoChannel[]>([])
  const [cats, setCats] = useState<any[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [plusid, setPlusid] = useState('')
  const [phone, setPhone] = useState('')
  const [authnum, setAuthnum] = useState('')
  const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const c = await kakaoChannels()
    setChannels(c.channels || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    kakaoCategories().then((d) => setCats(d.categories || []))
  }, [])

  async function reqAuth(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (!plusid.trim()) { setMsg({ ok: false, text: '채널 검색용 아이디를 입력하세요. (@ 제외)' }); return }
    if (phone.replace(/[^0-9]/g, '').length < 10) { setMsg({ ok: false, text: '채널 관리자 휴대폰번호를 입력하세요.' }); return }
    setBusy(true)
    const r = await kakaoChannelAuth(plusid.trim(), phone)
    setBusy(false)
    if (r.ok) { setStep(2); setMsg({ ok: true, text: r.note || '카카오톡으로 인증번호가 발송되었습니다.' }) }
    else setMsg({ ok: false, text: r.error || '인증번호 요청 실패' })
  }

  async function doAdd(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (!authnum.trim()) { setMsg({ ok: false, text: '카카오톡으로 받은 인증번호를 입력하세요.' }); return }
    setBusy(true)
    const r = await kakaoChannelAdd({ plusid: plusid.trim(), phone, authnum: authnum.trim(), categorycode: cat || undefined })
    setBusy(false)
    if (r.ok) {
      setMsg({ ok: true, text: r.note || '채널이 등록되었습니다. 이제 템플릿을 만들어 승인 요청할 수 있어요.' })
      setStep(1); setPlusid(''); setPhone(''); setAuthnum('')
      load()
    } else setMsg({ ok: false, text: r.error || '채널 등록 실패' })
  }

  async function unlink(channelId: string) {
    if (!confirm('이 채널 연결을 해제할까요? 이 채널로는 알림톡을 보낼 수 없게 됩니다.')) return
    try {
      const r = await fetch(`/api/kakao/user/channels?channelId=${encodeURIComponent(channelId)}`, { method: 'DELETE', credentials: 'include' })
      const d = await r.json()
      setMsg(d.ok ? { ok: true, text: '채널 연결을 해제했습니다.' } : { ok: false, text: d.error || '해제 실패' })
    } catch {
      setMsg({ ok: false, text: '네트워크 오류' })
    }
    load()
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MessageCircle}
        eyebrow="카카오 알림톡"
        title="알림톡 채널 등록"
        desc="알림톡은 발신번호가 아니라 카카오 비즈니스 채널로 발송됩니다. 채널을 등록하면 발신프로필키(senderkey)가 발급되어 템플릿 등록·발송에 자동으로 쓰입니다."
        accent="#f59e0b"
        action={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> 새로고침
          </Button>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {msg && (
          <div className={cn('flex items-start gap-2 rounded-xl border px-4 py-3 text-sm',
            msg.ok ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500' : 'border-rose-500/30 bg-rose-500/12 text-rose-500')}>
            {msg.ok ? <Check size={16} className="mt-px flex-shrink-0" /> : <AlertCircle size={16} className="mt-px flex-shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
          <Info size={15} className="mt-px flex-shrink-0 text-amber-500" />
          <div className="text-[12px] leading-relaxed text-[var(--text-dim)]">
            <b className="text-[var(--text-soft)]">등록 전 확인해 주세요.</b> ① 카카오톡 채널이 <b>비즈니스 채널</b>로 전환되어 있어야 합니다.
            ② 아래에 입력하는 휴대폰번호는 <b>그 채널의 관리자</b> 번호여야 인증번호를 받을 수 있습니다.
            ③ 알림톡은 <b>광고가 아닌 정보성 메시지</b>만 보낼 수 있고, 문구는 템플릿 심사(영업일 1~2일)를 통과해야 발송됩니다.
          </div>
        </div>

        <Card
          title="등록된 채널"
          desc={channels.length ? `${channels.length}개 사용 중` : '아직 등록된 채널이 없습니다'}
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-[var(--text-dim)]">불러오는 중…</p>
          ) : channels.length === 0 ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-2.5 text-sm text-amber-500">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              등록된 채널이 없어 알림톡을 보낼 수 없습니다. 아래 두 단계로 채널을 등록하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {channels.map((c) => (
                <div key={c.channelId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.channelName || c.searchId || '채널'}</p>
                    <p className="truncate text-xs text-[var(--text-dim)]">
                      senderkey <span className="font-mono">{String(c.channelId).slice(0, 14)}…</span>
                      {c.phoneNumber ? ` · ${c.phoneNumber}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="border-emerald-500/30 bg-emerald-500/12 text-emerald-500"><Check size={12} /> 사용중</Badge>
                    <button
                      onClick={() => unlink(c.channelId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-dim)] transition-colors hover:border-rose-500/40 hover:text-rose-500"
                    >
                      <Unlink size={11} /> 연결 해제
                    </button>
                  </div>
                </div>
              ))}
              <Link href="/dashboard_USE17237_612/alimtalk/templates" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 hover:underline">
                템플릿 만들러 가기 <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </Card>

        <Card title="새 채널 등록" desc="카카오톡으로 받은 인증번호로 채널 소유를 확인합니다">
          <Section
            first
            label="1단계 · 인증번호 받기"
            hint="채널 관리자 카카오톡으로 인증번호가 발송됩니다."
          >
            <form onSubmit={reqAuth} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="채널 검색용 아이디">
                <input value={plusid} onChange={(e) => setPlusid(e.target.value.replace(/^@/, ''))} placeholder="예: bygency (@ 제외)" className={inputCls} />
              </Field>
              <Field label="채널 관리자 휴대폰번호">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" inputMode="tel" className={inputCls} />
              </Field>
              <Button type="submit" disabled={busy} variant="outline">
                <KeyRound size={14} /> {busy && step === 1 ? '요청 중…' : '인증번호 받기'}
              </Button>
            </form>
          </Section>

          <Section
            label="2단계 · 인증번호 입력"
            hint="등록되면 발신프로필키(senderkey)가 발급되어 템플릿·발송에 자동 사용됩니다."
            className={step >= 2 ? undefined : 'opacity-60'}
          >
            <form onSubmit={doAdd} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="인증번호">
                <input value={authnum} onChange={(e) => setAuthnum(e.target.value)} placeholder="카카오톡으로 받은 번호" inputMode="numeric" className={inputCls} disabled={step < 2} />
              </Field>
              <Field label="채널 카테고리" optional hint={cats.length ? undefined : '카테고리를 불러오지 못하면 비워두어도 등록됩니다.'}>
                <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls} disabled={step < 2}>
                  <option value="">선택 안 함</option>
                  {cats.map((c, i) => (
                    <option key={catCode(c) || i} value={catCode(c)}>{catName(c)}</option>
                  ))}
                </select>
              </Field>
              <Button type="submit" disabled={busy || step < 2} className="!bg-gradient-to-br !from-amber-500 !to-orange-500">
                <ShieldCheck size={14} /> {busy && step === 2 ? '등록 중…' : '채널 등록 완료'}
              </Button>
            </form>
          </Section>
        </Card>
      </div>
    </div>
  )
}
