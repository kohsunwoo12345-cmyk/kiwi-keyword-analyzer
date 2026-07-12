'use client'

import { useMemo, useState } from 'react'
import {
  Database,
  Download,
  Trash2,
  Search,
  UserPlus,
  Eye,
  MousePointerClick,
  Target,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend } from '@/components/dash/Charts'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { trafficTrend } from '@/lib/mock'

interface Lead {
  id: string
  name: string
  phone: string
  email: string
  interest: string
  source: string
  createdAt: string
}

const SEED: Lead[] = [
  { id: 's1', name: '김지훈', phone: '010-2345-6789', email: 'jihoon@example.com', interest: '온라인 광고', source: '인스타 광고', createdAt: '2026-07-11 14:22' },
  { id: 's2', name: '이수민', phone: '010-8765-4321', email: 'sumin@example.com', interest: '블로그 마케팅', source: '네이버 검색', createdAt: '2026-07-11 11:08' },
  { id: 's3', name: '박현우', phone: '010-5555-1234', email: 'hyunwoo@example.com', interest: 'AI 영상', source: '유튜브', createdAt: '2026-07-10 19:44' },
]

const INTERESTS = ['온라인 광고', '블로그 마케팅', 'AI 영상', 'CRM 도입', '컨설팅']

function nextId() {
  return 'l' + Math.random().toString(36).slice(2, 9)
}

export default function LeadsPage() {
  const [leads, setLeads] = useLocalStorage<Lead[]>('bivience_leads', SEED)
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: INTERESTS[0] })
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.name.includes(query) ||
          l.email.includes(query) ||
          l.phone.includes(query) ||
          l.interest.includes(query),
      ),
    [leads, query],
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.phone) return
    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const lead: Lead = {
      id: nextId(),
      name: form.name,
      phone: form.phone,
      email: form.email,
      interest: form.interest,
      source: '랜딩페이지 직접입력',
      createdAt: stamp,
    }
    setLeads((prev) => [lead, ...prev])
    setForm({ name: '', phone: '', email: '', interest: INTERESTS[0] })
    setToast(`${lead.name}님 DB가 수집되었습니다 ✓`)
    setTimeout(() => setToast(''), 2500)
  }

  function remove(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  function exportCsv() {
    const header = ['이름', '전화번호', '이메일', '관심사', '유입경로', '수집일시']
    const rows = leads.map((l) => [l.name, l.phone, l.email, l.interest, l.source, l.createdAt])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bivience_leads_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const todayCount = leads.length
  const conv = ((leads.length / (leads.length + 42)) * 100).toFixed(1)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Database}
        eyebrow="01 · DB 수집"
        title="DB 수집 랜딩페이지"
        desc="랜딩페이지 폼으로 방문자를 고객 DB로 전환하고 실시간으로 관리합니다."
        action={
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download size={16} /> CSV 내보내기
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 수집 DB" value={String(leads.length)} delta={18} icon={Database} accent="#7c3aed" />
          <StatCard label="페이지뷰" value="4,820" delta={9} icon={Eye} accent="#0ea5e9" />
          <StatCard label="폼 클릭률" value="24.6%" delta={4.1} icon={MousePointerClick} accent="#22d3ee" />
          <StatCard label="전환율" value={`${conv}%`} delta={2.8} icon={Target} accent="#22c55e" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Live capture form (the actual DB-collection program) */}
          <Panel title="랜딩페이지 폼 (라이브)">
            <p className="mb-4 text-xs text-[var(--text-soft)]">
              방문자가 입력하면 아래 DB 목록에 즉시 저장됩니다. (브라우저에 실제 저장)
            </p>
            <form onSubmit={submit} className="space-y-3">
              <Field
                label="이름 *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="홍길동"
              />
              <Field
                label="전화번호 *"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="010-1234-5678"
              />
              <Field
                label="이메일"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="you@example.com"
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">관심 분야</label>
                <select
                  value={form.interest}
                  onChange={(e) => setForm({ ...form, interest: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                >
                  {INTERESTS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">
                <UserPlus size={16} /> 무료 상담 신청
              </Button>
            </form>
            {toast && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700 animate-fade-in">
                {toast}
              </div>
            )}
          </Panel>

          {/* Collected DB */}
          <Panel
            title={`수집된 DB (${leads.length})`}
            action={
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="검색..."
                  className="w-40 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] py-1.5 pl-8 pr-3 text-sm outline-none focus:border-violet-500 sm:w-52"
                />
              </div>
            }
          >
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-3 py-2.5 font-medium">이름</th>
                    <th className="px-3 py-2.5 font-medium">연락처</th>
                    <th className="px-3 py-2.5 font-medium">관심사</th>
                    <th className="px-3 py-2.5 font-medium">유입경로</th>
                    <th className="px-3 py-2.5 font-medium">수집일시</th>
                    <th className="px-3 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium">{l.name}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">
                        <div>{l.phone}</div>
                        <div className="text-xs text-[var(--text-dim)]">{l.email || '—'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                          {l.interest}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{l.source}</td>
                      <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{l.createdAt}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => remove(l.id)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-dim)] hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-[var(--text-dim)]">
                        수집된 DB가 없습니다. 왼쪽 폼으로 추가해보세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <Panel title="유입 & 전환 추이 (최근 7일)">
          <AreaTrend data={trafficTrend} keys={['방문', '전환']} colors={['#7c3aed', '#22c55e']} />
        </Panel>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
      />
    </div>
  )
}
