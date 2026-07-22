'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * 뷰포트 근처에 올 때까지 자식(무거운 애니메이션/갤러리 컴포넌트)의 마운트를 미룬다.
 * dynamic(import) 과 함께 쓰면 JS 청크·이미지 로드까지 스크롤 시점으로 지연되어,
 * 홈 최초 로딩의 롱태스크(렉)와 선행 데이터 다운로드(방대한 데이터)를 줄인다.
 */
export function LazyMount({
  children,
  minHeight = 400,
  rootMargin = '300px',
}: {
  children: ReactNode
  minHeight?: number
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (show) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [show, rootMargin])

  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  )
}
