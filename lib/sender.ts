/* 발신번호 사전등록(승인) — 화면에서 쓰는 타입과 호출 래퍼 */

export interface SenderDocSpec { type: string; label: string; hint: string }
export interface SenderDoc {
  id: string
  docType: string
  label: string
  fileName: string
  contentType: string
  size: number
  createdAt: string
  url: string
}
export interface SenderRequest {
  id: string
  phone: string
  label: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | string
  statusLabel: string
  ownerType: 'personal' | 'business' | string
  ownerTypeLabel: string
  ownerName: string
  bizNo: string
  thirdParty: boolean
  rejectReason: string
  createdAt: string
  submittedAt: string
  decidedAt: string | null
  required: string[]
  docs: SenderDoc[]
  missing: SenderDocSpec[]
  ready: boolean
}

export const SENDER_STATUS_TONE: Record<string, string> = {
  draft: 'border-slate-400/30 bg-slate-400/12 text-slate-500',
  pending: 'border-amber-500/30 bg-amber-500/12 text-amber-600',
  approved: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600',
  rejected: 'border-rose-500/30 bg-rose-500/12 text-rose-600',
}

export function fmtPhone(v: string): string {
  const d = String(v || '').replace(/[^0-9]/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return d.startsWith('02') ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
  return d
}

export function fmtSize(n: number): string {
  const v = Number(n) || 0
  if (v >= 1024 * 1024) return (v / 1024 / 1024).toFixed(1) + 'MB'
  if (v >= 1024) return Math.round(v / 1024) + 'KB'
  return v + 'B'
}

async function post(body: any) {
  try {
    const r = await fetch('/api/sender/requests', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return await r.json()
  } catch {
    return { ok: false, error: '네트워크 오류' }
  }
}

export async function senderRequests(): Promise<{ ok: boolean; requests: SenderRequest[]; specs: Record<string, SenderDocSpec>; error?: string }> {
  try {
    const r = await fetch('/api/sender/requests', { credentials: 'include', cache: 'no-store' })
    const d = await r.json()
    return { ok: !!d.ok, requests: d.requests || [], specs: d.specs || {}, error: d.error }
  } catch {
    return { ok: false, requests: [], specs: {}, error: '네트워크 오류' }
  }
}

export const senderCreate = (input: {
  phone: string; label?: string; ownerType: string; ownerName: string; bizNo?: string; thirdParty?: boolean
}) => post({ action: 'create', ...input })
export const senderUpdate = (id: string, input: {
  label?: string; ownerType: string; ownerName: string; bizNo?: string; thirdParty?: boolean
}) => post({ action: 'update', id, ...input })
export const senderSubmit = (id: string) => post({ action: 'submit', id })
export const senderCancel = (id: string) => post({ action: 'cancel', id })
export const senderDelete = (id: string) => post({ action: 'delete', id })

export async function senderUpload(senderId: string, docType: string, file: File): Promise<{ ok: boolean; doc?: SenderDoc; error?: string }> {
  const fd = new FormData()
  fd.append('senderId', senderId)
  fd.append('docType', docType)
  fd.append('file', file)
  try {
    const r = await fetch('/api/sender/upload', { method: 'POST', credentials: 'include', body: fd })
    return await r.json()
  } catch {
    return { ok: false, error: '업로드 실패' }
  }
}

export async function senderDocDelete(docId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`/api/sender/doc/${encodeURIComponent(docId)}`, { method: 'DELETE', credentials: 'include' })
    return await r.json()
  } catch {
    return { ok: false, error: '삭제 실패' }
  }
}
