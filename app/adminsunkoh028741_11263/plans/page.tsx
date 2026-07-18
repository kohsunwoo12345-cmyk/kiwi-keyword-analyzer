'use client'

import { useEffect, useState } from 'react'
import { Tag, Save, RefreshCw, Megaphone, Video } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'
import { adminPlanConfig, adminPlanConfigSave, type PlanConfigData, type PlanTierCfg } from '@/lib/auth'
import { cn } from '@/lib/utils'

const TIERS = ['Plus', 'Pro', 'Max'] as const
const TRACKS: { key: 'marketer' | 'video'; label: string; icon: any; color: string }[] = [
  { key: 'marketer', label: '마케터 전용', icon: Megaphone, color: '#7c3aed' },
  { key: 'video', label: 'AI 영상 제작', icon: Video, color: '#db2777' },
]
const won = (n: number) => '₩' + Math.round(n || 0).toLocaleString('ko-KR')
const eff = (t: PlanTierCfg) => Math.round((Number(t.price) || 0) * (1 - Math.max(0, Math.min(100, Number(t.discount) || 0)) / 100))

export default function AdminPlansPage() {
  const [cfg, setCfg] = useState<PlanConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function load() {
    setLoading(true)
    adminPlanConfig().then((r) => { if (r.ok && r.config) setCfg(r.config); setLoading(false) })
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t) }, [toast])

  function upd(track: 'marketer' | 'video', tier: string, field: keyof PlanTierCfg, value: any) {
    setCfg((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      ;(next[track][tier] as any)[field] = value
      return next
    })
  }
  async function save() {
    if (!cfg) return
    setBusy(true)
    const r = await adminPlanConfigSave(cfg)
    setBusy(false)
    if (r.ok) { if (r.config) setCfg(r.config); setToast('요금제가 저장되었습니다. 요금제 페이지에 즉시 반영됩니다.') }
    else setToast(r.error || '저장 실패')
  }

  const inputCls = 'w-full rounded-lg border border-[var(--border-soft)] bg-white px-2.5 py-2 text-sm outline-none focus:border-violet-400'

  return (
    <div>
      <PageHeader icon={Tag} title="요금제 관리" description="플랜별 가격·할인율·제공 크레딧·최대 노드 수·서비스 항목을 수정합니다. 저장 시 요금제 페이지·홈·결제에 그대로 반영됩니다." />

      <div className="mb-4 flex items-center gap-2">
        <Button variant="soft" size="sm" onClick={load} disabled={loading}><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침</Button>
        <Button size="sm" onClick={save} disabled={busy || !cfg}><Save size={14} /> {busy ? '저장 중…' : '전체 저장'}</Button>
        <span className="ml-auto text-xs text-[var(--text-dim)]">할인율(%)을 넣으면 정가에 취소선, 실효가가 표시됩니다.</span>
      </div>

      {!cfg ? (
        <Panel><p className="py-16 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '설정을 불러오지 못했습니다.'}</p></Panel>
      ) : (
        <div className="space-y-6">
          {TRACKS.map((tr) => {
            const TIcon = tr.icon
            return (
              <Panel key={tr.key} title={<span className="flex items-center gap-2"><TIcon size={16} style={{ color: tr.color }} /> {tr.label}</span>}>
                <div className="grid gap-4 lg:grid-cols-3">
                  {TIERS.map((tier) => {
                    const t = cfg[tr.key][tier]
                    if (!t) return null
                    const e = eff(t)
                    return (
                      <div key={tier} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-base font-bold">{tier}</span>
                          <span className="text-right text-xs">
                            {t.discount > 0 && <span className="mr-1.5 text-[var(--text-dim)] line-through">{won(t.price)}</span>}
                            <b className="text-emerald-600">{won(e)}</b><span className="text-[var(--text-dim)]">/월</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="정가(원)"><input type="number" value={t.price} onChange={(ev) => upd(tr.key, tier, 'price', Number(ev.target.value))} className={inputCls} /></Field>
                          <Field label="할인율(%)"><input type="number" min={0} max={100} value={t.discount} onChange={(ev) => upd(tr.key, tier, 'discount', Number(ev.target.value))} className={inputCls} /></Field>
                          <Field label="지급 크레딧"><input type="number" min={0} value={t.credits} onChange={(ev) => upd(tr.key, tier, 'credits', Number(ev.target.value))} className={inputCls} /></Field>
                          <Field label="최대 노드(0=무제한)"><input type="number" min={0} value={t.maxNodes} onChange={(ev) => upd(tr.key, tier, 'maxNodes', Number(ev.target.value))} className={inputCls} /></Field>
                        </div>
                        <div className="mt-2.5">
                          <label className="mb-1 block text-[11px] text-[var(--text-dim)]">제공 서비스 항목 (한 줄에 하나)</label>
                          <textarea
                            value={(t.features || []).join('\n')}
                            onChange={(ev) => upd(tr.key, tier, 'features', ev.target.value.split('\n'))}
                            onBlur={(ev) => upd(tr.key, tier, 'features', ev.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                            rows={7}
                            className={cn(inputCls, 'resize-y font-mono text-xs leading-relaxed')}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>
            )
          })}

          <div className="flex justify-end">
            <Button onClick={save} disabled={busy}><Save size={15} /> {busy ? '저장 중…' : '전체 저장'}</Button>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-violet-200 bg-violet-100 px-4 py-3 text-sm font-medium text-violet-700 shadow-lg">{toast}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-[var(--text-dim)]">{label}</label>
      {children}
    </div>
  )
}
