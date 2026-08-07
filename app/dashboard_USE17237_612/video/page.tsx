'use client'

/* AI 영상 제작 — 노드 스튜디오를 대시보드 안에서 연다.
 *
 * ⚠ 여기엔 원래 <iframe src="/tools/video?embed=1"> 이 있었다. 그런데 그 파일은
 *   이 저장소에 한 번도 있던 적이 없다(git 이력 확인). 즉 메뉴를 눌러도 빈 화면이었다.
 *   실제 스튜디오는 /studio-nvc-prv-8b3k2/ 에 있고, 관리자 화면·소개 화면·
 *   내 영상 관리는 모두 그 주소를 쓰고 있었다 — 이 화면만 없는 주소를 보고 있었다.
 */

import { useEffect, useState } from 'react'
import { Clapperboard, ExternalLink, Film, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Button } from '@/components/ui'

const STUDIO_URL = '/studio-nvc-prv-8b3k2/'
const ACCENT = '#3b82f6'

export default function VideoStudioPage() {
  const [ready, setReady] = useState(false)

  /*  스튜디오는 큰 앱이라 첫 그림까지 시간이 걸린다.
      그동안 흰 사각형만 보이면 "또 빈 화면" 으로 읽힌다 — 불러오는 중임을 알린다. */
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 8000) // 혹시 load 가 안 와도 가림막은 걷는다
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="animate-fade-in flex h-[calc(100vh-56px)] min-h-[720px] flex-col lg:h-screen">
      <PageHeader
        icon={Clapperboard}
        eyebrow="영상 제작"
        title="AI 영상 제작"
        desc="노드를 연결해 레퍼런스 이미지부터 최종 영상까지 한 흐름으로 만듭니다."
        accent={ACCENT}
        action={
          <div className="flex gap-2">
            <Button href="/dashboard_USE17237_612/video/library" variant="outline">
              <Film size={16} /> 내 영상 관리
            </Button>
            {/*  Button 은 새 창 열기를 받지 않는다 — 여기만 순수 <a> 로 둔다 */}
            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
            >
              <ExternalLink size={16} /> 새 창에서 열기
            </a>
          </div>
        }
      />

      <div className="relative min-h-0 flex-1">
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[var(--bg)] text-[13px] text-[var(--text-dim)]">
            <Loader2 className="h-4 w-4 animate-spin" /> 스튜디오를 불러오는 중…
          </div>
        )}
        <iframe
          src={STUDIO_URL}
          title="AI 영상 제작 스튜디오"
          onLoad={() => setReady(true)}
          className="block h-full w-full border-0"
          allow="clipboard-write; fullscreen"
        />
      </div>
    </div>
  )
}
