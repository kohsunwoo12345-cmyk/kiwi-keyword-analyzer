'use client'

import { Cpu, Film, Sparkles, Play, ImageIcon, Sliders, FolderOpen, User } from 'lucide-react'

/**
 * 헤더 배경용 NODE STUDIO 노드 에디터 장면.
 * 각 노드가 하나씩 떠오르며(staggered fadeInUp) 은은하게 부유(float)합니다.
 */

type Node = {
  x: number // %
  y: number // %
  w: number // px
  delay: number
  title: string
  no?: string
  color: string
  icon: React.ReactNode
  body: React.ReactNode
}

const NODES: Node[] = [
  {
    x: 24, y: 15, w: 190, delay: 0.5, title: '프롬프트 (Positive)', no: '#9', color: '#f59e0b', icon: <Sparkles size={11} />,
    body: (
      <div className="rounded bg-black/40 p-1.5 font-mono text-[8px] leading-relaxed text-amber-200/90">
        [SEEDANCE 2.0 — VIDEO]<br />15s | photoreal live-action
      </div>
    ),
  },
  {
    x: 24, y: 43, w: 190, delay: 0.9, title: '네거티브 프롬프트', no: '#10', color: '#38bdf8', icon: <Film size={11} />,
    body: <div className="rounded bg-black/40 p-1.5 font-mono text-[8px] text-sky-200/80">blur, distortion, watermark, text</div>,
  },
  {
    x: 5, y: 40, w: 150, delay: 1.3, title: '옴니 레퍼런스', no: '#16', color: '#a855f7', icon: <ImageIcon size={11} />,
    body: <div className="h-9 rounded bg-gradient-to-br from-sky-600/60 to-indigo-800/60" />,
  },
  {
    x: 45, y: 27, w: 180, delay: 0.2, title: 'AI 모델 로더', no: '#12', color: '#7c3aed', icon: <Cpu size={11} />,
    body: (
      <div className="space-y-1">
        <div className="flex items-center justify-between rounded bg-black/40 px-1.5 py-1 text-[8px] text-violet-200">
          <span>model</span><span className="font-bold">Seedance 2.0</span>
        </div>
        <div className="h-1 w-full rounded bg-violet-500/40"><div className="h-full w-2/3 rounded bg-violet-400" /></div>
      </div>
    ),
  },
  {
    x: 65, y: 20, w: 175, delay: 0.7, title: '영상 설정', no: '#13', color: '#22d3ee', icon: <Sliders size={11} />,
    body: (
      <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-300">
        {['16:9', '1080p', '30 fps', '부드럽게'].map((t) => (
          <span key={t} className="rounded bg-black/40 px-1.5 py-0.5 text-center">{t}</span>
        ))}
      </div>
    ),
  },
  {
    x: 84, y: 14, w: 150, delay: 1.1, title: '영상 출력', no: '#17', color: '#10b981', icon: <Play size={11} />,
    body: <div className="relative h-10 rounded bg-gradient-to-br from-rose-900/70 via-slate-900 to-indigo-900/70"><Play size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80" /></div>,
  },
  {
    x: 66, y: 55, w: 150, delay: 1.5, title: '영상 출력', no: '#14', color: '#10b981', icon: <Play size={11} />,
    body: <div className="relative h-10 rounded bg-gradient-to-br from-amber-900/60 via-slate-900 to-violet-900/70"><Play size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80" /></div>,
  },
]

// 노드 사이 연결선 (from → to, %기준 대략치)
const WIRES = [
  { d: 'M 40 22 C 47 22, 46 33, 53 33', c: '#f59e0b', dur: 1 },
  { d: 'M 40 48 C 47 48, 46 37, 53 37', c: '#38bdf8', dur: 1.3 },
  { d: 'M 20 46 C 40 46, 40 34, 53 34', c: '#a855f7', dur: 1.6 },
  { d: 'M 71 33 C 76 33, 74 26, 80 26', c: '#ec4899', dur: 1.1 },
  { d: 'M 90 24 C 96 24, 96 20, 99 20', c: '#22d3ee', dur: 1.2 },
  { d: 'M 71 35 C 74 46, 70 56, 74 60', c: '#10b981', dur: 1.4 },
]

export function HeroNodeStudio() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070b16]">
      {/* subtle dotted canvas */}
      <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
      <div className="animate-drift pointer-events-none absolute -top-32 left-1/3 h-[420px] w-[720px] rounded-full bg-violet-700/20 blur-[150px]" />

      {/* top toolbar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 bg-[#0a1024]/80 px-4 py-2.5 backdrop-blur animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5 font-bold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400" /> NODE STUDIO</span>
          <span className="hidden sm:inline text-slate-400">워크플로</span>
          <span className="hidden sm:inline text-slate-400">편집</span>
          <span className="hidden sm:inline text-slate-400">도움말</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="hidden items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-slate-300 sm:flex"><User size={11} /> 관리자</span>
          <span className="hidden items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-slate-300 md:flex"><FolderOpen size={11} /> 보관함</span>
          <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 font-semibold text-amber-300">비용 ₩1,232</span>
          <span className="flex items-center gap-1 rounded-md bg-gradient-to-br from-sky-500 to-blue-600 px-2.5 py-1 font-bold text-white"><Play size={10} /> Queue</span>
        </div>
      </div>

      {/* wires */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {WIRES.map((w, i) => (
          <path key={i} d={w.d} fill="none" stroke={w.c} strokeWidth="0.4" strokeDasharray="1.4 1.4" opacity="0.8"
            style={{ animation: `dash-flow ${w.dur}s linear infinite, fadeIn 0.6s ease ${0.6 + i * 0.2}s both` }} />
        ))}
      </svg>

      {/* nodes */}
      {NODES.map((n, i) => (
        <div key={i} className="absolute" style={{ left: `${n.x}%`, top: `${n.y}%`, width: n.w, animation: `fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) ${n.delay}s both` }}>
          <div className="animate-bob" style={{ animationDelay: `${i * 0.5}s`, animationDuration: '6s' }}>
            <div className="rounded-lg border border-white/12 bg-[#111a30]/90 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between rounded-t-lg px-2 py-1.5" style={{ background: `${n.color}22` }}>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-white">
                  <span className="grid h-3.5 w-3.5 place-items-center rounded text-white" style={{ background: n.color }}>{n.icon}</span>
                  {n.title}
                </span>
                {n.no && <span className="text-[8px] text-slate-400">{n.no}</span>}
              </div>
              <div className="p-1.5">{n.body}</div>
            </div>
          </div>
        </div>
      ))}

      {/* minimap */}
      <div className="absolute bottom-4 left-4 hidden h-16 w-28 rounded-md border border-white/10 bg-black/40 p-2 animate-fade-up sm:block" style={{ animationDelay: '1.8s' }}>
        <div className="flex h-full items-end gap-1">
          {[40, 70, 30, 55, 80, 45].map((h, i) => <div key={i} className="flex-1 rounded-sm bg-white/15" style={{ height: `${h}%` }} />)}
        </div>
      </div>

      {/* readability scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b16]/70 via-[#070b16]/45 to-[#070b16]/90" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg)]" />
    </div>
  )
}
