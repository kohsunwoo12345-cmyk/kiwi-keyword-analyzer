'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Users, CheckCircle2, Plus, Search, Download, CalendarDays, Pencil, Trash2, ExternalLink, X } from 'lucide-react'
import { AdCalendar, Modal, Field, kstYmd } from '@/components/admin/AdCalendar'

// ── 광고주 관리 (넥스트바이전시 관리자 대시보드 이식 · DB는 우리 웹에서 동작) ──

type Advertiser = {
  id: string; reg_date: string; company_name: string; place_url: string; industry: string
  product: string; price: string; source: string; contact: string; memo: string; status: string
}

const STATUS_META: Record<string, [string, string]> = {
  active: ['진행중', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  paused: ['보류', 'bg-amber-50 text-amber-700 border-amber-200'],
  ended: ['종료', 'bg-slate-100 text-slate-500 border-slate-200'],
}
const EMPTY_ADV: Partial<Advertiser> = { reg_date: '', company_name: '', place_url: '', industry: '', product: '', price: '', source: '', contact: '', status: 'active', memo: '' }
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

export default function AdvertisersPage() {
  const [list, setList] = useState<Advertiser[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [advForm, setAdvForm] = useState<Partial<Advertiser>>(EMPTY_ADV)
  const [calAdv, setCalAdv] = useState<Advertiser | null>(null)

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

  function openAdd() { setAdvForm({ ...EMPTY_ADV, reg_date: kstYmd() }); setAdvOpen(true) }
  function openEdit(a: Advertiser) { setAdvForm({ ...a, reg_date: String(a.reg_date || '').slice(0, 10) }); setAdvOpen(true) }
  async function saveAdv() {
    const f = advForm
    if (!f.company_name || !f.company_name.trim()) { showToast('업체 이름을 입력하세요'); return }
    const isEdit = !!f.id
    try {
      const r = await fetch('/api/advertisers', { method: isEdit ? 'PUT' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
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
          <a href="./calendar" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <CalendarDays className="h-4 w-4 text-indigo-500" />전개 캘린더
          </a>
          <button onClick={exportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
            <Download className="h-4 w-4" />엑셀
          </button>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4" />광고주 등록
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard icon={<Users className="h-5 w-5" />} tone="blue" num={stats.total} label="총 광고주" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} tone="green" num={stats.active} label="진행중" />
        <StatCard icon={<Plus className="h-5 w-5" />} tone="amber" num={stats.month} label="이번 달 신규" />
      </div>

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
                        <button onClick={() => setCalAdv(a)} title="광고 집행 캘린더" className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"><CalendarDays className="h-3.5 w-3.5" />캘린더</button>
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
        <div className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) setCalAdv(null) }}>
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="text-base font-extrabold text-slate-900">광고 집행 캘린더</span>
              <button onClick={() => setCalAdv(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-4">
              <AdCalendar
                bucketId={calAdv.id}
                title={`${calAdv.company_name || '광고주'} · 광고 집행 캘린더`}
                subtitle={[calAdv.industry, calAdv.product].filter(Boolean).join(' · ')}
                onToast={showToast}
                shareKind="advertiser"
              />
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-[2000] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </div>
  )
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
