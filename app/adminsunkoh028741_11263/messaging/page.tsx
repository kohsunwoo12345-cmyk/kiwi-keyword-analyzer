'use client'

import { useEffect, useState } from 'react'
import { Send, Phone, Plus, RefreshCw, Check, X, Trash2, Loader2, MessageCircle, ShieldCheck, KeyRound } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { adminSenders, adminSenderAdd, adminSenderAction, kakaoChannels, kakaoChannelAuth, kakaoChannelAdd, kakaoCategories, type AdminSender, type KakaoChannel } from '@/lib/auth'
import { cn } from '@/lib/utils'

const kst = (iso?: string | null) => { if (!iso) return '-'; try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso || '-' } }
const fmtPhone = (p: string) => (p || '').replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3')

export default function MessagingPage() {
  return (
    <div>
      <PageHeader icon={Send} eyebrow="MESSAGING" title="발송 설정" desc="문자 발신번호와 카카오 알림톡 채널을 관리자가 직접 등록·승인합니다. 등록된 발신번호·채널은 마케팅 자동화·CRM 발송에서 바로 사용됩니다." />
      <div className="grid gap-4 lg:grid-cols-2">
        <SenderSection />
        <KakaoSection />
      </div>
    </div>
  )
}

function SenderSection() {
  const [senders, setSenders] = useState<AdminSender[]>([])
  const [envSender, setEnvSender] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState(''); const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')

  const load = () => { setLoading(true); adminSenders().then((d) => { setSenders(d.senders); setEnvSender(d.envSender || null); setLoading(false) }) }
  useEffect(() => { load() }, [])

  async function add() {
    if (phone.replace(/\D/g, '').length < 9) { setMsg('올바른 번호를 입력하세요.'); return }
    setBusy(true); setMsg('')
    const r = await adminSenderAdd(phone.replace(/\D/g, ''), label.trim())
    setBusy(false)
    if (r.ok) { setPhone(''); setLabel(''); setMsg('✅ ' + (r.message || '등록되었습니다.')); load() } else setMsg('❌ ' + (r.error || '등록 실패'))
  }
  async function act(action: 'approve' | 'reject' | 'delete', id: string) {
    if (action === 'delete' && !confirm('이 발신번호를 삭제할까요?')) return
    await adminSenderAction(action, id); load()
  }

  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Phone size={16} /> 문자 발신번호</span>} action={<button onClick={load} className="text-[var(--text-dim)] hover:text-[var(--text)]"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /></button>}>
      <p className="mb-3 text-xs text-[var(--text-dim)]">발신번호는 통신사 정책상 <b>알리고에 사전등록·인증된 번호</b>여야 실제 발송됩니다. 여기서 등록하면 <b>즉시 승인</b>되어 발송에 바로 사용됩니다.</p>
      {envSender && <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><ShieldCheck size={12} /> 시스템 기본 발신번호: {fmtPhone(envSender)}</div>}
      <div className="mb-3 flex gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="발신번호 (예: 025771000)" className="input flex-1" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="이름표(선택)" className="input w-28" />
        <button onClick={add} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 등록</button>
      </div>
      {msg && <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-[var(--text-soft)]">{msg}</div>}
      {senders.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '등록된 발신번호가 없습니다.'}</div>
      ) : (
        <div className="space-y-1.5">
          {senders.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <span className="font-bold">{fmtPhone(s.phone)}</span>
              {s.label && <span className="text-xs text-[var(--text-dim)]">{s.label}</span>}
              <span className="text-[10px] text-[var(--text-dim)]">· {s.ownerName}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold', s.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : s.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>{s.status === 'approved' ? '승인' : s.status === 'pending' ? '대기' : '반려'}</span>
              {s.status === 'pending' && <button onClick={() => act('approve', s.id)} title="승인" className="rounded p-1 text-emerald-500 hover:bg-emerald-50"><Check size={14} /></button>}
              {s.status === 'pending' && <button onClick={() => act('reject', s.id)} title="반려" className="rounded p-1 text-amber-500 hover:bg-amber-50"><X size={14} /></button>}
              <button onClick={() => act('delete', s.id)} title="삭제" className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function KakaoSection() {
  const [channels, setChannels] = useState<KakaoChannel[]>([])
  const [cats, setCats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [plusid, setPlusid] = useState(''); const [phone, setPhone] = useState('')
  const [authnum, setAuthnum] = useState(''); const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')

  const load = () => { setLoading(true); kakaoChannels().then((d) => { setChannels(d.channels); setLoading(false) }); kakaoCategories().then((d) => setCats(d.categories || [])) }
  useEffect(() => { load() }, [])

  const catCode = (c: any) => c.code || c.categorycode || c.value || c.id || ''
  const catName = (c: any) => c.name || c.category_name || c.categoryName || c.label || catCode(c)

  async function reqAuth() {
    if (!plusid.trim() || phone.replace(/\D/g, '').length < 10) { setMsg('채널 검색용 아이디(@제외)와 관리자 휴대폰번호를 입력하세요.'); return }
    setBusy(true); setMsg('')
    const r = await kakaoChannelAuth(plusid.trim().replace(/^@/, ''), phone.replace(/\D/g, ''))
    setBusy(false)
    if (r.ok) { setStep(2); setMsg('✅ ' + (r.note || '카카오톡으로 인증번호가 발송되었습니다.')) } else setMsg('❌ ' + (r.error || '인증번호 요청 실패'))
  }
  async function complete() {
    if (!authnum.trim()) { setMsg('인증번호를 입력하세요.'); return }
    setBusy(true); setMsg('')
    const r = await kakaoChannelAdd({ plusid: plusid.trim().replace(/^@/, ''), phone: phone.replace(/\D/g, ''), authnum: authnum.trim(), categorycode: cat || undefined })
    setBusy(false)
    if (r.ok) { setMsg('✅ 채널 등록 완료! 이제 알림톡 템플릿을 만들 수 있어요.'); setStep(1); setPlusid(''); setPhone(''); setAuthnum(''); load() } else setMsg('❌ ' + (r.error || '채널 등록 실패'))
  }

  return (
    <Panel title={<span className="inline-flex items-center gap-2"><MessageCircle size={16} /> 카카오 알림톡 채널</span>} action={<button onClick={load} className="text-[var(--text-dim)] hover:text-[var(--text)]"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /></button>}>
      <p className="mb-3 text-xs text-[var(--text-dim)]">카카오 채널을 등록하면 <b>발신프로필(senderKey)</b>이 발급되어 알림톡을 보낼 수 있습니다. 채널 관리자 카카오톡으로 인증번호가 발송됩니다.</p>

      {channels.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {channels.map((c) => (
            <div key={c.channelId} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span className="font-bold">{c.channelName || c.searchId}</span>
              {c.phoneNumber && <span className="text-xs text-[var(--text-dim)]">{fmtPhone(c.phoneNumber)}</span>}
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><KeyRound size={10} /> 등록됨</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-slate-50 p-3.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--text-dim)]">
          <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', step === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white')}>1</span> 채널 인증
          <span className="mx-1 text-slate-300">→</span>
          <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500')}>2</span> 등록 완료
        </div>
        {step === 1 ? (
          <div className="space-y-2">
            <input value={plusid} onChange={(e) => setPlusid(e.target.value)} placeholder="채널 검색용 아이디 (@ 제외, 예: bygency)" className="input w-full" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="채널 관리자 휴대폰번호" className="input w-full" />
            <button onClick={reqAuth} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 인증번호 요청</button>
          </div>
        ) : (
          <div className="space-y-2">
            <input value={authnum} onChange={(e) => setAuthnum(e.target.value)} placeholder="카카오톡으로 받은 인증번호" className="input w-full" />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="input w-full">
              <option value="">카테고리 선택(선택)</option>
              {cats.map((c, i) => <option key={i} value={catCode(c)}>{catName(c)}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => { setStep(1); setMsg('') }} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-soft)] hover:bg-white">← 이전</button>
              <button onClick={complete} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 채널 등록 완료</button>
            </div>
          </div>
        )}
      </div>
      {msg && <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-[var(--text-soft)]">{msg}</div>}
    </Panel>
  )
}
