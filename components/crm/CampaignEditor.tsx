'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  X, Send, Trash2, Loader2, Calendar, Link2, Users, Coins, MessageSquare,
  MessageCircle, Clock, AlertCircle, Ban, Upload, ExternalLink,
} from 'lucide-react'
import { Button, Overlay } from '@/components/ui'
import { Field, Section, inputCls } from '@/components/dash/Kit'
import {
  byteLen, crmCreate, crmDelete, crmSend, crmUpdate, kstToday, num, toIsoFromLocal, toLocalFromIso, won,
  type CrmCampaign, type CrmOptions,
} from '@/lib/crm'

/**
 * 집행 등록·편집 패널.
 * 한 화면에서 "언제 · 어디로 · 누구에게 · 얼마 써서 · 무엇으로" 를 다 정하고,
 * 저장 전에 예상 발송비와 남은 포인트를 보여 준다(보내고 나서 알면 늦다).
 */
export function CampaignEditor({
  open, onClose, onSaved, options, campaign, defaultDate,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  options: CrmOptions | null
  campaign: CrmCampaign | null
  defaultDate?: string
}) {
  const editing = !!campaign
  const locked = campaign?.status === 'sent' || campaign?.status === 'sending'

  const [name, setName] = useState('')
  const [runDate, setRunDate] = useState(defaultDate || kstToday())
  const [landingSlug, setLandingSlug] = useState('')
  const [landingUrl, setLandingUrl] = useState('')
  const [groupId, setGroupId] = useState('')
  const [adBudget, setAdBudget] = useState('')
  const [channel, setChannel] = useState<'sms' | 'alimtalk'>('sms')
  const [senderPhone, setSenderPhone] = useState('')
  const [senderKey, setSenderKey] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [message, setMessage] = useState('')
  const [useSchedule, setUseSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setErr('')
    if (campaign) {
      setName(campaign.name || '')
      setRunDate(campaign.run_date || kstToday())
      setLandingSlug(campaign.landing_slug || '')
      setLandingUrl(campaign.landing_url || '')
      setGroupId(campaign.group_id || '')
      setAdBudget(campaign.ad_budget ? String(campaign.ad_budget) : '')
      setChannel(campaign.channel === 'alimtalk' ? 'alimtalk' : 'sms')
      setSenderPhone(campaign.sender_phone || '')
      setSenderKey(campaign.sender_key || '')
      setTemplateCode(campaign.template_code || '')
      setMessage(campaign.message || '')
      setUseSchedule(!!campaign.scheduled_at)
      setScheduledAt(toLocalFromIso(campaign.scheduled_at))
      setMemo(campaign.memo || '')
    } else {
      setName(''); setRunDate(defaultDate || kstToday())
      setLandingSlug(''); setLandingUrl(''); setGroupId(''); setAdBudget('')
      setChannel('sms'); setSenderPhone(options?.senders?.[0]?.phone || '')
      setSenderKey(options?.channels?.[0]?.channel_id || ''); setTemplateCode('')
      setMessage(''); setUseSchedule(false); setScheduledAt(''); setMemo('')
    }
  }, [open, campaign, defaultDate, options])

  const group = options?.groups?.find((g) => g.id === groupId)
  const targetCount = group?.count ?? 0
  const bytes = byteLen(message)
  // 요금 판정은 서버와 같은 기준 — 90byte 초과면 LMS
  const kind = channel === 'alimtalk' ? 'alimtalk' : bytes > 90 ? 'lms' : 'sms'
  const unit = options?.rates?.[kind] ?? 0
  const estimate = unit * targetCount
  const points = options?.points ?? 0
  const shortOfPoints = estimate > points

  const canSave = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(runDate)

  const payload = useMemo(() => ({
    name: name.trim(),
    run_date: runDate,
    landing_slug: landingSlug || '',
    landing_url: landingUrl.trim(),
    group_id: groupId || '',
    ad_budget: Math.max(0, Math.floor(Number(adBudget) || 0)),
    channel,
    sender_phone: senderPhone,
    sender_key: channel === 'alimtalk' ? senderKey : '',
    template_code: channel === 'alimtalk' ? templateCode : '',
    message,
    scheduled_at: useSchedule ? toIsoFromLocal(scheduledAt) : '',
    memo,
  }), [name, runDate, landingSlug, landingUrl, groupId, adBudget, channel, senderPhone, senderKey, templateCode, message, useSchedule, scheduledAt, memo])

  async function save(thenSend = false) {
    if (!canSave || busy) return
    setBusy('save'); setErr('')
    try {
      let id = campaign?.id || ''
      if (editing) {
        const r = await crmUpdate(id, payload as any)
        if (!r.ok) { setErr(r.error || '저장에 실패했습니다.'); return }
      } else {
        const r = await crmCreate(payload as any)
        if (!r.ok || !r.id) { setErr(r.error || '저장에 실패했습니다.'); return }
        id = r.id
      }
      if (thenSend) {
        setBusy('send')
        const s = await crmSend(id, 'send')
        if (!s.ok) { setErr(s.error || '발송에 실패했습니다.'); onSaved(); return }
      }
      onSaved(); onClose()
    } finally { setBusy('') }
  }

  async function doSend() {
    if (!campaign || busy) return
    if (!confirm(`${num(targetCount)}명에게 발송합니다.\n예상 ${num(estimate)}P 가 차감됩니다. 진행할까요?`)) return
    setBusy('send'); setErr('')
    try {
      const r = await crmSend(campaign.id, 'send')
      if (!r.ok) setErr(r.error || '발송에 실패했습니다.')
      onSaved()
      if (r.ok) onClose()
    } finally { setBusy('') }
  }

  async function doCancel() {
    if (!campaign || busy) return
    if (!confirm('예약을 취소할까요?')) return
    setBusy('cancel')
    try { await crmSend(campaign.id, 'cancel'); onSaved(); onClose() } finally { setBusy('') }
  }

  async function doDelete() {
    if (!campaign || busy) return
    if (!confirm('이 집행을 삭제할까요? 발송 결과 기록도 함께 지워집니다.')) return
    setBusy('del')
    try { await crmDelete(campaign.id); onSaved(); onClose() } finally { setBusy('') }
  }

  if (!open) return null

  return (
    <Overlay variant="slide" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ml-auto flex h-full w-full max-w-[560px] flex-col bg-[var(--panel)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              {editing ? '집행 편집' : '새 집행'}
            </p>
            <h2 className="mt-0.5 truncate text-[16px] font-semibold">{name || '이름 없는 집행'}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]" aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {locked && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[12.5px] text-emerald-500">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              이미 발송된 집행이라 내용은 바꿀 수 없습니다. 결과는 아래 &lsquo;결과 보기&rsquo;에서 확인하세요.
            </div>
          )}

          <Section label="기본" first>
            <div className="space-y-4">
              <Field label="집행 이름">
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={locked}
                  placeholder="예: 7월 오픈 이벤트" className={inputCls} />
              </Field>
              <Field label="집행일" hint="캘린더에 이 날짜로 놓입니다. 성과는 이 날 00시부터 집계합니다.">
                <input type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)} disabled={locked} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section label="랜딩페이지">
            <div className="space-y-4">
              <Field label="내 랜딩페이지" hint="여기서 고른 페이지의 조회수·신청자가 이 집행의 성과가 됩니다.">
                <select value={landingSlug} onChange={(e) => setLandingSlug(e.target.value)} disabled={locked} className={inputCls}>
                  <option value="">선택 안 함</option>
                  {(options?.landings || []).map((l) => (
                    <option key={l.slug} value={l.slug}>{l.title || l.slug}</option>
                  ))}
                </select>
              </Field>
              {landingSlug && (
                <a href={`/landing/${landingSlug}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-500 hover:underline">
                  <ExternalLink size={12} /> /landing/{landingSlug} 열어 보기
                </a>
              )}
              <Field label="외부 랜딩 URL" optional hint="우리 랜딩페이지가 아니면 주소를 직접 넣으세요(성과 자동 집계는 안 됩니다).">
                <input value={landingUrl} onChange={(e) => setLandingUrl(e.target.value)} disabled={locked}
                  placeholder="https://..." className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section label="대상 타깃">
            <div className="space-y-3">
              <Field label="타깃 그룹" hint="엑셀로 올린 타깃 그룹에서 고릅니다.">
                <select value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={locked} className={inputCls}>
                  <option value="">선택 안 함</option>
                  {(options?.groups || []).map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({num(g.count)}명)</option>
                  ))}
                </select>
              </Field>
              <a href="/dashboard_USE17237_612/team/groups"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-500 hover:underline">
                <Upload size={12} /> 엑셀로 타깃 올리기 / 그룹 관리
              </a>
            </div>
          </Section>

          <Section label="광고 금액">
            <Field label="집행 금액(원)" hint="네이버·메타 등에 실제로 쓴 광고비. 결과에서 발송비와 합쳐 총 집행 금액이 됩니다.">
              <input type="number" min={0} step={1000} value={adBudget} onChange={(e) => setAdBudget(e.target.value)}
                disabled={locked} placeholder="0" className={inputCls} />
            </Field>
          </Section>

          <Section label="발송">
            <div className="space-y-4">
              <Field label="발송 채널">
                <div className="flex gap-2">
                  {([['sms', '문자 (SMS/LMS)', MessageSquare], ['alimtalk', '카카오 알림톡', MessageCircle]] as const).map(([v, label, Icon]) => (
                    <button key={v} type="button" disabled={locked} onClick={() => setChannel(v)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition ${
                        channel === v ? 'border-amber-500/50 bg-amber-500/[0.12] text-amber-500'
                          : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--panel-2)]'}`}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </Field>

              {channel === 'sms' ? (
                <Field label="발신번호" hint={(options?.senders?.length ?? 0) === 0 ? '승인된 발신번호가 없습니다. 먼저 등록·승인을 받아야 발송됩니다.' : undefined}>
                  <select value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} disabled={locked} className={inputCls}>
                    <option value="">자동 선택</option>
                    {(options?.senders || []).map((s) => (
                      <option key={s.id} value={s.phone}>{s.phone}{s.label ? ` · ${s.label}` : ''}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="space-y-4">
                  <Field label="카카오 채널(발신프로필)">
                    <select value={senderKey} onChange={(e) => setSenderKey(e.target.value)} disabled={locked} className={inputCls}>
                      <option value="">선택하세요</option>
                      {(options?.channels || []).map((c) => (
                        <option key={c.channel_id} value={c.channel_id}>{c.channel_name || c.channel_id}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="승인된 템플릿">
                    <select value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} disabled={locked} className={inputCls}>
                      <option value="">선택하세요</option>
                      {(options?.templates || []).map((t) => (
                        <option key={t.template_id} value={t.template_id}>{t.name || t.template_id}{t.status ? ` · ${t.status}` : ''}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <Field
                label="발송 문구"
                hint="{이름} 을 넣으면 받는 분 이름으로 바뀝니다."
                right={channel === 'sms' ? <span className={bytes > 90 ? 'font-semibold text-amber-500' : ''}>{bytes}/90 byte</span> : undefined}
                error={channel === 'sms' && bytes > 90 ? '90byte를 넘어 장문(LMS) 요금으로 나갑니다.' : undefined}
              >
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} disabled={locked} rows={5}
                  placeholder="[바이전시] {이름}님, 이번 주 이벤트 안내드립니다." className={`${inputCls} resize-none leading-relaxed`} />
              </Field>

              <Field label="예약 발송" optional>
                <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[var(--text-soft)]">
                  <input type="checkbox" checked={useSchedule} disabled={locked}
                    onChange={(e) => setUseSchedule(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                  예약한 시각에 자동으로 발송
                </label>
                {useSchedule && (
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                    disabled={locked} className={`${inputCls} mt-2`} />
                )}
              </Field>

              <Field label="메모" optional>
                <input value={memo} onChange={(e) => setMemo(e.target.value)} disabled={locked} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* 예상 비용 — 보내기 전에 보인다 */}
          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">
              <Coins size={12} /> 예상 발송 비용
            </p>
            <div className="mt-2.5 space-y-1.5 text-[13px]">
              <Row label="대상" value={`${num(targetCount)}명`} icon={Users} />
              <Row label="건당" value={`${num(unit)}P · ${options?.rateLabels?.[kind] || kind}`} />
              <Row label="합계" value={`${num(estimate)}P`} strong />
              <Row label="보유 포인트" value={`${num(points)}P`} tone={shortOfPoints ? 'bad' : undefined} />
              {Number(adBudget) > 0 && <Row label="광고비" value={won(Number(adBudget))} />}
            </div>
            {shortOfPoints && targetCount > 0 && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[12px] font-medium text-rose-500">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                포인트가 {num(estimate - points)}P 모자랍니다. 충전 후 발송할 수 있습니다.
              </p>
            )}
          </div>

          {err && (
            <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-500">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {err}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-5 py-4">
          {!locked && (
            <Button onClick={() => save(false)} disabled={!canSave || !!busy}
              className="!bg-gradient-to-br !from-amber-500 !to-orange-500">
              {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />} 저장
            </Button>
          )}
          {editing && !locked && campaign?.status !== 'canceled' && (
            <Button onClick={doSend} disabled={!!busy || targetCount === 0 || !message.trim()} variant="outline">
              {busy === 'send' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} 지금 발송
            </Button>
          )}
          {!editing && (
            <Button onClick={() => save(true)} disabled={!canSave || !!busy || !groupId || !message.trim()} variant="outline">
              {busy === 'send' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} 저장 후 바로 발송
            </Button>
          )}
          {editing && campaign?.status === 'scheduled' && (
            <Button onClick={doCancel} disabled={!!busy} variant="outline">
              {busy === 'cancel' ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />} 예약 취소
            </Button>
          )}
          <span className="flex-1" />
          {editing && (
            <button onClick={doDelete} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-rose-500 transition hover:bg-rose-500/10">
              {busy === 'del' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} 삭제
            </button>
          )}
        </footer>
      </div>
    </Overlay>
  )
}

function Row({ label, value, icon: Icon, strong, tone }: {
  label: string; value: string; icon?: any; strong?: boolean; tone?: 'bad'
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[var(--text-soft)]">
        {Icon && <Icon size={12} className="text-[var(--text-dim)]" />}{label}
      </span>
      <span className={`tabular-nums ${strong ? 'text-[14px] font-bold text-amber-500' : tone === 'bad' ? 'font-semibold text-rose-500' : 'font-semibold'}`}>
        {value}
      </span>
    </div>
  )
}
