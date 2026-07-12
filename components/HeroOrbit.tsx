'use client'

import { AppIcon } from '@/components/Brand'

/* ---- 실제 플랫폼 로고 (인라인 SVG 재현) ---- */
function YouTubeMark() {
  return (
    <span className="grid h-full w-full place-items-center rounded-[26%] bg-[#FF0000] shadow-lg">
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="#fff"><path d="M10 8.5v7l6-3.5-6-3.5z" /></svg>
    </span>
  )
}
function PlaceMark() {
  return (
    <span className="grid h-full w-full place-items-center rounded-[26%] bg-[#03C75A] shadow-lg">
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="#fff"><path d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" /></svg>
    </span>
  )
}
function KakaoMark() {
  return (
    <span className="grid h-full w-full place-items-center rounded-[26%] bg-[#FEE500] shadow-lg">
      <svg viewBox="0 0 24 24" className="h-[46%] w-[46%]" fill="#3C1E1E"><path d="M12 4C7 4 3 7.1 3 10.9c0 2.4 1.7 4.6 4.2 5.8-.2.6-.7 2.4-.8 2.8 0 .2.1.4.4.2.3-.2 2.6-1.8 3.6-2.5.5.1 1.1.1 1.6.1 5 0 9-3.1 9-6.9S17 4 12 4z" /></svg>
    </span>
  )
}
function BlogMark() {
  return (
    <span className="grid h-full w-full place-items-center rounded-[26%] bg-[#03C75A] shadow-lg">
      <span className="text-[13px] font-extrabold italic tracking-tight text-white">blog</span>
    </span>
  )
}
function InstagramMark() {
  return (
    <span
      className="grid h-full w-full place-items-center rounded-[26%] shadow-lg"
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
function NewsMark() {
  return (
    <span className="grid h-full w-full place-items-center rounded-[26%] bg-white shadow-lg">
      <span className="text-[11px] font-extrabold tracking-tight text-[#2563eb]">NEWS</span>
    </span>
  )
}

// r: 궤도 반경(px), a: 시작 각도, dur: 공전 주기(초), rev: 역방향, size: 타일 크기
const PLANETS = [
  { Mark: YouTubeMark, r: 250, a: 210, dur: 46, rev: false, size: 62 },
  { Mark: PlaceMark, r: 250, a: 330, dur: 46, rev: false, size: 62 },
  { Mark: KakaoMark, r: 250, a: 90, dur: 46, rev: false, size: 62 },
  { Mark: BlogMark, r: 168, a: 20, dur: 34, rev: true, size: 56 },
  { Mark: InstagramMark, r: 168, a: 150, dur: 34, rev: true, size: 56 },
  { Mark: NewsMark, r: 168, a: 265, dur: 34, rev: true, size: 56 },
]

export function HeroOrbit() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      {/* 은은한 배경 글로우 */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.25),transparent_60%)]" />

      {/* 점선 궤도 링 */}
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10" />
      <div className="absolute left-1/2 top-1/2 h-[336px] w-[336px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10" />

      {/* 궤도 아이콘 (실제 로고) */}
      {PLANETS.map(({ Mark, r, a, dur, rev, size }, i) => (
        <div
          key={i}
          className={`orbit-item${rev ? ' rev' : ''}`}
          style={
            {
              // 시작 위치 = 각도 비율만큼 애니메이션을 앞당김
              '--r': `${r}px`,
              '--dur': `${dur}s`,
              '--a': `${a}deg`,
              '--delay': `${-(dur * (a / 360))}s`,
              width: size,
              height: size,
            } as React.CSSProperties
          }
        >
          <div className="animate-bob h-full w-full" style={{ animationDelay: `${i * 0.4}s` }}>
            <Mark />
          </div>
        </div>
      ))}

      {/* 중심 코어 = BYGENCY */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="orbit-core grid h-40 w-40 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#8b5cf6,#6366f1_55%,#4f46e5)] sm:h-48 sm:w-48">
          <div className="flex flex-col items-center gap-2 text-center">
            <AppIcon size={44} className="drop-shadow" />
            <span className="text-sm font-extrabold tracking-widest text-white sm:text-base">BYGENCY</span>
          </div>
        </div>
      </div>
    </div>
  )
}
