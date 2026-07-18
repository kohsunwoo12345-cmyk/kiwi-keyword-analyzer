'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { planConfig, type PlanConfigData } from '@/lib/auth'
import {
  ArrowRight,
  Check,
  X,
  Zap,
  ShieldCheck,
  TrendingUp,
  Play,
  Copy,
  Compass,
  Clock,
  Archive,
  Flame,
  Lock,
  CreditCard,
  LifeBuoy,
  Quote,
  Star,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HeroOrbit } from '@/components/HeroOrbit'
import { HeroPhotoWall } from '@/components/HeroPhotoWall'
import { HeroDashboard } from '@/components/HeroDashboard'
import { AIPipeline } from '@/components/AIPipeline'
import { AIVideoGallery } from '@/components/AIVideoGallery'
import { AIVideoShowcase } from '@/components/AIVideoShowcase'
import { YouTubeLogo, NaverBlogLogo, KakaoLogo, AdPlatformsCluster } from '@/components/logos/BrandMarks'
import { ClaudeMark } from '@/components/ClaudeMark'
import { Button, SectionTag } from '@/components/ui'
import { PlanStartButton } from '@/components/PlanStartButton'
import { Reveal, Marquee } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { FEATURES } from '@/lib/features'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  // ===== HERO =====
  '노드 기반 올인원 마케팅 스튜디오': {
    en: 'Node-based all-in-one marketing studio',
    ja: 'ノードベースのオールインワン・マーケティングスタジオ',
    zh: '基于节点的一体化营销工作室',
  },
  '마케팅의 모든 것을': {
    en: 'Everything in marketing,',
    ja: 'マーケティングのすべてを',
    zh: '营销的一切',
  },
  '하나로': {
    en: 'in one place',
    ja: 'ひとつに',
    zh: '尽在一处',
  },
  'DB수집 랜딩페이지 · 유튜브/블로그 분석 · 광고 분석 · CRM · AI 영상 제작까지.': {
    en: 'Lead-capture landing pages, YouTube/blog analytics, ad analysis, CRM, and AI video production.',
    ja: 'DB収集ランディングページ・YouTube/ブログ分析・広告分析・CRM・AI動画制作まで。',
    zh: '从获客落地页、YouTube/博客分析、广告分析、CRM 到 AI 视频制作。',
  },
  '흩어진 마케팅 도구를 하나의 노드 워크스페이스로 통합했습니다.': {
    en: 'We unified scattered marketing tools into a single node workspace.',
    ja: '散らばったマーケティングツールを一つのノードワークスペースに統合しました。',
    zh: '我们将分散的营销工具整合到一个节点工作区中。',
  },
  '지금 시작하기': {
    en: 'Get started',
    ja: '今すぐ始める',
    zh: '立即开始',
  },
  '기능 둘러보기': {
    en: 'Explore features',
    ja: '機能を見る',
    zh: '浏览功能',
  },
  '신용카드 불필요': {
    en: 'No credit card required',
    ja: 'クレジットカード不要',
    zh: '无需信用卡',
  },
  '3분 만에 세팅': {
    en: 'Set up in 3 minutes',
    ja: '3分でセットアップ',
    zh: '3 分钟完成设置',
  },
  '언제든 해지': {
    en: 'Cancel anytime',
    ja: 'いつでも解約可能',
    zh: '随时取消',
  },
  '노드형 AI 광고·브랜드 영상': {
    en: 'Node-based AI ad & brand video',
    ja: 'ノード型AI広告・ブランド動画',
    zh: '节点式 AI 广告·品牌视频',
  },
  '네이버 플레이스 마케팅': {
    en: 'Naver Place marketing',
    ja: 'Naverプレイス マーケティング',
    zh: 'Naver Place 营销',
  },
  '블로그 마케팅': {
    en: 'Blog marketing',
    ja: 'ブログ マーケティング',
    zh: '博客营销',
  },
  '콘텐츠 마케팅': {
    en: 'Content marketing',
    ja: 'コンテンツ マーケティング',
    zh: '内容营销',
  },

  // ===== 채널 오빗 =====
  '하나로 연결되는 채널': {
    en: 'Channels connected into one',
    ja: 'ひとつにつながるチャネル',
    zh: '汇聚为一的渠道',
  },
  '흩어진 채널을': {
    en: 'Scattered channels,',
    ja: '散らばったチャネルを',
    zh: '分散的渠道，',
  },
  '중심으로': {
    en: 'at the center',
    ja: 'を中心に',
    zh: '为中心',
  },
  '유튜브 · 네이버 플레이스 · 카카오 · 블로그 · 인스타그램 · 뉴스까지, 주요 마케팅 채널을 한 곳에서 수집·분석·실행합니다.': {
    en: 'From YouTube, Naver Place, Kakao, blogs, and Instagram to news — collect, analyze, and act on every major marketing channel in one place.',
    ja: 'YouTube・Naverプレイス・Kakao・ブログ・Instagram・ニュースまで、主要なマーケティングチャネルを一か所で収集・分析・実行します。',
    zh: '从 YouTube、Naver Place、Kakao、博客、Instagram 到新闻，在同一处收集、分析并执行主要营销渠道。',
  },

  // ===== MARQUEE =====
  '주요 마케팅 채널 데이터를 한 곳에서 통합 연동': {
    en: 'Integrate data from every major marketing channel in one place',
    ja: '主要なマーケティングチャネルのデータを一か所で統合連携',
    zh: '在同一处整合对接主要营销渠道数据',
  },
  '클로드 MCP 연동': { en: 'Claude MCP integration', ja: 'Claude MCP連携', zh: 'Claude MCP 对接' },
  'Claude(클로드)에서 MCP로 바로 이미지·영상을 생성하세요. 본인 계정 크레딧으로 차감됩니다.': {
    en: 'Generate images & videos right inside Claude via MCP — billed to your own account credits.',
    ja: 'Claude内からMCPで画像・動画を直接生成。ご自身のアカウントのクレジットから差し引かれます。',
    zh: '在 Claude 中通过 MCP 直接生成图片与视频，按您自己的账户积分扣费。',
  },
  '연동 방법 보기': { en: 'See how to connect', ja: '連携方法を見る', zh: '查看对接方法' },
  '클로드 MCP 소개': { en: 'About Claude MCP', ja: 'Claude MCPの紹介', zh: '了解 Claude MCP' },
  '클로드 MCP 소개 보기': { en: 'See the Claude MCP introduction', ja: 'Claude MCPの紹介を見る', zh: '查看 Claude MCP 介绍' },

  // ===== PAIN =====
  '솔직히, 지금 이렇지 않나요?': {
    en: 'Honestly, isn’t this you right now?',
    ja: '正直、今こうなっていませんか？',
    zh: '说实话，你现在是不是这样？',
  },
  '이런 마케팅,': {
    en: 'Marketing like this —',
    ja: 'こんなマーケティング、',
    zh: '这样的营销，',
  },
  '아직도': {
    en: 'still',
    ja: 'まだ',
    zh: '还在',
  },
  '하고 계신가요?': {
    en: 'doing it?',
    ja: 'していませんか？',
    zh: '做吗？',
  },
  '문제는 당신의 실력이 아닙니다. 도구가 흩어져 있을 뿐입니다.': {
    en: 'The problem isn’t your skills. Your tools are just scattered.',
    ja: '問題はあなたの実力ではありません。ツールが散らばっているだけです。',
    zh: '问题不在于你的能力，只是工具太分散了。',
  },
  '도구 5개를 오가며 복붙': {
    en: 'Copy-pasting across 5 different tools',
    ja: '5つのツールを行き来してコピペ',
    zh: '在 5 个工具间来回复制粘贴',
  },
  '탭을 옮겨 다니는 사이, 경쟁사는 벌써 다음 캠페인을 올리고 있습니다.': {
    en: 'While you switch between tabs, competitors are already launching their next campaign.',
    ja: 'タブを行き来している間に、競合はもう次のキャンペーンを出しています。',
    zh: '当你在标签页间切换时，竞争对手已经上线了下一个活动。',
  },
  '어떤 광고가 먹히는지 감으로 판단': {
    en: 'Guessing which ads actually work',
    ja: 'どの広告が効くのかを勘で判断',
    zh: '凭感觉判断哪个广告有效',
  },
  '감으로 태운 예산은, 어디서 새고 있는지조차 보이지 않습니다.': {
    en: 'Budget spent on gut feeling leaks away where you can’t even see it.',
    ja: '勘で使った予算は、どこで漏れているのかさえ見えません。',
    zh: '凭感觉花掉的预算，连从哪里流失都看不见。',
  },
  '콘텐츠 하나 만드는 데 반나절': {
    en: 'Half a day to make a single piece of content',
    ja: 'コンテンツ1つ作るのに半日',
    zh: '做一条内容要花半天',
  },
  '소재 하나에 하루가 가고, 그렇게 또 한 주가 사라집니다.': {
    en: 'One asset eats up a day, and just like that another week is gone.',
    ja: '素材1つで1日が過ぎ、そうしてまた1週間が消えていきます。',
    zh: '一个素材耗掉一天，一周就这样又没了。',
  },
  '수집한 DB는 엑셀에 방치': {
    en: 'Collected leads left to rot in Excel',
    ja: '集めたDBはExcelに放置',
    zh: '收集来的数据被丢在 Excel 里',
  },
  '어렵게 모은 고객 명단이 시트 안에서 잠들어 있습니다.': {
    en: 'The customer list you worked so hard to build sits asleep in a spreadsheet.',
    ja: '苦労して集めた顧客リストが、シートの中で眠っています。',
    zh: '好不容易积累的客户名单，正沉睡在表格里。',
  },
  '흩어진 이 모든 일을 하나의 흐름으로 잇는 방법이 있습니다.': {
    en: 'There’s a way to connect all this scattered work into a single flow.',
    ja: '散らばったこれらすべてを、一つの流れにつなぐ方法があります。',
    zh: '有一种方法，能把这些分散的工作串联成一条流程。',
  },
  '그게': {
    en: 'And that’s',
    ja: 'それが',
    zh: '那就是',
  },
  '입니다.': {
    en: '.',
    ja: 'です。',
    zh: '。',
  },

  // ===== FEATURES =====
  '핵심 기능 · AI 영상 제작': {
    en: 'Core · AI video',
    ja: 'コア機能 · AI動画',
    zh: '核心 · AI 视频',
  },
  '마케팅의 중심,': {
    en: 'The heart of marketing,',
    ja: 'マーケティングの中心、',
    zh: '营销的核心，',
  },
  'AI 영상 제작': {
    en: 'AI video production',
    ja: 'AI動画制作',
    zh: 'AI 视频制作',
  },
  '모든 AI 영상 모델과 ControlNet 모션 제어를 노드로 연결해 원하는 장면을 정확히 만들고, 마케팅에 필요한 나머지 기능까지 하나로 잇습니다.': {
    en: 'Connect every AI video model and ControlNet motion control as nodes to build exactly the scene you want — and everything else your marketing needs, unified.',
    ja: 'すべてのAI動画モデルとControlNetのモーション制御をノードでつなぎ、狙った場面を正確に作り、マーケティングに必要な残りの機能まで一つにつなげます。',
    zh: '将所有 AI 视频模型与 ControlNet 动作控制以节点连接，精准打造想要的画面，并把营销所需的其余功能一并串联。',
  },
  '마케팅을 완성하는 부가 서비스': {
    en: 'Add-on services that complete your marketing',
    ja: 'マーケティングを完成させる付加サービス',
    zh: '让营销更完整的附加服务',
  },
  '영상 제작에 더해, 수집·분석·전환까지 한 워크스페이스에서.': {
    en: 'Beyond video — capture, analytics, and conversion, all in one workspace.',
    ja: '動画制作に加え、収集・分析・転換まで一つのワークスペースで。',
    zh: '不止视频——收集、分析、转化，尽在一个工作区。',
  },
  '살펴보기': {
    en: 'Learn more',
    ja: '詳しく見る',
    zh: '查看详情',
  },
  '전체 기능 한눈에 보기': {
    en: 'See all features at a glance',
    ja: 'すべての機能を一覧で見る',
    zh: '一览全部功能',
  },

  // ===== HOW IT WORKS =====
  '작동 방식': {
    en: 'How it works',
    ja: '仕組み',
    zh: '运作方式',
  },
  '수집 → 분석 → 전환 → 자동화': {
    en: 'Collect → Analyze → Convert → Automate',
    ja: '収集 → 分析 → 転換 → 自動化',
    zh: '收集 → 分析 → 转化 → 自动化',
  },
  '랜딩페이지로 DB 수집': {
    en: 'Capture leads with landing pages',
    ja: 'ランディングページでDB収集',
    zh: '用落地页收集数据',
  },
  '개발자 없이 몇 분 만에 랜딩페이지를 띄우고, 흘려보내던 방문자를 고객 DB로 붙잡습니다.': {
    en: 'Launch a landing page in minutes with no developer, and turn passing visitors into a customer database.',
    ja: '開発者なしで数分でランディングページを公開し、逃していた訪問者を顧客DBとして獲得します。',
    zh: '无需开发人员，几分钟即可上线落地页，把流失的访客留存为客户数据。',
  },
  '채널·광고 성과 분석': {
    en: 'Analyze channel & ad performance',
    ja: 'チャネル・広告の成果分析',
    zh: '分析渠道与广告成效',
  },
  '흩어진 채널 데이터를 자동으로 모아, 어떤 콘텐츠와 광고가 매출을 만드는지 한눈에 보여줍니다.': {
    en: 'Automatically gather scattered channel data to see at a glance which content and ads drive revenue.',
    ja: '散らばったチャネルデータを自動で集め、どのコンテンツと広告が売上を生むのかを一目で見せます。',
    zh: '自动汇总分散的渠道数据，一眼看清哪些内容和广告带来了收入。',
  },
  'CRM으로 전환·재구매': {
    en: 'Convert & retain with CRM',
    ja: 'CRMで転換・リピート',
    zh: '用 CRM 促成转化与复购',
  },
  '모인 DB를 세그먼트로 나눠 알맞은 메시지를 보내고, 문자·알림톡으로 다시 매출까지 연결합니다.': {
    en: 'Segment your collected leads, send the right message, and drive repeat sales via SMS and KakaoTalk alerts.',
    ja: '集めたDBをセグメントに分け、適切なメッセージを送り、SMS・アラートトークで再び売上につなげます。',
    zh: '将收集的数据分组，发送合适的消息，并通过短信和提醒消息再次带来销售。',
  },
  'AI로 콘텐츠·영상 자동화': {
    en: 'Automate content & video with AI',
    ja: 'AIでコンテンツ・動画を自動化',
    zh: '用 AI 自动生成内容与视频',
  },
  '반나절 걸리던 소재 제작이 프롬프트 한 줄로 끝. AI가 카피와 영상을 대신 만들어냅니다.': {
    en: 'What took half a day now ends with a single prompt. AI creates your copy and videos for you.',
    ja: '半日かかっていた素材制作がプロンプト一行で完了。AIがコピーと動画を代わりに作ります。',
    zh: '过去半天才能完成的素材制作，一行提示词即可搞定。AI 替你生成文案与视频。',
  },
  '즉시 자동화': {
    en: 'Instant automation',
    ja: '即時自動化',
    zh: '即时自动化',
  },
  '반복 작업을 자동으로. 워크플로우를 한번 만들면 계속 돌아갑니다.': {
    en: 'Automate repetitive tasks. Build a workflow once and it keeps running.',
    ja: '繰り返し作業を自動で。ワークフローを一度作れば動き続けます。',
    zh: '让重复工作自动化。工作流一次搭好，便持续运行。',
  },
  '데이터 기반 의사결정': {
    en: 'Data-driven decisions',
    ja: 'データに基づく意思決定',
    zh: '数据驱动的决策',
  },
  '감이 아닌 숫자로. 모든 채널 성과를 한 화면에서 봅니다.': {
    en: 'By the numbers, not by gut. See every channel’s performance on one screen.',
    ja: '勘ではなく数字で。すべてのチャネルの成果を一画面で見ます。',
    zh: '用数字而非感觉。在一个界面查看所有渠道的成效。',
  },
  '안전한 데이터 관리': {
    en: 'Secure data management',
    ja: '安全なデータ管理',
    zh: '安全的数据管理',
  },
  '수집한 고객 DB를 안전하게 저장하고 규정에 맞게 관리합니다.': {
    en: 'Store your collected customer data securely and manage it in compliance with regulations.',
    ja: '収集した顧客DBを安全に保存し、規定に沿って管理します。',
    zh: '安全存储收集到的客户数据，并合规管理。',
  },

  // ===== BEFORE / AFTER =====
  '무엇이 달라지나': {
    en: 'What changes',
    ja: '何が変わるのか',
    zh: '会有什么不同',
  },
  '없이': {
    en: 'without',
    ja: 'なし',
    zh: '没有',
  },
  '와 함께': {
    en: ' with',
    ja: 'あり',
    zh: '有',
  },
  '같은 하루, 같은 팀. 도구 하나가 결과를 이렇게 바꿉니다.': {
    en: 'Same day, same team. One tool changes the outcome this much.',
    ja: '同じ一日、同じチーム。ツール一つが結果をこれほど変えます。',
    zh: '同样的一天，同样的团队。一个工具就能让结果如此不同。',
  },
  'BYGENCY 없이': {
    en: 'Without BYGENCY',
    ja: 'BYGENCYなし',
    zh: '没有 BYGENCY',
  },
  '흩어진 도구 5개, 열린 탭 20개': {
    en: '5 scattered tools, 20 open tabs',
    ja: '散らばったツール5つ、開いたタブ20個',
    zh: '5 个分散的工具，20 个打开的标签页',
  },
  '하나로 이어진 노드 워크스페이스': {
    en: 'One connected node workspace',
    ja: '一つにつながったノードワークスペース',
    zh: '连成一体的节点工作区',
  },
  '감으로 하는 예산 배분': {
    en: 'Budgeting by gut feeling',
    ja: '勘で行う予算配分',
    zh: '凭感觉分配预算',
  },
  '데이터로 하는 의사결정': {
    en: 'Decisions backed by data',
    ja: 'データで行う意思決定',
    zh: '基于数据的决策',
  },
  '콘텐츠 하나에 반나절': {
    en: 'Half a day per piece of content',
    ja: 'コンテンツ一つに半日',
    zh: '一条内容耗时半天',
  },
  '프롬프트 한 줄, 3분이면 완성': {
    en: 'One prompt, done in 3 minutes',
    ja: 'プロンプト一行、3分で完成',
    zh: '一行提示词，3 分钟完成',
  },
  '엑셀에 잠든 고객 DB': {
    en: 'Customer data asleep in Excel',
    ja: 'Excelで眠る顧客DB',
    zh: '沉睡在 Excel 里的客户数据',
  },
  '자동 세그먼트 · 알림톡 발송': {
    en: 'Auto-segmentation & alert messaging',
    ja: '自動セグメント・アラートトーク送信',
    zh: '自动分组与提醒消息推送',
  },
  '매주 반복되는 수작업': {
    en: 'Manual work repeated every week',
    ja: '毎週繰り返される手作業',
    zh: '每周重复的手动操作',
  },
  '한 번 만든 자동화가 계속 실행': {
    en: 'Build automation once, it runs forever',
    ja: '一度作った自動化がずっと稼働',
    zh: '自动化一次搭建，持续运行',
  },

  // ===== URGENCY =====
  '격차는 지금도 벌어지고 있습니다': {
    en: 'The gap is widening right now',
    ja: '差は今も広がっています',
    zh: '差距此刻仍在扩大',
  },
  '지금 시작해야 하는 이유': {
    en: 'Why you should start now',
    ja: '今始めるべき理由',
    zh: '为什么现在就要开始',
  },
  '경쟁사는 이미 AI로 하루에 수십 개의 콘텐츠를 만들고, 데이터로 예산을 배분합니다. 그 격차는 오늘도 조용히, 그러나 확실히 벌어지고 있습니다.': {
    en: 'Competitors already use AI to produce dozens of pieces of content a day and allocate budget by data. That gap keeps widening today — quietly, but surely.',
    ja: '競合はすでにAIで一日に何十ものコンテンツを作り、データで予算を配分しています。その差は今日も静かに、しかし確実に広がっています。',
    zh: '竞争对手早已用 AI 每天产出数十条内容，并用数据分配预算。这道差距今天也在悄然而确实地扩大。',
  },
  '따라잡는 비용은 미룰수록 커집니다. 가장 저렴한 출발선은 언제나 ‘오늘’입니다.': {
    en: 'The cost of catching up only grows the longer you wait. The cheapest starting line is always “today.”',
    ja: '追いつくコストは、先延ばしにするほど大きくなります。最も安いスタートラインは、いつも「今日」です。',
    zh: '追赶的成本会随拖延而增加。最便宜的起跑线，永远是「今天」。',
  },
  '지금 바로 시작하기': {
    en: 'Start free now',
    ja: '今すぐ無料で始める',
    zh: '立即免费开始',
  },

  // ===== SOCIAL PROOF =====
  '사용자 이야기': {
    en: 'Customer stories',
    ja: 'ユーザーの声',
    zh: '用户故事',
  },
  '도구를 바꾸자,': {
    en: 'Change the tool,',
    ja: 'ツールを変えたら、',
    zh: '换了工具，',
  },
  '일하는 방식': {
    en: 'the way we work',
    ja: '働き方',
    zh: '工作方式',
  },
  '이 바뀌었습니다': {
    en: ' changed',
    ja: 'が変わりました',
    zh: '就变了',
  },
  '클라이언트 다섯 곳의 채널을 탭 스무 개로 관리하던 시절이 있었죠. 지금은 대시보드 하나면 끝입니다. 월간 보고서 만드는 시간이 절반으로 줄었어요.': {
    en: 'There was a time I managed five clients’ channels across twenty tabs. Now a single dashboard does it all. The time I spend on monthly reports has been cut in half.',
    ja: 'クライアント5社のチャネルをタブ20個で管理していた時期がありました。今はダッシュボード一つで完結します。月次レポートの作成時間が半分になりました。',
    zh: '曾经我要用二十个标签页管理五家客户的渠道。现在一个仪表盘就够了。做月报的时间减少了一半。',
  },
  '마케팅 대행사 대표': {
    en: 'CEO, Marketing Agency',
    ja: 'マーケティング代理店 代表',
    zh: '营销代理公司负责人',
  },
  '가설을 세우고 검증하는 사이클이 눈에 띄게 빨라졌습니다. 어떤 소재가 먹히는지 숫자로 보이니, 예산 배분을 두고 회의할 일이 사라졌어요.': {
    en: 'The cycle of forming and testing hypotheses got noticeably faster. Once you can see in numbers which assets work, the meetings about budget allocation just disappear.',
    ja: '仮説を立てて検証するサイクルが目に見えて速くなりました。どの素材が効くのか数字で分かるので、予算配分をめぐる会議がなくなりました。',
    zh: '提出假设并验证的周期明显加快了。哪个素材有效用数字一看便知，为预算分配开会的事也没有了。',
  },
  '스타트업 그로스 리드': {
    en: 'Growth Lead, Startup',
    ja: 'スタートアップ グロースリード',
    zh: '创业公司增长负责人',
  },
  '마케팅은 남의 일이라 생각했는데, 랜딩페이지 만들고 단골에게 알림톡 보내는 걸 이제 제가 직접 합니다. 재방문 손님이 확실히 늘었어요.': {
    en: 'I used to think marketing was someone else’s job, but now I build landing pages and send alert messages to regulars myself. Returning customers have clearly increased.',
    ja: 'マーケティングは他人事だと思っていましたが、今はランディングページを作り、常連にアラートトークを送るのを自分でやっています。再来店のお客様が確実に増えました。',
    zh: '我原以为营销是别人的事，如今做落地页、给老顾客发提醒消息都由我亲自完成。回头客明显增多了。',
  },
  '동네 카페 운영': {
    en: 'Owner, Neighborhood Café',
    ja: '街のカフェ経営',
    zh: '社区咖啡馆经营者',
  },
  '데이터 암호화 저장': {
    en: 'Encrypted data storage',
    ja: 'データ暗号化保存',
    zh: '数据加密存储',
  },
  '개인정보 규정 준수': {
    en: 'Privacy compliance',
    ja: '個人情報規定の遵守',
    zh: '遵守隐私法规',
  },
  '국내 카드·간편결제': {
    en: 'Local cards & easy payment',
    ja: '国内カード・簡単決済',
    zh: '本地银行卡与便捷支付',
  },
  '한국어 지원팀': {
    en: 'Korean-speaking support',
    ja: '韓国語サポートチーム',
    zh: '韩语支持团队',
  },
  '위 후기는 서비스 활용 방식을 보여주기 위한 직무 페르소나 예시입니다.': {
    en: 'The reviews above are job-persona examples meant to illustrate how the service is used.',
    ja: '上記のレビューは、サービスの活用方法を示すための職務ペルソナの例です。',
    zh: '以上评价为展示服务使用方式的职业人物示例。',
  },

  // ===== PRICING =====
  '요금제': {
    en: 'Pricing',
    ja: '料金プラン',
    zh: '价格方案',
  },
  '규모에 맞게 성장하세요': {
    en: 'Grow at your own scale',
    ja: '規模に合わせて成長しましょう',
    zh: '按需扩展，随规模成长',
  },
  '무료로 시작하고 필요할 때 업그레이드하세요.': {
    en: 'Start free and upgrade whenever you need to.',
    ja: '無料で始めて、必要なときにアップグレードしましょう。',
    zh: '免费开始，需要时再升级。',
  },
  '가장 인기': {
    en: 'Most popular',
    ja: '一番人気',
    zh: '最受欢迎',
  },
  '개인 마케터의 시작': {
    en: 'A start for solo marketers',
    ja: '個人マーケターのスタート',
    zh: '个人营销者的起点',
  },
  '성장하는 팀을 위한 선택': {
    en: 'The choice for growing teams',
    ja: '成長するチームのための選択',
    zh: '成长型团队之选',
  },
  '대행사·엔터프라이즈': {
    en: 'Agencies & enterprise',
    ja: '代理店・エンタープライズ',
    zh: '代理公司与企业',
  },
  '무료': {
    en: 'Free',
    ja: '無料',
    zh: '免费',
  },
  '문의': {
    en: 'Contact',
    ja: 'お問い合わせ',
    zh: '咨询',
  },
  '/월': {
    en: '/mo',
    ja: '/月',
    zh: '/月',
  },
  '랜딩페이지 1개': {
    en: '1 landing page',
    ja: 'ランディングページ1個',
    zh: '1 个落地页',
  },
  '월 500 DB 수집': {
    en: '500 leads/month',
    ja: '月500件のDB収集',
    zh: '每月收集 500 条数据',
  },
  '유튜브·블로그 분석': {
    en: 'YouTube & blog analytics',
    ja: 'YouTube・ブログ分析',
    zh: 'YouTube 与博客分析',
  },
  '기본 리포트': {
    en: 'Basic reports',
    ja: '基本レポート',
    zh: '基础报告',
  },
  '랜딩페이지 무제한': {
    en: 'Unlimited landing pages',
    ja: 'ランディングページ無制限',
    zh: '无限落地页',
  },
  '월 30,000 DB 수집': {
    en: '30,000 leads/month',
    ja: '月30,000件のDB収集',
    zh: '每月收集 30,000 条数据',
  },
  '전체 분석 + 광고 통합': {
    en: 'Full analytics + ad integration',
    ja: '全分析＋広告統合',
    zh: '完整分析 + 广告整合',
  },
  'CRM · 알림톡 캠페인': {
    en: 'CRM & alert-message campaigns',
    ja: 'CRM・アラートトークキャンペーン',
    zh: 'CRM 与提醒消息营销',
  },
  'AI 챗봇 어시스턴트': {
    en: 'AI chatbot assistant',
    ja: 'AIチャットボットアシスタント',
    zh: 'AI 聊天机器人助手',
  },
  '팀 협업 5인': {
    en: 'Team collaboration for 5',
    ja: 'チームコラボ5人',
    zh: '5 人团队协作',
  },
  '모든 Pro 기능': {
    en: 'Everything in Pro',
    ja: 'すべてのPro機能',
    zh: '全部 Pro 功能',
  },
  'DB 수집 무제한': {
    en: 'Unlimited lead collection',
    ja: 'DB収集無制限',
    zh: '无限数据收集',
  },
  'AI 영상 제작 무제한': {
    en: 'Unlimited AI video production',
    ja: 'AI動画制作無制限',
    zh: '无限 AI 视频制作',
  },
  '전담 매니저': {
    en: 'Dedicated manager',
    ja: '専任マネージャー',
    zh: '专属客户经理',
  },
  'API·화이트라벨': {
    en: 'API & white-label',
    ja: 'API・ホワイトラベル',
    zh: 'API 与白标',
  },
  '무료로 시작': {
    en: 'Start free',
    ja: '無料で始める',
    zh: '免费开始',
  },
  'Pro 시작하기': {
    en: 'Get Pro',
    ja: 'Proを始める',
    zh: '开通 Pro',
  },
  'Plus 시작하기': {
    en: 'Get Plus',
    ja: 'Plusを始める',
    zh: '开通 Plus',
  },
  '규모에 맞게 필요한 만큼만. 언제든 업그레이드·다운그레이드하세요.': {
    en: 'Only what you need, at your scale. Upgrade or downgrade anytime.',
    ja: '規模に合わせて必要な分だけ。いつでもアップ・ダウングレード可能。',
    zh: '按需按规模付费，随时升级或降级。',
  },
  '도입 문의': {
    en: 'Contact sales',
    ja: '導入のお問い合わせ',
    zh: '咨询采用',
  },
  '마케터 · AI 영상 제작 플랜 자세히 보기 →': {
    en: 'See the Marketer & AI Video plans in detail →',
    ja: 'マーケター・AI動画制作プランの詳細を見る →',
    zh: '查看营销者与 AI 视频制作方案详情 →',
  },

  // ===== CTA =====
  '지금 바로 BYGENCY를 시작하세요': {
    en: 'Get started with BYGENCY today',
    ja: '今すぐBYGENCYを始めましょう',
    zh: '立即开启 BYGENCY',
  },
  '탭 20개, 도구 5개, 매주 반복되던 수작업. 오늘부로 정리하세요. 3분이면 첫 워크스페이스가 열립니다.': {
    en: '20 tabs, 5 tools, manual work repeated every week — put an end to it today. No credit card, and your first workspace opens in 3 minutes.',
    ja: 'タブ20個、ツール5個、毎週繰り返す手作業。今日で終わりにしましょう。クレジットカードなし、3分で最初のワークスペースが開きます。',
    zh: '20 个标签页、5 个工具、每周重复的手动操作，从今天起彻底清理。无需信用卡，3 分钟即可开启你的第一个工作区。',
  },
  '로그인': {
    en: 'Log in',
    ja: 'ログイン',
    zh: '登录',
  },
}

const PLATFORMS = ['NAVER', 'Meta', 'Google', 'YouTube', 'Kakao', 'Instagram', 'TikTok', 'GA4']

const STEPS = [
  { n: '01', title: '랜딩페이지로 DB 수집', desc: '개발자 없이 몇 분 만에 랜딩페이지를 띄우고, 흘려보내던 방문자를 고객 DB로 붙잡습니다.' },
  { n: '02', title: '채널·광고 성과 분석', desc: '흩어진 채널 데이터를 자동으로 모아, 어떤 콘텐츠와 광고가 매출을 만드는지 한눈에 보여줍니다.' },
  { n: '03', title: 'CRM으로 전환·재구매', desc: '모인 DB를 세그먼트로 나눠 알맞은 메시지를 보내고, 문자·알림톡으로 다시 매출까지 연결합니다.' },
  { n: '04', title: 'AI로 콘텐츠·영상 자동화', desc: '반나절 걸리던 소재 제작이 프롬프트 한 줄로 끝. AI가 카피와 영상을 대신 만들어냅니다.' },
]

const PAINS = [
  { icon: Copy, title: '도구 5개를 오가며 복붙', sting: '탭을 옮겨 다니는 사이, 경쟁사는 벌써 다음 캠페인을 올리고 있습니다.' },
  { icon: Compass, title: '어떤 광고가 먹히는지 감으로 판단', sting: '감으로 태운 예산은, 어디서 새고 있는지조차 보이지 않습니다.' },
  { icon: Clock, title: '콘텐츠 하나 만드는 데 반나절', sting: '소재 하나에 하루가 가고, 그렇게 또 한 주가 사라집니다.' },
  { icon: Archive, title: '수집한 DB는 엑셀에 방치', sting: '어렵게 모은 고객 명단이 시트 안에서 잠들어 있습니다.' },
]

const CONTRAST = [
  { before: '흩어진 도구 5개, 열린 탭 20개', after: '하나로 이어진 노드 워크스페이스' },
  { before: '감으로 하는 예산 배분', after: '데이터로 하는 의사결정' },
  { before: '콘텐츠 하나에 반나절', after: '프롬프트 한 줄, 3분이면 완성' },
  { before: '엑셀에 잠든 고객 DB', after: '자동 세그먼트 · 알림톡 발송' },
  { before: '매주 반복되는 수작업', after: '한 번 만든 자동화가 계속 실행' },
]

const VOICES = [
  {
    quote: '클라이언트 다섯 곳의 채널을 탭 스무 개로 관리하던 시절이 있었죠. 지금은 대시보드 하나면 끝입니다. 월간 보고서 만드는 시간이 절반으로 줄었어요.',
    name: '김대표',
    role: '마케팅 대행사 대표',
  },
  {
    quote: '가설을 세우고 검증하는 사이클이 눈에 띄게 빨라졌습니다. 어떤 소재가 먹히는지 숫자로 보이니, 예산 배분을 두고 회의할 일이 사라졌어요.',
    name: '이리드',
    role: '스타트업 그로스 리드',
  },
  {
    quote: '마케팅은 남의 일이라 생각했는데, 랜딩페이지 만들고 단골에게 알림톡 보내는 걸 이제 제가 직접 합니다. 재방문 손님이 확실히 늘었어요.',
    name: '박사장',
    role: '동네 카페 운영',
  },
]

const TRUST = [
  { icon: Lock, label: '데이터 암호화 저장' },
  { icon: ShieldCheck, label: '개인정보 규정 준수' },
  { icon: CreditCard, label: '국내 카드·간편결제' },
  { icon: LifeBuoy, label: '한국어 지원팀' },
]

// 홈 요금제 = 노드형 AI 영상 제작 플랜 (Plus·Pro·Max)
const PLANS = [
  {
    name: 'Plus', price: '₩49,000', period: '/월', desc: '숏폼 영상을 직접 만들어보는 시작 단계',
    features: ['월 1,500 크레딧 제공', '노드 에디터 기본 워크플로우', '기본 영상 생성 모델', '숏폼·광고 템플릿 제공', '1080p 렌더링'],
    cta: 'Plus 시작하기', href: '/signup', highlight: false,
  },
  {
    name: 'Pro', price: '₩149,000', period: '/월', desc: '콘텐츠를 대량으로 찍어내는 제작 팀',
    features: ['월 6,000 크레딧 제공', '고급 모델 (Seedance · Veo 등)', '워터마크 제거', '노드 커스텀 워크플로우 저장', '음성·자막 자동 생성', '팀 공유 · 에셋 라이브러리'],
    cta: 'Pro 시작하기', href: '/signup', highlight: true,
  },
  {
    name: 'Max', price: '₩390,000', period: '/월', desc: '영상을 끊김 없이 쏟아내는 스튜디오·대행사',
    features: ['월 20,000 크레딧 (무제한급)', '최상위 영상·이미지 모델 전체', '우선 렌더 큐 · 대기 없는 처리', '4K 고해상도 렌더링', 'API · 배치 렌더 자동화', '전담 매니저 · 우선 지원'],
    cta: '도입 문의', href: '/contact', highlight: false,
  },
]

const wonH = (n: number) => '₩' + Math.round(n || 0).toLocaleString('ko-KR')
export default function Home() {
  const t = useT(M)
  const [planCfg, setPlanCfg] = useState<PlanConfigData | null>(null)
  useEffect(() => { planConfig().then((r) => { if (r.ok && r.config) setPlanCfg(r.config) }) }, [])
  const videoPlans = PLANS.map((p) => {
    const c = planCfg?.video?.[p.name]
    if (!c) return p as typeof p & { origPrice?: string; discountPct?: number }
    const disc = Math.max(0, Math.min(100, Number(c.discount) || 0))
    const effective = Math.round((Number(c.price) || 0) * (1 - disc / 100))
    return {
      ...p,
      price: wonH(effective),
      origPrice: disc > 0 ? wonH(c.price) : undefined,
      discountPct: disc > 0 ? disc : undefined,
      features: Array.isArray(c.features) && c.features.length ? c.features : p.features,
    }
  })
  return (
    <div className="site-dark min-h-screen overflow-x-hidden">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-24 text-white sm:pt-40 sm:pb-28">
        {/* 배경: AI 제작 사진이 흐르는 프리미엄 포토월 */}
        <HeroPhotoWall />

        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-xs font-semibold text-blue-200 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-ring absolute inline-flex h-full w-full rounded-full bg-blue-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full brand-gradient" />
              </span>
              {t('노드 기반 올인원 마케팅 스튜디오')}
            </span>
          </div>

          <h1 className="mt-7 text-balance text-5xl font-bold leading-[1.08] tracking-tight animate-fade-up delay-100 sm:text-6xl md:text-7xl">
            {t('마케팅의 모든 것을')}
            <br />
            <span className="brand-text">BYGENCY</span> {t('하나로')}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-slate-300 animate-fade-up delay-200">
            {t('DB수집 랜딩페이지 · 유튜브/블로그 분석 · 광고 분석 · CRM · AI 영상 제작까지.')}
            <br className="hidden sm:block" />
            {t('흩어진 마케팅 도구를 하나의 노드 워크스페이스로 통합했습니다.')}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 animate-fade-up delay-300 sm:flex-row">
            <Button href="/signup" size="lg" className="group">
              {t('지금 시작하기')}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="/features" size="lg" className="!border !border-white/25 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20">
              <Play size={16} /> {t('기능 둘러보기')}
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 animate-fade-up delay-400">
            {['노드형 AI 광고·브랜드 영상', '네이버 플레이스 마케팅', '블로그 마케팅', '콘텐츠 마케팅'].map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-sm font-medium text-slate-200 shadow-sm backdrop-blur transition-colors hover:border-white/25 hover:bg-white/[0.09]"
              >
                <span className="h-1.5 w-1.5 rounded-full brand-gradient" />
                {t(item)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AI 파이프라인 (히어로 칩 바로 아래, 실시간 라이브 진행) ===== */}
      <AIPipeline />

      {/* ===== AI 영상 갤러리 (힉스필드 스타일, 모델별 제작 영상) ===== */}
      <AIVideoGallery />

      {/* ===== 클로드 MCP 연동 배지 ===== */}
      <section className="border-b border-white/10 py-12">
        <Reveal className="mx-auto max-w-3xl px-5">
          <div className="mx-auto flex flex-col items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-6 text-center sm:flex-row sm:text-left">
            <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border border-[#D97757]/30 bg-[#D97757]/10">
              <ClaudeMark size={34} />
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-bold tracking-tight">{t('클로드 MCP 연동')}</h3>
              <p className="mt-1 text-sm text-slate-300">
                {t('Claude(클로드)에서 MCP로 바로 이미지·영상을 생성하세요. 본인 계정 크레딧으로 차감됩니다.')}
              </p>
            </div>
            <Link
              href="/claude-mcp"
              aria-label={t('클로드 MCP 소개 보기')}
              className="group inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-[#D97757] to-[#c0603f] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#D97757]/25 transition hover:brightness-110"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
              {t('클로드 MCP 소개')}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ===== 채널 오빗 (실제 로고 공전) ===== */}
      <section className="relative overflow-hidden border-y border-white/10 py-20 text-white">
        <div className="animate-drift pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-700/15 blur-[150px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-blue-200 backdrop-blur">
              {t('하나로 연결되는 채널')}
            </span>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {t('흩어진 채널을')} <span className="brand-text animate-gradient">BYGENCY</span> {t('중심으로')}
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-balance text-slate-300 lg:mx-0">
              {t('유튜브 · 네이버 플레이스 · 카카오 · 블로그 · 인스타그램 · 뉴스까지, 주요 마케팅 채널을 한 곳에서 수집·분석·실행합니다.')}
            </p>
          </div>
          <HeroOrbit />
        </div>
      </section>

      {/* ===== MARQUEE TRUST ===== */}
      <section className="border-b border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-5">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
            {t('주요 마케팅 채널 데이터를 한 곳에서 통합 연동')}
          </p>
          <Marquee
            items={PLATFORMS.map((p) => (
              <span
                key={p}
                className="text-xl font-extrabold tracking-tight text-slate-600 transition-colors hover:text-slate-300"
              >
                {p}
              </span>
            ))}
          />
        </div>
      </section>


      {/* ===== PAIN / AGITATION ===== */}
      <section className="relative border-t border-white/10 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('솔직히, 지금 이렇지 않나요?')}</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {t('이런 마케팅,')} <span className="text-rose-400">{t('아직도')}</span> {t('하고 계신가요?')}
            </h2>
            <p className="mt-5 text-balance text-lg text-[var(--text-soft)]">
              {t('문제는 당신의 실력이 아닙니다. 도구가 흩어져 있을 뿐입니다.')}
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PAINS.map((p, i) => {
              const Icon = p.icon
              return (
                <Reveal key={p.title} delay={(i % 4) * 90}>
                  <div className="card hover-lift h-full p-6">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/12 text-rose-400">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-4 font-semibold leading-snug">{t(p.title)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{t(p.sting)}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal delay={120} className="mx-auto mt-12 max-w-2xl text-center">
            <p className="text-balance text-lg font-medium text-[var(--text)]">
              {t('흩어진 이 모든 일을 하나의 흐름으로 잇는 방법이 있습니다.')}
              <br className="hidden sm:block" /> {t('그게')} <span className="brand-text font-bold">BYGENCY</span>{t('입니다.')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== FEATURES (AI 영상 제작 중심) ===== */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('핵심 기능 · AI 영상 제작')}</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {t('마케팅의 중심,')} <span className="brand-text">{t('AI 영상 제작')}</span>
            </h2>
            <p className="mt-5 text-balance text-lg text-[var(--text-soft)]">
              {t('모든 AI 영상 모델과 ControlNet 모션 제어를 노드로 연결해 원하는 장면을 정확히 만들고, 마케팅에 필요한 나머지 기능까지 하나로 잇습니다.')}
            </p>
          </Reveal>

          {/* 대형 AI 영상 제작 쇼케이스 */}
          <Reveal variant="rise" className="mt-14">
            <AIVideoShowcase />
          </Reveal>

          {/* 부가 서비스 */}
          <Reveal className="mt-20 text-center">
            <div className="mx-auto flex max-w-md items-center gap-4">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">
                {t('마케팅을 완성하는 부가 서비스')}
              </span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
            </div>
            <p className="mt-4 text-balance text-[var(--text-soft)]">
              {t('영상 제작에 더해, 수집·분석·전환까지 한 워크스페이스에서.')}
            </p>
          </Reveal>

          {/* 마케팅 대시보드 미리보기 (부가 서비스 섹션으로 이동) */}
          <div className="relative mt-10">
            <HeroDashboard />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.filter((f) => f.slug !== 'video').map((f, i) => {
              const Icon = f.icon
              const LOGO: Record<string, React.ReactNode> = {
                youtube: <YouTubeLogo />,
                blog: <NaverBlogLogo />,
                crm: <KakaoLogo />,
              }
              const mark =
                f.slug === 'ads' ? (
                  <div className="flex h-11 flex-shrink-0 items-center transition-transform duration-300 group-hover:scale-105">
                    <AdPlatformsCluster />
                  </div>
                ) : LOGO[f.slug] ? (
                  <div className="h-11 w-11 flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                    {LOGO[f.slug]}
                  </div>
                ) : (
                  <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.06] text-blue-300 shadow-md transition-transform duration-300 group-hover:scale-110">
                    <Icon size={19} />
                  </div>
                )
              return (
                <Reveal key={f.slug} variant="rise" delay={i * 90}>
                  <Link
                    href={`/features/${f.slug}`}
                    className="group card hover-lift relative flex h-full items-start gap-4 overflow-hidden p-5"
                  >
                    {mark}
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-1.5 text-base font-semibold">
                        {f.title}
                        <ArrowRight
                          size={14}
                          className="-translate-x-1 text-blue-300 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-soft)]">{f.desc}</p>
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>

          <Reveal delay={100} className="mt-12 text-center">
            <Button href="/features" variant="outline" size="lg" className="group">
              {t('전체 기능 한눈에 보기')}
              <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="relative border-y border-white/10 bg-white/[0.015] py-24">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('작동 방식')}</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {t('수집 → 분석 → 전환 → 자동화')}
            </h2>
          </Reveal>
          <div className="relative mt-16 grid gap-5 md:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent md:block" />
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 110}>
                <div className="card relative h-full p-7">
                  <span className="brand-text text-4xl font-bold">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold">{t(s.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{t(s.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {[
              { icon: Zap, t: '즉시 자동화', d: '반복 작업을 자동으로. 워크플로우를 한번 만들면 계속 돌아갑니다.' },
              { icon: TrendingUp, t: '데이터 기반 의사결정', d: '감이 아닌 숫자로. 모든 채널 성과를 한 화면에서 봅니다.' },
              { icon: ShieldCheck, t: '안전한 데이터 관리', d: '수집한 고객 DB를 안전하게 저장하고 규정에 맞게 관리합니다.' },
            ].map((c, i) => {
              const Icon = c.icon
              return (
                <Reveal key={c.t} delay={i * 100}>
                  <div className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.05]">
                    <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-blue-500/12 text-blue-300">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h4 className="font-semibold">{t(c.t)}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">{t(c.d)}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== BEFORE / AFTER ===== */}
      <section className="relative py-24">
        <div className="mx-auto max-w-5xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('무엇이 달라지나')}</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              BYGENCY <span className="text-rose-400">{t('없이')}</span> vs BYGENCY<span className="brand-text">{t('와 함께')}</span>
            </h2>
            <p className="mt-5 text-balance text-lg text-[var(--text-soft)]">
              {t('같은 하루, 같은 팀. 도구 하나가 결과를 이렇게 바꿉니다.')}
            </p>
          </Reveal>

          <div className="mt-14 grid items-stretch gap-5 md:grid-cols-2">
            <Reveal variant="left">
              <div className="flex h-full flex-col rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-7">
                <div className="mb-6 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/15 text-rose-400">
                    <X size={18} />
                  </span>
                  <span className="font-semibold text-rose-300">{t('BYGENCY 없이')}</span>
                </div>
                <ul className="space-y-4">
                  {CONTRAST.map((c) => (
                    <li key={c.before} className="flex items-start gap-2.5 text-sm">
                      <X size={17} className="mt-0.5 flex-shrink-0 text-rose-400/70" />
                      <span className="text-[var(--text-soft)] line-through decoration-rose-500/40">{t(c.before)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal variant="right">
              <div className="hairline flex h-full flex-col p-7 shadow-[0_40px_90px_-40px_rgba(37,99,235,0.6)]">
                <div className="mb-6 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg brand-gradient text-white">
                    <Check size={18} />
                  </span>
                  <span className="font-semibold text-white"><span className="brand-text">BYGENCY</span>{t('와 함께')}</span>
                </div>
                <ul className="space-y-4">
                  {CONTRAST.map((c) => (
                    <li key={c.after} className="flex items-start gap-2.5 text-sm">
                      <Check size={17} className="mt-0.5 flex-shrink-0 text-blue-300" />
                      <span className="font-medium text-white">{t(c.after)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== URGENCY / COGNITIVE-DISSONANCE BAND ===== */}
      <section className="relative overflow-hidden border-y border-white/10 py-24 text-white">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-30 mask-fade-b" />
        <div className="animate-drift pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-700/25 blur-[150px]" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-rose-200 backdrop-blur">
              <Flame size={14} /> {t('격차는 지금도 벌어지고 있습니다')}
            </span>
            <h2 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {t('지금 시작해야 하는 이유')}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-slate-200">
              {t('경쟁사는 이미 AI로 하루에 수십 개의 콘텐츠를 만들고, 데이터로 예산을 배분합니다. 그 격차는 오늘도 조용히, 그러나 확실히 벌어지고 있습니다.')}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-balance text-slate-400">
              {t('따라잡는 비용은 미룰수록 커집니다. 가장 저렴한 출발선은 언제나 ‘오늘’입니다.')}
            </p>
            <div className="mt-9 flex justify-center">
              <Button href="/signup" size="lg" className="group">
                {t('지금 바로 시작하기')}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== SOCIAL PROOF / TRUST ===== */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('사용자 이야기')}</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {t('도구를 바꾸자,')} <span className="brand-text">{t('일하는 방식')}</span>{t('이 바뀌었습니다')}
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {VOICES.map((v, i) => (
              <Reveal key={v.name} delay={i * 100}>
                <div className="card hover-lift flex h-full flex-col p-7">
                  <Quote size={26} className="text-blue-400/70" />
                  <div className="mt-3 flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={15} className="fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 flex-1 leading-relaxed text-[var(--text-soft)]">&ldquo;{t(v.quote)}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full brand-gradient text-sm font-bold text-white">
                      {v.name.charAt(0)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{v.name}</div>
                      <div className="text-xs text-[var(--text-dim)]">{t(v.role)}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div className="mt-12 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center justify-center gap-2.5 text-sm font-medium text-[var(--text-soft)]">
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-blue-500/12 text-blue-300">
                      <Icon size={17} />
                    </span>
                    {t(item.label)}
                  </div>
                )
              })}
            </div>
          </Reveal>

          <p className="mt-5 text-center text-xs text-[var(--text-dim)]">
            * {t('위 후기는 서비스 활용 방식을 보여주기 위한 직무 페르소나 예시입니다.')}
          </p>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('요금제')}</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {t('규모에 맞게 성장하세요')}
            </h2>
            <p className="mt-5 text-lg text-[var(--text-soft)]">{t('규모에 맞게 필요한 만큼만. 언제든 업그레이드·다운그레이드하세요.')}</p>
          </Reveal>

          <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videoPlans.map((p, i) => (
              <Reveal key={p.name} delay={i * 100} className={p.highlight ? 'lg:-mt-4' : ''}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                    p.highlight
                      ? 'hairline shadow-[0_40px_90px_-40px_rgba(37,99,235,0.6)]'
                      : 'border border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-blue-500/40">
                      {t('가장 인기')}
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
                      <span className="text-4xl font-bold tracking-tight">{t(p.price)}</span>
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
                    track="video"
                    plan={p.name}
                    label={t(p.cta)}
                    variant={p.highlight ? 'primary' : 'outline'}
                    className="mt-8 w-full"
                    contact={p.href === '/contact'}
                  />
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120} className="mt-10 text-center">
            <Link href="/pricing" className="text-sm font-semibold text-blue-300 hover:text-blue-200 hover:underline">
              {t('마케터 · AI 영상 제작 플랜 자세히 보기 →')}
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 pb-28 pt-4">
        <Reveal variant="scale" className="mx-auto max-w-5xl">
          <div className="animate-gradient relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl shadow-blue-900/50"
            style={{ background: 'linear-gradient(120deg,#3b82f6,#2563eb,#0ea5e9,#22d3ee)' }}
          >
            <div className="animate-drift pointer-events-none absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-[90px]" />
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <LogoMark size={40} />
                </span>
              </div>
              <h2 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {t('지금 바로 BYGENCY를 시작하세요')}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                {t('탭 20개, 도구 5개, 매주 반복되던 수작업. 오늘부로 정리하세요. 3분이면 첫 워크스페이스가 열립니다.')}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/signup" size="lg" className="!bg-white !text-blue-700 hover:!bg-blue-50 hover:!brightness-100">
                  {t('지금 시작하기')} <ArrowRight size={18} />
                </Button>
                <Button href="/login" size="lg" className="!border !border-white/40 !bg-white/10 !text-white hover:!bg-white/20">
                  {t('로그인')}
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
