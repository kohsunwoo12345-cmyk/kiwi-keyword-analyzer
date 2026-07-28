'use client'

import { useState } from 'react'
import { Mail, Send, Users, Coins, Inbox, AlertCircle, Check } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Button } from '@/components/ui'
import { Card, Metric } from '@/components/dash/Kit'
import { formatNumber } from '@/lib/utils'
import { useAuth, sendEmail } from '@/lib/auth'

const ACCENT = '#0ea5e9'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500'

function splitEmails(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    valid: parts.filter((s) => EMAIL_RE.test(s)),
    invalid: parts.filter((s) => !EMAIL_RE.test(s)),
  }
}

export default function EmailSendPage() {
  const { user, setUser } = useAuth()
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [toast, setToast] = useState('')
  const [toastError, setToastError] = useState(false)
  const [busy, setBusy] = useState(false)

  const { valid: emails, invalid } = splitEmails(recipients)
  const targetCount = emails.length
  const credits = user?.credits ?? 0
  const notEnough = targetCount > credits

  function flash(msg: string, isError = false, ms = 4600) {
    setToast(msg)
    setToastError(isError)
    setTimeout(() => setToast(''), ms)
  }

  async function send() {
    if (busy) return
    if (targetCount === 0) return flash('유효한 수신자 이메일을 입력하세요.', true)
    if (!subject.trim()) return flash('제목을 입력하세요.', true)
    if (!body.trim()) return flash('내용을 입력하세요.', true)

    setBusy(true)
    const r = await sendEmail({ to: emails, subject: subject.trim(), html: body })
    setBusy(false)

    if (r.ok) {
      flash(`이메일 ${formatNumber(r.sent ?? targetCount)}건 발송 완료`)
      if (user && typeof r.credits === 'number') setUser({ ...user, credits: r.credits })
      setRecipients('')
      setSubject('')
      setBody('')
    } else {
      flash(
        `${r.error || '발송에 실패했습니다.'}${r.refunded ? ' (크레딧이 환불되었습니다)' : ''}`,
        true,
      )
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Mail}
        eyebrow="이메일"
        title="이메일 발송"
        desc="Resend 기반으로 실제 이메일을 발송합니다. 수신자당 1 크레딧이 차감되며, 실패 시 자동 환불됩니다."
        accent={ACCENT}
        action={
          <Button
            onClick={send}
            disabled={busy || targetCount === 0}
            className="!bg-gradient-to-br !from-sky-500 !to-cyan-500"
          >
            <Send size={16} /> {busy ? '발송 중…' : '발송하기'}
          </Button>
        }
      />

      <div className="space-y-5 p-5 lg:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="보유 크레딧" icon={Coins} accent="#f59e0b" value={formatNumber(credits)} sub="수신자 1명당 1 크레딧" />
          <Metric
            label="이번 발송 대상"
            icon={Users}
            accent={ACCENT}
            value={`${formatNumber(targetCount)}명`}
            sub={invalid.length ? `형식이 잘못된 ${invalid.length}건은 제외됩니다` : '쉼표·줄바꿈으로 구분해 붙여넣기'}
          />
          <Metric
            label="발송 후 잔액"
            icon={Mail}
            accent={notEnough ? '#ef4444' : '#8b5cf6'}
            value={notEnough ? '부족' : formatNumber(credits - targetCount)}
            sub={notEnough ? `${formatNumber(targetCount - credits)} 크레딧이 더 필요합니다` : `차감 ${formatNumber(targetCount)} 크레딧`}
          />
        </div>

        {toast && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-sm animate-fade-in ${
              toastError
                ? 'border-rose-500/30 bg-rose-500/12 text-rose-500'
                : 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500'
            }`}
          >
            {toast}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* Composer */}
          <Card title="이메일 작성" desc="Resend 로 실제 발송됩니다">
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-end justify-between">
                  <label className="text-xs font-medium text-[var(--text-soft)]">수신자</label>
                  <span className="text-[11px] tabular-nums text-[var(--text-dim)]">
                    유효 <span className="font-bold text-sky-500">{targetCount}</span>
                    {invalid.length > 0 && <span className="ml-1 font-bold text-rose-500">· 무시 {invalid.length}</span>}
                  </span>
                </div>
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  rows={3}
                  placeholder="user@example.com, hello@nextbygency.com (쉼표 또는 줄바꿈으로 구분)"
                  className={`${inputClass} resize-none`}
                />
              </div>

              {invalid.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-3.5 py-2.5 text-[12px] text-rose-500">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span className="min-w-0">
                    형식이 맞지 않아 제외된 주소 {invalid.length}건:{' '}
                    <span className="break-all font-mono">{invalid.slice(0, 3).join(', ')}{invalid.length > 3 ? ` 외 ${invalid.length - 3}건` : ''}</span>
                  </span>
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-end justify-between">
                  <label className="text-xs font-medium text-[var(--text-soft)]">제목</label>
                  <span className="text-[11px] tabular-nums text-[var(--text-dim)]">{subject.length}자</span>
                </div>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="이메일 제목을 입력하세요"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-end justify-between">
                  <label className="text-xs font-medium text-[var(--text-soft)]">내용</label>
                  <span className="text-[11px] tabular-nums text-[var(--text-dim)]">{body.length}자</span>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="이메일 내용을 입력하세요."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-[var(--text-soft)]">
                  <Users size={15} /> 예상 발송
                </span>
                <span className={`font-semibold ${notEnough ? 'text-rose-500' : 'text-sky-500'}`}>
                  {formatNumber(targetCount)}명 / 차감 {formatNumber(targetCount)} 크레딧
                </span>
              </div>

              <Button
                onClick={send}
                disabled={busy || targetCount === 0 || !subject.trim() || !body.trim() || notEnough}
                className="w-full !bg-gradient-to-br !from-sky-500 !to-cyan-500"
              >
                <Send size={16} /> {busy ? '발송 중…' : notEnough ? '크레딧이 부족합니다' : '발송하기'}
              </Button>
              {targetCount > 0 && !notEnough && subject.trim() && body.trim() && (
                <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-[var(--text-dim)]">
                  <Check size={12} className="text-emerald-500" /> 발송 준비가 끝났습니다. 실패한 건은 자동 환불됩니다.
                </p>
              )}
            </div>
          </Card>

          {/* Preview */}
          <Card title="미리보기" desc="수신함에서 보이는 모습">
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
              <div className="flex items-center gap-2.5 border-b border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white">
                  <Inbox size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">From: BYGENCY</p>
                  <p className="truncate text-[10px] text-[var(--text-dim)]">
                    {emails.length > 0 ? `To: ${emails[0]}${emails.length > 1 ? ` 외 ${emails.length - 1}명` : ''}` : 'To: 수신자를 입력하세요'}
                  </p>
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="mb-3 border-b border-[var(--border)] pb-3 text-base font-semibold text-[var(--text)]">
                  {subject || '제목을 입력하면 이곳에 표시됩니다.'}
                </p>
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text-soft)]">
                  {body || '내용을 입력하면 이곳에 실시간으로 표시됩니다.'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
