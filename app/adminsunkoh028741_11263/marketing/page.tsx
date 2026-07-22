'use client'

import { useEffect, useState } from 'react'
import {
  Workflow, Palette, Filter, Zap, Send, Megaphone, TrendingUp, Route, Inbox, LineChart, Ticket,
  Boxes, ArrowRight, ExternalLink, type LucideIcon,
} from 'lucide-react'
import { MktCanvas, MktHeader, MktNode, MktStat } from '@/components/marketing/node'
import { Reveal } from '@/components/motion'
import { adminAdPerformance, type AdPerfStats } from '@/lib/auth'
import { ADMIN_BASE } from '../layout'

const num = (n: number) => (n || 0).toLocaleString('ko-KR')

type Node = { title: string; href: string; icon: LucideIcon; desc: string; accent: string; tag?: string; id: string }
type Stage = { key: string; label: string; hint: string; accent: string; nodes: Node[] }

// 마케팅 퍼널 흐름: 제작 → 유입·발송 → 측정·분석 → 전환·리텐션
const STAGES: Stage[] = [
  {
    key: 'build', label: '제작', hint: '랜딩·퍼널 자산 생성', accent: '#7c5cf6',
    nodes: [
      { id: 'N01', title: '랜딩페이지 제작', href: '/tools/landing-builder.html', icon: Palette, accent: '#7c5cf6', tag: '빌더',
        desc: '드래그 블럭으로 랜딩페이지를 만들고 발행. QR·픽셀·폼까지 한 화면에서.' },
      { id: 'N02', title: '퍼널 빌더', href: '/tools/funnel-builder.html', icon: Filter, accent: '#8b5cf6', tag: '빌더',
        desc: '유입부터 전환까지 단계별 퍼널을 설계하고 스텝별 이탈을 잡습니다.' },
    ],
  },
  {
    key: 'reach', label: '유입 · 발송', hint: '트래픽·메시지 발송', accent: '#3b82f6',
    nodes: [
      { id: 'N03', title: '마케팅 자동화', href: '/tools/marketing-automation.html', icon: Zap, accent: '#3b82f6', tag: '자동화',
        desc: '조건 기반 시나리오로 문자·알림톡·알림을 자동 발송하는 워크플로우.' },
      { id: 'N04', title: '발송 설정', href: `${ADMIN_BASE}/messaging`, icon: Send, accent: '#0ea5e9', tag: '채널',
        desc: '문자·알림톡 발신 채널과 템플릿, 발송 정책을 관리합니다.' },
      { id: 'N05', title: '광고 성과', href: `${ADMIN_BASE}/ad-performance`, icon: TrendingUp, accent: '#2563eb', tag: '분석',
        desc: '알림 CTA가 우리 랜딩이면 자동 광고 등록 · 노출·클릭·전환을 추적.' },
    ],
  },
  {
    key: 'analyze', label: '측정 · 분석', hint: '유입 경로·전환 측정', accent: '#10b981',
    nodes: [
      { id: 'N06', title: '랜딩 경로 분석', href: '/tools/landing-traffic.html', icon: Route, accent: '#10b981', tag: '트래픽',
        desc: 'UTM·리퍼러 기반 채널별 유입을 분해하고 공유 리포트로 배포.' },
      { id: 'N07', title: '퍼널 분석', href: '/tools/funnel-landing-analytics.html', icon: LineChart, accent: '#14b8a6', tag: '분석',
        desc: '퍼널 단계별 진입·이탈·전환율을 시각화해 병목을 찾습니다.' },
      { id: 'N08', title: '랜딩 신청 DB', href: '/tools/landing-submissions.html', icon: Inbox, accent: '#22c55e', tag: 'DB',
        desc: '랜딩 폼으로 들어온 신청자를 폴더로 관리하고 엑셀로 내려받기.' },
    ],
  },
  {
    key: 'convert', label: '전환 · 리텐션', hint: '혜택·재구매 유도', accent: '#f59e0b',
    nodes: [
      { id: 'N09', title: '쿠폰 · 할인코드', href: `${ADMIN_BASE}/coupons`, icon: Ticket, accent: '#f59e0b', tag: '혜택',
        desc: '할인코드를 발급·배포하고 사용률과 매출 기여를 추적합니다.' },
    ],
  },
]

export default function MarketingDashboard() {
  const [stats, setStats] = useState<AdPerfStats>({ ok: false })
  useEffect(() => { adminAdPerformance().then(setStats).catch(() => {}) }, [])
  const t = stats.totals

  return (
    <MktCanvas>
      <MktHeader
        icon={Workflow}
        eyebrow="ADMIN · 마케팅"
        title="마케팅 노드 스튜디오"
        desc="랜딩 제작 → 유입·발송 → 측정·분석 → 전환까지, 마케팅 도구를 하나의 노드 그래프로 연결했습니다. 노드를 클릭해 각 도구로 이동하세요."
        accent="#5b6cff"
      />

      <div className="space-y-8 p-6 lg:p-8">
        {/* 요약 스탯 */}
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MktStat label="랜딩페이지" value={num(t?.landings ?? 0)} icon={Palette} accent="#7c5cf6" />
            <MktStat label="랜딩 총 조회수" value={num(t?.landingViews ?? 0)} icon={Route} accent="#3b82f6" />
            <MktStat label="랜딩 총 전환" value={num(t?.landingConversions ?? 0)} icon={TrendingUp} accent="#10b981" />
            <MktStat label="광고(알림) 클릭" value={num(t?.adClicks ?? 0)} icon={Megaphone} accent="#f59e0b" />
          </div>
        </Reveal>

        {/* 노드 그래프 — 스테이지 그룹 */}
        <div className="space-y-5">
          {STAGES.map((stage, si) => (
            <Reveal key={stage.key}>
              <div className="relative">
                {/* 스테이지(ComfyUI 그룹 박스) */}
                <div
                  className="rounded-2xl border p-4 sm:p-5"
                  style={{
                    borderColor: `${stage.accent}44`,
                    background: `linear-gradient(180deg, ${stage.accent}12, transparent 70%)`,
                  }}
                >
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="grid h-6 w-6 place-items-center rounded-md text-[11px] font-extrabold text-white" style={{ background: stage.accent }}>
                      {si + 1}
                    </span>
                    <span className="text-sm font-extrabold tracking-tight text-[var(--mkt-text)]">{stage.label}</span>
                    <span className="text-[11px] font-medium text-[var(--mkt-text-dim)]">{stage.hint}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {stage.nodes.map((n, ni) => (
                      <MktNode
                        key={n.id}
                        title={n.title}
                        desc={n.desc}
                        icon={n.icon}
                        href={n.href}
                        accent={n.accent}
                        tag={n.tag}
                        nodeId={n.id}
                        cta={n.href.startsWith('/tools/') ? '도구 열기' : '바로가기'}
                        ports={{ in: si > 0 || ni > 0, out: true }}
                      />
                    ))}
                  </div>
                </div>
                {/* 스테이지 연결 화살표 */}
                {si < STAGES.length - 1 && (
                  <div className="flex justify-center py-1">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--mkt-border-2)] bg-[#14161d] text-[var(--mkt-accent-2)]">
                      <ArrowRight size={15} className="rotate-90" />
                    </span>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        {/* 하단 콜아웃 — 영상 스튜디오 연계 */}
        <Reveal>
          <div className="mkt-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mkt-badge h-10 w-10" style={{ background: 'linear-gradient(135deg,#5b6cff,#8b5cf6)' }}>
                <Boxes size={19} />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--mkt-text)]">영상 노드 스튜디오와 같은 워크플로우</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--mkt-text-soft)]">
                  마케팅 도구도 영상 스튜디오처럼 노드로 연결됩니다. AI 영상 제작은 영상 관리 대시보드에서 이어서 진행하세요.
                </p>
              </div>
            </div>
            <a
              href={`${ADMIN_BASE}/video`}
              className="mkt-btn ghost flex-shrink-0"
            >
              영상 대시보드 <ExternalLink size={14} />
            </a>
          </div>
        </Reveal>
      </div>
    </MktCanvas>
  )
}
