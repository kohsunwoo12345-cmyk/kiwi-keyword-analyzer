'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Contact, Upload, Plus, Trash2, Users, FileSpreadsheet, Loader2, Pencil,
  Check, X, AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Button, Panel } from '@/components/ui'

const ACCENT = '#0ea5e9'

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-500'

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
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

// digits-only phone; require >= 10 digits (matches server normalization)
function normPhone(v: unknown): string {
  const d = String(v ?? '').replace(/\D/g, '')
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

  // dedupe preview count by phone
  const validCount = new Set(parsedRows.map((r) => r.phone)).size

  async function doImport() {
    if (!parsedRows.length) {
      pushToast('추가할 유효한 연락처가 없습니다.', 'err')
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
      const body: Record<string, unknown> = { action: 'import', rows: parsedRows }
      if (targetId) body.groupId = targetId
      else body.name = targetName
      const d = await post(body)
      if (d && d.ok) {
        const added = typeof d.added === 'number' ? d.added : parsedRows.length
        pushToast(`${added}명 추가됨`, 'ok')
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
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[320px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg ${
              t.kind === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-800'
                : t.kind === 'err'
                  ? 'border-rose-500/30 bg-rose-500/12 text-rose-800'
                  : 'border-sky-500/30 bg-sky-500/12 text-sky-800'
            }`}
          >
            {t.kind === 'ok' ? <Check size={16} /> : t.kind === 'err' ? <AlertCircle size={16} /> : <FileSpreadsheet size={16} />}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-6 p-6 lg:p-8">
        {/* stat row */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-[var(--text-soft)]">
          <span className="inline-flex items-center gap-2">
            <Users size={15} className="text-sky-500" />
            타깃 그룹 <b className="text-[var(--text)]">{groups.length}</b>개
          </span>
          <span className="inline-flex items-center gap-2">
            <Contact size={15} className="text-sky-500" />
            전체 연락처 <b className="text-[var(--text)]">{totalContacts.toLocaleString('ko-KR')}</b>명
          </span>
        </div>

        {/* import wizard (shown after parsing a file) */}
        {(parsing || headers.length > 0) && (
          <Panel
            title={
              <span className="inline-flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-sky-500" />
                엑셀에서 가져오기
                {importFileName && (
                  <span className="text-xs font-normal text-[var(--text-dim)]">{importFileName}</span>
                )}
              </span>
            }
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

                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-sm">
                  {phoneCol ? (
                    <span className="text-[var(--text-soft)]">
                      유효한 연락처{' '}
                      <b className="text-emerald-600">{validCount.toLocaleString('ko-KR')}</b>건
                      <span className="text-[var(--text-dim)]"> / 전체 {rawRows.length.toLocaleString('ko-KR')}행</span>
                    </span>
                  ) : (
                    <span className="text-[var(--text-dim)]">전화번호 컬럼을 선택하세요.</span>
                  )}
                </div>

                {/* preview first few rows */}
                {parsedRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-left text-xs text-[var(--text-soft)]">
                          <th className="px-3 py-2 font-semibold">이름</th>
                          <th className="px-3 py-2 font-semibold">연락처</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-b border-[var(--border)] last:border-0">
                            <td className="px-3 py-1.5">{r.name || <span className="text-[var(--text-dim)]">-</span>}</td>
                            <td className="px-3 py-1.5 tabular-nums">{fmtPhone(r.phone)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedRows.length > 5 && (
                      <div className="bg-[var(--panel-2)] px-3 py-1.5 text-center text-xs text-[var(--text-dim)]">
                        외 {(parsedRows.length - 5).toLocaleString('ko-KR')}건 더
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
                    disabled={importBusy || validCount === 0 || (!importTargetId && !importNewName.trim())}
                    className="!bg-gradient-to-br !from-sky-500 !to-blue-500"
                  >
                    {importBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {validCount.toLocaleString('ko-KR')}명 추가
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* left: group list + create */}
          <div className="space-y-4">
            <Panel title="새 그룹 만들기">
              <div className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createGroup()
                  }}
                  placeholder="그룹 이름"
                  className={inputCls}
                />
                <Button onClick={createGroup} disabled={creating} className="!px-4">
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  만들기
                </Button>
              </div>
            </Panel>

            <Panel title={`그룹 목록 (${groups.length})`}>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-soft)]">
                  <Loader2 size={16} className="animate-spin" /> 불러오는 중...
                </div>
              ) : groups.length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--text-dim)]">
                  그룹이 없습니다. 위에서 새 그룹을 만들거나 엑셀을 업로드하세요.
                </div>
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
                              ? 'border-sky-400/70 bg-sky-50/60 dark:bg-sky-500/10'
                              : 'border-[var(--border)] hover:border-sky-300/60 hover:bg-[var(--panel-2)]'
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
            </Panel>
          </div>

          {/* right: detail */}
          <div>
            {!selected ? (
              <div className="card grid min-h-[300px] place-items-center p-8 text-center">
                <div className="text-sm text-[var(--text-dim)]">
                  <Contact size={40} className="mx-auto mb-3 opacity-40" />
                  왼쪽에서 그룹을 선택하면 연락처를 확인할 수 있습니다.
                </div>
              </div>
            ) : (
              <Panel
                title={
                  renaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') doRename()
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
                      <Contact size={18} className="text-sky-500" />
                      {selected.name}
                      <span className="text-xs font-normal text-[var(--text-dim)]">
                        {(selected.count || 0).toLocaleString('ko-KR')}명
                      </span>
                    </span>
                  )
                }
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
                  <div className="flex items-center gap-2 py-10 text-sm text-[var(--text-soft)]">
                    <Loader2 size={16} className="animate-spin" /> 연락처를 불러오는 중...
                  </div>
                ) : members.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[var(--text-dim)]">
                    이 그룹에는 아직 연락처가 없습니다. 엑셀을 업로드해 추가하세요.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-soft)]">
                          <th className="px-3 py-2 font-semibold">이름</th>
                          <th className="px-3 py-2 font-semibold">연락처</th>
                          <th className="w-10 px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr
                            key={m.id}
                            className="group border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-2)]"
                          >
                            <td className="px-3 py-2">
                              {m.name || <span className="text-[var(--text-dim)]">-</span>}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{fmtPhone(m.phone)}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => delMember(m.id)}
                                disabled={!!memberDelBusy[m.id]}
                                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-dim)] opacity-0 transition hover:bg-white/60 hover:text-rose-500 group-hover:opacity-100 disabled:opacity-50 dark:hover:bg-white/10"
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
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
