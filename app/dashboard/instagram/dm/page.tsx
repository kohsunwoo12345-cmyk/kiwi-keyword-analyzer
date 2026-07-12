'use client'

import { useState } from 'react'
import { MessageCircle, Send, Plus, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'

const ACCENT = '#ec4899'

type Rule = { id: string; keyword: string; reply: string; enabled: boolean }

const SEED: Rule[] = [
  {
    id: 'r1',
    keyword: '가격',
    reply: '안녕하세요! 제품 가격은 프로필 링크의 스토어에서 확인하실 수 있어요 😊',
    enabled: true,
  },
  {
    id: 'r2',
    keyword: '예약',
    reply: '예약을 원하시면 성함과 희망 날짜를 남겨주세요. 담당자가 확인 후 안내드립니다.',
    enabled: true,
  },
  {
    id: 'r3',
    keyword: '위치',
    reply: '바이전시 강남점은 서울 강남구 테헤란로 123, 2층에 있습니다. 지도 링크 보내드릴게요!',
    enabled: false,
  },
  {
    id: 'r4',
    keyword: '영업시간',
    reply: '평일 11:00~20:00, 주말 12:00~19:00 운영합니다. 매주 월요일은 휴무예요.',
    enabled: true,
  },
]

type DM = { name: string; preview: string; time: string; auto: boolean }

const dms: DM[] = [
  { name: '김서연', preview: '가격이 어떻게 되나요?', time: '방금', auto: true },
  { name: '박지훈', preview: '예약하고 싶은데 어떻게 하나요', time: '5분 전', auto: true },
  { name: '이하은', preview: '신상 컬렉션 너무 예뻐요! 재입고 문의요', time: '18분 전', auto: false },
  { name: '최민준', preview: '영업시간이 궁금합니다', time: '32분 전', auto: true },
  { name: '정유진', preview: '매장 위치 알려주실 수 있나요?', time: '1시간 전', auto: true },
  { name: '강도윤', preview: '협업 제안 드리고 싶어 연락드립니다', time: '2시간 전', auto: false },
  { name: '윤채원', preview: '주문한 상품 언제 발송되나요?', time: '3시간 전', auto: false },
]

export default function InstagramDmPage() {
  const [rules, setRules] = useLocalStorage<Rule[]>('bivience_ig_dm_rules', SEED)
  const [keyword, setKeyword] = useState('')
  const [reply, setReply] = useState('')
  const [toast, setToast] = useState('')

  function addRule() {
    if (!keyword.trim() || !reply.trim()) return
    const id = `r${Date.now()}`
    setRules((prev) => [...prev, { id, keyword, reply, enabled: true }])
    setKeyword('')
    setReply('')
    setToast(`"${keyword}" 규칙이 추가되었습니다`)
    setTimeout(() => setToast(''), 3000)
  }

  function toggle(id: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  }

  function remove(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MessageCircle}
        eyebrow="인스타그램"
        title="DM 자동화"
        desc="키워드 기반 자동응답 규칙을 설정하고 최근 DM 응대 현황을 관리합니다."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        {toast && (
          <div className="animate-fade-in rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
            {toast}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="자동응답 규칙" value="6" icon={MessageCircle} accent="#ec4899" />
          <StatCard label="이번달 자동응답" value="1,240" delta={18} icon={Send} accent="#a855f7" />
          <StatCard label="응답률" value="94%" delta={3.2} icon={MessageCircle} accent="#22c55e" />
          <StatCard label="DM → 전환" value="86" delta={11.5} icon={Users} accent="#f59e0b" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Auto-reply rules */}
          <Panel title="자동응답 규칙">
            {/* New rule form */}
            <div className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">키워드</label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 배송"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">응답 메시지</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="자동으로 발송할 응답을 입력하세요."
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>
              <Button
                onClick={addRule}
                disabled={!keyword.trim() || !reply.trim()}
                className="w-full !bg-gradient-to-br !from-pink-500 !to-fuchsia-500"
              >
                <Plus size={16} /> 새 규칙 추가
              </Button>
            </div>

            {/* Rules list */}
            <div className="space-y-2.5">
              {rules.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--text-dim)]">등록된 규칙이 없습니다.</p>
              )}
              {rules.map((r) => (
                <div key={r.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Badge className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700">키워드: {r.keyword}</Badge>
                      <p className="mt-2 text-sm text-[var(--text-soft)]">{r.reply}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => toggle(r.id)}
                        aria-label="자동응답 켜기/끄기"
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          r.enabled ? 'bg-gradient-to-r from-pink-500 to-fuchsia-500' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                            r.enabled ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded-lg p-1.5 text-[var(--text-dim)] hover:bg-rose-50 hover:text-rose-500"
                        aria-label="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Recent DMs */}
          <Panel title="최근 DM">
            <div className="space-y-2">
              {dms.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-slate-50"
                >
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 text-sm font-semibold text-white">
                    {d.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{d.name}</p>
                      {d.auto && (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">자동응답</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-dim)]">{d.preview}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-[var(--text-dim)]">{d.time}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
