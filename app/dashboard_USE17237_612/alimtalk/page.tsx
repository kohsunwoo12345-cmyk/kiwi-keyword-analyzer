'use client'

import { useMemo, useState } from 'react'
import { MessageCircle, LayoutTemplate, BarChart3, Check, Send } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500'

const PROFILES = ['@바이전시', '@바이전시_강남점', '@바이전시_고객센터']

type Template = {
  id: string
  name: string
  channel: string
  body: string
  button: string
}

const TEMPLATES: Template[] = [
  {
    id: 'reserve',
    name: '예약 확인 안내',
    channel: '@바이전시',
    body:
      '#{이름}님, 예약이 정상적으로 접수되었습니다.\n\n■ 매장명 : #{매장명}\n■ 예약일시 : #{예약일시}\n\n방문 전 변경/취소는 마이페이지에서 가능합니다. 감사합니다.',
    button: '예약 상세 보기',
  },
  {
    id: 'order',
    name: '주문 완료 안내',
    channel: '@바이전시',
    body:
      '#{이름}님, 주문이 완료되었습니다.\n\n■ 주문처 : #{매장명}\n■ 주문일시 : #{예약일시}\n\n빠르게 준비하여 안내드리겠습니다.',
    button: '주문 내역 보기',
  },
  {
    id: 'delivery',
    name: '배송 출발 안내',
    channel: '@바이전시',
    body:
      '#{이름}님, 상품이 출고되어 배송이 시작되었습니다.\n\n■ 발송처 : #{매장명}\n■ 출고일시 : #{예약일시}\n\n안전하게 전달해 드리겠습니다.',
    button: '배송 조회',
  },
  {
    id: 'point',
    name: '포인트 적립 안내',
    channel: '@바이전시_고객센터',
    body:
      '#{이름}님, 포인트가 적립되었습니다.\n\n■ 적립처 : #{매장명}\n■ 적립일시 : #{예약일시}\n\n마이페이지에서 잔여 포인트를 확인하세요.',
    button: '포인트 확인',
  },
]

function fillVars(body: string, vars: Record<string, string>) {
  return body
    .replace(/#\{이름\}/g, vars.이름 || '#{이름}')
    .replace(/#\{예약일시\}/g, vars.예약일시 || '#{예약일시}')
    .replace(/#\{매장명\}/g, vars.매장명 || '#{매장명}')
}

export default function AlimtalkSendPage() {
  const [profile, setProfile] = useState(PROFILES[0])
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [targets, setTargets] = useState<string[]>(['VIP 고객'])
  const [directInput, setDirectInput] = useState('')
  const [vars, setVars] = useState<Record<string, string>>({
    이름: '김지연',
    예약일시: '2026-07-15 14:00',
    매장명: '바이전시 강남점',
  })
  const [sent, setSent] = useState('')

  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0],
    [templateId],
  )

  const GROUPS = ['VIP 고객', '신규 가입', '재구매 고객', '휴면 고객', '전체 수신동의']

  function toggleTarget(g: string) {
    setTargets((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  const estimated =
    targets.length * 1240 + (directInput.trim() ? directInput.split(/[\n,]/).filter((s) => s.trim()).length : 0)

  function send() {
    setSent(`${profile} 발신프로필로 [${template.name}] 알림톡이 ${estimated.toLocaleString()}명에게 발송 예약되었습니다 ✓`)
    setTimeout(() => setSent(''), 3200)
  }

  const preview = fillVars(template.body, vars)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MessageCircle}
        eyebrow="카카오 알림톡"
        title="알림톡 발송"
        desc="승인된 템플릿으로 카카오톡 알림톡을 발송하고 실시간으로 미리봅니다."
        accent="#f59e0b"
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="발신프로필" value="2개" icon={MessageCircle} accent="#f59e0b" />
          <StatCard label="승인 템플릿" value="8개" icon={LayoutTemplate} accent="#7c3aed" />
          <StatCard label="이번달 발송" value="5,120" delta={9} icon={Send} accent="#0ea5e9" />
          <StatCard label="발송 성공률" value="99.1%" delta={0.4} icon={BarChart3} accent="#22c55e" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left — composer */}
          <Panel title="알림톡 발송">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">발신프로필</label>
                <select value={profile} onChange={(e) => setProfile(e.target.value)} className={inputCls}>
                  {PROFILES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">템플릿 (승인됨)</label>
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}>
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">수신 대상</label>
                <div className="flex flex-wrap gap-1.5">
                  {GROUPS.map((g) => (
                    <button
                      key={g}
                      onClick={() => toggleTarget(g)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        targets.includes(g)
                          ? 'border-amber-300 bg-amber-100 text-amber-700'
                          : 'border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <textarea
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  rows={2}
                  placeholder="직접 입력 (전화번호를 쉼표 또는 줄바꿈으로 구분)"
                  className={`mt-2 resize-none ${inputCls}`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">변수 매핑</label>
                <div className="space-y-2">
                  {(['이름', '예약일시', '매장명'] as const).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-24 flex-shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-center text-xs font-medium text-amber-700">
                        {`#{${key}}`}
                      </span>
                      <input
                        value={vars[key]}
                        onChange={(e) => setVars((v) => ({ ...v, [key]: e.target.value }))}
                        placeholder={`${key} 값 입력`}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                <span className="text-[var(--text-soft)]">예상 발송 인원</span>
                <span className="font-semibold text-amber-600">{estimated.toLocaleString()}명</span>
              </div>

              <Button onClick={send} className="w-full !bg-gradient-to-br !from-amber-500 !to-orange-500">
                <Send size={16} /> 알림톡 발송
              </Button>

              {sent && (
                <div className="animate-fade-in rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
                  {sent}
                </div>
              )}
            </div>
          </Panel>

          {/* Right — Kakao preview */}
          <Panel title="미리보기">
            <div className="rounded-2xl bg-[#B2C7DA] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FEE500] text-sm font-bold text-[#3C1E1E]">
                  BV
                </span>
                <span className="text-sm font-semibold text-[#3C1E1E]">{profile}</span>
              </div>

              <div className="max-w-[85%] overflow-hidden rounded-2xl rounded-tl-md bg-white shadow-sm">
                {/* Yellow header */}
                <div className="flex items-center gap-1.5 bg-[#FEE500] px-4 py-2.5">
                  <MessageCircle size={15} className="text-[#3C1E1E]" />
                  <span className="text-xs font-bold text-[#3C1E1E]">알림톡 도착</span>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{preview}</p>
                </div>

                {/* Button */}
                <div className="px-4 pb-4">
                  <div className="w-full rounded-lg bg-slate-100 py-2.5 text-center text-sm font-medium text-slate-700">
                    {template.button}
                  </div>
                </div>
              </div>

              <p className="mt-2 flex items-center gap-1 pl-1 text-[11px] text-[#3C1E1E]/70">
                <Check size={12} /> 카카오 채널 인증 발송
              </p>
            </div>

            <p className="mt-3 text-xs text-[var(--text-dim)]">
              변수 값을 입력하면 미리보기 본문에 실시간으로 치환됩니다.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
