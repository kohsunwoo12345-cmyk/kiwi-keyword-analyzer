'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Contact, Upload, Plus, Trash2, Users, FileSpreadsheet, Loader2, Pencil,
  Check, X, AlertCircle, Search,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Button } from '@/components/ui'
import { Card, EmptyState, Metric, inputCls } from '@/components/dash/Kit'
import { isImeEnter } from '@/lib/utils'
import { kstDate } from '@/lib/time'

const ACCENT = '#0ea5e9'


type Group = { id: string; name: string; count: number; created_at: string }
type Member = { id: string; name: string; phone: string; extra?: string; created_at: string }
type ParsedRow = { name: string; phone: string; extra?: string }
type Toast = { id: number; text: string; kind: 'ok' | 'err' | 'info' }

declare global {
  interface Window {
    // SheetJS global injected from /vendor/js/xlsx.full.min.js
    XLSX?: any
  }
}

function fmtDate(iso: string) {
  if (!iso) return '-'
  return kstDate(iso)
}

/** 서버가 한 번에 받는 최대 행 수 (functions/api/groups.ts 와 동일) */
const MAX_IMPORT = 10000

/**
 * 숫자만 남긴 전화번호. 10자리 미만은 버린다 (서버 기준과 동일).
 *
 * 엑셀에서 휴대폰 열을 숫자 서식으로 저장하면 앞자리 0이 사라져
 * 01022222222 가 1022222222 로 읽힌다. 그대로 보내면 서버는 10자리라
 * 통과시켜 "0이 빠진 다른 번호"를 저장하고, 나중에 발송이 실패한다.
 * 국내 번호는 항상 0으로 시작하므로 9~10자리이면서 0으로 시작하지 않으면
 * 앞자리 0을 되살린다.
 */
function normPhone(v: unknown): string {
  let d = String(v ?? '').replace(/\D/g, '')
  if (d && d[0] !== '0' && (d.length === 9 || d.length === 10)) d = `0${d}`
  return d.length >= 10 ? d : ''
}

function fmtPhone(p: string): string {
  const d = String(p ?? '').replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return p
}

async function ensureXLSX(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('no window')
  if (window.XLSX) return window.XLSX
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-xlsx]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('load fail')))
      if (window.XLSX) resolve()
      return
    }
    const s = document.createElement('script')
    s.src = '/vendor/js/xlsx.full.min.js'
    s.dataset.xlsx = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('SheetJS 로드 실패'))
    document.head.appendChild(s)
  })
  if (!window.XLSX) throw new Error('SheetJS 로드 실패')
  return window.XLSX
}

export default function TargetGroupsPage() {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])

  // create group
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  // selected group detail
  const [selId, setSelId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const [delBusy, setDelBusy] = useState(false)
  const [memberDelBusy, setMemberDelBusy] = useState<Record<string, boolean>>({})
  const [memberQuery, setMemberQuery] = useState('')

  // excel import flow
  const fileRef = useRef<HTMLInputElement>(null)
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [phoneCol, setPhoneCol] = useState<string>('')
  const [nameCol, setNameCol] = useState<string>('')
  const [importFileName, setImportFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importTargetId, setImportTargetId] = useState<string>('') // '' = new group
  const [importNewName, setImportNewName] = useState('')
  const [importBusy, setImportBusy] = useState(false)

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([])
  const pushToast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400)
  }, [])

  const selected = groups.find((g) => g.id === selId) || null

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups', { credentials: 'include' })
      const d = await res.json()
      if (d && d.ok) {
        setGroups(Array.isArray(d.groups) ? d.groups : [])
        return d.groups as Group[]
      }
      pushToast('그룹 목록을 불러오지 못했습니다.', 'err')
    } catch {
      pushToast('그룹 목록을 불러오지 못했습니다.', 'err')
    }
    return null
  }, [pushToast])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await loadGroups()
      if (alive) setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [loadGroups])

  const loadMembers = useCallback(
    async (gid: string) => {
      setMembersLoading(true)
      try {
        const res = await fetch(`/api/groups?members=${encodeURIComponent(gid)}`, {
          credentials: 'include',
        })
        const d = await res.json()
        if (d && d.ok) setMembers(Array.isArray(d.members) ? d.members : [])
        else pushToast('멤버를 불러오지 못했습니다.', 'err')
      } catch {
        pushToast('멤버를 불러오지 못했습니다.', 'err')
      } finally {
        setMembersLoading(false)
      }
    },
    [pushToast],
  )

  function selectGroup(gid: string) {
    setSelId(gid)
    setRenaming(false)
    setMembers([])
    setMemberQuery('')
    loadMembers(gid)
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/groups', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  async function createGroup() {
    const name = newName.trim()
    if (!name) {
      pushToast('그룹 이름을 입력하세요.', 'err')
      return
    }
    setCreating(true)
    try {
      const d = await post({ action: 'create', name })
      if (d && d.ok) {
        setNewName('')
        pushToast(`"${name}" 그룹을 만들었습니다.`, 'ok')
        await loadGroups()
        if (d.id) selectGroup(d.id)
      } else {
        pushToast(d?.error || '그룹 생성에 실패했습니다.', 'err')
      }
    } catch {
      pushToast('그룹 생성에 실패했습니다.', 'err')
    } finally {
      setCreating(false)
    }
  }

  async function doRename() {
    if (!selected) return
    const name = renameVal.trim()
    if (!name) {
      pushToast('그룹 이름을 입력하세요.', 'err')
      return
    }
    setRenameBusy(true)
    try {
      const d = await post({ action: 'rename', groupId: selected.id, name })
      if (d && d.ok) {
        setRenaming(false)
        pushToast('그룹 이름을 변경했습니다.', 'ok')
        await loadGroups()
      } else {
        pushToast(d?.error || '이름 변경에 실패했습니다.', 'err')
      }
    } catch {
      pushToast('이름 변경에 실패했습니다.', 'err')
    } finally {
      setRenameBusy(false)
    }
  }

  async function doDelete() {
    if (!selected) return
    if (!window.confirm(`"${selected.name}" 그룹을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setDelBusy(true)
    try {
      const d = await post({ action: 'del', groupId: selected.id })
      if (d && d.ok) {
        pushToast('그룹을 삭제했습니다.', 'ok')
        setSelId(null)
        setMembers([])
        await loadGroups()
      } else {
        pushToast(d?.error || '삭제에 실패했습니다.', 'err')
      }
    } catch {
      pushToast('삭제에 실패했습니다.', 'err')
    } finally {
      setDelBusy(false)
    }
  }

  async function delMember(memberId: string) {
    if (!selected) return
    setMemberDelBusy((m) => ({ ...m, [memberId]: true }))
    try {
      const d = await post({ action: 'member_del', groupId: selected.id, memberId })
      if (d && d.ok) {
        setMembers((prev) => prev.filter((x) => x.id !== memberId))
        await loadGroups()
      } else {
        pushToast(d?.error || '연락처 삭제에 실패했습니다.', 'err')
      }
    } catch {
      pushToast('연락처 삭제에 실패했습니다.', 'err')
    } finally {
      setMemberDelBusy((m) => {
        const n = { ...m }
        delete n[memberId]
        return n
      })
    }
  }

  // ---- excel ----
  function resetImport() {
    setRawRows([])
    setHeaders([])
    setPhoneCol('')
    setNameCol('')
    setImportFileName('')
    setImportTargetId('')
    setImportNewName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    resetImport()
    setImportFileName(file.name)
    try {
      const XLSX = await ensureXLSX()
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]
      if (!rows.length) {
        pushToast('시트에서 데이터를 찾지 못했습니다.', 'err')
        resetImport()
        return
      }
      const cols = Array.from(
        rows.reduce((set: Set<string>, r) => {
          Object.keys(r).forEach((k) => set.add(k))
          return set
        }, new Set<string>()),
      )
      setRawRows(rows)
      setHeaders(cols)
      // auto-guess phone / name columns by header text
      const guessPhone = cols.find((c) => /전화|연락|휴대|폰|phone|mobile|tel|번호|hp/i.test(c))
      const guessName = cols.find((c) => /이름|성함|name|고객|담당/i.test(c))
      setPhoneCol(guessPhone || cols[0] || '')
      setNameCol(guessName || '')
      pushToast(`${rows.length}행을 읽었습니다. 컬럼을 선택하세요.`, 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : '엑셀 파싱에 실패했습니다.', 'err')
      resetImport()
    } finally {
      setParsing(false)
    }
  }

  const parsedRows: ParsedRow[] = rawRows.length && phoneCol
    ? rawRows
        .map((r) => ({
          name: nameCol ? String(r[nameCol] ?? '').trim() : '',
          phone: normPhone(r[phoneCol]),
        }))
        .filter((r) => r.phone)
    : []

  /**
   * 서버는 같은 번호를 건너뛰고, 한 요청에 10,000행까지만 받는다.
   * 예전에는 미리보기만 중복을 세고 전송은 원본 그대로여서,
   * "9,000명 추가"라고 안내한 뒤 12,000행을 보내 서버에 거절당했다.
   */
  const uniqueRows: ParsedRow[] = (() => {
    const seen = new Set<string>()
    const out: ParsedRow[] = []
    for (const r of parsedRows) {
      if (seen.has(r.phone)) continue
      seen.add(r.phone)
      out.push(r)
    }
    return out
  })()
  const validCount = uniqueRows.length
  const dupCount = parsedRows.length - uniqueRows.length
  const invalidCount = Math.max(0, rawRows.length - parsedRows.length)
  const overLimit = validCount > MAX_IMPORT

  async function doImport() {
    if (!uniqueRows.length) {
      pushToast('추가할 유효한 연락처가 없습니다.', 'err')
      return
    }
    if (overLimit) {
      pushToast(`한 번에 최대 ${MAX_IMPORT.toLocaleString('ko-KR')}명까지 가져올 수 있습니다.`, 'err')
      return
    }
    const targetId = importTargetId
    const targetName = importNewName.trim()
    if (!targetId && !targetName) {
      pushToast('기존 그룹을 선택하거나 새 그룹 이름을 입력하세요.', 'err')
      return
    }
    setImportBusy(true)
    try {
      const body: Record<string, unknown> = { action: 'import', rows: uniqueRows }
      if (targetId) body.groupId = targetId
      else body.name = targetName
      const d = await post(body)
      if (d && d.ok) {
        const added = typeof d.added === 'number' ? d.added : uniqueRows.length
        const skipped = uniqueRows.length - added
        pushToast(
          skipped > 0
            ? `${added.toLocaleString('ko-KR')}명 추가 · 이미 있던 번호 ${skipped.toLocaleString('ko-KR')}건은 건너뛰었습니다.`
            : `${added.toLocaleString('ko-KR')}명을 추가했습니다.`,
          'ok',
        )
        resetImport()
        const gs = await loadGroups()
        const gid = d.groupId || targetId
        if (gid) {
          setSelId(gid)
          loadMembers(gid)
        }
        void gs
      } else {
        pushToast(d?.error || '가져오기에 실패했습니다.', 'err')
      }
    } catch {
      pushToast('가져오기에 실패했습니다.', 'err')
    } finally {
      setImportBusy(false)
    }
  }

  const totalContacts = groups.reduce((s, g) => s + (g.count || 0), 0)
  const biggest = groups.length ? groups.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a)) : null

  /** 연락처가 많은 그룹에서 특정 번호를 찾을 수 있게 한다 */
  const shownMembers = (() => {
    const q = memberQuery.trim().replace(/\s/g, '').toLowerCase()
    if (!q) return members
    const qDigits = q.replace(/\D/g, '')
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || (qDigits && m.phone.includes(qDigits)),
    )
  })()

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Contact}
        eyebrow="TEAM"
        title="타깃 그룹 (DB)"
        desc="엑셀 DB를 업로드해 재사용 가능한 타깃 그룹으로 저장하세요."
        accent={ACCENT}
        action={
          <Button
            onClick={() => fileRef.current?.click()}
            className="!bg-gradient-to-br !from-sky-500 !to-blue-500"
          >
            <Upload size={16} /> 엑셀 업로드
          </Button>
        }
      />

      {/* hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFile}
      />

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-24 right-6 z-50 flex w-[340px] max-w-[calc(100vw-3rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-in pointer-events-auto flex items-start gap-2 rounded-xl border bg-[var(--panel)] px-3.5 py-2.5 text-[13px] shadow-xl ${
              t.kind === 'ok'
                ? 'border-emerald-500/40 text-emerald-500'
                : t.kind === 'err'
                  ? 'border-rose-500/40 text-rose-500'
                  : 'border-sky-500/40 text-sky-500'
            }`}
          >
            {t.kind === 'ok' ? <Check size={15} className="mt-0.5 flex-shrink-0" /> : t.kind === 'err' ? <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> : <FileSpreadsheet size={15} className="mt-0.5 flex-shrink-0" />}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="타깃 그룹" icon={Users} accent="#0ea5e9" value={loading ? '—' : `${groups.length}개`} sub="저장된 재사용 그룹" />
          <Metric label="전체 연락처" icon={Contact} accent="#6366f1" value={loading ? '—' : `${totalContacts.toLocaleString('ko-KR')}명`} sub="모든 그룹의 합계" />
          <Metric
            label="가장 큰 그룹"
            icon={FileSpreadsheet}
            accent="#22c55e"
            value={loading || !biggest ? '—' : `${(biggest.count || 0).toLocaleString('ko-KR')}명`}
            sub={biggest ? biggest.name : '그룹이 없습니다'}
          />
        </div>

        {/* import wizard (shown after parsing a file) */}
        {(parsing || headers.length > 0) && (
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <FileSpreadsheet size={17} className="text-sky-500" />
                엑셀에서 가져오기
              </span>
            }
            desc={importFileName || undefined}
            action={
              <button
                onClick={resetImport}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-dim)] transition hover:bg-[var(--panel-2)] hover:text-rose-500"
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            }
          >
            {parsing ? (
              <div className="flex items-center gap-2 py-6 text-sm text-[var(--text-soft)]">
                <Loader2 size={16} className="animate-spin" /> 엑셀을 읽는 중...
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                      전화번호 컬럼 <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={phoneCol}
                      onChange={(e) => setPhoneCol(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">— 선택 —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                      이름 컬럼 <span className="text-[var(--text-dim)]">(선택)</span>
                    </label>
                    <select
                      value={nameCol}
                      onChange={(e) => setNameCol(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">— 없음 —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-[13px]">
                  {phoneCol ? (
                    <>
                      <span className="text-[var(--text-soft)]">
                        추가할 연락처 <b className="text-emerald-500">{validCount.toLocaleString('ko-KR')}</b>건
                        <span className="text-[var(--text-dim)]"> / 읽은 행 {rawRows.length.toLocaleString('ko-KR')}개</span>
                      </span>
                      {(dupCount > 0 || invalidCount > 0) && (
                        <p className="mt-1 text-[11.5px] text-[var(--text-dim)]">
                          {invalidCount > 0 && `번호가 없거나 10자리 미만 ${invalidCount.toLocaleString('ko-KR')}행 제외`}
                          {invalidCount > 0 && dupCount > 0 && ' · '}
                          {dupCount > 0 && `파일 안 중복 번호 ${dupCount.toLocaleString('ko-KR')}건 제외`}
                        </p>
                      )}
                      {overLimit && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-semibold text-rose-500">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          한 번에 최대 {MAX_IMPORT.toLocaleString('ko-KR')}명까지 가져올 수 있습니다. 파일을 나눠서 올려주세요.
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-[var(--text-dim)]">전화번호 컬럼을 선택하세요.</span>
                  )}
                </div>

                {/* preview first few rows */}
                {uniqueRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                          <th className="px-3 py-2 font-semibold">이름</th>
                          <th className="px-3 py-2 font-semibold">연락처</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-b border-[var(--border)] last:border-0">
                            <td className="px-3 py-1.5">{r.name || <span className="text-[var(--text-dim)]">-</span>}</td>
                            <td className="px-3 py-1.5 tabular-nums">{fmtPhone(r.phone)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uniqueRows.length > 5 && (
                      <div className="bg-[var(--panel-2)] px-3 py-1.5 text-center text-xs text-[var(--text-dim)]">
                        외 {(uniqueRows.length - 5).toLocaleString('ko-KR')}건 더
                      </div>
                    )}
                  </div>
                )}

                {/* target group */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                      기존 그룹에 추가
                    </label>
                    <select
                      value={importTargetId}
                      onChange={(e) => {
                        setImportTargetId(e.target.value)
                        if (e.target.value) setImportNewName('')
                      }}
                      className={inputCls}
                    >
                      <option value="">— 새 그룹 만들기 —</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name} ({g.count}명)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                      새 그룹 이름
                    </label>
                    <input
                      value={importNewName}
                      onChange={(e) => {
                        setImportNewName(e.target.value)
                        if (e.target.value) setImportTargetId('')
                      }}
                      disabled={!!importTargetId}
                      placeholder="예: 7월 이벤트 신청자"
                      className={`${inputCls} disabled:opacity-50`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={resetImport}>취소</Button>
                  <Button
                    onClick={doImport}
                    disabled={importBusy || validCount === 0 || overLimit || (!importTargetId && !importNewName.trim())}
                    className="!bg-gradient-to-br !from-sky-500 !to-blue-500"
                  >
                    {importBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {validCount.toLocaleString('ko-KR')}명 추가
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* left: group list + create */}
          <div className="space-y-5 self-start">
            <Card title="새 그룹 만들기" desc="엑셀 없이 빈 그룹부터 만들 수 있습니다">
              <div className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isImeEnter(e)) createGroup()
                  }}
                  placeholder="그룹 이름"
                  className={inputCls}
                />
                <Button onClick={createGroup} disabled={creating} className="!px-4">
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  만들기
                </Button>
              </div>
            </Card>

            <Card title="그룹 목록" desc={`${groups.length}개`} bodyClassName="p-3">
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-soft)]">
                  <Loader2 size={16} className="animate-spin" /> 불러오는 중...
                </div>
              ) : groups.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="그룹이 없습니다"
                  hint="위에서 새 그룹을 만들거나, 엑셀을 업로드해 한 번에 채울 수 있습니다."
                  action={
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                    >
                      <Upload size={14} /> 엑셀 업로드
                    </button>
                  }
                />
              ) : (
                <ul className="space-y-2">
                  {groups.map((g) => {
                    const active = g.id === selId
                    return (
                      <li key={g.id}>
                        <button
                          onClick={() => selectGroup(g.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                            active
                              ? 'border-sky-500/50 bg-sky-500/[0.08]'
                              : 'border-[var(--border)] hover:border-sky-500/40 hover:bg-[var(--panel-2)]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{g.name}</div>
                            <div className="mt-0.5 text-xs text-[var(--text-dim)]">
                              {fmtDate(g.created_at)} 생성
                            </div>
                          </div>
                          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-soft)]">
                            <Users size={12} />
                            {(g.count || 0).toLocaleString('ko-KR')}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* right: detail */}
          <div>
            {!selected ? (
              <Card title="그룹 상세" className="self-start">
                <EmptyState
                  icon={Contact}
                  title="그룹을 선택하세요"
                  hint="왼쪽 목록에서 그룹을 고르면 저장된 연락처를 확인하고 관리할 수 있습니다."
                />
              </Card>
            ) : (
              <Card
                className="self-start"
                title={
                  renaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isImeEnter(e)) doRename()
                          if (e.key === 'Escape') setRenaming(false)
                        }}
                        autoFocus
                        className={`${inputCls} !py-1.5`}
                      />
                      <Button size="sm" onClick={doRename} disabled={renameBusy} className="!px-3">
                        {renameBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenaming(false)} className="!px-3">
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Contact size={17} className="text-sky-500" />
                      {selected.name}
                    </span>
                  )
                }
                desc={renaming ? undefined : `${(selected.count || 0).toLocaleString('ko-KR')}명 · ${fmtDate(selected.created_at)} 생성`}
                bodyClassName="p-0"
                action={
                  !renaming && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRenameVal(selected.name)
                          setRenaming(true)
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-dim)] transition hover:bg-[var(--panel-2)] hover:text-sky-500"
                        aria-label="이름 변경"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={doDelete}
                        disabled={delBusy}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-dim)] transition hover:bg-[var(--panel-2)] hover:text-rose-500 disabled:opacity-50"
                        aria-label="그룹 삭제"
                      >
                        {delBusy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  )
                }
              >
                {membersLoading ? (
                  <div className="flex items-center justify-center gap-2 py-14 text-sm text-[var(--text-dim)]">
                    <Loader2 size={16} className="animate-spin" /> 연락처를 불러오는 중…
                  </div>
                ) : members.length === 0 ? (
                  <EmptyState
                    icon={Contact}
                    title="이 그룹에는 아직 연락처가 없습니다"
                    hint="엑셀을 업로드하면 이 그룹에 한 번에 담을 수 있습니다."
                    action={
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                      >
                        <Upload size={14} /> 엑셀 업로드
                      </button>
                    }
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
                      <div className="relative flex-1">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                        <input
                          value={memberQuery}
                          onChange={(e) => setMemberQuery(e.target.value)}
                          placeholder="이름 또는 번호로 찾기"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] py-1.5 pl-8 pr-2.5 text-[12.5px] outline-none transition-colors focus:border-sky-500"
                        />
                      </div>
                      <span className="flex-shrink-0 text-[11.5px] text-[var(--text-dim)]">
                        {shownMembers.length.toLocaleString('ko-KR')} / {members.length.toLocaleString('ko-KR')}명
                      </span>
                    </div>

                    {shownMembers.length === 0 ? (
                      <EmptyState icon={Search} title="검색 결과가 없습니다" hint="이름 일부 또는 숫자만 입력해도 찾을 수 있습니다." />
                    ) : (
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full text-[13px]">
                      <thead className="sticky top-0 z-10 bg-[var(--panel)]">
                        <tr className="border-b border-[var(--border)] text-left text-[11.5px] text-[var(--text-dim)]">
                          <th className="px-5 py-2.5 font-semibold">이름</th>
                          <th className="px-5 py-2.5 font-semibold">연락처</th>
                          <th className="w-12 px-5 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {shownMembers.map((m) => (
                          <tr
                            key={m.id}
                            className="group border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--panel-2)]"
                          >
                            <td className="px-5 py-2">
                              {m.name || <span className="text-[var(--text-dim)]">-</span>}
                            </td>
                            <td className="px-5 py-2 tabular-nums">{fmtPhone(m.phone)}</td>
                            <td className="px-5 py-2 text-right">
                              <button
                                onClick={() => delMember(m.id)}
                                disabled={!!memberDelBusy[m.id]}
                                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-dim)] opacity-0 transition hover:bg-rose-500/12 hover:text-rose-500 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                                aria-label="연락처 삭제"
                              >
                                {memberDelBusy[m.id] ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                    )}
                  </>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
