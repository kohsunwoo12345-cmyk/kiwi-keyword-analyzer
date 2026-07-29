'use client'

import { useRef, useState } from 'react'
import { Check, Upload, Trash2, FileText, Loader2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { senderUpload, senderDocDelete, fmtSize, type SenderDoc, type SenderDocSpec } from '@/lib/sender'

/**
 * 필수 서류 한 칸.
 * 통신사 정책상 이 칸들이 전부 채워져야 승인 신청을 낼 수 있다 —
 * 그래서 "비어 있음"이 눈에 띄게 보이도록 테두리를 다르게 그린다.
 */
export function DocSlot({
  spec,
  doc,
  senderId,
  locked,
  onChanged,
}: {
  spec: SenderDocSpec
  doc?: SenderDoc
  senderId: string
  /** 승인 완료된 신청은 교체·삭제 불가 */
  locked?: boolean
  onChanged: (msg?: { ok: boolean; text: string }) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const isImage = (doc?.contentType || '').startsWith('image/')

  async function pick(f: File | null) {
    if (!f) return
    setBusy(true)
    const r = await senderUpload(senderId, spec.type, f)
    setBusy(false)
    if (ref.current) ref.current.value = ''
    onChanged(r.ok ? { ok: true, text: `${spec.label} 첨부 완료` } : { ok: false, text: r.error || '첨부 실패' })
  }

  async function remove() {
    if (!doc) return
    if (!confirm(`${spec.label} 첨부 파일을 삭제할까요?`)) return
    setBusy(true)
    const r = await senderDocDelete(doc.id)
    setBusy(false)
    onChanged(r.ok ? { ok: true, text: `${spec.label} 삭제됨` } : { ok: false, text: r.error || '삭제 실패' })
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        doc ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-dashed border-[var(--border)] bg-[var(--panel-2)]',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
            doc ? 'bg-emerald-500/15 text-emerald-600' : 'bg-[var(--border-soft)] text-[var(--text-dim)]',
          )}
        >
          {doc ? <Check size={14} strokeWidth={2.5} /> : <FileText size={14} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-[var(--text)]">{spec.label}</span>
            <span className="rounded-md bg-rose-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">필수</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">{spec.hint}</p>

          {doc ? (
            <div className="mt-2.5 flex items-center gap-2.5">
              {isImage && (
                // 서류는 로그인·본인 확인을 거치는 경로로만 내려온다(/api/sender/doc)
                <a href={doc.url} target="_blank" rel="noreferrer" className="block flex-shrink-0">
                  <img src={doc.url} alt={spec.label} className="h-12 w-12 rounded-lg border border-[var(--border)] object-cover" />
                </a>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-medium text-[var(--text)]">{doc.fileName || '첨부 파일'}</p>
                <p className="text-[10.5px] text-[var(--text-dim)]">{fmtSize(doc.size)}</p>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-soft)] hover:bg-[var(--panel)]"
              >
                <Eye size={11} /> 보기
              </a>
              {!locked && (
                <>
                  <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-soft)] hover:bg-[var(--panel)] disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} 교체
                  </button>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => ref.current?.click()}
              disabled={busy || locked}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} 사진 첨부
            </button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] || null)}
      />
    </div>
  )
}
