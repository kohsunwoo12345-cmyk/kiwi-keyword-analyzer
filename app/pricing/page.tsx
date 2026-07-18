'use client'

import { useState, useEffect } from 'react'
import { planConfig, type PlanConfigData } from '@/lib/auth'
import {
  Check,
  ArrowRight,
  Sparkles,
  Video,
  LayoutTemplate,
  FileText,
  PlayCircle,
  Camera,
  MapPin,
  ShieldCheck,
  Minus,
  Plus,
  Megaphone,
  Clapperboard,
  Layers,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { PlanStartButton } from '@/components/PlanStartButton'
import { Reveal } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { cn } from '@/lib/utils'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  /* ===== HERO ===== */
  '요금제': { en: 'Pricing', ja: '料金プラン', zh: '价格方案' },
  '두 개의 무기,': { en: 'Two powerful tools —', ja: '2つの武器を、', zh: '两大利器，' },
  '필요한 만큼': { en: 'as much as you need', ja: '必要な分だけ', zh: '按需' },
  '골라 쓰세요': { en: ', pick and go', ja: '選んで使おう', zh: '自由选用' },
  '고객을 모으는': {
    en: 'The customer-gathering',
    ja: '顧客を集める',
    zh: '获客用的',
  },
  '마케터 전용 도구': { en: 'marketer toolkit', ja: 'マーケター専用ツール', zh: '营销专属工具' },
  '와 콘텐츠를 찍어내는': {
    en: ', and the content-producing',
    ja: 'と、コンテンツを量産する',
    zh: '，以及批量产出内容的',
  },
  '노드형 AI 영상 제작': {
    en: 'node-based AI video studio',
    ja: 'ノード型AI動画制作',
    zh: '节点式AI视频制作',
  },
  '. 각각 Plus·Pro·Max로 나뉘어 있어, 하나만 써도 되고 둘 다 함께 써도 됩니다. 약정 없이 언제든 올리고 내리세요.': {
    en: '. Each comes in Plus, Pro, and Max — use just one or run both together. No contracts; scale up or down anytime.',
    ja: '。それぞれPlus・Pro・Maxに分かれており、片方だけでも両方一緒でも使えます。契約に縛られず、いつでもアップ・ダウンできます。',
    zh: '。两者各分为 Plus、Pro、Max，可只用其一，也可两者并用。没有合约，随时升降级。',
  },
  '웹에서 바로 실행': { en: 'Runs in your browser', ja: 'ブラウザですぐ実行', zh: '浏览器中即刻运行' },
  '3분 만에 세팅': { en: 'Set up in 3 minutes', ja: '3分でセットアップ', zh: '3分钟完成设置' },
  '언제든 해지': { en: 'Cancel anytime', ja: 'いつでも解約可能', zh: '随时取消' },

  /* ===== TRACK 1: 마케터 ===== */
  '마케터 전용 플랜': { en: 'Marketer plans', ja: 'マーケター専用プラン', zh: '营销专属方案' },
  '마케팅, 한 화면에서': {
    en: 'Marketing, wrapped up on',
    ja: 'マーケティングを、一つの画面で',
    zh: '营销，一屏',
  },
  '끝냅니다': { en: 'one screen', ja: '完結', zh: '搞定' },
  'DB 수집부터 유튜브·블로그·플레이스 분석, 문자·알림톡, CRM, 리포트까지. 흩어진 마케팅 도구를 하나로 합치는 올인원 트랙입니다.': {
    en: 'From lead collection to YouTube, blog, and Place analysis, SMS and AlimTalk, CRM, and reporting — an all-in-one track that unifies your scattered marketing tools.',
    ja: 'DB収集からYouTube・ブログ・プレイス分析、SMS・アラームトーク、CRM、レポートまで。散らばったマーケティングツールを一つにまとめるオールインワントラックです。',
    zh: '从数据采集到 YouTube、博客、地点分析，再到短信、通知消息、CRM 与报表，将分散的营销工具整合为一体的全能方案线。',
  },

  /* ===== TRACK 2: AI 영상 ===== */
  'AI 영상 제작 플랜': { en: 'AI video plans', ja: 'AI動画制作プラン', zh: 'AI视频制作方案' },
  '노드로 잇는': { en: 'A node-connected', ja: 'ノードでつなぐ', zh: '用节点串联的' },
  'AI 영상 스튜디오': { en: 'AI video studio', ja: 'AI動画スタジオ', zh: 'AI视频工作室' },
  'NODE STUDIO 노드 에디터에서 블록을 연결하듯 광고·숏폼 영상을 생성합니다. 크레딧 차감 방식이라, 만든 만큼만 비용이 나갑니다.': {
    en: 'Generate ads and short-form videos by connecting blocks in the NODE STUDIO node editor. With credit-based billing, you only pay for what you actually make.',
    ja: 'NODE STUDIOのノードエディタでブロックをつなぐように広告・ショート動画を生成します。クレジット差し引き方式なので、作った分だけ費用がかかります。',
    zh: '在 NODE STUDIO 节点编辑器中，像连接积木一样生成广告与短视频。采用积分扣减方式，制作多少才付多少。',
  },

  /* ===== PLAN: period & badge ===== */
  '/월': { en: '/mo', ja: '/月', zh: '/月' },
  '인기': { en: 'Popular', ja: '人気', zh: '热门' },

  /* ===== MARKETER TIERS ===== */
  '혼자 마케팅을 챙기는 1인 사업자·입문 단계': {
    en: 'For solo founders and beginners running marketing on their own',
    ja: '一人でマーケティングをこなす個人事業主・入門者向け',
    zh: '适合独自打理营销的个人创业者与入门用户',
  },
  '월 3,000 DB 수집': { en: '3,000 leads collected / month', ja: '月間3,000件のDB収集', zh: '每月采集3,000条数据' },
  '유튜브·블로그 기본 분석': { en: 'Basic YouTube & blog analysis', ja: 'YouTube・ブログの基本分析', zh: 'YouTube 与博客基础分析' },
  '플레이스 순위 조회': { en: 'Place ranking lookup', ja: 'プレイス順位チェック', zh: '地点排名查询' },
  '문자 발송 (건별 차감)': { en: 'SMS sending (charged per message)', ja: 'SMS送信（1件ごとに課金）', zh: '短信发送（按条计费）' },
  '기본 리포트 대시보드': { en: 'Basic report dashboard', ja: '基本レポートダッシュボード', zh: '基础报表仪表盘' },
  'Plus 시작하기': { en: 'Start with Plus', ja: 'Plusを始める', zh: '开通 Plus' },
  '성과에 집중하는 성장기 마케팅 팀': {
    en: 'For growing marketing teams focused on results',
    ja: '成果に集中する成長期のマーケティングチーム向け',
    zh: '适合专注成效的成长期营销团队',
  },
  '월 30,000 DB 수집': { en: '30,000 leads collected / month', ja: '月間30,000件のDB収集', zh: '每月采集30,000条数据' },
  '유튜브·블로그·플레이스 전체 분석': {
    en: 'Full YouTube, blog & Place analysis',
    ja: 'YouTube・ブログ・プレイスの全分析',
    zh: 'YouTube、博客与地点全面分析',
  },
  'CRM · 고객 세그먼트 관리': { en: 'CRM & customer segmentation', ja: 'CRM・顧客セグメント管理', zh: 'CRM 与客户分群管理' },
  '알림톡 · 문자 캠페인 자동화': {
    en: 'AlimTalk & SMS campaign automation',
    ja: 'アラームトーク・SMSキャンペーン自動化',
    zh: '通知消息与短信活动自动化',
  },
  '팀 협업 5인 · 권한 관리': { en: 'Team collaboration for 5 · role management', ja: 'チーム協業5名・権限管理', zh: '5人团队协作·权限管理' },
  '맞춤 리포트 · 성과 추적': { en: 'Custom reports & performance tracking', ja: 'カスタムレポート・成果トラッキング', zh: '定制报表与成效追踪' },
  'Pro 시작하기': { en: 'Start with Pro', ja: 'Proを始める', zh: '开通 Pro' },
  '여러 브랜드를 운영하는 대행사·인하우스 실무': {
    en: 'For agencies and in-house teams managing multiple brands',
    ja: '複数ブランドを運営する代理店・インハウス実務向け',
    zh: '适合运营多个品牌的代理商与内部团队',
  },
  'DB 수집 무제한': { en: 'Unlimited lead collection', ja: 'DB収集無制限', zh: '数据采集无限制' },
  '마케터 전 기능 잠금 해제': { en: 'All marketer features unlocked', ja: 'マーケター全機能を解放', zh: '解锁营销全部功能' },
  '알림톡 · 문자 대량 발송 최적 단가': {
    en: 'Best rates for bulk AlimTalk & SMS',
    ja: 'アラームトーク・SMS大量送信の最適単価',
    zh: '通知消息与短信批量发送最优单价',
  },
  '팀 협업 무제한 · 워크스페이스 분리': {
    en: 'Unlimited team seats · separate workspaces',
    ja: 'チーム協業無制限・ワークスペース分離',
    zh: '团队协作无限制·工作区隔离',
  },
  'API 연동 · 데이터 내보내기': { en: 'API integration & data export', ja: 'API連携・データエクスポート', zh: 'API 对接与数据导出' },
  '전담 매니저 · 우선 기술 지원': {
    en: 'Dedicated manager & priority tech support',
    ja: '専任マネージャー・優先技術サポート',
    zh: '专属客户经理与优先技术支持',
  },
  '도입 문의': { en: 'Contact sales', ja: '導入のお問い合わせ', zh: '咨询采购' },

  /* ===== VIDEO TIERS ===== */
  '숏폼 영상을 직접 만들어보는 시작 단계': {
    en: 'A starting point for making short-form videos yourself',
    ja: 'ショート動画を自分で作り始める入門段階',
    zh: '亲手制作短视频的入门阶段',
  },
  '월 1,500 크레딧 제공': { en: '1,500 credits / month', ja: '月間1,500クレジット付与', zh: '每月赠送1,500积分' },
  '노드 에디터 기본 워크플로우': { en: 'Basic node editor workflows', ja: 'ノードエディタの基本ワークフロー', zh: '节点编辑器基础工作流' },
  '기본 영상 생성 모델': { en: 'Standard video generation models', ja: '基本の動画生成モデル', zh: '基础视频生成模型' },
  '숏폼·광고 템플릿 제공': { en: 'Short-form & ad templates included', ja: 'ショート・広告テンプレート提供', zh: '提供短视频与广告模板' },
  '1080p 렌더링': { en: '1080p rendering', ja: '1080pレンダリング', zh: '1080p 渲染' },
  '월 6,000 크레딧 제공': { en: '6,000 credits / month', ja: '月間6,000クレジット付与', zh: '每月赠送6,000积分' },
  '고급 모델 (Seedance · Veo 등)': {
    en: 'Advanced models (Seedance, Veo, and more)',
    ja: '高度なモデル（Seedance・Veoなど）',
    zh: '高级模型（Seedance、Veo 等）',
  },
  '워터마크 제거': { en: 'Watermark removal', ja: 'ウォーターマーク除去', zh: '去除水印' },
  '노드 커스텀 워크플로우 저장': { en: 'Save custom node workflows', ja: 'ノードのカスタムワークフロー保存', zh: '保存节点自定义工作流' },
  '음성·자막 자동 생성': { en: 'Automatic voiceover & subtitles', ja: '音声・字幕の自動生成', zh: '语音与字幕自动生成' },
  '팀 공유 · 에셋 라이브러리': { en: 'Team sharing & asset library', ja: 'チーム共有・アセットライブラリ', zh: '团队共享与素材库' },
  '월 20,000 크레딧 (무제한급)': {
    en: '20,000 credits / month (virtually unlimited)',
    ja: '月間20,000クレジット（無制限級）',
    zh: '每月20,000积分（近乎无限）',
  },
  '최상위 영상·이미지 모델 전체': { en: 'Every top-tier video & image model', ja: '最上位の動画・画像モデルすべて', zh: '全部顶级视频与图像模型' },
  '우선 렌더 큐 · 대기 없는 처리': {
    en: 'Priority render queue · no waiting',
    ja: '優先レンダーキュー・待ち時間なし',
    zh: '优先渲染队列·无需等待',
  },
  '4K 고해상도 렌더링': { en: '4K high-resolution rendering', ja: '4K高解像度レンダリング', zh: '4K 高清渲染' },
  'API · 배치 렌더 자동화': { en: 'API & batch render automation', ja: 'API・バッチレンダー自動化', zh: 'API 与批量渲染自动化' },
  '전담 매니저 · 우선 지원': { en: 'Dedicated manager & priority support', ja: '専任マネージャー・優先サポート', zh: '专属客户经理与优先支持' },

  /* ===== CREDITS ===== */
  'AI 영상 제작': { en: 'AI video creation', ja: 'AI動画制作', zh: 'AI视频制作' },
  '랜딩페이지 생성': { en: 'Landing page generation', ja: 'ランディングページ生成', zh: '落地页生成' },
  '블로그 글 생성': { en: 'Blog post generation', ja: 'ブログ記事生成', zh: '博客文章生成' },
  '유튜브 분석': { en: 'YouTube analysis', ja: 'YouTube分析', zh: 'YouTube 分析' },
  '인스타 콘텐츠': { en: 'Instagram content', ja: 'Instagramコンテンツ', zh: 'Instagram 内容' },
  '플레이스 조회': { en: 'Place lookup', ja: 'プレイス照会', zh: '地点查询' },
  '크레딧': { en: 'credits', ja: 'クレジット', zh: '积分' },
  '크레딧 안내': { en: 'About credits', ja: 'クレジットのご案内', zh: '积分说明' },
  'AI 영상은': { en: 'AI video: credits that draw down', ja: 'AI動画は', zh: 'AI视频，' },
  '쓴 만큼': { en: 'only as you use', ja: '使った分だけ', zh: '用多少' },
  '차감되는 크레딧 방식': { en: 'them', ja: '差し引かれるクレジット制', zh: '扣多少的积分制' },
  'AI 영상 제작 플랜은 렌더링할 때마다 크레딧이 차감됩니다. 매달 큰 금액을 미리 결제하고 절반도 못 쓰는 대신, 실제로 만든 순간에만 딱 그만큼 빠져나갑니다. 요금제에 크레딧이 포함되며, 더 필요할 때만 별도 충전하고 신청 후 관리자 승인 시 즉시 적립됩니다.': {
    en: 'The AI video plans deduct credits every time you render. Instead of prepaying a large sum each month and using less than half, credits come out exactly when you actually create something. Credits are included in your plan, and you only top up separately when you need more — added instantly once an admin approves your request.',
    ja: 'AI動画制作プランはレンダリングのたびにクレジットが差し引かれます。毎月まとまった金額を前払いして半分も使えないのではなく、実際に作った瞬間にその分だけ差し引かれます。料金プランにクレジットが含まれ、足りないときだけ別途チャージし、申請後に管理者が承認するとすぐに反映されます。',
    zh: 'AI视频制作方案在每次渲染时扣除积分。无需每月预付大笔费用却用不到一半，而是在您实际制作的那一刻按量扣减。套餐已包含积分，仅在需要更多时另行充值，提交申请经管理员审核后即时到账。',
  },
  '크레딧은 요금제 결제와 별도로 청구되며, 충전 요청은 관리자 승인 후 계정에 반영됩니다. 마케터 트랙의 유튜브·인스타·플레이스 조회는 1크레딧으로 부담 없이 사용할 수 있습니다.': {
    en: 'Credits are billed separately from your plan payment, and top-up requests are applied to your account after admin approval. YouTube, Instagram, and Place lookups in the Marketer track cost just 1 credit, so you can use them freely.',
    ja: 'クレジットは料金プランの決済とは別に請求され、チャージ申請は管理者の承認後にアカウントへ反映されます。マーケタートラックのYouTube・Instagram・プレイス照会は1クレジットで気軽に利用できます。',
    zh: '积分与套餐费用分开计费，充值申请经管理员审核后计入账户。营销线中的 YouTube、Instagram 与地点查询仅需 1 积分，可轻松使用。',
  },

  /* ===== BOTH-PLANS CALLOUT ===== */
  '두 플랜은 함께 이용할 수 있습니다': {
    en: 'You can use both plans together',
    ja: '2つのプランは併用できます',
    zh: '两种方案可同时使用',
  },
  '마케터 전용과 AI 영상 제작은 서로 독립적인 트랙이라 원하는 조합으로 구독하세요.': {
    en: 'Marketer and AI Video are independent tracks, so subscribe in whatever combination you like.',
    ja: 'マーケター専用とAI動画制作は互いに独立したトラックなので、好きな組み合わせで契約してください。',
    zh: '营销专属与 AI视频制作是相互独立的方案线，您可按喜欢的组合自由订阅。',
  },
  '마케터 Max + AI 영상 Max 동시 구독도 가능합니다.': {
    en: 'Marketer Max + AI Video Max can even run at the same time.',
    ja: 'マーケターMax＋AI動画Maxの同時契約も可能です。',
    zh: '营销 Max ＋ AI视频 Max 也可同时订阅。',
  },
  '고객을 모으고, 그 데이터로 바로 영상을 찍어내는 흐름을 한 계정에서 끝낼 수 있습니다.': {
    en: 'Gather customers and turn that data straight into videos — the whole flow, all in one account.',
    ja: '顧客を集め、そのデータからすぐに動画を作り出す流れを、一つのアカウントで完結できます。',
    zh: '获取客户，并用这些数据直接产出视频，整个流程在一个账号内即可完成。',
  },

  /* ===== FAQ ===== */
  '자주 묻는 질문': { en: 'Frequently asked questions', ja: 'よくある質問', zh: '常见问题' },
  '결정 전에 남은 궁금증, 여기서 풀고 가세요': {
    en: 'Still have questions before you decide? Clear them up here',
    ja: '決める前に残った疑問は、ここで解消してください',
    zh: '决定之前的疑问，就在这里解答',
  },
  '더 궁금한 점이 있으신가요?': { en: 'Have more questions?', ja: 'さらに知りたいことがありますか？', zh: '还有其他疑问吗？' },
  '문의하기': { en: 'Contact us', ja: 'お問い合わせ', zh: '联系我们' },
  '두 플랜은 어떻게 다른가요?': {
    en: 'How are the two plans different?',
    ja: '2つのプランはどう違いますか？',
    zh: '两种方案有何区别？',
  },
  'BYGENCY에는 서로 다른 두 개의 플랜 트랙이 있습니다. ‘마케터 전용’은 DB 수집·유튜브/블로그/플레이스 분석·문자·알림톡·CRM·리포트를 아우르는 마케팅 올인원 도구이고, ‘AI 영상 제작’은 NODE STUDIO 노드 에디터로 광고·숏폼 영상을 만드는 도구입니다. 목적이 다르기 때문에 각각 Plus·Pro·Max 요금제로 나뉘어 있습니다.': {
    en: 'BYGENCY offers two separate plan tracks. "Marketer" is an all-in-one marketing toolkit covering lead collection, YouTube/blog/Place analysis, SMS, AlimTalk, CRM, and reporting. "AI Video" lets you create ads and short-form videos with the NODE STUDIO node editor. Because they serve different purposes, each has its own Plus, Pro, and Max tiers.',
    ja: 'BYGENCYには2つの異なるプラントラックがあります。「マーケター専用」はDB収集・YouTube/ブログ/プレイス分析・SMS・アラームトーク・CRM・レポートを網羅するマーケティングのオールインワンツールで、「AI動画制作」はNODE STUDIOのノードエディタで広告・ショート動画を作るツールです。目的が異なるため、それぞれPlus・Pro・Maxの料金プランに分かれています。',
    zh: 'BYGENCY 提供两条独立的方案线。“营销专属”是涵盖数据采集、YouTube/博客/地点分析、短信、通知消息、CRM 与报表的营销一体化工具；“AI视频制作”则通过 NODE STUDIO 节点编辑器制作广告与短视频。由于用途不同，两者各自分为 Plus、Pro、Max 套餐。',
  },
  '두 플랜을 동시에 쓸 수 있나요?': {
    en: 'Can I use both plans at the same time?',
    ja: '2つのプランを同時に使えますか？',
    zh: '可以同时使用两种方案吗？',
  },
  '네. 두 트랙은 완전히 독립적이라 하나만 구독해도 되고, 둘 다 구독해도 됩니다. 마케터 Max와 AI 영상 Max를 동시에 구독하는 것도 가능합니다. 마케팅 데이터와 영상 제작을 한 계정에서 함께 다루고 싶다면 두 플랜을 같이 운영하시는 것을 권장합니다.': {
    en: 'Yes. The two tracks are completely independent, so you can subscribe to just one or to both. You can even subscribe to Marketer Max and AI Video Max at the same time. If you want to handle marketing data and video production from a single account, we recommend running both plans together.',
    ja: 'はい。2つのトラックは完全に独立しているため、片方だけの契約でも、両方の契約でも構いません。マーケターMaxとAI動画Maxを同時に契約することも可能です。マーケティングデータと動画制作を一つのアカウントで一緒に扱いたい場合は、両プランの併用をおすすめします。',
    zh: '可以。两条方案线完全独立，您可以只订阅其中一条，也可以同时订阅两条，甚至同时订阅营销 Max 与 AI视频 Max。若希望在同一账号内同时处理营销数据与视频制作，我们建议同时开通两种方案。',
  },
  '약정이 있나요? 해지하면 손해 보지 않나요?': {
    en: 'Is there a contract? Will I lose out if I cancel?',
    ja: '契約期間はありますか？解約すると損しませんか？',
    zh: '有合约期吗？取消会有损失吗？',
  },
  '약정도, 위약금도 없습니다. 두 플랜 모두 언제든 마이페이지에서 클릭 한 번으로 해지할 수 있고, 해지하면 다음 결제일부터 청구가 멈춥니다. 이미 결제한 기간은 끝까지 정상 이용되니 남은 날짜를 잃을 걱정은 하지 않으셔도 됩니다.': {
    en: 'There are no contracts and no cancellation fees. Both plans can be cancelled anytime with a single click on My Page, and billing stops from your next payment date. The period you have already paid for stays fully usable until it ends, so you never lose the days remaining.',
    ja: '契約も違約金もありません。両プランともマイページからいつでもワンクリックで解約でき、解約すると次回決済日から請求が止まります。すでに支払った期間は最後まで通常どおり利用できるので、残り日数を失う心配はありません。',
    zh: '没有合约期，也没有违约金。两种方案都可随时在“我的页面”一键取消，取消后从下一个扣款日起停止计费。已支付的周期可正常使用到期，绝不会浪费剩余天数。',
  },
  '플랜은 나중에 바꿀 수 있나요?': {
    en: 'Can I change my plan later?',
    ja: 'プランは後から変更できますか？',
    zh: '之后可以更换方案吗？',
  },
  '지금의 선택이 끝이 아닙니다. 각 트랙 안에서 Plus에서 Pro, Max로 즉시 업그레이드하거나 반대로 내릴 수 있고, 필요 없어진 트랙은 그것만 따로 해지할 수 있습니다. 작게 시작해 성과를 확인한 뒤 규모를 키우는 것이 가장 합리적입니다.': {
    en: 'Your choice today is not final. Within each track you can instantly upgrade from Plus to Pro or Max, or downgrade the other way, and you can cancel just the track you no longer need. Starting small, confirming results, and then scaling up is the smartest approach.',
    ja: '今の選択が最後ではありません。各トラック内でPlusからPro、Maxへ即座にアップグレードでき、逆にダウングレードも可能です。不要になったトラックだけを個別に解約することもできます。小さく始めて成果を確認してから規模を広げるのが最も合理的です。',
    zh: '如今的选择并非一成不变。在每条方案线内，您可随时从 Plus 升级到 Pro 或 Max，也可反向降级，还能单独取消不再需要的方案线。先小规模起步、确认成效后再扩大规模，是最明智的做法。',
  },
  '크레딧은 무엇이고 어떻게 충전하나요?': {
    en: 'What are credits and how do I top them up?',
    ja: 'クレジットとは何で、どうチャージしますか？',
    zh: '积分是什么，如何充值？',
  },
  'AI 영상 제작은 렌더링할 때마다 크레딧이 차감되는 방식입니다. 요금제에 매달 크레딧이 포함되며, 더 필요할 때만 별도로 충전합니다. 마케터 트랙의 분석·조회 대부분은 1크레딧으로 충분해 부담이 적습니다. 충전은 요금제와 별도이며, 신청 후 관리자 승인 시 즉시 적립됩니다.': {
    en: 'AI video creation deducts credits each time you render. Every plan includes a monthly credit allowance, and you only top up separately when you need more. Most analysis and lookups in the Marketer track cost just 1 credit, so the burden is minimal. Top-ups are separate from your plan and are added instantly once an admin approves your request.',
    ja: 'AI動画制作はレンダリングのたびにクレジットが差し引かれる方式です。料金プランに毎月のクレジットが含まれ、足りないときだけ別途チャージします。マーケタートラックの分析・照会はほとんど1クレジットで足りるため負担が少なめです。チャージは料金プランとは別で、申請後に管理者が承認するとすぐに反映されます。',
    zh: 'AI视频制作在每次渲染时扣除积分。每个套餐都包含每月积分额度，仅在需要更多时才另行充值。营销线中大多数分析与查询仅需 1 积分，负担很小。充值与套餐分开计费，提交申请并经管理员审核后即时到账。',
  },
  '결제 수단과 세금계산서는 어떻게 되나요?': {
    en: 'What payment methods and tax invoices are available?',
    ja: '決済手段と適格請求書はどうなりますか？',
    zh: '支持哪些支付方式，能开发票吗？',
  },
  '주요 신용·체크카드와 계좌이체를 지원합니다. 두 플랜의 Max는 세금계산서 발행과 별도 계약, 대량 사용 단가 조정이 가능하니 도입 문의로 연락 주시면 조건을 맞춰 안내해 드립니다.': {
    en: 'We support major credit and debit cards as well as bank transfers. The Max tier of both plans supports tax invoice issuance, separate contracts, and volume-based pricing adjustments — contact sales and we will tailor the terms for you.',
    ja: '主要なクレジット・デビットカードと銀行振込に対応しています。両プランのMaxは適格請求書の発行、個別契約、大量利用時の単価調整が可能ですので、導入のお問い合わせよりご連絡いただければ条件を合わせてご案内します。',
    zh: '我们支持主流信用卡、借记卡及银行转账。两种方案的 Max 档均可开具发票、签订单独合同并按用量调整单价，欢迎通过“咨询采购”联系我们，我们将为您量身安排条件。',
  },
  '수집한 고객 데이터와 만든 영상은 안전한가요?': {
    en: 'Is the customer data I collect and the videos I create secure?',
    ja: '収集した顧客データや作成した動画は安全ですか？',
    zh: '采集的客户数据和制作的视频安全吗？',
  },
  '고객 DB는 암호화되어 저장되며 계정 권한이 있는 담당자만 접근할 수 있습니다. NODE STUDIO에서 생성한 영상과 에셋의 소유권은 전적으로 고객사에 있으며, 해지 시 데이터 이관과 삭제 절차를 함께 안내해 드립니다.': {
    en: 'Customer databases are stored encrypted and can only be accessed by authorized account members. You retain full ownership of the videos and assets created in NODE STUDIO, and if you cancel, we will guide you through data migration and deletion.',
    ja: '顧客DBは暗号化されて保存され、アカウント権限を持つ担当者のみがアクセスできます。NODE STUDIOで生成した動画やアセットの所有権は完全に貴社にあり、解約時にはデータの移管と削除の手続きを併せてご案内します。',
    zh: '客户数据库以加密方式存储，仅限拥有账号权限的人员访问。您对在 NODE STUDIO 中生成的视频与素材拥有完全所有权；如取消服务，我们将协助您完成数据迁移与删除。',
  },

  /* ===== CTA ===== */
  '마케팅과 영상, 둘 다 오늘 시작할 수 있습니다': {
    en: 'Marketing and video — you can start both today',
    ja: 'マーケティングも動画も、両方今日から始められます',
    zh: '营销与视频，今天都能开始',
  },
  '3분이면 세팅 완료. 필요한 플랜 하나로 가볍게 시작하고, 언제든 다른 트랙을 더하세요.': {
    en: 'Set up in 3 minutes. Start light with the one plan you need, and add the other track whenever you like.',
    ja: '3分あればセットアップ完了。必要なプラン一つで気軽に始めて、いつでも別のトラックを追加できます。',
    zh: '3分钟即可完成设置。用一个所需方案轻松起步，随时可添加另一条方案线。',
  },
  '지금 시작하기': { en: 'Get started', ja: '今すぐ始める', zh: '立即开始' },
}

type Tier = {
  name: string
  price: string
  period: string
  desc: string
  features: string[]
  cta: string
  href: string
  highlight: boolean
  origPrice?: string  // 할인 전 정가(취소선 표시용)
  discountPct?: number
}

/* ===== 마케터 전용 플랜 ===== */
const MARKETER_TIERS: Tier[] = [
  {
    name: 'Plus',
    price: '₩29,000',
    period: '/월',
    desc: '혼자 마케팅을 챙기는 1인 사업자·입문 단계',
    features: [
      '월 3,000 DB 수집',
      '유튜브·블로그 기본 분석',
      '플레이스 순위 조회',
      '문자 발송 (건별 차감)',
      '기본 리포트 대시보드',
    ],
    cta: 'Plus 시작하기',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₩89,000',
    period: '/월',
    desc: '성과에 집중하는 성장기 마케팅 팀',
    features: [
      '월 30,000 DB 수집',
      '유튜브·블로그·플레이스 전체 분석',
      'CRM · 고객 세그먼트 관리',
      '알림톡 · 문자 캠페인 자동화',
      '팀 협업 5인 · 권한 관리',
      '맞춤 리포트 · 성과 추적',
    ],
    cta: 'Pro 시작하기',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Max',
    price: '₩249,000',
    period: '/월',
    desc: '여러 브랜드를 운영하는 대행사·인하우스 실무',
    features: [
      'DB 수집 무제한',
      '마케터 전 기능 잠금 해제',
      '알림톡 · 문자 대량 발송 최적 단가',
      '팀 협업 무제한 · 워크스페이스 분리',
      'API 연동 · 데이터 내보내기',
      '전담 매니저 · 우선 기술 지원',
    ],
    cta: '도입 문의',
    href: '/contact',
    highlight: false,
  },
]

/* ===== 노드형 AI 영상 제작 플랜 (NODE STUDIO) ===== */
const VIDEO_TIERS: Tier[] = [
  {
    name: 'Plus',
    price: '₩49,000',
    period: '/월',
    desc: '숏폼 영상을 직접 만들어보는 시작 단계',
    features: [
      '월 1,500 크레딧 제공',
      '노드 에디터 기본 워크플로우',
      '기본 영상 생성 모델',
      '숏폼·광고 템플릿 제공',
      '1080p 렌더링',
    ],
    cta: 'Plus 시작하기',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₩149,000',
    period: '/월',
    desc: '콘텐츠를 대량으로 찍어내는 제작 팀',
    features: [
      '월 6,000 크레딧 제공',
      '고급 모델 (Seedance · Veo 등)',
      '워터마크 제거',
      '노드 커스텀 워크플로우 저장',
      '음성·자막 자동 생성',
      '팀 공유 · 에셋 라이브러리',
    ],
    cta: 'Pro 시작하기',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Max',
    price: '₩390,000',
    period: '/월',
    desc: '영상을 끊김 없이 쏟아내는 스튜디오·대행사',
    features: [
      '월 20,000 크레딧 (무제한급)',
      '최상위 영상·이미지 모델 전체',
      '우선 렌더 큐 · 대기 없는 처리',
      '4K 고해상도 렌더링',
      'API · 배치 렌더 자동화',
      '전담 매니저 · 우선 지원',
    ],
    cta: '도입 문의',
    href: '/contact',
    highlight: false,
  },
]

const CREDITS = [
  { icon: Video, label: 'AI 영상 제작', cost: 5, color: 'from-sky-500 to-blue-600' },
  { icon: LayoutTemplate, label: '랜딩페이지 생성', cost: 3, color: 'from-blue-500 to-blue-600' },
  { icon: FileText, label: '블로그 글 생성', cost: 2, color: 'from-blue-500 to-blue-600' },
  { icon: PlayCircle, label: '유튜브 분석', cost: 1, color: 'from-rose-500 to-red-600' },
  { icon: Camera, label: '인스타 콘텐츠', cost: 1, color: 'from-pink-500 to-rose-600' },
  { icon: MapPin, label: '플레이스 조회', cost: 1, color: 'from-emerald-500 to-teal-600' },
]

const FAQS = [
  {
    q: '두 플랜은 어떻게 다른가요?',
    a: 'BYGENCY에는 서로 다른 두 개의 플랜 트랙이 있습니다. ‘마케터 전용’은 DB 수집·유튜브/블로그/플레이스 분석·문자·알림톡·CRM·리포트를 아우르는 마케팅 올인원 도구이고, ‘AI 영상 제작’은 NODE STUDIO 노드 에디터로 광고·숏폼 영상을 만드는 도구입니다. 목적이 다르기 때문에 각각 Plus·Pro·Max 요금제로 나뉘어 있습니다.',
  },
  {
    q: '두 플랜을 동시에 쓸 수 있나요?',
    a: '네. 두 트랙은 완전히 독립적이라 하나만 구독해도 되고, 둘 다 구독해도 됩니다. 마케터 Max와 AI 영상 Max를 동시에 구독하는 것도 가능합니다. 마케팅 데이터와 영상 제작을 한 계정에서 함께 다루고 싶다면 두 플랜을 같이 운영하시는 것을 권장합니다.',
  },
  {
    q: '약정이 있나요? 해지하면 손해 보지 않나요?',
    a: '약정도, 위약금도 없습니다. 두 플랜 모두 언제든 마이페이지에서 클릭 한 번으로 해지할 수 있고, 해지하면 다음 결제일부터 청구가 멈춥니다. 이미 결제한 기간은 끝까지 정상 이용되니 남은 날짜를 잃을 걱정은 하지 않으셔도 됩니다.',
  },
  {
    q: '플랜은 나중에 바꿀 수 있나요?',
    a: '지금의 선택이 끝이 아닙니다. 각 트랙 안에서 Plus에서 Pro, Max로 즉시 업그레이드하거나 반대로 내릴 수 있고, 필요 없어진 트랙은 그것만 따로 해지할 수 있습니다. 작게 시작해 성과를 확인한 뒤 규모를 키우는 것이 가장 합리적입니다.',
  },
  {
    q: '크레딧은 무엇이고 어떻게 충전하나요?',
    a: 'AI 영상 제작은 렌더링할 때마다 크레딧이 차감되는 방식입니다. 요금제에 매달 크레딧이 포함되며, 더 필요할 때만 별도로 충전합니다. 마케터 트랙의 분석·조회 대부분은 1크레딧으로 충분해 부담이 적습니다. 충전은 요금제와 별도이며, 신청 후 관리자 승인 시 즉시 적립됩니다.',
  },
  {
    q: '결제 수단과 세금계산서는 어떻게 되나요?',
    a: '주요 신용·체크카드와 계좌이체를 지원합니다. 두 플랜의 Max는 세금계산서 발행과 별도 계약, 대량 사용 단가 조정이 가능하니 도입 문의로 연락 주시면 조건을 맞춰 안내해 드립니다.',
  },
  {
    q: '수집한 고객 데이터와 만든 영상은 안전한가요?',
    a: '고객 DB는 암호화되어 저장되며 계정 권한이 있는 담당자만 접근할 수 있습니다. NODE STUDIO에서 생성한 영상과 에셋의 소유권은 전적으로 고객사에 있으며, 해지 시 데이터 이관과 삭제 절차를 함께 안내해 드립니다.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const t = useT(M)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-semibold">{t(q)}</span>
        <span
          className={cn(
            'grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-blue-300 transition-colors',
            open ? 'bg-blue-500/20' : 'bg-blue-500/10',
          )}
        >
          {open ? <Minus size={16} /> : <Plus size={16} />}
        </span>
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 text-sm leading-relaxed text-[var(--text-soft)]">{t(a)}</p>
        </div>
      </div>
    </div>
  )
}

function PlanCard({ p, i, track }: { p: Tier; i: number; track: 'video' | 'marketer' }) {
  const t = useT(M)
  return (
    <Reveal delay={i * 100} className={p.highlight ? 'lg:-mt-4' : ''}>
      <div
        className={cn(
          'relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1',
          p.highlight
            ? 'hairline shadow-[0_40px_90px_-40px_rgba(37,99,235,0.6)]'
            : 'border border-white/10 bg-white/[0.02] hover:border-white/20',
        )}
      >
        {p.highlight && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-blue-500/40">
            {t('인기')}
          </span>
        )}
        <h3 className="text-lg font-semibold">{p.name}</h3>
        <p className="mt-1 text-sm text-[var(--text-soft)]">{t(p.desc)}</p>
        {p.origPrice && p.discountPct ? (
          <div className="mt-5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-xs font-bold text-rose-300">{p.discountPct}% 할인</span>
              <span className="text-sm text-[var(--text-dim)] line-through">{p.origPrice}</span>
            </div>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-4xl font-bold tracking-tight">{p.price}</span>
              <span className="mb-1 text-sm text-[var(--text-dim)]">{t(p.period)}</span>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-end gap-1">
            <span className="text-4xl font-bold tracking-tight">{p.price}</span>
            <span className="mb-1 text-sm text-[var(--text-dim)]">{t(p.period)}</span>
          </div>
        )}
        <ul className="mt-6 flex-1 space-y-3">
          {p.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <Check size={17} className="mt-0.5 flex-shrink-0 text-blue-300" />
              <span className="text-[var(--text-soft)]">{t(f)}</span>
            </li>
          ))}
        </ul>
        <PlanStartButton
          track={track}
          plan={p.name}
          label={t(p.cta)}
          variant={p.highlight ? 'primary' : 'outline'}
          className="mt-8 w-full"
          contact={p.href === '/contact'}
        />
      </div>
    </Reveal>
  )
}

function TrackSection({
  icon: Icon,
  tag,
  title,
  accent,
  desc,
  tiers,
  track,
}: {
  icon: typeof Megaphone
  tag: string
  title: string
  accent: string
  desc: string
  tiers: Tier[]
  track: 'video' | 'marketer'
}) {
  const t = useT(M)
  return (
    <div>
      <Reveal className="mx-auto max-w-2xl text-center">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-blue-200 backdrop-blur">
            <Icon size={15} /> {t(tag)}
          </span>
        </div>
        <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {t(title)} <span className="brand-text">{t(accent)}</span>
        </h2>
        <p className="mt-4 text-balance text-[var(--text-soft)]">{t(desc)}</p>
      </Reveal>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
        {tiers.map((p, i) => (
          <PlanCard key={p.name} p={p} i={i} track={track} />
        ))}
      </div>
    </div>
  )
}

const won = (n: number) => '₩' + Math.round(n || 0).toLocaleString('ko-KR')
/** 관리자 설정(가격·할인·기능)을 하드코딩 기본 티어에 덮어써 실제 표시 티어를 만든다. */
function applyConfig(base: Tier[], track: 'marketer' | 'video', cfg: PlanConfigData | null): Tier[] {
  if (!cfg) return base
  return base.map((tier) => {
    const c = cfg[track]?.[tier.name]
    if (!c) return tier
    const disc = Math.max(0, Math.min(100, Number(c.discount) || 0))
    const effective = Math.round((Number(c.price) || 0) * (1 - disc / 100))
    return {
      ...tier,
      price: won(effective),
      origPrice: disc > 0 ? won(c.price) : undefined,
      discountPct: disc > 0 ? disc : undefined,
      features: Array.isArray(c.features) && c.features.length ? c.features : tier.features,
    }
  })
}

export default function PricingPage() {
  const t = useT(M)
  const [cfg, setCfg] = useState<PlanConfigData | null>(null)
  useEffect(() => { planConfig().then((r) => { if (r.ok && r.config) setCfg(r.config) }) }, [])
  const videoTiers = applyConfig(VIDEO_TIERS, 'video', cfg)
  const marketerTiers = applyConfig(MARKETER_TIERS, 'marketer', cfg)
  return (
    <div className="site-dark min-h-screen overflow-x-hidden">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-blue-700/30 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 right-0 h-[280px] w-[380px] rounded-full bg-cyan-700/25 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>{t('요금제')}</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            {t('두 개의 무기,')} <span className="brand-text animate-gradient">{t('필요한 만큼')}</span> {t('골라 쓰세요')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            {t('고객을 모으는')} <b className="font-semibold text-[var(--text)]">{t('마케터 전용 도구')}</b>{t('와 콘텐츠를 찍어내는')}{' '}
            <b className="font-semibold text-[var(--text)]">{t('노드형 AI 영상 제작')}</b>{t('. 각각 Plus·Pro·Max로 나뉘어 있어, 하나만 써도 되고 둘 다 함께 써도 됩니다. 약정 없이 언제든 올리고 내리세요.')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-dim)] animate-fade-up delay-300">
            {['웹에서 바로 실행', '3분 만에 세팅', '언제든 해지'].map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <Check size={15} className="text-emerald-500" /> {t(s)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRACK 1: AI 영상 제작 (가장 먼저) ===== */}
      <section className="pb-6">
        <div className="mx-auto max-w-6xl px-5">
          <TrackSection
            icon={Clapperboard}
            tag="AI 영상 제작 플랜"
            title="노드로 잇는"
            accent="AI 영상 스튜디오"
            desc="NODE STUDIO 노드 에디터에서 블록을 연결하듯 광고·숏폼 영상을 생성합니다. 크레딧 차감 방식이라, 만든 만큼만 비용이 나갑니다."
            tiers={videoTiers}
            track="video"
          />
        </div>
      </section>

      {/* ===== TRACK 2: 마케터 전용 ===== */}
      <section className="pt-14 pb-6">
        <div className="mx-auto max-w-6xl px-5">
          <TrackSection
            icon={Megaphone}
            tag="마케터 전용 플랜"
            title="마케팅, 한 화면에서"
            accent="끝냅니다"
            desc="DB 수집부터 유튜브·블로그·플레이스 분석, 문자·알림톡, CRM, 리포트까지. 흩어진 마케팅 도구를 하나로 합치는 올인원 트랙입니다."
            tiers={marketerTiers}
            track="marketer"
          />
        </div>
      </section>

      {/* ===== BOTH-PLANS CALLOUT ===== */}
      <section className="pt-10 pb-12">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal variant="scale" className="mx-auto max-w-3xl">
            <div className="hairline relative overflow-hidden p-7">
              <div className="animate-drift pointer-events-none absolute -top-16 -right-10 h-48 w-64 rounded-full bg-blue-600/25 blur-[80px]" />
              <div className="relative flex items-start gap-4">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl brand-gradient text-white shadow">
                  <Layers size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    {t('두 플랜은 함께 이용할 수 있습니다')}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
                    {t('마케터 전용과 AI 영상 제작은 서로 독립적인 트랙이라 원하는 조합으로 구독하세요.')}
                    <span className="font-semibold text-[var(--text)]">
                      {' '}
                      {t('마케터 Max + AI 영상 Max 동시 구독도 가능합니다.')}
                    </span>{' '}
                    {t('고객을 모으고, 그 데이터로 바로 영상을 찍어내는 흐름을 한 계정에서 끝낼 수 있습니다.')}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== CREDITS ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>
              <Sparkles size={13} /> {t('크레딧 안내')}
            </SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('AI 영상은')} <span className="brand-text">{t('쓴 만큼')}</span> {t('차감되는 크레딧 방식')}
            </h2>
            <p className="mt-5 text-balance text-[var(--text-soft)]">
              {t('AI 영상 제작 플랜은 렌더링할 때마다 크레딧이 차감됩니다. 매달 큰 금액을 미리 결제하고 절반도 못 쓰는 대신, 실제로 만든 순간에만 딱 그만큼 빠져나갑니다. 요금제에 크레딧이 포함되며, 더 필요할 때만 별도 충전하고 신청 후 관리자 승인 시 즉시 적립됩니다.')}
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CREDITS.map((c, i) => {
              const Icon = c.icon
              return (
                <Reveal key={c.label} variant="scale" delay={(i % 3) * 80}>
                  <div className="card hover-lift flex items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-3.5">
                      <span
                        className={cn(
                          'grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                          c.color,
                        )}
                      >
                        <Icon size={20} />
                      </span>
                      <span className="font-semibold">{t(c.label)}</span>
                    </div>
                    <span className="flex items-baseline gap-1 text-blue-300">
                      <span className="text-2xl font-bold">{c.cost}</span>
                      <span className="text-xs font-medium text-[var(--text-dim)]">{t('크레딧')}</span>
                    </span>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/[0.07] p-5 text-sm text-[var(--text-soft)]">
              <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-blue-300" />
              <p>
                {t('크레딧은 요금제 결제와 별도로 청구되며, 충전 요청은 관리자 승인 후 계정에 반영됩니다. 마케터 트랙의 유튜브·인스타·플레이스 조회는 1크레딧으로 부담 없이 사용할 수 있습니다.')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="border-y border-white/10 bg-white/[0.015] py-24">
        <div className="mx-auto max-w-3xl px-5">
          <Reveal className="text-center">
            <SectionTag>{t('자주 묻는 질문')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('결정 전에 남은 궁금증, 여기서 풀고 가세요')}
            </h2>
          </Reveal>
          <div className="mt-12 space-y-3">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <FaqItem q={f.q} a={f.a} />
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <p className="text-sm text-[var(--text-soft)]">
              {t('더 궁금한 점이 있으신가요?')}{' '}
              <a href="/contact" className="font-semibold text-blue-300 hover:text-blue-200 hover:underline">
                {t('문의하기')}
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 py-24">
        <Reveal variant="scale" className="mx-auto max-w-5xl">
          <div
            className="animate-gradient relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl shadow-blue-300/50"
            style={{ background: 'linear-gradient(120deg,#3b82f6,#2563eb,#0ea5e9,#22d3ee)' }}
          >
            <div className="animate-drift pointer-events-none absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-[90px]" />
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <LogoMark size={40} />
                </span>
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('마케팅과 영상, 둘 다 오늘 시작할 수 있습니다')}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                {t('3분이면 세팅 완료. 필요한 플랜 하나로 가볍게 시작하고, 언제든 다른 트랙을 더하세요.')}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  href="/signup"
                  size="lg"
                  className="!bg-white !text-blue-700 hover:!bg-blue-50 hover:!brightness-100"
                >
                  {t('지금 시작하기')} <ArrowRight size={18} />
                </Button>
                <Button
                  href="/contact"
                  size="lg"
                  className="!border !border-white/40 !bg-white/10 !text-white hover:!bg-white/20"
                >
                  {t('도입 문의')}
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
