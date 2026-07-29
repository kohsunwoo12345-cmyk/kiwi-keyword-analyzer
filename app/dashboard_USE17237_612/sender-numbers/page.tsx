'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Phone, Plus, RefreshCw, ShieldCheck, AlertCircle, Send, Trash2, Undo2, Loader2, Info } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, Field, Section, EmptyState, inputCls } from '@/components/dash/Kit'
import { DocSlot } from '@/components/sender/DocSlot'
import { cn } from '@/lib/utils'
import {
  senderRequests, senderCreate, senderSubmit, senderCancel, senderDelete,
  fmtPhone, SENDER_STATUS_TONE, type SenderRequest, type SenderDocSpec,
} from '@/lib/sender'

export default function SenderNumbersPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SenderRequest[]>([])
  const [specs, setSpecs] = useState<Record<string, SenderDocSpec>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [openForm, setOpenForm] = useState(false)

  // 신청 폼
  const [phone, setPhone] = useState('')
  const [label, setLabel] = useState('')
  const [ownerType, setOwnerType] = useState<'personal' | 'business'>('business')
  const [ownerName, setOwnerName] = useState('')
  const [bizNo, setBizNo] = useState('')
  const [thirdParty, setThirdParty] = useState(false)

  const load = useCallback(async () => {
    const r = await senderRequests()
    setRows(r.requests)
    setSpecs(r.specs)
    setLoading(false)
    if (!r.ok && r.error) setMsg({ ok: false, text: r.error })
  }, [])
  useEffect(() => { load() }, [load])

  const approved = useMemo(() => rows.filter((r) => r.status === 'approved'), [rows])

  async function create(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    setBusy('create')
    const r = await senderCreate({ phone, label, ownerType, ownerName, bizNo, thirdParty })
    setBusy('')
    if (!r.ok) { setMsg({ ok: false, text: r.error || '신청서 생성 실패' }); return }
    setPhone(''); setLabel(''); setBizNo(''); setThirdParty(false); setOpenForm(false)
    setMsg({ ok: true, text: '신청서를 만들었습니다. 아래에서 필수 서류를 모두 첨부한 뒤 제출해 주세요.' })
    await load()
  }

  async function act(id: string, fn: () => Promise<any>, okText: string) {
    setMsg(null); setBusy(id)
    const r = await fn()
    setBusy('')
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error || '처리 실패' })
    await load()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Phone}
        eyebrow="SENDER"
        title="발신번호 승인"
        desc="문자·알림톡을 보내려면 통신사 사전등록이 필요합니다. 번호 명의를 증명하는 서류 사진을 모두 첨부해야 승인 신청을 낼 수 있어요."
        action={
          <button onClick={() => { setLoading(true); load() }} className="text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
          </button>
        }
      />

      {msg && (
        <div className={cn('flex items-start gap-2 rounded-xl border px-4 py-3 text-[12.5px]',
          msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-rose-500/30 bg-rose-500/10 text-rose-600')}>
          {msg.ok ? <ShieldCheck size={15} className="mt-px flex-shrink-0" /> : <AlertCircle size={15} className="mt-px flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
        <Info size={15} className="mt-px flex-shrink-0 text-indigo-500" />
        <div className="text-[12px] leading-relaxed text-[var(--text-dim)]">
          <b className="text-[var(--text-soft)]">왜 서류가 필요한가요?</b> 발신번호 변작(스팸·피싱)을 막기 위해 전기통신사업법상 발신번호는
          명의 확인을 거친 번호만 사용할 수 있습니다. 제출한 서류는 승인 심사 목적으로만 쓰이며, 본인과 관리자만 열람할 수 있습니다.
          <span className="ml-1">신분증은 주민등록번호 뒤 7자리를 가려서 올려주세요.</span>
        </div>
      </div>

      <Card
        title="새 발신번호 신청"
        desc={approved.length ? `승인된 발신번호 ${approved.length}개 사용 중` : '아직 승인된 발신번호가 없습니다'}
        action={
          <button
            onClick={() => setOpenForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-600"
          >
            <Plus size={13} /> {openForm ? '닫기' : '신청서 작성'}
          </button>
        }
      >
        {openForm ? (
          <form onSubmit={create} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="발신번호" hint="문자를 보낼 때 수신자에게 표시될 번호">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-577-1000 또는 010-0000-0000" className={inputCls} />
              </Field>
              <Field label="표시 이름" optional hint="목록에서 구분하기 위한 메모">
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="대표번호" className={inputCls} />
              </Field>
            </div>
            <Field label="명의 구분" hint="번호가 등록된 명의에 따라 필요한 서류가 달라집니다.">
              <div className="flex gap-2">
                {(['business', 'personal'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOwnerType(t)}
                    className={cn(
                      'flex-1 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-colors',
                      ownerType === t
                        ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-600'
                        : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)] hover:text-[var(--text)]',
                    )}
                  >
                    {t === 'business' ? '사업자·법인' : '개인'}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={ownerType === 'business' ? '상호(사업자명)' : '명의자 이름'}>
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={ownerType === 'business' ? '주식회사 비젠시' : '홍길동'} className={inputCls} />
              </Field>
              {ownerType === 'business' && (
                <Field label="사업자등록번호" hint="숫자 10자리">
                  <input value={bizNo} onChange={(e) => setBizNo(e.target.value)} placeholder="1234567890" className={inputCls} />
                </Field>
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-3">
              <input type="checkbox" checked={thirdParty} onChange={(e) => setThirdParty(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-500" />
              <span className="text-[12px] leading-relaxed text-[var(--text-soft)]">
                내 명의가 아닌 번호입니다 <span className="text-[var(--text-dim)]">(대행·위탁 등) — 명의자 위임장이 추가로 필요합니다.</span>
              </span>
            </label>
            <button
              type="submit"
              disabled={busy === 'create'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {busy === 'create' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 신청서 만들기
            </button>
          </form>
        ) : (
          <p className="text-[12.5px] text-[var(--text-dim)]">
            신청서를 만든 뒤 필수 서류 사진을 모두 첨부하면 제출 버튼이 열립니다.
          </p>
        )}
      </Card>

      {loading ? (
        <Card><p className="py-10 text-center text-[13px] text-[var(--text-dim)]">불러오는 중…</p></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={Phone} title="등록된 발신번호가 없습니다" hint="위에서 신청서를 작성해 주세요." />
        </Card>
      ) : (
        rows.map((r) => {
          const locked = r.status === 'approved'
          const readOnly = locked || r.status === 'pending'
          return (
            <Card
              key={r.id}
              title={
                <span className="flex items-center gap-2">
                  {fmtPhone(r.phone)}
                  {r.label && <span className="text-[11.5px] font-normal text-[var(--text-dim)]">{r.label}</span>}
                </span>
              }
              desc={`${r.ownerTypeLabel} · ${r.ownerName}${r.bizNo ? ` · ${r.bizNo}` : ''}${r.thirdParty ? ' · 타인 명의' : ''}`}
              action={
                <span className={cn('rounded-lg border px-2.5 py-1 text-[11px] font-semibold', SENDER_STATUS_TONE[r.status] || SENDER_STATUS_TONE.draft)}>
                  {r.statusLabel}
                </span>
              }
            >
              {r.status === 'rejected' && r.rejectReason && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[12px] text-rose-600">
                  <AlertCircle size={14} className="mt-px flex-shrink-0" />
                  <span><b>반려 사유</b> · {r.rejectReason} — 서류를 다시 첨부하면 재제출할 수 있습니다.</span>
                </div>
              )}

              <Section
                first
                label={`필수 서류 ${r.docs.length}/${r.required.length}`}
                hint={r.ready ? '필요한 서류가 모두 첨부되었습니다.' : `아직 ${r.missing.map((m) => m.label).join(', ')} 이(가) 필요합니다.`}
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {r.required.map((t) => {
                    const spec = specs[t] || { type: t, label: t, hint: '' }
                    return (
                      <DocSlot
                        key={t}
                        spec={spec}
                        doc={r.docs.find((d) => d.docType === t)}
                        senderId={r.id}
                        locked={locked}
                        onChanged={(m) => { if (m) setMsg(m); load() }}
                      />
                    )
                  })}
                </div>
              </Section>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)] pt-4">
                {r.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-600">
                    <ShieldCheck size={14} /> 승인 완료 — 문자·알림톡 발송에 사용할 수 있습니다.
                  </span>
                ) : r.status === 'pending' ? (
                  <>
                    <span className="text-[12.5px] text-[var(--text-dim)]">관리자 승인을 기다리는 중입니다.</span>
                    <button
                      onClick={() => act(r.id, () => senderCancel(r.id), '제출을 취소했습니다.')}
                      disabled={busy === r.id}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-soft)] hover:bg-[var(--panel-2)] disabled:opacity-50"
                    >
                      <Undo2 size={12} /> 제출 취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => act(r.id, () => senderSubmit(r.id), '승인 신청을 제출했습니다.')}
                      disabled={!r.ready || busy === r.id}
                      title={r.ready ? '' : '필수 서류를 모두 첨부해야 제출할 수 있습니다.'}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 승인 신청 제출
                    </button>
                    {!r.ready && (
                      <span className="text-[11.5px] text-[var(--text-dim)]">서류를 모두 첨부하면 제출할 수 있어요.</span>
                    )}
                    <button
                      onClick={() => { if (confirm('이 신청을 삭제할까요? 첨부한 서류도 함께 지워집니다.')) act(r.id, () => senderDelete(r.id), '신청을 삭제했습니다.') }}
                      disabled={busy === r.id}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-dim)] hover:border-rose-500/40 hover:text-rose-500 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> 신청 삭제
                    </button>
                  </>
                )}
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
