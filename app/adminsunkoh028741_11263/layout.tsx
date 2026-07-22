'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  Shield,
  ShieldAlert,
  BadgeCheck,
  ScrollText,
  BarChart3,
  Wallet,
  Gauge,
  MessageCircle,
  UserPlus,
  IdCard,
  Landmark,
  Images,
  History,
  Banknote,
  Tag,
  Download,
  Fuel,
  Bell,
  Boxes,
  Filter,
  Zap,
  LineChart,
  Send,
  Mail,
  Ticket,
  BadgeDollarSign,
  Menu,
  X,
  ArrowLeft,
  Clapperboard,
  PartyPopper,
  KeyRound,
  Coins,
  TrendingUp,
  Palette,
  Route,
  Inbox,
  Workflow,
  Search,
  Contact,
  CalendarRange,
} from 'lucide-react'
import { Logo } from '@/components/Brand'
import { adminSupportCount, adminPendingCounts } from '@/lib/auth'
import { cn } from '@/lib/utils'

// 보안을 위한 난독화된 관리자 경로 (추측 불가)
export const ADMIN_BASE = '/adminsunkoh028741_11263'

type NavItem = { title: string; href: string; icon: typeof LayoutDashboard; exactHref?: string; badge?: 'approvals' | 'support' }
type NavGroup = { label: string; items: NavItem[] }

// 영상 관련 관리 페이지 — 영상 대시보드(/video)에 카드로도 모아 보여준다.
export const VIDEO_NAV: NavItem[] = [
  { title: '노드 관리', href: `${ADMIN_BASE}/studio-nodes`, icon: Boxes },
  { title: 'AI 생성 기록', href: `${ADMIN_BASE}/ai-generations`, icon: Images },
  { title: 'AI 정산', href: `${ADMIN_BASE}/ai-usage`, icon: Wallet },
  { title: 'AI 비용 (원가율)', href: `${ADMIN_BASE}/ai-pricing`, icon: Gauge },
  { title: 'AI API 남은 한도', href: `${ADMIN_BASE}/api-quota`, icon: Fuel },
  { title: '회원 API 키·호출', href: `${ADMIN_BASE}/api-keys`, icon: KeyRound },
]

const NAV_GROUPS: NavGroup[] = [
  {
    label: '관리',
    items: [
      { title: '관리자 대시보드', href: ADMIN_BASE, icon: LayoutDashboard },
      { title: '회원 관리', href: `${ADMIN_BASE}/users`, icon: Users },
      { title: '알림', href: `${ADMIN_BASE}/notices`, icon: Bell },
      { title: '실시간 모니터링', href: `${ADMIN_BASE}/users`, icon: Activity, exactHref: `${ADMIN_BASE}/users#live` },
      { title: '보안', href: `${ADMIN_BASE}/security`, icon: ShieldAlert },
      { title: '해킹 위험', href: `${ADMIN_BASE}/security-risk`, icon: Shield },
      { title: '승인 관리', href: `${ADMIN_BASE}/approvals`, icon: BadgeCheck, badge: 'approvals' },
      { title: '로그 기록', href: `${ADMIN_BASE}/logs`, icon: ScrollText },
      { title: '접속 통계', href: `${ADMIN_BASE}/stats`, icon: BarChart3 },
      { title: '고객센터', href: `${ADMIN_BASE}/support`, icon: MessageCircle, badge: 'support' },
      { title: '이메일 발송 기록', href: `${ADMIN_BASE}/emails`, icon: Mail },
      { title: '환영인사 메일', href: `${ADMIN_BASE}/emails?kind=welcome`, icon: PartyPopper },
      { title: '회원가입정보', href: `${ADMIN_BASE}/referrals`, icon: IdCard },
      { title: '회원 DB 다운로드', href: `${ADMIN_BASE}/db-download`, icon: Download },
      { title: '사용자 활동 기록', href: `${ADMIN_BASE}/user-activity`, icon: History },
      { title: '매출', href: `${ADMIN_BASE}/revenue`, icon: Banknote },
      { title: '크레딧 지급 내역', href: `${ADMIN_BASE}/credit-grants`, icon: Coins },
      { title: '결제·정산', href: `${ADMIN_BASE}/billing`, icon: BadgeDollarSign },
      { title: '지사 정산', href: `${ADMIN_BASE}/settlement`, icon: Landmark },
      { title: '요금제 관리', href: `${ADMIN_BASE}/plans`, icon: Tag },
    ],
  },
  {
    label: '마케팅',
    items: [
      { title: '마케팅 대시보드', href: `${ADMIN_BASE}/marketing`, icon: Workflow },
      { title: '퍼널 빌더', href: '/tools/funnel-builder.html', icon: Filter },
      { title: '마케팅 자동화', href: '/tools/marketing-automation.html', icon: Zap },
      { title: '랜딩페이지 제작', href: '/tools/landing-builder.html', icon: Palette },
      { title: '랜딩 신청 DB', href: '/tools/landing-submissions.html', icon: Inbox },
      { title: '랜딩 경로 분석', href: '/tools/landing-traffic.html', icon: Route },
      { title: '광고주 관리', href: `${ADMIN_BASE}/advertisers`, icon: Contact },
      { title: '전개 캘린더', href: `${ADMIN_BASE}/calendar`, icon: CalendarRange },
      { title: '광고 성과', href: `${ADMIN_BASE}/ad-performance`, icon: TrendingUp },
      { title: '퍼널 분석', href: '/tools/funnel-landing-analytics.html', icon: LineChart },
      { title: '쿠폰·할인코드', href: `${ADMIN_BASE}/coupons`, icon: Ticket },
      { title: '발송 설정', href: `${ADMIN_BASE}/messaging`, icon: Send },
    ],
  },
  {
    label: '영상 관리',
    items: [
      { title: '영상 대시보드', href: `${ADMIN_BASE}/video`, icon: Clapperboard },
      ...VIDEO_NAV,
    ],
  },
]

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [supportUnread, setSupportUnread] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const match = (title: string) => !q || title.toLowerCase().includes(q)
  useEffect(() => {
    let alive = true
    const load = () => {
      adminSupportCount().then((n) => { if (alive) setSupportUnread(n) })
      adminPendingCounts().then((p) => { if (alive) setPendingApprovals(p.approvals) })
    }
    load()
    const iv = setInterval(load, 20000)
    return () => { alive = false; clearInterval(iv) }
  }, [])
  const renderItem = (it: NavItem) => {
    const Icon = it.icon
    const bt = it.badge
    const badgeCount = bt === 'support' ? supportUnread : bt === 'approvals' ? pendingApprovals : 0
    const active =
      it.href !== '#' &&
      (pathname === it.href || (it.href !== ADMIN_BASE && pathname.startsWith(it.href)))
    return (
      <Link
        key={it.title + it.href}
        href={it.exactHref || it.href}
        onClick={onNavigate}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          active
            ? 'bg-gradient-to-r from-violet-50 to-transparent text-violet-700'
            : 'text-[var(--text-soft)] hover:bg-slate-100 hover:text-[var(--text)]',
        )}
      >
        <span
          className={cn(
            'grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg transition-colors',
            active
              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
              : 'bg-slate-100 text-[var(--text-dim)] group-hover:text-violet-600',
          )}
        >
          <Icon size={15} />
        </span>
        <span className="flex-1 truncate">{it.title}</span>
        {badgeCount > 0 && (
          <span className="grid h-5 min-w-5 flex-shrink-0 place-items-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
    )
  }
  const groups = NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((it) => match(it.title)) }))
    .filter((group) => group.items.length > 0)
  const showSettings = match('설정')
  const noResults = groups.length === 0 && !showSettings

  return (
    <nav className="space-y-4">
      {/* 메뉴 검색 */}
      <div className="relative px-1">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="메뉴 검색…"
          aria-label="메뉴 검색"
          className="w-full rounded-lg border border-[var(--border)] bg-slate-50 py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-violet-400 focus:bg-white"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="검색 지우기"
            className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-[var(--text-dim)] hover:bg-slate-200 hover:text-[var(--text)]"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
            {group.label}
          </p>
          {group.items.map(renderItem)}
        </div>
      ))}
      {showSettings && renderItem({ title: '설정', href: '#', icon: Settings })}
      {noResults && (
        <p className="px-3 py-6 text-center text-xs text-[var(--text-dim)]">
          &lsquo;{query}&rsquo; 검색 결과가 없습니다.
        </p>
      )}
    </nav>
  )
}

function AdminBrand() {
  return (
    <div className="flex items-center gap-2">
      <Logo size={28} href={ADMIN_BASE} />
      <span className="rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-white">
        ADMIN
      </span>
    </div>
  )
}

function SidebarFooter() {
  return (
    <div className="space-y-2 border-t border-[var(--border)] p-3">
      <div className="card-2 flex items-center gap-3 p-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white">
          관
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">관리자</p>
          <p className="truncate text-xs text-[var(--text-dim)]">admin@nextbygency.com</p>
        </div>
      </div>
      <Link
        href="/"
        className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:bg-slate-100 hover:text-[var(--text)]"
      >
        <ArrowLeft size={15} /> 사이트로 돌아가기
      </Link>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--bg)] lg:flex">
      {/* mobile top bar */}
      <div className="glass sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] px-4 py-3 lg:hidden">
        <AdminBrand />
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-soft)]"
          aria-label="메뉴"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="flex h-full w-72 flex-col overflow-y-auto border-r border-[var(--border)] bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border)] bg-[#0a1730] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                Admin Console
              </p>
              <div className="mt-2">
                <Logo size={26} href={ADMIN_BASE} wordClassName="!text-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <AdminNav onNavigate={() => setMobileOpen(false)} />
            </div>
            <SidebarFooter />
          </aside>
        </div>
      )}

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-[var(--border)] bg-white lg:flex">
        <div className="border-b border-[var(--border)] bg-[#0a1730] px-5 py-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            <Shield size={12} /> Admin Console
          </p>
          <div className="mt-2.5">
            <Logo size={26} href={ADMIN_BASE} wordClassName="!text-white" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <AdminNav />
        </div>
        <SidebarFooter />
      </aside>

      {/* main */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
