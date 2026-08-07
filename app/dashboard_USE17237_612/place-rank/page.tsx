'use client'

/* 네이버 플레이스 순위 추적
 *
 * ⚠ 여기엔 원래 <iframe src="/tools/place?embed=1"> 이 있었다. 그 파일은 이 저장소에
 *   한 번도 있던 적이 없다(git 이력 확인) — 메뉴를 눌러도 빈 화면이었다.
 *   뒷단(/api/naver-place/rank · tracking · rank-history)은 이미 다 있다.
 *
 * 이 화면이 하는 일은 셋뿐이다.
 *  ① 지금 순위 확인 — 플레이스 주소 + 키워드로 즉시 조회
 *  ② 추적 등록 — 등록해 두면 매일 자동으로 순위를 기록한다
 *  ③ 변화 보기 — 등록한 키워드의 순위 이력
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, Search, Loader2, Plus, Trash2, TrendingUp, AlertCircle, Check, History } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Field, Section, Metric, inputCls } from '@/components/dash/Kit'
import { AreaTrend } from '@/components/dash/Charts'
import { Button, Badge } from '@/components/ui'
import { formatNumber, cn } from '@/lib/utils'
import {
  placeTrackings, placeRankCheck, placeTrackAdd, placeTrackDelete, placeRankHistory,
  type PlaceTracking, type PlaceRankResult, type PlaceHistoryPoint,
} from '@/lib/auth'

const ACCENT = '#10b981'

/** 네이버 플레이스 주소에서 플레이스 번호만 뽑는다.
 *  map.naver.com/p/entry/place/1234567890 · m.place.naver.com/restaurant/1234567890/home
 *  · 번호만 붙여 넣은 경우도 그대로 받는다. */
function extractPlaceId(input: string): string {
  const s = String(input || '').trim()
  if (!s) return ''
  if (/^\d{6,}$/.test(s)) return s
  const m = s.match(/(?:place|restaurant|hairshop|hospital|cafe|entry)\/(\d{6,})/) || s.match(/(\d{8,})/)
  return m ? m[1] : ''
}

function fmtWhen(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return String(iso) }
}
const mdLabel = (d: string) => { const p = String(d || '').split('-'); return p.length === 3 ? `${p[1]}/${p[2]}` : d }

export default function PlaceRankPage() {
  const [placeInput, setPlaceInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')

  const [checking, setChecking] = useState(false)
  const [rank, setRank] = useState<PlaceRankResult | null>(null)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [rows, setRows] = useState<PlaceTracking[]>([])

  const [openId, setOpenId] = useState<number | null>(null)
  const [history, setHistory] = useState<PlaceHistoryPoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const placeId = useMemo(() => extractPlaceId(placeInput), [placeInput])

  const load = useCallback(async () => {
    setLoading(true)
    const d = await placeTrackings()
    setRows(d.keywords)
    /*  ⚠ 못 불러온 것을 "추적 없음" 으로 보여 주면 안 된다 — 서버도 같은 이유로
        빈 목록에 success:false 를 실어 보낸다. 화면도 그대로 구분해서 말한다. */
    setListError(d.ok ? '' : d.error || '추적 목록을 불러오지 못했습니다.')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function check() {
    if (!placeId || !keyword.trim() || checking) return
    setChecking(true); setRank(null); setMsg(null)
    const r = await placeRankCheck({ placeId, placeUrl: placeInput.trim(), keyword: keyword.trim(), location: location.trim() })
    setRank(r)
    setChecking(false)
  }

  async function addTracking() {
    if (!placeId || !keyword.trim() || adding) return
    setAdding(true); setMsg(null)
    const r = await placeTrackAdd({ placeId, placeUrl: placeInput.trim(), keyword: keyword.trim(), location: location.trim() })
    setAdding(false)
    setMsg({ ok: !!r.success, text: r.success ? (r.message || '추적에 추가했습니다.') : (r.error || '추가하지 못했습니다.') })
    if (r.success) await load()
  }

  async function remove(id: number, kw: string) {
    if (!window.confirm(`'${kw}' 추적을 그만둘까요? 지금까지 쌓인 순위 기록은 남습니다.`)) return
    const r = await placeTrackDelete(id)
    if (r.success) { if (openId === id) { setOpenId(null); setHistory([]) } ; await load() }
    else setMsg({ ok: false, text: r.error || '삭제하지 못했습니다.' })
  }

  async function openHistory(row: PlaceTracking) {
    if (openId === row.id) { setOpenId(null); setHistory([]); return }
    setOpenId(row.id); setHistoryLoading(true); setHistory([])
    const d = await placeRankHistory(row.place_id, row.keyword, 30)
    setHistory(d.history)
    setHistoryLoading(false)
  }

  const trendData = useMemo(
    () => history.filter((h) => h.rank_number != null).map((h) => ({ name: mdLabel(h.date), 순위: h.rank_number as number })),
    [history],
  )

  const tracked = rows.length
  const ranked = rows.filter((r) => r.last_rank != null).length
  const top10 = rows.filter((r) => (r.last_rank ?? 999) <= 10).length

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MapPin}
        eyebrow="플레이스 순위"
        title="순위 추적"
        desc="네이버 플레이스가 어떤 키워드에서 몇 위인지 확인하고, 매일 자동으로 기록합니다."
        accent={ACCENT}
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="추적 중인 키워드" icon={MapPin} accent={ACCENT} value={formatNumber(tracked)} sub="매일 자동으로 순위를 확인합니다" />
          <Metric label="순위가 잡힌 키워드" icon={Check} accent="#0ea5e9" value={formatNumber(ranked)} sub={tracked ? `전체 ${formatNumber(tracked)}개 중` : '아직 없습니다'} />
          <Metric label="10위 안" icon={TrendingUp} accent="#f59e0b" value={formatNumber(top10)} sub="첫 화면에 노출되는 구간" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <Card title="순위 확인" desc="플레이스 주소와 키워드를 넣으세요">
            <Section label="내 플레이스" first hint="네이버 지도에서 업체 페이지 주소를 복사해 붙여 넣으세요. 번호만 넣어도 됩니다.">
              <Field label="플레이스 주소 또는 번호" hint={placeId ? undefined : placeInput ? '주소에서 플레이스 번호를 찾지 못했습니다.' : undefined}>
                <input
                  value={placeInput}
                  onChange={(e) => setPlaceInput(e.target.value)}
                  placeholder="https://map.naver.com/p/entry/place/1234567890"
                  className={inputCls}
                />
              </Field>
              {placeId && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-emerald-500">
                  <Check size={12} /> 플레이스 번호 {placeId}
                </p>
              )}
            </Section>

            <Section label="검색어">
              <Field label="키워드" hint="손님이 실제로 검색할 말로 넣으세요. 예: 강남 미용실">
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="강남 미용실" className={inputCls} />
              </Field>
              <Field label="지역" optional className="mt-3" hint="같은 이름의 업체가 여러 곳일 때 구분에 씁니다.">
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="서울 강남구" className={inputCls} />
              </Field>
            </Section>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-5">
              <Button onClick={check} disabled={!placeId || !keyword.trim() || checking}>
                {checking ? <><Loader2 size={16} className="animate-spin" /> 확인 중…</> : <><Search size={16} /> 지금 순위 확인</>}
              </Button>
              <Button onClick={addTracking} disabled={!placeId || !keyword.trim() || adding} variant="outline">
                {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 매일 추적
              </Button>
            </div>

            {msg && (
              <p className={cn('mt-3 flex items-start gap-1.5 text-[12.5px] font-medium', msg.ok ? 'text-emerald-500' : 'text-rose-500')}>
                {msg.ok ? <Check size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />} {msg.text}
              </p>
            )}

            {rank && (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                {rank.success ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">{rank.placeName || '내 플레이스'}</p>
                    <p className="mt-2 text-[30px] font-semibold leading-none tabular-nums">
                      {rank.found && rank.rank != null ? <>{rank.rank}<span className="ml-1 text-[15px] font-medium text-[var(--text-dim)]">위</span></> : <span className="text-[19px] text-[var(--text-dim)]">순위권 밖</span>}
                    </p>
                    <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-soft)]">{rank.message}</p>
                    {rank.found && rank.percentage && (
                      <p className="mt-1 text-[11.5px] text-[var(--text-dim)]">전체 {formatNumber(rank.totalCount || 0)}개 중 상위 {rank.percentage}%</p>
                    )}
                  </>
                ) : (
                  <p className="flex items-start gap-1.5 text-[12.5px] font-medium text-rose-500">
                    <AlertCircle size={14} className="mt-0.5" /> {rank.error || '순위를 확인하지 못했습니다.'}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card
            title="추적 중인 키워드"
            desc={loading ? undefined : `${formatNumber(tracked)}개 · 매일 자동 확인`}
            bodyClassName={rows.length ? 'p-0' : undefined}
          >
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[var(--text-dim)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중…</div>
            ) : listError ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12.5px] text-rose-500">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{listError}</p>
                  <button onClick={load} className="mt-1 font-semibold underline">다시 불러오기</button>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="추적 중인 키워드가 없습니다"
                hint="왼쪽에서 플레이스와 키워드를 넣고 '매일 추적'을 누르면, 매일 순위가 기록되어 변화를 볼 수 있습니다."
              />
            ) : (
              <div className="divide-y divide-[var(--border-soft)]">
                {rows.map((r) => {
                  const open = openId === r.id
                  return (
                    <div key={r.id}>
                      <div className="flex items-center gap-3 px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[13px] font-semibold">
                            <span className="truncate">{r.keyword}</span>
                            {r.last_rank != null ? (
                              <Badge className={cn(
                                'flex-shrink-0',
                                r.last_rank <= 10 ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500'
                                  : r.last_rank <= 30 ? 'border-sky-500/30 bg-sky-500/12 text-sky-500'
                                    : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)]',
                              )}>
                                {r.last_rank}위
                              </Badge>
                            ) : (
                              <Badge className="flex-shrink-0 border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)]">순위 없음</Badge>
                            )}
                          </p>
                          <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-dim)]">
                            {r.place_name || `플레이스 ${r.place_id}`}
                            {r.last_total_count ? ` · 전체 ${formatNumber(r.last_total_count)}개` : ''}
                            {` · 마지막 확인 ${fmtWhen(r.last_checked)}`}
                          </p>
                        </div>
                        <button
                          onClick={() => openHistory(r)}
                          className={cn(
                            'flex-shrink-0 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors',
                            open ? 'border-emerald-500/50 text-emerald-500' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--panel-2)]',
                          )}
                        >
                          <History size={13} className="mr-1 inline" /> 변화
                        </button>
                        <button
                          onClick={() => remove(r.id, r.keyword)}
                          className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-dim)] transition-colors hover:bg-rose-500/12 hover:text-rose-500"
                          aria-label="추적 그만두기"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {open && (
                        <div className="border-t border-[var(--border-soft)] bg-[var(--panel-2)] px-5 py-4">
                          {historyLoading ? (
                            <p className="flex items-center gap-2 text-[12.5px] text-[var(--text-dim)]"><Loader2 className="h-4 w-4 animate-spin" /> 이력을 불러오는 중…</p>
                          ) : trendData.length < 2 ? (
                            <p className="text-[12.5px] text-[var(--text-dim)]">
                              아직 그릴 만큼 기록이 쌓이지 않았습니다({trendData.length}일치). 매일 한 번씩 자동으로 쌓입니다.
                            </p>
                          ) : (
                            <>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">최근 30일 순위 (낮을수록 좋음)</p>
                              <AreaTrend data={trendData} keys={['순위']} colors={[ACCENT]} height={200} />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
