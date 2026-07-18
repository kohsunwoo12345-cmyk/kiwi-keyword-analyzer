'use client'

import { useEffect, useState } from 'react'
import { Wand2, Save } from 'lucide-react'
import { Panel, Button } from '@/components/ui'
import { adminUserMarkups, adminModelPricingAction } from '@/lib/auth'

/** 프롬프트 작성(GPT·Gemini) 배수(원가율) — 전역 설정. 실제 차감 크레딧은 원가×배수. */
export function PromptGenPricing() {
  const [val, setVal] = useState('')
  const [savedMk, setSavedMk] = useState<number | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const reload = () =>
    adminUserMarkups('').then((r) => {
      const mk = typeof r.promptgenMarkup === 'number' ? r.promptgenMarkup : 2.5
      setSavedMk(mk)
      setVal(String(mk))
      if (typeof r.promptgenCredits === 'number') setCredits(r.promptgenCredits)
    })
  useEffect(() => { reload() }, [])

  const save = async () => {
    const mk = Number(val)
    if (!isFinite(mk) || mk < 1) { setToast('배수는 1(원가) 이상이어야 합니다'); return }
    setBusy(true)
    const r = await adminModelPricingAction('set_promptgen', { markup: mk })
    setBusy(false)
    if (r.ok) { setToast('저장되었습니다'); reload() } else setToast(r.error || '저장 실패')
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Wand2 size={16} className="text-violet-400" /> 프롬프트 작성 배수 (GPT · Gemini)
        </span>
      }
    >
      <p className="mb-4 text-sm text-[var(--text-soft)]">
        노드형 스튜디오의 <b className="text-[var(--text)]">AI 프롬프트 작성</b> 노드 1회 실행 비용을 <b className="text-[var(--text)]">배수(원가율)</b>로 설정합니다.
        X1 = 원가(LLM 실비×환율) 그대로, X2 = 2배 청구. 원가 이하(X1 미만)로는 설정되지 않으며, 성공 시에만 차감(관리자는 면제)됩니다.
        {savedMk != null && (
          <> 현재 <b className="text-violet-300">×{savedMk}</b>
            {credits != null && <> · 1회 약 <b className="text-violet-300">{credits} 크레딧</b></>}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-soft)]">×</span>
          <input
            type="number"
            min={1}
            step={0.5}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-24 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-violet-500/50"
          />
          <span className="text-sm text-[var(--text-soft)]">배</span>
        </div>
        <Button onClick={save} disabled={busy} size="sm">
          <Save size={15} /> 저장
        </Button>
        {toast && <span className="text-xs text-emerald-400">{toast}</span>}
      </div>
    </Panel>
  )
}
