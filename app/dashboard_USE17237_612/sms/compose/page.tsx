'use client'

import { useState } from 'react'
import { PenSquare, Trash2, Check, Smartphone, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'

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

export default function SmsComposePage() {
  const [templates, setTemplates] = useLocalStorage<Template[]>('bivience_sms_templates', SEED)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function loadTemplate(t: Template) {
    setEditingId(t.id)
    setName(t.name)
    setBody(t.body)
  }

  function insertVariable(v: string) {
    setBody((prev) => (prev ? `${prev} ${v}` : v))
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={PenSquare}
        eyebrow="문자 (SMS)"
        title="문자 작성"
        desc="자주 쓰는 문구를 템플릿으로 저장하고 변수를 넣어 개인화 메시지를 만듭니다."
        accent={ACCENT}
        action={
          <Button onClick={newTemplate} variant="outline">
            <Plus size={16} /> 새 템플릿
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {toast && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2.5 text-sm text-emerald-700 animate-fade-in">
            {toast}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr_1fr]">
          {/* Saved templates */}
          <Panel title="저장된 템플릿">
            <div className="space-y-2">
              {templates.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--text-dim)]">저장된 템플릿이 없습니다.</p>
              )}
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={`group flex items-start gap-2 rounded-xl border p-3 transition-colors ${
                    editingId === t.id
                      ? 'border-indigo-500/40 bg-indigo-50'
                      : 'border-[var(--border)] hover:bg-[var(--panel-2)]'
                  }`}
                >
                  <button onClick={() => loadTemplate(t)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-dim)]">{t.body}</p>
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-dim)] hover:bg-rose-500/12 hover:text-rose-500"
                    aria-label="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          {/* Editor */}
          <Panel title="템플릿 편집">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">템플릿 이름</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 예약확인"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">본문</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={7}
                  placeholder="메시지 본문을 입력하세요."
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">변수 삽입</label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      onClick={() => insertVariable(v)}
                      className="rounded-lg border border-indigo-500/30 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={save}
                disabled={!name.trim() || !body.trim()}
                className="w-full !bg-gradient-to-br !from-indigo-500 !to-violet-500"
              >
                <Check size={16} /> 템플릿 저장
              </Button>
            </div>
          </Panel>

          {/* Preview */}
          <Panel title="미리보기">
            <div className="flex justify-center py-2">
              <div className="w-full max-w-[280px] rounded-[2.2rem] border border-[var(--border)] bg-[var(--panel-2)] p-3 shadow-sm">
                <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-300" />
                <div className="rounded-2xl bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                      <Smartphone size={15} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold">{name || '템플릿 미리보기'}</p>
                      <p className="text-[10px] text-[var(--text-dim)]">샘플값 적용</p>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-indigo-50 px-3.5 py-2.5 text-sm text-[var(--text)]">
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
          </Panel>
        </div>
      </div>
    </div>
  )
}
