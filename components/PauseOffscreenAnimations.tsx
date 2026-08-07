'use client'

/* ══════════════════════════════════════════════════════════════════════════
   화면 밖에서 헛도는 애니메이션을 멈춘다
   ──────────────────────────────────────────────────────────────────────────
   홈페이지를 실제로 재 보니 이랬다(창 800px · 문서 15,409px = 19화면 분량):

     끝없이 도는 애니메이션 54개
       └ 지금 화면 안 17개   ← 보이니까 돌아야 하는 것
       └ 화면 밖    37개   ← 아무도 못 보는데 매 프레임 계산 (순수한 낭비)

     가만히 뒀을 때 FPS 27  (60 이 정상)
     애니메이션을 전부 끄면 FPS 61 → 기기가 느린 게 아니라 이것들이 원인이다

   화면 밖 구역에 content-visibility 는 이미 걸려 있는데(.defer-paint),
   그건 "배치·그리기" 만 미룰 뿐 애니메이션 시계는 계속 돈다. 실측으로 확인했다.

   ⚠ 끝없이 도는 것(infinite)만 멈춘다.
     한 번 돌고 끝나는 등장 애니메이션까지 멈추면, 화면 밖에서 0% 로 얼어붙었다가
     스크롤할 때 뒤늦게 시작해 어색해진다. getAnimations() 로 반복 횟수를 보고 가른다 —
     CSS 로는 반복 횟수를 고를 수 없어서 이 방법을 쓴다.

   ⚠ 여유를 넉넉히 둔다(rootMargin). 화면에 들어오기 한참 전에 이미 돌고 있어야
     사용자 눈에는 "원래 돌고 있던 것" 으로 보인다.
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** 이 안의 애니메이션을 켜고 끈다. 구역이 없으면 아무 일도 안 한다. */
const SCOPE = 'section, [data-anim-scope]'
/** 화면에서 이만큼 떨어질 때까지는 계속 돌린다 */
const MARGIN = '400px 0px'

export function PauseOffscreenAnimations() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof IntersectionObserver === 'undefined') return
    //  getAnimations 가 없는 브라우저에서는 아무것도 하지 않는다 — 지금과 똑같이 동작한다
    const probe = document.createElement('div')
    if (typeof (probe as any).getAnimations !== 'function') return

    let stopped = false

    /** 그 구역 안의 "끝없이 도는" 애니메이션만 멈추거나 다시 돌린다. */
    const apply = (el: Element, visible: boolean) => {
      let anims: Animation[] = []
      try { anims = (el as any).getAnimations({ subtree: true }) as Animation[] } catch { return }
      for (const a of anims) {
        let inf = false
        try { inf = a.effect?.getTiming().iterations === Infinity } catch { inf = false }
        if (!inf) continue                              // 등장 애니메이션은 건드리지 않는다
        try { visible ? a.play() : a.pause() } catch { /* 이미 끝났거나 취소된 것 */ }
      }
    }

    const io = new IntersectionObserver((entries) => {
      if (stopped) return
      for (const e of entries) apply(e.target, e.isIntersecting)
    }, { rootMargin: MARGIN })

    const watch = () => {
      for (const el of document.querySelectorAll(SCOPE)) io.observe(el)
    }

    /*  애니메이션은 화면이 그려진 뒤에 붙는다 — 너무 일찍 보면 하나도 못 잡는다.
        첫 그림이 끝난 뒤에 훑고, 늦게 붙는 것들을 위해 한 번 더 훑는다. */
    const t1 = window.setTimeout(watch, 300)
    const t2 = window.setTimeout(watch, 1500)

    /*  클라이언트 이동·지연 로딩으로 구역이 새로 생기면 그것도 지켜본다.
        childList 만 본다 — 속성 변화까지 보면 이 감시 자체가 무거워진다. */
    let mo: MutationObserver | null = null
    try {
      mo = new MutationObserver(() => { if (!stopped) watch() })
      mo.observe(document.body, { childList: true, subtree: true })
    } catch { /* 없으면 없는 대로 */ }

    return () => {
      stopped = true
      window.clearTimeout(t1); window.clearTimeout(t2)
      io.disconnect()
      mo?.disconnect()
      //  떠날 때는 전부 다시 돌려 놓는다 — 멈춘 채로 남기면 다음 화면에서 얼어 보인다
      for (const el of document.querySelectorAll(SCOPE)) apply(el, true)
    }
  }, [pathname])

  return null
}
