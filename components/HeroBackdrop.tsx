'use client'

/**
 * 히어로 헤더 배경 — 노드 에디터 장면을 제거하고,
 * 문구 가독성을 해치지 않는 깔끔하고 고급스러운 배경으로 교체.
 * (은은한 그라데이션 글로우 + 미세 그리드 + 상단 빔) 텍스트 뒤는 비워 선명도 유지.
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#060912]">
      {/* 베이스 그라데이션 */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(37,99,235,0.28),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060912]/40 to-[var(--bg)]" />

      {/* 상단 중앙 빔 */}
      <div className="absolute left-1/2 top-[-18%] h-[440px] w-[820px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[130px]" />
      <div className="animate-drift absolute left-[18%] top-[6%] h-[300px] w-[420px] rounded-full bg-cyan-500/12 blur-[120px]" />
      <div className="animate-drift-slow absolute right-[14%] top-[18%] h-[320px] w-[440px] rounded-full bg-indigo-500/14 blur-[130px]" />

      {/* 미세 그리드 (중앙에서 페이드) */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
          maskImage: 'radial-gradient(90% 70% at 50% 30%, #000 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(90% 70% at 50% 30%, #000 55%, transparent 100%)',
        }}
      />

      {/* 하단 라인 페이드 */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg)]" />
    </div>
  )
}
