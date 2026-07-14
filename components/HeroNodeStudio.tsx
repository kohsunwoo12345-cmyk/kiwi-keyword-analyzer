'use client'
import { Cpu, Film, Sparkles, Play, ImageIcon, Sliders, FolderOpen, User, Type, Layers, Wand2, Video, Boxes, Grid3x3, Search, Plus, Save, Undo2, Redo2 } from 'lucide-react'

/**
 * 헤더 배경용 NODE STUDIO 노드 에디터 장면.
 * 실제 노드 에디터 UI(좌측 팔레트 · 상단 툴바 · 노드 소켓 · 우측 인스펙터 · 하단 상태바)를
 * 재현하고, 각 노드가 하나씩 떠오르며(staggered fadeInUp) 은은하게 부유(float)합니다.
 */

type Port = { c: string }
type Node = {
  x: number // %
  y: number // %
  w: number // px
  delay: number
  title: string
  no?: string
  color: string
  icon: React.ReactNode
  ins?: Port[]
  outs?: Port[]
  body: React.ReactNode
}

const NODES: Node[] = [
  {
    x: 22, y: 16, w: 194, delay: 0.5, title: '프롬프트 (Positive)', no: '#9', color: '#f59e0b', icon: <Sparkles size={11} />,
    outs: [{ c: '#f59e0b' }],
    body: (
      <div className="rounded bg-black/40 p-1.5 font-mono text-[8px] leading-relaxed text-amber-200/90">
        [SEEDANCE 2.0 — VIDEO]<br />15s | photoreal live-action
      </div>
    ),
  },
  {
    x: 22, y: 45, w: 194, delay: 0.9, title: '네거티브 프롬프트', no: '#10', color: '#38bdf8', icon: <Film size={11} />,
    outs: [{ c: '#38bdf8' }],
    body: <div className="rounded bg-black/40 p-1.5 font-mono text-[8px] text-sky-200/80">blur, distortion, watermark, text</div>,
  },
  {
    x: 5, y: 42, w: 150, delay: 1.3, title: '옴니 레퍼런스', no: '#16', color: '#3b82f6', icon: <ImageIcon size={11} />,
    outs: [{ c: '#3b82f6' }],
    body: (
      <div className="grid grid-cols-2 gap-1">
        <div className="h-8 rounded bg-gradient-to-br from-orange-500/70 to-rose-700/60" />
        <div className="h-8 rounded bg-gradient-to-br from-sky-600/60 to-blue-800/60" />
      </div>
    ),
  },
  {
    x: 44, y: 27, w: 184, delay: 0.2, title: 'AI 모델 로더', no: '#12', color: '#2563eb', icon: <Cpu size={11} />,
    ins: [{ c: '#f59e0b' }, { c: '#38bdf8' }, { c: '#3b82f6' }],
    outs: [{ c: '#2563eb' }],
    body: (
      <div className="space-y-1">
        <div className="flex items-center justify-between rounded bg-black/40 px-1.5 py-1 text-[8px] text-blue-200">
          <span>model</span><span className="font-bold">Seedance 2.0</span>
        </div>
        <div className="h-1 w-full rounded bg-blue-500/40"><div className="h-full w-2/3 rounded bg-blue-400" style={{ animation: 'loadbar 3s ease-in-out infinite' }} /></div>
      </div>
    ),
  },
  {
    x: 64, y: 21, w: 178, delay: 0.7, title: '영상 설정', no: '#13', color: '#22d3ee', icon: <Sliders size={11} />,
    ins: [{ c: '#2563eb' }],
    outs: [{ c: '#22d3ee' }],
    body: (
      <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-300">
        {['16:9', '1080p', '30 fps', '부드럽게'].map((t) => (
          <span key={t} className="rounded bg-black/40 px-1.5 py-0.5 text-center">{t}</span>
        ))}
      </div>
    ),
  },
  {
    x: 84, y: 15, w: 152, delay: 1.1, title: '영상 출력', no: '#17', color: '#10b981', icon: <Play size={11} />,
    ins: [{ c: '#22d3ee' }],
    body: <div className="relative h-11 overflow-hidden rounded bg-gradient-to-br from-rose-900/70 via-slate-900 to-blue-900/70"><span className="absolute left-1/2 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur"><Play size={11} className="ml-0.5 text-white" fill="white" /></span><span className="absolute bottom-1 right-1 rounded bg-emerald-500/90 px-1 text-[7px] font-bold text-white">4K</span></div>,
  },
  {
    x: 65, y: 56, w: 152, delay: 1.5, title: '영상 출력', no: '#14', color: '#10b981', icon: <Play size={11} />,
    ins: [{ c: '#2563eb' }],
    body: <div className="relative h-11 overflow-hidden rounded bg-gradient-to-br from-amber-900/60 via-slate-900 to-blue-900/70"><span className="absolute left-1/2 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur"><Play size={11} className="ml-0.5 text-white" fill="white" /></span></div>,
  },
]

// 노드 사이 연결선 (from → to, %기준 대략치)
const WIRES = [
  { d: 'M 39 22 C 47 22, 45 33, 52 33', c: '#f59e0b', dur: 1 },
  { d: 'M 39 50 C 47 50, 45 37, 52 37', c: '#38bdf8', dur: 1.3 },
  { d: 'M 20 47 C 40 47, 40 34, 52 34', c: '#3b82f6', dur: 1.6 },
  { d: 'M 70 33 C 76 33, 74 27, 80 27', c: '#22d3ee', dur: 1.1 },
  { d: 'M 90 25 C 96 25, 96 21, 99 21', c: '#22d3ee', dur: 1.2 },
  { d: 'M 70 35 C 74 47, 68 57, 72 61', c: '#10b981', dur: 1.4 },
]

const PALETTE = [
  { icon: <Type size={12} />, c: '#f59e0b' },
  { icon: <ImageIcon size={12} />, c: '#3b82f6' },
  { icon: <Cpu size={12} />, c: '#2563eb' },
  { icon: <Sliders size={12} />, c: '#22d3ee' },
  { icon: <Wand2 size={12} />, c: '#8b5cf6' },
  { icon: <Video size={12} />, c: '#10b981' },
  { icon: <Boxes size={12} />, c: '#ec4899' },
]

export function HeroNodeStudio() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070b16]">
      {/* subtle dotted canvas + grid */}
      <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
      <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '104px 104px' }} />
      <div className="animate-drift pointer-events-none absolute -top-32 left-1/3 h-[420px] w-[720px] rounded-full bg-blue-700/20 blur-[150px]" />
      <div className="animate-drift-slow pointer-events-none absolute bottom-0 right-1/4 h-[360px] w-[560px] rounded-full bg-cyan-600/12 blur-[140px]" />

      {/* top toolbar (navbar 아래에 위치) */}
      <div className="absolute inset-x-0 top-16 z-20 border-y border-white/10 bg-[#0a1024]/85 backdrop-blur animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5 font-bold text-white"><span className="grid h-4 w-4 place-items-center rounded bg-gradient-to-br from-sky-500 to-blue-600"><Boxes size={10} className="text-white" /></span> NODE STUDIO</span>
            <span className="hidden text-slate-400 sm:inline">파일</span>
            <span className="hidden text-slate-400 sm:inline">편집</span>
            <span className="hidden text-slate-400 md:inline">워크플로</span>
            <span className="hidden text-slate-400 md:inline">도움말</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="hidden items-center gap-1 rounded-md bg-white/5 px-1.5 py-1 text-slate-400 md:flex"><Undo2 size={11} /></span>
            <span className="hidden items-center gap-1 rounded-md bg-white/5 px-1.5 py-1 text-slate-400 md:flex"><Redo2 size={11} /></span>
            <span className="hidden items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-slate-300 sm:flex"><Save size={11} /> 저장</span>
            <span className="hidden items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-slate-300 md:flex"><FolderOpen size={11} /> 보관함</span>
            <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 font-semibold text-amber-300">₩1,232</span>
            <span className="flex items-center gap-1 rounded-md bg-gradient-to-br from-sky-500 to-blue-600 px-2.5 py-1 font-bold text-white shadow-lg shadow-blue-500/30"><Play size={10} fill="white" /> Queue</span>
          </div>
        </div>
        {/* tab strip */}
        <div className="hidden items-center gap-1 border-t border-white/5 px-4 py-1 sm:flex">
          <span className="flex items-center gap-1 rounded-t bg-white/[0.06] px-2.5 py-1 text-[9px] font-semibold text-white"><Sparkles size={9} className="text-sky-400" /> AI 영상 워크플로</span>
          <span className="px-2.5 py-1 text-[9px] text-slate-500">브랜드 광고 v3</span>
          <span className="px-2.5 py-1 text-[9px] text-slate-500">플레이스 리뷰</span>
          <span className="grid h-4 w-4 place-items-center rounded text-slate-500"><Plus size={10} /></span>
        </div>
      </div>

      {/* left palette rail */}
      <div className="absolute bottom-16 left-0 top-40 z-20 hidden w-11 flex-col items-center gap-1.5 border-r border-white/10 bg-[#0a1024]/70 py-3 backdrop-blur animate-fade-up sm:flex" style={{ animationDelay: '0.25s' }}>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-white/5 text-slate-400"><Search size={13} /></span>
        <div className="my-1 h-px w-6 bg-white/10" />
        {PALETTE.map((p, i) => (
          <span key={i} className="grid h-7 w-7 place-items-center rounded-md border border-white/5 bg-white/[0.03] transition-colors hover:bg-white/10" style={{ color: p.c, animation: `fadeInUp 0.5s ease ${0.4 + i * 0.08}s both` }}>{p.icon}</span>
        ))}
        <div className="my-1 h-px w-6 bg-white/10" />
        <span className="grid h-7 w-7 place-items-center rounded-md bg-white/5 text-slate-400"><Layers size={13} /></span>
      </div>

      {/* right inspector panel */}
      <div className="absolute bottom-16 right-0 top-40 z-20 hidden w-44 flex-col border-l border-white/10 bg-[#0a1024]/70 backdrop-blur animate-fade-up lg:flex" style={{ animationDelay: '0.35s' }}>
        <div className="flex items-center gap-1.5 border-b border-white/8 px-3 py-2 text-[10px] font-bold text-white"><Sliders size={11} className="text-sky-400" /> 속성</div>
        <div className="space-y-2.5 p-3">
          <div>
            <div className="mb-1 text-[8px] uppercase tracking-wide text-slate-500">모델</div>
            <div className="flex items-center justify-between rounded bg-black/30 px-2 py-1 text-[9px] text-blue-200"><span>Seedance 2.0</span><Cpu size={9} /></div>
          </div>
          <div>
            <div className="mb-1 text-[8px] uppercase tracking-wide text-slate-500">해상도</div>
            <div className="flex gap-1">
              {['720p', '1080p', '4K'].map((r, i) => (
                <span key={r} className={`flex-1 rounded px-1 py-0.5 text-center text-[8px] ${i === 1 ? 'bg-blue-500/30 text-blue-100' : 'bg-black/30 text-slate-400'}`}>{r}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[8px] uppercase tracking-wide text-slate-500"><span>모션 강도</span><span className="text-slate-400">0.7</span></div>
            <div className="h-1 w-full rounded bg-white/10"><div className="h-full w-[70%] rounded bg-gradient-to-r from-sky-500 to-blue-500" /></div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[8px] uppercase tracking-wide text-slate-500"><span>일관성</span><span className="text-slate-400">0.9</span></div>
            <div className="h-1 w-full rounded bg-white/10"><div className="h-full w-[90%] rounded bg-gradient-to-r from-sky-500 to-blue-500" /></div>
          </div>
          <div className="flex items-center justify-between rounded bg-black/30 px-2 py-1 text-[9px] text-slate-300"><span>ControlNet</span><span className="h-3 w-5 rounded-full bg-emerald-500/70 p-0.5"><span className="block h-2 w-2 translate-x-2 rounded-full bg-white" /></span></div>
        </div>
      </div>

      {/* wires */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 z-0 h-full w-full">
        {WIRES.map((w, i) => (
          <g key={i} style={{ animation: `fadeIn 0.6s ease ${0.6 + i * 0.2}s both` }}>
            <path d={w.d} fill="none" stroke={w.c} strokeWidth="0.8" opacity="0.12" />
            <path d={w.d} fill="none" stroke={w.c} strokeWidth="0.4" strokeDasharray="1.4 1.4" opacity="0.85"
              style={{ animation: `dash-flow ${w.dur}s linear infinite` }} />
          </g>
        ))}
      </svg>

      {/* nodes */}
      {NODES.map((n, i) => (
        <div key={i} className="absolute z-10" style={{ left: `${n.x}%`, top: `${n.y}%`, width: n.w, animation: `fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) ${n.delay}s both` }}>
          <div className="animate-bob" style={{ animationDelay: `${i * 0.5}s`, animationDuration: '6s' }}>
            <div className="relative rounded-lg border border-white/12 bg-[#111a30]/90 shadow-xl shadow-black/40 backdrop-blur">
              {/* input sockets (left) */}
              {n.ins && (
                <div className="absolute -left-[5px] top-8 flex flex-col gap-1.5">
                  {n.ins.map((p, k) => (
                    <span key={k} className="h-2 w-2 rounded-full border border-white/40" style={{ background: p.c }} />
                  ))}
                </div>
              )}
              {/* output sockets (right) */}
              {n.outs && (
                <div className="absolute -right-[5px] top-8 flex flex-col gap-1.5">
                  {n.outs.map((p, k) => (
                    <span key={k} className="h-2 w-2 rounded-full border border-white/40" style={{ background: p.c, boxShadow: `0 0 6px ${p.c}` }} />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between rounded-t-lg px-2 py-1.5" style={{ background: `${n.color}22`, borderBottom: `1px solid ${n.color}33` }}>
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
      <div className="absolute bottom-8 left-14 z-20 hidden h-16 w-28 rounded-md border border-white/10 bg-black/40 p-2 animate-fade-up sm:block" style={{ animationDelay: '1.8s' }}>
        <div className="mb-1 flex items-center gap-1 text-[7px] text-slate-500"><Grid3x3 size={8} /> 미니맵</div>
        <div className="flex h-8 items-end gap-1">
          {[40, 70, 30, 55, 80, 45].map((h, i) => <div key={i} className="flex-1 rounded-sm bg-white/15" style={{ height: `${h}%` }} />)}
        </div>
      </div>

      {/* bottom status bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between border-t border-white/10 bg-[#0a1024]/85 px-4 py-1.5 text-[9px] text-slate-400 backdrop-blur animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: 'pulse 2s ease-in-out infinite' }} /> 연결됨</span>
          <span className="hidden sm:inline">노드 7</span>
          <span className="hidden sm:inline">GPU · Seedance 2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline">100%</span>
          <span className="hidden sm:inline">x: 1240 · y: 680</span>
          <span className="flex items-center gap-1 text-sky-300"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" style={{ animation: 'pulse 1.4s ease-in-out infinite' }} /> 렌더링 중</span>
        </div>
      </div>

      {/* readability scrim */}
      <div className="absolute inset-0 z-[15] bg-gradient-to-b from-[#070b16]/70 via-[#070b16]/45 to-[#070b16]/90" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-40 bg-gradient-to-b from-transparent to-[var(--bg)]" />
    </div>
  )
}
