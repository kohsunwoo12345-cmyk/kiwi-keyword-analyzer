'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Home,
  ChevronRight,
  Check,
  Sparkles,
  Loader2,
  Play,
  Send,
  GripVertical,
  Plus,
  Wand2,
  BarChart3,
  Bot,
  CheckCircle2,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag, Panel } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { cn } from '@/lib/utils'
import { FEATURES, getFeature, type Feature } from '@/lib/features'
import { collectLead } from '@/lib/auth'
import { useT, type Dict } from '@/lib/i18n'

/* ───────────────── i18n dictionary ───────────────── */
const M: Dict = {
  /* ── taglines ── */
  '떠나는 방문자를 고객 DB로 붙잡다': { en: 'Turn departing visitors into customer leads', ja: '離脱する訪問者を顧客DBとして掴む', zh: '把流失的访客变成客户数据' },
  '다음 떡상을 데이터로 예측하다': { en: 'Predict the next viral hit with data', ja: '次のバズをデータで予測する', zh: '用数据预测下一个爆款' },
  '상위노출, 감이 아닌 데이터로': { en: 'Top rankings driven by data, not guesswork', ja: '上位表示は勘ではなくデータで', zh: '靠数据而非直觉赢得排名' },
  '흩어진 협업에 AI 속도를 더하다': { en: 'Bring AI speed to scattered teamwork', ja: '散らばった協業にAIのスピードを', zh: '为分散的协作注入AI速度' },
  '잠자던 DB를 매출로 깨우다': { en: 'Wake dormant data into revenue', ja: '眠っていたDBを売上へ目覚めさせる', zh: '唤醒沉睡的数据带来销售' },
  '광고비 한 푼도 새지 않게': { en: 'So not a cent of ad spend leaks', ja: '広告費を1円も無駄にしない', zh: '让每一分广告费都不浪费' },
  '텍스트 한 줄이 영상이 되는 순간': { en: 'The moment one line of text becomes video', ja: '一行のテキストが動画になる瞬間', zh: '一行文字变成视频的瞬间' },
  '실제 노드 워크스페이스': { en: 'The real node workspace', ja: '実際のノードワークスペース', zh: '真实节点工作区' },
  '노드로 그리는 AI 영상 파이프라인': { en: 'An AI video pipeline you draw with nodes', ja: 'ノードで描くAI動画パイプライン', zh: '用节点绘制的 AI 视频流水线' },
  '프롬프트 → 모델 → ControlNet → 출력. 흩어진 도구 대신 한 화면에서 연결하고, 각 단계를 실시간으로 확인합니다.': {
    en: 'Prompt → Model → ControlNet → Output. Connect it all on one canvas instead of scattered tools, and preview every stage in real time.',
    ja: 'プロンプト → モデル → ControlNet → 出力。バラバラのツールの代わりに一画面で繋ぎ、各工程をリアルタイムで確認します。',
    zh: '提示词 → 模型 → ControlNet → 输出。在同一画布上连接一切，实时预览每个环节。',
  },
  '텍스트→영상 · 이미지→영상 · V2V': { en: 'Text→Video · Image→Video · V2V', ja: 'テキスト→動画・画像→動画・V2V', zh: '文本→视频 · 图像→视频 · V2V' },
  'ControlNet 정밀 제어 (Canny·Depth·Pose)': { en: 'ControlNet precision (Canny · Depth · Pose)', ja: 'ControlNet精密制御 (Canny・Depth・Pose)', zh: 'ControlNet 精准控制 (Canny·Depth·Pose)' },
  'Veo·Kling·Runway·Seedance 등 최상위 모델': { en: 'Top models — Veo, Kling, Runway, Seedance & more', ja: 'Veo・Kling・Runway・Seedanceなど最上位モデル', zh: 'Veo·Kling·Runway·Seedance 等顶级模型' },
  '노드마다 실시간 미리보기': { en: 'Live preview on every node', ja: 'ノードごとにリアルタイムプレビュー', zh: '每个节点实时预览' },
  '모션 하나하나까지 제어하는 노드형 AI 영상': { en: 'Node-based AI video, controlled motion by motion', ja: 'モーションの一つひとつまで制御するノード型AI動画', zh: '连每个动作都可控的节点式 AI 视频' },
  '지원 AI 모델': { en: 'Supported AI models', ja: '対応AIモデル', zh: '支持的 AI 模型' },
  'ControlNet 제어': { en: 'ControlNet controls', ja: 'ControlNet制御', zh: 'ControlNet 控制' },
  '최신 AI 영상 모델을 모두 지원합니다 — Kling · Google Veo · Runway · Seedance · Luma · Hailuo를 한 화면에서 골라 씁니다.': {
    en: 'Supports every latest AI video model — pick from Kling, Google Veo, Runway, Seedance, Luma, and Hailuo on one canvas.',
    ja: '最新のAI動画モデルをすべてサポート — Kling・Google Veo・Runway・Seedance・Luma・Hailuoを一画面で選んで使います。',
    zh: '支持所有最新 AI 视频模型——在一屏中选用 Kling、Google Veo、Runway、Seedance、Luma、Hailuo。',
  },
  'ControlNet으로 포즈·뎁스·엣지·캐니를 잡아 인물의 동작과 카메라 움직임을 하나하나 정밀하게 제어합니다.': {
    en: 'With ControlNet — pose, depth, edge, and canny — you precisely control character motion and camera movement, one by one.',
    ja: 'ControlNetでポーズ・深度・エッジ・キャニーを押さえ、人物の動きとカメラワークを一つひとつ精密に制御します。',
    zh: '通过 ControlNet 的姿势、深度、边缘、Canny，逐一精确控制人物动作与镜头运动。',
  },
  '텍스트→영상, 이미지→영상, 영상→영상(V2V)을 노드로 연결해 컷과 장면을 자유롭게 구성하고 재사용합니다.': {
    en: 'Connect text-to-video, image-to-video, and video-to-video (V2V) as nodes to freely compose and reuse cuts and scenes.',
    ja: 'テキスト→動画、画像→動画、動画→動画(V2V)をノードでつなぎ、カットとシーンを自由に構成・再利用します。',
    zh: '将文本→视频、图像→视频、视频→视频(V2V)以节点连接，自由编排并复用镜头与场景。',
  },
  '원본 영상을 실사처럼 변환하고, 브랜드 톤을 유지한 채 여러 편을 대량으로 찍어냅니다.': {
    en: 'Transform source footage to photoreal, and mass-produce many videos while keeping your brand tone.',
    ja: '元映像を実写のように変換し、ブランドトーンを保ったまま複数本を大量制作します。',
    zh: '将原始素材转为写实，在保持品牌调性的同时批量制作多支视频。',
  },
  '마케팅을 한 단계 끌어올리는 기능': { en: 'A feature that takes your marketing to the next level', ja: 'マーケティングを一段引き上げる機能', zh: '让营销更上一层楼的功能' },

  /* ── stat labels ── */
  '평균 전환율 상승': { en: 'Avg. conversion lift', ja: '平均コンバージョン率の上昇', zh: '平均转化率提升' },
  '일 평균 수집 DB': { en: 'Avg. daily leads collected', ja: '1日平均の収集DB', zh: '日均收集数据' },
  '평균 세팅 시간': { en: 'Avg. setup time', ja: '平均セットアップ時間', zh: '平均设置时间' },
  '분석된 채널': { en: 'Channels analyzed', ja: '分析したチャンネル', zh: '已分析频道' },
  '떡상 예측 정확도': { en: 'Viral prediction accuracy', ja: 'バズ予測の精度', zh: '爆款预测准确率' },
  '추적 지표': { en: 'Tracked metrics', ja: '追跡指標', zh: '追踪指标' },
  '분석 키워드': { en: 'Keywords analyzed', ja: '分析キーワード', zh: '分析关键词' },
  '지수 진단 정확도': { en: 'Index diagnosis accuracy', ja: '指数診断の精度', zh: '指数诊断准确率' },
  '평균 분석 시간': { en: 'Avg. analysis time', ja: '平均分析時間', zh: '平均分析时间' },
  '업무 처리 속도': { en: 'Task processing speed', ja: '業務処理スピード', zh: '任务处理速度' },
  '소재 제작 시간 절감': { en: 'Creative production time saved', ja: '素材制作時間の削減', zh: '素材制作时间节省' },
  'AI 상시 대응': { en: 'Always-on AI support', ja: 'AIの常時対応', zh: 'AI全天候响应' },
  '재구매율 상승': { en: 'Repeat purchase lift', ja: 'リピート率の上昇', zh: '复购率提升' },
  'LTV 개선': { en: 'LTV improvement', ja: 'LTVの改善', zh: 'LTV提升' },
  '알림톡 도달률': { en: 'Alert message delivery rate', ja: '通知トークの到達率', zh: '通知消息送达率' },
  '평균 ROAS 개선': { en: 'Avg. ROAS improvement', ja: '平均ROASの改善', zh: '平均ROAS提升' },
  'CPA 절감': { en: 'CPA reduction', ja: 'CPAの削減', zh: 'CPA降低' },
  '통합 광고 채널': { en: 'Integrated ad channels', ja: '統合広告チャネル', zh: '整合广告渠道' },
  '제작 시간 절감': { en: 'Production time saved', ja: '制作時間の削減', zh: '制作时间节省' },
  '평균 생성 시간': { en: 'Avg. generation time', ja: '平均生成時間', zh: '平均生成时间' },
  '스타일 프리셋': { en: 'Style presets', ja: 'スタイルプリセット', zh: '风格预设' },
  '활성 마케터': { en: 'Active marketers', ja: 'アクティブなマーケター', zh: '活跃营销者' },
  '평균 성과 상승': { en: 'Avg. performance lift', ja: '平均成果の向上', zh: '平均业绩提升' },
  '상시 이용': { en: 'Always available', ja: '常時利用', zh: '全天候使用' },

  /* ── notes ── */
  '광고비를 들여 데려온 방문자, 대부분은 흔적 없이 떠납니다. 코딩 없이 폼을 끌어다 놓아 오늘 안에 붙잡는 랜딩페이지를 완성하세요.': { en: 'Most visitors you paid to acquire leave without a trace. Drag and drop a form with no code and finish a landing page that captures them today.', ja: '広告費をかけて集めた訪問者の多くは痕跡も残さず去っていきます。コード不要でフォームをドラッグ＆ドロップし、今日中に捕まえるランディングページを完成させましょう。', zh: '花广告费引来的访客大多毫无痕迹地离开。无需编码，拖放表单，今天就能完成留住他们的落地页。' },
  '어느 채널에서 몇 명이 전환됐는지 실시간 대시보드로 확인하면, 돈 새는 채널을 그만두고 되는 곳에 집중할 수 있습니다.': { en: 'See how many convert from each channel on a real-time dashboard, so you can cut the channels that bleed money and focus on what works.', ja: 'どのチャネルから何人が転換したかをリアルタイムのダッシュボードで確認すれば、お金が漏れるチャネルをやめて、成果の出る場所に集中できます。', zh: '通过实时仪表盘查看每个渠道有多少人转化，就能停掉烧钱的渠道，专注于有效的地方。' },
  '중복·오타 번호가 섞인 DB는 영업 시간을 갉아먹습니다. 자동 정제로 바로 연락할 수 있는 명단만 남깁니다.': { en: 'A database full of duplicate and mistyped numbers eats into your sales time. Auto-cleansing keeps only the contacts you can call right away.', ja: '重複や打ち間違いの番号が混ざったDBは営業時間を削ります。自動クレンジングで、すぐに連絡できるリストだけを残します。', zh: '混杂重复和错号的数据会侵蚀你的销售时间。自动清洗只保留可立即联系的名单。' },
  '수집 즉시 CRM 파이프라인으로 넘어갑니다. 리드가 식기 전에, 가장 뜨거울 때 연락하세요.': { en: 'Leads flow into your CRM pipeline the moment they are collected. Reach out while they are hottest, before they cool down.', ja: '収集した瞬間にCRMパイプラインへ引き継がれます。リードが冷める前、最も熱いうちに連絡しましょう。', zh: '收集后立即进入CRM流程。趁线索最热、还未冷却时联系。' },
  '감으로 올린 영상이 묻히는 이유는 데이터를 안 봤기 때문입니다. 구독자·조회수 추이에서 성장 변곡점을 먼저 포착하세요.': { en: 'Videos posted on gut instinct get buried because the data went unwatched. Spot growth inflection points first in your subscriber and view trends.', ja: '勘で上げた動画が埋もれるのは、データを見ていないからです。登録者・再生数の推移から成長の変曲点を先に捉えましょう。', zh: '凭感觉发的视频被埋没，是因为没看数据。从订阅和播放趋势中率先捕捉增长拐点。' },
  '영상마다 노출·클릭·시청 지속률을 뜯어보면, 어디서 이탈하는지가 보이고 다음 편집이 달라집니다.': { en: 'Break down impressions, clicks, and retention for each video to see where viewers drop off and change how you edit the next one.', ja: '動画ごとにインプレッション・クリック・視聴維持率を分析すれば、どこで離脱するかが見え、次の編集が変わります。', zh: '逐个视频拆解曝光、点击和观看留存，就能看出观众在哪里流失，改变下一次剪辑。' },
  '지금 뜨는 키워드를 찾아 다음 콘텐츠를 기획하세요. 유행이 지난 뒤 올리면 이미 늦습니다.': { en: 'Find the keywords trending now and plan your next content. Post after the trend passes and you are already too late.', ja: '今伸びているキーワードを見つけて次のコンテンツを企画しましょう。流行が過ぎてから上げても、もう遅いのです。', zh: '找到当下热门关键词来策划下一期内容。等潮流过去再发就已经晚了。' },
  '경쟁 채널이 무엇으로 성장했는지 벤치마킹해, 시행착오에 쓸 몇 달을 아낍니다.': { en: 'Benchmark what drove competing channels to grow and save months of trial and error.', ja: '競合チャンネルが何で成長したかをベンチマークし、試行錯誤に費やす数か月を節約します。', zh: '对标竞争频道靠什么成长，省下数月的试错时间。' },
  '열심히 쓴 글이 2페이지에 묻히면 없는 글과 같습니다. 내 블로그의 현재 지수와 성장 여력을 등급으로 먼저 진단하세요.': { en: "A post you worked hard on is as good as invisible if it lands on page two. Diagnose your blog's current index and growth potential by grade first.", ja: '一生懸命書いた記事も2ページ目に埋もれれば無いのと同じです。まずは自分のブログの現在の指数と成長余力を等級で診断しましょう。', zh: '辛苦写的文章沉到第二页，就等于不存在。先用等级诊断你博客当前的指数和成长空间。' },
  '노리는 키워드가 상위노출 가능한지 확률로 알려드립니다. 승산 없는 키워드에 쏟을 시간을 아낍니다.': { en: "We tell you the probability that your target keyword can rank at the top, saving the time you'd spend on keywords you can't win.", ja: '狙うキーワードが上位表示できるかを確率でお知らせします。勝ち目のないキーワードに費やす時間を節約します。', zh: '用概率告诉你目标关键词能否上首页，省下押注无望关键词的时间。' },
  '경쟁 문서 수와 강도를 계산해, 이길 수 있는 키워드부터 공략하도록 골라줍니다.': { en: 'We calculate the number and strength of competing documents and pick the winnable keywords to target first.', ja: '競合文書の数と強度を計算し、勝てるキーワードから攻略できるよう選び出します。', zh: '计算竞争文档的数量和强度，挑出你能赢的关键词优先攻克。' },
  '네이버 알고리즘 기준에 맞춘 개선 포인트를 리포트로 제시해, 무엇을 고칠지 바로 알 수 있습니다.': { en: "A report lays out improvement points aligned with Naver's algorithm, so you know exactly what to fix.", ja: 'Naverのアルゴリズム基準に合わせた改善ポイントをレポートで提示し、何を直せばよいかがすぐ分かります。', zh: '以报告形式提出符合Naver算法标准的改进点，让你立刻知道该修什么。' },
  '메신저와 메모장에 흩어진 업무는 결국 누군가 놓칩니다. 카드 한 곳에 모아 진행 상황을 팀 전체가 공유하세요.': { en: "Work scattered across messengers and notepads eventually slips through someone's hands. Gather it into cards in one place so the whole team shares the progress.", ja: 'メッセンジャーやメモ帳に散らばった業務は結局誰かが取りこぼします。カード一か所にまとめ、進捗をチーム全体で共有しましょう。', zh: '散落在聊天工具和便签里的工作，总会被人漏掉。集中到一处的卡片上，让整个团队共享进度。' },
  '카피 한 줄, 기획 초안 때문에 멈추던 순간, AI 어시스턴트가 즉석에서 함께 만들어냅니다.': { en: 'The moments you stall over a line of copy or a first draft, the AI assistant creates it with you on the spot.', ja: 'コピー一行、企画の下書きで止まっていた瞬間、AIアシスタントがその場で一緒に作り上げます。', zh: '为一句文案、一份初稿而卡住的时刻，AI助手即刻与你一起完成。' },
  '카드마다 코멘트와 멘션으로 소통해, 회의를 잡지 않아도 맥락이 그대로 남습니다.': { en: 'Communicate with comments and mentions on each card, so context stays intact without scheduling a meeting.', ja: 'カードごとにコメントとメンションでやり取りし、会議を設けなくても文脈がそのまま残ります。', zh: '在每张卡片上用评论和@沟通，不用开会，上下文也原样保留。' },
  '담당자와 마감을 규칙에 따라 자동 배정해, 챙기는 데 쓰던 시간을 실행에 되돌립니다.': { en: 'Assign owners and deadlines automatically by rules, returning the time spent chasing tasks back to doing them.', ja: '担当者と締め切りをルールに従って自動割り当てし、管理に使っていた時間を実行に取り戻します。', zh: '按规则自动分配负责人和截止日期，把用于盯进度的时间还给执行。' },
  '어렵게 모은 DB가 엑셀에서 잠들면 매출이 되지 않습니다. 신규부터 계약까지 단계별로 관리해 흐름을 놓치지 마세요.': { en: 'Hard-won data asleep in a spreadsheet never becomes revenue. Manage it stage by stage from new to closed and never lose the flow.', ja: '苦労して集めたDBがExcelで眠っていては売上になりません。新規から契約まで段階ごとに管理し、流れを逃さないようにしましょう。', zh: '辛苦收集的数据在Excel里沉睡，就变不成销售。从新客到成交按阶段管理，别错过流程。' },
  '조건에 맞는 고객을 그룹으로 묶어, 모두에게 같은 메시지를 뿌리는 대신 정밀하게 공략합니다.': { en: 'Group customers that match your criteria and target them precisely instead of blasting everyone the same message.', ja: '条件に合う顧客をグループにまとめ、全員に同じメッセージを送る代わりに精密に攻略します。', zh: '把符合条件的客户分组，精准攻克，而不是给所有人群发同样的消息。' },
  '재구매 시점·이탈 조건이 충족되면 문자·알림톡이 자동 발송됩니다. 타이밍을 놓쳐 잃던 고객을 붙잡습니다.': { en: 'When repurchase timing or churn conditions are met, texts and alert messages send automatically, catching customers you used to lose to bad timing.', ja: '再購入のタイミングや離脱条件が満たされると、SMS・通知トークが自動送信されます。タイミングを逃して失っていた顧客を掴みます。', zh: '当复购时机或流失条件满足时，短信和通知消息自动发送，留住过去因错过时机而流失的客户。' },
  '고객 생애가치와 전환율을 리포트로 보며, 어디에 다시 집중할지 근거로 판단합니다.': { en: 'View customer lifetime value and conversion rates in reports to decide where to refocus, backed by evidence.', ja: '顧客生涯価値とコンバージョン率をレポートで見ながら、どこに再び集中するかを根拠に基づいて判断します。', zh: '通过报告查看客户生命周期价值和转化率，有依据地判断该重新聚焦何处。' },
  '채널마다 흩어진 리포트를 짜 맞추다 보면 정작 손볼 타이밍을 놓칩니다. 메타·구글·네이버를 한 화면에서 모니터링하세요.': { en: 'Piecing together reports scattered across channels makes you miss the moment to act. Monitor Meta, Google, and Naver on a single screen.', ja: 'チャネルごとに散らばったレポートをつなぎ合わせているうちに、肝心の手を打つタイミングを逃します。Meta・Google・Naverを一画面でモニタリングしましょう。', zh: '拼凑各渠道分散的报告，反而错过该动手的时机。在一个屏幕上监控Meta、Google和Naver。' },
  '광고비 대비 매출과 전환당 비용을 실시간 추적해, 밑 빠진 캠페인을 그날 바로 멈출 수 있습니다.': { en: 'Track revenue against ad spend and cost per conversion in real time, so you can halt a leaking campaign the same day.', ja: '広告費に対する売上とコンバージョン単価をリアルタイムで追跡し、底の抜けたキャンペーンをその日のうちに止められます。', zh: '实时追踪广告费对应的销售额和单次转化成本，当天就能叫停漏水的广告。' },
  '어떤 소재가 잘 먹히는지 나란히 비교해, 되는 소재에 예산을 몰아줍니다.': { en: 'Compare which creatives land side by side and pour budget into the ones that work.', ja: 'どの素材が効くかを並べて比較し、効く素材に予算を集中させます。', zh: '并排比较哪些素材有效，把预算集中到有效的素材上。' },
  'AI가 예산을 어디에 더 쓸지 제안해, 감으로 배분하다 새던 돈을 줄입니다.': { en: 'AI suggests where to spend more budget, cutting the money lost to gut-feel allocation.', ja: 'AIが予算をどこに多く使うべきかを提案し、勘で配分して漏れていたお金を減らします。', zh: 'AI建议该在哪里多花预算，减少凭感觉分配而流失的钱。' },
  '외주 견적과 촬영 일정을 잡는 동안 트렌드는 지나갑니다. 한 줄 프롬프트만 입력하면 영상이 만들어집니다.': { en: 'Trends pass while you gather outsourcing quotes and book shoots. Type a one-line prompt and a video is made.', ja: '外注の見積もりや撮影スケジュールを組んでいる間にトレンドは過ぎ去ります。一行のプロンプトを入力するだけで動画が作られます。', zh: '在你比价外包、安排拍摄时，潮流已经过去。只需输入一行提示词，视频就生成了。' },
  '전문가급 카메라 워크를 프리셋으로 적용해, 장비도 촬영팀도 없이 완성도를 끌어올립니다.': { en: 'Apply pro-grade camera work as presets to raise your quality with no gear and no crew.', ja: 'プロ級のカメラワークをプリセットで適用し、機材も撮影チームもなしに完成度を高めます。', zh: '以预设套用专业级运镜，没有设备和拍摄团队也能提升成片质感。' },
  '숏폼·광고용 템플릿으로 즉시 완성해, 아이디어가 식기 전에 바로 올립니다.': { en: 'Finish instantly with short-form and ad templates and post before the idea cools.', ja: 'ショート・広告用テンプレートで即座に仕上げ、アイデアが冷める前にすぐ投稿します。', zh: '用短视频和广告模板即刻完成，趁灵感未冷立即发布。' },
  '브랜드 톤을 학습해 여러 편을 만들어도 스타일이 흔들리지 않습니다.': { en: 'It learns your brand tone so your style stays consistent across many videos.', ja: 'ブランドトーンを学習し、複数本を作ってもスタイルがぶれません。', zh: '学习品牌调性，做多支视频风格也不会走样。' },
  '수작업으로 흘려보내던 시간을 줄이고, 핵심 마케팅 워크플로우를 더 빠르고 정확하게 만들어줍니다.': { en: 'It cuts the time you used to lose to manual work and makes your core marketing workflows faster and more accurate.', ja: '手作業で流していた時間を減らし、中核となるマーケティングワークフローをより速く正確にします。', zh: '减少以往手工流失的时间，让核心营销流程更快更准确。' },

  /* ── main page chrome ── */
  '찾을 수 없습니다': { en: 'Not found', ja: '見つかりません', zh: '未找到' },
  '요청하신 기능 페이지가 존재하지 않습니다.': { en: 'The feature page you requested does not exist.', ja: 'リクエストされた機能ページは存在しません。', zh: '您请求的功能页面不存在。' },
  '홈으로 돌아가기': { en: 'Back to home', ja: 'ホームに戻る', zh: '返回首页' },
  '홈': { en: 'Home', ja: 'ホーム', zh: '首页' },
  '기능': { en: 'Features', ja: '機能', zh: '功能' },
  '지금 시작하기': { en: 'Get started', ja: '今すぐ始める', zh: '立即开始' },
  '문의하기': { en: 'Contact us', ja: 'お問い合わせ', zh: '联系我们' },
  '핵심 역량': { en: 'Core capabilities', ja: 'コア機能', zh: '核心能力' },
  '이 해내는 것들': { en: ' delivers for you', ja: 'ができること', zh: ' 能为你做的事' },
  '실제 기능': { en: 'See it in action', ja: '実際の機能', zh: '实际功能' },
  '설명보다 한 번 써보는 게 빠릅니다': { en: 'Trying it once beats any explanation', ja: '説明より一度使う方が早い', zh: '与其解释，不如亲自试一次' },
  '아래 폼은 실제로 동작합니다. 지금 입력하면 DB가 그대로 수집되는 걸 직접 확인하세요.': { en: 'The form below really works. Enter your details now and watch the data get collected as-is.', ja: '下のフォームは実際に動作します。今入力すれば、DBがそのまま収集されるのを直接ご確認ください。', zh: '下面的表单是真实可用的。现在填写，亲眼看到数据被原样收集。' },
  '백문이 불여일견. 아래 데모로 기능의 흐름을 지금 바로 경험해보세요.': { en: 'Seeing beats hearing. Experience the feature\'s flow right now with the demo below.', ja: '百聞は一見に如かず。下のデモで機能の流れを今すぐ体験してください。', zh: '百闻不如一见。用下面的演示，立即体验功能流程。' },
  '직접 체험해보세요': { en: 'Try it yourself', ja: '自分で体験してみる', zh: '亲自体验' },
  '더 알아보기': { en: 'Learn more', ja: 'もっと知る', zh: '了解更多' },
  '다른 기능도 살펴보세요': { en: 'Explore other features too', ja: '他の機能も見てみましょう', zh: '也看看其他功能' },
  ', 지금 시작하세요': { en: ', get started today', ja: '、今すぐ始めましょう', zh: '，立即开始' },
  '. BYGENCY 하나로 마케팅의 모든 과정을 연결하세요.': { en: '. Connect every step of your marketing with BYGENCY alone.', ja: '。BYGENCY一つでマーケティングのすべての工程をつなげましょう。', zh: '。用一个BYGENCY，连接营销的每一个环节。' },
  '준비 중인 데모입니다.': { en: 'This demo is coming soon.', ja: '準備中のデモです。', zh: '演示正在准备中。' },

  /* ── shared ── */
  '미리보기': { en: 'Preview', ja: 'プレビュー', zh: '预览' },

  /* ── leads demo ── */
  '이름과 연락처를 입력해주세요.': { en: 'Please enter your name and contact.', ja: 'お名前と連絡先を入力してください。', zh: '请输入姓名和联系方式。' },
  'DB 수집에 실패했습니다. 잠시 후 다시 시도해주세요.': { en: 'Failed to collect data. Please try again shortly.', ja: 'DBの収集に失敗しました。しばらくしてからもう一度お試しください。', zh: '数据收集失败。请稍后重试。' },
  'DB가 수집되었습니다!': { en: 'Your data has been collected!', ja: 'DBが収集されました！', zh: '数据已收集！' },
  '지금까지 누적 ': { en: 'A total of ', ja: 'これまでに累計 ', zh: '累计已收集 ' },
  '건': { en: ' entries', ja: '件', zh: ' 条' },
  '이 수집되었습니다.': { en: ' have been collected so far.', ja: 'を収集しました。', zh: '。' },
  '정상적으로 저장되었습니다.': { en: 'Saved successfully.', ja: '正常に保存されました。', zh: '已成功保存。' },
  '다시 체험하기': { en: 'Try again', ja: 'もう一度体験する', zh: '再试一次' },
  '무료 상담을 신청하시면 담당 컨설턴트가 연락드립니다.': { en: 'Request a free consultation and our consultant will reach out.', ja: '無料相談をお申し込みいただくと、担当コンサルタントがご連絡します。', zh: '申请免费咨询，专属顾问将与您联系。' },
  '이름 *': { en: 'Name *', ja: 'お名前 *', zh: '姓名 *' },
  '홍길동': { en: 'John Doe', ja: '山田太郎', zh: '张三' },
  '연락처 *': { en: 'Phone *', ja: '連絡先 *', zh: '联系方式 *' },
  '이메일 (선택)': { en: 'Email (optional)', ja: 'メール（任意）', zh: '邮箱（选填）' },
  '수집 중...': { en: 'Collecting...', ja: '収集中...', zh: '收集中...' },
  '무료 상담 신청하기': { en: 'Request a free consultation', ja: '無料相談を申し込む', zh: '申请免费咨询' },
  '실제로 DB가 저장되는 라이브 폼입니다.': { en: 'This is a live form that actually saves data.', ja: '実際にDBが保存されるライブフォームです。', zh: '这是一个真实保存数据的实时表单。' },

  /* ── blog demo ── */
  '낮음': { en: 'Low', ja: '低い', zh: '低' },
  '보통': { en: 'Medium', ja: '普通', zh: '中' },
  '높음': { en: 'High', ja: '高い', zh: '高' },
  '키워드나 블로그 주소를 입력해보세요.': { en: 'Enter a keyword or blog URL.', ja: 'キーワードやブログのURLを入力してみてください。', zh: '输入关键词或博客地址试试。' },
  '예: 강남 맛집 / blog.naver.com/...': { en: 'e.g. best restaurants / blog.naver.com/...', ja: '例: 江南 グルメ / blog.naver.com/...', zh: '例: 江南美食 / blog.naver.com/...' },
  '분석하기': { en: 'Analyze', ja: '分析する', zh: '分析' },
  '블로그 지수': { en: 'Blog index', ja: 'ブログ指数', zh: '博客指数' },
  '상위노출 확률': { en: 'Top-ranking odds', ja: '上位表示の確率', zh: '上首页概率' },
  '경쟁 강도': { en: 'Competition', ja: '競合強度', zh: '竞争强度' },
  '상위노출 가능성': { en: 'Top-ranking likelihood', ja: '上位表示の可能性', zh: '上首页可能性' },
  '추천 키워드': { en: 'Suggested keywords', ja: 'おすすめキーワード', zh: '推荐关键词' },

  /* ── youtube demo ── */
  '오후 6시': { en: '6 PM', ja: '午後6時', zh: '下午6点' },
  '오후 8시': { en: '8 PM', ja: '午後8時', zh: '下午8点' },
  '오후 9시': { en: '9 PM', ja: '午後9時', zh: '下午9点' },
  '오전 7시': { en: '7 AM', ja: '午前7時', zh: '上午7点' },
  '오후 7시': { en: '7 PM', ja: '午後7時', zh: '下午7点' },
  '밤 10시': { en: '10 PM', ja: '夜10時', zh: '晚上10点' },
  '월': { en: 'Mon', ja: '月', zh: '一' },
  '화': { en: 'Tue', ja: '火', zh: '二' },
  '수': { en: 'Wed', ja: '水', zh: '三' },
  '목': { en: 'Thu', ja: '木', zh: '四' },
  '금': { en: 'Fri', ja: '金', zh: '五' },
  '토': { en: 'Sat', ja: '土', zh: '六' },
  '일': { en: 'Sun', ja: '日', zh: '日' },
  '채널명이나 키워드를 입력해보세요.': { en: 'Enter a channel name or keyword.', ja: 'チャンネル名やキーワードを入力してみてください。', zh: '输入频道名或关键词试试。' },
  '예: 요리 브이로그 / @channel': { en: 'e.g. cooking vlog / @channel', ja: '例: 料理Vlog / @channel', zh: '例: 美食vlog / @channel' },
  '분석': { en: 'Analyze', ja: '分析', zh: '分析' },
  '예상 조회수': { en: 'Est. views', ja: '予想再生数', zh: '预估播放量' },
  '참여율': { en: 'Engagement', ja: 'エンゲージ率', zh: '互动率' },
  '떡상 확률': { en: 'Viral odds', ja: 'バズる確率', zh: '爆款概率' },
  '요일별 예상 노출 지수': { en: 'Est. impression index by day', ja: '曜日別の予想表示指数', zh: '各星期预估曝光指数' },
  '추천 업로드 시간:': { en: 'Recommended upload time:', ja: 'おすすめ投稿時間:', zh: '推荐上传时间:' },

  /* ── video demo ── */
  '시네마틱': { en: 'Cinematic', ja: 'シネマティック', zh: '电影感' },
  '광고': { en: 'Ad', ja: '広告', zh: '广告' },
  '숏폼': { en: 'Short-form', ja: 'ショート', zh: '短视频' },
  '제품 소개': { en: 'Product intro', ja: '製品紹介', zh: '产品介绍' },
  '감성': { en: 'Aesthetic', ja: '情緒的', zh: '情感' },
  '만들고 싶은 영상을 설명해보세요.': { en: 'Describe the video you want to make.', ja: '作りたい動画を説明してみてください。', zh: '描述你想制作的视频。' },
  '예: 노을 지는 해변을 걷는 여성, 청량한 음료 광고, 부드러운 카메라 무빙': { en: 'e.g. a woman walking a beach at sunset, a refreshing drink ad, smooth camera movement', ja: '例: 夕日の浜辺を歩く女性、爽やかなドリンク広告、滑らかなカメラワーク', zh: '例: 夕阳海滩漫步的女性、清爽饮品广告、柔和运镜' },
  '생성 중...': { en: 'Generating...', ja: '生成中...', zh: '生成中...' },
  '영상 생성': { en: 'Generate video', ja: '動画を生成', zh: '生成视频' },
  '생성 완료': { en: 'Done', ja: '生成完了', zh: '生成完成' },
  '실제 서비스에서는 프롬프트에 맞춘 고화질 영상이 생성됩니다.': { en: 'In the real service, a high-resolution video is generated to match your prompt.', ja: '実際のサービスでは、プロンプトに合わせた高画質動画が生成されます。', zh: '在实际服务中，会根据提示词生成高清视频。' },

  /* ── crm demo ── */
  '신규': { en: 'New', ja: '新規', zh: '新客' },
  '상담': { en: 'In talks', ja: '商談', zh: '洽谈' },
  '계약': { en: 'Closed', ja: '契約', zh: '成交' },
  '비어있음': { en: 'Empty', ja: '空です', zh: '空' },
  '고객을 추가하고 파이프라인 단계를 옮겨보세요.': { en: 'Add customers and move them through the pipeline stages.', ja: '顧客を追加して、パイプラインの段階を動かしてみてください。', zh: '添加客户并在流程阶段间移动。' },
  '고객 이름 입력': { en: 'Enter customer name', ja: '顧客名を入力', zh: '输入客户姓名' },
  '신규 추가': { en: 'Add new', ja: '新規追加', zh: '新增' },
  '김민수': { en: 'Minsu Kim', ja: 'キム・ミンス', zh: '金民秀' },
  '이서연': { en: 'Seoyeon Lee', ja: 'イ・ソヨン', zh: '李书妍' },
  '박지훈': { en: 'Jihoon Park', ja: 'パク・ジフン', zh: '朴智勋' },
  '최유나': { en: 'Yuna Choi', ja: 'チェ・ユナ', zh: '崔有娜' },
  '이전 단계': { en: 'Previous stage', ja: '前の段階', zh: '上一阶段' },
  '다음 단계': { en: 'Next stage', ja: '次の段階', zh: '下一阶段' },

  /* ── ads demo ── */
  '광고 지표를 입력하면 ROAS를 계산합니다.': { en: 'Enter your ad metrics and we calculate ROAS.', ja: '広告指標を入力するとROASを計算します。', zh: '输入广告指标即可计算ROAS。' },
  '광고비 (원)': { en: 'Ad spend (KRW)', ja: '広告費（ウォン）', zh: '广告费（韩元）' },
  '매출 (원)': { en: 'Revenue (KRW)', ja: '売上（ウォン）', zh: '销售额（韩元）' },
  '전환수': { en: 'Conversions', ja: 'コンバージョン数', zh: '转化数' },
  'CPA (전환당 비용)': { en: 'CPA (cost per conversion)', ja: 'CPA（コンバージョン単価）', zh: 'CPA（单次转化成本）' },
  '양호 — 광고 효율이 좋습니다': { en: 'Good — your ad efficiency is strong', ja: '良好 — 広告効率が良いです', zh: '良好 — 广告效率不错' },
  '개선필요 — 소재·타겟 최적화를 권장합니다': { en: 'Needs work — we recommend optimizing creative and targeting', ja: '要改善 — 素材・ターゲットの最適化をおすすめします', zh: '需改进 — 建议优化素材和定向' },

  /* ── team demo ── */
  '안녕하세요! BYGENCY AI 마케팅 어시스턴트예요. 무엇을 도와드릴까요?': { en: "Hi! I'm the BYGENCY AI marketing assistant. How can I help?", ja: 'こんにちは！BYGENCY AIマーケティングアシスタントです。何をお手伝いしましょうか？', zh: '你好！我是BYGENCY AI营销助手。有什么可以帮您？' },
  '이런 카피는 어떨까요? "지금 시작하면 첫 달 무료 — 망설이는 순간에도 경쟁사는 앞서갑니다." 후킹 요소와 긴급성을 함께 담았습니다.': { en: 'How about this copy? "Start now and get your first month free — while you hesitate, competitors pull ahead." It packs both a hook and urgency.', ja: 'こんなコピーはいかがですか？「今始めれば初月無料 — 迷っている間にも競合は先へ進みます。」フックと緊急性を両方盛り込みました。', zh: '这句文案怎么样？"现在开始首月免费 — 你犹豫的瞬间，竞争对手已经领先。"兼具吸引点和紧迫感。' },
  '릴스는 첫 2초가 승부입니다. 강한 훅 → 3초 컷 편집 → 자막 필수. 해시태그는 대형 3개 + 중형 5개 + 니치 2개 조합을 추천합니다.': { en: 'Reels are won in the first 2 seconds. Strong hook → 3-second cuts → captions are a must. For hashtags, I recommend 3 large + 5 mid + 2 niche.', ja: 'リールは最初の2秒が勝負です。強いフック → 3秒カット編集 → 字幕必須。ハッシュタグは大型3個＋中型5個＋ニッチ2個の組み合わせがおすすめです。', zh: 'Reels成败在前2秒。强钩子 → 3秒快剪 → 字幕必备。标签推荐大号3个+中号5个+细分2个的组合。' },
  '핵심 타겟을 25~34세로 좁히고 관심사 리타겟팅부터 시작하세요. 유사 타겟(Lookalike) 1%로 확장하면 CPA를 낮출 수 있습니다.': { en: 'Narrow your core target to ages 25–34 and start with interest retargeting. Expanding to a 1% Lookalike audience can lower your CPA.', ja: 'コアターゲットを25〜34歳に絞り、興味関心のリターゲティングから始めましょう。類似オーディエンス（Lookalike）1%に拡張すればCPAを下げられます。', zh: '把核心受众收窄到25~34岁，从兴趣再营销开始。扩展到1%的相似受众(Lookalike)可降低CPA。' },
  '상위노출은 검색의도 매칭이 8할입니다. 제목에 핵심 키워드를 앞쪽에 배치하고, 1500자 이상 + 이미지 5장 이상을 권장합니다.': { en: 'Top rankings are 80% about matching search intent. Put your core keyword early in the title and aim for 1,500+ words and 5+ images.', ja: '上位表示は検索意図のマッチングが8割です。タイトルの前方にコアキーワードを配置し、1500文字以上＋画像5枚以上をおすすめします。', zh: '排名八成靠匹配搜索意图。把核心关键词放在标题靠前位置，建议1500字以上+5张以上图片。' },
  '초기에는 전체 예산의 20%로 A/B 테스트하고, ROAS 2배 이상 나오는 소재에 예산을 집중 배분하세요. 주 단위로 리밸런싱하는 게 핵심입니다.': { en: 'Early on, A/B test with 20% of your total budget, then concentrate spend on creatives hitting 2x+ ROAS. Weekly rebalancing is key.', ja: '初期は全体予算の20%でA/Bテストし、ROAS2倍以上出る素材に予算を集中配分しましょう。週単位でリバランスするのが肝心です。', zh: '初期用总预算的20%做A/B测试，再把预算集中到ROAS达2倍以上的素材。以周为单位再平衡是关键。' },
  '좋은 질문이에요! 목표(인지도·전환·재구매)와 예산, 주력 채널을 알려주시면 그에 맞는 구체적인 실행 플랜을 짜드릴게요.': { en: "Great question! Tell me your goal (awareness, conversion, repeat purchase), budget, and main channel, and I'll build a concrete action plan for you.", ja: 'いい質問ですね！目標（認知・転換・リピート）と予算、主力チャネルを教えていただければ、それに合った具体的な実行プランを立てます。', zh: '好问题！告诉我你的目标(认知、转化、复购)、预算和主力渠道，我就为你制定具体的执行方案。' },
  'AI 어시스턴트에게 마케팅을 물어보세요.': { en: 'Ask the AI assistant about marketing.', ja: 'AIアシスタントにマーケティングを聞いてみましょう。', zh: '向AI助手咨询营销问题。' },
  '광고 카피 추천해줘': { en: 'Suggest ad copy', ja: '広告コピーを提案して', zh: '推荐广告文案' },
  '인스타 릴스 전략': { en: 'Instagram Reels strategy', ja: 'インスタリールス戦略', zh: 'Instagram Reels策略' },
  '예산 배분 팁': { en: 'Budget allocation tips', ja: '予算配分のコツ', zh: '预算分配技巧' },
  '메시지를 입력하세요...': { en: 'Type a message...', ja: 'メッセージを入力してください...', zh: '输入消息...' },
}

/* ───────────────── per-feature marketing copy ───────────────── */
type StatChip = { to: number; suffix?: string; decimals?: number; label: string }
type Meta = { tagline: string; stats: StatChip[]; notes: string[] }

const META: Record<string, Meta> = {
  leads: {
    tagline: '떠나는 방문자를 고객 DB로 붙잡다',
    stats: [
      { to: 42, suffix: '%', label: '평균 전환율 상승' },
      { to: 12400, suffix: '+', label: '일 평균 수집 DB' },
      { to: 3, suffix: '분', label: '평균 세팅 시간' },
    ],
    notes: [
      '광고비를 들여 데려온 방문자, 대부분은 흔적 없이 떠납니다. 코딩 없이 폼을 끌어다 놓아 오늘 안에 붙잡는 랜딩페이지를 완성하세요.',
      '어느 채널에서 몇 명이 전환됐는지 실시간 대시보드로 확인하면, 돈 새는 채널을 그만두고 되는 곳에 집중할 수 있습니다.',
      '중복·오타 번호가 섞인 DB는 영업 시간을 갉아먹습니다. 자동 정제로 바로 연락할 수 있는 명단만 남깁니다.',
      '수집 즉시 CRM 파이프라인으로 넘어갑니다. 리드가 식기 전에, 가장 뜨거울 때 연락하세요.',
    ],
  },
  youtube: {
    tagline: '다음 떡상을 데이터로 예측하다',
    stats: [
      { to: 8900, suffix: '+', label: '분석된 채널' },
      { to: 87, suffix: '%', label: '떡상 예측 정확도' },
      { to: 30, suffix: '+', label: '추적 지표' },
    ],
    notes: [
      '감으로 올린 영상이 묻히는 이유는 데이터를 안 봤기 때문입니다. 구독자·조회수 추이에서 성장 변곡점을 먼저 포착하세요.',
      '영상마다 노출·클릭·시청 지속률을 뜯어보면, 어디서 이탈하는지가 보이고 다음 편집이 달라집니다.',
      '지금 뜨는 키워드를 찾아 다음 콘텐츠를 기획하세요. 유행이 지난 뒤 올리면 이미 늦습니다.',
      '경쟁 채널이 무엇으로 성장했는지 벤치마킹해, 시행착오에 쓸 몇 달을 아낍니다.',
    ],
  },
  blog: {
    tagline: '상위노출, 감이 아닌 데이터로',
    stats: [
      { to: 120000, suffix: '+', label: '분석 키워드' },
      { to: 92, suffix: '%', label: '지수 진단 정확도' },
      { to: 1.5, suffix: '초', decimals: 1, label: '평균 분석 시간' },
    ],
    notes: [
      '열심히 쓴 글이 2페이지에 묻히면 없는 글과 같습니다. 내 블로그의 현재 지수와 성장 여력을 등급으로 먼저 진단하세요.',
      '노리는 키워드가 상위노출 가능한지 확률로 알려드립니다. 승산 없는 키워드에 쏟을 시간을 아낍니다.',
      '경쟁 문서 수와 강도를 계산해, 이길 수 있는 키워드부터 공략하도록 골라줍니다.',
      '네이버 알고리즘 기준에 맞춘 개선 포인트를 리포트로 제시해, 무엇을 고칠지 바로 알 수 있습니다.',
    ],
  },
  team: {
    tagline: '흩어진 협업에 AI 속도를 더하다',
    stats: [
      { to: 5, suffix: 'x', label: '업무 처리 속도' },
      { to: 90, suffix: '%', label: '소재 제작 시간 절감' },
      { to: 24, suffix: '시간', label: 'AI 상시 대응' },
    ],
    notes: [
      '메신저와 메모장에 흩어진 업무는 결국 누군가 놓칩니다. 카드 한 곳에 모아 진행 상황을 팀 전체가 공유하세요.',
      '카피 한 줄, 기획 초안 때문에 멈추던 순간, AI 어시스턴트가 즉석에서 함께 만들어냅니다.',
      '카드마다 코멘트와 멘션으로 소통해, 회의를 잡지 않아도 맥락이 그대로 남습니다.',
      '담당자와 마감을 규칙에 따라 자동 배정해, 챙기는 데 쓰던 시간을 실행에 되돌립니다.',
    ],
  },
  crm: {
    tagline: '잠자던 DB를 매출로 깨우다',
    stats: [
      { to: 38, suffix: '%', label: '재구매율 상승' },
      { to: 2.4, suffix: 'x', decimals: 1, label: 'LTV 개선' },
      { to: 95, suffix: '%', label: '알림톡 도달률' },
    ],
    notes: [
      '어렵게 모은 DB가 엑셀에서 잠들면 매출이 되지 않습니다. 신규부터 계약까지 단계별로 관리해 흐름을 놓치지 마세요.',
      '조건에 맞는 고객을 그룹으로 묶어, 모두에게 같은 메시지를 뿌리는 대신 정밀하게 공략합니다.',
      '재구매 시점·이탈 조건이 충족되면 문자·알림톡이 자동 발송됩니다. 타이밍을 놓쳐 잃던 고객을 붙잡습니다.',
      '고객 생애가치와 전환율을 리포트로 보며, 어디에 다시 집중할지 근거로 판단합니다.',
    ],
  },
  ads: {
    tagline: '광고비 한 푼도 새지 않게',
    stats: [
      { to: 2.7, suffix: 'x', decimals: 1, label: '평균 ROAS 개선' },
      { to: 31, suffix: '%', label: 'CPA 절감' },
      { to: 3, suffix: '개', label: '통합 광고 채널' },
    ],
    notes: [
      '채널마다 흩어진 리포트를 짜 맞추다 보면 정작 손볼 타이밍을 놓칩니다. 메타·구글·네이버를 한 화면에서 모니터링하세요.',
      '광고비 대비 매출과 전환당 비용을 실시간 추적해, 밑 빠진 캠페인을 그날 바로 멈출 수 있습니다.',
      '어떤 소재가 잘 먹히는지 나란히 비교해, 되는 소재에 예산을 몰아줍니다.',
      'AI가 예산을 어디에 더 쓸지 제안해, 감으로 배분하다 새던 돈을 줄입니다.',
    ],
  },
  video: {
    tagline: '모션 하나하나까지 제어하는 노드형 AI 영상',
    stats: [
      { to: 6, suffix: '+', label: '지원 AI 모델' },
      { to: 90, suffix: '%', label: '제작 시간 절감' },
      { to: 4, suffix: '종', label: 'ControlNet 제어' },
    ],
    notes: [
      '최신 AI 영상 모델을 모두 지원합니다 — Kling · Google Veo · Runway · Seedance · Luma · Hailuo를 한 화면에서 골라 씁니다.',
      'ControlNet으로 포즈·뎁스·엣지·캐니를 잡아 인물의 동작과 카메라 움직임을 하나하나 정밀하게 제어합니다.',
      '텍스트→영상, 이미지→영상, 영상→영상(V2V)을 노드로 연결해 컷과 장면을 자유롭게 구성하고 재사용합니다.',
      '원본 영상을 실사처럼 변환하고, 브랜드 톤을 유지한 채 여러 편을 대량으로 찍어냅니다.',
    ],
  },
}

const FALLBACK_META: Meta = {
  tagline: '마케팅을 한 단계 끌어올리는 기능',
  stats: [
    { to: 5200, suffix: '+', label: '활성 마케터' },
    { to: 38, suffix: '%', label: '평균 성과 상승' },
    { to: 24, suffix: '시간', label: '상시 이용' },
  ],
  notes: [],
}

/* deterministic hash for stable demo results */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0)
}
function seeded(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000
  const frac = x - Math.floor(x)
  return min + frac * (max - min)
}

/* ───────────────── main ───────────────── */
export function FeatureDetail({ slug }: { slug: string }) {
  const t = useT(M)
  const feature = getFeature(slug)

  if (!feature) {
    return (
      <div className="site-dark min-h-screen overflow-x-clip">
        <Navbar />
        <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 pt-16 text-center">
          <h1 className="text-3xl font-bold">{t('찾을 수 없습니다')}</h1>
          <p className="mt-3 text-[var(--text-soft)]">{t('요청하신 기능 페이지가 존재하지 않습니다.')}</p>
          <Button href="/" className="mt-8">
            <Home size={16} /> {t('홈으로 돌아가기')}
          </Button>
        </div>
        <Footer />
      </div>
    )
  }

  const Icon = feature.icon
  const meta = META[slug] ?? FALLBACK_META
  const others = FEATURES.filter((f) => f.slug !== slug)

  return (
    <div className="site-dark min-h-screen overflow-x-clip">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div
          className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[880px] -translate-x-1/2 rounded-full blur-[130px]"
          style={{ background: `${feature.accent}33` }}
        />
        <div
          className="animate-drift-slow pointer-events-none absolute top-32 right-0 h-[300px] w-[400px] rounded-full blur-[120px]"
          style={{ background: `${feature.accent}22` }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-4xl px-5 text-center">
          {/* breadcrumb */}
          <nav className="flex items-center justify-center gap-1.5 text-sm text-[var(--text-dim)] animate-fade-up">
            <Link href="/" className="transition-colors hover:text-blue-300">{t('홈')}</Link>
            <ChevronRight size={14} />
            <Link href="/features" className="transition-colors hover:text-blue-300">{t('기능')}</Link>
            <ChevronRight size={14} />
            <span className="font-semibold text-[var(--text-soft)]">{feature.title}</span>
          </nav>

          {/* icon tile */}
          <div className="mt-8 flex justify-center animate-fade-up delay-100">
            <span
              className={cn(
                'animate-bob grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br shadow-lg',
                feature.color,
              )}
              style={{ boxShadow: `0 12px 40px -8px ${feature.accent}88` }}
            >
              <Icon size={30} className="text-white" />
            </span>
          </div>

          <div className="mt-6 flex justify-center animate-fade-up delay-100">
            <SectionTag>{feature.short}</SectionTag>
          </div>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.12] tracking-tight animate-fade-up delay-200 sm:text-5xl md:text-6xl">
            {feature.title}
            <br />
            <span
              className="bg-gradient-to-r bg-clip-text text-transparent animate-gradient"
              style={{ backgroundImage: `linear-gradient(120deg, ${feature.accent}, #0ea5e9)` }}
            >
              {t(meta.tagline)}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-300">
            {feature.desc}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 animate-fade-up delay-300 sm:flex-row">
            <Button href="/signup" size="lg" className="group">
              {t('지금 시작하기')}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="/contact" variant="outline" size="lg">
              {t('문의하기')}
            </Button>
          </div>

          {/* stat chips */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3 animate-fade-up delay-400">
            {meta.stats.map((s) => (
              <div key={s.label} className="card-2 px-3 py-5 text-center">
                <div className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: feature.accent }}>
                  <Counter to={s.to} decimals={s.decimals || 0} suffix={s.suffix} />
                </div>
                <div className="mt-1.5 text-xs leading-snug text-[var(--text-soft)]">{t(s.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NODE WORKFLOW SHOWCASE (video only) ===== */}
      {slug === 'video' && <VideoWorkflowShowcase feature={feature} />}

      {/* ===== CAPABILITIES ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('핵심 역량')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {feature.title}{t('이 해내는 것들')}
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {feature.points.map((p, i) => (
              <Reveal key={p} delay={(i % 2) * 90}>
                <div className="card hover-lift group h-full p-6">
                  <div className="flex items-start gap-4">
                    <span
                      className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${feature.accent}18`, color: feature.accent }}
                    >
                      <Check size={20} />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{t(p)}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
                        {meta.notes[i] ? t(meta.notes[i]) : t('수작업으로 흘려보내던 시간을 줄이고, 핵심 마케팅 워크플로우를 더 빠르고 정확하게 만들어줍니다.')}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INTERACTIVE DEMO ===== */}
      <section className="relative border-y border-white/10 bg-white/[0.015] py-20">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[720px] -translate-x-1/2 rounded-full blur-[130px]"
          style={{ background: `${feature.accent}22` }}
        />
        <div className="relative mx-auto max-w-4xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('실제 기능')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('설명보다 한 번 써보는 게 빠릅니다')}
            </h2>
            <p className="mt-4 text-[var(--text-soft)]">
              {slug === 'leads'
                ? t('아래 폼은 실제로 동작합니다. 지금 입력하면 DB가 그대로 수집되는 걸 직접 확인하세요.')
                : t('백문이 불여일견. 아래 데모로 기능의 흐름을 지금 바로 경험해보세요.')}
            </p>
          </Reveal>

          {/* 밝은 "앱 창" 카드 — 어두운 페이지 위에 떠 있는 실제 제품 화면 */}
          <Reveal variant="scale" className="mt-12">
            <div className="site-light rounded-[20px] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.8)]">
              <Panel title={t('직접 체험해보세요')} className="glow">
                <FeatureDemo slug={slug} feature={feature} />
              </Panel>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== CROSS-SELL ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>{t('더 알아보기')}</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('다른 기능도 살펴보세요')}
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((f, i) => {
              const OIcon = f.icon
              return (
                <Reveal key={f.slug} delay={(i % 3) * 80}>
                  <Link href={`/features/${f.slug}`} className="card hover-lift group flex h-full items-center gap-4 p-5">
                    <span className={cn('grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110', f.color)}>
                      <OIcon size={20} className="text-white" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{f.title}</h3>
                      <p className="truncate text-xs text-[var(--text-dim)]">{f.short}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto flex-shrink-0 text-[var(--text-dim)] transition-all group-hover:translate-x-1 group-hover:text-blue-600" />
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA BAND ===== */}
      <section className="px-5 pb-24">
        <Reveal variant="scale" className="mx-auto max-w-5xl">
          <div
            className="animate-gradient relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl"
            style={{
              background: `linear-gradient(120deg, ${feature.accent}, #2563eb, #0ea5e9, #22d3ee)`,
              boxShadow: `0 30px 60px -20px ${feature.accent}77`,
            }}
          >
            <div className="animate-drift pointer-events-none absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-[90px]" />
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <Icon size={34} className="text-white" />
                </span>
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {feature.title}{t(', 지금 시작하세요')}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                {t(meta.tagline)}{t('. BYGENCY 하나로 마케팅의 모든 과정을 연결하세요.')}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/signup" size="lg" className="!bg-white !text-blue-700 hover:!bg-blue-50 hover:!brightness-100">
                  {t('지금 시작하기')} <ArrowRight size={18} />
                </Button>
                <Button href="/contact" size="lg" className="!border !border-white/40 !bg-white/10 !text-white hover:!bg-white/20">
                  {t('문의하기')}
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

/* ───────────────── demo dispatcher ───────────────── */
function FeatureDemo({ slug, feature }: { slug: string; feature: Feature }) {
  const t = useT(M)
  switch (slug) {
    case 'leads':
      return <LeadsDemo feature={feature} />
    case 'blog':
      return <BlogDemo feature={feature} />
    case 'youtube':
      return <YoutubeDemo feature={feature} />
    case 'video':
      return <VideoDemo feature={feature} />
    case 'crm':
      return <CrmDemo feature={feature} />
    case 'ads':
      return <AdsDemo feature={feature} />
    case 'team':
      return <TeamDemo feature={feature} />
    default:
      return <p className="text-sm text-[var(--text-soft)]">{t('준비 중인 데모입니다.')}</p>
  }
}

/* ── 노드 워크플로우 실물 쇼케이스 (video) ── */
function VideoWorkflowShowcase({ feature }: { feature: Feature }) {
  const t = useT(M)
  const callouts = ['텍스트→영상 · 이미지→영상 · V2V', 'ControlNet 정밀 제어 (Canny·Depth·Pose)', 'Veo·Kling·Runway·Seedance 등 최상위 모델', '노드마다 실시간 미리보기']
  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[900px] -translate-x-1/2 rounded-full blur-[140px]" style={{ background: `${feature.accent}22` }} />
      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('실제 노드 워크스페이스')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('노드로 그리는 AI 영상 파이프라인')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">{t('프롬프트 → 모델 → ControlNet → 출력. 흩어진 도구 대신 한 화면에서 연결하고, 각 단계를 실시간으로 확인합니다.')}</p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="group relative">
            <div className="absolute -inset-[1.5px] rounded-3xl opacity-70 blur-[2px] transition-opacity duration-500 group-hover:opacity-100" style={{ background: `linear-gradient(120deg, ${feature.accent}, #0ea5e9, transparent)` }} />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.85)]">
              <div className="flex items-center gap-2 border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 truncate rounded-md bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-[var(--text-dim)]">bygency.co / studio — node workspace</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/features/node-workflow.png" alt={t('노드로 그리는 AI 영상 파이프라인')} loading="lazy" className="w-full transition-transform duration-[1400ms] ease-out group-hover:scale-[1.015]" />
            </div>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {callouts.map((c, i) => (
            <Reveal key={c} delay={i * 80}>
              <div className="card-2 flex h-full items-center gap-2.5 px-4 py-3.5">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: feature.accent, boxShadow: `0 0 12px ${feature.accent}` }} />
                <span className="text-[13px] font-medium leading-snug text-[var(--text-soft)]">{t(c)}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* small helpers */
function PreviewTag() {
  const t = useT(M)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
      <Sparkles size={11} /> {t('미리보기')}
    </span>
  )
}
function fieldCls() {
  return 'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition-all placeholder:text-[var(--text-dim)] focus:border-blue-400 focus:ring-2 focus:ring-blue-200'
}

/* ───────────────── LEADS (real) ───────────────── */
function LeadsDemo({ feature }: { feature: Feature }) {
  const t = useT(M)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [total, setTotal] = useState<number | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setState('error')
      setMsg('이름과 연락처를 입력해주세요.')
      return
    }
    setState('loading')
    setMsg('')
    const res = await collectLead({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, source: 'feature-leads' })
    if (res.ok) {
      setState('ok')
      setTotal(typeof res.total === 'number' ? res.total : null)
    } else {
      setState('error')
      setMsg(res.error || 'DB 수집에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  if (state === 'ok') {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={34} />
        </span>
        <h4 className="mt-5 text-xl font-bold">{t('DB가 수집되었습니다!')}</h4>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          {total !== null ? (
            <>{t('지금까지 누적 ')}<span className="font-bold text-emerald-600">{total.toLocaleString('ko-KR')}{t('건')}</span>{t('이 수집되었습니다.')}</>
          ) : (
            t('정상적으로 저장되었습니다.')
          )}
        </p>
        <button
          onClick={() => { setState('idle'); setName(''); setPhone(''); setEmail('') }}
          className="mt-6 text-sm font-semibold text-blue-600 hover:underline"
        >
          {t('다시 체험하기')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-[var(--text-soft)]">
        {t('무료 상담을 신청하시면 담당 컨설턴트가 연락드립니다.')}
      </p>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">{t('이름 *')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('홍길동')} className={fieldCls()} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">{t('연락처 *')}</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" inputMode="tel" className={fieldCls()} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">{t('이메일 (선택)')}</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" className={fieldCls()} />
      </div>
      {state === 'error' && <p className="text-sm font-medium text-rose-500">{t(msg)}</p>}
      <Button type="submit" disabled={state === 'loading'} className="w-full" size="lg">
        {state === 'loading' ? (<><Loader2 size={18} className="animate-spin" /> {t('수집 중...')}</>) : (<>{t('무료 상담 신청하기')} <ArrowRight size={18} /></>)}
      </Button>
      <p className="text-center text-xs text-[var(--text-dim)]">{t('실제로 DB가 저장되는 라이브 폼입니다.')}</p>
    </form>
  )
}

/* ───────────────── BLOG ───────────────── */
function BlogDemo({ feature }: { feature: Feature }) {
  const t = useT(M)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | {
    grade: string; prob: number; competition: string; keywords: string[]
  }>(null)

  function analyze() {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      const h = hashStr(input.trim())
      const grades = ['A', 'B', 'C', 'D', 'E', 'F']
      const gi = Math.floor(seeded(h, 0, 6))
      const prob = Math.round(seeded(h + 1, 22, 96))
      const compScore = seeded(h + 2, 0, 3)
      const competition = compScore < 1 ? '낮음' : compScore < 2 ? '보통' : '높음'
      const pool = ['후기', '추천', '비교', '가격', '순위', '방법', '효과', '내돈내산', '리얼', '2026', '정리', '꿀팁']
      const kws: string[] = []
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(seeded(h + 10 + i, 0, pool.length))
        const kw = `${input.trim().split(' ')[0]} ${pool[idx]}`
        if (!kws.includes(kw)) kws.push(kw)
      }
      setResult({ grade: grades[Math.min(gi, 5)], prob, competition, keywords: kws })
      setLoading(false)
    }, 900)
  }

  const gradeColor = result
    ? result.grade <= 'B' ? '#10b981' : result.grade <= 'D' ? '#f59e0b' : '#ef4444'
    : feature.accent

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">{t('키워드나 블로그 주소를 입력해보세요.')}</p>
        <PreviewTag />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && analyze()}
          placeholder={t('예: 강남 맛집 / blog.naver.com/...')}
          className={fieldCls()}
        />
        <Button onClick={analyze} disabled={loading} className="shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {t('분석하기')}
        </Button>
      </div>

      {result && (
        <div className="animate-fade-up space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card-2 p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: gradeColor }}>{result.grade}</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">{t('블로그 지수')}</div>
            </div>
            <div className="card-2 p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: feature.accent }}>{result.prob}%</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">{t('상위노출 확률')}</div>
            </div>
            <div className="card-2 p-4 text-center">
              <div className="text-2xl font-bold">{t(result.competition)}</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">{t('경쟁 강도')}</div>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-soft)]">
              <span>{t('상위노출 가능성')}</span><span>{result.prob}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.prob}%`, background: feature.accent }} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--text-soft)]">{t('추천 키워드')}</p>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((k) => (
                <span key={k} className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: `${feature.accent}44`, color: feature.accent, background: `${feature.accent}0d` }}>
                  #{k}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────── YOUTUBE ───────────────── */
function YoutubeDemo({ feature }: { feature: Feature }) {
  const t = useT(M)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | {
    views: number; engagement: number; viral: number; time: string; bars: number[]
  }>(null)

  function analyze() {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      const h = hashStr(input.trim())
      const views = Math.round(seeded(h, 8, 240)) * 1000
      const engagement = Math.round(seeded(h + 1, 28, 92) * 10) / 10
      const viral = Math.round(seeded(h + 2, 20, 95))
      const times = ['오후 6시', '오후 8시', '오후 9시', '오전 7시', '오후 7시', '밤 10시']
      const time = times[Math.floor(seeded(h + 3, 0, times.length))]
      const bars = Array.from({ length: 7 }, (_, i) => Math.round(seeded(h + 5 + i, 25, 100)))
      setResult({ views, engagement, viral, time, bars })
      setLoading(false)
    }, 900)
  }

  const days = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">{t('채널명이나 키워드를 입력해보세요.')}</p>
        <PreviewTag />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && analyze()}
          placeholder={t('예: 요리 브이로그 / @channel')}
          className={fieldCls()}
        />
        <Button onClick={analyze} disabled={loading} className="shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />} {t('분석')}
        </Button>
      </div>

      {result && (
        <div className="animate-fade-up space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card-2 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: feature.accent }}>
                {(result.views / 10000).toFixed(1)}만
              </div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">{t('예상 조회수')}</div>
            </div>
            <div className="card-2 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: feature.accent }}>{result.engagement}%</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">{t('참여율')}</div>
            </div>
            <div className="card-2 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: feature.accent }}>{result.viral}%</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">{t('떡상 확률')}</div>
            </div>
          </div>
          <div className="card-2 p-4">
            <p className="mb-3 text-xs font-semibold text-[var(--text-soft)]">{t('요일별 예상 노출 지수')}</p>
            <div className="flex items-end gap-2" style={{ height: 96 }}>
              {result.bars.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full origin-bottom rounded-t"
                      style={{
                        height: `${b}%`,
                        background: `linear-gradient(to top, ${feature.accent}, ${feature.accent}99)`,
                        animation: `fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-dim)]">{t(days[i])}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: `${feature.accent}0d`, color: feature.accent }}>
            <span className="font-semibold">{t('추천 업로드 시간:')}</span> {t(result.time)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────── VIDEO ───────────────── */
function VideoDemo({ feature }: { feature: Feature }) {
  const t = useT(M)
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('시네마틱')
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'gen' | 'done'>('idle')

  const styles = ['시네마틱', '광고', '숏폼', '제품 소개', '감성']

  function generate() {
    if (!prompt.trim() || phase === 'gen') return
    setPhase('gen')
    setProgress(0)
    const start = Date.now()
    const timer = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - start) / 1500) * 100))
      setProgress(p)
      if (p >= 100) {
        clearInterval(timer)
        setPhase('done')
      }
    }, 60)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">{t('만들고 싶은 영상을 설명해보세요.')}</p>
        <PreviewTag />
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder={t('예: 노을 지는 해변을 걷는 여성, 청량한 음료 광고, 부드러운 카메라 무빙')}
        className={cn(fieldCls(), 'resize-none')}
      />
      <div className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
              style === s ? 'text-white' : 'border-[var(--border)] bg-white text-[var(--text-soft)] hover:border-blue-300',
            )}
            style={style === s ? { background: feature.accent, borderColor: feature.accent } : undefined}
          >
            {t(s)}
          </button>
        ))}
      </div>
      <Button onClick={generate} disabled={phase === 'gen'} className="w-full" size="lg">
        {phase === 'gen' ? (<><Loader2 size={18} className="animate-spin" /> {t('생성 중...')} {progress}%</>) : (<><Wand2 size={18} /> {t('영상 생성')}</>)}
      </Button>

      {phase === 'gen' && (
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: feature.accent }} />
        </div>
      )}

      {phase === 'done' && (
        <div className="animate-fade-up">
          <div
            className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${feature.accent}, #0ea5e9, #22d3ee)` }}
          >
            <div className="animate-drift pointer-events-none absolute -top-10 left-1/3 h-40 w-40 rounded-full bg-white/25 blur-3xl" />
            <button className="relative grid h-16 w-16 place-items-center rounded-full bg-white/25 backdrop-blur transition-transform hover:scale-110">
              <Play size={28} className="ml-1 text-white" fill="white" />
            </button>
            <span className="absolute bottom-3 left-3 rounded-md bg-black/30 px-2 py-1 text-xs font-medium text-white backdrop-blur">
              {t(style)} · 00:15
            </span>
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
              <Check size={12} /> {t('생성 완료')}
            </span>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--text-dim)]">
            {t('실제 서비스에서는 프롬프트에 맞춘 고화질 영상이 생성됩니다.')}
          </p>
        </div>
      )}
    </div>
  )
}

/* ───────────────── CRM ───────────────── */
type Stage = 0 | 1 | 2
type Card = { id: number; name: string; stage: Stage }
const STAGE_LABELS = ['신규', '상담', '계약']

function CrmDemo({ feature }: { feature: Feature }) {
  const t = useT(M)
  const [cards, setCards] = useState<Card[]>([
    { id: 1, name: '김민수', stage: 0 },
    { id: 2, name: '이서연', stage: 1 },
    { id: 3, name: '박지훈', stage: 2 },
    { id: 4, name: '최유나', stage: 1 },
  ])
  const [name, setName] = useState('')
  const [seq, setSeq] = useState(5)

  function add() {
    if (!name.trim()) return
    setCards((c) => [...c, { id: seq, name: name.trim(), stage: 0 }])
    setSeq((s) => s + 1)
    setName('')
  }
  function move(id: number, dir: -1 | 1) {
    setCards((c) => c.map((k) => (k.id === id ? { ...k, stage: Math.max(0, Math.min(2, k.stage + dir)) as Stage } : k)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">{t('고객을 추가하고 파이프라인 단계를 옮겨보세요.')}</p>
        <PreviewTag />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('고객 이름 입력')}
          className={fieldCls()}
        />
        <Button onClick={add} className="shrink-0"><Plus size={16} /> {t('신규 추가')}</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {STAGE_LABELS.map((label, si) => {
          const col = cards.filter((c) => c.stage === si)
          return (
            <div key={label} className="rounded-xl bg-[var(--panel-2)] p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-bold">{t(label)}</span>
                <span className="rounded-full bg-white px-1.5 text-[10px] font-semibold text-[var(--text-dim)]">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((c) => (
                  <div key={c.id} className="group rounded-lg border border-[var(--border)] bg-white p-2.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <GripVertical size={13} className="text-slate-300" />
                      <span className="truncate text-xs font-semibold">{t(c.name)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        onClick={() => move(c.id, -1)}
                        disabled={c.stage === 0}
                        className="grid h-6 w-6 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30"
                        aria-label={t('이전 단계')}
                      >
                        <ArrowLeft size={13} />
                      </button>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: feature.accent }} />
                      <button
                        onClick={() => move(c.id, 1)}
                        disabled={c.stage === 2}
                        className="grid h-6 w-6 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30"
                        aria-label={t('다음 단계')}
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {col.length === 0 && <p className="px-1 py-3 text-center text-[10px] text-[var(--text-dim)]">{t('비어있음')}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────── ADS ───────────────── */
function AdsDemo({ feature }: { feature: Feature }) {
  const t = useT(M)
  const [spend, setSpend] = useState('1000000')
  const [revenue, setRevenue] = useState('3200000')
  const [conv, setConv] = useState('40')

  const s = Number(spend) || 0
  const r = Number(revenue) || 0
  const c = Number(conv) || 0
  const roas = s > 0 ? r / s : 0
  const cpa = c > 0 ? s / c : 0
  const good = roas >= 2

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">{t('광고 지표를 입력하면 ROAS를 계산합니다.')}</p>
        <PreviewTag />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '광고비 (원)', val: spend, set: setSpend },
          { label: '매출 (원)', val: revenue, set: setRevenue },
          { label: '전환수', val: conv, set: setConv },
        ].map((f) => (
          <div key={f.label}>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">{t(f.label)}</label>
            <input
              value={f.val}
              onChange={(e) => f.set(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className={cn(fieldCls(), 'px-3 py-2.5')}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card-2 p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: feature.accent }}>{roas.toFixed(2)}x</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">ROAS</div>
        </div>
        <div className="card-2 p-4 text-center">
          <div className="text-3xl font-bold">{cpa > 0 ? `₩${Math.round(cpa).toLocaleString('ko-KR')}` : '-'}</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">{t('CPA (전환당 비용)')}</div>
        </div>
      </div>
      <div
        className={cn(
          'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold',
          good ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
        )}
      >
        {good ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
        {good ? t('양호 — 광고 효율이 좋습니다') : t('개선필요 — 소재·타겟 최적화를 권장합니다')}
      </div>
    </div>
  )
}

/* ───────────────── TEAM (AI chat) ───────────────── */
type Msg = { role: 'user' | 'ai'; text: string }
const REPLIES: { keys: string[]; text: string }[] = [
  { keys: ['카피', '문구', '광고 문구', '제목'], text: '이런 카피는 어떨까요? "지금 시작하면 첫 달 무료 — 망설이는 순간에도 경쟁사는 앞서갑니다." 후킹 요소와 긴급성을 함께 담았습니다.' },
  { keys: ['인스타', '릴스', '해시태그'], text: '릴스는 첫 2초가 승부입니다. 강한 훅 → 3초 컷 편집 → 자막 필수. 해시태그는 대형 3개 + 중형 5개 + 니치 2개 조합을 추천합니다.' },
  { keys: ['타겟', '고객', '타게팅'], text: '핵심 타겟을 25~34세로 좁히고 관심사 리타겟팅부터 시작하세요. 유사 타겟(Lookalike) 1%로 확장하면 CPA를 낮출 수 있습니다.' },
  { keys: ['블로그', 'seo', '상위노출'], text: '상위노출은 검색의도 매칭이 8할입니다. 제목에 핵심 키워드를 앞쪽에 배치하고, 1500자 이상 + 이미지 5장 이상을 권장합니다.' },
  { keys: ['예산', '광고비', 'roas'], text: '초기에는 전체 예산의 20%로 A/B 테스트하고, ROAS 2배 이상 나오는 소재에 예산을 집중 배분하세요. 주 단위로 리밸런싱하는 게 핵심입니다.' },
]
const DEFAULT_REPLY = '좋은 질문이에요! 목표(인지도·전환·재구매)와 예산, 주력 채널을 알려주시면 그에 맞는 구체적인 실행 플랜을 짜드릴게요.'

function TeamDemo({ feature }: { feature: Feature }) {
  const t = useT(M)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: '안녕하세요! BYGENCY AI 마케팅 어시스턴트예요. 무엇을 도와드릴까요?' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  function pickReply(q: string): string {
    const low = q.toLowerCase()
    for (const r of REPLIES) {
      if (r.keys.some((k) => low.includes(k.toLowerCase()))) return r.text
    }
    return DEFAULT_REPLY
  }

  function send() {
    const q = input.trim()
    if (!q || typing) return
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    const reply = pickReply(q)
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'ai', text: reply }])
      setTyping(false)
    }, 800)
  }

  const suggestions = ['광고 카피 추천해줘', '인스타 릴스 전략', '예산 배분 팁']

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">{t('AI 어시스턴트에게 마케팅을 물어보세요.')}</p>
        <PreviewTag />
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl bg-[var(--panel-2)] p-4">
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'ai' && (
              <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-white" style={{ background: feature.accent }}>
                <Bot size={15} />
              </span>
            )}
            <div
              className={cn(
                'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'user' ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm border border-[var(--border)] bg-white',
              )}
            >
              {t(m.text)}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2">
            <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-white" style={{ background: feature.accent }}>
              <Bot size={15} />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[var(--border)] bg-white px-3.5 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '120ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setInput(s)}
            className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text-soft)] transition-colors hover:border-blue-300 hover:text-blue-600"
          >
            {t(s)}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('메시지를 입력하세요...')}
          className={fieldCls()}
        />
        <Button onClick={send} disabled={typing} className="shrink-0"><Send size={16} /></Button>
      </div>
    </div>
  )
}
