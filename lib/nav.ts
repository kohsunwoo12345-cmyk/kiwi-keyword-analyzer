import {
  LayoutDashboard,
  Mail,
  MessageSquare,
  Send,
  PenSquare,
  BarChart3,
  MessageCircle,
  LayoutTemplate,
  FileText,
  Palette,
  Clapperboard,
  Film,
  MapPin,
  TrendingUp,
  Bot,
  Camera,
  Image as ImageIcon,
  PlaySquare,
  Calendar,
  ClipboardList,
  StickyNote,
  Coins,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

export interface NavCategory {
  id: string
  title: string
  icon: LucideIcon
  accent: string
  badge?: 'HOT' | 'NEW'
  items: NavItem[]
}

export const NAV_HOME: NavItem = {
  title: '홈',
  href: '/dashboard_USE17237_612',
  icon: LayoutDashboard,
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'credits',
    title: '크레딧·결제',
    icon: Coins,
    accent: '#f59e0b',
    items: [
      { title: '크레딧 충전', href: '/dashboard_USE17237_612/credits', icon: Wallet },
      { title: '이용·충전 내역', href: '/dashboard_USE17237_612/credits#history', icon: Coins },
    ],
  },
  {
    id: 'sms',
    title: '문자 (SMS)',
    icon: MessageSquare,
    accent: '#6366f1',
    items: [
      { title: '문자 발송', href: '/dashboard_USE17237_612/sms', icon: Send },
      { title: '문자 작성', href: '/dashboard_USE17237_612/sms/compose', icon: PenSquare },
      { title: '발송 이력·통계', href: '/dashboard_USE17237_612/sms/logs', icon: BarChart3 },
    ],
  },
  {
    id: 'kakao',
    title: '카카오 알림톡',
    icon: MessageCircle,
    accent: '#f59e0b',
    items: [
      { title: '알림톡 발송', href: '/dashboard_USE17237_612/alimtalk', icon: MessageCircle },
      { title: '알림톡 템플릿', href: '/dashboard_USE17237_612/alimtalk/templates', icon: LayoutTemplate },
      { title: '발송 통계', href: '/dashboard_USE17237_612/alimtalk/logs', icon: BarChart3 },
    ],
  },
  {
    id: 'email',
    title: '이메일',
    icon: Mail,
    accent: '#0ea5e9',
    items: [{ title: '이메일 발송', href: '/dashboard_USE17237_612/email', icon: Mail }],
  },
  {
    id: 'landing',
    title: '랜딩페이지 제작',
    icon: Palette,
    accent: '#7c3aed',
    badge: 'HOT',
    items: [
      { title: '랜딩페이지 제작', href: '/dashboard_USE17237_612/landing', icon: Palette },
      { title: '랜딩 성과분석', href: '/dashboard_USE17237_612/landing/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'video',
    title: '영상 제작',
    icon: Clapperboard,
    accent: '#a855f7',
    items: [
      { title: 'AI 영상 제작', href: '/dashboard_USE17237_612/video', icon: Clapperboard },
      { title: '내 영상 관리', href: '/dashboard_USE17237_612/video/library', icon: Film },
    ],
  },
  {
    id: 'place',
    title: '플레이스 순위',
    icon: MapPin,
    accent: '#10b981',
    items: [{ title: '순위 추적', href: '/dashboard_USE17237_612/place-rank', icon: TrendingUp }],
  },
  {
    id: 'blog',
    title: '블로그 분석',
    icon: FileText,
    accent: '#22c55e',
    items: [
      { title: '블로그 분석', href: '/dashboard_USE17237_612/blog', icon: BarChart3 },
      { title: 'AI 블로그 작성', href: '/dashboard_USE17237_612/blog/writer', icon: Bot },
    ],
  },
  {
    id: 'instagram',
    title: '인스타그램',
    icon: Camera,
    accent: '#ec4899',
    badge: 'NEW',
    items: [
      { title: '인스타그램 홈', href: '/dashboard_USE17237_612/instagram', icon: Camera },
      { title: '콘텐츠 관리', href: '/dashboard_USE17237_612/instagram/content', icon: ImageIcon },
      { title: '인사이트 분석', href: '/dashboard_USE17237_612/instagram/insights', icon: BarChart3 },
      { title: 'DM 자동화', href: '/dashboard_USE17237_612/instagram/dm', icon: MessageCircle },
    ],
  },
  {
    id: 'youtube',
    title: '유튜브 분석',
    icon: PlaySquare,
    accent: '#ef4444',
    items: [{ title: '유튜브 채널 분석', href: '/dashboard_USE17237_612/youtube', icon: PlaySquare }],
  },
  {
    id: 'team',
    title: '팀 협업',
    icon: Calendar,
    accent: '#0ea5e9',
    badge: 'NEW',
    items: [
      { title: '캘린더', href: '/dashboard_USE17237_612/team/calendar', icon: Calendar },
      { title: '팀 채팅', href: '/dashboard_USE17237_612/team/chat', icon: MessageCircle },
      { title: '회의록', href: '/dashboard_USE17237_612/team/meeting-notes', icon: ClipboardList },
      { title: '메모', href: '/dashboard_USE17237_612/team/notes', icon: StickyNote },
    ],
  },
  {
    id: 'report',
    title: '통합 리포트',
    icon: BarChart3,
    accent: '#8b5cf6',
    items: [{ title: '통합 리포트', href: '/dashboard_USE17237_612/report', icon: BarChart3 }],
  },
]
