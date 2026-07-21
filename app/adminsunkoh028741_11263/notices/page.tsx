'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Send, ImagePlus, Link2, RefreshCw, X, CheckCircle2, Circle, Users, Loader2, Eye, ChevronRight, Film, Clock, MoonStar } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import {
  adminNoticeList, adminNoticeSend, adminNoticeDetail, adminUsers,
  type AdminNoticeCampaign, type NoticeRecipient, type User,
  type VisitorStat, type NoticeVisitorEvent,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const kst = (iso?: string | null) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
const num = (n: number) => (n || 0).toLocaleString('ko-KR')
type Target = 'all' | 'plan' | 'multi' | 'visitors'
const memberLabel = (m: number) => m === 1 ? '회원(로그인)' : m === 2 ? '회원 IP' : '비회원'

export default function NoticesPage() {
  // 발송 폼 상태
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [days, setDays] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [target, setTarget] = useState<Target>('all')
  const [plan, setPlan] = useState('Plus')
  const [scopePath, setScopePath] = useState('')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadingV, setUploadingV] = useState(false)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  // 목록/상세
  const [campaigns, setCampaigns] = useState<AdminNoticeCampaign[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ recipients: NoticeRecipient[]; campaign?: AdminNoticeCampaign; visitorStats?: { views: VisitorStat; reads: VisitorStat; conversions: VisitorStat }; visitorEvents?: NoticeVisitorEvent[] } | null>(null)
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

  // 업로드 전 항상 JPEG 로 재인코딩(아이폰 HEIC·큰 사진 대응). 브라우저가 못 여는 경우만 원본 업로드.
  async function toJpegBlob(file: File): Promise<{ blob: Blob; type: string }> {
    try {
      const bmp = await createImageBitmap(file)
      const max = 1600
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
      const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale))
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('ctx')
      ctx.drawImage(bmp, 0, 0, w, h)
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.88))
      if (!blob) throw new Error('encode')
      return { blob, type: 'image/jpeg' }
    } catch {
      return { blob: file, type: file.type || 'application/octet-stream' }   // 폴백: 원본
    }
  }
  async function onUpload(file: File) {
    setUploading(true); setMsg('')
    try {
      const { blob, type } = await toJpegBlob(file)
      const r = await fetch('/api/upload', { method: 'POST', credentials: 'include', headers: { 'Content-Type': type }, body: blob })
      const txt = await r.text()
      let d: any = {}; try { d = JSON.parse(txt) } catch {}
      if (r.ok && d.url) setImageUrl(d.url)
      else setMsg('업로드 실패 (' + r.status + '): ' + (d.error || txt.slice(0, 120)))
    } catch (e: any) { setMsg('업로드 실패: ' + String(e?.message || e).slice(0, 100)) }
    setUploading(false)
  }
  async function onUploadVideo(file: File) {
    if (file.size > 60 * 1024 * 1024) { setMsg('동영상은 60MB 이하만 업로드할 수 있어요. 큰 파일은 URL로 붙여넣어 주세요.'); return }
    setUploadingV(true); setMsg('')
    try {
      const r = await fetch('/api/upload', { method: 'POST', credentials: 'include', headers: { 'Content-Type': file.type || 'video/mp4' }, body: file })
      const txt = await r.text()
      let d: any = {}; try { d = JSON.parse(txt) } catch {}
      if (r.ok && d.url) setVideoUrl(d.url)
      else setMsg('동영상 업로드 실패 (' + r.status + '): ' + (d.error || txt.slice(0, 120)))
    } catch (e: any) { setMsg('동영상 업로드 실패: ' + String(e?.message || e).slice(0, 100)) }
    setUploadingV(false)
  }

  async function onSend() {
    if (!title.trim() || !body.trim()) { setMsg('제목과 내용을 입력하세요.'); return }
    if (target === 'multi' && pickedIds.length === 0) { setMsg('발송할 회원을 선택하세요.'); return }
    if (ctaLabel.trim() && !ctaUrl.trim()) { setMsg('CTA 버튼 텍스트가 있으면 이동 URL도 입력하세요.'); return }
    const label = target === 'all' ? '전체 회원' : target === 'plan' ? `${plan} 요금제`
      : target === 'visitors' ? (scopePath.trim() ? `접속 전체 · ${scopePath.trim()} 방문자` : '접속 전체(비회원 포함)') : `선택 ${pickedIds.length}명`
    if (!confirm(`${label}에게 알림을 발송할까요?\n발송 후에는 즉시 팝업으로 표시됩니다.`)) return
    setSending(true); setMsg('')
    const res = await adminNoticeSend({
      title: title.trim(), body: body.trim(),
      imageUrl: imageUrl.trim() || undefined, videoUrl: videoUrl.trim() || undefined,
      ctaLabel: ctaLabel.trim() || undefined, ctaUrl: ctaUrl.trim() || undefined,
      target, plan: target === 'plan' ? plan : undefined, userIds: target === 'multi' ? pickedIds : undefined,
      scopePath: target === 'visitors' ? (scopePath.trim() || undefined) : undefined,
      days: target === 'visitors' && Number(days) > 0 ? Number(days) : undefined,
    })
    setSending(false)
    if (res.ok) {
      setMsg(target === 'visitors' ? `✅ 접속 전체(비회원 포함) 발송 완료 — ${Number(days) > 0 ? `${days}일 동안 ` : ''}방문 즉시 팝업으로 표시됩니다.` : `✅ ${num(res.audience || 0)}명에게 발송 완료`)
      setTitle(''); setBody(''); setImageUrl(''); setVideoUrl(''); setDays(''); setCtaLabel(''); setCtaUrl(''); setPicked({}); setScopePath('')
      load()
    } else setMsg(res.error || '발송 실패')
  }

  function openDetail(id: string) {
    setOpenId(id); setDetail(null); setDetailLoading(true); setRFilter('all')
    adminNoticeDetail(id).then((d) => {
      setDetail({ recipients: d.recipients || [], campaign: d.campaign, visitorStats: d.visitorStats, visitorEvents: d.visitorEvents }); setDetailLoading(false)
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
      <PageHeader icon={Bell} eyebrow="NOTICE" title="알림" desc="회원 또는 접속 전체(비회원 포함)에게 하단→상단 슬라이드 팝업을 발송합니다. 사진·CTA를 담고, 노출·읽음(X)·전환·접속 IP(회원/비회원)까지 확인할 수 있어요." />

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

              {/* 동영상 (선택) — 크기 맞춤형 자동재생 + 소리 ON */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">동영상 (선택 · 자동재생/소리 ON)</label>
                {videoUrl ? (
                  <div className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-black">
                    <video src={videoUrl} className="max-h-40 w-full" controls muted playsInline />
                    <button onClick={() => setVideoUrl('')} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => videoRef.current?.click()} disabled={uploadingV}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text-soft)] hover:bg-slate-50">
                      {uploadingV ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />} 동영상 업로드
                    </button>
                    <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="또는 동영상 URL (mp4 등)" className="input flex-1 text-xs" />
                  </div>
                )}
                <input ref={videoRef} type="file" accept="video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) onUploadVideo(f) }} />
                <p className="mt-1 text-[11px] text-[var(--text-dim)]">동영상이 있으면 사진 대신 동영상이 크기에 맞춰 재생됩니다. (브라우저 정책으로 소리가 막히면 방문자에게 “소리 켜기” 버튼이 표시됩니다.)</p>
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
                  {([['all', '전체 회원'], ['plan', '요금제별'], ['multi', '회원 선택'], ['visitors', '접속 전체(비회원)']] as [Target, string][]).map(([t, l]) => (
                    <button key={t} onClick={() => setTarget(t)}
                      className={cn('rounded-lg border px-3 py-1.5 text-sm font-semibold', target === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50')}>{l}</button>
                  ))}
                </div>
                {target === 'visitors' && (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5">
                    <p className="text-[11px] leading-relaxed text-blue-700">홈페이지·랜딩에 <b>접속한 모든 사람(비회원 포함)</b>에게 접속 즉시 하단→상단 슬라이드 팝업으로 표시됩니다. X를 누르면 읽음 처리돼요.</p>
                    <label className="mb-1 mt-2 block text-[11px] font-semibold text-[var(--text-dim)]">특정 랜딩 경로만 (선택 · 비우면 전체 페이지)</label>
                    <input value={scopePath} onChange={(e) => setScopePath(e.target.value)} placeholder="예) /f/f-abc123 (우리 빌더로 만든 랜딩 경로)" className="input w-full text-xs" />
                    <label className="mb-1 mt-2 flex items-center gap-1 text-[11px] font-semibold text-[var(--text-dim)]"><Clock size={12} /> 노출 기간 (일 · 비우면 30일)</label>
                    <input value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="예) 7 → 7일 동안 접속자 모두에게 계속 노출" className="input w-full text-xs" />
                    <p className="mt-1 text-[11px] text-blue-600">설정한 기간 동안 접속한 모든 사람에게 계속 표시됩니다. 방문자가 “3일 동안 보지 않기”를 누르면 그 사람에게만 3일간 숨겨지고, 이후 기간이 유지 중이면 다시 표시됩니다.</p>
                  </div>
                )}
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
                    <div className="mt-1 text-right text-[11px] font-semibold text-blue-600">{pickedIds.length}명 선택됨</div>
                  </div>
                )}
              </div>

              {msg && <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-[var(--text-soft)]">{msg}</div>}

              <button onClick={onSend} disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 알림 발송
              </button>
            </div>
          </Panel>

          {/* 미리보기 */}
          <Panel title="미리보기 (사용자 화면)">
            <div className="mx-auto max-w-xs overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-lg">
              {videoUrl
                ? <video src={videoUrl} className="max-h-40 w-full bg-black" controls muted playsInline />
                : imageUrl && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={imageUrl} alt="" className="max-h-36 w-full object-cover" />)}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-extrabold">{title || '알림 제목'}</div>
                  <X size={16} className="mt-0.5 flex-shrink-0 text-slate-400" />
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{body || '알림 내용이 여기에 표시됩니다.'}</p>
                {ctaLabel && <div className="mt-3 rounded-lg bg-blue-600 py-2 text-center text-xs font-bold text-white">{ctaLabel}</div>}
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
                            {c.target === 'visitors' && <span className="flex-shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">접속 전체</span>}
                            {c.endAt && <span className="flex-shrink-0 inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600"><Clock size={9} /> 기간</span>}
                            {c.videoUrl && <Film size={12} className="flex-shrink-0 text-slate-400" />}
                            {c.imageUrl && !c.videoUrl && <ImagePlus size={12} className="flex-shrink-0 text-slate-400" />}
                            {c.ctaUrl && <Link2 size={12} className="flex-shrink-0 text-slate-400" />}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-[var(--text-dim)]">{c.body}</div>
                        </div>
                        <ChevronRight size={16} className="flex-shrink-0 text-slate-300" />
                      </div>
                      {c.target === 'visitors' ? (
                        <div className="mt-2 flex items-center gap-3 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-[var(--text-dim)]"><Eye size={12} /> 노출 {num(c.views ?? c.total)}</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 size={12} /> 읽음 {num(c.readCount)}</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-600"><Link2 size={12} /> 전환 {num(c.conversions ?? 0)}</span>
                          <span className="ml-auto text-[var(--text-dim)]">{kst(c.createdAt)}</span>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-3 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-[var(--text-dim)]"><Users size={12} /> {num(c.total)}명</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 size={12} /> 읽음 {num(c.readCount)}</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-400"><Circle size={12} /> 안읽음 {num(c.unreadCount)}</span>
                          <span className="ml-auto text-[var(--text-dim)]">{kst(c.createdAt)}</span>
                        </div>
                      )}
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
            {!(detail?.campaign?.target === 'visitors' || detail?.visitorStats) && (
              <div className="border-b border-[var(--border)] px-5 py-2.5">
                <div className="flex gap-1.5">
                  {([['all', '전체'], ['read', '읽음'], ['unread', '안읽음']] as ['all' | 'read' | 'unread', string][]).map(([f, l]) => {
                    const cnt = f === 'all' ? (detail?.recipients.length || 0) : f === 'read' ? (detail?.campaign?.readCount ?? (detail?.recipients.filter((r) => r.read).length || 0)) : (detail?.recipients.filter((r) => !r.read).length || 0)
                    return (
                      <button key={f} onClick={() => setRFilter(f)}
                        className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', rFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                        {l} {num(cnt)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="max-h-[62vh] overflow-y-auto">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-dim)]"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
              ) : (detail?.campaign?.target === 'visitors' || detail?.visitorStats) ? (
                <div className="p-5">
                  {/* 방문자(비회원 포함) 성과: 노출 → 읽음 → 전환 */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {([['노출', detail?.visitorStats?.views, 'text-slate-700'], ['읽음(X)', detail?.visitorStats?.reads, 'text-emerald-600'], ['전환(CTA)', detail?.visitorStats?.conversions, 'text-blue-600']] as [string, VisitorStat | undefined, string][]).map(([l, s, c]) => (
                      <div key={l} className="rounded-xl border border-[var(--border)] p-3 text-center">
                        <div className="text-[11px] font-semibold text-[var(--text-dim)]">{l}</div>
                        <div className={cn('mt-0.5 text-2xl font-bold tabular-nums', c)}>{num(s?.total || 0)}</div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-dim)]">회원 {num(s?.members || 0)} · 비회원 {num(s?.guests || 0)}</div>
                      </div>
                    ))}
                    <div className="rounded-xl border border-[var(--border)] p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--text-dim)]"><MoonStar size={11} /> 3일 숨김</div>
                      <div className="mt-0.5 text-2xl font-bold tabular-nums text-amber-600">{num(detail?.visitorStats?.snoozes || 0)}</div>
                      <div className="mt-0.5 text-[10px] text-[var(--text-dim)]">보지 않기 누름</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-dim)]">
                    {detail?.campaign?.scopePath && <span>랜딩 경로: <b className="text-blue-600">{detail.campaign.scopePath}</b></span>}
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> 노출 기간: {detail?.campaign?.endAt ? <b className="text-blue-600">{kst(detail.campaign.startAt || detail.campaign.createdAt)} ~ {kst(detail.campaign.endAt)}</b> : <b>생성 후 30일(기간 미설정)</b>}</span>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-[var(--text-dim)]">접속 IP · 회원/비회원 (최근)</div>
                  <div className="mt-1.5 overflow-hidden rounded-xl border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-[var(--text-dim)]">
                        <tr><th className="px-3 py-2 text-left font-semibold">IP</th><th className="px-3 py-2 text-left font-semibold">구분</th><th className="px-3 py-2 text-left font-semibold">동작</th><th className="px-3 py-2 text-right font-semibold">시각(KST)</th></tr>
                      </thead>
                      <tbody>
                        {(detail?.visitorEvents || []).length === 0 ? (
                          <tr><td colSpan={4} className="px-3 py-8 text-center text-[var(--text-dim)]">아직 접속 기록이 없습니다.</td></tr>
                        ) : (detail?.visitorEvents || []).map((e, i) => (
                          <tr key={i} className="border-t border-[var(--border)]">
                            <td className="px-3 py-2 font-mono text-xs">{e.ip || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', e.isMember ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')}>
                                {memberLabel(e.isMember)}{e.memberEmail ? ` · ${e.memberEmail}` : ''}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-[var(--text-soft)]">{e.kind === 'view' ? '노출' : e.kind === 'read' ? '읽음(X)' : '전환(CTA)'}</td>
                            <td className="px-3 py-2 text-right text-xs text-[var(--text-dim)]">{kst(e.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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
