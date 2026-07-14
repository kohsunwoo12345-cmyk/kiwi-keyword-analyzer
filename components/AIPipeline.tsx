'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Type,
  Image as ImageIcon,
  SlidersHorizontal,
  Cpu,
  Film,
  Play,
  ArrowRight,
  ArrowDown,
  Check,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Reveal } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const M: Dict = {
  '실제 작동하는 AI 파이프라인': { en: 'A real, working AI pipeline', ja: '実際に動くAIパイプライン', zh: '真实运行的 AI 流水线' },
  '컨트롤넷과 AI가': { en: 'ControlNet and AI,', ja: 'ControlNetとAIが', zh: 'ControlNet 与 AI，' },
  '하나의 파이프라인으로': { en: 'in one pipeline', ja: '一つのパイプラインに', zh: '汇为一条流水线' },
  '프롬프트 한 줄에서 레퍼런스 이미지를 만들고, ControlNet으로 정밀하게 제어해, 최상위 AI 영상 모델로 완성합니다. 모든 단계가 하나로 연결되어 실제로 작동합니다.': {
    en: 'From a single prompt, generate a reference image, control it precisely with ControlNet, and finish with top-tier AI video models. Every stage is connected into one flow — and it actually works.',
    ja: '一行のプロンプトからレファレンス画像を作り、ControlNetで精密に制御し、最上位のAI動画モデルで仕上げます。すべての工程が一つに繋がり、実際に動作します。',
    zh: '从一行提示词生成参考图，用 ControlNet 精准控制，再由顶级 AI 视频模型完成。每个环节连成一条流水线，真实可用。',
  },
  '프롬프트': { en: 'Prompt', ja: 'プロンプト', zh: '提示词' },
  '한 줄 지시': { en: 'One-line brief', ja: '一行の指示', zh: '一句话指令' },
  '레퍼런스 이미지 생성': { en: 'Reference image', ja: 'レファレンス生成', zh: '参考图生成' },
  '이미지 모델로 레퍼런스 컷 생성': { en: 'Reference cut via image models', ja: '画像モデルでレファレンス生成', zh: '用图像模型生成参考镜头' },
  'ControlNet 제어': { en: 'ControlNet', ja: 'ControlNet制御', zh: 'ControlNet 控制' },
  '캐니·뎁스·포즈로 정밀 제어': { en: 'Canny · Depth · Pose control', ja: 'Canny・Depth・Poseで制御', zh: 'Canny·Depth·Pose 精控' },
  'AI 영상 모델': { en: 'AI video model', ja: 'AI動画モデル', zh: 'AI 视频模型' },
  '최상위 모델로 영상 생성': { en: 'Generate with top models', ja: '最上位モデルで生成', zh: '用顶级模型生成' },
  '최종 영상 출력': { en: 'Final video', ja: '最終動画出力', zh: '成片输出' },
  '4K 고화질 렌더': { en: '4K high-res render', ja: '4K高画質レンダー', zh: '4K 高清渲染' },
  '지금 연결되어 작동 중인 모델': { en: 'Models connected & running now', ja: '今つながって稼働中のモデル', zh: '当前已接入并运行的模型' },
  '작동': { en: 'Live', ja: '稼働', zh: '运行中' },
  '영상 생성': { en: 'Video', ja: '動画', zh: '视频' },
  '이미지·레퍼런스': { en: 'Image · Reference', ja: '画像・レファレンス', zh: '图像·参考' },
  '지금 실시간으로 생성 중': { en: 'Generating live right now', ja: '今リアルタイム生成中', zh: '正在实时生成' },
  '처리 중': { en: 'Processing', ja: '処理中', zh: '处理中' },
  '완료': { en: 'Done', ja: '完了', zh: '完成' },
  '대기': { en: 'Queued', ja: '待機', zh: '等待' },
}

const PROMPT = '노을 지는 해변을 걷는 인물, cinematic · 9:16 · 5s'

type Stage = {
  key: string
  icon: typeof Type
  title: string
  sub: string
  accent: string
  body: React.ReactNode
}

const STAGES: Stage[] = [
  { key: 'prompt', icon: Type, title: '프롬프트', sub: '한 줄 지시', accent: '#38bdf8', body: null },
  {
    key: 'ref', icon: ImageIcon, title: '레퍼런스 이미지 생성', sub: '이미지 모델로 레퍼런스 컷 생성', accent: '#3b82f6',
    body: (
      <div className="relative h-16 overflow-hidden rounded-lg bg-gradient-to-br from-orange-400/70 via-rose-500/50 to-blue-700/70">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.6), transparent 40%)' }} />
        <span className="absolute bottom-1 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-semibold text-white">Flux · Nano Banana</span>
      </div>
    ),
  },
  {
    key: 'control', icon: SlidersHorizontal, title: 'ControlNet 제어', sub: '캐니·뎁스·포즈로 정밀 제어', accent: '#6366f1',
    body: (
      <div className="grid grid-cols-3 gap-1">
        {[
          { l: 'Canny', bg: 'from-slate-100/10 to-white/20' },
          { l: 'Depth', bg: 'from-blue-500/30 to-slate-900/60' },
          { l: 'Pose', bg: 'from-emerald-400/30 to-slate-900/60' },
        ].map((c) => (
          <div key={c.l} className={cn('relative h-10 rounded bg-gradient-to-br', c.bg)}>
            <span className="absolute bottom-0.5 left-1 text-[7px] font-bold text-white/90">{c.l}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'model', icon: Cpu, title: 'AI 영상 모델', sub: '최상위 모델로 영상 생성', accent: '#2563eb',
    body: (
      <div className="space-y-1">
        {['Google Veo 3.1', 'Seedance 2.0', 'Runway Gen-4'].map((m, i) => (
          <div key={m} className="flex items-center justify-between rounded bg-black/40 px-1.5 py-1 text-[9px] text-blue-100">
            <span className="font-semibold">{m}</span>
            <span className={cn('h-1.5 w-1.5 rounded-full', i === 0 ? 'bg-emerald-400' : 'bg-blue-400/60')} />
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'output', icon: Film, title: '최종 영상 출력', sub: '4K 고화질 렌더', accent: '#22d3ee',
    body: (
      <div className="relative flex h-16 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-cyan-700/70 via-slate-900 to-blue-800/70">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur">
          <Play size={16} className="ml-0.5 text-white" fill="white" />
        </span>
        <span className="absolute bottom-1 right-1.5 rounded bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold text-white">4K · 완료</span>
      </div>
    ),
  },
]

const MODELS_VIDEO = ['Google Veo 3.1', 'Seedance 2.0', 'Seedance 2.0 Fast', 'Runway Gen-4', 'Runway Aleph', 'Luma Ray 2', 'MiniMax Hailuo 02', 'Seedance 1.0 Pro']
const MODELS_IMAGE = ['Flux 1.1 Pro', 'Nano Banana', 'GPT Image', 'Grok Imagine']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 실제 라이브로 진행되는 파이프라인 — 프롬프트 타이핑 → 단계별 처리 → 완료, 무한 반복 */
function LivePipeline({ t }: { t: (s: string) => string }) {
  // doneUpto: 완료된 마지막 스테이지 인덱스(-1=없음). 활성 스테이지 = doneUpto+1
  const [doneUpto, setDoneUpto] = useState(-1)
  const [typed, setTyped] = useState('')
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    ;(async () => {
      // prefers-reduced-motion: 애니메이션 없이 완료 상태로 고정
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setTyped(PROMPT)
        setDoneUpto(STAGES.length - 1)
        return
      }
      while (aliveRef.current) {
        setTyped('')
        setDoneUpto(-1)
        await sleep(650)
        if (!aliveRef.current) return
        // 1) 프롬프트 타이핑 (스테이지 0 활성)
        for (let i = 1; i <= PROMPT.length; i++) {
          if (!aliveRef.current) return
          setTyped(PROMPT.slice(0, i))
          await sleep(38)
        }
        await sleep(380)
        if (!aliveRef.current) return
        setDoneUpto(0) // 프롬프트 완료 → 스테이지 1 처리 시작
        // 2) 이후 스테이지 순차 처리
        for (let s = 1; s < STAGES.length; s++) {
          await sleep(1150)
          if (!aliveRef.current) return
          setDoneUpto(s)
        }
        await sleep(2000) // 완료 상태 유지 후 재시작
      }
    })()
    return () => {
      aliveRef.current = false
    }
  }, [])

  const active = doneUpto + 1 // 현재 처리 중인 스테이지 (== STAGES.length 이면 전체 완료)

  return (
    <div className="mt-14 flex flex-col items-stretch gap-4 lg:flex-row lg:items-stretch">
      {STAGES.map((s, i) => {
        const Icon = s.icon
        const status: 'done' | 'active' | 'pending' = i <= doneUpto ? 'done' : i === active ? 'active' : 'pending'
        return (
          <div key={s.key} className="flex flex-1 flex-col items-center lg:flex-row">
            <div className="w-full">
              <div
                className={cn(
                  'card relative h-full overflow-hidden p-4 transition-all duration-500',
                  status === 'pending' && 'opacity-55',
                  status === 'active' && 'shadow-[0_0_0_1.5px_var(--sa),0_18px_50px_-20px_var(--sa)]',
                )}
                style={{ ['--sa' as string]: s.accent }}
              >
                {status === 'active' && (
                  <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: s.accent, animation: 'loadbar 1.1s ease-in-out infinite' }} />
                )}
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-opacity duration-500"
                  style={{ background: s.accent, opacity: status === 'pending' ? 0.12 : 0.34 }}
                />
                <div className="relative flex items-center gap-2">
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${s.accent}, #2563eb)` }}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[var(--text-dim)]">STEP {i + 1}</p>
                    <h3 className="truncate text-sm font-bold leading-tight">{t(s.title)}</h3>
                  </div>
                  {/* 상태 뱃지 */}
                  <StatusChip status={status} t={t} accent={s.accent} />
                </div>
                <p className="relative mt-2 line-clamp-1 text-[11px] text-[var(--text-soft)]">{t(s.sub)}</p>
                <div className="relative mt-3">
                  {s.key === 'prompt' ? (
                    <div className="min-h-[3.4rem] rounded-lg bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-sky-200/90">
                      {typed}
                      {status === 'active' && <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-sky-300 align-middle" />}
                    </div>
                  ) : (
                    <div className={cn('transition-opacity duration-500', status === 'pending' && 'opacity-70')}>{s.body}</div>
                  )}
                </div>
              </div>
            </div>

            {/* 연결 화살표 (흐름이 지나가면 밝아짐) */}
            {i < STAGES.length - 1 && (
              <div className="flex items-center justify-center py-1 lg:px-1 lg:py-0">
                <span
                  className={cn('grid h-7 w-7 place-items-center rounded-full border transition-all duration-500', i < active ? 'border-blue-400/60 bg-blue-500/25 text-blue-200' : 'border-white/10 bg-white/[0.04] text-slate-500')}
                >
                  <ArrowRight size={15} className="hidden lg:block" />
                  <ArrowDown size={15} className="lg:hidden" />
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StatusChip({ status, t, accent }: { status: 'done' | 'active' | 'pending'; t: (s: string) => string; accent: string }) {
  if (status === 'done') {
    return (
      <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
        <Check size={10} /> {t('완료')}
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: `${accent}22`, color: accent }}>
        <Loader2 size={10} className="animate-spin" /> {t('처리 중')}
      </span>
    )
  }
  return (
    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
      {t('대기')}
    </span>
  )
}

export function AIPipeline() {
  const t = useT(M)
  return (
    <section className="relative overflow-hidden border-t border-white/10 py-24">
      <div className="animate-drift pointer-events-none absolute left-1/4 top-0 h-[360px] w-[680px] rounded-full bg-blue-700/15 blur-[150px]" />
      <div className="relative mx-auto max-w-7xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>
            <Sparkles size={13} /> {t('실제 작동하는 AI 파이프라인')}
          </SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {t('컨트롤넷과 AI가')} <span className="brand-text">{t('하나의 파이프라인으로')}</span>
          </h2>
          <p className="mt-5 text-balance text-lg leading-relaxed text-[var(--text-soft)]">
            {t('프롬프트 한 줄에서 레퍼런스 이미지를 만들고, ControlNet으로 정밀하게 제어해, 최상위 AI 영상 모델로 완성합니다. 모든 단계가 하나로 연결되어 실제로 작동합니다.')}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {t('지금 실시간으로 생성 중')}
          </div>
        </Reveal>

        {/* 라이브 파이프라인 */}
        <LivePipeline t={t} />

        {/* 작동 중인 모델 목록 */}
        <Reveal delay={120} className="mt-14">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-soft)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t('지금 연결되어 작동 중인 모델')}
            </p>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{t('영상 생성')}</div>
            <div className="flex flex-wrap gap-2">
              {MODELS_VIDEO.map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-200">
                  <Check size={12} className="text-emerald-400" />
                  {m}
                  <span className="ml-0.5 rounded-full bg-emerald-500/15 px-1.5 text-[9px] font-bold text-emerald-300">{t('작동')}</span>
                </span>
              ))}
            </div>
            <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{t('이미지·레퍼런스')}</div>
            <div className="flex flex-wrap gap-2">
              {MODELS_IMAGE.map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-200">
                  <Check size={12} className="text-emerald-400" />
                  {m}
                  <span className="ml-0.5 rounded-full bg-emerald-500/15 px-1.5 text-[9px] font-bold text-emerald-300">{t('작동')}</span>
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
