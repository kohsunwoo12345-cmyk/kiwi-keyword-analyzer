'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

// 알림 팝업의 미디어 — 동영상 우선(자동재생 + 소리 ON, 크기 맞춤형), 없으면 사진.
// 소리 자동재생이 브라우저에 막히면: 음소거로 즉시 재생 → 방문자의 "첫 상호작용"(마우스 이동·스크롤·클릭·터치)이
// 감지되는 순간 자동으로 소리를 켠다. 별도의 "소리 켜기" 클릭이 필요 없다.
export function NoticeMedia({ imageUrl, videoUrl }: { imageUrl?: string; videoUrl?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    if (!videoUrl) return
    const v = ref.current
    if (!v) return
    const EVTS = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'mousemove', 'scroll', 'click'] as const
    let unmuteHandler: (() => void) | null = null
    const removeArmed = () => { if (unmuteHandler) { EVTS.forEach((e) => window.removeEventListener(e, unmuteHandler as any, true)); unmuteHandler = null } }
    const soundOn = () => { v.muted = false; v.volume = 1; setMuted(false); v.play().catch(() => {}) }
    const armAutoUnmute = () => {
      if (unmuteHandler) return
      unmuteHandler = () => { soundOn(); removeArmed() }
      EVTS.forEach((e) => window.addEventListener(e, unmuteHandler as any, { capture: true, passive: true }))
    }
    // 1) 우선 소리 켠 상태로 자동재생 시도
    v.muted = false; v.volume = 1
    const p = v.play()
    if (p && typeof p.then === 'function') {
      p.then(() => setMuted(false)).catch(() => {
        // 2) 차단됨 → 음소거로 즉시 재생하고, 첫 상호작용 때 자동으로 소리 켜기
        v.muted = true; setMuted(true)
        v.play().catch(() => {})
        armAutoUnmute()
      })
    }
    return removeArmed
  }, [videoUrl])

  function toggleMute() {
    const v = ref.current
    if (!v) return
    const next = !v.muted
    v.muted = next
    if (!next) v.volume = 1
    setMuted(next)
    v.play().catch(() => {})
  }

  if (videoUrl) {
    return (
      <div className="relative w-full bg-black">
        {/* 크기 맞춤형: 가로 100%, 세로는 원본 비율 유지 */}
        <video
          ref={ref}
          src={videoUrl}
          className="block h-auto max-h-[60vh] w-full"
          autoPlay
          playsInline
          loop
          controls
          preload="auto"
        />
        {/* 소리 상태 토글(보조) — 자동으로 켜지지만 방문자가 원하면 끌 수 있게 */}
        <button
          onClick={toggleMute}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
          className="absolute bottom-2.5 right-2.5 inline-flex items-center justify-center rounded-full bg-black/60 p-2 text-white shadow-lg backdrop-blur transition hover:bg-black/80"
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    )
  }
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className="max-h-44 w-full object-cover" />
  }
  return null
}
