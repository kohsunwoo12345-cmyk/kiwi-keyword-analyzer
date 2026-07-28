'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Cpu,
  Gauge,
  Sparkles,
  Play,
  Check,
  Loader2,
  Layers,
  Move3d,
  Scan,
  Wand2,
  Clapperboard,
  Timer,
  Film,
  CircleDot,
} from 'lucide-react'
import { Reveal, Marquee } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Feature } from '@/lib/features'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* model rack */
  '모델 라인업': { en: 'Model lineup', ja: 'モデルラインナップ', zh: '模型阵容' },
  '최상위 AI 영상 모델을 한 랙에서': { en: 'Every top-tier AI video model in one rack', ja: '最上位のAI動画モデルを一つのラックに', zh: '顶级 AI 视频模型，同一机架' },
  '모델마다 잘하는 게 다릅니다. 컷 하나하나에 가장 어울리는 모델을 골라 붙이고, 결과를 나란히 비교하세요.': {
    en: 'Every model is good at something different. Assign the best-fit model to each cut and compare the results side by side.',
    ja: 'モデルごとに得意分野が違います。カットごとに最適なモデルを割り当て、結果を並べて比較しましょう。',
    zh: '每个模型各有所长。为每个镜头指派最合适的模型，并把结果并排比较。',
  },
  '렌더링 중': { en: 'Rendering', ja: 'レンダリング中', zh: '渲染中' },
  '렌더 완료': { en: 'Render complete', ja: 'レンダー完了', zh: '渲染完成' },
  '화질': { en: 'Quality', ja: '画質', zh: '画质' },
  '속도': { en: 'Speed', ja: '速度', zh: '速度' },
  '모션': { en: 'Motion', ja: 'モーション', zh: '动态' },
  '모델을 눌러 즉시 전환해보세요': { en: 'Tap a model to switch instantly', ja: 'モデルを押すと即座に切り替わります', zh: '点击模型即可即时切换' },
  '모션 정확도': { en: 'Motion accuracy', ja: 'モーション精度', zh: '动作精度' },
  '사운드 동시 생성': { en: 'Sound generated with video', ja: 'サウンド同時生成', zh: '同步生成声音' },
  '캐릭터 일관성': { en: 'Character consistency', ja: 'キャラクターの一貫性', zh: '角色一致性' },
  '멀티샷 연출': { en: 'Multi-shot direction', ja: 'マルチショット演出', zh: '多镜头调度' },
  '자연스러운 물리': { en: 'Natural physics', ja: '自然な物理挙動', zh: '自然物理' },
  '인물 표정 디테일': { en: 'Facial detail', ja: '人物の表情ディテール', zh: '人物表情细节' },
  '추천': { en: 'Top pick', ja: 'おすすめ', zh: '推荐' },

  /* controlnet */
  '정밀 제어': { en: 'Precision control', ja: '精密制御', zh: '精准控制' },
  'ControlNet으로 동작 하나하나까지': { en: 'ControlNet, down to every motion', ja: 'ControlNetで動作の一つひとつまで', zh: 'ControlNet，掌控每一个动作' },
  '포즈·뎁스·엣지·세그먼트를 겹쳐 인물의 자세와 카메라 워크를 고정합니다. 강도를 올릴수록 원본 구도에 더 정확히 붙습니다.': {
    en: 'Layer pose, depth, edge, and segment maps to lock a subject’s posture and the camera work. The higher the strength, the closer it sticks to the source composition.',
    ja: 'ポーズ・深度・エッジ・セグメントを重ね、人物の姿勢とカメラワークを固定します。強度を上げるほど元の構図に忠実になります。',
    zh: '叠加姿势、深度、边缘与分割图，锁定人物姿态与运镜。强度越高，越贴近原始构图。',
  },
  '포즈': { en: 'Pose', ja: 'ポーズ', zh: '姿势' },
  '뎁스': { en: 'Depth', ja: '深度', zh: '深度' },
  '엣지': { en: 'Edge', ja: 'エッジ', zh: '边缘' },
  '세그먼트': { en: 'Segment', ja: 'セグメント', zh: '分割' },
  '관절 18포인트로 자세와 손발 방향까지 고정합니다.': {
    en: 'Eighteen joint points lock posture down to hand and foot direction.',
    ja: '関節18ポイントで姿勢と手足の向きまで固定します。',
    zh: '18 个关节点，连手脚朝向都能固定。',
  },
  '거리 정보를 잡아 원근과 카메라 이동을 안정시킵니다.': {
    en: 'Distance data stabilizes perspective and camera movement.',
    ja: '距離情報を捉え、遠近感とカメラの移動を安定させます。',
    zh: '捕捉距离信息，稳定透视与镜头移动。',
  },
  '윤곽선을 추출해 구도와 형태를 그대로 유지합니다.': {
    en: 'Extracted contours keep the composition and shapes intact.',
    ja: '輪郭線を抽出し、構図と形をそのまま保ちます。',
    zh: '提取轮廓线，原样保留构图与形状。',
  },
  '인물·배경을 분리해 원하는 영역만 바꿉니다.': {
    en: 'Separate subject and background to change only the area you want.',
    ja: '人物と背景を分離し、変えたい領域だけを差し替えます。',
    zh: '分离人物与背景，只替换你想改的区域。',
  },
  '제어 강도': { en: 'Control strength', ja: '制御強度', zh: '控制强度' },
  '원본': { en: 'Source', ja: '元素材', zh: '原图' },
  '제어 맵': { en: 'Control map', ja: '制御マップ', zh: '控制图' },
  '자유롭게': { en: 'Loose', ja: '自由に', zh: '宽松' },
  '원본 그대로': { en: 'Locked to source', ja: '元のまま', zh: '严格贴合' },

  /* timeline */
  '컷 타임라인': { en: 'Cut timeline', ja: 'カットタイムライン', zh: '镜头时间轴' },
  '컷을 늘어놓으면 한 편이 됩니다': { en: 'Line up the cuts and you have a film', ja: 'カットを並べれば一本になります', zh: '把镜头排好，就是一支成片' },
  '노드에서 뽑은 컷을 타임라인에 올리면 렌더 큐가 알아서 돌아갑니다. 컷마다 다른 모델·다른 제어를 써도 톤은 그대로 유지됩니다.': {
    en: 'Drop the cuts from your nodes onto the timeline and the render queue takes over. Use a different model and control per cut — the tone stays consistent.',
    ja: 'ノードから出したカットをタイムラインに載せれば、レンダーキューが自動で回ります。カットごとに違うモデル・違う制御を使ってもトーンは保たれます。',
    zh: '把节点产出的镜头放上时间轴，渲染队列自动跑起来。每个镜头用不同模型、不同控制，调性依然统一。',
  },
  '와이드 오프닝': { en: 'Wide opening', ja: 'ワイドオープニング', zh: '广角开场' },
  '제품 클로즈업': { en: 'Product close-up', ja: '製品クローズアップ', zh: '产品特写' },
  '인물 리액션': { en: 'Talent reaction', ja: '人物リアクション', zh: '人物反应' },
  '트래킹 무빙': { en: 'Tracking move', ja: 'トラッキング移動', zh: '跟踪运镜' },
  '로고 아웃트로': { en: 'Logo outro', ja: 'ロゴアウトロ', zh: 'Logo 收尾' },
  '렌더 큐': { en: 'Render queue', ja: 'レンダーキュー', zh: '渲染队列' },
  '대기': { en: 'Queued', ja: '待機', zh: '排队' },
  '완료': { en: 'Done', ja: '完了', zh: '完成' },
  '총 길이': { en: 'Total length', ja: '総尺', zh: '总时长' },
  '컷': { en: 'cuts', ja: 'カット', zh: '个镜头' },
  '평균 렌더': { en: 'Avg. render', ja: '平均レンダー', zh: '平均渲染' },
  '컷당': { en: 'per cut', ja: '1カットあたり', zh: '每镜头' },
  '방금 이 스튜디오에서 만들어진 컷': { en: 'Cuts just made in this studio', ja: 'たった今このスタジオで作られたカット', zh: '刚在这个工作室里生成的镜头' },
}

/* ───────────────── data ───────────────── */
type Model = {
  id: string
  name: string
  vendor: string
  tag: string
  img: string
  accent: string
  res: string
  quality: number
  speed: number
  motion: number
  pick?: boolean
}

const MODELS: Model[] = [
  { id: 'kling', name: 'Kling 2.5', vendor: 'Kuaishou', tag: '모션 정확도', img: '/images/showcase/7.webp', accent: '#a855f7', res: '1080p · 10s', quality: 96, speed: 78, motion: 94, pick: true },
  { id: 'veo', name: 'Google Veo 3', vendor: 'DeepMind', tag: '사운드 동시 생성', img: '/images/showcase/13.webp', accent: '#3b82f6', res: '4K · 8s', quality: 98, speed: 70, motion: 90 },
  { id: 'runway', name: 'Runway Gen-4', vendor: 'Runway', tag: '캐릭터 일관성', img: '/images/showcase/15.webp', accent: '#22d3ee', res: '1080p · 10s', quality: 92, speed: 88, motion: 86 },
  { id: 'seedance', name: 'Seedance 1.0', vendor: 'ByteDance', tag: '멀티샷 연출', img: '/images/showcase/hero/4.webp', accent: '#f472b6', res: '1080p · 12s', quality: 90, speed: 94, motion: 88 },
  { id: 'luma', name: 'Luma Ray 2', vendor: 'Luma AI', tag: '자연스러운 물리', img: '/images/showcase/10.webp', accent: '#34d399', res: '1080p · 9s', quality: 88, speed: 90, motion: 92 },
  { id: 'hailuo', name: 'Hailuo 02', vendor: 'MiniMax', tag: '인물 표정 디테일', img: '/images/showcase/hero/8.webp', accent: '#fbbf24', res: '1080p · 6s', quality: 91, speed: 85, motion: 89 },
]

const SHOTS = [
  { id: 'S01', label: '와이드 오프닝', model: 'Veo 3', ctrl: 'Depth', dur: 4, img: '/images/showcase/13.webp' },
  { id: 'S02', label: '제품 클로즈업', model: 'Kling 2.5', ctrl: 'Canny', dur: 3, img: '/images/showcase/hero/4.webp' },
  { id: 'S03', label: '인물 리액션', model: 'Hailuo 02', ctrl: 'Pose', dur: 5, img: '/images/showcase/hero/8.webp' },
  { id: 'S04', label: '트래킹 무빙', model: 'Runway Gen-4', ctrl: 'Depth', dur: 4, img: '/images/showcase/15.webp' },
  { id: 'S05', label: '로고 아웃트로', model: 'Seedance', ctrl: 'Seg', dur: 2, img: '/images/showcase/hero/16.webp' },
]

const STRIP = ['1', '3', '4', '5', '6', '9', '11', '12', '14', '16', '17', '20']

/* ───────────────── hooks ───────────────── */
/** 화면에 보이는 동안에만 애니메이션 타이머를 돌린다 (모바일 발열·배터리 보호) */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, inView }
}

/* ───────────────── 1. 모델 랙 ───────────────── */
function ModelRack({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>()
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const active = MODELS[idx]

  // 활성 모델의 렌더 진행률 → 100% 도달 시 다음 모델로 자동 전환
  useEffect(() => {
    if (!inView) return
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setIdx((i) => (i + 1) % MODELS.length)
          return 0
        }
        return p + 2
      })
    }, 70)
    return () => clearInterval(timer)
  }, [inView])

  function pick(i: number) {
    setIdx(i)
    setProgress(0)
  }

  const rendering = progress < 100

  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="animate-drift pointer-events-none absolute right-0 top-16 h-[380px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${active.accent}22` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('모델 라인업')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t('최상위 AI 영상 모델을 한 랙에서')}
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('모델마다 잘하는 게 다릅니다. 컷 하나하나에 가장 어울리는 모델을 골라 붙이고, 결과를 나란히 비교하세요.')}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* 모델 리스트 */}
          <Reveal variant="left">
            <div className="flex h-full flex-col gap-2">
              {MODELS.map((m, i) => {
                const on = i === idx
                return (
                  <button
                    key={m.id}
                    onClick={() => pick(i)}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-300',
                      on
                        ? 'border-white/20 bg-white/[0.07] shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]',
                    )}
                  >
                    {/* 좌측 액센트 바 */}
                    <span
                      className="absolute inset-y-0 left-0 w-[3px] origin-top transition-transform duration-500"
                      style={{ background: m.accent, transform: `scaleY(${on ? 1 : 0})` }}
                    />
                    <div className="flex items-center gap-3">
                      <span
                        className="relative grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                        style={{ background: `${m.accent}1f`, color: m.accent }}
                      >
                        <Cpu size={16} />
                        {on && rendering && (
                          <span
                            className="animate-ping-ring absolute inset-0 rounded-xl"
                            style={{ border: `1px solid ${m.accent}` }}
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--text)]">{m.name}</span>
                          {m.pick && (
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide"
                              style={{ background: `${m.accent}22`, color: m.accent }}
                            >
                              {t('추천')}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]">
                          {m.vendor} · {t(m.tag)}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-[10px] font-medium text-[var(--text-dim)]">{m.res}</span>
                    </div>

                    {/* 스펙 바 — 활성 모델만 펼쳐짐 */}
                    <div
                      className="grid overflow-hidden transition-all duration-500"
                      style={{ gridTemplateRows: on ? '1fr' : '0fr', opacity: on ? 1 : 0 }}
                    >
                      <div className="min-h-0">
                        <div className="mt-3 space-y-1.5 pl-12">
                          {([
                            ['화질', m.quality],
                            ['속도', m.speed],
                            ['모션', m.motion],
                          ] as const).map(([label, v]) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="w-8 flex-shrink-0 text-[10px] text-[var(--text-dim)]">{t(label)}</span>
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                                <span
                                  className="block h-full rounded-full transition-[width] duration-700 ease-out"
                                  style={{ width: on ? `${v}%` : '0%', background: m.accent }}
                                />
                              </span>
                              <span className="w-6 flex-shrink-0 text-right text-[10px] font-semibold tabular-nums text-[var(--text-soft)]">
                                {v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
              <p className="mt-1 text-center text-[11px] text-[var(--text-dim)]">{t('모델을 눌러 즉시 전환해보세요')}</p>
            </div>
          </Reveal>

          {/* 프리뷰 스테이지 */}
          <Reveal variant="right">
            <div className="relative h-full">
              <div
                className="vs-glow absolute -inset-[1px] rounded-3xl blur-[2px] transition-all duration-700"
                style={{ background: `linear-gradient(140deg, ${active.accent}, transparent 60%)` }}
              />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16]">
                {/* 상단 바 */}
                <div className="flex items-center gap-2 border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 truncate rounded-md bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-[var(--text-dim)]">
                    render · {active.id}
                  </span>
                  <span
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: `${active.accent}1f`, color: active.accent }}
                  >
                    {rendering ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    {rendering ? t('렌더링 중') : t('렌더 완료')}
                  </span>
                </div>

                {/* 프레임 */}
                <div className="relative aspect-video overflow-hidden bg-[#05070e]">
                  {MODELS.map((m, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={m.id}
                      src={m.img}
                      alt={m.name}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        'absolute inset-0 h-full w-full object-cover transition-all duration-[900ms] ease-out',
                        i === idx ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
                      )}
                    />
                  ))}
                  {/* 스캔 라인 */}
                  {rendering && (
                    <span
                      className="vs-scan pointer-events-none absolute inset-x-0 h-[2px]"
                      style={{ background: `linear-gradient(90deg, transparent, ${active.accent}, transparent)`, boxShadow: `0 0 18px ${active.accent}` }}
                    />
                  )}
                  {/* 진행 상황 오버레이 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-3 pt-10">
                    <div className="flex items-center justify-between text-[11px] font-medium text-white/90">
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles size={12} style={{ color: active.accent }} />
                        {active.name}
                      </span>
                      <span className="tabular-nums">{Math.min(100, progress)}%</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full transition-[width] duration-100"
                        style={{ width: `${Math.min(100, progress)}%`, background: active.accent }}
                      />
                    </div>
                  </div>
                  {/* 재생 버튼 */}
                  {!rendering && (
                    <span className="animate-fade-in absolute inset-0 grid place-items-center">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-white/20 backdrop-blur">
                        <Play size={24} className="ml-0.5 text-white" fill="white" />
                      </span>
                    </span>
                  )}
                </div>

                {/* 하단 메타 */}
                <div className="grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07]">
                  {([
                    [Gauge, '화질', `${active.quality}`],
                    [Timer, '속도', `${active.speed}`],
                    [Move3d, '모션', `${active.motion}`],
                  ] as const).map(([Icon, label, v]) => (
                    <div key={label} className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)]">
                        <Icon size={11} /> {t(label)}
                      </span>
                      <span className="mt-1 block text-lg font-bold tabular-nums" style={{ color: active.accent }}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────────── 2. ControlNet 스코프 ───────────────── */
type Mode = 'pose' | 'depth' | 'canny' | 'seg'
const MODES: { id: Mode; label: string; icon: typeof Move3d; desc: string; accent: string }[] = [
  { id: 'pose', label: '포즈', icon: Move3d, desc: '관절 18포인트로 자세와 손발 방향까지 고정합니다.', accent: '#a855f7' },
  { id: 'depth', label: '뎁스', icon: Layers, desc: '거리 정보를 잡아 원근과 카메라 이동을 안정시킵니다.', accent: '#38bdf8' },
  { id: 'canny', label: '엣지', icon: Scan, desc: '윤곽선을 추출해 구도와 형태를 그대로 유지합니다.', accent: '#34d399' },
  { id: 'seg', label: '세그먼트', icon: Wand2, desc: '인물·배경을 분리해 원하는 영역만 바꿉니다.', accent: '#f472b6' },
]

function ControlNetScope({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>()
  const [mode, setMode] = useState<Mode>('pose')
  const [strength, setStrength] = useState(72)
  const [auto, setAuto] = useState(true)
  const current = MODES.find((m) => m.id === mode)!

  useEffect(() => {
    if (!auto || !inView) return
    const timer = setInterval(() => {
      setMode((m) => MODES[(MODES.findIndex((x) => x.id === m) + 1) % MODES.length].id)
    }, 4200)
    return () => clearInterval(timer)
  }, [auto, inView])

  const op = 0.2 + (strength / 100) * 0.8

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-20">
      <div
        className="animate-drift-slow pointer-events-none absolute left-0 top-10 h-[360px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${current.accent}20` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('정밀 제어')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t('ControlNet으로 동작 하나하나까지')}
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('포즈·뎁스·엣지·세그먼트를 겹쳐 인물의 자세와 카메라 워크를 고정합니다. 강도를 올릴수록 원본 구도에 더 정확히 붙습니다.')}
          </p>
        </Reveal>

        {/* 모드 탭 */}
        <Reveal className="mt-10 flex flex-wrap justify-center gap-2">
          {MODES.map((m) => {
            const Icon = m.icon
            const on = m.id === mode
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id)
                  setAuto(false)
                }}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300',
                  on ? 'text-white' : 'border-white/10 bg-white/[0.03] text-[var(--text-soft)] hover:border-white/25 hover:text-white',
                )}
                style={on ? { borderColor: m.accent, background: `${m.accent}22`, boxShadow: `0 8px 26px -14px ${m.accent}` } : undefined}
              >
                <Icon size={15} style={{ color: on ? m.accent : undefined }} className="transition-transform duration-300 group-hover:scale-110" />
                {t(m.label)}
              </button>
            )
          })}
        </Reveal>

        <div className="mt-8 grid items-center gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          {/* 스테이지 */}
          <Reveal variant="scale" className="mx-auto w-full max-w-[420px]">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#05070e] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
              <div className="relative aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/showcase/hero/11.webp"
                  alt={t('원본')}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-700"
                  style={{ filter: `saturate(${1 - strength / 200}) brightness(${1 - strength / 400})` }}
                />
                <ControlOverlay mode={mode} accent={current.accent} opacity={op} strength={strength} />

                {/* 코너 라벨 */}
                <span className="absolute left-3 top-3 rounded-md bg-black/45 px-2 py-1 text-[10px] font-semibold text-white/85 backdrop-blur">
                  {t('원본')}
                </span>
                <span
                  className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold backdrop-blur"
                  style={{ background: `${current.accent}2e`, color: current.accent }}
                >
                  <CircleDot size={10} /> {t('제어 맵')} · {current.id.toUpperCase()}
                </span>

                {/* 코너 프레임 마커 */}
                {[
                  'left-2 top-2 border-l-2 border-t-2',
                  'right-2 top-2 border-r-2 border-t-2',
                  'left-2 bottom-2 border-b-2 border-l-2',
                  'right-2 bottom-2 border-b-2 border-r-2',
                ].map((c) => (
                  <span key={c} className={cn('pointer-events-none absolute h-5 w-5 rounded-[3px]', c)} style={{ borderColor: `${current.accent}88` }} />
                ))}
              </div>

              {/* 강도 슬라이더 */}
              <div className="border-t border-white/[0.07] bg-white/[0.02] px-5 py-4">
                <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-soft)]">
                  <span>{t('제어 강도')}</span>
                  <span className="tabular-nums font-bold" style={{ color: current.accent }}>
                    {strength}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  aria-label={t('제어 강도')}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white outline-none"
                  style={{ accentColor: current.accent }}
                />
                <div className="mt-1.5 flex justify-between text-[10px] text-[var(--text-dim)]">
                  <span>{t('자유롭게')}</span>
                  <span>{t('원본 그대로')}</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* 모드 설명 카드 */}
          <Reveal variant="right">
            <div className="flex h-full flex-col gap-3">
              {MODES.map((m) => {
                const Icon = m.icon
                const on = m.id === mode
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id)
                      setAuto(false)
                    }}
                    className={cn(
                      'flex flex-1 items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300',
                      on ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.045]',
                    )}
                  >
                    <span
                      className={cn('grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl transition-transform duration-300', on && 'scale-110')}
                      style={{ background: `${m.accent}1f`, color: m.accent }}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--text)]">
                        {t(m.label)} <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">{m.id}</span>
                      </span>
                      <span className="mt-1 block text-[12.5px] leading-relaxed text-[var(--text-soft)]">{t(m.desc)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/** 모드별 제어 맵 오버레이 — 전부 SVG 로 그려 이미지 없이 가볍게 움직인다 */
function ControlOverlay({ mode, accent, opacity, strength }: { mode: Mode; accent: string; opacity: number; strength: number }) {
  const w = strength / 100
  /* 인물 실루엣 — 스테이지 사진(전신 인물)의 위치에 맞춰 그린 패스 */
  const SILHOUETTE =
    'M101 18 q11 0 11 12 l-1 12 l9 5 q10 4 11 14 l3 34 l-4 34 l-3 0 l-4 66 l-3 40 l-15 0 l-2 -40 l-3 -30 l-3 30 l-2 40 l-15 0 l-3 -40 l-4 -66 l-3 0 l-4 -34 l3 -34 q1 -10 11 -14 l9 -5 l-1 -12 q0 -12 11 -12 z'

  return (
    <svg viewBox="0 0 200 250" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <linearGradient id="vs-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1220" />
          <stop offset="60%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <radialGradient id="vs-depth-sub" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {mode === 'depth' && (
        <g>
          <rect x="0" y="0" width="200" height="250" fill="url(#vs-depth)" />
          <ellipse cx="101" cy="140" rx="46" ry="104" fill="url(#vs-depth-sub)" />
          <path d={SILHOUETTE} fill="#ffffff" opacity="0.55" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x="0"
              y={34 + i * 36}
              width="200"
              height="0.8"
              fill="#ffffff"
              opacity={0.22}
              style={{ animation: `pulse ${2.4 + i * 0.3}s ease-in-out ${i * 0.18}s infinite` }}
            />
          ))}
        </g>
      )}

      {mode === 'canny' && (
        <g fill="none" stroke={accent} strokeWidth={0.9 + w} strokeLinecap="round">
          <rect x="0" y="0" width="200" height="250" fill="#04060d" opacity="0.86" />
          {/* 인물 윤곽 */}
          <path className="vs-flow" d={SILHOUETTE} />
          <path className="vs-flow" d="M101 47 L101 118" />
          <path className="vs-flow" d="M84 55 L120 55" />
          <path className="vs-flow" d="M88 124 L114 124" />
          {/* 배경 건축 라인 */}
          <path className="vs-flow" d="M62 0 L62 232" />
          <path className="vs-flow" d="M18 30 L18 214" />
          <path className="vs-flow" d="M150 8 L150 224" />
          <path className="vs-flow" d="M0 206 L200 214" />
          <path className="vs-flow" d="M0 232 L200 240" />
          <path className="vs-flow" d="M18 120 L62 118" />
        </g>
      )}

      {mode === 'seg' && (
        <g>
          <rect x="0" y="0" width="200" height="208" fill="#1d4ed8" opacity="0.45" />
          <rect x="0" y="204" width="200" height="46" fill="#f59e0b" opacity="0.5" />
          <path d={SILHOUETTE} fill={accent} opacity="0.75" style={{ animation: 'fadeIn 0.6s ease-out both' }} />
          <path d={SILHOUETTE} fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.55" />
        </g>
      )}

      {mode === 'pose' && (
        <g>
          <rect x="0" y="0" width="200" height="250" fill="#04060d" opacity="0.72" />
          {/* 몸통·다리 */}
          <g stroke={accent} strokeWidth={1.8 + w * 1.4} strokeLinecap="round" fill="none">
            <path d="M101 42 L101 124" />
            <path d="M84 55 L120 55" />
            <path d="M88 124 L114 124" />
            <path d="M88 124 L91 168 L89 216" />
            <path d="M114 124 L108 168 L112 216" />
          </g>
          {/* 팔 — 좌우가 번갈아 흔들린다 */}
          <g
            stroke="#38bdf8"
            strokeWidth={1.8 + w * 1.4}
            strokeLinecap="round"
            fill="none"
            style={{ animation: 'vsSway 3.4s ease-in-out infinite', transformOrigin: '84px 55px', transformBox: 'fill-box' }}
          >
            <path d="M84 55 L79 95 L82 118" />
          </g>
          <g
            stroke="#38bdf8"
            strokeWidth={1.8 + w * 1.4}
            strokeLinecap="round"
            fill="none"
            style={{ animation: 'vsSway 3.4s ease-in-out 1.7s infinite reverse', transformOrigin: '120px 55px', transformBox: 'fill-box' }}
          >
            <path d="M120 55 L125 95 L122 118" />
          </g>
          {/* 머리 */}
          <circle cx="101" cy="30" r={10} stroke={accent} strokeWidth={1.6 + w} fill="none" />
          <path d="M101 40 L101 42" stroke={accent} strokeWidth={1.6 + w} />
          {/* 관절 18포인트 */}
          {[
            [101, 30], [101, 42], [84, 55], [120, 55], [79, 95], [125, 95], [82, 118], [122, 118],
            [101, 88], [88, 124], [114, 124], [91, 168], [108, 168], [89, 216], [112, 216],
            [96, 30], [106, 30], [101, 124],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={1.9 + w * 0.9}
              fill="#ffffff"
              style={{ animation: `pulse ${1.8 + (i % 4) * 0.3}s ease-in-out ${i * 0.08}s infinite` }}
            />
          ))}
        </g>
      )}
    </svg>
  )
}

/* ───────────────── 3. 컷 타임라인 ───────────────── */
function ShotTimeline({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>()
  const total = SHOTS.reduce((a, s) => a + s.dur, 0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!inView) return
    const timer = setInterval(() => setTick((v) => (v + 1) % (total * 10)), 100)
    return () => clearInterval(timer)
  }, [inView, total])

  const playedSec = tick / 10
  const playedPct = (playedSec / total) * 100

  // 현재 재생 헤드가 지난 컷 = 렌더 완료
  let acc = 0
  const shotState = SHOTS.map((s) => {
    const start = acc
    acc += s.dur
    const done = playedSec >= acc
    const running = !done && playedSec > start
    const pct = running ? ((playedSec - start) / s.dur) * 100 : done ? 100 : 0
    return { ...s, start, done, running, pct }
  })

  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1f` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('컷 타임라인')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('컷을 늘어놓으면 한 편이 됩니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('노드에서 뽑은 컷을 타임라인에 올리면 렌더 큐가 알아서 돌아갑니다. 컷마다 다른 모델·다른 제어를 써도 톤은 그대로 유지됩니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            {/* 트랜스포트 바 */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-5 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: `${feature.accent}22`, color: feature.accent }}>
                <Play size={13} className="ml-0.5" fill="currentColor" />
              </span>
              <span className="font-mono text-xs tabular-nums text-[var(--text-soft)]">
                00:{String(Math.floor(playedSec)).padStart(2, '0')} / 00:{String(total).padStart(2, '0')}
              </span>
              <span className="ml-auto hidden items-center gap-2 text-[11px] text-[var(--text-dim)] sm:flex">
                <Clapperboard size={12} /> {SHOTS.length} {t('컷')} · 1080p · 24fps
              </span>
            </div>

            {/* 타임라인 트랙 */}
            <div className="relative px-5 pb-5 pt-6">
              {/* 눈금 */}
              <div className="mb-2 flex justify-between text-[9px] font-medium tabular-nums text-[var(--text-dim)]">
                {Array.from({ length: total / 2 + 1 }, (_, i) => (
                  <span key={i}>{i * 2}s</span>
                ))}
              </div>

              <div className="relative flex gap-1.5">
                {shotState.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      'group relative overflow-hidden rounded-xl border transition-all duration-300',
                      s.running ? 'border-white/25' : 'border-white/[0.08] hover:border-white/20',
                    )}
                    style={{ flex: s.dur }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.img}
                      alt={t(s.label)}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        'h-20 w-full object-cover transition-all duration-700 sm:h-24',
                        s.done || s.running ? 'opacity-100 saturate-100' : 'opacity-45 saturate-50',
                      )}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    {/* 컷 렌더 진행 */}
                    <span
                      className="absolute inset-x-0 bottom-0 h-[3px] transition-[width] duration-100"
                      style={{ width: `${s.pct}%`, background: feature.accent, boxShadow: `0 0 10px ${feature.accent}` }}
                    />
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white/90 backdrop-blur">
                      {s.id}
                    </span>
                    <span className="absolute inset-x-1.5 bottom-1.5">
                      <span className="block truncate text-[10px] font-semibold text-white sm:text-[11px]">{t(s.label)}</span>
                      <span className="mt-0.5 hidden truncate text-[9px] text-white/60 sm:block">
                        {s.model} · {s.ctrl} · {s.dur}s
                      </span>
                    </span>
                    {s.running && (
                      <span
                        className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full"
                        style={{ background: feature.accent }}
                      >
                        <Loader2 size={9} className="animate-spin text-white" />
                      </span>
                    )}
                  </div>
                ))}

                {/* 플레이헤드 */}
                <span
                  className="pointer-events-none absolute inset-y-[-6px] w-[2px] transition-[left] duration-100"
                  style={{ left: `${playedPct}%`, background: '#fff', boxShadow: '0 0 12px rgba(255,255,255,0.9)' }}
                >
                  <span className="absolute -left-[5px] -top-[6px] h-3 w-3 rotate-45 rounded-[2px] bg-white" />
                </span>
              </div>
            </div>

            {/* 렌더 큐 */}
            <div className="border-t border-white/[0.08] bg-white/[0.015] px-5 py-4">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Film size={12} /> {t('렌더 큐')}
              </p>
              <div className="space-y-2">
                {shotState.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-8 flex-shrink-0 font-mono text-[10px] text-[var(--text-dim)]">{s.id}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <span
                        className="block h-full rounded-full transition-[width] duration-100"
                        style={{
                          width: `${s.pct}%`,
                          background: s.done ? '#10b981' : feature.accent,
                        }}
                      />
                    </span>
                    <span
                      className={cn('w-14 flex-shrink-0 text-right text-[10px] font-semibold', s.done ? 'text-emerald-400' : 'text-[var(--text-soft)]')}
                    >
                      {s.done ? t('완료') : s.running ? `${Math.round(s.pct)}%` : t('대기')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 요약 */}
            <div className="grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07]">
              {[
                [t('총 길이'), `00:${String(total).padStart(2, '0')}`],
                [t('컷'), `${SHOTS.length}`],
                [t('평균 렌더'), `48s ${t('컷당')}`],
              ].map(([k, v]) => (
                <div key={k} className="px-4 py-3">
                  <span className="block text-[10px] text-[var(--text-dim)]">{k}</span>
                  <span className="mt-0.5 block text-sm font-bold tabular-nums text-[var(--text)]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 필름 스트립 마퀴 */}
        <Reveal className="mt-8">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[var(--text-dim)]">
            {t('방금 이 스튜디오에서 만들어진 컷')}
          </p>
          <Marquee
            items={STRIP.map((n) => (
              <span key={n} className="group relative block h-24 w-40 overflow-hidden rounded-xl border border-white/10 sm:h-28 sm:w-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/showcase/${n}.webp`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/25 backdrop-blur">
                    <Play size={14} className="ml-0.5 text-white" fill="white" />
                  </span>
                </span>
              </span>
            ))}
          />
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function VideoStudioShowcase({ feature }: { feature: Feature }) {
  return (
    <>
      <ModelRack feature={feature} />
      <ControlNetScope feature={feature} />
      <ShotTimeline feature={feature} />
    </>
  )
}
