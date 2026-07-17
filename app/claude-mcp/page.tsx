'use client'

import Link from 'next/link'
import {
  ArrowRight,
  KeyRound,
  Plug,
  Wand2,
  Coins,
  Image as ImageIcon,
  Video,
  ListChecks,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ClaudeMark } from '@/components/ClaudeMark'
import { Reveal } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  '클로드 MCP 연동': { en: 'Claude MCP integration', ja: 'Claude MCP連携', zh: 'Claude MCP 对接' },
  'Claude 안에서 바로': { en: 'Right inside Claude,', ja: 'Claudeの中で今すぐ', zh: '就在 Claude 里，' },
  '이미지·영상을 만듭니다': { en: 'create images & videos', ja: '画像・動画を作成', zh: '生成图片与视频' },
  'MCP(Model Context Protocol)로 BYGENCY를 Claude에 연결하면, Claude와 대화하듯 “이미지 만들어줘 / 영상 만들어줘”만 말해도 실제로 생성됩니다. 생성 비용은 전부 본인 계정 크레딧에서 차감됩니다.': {
    en: 'Connect BYGENCY to Claude via MCP (Model Context Protocol). Just say “make an image / make a video” in your Claude chat and it actually generates. Every generation is billed to your own account credits.',
    ja: 'MCP（Model Context Protocol）でBYGENCYをClaudeに接続すると、Claudeと会話するように「画像を作って/動画を作って」と言うだけで実際に生成されます。費用はすべてご自身のアカウントのクレジットから差し引かれます。',
    zh: '通过 MCP（Model Context Protocol）将 BYGENCY 接入 Claude 后，只需在 Claude 对话中说“做张图片/做个视频”即可真正生成。所有费用均从您自己的账户积分中扣除。',
  },
  '연동 방법 전체 가이드': { en: 'Full setup guide', ja: '連携の完全ガイド', zh: '完整对接指南' },
  '요금제 활성화': { en: 'Activate a plan', ja: 'プランを有効化', zh: '开通套餐' },
  '어떻게 작동하나요': { en: 'How it works', ja: 'どのように動作しますか', zh: '如何运作' },
  '3단계면 끝납니다': { en: 'Done in 3 steps', ja: '3ステップで完了', zh: '三步搞定' },
  '① 내 전용 MCP 토큰 발급': { en: '① Get your personal MCP token', ja: '① 専用MCPトークンを発行', zh: '① 获取专属 MCP 令牌' },
  '프로필에서 나만의 MCP 연결 주소(개인 토큰 포함)를 발급받습니다. 이 주소로 생성한 결과는 모두 내 계정에 기록됩니다.': {
    en: 'Issue your own MCP connection URL (with a personal token) from your profile. Everything generated with it is recorded to your account.',
    ja: 'プロフィールから自分専用のMCP接続URL（個人トークン付き）を発行します。このURLで生成した結果はすべて自分のアカウントに記録されます。',
    zh: '在个人资料中生成你专属的 MCP 连接地址（含个人令牌）。用它生成的一切都会记录到你的账户。',
  },
  '② Claude·Cursor에 연결': { en: '② Connect it to Claude / Cursor', ja: '② Claude・Cursorに接続', zh: '② 连接到 Claude / Cursor' },
  'Claude Desktop, Cursor 등 MCP를 지원하는 앱의 설정에 내 연결 주소를 HTTP MCP 서버로 등록하면 끝입니다.': {
    en: 'Register your connection URL as an HTTP MCP server in any MCP-capable app (Claude Desktop, Cursor, etc.). That’s it.',
    ja: 'Claude Desktopやcursorなど、MCP対応アプリの設定に接続URLをHTTP MCPサーバーとして登録するだけです。',
    zh: '在支持 MCP 的应用（Claude Desktop、Cursor 等）设置中，把连接地址注册为 HTTP MCP 服务器即可。',
  },
  '③ 대화로 생성': { en: '③ Generate by chatting', ja: '③ 会話で生成', zh: '③ 用对话生成' },
  '“밤 도심을 달리는 전기차 광고 이미지 만들어줘”처럼 말하면 Claude가 BYGENCY 도구를 호출해 생성하고 결과 링크를 돌려줍니다.': {
    en: 'Say something like “make an ad image of an EV driving through the city at night,” and Claude calls the BYGENCY tools, generates it, and returns the result link.',
    ja: '「夜の都会を走るEVの広告画像を作って」のように言うと、ClaudeがBYGENCYのツールを呼び出して生成し、結果リンクを返します。',
    zh: '只要说“做一张夜晚穿行城市的电动车广告图”，Claude 就会调用 BYGENCY 工具生成并返回结果链接。',
  },
  '무엇을 할 수 있나요': { en: 'What you can do', ja: 'できること', zh: '能做什么' },
  '이미지 생성': { en: 'Image generation', ja: '画像生成', zh: '图片生成' },
  'Nano Banana · GPT Image · Grok 등으로 즉시 이미지를 만들고 URL을 돌려받습니다.': {
    en: 'Instantly create images with Nano Banana, GPT Image, Grok and more — returns a URL.',
    ja: 'Nano Banana・GPT Image・Grokなどで即座に画像を作り、URLを返します。',
    zh: '用 Nano Banana、GPT Image、Grok 等即时生成图片并返回 URL。',
  },
  '영상 생성': { en: 'Video generation', ja: '動画生成', zh: '视频生成' },
  'Veo · Runway · Seedance 등으로 영상 생성을 시작하고 작업(task)을 돌려받습니다.': {
    en: 'Start video generation with Veo, Runway, Seedance and more — returns a task.',
    ja: 'Veo・Runway・Seedanceなどで動画生成を開始し、タスクを返します。',
    zh: '用 Veo、Runway、Seedance 等启动视频生成并返回任务。',
  },
  '상태 확인': { en: 'Status check', ja: 'ステータス確認', zh: '状态查询' },
  'task 번호로 영상 완료 여부와 결과 URL을 확인합니다.': {
    en: 'Check whether a video is done and get the result URL by task id.',
    ja: 'タスク番号で動画の完了状況と結果URLを確認します。',
    zh: '用任务编号查询视频是否完成并获取结果 URL。',
  },
  '본인 계정 크레딧으로 차감': { en: 'Billed to your own credits', ja: 'ご自身のクレジットから差し引き', zh: '从你自己的积分扣费' },
  '생성 1건마다 사용한 모델의 원가에 맞춰 본인 계정 크레딧에서 차감됩니다. 토큰만 있으면 누구나 자신의 계정으로 연결해 사용할 수 있습니다.': {
    en: 'Each generation draws from your own account credits based on the model’s cost. Anyone with a token can connect on their own account.',
    ja: '生成1件ごとに使用モデルの原価に応じてご自身のアカウントのクレジットから差し引かれます。トークンさえあれば誰でも自分のアカウントで接続して利用できます。',
    zh: '每次生成都会根据所用模型的成本从你自己的账户积分中扣除。只要有令牌，任何人都能以自己的账户连接使用。',
  },
  '지금 연동하러 가기': { en: 'Go connect now', ja: '今すぐ連携する', zh: '立即前往对接' },
}

const STEPS = [
  { icon: KeyRound, t: '① 내 전용 MCP 토큰 발급', d: '프로필에서 나만의 MCP 연결 주소(개인 토큰 포함)를 발급받습니다. 이 주소로 생성한 결과는 모두 내 계정에 기록됩니다.' },
  { icon: Plug, t: '② Claude·Cursor에 연결', d: 'Claude Desktop, Cursor 등 MCP를 지원하는 앱의 설정에 내 연결 주소를 HTTP MCP 서버로 등록하면 끝입니다.' },
  { icon: Wand2, t: '③ 대화로 생성', d: '“밤 도심을 달리는 전기차 광고 이미지 만들어줘”처럼 말하면 Claude가 BYGENCY 도구를 호출해 생성하고 결과 링크를 돌려줍니다.' },
]

const TOOLS = [
  { icon: ImageIcon, t: '이미지 생성', d: 'Nano Banana · GPT Image · Grok 등으로 즉시 이미지를 만들고 URL을 돌려받습니다.' },
  { icon: Video, t: '영상 생성', d: 'Veo · Runway · Seedance 등으로 영상 생성을 시작하고 작업(task)을 돌려받습니다.' },
  { icon: ListChecks, t: '상태 확인', d: 'task 번호로 영상 완료 여부와 결과 URL을 확인합니다.' },
]

export default function ClaudeMcpPage() {
  const t = useT(M)
  return (
    <div className="site-dark min-h-screen overflow-x-hidden">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div className="animate-drift pointer-events-none absolute -top-32 left-1/2 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[#D97757]/15 blur-[130px]" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="mb-6 flex justify-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl border border-[#D97757]/30 bg-[#D97757]/10">
              <ClaudeMark size={38} />
            </span>
          </div>
          <div className="flex justify-center">
            <SectionTag>{t('클로드 MCP 연동')}</SectionTag>
          </div>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('Claude 안에서 바로')} <span className="brand-text">{t('이미지·영상을 만듭니다')}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance leading-relaxed text-[var(--text-soft)]">
            {t('MCP(Model Context Protocol)로 BYGENCY를 Claude에 연결하면, Claude와 대화하듯 “이미지 만들어줘 / 영상 만들어줘”만 말해도 실제로 생성됩니다. 생성 비용은 전부 본인 계정 크레딧에서 차감됩니다.')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/docs/mcp" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#D97757] to-[#c0603f] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#D97757]/25 transition hover:brightness-110">
              {t('연동 방법 전체 가이드')} <ArrowRight size={16} />
            </Link>
            <Link href="/activate" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              {t('요금제 활성화')}
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('어떻게 작동하나요')}</SectionTag>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('3단계면 끝납니다')}</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={i} delay={i * 100}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#D97757]/12 text-[#e0906f]">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-4 text-base font-bold">{t(s.t)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{t(s.d)}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-5xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag><Terminal size={13} /> {t('무엇을 할 수 있나요')}</SectionTag>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TOOLS.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={i} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/12 text-violet-300">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-4 text-base font-bold">{t(s.t)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{t(s.d)}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal>
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#D97757]/20 bg-[#D97757]/[0.07] p-5">
              <Coins size={18} className="mt-0.5 flex-shrink-0 text-[#e0906f]" />
              <div>
                <h4 className="text-sm font-bold">{t('본인 계정 크레딧으로 차감')}</h4>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">
                  {t('생성 1건마다 사용한 모델의 원가에 맞춰 본인 계정 크레딧에서 차감됩니다. 토큰만 있으면 누구나 자신의 계정으로 연결해 사용할 수 있습니다.')}
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-10 text-center">
            <Link href="/docs/mcp" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#D97757] to-[#c0603f] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#D97757]/25 transition hover:brightness-110">
              <ShieldCheck size={16} /> {t('지금 연동하러 가기')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
