'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'

// 알림 팝업의 미디어 — 동영상 우선(자동재생 + 소리 ON, 크기 맞춤형), 없으면 사진.
// 브라우저 자동재생 정책상 소리 재생이 막히면 음소거로 재생하고 "소리 켜기" 버튼을 보여준다(1탭 언뮤트).
export function NoticeMedia({ imageUrl, videoUrl }: { imageUrl?: string; videoUrl?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)
  const [needUnmute, setNeedUnmute] = useState(false)

  useEffect(() => {
    if (!videoUrl) return
    const v = ref.current
    if (!v) return
    v.muted = false
    v.volume = 1
    const p = v.play()
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        // 소리 자동재생 차단 → 음소거로 재생 + 언뮤트 버튼 노출
        v.muted = true
        setMuted(true); setNeedUnmute(true)
        v.play().catch(() => {})
      })
    }
  }, [videoUrl])

  function unmute() {
    const v = ref.current
    if (!v) return
    v.muted = false
    v.volume = 1
    setMuted(false); setNeedUnmute(false)
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
        {needUnmute && (
          <button
            onClick={unmute}
            className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-black/85"
          >
            <Volume2 size={14} /> 소리 켜기
          </button>
        )}
        {muted && !needUnmute && null}
      </div>
    )
  }
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className="max-h-44 w-full object-cover" />
  }
  return null
}
