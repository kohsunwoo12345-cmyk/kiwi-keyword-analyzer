'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Palette,
  Save,
  Rocket,
  Copy,
  ExternalLink,
  Pencil,
  Eye,
  Users,
  Layers,
  CheckCircle2,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import { useAuth, saveLanding, listLandings, type LandingPage } from '@/lib/auth'

const ACCENT = '#7c3aed'

/* 실제 공개 페이지(functions/l/[slug].ts)와 동일한 테마 매핑 */
const THEMES: { id: string; label: string; from: string; to: string; accent: string }[] = [
  { id: 'violet', label: '바이올렛', from: '#7c3aed', to: '#6366f1', accent: '#7c3aed' },
  { id: 'blue', label: '블루', from: '#2563eb', to: '#06b6d4', accent: '#2563eb' },
  { id: 'rose', label: '로즈', from: '#e11d48', to: '#f97316', accent: '#e11d48' },
  { id: 'emerald', label: '에메랄드', from: '#059669', to: '#10b981', accent: '#059669' },
  { id: 'dark', label: '다크', from: '#0f172a', to: '#334155', accent: '#0ea5e9' },
]
function themeOf(id: string) {
  return THEMES.find((t) => t.id === id) || THEMES[0]
}

/* 공개 페이지와 동일한 필드 라벨/타입 */
const FIELD_META: Record<string, { label: string; type: string; ph: string }> = {
  name: { label: '이름', type: 'text', ph: '홍길동' },
  phone: { label: '연락처', type: 'tel', ph: '010-0000-0000' },
  email: { label: '이메일', type: 'email', ph: 'you@example.com' },
  company: { label: '회사/상호', type: 'text', ph: '회사명' },
  memo: { label: '문의 내용', type: 'text', ph: '남기실 말씀' },
}
const ALL_FIELDS = ['name', 'phone', 'email', 'company', 'memo'] as const

const INPUT_CLS =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500'

function parseFields(raw: string): string[] {
  try {
    const arr = JSON.parse(raw || '[]')
    if (Array.isArray(arr) && arr.length) return arr.filter((f) => (ALL_FIELDS as readonly string[]).includes(f))
  } catch {
    /* ignore */
  }
  return ['name', 'phone']
}

function convRate(views: number, leads: number): number {
  if (!views) return 0
  return Math.round((leads / views) * 1000) / 10
}

export default function LandingBuilderPage() {
  useAuth()

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [headline, setHeadline] = useState('')
  const [subtext, setSubtext] = useState('')
  const [cta, setCta] = useState('신청하기')
  const [theme, setTheme] = useState('violet')
  const [fields, setFields] = useState<string[]>(['name', 'phone'])

  // 저장/목록 상태
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [published, setPublished] = useState<{ slug: string; origin: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [pages, setPages] = useState<LandingPage[]>([])
  const [stats, setStats] = useState<{
    totalPages: number
    publishedCount: number
    totalViews: number
    totalLeads: number
    convRate: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  function flash(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function refresh() {
    setLoading(true)
    const r = await listLandings()
    if (r.ok) {
      setPages(r.pages)
      setStats(r.stats ?? null)
    } else {
      flash('err', r.error || '목록을 불러오지 못했습니다.')
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  function toggleField(f: string) {
    if (f === 'name') return // name always on
    setFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  }

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setHeadline('')
    setSubtext('')
    setCta('신청하기')
    setTheme('violet')
    setFields(['name', 'phone'])
    setPublished(null)
  }

  function loadIntoEditor(p: LandingPage) {
    setEditingId(p.id)
    setTitle(p.title || '')
    setHeadline(p.headline || '')
    setSubtext(p.subtext || '')
    setCta(p.cta || '신청하기')
    setTheme(p.theme || 'violet')
    setFields(parseFields(p.fields))
    setPublished(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave(publish: boolean) {
    if (!title.trim()) {
      flash('err', '제목을 입력해 주세요.')
      return
    }
    setSaving(publish ? 'publish' : 'draft')
    setCopied(false)
    try {
      const orderedFields = ALL_FIELDS.filter((f) => f === 'name' || fields.includes(f))
      const r = await saveLanding({
        id: editingId ?? undefined,
        title: title.trim(),
        headline: headline.trim(),
        subtext: subtext.trim(),
        cta: cta.trim() || '신청하기',
        theme,
        fields: orderedFields,
        published: publish,
      })
      if (r.ok) {
        if (r.id) setEditingId(r.id)
        if (publish && r.slug && typeof window !== 'undefined') {
          setPublished({ slug: r.slug, origin: window.location.origin })
        } else if (!publish) {
          setPublished(null)
        }
        flash('ok', publish ? '랜딩페이지를 공개했습니다.' : '초안을 저장했습니다.')
        await refresh()
      } else {
        flash('err', r.error || '저장에 실패했습니다.')
      }
    } catch {
      flash('err', '네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(null)
    }
  }

  async function copyUrl(url: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      flash('err', '복사에 실패했습니다.')
    }
  }

  const t = themeOf(theme)
  const previewFields = useMemo(
    () => ALL_FIELDS.filter((f) => f === 'name' || fields.includes(f)),
    [fields],
  )
  const publicUrl = published ? `${published.origin}/l/${published.slug}` : ''

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Palette}
        eyebrow="랜딩페이지"
        title="랜딩페이지 빌더"
        desc="코드 없이 랜딩페이지를 만들고 공개해 실시간으로 DB(리드)를 수집합니다."
        accent={ACCENT}
        action={
          editingId ? (
            <Button variant="outline" onClick={resetForm}>
              + 새 페이지
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="총 페이지" value={stats ? String(stats.totalPages) : '—'} icon={Layers} accent={ACCENT} />
          <StatCard label="공개중" value={stats ? String(stats.publishedCount) : '—'} icon={CheckCircle2} accent="#22c55e" />
          <StatCard label="총 조회수" value={stats ? formatNumber(stats.totalViews) : '—'} icon={Eye} accent="#0ea5e9" />
          <StatCard label="총 수집 리드" value={stats ? formatNumber(stats.totalLeads) : '—'} icon={Users} accent="#f59e0b" />
          <StatCard label="평균 전환율" value={stats ? `${stats.convRate}%` : '—'} icon={TrendingUp} accent="#e11d48" />
        </div>

        {toast && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm animate-fade-in',
              toast.kind === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700',
            )}
          >
            {toast.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Editor ── */}
          <Panel
            title={editingId ? '랜딩페이지 수정' : '새 랜딩페이지'}
            action={
              editingId ? (
                <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                  <Pencil size={12} /> 편집 중
                </Badge>
              ) : undefined
            }
          >
            <div className="space-y-4">
              <Field label="제목" hint="목록·관리용 이름">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 강남 임플란트 상담 이벤트"
                  className={INPUT_CLS}
                />
              </Field>

              <Field label="헤드라인" hint="공개 페이지 대제목">
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="예: 지금 신청하면 첫 상담 무료"
                  className={INPUT_CLS}
                />
              </Field>

              <Field label="서브텍스트" hint="헤드라인 아래 설명">
                <textarea
                  value={subtext}
                  onChange={(e) => setSubtext(e.target.value)}
                  rows={3}
                  placeholder="예: 20년 경력 전문의가 직접 상담합니다. 부담 없이 문의하세요."
                  className={cn(INPUT_CLS, 'resize-none')}
                />
              </Field>

              <Field label="버튼 문구 (CTA)">
                <input
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="신청하기"
                  className={INPUT_CLS}
                />
              </Field>

              <Field label="테마">
                <div className="flex flex-wrap gap-2.5">
                  {THEMES.map((th) => {
                    const active = theme === th.id
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setTheme(th.id)}
                        title={th.label}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all',
                          active
                            ? 'border-violet-400 ring-2 ring-violet-200'
                            : 'border-[var(--border)] hover:border-violet-300',
                        )}
                      >
                        <span
                          className="grid h-5 w-5 place-items-center rounded-full text-white"
                          style={{ background: `linear-gradient(140deg, ${th.from}, ${th.to})` }}
                        >
                          {active && <Check size={12} />}
                        </span>
                        {th.label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="수집 필드" hint="공개 폼에서 입력받을 항목">
                <div className="flex flex-wrap gap-2">
                  {ALL_FIELDS.map((f) => {
                    const on = f === 'name' || fields.includes(f)
                    const locked = f === 'name'
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleField(f)}
                        disabled={locked}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                          on
                            ? 'border-violet-300 bg-violet-50 text-violet-700'
                            : 'border-[var(--border)] text-[var(--text-soft)] hover:border-violet-300',
                          locked && 'cursor-default opacity-90',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-4 w-4 place-items-center rounded border',
                            on ? 'border-violet-500 bg-violet-500 text-white' : 'border-[var(--border)]',
                          )}
                        >
                          {on && <Check size={11} />}
                        </span>
                        {FIELD_META[f].label}
                        {locked && <span className="text-[10px] text-[var(--text-dim)]">필수</span>}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" onClick={() => handleSave(false)} disabled={saving !== null}>
                  {saving === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  저장
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving !== null}>
                  {saving === 'publish' ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                  저장 후 공개
                </Button>
              </div>

              {published && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 animate-fade-in">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 size={15} /> 공개 URL
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-emerald-800">
                      {publicUrl}
                    </code>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyUrl(publicUrl)}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? '복사됨' : '복사'}
                      </Button>
                      <Button size="sm" href={publicUrl}>
                        <ExternalLink size={14} /> 새 창에서 열기
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* ── Live preview ── */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--text-dim)]">
              <Eye size={13} /> 실시간 미리보기
            </p>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-50 shadow-sm">
              {/* browser chrome */}
              <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-white px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span className="ml-2 truncate text-[11px] text-[var(--text-dim)]">
                  {published ? publicUrl : 'bygency.app/l/…'}
                </span>
              </div>

              <div className="max-h-[640px] overflow-y-auto">
                {/* hero */}
                <div
                  className="px-6 pb-16 pt-12 text-center text-white"
                  style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})` }}
                >
                  <p className="text-[11px] font-extrabold tracking-[0.15em] opacity-90">BYGENCY</p>
                  <h2 className="mx-auto mt-3 max-w-sm text-2xl font-extrabold leading-tight">
                    {headline.trim() || title.trim() || '헤드라인을 입력하세요'}
                  </h2>
                  {subtext.trim() && (
                    <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed opacity-90">{subtext}</p>
                  )}
                </div>

                {/* form card */}
                <div className="px-6 pb-8">
                  <div className="-mt-10 rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/10">
                    <div className="flex flex-col gap-3">
                      {previewFields.map((f) => {
                        const m = FIELD_META[f]
                        return (
                          <label key={f} className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                            {m.label}
                            <input
                              type={m.type}
                              placeholder={m.ph}
                              readOnly
                              tabIndex={-1}
                              className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-800 outline-none"
                            />
                          </label>
                        )
                      })}
                      <button
                        type="button"
                        tabIndex={-1}
                        className="mt-1 rounded-xl py-3.5 text-sm font-bold text-white"
                        style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})` }}
                      >
                        {cta.trim() || '신청하기'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-5 text-center text-[11px] text-slate-400">
                    Powered by <span style={{ color: t.accent }}>BYGENCY</span> · (주)Next Vision Company
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── My landings ── */}
        <Panel
          title="내 랜딩페이지 목록"
          action={
            loading ? (
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
                <Loader2 size={13} className="animate-spin" /> 불러오는 중
              </span>
            ) : (
              <span className="text-xs text-[var(--text-dim)]">{pages.length}개</span>
            )
          }
        >
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-3 py-2.5 font-medium">제목</th>
                  <th className="px-3 py-2.5 font-medium">slug</th>
                  <th className="px-3 py-2.5 font-medium">상태</th>
                  <th className="px-3 py-2.5 text-right font-medium">조회수</th>
                  <th className="px-3 py-2.5 text-right font-medium">리드</th>
                  <th className="px-3 py-2.5 text-right font-medium">전환율</th>
                  <th className="px-3 py-2.5 font-medium">생성일</th>
                  <th className="px-3 py-2.5 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => {
                  const isPub = p.published === 1
                  return (
                    <tr key={p.id} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-6 w-6 flex-shrink-0 rounded-md"
                            style={{
                              background: `linear-gradient(140deg, ${themeOf(p.theme).from}, ${themeOf(p.theme).to})`,
                            }}
                          />
                          <span className="max-w-[220px] truncate">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--text-soft)]">{p.slug}</td>
                      <td className="px-3 py-3">
                        {isPub ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">공개</Badge>
                        ) : (
                          <Badge className="border-slate-200 bg-slate-50 text-slate-500">비공개</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-[var(--text-soft)]">{formatNumber(p.views)}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatNumber(p.leads)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                        {p.views ? `${convRate(p.views, p.leads)}%` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--text-dim)]">
                        {(p.created_at || '').slice(0, 10)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => loadIntoEditor(p)}
                            title="수정"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-violet-300 hover:text-violet-600"
                          >
                            <Pencil size={15} />
                          </button>
                          {isPub ? (
                            <a
                              href={`/l/${p.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="열기"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-violet-300 hover:text-violet-600"
                            >
                              <ExternalLink size={15} />
                            </a>
                          ) : (
                            <span
                              title="공개 후 열 수 있습니다"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-soft)] text-[var(--text-dim)] opacity-50"
                            >
                              <ExternalLink size={15} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && pages.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-sm text-[var(--text-dim)]">
                      <Palette size={20} className="mx-auto mb-2 opacity-60" />
                      아직 만든 랜딩페이지가 없습니다. 위에서 첫 페이지를 만들어 보세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <label className="text-xs font-medium text-[var(--text-soft)]">{label}</label>
        {hint && <span className="text-[11px] text-[var(--text-dim)]">· {hint}</span>}
      </div>
      {children}
    </div>
  )
}
