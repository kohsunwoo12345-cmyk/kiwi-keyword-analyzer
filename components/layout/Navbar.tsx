'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Search, BarChart2, TrendingUp, Star, Layers, Zap, Hash, AlignJustify, Activity,
  Menu, X, ChevronDown, Leaf
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/keyword', label: '키워드 분석', icon: Search, badge: '' },
  { href: '/rank-tracker', label: '검색 순위 추적', icon: BarChart2, badge: 'N' },
  { href: '/influence-rank', label: '영향력 순위', icon: Star, badge: '' },
  { href: '/keyword-suggest', label: '키워드 추천', icon: Zap, badge: '' },
  { href: '/trends', label: '트렌드', icon: TrendingUp, badge: 'N' },
  { href: '/keyword-expand', label: '키워드 확장', icon: Layers, badge: '' },
  { href: '/bulk-analysis', label: '대량 키워드 분석', icon: AlignJustify, badge: '' },
  { href: '/quick-search', label: '간편 키워드 조회', icon: Hash, badge: '' },
]

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-14">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2 mr-8 flex-shrink-0">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">키위분석</span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const isActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="bg-green-500 text-white text-[9px] px-1 py-0.5 rounded font-bold leading-none">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* 우측 액션 */}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/pricing" className="hidden sm:block text-sm text-gray-600 hover:text-green-600 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">
              요금제
            </Link>
            <Link href="/login" className="hidden sm:block text-sm text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-green-400 transition-colors">
              로그인
            </Link>
            <Link href="/signup" className="text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">
              무료 시작
            </Link>
            {/* 모바일 햄버거 */}
            <button
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 드롭다운 */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const isActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',
                    isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.badge && (
                    <span className="bg-green-500 text-white text-[9px] px-1 py-0.5 rounded font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
