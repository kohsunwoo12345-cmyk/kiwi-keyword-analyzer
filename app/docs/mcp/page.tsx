'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plug, Copy, Check, Terminal, Globe, Code2, Cpu, Coins, ShieldCheck,
  Video, Image as ImageIcon, ListChecks, ArrowRight, ExternalLink, KeyRound,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const STUDIO_URL = '/studio-nvc-prv-8b3k2/'

/* 복사 가능한 코드 블록 */
function Code({ children, label }: { children: string; label?: string }) {
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
        {ok ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> 복사</>}
      </button>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-slate-200"><code>{children}</code></pre>
    </div>
  )
}

function Anchor({ id }: { id: string }) { return <span id={id} className="relative -top-24 block" aria-hidden /> }

export default function McpDocsPage() {
  const [url, setUrl] = useState<string>('')          // 회원 개인 URL
  const [base, setBase] = useState<string>('https://bygency.co/api/mcp')
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
    ['overview', '개요'], ['token', '내 토큰 발급'], ['connect', '연결 방법'],
    ['tools', '도구(Tools)'], ['examples', '요청 예시'], ['credits', '크레딧·과금'], ['errors', '오류'],
  ]

  return (
    <div className="site-dark min-h-screen overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-14">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-[130px]" />
        <div className="relative mx-auto max-w-5xl px-5">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[12px] font-semibold text-violet-300">
            <Plug size={13} /> Developer Docs · MCP
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">BYGENCY MCP 연동 가이드</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--text-soft)]">
            Claude·Cursor 등 MCP 지원 클라이언트에 BYGENCY를 연결해, 대화창에서 바로 <b className="text-slate-200">AI 영상·이미지</b>를 생성합니다.
            생성 1건마다 <b className="text-violet-300">본인 계정 크레딧</b>에서 차감됩니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#token" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110">
              내 연결 주소 발급 <ArrowRight size={15} />
            </a>
            <Link href={STUDIO_URL} className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              스튜디오 열기 <ExternalLink size={14} />
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
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Cpu size={20} className="text-violet-400" /> 개요</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              MCP(Model Context Protocol)는 Claude 같은 AI에 외부 도구를 연결하는 표준입니다. BYGENCY MCP 서버는
              <b className="text-slate-200"> Streamable HTTP(무상태)</b> 방식이며, 아래 4개 도구를 제공합니다.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                [<ImageIcon key="i" size={16} />, 'generate_image', '이미지 생성 (Nano Banana·GPT Image·Grok). 즉시 URL 반환'],
                [<Video key="v" size={16} />, 'generate_video', '영상 생성 시작 (Veo·Runway·Seedance). task 반환'],
                [<ListChecks key="c" size={16} />, 'check_video_status', 'task로 영상 완료 상태·URL 확인'],
                [<Cpu key="m" size={16} />, 'list_models', '사용 가능한 모델·제약 목록'],
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
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><KeyRound size={20} className="text-violet-400" /> 1. 내 연결 주소 발급</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              연결 주소에는 <b className="text-slate-200">본인 개인 토큰</b>이 포함됩니다. 이 주소로 생성하면 <b className="text-violet-300">본인 계정 크레딧</b>에서 차감됩니다.
              <b className="text-rose-300"> 절대 타인과 공유하지 마세요.</b>
            </p>

            <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/[.06] p-4">
              <div className="mb-2 text-[12px] font-semibold text-violet-300">내 전용 MCP 서버 주소</div>
              <div className="flex items-center gap-2">
                <input readOnly value={shownUrl} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b0f1a] px-3 py-2.5 font-mono text-[12.5px] text-slate-200 outline-none" />
                <button onClick={copyUrl} disabled={!url} className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-50">
                  {copied ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 복사</>}
                </button>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-soft)]">
                {loggedIn === true && '↑ 로그인된 계정의 실제 연결 주소입니다. 그대로 복사해 쓰세요.'}
                {loggedIn === false && <>로그인하면 여기에 <b className="text-slate-200">실제 개인 주소</b>가 자동으로 표시됩니다. <Link href="/login" className="text-violet-300 underline">로그인</Link> 후 다시 열거나, 스튜디오 프로필 → <b>MCP 연결</b>에서 발급하세요.</>}
                {loggedIn === null && '불러오는 중…'}
              </p>
            </div>
            <p className="mt-3 text-[13px] text-[var(--text-dim)]">발급·재발급 위치: <Link href={STUDIO_URL} className="text-violet-300 underline">스튜디오</Link> → 좌측 하단 프로필 → <b>MCP 연결</b> 탭. 토큰이 유출되면 같은 탭에서 재발급하면 기존 연결이 무효화됩니다.</p>
          </section>

          {/* 연결 방법 */}
          <section>
            <Anchor id="connect" />
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white"><Plug size={20} className="text-violet-400" /> 2. 연결 방법</h2>

            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Globe size={16} className="text-violet-400" /> Claude 데스크톱 · claude.ai (커스텀 커넥터)</h3>
            <p className="text-[13.5px] leading-relaxed text-[var(--text-soft)]">
              설정(Settings) → <b className="text-slate-200">커넥터(Connectors)</b> → <b className="text-slate-200">커스텀 커넥터 추가</b> → 위 <b>내 연결 주소</b>를 붙여넣고 저장.
              대화에서 “영상 만들어줘”라고 하면 도구가 실행됩니다. <span className="text-[var(--text-dim)]">※ Pro/Team/Enterprise 플랜에서 커스텀 커넥터가 지원됩니다.</span>
            </p>

            <h3 className="mb-1 mt-6 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Code2 size={16} className="text-violet-400" /> Cursor</h3>
            <p className="text-[13.5px] leading-relaxed text-[var(--text-soft)]">Settings → <b className="text-slate-200">MCP</b> → <b className="text-slate-200">Add new MCP server</b> → Type을 <b>HTTP</b>로 두고 URL에 내 연결 주소 입력. 또는 <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">~/.cursor/mcp.json</code> 에 아래 추가:</p>
            <Code label="~/.cursor/mcp.json">{`{
  "mcpServers": {
    "bygency": { "url": "${shownUrl}" }
  }
}`}</Code>

            <h3 className="mb-1 mt-6 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Terminal size={16} className="text-violet-400" /> Claude Code (터미널)</h3>
            <Code label="shell">{`claude mcp add --transport http bygency ${shownUrl}`}</Code>
            <p className="text-[13px] text-[var(--text-soft)]">추가 후 <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">/mcp</code> 명령으로 연결 상태를 확인하세요.</p>

            <h3 className="mb-1 mt-6 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Code2 size={16} className="text-violet-400" /> Claude API (Messages)</h3>
            <p className="text-[13.5px] leading-relaxed text-[var(--text-soft)]">요청에 <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">mcp_servers</code> 를 추가하고 <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">anthropic-beta: mcp-client-2025-04-04</code> 헤더를 넣으세요.</p>
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
              <div><b className="text-slate-200">인증 방식.</b> 토큰은 URL 경로(<code className="font-mono text-[12px]">/api/mcp/&lt;토큰&gt;</code>)에 담아도 되고, 헤더 <code className="font-mono text-[12px]">Authorization: Bearer &lt;토큰&gt;</code> 로 보내도 됩니다. 토큰이 없거나 틀리면 요청이 <b>401</b>로 거부됩니다.</div>
            </div>
          </section>

          {/* 도구 */}
          <section>
            <Anchor id="tools" />
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white"><Code2 size={20} className="text-violet-400" /> 3. 도구 레퍼런스</h2>

            <ToolDoc name="generate_image" desc="이미지를 생성하고 즉시 URL을 반환합니다.">
{`{
  "prompt": "네온 사인이 있는 밤거리",   // 필수
  "model": "nanobanana",              // nanobanana(기본)·gpt·grok
  "reference_image_url": "https://…", // 선택(편집)
  "negative_prompt": "흐릿함, 왜곡"     // 선택
}
→ { "status":"succeeded", "image_url":"https://…",
    "credits_charged": 3, "credits_remaining": 1997 }`}
            </ToolDoc>

            <ToolDoc name="generate_video" desc="영상 생성을 시작합니다. 즉시 완료되지 않고 task를 반환합니다.">
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

            <ToolDoc name="check_video_status" desc="generate_video가 준 task로 완료를 확인합니다. (추가 과금 없음)">
{`{ "task": "/api/generate?provider=…" }   // generate_video의 task 그대로
→ 진행 중: { "status":"generating", "note":"15~30초 후 다시" }
→ 완료:   { "status":"succeeded", "video_url":"https://…" }`}
            </ToolDoc>

            <ToolDoc name="list_models" desc="사용 가능한 모델과 각 특징/제약을 반환합니다.">
{`{}  // 인자 없음
→ { "video":[…], "image":[…], "tip":"…" }`}
            </ToolDoc>
          </section>

          {/* 예시 */}
          <section>
            <Anchor id="examples" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Terminal size={20} className="text-violet-400" /> 4. 원시 JSON-RPC 예시</h2>
            <p className="text-[13.5px] text-[var(--text-soft)]">MCP는 JSON-RPC 2.0을 씁니다. 직접 호출해 연결을 테스트할 수 있습니다.</p>
            <Code label="tools/list — 도구 목록">{`curl -X POST "${shownUrl}" \\
  -H "content-type: application/json" \\
  -d '{ "jsonrpc":"2.0", "id":1, "method":"tools/list" }'`}</Code>
            <Code label="tools/call — 이미지 생성">{`curl -X POST "${shownUrl}" \\
  -H "content-type: application/json" \\
  -d '{
    "jsonrpc":"2.0", "id":2, "method":"tools/call",
    "params": { "name":"generate_image",
      "arguments": { "prompt":"노을 지는 해변", "model":"nanobanana" } }
  }'`}</Code>
            <p className="text-[13px] text-[var(--text-soft)]">연결 상태만 빠르게 보려면 브라우저로 내 주소를 열어 <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">{`{ "status": "ok", "authenticated": true, "credits": … }`}</code> 가 보이면 정상입니다.</p>
          </section>

          {/* 크레딧 */}
          <section>
            <Anchor id="credits" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Coins size={20} className="text-violet-400" /> 5. 크레딧·과금</h2>
            <ul className="space-y-2.5 text-[14px] leading-relaxed text-[var(--text-soft)]">
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" /> 생성 1건마다 <b className="text-slate-200">연결된 본인 계정</b>에서 크레딧이 차감됩니다(스튜디오와 동일 단가·배수).</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" /> 생성 <b className="text-slate-200">전에 잔액을 확인</b>해 부족하면 생성을 거부합니다(크레딧 마이너스 없음).</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" /> 영상은 <b className="text-slate-200">시작 시 1회만</b> 차감되고, <code className="font-mono text-[12.5px]">check_video_status</code> 반복 호출은 추가 과금이 없습니다.</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" /> <code className="font-mono text-[12.5px]">dry_run: true</code> 는 실제 호출·과금 없이 페이로드만 미리 봅니다.</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" /> 응답의 <code className="font-mono text-[12.5px]">credits_charged</code>·<code className="font-mono text-[12.5px]">credits_remaining</code> 로 차감액·잔액을 확인할 수 있습니다.</li>
            </ul>
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4 text-[13px] text-[var(--text-soft)]">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
              <div>제공사 API 키(Veo·Runway·Seedance 등)는 <b className="text-slate-200">서버에만</b> 있고 응답·클라이언트에 절대 노출되지 않습니다. 사용자는 크레딧만 소모합니다.</div>
            </div>
            <Link href="/pricing" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-violet-300 hover:underline">크레딧 충전·요금제 보기 <ArrowRight size={15} /></Link>
          </section>

          {/* 오류 */}
          <section>
            <Anchor id="errors" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ShieldCheck size={20} className="text-violet-400" /> 6. 오류</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">상황</th><th className="px-4 py-2.5 font-semibold">응답</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    ['토큰 없음/오류', 'HTTP 401 · "개인 MCP 토큰이 필요합니다"'],
                    ['크레딧 부족', 'isError · "크레딧이 부족합니다. 필요 N · 보유 M"'],
                    ['모델/필드 누락', 'isError · "model은 veo/runway/seedance…" 등'],
                    ['제공사 정책 거부', 'isError · 원인 메시지(정책·저작권 등)'],
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
            <p className="text-[15px] font-semibold text-slate-100">준비됐나요? 스튜디오에서 개인 토큰을 발급하고 연결하세요.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href={STUDIO_URL} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">스튜디오 열기 <ArrowRight size={15} /></Link>
              <a href="#token" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">내 주소 발급 <KeyRound size={14} /></a>
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
