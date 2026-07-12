'use client'

import { useState } from 'react'
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Trophy,
  Target,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend } from '@/components/dash/Charts'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { cn } from '@/lib/utils'

interface PlaceRow {
  id: number
  keyword: string
  place: string
  region: string
  rank: number
  change: number // 양수 = 상승, 음수 = 하락
  best: number
}

const SEED: PlaceRow[] = [
  { id: 1, keyword: '강남 피부과', place: '리안피부과의원', region: '서울 강남', rank: 1, change: 2, best: 1 },
  { id: 2, keyword: '홍대 네일샵', place: '무드네일 홍대점', region: '서울 마포', rank: 2, change: 1, best: 2 },
  { id: 3, keyword: '부산 헬스장', place: '스트롱짐 서면', region: '부산 부산진', rank: 3, change: 4, best: 3 },
  { id: 4, keyword: '수원 오마카세', place: '스시하루', region: '경기 수원', rank: 5, change: -2, best: 3 },
  { id: 5, keyword: '대구 미용실', place: '살롱드무아', region: '대구 중구', rank: 7, change: 3, best: 6 },
  { id: 6, keyword: '판교 필라테스', place: '코어필라테스 판교', region: '경기 성남', rank: 4, change: 5, best: 4 },
  { id: 7, keyword: '인천 치과', place: '연세바른치과', region: '인천 남동', rank: 8, change: -1, best: 5 },
  { id: 8, keyword: '제주 카페', place: '오션뷰커피', region: '제주 제주시', rank: 2, change: 6, best: 2 },
]

const REGIONS = ['서울 강남', '서울 마포', '부산 부산진', '경기 수원', '경기 성남', '대구 중구', '인천 남동', '제주 제주시']

const rankTrend = [
  { name: '1일', 평균순위: 6.1 },
  { name: '2일', 평균순위: 5.8 },
  { name: '3일', 평균순위: 5.9 },
  { name: '4일', 평균순위: 5.4 },
  { name: '5일', 평균순위: 5.2 },
  { name: '6일', 평균순위: 5.3 },
  { name: '7일', 평균순위: 4.9 },
  { name: '8일', 평균순위: 4.7 },
  { name: '9일', 평균순위: 4.8 },
  { name: '10일', 평균순위: 4.5 },
  { name: '11일', 평균순위: 4.4 },
  { name: '12일', 평균순위: 4.3 },
  { name: '13일', 평균순위: 4.2 },
  { name: '14일', 평균순위: 4.2 },
]

export default function PlaceRankPage() {
  const [rows, setRows] = useLocalStorage<PlaceRow[]>('bivience_place_keywords', SEED)
  const [keyword, setKeyword] = useState('')
  const [place, setPlace] = useState('')
  const [region, setRegion] = useState(REGIONS[0])

  const add = () => {
    if (!keyword.trim() || !place.trim()) return
    const rank = Math.floor(Math.random() * 10) + 1
    setRows((prev) => [
      {
        id: Date.now(),
        keyword: keyword.trim(),
        place: place.trim(),
        region,
        rank,
        change: 0,
        best: rank,
      },
      ...prev,
    ])
    setKeyword('')
    setPlace('')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MapPin}
        eyebrow="플레이스 순위"
        title="순위 추적"
        desc="네이버 플레이스 키워드 순위를 매일 추적하고 변동을 확인하세요."
        accent="#10b981"
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* 등록 폼 */}
        <Panel title="키워드 · 업체 등록">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">키워드</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예) 강남 피부과"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">업체명</label>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="예) 리안피부과의원"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">지역</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Button className="!bg-gradient-to-br !from-emerald-500 !to-green-500" onClick={add}>
              <Plus size={16} /> 추가
            </Button>
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="추적 키워드" value="24" icon={Search} accent="#10b981" />
          <StatCard label="1페이지 노출" value="18" icon={Target} accent="#22c55e" />
          <StatCard label="평균 순위" value="4.2위" delta={6} icon={Trophy} accent="#0ea5e9" />
          <StatCard label="상승 키워드" value="9" icon={TrendingUp} accent="#8b5cf6" />
        </div>

        {/* 순위 추적 현황 */}
        <Panel title="순위 추적 현황">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-3 py-2.5 font-medium">키워드</th>
                  <th className="px-3 py-2.5 font-medium">업체명</th>
                  <th className="px-3 py-2.5 font-medium">지역</th>
                  <th className="px-3 py-2.5 font-medium">현재순위</th>
                  <th className="px-3 py-2.5 font-medium">전일대비</th>
                  <th className="px-3 py-2.5 font-medium">최고순위</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium">{r.keyword}</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{r.place}</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{r.region}</td>
                    <td className="px-3 py-3">
                      {r.rank <= 3 ? (
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                          {r.rank}
                        </span>
                      ) : (
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-[var(--text-soft)]">
                          {r.rank}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {r.change === 0 ? (
                        <span className="text-xs text-[var(--text-dim)]">-</span>
                      ) : (
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 text-xs font-semibold',
                            r.change > 0 ? 'text-emerald-600' : 'text-rose-500',
                          )}
                        >
                          {r.change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {Math.abs(r.change)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{r.best}위</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* 순위 변동 추이 */}
        <Panel title="순위 변동 추이 (최근 14일)">
          <AreaTrend data={rankTrend} keys={['평균순위']} colors={['#10b981']} height={260} />
          <p className="mt-3 text-xs text-[var(--text-dim)]">
            * 순위는 값이 낮을수록 상위 노출을 의미합니다.
          </p>
        </Panel>
      </div>
    </div>
  )
}
