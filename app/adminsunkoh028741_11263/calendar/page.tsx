'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Pencil } from 'lucide-react'
import { AdCalendar } from '@/components/admin/AdCalendar'

// ── 전개 캘린더 (넥스트바이전시 이식) — 여러 캘린더를 크롬식 탭으로 전환 ──
//  각 캘린더의 일정은 /api/ad-campaigns 에 advertiser_id="_cal_<id>" 버킷으로 저장된다.

type Cal = { id: string; name: string; color: string }

export default function CalendarPage() {
  const [cals, setCals] = useState<Cal[]>([])
  const [curId, setCurId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')

  const showToast = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2400) }, [])

  const load = useCallback(async (keepId?: string | null) => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/ad-calendars', { credentials: 'include', cache: 'no-store' })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`)
      const arr: Cal[] = d.calendars || []
      setCals(arr)
      setCurId((prev) => {
        const want = keepId ?? prev
        return arr.some((c) => c.id === want) ? want! : (arr.length ? arr[0].id : null)
      })
    } catch (e: any) { setErr(e.message || '불러오기 실패'); setCals([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function createCal() {
    const name = (window.prompt('새 캘린더 이름을 입력하세요', '전개 캘린더 ' + (cals.length + 1)) || '').trim()
    if (!name) return
    try {
      const r = await fetch('/api/ad-calendars', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`)
      showToast('캘린더 생성 완료'); load(d.id)
    } catch (e: any) { showToast('생성 실패: ' + e.message) }
  }
  async function renameCal() {
    if (!curId) { showToast('선택된 캘린더가 없습니다'); return }
    const c = cals.find((x) => x.id === curId)
    const name = (window.prompt('캘린더 이름 변경', (c && c.name) || '') || '').trim()
    if (!name) return
    try {
      const r = await fetch('/api/ad-calendars', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: curId, name }) })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`)
      showToast('이름 변경 완료'); load(curId)
    } catch (e: any) { showToast('변경 실패: ' + e.message) }
  }
  async function deleteCal(id: string) {
    const c = cals.find((x) => x.id === id)
    if (!confirm(`"${(c && c.name) || '캘린더'}" 캘린더를 삭제할까요?\n이 캘린더의 모든 일정도 함께 삭제됩니다.`)) return
    try {
      const r = await fetch('/api/ad-calendars?id=' + encodeURIComponent(id), { method: 'DELETE', credentials: 'include' })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`)
      showToast('삭제되었습니다'); load(curId === id ? null : curId)
    } catch (e: any) { showToast('삭제 실패: ' + e.message) }
  }

  const cur = cals.find((c) => c.id === curId) || null

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">전개 캘린더</h1>
        <p className="mt-1 text-sm text-slate-500">광고 전개·무료 강의 등 전체 마케팅 일정과 성과를 캘린더별로 관리합니다 · 한국시간(KST)</p>
      </div>

      {/* 크롬식 탭바 */}
      <div className="mb-4 flex items-end gap-1 overflow-x-auto border-b-2 border-slate-200 px-0.5">
        {cals.map((c) => {
          const act = c.id === curId
          return (
            <div key={c.id} onClick={() => setCurId(c.id)}
              className={`group -mb-0.5 flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-t-xl border border-b-0 px-3.5 py-2 text-sm font-semibold transition ${act ? 'border-slate-200 bg-white text-slate-900 shadow-[0_-2px_6px_rgba(0,0,0,0.03)]' : 'border-transparent bg-slate-100/70 text-slate-500 hover:bg-slate-100'}`}>
              {c.color && <i className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
              <span className="max-w-[180px] truncate">{c.name || '캘린더'}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteCal(c.id) }} title="캘린더 삭제"
                className="ml-0.5 rounded p-0.5 text-slate-400 opacity-60 hover:bg-slate-200 hover:text-red-500 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
            </div>
          )
        })}
        <button onClick={createCal} title="새 캘린더 만들기"
          className="-mb-0.5 flex items-center gap-1 whitespace-nowrap rounded-t-xl px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
          <Plus className="h-4 w-4" />새 캘린더
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400">불러오는 중...</div>
        ) : err ? (
          <div className="py-14 text-center text-red-500">불러오기 실패: {err}</div>
        ) : !cur ? (
          <div className="py-16 text-center text-sm text-slate-400">캘린더가 없습니다. “＋ 새 캘린더”로 만들어 보세요.</div>
        ) : (
          <>
            <div className="mb-2 flex justify-end">
              <button onClick={renameCal} title="캘린더 이름 변경" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"><Pencil className="h-3 w-3" />이름 변경</button>
            </div>
            <AdCalendar key={cur.id} bucketId={'_cal_' + cur.id} title={cur.name} subtitle="광고 전개 · 무료 강의 등 전체 일정 · 한국시간(KST)" onToast={showToast} shareKind="general" />
          </>
        )}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-[2000] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </div>
  )
}
