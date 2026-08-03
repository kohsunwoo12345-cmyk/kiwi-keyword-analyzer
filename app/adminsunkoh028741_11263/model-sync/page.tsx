'use client'

/* 관리자 — 모델 등록부
   제공사가 새 모델을 내놓으면 여기서 [새 모델 찾기] → [확인] → [노드에 추가] 하면
   배포 없이 스튜디오 노드 목록에 나타난다.
   ⚠ 확인을 통과하지 못한 모델은 등록되지 않는다. 서버가 저장 직전에 한 번 더 확인한다 —
     화면 값만 믿으면 "고를 수는 있는데 누르면 404" 인 모델이 회원에게 나간다.
   ⚠ 확인은 필수 항목을 비운 채 물어보는 방식이라 작업이 안 만들어진다 = 무과금. */

import { useCallback, useEffect, useState } from 'react'
import { Boxes, RefreshCw, Search, CheckCircle2, XCircle, Plus, Trash2, Power } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'

const ACCENT = '#0ea5e9'

//  확인(무과금)이 가능한 제공사만 고를 수 있게 한다 — 확인 못 하면 등록도 안 된다.
const PROVIDERS = [
  { v: 'seedance', label: '씨댄스 · 영상 (BytePlus)' },
  { v: 'seedream', label: '씨드림 · 이미지 (BytePlus)' },
  { v: 'kling', label: 'Kling · 영상' },
  { v: 'runway', label: 'Runway · 영상' },
  { v: 'openai', label: 'OpenAI · 이미지' },
  { v: 'flux', label: 'Flux(BFL) · 이미지' },
  { v: 'ark3d', label: '3D (BytePlus)' },
]
const CATS = ['영상', '영상 · Kling', '영상 → 영상 (V2V·실사화)', '이미지', '이미지 (텍스트·편집)', '이미지 (레퍼런스 편집·I2I)']

type Row = {
  name: string; cat: string; provider: string; modelId: string
  kind: string; unit: string; usd: number; opts: any; enabled: number
  verifiedAt?: string | null; note?: string | null
}

export default function ModelSyncPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const [disc, setDisc] = useState<any>(null)
  const [discLoading, setDiscLoading] = useState(false)

  // 새로 넣을 모델
  const [f, setF] = useState({
    name: '', cat: '영상', provider: 'seedance', modelId: '',
    kind: 'video', unit: 'sec', usd: '', secs: '5,10', ratios: '16:9,9:16,1:1', res: '720p,1080p',
  })
  const [ver, setVer] = useState<any>(null)
  const [verLoading, setVerLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/model-registry', { credentials: 'include', cache: 'no-store' })
      const j = await r.json()
      setRows(j?.models || [])
      if (j?.error) setMsg(j.error)
    } catch (e: any) { setMsg(String(e?.message || e)) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const discover = useCallback(async () => {
    setDiscLoading(true); setDisc(null)
    try {
      const r = await fetch('/api/generate?diag=model-discover', { credentials: 'include', cache: 'no-store' })
      setDisc(await r.json())
    } catch (e: any) { setDisc({ error: String(e?.message || e) }) }
    setDiscLoading(false)
  }, [])

  const verify = useCallback(async () => {
    if (!f.provider || !f.modelId.trim()) return alert('제공사와 모델 ID 를 넣어 주세요.')
    setVerLoading(true); setVer(null)
    try {
      const r = await fetch(`/api/generate?diag=model-verify&provider=${encodeURIComponent(f.provider)}&id=${encodeURIComponent(f.modelId.trim())}`,
        { credentials: 'include', cache: 'no-store' })
      setVer(await r.json())
    } catch (e: any) { setVer({ ok: false, error: String(e?.message || e) }) }
    setVerLoading(false)
  }, [f.provider, f.modelId])

  const save = useCallback(async () => {
    if (!f.name.trim()) return alert('노드에 보일 표시명을 넣어 주세요.')
    if (!f.usd.trim()) return alert('단가를 넣어 주세요 — 없으면 회원에게 요금을 못 매깁니다.')
    setSaving(true); setMsg('')
    const num = (s: string) => s.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x))
    const str = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)
    try {
      const r = await fetch('/api/admin/model-registry', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name.trim(), cat: f.cat, provider: f.provider, modelId: f.modelId.trim(),
          kind: f.kind, unit: f.unit, usd: Number(f.usd),
          opts: { secs: num(f.secs), ratios: str(f.ratios), res: str(f.res), neg: true },
        }),
      })
      const j = await r.json()
      if (j?.error) { setMsg(j.error + (j['확인결과']?.message ? ` — ${j['확인결과'].message}` : '')) }
      else { setMsg(`등록했습니다 — 노드 목록에 "${f.name}" 이 나타납니다(스튜디오 새로고침).`); setVer(null); load() }
    } catch (e: any) { setMsg(String(e?.message || e)) }
    setSaving(false)
  }, [f, load])

  const toggle = useCallback(async (name: string, on: boolean) => {
    await fetch('/api/admin/model-registry', {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, enabled: on }),
    })
    load()
  }, [load])

  const del = useCallback(async (name: string) => {
    if (!confirm(`"${name}" 을 등록부에서 지웁니다. 노드 목록에서도 사라집니다. 진행할까요?`)) return
    await fetch(`/api/admin/model-registry?name=${encodeURIComponent(name)}`, { method: 'DELETE', credentials: 'include' })
    load()
  }, [load])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Boxes} eyebrow="ADMIN" title="모델 등록부"
        desc="제공사가 새 모델을 내놓으면 여기서 확인하고 등록하면 배포 없이 노드 목록에 나타납니다. 확인을 통과하지 못한 모델은 등록되지 않습니다(무과금 확인)."
        accent={ACCENT}
        action={
          <div className="flex gap-2">
            <Button variant="soft" size="sm" onClick={load} disabled={loading}><RefreshCw size={14} /> 새로고침</Button>
            <Button size="sm" onClick={discover} disabled={discLoading}><Search size={14} /> {discLoading ? '찾는 중…' : '새 모델 찾기'}</Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {msg && <div className="card-2 p-3 text-sm">{msg}</div>}

        {/* 새 모델 찾기 결과 */}
        {disc && (
          <Panel title="새 모델 찾기 (무과금)">
            <div className="space-y-3 p-4 text-sm">
              {disc.error ? <p className="text-rose-600">{String(disc.error)}</p> : (
                <>
                  <p className="text-[var(--text-soft)]">{disc['해석']}</p>
                  <p className="text-xs text-[var(--text-dim)]">
                    자동으로 찾을 수 있는 곳: <b>{(disc['제공사목록을주는곳'] || []).join(', ') || '없음'}</b><br />
                    목록을 안 주는 곳: {(disc['목록을안주는곳'] || []).join(', ')} — 공식 문서에서 모델 ID 를 보고 아래에 직접 넣은 뒤 [확인] 하세요.
                  </p>
                  {(disc['새로보이는모델'] || []).length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead><tr className="text-left text-xs text-[var(--text-dim)]"><th className="pb-2">모델 ID</th><th className="pb-2">추정 제공사</th><th className="pb-2" /></tr></thead>
                        <tbody>
                          {(disc['새로보이는모델'] || []).map((x: any) => (
                            <tr key={x.id} className="border-t border-[var(--border)]">
                              <td className="py-2 pr-3 font-mono text-[11px]">{x.id}</td>
                              <td className="py-2 pr-3">{x['추정제공사']}</td>
                              <td className="py-2">
                                <Button variant="soft" size="sm"
                                  onClick={() => { setF((s) => ({ ...s, modelId: x.id, provider: x['추정제공사'], name: s.name || x.id })); setVer(null) }}>
                                  아래에 넣기
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>
        )}

        {/* 등록 폼 */}
        <Panel title="모델 추가 — 확인한 것만 등록됩니다">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="노드에 보일 이름"><input className="inp" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="예: Kling 2.6 (이미지→영상)" /></Field>
            <Field label="제공사 모델 ID"><input className="inp font-mono text-xs" value={f.modelId} onChange={(e) => { setF({ ...f, modelId: e.target.value }); setVer(null) }} placeholder="예: kling-v2-6" /></Field>
            <Field label="제공사"><select className="inp" value={f.provider} onChange={(e) => { setF({ ...f, provider: e.target.value }); setVer(null) }}>{PROVIDERS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}</select></Field>
            <Field label="노드 분류"><select className="inp" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="종류"><select className="inp" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, unit: e.target.value === 'image' ? 'img' : 'sec' })}><option value="video">영상</option><option value="image">이미지</option><option value="3d">3D</option></select></Field>
            <Field label={`단가(달러 / ${f.unit === 'img' ? '장' : '초'})`}><input className="inp" value={f.usd} onChange={(e) => setF({ ...f, usd: e.target.value })} placeholder="예: 0.11" /></Field>
            <Field label="허용 길이(초) — 쉼표"><input className="inp" value={f.secs} onChange={(e) => setF({ ...f, secs: e.target.value })} /></Field>
            <Field label="허용 비율 — 쉼표"><input className="inp" value={f.ratios} onChange={(e) => setF({ ...f, ratios: e.target.value })} /></Field>
            <Field label="허용 해상도 — 쉼표"><input className="inp" value={f.res} onChange={(e) => setF({ ...f, res: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] p-4">
            <Button variant="soft" size="sm" onClick={verify} disabled={verLoading}>
              <Search size={14} /> {verLoading ? '확인 중…' : '① 이 모델이 실제로 있는지 확인 (무과금)'}
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !ver?.ok}>
              <Plus size={14} /> {saving ? '등록 중…' : '② 노드에 추가'}
            </Button>
            {ver && (
              <Badge className={ver.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>
                {ver.ok ? '확인됨 — 이 계정에서 부를 수 있습니다' : '확인 실패 — 등록할 수 없습니다'}
              </Badge>
            )}
          </div>
          {ver && (
            <p className="border-t border-[var(--border)] p-4 text-xs leading-relaxed text-[var(--text-dim)]">
              <b>확인 방법</b>: {ver['확인방법'] || '—'} · HTTP {ver.status ?? '-'} {ver.code ? `· ${ver.code}` : ''}<br />
              <span className="break-words">{ver.message || ver.error || ''}</span>
            </p>
          )}
          <p className="border-t border-[var(--border)] p-4 text-xs leading-relaxed text-[var(--text-dim)]">
            · <b>확인을 통과해야만</b> [노드에 추가] 가 눌립니다. 서버도 저장 직전에 한 번 더 확인합니다.<br />
            · 확인은 필수 항목을 비운 채 물어보는 방식이라 <b>작업이 만들어지지 않습니다 = 비용 없음</b>.<br />
            · 등록하면 스튜디오를 새로고침한 회원부터 노드 목록에 보입니다. <b>배포가 필요 없습니다.</b><br />
            · 단가는 회원 청구의 근거입니다. 공개 단가를 모르면 <b>비슷한 등급보다 높게</b> 잡으세요 — 낮게 잡으면 우리가 손해입니다.
          </p>
        </Panel>

        {/* 등록된 목록 */}
        <Panel title={`등록된 모델 ${rows.length}개`}>
          {loading ? <p className="p-4 text-sm text-[var(--text-dim)]">불러오는 중…</p>
            : rows.length === 0 ? <p className="p-4 text-sm text-[var(--text-dim)]">아직 없습니다. 코드에 박힌 기본 모델들은 그대로 동작합니다.</p>
              : (
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead><tr className="text-left text-xs text-[var(--text-dim)]">
                      <th className="pb-2">이름</th><th className="pb-2">분류</th><th className="pb-2">제공사</th>
                      <th className="pb-2">모델 ID</th><th className="pb-2">단가</th><th className="pb-2">확인</th><th className="pb-2" />
                    </tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.name} className="border-t border-[var(--border)]">
                          <td className="py-2 pr-3 font-medium">{r.name}</td>
                          <td className="py-2 pr-3 text-[var(--text-dim)]">{r.cat}</td>
                          <td className="py-2 pr-3">{r.provider}</td>
                          <td className="py-2 pr-3 font-mono text-[11px] text-[var(--text-dim)]">{r.modelId}</td>
                          <td className="py-2 pr-3">${r.usd}/{r.unit === 'img' ? '장' : '초'}</td>
                          <td className="py-2 pr-3 text-[11px] text-[var(--text-dim)]">
                            {r.verifiedAt ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} />{String(r.verifiedAt).slice(0, 10)}</span>
                              : <span className="inline-flex items-center gap-1 text-rose-600"><XCircle size={12} />없음</span>}
                          </td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              <Button variant="soft" size="sm" onClick={() => toggle(r.name, !r.enabled)}>
                                <Power size={13} /> {r.enabled ? '끄기' : '켜기'}
                              </Button>
                              <Button variant="soft" size="sm" onClick={() => del(r.name)}><Trash2 size={13} /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </Panel>
      </div>

      <style jsx>{`
        .inp { width: 100%; border: 1px solid var(--border); background: var(--panel-2);
               border-radius: 10px; padding: 8px 10px; font-size: 13px; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--text-dim)]">{label}</span>
      {children}
    </label>
  )
}
