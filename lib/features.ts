import {
  Database,
  PlaySquare,
  PenSquare,
  Users,
  Contact,
  Megaphone,
  Clapperboard,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

export interface Feature {
  slug: string
  no: number
  title: string
  short: string
  desc: string
  icon: LucideIcon
  color: string // tailwind gradient stops
  accent: string // hex for charts / glows
  points: string[]
}

export const FEATURES: Feature[] = [
  {
    slug: 'video',
    no: 1,
    title: '노드형 AI 영상 스튜디오',
    short: 'AI 영상 스튜디오',
    desc: '모든 AI 영상 모델을 노드로 연결하고, ControlNet으로 카메라·포즈·모션 하나하나까지 제어해 원하는 장면을 정확히 만들어냅니다.',
    icon: Clapperboard,
    color: 'from-purple-500 to-violet-500',
    accent: '#a855f7',
    points: [
      '모든 AI 모델 지원 — Kling · Google Veo · Runway · Seedance · Luma · Hailuo',
      'ControlNet 모션 제어 — 포즈·뎁스·엣지·캐니로 동작 하나하나 조절',
      '텍스트→영상 · 이미지→영상 · 영상→영상(V2V·실사화)',
      '노드 워크플로우로 컷·장면을 자유롭게 연결하고 재사용',
    ],
  },
  {
    slug: 'leads',
    no: 2,
    title: 'DB 수집 랜딩페이지',
    short: '랜딩 · DB수집',
    desc: '노코드 빌더로 고객 DB를 수집하는 랜딩페이지를 만들고, 유입·전환을 실시간으로 추적합니다.',
    icon: Database,
    color: 'from-violet-500 to-indigo-500',
    accent: '#7c3aed',
    points: ['드래그&드롭 폼 빌더', '전환율·유입 실시간 추적', '수집 DB 자동 정제·중복제거', 'CRM 자동 연동'],
  },
  {
    slug: 'youtube',
    no: 3,
    title: '유튜브 분석',
    short: '유튜브 분석',
    desc: '채널·영상·키워드 성과를 분석하고 떡상 가능성이 높은 콘텐츠 전략을 도출합니다.',
    icon: PlaySquare,
    color: 'from-red-500 to-rose-500',
    accent: '#ef4444',
    points: ['채널 성장 추이 분석', '영상별 조회·참여 지표', '떡상 키워드 발굴', '경쟁 채널 벤치마킹'],
  },
  {
    slug: 'blog',
    no: 4,
    title: '블로그 분석',
    short: '블로그 분석',
    desc: '네이버·티스토리 블로그 지수와 키워드 상위노출 가능성을 진단합니다.',
    icon: PenSquare,
    color: 'from-emerald-500 to-green-500',
    accent: '#10b981',
    points: ['블로그 지수 진단', '키워드 상위노출 분석', '경쟁 강도 측정', 'C-Rank·D.I.A 대응 리포트'],
  },
  {
    slug: 'team',
    no: 5,
    title: '팀 협업 & AI 챗봇',
    short: '팀 · AI챗봇',
    desc: '업무를 보드로 관리하고 AI 어시스턴트가 콘텐츠·카피·분석을 즉시 도와줍니다.',
    icon: Users,
    color: 'from-sky-500 to-blue-500',
    accent: '#0ea5e9',
    points: ['칸반 협업 보드', 'AI 마케팅 어시스턴트', '실시간 코멘트·멘션', '작업 자동 배정'],
  },
  {
    slug: 'crm',
    no: 6,
    title: '고객관리 CRM',
    short: 'CRM 마케팅',
    desc: '수집한 DB를 파이프라인으로 관리하고 문자·알림톡 캠페인으로 전환시킵니다.',
    icon: Contact,
    color: 'from-amber-500 to-orange-500',
    accent: '#f59e0b',
    points: ['세일즈 파이프라인', '고객 세그먼트', '문자·알림톡 자동발송', 'LTV·전환 리포트'],
  },
  {
    slug: 'ads',
    no: 7,
    title: '실제 광고 분석',
    short: '광고 분석',
    desc: '메타·구글·네이버 광고 성과를 한 곳에서 통합 분석하고 ROAS를 최적화합니다.',
    icon: Megaphone,
    color: 'from-fuchsia-500 to-pink-500',
    accent: '#d946ef',
    points: ['통합 대시보드', 'ROAS·CPA 추적', '소재별 성과 비교', 'AI 예산 최적화 제안'],
  },
]

export const OVERVIEW = {
  slug: '',
  title: '대시보드',
  short: '대시보드',
  icon: LayoutDashboard,
}

export function getFeature(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug)
}
