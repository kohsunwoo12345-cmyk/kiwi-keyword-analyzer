'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  KeyRound, Copy, Check, Terminal, Globe, Code2, Cpu, Coins, ShieldCheck,
  Video, Image as ImageIcon, ListChecks, ArrowRight, ExternalLink, Plug,
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

export default function ApiDocsPage() {
  const [origin, setOrigin] = useState('https://bygency.co')
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch('/api/account/api-keys', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!(d && d.ok)))
      .catch(() => setLoggedIn(false))
  }, [])

  const base = origin + '/api/v1/generate'

  const nav = [
    ['overview', '개요'], ['key', 'API 키 발급'], ['auth', '인증'],
    ['image', '이미지 생성'], ['video', '영상 생성'], ['poll', '상태 확인'],
    ['models', '모델 목록'], ['sdk', '언어별 예시'], ['credits', '크레딧·과금'], ['errors', '오류'],
  ]

  const videoModels: [string, string][] = [
    ['google', 'Google Veo 3.1'],
    ['runway', 'Runway Gen-4'],
    ['seedance', 'Seedance 2.0 / 2.0 Fast / 1.5 Pro / 1.0 Pro / Lite'],
    ['kling', 'Kling 2.1 Master / 2.0 Master / 1.6 Pro / 1.6 Standard'],
    ['hailuo', 'MiniMax Hailuo 02 / T2V-01 / I2V-01 Director'],
    ['luma', 'Luma Ray 2 / Ray Flash 2 / Ray 1.6'],
  ]
  const imageModels: [string, string][] = [
    ['nanobanana', 'Nano Banana'],
    ['openai', 'GPT Image 2 / 1.5 / Image / Mini'],
    ['xai', 'Grok Imagine'],
    ['flux', 'Flux 1.1 Pro Ultra / 1.1 Pro / Pro / Dev / Kontext'],
  ]

  return (
    <div className="site-dark min-h-screen overflow-x-clip">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-14">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-blue-700/25 blur-[130px]" />
        <div className="relative mx-auto max-w-5xl px-5">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[12px] font-semibold text-blue-300">
            <KeyRound size={13} /> Developer Docs · REST API
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">BYGENCY 생성 API</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--text-soft)]">
            <b className="text-slate-200">노드형 AI 영상 플랜</b> 회원은 API 키 하나로 <b className="text-slate-200">이미지·영상 모든 모델</b>을 직접 호출할 수 있습니다.
            생성 1건마다 <b className="text-blue-300">본인 계정 크레딧</b>에서 스튜디오와 동일하게 차감됩니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={STUDIO_URL} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110">
              API 키 발급 <ArrowRight size={15} />
            </Link>
            <Link href="/docs/mcp" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              MCP 연동은 여기 <Plug size={14} />
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
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Cpu size={20} className="text-blue-400" /> 개요</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              BYGENCY 생성 API는 단순한 <b className="text-slate-200">REST(HTTP)</b> 엔드포인트입니다. 하나의 엔드포인트로 이미지·영상을 모두 다룹니다.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                [<ImageIcon key="i" size={16} />, 'POST /api/v1/generate', '이미지 생성 → 즉시 URL 반환'],
                [<Video key="v" size={16} />, 'POST /api/v1/generate', '영상 생성 시작 → task 반환'],
                [<ListChecks key="c" size={16} />, 'GET /api/v1/generate', 'task로 영상 완료·URL 확인'],
                [<KeyRound key="m" size={16} />, 'Bearer bg_live_…', 'API 키 하나로 모든 모델 호출'],
              ].map(([ic, name, desc]) => (
                <div key={name as string} className="rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4">
                  <div className="flex items-center gap-2 font-mono text-[13px] font-bold text-blue-300">{ic}{name}</div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-soft)]">{desc as string}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4 text-[13px] text-[var(--text-soft)]">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
              <div><b className="text-slate-200">Base URL.</b> <code className="font-mono text-[12.5px] text-blue-300">{base}</code> — 모든 요청은 HTTPS로만 받습니다.</div>
            </div>
          </section>

          {/* 키 발급 */}
          <section>
            <Anchor id="key" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><KeyRound size={20} className="text-blue-400" /> 1. API 키 발급</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              <Link href={STUDIO_URL} className="text-blue-300 underline">스튜디오</Link> → 좌측 하단 <b className="text-slate-200">프로필</b> → <b className="text-slate-200">API 연결</b> 탭에서 키를 만듭니다.
            </p>
            <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-[var(--text-soft)]">
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 키는 <b className="text-slate-200">생성 시 한 번만</b> 전체가 표시됩니다. <b className="text-rose-300">이후에는 다시 볼 수 없으니</b> 안전한 곳에 보관하세요.</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 회원당 <b className="text-slate-200">최대 20개</b>까지 만들 수 있고, 언제든 폐기(revoke)할 수 있습니다.</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 키 <b className="text-slate-200">1개로 이미지·영상 모든 모델</b>을 호출합니다. 모델별로 키를 나눌 필요가 없습니다.</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 키는 <b className="text-slate-200">노드형 AI 영상 플랜</b> 보유자만 발급·사용할 수 있습니다.</li>
            </ul>
            <p className="mt-4 text-[13px] text-[var(--text-dim)]">
              {loggedIn === true && '✓ 현재 로그인되어 있습니다. 스튜디오 프로필 → API 연결 탭에서 바로 발급하세요.'}
              {loggedIn === false && <>키를 발급하려면 먼저 <Link href="/login" className="text-blue-300 underline">로그인</Link>하세요.</>}
            </p>
          </section>

          {/* 인증 */}
          <section>
            <Anchor id="auth" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ShieldCheck size={20} className="text-blue-400" /> 2. 인증</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              모든 요청 헤더에 <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">Authorization: Bearer &lt;API 키&gt;</code> 를 넣습니다.
              키가 없거나 틀리면 <b>401</b>, 플랜이 없으면 <b>403</b>으로 거부됩니다.
            </p>
            <Code label="Authorization 헤더">{`Authorization: Bearer bg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
          </section>

          {/* 이미지 */}
          <section>
            <Anchor id="image" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ImageIcon size={20} className="text-blue-400" /> 3. 이미지 생성</h2>
            <p className="text-[13.5px] text-[var(--text-soft)]"><code className="font-mono text-[12.5px] text-blue-300">POST /api/v1/generate</code> — 이미지는 즉시 결과 URL을 반환합니다.</p>
            <Code label="POST /api/v1/generate — 이미지">{`curl -X POST "${base}" \\
  -H "Authorization: Bearer $BYGENCY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "kind": "image",
    "provider": "nanobanana",
    "model": "Nano Banana",
    "prompt": "네온 사인이 있는 밤거리, 시네마틱",
    "refImage": "https://example.com/ref.jpg"
  }'

# 응답
{
  "ok": true,
  "url": "https://.../result.png",
  "credits_charged": 3,
  "credits_remaining": 1997
}`}</Code>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">필드</th><th className="px-4 py-2.5 font-semibold">설명</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    ['kind', '"image" (이미지) / "video" (영상). 생략 시 provider·model로 자동 판별'],
                    ['provider', '제공사 코드 (아래 모델 목록 참고). 필수'],
                    ['model', '모델 표시명. 생략 시 provider 기본 모델'],
                    ['prompt', '생성 프롬프트. 필수'],
                    ['refImage', '레퍼런스/편집 이미지 URL (선택)'],
                    ['negative', '피해야 할 요소 (선택)'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{a}</td><td className="px-4 py-2.5">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 영상 */}
          <section>
            <Anchor id="video" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Video size={20} className="text-blue-400" /> 4. 영상 생성</h2>
            <p className="text-[13.5px] text-[var(--text-soft)]">영상은 즉시 완료되지 않습니다. <code className="font-mono text-[12.5px] text-blue-300">POST</code> 로 시작하면 <code className="font-mono text-[12.5px]">task</code>(상태 확인 주소)를 돌려줍니다. 과금은 <b className="text-slate-200">시작 시 1회</b>만 발생합니다.</p>
            <Code label="POST /api/v1/generate — 영상">{`curl -X POST "${base}" \\
  -H "Authorization: Bearer $BYGENCY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "kind": "video",
    "provider": "seedance",
    "model": "Seedance 2.0",
    "prompt": "질주하는 스포츠카, 해질녘 도로",
    "seconds": 5,
    "ratio": "16:9",
    "firstFrame": "https://example.com/first.jpg"
  }'

# 응답
{
  "ok": true,
  "statusUrl": "/api/generate?provider=seedance&task=...",
  "credits_charged": 15,
  "credits_remaining": 1982
}`}</Code>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">필드</th><th className="px-4 py-2.5 font-semibold">설명</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    ['provider / model', '제공사·모델 (아래 목록). 필수'],
                    ['prompt', '생성 프롬프트. 필수'],
                    ['seconds', '영상 길이(초). 모델별 5~10초 지원'],
                    ['ratio', '"16:9" / "9:16" / "1:1"'],
                    ['firstFrame', '첫 프레임 이미지 URL (일부 모델 필수)'],
                    ['audio', 'true 시 오디오 포함(지원 모델). 추가 과금'],
                    ['dryRun', 'true면 실제 호출·과금 없이 페이로드만 미리보기'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{a}</td><td className="px-4 py-2.5">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 폴링 */}
          <section>
            <Anchor id="poll" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ListChecks size={20} className="text-blue-400" /> 5. 영상 상태 확인 (폴링)</h2>
            <p className="text-[13.5px] text-[var(--text-soft)]">응답의 <code className="font-mono text-[12.5px]">statusUrl</code> 쿼리를 그대로 <code className="font-mono text-[12.5px] text-blue-300">GET /api/v1/generate</code> 에 붙여 15~30초 간격으로 확인합니다. <b className="text-slate-200">추가 과금 없음.</b></p>
            <Code label="GET /api/v1/generate — 상태 확인">{`curl "${base}?provider=seedance&task=..." \\
  -H "Authorization: Bearer $BYGENCY_API_KEY"

# 진행 중
{ "status": "generating" }
# 완료
{ "status": "succeeded", "url": "https://.../video.mp4" }`}</Code>
          </section>

          {/* 모델 목록 */}
          <section>
            <Anchor id="models" />
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white"><Cpu size={20} className="text-blue-400" /> 6. 지원 모델</h2>

            <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Video size={16} className="text-blue-400" /> 영상 모델</h3>
            <div className="mb-6 overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">provider</th><th className="px-4 py-2.5 font-semibold">model (예)</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {videoModels.map(([p, m]) => (
                    <tr key={p} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{p}</td><td className="px-4 py-2.5">{m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-slate-100"><ImageIcon size={16} className="text-blue-400" /> 이미지 모델</h3>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">provider</th><th className="px-4 py-2.5 font-semibold">model (예)</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {imageModels.map(([p, m]) => (
                    <tr key={p} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{p}</td><td className="px-4 py-2.5">{m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12.5px] text-[var(--text-dim)]"><code className="font-mono">model</code> 값은 스튜디오에 표시되는 모델 이름과 동일합니다. 최신 목록·단가는 스튜디오 생성 화면에서 확인하세요.</p>
          </section>

          {/* 언어별 예시 */}
          <section>
            <Anchor id="sdk" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Code2 size={20} className="text-blue-400" /> 7. 언어별 예시</h2>

            <h3 className="mb-1 mt-4 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Code2 size={16} className="text-blue-400" /> JavaScript (fetch)</h3>
            <Code label="node / browser">{`const KEY = process.env.BYGENCY_API_KEY;
const BASE = "${base}";

// 1) 이미지 — 즉시 결과
const img = await fetch(BASE, {
  method: "POST",
  headers: { "Authorization": "Bearer " + KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ provider: "nanobanana", model: "Nano Banana", prompt: "노을 지는 해변" }),
}).then(r => r.json());
console.log(img.url, img.credits_charged);

// 2) 영상 — 시작 후 폴링
const start = await fetch(BASE, {
  method: "POST",
  headers: { "Authorization": "Bearer " + KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ provider: "seedance", model: "Seedance 2.0", prompt: "질주하는 말", seconds: 5 }),
}).then(r => r.json());

let done;
while (true) {
  await new Promise(s => setTimeout(s, 15000));
  const q = start.statusUrl.split("?")[1];
  done = await fetch(BASE + "?" + q, { headers: { "Authorization": "Bearer " + KEY } }).then(r => r.json());
  if (done.status === "succeeded" || done.url) break;
}
console.log(done.url);`}</Code>

            <h3 className="mb-1 mt-6 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Terminal size={16} className="text-blue-400" /> Python (requests)</h3>
            <Code label="python">{`import os, time, requests

KEY = os.environ["BYGENCY_API_KEY"]
BASE = "${base}"
H = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# 이미지
img = requests.post(BASE, headers=H, json={
    "provider": "nanobanana", "model": "Nano Banana", "prompt": "노을 지는 해변"
}).json()
print(img["url"], img["credits_charged"])

# 영상 (시작 → 폴링)
start = requests.post(BASE, headers=H, json={
    "provider": "seedance", "model": "Seedance 2.0", "prompt": "질주하는 말", "seconds": 5
}).json()
q = start["statusUrl"].split("?", 1)[1]
while True:
    time.sleep(15)
    r = requests.get(f"{BASE}?{q}", headers=H).json()
    if r.get("status") == "succeeded" or r.get("url"):
        print(r.get("url")); break`}</Code>
          </section>

          {/* 크레딧 */}
          <section>
            <Anchor id="credits" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Coins size={20} className="text-blue-400" /> 8. 크레딧·과금</h2>
            <ul className="space-y-2.5 text-[14px] leading-relaxed text-[var(--text-soft)]">
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 생성 1건마다 <b className="text-slate-200">키 소유자 본인 계정</b>에서 크레딧이 차감됩니다(스튜디오와 동일 단가·배수).</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 생성 <b className="text-slate-200">전에 잔액을 확인</b>해 부족하면 <b>402</b>로 거부합니다(크레딧 마이너스 없음).</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 영상은 <b className="text-slate-200">시작 시 1회만</b> 차감되고, 상태 확인(GET) 반복은 추가 과금이 없습니다.</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 응답의 <code className="font-mono text-[12.5px]">credits_charged</code>·<code className="font-mono text-[12.5px]">credits_remaining</code> 로 차감액·잔액을 확인합니다.</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> 제공사 API 키(Veo·Runway·Seedance 등)는 <b className="text-slate-200">서버에만</b> 있고 응답에 노출되지 않습니다.</li>
            </ul>
            <Link href="/pricing" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue-300 hover:underline">크레딧 충전·요금제 보기 <ArrowRight size={15} /></Link>
          </section>

          {/* 오류 */}
          <section>
            <Anchor id="errors" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ShieldCheck size={20} className="text-blue-400" /> 9. 오류 코드</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">HTTP</th><th className="px-4 py-2.5 font-semibold">상황</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    ['401', 'API 키 없음/오류 — "유효한 API 키가 필요합니다"'],
                    ['403', '노드형 AI 영상 플랜이 아님'],
                    ['402', '크레딧 부족 — need·have 함께 반환'],
                    ['400', 'model/provider 누락 등 잘못된 요청'],
                    ['500', '제공사 미설정/서버 오류'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{a}</td><td className="px-4 py-2.5">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[.08] to-sky-500/[.05] p-6 text-center">
            <p className="text-[15px] font-semibold text-slate-100">준비됐나요? 스튜디오에서 API 키를 발급하고 바로 호출하세요.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href={STUDIO_URL} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">API 키 발급 <KeyRound size={14} /></Link>
              <a href="#image" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">호출 예시 보기 <ExternalLink size={14} /></a>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
