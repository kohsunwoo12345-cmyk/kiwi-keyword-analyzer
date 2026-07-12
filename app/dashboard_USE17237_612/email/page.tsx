'use client'

import { useState } from 'react'
import { Mail, Send, Users, Coins, Inbox } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import { useAuth, sendEmail } from '@/lib/auth'

const ACCENT = '#0ea5e9'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500'

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s))
}

export default function EmailSendPage() {
  const { user, setUser } = useAuth()
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [toast, setToast] = useState('')
  const [toastError, setToastError] = useState(false)
  const [busy, setBusy] = useState(false)

  const emails = parseEmails(recipients)
  const targetCount = emails.length
  const credits = user?.credits ?? 0

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

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="보유 크레딧" value={`${formatNumber(credits)}건`} icon={Coins} accent="#f59e0b" />
          <StatCard label="이번 발송 대상" value={`${formatNumber(targetCount)}명`} icon={Users} accent={ACCENT} />
          <StatCard label="예상 차감 크레딧" value={`${formatNumber(targetCount)}`} icon={Mail} accent="#8b5cf6" />
        </div>

        {toast && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-sm animate-fade-in ${
              toastError
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-100 text-emerald-700'
            }`}
          >
            {toast}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Composer */}
          <Panel title="이메일 작성">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">수신자</label>
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  rows={3}
                  placeholder="user@example.com, hello@bygency.com (쉼표 또는 줄바꿈으로 구분)"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">제목</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="이메일 제목을 입력하세요"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">내용</label>
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
                <span className="font-semibold text-sky-600">
                  {formatNumber(targetCount)}명 / 차감 {formatNumber(targetCount)}크레딧
                </span>
              </div>

              <Button
                onClick={send}
                disabled={busy || targetCount === 0 || !subject.trim() || !body.trim()}
                className="w-full !bg-gradient-to-br !from-sky-500 !to-cyan-500"
              >
                <Send size={16} /> {busy ? '발송 중…' : '발송하기'}
              </Button>
            </div>
          </Panel>

          {/* Preview */}
          <Panel title="미리보기">
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-[var(--border)] bg-slate-50 px-4 py-3">
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
                <p className="mb-3 border-b border-[var(--border-soft)] pb-3 text-base font-semibold text-[var(--text)]">
                  {subject || '제목을 입력하면 이곳에 표시됩니다.'}
                </p>
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text-soft)]">
                  {body || '내용을 입력하면 이곳에 실시간으로 표시됩니다.'}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
