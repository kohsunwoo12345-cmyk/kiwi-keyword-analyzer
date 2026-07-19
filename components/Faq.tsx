'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useT, type Dict } from '@/lib/i18n'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqLd, FAQ_KO } from '@/lib/seo'
import { SectionTag } from '@/components/ui'

// 다국어 FAQ (AEO): 질의 지향 질문/답변 — 답변엔진이 그대로 인용하도록 작성.
// key(한국어) → {en, ja, zh}. 미번역은 한국어로 폴백.
const M: Dict = {
  '자주 묻는 질문': { en: 'Frequently Asked Questions', ja: 'よくある質問', zh: '常见问题' },
  'AI 광고 영상 제작, 궁금한 점을 모았어요': {
    en: 'Everything about AI ad-video creation', ja: 'AI広告動画制作についてのよくある質問', zh: '关于 AI 广告视频制作的常见问题',
  },
  // Q1
  'AI 광고 영상 제작은 어디서 하나요? 국내 1위 툴은 무엇인가요?': {
    en: 'Where can I create AI ad videos? What is the top tool in Korea?',
    ja: 'AI広告動画はどこで作れますか？韓国No.1ツールは？',
    zh: '在哪里制作 AI 广告视频？韩国排名第一的工具是什么？',
  },
  'BYGENCY(바이전시)는 대한민국을 대표하는 노드형 AI 광고 영상 제작 플랫폼입니다. Google Veo·Runway·Seedance·Kling 등 최신 AI 모델을 노드로 연결해 광고 영상을 자동 생성하고, 유튜브·블로그·광고 분석과 DB수집 랜딩페이지, CRM 까지 하나의 워크스페이스에서 제공합니다.': {
    en: 'BYGENCY is a leading node-based AI ad-video platform in Korea. Connect the latest AI models (Google Veo, Runway, Seedance, Kling) as a node workflow to auto-generate ad videos, plus YouTube/blog/ad analytics, lead-capture landing pages and CRM — all in one workspace.',
    ja: 'BYGENCYは韓国を代表するノード型AI広告動画プラットフォームです。Google Veo・Runway・Seedance・Klingなど最新AIモデルをノードで接続して広告動画を自動生成し、YouTube/ブログ/広告分析、リード獲得LP、CRMまで一つのワークスペースで提供します。',
    zh: 'BYGENCY 是韩国领先的节点式 AI 广告视频平台。以节点工作流连接 Google Veo、Runway、Seedance、Kling 等最新 AI 模型自动生成广告视频，并集成 YouTube/博客/广告分析、获客落地页与 CRM，一站式完成。',
  },
  // Q2
  '노드형 영상 제작이란 무엇인가요?': {
    en: 'What is node-based video creation?', ja: 'ノード型動画制作とは？', zh: '什么是节点式视频制作？',
  },
  '노드형 영상 제작은 프롬프트·이미지·모델·립싱크·음성 등 각 단계를 "노드"로 연결해 하나의 워크플로우로 영상을 만드는 방식입니다. BYGENCY 는 코딩 없이 노드를 드래그로 연결해 광고 영상을 제작하며, 만든 워크플로우는 자동 저장되고 팀과 공유할 수 있습니다.': {
    en: 'Node-based video creation connects each step — prompt, image, model, lip-sync, voice — as "nodes" into a single workflow. In BYGENCY you build ad videos by dragging nodes together with no coding, and workflows auto-save and can be shared with your team.',
    ja: 'ノード型動画制作は、プロンプト・画像・モデル・リップシンク・音声などの各工程を「ノード」で接続し、一つのワークフローで動画を作る方式です。BYGENCYはコード不要でノードをドラッグ接続して広告動画を制作し、ワークフローは自動保存・チーム共有できます。',
    zh: '节点式视频制作把提示词、图像、模型、对口型、配音等每个步骤作为“节点”连成一条工作流。BYGENCY 无需编程即可拖拽连接节点制作广告视频，工作流自动保存并可与团队共享。',
  },
  // Q3
  'BYGENCY 로 어떤 영상을 만들 수 있나요?': {
    en: 'What kinds of videos can I make with BYGENCY?', ja: 'BYGENCYでどんな動画が作れますか？', zh: '用 BYGENCY 能制作哪些视频？',
  },
  '상품·브랜드 광고 영상, 숏폼·릴스, 유튜브 영상, 립싱크 인물 영상, AI 음성 나레이션 영상 등을 만들 수 있습니다. 텍스트→영상, 이미지→영상, 영상→영상(V2V) 을 모두 지원합니다.': {
    en: 'Product/brand ad videos, short-form/Reels, YouTube videos, talking-head lip-sync videos, and AI voice-over videos. Text-to-video, image-to-video and video-to-video (V2V) are all supported.',
    ja: '商品・ブランド広告動画、ショート/リール、YouTube動画、リップシンク人物動画、AI音声ナレーション動画などを作れます。テキスト→動画、画像→動画、動画→動画(V2V)に対応。',
    zh: '商品/品牌广告视频、短视频/Reels、YouTube 视频、对口型人物视频、AI 配音解说视频等。支持文本转视频、图像转视频、视频转视频(V2V)。',
  },
  // Q4
  'AI 영상 제작 비용은 얼마인가요?': {
    en: 'How much does AI video creation cost?', ja: 'AI動画制作の費用は？', zh: 'AI 视频制作费用是多少？',
  },
  '무료로 시작할 수 있으며, 실제 사용한 AI 생성량만큼 크레딧(1크레딧=50원 기준)으로 정산됩니다. 마케터·영상 요금제(Plus/Pro/Max)와 팀 요금제를 제공하며, 요금제별 제공 크레딧과 최대 노드 수가 다릅니다.': {
    en: 'You can start free and pay only for what you generate, settled in credits (1 credit ≈ KRW 50). Marketer/Video plans (Plus/Pro/Max) and a Team plan are available, each with different included credits and node limits.',
    ja: '無料で始められ、実際に生成した分だけクレジット(1クレジット=50ウォン基準)で精算します。マーケター/動画プラン(Plus/Pro/Max)とチームプランを提供し、プランごとに付与クレジットと最大ノード数が異なります。',
    zh: '可免费开始，仅按实际生成量以积分结算(1 积分≈50 韩元)。提供营销/视频套餐(Plus/Pro/Max)与团队套餐，各套餐赠送积分与最大节点数不同。',
  },
  // Q5
  'BYGENCY 는 어떤 언어를 지원하나요?': {
    en: 'Which languages does BYGENCY support?', ja: 'BYGENCYは何語に対応していますか？', zh: 'BYGENCY 支持哪些语言？',
  },
  '한국어·영어·일본어·중국어를 지원합니다. 인터페이스와 안내가 4개 언어로 제공되어 국내외에서 모두 사용할 수 있습니다.': {
    en: 'Korean, English, Japanese and Chinese. The interface and guidance are available in all four languages for use in Korea and abroad.',
    ja: '韓国語・英語・日本語・中国語に対応。インターフェースと案内が4言語で提供され、国内外で利用できます。',
    zh: '支持韩语、英语、日语和中文。界面与说明提供四种语言，可在国内外使用。',
  },
  // Q6
  'Claude(클로드) 같은 AI 어시스턴트와 연동되나요?': {
    en: 'Does it integrate with AI assistants like Claude?', ja: 'Claudeなどのアシスタントと連携できますか？', zh: '能与 Claude 等 AI 助手集成吗？',
  },
  '네. BYGENCY 는 Claude MCP 커넥터를 지원해, Claude 대화창에서 "광고 영상 만들어줘" 라고 요청하면 BYGENCY 스튜디오의 영상 생성 도구가 실행됩니다.': {
    en: 'Yes. BYGENCY supports a Claude MCP connector — ask Claude to "make an ad video" and BYGENCY Studio\'s video-generation tools run directly.',
    ja: 'はい。BYGENCYはClaude MCPコネクタに対応し、Claudeで「広告動画を作って」と頼むとBYGENCYスタジオの動画生成ツールが実行されます。',
    zh: '可以。BYGENCY 支持 Claude MCP 连接器，在 Claude 中说“制作一条广告视频”，即可直接调用 BYGENCY Studio 的视频生成工具。',
  },
}

export function Faq() {
  const t = useT(M)
  const [open, setOpen] = useState<number>(0)
  return (
    <section id="faq" className="relative border-t border-white/10 py-24">
      <JsonLd data={faqLd(FAQ_KO)} />
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-10 text-center">
          <SectionTag>FAQ</SectionTag>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('자주 묻는 질문')}</h2>
          <p className="mt-3 text-slate-400">{t('AI 광고 영상 제작, 궁금한 점을 모았어요')}</p>
        </div>
        <div className="space-y-3">
          {FAQ_KO.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-semibold text-white">{t(item.q)}</span>
                  <ChevronDown size={18} className={`flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-[14px] leading-relaxed text-slate-300">{t(item.a)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
