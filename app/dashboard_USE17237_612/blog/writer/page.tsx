'use client'

import { useMemo, useState } from 'react'
import {
  Bot,
  Sparkles,
  Copy,
  FileText,
  Wand2,
  RefreshCw,
  Check,
  X,
  Trash2,
  Clock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { useAuth, aiGenerate, CREDIT_COSTS } from '@/lib/auth'

const ACCENT = '#22c55e'

const TONES = ['친근한', '전문적', '후기형', '정보형'] as const
const LENGTHS = ['짧게', '보통', '길게'] as const
const PLATFORMS = ['네이버 블로그', '티스토리'] as const

interface Draft {
  id: number
  title: string
  keyword: string
  platform: string
  date: string
}

const SEED: Draft[] = [
  { id: 1, title: '강남 피부과 리프팅 후기, 진짜 효과 있을까?', keyword: '강남 피부과', platform: '네이버 블로그', date: '2026-07-10' },
  { id: 2, title: '홈카페 입문자를 위한 원두 고르는 법', keyword: '홈카페 원두', platform: '티스토리', date: '2026-07-08' },
  { id: 3, title: '판교 필라테스 3개월 다녀본 솔직 후기', keyword: '판교 필라테스', platform: '네이버 블로그', date: '2026-07-05' },
]

const HASHTAG_POOL = ['일상', '추천', '후기', '정보공유', '내돈내산', '가성비', '데일리', '핫플']

/** 글 1편을 직접 쓰면 대략 이 정도 걸린다고 보고 절약 시간을 계산한다 */
const MINUTES_PER_POST = 40

type Result = { title: string; body: string[]; tags: string[] }

function buildBody(topic: string, keyword: string, tone: string) {
  const kw = keyword.trim() || topic.trim() || '이 주제'
  const opener: Record<string, string> = {
    친근한: `안녕하세요! 오늘은 요즘 많은 분들이 관심 갖고 계신 '${kw}'에 대해 편하게 이야기 나눠볼게요.`,
    전문적: `본 포스팅에서는 '${kw}'에 대해 데이터와 실제 사례를 바탕으로 체계적으로 분석해 보겠습니다.`,
    후기형: `'${kw}' 직접 경험해보고 남기는 솔직한 후기입니다. 고민하시는 분들께 도움이 되었으면 해요.`,
    정보형: `'${kw}'에 대해 꼭 알아두어야 할 핵심 정보만 정리했습니다. 끝까지 읽어보시길 추천드려요.`,
  }
  return [
    opener[tone] || opener['친근한'],
    `먼저 '${kw}'를 선택할 때 가장 중요한 건 '나에게 맞는 기준'을 세우는 일입니다. 많은 분들이 가격만 보고 결정하시는데, 실제로는 후기와 접근성, 그리고 사후 관리까지 종합적으로 따져보는 것이 만족도를 크게 좌우합니다.`,
    `제가 직접 비교해본 결과, '${kw}' 관련해서 상위권으로 꼽히는 곳들은 공통점이 있었어요. 바로 고객 응대가 빠르고, 재방문율이 높다는 점입니다. 특히 ${topic.trim() || kw} 부분에서 만족도가 눈에 띄게 높았습니다.`,
    `마지막으로 정리하자면, '${kw}'는 충분히 알아보고 결정하면 후회 없는 선택이 될 수 있습니다. 이 글이 여러분의 선택에 작은 도움이 되었길 바라며, 궁금한 점은 댓글로 남겨주세요!`,
  ]
}

/**
 * SEO 점수 — 실제 생성된 글을 검사해서 매긴다.
 * 예전에는 무슨 글을 써도 88점으로 고정돼 있어 아무 의미가 없었다.
 */
function seoAudit(r: Result, keyword: string) {
  const kw = keyword.trim()
  const body = r.body.join('\n')
  const all = `${r.title}\n${body}`
  const chars = body.replace(/\s/g, '').length
  const kwCount = kw ? all.split(kw).length - 1 : 0

  const checks = [
    { label: '제목에 타겟 키워드 포함', ok: !!kw && r.title.includes(kw), hint: '제목 앞쪽에 키워드가 있어야 검색 노출에 유리합니다.' },
    { label: '제목 길이 15~40자', ok: r.title.length >= 15 && r.title.length <= 40, hint: `현재 ${r.title.length}자 — 너무 짧거나 길면 검색 결과에서 잘립니다.` },
    { label: '본문 1,000자 이상', ok: chars >= 1000, hint: `현재 ${chars.toLocaleString('ko-KR')}자 — 정보량이 많을수록 체류 시간이 늘어납니다.` },
    { label: '문단 3개 이상', ok: r.body.length >= 3, hint: `현재 ${r.body.length}문단 — 문단을 나누면 가독성이 올라갑니다.` },
    { label: '키워드 3회 이상 반복', ok: kwCount >= 3, hint: `현재 ${kwCount}회 — 자연스럽게 3~7회 정도가 적당합니다.` },
    { label: '해시태그 5개 이상', ok: r.tags.length >= 5, hint: `현재 ${r.tags.length}개 — 관련 태그를 채우면 유입 경로가 늘어납니다.` },
  ]

  const passed = checks.filter((c) => c.ok).length
  const score = Math.round((passed / checks.length) * 100)
  const grade =
    score >= 85 ? { label: '우수', color: '#22c55e' } : score >= 67 ? { label: '양호', color: '#84cc16' } : score >= 50 ? { label: '보통', color: '#f59e0b' } : { label: '개선 필요', color: '#ef4444' }

  return { checks, passed, score, chars, kwCount, grade }
}

export default function BlogWriterPage() {
  const [topic, setTopic] = useState('강남 피부과 리프팅 후기')
  const [keyword, setKeyword] = useState('강남 피부과')
  const [tone, setTone] = useState<(typeof TONES)[number]>('친근한')
  const [length, setLength] = useState<(typeof LENGTHS)[number]>('보통')
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('네이버 블로그')

  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  /** 결과가 나온 시점의 키워드 — 입력창을 고쳐도 점수가 흔들리지 않게 고정한다 */
  const [scoredKeyword, setScoredKeyword] = useState('')

  const [drafts, setDrafts, draftsReady] = useLocalStorage<Draft[]>('bivience_blog_drafts', SEED)
  const { user, setUser } = useAuth()

  const audit = useMemo(() => (result ? seoAudit(result, scoredKeyword) : null), [result, scoredKeyword])

  const stats = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    const thisMonth = drafts.filter((d) => (d.date || '').startsWith(month)).length
    const naver = drafts.filter((d) => d.platform === '네이버 블로그').length
    return {
      total: drafts.length,
      thisMonth,
      naver,
      tistory: drafts.length - naver,
      savedMinutes: drafts.length * MINUTES_PER_POST,
    }
  }, [drafts])

  function saveDraft(title: string, kw: string) {
    const today = new Date().toISOString().slice(0, 10)
    setDrafts((prev) => [{ id: Date.now(), title, keyword: kw, platform, date: today }, ...prev])
  }

  function deleteDraft(id: number) {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  /** 지난 글의 주제·키워드를 폼에 되돌려 담는다 (같은 조건으로 다시 뽑을 때) */
  function reuseDraft(d: Draft) {
    setTopic(d.title)
    setKeyword(d.keyword)
    if (d.platform === '네이버 블로그' || d.platform === '티스토리') setPlatform(d.platform)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function mockResult(kw: string): Result {
    const title = `${topic.trim() || kw}, ${tone === '후기형' ? '솔직 후기' : '이것만은 꼭 알아두세요'}`
    return { title, body: buildBody(topic, keyword, tone), tags: [kw.replace(/\s/g, ''), ...HASHTAG_POOL.slice(0, 4)] }
  }

  const generate = async () => {
    setLoading(true)
    setResult(null)
    setCopied(false)
    setNote('')
    const kw = keyword.trim() || topic.trim() || '추천 주제'
    const paraCount = length === '길게' ? '5~6' : length === '짧게' ? '2~3' : '3~4'
    const prompt =
      `주제: ${topic.trim() || kw}\n핵심 키워드: ${kw}\n톤앤매너: ${tone}\n분량: ${length} (${paraCount}개 문단)\n플랫폼: ${platform}\n\n` +
      `위 조건으로 ${platform}에 올릴 한국어 블로그 글을 작성해줘. 반드시 아래 형식으로만 출력해:\n` +
      `제목: <클릭을 부르는 제목>\n<본문 — 문단 사이에 빈 줄, ${paraCount}개 문단>\n태그: <쉼표로 구분한 해시태그 5개>`

    const r = await aiGenerate({ prompt, feature: CREDIT_COSTS.blog.label, cost: CREDIT_COSTS.blog.cost })
    setLoading(false)
    setScoredKeyword(kw)

    if (r.ok && r.text) {
      // 제목/본문/태그 파싱
      const lines = r.text.split('\n')
      let title = ''
      const tags: string[] = []
      const bodyLines: string[] = []
      for (const ln of lines) {
        if (/^제목\s*[:：]/.test(ln)) title = ln.replace(/^제목\s*[:：]/, '').trim()
        else if (/^태그\s*[:：]|^#/.test(ln)) ln.replace(/^태그\s*[:：]/, '').split(/[,#\s]+/).forEach((t) => t.trim() && tags.push(t.trim()))
        else bodyLines.push(ln)
      }
      const body = bodyLines.join('\n').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
      const final: Result = { title: title || `${topic.trim() || kw}`, body: body.length ? body : [r.text], tags: tags.length ? tags : [kw.replace(/\s/g, '')] }
      setResult(final)
      if (typeof r.credits === 'number' && user) setUser({ ...user, credits: r.credits })
      saveDraft(final.title, kw)
    } else {
      // OpenAI 미설정/오류 → 데모 결과로 대체 (크레딧은 환불됨)
      const demo = mockResult(kw)
      setResult(demo)
      setNote(r.error || 'AI 서버에 연결할 수 없어 데모 결과를 표시합니다. 크레딧은 차감되지 않습니다.')
      saveDraft(demo.title, kw)
    }
  }

  const copyAll = () => {
    if (!result) return
    const text = `${result.title}\n\n${result.body.join('\n\n')}\n\n${result.tags.map((t) => `#${t}`).join(' ')}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const credits = user?.credits ?? 0
  const cost = CREDIT_COSTS.blog.cost
  const notEnough = credits < cost
  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-green-500'

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Bot}
        eyebrow="블로그 분석"
        title="AI 블로그 작성"
        desc="주제와 키워드만 입력하면 SEO에 최적화된 블로그 초안을 자동 생성합니다."
        accent={ACCENT}
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-5 xl:grid-cols-2">
          {/* 생성 폼 */}
          <Card title="AI 블로그 생성" desc={`1편당 ${cost} 크레딧 · 보유 ${credits.toLocaleString('ko-KR')}개`} className="self-start">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">주제</label>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예) 강남 피부과 리프팅 후기" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">타겟 키워드</label>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예) 강남 피부과" className={inputCls} />
                <p className="mt-1.5 text-[11px] text-[var(--text-dim)]">이 키워드로 제목·본문 반복 횟수를 채점합니다.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">말투</label>
                  <select value={tone} onChange={(e) => setTone(e.target.value as (typeof TONES)[number])} className={inputCls}>
                    {TONES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">글 길이</label>
                  <select value={length} onChange={(e) => setLength(e.target.value as (typeof LENGTHS)[number])} className={inputCls}>
                    {LENGTHS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">플랫폼</label>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])} className={inputCls}>
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {notEnough && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/12 px-3.5 py-2.5 text-[12.5px] text-amber-500">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>
                    크레딧이 {(cost - credits).toLocaleString('ko-KR')}개 부족합니다. 충전 후 생성해 주세요.
                  </span>
                </div>
              )}

              <Button className="w-full justify-center !bg-gradient-to-br !from-green-500 !to-emerald-500" onClick={generate} disabled={loading || notEnough}>
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> 생성 중…
                  </>
                ) : (
                  <>
                    <Wand2 size={16} /> 생성하기 · {cost} 크레딧
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* 생성 결과 */}
          <Card
            title="생성 결과"
            desc={audit ? `SEO ${audit.score}점 · ${audit.grade.label}` : 'AI가 작성한 초안과 SEO 점검 결과'}
            action={
              result && !loading ? (
                <Button variant="outline" size="sm" onClick={copyAll}>
                  <Copy size={15} /> {copied ? '복사됨' : '복사'}
                </Button>
              ) : undefined
            }
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <RefreshCw size={30} className="animate-spin text-green-500" />
                <p className="text-sm text-[var(--text-soft)]">AI가 글을 작성하고 있어요…</p>
              </div>
            ) : !result ? (
              <EmptyState
                icon={Sparkles}
                title="아직 생성한 글이 없습니다"
                hint="주제와 키워드를 입력하고 생성하기를 누르면, 초안과 함께 SEO 점검 결과가 여기에 표시됩니다."
              />
            ) : (
              <div className="space-y-4">
                {note && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/12 px-3.5 py-2.5 text-[12.5px] text-amber-500">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{note}</span>
                  </div>
                )}

                {/* SEO 점검 — 항목별로 통과 여부를 보여준다 */}
                {audit && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative grid h-16 w-16 flex-shrink-0 place-items-center">
                        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.5"
                            fill="none"
                            stroke={audit.grade.color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${(audit.score / 100) * 97.4} 97.4`}
                            style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)' }}
                          />
                        </svg>
                        <span className="absolute text-[15px] font-extrabold" style={{ color: audit.grade.color }}>
                          {audit.score}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11.5px] text-[var(--text-dim)]">SEO 점수</p>
                        <p className="text-lg font-extrabold" style={{ color: audit.grade.color }}>
                          {audit.grade.label}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--text-soft)]">
                          {audit.checks.length}개 항목 중 {audit.passed}개 통과 · 본문 {audit.chars.toLocaleString('ko-KR')}자
                        </p>
                      </div>
                    </div>

                    <ul className="mt-3.5 space-y-1.5 border-t border-[var(--border)] pt-3.5">
                      {audit.checks.map((c) => (
                        <li key={c.label} className="flex items-start gap-2 text-[12px]">
                          {c.ok ? (
                            <Check size={14} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                          ) : (
                            <X size={14} className="mt-0.5 flex-shrink-0 text-rose-500" />
                          )}
                          <span className={c.ok ? 'text-[var(--text-soft)]' : 'text-[var(--text)]'}>
                            {c.label}
                            {!c.ok && <span className="ml-1.5 text-[11px] text-[var(--text-dim)]">{c.hint}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((t) => (
                    <span key={t} className="rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-500">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                  <h4 className="text-base font-bold leading-snug">{result.title}</h4>
                  <div className="mt-3 space-y-3">
                    {result.body.map((p, i) => (
                      <p key={i} className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--text-soft)]">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>

                {copied && (
                  <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-3.5 py-2.5 text-[13px] font-medium text-emerald-500">
                    <Check size={15} /> 제목·본문·해시태그가 클립보드에 복사되었습니다.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* 지표 — 저장된 글에서 직접 계산한다 */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="이번달 생성" icon={FileText} accent="#22c55e" value={draftsReady ? `${stats.thisMonth}편` : '—'} sub="이번 달에 만든 초안" />
          <Metric label="누적 생성" icon={Bot} accent="#10b981" value={draftsReady ? `${stats.total}편` : '—'} sub="이 브라우저에 저장된 전체" />
          <Metric
            label="플랫폼 분포"
            icon={Sparkles}
            accent="#0ea5e9"
            value={draftsReady ? `${stats.naver} : ${stats.tistory}` : '—'}
            sub="네이버 블로그 : 티스토리"
          />
          <Metric
            label="절약한 시간"
            icon={Clock}
            accent="#8b5cf6"
            value={draftsReady ? `${Math.round(stats.savedMinutes / 60)}시간` : '—'}
            sub={`글 1편당 ${MINUTES_PER_POST}분 기준`}
          />
        </div>

        <Card title="최근 생성 글" desc={`${drafts.length}편 · 이 브라우저에만 저장됩니다`} bodyClassName="p-0">
          {drafts.length === 0 ? (
            <EmptyState icon={FileText} title="저장된 글이 없습니다" hint="글을 생성하면 제목·키워드·플랫폼이 이곳에 기록됩니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11.5px] text-[var(--text-dim)]">
                    <th className="px-5 py-2.5 font-semibold">제목</th>
                    <th className="px-5 py-2.5 font-semibold">키워드</th>
                    <th className="px-5 py-2.5 font-semibold">플랫폼</th>
                    <th className="px-5 py-2.5 font-semibold">생성일</th>
                    <th className="px-5 py-2.5 text-right font-semibold">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d) => (
                    <tr key={d.id} className="group border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--panel-2)]">
                      <td className="max-w-[280px] truncate px-5 py-3 font-semibold">{d.title}</td>
                      <td className="px-5 py-3 text-[var(--text-soft)]">{d.keyword}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            d.platform === '네이버 블로그'
                              ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500'
                              : 'border-amber-500/30 bg-amber-500/12 text-amber-500'
                          }`}
                        >
                          {d.platform}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-[var(--text-soft)]">{d.date}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => reuseDraft(d)}
                            className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-emerald-500/12 hover:text-emerald-500"
                            aria-label="이 조건으로 다시 쓰기"
                            title="이 조건으로 다시 쓰기"
                          >
                            <RotateCcw size={15} />
                          </button>
                          <button
                            onClick={() => deleteDraft(d.id)}
                            className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-rose-500/12 hover:text-rose-500"
                            aria-label="삭제"
                            title="삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
