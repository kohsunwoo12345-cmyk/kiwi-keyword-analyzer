'use client'

/* 문자 발송 (SMS/LMS)
 *
 * ⚠ 여기엔 원래 <iframe src="/tools/sms?embed=1"> 이 있었다. 그 파일은 이 저장소에
 *   한 번도 있던 적이 없다(git 이력 확인) — 즉 메뉴를 눌러도 빈 화면이었다.
 *   뒷단(/api/sms/send · /api/sms/senders)은 이미 다 있어서 화면만 붙이면 된다.
 *
 * 화면이 반드시 지켜야 하는 것
 *  · 발신번호는 "승인된 내 번호" 중에서 고른다. 없으면 보낼 수 없다 —
 *    없는 채로 보내기 단추를 누르게 두면 포인트만 나가고 실패한다.
 *  · 90byte 를 넘으면 LMS 라 단가가 오른다. 누르기 전에 얼마인지 보여준다.
 *  · 예약 시각은 한국 시간 벽시계 값 그대로 서버에 넘긴다(서버가 알리고 형식으로 바꾼다).
 */

import { useEffect, useMemo, useState } from 'react'
import { Send, Loader2, Check, AlertCircle, Users, Clock, FileText, Coins } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Field, Section, inputCls } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { formatNumber, cn } from '@/lib/utils'
import { smsSenders, sendSmsNow, type SenderNumber, type SmsSendResult } from '@/lib/auth'

const ACCENT = '#6366f1'

/** 문자 작성 화면과 같은 저장소를 본다 — 거기서 만든 템플릿을 여기서 바로 쓴다 */
type Template = { id: string; name: string; body: string }
const TEMPLATE_KEY = 'bivience_sms_templates'

/** 통신사 기준 바이트 수 — 한글·이모지 2바이트, ASCII 1바이트 (서버와 같은 기준) */
function byteLength(s: string): number {
  let n = 0
  for (const ch of s) n += ch.charCodeAt(0) > 0x7f ? 2 : 1
  return n
}

/** 붙여 넣은 번호 덩어리에서 실제 번호만 골라낸다 (줄바꿈·쉼표·공백 아무거나) */
function parseNumbers(raw: string): { ok: string[]; bad: string[] } {
  const ok: string[] = []
  const bad: string[] = []
  const seen = new Set<string>()
  for (const piece of String(raw).split(/[\s,;]+/)) {
    const t = piece.trim()
    if (!t) continue
    const d = t.replace(/[^0-9]/g, '')
    if (d.length < 10 || d.length > 11) { bad.push(t); continue }
    if (seen.has(d)) continue          // 같은 번호에 두 번 보내고 두 번 과금될 이유가 없다
    seen.add(d)
    ok.push(d)
  }
  return { ok, bad }
}

const fmtPhone = (d: string) => (d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d)

export default function SmsSendPage() {
  const [senders, setSenders] = useState<SenderNumber[]>([])
  const [senderId, setSenderId] = useState('')
  const [loadingSenders, setLoadingSenders] = useState(true)
  const [senderError, setSenderError] = useState('')

  const [toRaw, setToRaw] = useState('')
  const [text, setText] = useState('')
  const [reserve, setReserve] = useState(false)
  const [reserveTime, setReserveTime] = useState('')

  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SmsSendResult | null>(null)

  const [templates] = useLocalStorage<Template[]>(TEMPLATE_KEY, [])

  useEffect(() => {
    let alive = true
    smsSenders().then((d) => {
      if (!alive) return
      setSenders(d.senders)
      setSenderId(d.senders[0]?.id || '')
      if (!d.ok) setSenderError(d.error || '발신번호를 불러오지 못했습니다.')
      setLoadingSenders(false)
    })
    return () => { alive = false }
  }, [])

  const { ok: numbers, bad } = useMemo(() => parseNumbers(toRaw), [toRaw])
  const bytes = useMemo(() => byteLength(text), [text])
  const isLms = bytes > 90
  const limit = isLms ? 2000 : 90
  const over = bytes > limit

  /*  1,000명을 넘으면 서버가 거절한다(포인트는 안 나간다). 그래도 여기서 먼저 막는다 —
      다 적어 넣고 누른 뒤에 거절당하는 것보다, 누르기 전에 아는 편이 낫다. */
  const canSend = !!senderId && numbers.length > 0 && numbers.length <= 1000 && !!text.trim() && !over && !sending && (!reserve || !!reserveTime)

  async function send() {
    if (!canSend) return
    setSending(true)
    setResult(null)
    const r = await sendSmsNow({
      to: numbers,
      text: text.trim(),
      senderId,
      reserveTime: reserve && reserveTime ? reserveTime : undefined,
    })
    setResult(r)
    setSending(false)
    if (r.ok && (r.sent || 0) > 0) setToRaw('')      // 같은 사람에게 두 번 보내는 사고를 막는다
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Send}
        eyebrow="문자 (SMS)"
        title="문자 발송"
        desc="승인된 발신번호로 문자를 보냅니다. 90byte를 넘으면 LMS로 나가 단가가 올라갑니다."
        accent={ACCENT}
        action={
          <Button href="/dashboard_USE17237_612/sms/logs" variant="outline">
            발송 이력·통계
          </Button>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {/* 발신번호가 없으면 아무것도 보낼 수 없다 — 가장 먼저 알린다 */}
        {!loadingSenders && senders.length === 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12.5px] text-amber-500">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">승인된 발신번호가 없습니다.</p>
              <p className="mt-0.5 text-amber-500/85">
                문자는 통신사 규정상 사전 등록·승인된 번호로만 나갑니다.{' '}
                <a href="/dashboard_USE17237_612/sender-numbers" className="font-semibold underline">발신번호 등록하러 가기</a>
                {senderError ? ` · ${senderError}` : ''}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card title="보낼 내용" desc="발신번호 · 수신자 · 문구를 정합니다">
            <Section label="보내는 번호" first hint="관리자 승인을 받은 번호만 보입니다.">
              {loadingSenders ? (
                <p className="flex items-center gap-2 text-[12.5px] text-[var(--text-dim)]"><Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…</p>
              ) : (
                <select value={senderId} onChange={(e) => setSenderId(e.target.value)} className={inputCls} disabled={senders.length === 0}>
                  {senders.length === 0 && <option value="">승인된 발신번호 없음</option>}
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>{fmtPhone(String(s.phone_number).replace(/[^0-9]/g, ''))}</option>
                  ))}
                </select>
              )}
            </Section>

            <Section
              label="받는 번호"
              hint="줄바꿈·쉼표·띄어쓰기 아무거나로 구분해 붙여 넣으세요. 같은 번호는 한 번만 보냅니다."
              action={<span className="text-[11px] tabular-nums text-[var(--text-dim)]">최대 1,000명</span>}
            >
              <textarea
                value={toRaw}
                onChange={(e) => setToRaw(e.target.value)}
                rows={5}
                placeholder={'01012345678\n010-2345-6789, 01034567890'}
                className={cn(inputCls, 'resize-none font-mono text-[12.5px] leading-relaxed')}
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-soft)]">
                  <Users size={13} /> 받는 사람 {formatNumber(numbers.length)}명
                </span>
                {numbers.length > 1000 && <span className="font-semibold text-rose-500">1,000명을 넘습니다 — 나눠서 보내세요</span>}
                {bad.length > 0 && (
                  <span className="text-amber-500">번호 형식이 아닌 항목 {bad.length}개는 제외됩니다 ({bad.slice(0, 3).join(', ')}{bad.length > 3 ? '…' : ''})</span>
                )}
              </div>
            </Section>

            <Section
              label="문구"
              hint="90byte까지 SMS, 넘으면 LMS로 나갑니다."
              action={
                templates.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) setText(t.body) }}
                    className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[11.5px] outline-none"
                  >
                    <option value="">템플릿 불러오기</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                ) : undefined
              }
            >
              <Field
                label="메시지 내용"
                right={
                  <>
                    <span className={cn('font-semibold', over ? 'text-rose-500' : isLms ? 'text-sky-500' : 'text-indigo-500')}>{isLms ? 'LMS' : 'SMS'}</span>
                    {' · '}
                    <span className={over ? 'font-semibold text-rose-500' : ''}>{bytes}</span>/{limit} byte
                  </>
                }
                error={over ? `${limit}byte를 넘어 발송할 수 없습니다.` : undefined}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  placeholder="보낼 문구를 입력하세요."
                  className={cn(inputCls, 'resize-none leading-relaxed')}
                />
              </Field>
              {templates.length === 0 && (
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--text-dim)]">
                  <FileText size={12} />
                  <a href="/dashboard_USE17237_612/sms/compose" className="underline">문자 작성</a>에서 자주 쓰는 문구를 저장해 두면 여기서 바로 불러옵니다.
                </p>
              )}
            </Section>

            <Section label="예약 발송" hint="비워 두면 즉시 보냅니다.">
              <label className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--text-soft)]">
                <input type="checkbox" checked={reserve} onChange={(e) => setReserve(e.target.checked)} className="h-4 w-4 accent-indigo-500" />
                정해진 시각에 보내기 (한국 시간)
              </label>
              {reserve && (
                <input
                  type="datetime-local"
                  value={reserveTime}
                  onChange={(e) => setReserveTime(e.target.value)}
                  className={cn(inputCls, 'mt-2.5 max-w-[260px]')}
                />
              )}
            </Section>

            <div className="mt-6 flex items-center gap-3 border-t border-[var(--border-soft)] pt-5">
              <Button onClick={send} disabled={!canSend} className="justify-center">
                {sending ? <><Loader2 size={16} className="animate-spin" /> 보내는 중…</> : <><Send size={16} /> {reserve ? '예약 걸기' : `${formatNumber(numbers.length)}명에게 보내기`}</>}
              </Button>
              {!senderId && !loadingSenders && <span className="text-[11.5px] text-[var(--text-dim)]">발신번호가 있어야 보낼 수 있습니다.</span>}
            </div>
          </Card>

          <div className="space-y-5">
            <Card title="발송 전 확인" desc="누르기 전에 무엇이 나가는지">
              <div className="space-y-2.5 text-[12.5px]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[var(--text-dim)]">보내는 번호</span>
                  <span className="font-medium tabular-nums">{senders.find((s) => s.id === senderId) ? fmtPhone(String(senders.find((s) => s.id === senderId)!.phone_number).replace(/[^0-9]/g, '')) : '—'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[var(--text-dim)]">받는 사람</span>
                  <span className="font-medium tabular-nums">{formatNumber(numbers.length)}명</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[var(--text-dim)]">발송 종류</span>
                  <span className="font-medium">{isLms ? 'LMS (장문)' : 'SMS (단문)'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[var(--text-dim)]">보내는 때</span>
                  <span className="font-medium">{reserve && reserveTime ? reserveTime.replace('T', ' ') : '지금 바로'}</span>
                </div>
              </div>
              <p className="mt-4 flex items-start gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[11.5px] leading-relaxed text-[var(--text-dim)]">
                <Coins size={13} className="mt-0.5 flex-shrink-0" />
                발송 비용은 포인트에서 나갑니다. 단가는 종류(SMS/LMS)에 따라 다르고, 나가지 못한 건은 자동으로 환불됩니다.
              </p>
            </Card>

            <Card title="미리보기" desc="받는 사람 화면">
              <div className="flex justify-center py-1">
                <div className="w-full max-w-[260px] rounded-[2rem] border border-[var(--border)] bg-[var(--panel-2)] p-3">
                  <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--text-dim)] opacity-40" />
                  <div className="rounded-2xl bg-[var(--panel)] p-3.5">
                    <p className="mb-2 text-[10px] text-[var(--text-dim)]">
                      {senders.find((s) => s.id === senderId) ? fmtPhone(String(senders.find((s) => s.id === senderId)!.phone_number).replace(/[^0-9]/g, '')) : '발신번호'}
                    </p>
                    <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-indigo-500/12 px-3 py-2.5 text-[13px] leading-relaxed">
                      {text || '문구를 입력하면 여기에 보입니다.'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {result && (
          <Card title="발송 결과">
            {result.ok ? (
              <div className="space-y-3">
                <p className={cn('flex items-center gap-2 text-[13px] font-semibold', (result.failed || 0) > 0 ? 'text-amber-500' : 'text-emerald-500')}>
                  {(result.failed || 0) > 0 ? <AlertCircle size={16} /> : <Check size={16} />}
                  {result.reserved
                    ? `예약되었습니다 — ${result.reservedAt} (${formatNumber(result.total || 0)}명)`
                    : `${formatNumber(result.sent || 0)}건 발송 · 실패 ${formatNumber(result.failed || 0)}건`}
                </p>
                <div className="grid gap-2 text-[12.5px] sm:grid-cols-3">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5">
                    <p className="text-[11px] text-[var(--text-dim)]">차감 포인트</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{formatNumber(result.pointsUsed || 0)}P</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5">
                    <p className="text-[11px] text-[var(--text-dim)]">건당 단가</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{formatNumber(result.unitPoints || 0)}P</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5">
                    <p className="text-[11px] text-[var(--text-dim)]">남은 포인트</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{formatNumber(result.remainingPoints || 0)}P</p>
                  </div>
                </div>
                {result.note && (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-500">{result.note}</p>
                )}
                {result.reason && <p className="text-[12px] text-[var(--text-dim)]">실패 사유: {result.reason}</p>}
                <Button href="/dashboard_USE17237_612/sms/logs" variant="outline">
                  <Clock size={15} /> 발송 이력에서 보기
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 text-[13px] text-rose-500">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{result.error || '발송에 실패했습니다.'}</p>
                  {typeof result.need === 'number' && (
                    <p className="mt-1 text-[12px] text-[var(--text-soft)]">
                      {formatNumber(result.need)}P가 더 필요합니다 (보유 {formatNumber(result.balance || 0)}P).{' '}
                      <a href="/dashboard_USE17237_612/credits" className="font-semibold underline">충전하러 가기</a>
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {!result && numbers.length === 0 && !text && (
          <Card>
            <EmptyState
              icon={Send}
              title="받는 번호와 문구를 넣으면 보낼 수 있습니다"
              hint="자주 쓰는 문구는 '문자 작성'에서 템플릿으로 저장해 두고 여기서 불러오세요."
            />
          </Card>
        )}
      </div>
    </div>
  )
}
