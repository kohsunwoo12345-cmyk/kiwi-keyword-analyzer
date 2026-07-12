'use client'

import { useEffect, useState } from 'react'
import { Clapperboard, Wand2, Play, Download, Film, Camera } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'
import { videoStyles, videoMotions, videoGallery } from '@/lib/mock'

const RATIOS = [
  { label: '9:16 숏폼', v: 'aspect-[9/16]' },
  { label: '16:9 가로', v: 'aspect-video' },
  { label: '1:1 정방', v: 'aspect-square' },
]

const GRADS = [
  'from-violet-500 to-indigo-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-500 to-teal-500',
]

interface Gen {
  title: string
  style: string
  ratio: string
  grad: string
}

export default function VideoPage() {
  const [prompt, setPrompt] = useState('노을 지는 해변을 걷는 여성, 시네마틱한 광고 영상')
  const [style, setStyle] = useState(videoStyles[0].name)
  const [motion, setMotion] = useState(videoMotions[0])
  const [ratio, setRatio] = useState(RATIOS[0])
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<Gen | null>(null)

  useEffect(() => {
    if (!generating) return
    setProgress(0)
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer)
          setGenerating(false)
          setResult({
            title: prompt.slice(0, 24) + (prompt.length > 24 ? '…' : ''),
            style,
            ratio: ratio.v,
            grad: GRADS[Math.floor(prompt.length % GRADS.length)],
          })
          return 100
        }
        return p + 5
      })
    }, 90)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Clapperboard}
        eyebrow="07 · AI 영상"
        title="AI 영상 제작"
        desc="텍스트 프롬프트만으로 광고·숏폼 영상을 생성합니다. (Higgsfield 스타일)"
        accent="#a855f7"
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[420px_1fr] lg:p-8">
        {/* Generator controls */}
        <Panel title="영상 생성">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">프롬프트</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="만들고 싶은 영상을 설명하세요..."
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--text-soft)]">스타일</label>
              <div className="grid grid-cols-2 gap-2">
                {videoStyles.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setStyle(s.name)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      style === s.name
                        ? 'border-violet-500/60 bg-violet-500/10'
                        : 'border-[var(--border)] hover:border-white/20'
                    }`}
                  >
                    <div className="text-lg">{s.emoji}</div>
                    <div className="mt-1 text-sm font-semibold">{s.name}</div>
                    <div className="mt-0.5 text-[11px] leading-tight text-[var(--text-dim)]">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--text-soft)]">
                <Camera size={12} className="mr-1 inline" /> 카메라 모션
              </label>
              <div className="flex flex-wrap gap-1.5">
                {videoMotions.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMotion(m)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      motion === m
                        ? 'border-violet-500/60 bg-violet-500/15 text-violet-300'
                        : 'border-[var(--border)] text-[var(--text-soft)] hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--text-soft)]">화면 비율</label>
              <div className="grid grid-cols-3 gap-2">
                {RATIOS.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setRatio(r)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      ratio.label === r.label
                        ? 'border-violet-500/60 bg-violet-500/15 text-violet-300'
                        : 'border-[var(--border)] text-[var(--text-soft)] hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setGenerating(true)}
              disabled={generating || !prompt.trim()}
              className="w-full"
            >
              <Wand2 size={16} /> {generating ? '생성 중...' : '영상 생성하기'}
            </Button>
          </div>
        </Panel>

        {/* Preview + gallery */}
        <div className="space-y-6">
          <Panel title="미리보기">
            <div className="flex justify-center">
              <div
                className={`relative ${ratio.v} w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel-2)]`}
              >
                {generating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="h-12 w-12 animate-spin-slow rounded-full border-2 border-violet-500/30 border-t-violet-500" />
                    <div className="w-3/4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full brand-gradient transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-center text-xs text-[var(--text-soft)]">
                        AI가 영상을 생성하는 중... {progress}%
                      </p>
                    </div>
                  </div>
                ) : result ? (
                  <div className={`absolute inset-0 bg-gradient-to-br ${result.grad}`}>
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Play size={26} className="ml-1 text-white" fill="white" />
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-sm font-semibold text-white">{result.title}</p>
                      <p className="text-xs text-white/70">
                        {result.style} · {motion}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-[var(--text-dim)]">
                    <Film size={40} />
                    <p className="text-sm">프롬프트를 입력하고
                      <br />생성 버튼을 눌러보세요</p>
                  </div>
                )}
              </div>
            </div>
            {result && !generating && (
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" size="sm">
                  <Play size={15} /> 재생
                </Button>
                <Button variant="outline" size="sm">
                  <Download size={15} /> 다운로드
                </Button>
                <Button size="sm" onClick={() => setGenerating(true)}>
                  <Wand2 size={15} /> 재생성
                </Button>
              </div>
            )}
          </Panel>

          <Panel title="최근 생성된 영상">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {videoGallery.map((g) => (
                <div
                  key={g.title}
                  className="group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${g.grad}`} />
                  <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white/25 backdrop-blur-sm">
                      <Play size={18} className="ml-0.5 text-white" fill="white" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                    <p className="truncate text-xs font-semibold text-white">{g.title}</p>
                    <p className="text-[10px] text-white/70">
                      {g.style} · {g.dur}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
