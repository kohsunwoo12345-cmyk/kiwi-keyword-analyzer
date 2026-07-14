'use client'

/* 실제 플랫폼 로고 (인라인 SVG 재현). 부모 크기를 채우도록 h-full w-full 기준. */

export function YouTubeLogo() {
  return (
    <span className="grid h-full w-full place-items-center rounded-xl bg-[#FF0000] shadow-md">
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="#fff">
        <path d="M10 8.5v7l6-3.5-6-3.5z" />
      </svg>
    </span>
  )
}

export function NaverBlogLogo() {
  return (
    <span className="grid h-full w-full place-items-center rounded-xl bg-[#03C75A] shadow-md">
      <span className="text-[12px] font-extrabold italic leading-none tracking-tight text-white">blog</span>
    </span>
  )
}

export function NaverLogo() {
  return (
    <span className="grid h-full w-full place-items-center rounded-xl bg-[#03C75A] shadow-md">
      <svg viewBox="0 0 24 24" className="h-[52%] w-[52%]" fill="#fff">
        <path d="M7 5v6.2L10.4 5H17v14h-3.6v-6.2L10 19H4V5h3z" />
      </svg>
    </span>
  )
}

export function KakaoLogo() {
  return (
    <span className="grid h-full w-full place-items-center rounded-xl bg-[#FEE500] shadow-md">
      <svg viewBox="0 0 24 24" className="h-[52%] w-[52%]" fill="#3C1E1E">
        <path d="M12 4C7 4 3 7.1 3 10.9c0 2.4 1.7 4.6 4.2 5.8-.2.6-.7 2.4-.8 2.8 0 .2.1.4.4.2.3-.2 2.6-1.8 3.6-2.5.5.1 1.1.1 1.6.1 5 0 9-3.1 9-6.9S17 4 12 4z" />
      </svg>
    </span>
  )
}

export function MetaLogo() {
  return (
    <span className="grid h-full w-full place-items-center rounded-xl bg-white shadow-md">
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none" stroke="#0081FB" strokeWidth="2.4" strokeLinecap="round">
        <path d="M3 15.5c1.6 0 2.6-1.6 4.2-4.2C9.1 8.2 10.2 7 12 7s2.9 1.2 4.8 4.3c1.6 2.6 2.6 4.2 4.2 4.2 1.3 0 2-1 2-2.6 0-2.9-1.9-5.9-4.4-5.9-1.7 0-3 1.3-4.6 3.9-1.6 2.6-2.9 3.9-4.6 3.9C4.9 12.8 3 9.8 3 6.9" />
      </svg>
    </span>
  )
}

export function GoogleLogo() {
  return (
    <span className="grid h-full w-full place-items-center rounded-xl bg-white shadow-md">
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]">
        <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
        <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.7v3C3.6 21.3 7.5 24 12 24z" />
        <path fill="#FBBC05" d="M5.5 14.6a7.2 7.2 0 010-4.6v-3H1.7a12 12 0 000 10.6l3.8-3z" />
        <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.6 2.7 1.7 6.7l3.8 3c.9-2.8 3.5-4.9 6.5-4.9z" />
      </svg>
    </span>
  )
}

export function InstagramLogo() {
  return (
    <span
      className="grid h-full w-full place-items-center rounded-xl shadow-md"
      style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="#fff" strokeWidth="2">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17" cy="7" r="1.2" fill="#fff" stroke="none" />
      </svg>
    </span>
  )
}

/* 여러 광고 플랫폼(메타·구글·네이버)을 겹쳐 표시하는 클러스터 */
export function AdPlatformsCluster() {
  return (
    <span className="flex h-full w-full items-center">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white shadow-md ring-1 ring-black/5">
        <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none" stroke="#0081FB" strokeWidth="2.6" strokeLinecap="round">
          <path d="M3 15.5c1.6 0 2.6-1.6 4.2-4.2C9.1 8.2 10.2 7 12 7s2.9 1.2 4.8 4.3c1.6 2.6 2.6 4.2 4.2 4.2 1.3 0 2-1 2-2.6 0-2.9-1.9-5.9-4.4-5.9-1.7 0-3 1.3-4.6 3.9-1.6 2.6-2.9 3.9-4.6 3.9C4.9 12.8 3 9.8 3 6.9" />
        </svg>
      </span>
      <span className="-ml-2 grid h-8 w-8 place-items-center rounded-lg bg-white shadow-md ring-1 ring-black/5">
        <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]">
          <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
          <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.7v3C3.6 21.3 7.5 24 12 24z" />
          <path fill="#FBBC05" d="M5.5 14.6a7.2 7.2 0 010-4.6v-3H1.7a12 12 0 000 10.6l3.8-3z" />
          <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.6 2.7 1.7 6.7l3.8 3c.9-2.8 3.5-4.9 6.5-4.9z" />
        </svg>
      </span>
      <span className="-ml-2 grid h-8 w-8 place-items-center rounded-lg bg-[#03C75A] shadow-md ring-1 ring-black/5">
        <svg viewBox="0 0 24 24" className="h-[52%] w-[52%]" fill="#fff">
          <path d="M7 5v6.2L10.4 5H17v14h-3.6v-6.2L10 19H4V5h3z" />
        </svg>
      </span>
    </span>
  )
}
