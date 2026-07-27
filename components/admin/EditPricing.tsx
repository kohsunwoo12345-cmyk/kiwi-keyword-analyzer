'use client'

/* 브라우저 편집 기능 요금 — 자막·색보정·합성·자르기·누끼·비율 맞추기.
   고객 컴퓨터에서 처리하므로 제공사 비용이 0원이다. 그래서 '원가 × 배수' 가 아니라
   받을 금액을 직접 정한다. 기본값은 0원(무료)이고, 값을 넣으면 그때부터 크레딧이 차감된다.
   특정 회원만 다르게 받으려면 아래 모델별 배수에서 그 회원의 배수를 조정하면 된다. */

import { useCallback, useEffect, useState } from 'react'
import { Scissors, Save, Loader2, RotateCcw } from 'lucide-react'
import { Panel, Button } from '@/components/ui'
import { adminModelPricing, adminModelPricingAction } from '@/lib/auth'

/* 서버 단가표(_pricing.ts MODEL_COST)의 이름과 글자까지 같아야 한다 */
const ITEMS: { model: string; label: string; unit: string; note: string }[] = [
  { model: '자막 넣기 (이미지 · 브라우저 편집)', label: '자막 · 이미지', unit: '원 / 장', note: '사진 1장에 자막 넣기' },
  { model: '자막 넣기 (영상 · 브라우저 편집)', label: '자막 · 영상', unit: '원 / 초', note: '영상 길이에 비례' },
  { model: '색보정 (이미지 · 브라우저 편집)', label: '색보정 · 이미지', unit: '원 / 장', note: '사진 1장 색보정' },
  { model: '색보정 (영상 · 브라우저 편집)', label: '색보정 · 영상', unit: '원 / 초', note: '영상 길이에 비례' },
  { model: '합성 (이미지 · 브라우저 편집)', label: '합성 · 이미지', unit: '원 / 장', note: '로고·워터마크 얹기' },
  { model: '합성 (영상 · 브라우저 편집)', label: '합성 · 영상', unit: '원 / 초', note: '영상 길이에 비례' },
  { model: '영상 자르기·속도 (브라우저 편집)', label: '자르기 · 속도', unit: '원 / 초', note: '결과 영상 길이 기준' },
  { model: '배경 제거 (브라우저 편집)', label: '배경 제거 (누끼)', unit: '원 / 장', note: '인물 누끼 따기' },
  { model: '비율 맞추기 (브라우저 편집)', label: '비율 맞추기', unit: '원 / 장', note: '숏폼·인쇄 규격 변환' },
]

export function EditPricing() {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [creditKrw, setCreditKrw] = useState(50)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const r = await adminModelPricing()
    if (!r.ok) return
    setCreditKrw(Number(r.creditKrw) || 50)
    const next: Record<string, string> = {}
    for (const it of ITEMS) {
      const m = (r.models || []).find((x) => x.model === it.model) as any
      next[it.model] = m?.selfFee != null ? String(m.selfFee) : '0'
    }
    setVals(next)
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setBusy(true); setMsg('')
    const results = await Promise.all(
      ITEMS.map((it) => adminModelPricingAction('set_self_fee', { model: it.model, fee: Number(vals[it.model]) || 0 })),
    )
    setBusy(false)
    const bad = results.find((x) => !x.ok)
    setMsg(bad ? bad.error || '저장 실패' : '저장했습니다. 지금부터 이 요금으로 차감됩니다.')
    load()
    try { window.dispatchEvent(new Event('pricing-updated')) } catch { /* noop */ }
    setTimeout(() => setMsg(''), 4000)
  }
  const reset = async () => {
    setBusy(true)
    await Promise.all(ITEMS.map((it) => adminModelPricingAction('reset_self_fee', { model: it.model })))
    setBusy(false); setMsg('전부 무료(0원)로 되돌렸습니다.'); load()
    try { window.dispatchEvent(new Event('pricing-updated')) } catch { /* noop */ }
    setTimeout(() => setMsg(''), 4000)
  }

  const anyPaid = ITEMS.some((it) => (Number(vals[it.model]) || 0) > 0)
  const cr = (won: string) => {
    const n = Number(won) || 0
    return creditKrw > 0 ? Math.round((n / creditKrw) * 100) / 100 : 0
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2"><Scissors size={16} className="text-emerald-500" /> 편집 기능 요금 (자막·색보정·합성 등)</span>}
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={reset}><RotateCcw size={13} /> 전부 무료로</Button>
          <Button size="sm" disabled={busy} onClick={save}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} 저장</Button>
        </div>
      }
    >
      <p className="mb-4 text-sm leading-relaxed text-[var(--text-soft)]">
        고객 컴퓨터에서 처리해 <b>제공사 비용이 0원</b>인 기능입니다. <b>기본값은 0원(무료)</b>이고,
        금액을 넣으면 그때부터 크레딧이 차감됩니다. 받는 금액 전부가 이익입니다.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <div key={it.model} className="rounded-xl border border-[var(--border)] p-3">
            <div className="text-sm font-semibold">{it.label}</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={vals[it.model] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [it.model]: e.target.value.replace(/[^0-9]/g, '') }))}
                inputMode="numeric"
                placeholder="0"
                className="w-24 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-right text-base font-bold tabular-nums outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-[var(--text-dim)]">{it.unit}</span>
            </div>
            <div className="mt-1.5 text-xs font-medium text-emerald-600">
              {(Number(vals[it.model]) || 0) > 0 ? `고객 차감: ${cr(vals[it.model])} 크레딧` : '무료 (차감 없음)'}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-dim)]">{it.note}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-[var(--panel-2)] px-3.5 py-3 text-xs leading-relaxed text-[var(--text-dim)]">
        · 1크레딧 = {creditKrw.toLocaleString('ko-KR')}원 기준 환산 (회원마다 크레딧 단가가 다르면 그 단가로 계산).<br />
        · 영상은 <b>초당</b> 요금입니다 — 10초 영상에 자막을 넣으면 “자막 · 영상” 금액 × 10.<br />
        · <b>여기서 정한 금액은 전체 회원에게 적용</b>됩니다. 특정 회원만 다르게 받으려면 아래 “모델별 배수”에서 조정하세요.<br />
        · 요금이 0원이어도 <b>작업 기록은 남습니다</b> — 관리자 “AI 생성 기록”에서 누가 무엇을 편집했는지 확인할 수 있습니다.
      </div>

      {!anyPaid && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          현재 편집 기능은 <b>전부 무료</b>입니다. 과금하려면 금액을 넣고 저장하세요.
        </div>
      )}
      {msg && <div className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">{msg}</div>}
    </Panel>
  )
}
