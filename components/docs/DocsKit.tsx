'use client'

import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ============================================================
   개발자 문서 공용 UI — 장식은 최소로, 읽고 복사하기 쉬운 형태만.
   ============================================================ */

/** 라벨을 안 넘겼을 때 코드 첫 줄만 보고 언어를 추정한다 */
function guessLang(code: string) {
  const head = code.trimStart()
  if (head.startsWith('{') || head.startsWith('[')) return 'json'
  if (/^(curl|export|npm|npx|claude|#|\$)/.test(head)) return 'bash'
  if (/^(import|from)\s/.test(head) && head.includes('requests')) return 'python'
  return 'code'
}

/** 코드 블록 — 언어 라벨 + 복사 버튼. 연동용 코드는 전부 이 블록으로 보여준다. */
export function CodeBlock({
  code,
  lang,
  className,
}: {
  code: string
  /** 헤더에 표시할 언어·파일명 (예: bash, json, JavaScript, ~/.cursor/mcp.json) */
  lang?: string
  className?: string
}) {
  const [ok, setOk] = useState(false)
  const label = lang || guessLang(code)

  function copy() {
    try {
      navigator.clipboard.writeText(code).then(() => {
        setOk(true)
        setTimeout(() => setOk(false), 1400)
      })
    } catch {
      /* 클립보드를 못 쓰는 환경은 조용히 무시 — 코드는 그대로 선택·복사 가능 */
    }
  }

  return (
    <div className={cn('my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f1a]', className)}>
      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-3.5 py-2">
        <span className="font-mono text-[11px] text-[var(--text-dim)]">{label}</span>
        <button
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/10"
          aria-label="copy"
        >
          {ok ? <Check size={12} /> : <Copy size={12} />}
          {ok ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** 같은 작업을 여러 언어로 보여줄 때 — 탭으로 전환한다. */
export function CodeTabs({ tabs, className }: { tabs: { label: string; code: string }[]; className?: string }) {
  const [i, setI] = useState(0)
  const cur = tabs[Math.min(i, tabs.length - 1)]

  return (
    <div className={cn('my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f1a]', className)}>
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.07] bg-white/[0.02] px-2 py-1.5">
        {tabs.map((tb, n) => (
          <button
            key={tb.label}
            onClick={() => setI(n)}
            className={cn(
              'flex-shrink-0 rounded-md px-2.5 py-1 font-mono text-[11.5px] transition',
              n === i ? 'bg-white/10 text-white' : 'text-[var(--text-dim)] hover:text-slate-200',
            )}
          >
            {tb.label}
          </button>
        ))}
        <CopyButton code={cur.code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-slate-200">
        <code>{cur.code}</code>
      </pre>
    </div>
  )
}

function CopyButton({ code }: { code: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={() => {
        try {
          navigator.clipboard.writeText(code).then(() => {
            setOk(true)
            setTimeout(() => setOk(false), 1400)
          })
        } catch {
          /* noop */
        }
      }}
      className="ml-auto inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/10"
      aria-label="copy"
    >
      {ok ? <Check size={12} /> : <Copy size={12} />}
      {ok ? 'Copied' : 'Copy'}
    </button>
  )
}

/** 요청·응답 필드 레퍼런스 표 */
export function FieldTable({
  rows,
  labels,
  showRequired = true,
}: {
  rows: { name: string; type: string; required?: boolean; desc: string }[]
  /** [필드, 타입, 필수, 설명] 헤더 문구 — 번역해서 넘긴다 */
  labels: [string, string, string, string]
  /** 응답 필드처럼 '필수' 개념이 없는 표에서는 false */
  showRequired?: boolean
}) {
  const heads = showRequired ? labels : [labels[0], labels[1], labels[3]]
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="bg-white/[0.03]">
            {heads.map((l) => (
              <th key={l} className="border-b border-white/[0.07] px-3.5 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="align-top">
              <td className="border-b border-white/[0.05] px-3.5 py-2.5 font-mono text-[12.5px] text-blue-300">{r.name}</td>
              <td className="border-b border-white/[0.05] px-3.5 py-2.5 font-mono text-[12px] text-[var(--text-dim)]">{r.type}</td>
              {showRequired && (
                <td className="border-b border-white/[0.05] px-3.5 py-2.5 text-[12px]">
                  <span className={r.required ? 'font-semibold text-rose-300' : 'text-[var(--text-dim)]'}>{r.required ? labels[2] : '—'}</span>
                </td>
              )}
              <td className="border-b border-white/[0.05] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--text-soft)]">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 짧은 참고 문단 */
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-soft)]">
      {children}
    </div>
  )
}
