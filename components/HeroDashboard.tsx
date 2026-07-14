'use client'

import {
  LayoutDashboard,
  BarChart3,
  Users,
  Film,
  Megaphone,
  Settings,
  Search,
  Bell,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const M: Dict = {
  '마케팅 대시보드': { en: 'Marketing dashboard', ja: 'マーケティングダッシュボード', zh: '营销仪表盘' },
  실시간: { en: 'Live', ja: 'リアルタイム', zh: '实时' },
  '최근 30일': { en: 'Last 30 days', ja: '過去30日', zh: '近 30 天' },
  '수집 리드': { en: 'Leads', ja: '獲得リード', zh: '收集线索' },
  전환율: { en: 'Conversion', ja: '転換率', zh: '转化率' },
  '광고 ROAS': { en: 'Ad ROAS', ja: '広告ROAS', zh: '广告 ROAS' },
  'AI 영상': { en: 'AI videos', ja: 'AI動画', zh: 'AI 视频' },
  '채널 성과': { en: 'Channel performance', ja: 'チャネル成果', zh: '渠道成效' },
  '전환 추이': { en: 'Conversion trend', ja: '転換推移', zh: '转化趋势' },
}

const KPIS = [
  { label: '수집 리드', value: '12,480', delta: '+18.2%', icon: Users, accent: '#3b82f6' },
  { label: '전환율', value: '6.4%', delta: '+2.1%', icon: TrendingUp, accent: '#22d3ee' },
  { label: '광고 ROAS', value: '3.7x', delta: '+0.6x', icon: Megaphone, accent: '#6366f1' },
  { label: 'AI 영상', value: '284', delta: '+42', icon: Film, accent: '#0ea5e9' },
]

const CHANNELS = [
  { name: 'NAVER Place', pct: 88, color: '#22c55e' },
  { name: 'YouTube', pct: 72, color: '#ef4444' },
  { name: 'Instagram', pct: 64, color: '#ec4899' },
  { name: 'Blog', pct: 51, color: '#3b82f6' },
  { name: 'Kakao', pct: 43, color: '#eab308' },
]

const NAV_ICONS = [LayoutDashboard, BarChart3, Users, Megaphone, Film, Settings]

// 부드러운 영역 차트 경로
const AREA = 'M0,86 C40,78 70,52 110,58 C150,64 175,30 220,36 C265,42 290,20 330,24 C370,28 400,12 430,16 L430,120 L0,120 Z'
const LINE = 'M0,86 C40,78 70,52 110,58 C150,64 175,30 220,36 C265,42 290,20 330,24 C370,28 400,12 430,16'

export function HeroDashboard() {
  const t = useT(M)
  return (
    <div className="relative mx-auto mt-16 max-w-5xl animate-fade-up delay-500 sm:mt-20">
      {/* 광채 */}
      <div className="pointer-events-none absolute -inset-x-10 -top-8 bottom-0 rounded-[2rem] bg-blue-600/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#0b1220] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]">
        {/* 윈도우 상단바 */}
        <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto hidden items-center gap-2 rounded-md bg-white/[0.05] px-3 py-1 text-[11px] text-slate-400 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> app.bygency.co / dashboard
          </div>
          <div className="ml-auto flex items-center gap-2 text-slate-400 sm:ml-0">
            <Search size={14} />
            <Bell size={14} />
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-600" />
          </div>
        </div>

        <div className="flex">
          {/* 사이드바 */}
          <div className="hidden w-14 flex-shrink-0 flex-col items-center gap-1.5 border-r border-white/8 bg-white/[0.02] py-4 sm:flex">
            <span className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
              <LayoutDashboard size={16} />
            </span>
            {NAV_ICONS.map((Icon, i) => (
              <span
                key={i}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                  i === 0 ? 'bg-blue-500/15 text-blue-300' : 'text-slate-500 hover:bg-white/5',
                )}
              >
                <Icon size={15} />
              </span>
            ))}
          </div>

          {/* 본문 */}
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white sm:text-base">{t('마케팅 대시보드')}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                  {t('실시간')}
                </span>
              </div>
              <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400">
                {t('최근 30일')}
              </span>
            </div>

            {/* KPI 카드 */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {KPIS.map((k) => {
                const Icon = k.icon
                return (
                  <div key={k.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${k.accent}22`, color: k.accent }}>
                        <Icon size={14} />
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                        <ArrowUpRight size={11} />
                        {k.delta}
                      </span>
                    </div>
                    <div className="mt-2 text-lg font-bold tracking-tight text-white">{k.value}</div>
                    <div className="text-[11px] text-slate-400">{t(k.label)}</div>
                  </div>
                )
              })}
            </div>

            {/* 차트 + 채널 */}
            <div className="mt-3 grid gap-2.5 lg:grid-cols-[1.6fr_1fr]">
              {/* 영역 차트 */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{t('전환 추이')}</span>
                  <span className="text-[11px] font-semibold text-blue-300">+24.8%</span>
                </div>
                <svg viewBox="0 0 430 120" preserveAspectRatio="none" className="h-24 w-full">
                  <defs>
                    <linearGradient id="hd-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.42" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={AREA} fill="url(#hd-area)" />
                  <path d={LINE} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="430" cy="16" r="4" fill="#93c5fd" />
                </svg>
                <div className="mt-1 flex justify-between text-[9px] text-slate-500">
                  {['1주', '2주', '3주', '4주', '오늘'].map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
              </div>

              {/* 채널 성과 */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                <span className="text-xs font-semibold text-slate-200">{t('채널 성과')}</span>
                <div className="mt-3 space-y-2.5">
                  {CHANNELS.map((c) => (
                    <div key={c.name}>
                      <div className="mb-1 flex items-center justify-between text-[10px]">
                        <span className="text-slate-300">{c.name}</span>
                        <span className="text-slate-500">{c.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
