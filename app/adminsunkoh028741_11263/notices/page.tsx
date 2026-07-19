'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Send, ImagePlus, Link2, RefreshCw, X, CheckCircle2, Circle, Users, Loader2, Eye, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import {
  adminNoticeList, adminNoticeSend, adminNoticeDetail, adminUsers,
  type AdminNoticeCampaign, type NoticeRecipient, type User,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const kst = (iso?: string | null) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
const num = (n: number) => (n || 0).toLocaleString('ko-KR')
type Target = 'all' | 'plan' | 'multi'

export default function NoticesPage() {
  // 발송 폼 상태
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [target, setTarget] = useState<Target>('all')
  const [plan, setPlan] = useState('Plus')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 목록/상세
  const [campaigns, setCampaigns] = useState<AdminNoticeCampaign[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ recipients: NoticeRecipient[]; campaign?: AdminNoticeCampaign } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rFilter, setRFilter] = useState<'all' | 'read' | 'unread'>('all')

  // 회원 목록(선택 발송용)
  const [users, setUsers] = useState<User[]>([])
  const [userQuery, setUserQuery] = useState('')

  const load = () => { setLoading(true); adminNoticeList().then((d) => { setCampaigns(d.campaigns); setLoading(false) }) }
  useEffect(() => { load() }, [])
  useEffect(() => { if ((target === 'multi') && users.length === 0) adminUsers().then((d) => setUsers(d.users || [])) }, [target, users.length])

  const pickedIds = useMemo(() => Object.keys(picked).filter((k) => picked[k]), [picked])
  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users.slice(0, 200)
    return users.filter((u) => (u.name + ' ' + u.email + ' ' + (u.phone || '')).toLowerCase().includes(q)).slice(0, 200)
  }, [users, userQuery])

  async function onUpload(file: File) {
    setUploading(true); setMsg('')
    try {
      const r = await fetch('/api/upload', { method: 'POST', credentials: 'include', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      const d = await r.json()
      if (d.url) setImageUrl(d.url); else setMsg(d.error || '업로드 실패')
    } catch { setMsg('업로드 실패') }
    setUploading(false)
  }

  async function onSend() {
    if (!title.trim() || !body.trim()) { setMsg('제목과 내용을 입력하세요.'); return }
    if (target === 'multi' && pickedIds.length === 0) { setMsg('발송할 회원을 선택하세요.'); return }
    if (ctaLabel.trim() && !ctaUrl.trim()) { setMsg('CTA 버튼 텍스트가 있으면 이동 URL도 입력하세요.'); return }
    const label = target === 'all' ? '전체 회원' : target === 'plan' ? `${plan} 요금제` : `선택 ${pickedIds.length}명`
    if (!confirm(`${label}에게 알림을 발송할까요?\n발송 후에는 즉시 팝업으로 표시됩니다.`)) return
    setSending(true); setMsg('')
    const res = await adminNoticeSend({
      title: title.trim(), body: body.trim(),
      imageUrl: imageUrl.trim() || undefined, ctaLabel: ctaLabel.trim() || undefined, ctaUrl: ctaUrl.trim() || undefined,
      target, plan: target === 'plan' ? plan : undefined, userIds: target === 'multi' ? pickedIds : undefined,
    })
    setSending(false)
    if (res.ok) {
      setMsg(`✅ ${num(res.audience || 0)}명에게 발송 완료`)
      setTitle(''); setBody(''); setImageUrl(''); setCtaLabel(''); setCtaUrl(''); setPicked({})
      load()
    } else setMsg(res.error || '발송 실패')
  }

  function openDetail(id: string) {
    setOpenId(id); setDetail(null); setDetailLoading(true); setRFilter('all')
    adminNoticeDetail(id).then((d) => {
      setDetail({ recipients: d.recipients || [], campaign: d.campaign }); setDetailLoading(false)
    })
  }

  const shownRecipients = useMemo(() => {
    const list = detail?.recipients || []
    if (rFilter === 'read') return list.filter((r) => r.read)
    if (rFilter === 'unread') return list.filter((r) => !r.read)
    return list
  }, [detail, rFilter])

  return (
    <div>
      <PageHeader icon={Bell} eyebrow="NOTICE" title="알림" desc="회원에게 팝업 알림을 발송하고, 사진·CTA 버튼을 함께 담을 수 있습니다. 누가 읽었는지(X로 닫음)도 확인할 수 있어요." />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ── 발송 폼 ── */}
        <div className="lg:col-span-2 space-y-4">
          <Panel title="알림 발송">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">제목</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
                  placeholder="예) 여름 프로모션 시작!" className="input w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">내용</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={500}
                  placeholder="알림에 표시할 내용을 입력하세요." className="input w-full resize-none" />
              </div>

              {/* 사진 */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">사진 (선택)</label>
                {imageUrl ? (
                  <div className="relative overflow-hidden rounded-lg border border-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="max-h-40 w-full object-cover" />
                    <button onClick={() => setImageUrl('')} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text-soft)] hover:bg-slate-50">
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} 사진 업로드
                    </button>
                    <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="또는 이미지 URL 붙여넣기" className="input flex-1 text-xs" />
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) onUpload(f) }} />
              </div>

              {/* CTA 버튼 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">CTA 버튼 텍스트 (선택)</label>
                  <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={30} placeholder="예) 지금 확인하기" className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">이동 URL</label>
                  <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/dashboard_USE17237_612 또는 https://..." className="input w-full" />
                </div>
              </div>

              {/* 대상 */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">발송 대상</label>
                <div className="flex flex-wrap gap-1.5">
                  {([['all', '전체 회원'], ['plan', '요금제별'], ['multi', '회원 선택']] as [Target, string][]).map(([t, l]) => (
                    <button key={t} onClick={() => setTarget(t)}
                      className={cn('rounded-lg border px-3 py-1.5 text-sm font-semibold', target === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50')}>{l}</button>
                  ))}
                </div>
                {target === 'plan' && (
                  <select value={plan} onChange={(e) => setPlan(e.target.value)} className="input mt-2 w-full">
                    {['없음', 'Plus', 'Pro', 'Max'].map((p) => <option key={p} value={p}>{p} 요금제</option>)}
                  </select>
                )}
                {target === 'multi' && (
                  <div className="mt-2 rounded-lg border border-[var(--border)] p-2">
                    <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="이름·이메일·전화 검색" className="input mb-2 w-full text-xs" />
                    <div className="max-h-44 space-y-0.5 overflow-y-auto">
                      {filteredUsers.map((u) => (
                        <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-slate-50">
                          <input type="checkbox" checked={!!picked[u.id]} onChange={(e) => setPicked((p) => ({ ...p, [u.id]: e.target.checked }))} />
                          <span className="font-semibold">{u.name}</span>
                          <span className="text-[var(--text-dim)]">{u.email}</span>
                        </label>
                      ))}
                      {filteredUsers.length === 0 && <div className="px-1.5 py-2 text-xs text-[var(--text-dim)]">검색 결과 없음</div>}
                    </div>
                    <div className="mt-1 text-right text-[11px] font-semibold text-indigo-600">{pickedIds.length}명 선택됨</div>
                  </div>
                )}
              </div>

              {msg && <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-[var(--text-soft)]">{msg}</div>}

              <button onClick={onSend} disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 알림 발송
              </button>
            </div>
          </Panel>

          {/* 미리보기 */}
          <Panel title="미리보기 (사용자 화면)">
            <div className="mx-auto max-w-xs overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-lg">
              {imageUrl && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={imageUrl} alt="" className="max-h-36 w-full object-cover" />)}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-extrabold">{title || '알림 제목'}</div>
                  <X size={16} className="mt-0.5 flex-shrink-0 text-slate-400" />
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{body || '알림 내용이 여기에 표시됩니다.'}</p>
                {ctaLabel && <div className="mt-3 rounded-lg bg-indigo-600 py-2 text-center text-xs font-bold text-white">{ctaLabel}</div>}
              </div>
            </div>
          </Panel>
        </div>

        {/* ── 발송 이력 + 읽음 현황 ── */}
        <div className="lg:col-span-3">
          <Panel title="발송 이력 · 읽음 현황" action={
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-soft)] hover:bg-slate-50">
              <RefreshCw size={13} className={cn(loading && 'animate-spin')} /> 새로고침
            </button>
          }>
            {campaigns.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-dim)]">아직 발송한 알림이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => {
                  const rate = c.total ? Math.round((c.readCount / c.total) * 100) : 0
                  return (
                    <button key={c.id} onClick={() => openDetail(c.id)}
                      className="w-full rounded-xl border border-[var(--border)] p-3 text-left transition hover:border-indigo-300 hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold">{c.title}</span>
                            {c.imageUrl && <ImagePlus size={12} className="flex-shrink-0 text-slate-400" />}
                            {c.ctaUrl && <Link2 size={12} className="flex-shrink-0 text-slate-400" />}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-[var(--text-dim)]">{c.body}</div>
                        </div>
                        <ChevronRight size={16} className="flex-shrink-0 text-slate-300" />
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-[var(--text-dim)]"><Users size={12} /> {num(c.total)}명</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 size={12} /> 읽음 {num(c.readCount)}</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-400"><Circle size={12} /> 안읽음 {num(c.unreadCount)}</span>
                        <span className="ml-auto text-[var(--text-dim)]">{kst(c.createdAt)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: rate + '%' }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ── 상세 모달: 회원별 읽음/안읽음 ── */}
      {openId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenId(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
              <div className="flex items-center gap-2 font-bold"><Eye size={16} /> {detail?.campaign?.title || '읽음 현황'}</div>
              <button onClick={() => setOpenId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="border-b border-[var(--border)] px-5 py-2.5">
              <div className="flex gap-1.5">
                {([['all', '전체'], ['read', '읽음'], ['unread', '안읽음']] as ['all' | 'read' | 'unread', string][]).map(([f, l]) => {
                  const cnt = f === 'all' ? (detail?.recipients.length || 0) : f === 'read' ? (detail?.campaign?.readCount ?? (detail?.recipients.filter((r) => r.read).length || 0)) : (detail?.recipients.filter((r) => !r.read).length || 0)
                  return (
                    <button key={f} onClick={() => setRFilter(f)}
                      className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', rFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                      {l} {num(cnt)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-dim)]"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
              ) : shownRecipients.length === 0 ? (
                <div className="py-16 text-center text-sm text-[var(--text-dim)]">해당하는 회원이 없습니다.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-[var(--text-dim)]">
                    <tr><th className="px-5 py-2 text-left font-semibold">회원</th><th className="px-3 py-2 text-left font-semibold">이메일</th><th className="px-3 py-2 text-center font-semibold">상태</th><th className="px-5 py-2 text-right font-semibold">읽은 시각</th></tr>
                  </thead>
                  <tbody>
                    {shownRecipients.map((r) => (
                      <tr key={r.userId} className="border-t border-[var(--border)]">
                        <td className="px-5 py-2 font-semibold">{r.name}</td>
                        <td className="px-3 py-2 text-[var(--text-dim)]">{r.email}</td>
                        <td className="px-3 py-2 text-center">
                          {r.read
                            ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12} /> 읽음</span>
                            : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500"><Circle size={12} /> 안읽음</span>}
                        </td>
                        <td className="px-5 py-2 text-right text-xs text-[var(--text-dim)]">{r.read ? kst(r.readAt) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
