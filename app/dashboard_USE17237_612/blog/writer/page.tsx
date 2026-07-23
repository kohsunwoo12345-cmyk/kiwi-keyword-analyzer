'use client'

import { useState } from 'react'
import { Bot, Sparkles, Copy, FileText, Wand2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { useAuth, aiGenerate, CREDIT_COSTS } from '@/lib/auth'
import { cn } from '@/lib/utils'

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

export default function BlogWriterPage() {
  const [topic, setTopic] = useState('강남 피부과 리프팅 후기')
  const [keyword, setKeyword] = useState('강남 피부과')
  const [tone, setTone] = useState<(typeof TONES)[number]>('친근한')
  const [length, setLength] = useState<(typeof LENGTHS)[number]>('보통')
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('네이버 블로그')

  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [result, setResult] = useState<{ title: string; body: string[]; tags: string[] } | null>(null)

  const [drafts, setDrafts] = useLocalStorage<Draft[]>('bivience_blog_drafts', SEED)
  const { user, setUser } = useAuth()

  function saveDraft(title: string, kw: string) {
    const today = new Date().toISOString().slice(0, 10)
    setDrafts((prev) => [{ id: Date.now(), title, keyword: kw, platform, date: today }, ...prev])
  }

  function mockResult(kw: string) {
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
      const final = { title: title || `${topic.trim() || kw}`, body: body.length ? body : [r.text], tags: tags.length ? tags : [kw.replace(/\s/g, '')] }
      setResult(final)
      if (typeof r.credits === 'number' && user) setUser({ ...user, credits: r.credits })
      saveDraft(final.title, kw)
    } else {
      // OpenAI 미설정/오류 → 데모 결과로 대체 (크레딧은 환불됨)
      const demo = mockResult(kw)
      setResult(demo)
      setNote(r.error || 'AI 서버에 연결할 수 없어 데모 결과를 표시합니다.')
      saveDraft(demo.title, kw)
    }
  }

  const copyAll = () => {
    if (!result) return
    const text = `${result.title}\n\n${result.body.join('\n\n')}\n\n${result.tags
      .map((t) => `#${t}`)
      .join(' ')}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const charCount = result ? result.body.join('').length : 0

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Bot}
        eyebrow="블로그 분석"
        title="AI 블로그 작성"
        desc="주제와 키워드만 입력하면 SEO에 최적화된 블로그 초안을 자동 생성합니다."
        accent="#22c55e"
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: 생성 폼 */}
          <Panel title="AI 블로그 생성">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">주제</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예) 강남 피부과 리프팅 후기"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">타겟 키워드</label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예) 강남 피부과"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">말투</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as (typeof TONES)[number])}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-green-500"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">글 길이</label>
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value as (typeof LENGTHS)[number])}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-green-500"
                  >
                    {LENGTHS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">플랫폼</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-green-500"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                className="w-full !bg-gradient-to-br !from-green-500 !to-emerald-500"
                onClick={generate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> 생성 중…
                  </>
                ) : (
                  <>
                    <Wand2 size={16} /> 생성하기 · {CREDIT_COSTS.blog.cost} 크레딧
                  </>
                )}
              </Button>
              <p className="mt-2 text-center text-xs text-[var(--text-dim)]">
                실제 AI(OpenAI) 생성 · 보유 크레딧 {(user?.credits ?? 0).toLocaleString()}개
              </p>
            </div>
          </Panel>

          {/* Right: 생성 결과 */}
          <Panel
            title="생성 결과"
            action={
              result && (
                <Button variant="outline" size="sm" onClick={copyAll}>
                  <Copy size={15} /> {copied ? '복사됨!' : '복사'}
                </Button>
              )
            }
          >
            {!result && !loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/12 text-green-600">
                  <Sparkles size={26} />
                </span>
                <p className="text-sm text-[var(--text-dim)]">
                  주제와 키워드를 입력하고 생성하기를 눌러보세요.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <RefreshCw size={32} className="animate-spin text-green-500" />
                <p className="text-sm text-[var(--text-soft)]">AI가 글을 작성하고 있어요…</p>
              </div>
            )}

            {note && !loading && (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/12 px-3 py-2 text-xs text-amber-700">
                {note}
              </div>
            )}
            {result && !loading && (
              <div className="space-y-5">
                {/* 상단 요약: SEO 점수 + 글자수 */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="card-2 flex items-center gap-4 p-4">
                    <div className="relative grid h-16 w-16 place-items-center">
                      <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${(88 / 100) * 97.4} 97.4`}
                        />
                      </svg>
                      <span className="absolute text-sm font-bold text-green-600">88</span>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-dim)]">SEO 점수</p>
                      <p className="text-lg font-bold text-green-600">우수</p>
                    </div>
                  </div>
                  <div className="card-2 flex flex-col justify-center p-4">
                    <p className="text-xs text-[var(--text-dim)]">예상 글자수</p>
                    <p className="mt-1 text-2xl font-bold">{charCount.toLocaleString('ko-KR')}자</p>
                    <p className="mt-0.5 text-xs text-[var(--text-soft)]">{platform} · {length}</p>
                  </div>
                </div>

                {/* 추천 해시태그 */}
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((t) => (
                    <Badge key={t} className="border-emerald-500/30 bg-emerald-500/12 text-green-700">
                      #{t}
                    </Badge>
                  ))}
                </div>

                {/* 제목 + 본문 */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                  <h4 className="text-base font-bold">{result.title}</h4>
                  <div className="mt-3 space-y-3">
                    {result.body.map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed text-[var(--text-soft)]">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>

                {copied && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2.5 text-sm text-emerald-700">
                    본문이 클립보드에 복사되었습니다.
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* 하단 stat + 최근 생성 글 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="이번달 생성" value="34" delta={18} icon={FileText} accent="#22c55e" />
          <StatCard label="평균 SEO 점수" value="86점" delta={4} icon={Sparkles} accent="#10b981" />
          <StatCard label="누적 발행" value="128" icon={Bot} accent="#0ea5e9" />
          <StatCard label="절약 시간" value="42시간" delta={12} icon={Wand2} accent="#8b5cf6" />
        </div>

        <Panel title="최근 생성 글">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-3 py-2.5 font-medium">제목</th>
                  <th className="px-3 py-2.5 font-medium">키워드</th>
                  <th className="px-3 py-2.5 font-medium">플랫폼</th>
                  <th className="px-3 py-2.5 font-medium">생성일</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--border-soft)] hover:bg-[var(--panel-2)]">
                    <td className="px-3 py-3 font-medium">{d.title}</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{d.keyword}</td>
                    <td className="px-3 py-3">
                      <Badge
                        className={cn(
                          d.platform === '네이버 블로그'
                            ? 'border-emerald-500/30 bg-emerald-500/12 text-green-700'
                            : 'border-amber-500/30 bg-amber-500/12 text-amber-700',
                        )}
                      >
                        {d.platform}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
