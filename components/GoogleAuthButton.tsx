'use client'

import { useState } from 'react'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.7v3C3.6 21.3 7.5 24 12 24z" />
      <path fill="#FBBC05" d="M5.5 14.6a7.2 7.2 0 010-4.6v-3H1.7a12 12 0 000 10.6l3.8-3z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.6 2.7 1.7 6.7l3.8 3c.9-2.8 3.5-4.9 6.5-4.9z" />
    </svg>
  )
}

/** 구글 OAuth 로그인/가입 버튼 — 클릭 시 /api/auth/google/start 로 전체 페이지 이동 */
export function GoogleAuthButton({ label = '구글로 계속하기', refCode }: { label?: string; refCode?: string }) {
  const href = refCode && refCode.trim()
    ? `/api/auth/google/start?ref=${encodeURIComponent(refCode.trim().toUpperCase())}`
    : '/api/auth/google/start'
  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#2b2e35] bg-[#15171c] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1e2127] hover:shadow-md"
    >
      <GoogleIcon />
      {label}
    </a>
  )
}

/**
 * 구글 간편로그인 + 필수 동의 게이트.
 * 간편로그인을 하더라도 [필수] 이용약관/개인정보처리방침 동의 + [선택] 마케팅 수신동의를 받는다.
 * 필수 항목 미동의 시 버튼 비활성화. 동의 값은 /api/auth/google/start 로 전달되어 가입 시 기록된다.
 */
export function GoogleAuthConsent({
  label = '구글로 계속하기 (Continue with Google)',
  refCode,
}: {
  label?: string
  refCode?: string
}) {
  const [tos, setTos] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [mkt, setMkt] = useState(false)
  const [tried, setTried] = useState(false)

  const ready = tos && privacy

  function proceed(e: React.MouseEvent) {
    if (!ready) {
      e.preventDefault()
      setTried(true)
      return
    }
    const params = new URLSearchParams()
    if (refCode && refCode.trim()) params.set('ref', refCode.trim().toUpperCase())
    params.set('tos', '1')
    params.set('privacy', '1')
    params.set('mkt', mkt ? '1' : '0')
    window.location.href = `/api/auth/google/start?${params.toString()}`
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
        <p className="mb-2 text-xs font-medium text-[var(--text-soft)]">
          간편로그인도 아래 약관 동의가 필요합니다.
        </p>
        <div className="space-y-2">
          <ConsentLine
            checked={tos}
            onChange={setTos}
            required
            error={tried && !tos}
            label={
              <>
                <a href="/legal/terms" target="_blank" rel="noreferrer" className="font-medium text-blue-500 hover:underline">
                  서비스 이용약관
                </a>
                에 동의합니다.
              </>
            }
          />
          <ConsentLine
            checked={privacy}
            onChange={setPrivacy}
            required
            error={tried && !privacy}
            label={
              <>
                <a href="/legal/privacy" target="_blank" rel="noreferrer" className="font-medium text-blue-500 hover:underline">
                  개인정보처리방침
                </a>
                에 동의합니다.
              </>
            }
          />
          <ConsentLine
            checked={mkt}
            onChange={setMkt}
            label="마케팅 정보 수신에 동의합니다."
          />
        </div>
        {tried && !ready && (
          <p className="mt-2 text-xs text-rose-500">필수 약관에 모두 동의해 주세요.</p>
        )}
      </div>

      <button
        type="button"
        onClick={proceed}
        aria-disabled={!ready}
        className={
          'flex w-full items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition-all ' +
          (ready
            ? 'border-[var(--border)] bg-white text-[#1f2328] hover:bg-slate-50 hover:shadow-md'
            : 'cursor-not-allowed border-[var(--border)] bg-white/60 text-slate-400')
        }
      >
        <GoogleIcon />
        {label}
      </button>
    </div>
  )
}

function ConsentLine({
  checked,
  onChange,
  label,
  required,
  error,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
  required?: boolean
  error?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[var(--border)] accent-blue-600"
      />
      <span className={'leading-snug ' + (error ? 'text-rose-500' : 'text-[var(--text-soft)]')}>
        <span className="font-medium text-slate-400">
          {required ? '[필수] ' : '[선택] '}
        </span>
        {label}
      </span>
    </label>
  )
}

/** '또는' 구분선 */
export function OrDivider({ text = '또는' }: { text?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="text-xs font-medium text-[var(--text-dim)]">{text}</span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  )
}
