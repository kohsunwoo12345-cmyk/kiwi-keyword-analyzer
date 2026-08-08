'use client'

import { cn } from '@/lib/utils'

// 히어로 배경 전용 축소본(≈380px). 어둡게 깔리는 장식 배경이라 저용량으로 충분 — 모바일 로딩 대폭 절감.
const ALL = Array.from({ length: 20 }, (_, i) => `/images/showcase/hero/${i + 1}.webp`)

/** 세로로 흐르는 사진 열 — 열마다 속도·방향이 달라 자연스럽게 움직인다. */
const COLS = [
  ALL.slice(0, 4),
  ALL.slice(4, 8),
  ALL.slice(8, 12),
  ALL.slice(12, 16),
  ALL.slice(16, 20),
  [ALL[2], ALL[9], ALL[13], ALL[18]],
]

/**
 * 히어로 배경 — AI 제작 사진들이 세로로 부드럽게 흐르는 프리미엄 포토월.
 * 위에 짙은 오버레이·글로우를 얹어 문구 가독성을 유지한다.
 */
export function HeroPhotoWall() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#05070e]">
      {/*  움직이는 사진 열
           ──────────────────────────────────────────────────────────────────────
           ⚠ 이 감싼 판은 예전에 `inset-0 + opacity-[0.62] + scale(1.18)` 이었다.
             그 두 가지가 벽을 비싸게 만들었다. 왜 그런지 실측으로 갈랐다
             (1440×900, 같은 조건 5회 번갈아 재고 중앙값 — 한 번만 재면 33~45로 널뛴다):

               벽이 흐를 때 지금 그대로            FPS 38~44
               투명도만 열마다로 옮김               FPS 23   ← 혼자서는 더 나쁘다
               scale 만 제거                      FPS 43   ← 혼자서는 그대로
               둘 다 (투명도 옮김 + scale 제거)     FPS 60   ← 여기서 풀린다

             이유: transform 이 걸린 조상 안에서 투명도 묶음까지 씌우면, 브라우저는
             매 프레임 여섯 열을 그 묶음 공간에 다시 합성한다. 둘 중 하나만 없애면
             남은 하나가 그대로 붙잡는다 — 그래서 하나씩 재면 효과가 안 보였다.

           ⚠ 보이는 그림은 예전과 같아야 한다.
             scale(1.18) 은 가운데 기준으로 사방을 9% 씩 넓히는 것과 같다.
             그래서 transform 대신 -inset-[9%] 로 판 자체를 넓힌다 — 덮는 넓이가 똑같고
             transform 조상이 사라진다. 투명도는 열마다 주는데, 열끼리 겹치지 않으므로
             (flex + gap) 묶음에 준 것과 결과가 같다.
             실측: -inset 방식도 FPS 60 (scale 제거와 동일). */}
      <div data-photo-wall className="absolute -inset-[9%] flex justify-center gap-2.5 sm:gap-3">
        {COLS.map((col, ci) => (
          <div
            key={ci}
            className={cn('relative w-1/2 flex-shrink-0 opacity-[0.62]', 'sm:w-[16.5%]', ci >= 2 && 'hidden sm:block')}
          >
            <div
              className="absolute inset-x-0 top-0 will-change-transform [backface-visibility:hidden]"
              style={{ animation: `${ci % 2 ? 'heroWallDown' : 'heroWallUp'} ${44 + ci * 8}s linear infinite` }}
            >
              {[...col, ...col].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="mb-2.5 w-full rounded-2xl object-cover shadow-lg sm:mb-3"
                  style={{ aspectRatio: '3 / 4' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 프리미엄 글로우 */}
      <div className="absolute left-1/2 top-[-18%] h-[440px] w-[820px] -translate-x-1/2 rounded-full bg-blue-600/25 blur-[130px]" />
      <div className="animate-drift absolute left-[16%] top-[8%] h-[300px] w-[420px] rounded-full bg-cyan-500/12 blur-[120px]" />
      <div className="animate-drift-slow absolute right-[14%] top-[16%] h-[320px] w-[440px] rounded-full bg-indigo-500/14 blur-[130px]" />

      {/* 가독성용 어두운 오버레이 (사진이 더 선명히 비치도록 완화) */}
      <div className="absolute inset-0 bg-[#05070e]/42" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070e]/70 via-[#05070e]/20 to-[var(--bg)]" />
      {/* 문구 뒤만 살짝 어둡게(가독성) */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_46%_at_50%_36%,rgba(5,7,14,0.62),transparent_75%)]" />
      {/* 미세 그리드 */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
          maskImage: 'radial-gradient(90% 70% at 50% 30%, #000 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(90% 70% at 50% 30%, #000 55%, transparent 100%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg)]" />
    </div>
  )
}
