'use client'

import { useEffect, useState } from 'react'
import { Users2, Search, RefreshCw, Save, Layers } from 'lucide-react'
import { Panel, Button, Badge } from '@/components/ui'
import { adminUserMarkups, adminModelPricingAction, type UserMarkupRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

const num = (n: number) => (Math.round((n || 0) * 100) / 100).toLocaleString('ko-KR')

/** 회원별 원가율(전체 배수) 목록 — 모든 사용자의 배수를 한 표에서 조회·수정 */
export function UserMarkupList() {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<UserMarkupRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)

  function reload(query = q) {
    setLoading(true)
    adminUserMarkups(query).then((r) => {
      setUsers(r.users || [])
      const e: Record<string, string> = {}
      for (const u of r.users || []) e[u.id] = u.overall > 0 ? String(u.overall) : ''
      setEdits(e)
      setLoading(false)
    })
  }
  useEffect(() => { reload('') /* eslint-disable-next-line */ }, [])
  useEffect(() => { const t = setTimeout(() => reload(q), 300); return () => clearTimeout(t) /* eslint-disable-next-line */ }, [q])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t) }, [toast])

  async function save(u: UserMarkupRow) {
    const raw = (edits[u.id] || '').trim()
    setBusy(u.id)
    const r = raw === ''
      ? await adminModelPricingAction('reset_user_overall', { userId: u.id })
      : await adminModelPricingAction('set_user_overall', { userId: u.id, markup: Number(raw) })
    setBusy(null)
    if (r.ok) { setToast(`${u.name || u.email} 원가율 저장`); reload() } else setToast(r.error || '처리 실패')
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2"><Users2 size={16} className="text-violet-500" /> 회원별 원가율(배수) 목록</span>}
      action={<Button variant="outline" size="sm" onClick={() => reload()}><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침</Button>}
    >
      <p className="mb-3 text-sm text-[var(--text-soft)]">
        회원마다 적용 중인 <b>전체 배수(원가율)</b>를 한눈에 봅니다. 빈칸이면 <b>기본</b>(영상 ×3.0 · 이미지/Seedance 2.0 ×2.5). 값을 넣고 저장하면 그 회원의 모든 모델에 적용됩니다(원가 이하 ×1 미만 불가). 모델별 세부 조정은 위의 <b>특정 회원</b> 탭에서 하세요.
      </p>

      <div className="relative mb-3 max-w-xs">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·이메일 검색" className="w-full rounded-lg border border-[var(--border-soft)] bg-white py-2 pl-8 pr-3 text-sm" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
              <th className="px-2 py-2 font-medium">회원</th>
              <th className="px-2 py-2 font-medium">플랜</th>
              <th className="px-2 py-2 font-medium">보유 크레딧</th>
              <th className="px-2 py-2 font-medium">전체 배수(원가율)</th>
              <th className="px-2 py-2 font-medium">모델별 개별</th>
              <th className="px-2 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const val = edits[u.id] ?? ''
              return (
                <tr key={u.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                  <td className="px-2 py-2">
                    <div className="font-medium text-[var(--text)]">{u.name || '-'}</div>
                    <div className="text-xs text-[var(--text-soft)]">{u.email}</div>
                  </td>
                  <td className="px-2 py-2"><Badge className="border-slate-200 bg-slate-50 text-slate-600">{u.plan}</Badge></td>
                  <td className="px-2 py-2 font-semibold text-violet-600">{num(u.credits)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--text-dim)]">×</span>
                      <input
                        value={val}
                        onChange={(e) => setEdits((p) => ({ ...p, [u.id]: e.target.value.replace(/[^0-9.]/g, '') }))}
                        placeholder="기본"
                        className="w-16 rounded-lg border border-[var(--border-soft)] bg-white px-2 py-1.5 text-right text-sm"
                      />
                      {u.overall > 0 ? <span className="text-[10px] text-violet-500">지정</span> : <span className="text-[10px] text-[var(--text-dim)]">기본</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {u.overrides > 0
                      ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">{u.overrides}개 모델</Badge>
                      : <span className="text-xs text-[var(--text-dim)]">-</span>}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => save(u)}>
                      <Save size={13} /> 저장
                    </Button>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-[var(--text-dim)]">{loading ? '불러오는 중…' : '회원이 없습니다.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {users.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          <Layers size={12} /> 총 {users.length}명 · 우선순위: 회원×모델 &gt; 회원 전체 배수 &gt; 전역 모델 배수 &gt; 기본값
        </p>
      )}

      {toast && <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-violet-200 bg-violet-100 px-4 py-3 text-sm font-medium text-violet-700 shadow-lg">{toast}</div>}
    </Panel>
  )
}
