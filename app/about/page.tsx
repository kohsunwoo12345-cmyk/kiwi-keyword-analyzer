'use client'

import {
  ArrowRight,
  Database,
  Workflow,
  LayoutGrid,
  HeartHandshake,
  Target,
  Compass,
  Building2,
  MapPin,
  User,
  Mail,
  ExternalLink,
  Check,
  X,
  Rocket,
  Store,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  // ===== STATS =====
  '활성 마케터': { en: 'Active marketers', ja: 'アクティブなマーケター', zh: '活跃营销人员' },
  '일일 수집 DB': { en: 'Daily collected records', ja: '日次収集データ', zh: '每日采集数据' },
  '평균 전환율 상승': { en: 'Avg. conversion lift', ja: '平均コンバージョン率の向上', zh: '平均转化率提升' },
  'ROAS 개선': { en: 'ROAS improvement', ja: 'ROASの改善', zh: 'ROAS 提升' },

  // ===== VALUES =====
  '데이터 기반': { en: 'Data-driven', ja: 'データドリブン', zh: '数据驱动' },
  '“느낌상 잘 되는 것 같다”로는 다음을 결정할 수 없습니다. 모든 채널의 성과를 한 화면의 숫자로 투명하게 봅니다.': {
    en: 'You can’t decide your next move on a hunch that “it seems to be working.” See every channel’s performance transparently, as numbers on a single screen.',
    ja: '「なんとなくうまくいっている気がする」では次の一手は決められません。すべてのチャネルの成果を、一画面の数字で透明に把握します。',
    zh: '仅凭“感觉还不错”无法决定下一步。将所有渠道的成效以一个界面的数字透明呈现。',
  },
  '자동화': { en: 'Automation', ja: '自動化', zh: '自动化' },
  '반복 작업에 하루를 쓰는 건 사람의 일이 아닙니다. 실행은 시스템에 맡기고, 사람은 전략과 판단에 집중합니다.': {
    en: 'Spending a whole day on repetitive tasks isn’t a job for people. Leave execution to the system, so people can focus on strategy and judgment.',
    ja: '繰り返し作業に一日を費やすのは人の仕事ではありません。実行はシステムに任せ、人は戦略と判断に集中します。',
    zh: '把一整天耗在重复劳动上并非人该做的事。将执行交给系统，让人专注于策略与判断。',
  },
  '올인원': { en: 'All-in-one', ja: 'オールインワン', zh: '一体化' },
  '도구를 옮겨 다닐 때마다 데이터도 맥락도 끊깁니다. 수집·분석·CRM·콘텐츠를 하나의 워크스페이스로 이어 붙입니다.': {
    en: 'Every time you switch tools, both data and context break. Collection, analytics, CRM, and content are stitched into a single workspace.',
    ja: 'ツールを行き来するたびに、データも文脈も途切れます。収集・分析・CRM・コンテンツを一つのワークスペースにつなぎます。',
    zh: '每次切换工具，数据与上下文都会中断。将采集、分析、CRM 与内容衔接进同一个工作空间。',
  },
  '고객 성공': { en: 'Customer success', ja: 'カスタマーサクセス', zh: '客户成功' },
  '기능을 파는 것으로 끝나지 않습니다. 우리의 성공은 고객의 성장이기에, 도입 이후의 성과까지 함께 봅니다.': {
    en: 'It doesn’t end with selling features. Our success is our customers’ growth, so we stay with the results long after adoption.',
    ja: '機能を売って終わりではありません。私たちの成功はお客様の成長であるため、導入後の成果まで共に見届けます。',
    zh: '并非卖出功能就此结束。我们的成功在于客户的成长，因此在导入之后仍与您共同关注成效。',
  },

  // ===== COMPANY =====
  '회사명': { en: 'Company', ja: '会社名', zh: '公司名称' },
  '서비스': { en: 'Service', ja: 'サービス', zh: '服务' },
  '소재지': { en: 'Location', ja: '所在地', zh: '所在地' },
  '대표': { en: 'CEO', ja: '代表', zh: '代表' },
  '사업자등록번호': { en: 'Business registration no.', ja: '事業者登録番号', zh: '营业执照号码' },
  '서울특별시': { en: 'Seoul, South Korea', ja: 'ソウル特別市', zh: '首尔特别市' },
  '문의 시 안내': { en: 'Provided upon inquiry', ja: 'お問い合わせ時にご案内', zh: '咨询时提供' },

  // ===== HERO =====
  '회사소개': { en: 'About us', ja: '会社紹介', zh: '公司简介' },
  '마케팅의 모든 것을': { en: 'Everything in marketing,', ja: 'マーケティングのすべてを', zh: '营销的一切，' },
  '하나로': { en: 'unified', ja: 'ひとつに', zh: '尽在一处' },
  '탭을 열 개씩 띄우고, 도구 사이를 오가며 데이터를 옮겨 붙이는 하루. 정작 성과를 고민할 시간은 남지 않습니다. BYGENCY는 그 낭비를 없애기 위해 시작됐습니다. 수집부터 분석, 전환, 자동화까지 마케터의 하루를 하나의 워크스페이스로 연결합니다.': {
    en: 'A day spent with ten tabs open, hopping between tools to copy and paste data — leaving no time to actually think about results. BYGENCY was created to eliminate that waste. From collection to analytics, conversion, and automation, we connect a marketer’s entire day into a single workspace.',
    ja: 'タブを十枚も開き、ツールの間を行き来してデータをコピー＆ペーストする一日。肝心の成果を考える時間は残りません。BYGENCYは、その無駄をなくすために始まりました。収集から分析、コンバージョン、自動化まで、マーケターの一日を一つのワークスペースにつなぎます。',
    zh: '开着十几个标签页，在各种工具间来回搬运、粘贴数据的一天，真正用来思考成效的时间却所剩无几。BYGENCY 正是为消除这种浪费而生。从采集到分析、转化与自动化，将营销人员的整个工作日连接进同一个工作空间。',
  },

  // ===== MISSION / VISION =====
  '우리의 미션': { en: 'Our mission', ja: '私たちのミッション', zh: '我们的使命' },
  '마케터의 에너지는 도구를 다루는 데가 아니라, 성과를 만드는 데 쓰여야 합니다. 우리는 수집·분석·고객관리·콘텐츠 제작으로 흩어져 있던 일을 하나로 모아, 규모나 예산에 상관없이 누구나 데이터를 근거로 결정하고 성장할 수 있는 환경을 만듭니다.': {
    en: 'A marketer’s energy should go into creating results, not wrangling tools. We bring together work once scattered across collection, analytics, customer management, and content creation, building an environment where anyone — regardless of scale or budget — can decide based on data and grow.',
    ja: 'マーケターのエネルギーは、ツールを扱うことではなく成果を生み出すことに使われるべきです。私たちは収集・分析・顧客管理・コンテンツ制作に散らばっていた業務を一つにまとめ、規模や予算に関係なく、誰もがデータに基づいて意思決定し成長できる環境をつくります。',
    zh: '营销人员的精力应当用于创造成效，而非摆弄工具。我们将原本分散于采集、分析、客户管理与内容制作的工作整合为一，打造一个无论规模或预算大小，人人都能凭数据决策并成长的环境。',
  },
  '우리의 비전': { en: 'Our vision', ja: '私たちのビジョン', zh: '我们的愿景' },
  '좋은 제품을 만들고도 알리는 방법을 몰라 묻히는 일이 없어야 합니다. 우리는 AI와 자동화로 전문 마케팅의 진입 장벽을 낮춰, 1인 창업가부터 대행사까지 누구나 전문가 수준으로 실행할 수 있는 올인원 그로스 플랫폼을 지향합니다.': {
    en: 'No great product should be buried simply because its makers didn’t know how to get the word out. With AI and automation, we lower the barrier to professional marketing, aiming to be an all-in-one growth platform where anyone — from solo founders to agencies — can execute at an expert level.',
    ja: '優れた製品を作っても、伝え方が分からず埋もれてしまうことがあってはなりません。私たちはAIと自動化で専門的なマーケティングへの参入障壁を下げ、一人の起業家から代理店まで、誰もがプロレベルで実行できるオールインワンのグロースプラットフォームを目指します。',
    zh: '好的产品不应因不懂如何推广而被埋没。我们以 AI 与自动化降低专业营销的门槛，致力于打造一个从个人创业者到代理机构，人人都能以专家水准执行的一体化增长平台。',
  },

  // ===== WHY (BEFORE/AFTER) =====
  '왜 BYGENCY인가': { en: 'Why BYGENCY', ja: 'なぜBYGENCYか', zh: '为何选择 BYGENCY' },
  '툴은 늘어나는데': { en: 'More tools, yet', ja: 'ツールは増えるのに', zh: '工具越来越多，' },
  '성과는 제자리인가요?': { en: 'results stay flat?', ja: '成果は横ばい？', zh: '成效却原地踏步？' },
  '문제는 도구의 개수가 아니라, 도구들이 서로 이어지지 않는다는 데 있습니다. BYGENCY는 흩어진 일을 하나로 연결해 낭비를 성과로 바꿉니다.': {
    en: 'The problem isn’t the number of tools — it’s that they don’t connect. BYGENCY links scattered work into one flow, turning waste into results.',
    ja: '問題はツールの数ではなく、それらが互いに繋がっていないことです。BYGENCYは散らばった業務を一つに繋ぎ、無駄を成果に変えます。',
    zh: '问题不在于工具的数量，而在于它们彼此互不相通。BYGENCY 将分散的工作连成一体，把浪费转化为成效。',
  },
  'BYGENCY 없이': { en: 'Without BYGENCY', ja: 'BYGENCYなし', zh: '没有 BYGENCY' },
  'BYGENCY 하나로': { en: 'With BYGENCY', ja: 'BYGENCYひとつで', zh: '有了 BYGENCY' },
  '랜딩·분석·문자·CRM·영상… 매달 5~6개 구독료가 빠져나갑니다': {
    en: 'Landing pages, analytics, SMS, CRM, video… 5–6 subscriptions draining your budget every month.',
    ja: 'ランディング・分析・SMS・CRM・動画…毎月5〜6個のサブスク費用が出ていきます。',
    zh: '落地页、分析、短信、CRM、视频……每月 5–6 项订阅费不断流出。',
  },
  '툴마다 흩어진 데이터를 매번 엑셀로 옮겨 붙입니다': {
    en: 'Data scattered across tools, copied into spreadsheets over and over.',
    ja: 'ツールごとに散らばったデータを、毎回エクセルに貼り付けます。',
    zh: '数据散落在各工具中，每次都要复制粘贴到表格里。',
  },
  '무엇이 성과를 냈는지 끝내 알 수 없습니다': {
    en: 'You never really learn what actually drove results.',
    ja: '何が成果を生んだのか、結局分からないままです。',
    zh: '究竟是什么带来了成效，最终仍无从得知。',
  },
  '반복 작업에 하루가 다 지나갑니다': {
    en: 'A whole day disappears into repetitive busywork.',
    ja: '繰り返し作業で一日が過ぎ去ります。',
    zh: '一整天都耗在重复性琐事上。',
  },
  '수집·분석·CRM·AI 영상까지, 구독 하나로 끝냅니다': {
    en: 'Collection, analytics, CRM, and AI video — all in a single subscription.',
    ja: '収集・分析・CRM・AI動画まで、サブスク一つで完結します。',
    zh: '采集、分析、CRM 到 AI 视频，一份订阅全部搞定。',
  },
  '모든 채널 데이터가 한 화면에 실시간으로 모입니다': {
    en: 'Every channel’s data gathers on one screen, in real time.',
    ja: 'すべてのチャネルのデータが、一画面にリアルタイムで集まります。',
    zh: '所有渠道的数据实时汇聚于同一界面。',
  },
  '무엇이 매출을 만들었는지 숫자로 증명됩니다': {
    en: 'What made the sales is proven in numbers.',
    ja: '何が売上を生んだのかが、数字で証明されます。',
    zh: '是什么带来了业绩，用数字来证明。',
  },
  'AI와 자동화가 반복 실행을 대신합니다': {
    en: 'AI and automation handle the repetitive execution for you.',
    ja: 'AIと自動化が、繰り返しの実行を代行します。',
    zh: 'AI 与自动化替你完成重复的执行工作。',
  },

  // ===== PERSONAS =====
  '누구를 위한 서비스인가': { en: 'Who it’s for', ja: '誰のためのサービスか', zh: '为谁而生' },
  '이런 분들께': { en: 'Built for', ja: 'こんな方に', zh: '为这些人' },
  '가장 잘 맞습니다': { en: 'people like you', ja: 'ぴったりです', zh: '量身打造' },
  '1인 창업가': { en: 'Solo founders', ja: '一人起業家', zh: '个人创业者' },
  '제품은 좋은데 알릴 방법이 막막한 대표님. 마케터 한 명 몫을 BYGENCY가 대신합니다.': {
    en: 'A great product but no idea how to get it out there. BYGENCY does the work of a full marketer.',
    ja: '製品は良いのに、広め方が分からない代表へ。マーケター一人分をBYGENCYが担います。',
    zh: '产品很好却不知如何推广的创始人——BYGENCY 顶得上一名专职营销人员。',
  },
  '소상공인·자영업': { en: 'Local & small business', ja: '小規模事業者', zh: '小微商户' },
  '매장 홍보부터 단골 관리까지. 플레이스 순위, 문자·알림톡, 리뷰 관리를 한 곳에서 해결합니다.': {
    en: 'From storefront promotion to loyalty. Place ranking, SMS/alerts, and review management in one place.',
    ja: '店舗集客から常連管理まで。プレイス順位・SMS/通知・レビュー管理を一箇所で。',
    zh: '从门店推广到老客维护。地图排名、短信/提醒、评价管理，一处搞定。',
  },
  '성장기 스타트업': { en: 'Growth-stage startups', ja: '成長期スタートアップ', zh: '成长期创业公司' },
  '빠르게 실험하고 빠르게 배웁니다. 채널별 성과를 실시간으로 보고 예산을 바로 옮기세요.': {
    en: 'Experiment fast, learn fast. See per-channel performance live and move budget instantly.',
    ja: '素早く試し、素早く学ぶ。チャネル別の成果をリアルタイムで見て予算を即移動。',
    zh: '快速试验、快速学习。实时查看各渠道成效，即刻调配预算。',
  },
  '마케팅 대행사': { en: 'Marketing agencies', ja: 'マーケティング代理店', zh: '营销代理机构' },
  '여러 클라이언트를 하나의 워크스페이스로. 리포트 자동화로 보고에 쓰던 시간을 되찾습니다.': {
    en: 'Manage many clients in one workspace. Automated reports win back the hours you spent reporting.',
    ja: '複数のクライアントを一つのワークスペースに。レポート自動化で報告の時間を取り戻します。',
    zh: '在一个工作空间管理多个客户。报表自动化，夺回花在汇报上的时间。',
  },

  // ===== STEPS =====
  '시작은 3분': { en: 'Live in 3 minutes', ja: '開始はわずか3分', zh: '3 分钟即可开始' },
  '도입은': { en: 'Getting started takes', ja: '導入は', zh: '接入只需' },
  '세 단계면 끝': { en: 'just three steps', ja: 'たった三ステップ', zh: '三步' },
  '가입하고 워크스페이스 열기': { en: 'Sign up & open your workspace', ja: '登録してワークスペースを開く', zh: '注册并开启工作空间' },
  '설치 없이 3분. 가입 즉시 나만의 노드 워크스페이스가 열립니다.': {
    en: 'Three minutes, no credit card. Your own node workspace opens the moment you sign up.',
    ja: 'クレジットカード不要、3分。登録した瞬間に自分専用のノードワークスペースが開きます。',
    zh: '三分钟，无需信用卡。注册即刻开启专属节点工作空间。',
  },
  '채널 연결하고 데이터 모으기': { en: 'Connect channels & gather data', ja: 'チャネルを繋いでデータを集める', zh: '连接渠道并汇集数据' },
  '랜딩페이지·분석·CRM을 연결하면 흩어져 있던 데이터가 한 곳에 쌓입니다.': {
    en: 'Connect landing pages, analytics, and CRM, and your scattered data stacks up in one place.',
    ja: 'ランディング・分析・CRMを繋ぐと、散らばっていたデータが一箇所に集まります。',
    zh: '连接落地页、分析与 CRM，分散的数据便汇聚到同一处。',
  },
  'AI로 실행하고 성과 확인': { en: 'Execute with AI & see results', ja: 'AIで実行し成果を確認', zh: '用 AI 执行并查看成效' },
  'AI가 콘텐츠·영상·캠페인을 실행하고, 성과는 숫자로 바로 확인합니다.': {
    en: 'AI runs your content, video, and campaigns — and results show up in numbers right away.',
    ja: 'AIがコンテンツ・動画・キャンペーンを実行し、成果は数字ですぐに確認できます。',
    zh: 'AI 执行内容、视频与营销活动，成效即刻以数字呈现。',
  },

  // ===== CORE VALUES =====
  '핵심 가치': { en: 'Core values', ja: 'コアバリュー', zh: '核心价值' },
  '우리가 일하는': { en: 'Our operating', ja: '私たちが働く', zh: '我们工作的' },
  '기준': { en: 'principles', ja: '基準', zh: '准则' },

  // ===== COMPANY INFO =====
  '회사 정보': { en: 'Company info', ja: '会社情報', zh: '公司信息' },
  '회사 바로보기': { en: 'Visit company site', ja: '会社サイトへ', zh: '访问公司网站' },
  '대표이사': { en: 'CEO', ja: '代表取締役', zh: '代表理事' },
  'BYGENCY는 (주)넥스트 바이전시가 직접 만들고 운영하는 올인원 마케팅 그로스 플랫폼입니다. 화면 속 편의만이 아니라, 문의 하나에 응답하는 태도까지 우리가 책임집니다. 자세한 사업 관련 정보는 문의를 통해 안내해 드립니다.': {
    en: 'BYGENCY is an all-in-one marketing growth platform built and operated directly by Next Bygency. We take responsibility not only for on-screen convenience, but for the attitude behind every reply to an inquiry. Detailed business information is provided upon request.',
    ja: 'BYGENCYは、(株)Next Bygencyが自ら開発・運営するオールインワンのマーケティンググロースプラットフォームです。画面上の使いやすさだけでなく、一つひとつのお問い合わせに応える姿勢まで私たちが責任を持ちます。詳しい事業関連情報はお問い合わせにてご案内いたします。',
    zh: 'BYGENCY 是由 Next Bygency 亲自打造并运营的一体化营销增长平台。我们负责的不仅是界面上的便捷，更包括对每一次咨询用心回应的态度。详细的业务相关信息将通过咨询为您提供。',
  },
  '문의하기': { en: 'Contact us', ja: 'お問い合わせ', zh: '联系我们' },
  '사업자 정보': { en: 'Business information', ja: '事業者情報', zh: '企业信息' },

  // ===== HEADQUARTERS =====
  '본사': { en: 'Headquarters', ja: '本社', zh: '总部' },
  '우리가': { en: 'Where we', ja: '私たちが', zh: '我们' },
  '일하는 공간': { en: 'get to work', ja: '働く場所', zh: '工作的地方' },
  '서울 강남 본사': { en: 'Gangnam, Seoul — HQ', ja: 'ソウル・江南 本社', zh: '首尔江南 · 总部' },
  '넥스트 바이전시 본사': { en: 'Next Bygency headquarters', ja: 'Next Bygency 本社', zh: 'Next Bygency 总部' },

  // ===== CTA =====
  '더 나은 도구를 찾는 일은 오늘로 끝내세요': {
    en: 'Make today the last day you go looking for a better tool',
    ja: 'より良いツールを探すのは、今日で終わりにしましょう',
    zh: '让今天成为你寻找更好工具的最后一天',
  },
  '흩어진 도구를 전전하는 대신, 하나로 모아 성과에 집중할 시간입니다. 우리는 그 여정을 끝까지 함께합니다.': {
    en: 'Instead of drifting between scattered tools, it’s time to bring them together and focus on results. We’ll be with you every step of that journey.',
    ja: '散らばったツールを転々とする代わりに、一つにまとめて成果に集中する時です。私たちはその道のりを最後まで共にします。',
    zh: '与其在零散的工具间辗转，不如将它们整合为一，专注于成效。这段旅程，我们将全程与你同行。',
  },
  '지금 시작하기': { en: 'Get started', ja: '今すぐ始める', zh: '立即开始' },
  '요금제 보기': { en: 'View pricing', ja: '料金プランを見る', zh: '查看价格方案' },
}

export default function AboutPage() {
  const t = useT(M)
  return (
    <div className="site-dark min-h-screen overflow-x-hidden">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[840px] -translate-x-1/2 rounded-full bg-blue-700/30 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 left-0 h-[280px] w-[360px] rounded-full bg-blue-700/25 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>{t('회사소개')}</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            {t('마케팅의 모든 것을')}{' '}
            <span className="brand-text animate-gradient">{t('하나로')}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            {t(
              '탭을 열 개씩 띄우고, 도구 사이를 오가며 데이터를 옮겨 붙이는 하루. 정작 성과를 고민할 시간은 남지 않습니다. BYGENCY는 그 낭비를 없애기 위해 시작됐습니다. 수집부터 분석, 전환, 자동화까지 마케터의 하루를 하나의 워크스페이스로 연결합니다.',
            )}
          </p>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="pb-8">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="card grid gap-6 p-10 sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal key={s.label} delay={i * 90} className="text-center">
                  <div className="text-4xl font-bold tracking-tight sm:text-5xl">
                    <span className="brand-text">
                      <Counter to={s.to} decimals={s.decimals || 0} suffix={s.suffix} />
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-soft)]">{t(s.label)}</div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== WHY (BEFORE / AFTER) ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('왜 BYGENCY인가')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('툴은 늘어나는데')} <span className="brand-text">{t('성과는 제자리인가요?')}</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
              {t('문제는 도구의 개수가 아니라, 도구들이 서로 이어지지 않는다는 데 있습니다. BYGENCY는 흩어진 일을 하나로 연결해 낭비를 성과로 바꿉니다.')}
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <Reveal variant="left">
              <div className="h-full rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                  <X size={13} /> {t('BYGENCY 없이')}
                </span>
                <ul className="mt-6 space-y-4">
                  {BEFORE.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--text-soft)]">
                      <span className="mt-1 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-300">
                        <X size={12} />
                      </span>
                      {t(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal variant="right" delay={100}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-500/[0.08] to-cyan-500/[0.05] p-8">
                <div className="animate-drift-slow pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/25 blur-2xl" />
                <span className="relative inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200">
                  <Sparkles size={13} /> {t('BYGENCY 하나로')}
                </span>
                <ul className="relative mt-6 space-y-4">
                  {AFTER.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[15px] font-medium leading-relaxed">
                      <span className="mt-1 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-200">
                        <Check size={12} />
                      </span>
                      {t(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== MISSION / VISION ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal variant="left">
              <div className="card hover-lift relative h-full overflow-hidden p-9">
                <div className="animate-drift-slow absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-300/25 blur-2xl" />
                <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                  <Target size={22} />
                </span>
                <h2 className="relative mt-6 text-2xl font-bold tracking-tight">{t('우리의 미션')}</h2>
                <p className="relative mt-4 text-[15px] leading-relaxed text-[var(--text-soft)]">
                  {t(
                    '마케터의 에너지는 도구를 다루는 데가 아니라, 성과를 만드는 데 쓰여야 합니다. 우리는 수집·분석·고객관리·콘텐츠 제작으로 흩어져 있던 일을 하나로 모아, 규모나 예산에 상관없이 누구나 데이터를 근거로 결정하고 성장할 수 있는 환경을 만듭니다.',
                  )}
                </p>
              </div>
            </Reveal>
            <Reveal variant="right" delay={100}>
              <div className="card hover-lift relative h-full overflow-hidden p-9">
                <div className="animate-drift-slow absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/25 blur-2xl" />
                <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg">
                  <Compass size={22} />
                </span>
                <h2 className="relative mt-6 text-2xl font-bold tracking-tight">{t('우리의 비전')}</h2>
                <p className="relative mt-4 text-[15px] leading-relaxed text-[var(--text-soft)]">
                  {t(
                    '좋은 제품을 만들고도 알리는 방법을 몰라 묻히는 일이 없어야 합니다. 우리는 AI와 자동화로 전문 마케팅의 진입 장벽을 낮춰, 1인 창업가부터 대행사까지 누구나 전문가 수준으로 실행할 수 있는 올인원 그로스 플랫폼을 지향합니다.',
                  )}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== PERSONAS ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('누구를 위한 서비스인가')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('이런 분들께')} <span className="brand-text">{t('가장 잘 맞습니다')}</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONAS.map((p, i) => {
              const Icon = p.icon
              return (
                <Reveal key={p.title} variant="scale" delay={i * 90}>
                  <div className="card hover-lift h-full p-7">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} text-white shadow-lg`}>
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{t(p.title)}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-soft)]">{t(p.desc)}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== CORE VALUES ===== */}
      <section className="border-y border-white/10 bg-white/[0.015] py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('핵심 가치')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('우리가 일하는')} <span className="brand-text">{t('기준')}</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => {
              const Icon = v.icon
              return (
                <Reveal key={v.title} variant="scale" delay={i * 90}>
                  <div className="card hover-lift h-full p-7">
                    <span
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${v.color} text-white shadow-lg`}
                    >
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{t(v.title)}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-soft)]">{t(v.desc)}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== STEPS ===== */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('시작은 3분')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('도입은')} <span className="brand-text">{t('세 단계면 끝')}</span>
            </h2>
          </Reveal>
          <div className="relative mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.no} delay={i * 100}>
                <div className="card hover-lift relative h-full p-8">
                  <div className="flex items-center gap-3">
                    <span className="brand-text text-5xl font-bold leading-none tracking-tight">{s.no}</span>
                    <span className="h-px flex-1 bg-gradient-to-r from-blue-400/40 to-transparent" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{t(s.title)}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-soft)]">{t(s.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HEADQUARTERS ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('본사')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('우리가')} <span className="brand-text">{t('일하는 공간')}</span>
            </h2>
          </Reveal>
          <Reveal variant="scale" delay={100} className="mt-12">
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-blue-900/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/company/headquarters.webp"
                alt={t('넥스트 바이전시 본사')}
                loading="lazy"
                className="w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-6 sm:p-8">
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin size={16} />
                  <span className="text-sm font-semibold">{t('서울 강남 본사')}</span>
                </div>
                <p className="mt-1 text-xl font-bold text-white sm:text-2xl">Next Bygency</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== COMPANY INFO ===== */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal variant="left">
              <SectionTag>{t('회사 정보')}</SectionTag>
              <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                (주)넥스트 바이전시
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
                {t(
                  'BYGENCY는 (주)넥스트 바이전시가 직접 만들고 운영하는 올인원 마케팅 그로스 플랫폼입니다. 화면 속 편의만이 아니라, 문의 하나에 응답하는 태도까지 우리가 책임집니다. 자세한 사업 관련 정보는 문의를 통해 안내해 드립니다.',
                )}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button href="/contact" className="group">
                  {t('문의하기')}
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
                <a
                  href="https://nextbygency.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition-colors hover:border-blue-400/50 hover:text-[var(--text)]"
                >
                  {t('회사 바로보기')}
                  <ExternalLink size={15} />
                </a>
              </div>
            </Reveal>

            <Reveal variant="right" delay={100}>
              <div className="card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--panel-2)] px-6 py-4">
                  <LogoMark size={28} />
                  <span className="text-sm font-semibold text-[var(--text-soft)]">{t('사업자 정보')}</span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {COMPANY.map((c) => {
                    const Icon = c.icon
                    return (
                      <li key={c.label} className="flex items-center gap-4 px-6 py-4">
                        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-blue-500/12 text-blue-300">
                          <Icon size={16} />
                        </span>
                        <span className="w-28 flex-shrink-0 text-sm text-[var(--text-dim)]">{t(c.label)}</span>
                        <span className="text-sm font-medium">{t(c.value)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 pb-28">
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
                {t('더 나은 도구를 찾는 일은 오늘로 끝내세요')}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                {t(
                  '흩어진 도구를 전전하는 대신, 하나로 모아 성과에 집중할 시간입니다. 우리는 그 여정을 끝까지 함께합니다.',
                )}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  href="/signup"
                  size="lg"
                  className="!bg-white !text-blue-700 hover:!bg-blue-50 hover:!brightness-100"
                >
                  {t('지금 시작하기')} <ArrowRight size={18} />
                </Button>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:bg-white/20"
                >
                  {t('요금제 보기')}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}

const STATS = [
  { to: 5200, suffix: '+', label: '활성 마케터' },
  { to: 12400, suffix: '+', label: '일일 수집 DB' },
  { to: 38, suffix: '%', label: '평균 전환율 상승' },
  { to: 2.7, suffix: 'x', decimals: 1, label: 'ROAS 개선' },
]

const BEFORE = [
  '랜딩·분석·문자·CRM·영상… 매달 5~6개 구독료가 빠져나갑니다',
  '툴마다 흩어진 데이터를 매번 엑셀로 옮겨 붙입니다',
  '무엇이 성과를 냈는지 끝내 알 수 없습니다',
  '반복 작업에 하루가 다 지나갑니다',
]

const AFTER = [
  '수집·분석·CRM·AI 영상까지, 구독 하나로 끝냅니다',
  '모든 채널 데이터가 한 화면에 실시간으로 모입니다',
  '무엇이 매출을 만들었는지 숫자로 증명됩니다',
  'AI와 자동화가 반복 실행을 대신합니다',
]

const PERSONAS = [
  {
    icon: Rocket,
    title: '1인 창업가',
    desc: '제품은 좋은데 알릴 방법이 막막한 대표님. 마케터 한 명 몫을 BYGENCY가 대신합니다.',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Store,
    title: '소상공인·자영업',
    desc: '매장 홍보부터 단골 관리까지. 플레이스 순위, 문자·알림톡, 리뷰 관리를 한 곳에서 해결합니다.',
    color: 'from-sky-500 to-blue-600',
  },
  {
    icon: TrendingUp,
    title: '성장기 스타트업',
    desc: '빠르게 실험하고 빠르게 배웁니다. 채널별 성과를 실시간으로 보고 예산을 바로 옮기세요.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Building2,
    title: '마케팅 대행사',
    desc: '여러 클라이언트를 하나의 워크스페이스로. 리포트 자동화로 보고에 쓰던 시간을 되찾습니다.',
    color: 'from-teal-500 to-cyan-600',
  },
]

const STEPS = [
  { no: '01', title: '가입하고 워크스페이스 열기', desc: '설치 없이 3분. 가입 즉시 나만의 노드 워크스페이스가 열립니다.' },
  { no: '02', title: '채널 연결하고 데이터 모으기', desc: '랜딩페이지·분석·CRM을 연결하면 흩어져 있던 데이터가 한 곳에 쌓입니다.' },
  { no: '03', title: 'AI로 실행하고 성과 확인', desc: 'AI가 콘텐츠·영상·캠페인을 실행하고, 성과는 숫자로 바로 확인합니다.' },
]

const VALUES = [
  {
    icon: Database,
    title: '데이터 기반',
    desc: '“느낌상 잘 되는 것 같다”로는 다음을 결정할 수 없습니다. 모든 채널의 성과를 한 화면의 숫자로 투명하게 봅니다.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Workflow,
    title: '자동화',
    desc: '반복 작업에 하루를 쓰는 건 사람의 일이 아닙니다. 실행은 시스템에 맡기고, 사람은 전략과 판단에 집중합니다.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: LayoutGrid,
    title: '올인원',
    desc: '도구를 옮겨 다닐 때마다 데이터도 맥락도 끊깁니다. 수집·분석·CRM·콘텐츠를 하나의 워크스페이스로 이어 붙입니다.',
    color: 'from-sky-500 to-blue-600',
  },
  {
    icon: HeartHandshake,
    title: '고객 성공',
    desc: '기능을 파는 것으로 끝나지 않습니다. 우리의 성공은 고객의 성장이기에, 도입 이후의 성과까지 함께 봅니다.',
    color: 'from-cyan-500 to-teal-600',
  },
]

const COMPANY = [
  { icon: Building2, label: '회사명', value: '(주)넥스트 바이전시' },
  { icon: LayoutGrid, label: '서비스', value: 'BYGENCY (바이전시)' },
  { icon: MapPin, label: '소재지', value: '서울특별시' },
  { icon: User, label: '대표이사', value: '고선우' },
  { icon: Mail, label: '사업자등록번호', value: '문의 시 안내' },
]
