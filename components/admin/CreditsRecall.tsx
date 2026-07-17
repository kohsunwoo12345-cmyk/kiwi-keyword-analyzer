'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Coins } from 'lucide-react'
import { Panel, Button } from '@/components/ui'
import { adminCreditsRecallInfo, adminCreditsRecall, type CreditsRecallInfo } from '@/lib/auth'

const num = (n: number) => (Math.round((n || 0) * 100) / 100).toLocaleString('ko-KR')

/** 위험 구역 — 전체 회원 크레딧 회수(0으로) */
export function CreditsRecall() {
  const [info, setInfo] = useState<CreditsRecallInfo>({ ok: false })
  const [includeAdmin, setIncludeAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function reload() { adminCreditsRecallInfo().then(setInfo) }
  useEffect(() => { reload() }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t) }, [toast])

  const target = includeAdmin ? info.total : info.nonAdmin

  async function recall() {
    const label = includeAdmin ? '관리자 포함 전체' : '관리자 제외 전체'
    if (!window.confirm(`${label} 회원의 크레딧을 모두 0으로 회수합니다.\n대상 ${target?.users || 0}명 · ${num(target?.credits || 0)} 크레딧.\n\n이 작업은 되돌릴 수 없습니다. 계속할까요?`)) return
    const typed = window.prompt('확정하려면 대문자로 RECALL 을 입력하세요.')
    if (typed !== 'RECALL') { setToast('취소되었습니다.'); return }
    setBusy(true)
    const r = await adminCreditsRecall(includeAdmin)
    setBusy(false)
    if (r.ok) { setToast(`${r.affected}명 · ${num(r.recalled || 0)} 크레딧을 회수했습니다.`); reload() }
    else setToast(r.error || '회수 실패')
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2 text-rose-600"><AlertTriangle size={16} /> 위험 구역 · 전체 크레딧 회수</span>}
      action={<Button variant="outline" size="sm" onClick={reload}><RefreshCw size={14} /> 새로고침</Button>}
    >
      <p className="mb-3 text-sm text-[var(--text-soft)]">
        모든 회원의 <b>보유 크레딧을 0으로</b> 회수합니다. 신규 가입 시 지급되는 초기 크레딧은 이미 없으며(0), 이 버튼은 <b>기존 잔여 크레딧까지 전부 회수</b>합니다. 되돌릴 수 없습니다.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-soft)] bg-slate-50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]"><Coins size={13} /> 관리자 제외 · 회수 대상</div>
          <div className="mt-1 text-lg font-extrabold text-[var(--text)]">{info.nonAdmin?.users ?? '-'}명 · {info.nonAdmin ? num(info.nonAdmin.credits) : '-'} 크레딧</div>
        </div>
        <div className="rounded-xl border border-[var(--border-soft)] bg-slate-50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]"><Coins size={13} /> 관리자 포함 · 전체</div>
          <div className="mt-1 text-lg font-extrabold text-[var(--text)]">{info.total?.users ?? '-'}명 · {info.total ? num(info.total.credits) : '-'} 크레딧</div>
        </div>
      </div>

      <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-[var(--text-soft)]">
        <input type="checkbox" checked={includeAdmin} onChange={(e) => setIncludeAdmin(e.target.checked)} className="h-4 w-4 accent-rose-500" />
        관리자 계정 크레딧도 함께 회수 (기본: 관리자는 제외)
      </label>

      <button
        onClick={recall}
        disabled={busy || !info.ok}
        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
      >
        <AlertTriangle size={15} /> {busy ? '회수 중…' : `${includeAdmin ? '전체' : '관리자 제외 전체'} 크레딧 회수 (0으로)`}
      </button>

      {toast && <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-lg">{toast}</div>}
    </Panel>
  )
}
