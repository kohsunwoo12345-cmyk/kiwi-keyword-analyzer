'use client'

/** 구글 OAuth 로그인/가입 버튼 — 클릭 시 /api/auth/google/start 로 전체 페이지 이동 */
export function GoogleAuthButton({ label = '구글로 계속하기', refCode }: { label?: string; refCode?: string }) {
  const href = refCode && refCode.trim()
    ? `/api/auth/google/start?ref=${encodeURIComponent(refCode.trim().toUpperCase())}`
    : '/api/auth/google/start'
  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[#1f2328] shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
        <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.7v3C3.6 21.3 7.5 24 12 24z" />
        <path fill="#FBBC05" d="M5.5 14.6a7.2 7.2 0 010-4.6v-3H1.7a12 12 0 000 10.6l3.8-3z" />
        <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.6 2.7 1.7 6.7l3.8 3c.9-2.8 3.5-4.9 6.5-4.9z" />
      </svg>
      {label}
    </a>
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
