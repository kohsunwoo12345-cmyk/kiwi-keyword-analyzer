'use client'

/* 화질 업스케일 요금 설정 — 제공사 비용이 0인 자체 기능이라 '원가×배수' 로 값이 정해지지 않는다.
   그래서 판매 요금을 직접 입력받는다. 여기서 정한 값이 전체 회원에게 적용되고,
   특정 회원만 다르게 받으려면 아래 모델별 배수 설정에서 그 회원의 배수를 조정하면 된다. */

import { useCallback, useEffect, useState } from 'react'
import { Sparkles, Save, Loader2, RotateCcw } from 'lucide-react'
import { Panel, Button } from '@/components/ui'
import { adminModelPricing, adminModelPricingAction } from '@/lib/auth'

const IMG = '화질 업스케일 (이미지 · 브라우저 초해상)'
const VID = '화질 업스케일 (영상 · 브라우저 초해상)'

export function UpscalePricing() {
  const [img, setImg] = useState('')
  const [vid, setVid] = useState('')
  const [creditKrw, setCreditKrw] = useState(50)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const r = await adminModelPricing()
    if (!r.ok) return
    setCreditKrw(Number(r.creditKrw) || 50)
    const f = (name: string) => {
      const m = (r.models || []).find((x) => x.model === name) as any
      return m?.selfFee != null ? String(m.selfFee) : ''
    }
    setImg(f(IMG)); setVid(f(VID))
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setBusy(true); setMsg('')
    const a = await adminModelPricingAction('set_self_fee', { model: IMG, fee: Number(img) || 0 })
    const b = await adminModelPricingAction('set_self_fee', { model: VID, fee: Number(vid) || 0 })
    setBusy(false)
    setMsg(a.ok && b.ok ? '저장했습니다. 지금부터 이 요금으로 차감됩니다.' : (a.error || b.error || '저장 실패'))
    load()
    // 아래 모델별 배수 표도 같은 값을 보여주므로 함께 새로고침시킨다(두 곳이 어긋나 보이지 않게)
    try { window.dispatchEvent(new Event('pricing-updated')) } catch { /* noop */ }
    setTimeout(() => setMsg(''), 4000)
  }
  const reset = async () => {
    setBusy(true)
    await adminModelPricingAction('reset_self_fee', { model: IMG })
    await adminModelPricingAction('reset_self_fee', { model: VID })
    setBusy(false); setMsg('기본값(이미지 100원 · 영상 30원)으로 되돌렸습니다.'); load()
    try { window.dispatchEvent(new Event('pricing-updated')) } catch { /* noop */ }
    setTimeout(() => setMsg(''), 4000)
  }

  const cr = (won: string) => {
    const n = Number(won) || 0
    return creditKrw > 0 ? Math.round((n / creditKrw) * 100) / 100 : 0
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-violet-500" /> 화질 업스케일 요금</span>}
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={reset}><RotateCcw size={13} /> 기본값</Button>
          <Button size="sm" disabled={busy} onClick={save}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} 저장</Button>
        </div>
      }
    >
      <p className="mb-4 text-sm leading-relaxed text-[var(--text-soft)]">
        고객 컴퓨터에서 처리해 <b>제공사 비용이 0원</b>인 기능입니다. 그래서 원가가 아니라
        <b> 받을 금액을 직접</b> 정합니다. 받는 금액 전부가 이익입니다.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FeeInput
          label="이미지 1장당" value={img} onChange={setImg} unit="원 / 장"
          hint={`고객 차감: ${cr(img)} 크레딧`}
          example="사진 1장 화질 개선 = 이 금액"
        />
        <FeeInput
          label="영상 1초당" value={vid} onChange={setVid} unit="원 / 초"
          hint={`10초 영상이면 ${Number(vid) * 10 || 0}원 · ${cr(String(Number(vid) * 10))} 크레딧`}
          example="영상은 길이에 비례해 받습니다"
        />
      </div>

      <div className="mt-4 rounded-xl bg-[var(--panel-2)] px-3.5 py-3 text-xs leading-relaxed text-[var(--text-dim)]">
        · 1크레딧 = {creditKrw.toLocaleString('ko-KR')}원 기준으로 환산됩니다 (회원마다 크레딧 단가가 다르면 그 단가로 계산).<br />
        · <b>여기서 정한 금액은 전체 회원에게 적용</b>됩니다.<br />
        · <b>특정 회원만 다르게</b> 받으려면 아래 “모델별 배수”에서 그 회원을 고르고 업스케일 배수를 조정하세요 (예: ×2 = 두 배).
      </div>

      {msg && <div className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">{msg}</div>}
    </Panel>
  )
}

function FeeInput({ label, value, onChange, unit, hint, example }: {
  label: string; value: string; onChange: (v: string) => void; unit: string; hint: string; example: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3.5">
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
          placeholder="0"
          className="w-28 rounded-lg border border-violet-300 bg-white px-3 py-2 text-right text-lg font-bold tabular-nums outline-none focus:border-violet-500"
        />
        <span className="text-sm text-[var(--text-dim)]">{unit}</span>
      </div>
      <div className="mt-2 text-xs font-medium text-violet-600">{hint}</div>
      <div className="mt-0.5 text-[11px] text-[var(--text-dim)]">{example}</div>
    </div>
  )
}
