'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plug, Copy, Check, Terminal, Globe, Code2, Cpu, Coins, ShieldCheck,
  Video, Image as ImageIcon, ListChecks, ArrowRight, ExternalLink, KeyRound,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useT, type Dict } from '@/lib/i18n'

const STUDIO_URL = '/studio-nvc-prv-8b3k2/'

const M: Dict = {
  // ===== Shared / buttons =====
  '복사됨': { en: 'Copied', ja: 'コピー済み', zh: '已复制' },
  '복사': { en: 'Copy', ja: 'コピー', zh: '复制' },
  '스튜디오 열기': { en: 'Open Studio', ja: 'スタジオを開く', zh: '打开工作室' },
  '스튜디오': { en: 'Studio', ja: 'スタジオ', zh: '工作室' },
  'MCP 연결': { en: 'MCP Connection', ja: 'MCP 接続', zh: 'MCP 连接' },
  '로그인': { en: 'Log in', ja: 'ログイン', zh: '登录' },

  // ===== Hero =====
  'BYGENCY MCP 연동 가이드': { en: 'BYGENCY MCP Integration Guide', ja: 'BYGENCY MCP 連携ガイド', zh: 'BYGENCY MCP 集成指南' },
  'Claude·Cursor 등 MCP 지원 클라이언트에 BYGENCY를 연결해, 대화창에서 바로 ': { en: 'Connect BYGENCY to MCP-supporting clients like Claude and Cursor and generate ', ja: 'Claude・Cursor など MCP 対応クライアントに BYGENCY を接続し、チャット画面から直接', zh: '将 BYGENCY 连接到 Claude、Cursor 等支持 MCP 的客户端，直接在对话框中生成' },
  'AI 영상·이미지': { en: 'AI videos & images', ja: 'AI 動画・画像', zh: 'AI 视频·图像' },
  '를 생성합니다. 생성 1건마다 ': { en: ' right in the chat window. Each generation is deducted ', ja: 'を生成します。生成 1 件ごとに', zh: '。每次生成' },
  '본인 계정 크레딧': { en: 'from your account credits', ja: 'ご自身のアカウントのクレジット', zh: '从您本人账户的积分' },
  '에서 차감됩니다.': { en: '.', ja: 'から差し引かれます。', zh: '中扣除。' },
  '내 연결 주소 발급': { en: 'Get my connection URL', ja: '接続 URL を発行', zh: '获取我的连接地址' },

  // ===== Nav =====
  '개요': { en: 'Overview', ja: '概要', zh: '概览' },
  '내 토큰 발급': { en: 'Get my token', ja: 'トークンを発行', zh: '获取我的令牌' },
  '연결 방법': { en: 'How to connect', ja: '接続方法', zh: '连接方法' },
  '도구(Tools)': { en: 'Tools', ja: 'ツール(Tools)', zh: '工具(Tools)' },
  '요청 예시': { en: 'Request examples', ja: 'リクエスト例', zh: '请求示例' },
  '크레딧·과금': { en: 'Credits & billing', ja: 'クレジット・課金', zh: '积分·计费' },
  '오류': { en: 'Errors', ja: 'エラー', zh: '错误' },

  // ===== Overview =====
  'MCP(Model Context Protocol)는 Claude 같은 AI에 외부 도구를 연결하는 표준입니다. BYGENCY MCP 서버는 ': { en: 'MCP (Model Context Protocol) is a standard for connecting external tools to AIs like Claude. The BYGENCY MCP server uses', ja: 'MCP(Model Context Protocol)は Claude のような AI に外部ツールを接続する標準です。BYGENCY MCP サーバーは', zh: 'MCP（Model Context Protocol）是将外部工具连接到 Claude 等 AI 的标准。BYGENCY MCP 服务器采用' },
  ' Streamable HTTP(무상태)': { en: ' Streamable HTTP (stateless)', ja: ' Streamable HTTP(ステートレス)', zh: ' Streamable HTTP（无状态）' },
  ' 방식이며, 아래 4개 도구를 제공합니다.': { en: ' and provides the following four tools.', ja: '方式で、以下の 4 つのツールを提供します。', zh: '方式，提供以下 4 个工具。' },
  '이미지 생성 (Nano Banana·GPT Image·Grok). 즉시 URL 반환': { en: 'Image generation (Nano Banana, GPT Image, Grok). Returns a URL instantly', ja: '画像生成 (Nano Banana・GPT Image・Grok)。URL を即時返却', zh: '图像生成（Nano Banana·GPT Image·Grok）。即时返回 URL' },
  '영상 생성 시작 (Veo·Runway·Seedance). task 반환': { en: 'Start video generation (Veo, Runway, Seedance). Returns a task', ja: '動画生成の開始 (Veo・Runway・Seedance)。task を返却', zh: '开始视频生成（Veo·Runway·Seedance）。返回 task' },
  'task로 영상 완료 상태·URL 확인': { en: 'Check video completion status and URL by task', ja: 'task で動画の完了状態・URL を確認', zh: '通过 task 查询视频完成状态·URL' },
  '사용 가능한 모델·제약 목록': { en: 'List of available models and constraints', ja: '利用可能なモデル・制約の一覧', zh: '可用模型·约束列表' },

  // ===== Token =====
  '1. 내 연결 주소 발급': { en: '1. Get my connection URL', ja: '1. 接続 URL を発行', zh: '1. 获取我的连接地址' },
  '연결 주소에는 ': { en: 'The connection URL includes ', ja: '接続 URL には', zh: '连接地址中包含' },
  '본인 개인 토큰': { en: 'your personal token', ja: 'ご自身の個人トークン', zh: '您本人的个人令牌' },
  '이 포함됩니다. 이 주소로 생성하면 ': { en: '. Generating with this URL deducts ', ja: 'が含まれます。この URL で生成すると', zh: '。使用此地址生成时，会' },
  ' 절대 타인과 공유하지 마세요.': { en: ' Never share it with anyone.', ja: ' 絶対に他人と共有しないでください。', zh: ' 切勿与他人共享。' },
  '내 전용 MCP 서버 주소': { en: 'My dedicated MCP server URL', ja: '専用 MCP サーバー URL', zh: '我的专属 MCP 服务器地址' },
  '↑ 로그인된 계정의 실제 연결 주소입니다. 그대로 복사해 쓰세요.': { en: '↑ This is the actual connection URL for your logged-in account. Copy and use it as is.', ja: '↑ ログイン中のアカウントの実際の接続 URL です。そのままコピーしてお使いください。', zh: '↑ 这是已登录账户的实际连接地址。请直接复制使用。' },
  '로그인하면 여기에 ': { en: 'Once you log in, ', ja: 'ログインすると、ここに', zh: '登录后，此处会' },
  '실제 개인 주소': { en: 'your actual personal URL', ja: '実際の個人 URL', zh: '实际的个人地址' },
  '가 자동으로 표시됩니다. ': { en: ' is shown here automatically. ', ja: 'が自動的に表示されます。', zh: '自动显示。' },
  ' 후 다시 열거나, 스튜디오 프로필 → ': { en: ' and reopen this page, or issue it from Studio profile → ', ja: ' 後にもう一度開くか、スタジオのプロフィール →', zh: ' 后重新打开，或在工作室个人资料 →' },
  '에서 발급하세요.': { en: ' to issue it.', ja: 'から発行してください。', zh: '中获取。' },
  '불러오는 중…': { en: 'Loading…', ja: '読み込み中…', zh: '加载中…' },
  '발급·재발급 위치: ': { en: 'Issue / re-issue location: ', ja: '発行・再発行の場所: ', zh: '获取·重新获取位置：' },
  ' → 좌측 하단 프로필 → ': { en: ' → bottom-left profile → ', ja: ' → 左下のプロフィール →', zh: ' → 左下角个人资料 →' },
  ' 탭. 토큰이 유출되면 같은 탭에서 재발급하면 기존 연결이 무효화됩니다.': { en: ' tab. If your token leaks, re-issuing from the same tab invalidates the previous connection.', ja: ' タブ。トークンが漏洩した場合、同じタブで再発行すると既存の接続が無効になります。', zh: ' 标签页。若令牌泄露，在同一标签页重新获取即可使原有连接失效。' },

  // ===== Connect =====
  '2. 연결 방법': { en: '2. How to connect', ja: '2. 接続方法', zh: '2. 连接方法' },
  'Claude 데스크톱 · claude.ai (커스텀 커넥터)': { en: 'Claude Desktop · claude.ai (custom connector)', ja: 'Claude デスクトップ · claude.ai (カスタムコネクタ)', zh: 'Claude 桌面版 · claude.ai（自定义连接器）' },
  '설정(Settings) → ': { en: 'Settings → ', ja: '設定(Settings) →', zh: '设置(Settings) →' },
  '커넥터(Connectors)': { en: 'Connectors', ja: 'コネクタ(Connectors)', zh: '连接器(Connectors)' },
  '커스텀 커넥터 추가': { en: 'Add custom connector', ja: 'カスタムコネクタを追加', zh: '添加自定义连接器' },
  ' → 위 ': { en: ' → paste the ', ja: ' → 上の', zh: ' → 将上方的' },
  '내 연결 주소': { en: 'my connection URL', ja: '接続 URL', zh: '我的连接地址' },
  '를 붙여넣고 저장. 대화에서 “영상 만들어줘”라고 하면 도구가 실행됩니다. ': { en: ' above and save. Say "make a video" in the chat and the tool runs. ', ja: ' を貼り付けて保存します。チャットで「動画を作って」と言うとツールが実行されます。', zh: ' 粘贴到上方并保存。在对话中说“帮我做个视频”，工具即会运行。' },
  '※ Pro/Team/Enterprise 플랜에서 커스텀 커넥터가 지원됩니다.': { en: '※ Custom connectors are supported on Pro/Team/Enterprise plans.', ja: '※ Pro/Team/Enterprise プランでカスタムコネクタがサポートされます。', zh: '※ Pro/Team/Enterprise 套餐支持自定义连接器。' },
  ' → Type을 ': { en: ' → set Type to ', ja: ' → Type を', zh: ' → 将 Type 设为' },
  '로 두고 URL에 내 연결 주소 입력. 또는 ': { en: ' and enter my connection URL in the URL field. Or add to ', ja: 'にして URL に接続 URL を入力します。または', zh: '，在 URL 中输入我的连接地址。或在' },
  ' 에 아래 추가:': { en: ' add the following:', ja: ' に以下を追加:', zh: ' 中添加以下内容：' },
  'Claude Code (터미널)': { en: 'Claude Code (terminal)', ja: 'Claude Code (ターミナル)', zh: 'Claude Code（终端）' },
  '추가 후 ': { en: 'After adding, use the ', ja: '追加後、', zh: '添加后，使用' },
  ' 명령으로 연결 상태를 확인하세요.': { en: ' command to check connection status.', ja: ' コマンドで接続状態を確認してください。', zh: ' 命令查看连接状态。' },
  '요청에 ': { en: 'Add ', ja: 'リクエストに', zh: '在请求中添加' },
  ' 를 추가하고 ': { en: ' to the request and include the ', ja: ' を追加し、', zh: '，并加入' },
  ' 헤더를 넣으세요.': { en: ' header.', ja: ' ヘッダーを入れてください。', zh: ' 请求头。' },
  '인증 방식.': { en: 'Authentication.', ja: '認証方式。', zh: '认证方式。' },
  ' 토큰은 URL 경로(': { en: ' You can put the token in the URL path (', ja: ' トークンは URL パス(', zh: ' 令牌可放在 URL 路径(' },
  ')에 담아도 되고, 헤더 ': { en: ') or send it in the ', ja: ')に含めても、ヘッダー', zh: ')中，也可通过请求头' },
  ' 로 보내도 됩니다. 토큰이 없거나 틀리면 요청이 ': { en: ' header. If the token is missing or wrong, the request is rejected with ', ja: ' で送っても構いません。トークンがないか誤っている場合、リクエストは', zh: ' 发送。若令牌缺失或错误，请求将以' },
  '로 거부됩니다.': { en: ' status.', ja: 'で拒否されます。', zh: '状态被拒绝。' },

  // ===== Tools =====
  '3. 도구 레퍼런스': { en: '3. Tool reference', ja: '3. ツールリファレンス', zh: '3. 工具参考' },
  '이미지를 생성하고 즉시 URL을 반환합니다.': { en: 'Generates an image and returns a URL instantly.', ja: '画像を生成し、即座に URL を返します。', zh: '生成图像并即时返回 URL。' },
  '영상 생성을 시작합니다. 즉시 완료되지 않고 task를 반환합니다.': { en: 'Starts video generation. It does not finish instantly and returns a task.', ja: '動画生成を開始します。即座には完了せず、task を返します。', zh: '开始视频生成。不会立即完成，而是返回 task。' },
  'generate_video가 준 task로 완료를 확인합니다. (추가 과금 없음)': { en: 'Checks completion using the task returned by generate_video. (No extra charge)', ja: 'generate_video が返した task で完了を確認します。(追加課金なし)', zh: '使用 generate_video 返回的 task 确认完成情况。（无额外扣费）' },
  '사용 가능한 모델과 각 특징/제약을 반환합니다.': { en: 'Returns available models and each of their features/constraints.', ja: '利用可能なモデルと各特徴・制約を返します。', zh: '返回可用模型及各自的特性/约束。' },

  // ===== Examples =====
  '4. 원시 JSON-RPC 예시': { en: '4. Raw JSON-RPC examples', ja: '4. 生の JSON-RPC 例', zh: '4. 原始 JSON-RPC 示例' },
  'MCP는 JSON-RPC 2.0을 씁니다. 직접 호출해 연결을 테스트할 수 있습니다.': { en: 'MCP uses JSON-RPC 2.0. You can call it directly to test the connection.', ja: 'MCP は JSON-RPC 2.0 を使います。直接呼び出して接続をテストできます。', zh: 'MCP 使用 JSON-RPC 2.0。可直接调用以测试连接。' },
  'tools/list — 도구 목록': { en: 'tools/list — tool list', ja: 'tools/list — ツール一覧', zh: 'tools/list — 工具列表' },
  'tools/call — 이미지 생성': { en: 'tools/call — image generation', ja: 'tools/call — 画像生成', zh: 'tools/call — 图像生成' },
  '연결 상태만 빠르게 보려면 브라우저로 내 주소를 열어 ': { en: 'To quickly check just the connection status, open your URL in a browser, and if ', ja: '接続状態だけをすばやく確認するには、ブラウザで自分の URL を開き、', zh: '若只想快速查看连接状态，可在浏览器中打开我的地址，' },
  ' 가 보이면 정상입니다.': { en: ' appears, it is working.', ja: ' が表示されれば正常です。', zh: ' 显示即表示正常。' },

  // ===== Credits =====
  '5. 크레딧·과금': { en: '5. Credits & billing', ja: '5. クレジット・課金', zh: '5. 积分·计费' },
  ' 생성 1건마다 ': { en: 'Each generation deducts credits ', ja: '生成 1 件ごとに', zh: '每次生成会' },
  '연결된 본인 계정': { en: 'from your connected account', ja: '接続されたご自身のアカウント', zh: '从关联的本人账户' },
  '에서 크레딧이 차감됩니다(스튜디오와 동일 단가·배수).': { en: ' (same unit price and multiplier as Studio).', ja: 'からクレジットが差し引かれます(スタジオと同じ単価・倍率)。', zh: '中扣除积分（与工作室相同的单价·倍率）。' },
  ' 생성 ': { en: 'It ', ja: '生成', zh: '生成' },
  '전에 잔액을 확인': { en: 'checks your balance before generating', ja: '前に残高を確認', zh: '前会先检查余额' },
  '해 부족하면 생성을 거부합니다(크레딧 마이너스 없음).': { en: ' and refuses if insufficient (no negative credits).', ja: 'し、不足していれば生成を拒否します(クレジットのマイナスなし)。', zh: '，不足则拒绝生成（不会出现负积分）。' },
  ' 영상은 ': { en: 'Video is ', ja: '動画は', zh: '视频' },
  '시작 시 1회만': { en: 'charged only once at start', ja: '開始時に 1 回のみ', zh: '仅在开始时扣费一次' },
  ' 차감되고, ': { en: ' deducted, and repeated ', ja: ' 差し引かれ、', zh: '，重复调用' },
  ' 반복 호출은 추가 과금이 없습니다.': { en: ' calls incur no extra charge.', ja: ' の繰り返し呼び出しには追加課金がありません。', zh: ' 不产生额外费用。' },
  ' 는 실제 호출·과금 없이 페이로드만 미리 봅니다.': { en: ' previews only the payload without an actual call or charge.', ja: ' は実際の呼び出し・課金なしでペイロードのみをプレビューします。', zh: ' 仅预览负载，不进行实际调用与扣费。' },
  ' 응답의 ': { en: "The response's ", ja: 'レスポンスの', zh: '响应中的' },
  ' 로 차감액·잔액을 확인할 수 있습니다.': { en: ' let you check the amount charged and remaining balance.', ja: ' で差し引き額・残高を確認できます。', zh: ' 可用于查看扣除额·余额。' },
  '제공사 API 키(Veo·Runway·Seedance 등)는 ': { en: 'Provider API keys (Veo, Runway, Seedance, etc.) are ', ja: 'プロバイダーの API キー(Veo・Runway・Seedance など)は', zh: '供应商 API 密钥（Veo·Runway·Seedance 等）' },
  '서버에만': { en: 'kept only on the server', ja: 'サーバーにのみ', zh: '仅保存在服务器上' },
  ' 있고 응답·클라이언트에 절대 노출되지 않습니다. 사용자는 크레딧만 소모합니다.': { en: ' and are never exposed in responses or to the client. Users only consume credits.', ja: 'あり、レスポンスやクライアントには一切公開されません。ユーザーはクレジットのみを消費します。', zh: '，绝不会暴露在响应或客户端中。用户仅消耗积分。' },
  '크레딧 충전·요금제 보기': { en: 'Top up credits · view plans', ja: 'クレジットのチャージ・料金プランを見る', zh: '充值积分·查看套餐' },

  // ===== Errors =====
  '6. 오류': { en: '6. Errors', ja: '6. エラー', zh: '6. 错误' },
  '상황': { en: 'Situation', ja: '状況', zh: '情况' },
  '응답': { en: 'Response', ja: 'レスポンス', zh: '响应' },
  '토큰 없음/오류': { en: 'Token missing/invalid', ja: 'トークンなし/エラー', zh: '令牌缺失/错误' },
  '크레딧 부족': { en: 'Insufficient credits', ja: 'クレジット不足', zh: '积分不足' },
  '모델/필드 누락': { en: 'Missing model/field', ja: 'モデル/フィールドの欠落', zh: '模型/字段缺失' },
  '제공사 정책 거부': { en: 'Provider policy rejection', ja: 'プロバイダーのポリシー拒否', zh: '供应商政策拒绝' },

  // ===== CTA =====
  '준비됐나요? 스튜디오에서 개인 토큰을 발급하고 연결하세요.': { en: 'Ready? Issue your personal token in Studio and connect.', ja: '準備はできましたか？スタジオで個人トークンを発行して接続しましょう。', zh: '准备好了吗？在工作室获取个人令牌并连接。' },
  '내 주소 발급': { en: 'Get my URL', ja: 'アドレスを発行', zh: '获取我的地址' },
}

/* 복사 가능한 코드 블록 */
function Code({ children, label }: { children: string; label?: string }) {
  const t = useT(M)
  const [ok, setOk] = useState(false)
  function copy() {
    try {
      navigator.clipboard.writeText(children).then(() => { setOk(true); setTimeout(() => setOk(false), 1400) })
    } catch { /* noop */ }
  }
  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[#0b0f1a]">
      {label && <div className="border-b border-[var(--border-soft)] px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-[var(--text-dim)]">{label}</div>}
      <button onClick={copy} className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-white/10">
        {ok ? <><Check size={12} /> {t('복사됨')}</> : <><Copy size={12} /> {t('복사')}</>}
      </button>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-slate-200"><code>{children}</code></pre>
    </div>
  )
}

function Anchor({ id }: { id: string }) { return <span id={id} className="relative -top-24 block" aria-hidden /> }

export default function McpDocsPage() {
  const t = useT(M)
  const [url, setUrl] = useState<string>('')          // 회원 개인 URL
  const [base, setBase] = useState<string>('https://nextbygency.com/api/mcp')
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const origin = window.location.origin
    setBase(origin + '/api/mcp')
    fetch('/api/account/mcp-token', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && d.url) { setUrl(d.url); setLoggedIn(true) }
        else { setLoggedIn(false) }
      })
      .catch(() => setLoggedIn(false))
  }, [])

  const shownUrl = url || (base + '/<YOUR_TOKEN>')
  function copyUrl() {
    if (!url) return
    try { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }) } catch { /* noop */ }
  }

  const nav = [
    ['overview', t('개요')], ['token', t('내 토큰 발급')], ['connect', t('연결 방법')],
    ['tools', t('도구(Tools)')], ['examples', t('요청 예시')], ['credits', t('크레딧·과금')], ['errors', t('오류')],
  ]

  return (
    <div className="site-dark min-h-screen overflow-x-clip">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-14">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-[130px]" />
        <div className="relative mx-auto max-w-5xl px-5">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[12px] font-semibold text-violet-300">
            <Plug size={13} /> Developer Docs · MCP
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{t('BYGENCY MCP 연동 가이드')}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('Claude·Cursor 등 MCP 지원 클라이언트에 BYGENCY를 연결해, 대화창에서 바로 ')}<b className="text-slate-200">{t('AI 영상·이미지')}</b>{t('를 생성합니다. 생성 1건마다 ')}<b className="text-violet-300">{t('본인 계정 크레딧')}</b>{t('에서 차감됩니다.')}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#token" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110">
              {t('내 연결 주소 발급')} <ArrowRight size={15} />
            </a>
            <Link href={STUDIO_URL} className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              {t('스튜디오 열기')} <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl gap-10 px-5 pb-24 lg:flex">
        {/* 목차 */}
        <aside className="hidden w-44 flex-shrink-0 lg:block">
          <nav className="sticky top-28 space-y-1">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-soft)] transition hover:bg-white/5 hover:text-white">{label}</a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-14">
          {/* 개요 */}
          <section>
            <Anchor id="overview" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Cpu size={20} className="text-violet-400" /> {t('개요')}</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              {t('MCP(Model Context Protocol)는 Claude 같은 AI에 외부 도구를 연결하는 표준입니다. BYGENCY MCP 서버는 ')}<b className="text-slate-200">{t(' Streamable HTTP(무상태)')}</b>{t(' 방식이며, 아래 4개 도구를 제공합니다.')}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                [<ImageIcon key="i" size={16} />, 'generate_image', t('이미지 생성 (Nano Banana·GPT Image·Grok). 즉시 URL 반환')],
                [<Video key="v" size={16} />, 'generate_video', t('영상 생성 시작 (Veo·Runway·Seedance). task 반환')],
                [<ListChecks key="c" size={16} />, 'check_video_status', t('task로 영상 완료 상태·URL 확인')],
                [<Cpu key="m" size={16} />, 'list_models', t('사용 가능한 모델·제약 목록')],
              ].map(([ic, name, desc]) => (
                <div key={name as string} className="rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4">
                  <div className="flex items-center gap-2 font-mono text-[13px] font-bold text-violet-300">{ic}{name}</div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-soft)]">{desc as string}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 토큰 발급 */}
          <section>
            <Anchor id="token" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><KeyRound size={20} className="text-violet-400" /> {t('1. 내 연결 주소 발급')}</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              {t('연결 주소에는 ')}<b className="text-slate-200">{t('본인 개인 토큰')}</b>{t('이 포함됩니다. 이 주소로 생성하면 ')}<b className="text-violet-300">{t('본인 계정 크레딧')}</b>{t('에서 차감됩니다.')}
              <b className="text-rose-300">{t(' 절대 타인과 공유하지 마세요.')}</b>
            </p>

            <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/[.06] p-4">
              <div className="mb-2 text-[12px] font-semibold text-violet-300">{t('내 전용 MCP 서버 주소')}</div>
              <div className="flex items-center gap-2">
                <input readOnly value={shownUrl} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b0f1a] px-3 py-2.5 font-mono text-[12.5px] text-slate-200 outline-none" />
                <button onClick={copyUrl} disabled={!url} className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-50">
                  {copied ? <><Check size={14} /> {t('복사됨')}</> : <><Copy size={14} /> {t('복사')}</>}
                </button>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-soft)]">
                {loggedIn === true && t('↑ 로그인된 계정의 실제 연결 주소입니다. 그대로 복사해 쓰세요.')}
                {loggedIn === false && <>{t('로그인하면 여기에 ')}<b className="text-slate-200">{t('실제 개인 주소')}</b>{t('가 자동으로 표시됩니다. ')}<Link href="/login" className="text-violet-300 underline">{t('로그인')}</Link>{t(' 후 다시 열거나, 스튜디오 프로필 → ')}<b>{t('MCP 연결')}</b>{t('에서 발급하세요.')}</>}
                {loggedIn === null && t('불러오는 중…')}
              </p>
            </div>
            <p className="mt-3 text-[13px] text-[var(--text-dim)]">{t('발급·재발급 위치: ')}<Link href={STUDIO_URL} className="text-violet-300 underline">{t('스튜디오')}</Link>{t(' → 좌측 하단 프로필 → ')}<b>{t('MCP 연결')}</b>{t(' 탭. 토큰이 유출되면 같은 탭에서 재발급하면 기존 연결이 무효화됩니다.')}</p>
          </section>

          {/* 연결 방법 */}
          <section>
            <Anchor id="connect" />
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white"><Plug size={20} className="text-violet-400" /> {t('2. 연결 방법')}</h2>

            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Globe size={16} className="text-violet-400" /> {t('Claude 데스크톱 · claude.ai (커스텀 커넥터)')}</h3>
            <p className="text-[13.5px] leading-relaxed text-[var(--text-soft)]">
              {t('설정(Settings) → ')}<b className="text-slate-200">{t('커넥터(Connectors)')}</b> → <b className="text-slate-200">{t('커스텀 커넥터 추가')}</b>{t(' → 위 ')}<b>{t('내 연결 주소')}</b>{t('를 붙여넣고 저장. 대화에서 “영상 만들어줘”라고 하면 도구가 실행됩니다. ')}<span className="text-[var(--text-dim)]">{t('※ Pro/Team/Enterprise 플랜에서 커스텀 커넥터가 지원됩니다.')}</span>
            </p>

            <h3 className="mb-1 mt-6 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Code2 size={16} className="text-violet-400" /> Cursor</h3>
            <p className="text-[13.5px] leading-relaxed text-[var(--text-soft)]">Settings → <b className="text-slate-200">MCP</b> → <b className="text-slate-200">Add new MCP server</b>{t(' → Type을 ')}<b>HTTP</b>{t('로 두고 URL에 내 연결 주소 입력. 또는 ')}<code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">~/.cursor/mcp.json</code>{t(' 에 아래 추가:')}</p>
            <Code label="~/.cursor/mcp.json">{`{
  "mcpServers": {
    "bygency": { "url": "${shownUrl}" }
  }
}`}</Code>

            <h3 className="mb-1 mt-6 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Terminal size={16} className="text-violet-400" /> {t('Claude Code (터미널)')}</h3>
            <Code label="shell">{`claude mcp add --transport http bygency ${shownUrl}`}</Code>
            <p className="text-[13px] text-[var(--text-soft)]">{t('추가 후 ')}<code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">/mcp</code>{t(' 명령으로 연결 상태를 확인하세요.')}</p>

            <h3 className="mb-1 mt-6 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Code2 size={16} className="text-violet-400" /> Claude API (Messages)</h3>
            <p className="text-[13.5px] leading-relaxed text-[var(--text-soft)]">{t('요청에 ')}<code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">mcp_servers</code>{t(' 를 추가하고 ')}<code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">anthropic-beta: mcp-client-2025-04-04</code>{t(' 헤더를 넣으세요.')}</p>
            <Code label="curl">{`curl https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "anthropic-beta: mcp-client-2025-04-04" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [{ "role": "user", "content": "고양이 이미지 만들어줘" }],
    "mcp_servers": [{ "type": "url", "name": "bygency", "url": "${shownUrl}" }]
  }'`}</Code>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4 text-[13px] text-[var(--text-soft)]">
              <KeyRound size={16} className="mt-0.5 flex-shrink-0 text-violet-400" />
              <div><b className="text-slate-200">{t('인증 방식.')}</b>{t(' 토큰은 URL 경로(')}<code className="font-mono text-[12px]">/api/mcp/&lt;토큰&gt;</code>{t(')에 담아도 되고, 헤더 ')}<code className="font-mono text-[12px]">Authorization: Bearer &lt;토큰&gt;</code>{t(' 로 보내도 됩니다. 토큰이 없거나 틀리면 요청이 ')}<b>401</b>{t('로 거부됩니다.')}</div>
            </div>
          </section>

          {/* 도구 */}
          <section>
            <Anchor id="tools" />
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white"><Code2 size={20} className="text-violet-400" /> {t('3. 도구 레퍼런스')}</h2>

            <ToolDoc name="generate_image" desc={t('이미지를 생성하고 즉시 URL을 반환합니다.')}>
{`{
  "prompt": "네온 사인이 있는 밤거리",   // 필수
  "model": "nanobanana",              // nanobanana(기본)·gpt·grok
  "reference_image_url": "https://…", // 선택(편집)
  "negative_prompt": "흐릿함, 왜곡"     // 선택
}
→ { "status":"succeeded", "image_url":"https://…",
    "credits_charged": 3, "credits_remaining": 1997 }`}
            </ToolDoc>

            <ToolDoc name="generate_video" desc={t('영상 생성을 시작합니다. 즉시 완료되지 않고 task를 반환합니다.')}>
{`{
  "model": "seedance",         // veo·runway·seedance (필수)
  "prompt": "질주하는 스포츠카",  // 필수
  "first_frame_url": "https://…", // 선택 (runway는 필수)
  "seconds": 5,                // veo 5~8, runway/seedance 5·10
  "ratio": "16:9",             // 16:9·9:16·1:1
  "dry_run": false             // true면 과금 없이 미리보기
}
→ { "status":"generating", "task":"/api/generate?provider=…",
    "credits_charged": 15, "credits_remaining": 1982 }`}
            </ToolDoc>

            <ToolDoc name="check_video_status" desc={t('generate_video가 준 task로 완료를 확인합니다. (추가 과금 없음)')}>
{`{ "task": "/api/generate?provider=…" }   // generate_video의 task 그대로
→ 진행 중: { "status":"generating", "note":"15~30초 후 다시" }
→ 완료:   { "status":"succeeded", "video_url":"https://…" }`}
            </ToolDoc>

            <ToolDoc name="list_models" desc={t('사용 가능한 모델과 각 특징/제약을 반환합니다.')}>
{`{}  // 인자 없음
→ { "video":[…], "image":[…], "tip":"…" }`}
            </ToolDoc>
          </section>

          {/* 예시 */}
          <section>
            <Anchor id="examples" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Terminal size={20} className="text-violet-400" /> {t('4. 원시 JSON-RPC 예시')}</h2>
            <p className="text-[13.5px] text-[var(--text-soft)]">{t('MCP는 JSON-RPC 2.0을 씁니다. 직접 호출해 연결을 테스트할 수 있습니다.')}</p>
            <Code label={t('tools/list — 도구 목록')}>{`curl -X POST "${shownUrl}" \\
  -H "content-type: application/json" \\
  -d '{ "jsonrpc":"2.0", "id":1, "method":"tools/list" }'`}</Code>
            <Code label={t('tools/call — 이미지 생성')}>{`curl -X POST "${shownUrl}" \\
  -H "content-type: application/json" \\
  -d '{
    "jsonrpc":"2.0", "id":2, "method":"tools/call",
    "params": { "name":"generate_image",
      "arguments": { "prompt":"노을 지는 해변", "model":"nanobanana" } }
  }'`}</Code>
            <p className="text-[13px] text-[var(--text-soft)]">{t('연결 상태만 빠르게 보려면 브라우저로 내 주소를 열어 ')}<code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">{`{ "status": "ok", "authenticated": true, "credits": … }`}</code>{t(' 가 보이면 정상입니다.')}</p>
          </section>

          {/* 크레딧 */}
          <section>
            <Anchor id="credits" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Coins size={20} className="text-violet-400" /> {t('5. 크레딧·과금')}</h2>
            <ul className="space-y-2.5 text-[14px] leading-relaxed text-[var(--text-soft)]">
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" />{t(' 생성 1건마다 ')}<b className="text-slate-200">{t('연결된 본인 계정')}</b>{t('에서 크레딧이 차감됩니다(스튜디오와 동일 단가·배수).')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" />{t(' 생성 ')}<b className="text-slate-200">{t('전에 잔액을 확인')}</b>{t('해 부족하면 생성을 거부합니다(크레딧 마이너스 없음).')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" />{t(' 영상은 ')}<b className="text-slate-200">{t('시작 시 1회만')}</b>{t(' 차감되고, ')}<code className="font-mono text-[12.5px]">check_video_status</code>{t(' 반복 호출은 추가 과금이 없습니다.')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" /><code className="font-mono text-[12.5px]">dry_run: true</code>{t(' 는 실제 호출·과금 없이 페이로드만 미리 봅니다.')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" />{t(' 응답의 ')}<code className="font-mono text-[12.5px]">credits_charged</code>·<code className="font-mono text-[12.5px]">credits_remaining</code>{t(' 로 차감액·잔액을 확인할 수 있습니다.')}</li>
            </ul>
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4 text-[13px] text-[var(--text-soft)]">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
              <div>{t('제공사 API 키(Veo·Runway·Seedance 등)는 ')}<b className="text-slate-200">{t('서버에만')}</b>{t(' 있고 응답·클라이언트에 절대 노출되지 않습니다. 사용자는 크레딧만 소모합니다.')}</div>
            </div>
            <Link href="/pricing" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-violet-300 hover:underline">{t('크레딧 충전·요금제 보기')} <ArrowRight size={15} /></Link>
          </section>

          {/* 오류 */}
          <section>
            <Anchor id="errors" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ShieldCheck size={20} className="text-violet-400" /> {t('6. 오류')}</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">{t('상황')}</th><th className="px-4 py-2.5 font-semibold">{t('응답')}</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    [t('토큰 없음/오류'), 'HTTP 401 · "개인 MCP 토큰이 필요합니다"'],
                    [t('크레딧 부족'), 'isError · "크레딧이 부족합니다. 필요 N · 보유 M"'],
                    [t('모델/필드 누락'), 'isError · "model은 veo/runway/seedance…" 등'],
                    [t('제공사 정책 거부'), 'isError · 원인 메시지(정책·저작권 등)'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5">{a}</td><td className="px-4 py-2.5 font-mono text-[12px]">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[.08] to-fuchsia-500/[.05] p-6 text-center">
            <p className="text-[15px] font-semibold text-slate-100">{t('준비됐나요? 스튜디오에서 개인 토큰을 발급하고 연결하세요.')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href={STUDIO_URL} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">{t('스튜디오 열기')} <ArrowRight size={15} /></Link>
              <a href="#token" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">{t('내 주소 발급')} <KeyRound size={14} /></a>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}

function ToolDoc({ name, desc, children }: { name: string; desc: string; children: string }) {
  return (
    <div className="mb-5 rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4">
      <div className="font-mono text-[14px] font-bold text-violet-300">{name}</div>
      <p className="mt-1 text-[13px] text-[var(--text-soft)]">{desc}</p>
      <Code>{children}</Code>
    </div>
  )
}
