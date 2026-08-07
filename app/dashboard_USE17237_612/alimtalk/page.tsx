'use client'

/* 알림톡 발송
 *
 * ⚠ 여기엔 원래 <iframe src="/tools/alimtalk?embed=1"> 이 있었다. 그 파일은 이 저장소에
 *   한 번도 있던 적이 없다(git 이력 확인) — 메뉴를 눌러도 빈 화면이었다.
 *   심지어 '알림톡 템플릿' 화면의 "이 템플릿으로 발송" 단추가 이 화면을 가리키고 있어서,
 *   템플릿을 만들어도 보낼 방법이 없었다. 뒷단(/api/alimtalk/send)은 이미 다 있다.
 *
 * 알림톡은 문자와 규칙이 다르다 — 화면이 그 차이를 먼저 알려줘야 한다.
 *  · 내 카카오 채널(발신프로필)이 있어야 한다. 없으면 채널 등록부터.
 *  · 승인된 템플릿의 문구를 그대로 보내야 한다. 문구를 바꾸면 카카오가 거절한다.
 *  · 실패하면 문자로 대체 발송(failover)할 수 있다 — 이건 문자 요금이 든다.
 */

import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Loader2, Check, AlertCircle, Users, Coins, LayoutTemplate, KeyRound } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Field, Section, inputCls } from '@/components/dash/Kit'
import { Button, Badge } from '@/components/ui'
import { formatNumber, cn } from '@/lib/utils'
import { kakaoChannels, kakaoTemplates, sendAlimtalk, type KakaoChannel, type KakaoTemplate } from '@/lib/auth'

const ACCENT = '#f59e0b'

/** 알리고 템플릿 상태 → 보낼 수 있는가. 승인된 것만 실제로 나간다. */
function approved(t: KakaoTemplate): boolean {
  const u = String(t.inspStatus || t.status || '').toUpperCase()
  return u.includes('APPROV') || u.includes('APR') || u.includes('승인') || u === 'A' || u === 'Y'
}

function parseNumbers(raw: string): { ok: string[]; bad: string[] } {
  const ok: string[] = []
  const bad: string[] = []
  const seen = new Set<string>()
  for (const piece of String(raw).split(/[\s,;]+/)) {
    const t = piece.trim()
    if (!t) continue
    const d = t.replace(/[^0-9]/g, '')
    if (d.length < 10 || d.length > 11) { bad.push(t); continue }
    if (seen.has(d)) continue
    seen.add(d)
    ok.push(d)
  }
  return { ok, bad }
}

type SendResult = Awaited<ReturnType<typeof sendAlimtalk>>

export default function AlimtalkSendPage() {
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<KakaoChannel[]>([])
  const [senderKey, setSenderKey] = useState('')
  const [templates, setTemplates] = useState<KakaoTemplate[]>([])
  const [templateId, setTemplateId] = useState('')

  const [toRaw, setToRaw] = useState('')
  const [text, setText] = useState('')
  const [failover, setFailover] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const c = await kakaoChannels()
      if (!alive) return
      setChannels(c.channels || [])
      const sk = c.channels?.[0]?.channelId || ''
      setSenderKey(sk)
      if (sk) {
        const t = await kakaoTemplates(sk)
        if (!alive) return
        setTemplates(t.templates || [])
      }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  /** 채널을 바꾸면 그 채널의 템플릿을 다시 받는다 — 템플릿은 채널에 묶여 있다 */
  async function pickChannel(sk: string) {
    setSenderKey(sk)
    setTemplateId('')
    setTemplates([])
    if (!sk) return
    const t = await kakaoTemplates(sk)
    setTemplates(t.templates || [])
  }

  function pickTemplate(id: string) {
    setTemplateId(id)
    const t = templates.find((x) => x.templateId === id)
    //  승인된 문구를 그대로 넣는다 — 손으로 고치면 카카오가 거절한다
    if (t) setText(t.content || '')
  }

  const { ok: numbers, bad } = useMemo(() => parseNumbers(toRaw), [toRaw])
  const chosen = templates.find((t) => t.templateId === templateId)
  //  1,000명을 넘으면 서버가 거절한다 — 누르기 전에 여기서 먼저 막는다
  const canSend = !!senderKey && !!templateId && numbers.length > 0 && numbers.length <= 1000 && !!text.trim() && !sending

  async function send() {
    if (!canSend) return
    setSending(true)
    setResult(null)
    const r = await sendAlimtalk({ to: numbers, text: text.trim(), templateId, senderKey, failover })
    setResult(r)
    setSending(false)
    if (r.ok && (r.sent || 0) > 0) setToRaw('')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MessageCircle}
        eyebrow="카카오 알림톡"
        title="알림톡 발송"
        desc="승인된 템플릿 문구를 내 카카오 채널 이름으로 보냅니다."
        accent={ACCENT}
        action={
          <Button href="/dashboard_USE17237_612/alimtalk/logs" variant="outline">
            발송 통계
          </Button>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-[var(--text-dim)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중…
          </div>
        ) : channels.length === 0 ? (
          <Card>
            <EmptyState
              icon={KeyRound}
              title="등록된 카카오 채널이 없습니다"
              hint="알림톡은 내 카카오 채널(발신프로필) 이름으로 나갑니다. 채널을 먼저 등록하세요."
              action={<Button href="/dashboard_USE17237_612/alimtalk/register">채널 등록하러 가기</Button>}
            />
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card title="보낼 내용" desc="채널 · 템플릿 · 수신자를 정합니다">
              <Section label="보내는 채널" first hint="이 채널 이름으로 알림톡이 도착합니다.">
                <select value={senderKey} onChange={(e) => pickChannel(e.target.value)} className={inputCls}>
                  {channels.map((c) => (
                    <option key={c.channelId} value={c.channelId}>
                      {c.channelName || c.searchId || c.channelId}
                    </option>
                  ))}
                </select>
              </Section>

              <Section
                label="템플릿"
                hint="카카오 승인을 받은 템플릿만 실제로 나갑니다. 문구를 고치면 거절됩니다."
                action={
                  <a href="/dashboard_USE17237_612/alimtalk/templates" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-500 hover:underline">
                    <LayoutTemplate size={12} /> 템플릿 관리
                  </a>
                }
              >
                {templates.length === 0 ? (
                  <p className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-3 text-[12.5px] text-[var(--text-dim)]">
                    이 채널에 등록된 템플릿이 없습니다.{' '}
                    <a href="/dashboard_USE17237_612/alimtalk/templates" className="font-semibold text-amber-500 underline">템플릿을 먼저 등록</a>하세요.
                  </p>
                ) : (
                  <>
                    <select value={templateId} onChange={(e) => pickTemplate(e.target.value)} className={inputCls}>
                      <option value="">템플릿을 고르세요</option>
                      {templates.map((t) => (
                        <option key={t.templateId} value={t.templateId} disabled={!approved(t)}>
                          {t.name || t.templateId}{approved(t) ? '' : ' (검수 전 — 보낼 수 없음)'}
                        </option>
                      ))}
                    </select>
                    {chosen && !approved(chosen) && (
                      <p className="mt-2 text-[11.5px] font-medium text-amber-500">이 템플릿은 아직 카카오 승인 전이라 발송이 거절됩니다.</p>
                    )}
                  </>
                )}
              </Section>

              <Section label="문구" hint="템플릿을 고르면 승인된 문구가 그대로 들어옵니다.">
                <Field label="보낼 문구" right={`${text.length}자`}>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={7}
                    placeholder="템플릿을 고르면 문구가 채워집니다."
                    className={cn(inputCls, 'resize-none leading-relaxed')}
                  />
                </Field>
              </Section>

              <Section label="받는 번호" hint="줄바꿈·쉼표·띄어쓰기로 구분해 붙여 넣으세요. 같은 번호는 한 번만 보냅니다.">
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

              <Section label="실패했을 때" hint="카카오톡을 안 쓰거나 차단한 사람에게도 닿게 하려면 켜 두세요.">
                <label className="flex items-start gap-2 text-[12.5px] font-medium text-[var(--text-soft)]">
                  <input type="checkbox" checked={failover} onChange={(e) => setFailover(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
                  <span>
                    알림톡이 안 가면 문자로 대신 보내기
                    <span className="mt-0.5 block text-[11px] font-normal text-[var(--text-dim)]">대체 발송은 문자 요금이 듭니다.</span>
                  </span>
                </label>
              </Section>

              <div className="mt-6 flex items-center gap-3 border-t border-[var(--border-soft)] pt-5">
                <Button onClick={send} disabled={!canSend} className="justify-center">
                  {sending ? <><Loader2 size={16} className="animate-spin" /> 보내는 중…</> : <><MessageCircle size={16} /> {formatNumber(numbers.length)}명에게 보내기</>}
                </Button>
                {!templateId && <span className="text-[11.5px] text-[var(--text-dim)]">템플릿을 골라야 보낼 수 있습니다.</span>}
              </div>
            </Card>

            <div className="space-y-5">
              <Card title="발송 전 확인">
                <div className="space-y-2.5 text-[12.5px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-dim)]">보내는 채널</span>
                    <span className="min-w-0 truncate font-medium">{channels.find((c) => c.channelId === senderKey)?.channelName || '—'}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-dim)]">템플릿</span>
                    <span className="min-w-0 truncate font-medium">{chosen?.name || '—'}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-dim)]">받는 사람</span>
                    <span className="font-medium tabular-nums">{formatNumber(numbers.length)}명</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[var(--text-dim)]">실패 시</span>
                    <span className="font-medium">{failover ? '문자로 대체 발송' : '보내지 않음'}</span>
                  </div>
                </div>
                <p className="mt-4 flex items-start gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[11.5px] leading-relaxed text-[var(--text-dim)]">
                  <Coins size={13} className="mt-0.5 flex-shrink-0" />
                  발송 비용은 포인트에서 나갑니다. 나가지 못한 건은 자동으로 환불됩니다.
                </p>
              </Card>

              <Card title="미리보기" desc="받는 사람 카카오톡 화면">
                <div className="flex justify-center py-1">
                  <div className="w-full max-w-[260px] rounded-[2rem] border border-[var(--border)] bg-[#9bbbd4] p-3">
                    <div className="rounded-2xl bg-[#fef01b] px-3 py-1.5 text-[10px] font-bold text-[#3c1e1e]">
                      {channels.find((c) => c.channelId === senderKey)?.channelName || '내 카카오 채널'}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#1f2937]">
                      {text || '템플릿을 고르면 문구가 여기에 보입니다.'}
                    </div>
                  </div>
                </div>
                {chosen && (
                  <div className="mt-3 flex justify-center">
                    <Badge className={approved(chosen) ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500' : 'border-amber-500/30 bg-amber-500/12 text-amber-500'}>
                      {approved(chosen) ? '승인된 템플릿' : '검수 전 템플릿'}
                    </Badge>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {result && (
          <Card title="발송 결과">
            {result.ok ? (
              <div className="space-y-3">
                <p className={cn('flex items-center gap-2 text-[13px] font-semibold', (result.failed || 0) > 0 ? 'text-amber-500' : 'text-emerald-500')}>
                  {(result.failed || 0) > 0 ? <AlertCircle size={16} /> : <Check size={16} />}
                  {formatNumber(result.sent || 0)}건 발송 · 실패 {formatNumber(result.failed || 0)}건
                </p>
                {result.note && (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-500">{result.note}</p>
                )}
                <Button href="/dashboard_USE17237_612/alimtalk/logs" variant="outline">발송 통계에서 보기</Button>
              </div>
            ) : (
              <p className="flex items-start gap-2.5 text-[13px] font-semibold text-rose-500">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {result.error || '발송에 실패했습니다.'}
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
