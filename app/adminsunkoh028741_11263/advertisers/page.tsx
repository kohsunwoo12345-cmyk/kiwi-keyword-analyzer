'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Users, CheckCircle2, Plus, Search, Download, CalendarDays, Pencil, Trash2,
  ExternalLink, X, Share2, ChevronLeft, ChevronRight, Link2, TrendingUp, Receipt, Trophy,
} from 'lucide-react'

// ── 광고주 관리 (넥스트바이전시 관리자 대시보드 이식 · DB는 우리 웹에서 동작) ──

type Advertiser = {
  id: string; reg_date: string; company_name: string; place_url: string; industry: string
  product: string; price: string; source: string; contact: string; memo: string; status: string
}
type AdEvent = {
  id: string; advertiser_id: string; title: string; type: string; color: string
  start_date: string; end_date: string; memo: string; result: string; ad_result: string; cost_result: string; link: string
}

const TYPE_META: Record<string, [string, string]> = {
  plan: ['기획', '#7c3aed'], production: ['제작', '#2563eb'], run: ['집행', '#16a34a'],
  result: ['성과', '#d97706'], lecture: ['무료 강의', '#db2777'], etc: ['기타', '#475569'],
}
const TYPE_ORDER = ['plan', 'production', 'run', 'result', 'lecture', 'etc']
const SWATCHES = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']
const STATUS_META: Record<string, [string, string]> = {
  active: ['진행중', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  paused: ['보류', 'bg-amber-50 text-amber-700 border-amber-200'],
  ended: ['종료', 'bg-slate-100 text-slate-500 border-slate-200'],
}

function kstYmd(): string {
  try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }) } catch {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}
function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function safeUrl(u: string): string { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : '' }
function colorOf(e: AdEvent): string { return e.color || (TYPE_META[e.type] || TYPE_META.etc)[1] }
function labelOf(e: AdEvent): string { return (TYPE_META[e.type] || TYPE_META.etc)[0] }
function inRange(day: string, e: AdEvent): boolean { const s = (e.start_date || '').slice(0, 10), en = (e.end_date || e.start_date || '').slice(0, 10); return day >= s && day <= en }

const EMPTY_ADV: Partial<Advertiser> = { reg_date: '', company_name: '', place_url: '', industry: '', product: '', price: '', source: '', contact: '', status: 'active', memo: '' }
const EMPTY_EV = { id: '', title: '', type: 'run', color: '', start_date: '', end_date: '', memo: '', link: '', result: '', ad_result: '', cost_result: '' }

export default function AdvertisersPage() {
  const [list, setList] = useState<Advertiser[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')

  // 광고주 등록/수정 모달
  const [advOpen, setAdvOpen] = useState(false)
  const [advForm, setAdvForm] = useState<Partial<Advertiser>>(EMPTY_ADV)

  // 캘린더 모달
  const [calAdv, setCalAdv] = useState<Advertiser | { id: '_general'; company_name: string } | null>(null)
  const [events, setEvents] = useState<AdEvent[]>([])
  const [curMonth, setCurMonth] = useState(() => { const p = kstYmd().split('-'); return new Date(+p[0], +p[1] - 1, 1) })
  const [dayModal, setDayModal] = useState<string | null>(null)

  // 이벤트 폼 모달
  const [evOpen, setEvOpen] = useState(false)
  const [evForm, setEvForm] = useState({ ...EMPTY_EV })

  const showToast = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2400) }, [])

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/advertisers', { credentials: 'include', cache: 'no-store' })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setList(d.advertisers || [])
    } catch (e: any) { setErr(e.message || '불러오기 실패') } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const total = list.length
    const active = list.filter((a) => (a.status || 'active') === 'active').length
    const ym = new Date().toISOString().slice(0, 7)
    const month = list.filter((a) => String(a.reg_date || '').slice(0, 7) === ym).length
    return { total, active, month }
  }, [list])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => (`${a.company_name || ''}${a.industry || ''}${a.place_url || ''}${a.product || ''}`).toLowerCase().includes(q))
  }, [list, query])

  // ── 광고주 CRUD ──
  function openAdd() { setAdvForm({ ...EMPTY_ADV, reg_date: kstYmd() }); setAdvOpen(true) }
  function openEdit(a: Advertiser) { setAdvForm({ ...a, reg_date: String(a.reg_date || '').slice(0, 10) }); setAdvOpen(true) }
  async function saveAdv() {
    const f = advForm
    if (!f.company_name || !f.company_name.trim()) { showToast('업체 이름을 입력하세요'); return }
    const isEdit = !!f.id
    try {
      const r = await fetch('/api/advertisers', {
        method: isEdit ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
      })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`)
      showToast(isEdit ? '광고주 수정 완료' : '광고주 등록 완료'); setAdvOpen(false); load()
    } catch (e: any) { showToast('저장 실패: ' + e.message) }
  }
  async function delAdv(a: Advertiser) {
    if (!confirm(`"${a.company_name || '광고주'}" 를 삭제할까요?\n연결된 캘린더 일정도 함께 삭제됩니다.`)) return
    try {
      const r = await fetch('/api/advertisers?id=' + encodeURIComponent(a.id), { method: 'DELETE', credentials: 'include' })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || '')
      showToast('삭제 완료'); load()
    } catch (e: any) { showToast('삭제 실패: ' + e.message) }
  }
  function exportExcel() {
    if (!list.length) { showToast('내보낼 데이터가 없습니다'); return }
    const headers = ['등록일', '업체명', '업종', '상품', '가격', '유입경로', '연락처', '플레이스URL', '상태', '메모']
    const rows = list.map((a) => [String(a.reg_date || '').slice(0, 10), a.company_name, a.industry, a.product, a.price, a.source, a.contact, a.place_url, a.status, a.memo]
      .map((v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(','))
    const csv = '﻿' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }), el = document.createElement('a')
    el.href = URL.createObjectURL(blob); el.download = '광고주목록_' + kstYmd() + '.csv'
    document.body.appendChild(el); el.click(); el.remove(); URL.revokeObjectURL(el.href)
    showToast('엑셀 다운로드 완료 — ' + list.length + '건')
  }

  // ── 캘린더 ──
  const calId = calAdv ? calAdv.id : ''
  const loadEvents = useCallback(async (aid: string) => {
    try {
      const r = await fetch('/api/ad-campaigns?advertiser_id=' + encodeURIComponent(aid), { credentials: 'include', cache: 'no-store' })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setEvents(d.events || [])
    } catch (e: any) { setEvents([]); showToast('일정 불러오기 실패: ' + e.message) }
  }, [showToast])
  function openCalendar(a: Advertiser) { setCalAdv(a); setCurMonth(() => { const p = kstYmd().split('-'); return new Date(+p[0], +p[1] - 1, 1) }); loadEvents(a.id) }
  function openGeneralCalendar() { setCalAdv({ id: '_general', company_name: '마케팅 전개 캘린더' }); setCurMonth(() => { const p = kstYmd().split('-'); return new Date(+p[0], +p[1] - 1, 1) }); loadEvents('_general') }
  function closeCalendar() { setCalAdv(null); setEvents([]); setDayModal(null) }
  function moveMonth(n: number) { setCurMonth((d) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x }) }
  function todayMonth() { const p = kstYmd().split('-'); setCurMonth(new Date(+p[0], +p[1] - 1, 1)) }

  function newEventAt(ds: string) { setEvForm({ ...EMPTY_EV, start_date: ds, end_date: ds, type: 'run', color: '' }); setEvOpen(true) }
  function editEvent(e: AdEvent) { setEvForm({ id: e.id, title: e.title || '', type: e.type || 'run', color: e.color || '', start_date: (e.start_date || '').slice(0, 10), end_date: (e.end_date || e.start_date || '').slice(0, 10), memo: e.memo || '', link: e.link || '', result: e.result || '', ad_result: e.ad_result || '', cost_result: e.cost_result || '' }); setEvOpen(true) }
  async function saveEvent() {
    const f = evForm
    if (!f.title.trim()) { showToast('제목을 입력하세요'); return }
    if (!f.start_date) { showToast('시작일을 선택하세요'); return }
    const end = f.end_date || f.start_date
    if (end < f.start_date) { showToast('종료일이 시작일보다 빠릅니다'); return }
    const body = { ...f, advertiser_id: calId, end_date: end }
    try {
      const r = await fetch('/api/ad-campaigns', { method: f.id ? 'PUT' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`)
      showToast(f.id ? '일정 수정 완료' : '일정 등록 완료'); setEvOpen(false); loadEvents(calId)
    } catch (e: any) { showToast('저장 실패: ' + e.message) }
  }
  async function deleteEvent() {
    if (!evForm.id) return
    if (!confirm('이 일정을 삭제할까요?')) return
    try {
      const r = await fetch('/api/ad-campaigns?id=' + encodeURIComponent(evForm.id), { method: 'DELETE', credentials: 'include' })
      const d = await r.json(); if (!d.ok) throw new Error(d.error || '')
      showToast('삭제되었습니다'); setEvOpen(false); loadEvents(calId)
    } catch (e: any) { showToast('삭제 실패: ' + e.message) }
  }
  async function share() {
    if (!calId) return
    try {
      const r = await fetch('/api/ad-campaigns?share=' + encodeURIComponent(calId), { credentials: 'include' })
      const d = await r.json(); if (!d.ok || !d.url) throw new Error(d.error || `HTTP ${r.status}`)
      try { await navigator.clipboard.writeText(d.url) } catch {}
      window.prompt(calId === '_general' ? '전개 캘린더 공유 링크 (복사됨):' : '광고주에게 공유할 캘린더 링크 (복사됨):', d.url)
      showToast('공유 링크가 복사되었습니다')
    } catch (e: any) { showToast('공유 링크 생성 실패: ' + e.message) }
  }

  // 달력 셀 42개
  const cells = useMemo(() => {
    const y = curMonth.getFullYear(), m = curMonth.getMonth()
    const first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - first.getDay())
    const today = kstYmd()
    const arr: { ds: string; day: number; out: boolean; today: boolean; evs: AdEvent[] }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i)
      const ds = ymd(d)
      arr.push({ ds, day: d.getDate(), out: d.getMonth() !== m, today: ds === today, evs: events.filter((e) => inRange(ds, e)) })
    }
    return arr
  }, [curMonth, events])
  const sortedEvents = useMemo(() => events.slice().sort((a, b) => (a.start_date || '').localeCompare(b.start_date || '')), [events])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* 헤더 */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">광고주 관리</h1>
          <p className="mt-1 text-sm text-slate-500">등록 광고주 현황과 계약 정보를 관리합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="업체명·업종·URL 검색"
              className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <button onClick={openGeneralCalendar} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <CalendarDays className="h-4 w-4 text-indigo-500" />전개 캘린더
          </button>
          <button onClick={exportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
            <Download className="h-4 w-4" />엑셀
          </button>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4" />광고주 등록
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard icon={<Users className="h-5 w-5" />} tone="blue" num={stats.total} label="총 광고주" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} tone="green" num={stats.active} label="진행중" />
        <StatCard icon={<Plus className="h-5 w-5" />} tone="amber" num={stats.month} label="이번 달 신규" />
      </div>

      {/* 목록 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-700">광고주 목록</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold text-slate-500">
                <th className="whitespace-nowrap px-4 py-3">등록일</th><th className="px-4 py-3">업체명</th>
                <th className="px-4 py-3">업종</th><th className="px-4 py-3">상품</th>
                <th className="whitespace-nowrap px-4 py-3">가격</th><th className="px-4 py-3">유입경로</th>
                <th className="px-4 py-3 text-center">플레이스</th><th className="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-400">불러오는 중...</td></tr>
              ) : err ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-red-500">불러오기 실패: {err}</td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-400">{query ? '검색 결과가 없습니다' : '등록된 광고주가 없습니다'}</td></tr>
              ) : filtered.map((a) => {
                const st = STATUS_META[a.status || 'active'] || STATUS_META.active
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{String(a.reg_date || '').slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{a.company_name}</span>
                      <span className={`ml-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st[1]}`}>{st[0]}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.industry}</td>
                    <td className="px-4 py-3 text-slate-600">{a.product}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{a.price}</td>
                    <td className="px-4 py-3 text-slate-600">{a.source}</td>
                    <td className="px-4 py-3 text-center">
                      {a.place_url ? <a href={a.place_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">열기 <ExternalLink className="h-3 w-3" /></a> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openCalendar(a)} title="광고 집행 캘린더" className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"><CalendarDays className="h-3.5 w-3.5" />캘린더</button>
                        <button onClick={() => openEdit(a)} className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => delAdv(a)} className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 광고주 등록/수정 모달 */}
      {advOpen && (
        <Modal onClose={() => setAdvOpen(false)} title={advForm.id ? '광고주 수정' : '광고주 등록'} maxW="max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <Field label="등록 날짜"><input type="date" value={advForm.reg_date || ''} onChange={(e) => setAdvForm((f) => ({ ...f, reg_date: e.target.value }))} className={inputCls} /></Field>
            <Field label="업체 이름 *"><input value={advForm.company_name || ''} onChange={(e) => setAdvForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="예: OO치과" className={inputCls} /></Field>
          </div>
          <Field label="네이버 플레이스 URL"><input type="url" value={advForm.place_url || ''} onChange={(e) => setAdvForm((f) => ({ ...f, place_url: e.target.value }))} placeholder="https://map.naver.com/..." className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="업종"><input value={advForm.industry || ''} onChange={(e) => setAdvForm((f) => ({ ...f, industry: e.target.value }))} placeholder="예: 병원 / 요식업" className={inputCls} /></Field>
            <Field label="광고주 상품"><input value={advForm.product || ''} onChange={(e) => setAdvForm((f) => ({ ...f, product: e.target.value }))} placeholder="예: 플레이스 상위노출 3개월" className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="가격"><input value={advForm.price || ''} onChange={(e) => setAdvForm((f) => ({ ...f, price: e.target.value }))} placeholder="예: 990,000원 / 월" className={inputCls} /></Field>
            <Field label="유입 경로"><input value={advForm.source || ''} onChange={(e) => setAdvForm((f) => ({ ...f, source: e.target.value }))} placeholder="예: 지인소개 / 검색" className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="연락처"><input value={advForm.contact || ''} onChange={(e) => setAdvForm((f) => ({ ...f, contact: e.target.value }))} placeholder="담당자·연락처" className={inputCls} /></Field>
            <Field label="상태">
              <select value={advForm.status || 'active'} onChange={(e) => setAdvForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                <option value="active">진행중</option><option value="paused">보류</option><option value="ended">종료</option>
              </select>
            </Field>
          </div>
          <Field label="메모"><textarea rows={2} value={advForm.memo || ''} onChange={(e) => setAdvForm((f) => ({ ...f, memo: e.target.value }))} placeholder="특이사항" className={inputCls} /></Field>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setAdvOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
            <button onClick={saveAdv} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700">저장</button>
          </div>
        </Modal>
      )}

      {/* 광고 집행 캘린더 모달 */}
      {calAdv && (
        <div className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) closeCalendar() }}>
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-indigo-500" />
                <div>
                  <div className="text-base font-extrabold text-slate-900">{calAdv.company_name || '광고주'}{calAdv.id !== '_general' ? ' · 광고 집행 캘린더' : ''}</div>
                  {calAdv.id !== '_general' && (calAdv as Advertiser).industry && <div className="text-xs text-slate-400">{(calAdv as Advertiser).industry}{(calAdv as Advertiser).product ? ' · ' + (calAdv as Advertiser).product : ''}</div>}
                  {calAdv.id === '_general' && <div className="text-xs text-slate-400">광고 전개 · 무료 강의 등 전체 일정 · 한국시간(KST)</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={share} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><Share2 className="h-3.5 w-3.5" />공유 링크</button>
                <button onClick={() => newEventAt(kstYmd())} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"><Plus className="h-3.5 w-3.5" />새 일정</button>
                <button onClick={closeCalendar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {TYPE_ORDER.map((t) => <span key={t} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: TYPE_META[t][1] }} />{TYPE_META[t][0]}</span>)}
              </div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-extrabold text-slate-800">{curMonth.getFullYear()}년 {curMonth.getMonth() + 1}월</div>
                <div className="flex gap-1.5">
                  <button onClick={todayMonth} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">오늘</button>
                  <button onClick={() => moveMonth(-1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => moveMonth(1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-bold">
                  {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => <div key={d} className={`py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}`}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {cells.map((c, i) => (
                    <div key={i} onClick={() => setDayModal(c.ds)} className={`min-h-[80px] cursor-pointer border-b border-r border-slate-50 p-1.5 transition hover:bg-indigo-50/40 ${(i + 1) % 7 === 0 ? 'border-r-0' : ''} ${c.out ? 'bg-slate-50/40' : ''}`}>
                      <div className={`text-xs font-bold ${c.today ? 'inline-block rounded-md bg-indigo-500 px-1.5 text-white' : c.out ? 'text-slate-300' : 'text-slate-500'}`}>{c.day}</div>
                      {c.evs.slice(0, 3).map((e) => (
                        <div key={e.id} onClick={(ev) => { ev.stopPropagation(); editEvent(e) }} className="mt-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: colorOf(e) }}>{e.title || labelOf(e)}</div>
                      ))}
                      {c.evs.length > 3 && <div className="mt-0.5 text-[10px] text-slate-400">+{c.evs.length - 3}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <h4 className="mb-2.5 text-sm font-extrabold text-slate-700">전체 일정 · 성과 기록</h4>
                {!sortedEvents.length ? (
                  <div className="py-7 text-center text-sm text-slate-400">등록된 일정이 없습니다. “새 일정” 또는 날짜를 눌러 추가하세요.</div>
                ) : sortedEvents.map((e) => <EventRow key={e.id} e={e} onEdit={() => editEvent(e)} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 날짜 상세 모달 */}
      {dayModal && (
        <Modal onClose={() => setDayModal(null)} title={`${dayModal.split('-').join('.')} 일정`} maxW="max-w-xl">
          <div className="max-h-[60vh] overflow-y-auto">
            {events.filter((e) => inRange(dayModal, e)).length ? events.filter((e) => inRange(dayModal, e)).map((e) => <EventRow key={e.id} e={e} onEdit={() => { setDayModal(null); editEvent(e) }} />)
              : <div className="py-6 text-center text-sm text-slate-400">이 날짜에는 등록된 일정이 없습니다.</div>}
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={() => { const ds = dayModal; setDayModal(null); newEventAt(ds) }} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />이 날짜에 일정 추가</button>
          </div>
        </Modal>
      )}

      {/* 이벤트 등록/수정 모달 */}
      {evOpen && (
        <Modal onClose={() => setEvOpen(false)} title={evForm.id ? '일정 수정' : '새 일정'} maxW="max-w-md">
          <Field label="유형">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_ORDER.map((t) => {
                const sel = evForm.type === t
                return <button key={t} onClick={() => setEvForm((f) => ({ ...f, type: t }))} className="flex-1 rounded-lg border-2 px-1 py-2 text-xs font-bold transition" style={sel ? { background: TYPE_META[t][1], borderColor: 'transparent', color: '#fff' } : { borderColor: '#e5e7eb', color: '#64748b' }}>{TYPE_META[t][0]}</button>
              })}
            </div>
          </Field>
          <Field label="색상 (선택 — 지정 시 유형 색상 대신 사용)">
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => setEvForm((f) => ({ ...f, color: '' }))} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${!evForm.color ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>기본</button>
              {SWATCHES.map((c) => <button key={c} onClick={() => setEvForm((f) => ({ ...f, color: c }))} className={`h-6 w-6 rounded-lg ${evForm.color === c ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`} style={{ background: c }} />)}
              <input type="color" value={evForm.color || '#6366f1'} onChange={(e) => setEvForm((f) => ({ ...f, color: e.target.value }))} className="h-6 w-8 cursor-pointer rounded border border-slate-200 bg-white p-0" />
            </div>
          </Field>
          <Field label="제목 *"><input value={evForm.title} onChange={(e) => setEvForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 네이버 파워링크 집행" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작일 *"><input type="date" value={evForm.start_date} onChange={(e) => setEvForm((f) => ({ ...f, start_date: e.target.value }))} className={inputCls} /></Field>
            <Field label="종료일"><input type="date" value={evForm.end_date} onChange={(e) => setEvForm((f) => ({ ...f, end_date: e.target.value }))} className={inputCls} /></Field>
          </div>
          <Field label="내용 / 메모"><textarea rows={2} value={evForm.memo} onChange={(e) => setEvForm((f) => ({ ...f, memo: e.target.value }))} placeholder="기획·제작·집행 내용 · 무료 강의: 장소·정원·커리큘럼 등" className={inputCls} /></Field>
          <Field label="🔗 링크 (무료 강의 신청 · 랜딩·상세 페이지 URL 등)"><input type="url" value={evForm.link} onChange={(e) => setEvForm((f) => ({ ...f, link: e.target.value }))} placeholder="https:// 로 시작하는 주소" className={inputCls} /></Field>
          <Field label="📈 광고 성과 (노출·클릭·CTR 등)"><textarea rows={2} value={evForm.ad_result} onChange={(e) => setEvForm((f) => ({ ...f, ad_result: e.target.value }))} placeholder="예: 노출 12,400 · 클릭 380 · CTR 3.1%" className={inputCls} /></Field>
          <Field label="💰 금액 대비 성과 (광고비 대비 매출·ROAS 등)"><textarea rows={2} value={evForm.cost_result} onChange={(e) => setEvForm((f) => ({ ...f, cost_result: e.target.value }))} placeholder="예: 광고비 150만원 → 매출 630만원 (ROAS 420%)" className={inputCls} /></Field>
          <Field label="🏆 성과 (전환·문의·매출 등 최종 성과)"><textarea rows={2} value={evForm.result} onChange={(e) => setEvForm((f) => ({ ...f, result: e.target.value }))} placeholder="예: 신규 문의 21건 · 매출 +2,300만원" className={inputCls} /></Field>
          <div className="mt-4 flex items-center gap-2">
            {evForm.id && <button onClick={deleteEvent} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-100">삭제</button>}
            <div className="flex-1" />
            <button onClick={() => setEvOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
            <button onClick={saveEvent} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700">저장</button>
          </div>
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-[2000] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>{children}</div>
}

function StatCard({ icon, tone, num, label }: { icon: React.ReactNode; tone: 'blue' | 'green' | 'amber'; num: number; label: string }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div><div className="text-2xl font-extrabold text-slate-900">{num}</div><div className="text-xs font-medium text-slate-500">{label}</div></div>
    </div>
  )
}

function Modal({ title, onClose, maxW, children }: { title: string; onClose: () => void; maxW: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`w-full ${maxW} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <span className="text-base font-extrabold text-slate-900">{title}</span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function EventRow({ e, onEdit }: { e: AdEvent; onEdit: () => void }) {
  const c = colorOf(e)
  const s = (e.start_date || '').slice(0, 10), en = (e.end_date || '').slice(0, 10)
  const dr = s + (en && en !== s ? ' ~ ' + en : '')
  const url = safeUrl(e.link)
  return (
    <div className="mb-2 flex gap-3 rounded-xl border border-slate-100 p-3">
      <div className="w-1 shrink-0 self-stretch rounded" style={{ background: c }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: c }}>{labelOf(e)}</span>
          <span className="font-bold text-slate-900">{e.title || labelOf(e)}</span>
          <span className="text-xs text-slate-400">{dr}</span>
        </div>
        {e.memo && <div className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">{e.memo}</div>}
        {(e.ad_result || e.cost_result || e.result) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {e.ad_result && <Metric icon={<TrendingUp className="h-3 w-3" />} label="광고 성과" text={e.ad_result} cls="bg-blue-50 border-blue-200 text-blue-800" />}
            {e.cost_result && <Metric icon={<Receipt className="h-3 w-3" />} label="금액 대비 성과" text={e.cost_result} cls="bg-emerald-50 border-emerald-200 text-emerald-800" />}
            {e.result && <Metric icon={<Trophy className="h-3 w-3" />} label="성과" text={e.result} cls="bg-amber-50 border-amber-200 text-amber-800" />}
          </div>
        )}
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1.5 text-xs font-bold text-pink-700 hover:bg-pink-100"><Link2 className="h-3 w-3" />{e.type === 'lecture' ? '강의 신청·안내' : '링크 열기'}</a>}
      </div>
      <button onClick={onEdit} className="h-fit rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50">수정</button>
    </div>
  )
}

function Metric({ icon, label, text, cls }: { icon: React.ReactNode; label: string; text: string; cls: string }) {
  return (
    <div className={`min-w-[150px] flex-1 whitespace-pre-wrap rounded-lg border px-2.5 py-1.5 text-xs leading-relaxed ${cls}`}>
      <b className="mb-0.5 flex items-center gap-1 text-[11px] font-extrabold">{icon}{label}</b>{text}
    </div>
  )
}
