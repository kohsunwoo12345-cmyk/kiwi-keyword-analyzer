'use client'

import Link from 'next/link'
import { Clapperboard, Play, Check, ArrowRight, Sparkles, Wand2, Film } from 'lucide-react'
import { Button } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const M: Dict = {
  'AI 영상 스튜디오': { en: 'AI Video Studio', ja: 'AI動画スタジオ', zh: 'AI 视频工作室' },
  '프롬프트 한 줄로': { en: 'From one prompt,', ja: '一行のプロンプトで', zh: '一句提示词，' },
  '완성되는 브랜드 영상': { en: 'a finished brand video', ja: 'ブランド動画が完成', zh: '生成成片品牌视频' },
  'BYGENCY의 핵심은 노드형 AI 영상 스튜디오입니다. 레퍼런스 이미지 생성부터 ControlNet 정밀 제어, 최상위 영상 모델까지 하나의 흐름에서 광고·숏폼 영상을 완성합니다.': {
    en: 'At the heart of BYGENCY is a node-based AI video studio. From reference image generation to precise ControlNet control and top-tier video models, it produces ads and short-form video in one flow.',
    ja: 'BYGENCYの核心はノード型AI動画スタジオです。レファレンス画像生成からControlNetの精密制御、最上位の動画モデルまで、一つの流れで広告・ショート動画を完成させます。',
    zh: 'BYGENCY 的核心是节点式 AI 视频工作室。从参考图生成到 ControlNet 精准控制，再到顶级视频模型，在一条流水线中完成广告与短视频。',
  },
  '텍스트 → 광고·숏폼 영상 자동 생성': { en: 'Text → ads & short-form video, auto-generated', ja: 'テキスト→広告・ショート動画を自動生成', zh: '文本 → 广告与短视频自动生成' },
  '카메라 모션·씬 전환 프리셋': { en: 'Camera motion & scene-transition presets', ja: 'カメラモーション・シーン転換プリセット', zh: '运镜与转场预设' },
  'ControlNet 정밀 제어 (캐니·뎁스·포즈)': { en: 'Precise ControlNet control (Canny · Depth · Pose)', ja: 'ControlNet精密制御（Canny・Depth・Pose）', zh: 'ControlNet 精准控制（Canny·Depth·Pose）' },
  '브랜드 스타일 학습 · 4K 렌더': { en: 'Brand style learning · 4K render', ja: 'ブランドスタイル学習・4Kレンダー', zh: '品牌风格学习 · 4K 渲染' },
  'AI 영상 제작 살펴보기': { en: 'Explore AI video', ja: 'AI動画を見る', zh: '了解 AI 视频' },
  '작동 중': { en: 'Live', ja: '稼働中', zh: '运行中' },
  '생성 완료': { en: 'Render complete', ja: '生成完了', zh: '生成完成' },
  '프롬프트': { en: 'Prompt', ja: 'プロンプト', zh: '提示词' },
  '노을 지는 해변을 걷는 인물, cinematic': { en: 'A person walking on a sunset beach, cinematic', ja: '夕焼けの浜辺を歩く人物、cinematic', zh: '夕阳海滩上行走的人物，cinematic' },
  '돌리 인': { en: 'Dolly in', ja: 'ドリーイン', zh: '推轨' },
  '광고 영상': { en: 'Ad video', ja: '広告動画', zh: '广告视频' },
  '숏폼': { en: 'Short-form', ja: 'ショート', zh: '短视频' },
}

const POINTS = [
  '텍스트 → 광고·숏폼 영상 자동 생성',
  '카메라 모션·씬 전환 프리셋',
  'ControlNet 정밀 제어 (캐니·뎁스·포즈)',
  '브랜드 스타일 학습 · 4K 렌더',
]

const MODELS = ['Google Veo 3.1', 'Seedance 2.0', 'Runway Gen-4', 'Luma Ray 2']

export function AIVideoShowcase() {
  const t = useT(M)
  return (
    <div className="hairline relative overflow-hidden p-6 shadow-[0_50px_120px_-45px_rgba(37,99,235,0.65)] sm:p-9">
      <div className="animate-drift pointer-events-none absolute -right-10 -top-16 h-72 w-96 rounded-full bg-blue-600/18 blur-[120px]" />
      <div className="relative grid items-center gap-9 lg:grid-cols-2">
        {/* 좌: 카피 */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-blue-200">
            <Clapperboard size={14} /> {t('AI 영상 스튜디오')}
          </span>
          <h3 className="mt-5 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('프롬프트 한 줄로')}
            <br />
            <span className="brand-text">{t('완성되는 브랜드 영상')}</span>
          </h3>
          <p className="mt-4 text-balance leading-relaxed text-[var(--text-soft)]">
            {t('BYGENCY의 핵심은 노드형 AI 영상 스튜디오입니다. 레퍼런스 이미지 생성부터 ControlNet 정밀 제어, 최상위 영상 모델까지 하나의 흐름에서 광고·숏폼 영상을 완성합니다.')}
          </p>

          <ul className="mt-6 space-y-2.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full brand-gradient text-white">
                  <Check size={12} />
                </span>
                <span className="font-medium text-[var(--text)]">{t(p)}</span>
              </li>
            ))}
          </ul>

          {/* 모델 칩 */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {MODELS.map((m) => (
              <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {m}
              </span>
            ))}
          </div>

          <Button href="/features/video" size="lg" className="group mt-7">
            {t('AI 영상 제작 살펴보기')}
            <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>

        {/* 우: 영상 스튜디오 목업 */}
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0b1220] shadow-2xl">
            {/* 프롬프트 바 */}
            <div className="flex items-center gap-2 border-b border-white/8 bg-white/[0.03] px-3.5 py-2.5">
              <Wand2 size={14} className="flex-shrink-0 text-blue-300" />
              <div className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
                <span className="text-slate-500">{t('프롬프트')} · </span>
                {t('노을 지는 해변을 걷는 인물, cinematic')}
              </div>
              <span className="flex-shrink-0 rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-200">9:16</span>
            </div>

            {/* 프리뷰 */}
            <div className="relative aspect-video overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-rose-500 to-blue-800" />
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 72% 26%, rgba(255,240,190,0.85), transparent 42%)' }} />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
              {/* 재생 버튼 */}
              <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/40">
                <span className="absolute inline-flex h-14 w-14 rounded-full bg-white/25 animate-ping-ring" />
                <Play size={22} className="relative ml-0.5 text-white" fill="white" />
              </span>
              {/* 배지 */}
              <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-black/45 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                <Sparkles size={11} className="text-blue-300" /> Seedance 2.0
              </span>
              <span className="absolute right-2.5 top-2.5 rounded-md bg-emerald-500/90 px-2 py-1 text-[10px] font-bold text-white">4K</span>
              {/* 하단 상태 */}
              <div className="absolute inset-x-2.5 bottom-2.5">
                <div className="flex items-center justify-between text-[10px] font-medium text-white">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                    {t('생성 완료')}
                  </span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 backdrop-blur-sm">{t('돌리 인')}</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/25">
                  <div className="h-full w-full rounded-full brand-gradient" />
                </div>
              </div>
            </div>

            {/* 프레임 타임라인 */}
            <div className="flex items-center gap-1.5 border-t border-white/8 bg-white/[0.02] p-2.5">
              {['from-orange-400 to-rose-600', 'from-rose-500 to-purple-700', 'from-purple-600 to-blue-700', 'from-blue-600 to-cyan-600', 'from-cyan-500 to-emerald-600'].map((g, i) => (
                <div key={i} className={cn('h-8 flex-1 rounded bg-gradient-to-br ring-1', g, i === 0 ? 'ring-blue-400' : 'ring-white/10')} />
              ))}
              <span className="ml-1 flex-shrink-0 grid h-8 w-8 place-items-center rounded bg-blue-500/20 text-blue-300">
                <Film size={14} />
              </span>
            </div>
          </div>

          {/* 태그 */}
          <div className="mt-3 flex justify-center gap-2">
            {['광고 영상', '숏폼'].map((tag) => (
              <span key={tag} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-300">
                {t(tag)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
