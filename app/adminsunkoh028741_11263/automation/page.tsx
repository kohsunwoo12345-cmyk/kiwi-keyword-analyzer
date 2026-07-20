'use client'

import { useEffect, useState } from 'react'
import { Zap, Plus, RefreshCw, MessageSquare, Mail, Send, Clock, Loader2, ArrowRight, Target, Users, Calendar, FlaskConical } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { autoResponses, createAutoResponse, funnelGroups, crmPreview, crmSend, type AutoResponseRule, type FunnelGroup, type CrmPreview, type CrmCampaignRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

const kst = (iso?: string) => { if (!iso) return '-'; try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso } }

const TRIGGERS: { v: string; label: string; desc: string }[] = [
  { v: 'form_submit', label: '신청 폼 제출', desc: '랜딩페이지에서 신청서를 제출했을 때' },
  { v: 'page_view', label: '페이지 방문', desc: '퍼널 페이지를 방문했을 때' },
  { v: 'signup', label: '신규 가입', desc: '회원이 새로 가입했을 때' },
]
const TIMINGS: { v: string; label: string }[] = [
  { v: 'immediate', label: '즉시' },
  { v: '5min', label: '5분 후' },
  { v: '1hour', label: '1시간 후' },
  { v: '1day', label: '1일 후' },
]
const TYPES: { v: string; label: string; icon: typeof Send }[] = [
  { v: 'sms', label: '문자(SMS)', icon: MessageSquare },
  { v: 'alimtalk', label: '알림톡', icon: Send },
  { v: 'email', label: '이메일', icon: Mail },
]

export default function AutomationPage() {
  const [rules, setRules] = useState<AutoResponseRule[]>([])
  const [groups, setGroups] = useState<FunnelGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [trigger, setTrigger] = useState('form_submit')
  const [timing, setTiming] = useState('immediate')
  const [type, setType] = useState('sms')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [groupId, setGroupId] = useState<number | ''>('')
  const [sender, setSender] = useState('')

  const load = () => { setLoading(true); autoResponses().then((d) => { setRules(d.rules); setLoading(false) }); funnelGroups().then((d) => setGroups(d.groups)) }
  useEffect(() => { load() }, [])

  async function addRule() {
    if (!content.trim()) { setMsg('발송할 메시지 내용을 입력하세요.'); return }
    if (type !== 'email' && !sender.trim()) { setMsg('문자·알림톡은 발신번호가 필요합니다.'); return }
    setSaving(true); setMsg('')
    const r = await createAutoResponse({ type, trigger, timing, subject: subject.trim(), content: content.trim(), group_id: groupId === '' ? null : Number(groupId), sender_number: sender.trim() })
    setSaving(false)
    if (r.ok) { setContent(''); setSubject(''); load(); setMsg('✅ 자동화 규칙이 추가되었습니다.') }
    else setMsg(r.error || '저장 실패')
  }

  const trigLabel = (v: string) => TRIGGERS.find((t) => t.v === v)?.label || v
  const timeLabel = (v: string) => TIMINGS.find((t) => t.v === v)?.label || v
  const typeLabel = (v: string) => TYPES.find((t) => t.v === v)?.label || v

  return (
    <div>
      <PageHeader icon={Zap} eyebrow="AUTOMATION" title="마케팅 자동화" desc="트리거(신청·방문·가입)가 발생하면 정해진 시점에 문자·알림톡·이메일을 자동 발송하는 시나리오를 만듭니다. 알리고 발신번호로 실제 발송됩니다." />

      <CrmCampaign />


      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* 시나리오 생성 */}
        <Panel title="새 자동화 시나리오">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[var(--text-dim)]">1. 트리거 (WHEN)</label>
              <div className="space-y-1.5">
                {TRIGGERS.map((t) => (
                  <button key={t.v} onClick={() => setTrigger(t.v)} className={cn('flex w-full items-start gap-2 rounded-lg border p-2.5 text-left', trigger === t.v ? 'border-indigo-400 bg-indigo-50' : 'border-[var(--border)] hover:bg-slate-50')}>
                    <span className={cn('mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2', trigger === t.v ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300')} />
                    <div><div className="text-sm font-semibold">{t.label}</div><div className="text-[11px] text-[var(--text-dim)]">{t.desc}</div></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--text-dim)]">2. 발송 시점</label>
                <select value={timing} onChange={(e) => setTiming(e.target.value)} className="input w-full">
                  {TIMINGS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--text-dim)]">대상 퍼널(선택)</label>
                <select value={groupId} onChange={(e) => setGroupId(e.target.value === '' ? '' : Number(e.target.value))} className="input w-full">
                  <option value="">전체</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[var(--text-dim)]">3. 발송 채널 (ACTION)</label>
              <div className="flex gap-1.5">
                {TYPES.map((t) => { const I = t.icon; return (
                  <button key={t.v} onClick={() => setType(t.v)} className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold', type === t.v ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50')}>
                    <I size={13} /> {t.label}
                  </button>
                )})}
              </div>
            </div>

            {type !== 'email' && (
              <input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="발신번호 (예: 025771000)" className="input w-full" />
            )}
            {type === 'email' && (
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="이메일 제목" className="input w-full" />
            )}
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="발송할 메시지 내용을 입력하세요. (예: 신청 감사합니다! 곧 담당자가 연락드릴게요.)" className="input w-full resize-none" />

            {msg && <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-[var(--text-soft)]">{msg}</div>}

            <button onClick={addRule} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} 자동화 규칙 추가
            </button>
          </div>
        </Panel>

        {/* 규칙 목록 */}
        <Panel title={`자동화 규칙 ${rules.length}개`} action={<button onClick={load} className="text-[var(--text-dim)] hover:text-[var(--text)]"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /></button>}>
          {rules.length === 0 ? (
            <div className="py-14 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '아직 자동화 규칙이 없습니다. 왼쪽에서 만들어 보세요.'}</div>
          ) : (
            <div className="space-y-2.5">
              {rules.map((r) => (
                <div key={r.id} className="rounded-xl border border-[var(--border)] p-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">{trigLabel(r.trigger)}</span>
                    <ArrowRight size={13} className="text-slate-300" />
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600"><Clock size={11} /> {timeLabel(r.timing)}</span>
                    <ArrowRight size={13} className="text-slate-300" />
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">{typeLabel(r.type)}</span>
                    <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold', r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{r.status === 'active' ? '활성' : r.status}</span>
                  </div>
                  {r.subject && <div className="mt-2 text-sm font-bold">{r.subject}</div>}
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-soft)]">{r.content}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-dim)]">
                    {r.group_name && <span>퍼널: {r.group_name}</span>}
                    {r.sender_number && <span>발신: {r.sender_number}</span>}
                    <span className="ml-auto">{kst(r.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

// ── 실제 회원 대상 CRM 타깃 마케팅 발송 (문자/알림톡, 즉시 또는 KST 예약) ──
function CrmCampaign() {
  const [pv, setPv] = useState<CrmPreview | null>(null)
  const [camps, setCamps] = useState<CrmCampaignRow[]>([])
  const [seg, setSeg] = useState<'all' | 'plan' | 'active'>('all')
  const [plan, setPlan] = useState('Plus')
  const [channel, setChannel] = useState<'sms' | 'alimtalk'>('sms')
  const [content, setContent] = useState('')
  const [sender, setSender] = useState('')
  const [tplCode, setTplCode] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => { crmPreview().then((d) => { setPv(d.preview || null); setCamps(d.campaigns) }) }
  useEffect(() => { load() }, [])

  const target = seg === 'all' ? (pv?.all || 0) : seg === 'active' ? (pv?.active || 0) : ((pv?.byPlan || []).find((p) => p.plan === plan)?.n || 0)

  async function send(test: boolean) {
    if (!content.trim()) { setMsg('발송 내용을 입력하세요.'); return }
    if (channel !== 'alimtalk' && !sender.trim()) { setMsg('발신번호가 필요합니다.'); return }
    if (test && testPhone.trim().replace(/\D/g, '').length < 10) { setMsg('테스트 번호를 정확히 입력하세요.'); return }
    if (!test && !confirm(`${seg === 'all' ? '전체' : seg === 'active' ? '최근 활동' : plan} 수신동의 회원 ${target}명에게 ${scheduleAt ? 'KST 예약' : '즉시'} 발송할까요?`)) return
    setBusy(true); setMsg('')
    const r = await crmSend({ segment: seg, plan: seg === 'plan' ? plan : undefined, channel, content: content.trim(), sender: sender.trim(), scheduleAt: scheduleAt || undefined, tplCode: tplCode.trim() || undefined, test, testPhone: testPhone.trim() })
    setBusy(false)
    if (r.ok) { setMsg(test ? `✅ 테스트 발송 완료 (${r.sent || 0}건)` : `✅ ${r.reserved ? `예약 ${r.reserved}건 (${r.reservedAtKst} KST)` : `발송 ${r.sent}건`} · 실패 ${r.errors || 0}`); if (!test) load() }
    else setMsg('❌ ' + (r.error || '발송 실패'))
  }

  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Target size={16} /> CRM 타깃 발송 · 실제 회원 대상</span>} className="mb-4">
      <p className="mb-3 text-xs text-[var(--text-dim)]">마케팅 <b>수신동의</b> 회원만 대상으로, 세그먼트별로 문자·알림톡을 즉시 또는 한국시간 예약 발송합니다. 광고성 메시지는 <b>(광고)·무료수신거부</b>가 자동 부착됩니다(법적 필수).</p>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--text-dim)]">타깃 세그먼트</label>
            <div className="flex flex-wrap gap-1.5">
              {([['all', '전체 회원'], ['active', '최근 30일 활동'], ['plan', '요금제별']] as ['all' | 'active' | 'plan', string][]).map(([v, l]) => (
                <button key={v} onClick={() => setSeg(v)} className={cn('rounded-lg border px-3 py-1.5 text-sm font-semibold', seg === v ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50')}>{l}</button>
              ))}
              {seg === 'plan' && (
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className="input">
                  {['없음', 'Plus', 'Pro', 'Max'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><Users size={12} /> 대상 {target.toLocaleString('ko-KR')}명 (수신동의)</div>
          </div>
          <div className="flex gap-1.5">
            {([['sms', '문자(SMS/LMS)'], ['alimtalk', '알림톡']] as ['sms' | 'alimtalk', string][]).map(([v, l]) => (
              <button key={v} onClick={() => setChannel(v)} className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold', channel === v ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50')}>{v === 'sms' ? <MessageSquare size={13} /> : <Send size={13} />} {l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="발신번호 (예: 025771000)" className="input w-full" />
            {channel === 'alimtalk' && <input value={tplCode} onChange={(e) => setTplCode(e.target.value)} placeholder="알림톡 템플릿 코드" className="input w-full" />}
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="발송 내용. {이름} 은 회원 이름으로 치환됩니다. (예: {이름}님, 이번 주 20% 할인 이벤트!)" className="input w-full resize-none" />
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--text-dim)]"><Calendar size={12} className="mr-1 inline" /> 예약 발송 (한국시간, 비우면 즉시)</label>
            <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="input w-full" />
          </div>
          {msg && <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-[var(--text-soft)]">{msg}</div>}
          <div className="flex gap-2">
            <div className="flex flex-1 gap-2">
              <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="테스트 수신번호" className="input flex-1" />
              <button onClick={() => send(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--text-soft)] hover:bg-slate-50 disabled:opacity-60"><FlaskConical size={14} /> 테스트</button>
            </div>
            <button onClick={() => send(false)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {scheduleAt ? '예약 발송' : '지금 발송'}</button>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold text-[var(--text-dim)]">최근 캠페인</div>
          {camps.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-xs text-[var(--text-dim)]">발송 이력이 없습니다.</div> : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto">
              {camps.map((c) => (
                <div key={c.id} className="rounded-xl border border-[var(--border)] p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">{c.segment}{c.plan ? `·${c.plan}` : ''}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{c.channel === 'sms' ? '문자' : '알림톡'}</span>
                    <span className={cn('ml-auto rounded px-1.5 py-0.5 font-bold', c.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : c.status === 'reserved' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>{c.status === 'reserved' ? '예약' : c.status === 'sent' ? '발송완료' : c.status}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[var(--text-soft)]">{c.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-dim)]">
                    <span>대상 {c.total} · 발송 {c.sent}{c.reserved ? ` · 예약 ${c.reserved}` : ''}</span>
                    {c.schedule_at && <span>· 예약 {c.schedule_at.replace('T', ' ')}</span>}
                    <span className="ml-auto">{(() => { try { return new Date(c.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' } })()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
