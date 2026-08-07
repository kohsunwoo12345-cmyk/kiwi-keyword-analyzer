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
      {/* 움직이는 사진 열 */}
      <div className="absolute inset-0 flex justify-center gap-2.5 opacity-[0.62] [transform:scale(1.18)] sm:gap-3">
        {COLS.map((col, ci) => (
          <div key={ci} className={cn('relative w-1/2 flex-shrink-0 sm:w-[16.5%]', ci >= 2 && 'hidden sm:block')}>
            {/*  ⚠ 여기엔 원래 heroWallUp/heroWallDown 무한 스크롤이 걸려 있었다. 그런데 그
                 keyframes 는 /legal/* 에서만 불러오는 파일(app/styles/legal.css)에 들어 있어서
                 홈에서는 정의가 없는 이름이었다 — 즉 이 벽은 지금까지 한 번도 흐른 적이 없다.
                 (브라우저에서 getAnimations() 가 빈 배열을 돌려줘서 찾았다.)

                 keyframes 를 globals.css 로 옮겨 실제로 돌려 보고 재 봤더니:

                   벽을 멈춰 둔 지금        FPS 60
                   벽을 흐르게 하면         FPS 33~38   ← 절반

                 사진 48장이 계속 움직이면 브라우저가 매 프레임 화면을 다시 굽고,
                 그 김에 페이지 곳곳의 blur 글로우까지 같이 다시 굽는다. 레이어를 떼어내는
                 방법 6가지(contain:paint·contain:strict·isolation·backface-visibility·
                 will-change:opacity·사진 contain)를 전부 재 봤지만 하나도 안 통했다(33~38).

                 게다가 이 움직임은 44초에 700px = 초당 16px 이라 눈에 거의 안 띈다.
                 "보이지도 않는 효과" 와 "체감되는 렉" 을 맞바꿀 이유가 없어서,
                 지금 사용자가 보고 있는 그대로(정지)를 유지한다.
                 열마다 시작 높이만 어긋나게 두어 벽처럼 보이게 한다(한 번만 계산된다).
                 흐르게 하고 싶다면 아래 transform 을 애니메이션으로 되돌리면 된다. */}
            <div
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(-${ci * 6}%)` }}
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
