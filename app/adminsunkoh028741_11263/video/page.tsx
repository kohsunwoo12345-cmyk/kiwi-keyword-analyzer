'use client'

import Link from 'next/link'
import { Clapperboard, Boxes, Images, Wallet, Gauge, Fuel, ArrowRight, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Reveal } from '@/components/motion'
import { ADMIN_BASE } from '../layout'

const ACCENT = '#7c3aed'

type Card = { title: string; href: string; icon: LucideIcon; desc: string; accent: string }

const CARDS: Card[] = [
  {
    title: '노드 관리',
    href: `${ADMIN_BASE}/studio-nodes`,
    icon: Boxes,
    desc: '모든 사용자의 노드 워크플로우를 열람·수정·저장. 누가·언제(KST)·어떤 블럭을 추가했고 크레딧을 얼마나 썼는지 상세 감사.',
    accent: '#7c3aed',
  },
  {
    title: 'AI 생성 기록',
    href: `${ADMIN_BASE}/ai-generations`,
    icon: Images,
    desc: '이미지·영상 생성 이력 전체. 사용자별 프롬프트·모델·결과물·소모 크레딧을 시간순으로 확인.',
    accent: '#0ea5e9',
  },
  {
    title: 'AI 정산',
    href: `${ADMIN_BASE}/ai-usage`,
    icon: Wallet,
    desc: '모델별 사용량·원가·청구 크레딧을 집계해 실제 마진과 정산 금액을 파악.',
    accent: '#10b981',
  },
  {
    title: 'AI 비용 (원가율)',
    href: `${ADMIN_BASE}/ai-pricing`,
    icon: Gauge,
    desc: '모델별 원가와 크레딧 과금 배수(원가율)를 설정. 회원별 과금 배수와 함께 마진을 조정.',
    accent: '#f59e0b',
  },
  {
    title: 'AI API 남은 한도',
    href: `${ADMIN_BASE}/api-quota`,
    icon: Fuel,
    desc: '연동된 영상·이미지 생성 API의 잔여 한도·크레딧을 모니터링해 소진 전에 충전.',
    accent: '#ef4444',
  },
]

export default function AdminVideoDashboard() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Clapperboard}
        eyebrow="ADMIN · 영상"
        title="영상 관리 대시보드"
        desc="AI 영상 제작(노드 스튜디오)과 관련된 모든 관리 페이지를 한곳에 모았습니다."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CARDS.map((c) => {
              const Icon = c.icon
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className="group card-2 flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.accent}cc)` }}
                    >
                      <Icon size={20} />
                    </span>
                    <p className="text-base font-bold tracking-tight">{c.title}</p>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--text-soft)]">{c.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600">
                    바로가기
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </Reveal>

        <Reveal>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-800">
              <Clapperboard size={16} /> 영상 스튜디오 바로가기
            </p>
            <p className="mt-1.5 text-sm text-violet-700">
              사용자용 노드형 영상 스튜디오는{' '}
              <a href="/studio-nvc-prv-8b3k2/" target="_blank" rel="noreferrer" className="font-semibold underline">
                /studio-nvc-prv-8b3k2
              </a>{' '}
              에서 확인할 수 있습니다. 여기 관리 페이지에서는 사용자 노드를 대신 열람·수정하거나 생성·정산·원가·API 한도를 관리합니다.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
