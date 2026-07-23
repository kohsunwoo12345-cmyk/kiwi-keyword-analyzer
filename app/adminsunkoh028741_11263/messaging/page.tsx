'use client'

import { useEffect, useState } from 'react'
import { Send, Phone, Plus, RefreshCw, Check, X, Trash2, Loader2, MessageCircle, ShieldCheck, KeyRound, Mail } from 'lucide-react'
import { MktCanvas, MktHeader, MktPanel, MktButton } from '@/components/marketing/node'
import { EmojiText } from '@/components/Emoji'
import { adminSenders, adminSenderAdd, adminSenderAction, kakaoChannels, kakaoChannelAuth, kakaoChannelAdd, kakaoCategories, adminSendEmail, type AdminSender, type KakaoChannel } from '@/lib/auth'
import { cn } from '@/lib/utils'

const kst = (iso?: string | null) => { if (!iso) return '-'; try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso || '-' } }
const fmtPhone = (p: string) => (p || '').replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3')

export default function MessagingPage() {
  return (
    <MktCanvas>
      <MktHeader icon={Send} eyebrow="MESSAGING" title="발송 설정" desc="문자 발신번호·카카오 알림톡 채널·이메일(Resend)을 관리자가 직접 등록·발송합니다. 등록된 발신번호·채널은 마케팅 자동화·CRM 발송에서 바로 사용됩니다." />
      <div className="grid gap-4 lg:grid-cols-2">
        <SenderSection />
        <KakaoSection />
      </div>
      <div className="mt-4">
        <EmailSection />
      </div>
    </MktCanvas>
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
    <MktPanel icon={Phone} title="문자 발신번호" action={<button onClick={load} className="text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /></button>}>
      <p className="mb-3 text-xs text-[var(--mkt-text-dim)]">발신번호는 통신사 정책상 <b>알리고에 사전등록·인증된 번호</b>여야 실제 발송됩니다. 여기서 등록하면 <b>즉시 승인</b>되어 발송에 바로 사용됩니다.</p>
      {envSender && <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-[#10b981]/15 px-2.5 py-1 text-xs font-semibold text-[#059669]"><ShieldCheck size={12} /> 시스템 기본 발신번호: {fmtPhone(envSender)}</div>}
      <div className="mb-3 flex gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="발신번호 (예: 025771000)" className="input flex-1" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="이름표(선택)" className="input w-28" />
        <MktButton onClick={add} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 등록</MktButton>
      </div>
      {msg && <div className="mb-3 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm font-semibold text-[var(--mkt-text-soft)]"><EmojiText>{msg}</EmojiText></div>}
      {senders.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--mkt-text-dim)]">{loading ? '불러오는 중…' : '등록된 발신번호가 없습니다.'}</div>
      ) : (
        <div className="space-y-1.5">
          {senders.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <span className="font-bold">{fmtPhone(s.phone)}</span>
              {s.label && <span className="text-xs text-[var(--mkt-text-dim)]">{s.label}</span>}
              <span className="text-[10px] text-[var(--mkt-text-dim)]">· {s.ownerName}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold', s.status === 'approved' ? 'bg-[#10b981]/15 text-[#059669]' : s.status === 'pending' ? 'bg-[#ffd66b]/12 text-[#b45309]' : 'bg-[var(--panel-2)] text-[var(--mkt-text-dim)]')}>{s.status === 'approved' ? '승인' : s.status === 'pending' ? '대기' : '반려'}</span>
              {s.status === 'pending' && <button onClick={() => act('approve', s.id)} title="승인" className="rounded p-1 text-[#059669] hover:bg-[var(--panel-2)]"><Check size={14} /></button>}
              {s.status === 'pending' && <button onClick={() => act('reject', s.id)} title="반려" className="rounded p-1 text-[#b45309] hover:bg-[var(--panel-2)]"><X size={14} /></button>}
              <button onClick={() => act('delete', s.id)} title="삭제" className="rounded p-1 text-[var(--mkt-text-dim)] hover:bg-[#ff9b9b]/12 hover:text-[#e11d48]"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </MktPanel>
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
    if (!plusid.trim() || phone.replace(/\D/g, '').length < 10) { setMsg('채널 검색용 아이디와 관리자 휴대폰번호를 입력하세요.'); return }
    setBusy(true); setMsg('')
    const r = await kakaoChannelAuth(plusid.trim().replace(/^@/, ''), phone.replace(/\D/g, ''))
    setBusy(false)
    if (r.ok) { setStep(2); setMsg('✅ ' + (r.note || '카카오톡으로 인증번호가 발송되었습니다.')) } else setMsg('❌ ' + (r.error || '인증번호 요청 실패'))
  }
  async function complete() {
    if (!authnum.trim()) { setMsg('인증번호를 입력하세요.'); return }
    if (!cat) { setMsg('카카오 채널 카테고리를 선택하세요. (발신프로필 등록 필수)'); return }
    setBusy(true); setMsg('')
    const r = await kakaoChannelAdd({ plusid: plusid.trim().replace(/^@/, ''), phone: phone.replace(/\D/g, ''), authnum: authnum.trim(), categorycode: cat })
    setBusy(false)
    if (r.ok) { setMsg('✅ 채널 등록 완료! 이제 알림톡 템플릿을 만들 수 있어요.'); setStep(1); setPlusid(''); setPhone(''); setAuthnum(''); setCat(''); load() } else setMsg('❌ ' + (r.error || '채널 등록 실패'))
  }

  return (
    <MktPanel icon={MessageCircle} title="카카오 알림톡 채널" action={<button onClick={load} className="text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /></button>}>
      <p className="mb-2 text-xs text-[var(--mkt-text-dim)]">카카오 채널을 등록하면 <b>발신프로필(senderKey)</b>이 발급되어 알림톡을 보낼 수 있습니다. 채널 관리자 카카오톡으로 인증번호가 발송됩니다.</p>
      <div className="mb-3 rounded-lg border border-[#ffd66b]/25 bg-[#ffd66b]/12 px-3 py-2 text-[11px] leading-relaxed text-[#b45309]">
        <b>등록 전 확인</b> — ① 카카오톡 채널 관리자센터에서 채널을 개설하고 <b>검색용 아이디</b>를 설정하세요.
        ② 채널 관리자센터 → 채널 설정 → <b>관리자 알림</b>에 아래 <b>휴대폰번호를 관리자 알림 수신번호로 등록</b>해야 인증번호가 도착합니다.
        (미등록 시 &quot;존재하지 않는 카카오톡 채널&quot; 오류)
      </div>

      {channels.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {channels.map((c) => (
            <div key={c.channelId} className="flex items-center gap-2 rounded-lg border border-[#10b981]/25 bg-[#10b981]/15 px-3 py-2 text-sm">
              <ShieldCheck size={14} className="text-[#059669]" />
              <span className="font-bold">{c.channelName || c.searchId}</span>
              {c.phoneNumber && <span className="text-xs text-[var(--mkt-text-dim)]">{fmtPhone(c.phoneNumber)}</span>}
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-[#059669]"><KeyRound size={10} /> 등록됨</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--mkt-text-dim)]">
          <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', step === 1 ? 'bg-[#5b6cff] text-white' : 'bg-[#10b981] text-white')}>1</span> 채널 인증
          <span className="mx-1 text-[var(--mkt-text-dim)]">→</span>
          <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', step === 2 ? 'bg-[#5b6cff] text-white' : 'bg-[var(--panel-2)] text-[var(--mkt-text-dim)]')}>2</span> 등록 완료
        </div>
        {step === 1 ? (
          <div className="space-y-2">
            <input value={plusid} onChange={(e) => setPlusid(e.target.value)} placeholder="채널 검색용 아이디 (예: @bygency)" className="input w-full" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="채널 관리자 휴대폰번호" className="input w-full" />
            <MktButton onClick={reqAuth} disabled={busy} className="w-full">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 인증번호 요청</MktButton>
          </div>
        ) : (
          <div className="space-y-2">
            <input value={authnum} onChange={(e) => setAuthnum(e.target.value)} placeholder="카카오톡으로 받은 인증번호" className="input w-full" />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="input w-full">
              <option value="">카테고리 선택 (필수)</option>
              {cats.map((c, i) => <option key={i} value={catCode(c)}>{catName(c)}</option>)}
            </select>
            {cats.length === 0 && <p className="text-[11px] text-[#e11d48]">카테고리를 불러오지 못했습니다. 알리고 환경변수(ALIGO_API_KEY/ALIGO_ID_KEY)를 확인하세요.</p>}
            <div className="flex gap-2">
              <MktButton variant="ghost" onClick={() => { setStep(1); setMsg('') }}>← 이전</MktButton>
              <MktButton onClick={complete} disabled={busy} className="flex-1">{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 채널 등록 완료</MktButton>
            </div>
          </div>
        )}
      </div>
      {msg && <div className="mt-3 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm font-semibold text-[var(--mkt-text-soft)]"><EmojiText>{msg}</EmojiText></div>}
    </MktPanel>
  )
}

// ── 이메일 발송 (Resend) — 직접 수신자 또는 마케팅 수신동의 세그먼트 ──
function EmailSection() {
  const [mode, setMode] = useState<'direct' | 'segment'>('direct')
  const [to, setTo] = useState('')
  const [seg, setSeg] = useState<'all' | 'plan' | 'active'>('all')
  const [plan, setPlan] = useState('Plus')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function send() {
    if (!subject.trim()) { setMsg('이메일 제목을 입력하세요.'); return }
    if (!content.trim()) { setMsg('이메일 내용을 입력하세요.'); return }
    if (mode === 'direct' && !to.trim()) { setMsg('수신 이메일을 입력하세요.'); return }
    if (mode === 'segment' && !confirm(`${seg === 'all' ? '전체' : seg === 'active' ? '최근 활동' : plan} 수신동의 회원에게 이메일을 발송할까요?`)) return
    setBusy(true); setMsg('')
    const r = await adminSendEmail({
      to: mode === 'direct' ? to.trim() : undefined,
      segment: mode === 'segment' ? seg : undefined,
      plan: mode === 'segment' && seg === 'plan' ? plan : undefined,
      subject: subject.trim(),
      content: content.trim(),
    })
    setBusy(false)
    if (r.ok) { setMsg(`✅ 발송 완료 · 성공 ${r.sent || 0}건${r.failed ? ` · 실패 ${r.failed}건` : ''} (대상 ${r.total || 0}명)`); setContent('') }
    else setMsg('❌ ' + (r.error || '발송 실패'))
  }

  return (
    <MktPanel icon={Mail} title="이메일 발송 (Resend)">
      <p className="mb-3 text-xs text-[var(--mkt-text-dim)]">Resend로 실제 이메일을 발송합니다. 상단에 로고가 포함되고, 세그먼트 발송 시 광고 표기·수신거부 안내가 자동 부착됩니다. 발송 이력은 <b>이메일 발송 기록</b>에서 확인할 수 있어요.</p>
      <div className="mb-3 flex gap-1.5">
        {([['direct', '직접 수신자'], ['segment', '회원 세그먼트']] as ['direct' | 'segment', string][]).map(([v, l]) => (
          <button key={v} onClick={() => setMode(v)} className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold', mode === v ? 'border-[#7c3aed] bg-[#7c3aed]/12 text-[#4f46e5]' : 'border-[var(--border)] text-[var(--mkt-text-soft)] hover:bg-[var(--panel-2)]')}>{l}</button>
        ))}
      </div>
      {mode === 'direct' ? (
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="수신 이메일 (여러 명은 쉼표로 구분)" className="input mb-2 w-full" />
      ) : (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {([['all', '전체 회원'], ['active', '최근 30일 활동'], ['plan', '요금제별']] as ['all' | 'active' | 'plan', string][]).map(([v, l]) => (
            <button key={v} onClick={() => setSeg(v)} className={cn('rounded-lg border px-3 py-1.5 text-sm font-semibold', seg === v ? 'border-[#7c3aed] bg-[#7c3aed]/12 text-[#4f46e5]' : 'border-[var(--border)] text-[var(--mkt-text-soft)] hover:bg-[var(--panel-2)]')}>{l}</button>
          ))}
          {seg === 'plan' && <select value={plan} onChange={(e) => setPlan(e.target.value)} className="input">{['없음', 'Plus', 'Pro', 'Max'].map((p) => <option key={p} value={p}>{p}</option>)}</select>}
        </div>
      )}
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="이메일 제목" className="input mb-2 w-full" />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="이메일 내용. {이름} 은 회원 이름으로 치환됩니다." className="input w-full resize-none" />
      {msg && <div className="mt-3 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm font-semibold text-[var(--mkt-text-soft)]"><EmojiText>{msg}</EmojiText></div>}
      <div className="mt-3 flex justify-end">
        <MktButton onClick={send} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} 이메일 발송</MktButton>
      </div>
    </MktPanel>
  )
}
