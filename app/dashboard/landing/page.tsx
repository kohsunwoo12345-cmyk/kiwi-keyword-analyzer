'use client'

import { useState } from 'react'
import { Palette, Plus, ExternalLink, Copy, Trash2, Eye } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge, SectionTag } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { formatNumber } from '@/lib/utils'

type Landing = {
  id: string
  name: string
  url: string
  visits: number
  leads: number
  cvr: number
  status: '게시중' | '작성중'
}

const TEMPLATES: { name: string; grad: string }[] = [
  { name: '병원', grad: 'from-sky-500 to-cyan-500' },
  { name: '뷰티', grad: 'from-fuchsia-500 to-pink-500' },
  { name: '교육', grad: 'from-violet-500 to-indigo-500' },
  { name: '부동산', grad: 'from-emerald-500 to-teal-500' },
  { name: '이커머스', grad: 'from-amber-500 to-orange-500' },
  { name: '헬스장', grad: 'from-rose-500 to-red-500' },
  { name: '카페', grad: 'from-lime-500 to-green-500' },
  { name: '세미나', grad: 'from-blue-500 to-violet-500' },
]

const SEED: Landing[] = [
  { id: 'l1', name: '강남 임플란트 상담 이벤트', url: 'bivience.kr/gangnam-dental', visits: 4820, leads: 312, cvr: 6.5, status: '게시중' },
  { id: 'l2', name: '여름 다이어트 PT 30일 챌린지', url: 'bivience.kr/summer-pt', visits: 8140, leads: 604, cvr: 7.4, status: '게시중' },
  { id: 'l3', name: '수능 파이널 온라인 특강 신청', url: 'bivience.kr/finals-class', visits: 2960, leads: 188, cvr: 6.4, status: '게시중' },
  { id: 'l4', name: '신규 아파트 사전청약 안내', url: 'bivience.kr/pre-sale', visits: 0, leads: 0, cvr: 0, status: '작성중' },
]

const statusStyle: Record<Landing['status'], string> = {
  게시중: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  작성중: 'border-amber-200 bg-amber-50 text-amber-700',
}

export default function LandingPage() {
  const [items, setItems] = useLocalStorage<Landing[]>('bivience_landings', SEED)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [toast, setToast] = useState('')

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  function addPage(fromTemplate?: string) {
    const pageName = (fromTemplate ? `${fromTemplate} 랜딩페이지` : name).trim()
    if (!pageName) return
    const slug = `page-${Date.now().toString().slice(-5)}`
    const next: Landing = {
      id: `l${Date.now()}`,
      name: pageName,
      url: `bivience.kr/${slug}`,
      visits: 0,
      leads: 0,
      cvr: 0,
      status: '작성중',
    }
    setItems((prev) => [next, ...prev])
    setName('')
    setShowForm(false)
    flash(`"${pageName}" 페이지가 생성되었습니다 ✓`)
  }

  function duplicate(item: Landing) {
    const copy: Landing = {
      ...item,
      id: `l${Date.now()}`,
      name: `${item.name} (복사본)`,
      url: `${item.url}-copy`,
      visits: 0,
      leads: 0,
      cvr: 0,
      status: '작성중',
    }
    setItems((prev) => [copy, ...prev])
    flash(`"${item.name}" 페이지를 복제했습니다 ✓`)
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Palette}
        eyebrow="랜딩페이지"
        title="랜딩페이지 제작"
        desc="코드 없이 마케팅 랜딩페이지를 만들고 DB를 수집합니다."
        accent="#7c3aed"
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> 새 페이지 만들기
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTag>노코드 랜딩 빌더</SectionTag>
          <p className="text-sm text-[var(--text-soft)]">
            템플릿을 고르거나 빈 페이지로 시작해 드래그 앤 드롭으로 완성하세요.
          </p>
        </div>

        {toast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700 animate-fade-in">
            {toast}
          </div>
        )}

        {showForm && (
          <Panel title="새 페이지 만들기">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">페이지 이름</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPage()}
                  placeholder="예: 가을 신학기 수강생 모집"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => addPage()} disabled={!name.trim()}>
                  <Plus size={16} /> 생성
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  취소
                </Button>
              </div>
            </div>
          </Panel>
        )}

        {/* Template picker */}
        <Panel title="템플릿 선택">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="card-2 group relative overflow-hidden p-0">
                <div className={`relative aspect-[4/3] w-full bg-gradient-to-br ${t.grad}`}>
                  <div className="absolute inset-0 flex flex-col justify-between p-3">
                    <span className="inline-flex w-fit items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {t.name}
                    </span>
                    <div className="space-y-1.5">
                      <div className="h-2 w-2/3 rounded-full bg-white/50" />
                      <div className="h-2 w-1/2 rounded-full bg-white/35" />
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <Button size="sm" onClick={() => addPage(t.name)}>
                      이 템플릿으로 시작
                    </Button>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold">{t.name} 템플릿</p>
                  <p className="text-xs text-[var(--text-dim)]">전환 최적화 구성</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* My landings */}
        <Panel title="내 랜딩페이지">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-3 py-2.5 font-medium">페이지명</th>
                  <th className="px-3 py-2.5 font-medium">URL</th>
                  <th className="px-3 py-2.5 font-medium">방문</th>
                  <th className="px-3 py-2.5 font-medium">DB수집</th>
                  <th className="px-3 py-2.5 font-medium">전환율</th>
                  <th className="px-3 py-2.5 font-medium">상태</th>
                  <th className="px-3 py-2.5 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-violet-600">
                        <ExternalLink size={13} /> {p.url}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(p.visits)}</td>
                    <td className="px-3 py-3 font-semibold">{formatNumber(p.leads)}</td>
                    <td className="px-3 py-3 font-semibold text-emerald-600">
                      {p.cvr ? `${p.cvr}%` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={statusStyle[p.status]}>{p.status}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => duplicate(p)}
                          title="복제"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-violet-300 hover:text-violet-600"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          title="삭제"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-rose-300 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-[var(--text-dim)]">
                      <Eye size={18} className="mx-auto mb-2 opacity-60" />
                      아직 랜딩페이지가 없습니다. 새 페이지를 만들어 보세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
