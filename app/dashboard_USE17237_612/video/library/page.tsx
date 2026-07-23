'use client'

import { useState } from 'react'
import { Film, Play, Download, Trash2, Clock, Sparkles, Filter } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

type VideoStatus = '완료' | '생성중'

interface VideoItem {
  id: number
  title: string
  style: string
  category: string // 광고 CF · 숏폼 · 시네마틱
  length: string
  status: VideoStatus
  progress?: number
  gradient: string
}

const SEED: VideoItem[] = [
  {
    id: 1,
    title: '봄 신메뉴 딸기라떼 광고',
    style: '감성 CF',
    category: '광고 CF',
    length: '0:30',
    status: '완료',
    gradient: 'from-rose-400 via-pink-500 to-fuchsia-600',
  },
  {
    id: 2,
    title: '헬스장 3월 프로모션 숏폼',
    style: '다이나믹',
    category: '숏폼',
    length: '0:15',
    status: '완료',
    gradient: 'from-violet-500 via-purple-500 to-indigo-600',
  },
  {
    id: 3,
    title: '카페 브랜드 시네마틱 무비',
    style: '시네마틱',
    category: '시네마틱',
    length: '1:00',
    status: '완료',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
  },
  {
    id: 4,
    title: '네일샵 신규 오픈 안내',
    style: '깔끔한 정보형',
    category: '숏폼',
    length: '0:20',
    status: '완료',
    gradient: 'from-sky-400 via-cyan-500 to-teal-500',
  },
  {
    id: 5,
    title: '한우 오마카세 미식 광고',
    style: '럭셔리 CF',
    category: '광고 CF',
    length: '0:45',
    status: '완료',
    gradient: 'from-emerald-500 via-green-500 to-lime-500',
  },
  {
    id: 6,
    title: '펜션 여름 성수기 홍보',
    style: '시네마틱',
    category: '시네마틱',
    length: '0:50',
    status: '완료',
    gradient: 'from-blue-500 via-indigo-500 to-violet-600',
  },
  {
    id: 7,
    title: '피부과 리프팅 이벤트 숏폼',
    style: '트렌디',
    category: '생성중',
    length: '0:15',
    status: '생성중',
    progress: 68,
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
  },
  {
    id: 8,
    title: '베이커리 신제품 CF',
    style: '감성 CF',
    category: '생성중',
    length: '0:30',
    status: '생성중',
    progress: 34,
    gradient: 'from-orange-400 via-amber-500 to-yellow-500',
  },
]

const FILTERS = ['전체', '광고 CF', '숏폼', '시네마틱', '생성중'] as const
type FilterKey = (typeof FILTERS)[number]

export default function VideoLibraryPage() {
  const [filter, setFilter] = useState<FilterKey>('전체')

  const list = SEED.filter((v) => {
    if (filter === '전체') return true
    if (filter === '생성중') return v.status === '생성중'
    return v.category === filter
  })

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Film}
        eyebrow="영상 제작"
        title="내 영상 관리"
        desc="AI로 생성한 광고 영상을 한 곳에서 관리하고 다운로드하세요."
        accent="#a855f7"
        action={
          <Button className="!bg-gradient-to-br !from-purple-500 !to-fuchsia-500">
            <Sparkles size={16} /> 새 영상 생성
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 영상" value="48" icon={Film} accent="#a855f7" />
          <StatCard label="이번달 생성" value="12" delta={20} icon={Sparkles} accent="#8b5cf6" />
          <StatCard label="총 재생" value="28,400" icon={Play} accent="#0ea5e9" />
          <StatCard label="남은 크레딧" value="340" icon={Clock} accent="#f59e0b" />
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-[var(--text-soft)]">
            <Filter size={15} /> 필터
          </span>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                filter === f
                  ? 'border-violet-500/30 bg-violet-500/12 text-violet-600'
                  : 'border-[var(--border)] bg-white text-[var(--text-soft)] hover:bg-[var(--panel-2)]',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 영상 그리드 */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((v) => (
            <div key={v.id} className="card overflow-hidden p-0">
              <div className={cn('group relative aspect-[9/16] bg-gradient-to-br', v.gradient)}>
                {/* hover 재생버튼 오버레이 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white/25 backdrop-blur">
                    <Play size={26} className="ml-0.5 text-white" fill="currentColor" />
                  </span>
                </div>

                {/* 상태 배지 */}
                <div className="absolute left-3 top-3">
                  {v.status === '완료' ? (
                    <Badge className="border-emerald-500/30 bg-emerald-500/12 text-emerald-600">완료</Badge>
                  ) : (
                    <Badge className="border-amber-500/30 bg-amber-500/12 text-amber-600">
                      <Clock size={12} /> 생성중
                    </Badge>
                  )}
                </div>

                {/* 하단 그라디언트 + 제목 */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{v.title}</p>
                  <p className="mt-0.5 text-xs text-white/80">
                    {v.style} · {v.length}
                  </p>
                  {v.status === '생성중' && v.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
                        <div
                          className="h-full rounded-full bg-white transition-all"
                          style={{ width: `${v.progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-white/80">{v.progress}% 렌더링 중…</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 카드 하단 액션 */}
              <div className="flex items-center gap-2 p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={v.status === '생성중'}
                >
                  <Download size={15} /> 다운로드
                </Button>
                <Button variant="ghost" size="sm" className="!px-2.5 text-rose-500 hover:!bg-rose-500/12">
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {list.length === 0 && (
          <Panel>
            <p className="py-10 text-center text-sm text-[var(--text-dim)]">
              해당 조건의 영상이 없습니다.
            </p>
          </Panel>
        )}
      </div>
    </div>
  )
}
