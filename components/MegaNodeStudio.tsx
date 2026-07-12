'use client'

import Link from 'next/link'
import { Play, Cpu, Film, Sparkles } from 'lucide-react'

/**
 * 메가메뉴 프로모: NODE STUDIO 스타일 애니메이션 노드 그래프 (AI 영상 제작).
 * 연결선이 흐르고(대시 애니메이션) 전체가 은은하게 움직입니다.
 */
export function MegaNodeStudio({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/features/video"
      onClick={onNavigate}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-[#0a1024] p-4 shadow-lg"
    >
      {/* top bar */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" /> NODE STUDIO
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          <Sparkles size={10} /> NEW
        </span>
      </div>

      {/* node graph */}
      <div className="relative mt-3 h-[132px] w-full animate-drift-slow">
        <svg viewBox="0 0 260 132" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="wire" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          {/* flowing wires */}
          <path d="M64 34 C 96 34, 96 60, 128 60" fill="none" stroke="url(#wire)" strokeWidth="2"
            strokeDasharray="6 6" style={{ animation: 'dash-flow 1s linear infinite' }} />
          <path d="M64 98 C 96 98, 96 64, 128 64" fill="none" stroke="url(#wire)" strokeWidth="2"
            strokeDasharray="6 6" style={{ animation: 'dash-flow 1.4s linear infinite' }} />
          <path d="M188 62 C 210 62, 210 40, 230 40" fill="none" stroke="#22d3ee" strokeWidth="2"
            strokeDasharray="6 6" style={{ animation: 'dash-flow 1.2s linear infinite' }} />
        </svg>

        {/* nodes */}
        <NodeBox x={6} y={16} color="#f59e0b" icon={<Sparkles size={11} />} label="프롬프트" />
        <NodeBox x={6} y={80} color="#38bdf8" icon={<Film size={11} />} label="레퍼런스" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-2.5 py-2 text-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
            <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-violet-200"><Cpu size={11} /> AI 모델</span>
            <span className="mt-0.5 block text-[8px] text-slate-400">Seedance 2.0</span>
          </div>
        </div>
        <NodeBox x={196} y={22} color="#22d3ee" icon={<Play size={11} />} label="영상 출력" />
      </div>

      {/* footer */}
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">텍스트만으로 광고 영상</p>
          <p className="text-[11px] text-slate-400">노드 기반 AI 영상 제작 · 90% 시간 단축</p>
        </div>
        <span className="flex items-center gap-1 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition-transform group-hover:scale-105">
          <Play size={11} /> 실행
        </span>
      </div>
    </Link>
  )
}

function NodeBox({ x, y, color, icon, label }: { x: number; y: number; color: string; icon: React.ReactNode; label: string }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 backdrop-blur">
        <span className="grid h-4 w-4 place-items-center rounded text-white" style={{ background: color }}>{icon}</span>
        <span className="text-[9px] font-semibold text-slate-200">{label}</span>
      </div>
    </div>
  )
}
