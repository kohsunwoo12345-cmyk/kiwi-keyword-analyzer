'use client'

import { useState } from 'react'
import { LayoutTemplate, Plus, Check, Clock, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500'

type Status = '승인' | '검수중' | '반려'

type Template = {
  id: string
  name: string
  category: string
  body: string
  status: Status
}

const CATEGORIES = ['예약', '주문', '배송', '포인트', '이벤트', '회원']

const SEED: Template[] = [
  {
    id: 't1',
    name: '예약 확인 안내',
    category: '예약',
    body: '#{이름}님, 예약이 정상 접수되었습니다.\n■ 매장 : #{매장명}\n■ 일시 : #{예약일시}\n방문 전 변경/취소는 마이페이지에서 가능합니다.',
    status: '승인',
  },
  {
    id: 't2',
    name: '주문 완료 안내',
    category: '주문',
    body: '#{이름}님, 주문이 완료되었습니다.\n주문번호 #{주문번호} 건을 빠르게 준비하여 안내드리겠습니다. 감사합니다.',
    status: '승인',
  },
  {
    id: 't3',
    name: '배송 출발 안내',
    category: '배송',
    body: '#{이름}님, 상품이 출고되어 배송이 시작되었습니다.\n운송장번호 #{운송장}로 실시간 조회가 가능합니다.',
    status: '승인',
  },
  {
    id: 't4',
    name: '포인트 적립 안내',
    category: '포인트',
    body: '#{이름}님, #{적립포인트}P가 적립되었습니다.\n현재 잔여 포인트는 #{잔여포인트}P 입니다. 마이페이지에서 확인하세요.',
    status: '검수중',
  },
  {
    id: 't5',
    name: '이벤트 초대 안내',
    category: '이벤트',
    body: '#{이름}님만을 위한 특별 혜택!\n이번 주 한정 #{할인율}% 쿠폰이 발급되었습니다. 지금 바로 사용해 보세요.',
    status: '반려',
  },
  {
    id: 't6',
    name: '휴면 전환 안내',
    category: '회원',
    body: '#{이름}님, 장기 미접속으로 곧 휴면 계정으로 전환될 예정입니다.\n계속 이용하시려면 로그인해 주세요.',
    status: '승인',
  },
]

const statusMeta: Record<Status, { badge: string; icon: typeof Check }> = {
  승인: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: Check },
  검수중: { badge: 'border-amber-200 bg-amber-50 text-amber-700', icon: Clock },
  반려: { badge: 'border-rose-200 bg-rose-50 text-rose-700', icon: Clock },
}

export default function AlimtalkTemplatesPage() {
  const [items, setItems] = useLocalStorage<Template[]>('bivience_alimtalk_templates', SEED)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [body, setBody] = useState('')

  function save() {
    if (!name.trim() || !body.trim()) return
    const next: Template = {
      id: `t${Date.now()}`,
      name: name.trim(),
      category,
      body: body.trim(),
      status: '검수중',
    }
    setItems((prev) => [next, ...prev])
    setName('')
    setCategory(CATEGORIES[0])
    setBody('')
    setShowForm(false)
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={LayoutTemplate}
        eyebrow="카카오 알림톡"
        title="알림톡 템플릿"
        desc="알림톡 템플릿을 등록하고 검수 상태를 관리합니다."
        accent="#f59e0b"
        action={
          <Button
            onClick={() => setShowForm((s) => !s)}
            className="!bg-gradient-to-br !from-amber-500 !to-orange-500"
          >
            <Plus size={16} /> 새 템플릿
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {showForm && (
          <Panel title="새 템플릿 등록">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">템플릿명</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 재입고 알림"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">카테고리</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">본문</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="변수는 #{이름} 형식으로 입력하세요."
                  className={`resize-none ${inputCls}`}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  취소
                </Button>
                <Button onClick={save} className="!bg-gradient-to-br !from-amber-500 !to-orange-500">
                  저장
                </Button>
              </div>
            </div>
          </Panel>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => {
            const meta = statusMeta[t.status]
            const Icon = meta.icon
            return (
              <div key={t.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <button
                    onClick={() => remove(t.id)}
                    className="flex-shrink-0 text-[var(--text-dim)] transition-colors hover:text-rose-500"
                    aria-label="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge className="border-violet-200 bg-violet-50 text-violet-700">{t.category}</Badge>
                  <Badge className={meta.badge}>
                    <Icon size={12} /> {t.status}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-[var(--text-soft)]">
                  {t.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
