'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { Bot, Wrench, Image as ImageIcon, Check, Loader2, Link2, ShieldCheck, Cpu, ArrowRight, Terminal } from 'lucide-react'
import { Reveal } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* conversation */
  '대화 한 줄로': { en: 'One line of chat', ja: '会話一行で', zh: '一句话' },
  '클로드에게 말하면 여기서 만들어집니다': { en: 'Say it to Claude, and it gets made here', ja: 'Claudeに話すと、ここで作られます', zh: '对 Claude 说一句，就在这边生成' },
  '커넥터를 연결해두면 Claude가 BYGENCY 도구를 직접 호출합니다. 창을 옮겨 다닐 필요 없이, 대화 안에서 결과 링크까지 돌아옵니다.': {
    en: 'Once the connector is set up, Claude calls BYGENCY tools directly. No window-hopping — the result link comes back inside the conversation.',
    ja: 'コネクターをつないでおけば、ClaudeがBYGENCYのツールを直接呼び出します。ウィンドウを行き来せず、会話の中に結果リンクまで返ってきます。',
    zh: '连好连接器后，Claude 会直接调用 BYGENCY 的工具。不用来回切窗口，结果链接就在对话里返回。',
  },
  '밤 도심을 달리는 전기차 광고 이미지 만들어줘': {
    en: 'Make an ad image of an EV driving through the city at night',
    ja: '夜の都心を走る電気自動車の広告画像を作って',
    zh: '做一张电动车夜间穿行city的广告图',
  },
  '도구를 호출할게요.': { en: 'Let me call a tool.', ja: 'ツールを呼び出します。', zh: '我来调用一个工具。' },
  '만들었습니다. 결과 링크를 확인해보세요.': {
    en: 'Done — here’s the result link.',
    ja: '作成しました。結果リンクをご確認ください。',
    zh: '做好了，看看结果链接。',
  },
  '도구 호출': { en: 'Tool call', ja: 'ツール呼び出し', zh: '工具调用' },
  '생성 중': { en: 'Generating', ja: '生成中', zh: '生成中' },
  '완료': { en: 'Done', ja: '完了', zh: '完成' },
  '결과': { en: 'Result', ja: '結果', zh: '结果' },
  '이미지 모델 24종 · 영상 모델 34종': { en: '24 image models · 34 video models', ja: '画像モデル24種・動画モデル34種', zh: '24 种图像模型 · 34 种视频模型' },

  /* architecture */
  '연결 구조': { en: 'How it connects', ja: '接続の仕組み', zh: '连接结构' },
  '토큰 복사 없이, 로그인 한 번이면 끝': { en: 'No token copying — one login is all it takes', ja: 'トークンのコピー不要、ログイン一回で完了', zh: '不用复制令牌，登录一次就好' },
  '커넥터에 주소를 넣고 로그인만 하면 내 계정으로 안전하게 연결됩니다. 그 뒤로는 Claude가 필요한 도구를 알아서 골라 씁니다.': {
    en: 'Put the address into the connector, log in, and it’s securely linked to your account. From there Claude picks the tools it needs on its own.',
    ja: 'コネクターに住所を入れてログインするだけで、自分のアカウントに安全につながります。あとはClaudeが必要なツールを自分で選んで使います。',
    zh: '把地址填进连接器再登录，就安全绑定到你的账号。之后 Claude 会自己挑用需要的工具。',
  },
  'Claude 앱': { en: 'Claude app', ja: 'Claudeアプリ', zh: 'Claude 应用' },
  '대화로 요청': { en: 'You ask in chat', ja: '会話でリクエスト', zh: '在对话里提出请求' },
  'MCP 커넥터': { en: 'MCP connector', ja: 'MCPコネクター', zh: 'MCP 连接器' },
  'OAuth 로그인으로 안전 연결': { en: 'Securely linked via OAuth login', ja: 'OAuthログインで安全に接続', zh: '通过 OAuth 登录安全连接' },
  'BYGENCY 모델 풀': { en: 'BYGENCY model pool', ja: 'BYGENCYモデルプール', zh: 'BYGENCY 模型池' },
  '이미지·영상 모델이 실제로 생성': { en: 'Image and video models actually generate', ja: '画像・動画モデルが実際に生成', zh: '图像与视频模型真正执行生成' },
}

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ───────────────── 1. 대화 시연 ───────────────── */
type Phase = 'ask' | 'call' | 'run' | 'done'
const PHASES: Phase[] = ['ask', 'call', 'run', 'done']

function McpConversation() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [phase, setPhase] = useState<Phase>('ask')
  const [typed, setTyped] = useState(0)
  const ask = t('밤 도심을 달리는 전기차 광고 이미지 만들어줘')

  useEffect(() => {
    if (!inView) return
    let id: ReturnType<typeof setTimeout>
    if (phase === 'ask') {
      if (typed < ask.length) id = setTimeout(() => setTyped((v) => v + 1), 42)
      else id = setTimeout(() => setPhase('call'), 700)
    } else if (phase === 'call') {
      id = setTimeout(() => setPhase('run'), 1400)
    } else if (phase === 'run') {
      id = setTimeout(() => setPhase('done'), 2200)
    } else {
      id = setTimeout(() => {
        setTyped(0)
        setPhase('ask')
      }, 3800)
    }
    return () => clearTimeout(id)
  }, [phase, typed, ask, inView])

  const at = PHASES.indexOf(phase)

  return (
    <section className="relative overflow-hidden border-t border-white/10 py-24">
      <div className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[320px] w-[760px] -translate-x-1/2 rounded-full bg-orange-500/12 blur-[140px]" />
      <div ref={ref} className="relative mx-auto max-w-4xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('대화 한 줄로')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('클로드에게 말하면 여기서 만들어집니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('커넥터를 연결해두면 Claude가 BYGENCY 도구를 직접 호출합니다. 창을 옮겨 다닐 필요 없이, 대화 안에서 결과 링크까지 돌아옵니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            {/* 헤더 */}
            <div className="flex items-center gap-2.5 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#d97757]/15 text-[#d97757]">
                <Bot size={16} />
              </span>
              <span className="text-[12.5px] font-semibold text-[var(--text)]">Claude</span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                <Link2 size={10} /> BYGENCY MCP
              </span>
            </div>

            <div className="space-y-3 px-4 py-5 sm:px-5">
              {/* 사용자 요청 */}
              <div className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                  {ask.slice(0, typed)}
                  {phase === 'ask' && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-white/80" style={{ animation: 'pulse 1s steps(2) infinite' }} />}
                </span>
              </div>

              {/* Claude 응답 */}
              {at >= 1 && (
                <div className="animate-bubble-in flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-[#d97757]/15 text-[#d97757]">
                    <Bot size={13} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <span className="inline-block rounded-2xl rounded-tl-md bg-white/[0.06] px-3.5 py-2.5 text-[13px] text-[var(--text-soft)]">
                      {at >= 3 ? t('만들었습니다. 결과 링크를 확인해보세요.') : t('도구를 호출할게요.')}
                    </span>

                    {/* 도구 호출 카드 */}
                    <div className="animate-fade-up overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0d1018]">
                      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-3.5 py-2">
                        <Wrench size={12} className="text-amber-400" />
                        <span className="font-mono text-[11px] font-semibold text-[var(--text-soft)]">bygency.generate_image</span>
                        <span
                          className={cn(
                            'ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-bold',
                            at >= 3 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400',
                          )}
                        >
                          {at >= 3 ? (
                            <>
                              <Check size={9} /> {t('완료')}
                            </>
                          ) : (
                            <>
                              <Loader2 size={9} className="animate-spin" /> {at >= 2 ? t('생성 중') : t('도구 호출')}
                            </>
                          )}
                        </span>
                      </div>

                      <div className="px-3.5 py-3">
                        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-[var(--text-dim)]">{`{ "prompt": "electric car driving through
    a neon city at night, cinematic ad",
  "model": "flux", "ratio": "16:9" }`}</pre>

                        {/* 진행 바 */}
                        <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-white/[0.07]">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                            style={{ width: at >= 3 ? '100%' : at >= 2 ? '62%' : '18%', transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)' }}
                          />
                        </span>
                      </div>
                    </div>

                    {/* 결과 */}
                    {at >= 3 && (
                      <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.07] px-3.5 py-3">
                        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                          <ImageIcon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold uppercase tracking-widest text-emerald-400">{t('결과')}</span>
                          <span className="block truncate font-mono text-[11.5px] text-[var(--text-soft)]">https://bygency.co/r/ev-night-ad.png</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[11.5px] text-[var(--text-dim)]">
              <Cpu size={12} className="text-blue-400" /> {t('이미지 모델 24종 · 영상 모델 34종')}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. 연결 구조 ───────────────── */
const NODES = [
  { key: 'Claude 앱', icon: Bot, color: '#d97757', desc: '대화로 요청' },
  { key: 'MCP 커넥터', icon: ShieldCheck, color: '#2563eb', desc: 'OAuth 로그인으로 안전 연결' },
  { key: 'BYGENCY 모델 풀', icon: Cpu, color: '#10b981', desc: '이미지·영상 모델이 실제로 생성' },
]

function McpArchitecture() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setActive((v) => (v + 1) % NODES.length), 1600)
    return () => clearInterval(id)
  }, [inView])

  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-white/[0.015] py-24">
      <div
        className="animate-drift-slow pointer-events-none absolute left-1/2 top-6 h-[300px] w-[640px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${NODES[active].color}20` }}
      />
      <div ref={ref} className="relative mx-auto max-w-5xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>
            <Terminal size={13} /> {t('연결 구조')}
          </SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('토큰 복사 없이, 로그인 한 번이면 끝')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('커넥터에 주소를 넣고 로그인만 하면 내 계정으로 안전하게 연결됩니다. 그 뒤로는 Claude가 필요한 도구를 알아서 골라 씁니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#0b0d16] p-5 sm:p-7 lg:flex-row lg:items-stretch">
            {NODES.map((n, i) => {
              const Icon = n.icon
              const on = i === active
              return (
                <Fragment key={n.key}>
                  <div
                    className="flex flex-1 items-center gap-3.5 rounded-2xl border p-4 transition-all duration-500 lg:flex-col lg:text-center"
                    style={{
                      borderColor: on ? `${n.color}66` : 'rgba(255,255,255,0.08)',
                      background: on ? `${n.color}12` : 'rgba(255,255,255,0.02)',
                      transform: on ? 'translateY(-4px)' : 'none',
                      boxShadow: on ? `0 26px 56px -34px ${n.color}` : undefined,
                    }}
                  >
                    <span className="relative flex-shrink-0">
                      <span
                        className="grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-500"
                        style={{ background: `${n.color}22`, color: n.color, transform: on ? 'scale(1.08)' : 'none' }}
                      >
                        <Icon size={21} />
                      </span>
                      {on && <span className="animate-ping-ring absolute inset-0 rounded-2xl" style={{ border: `1px solid ${n.color}` }} />}
                    </span>
                    <span className="min-w-0 lg:mt-3">
                      <span className="block text-[14px] font-semibold text-[var(--text)]">{t(n.key)}</span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-[var(--text-soft)]">{t(n.desc)}</span>
                    </span>
                  </div>

                  {/* 연결 화살표 — 넓은 화면에서는 카드 사이, 좁은 화면에서는 감춘다 */}
                  {i < NODES.length - 1 && (
                    <span className="hidden flex-shrink-0 self-center px-1 lg:block">
                      <ArrowRight
                        size={20}
                        className="transition-colors duration-500"
                        style={{ color: i < active ? n.color : 'rgba(255,255,255,0.18)' }}
                      />
                    </span>
                  )}
                </Fragment>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function McpFlowShowcase() {
  return (
    <>
      <McpConversation />
      <McpArchitecture />
    </>
  )
}
