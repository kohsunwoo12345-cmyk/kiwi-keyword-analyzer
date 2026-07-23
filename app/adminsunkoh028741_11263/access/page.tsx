'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Lock, LockOpen, Plus, Trash2, MonitorSmartphone, Globe, RefreshCw, Loader2, AlertTriangle, Check } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { adminAccessLockGet, adminAccessLockAction, type AdminAccessLock } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'
const kst = (iso?: string) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

export default function AdminAccessPage() {
  const [data, setData] = useState<AdminAccessLock | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [ipInput, setIpInput] = useState('')
  const [ipLabel, setIpLabel] = useState('')
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)

  function flash(msg: string, kind: 'ok' | 'err' = 'ok') { setToast({ msg, kind }); setTimeout(() => setToast(null), 3600) }
  function load() { setLoading(true); adminAccessLockGet().then((d) => { setData(d); setLoading(false) }) }
  useEffect(() => { load() }, [])

  async function act(payload: Parameters<typeof adminAccessLockAction>[0], key: string) {
    setBusy(key)
    const r = await adminAccessLockAction(payload)
    setBusy(null)
    if (r.ok) { load(); return true }
    flash(r.error || '처리 중 오류가 발생했습니다.', 'err'); return false
  }

  async function toggleLock() {
    if (!data) return
    if (data.enabled) {
      if (!confirm('관리자 접근 잠금을 해제할까요?\n해제하면 모든 IP/기기에서 관리자 콘솔에 접근할 수 있게 됩니다.')) return
      if (await act({ action: 'disable' }, 'toggle')) flash('접근 잠금을 해제했습니다.')
    } else {
      if (!confirm('관리자 접근 잠금을 활성화할까요?\n\n지금 이 순간부터 허용된 IP 또는 등록된 기기가 아니면 관리자 콘솔 접근이 차단됩니다.\n(잠금 방지를 위해 현재 IP와 이 기기가 자동으로 허용목록에 추가됩니다.)')) return
      if (await act({ action: 'enable' }, 'toggle')) flash('접근 잠금을 활성화했습니다. 이제부터 허용된 IP/기기만 접근할 수 있습니다.')
    }
  }

  async function addIp() {
    const ip = ipInput.trim()
    if (!ip) return
    if (await act({ action: 'add_ip', ip, label: ipLabel.trim() }, 'addip')) { setIpInput(''); setIpLabel(''); flash('허용 IP를 추가했습니다.') }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ShieldCheck}
        eyebrow="ADMIN · 보안"
        title="관리자 접근 제한"
        desc="허용한 IP 주소 또는 등록한 기기에서만 관리자 콘솔에 접근할 수 있도록 잠급니다. 활성화해야 실제로 작동합니다."
        accent={ACCENT}
        action={
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-soft)] hover:bg-[var(--panel-2)] disabled:opacity-60">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침
          </button>
        }
      />

      <div className="space-y-5 p-6 lg:p-8">
        {loading || !data ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-[var(--text-dim)]"><Loader2 size={18} className="animate-spin" /> 불러오는 중…</div>
        ) : (
          <>
            {/* 상태 + 토글 */}
            <div className={cn('card relative overflow-hidden p-6', data.enabled ? 'ring-1 ring-emerald-500/40' : '')}>
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <span className={cn('grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl', data.enabled ? 'bg-emerald-500/15 text-emerald-500' : 'bg-[var(--panel-2)] text-[var(--text-dim)]')}>
                    {data.enabled ? <Lock size={26} /> : <LockOpen size={26} />}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">접근 잠금 {data.enabled ? '활성화됨' : '꺼짐'}</h3>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', data.enabled ? 'bg-emerald-500/15 text-emerald-600' : 'bg-[var(--panel-2)] text-[var(--text-dim)]')}>
                        {data.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {data.enabled
                        ? '허용된 IP 또는 등록된 기기에서만 관리자 콘솔에 접근할 수 있습니다.'
                        : '현재는 잠금이 꺼져 있어 모든 접근이 허용됩니다. 아래에서 허용 IP/기기를 등록한 뒤 활성화하세요.'}
                    </p>
                  </div>
                </div>
                <button onClick={toggleLock} disabled={busy === 'toggle'}
                  className={cn('inline-flex flex-shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-60',
                    data.enabled ? 'bg-rose-500 hover:bg-rose-600' : 'brand-gradient hover:brightness-105')}>
                  {busy === 'toggle' ? <Loader2 size={16} className="animate-spin" /> : data.enabled ? <LockOpen size={16} /> : <Lock size={16} />}
                  {data.enabled ? '잠금 해제' : '잠금 활성화'}
                </button>
              </div>
              {!data.enabled && !data.currentIpAllowed && !data.thisDeviceRegistered && (
                <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/12 px-3.5 py-2.5 text-xs text-amber-600">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>잠금을 활성화하면 <b>현재 IP({data.currentIp})와 이 기기</b>가 자동으로 허용목록에 추가되어 본인이 잠기는 것을 방지합니다. 여러 위치에서 접속한다면 미리 IP를 추가하거나 각 기기를 등록해 두세요.</span>
                </div>
              )}
            </div>

            {/* 현재 접속 정보 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Globe size={16} className="text-violet-600" /> 현재 접속 IP</div>
                  {data.currentIpAllowed
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600"><Check size={11} /> 허용됨</span>
                    : <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-dim)]">미등록</span>}
                </div>
                <p className="mt-2 font-mono text-lg font-bold">{data.currentIp || '알 수 없음'}</p>
                {!data.currentIpAllowed && (
                  <button onClick={() => act({ action: 'add_ip', ip: data.currentIp, label: '내 IP' }, 'addcur').then((ok) => ok && flash('현재 IP를 허용목록에 추가했습니다.'))}
                    disabled={busy === 'addcur'} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:bg-[var(--panel-2)] disabled:opacity-60">
                    <Plus size={13} /> 현재 IP 허용
                  </button>
                )}
              </div>
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold"><MonitorSmartphone size={16} className="text-violet-600" /> 이 기기</div>
                  {data.thisDeviceRegistered
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600"><Check size={11} /> 등록됨</span>
                    : <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-dim)]">미등록</span>}
                </div>
                <p className="mt-2 text-sm text-[var(--text-soft)]">이 기기(브라우저)에 안전한 토큰을 저장해 IP가 바뀌어도 접근을 허용합니다.</p>
                {!data.thisDeviceRegistered && (
                  <button onClick={() => act({ action: 'register_device', label: '내 기기' }, 'regdev').then((ok) => ok && flash('이 기기를 등록했습니다.'))}
                    disabled={busy === 'regdev'} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:bg-[var(--panel-2)] disabled:opacity-60">
                    <Plus size={13} /> 이 기기 등록
                  </button>
                )}
              </div>
            </div>

            {/* 허용 IP 목록 */}
            <Panel title={<span className="flex items-center gap-2"><Globe size={16} className="text-violet-600" /> 허용 IP <span className="text-xs font-normal text-[var(--text-dim)]">({data.ips.length})</span></span>}>
              <div className="mb-3 flex flex-wrap gap-2">
                <input value={ipInput} onChange={(e) => setIpInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addIp()} placeholder="예) 203.0.113.7"
                  className="w-44 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-violet-400" />
                <input value={ipLabel} onChange={(e) => setIpLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addIp()} placeholder="라벨(선택) 예) 사무실"
                  className="w-40 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-violet-400" />
                <button onClick={addIp} disabled={busy === 'addip' || !ipInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                  {busy === 'addip' ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} 추가
                </button>
              </div>
              {data.ips.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--text-dim)]">등록된 허용 IP가 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.ips.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3.5 py-2.5">
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-semibold">{i.value}</span>
                        {i.value === data.currentIp && <span className="ml-2 rounded bg-violet-500/12 px-1.5 py-0.5 text-[10px] font-bold text-violet-600">현재 IP</span>}
                        <span className="ml-2 text-xs text-[var(--text-dim)]">{i.label} · {kst(i.createdAt)}</span>
                      </div>
                      <button onClick={() => confirm(`허용 IP ${i.value} 를 삭제할까요?`) && act({ action: 'remove_ip', value: i.value }, 'rm' + i.id)}
                        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-[var(--text-dim)] hover:bg-rose-500/12 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* 등록 기기 목록 */}
            <Panel title={<span className="flex items-center gap-2"><MonitorSmartphone size={16} className="text-violet-600" /> 등록 기기 <span className="text-xs font-normal text-[var(--text-dim)]">({data.devices.length})</span></span>}>
              {data.devices.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--text-dim)]">등록된 기기가 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.devices.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3.5 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <MonitorSmartphone size={15} className="flex-shrink-0 text-[var(--text-dim)]" />
                        <span className="text-sm font-semibold">{d.label || '기기'}</span>
                        {d.isThis && <span className="rounded bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">이 기기</span>}
                        <span className="text-xs text-[var(--text-dim)]">{kst(d.createdAt)}</span>
                      </div>
                      <button onClick={() => confirm(`이 기기 등록을 해제할까요?${d.isThis ? '\n(지금 사용 중인 기기입니다. 해제 후 IP가 허용되지 않으면 접근이 차단될 수 있습니다.)' : ''}`) && act({ action: 'remove_device', value: d.id }, 'rmd' + d.id)}
                        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-[var(--text-dim)] hover:bg-rose-500/12 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>

      {toast && (
        <div className={cn('fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-fade-in',
          toast.kind === 'ok' ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600' : 'border-rose-500/30 bg-rose-500/12 text-rose-600')}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
