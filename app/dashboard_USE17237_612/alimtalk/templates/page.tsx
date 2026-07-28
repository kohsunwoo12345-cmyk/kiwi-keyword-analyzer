'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { LayoutTemplate, Plus, Check, Clock, AlertCircle, RefreshCw, MessageSquarePlus, Send, Inbox } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Button, Badge } from '@/components/ui'
import { Card, EmptyState, Field, Section } from '@/components/dash/Kit'
import {
  kakaoChannels, kakaoChannelAuth, kakaoChannelAdd, kakaoTemplates, kakaoTemplateCreate, kakaoTemplateRequest,
  type KakaoChannel, type KakaoTemplate,
} from '@/lib/auth'

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500'

/** 알리고 템플릿 상태 → 한국어 검수 단계 (승인/검수중/등록됨/반려) */
function mapStatus(s: string): '승인' | '검수중' | '등록됨' | '반려' {
  const u = String(s || '').toUpperCase()
  if (u.includes('APPROV') || u.includes('APR') || u.includes('승인') || u === 'A' || u === 'Y') return '승인'
  if (u.includes('REJ') || u.includes('반려') || u.includes('반송')) return '반려'
  if (u.includes('PEND') || u.includes('REQ') || u.includes('심사') || u.includes('검수')) return '검수중'
  if (u.includes('REGIST') || u.includes('등록')) return '등록됨'
  return '검수중'
}
const statusMeta: Record<string, { badge: string; icon: typeof Check }> = {
  승인: { badge: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500', icon: Check },
  검수중: { badge: 'border-amber-500/30 bg-amber-500/12 text-amber-500', icon: Clock },
  등록됨: { badge: 'border-sky-500/30 bg-sky-500/12 text-sky-500', icon: Clock },
  반려: { badge: 'border-rose-500/30 bg-rose-500/12 text-rose-500', icon: AlertCircle },
}

export default function AlimtalkTemplatesPage() {
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<KakaoChannel[]>([])
  const [senderKey, setSenderKey] = useState('')
  const [templates, setTemplates] = useState<KakaoTemplate[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // 채널 등록 상태
  const [regStep, setRegStep] = useState<0 | 1 | 2>(0) // 0=닫힘, 1=인증요청, 2=인증번호입력
  const [plusid, setPlusid] = useState('')
  const [phone, setPhone] = useState('')
  const [authnum, setAuthnum] = useState('')
  const [regBusy, setRegBusy] = useState(false)

  // 템플릿 등록 폼
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'전체' | '승인' | '검수중' | '등록됨' | '반려'>('전체')
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [formBusy, setFormBusy] = useState(false)

  async function loadTemplates(sk: string) {
    if (!sk) { setTemplates([]); return }
    const r = await kakaoTemplates(sk)
    setTemplates(r.templates || [])
  }
  async function loadAll() {
    setLoading(true)
    const c = await kakaoChannels()
    setChannels(c.channels || [])
    const sk = c.channels?.[0]?.channelId || ''
    setSenderKey(sk)
    await loadTemplates(sk)
    setLoading(false)
    if (!sk) setRegStep(1)
  }
  useEffect(() => { loadAll() }, [])

  // ── 채널 등록 ──
  async function reqAuth(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (!plusid.trim() || phone.replace(/[^0-9]/g, '').length < 10) { setMsg({ ok: false, text: '채널 검색용 아이디(@ 제외)와 관리자 휴대폰번호를 입력하세요.' }); return }
    setRegBusy(true)
    const r = await kakaoChannelAuth(plusid.trim(), phone)
    setRegBusy(false)
    if (r.ok) { setRegStep(2); setMsg({ ok: true, text: r.note || '카카오톡으로 인증번호가 발송되었습니다.' }) }
    else setMsg({ ok: false, text: r.error || '인증번호 요청 실패' })
  }
  async function doAdd(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (!authnum.trim()) { setMsg({ ok: false, text: '인증번호를 입력하세요.' }); return }
    setRegBusy(true)
    const r = await kakaoChannelAdd({ plusid: plusid.trim(), phone, authnum: authnum.trim() })
    setRegBusy(false)
    if (r.ok) {
      setMsg({ ok: true, text: r.note || '채널이 등록되었습니다.' })
      setRegStep(0); setPlusid(''); setPhone(''); setAuthnum('')
      loadAll()
    } else setMsg({ ok: false, text: r.error || '채널 등록 실패' })
  }

  // ── 템플릿 등록 ──
  async function saveTemplate() {
    if (!name.trim() || !body.trim()) { setMsg({ ok: false, text: '템플릿 이름과 본문을 입력하세요.' }); return }
    setFormBusy(true); setMsg(null)
    const r = await kakaoTemplateCreate({ name: name.trim(), content: body.trim(), senderkey: senderKey || undefined })
    setFormBusy(false)
    if (r.ok) {
      setMsg({ ok: true, text: r.note || '템플릿이 등록되고 승인 요청되었습니다.' })
      setName(''); setBody(''); setShowForm(false)
      loadTemplates(senderKey)
    } else setMsg({ ok: false, text: r.error || '템플릿 등록 실패' })
  }
  async function reRequest(tplCode: string) {
    setMsg(null)
    const r = await kakaoTemplateRequest(tplCode, senderKey || undefined)
    if (r.ok) { setMsg({ ok: true, text: '승인 요청을 다시 보냈습니다.' }); loadTemplates(senderKey) }
    else setMsg({ ok: false, text: r.error || '승인 요청 실패' })
  }

  const hasChannel = channels.length > 0

  // 상태별 개수 + 필터 (승인된 것만 발송에 쓸 수 있어 구분이 중요하다)
  const counts = templates.reduce<Record<string, number>>((acc, t) => {
    const k = mapStatus(t.status)
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
  const shown = filter === '전체' ? templates : templates.filter((t) => mapStatus(t.status) === filter)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={LayoutTemplate}
        eyebrow="카카오 알림톡"
        title="알림톡 템플릿"
        desc="카카오 채널을 등록하고, 템플릿을 알리고에 등록·승인 요청한 뒤 발송에 사용합니다."
        accent="#f59e0b"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadAll} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> 새로고침
            </Button>
            {hasChannel && (
              <Button onClick={() => setShowForm((s) => !s)} className="!bg-gradient-to-br !from-amber-500 !to-orange-500">
                <Plus size={16} /> 새 템플릿
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {msg && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${msg.ok ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500' : 'border-rose-500/30 bg-rose-500/12 text-rose-500'}`}>
            {msg.ok ? <Check size={16} /> : <AlertCircle size={16} />} {msg.text}
          </div>
        )}

        {/* 채널 등록 */}
        <Card title="카카오 채널 (발신프로필)" desc={hasChannel ? `${channels.length}개 등록됨` : '알림톡을 보내려면 먼저 채널을 등록해야 합니다'}>
          {hasChannel ? (
            <div className="space-y-2">
              {channels.map((c) => (
                <div key={c.channelId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-semibold">{c.channelName || c.searchId || '채널'}</p>
                    <p className="text-xs text-[var(--text-dim)]">senderkey: <span className="font-mono">{c.channelId.slice(0, 14)}…</span>{c.phoneNumber ? ` · ${c.phoneNumber}` : ''}</p>
                  </div>
                  <Badge className="border-emerald-500/30 bg-emerald-500/12 text-emerald-500"><Check size={12} /> 사용중</Badge>
                </div>
              ))}
              <button onClick={() => setRegStep(regStep === 0 ? 1 : 0)} className="text-xs font-semibold text-amber-500 hover:underline">+ 채널 추가 등록</button>
            </div>
          ) : (
            <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-2.5 text-sm text-amber-500">
              <MessageSquarePlus size={16} className="mt-0.5 flex-shrink-0" />
              아직 등록된 카카오 채널이 없어요. 아래 두 단계로 채널(발신프로필)을 등록하세요.
            </p>
          )}

          {(regStep !== 0 || !hasChannel) && (
            <div className="mt-2">
              <Section
                label="1단계 · 인증번호 받기"
                hint={'채널 관리자 카카오톡으로 인증번호가 발송됩니다. (채널이 "비즈니스 채널"이어야 알림톡을 쓸 수 있습니다)'}
                first
              >
                <form onSubmit={reqAuth} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field label="채널 검색용 아이디">
                    <input value={plusid} onChange={(e) => setPlusid(e.target.value.replace(/^@/, ''))} placeholder="예: bygency (@ 제외)" className={inputCls} />
                  </Field>
                  <Field label="채널 관리자 휴대폰번호">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" inputMode="tel" className={inputCls} />
                  </Field>
                  <Button type="submit" disabled={regBusy} variant="outline">{regBusy ? '요청 중…' : '인증번호 받기'}</Button>
                </form>
              </Section>

              <Section
                label="2단계 · 인증번호 입력"
                hint="등록되면 발신프로필키(senderkey)가 발급되어 템플릿·발송에 자동 사용됩니다."
                className={regStep >= 2 ? undefined : 'opacity-60'}
              >
                <form onSubmit={doAdd} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field label="인증번호">
                    <input value={authnum} onChange={(e) => setAuthnum(e.target.value)} placeholder="카카오톡으로 받은 번호" inputMode="numeric" className={inputCls} disabled={regStep < 2} />
                  </Field>
                  <Button type="submit" disabled={regBusy || regStep < 2} className="!bg-gradient-to-br !from-amber-500 !to-orange-500">{regBusy ? '등록 중…' : '채널 등록 완료'}</Button>
                </form>
              </Section>
            </div>
          )}
        </Card>

        {/* 템플릿 등록 폼 */}
        {showForm && hasChannel && (
          <Card title="새 템플릿 등록" desc="알리고에 등록하고 카카오 승인까지 요청합니다">
            <div className="space-y-4">
              <Field label="템플릿명">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 예약 확인 안내" className={inputCls} />
              </Field>
              <Field
                label="본문"
                right={<span className={body.length > 1000 ? 'font-semibold text-rose-500' : undefined}>{body.length}/1,000자</span>}
                hint="등록 후 카카오 심사(보통 영업일 1~2일)를 거쳐 승인되면 발송에 사용할 수 있습니다."
              >
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="변수는 #{이름} 형식으로 입력하세요.&#10;예) #{이름}님, 예약이 접수되었습니다. 일시: #{예약일시}" className={`resize-none ${inputCls}`} />
              </Field>
              <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
                <Button onClick={saveTemplate} disabled={formBusy || body.length > 1000} className="!bg-gradient-to-br !from-amber-500 !to-orange-500">{formBusy ? '등록 중…' : '등록 + 승인요청'}</Button>
              </div>
            </div>
          </Card>
        )}

        {/* 템플릿 목록 */}
        {loading ? (
          <div className="py-16 text-center text-sm text-[var(--text-dim)]">불러오는 중…</div>
        ) : !hasChannel ? null : templates.length === 0 ? (
          <Card title="템플릿">
            <EmptyState
              icon={Inbox}
              title="등록된 템플릿이 없습니다"
              hint="새 템플릿을 만들어 승인 요청하면, 카카오 심사(영업일 1~2일)를 거쳐 발송에 사용할 수 있습니다."
              action={
                <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-[12.5px] font-bold text-white transition hover:brightness-105">
                  <Plus size={14} /> 새 템플릿 만들기
                </button>
              }
            />
          </Card>
        ) : (
          <>
          {/* 상태 필터 — 승인된 템플릿만 발송에 쓸 수 있다 */}
          <div className="flex flex-wrap gap-1.5">
            {(['전체', '승인', '검수중', '등록됨', '반려'] as const).map((k) => {
              const n = k === '전체' ? templates.length : counts[k] || 0
              const on = filter === k
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${on ? 'border-amber-500 bg-amber-500/15 text-amber-500' : 'border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--panel-2)]'}`}
                >
                  {k} <span className="tabular-nums">{n}</span>
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((t) => {
              const st = mapStatus(t.status)
              const meta = statusMeta[st]
              const Icon = meta.icon
              return (
                <div key={t.templateId} className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{t.name || '(이름없음)'}</h3>
                    <Badge className={meta.badge}><Icon size={12} /> {st}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-[var(--text-dim)]">{t.templateId}</p>
                  <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-[var(--text-soft)]">{t.content}</p>
                  {t.rejectReason && <p className="mt-2 text-xs text-rose-500">반려사유: {t.rejectReason}</p>}
                  <div className="mt-auto flex items-center gap-2 pt-3">
                    {st === '승인' ? (
                      <a href="/dashboard_USE17237_612/alimtalk" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 hover:underline"><Send size={12} /> 이 템플릿으로 발송</a>
                    ) : st === '반려' ? (
                      <button onClick={() => reRequest(t.templateId)} className="text-xs font-semibold text-amber-500 hover:underline">수정 후 다시 승인요청</button>
                    ) : st === '등록됨' ? (
                      <button onClick={() => reRequest(t.templateId)} className="text-xs font-semibold text-sky-500 hover:underline">승인 요청 보내기</button>
                    ) : (
                      <span className="text-xs text-[var(--text-dim)]">카카오 심사 진행 중…</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {shown.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--text-dim)]">{filter} 상태인 템플릿이 없습니다.</p>
          )}
          </>
        )}
      </div>
    </div>
  )
}
