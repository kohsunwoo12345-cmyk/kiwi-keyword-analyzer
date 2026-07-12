'use client'

import { Camera, Heart, MessageCircle, Users, Eye, BarChart3, Image as ImageIcon } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend } from '@/components/dash/Charts'
import { StatCard, Panel, Button } from '@/components/ui'
import { formatNumber } from '@/lib/utils'

const ACCENT = '#ec4899'

const followerTrend = [
  { name: '1월', 팔로워: 21200 },
  { name: '2월', 팔로워: 22600 },
  { name: '3월', 팔로워: 23900 },
  { name: '4월', 팔로워: 25100 },
  { name: '5월', 팔로워: 26300 },
  { name: '6월', 팔로워: 27400 },
  { name: '7월', 팔로워: 28400 },
]

const gradients = [
  'from-pink-400 to-rose-500',
  'from-fuchsia-400 to-purple-500',
  'from-rose-400 to-orange-400',
  'from-violet-400 to-fuchsia-500',
  'from-amber-400 to-pink-500',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-purple-400 to-pink-500',
  'from-orange-400 to-rose-500',
  'from-pink-500 to-violet-500',
  'from-teal-400 to-cyan-500',
  'from-rose-400 to-pink-600',
]

const posts = [
  { likes: 1840, comments: 92, cap: '신상 컬렉션 언박싱' },
  { likes: 2410, comments: 128, cap: '여름 스타일링 팁' },
  { likes: 980, comments: 41, cap: '오늘의 코디' },
  { likes: 3120, comments: 214, cap: '고객 후기 모음' },
  { likes: 1560, comments: 73, cap: '매장 비하인드' },
  { likes: 2020, comments: 105, cap: '한정판 이벤트' },
  { likes: 1290, comments: 58, cap: '신제품 예고편' },
  { likes: 2760, comments: 167, cap: '베스트셀러 TOP5' },
  { likes: 1420, comments: 66, cap: '주말 특가 안내' },
  { likes: 3480, comments: 241, cap: '인플루언서 협업' },
  { likes: 890, comments: 33, cap: '브랜드 스토리' },
  { likes: 1980, comments: 97, cap: '가을 신상 티저' },
]

export default function InstagramHomePage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Camera}
        eyebrow="인스타그램"
        title="인스타그램 홈"
        desc="계정 성과와 최근 게시물을 한눈에 확인하고 팔로워 성장을 추적합니다."
        accent={ACCENT}
        action={
          <Button className="!bg-gradient-to-br !from-pink-500 !to-fuchsia-500">
            <Camera size={16} /> 새 게시물
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* Profile card */}
        <Panel>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <span className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-500 text-white shadow-lg shadow-pink-500/25">
              <Camera size={30} />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-bold">바이전시 공식</h2>
              <p className="text-sm text-[var(--text-soft)]">@bivience.official</p>
              <p className="mt-1 text-sm text-[var(--text-dim)]">뷰티 · 라이프스타일 브랜드 · 신상 매주 업데이트</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-xl font-bold">{formatNumber(312)}</p>
                <p className="text-xs text-[var(--text-dim)]">게시물</p>
              </div>
              <div>
                <p className="text-xl font-bold">{formatNumber(28400)}</p>
                <p className="text-xs text-[var(--text-dim)]">팔로워</p>
              </div>
              <div>
                <p className="text-xl font-bold">486</p>
                <p className="text-xs text-[var(--text-dim)]">팔로잉</p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="팔로워" value="28,400" delta={5.2} icon={Users} accent="#ec4899" />
          <StatCard label="도달" value="142만" delta={12} icon={Eye} accent="#a855f7" />
          <StatCard label="참여율" value="6.8%" delta={1.1} icon={Heart} accent="#f43f5e" />
          <StatCard label="게시물" value="312" icon={ImageIcon} accent="#8b5cf6" />
        </div>

        {/* Follower trend */}
        <Panel title="팔로워 추이">
          <AreaTrend data={followerTrend} keys={['팔로워']} colors={['#ec4899']} />
        </Panel>

        {/* Recent posts grid */}
        <Panel title="최근 게시물" action={<span className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]"><BarChart3 size={13} /> 최근 12개</span>}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
            {posts.map((p, i) => (
              <div
                key={i}
                className={`group relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]}`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Heart size={15} className="fill-white" /> {formatNumber(p.likes)}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <MessageCircle size={15} /> {p.comments}
                  </span>
                </div>
                <span className="absolute left-2 top-2 rounded-md bg-white/85 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text)]">
                  {p.cap}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
