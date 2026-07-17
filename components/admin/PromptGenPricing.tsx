'use client'

import { useEffect, useState } from 'react'
import { Wand2, Save } from 'lucide-react'
import { Panel, Button } from '@/components/ui'
import { adminUserMarkups, adminModelPricingAction } from '@/lib/auth'

/** 프롬프트 작성(GPT·Gemini) 크레딧 비용 — 전역 설정 */
export function PromptGenPricing() {
  const [val, setVal] = useState('')
  const [saved, setSaved] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const reload = () =>
    adminUserMarkups('').then((r) => {
      const c = typeof r.promptgenCredits === 'number' ? r.promptgenCredits : 1
      setSaved(c)
      setVal(String(c))
    })
  useEffect(() => { reload() }, [])

  const save = async () => {
    const c = Number(val)
    if (!isFinite(c) || c < 0) { setToast('0 이상 숫자를 입력하세요'); return }
    setBusy(true)
    const r = await adminModelPricingAction('set_promptgen', { credits: c })
    setBusy(false)
    if (r.ok) { setToast('저장되었습니다'); reload() } else setToast(r.error || '저장 실패')
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Wand2 size={16} className="text-violet-400" /> 프롬프트 작성 비용 (GPT · Gemini)
        </span>
      }
    >
      <p className="mb-4 text-sm text-[var(--text-soft)]">
        노드형 스튜디오의 <b className="text-[var(--text)]">AI 프롬프트 작성</b> 노드 1회 실행 시 차감되는 크레딧입니다. 성공한 경우에만 차감되며, 관리자 계정은 차감되지 않습니다.
        {saved != null && <> 현재: <b className="text-violet-300">{saved} 크레딧</b></>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.5}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-28 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-violet-500/50"
          />
          <span className="text-sm text-[var(--text-soft)]">크레딧 / 1회</span>
        </div>
        <Button onClick={save} disabled={busy} size="sm">
          <Save size={15} /> 저장
        </Button>
        {toast && <span className="text-xs text-emerald-400">{toast}</span>}
      </div>
    </Panel>
  )
}
