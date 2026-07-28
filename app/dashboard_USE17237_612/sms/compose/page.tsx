'use client'

import { useMemo, useRef, useState } from 'react'
import { PenSquare, Trash2, Check, Smartphone, Plus, FileText, Copy } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Field, Section, inputCls } from '@/components/dash/Kit'
import { Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { cn } from '@/lib/utils'

const ACCENT = '#6366f1'

type Template = { id: string; name: string; body: string }

const SEED: Template[] = [
  {
    id: 't1',
    name: '예약확인',
    body: '[바이전시] #{이름}님, #{예약일} #{매장명} 예약이 확정되었습니다. 방문 감사합니다.',
  },
  {
    id: 't2',
    name: '이벤트안내',
    body: '[바이전시] #{이름}님을 위한 특별 이벤트! 지금 확인하세요 → #{링크}',
  },
  {
    id: 't3',
    name: '재입고알림',
    body: '[바이전시] #{이름}님이 찜하신 상품이 재입고되었어요. #{매장명}에서 만나보세요.',
  },
  {
    id: 't4',
    name: '감사인사',
    body: '[바이전시] #{이름}님, 오늘 #{매장명} 방문해 주셔서 감사합니다. 또 뵙겠습니다!',
  },
]

const VARIABLES = ['#{이름}', '#{예약일}', '#{매장명}', '#{링크}']

const SAMPLE: Record<string, string> = {
  '#{이름}': '홍길동',
  '#{예약일}': '7월 15일 14:00',
  '#{매장명}': '바이전시 강남점',
  '#{링크}': 'bvc.kr/e/0712',
}

function renderPreview(body: string): string {
  let out = body
  for (const [key, val] of Object.entries(SAMPLE)) {
    out = out.split(key).join(val)
  }
  return out
}

/** 통신사 기준 바이트 수 — 한글·이모지 2바이트, ASCII 1바이트 */
function byteLength(s: string): number {
  let n = 0
  for (const ch of s) n += ch.charCodeAt(0) > 0x7f ? 2 : 1
  return n
}

/** 90바이트까지 SMS, 그 이상은 LMS로 나간다 (요금이 달라진다) */
function msgKind(bytes: number): { label: string; tone: string; limit: number } {
  return bytes <= 90
    ? { label: 'SMS', tone: 'text-indigo-500', limit: 90 }
    : { label: 'LMS', tone: 'text-sky-500', limit: 2000 }
}

export default function SmsComposePage() {
  const [templates, setTemplates] = useLocalStorage<Template[]>('bivience_sms_templates', SEED)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  function loadTemplate(t: Template) {
    setEditingId(t.id)
    setName(t.name)
    setBody(t.body)
  }

  /** 커서 위치에 변수를 끼워 넣는다 (예전엔 무조건 맨 뒤에 붙었다) */
  function insertVariable(v: string) {
    const el = bodyRef.current
    if (!el) {
      setBody((prev) => (prev ? `${prev} ${v}` : v))
      return
    }
    const start = el.selectionStart ?? body.length
    const end = el.selectionEnd ?? body.length
    const next = body.slice(0, start) + v + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + v.length, start + v.length)
    })
  }

  function newTemplate() {
    setEditingId(null)
    setName('')
    setBody('')
  }

  function deleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    if (editingId === id) newTemplate()
  }

  function save() {
    if (!name.trim() || !body.trim()) return
    if (editingId) {
      setTemplates((prev) => prev.map((t) => (t.id === editingId ? { ...t, name, body } : t)))
    } else {
      const id = `t${Date.now()}`
      setTemplates((prev) => [...prev, { id, name, body }])
      setEditingId(id)
    }
    setToast(`"${name}" 템플릿이 저장되었습니다`)
    setTimeout(() => setToast(''), 3000)
  }

  function copyBody() {
    if (!body) return
    try {
      navigator.clipboard.writeText(renderPreview(body)).then(() => {
        setToast('샘플값이 적용된 문구를 복사했습니다')
        setTimeout(() => setToast(''), 2500)
      })
    } catch {
      /* noop */
    }
  }

  const bytes = useMemo(() => byteLength(body), [body])
  const kind = msgKind(bytes)
  const over = bytes > kind.limit

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={PenSquare}
        eyebrow="문자 (SMS)"
        title="문자 작성"
        desc="자주 쓰는 문구를 템플릿으로 저장하고, 변수를 넣어 개인화 메시지를 만듭니다."
        accent={ACCENT}
        action={
          <Button onClick={newTemplate} variant="outline">
            <Plus size={16} /> 새 템플릿
          </Button>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {toast && (
          <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-3.5 py-2.5 text-sm text-emerald-500">
            <Check size={15} /> {toast}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          {/* 저장된 템플릿 */}
          <Card title="저장된 템플릿" desc={`${templates.length}개`} bodyClassName="p-3">
            {templates.length === 0 ? (
              <EmptyState icon={FileText} title="저장된 템플릿이 없습니다" hint="자주 쓰는 문구를 저장해두면 발송할 때 바로 불러올 수 있습니다." />
            ) : (
              <div className="space-y-1.5">
                {templates.map((t) => {
                  const on = editingId === t.id
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'group flex items-start gap-2 rounded-xl border p-3 transition-colors',
                        on ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-[var(--border)] hover:bg-[var(--panel-2)]',
                      )}
                    >
                      <button onClick={() => loadTemplate(t)} className="min-w-0 flex-1 text-left">
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                          {t.name}
                          <span className="text-[10px] font-medium text-[var(--text-dim)]">{byteLength(t.body)}byte</span>
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-dim)]">{t.body}</p>
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-dim)] opacity-0 transition-opacity hover:bg-rose-500/12 hover:text-rose-500 group-hover:opacity-100"
                        aria-label="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* 편집 */}
          <Card title="템플릿 편집" desc={editingId ? '기존 템플릿 수정 중' : '새 템플릿 작성 중'}>
            <Section label="기본 정보" first>
              <Field label="템플릿 이름">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 예약확인" className={inputCls} />
              </Field>
            </Section>

            <Section label="본문" hint="90byte를 넘으면 LMS로 발송되어 건당 요금이 올라갑니다.">
              <Field
                label="메시지 내용"
                right={
                  <>
                    <span className={cn('font-semibold', over ? 'text-rose-500' : kind.tone)}>{kind.label}</span>
                    {' · '}
                    <span className={over ? 'font-semibold text-rose-500' : ''}>{bytes}</span>/{kind.limit} byte
                  </>
                }
              >
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="메시지 본문을 입력하세요."
                  className={cn(inputCls, 'resize-none leading-relaxed')}
                />
                <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (bytes / kind.limit) * 100)}%`,
                      background: over ? '#ef4444' : bytes > 90 ? '#0ea5e9' : ACCENT,
                    }}
                  />
                </div>
              </Field>
            </Section>

            <Section label="변수" hint="누르면 커서 위치에 들어갑니다.">
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-soft)] transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Section>

            <div className="mt-6 flex gap-2 border-t border-[var(--border-soft)] pt-5">
              <Button onClick={save} disabled={!name.trim() || !body.trim()} className="flex-1 justify-center">
                <Check size={16} /> 템플릿 저장
              </Button>
              <Button onClick={copyBody} disabled={!body.trim()} variant="outline">
                <Copy size={16} /> 문구 복사
              </Button>
            </div>
          </Card>

          {/* 미리보기 */}
          <Card title="미리보기" desc="변수에 샘플값을 넣은 결과">
            <div className="flex justify-center py-1">
              <div className="w-full max-w-[280px] rounded-[2.2rem] border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[var(--text-dim)] opacity-40" />
                <div className="rounded-2xl bg-[var(--panel)] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                      <Smartphone size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{name || '템플릿 미리보기'}</p>
                      <p className="text-[10px] text-[var(--text-dim)]">
                        {kind.label} · {bytes}byte
                      </p>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-indigo-500/12 px-3.5 py-2.5 text-sm leading-relaxed">
                    {body ? renderPreview(body) : '본문을 입력하면 변수가 샘플값으로 치환되어 표시됩니다.'}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <Badge key={v} className="border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)]">
                  {v} → {SAMPLE[v]}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
