import type { PidDef } from '@/lib/obd/types'
import { formatValue } from '@/lib/obd/pids'

const RADIUS = 50
const CIRC = 2 * Math.PI * RADIUS
const ARC_FRAC = 0.75 // 270도 게이지
const ARC_LEN = CIRC * ARC_FRAC

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function Gauge({ def, value }: { def: PidDef; value?: number }) {
  const hasValue = typeof value === 'number' && !Number.isNaN(value)
  const pct = hasValue ? clamp((value! - def.min) / (def.max - def.min), 0, 1) : 0
  const warn = def.warnAbove != null && hasValue && value! >= def.warnAbove
  const high = !warn && pct > 0.85

  const color = warn ? '#ef4444' : high ? '#f59e0b' : '#2563eb'
  const dash = ARC_LEN * pct

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center shadow-sm">
      <div className="relative w-[112px] h-[112px]">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${CIRC}`}
            transform="rotate(135 60 60)"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            transform="rotate(135 60 60)"
            style={{ transition: 'stroke-dasharray 0.25s ease, stroke 0.25s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums" style={{ color: warn ? '#ef4444' : '#111827' }}>
            {hasValue ? formatValue(value!, def.unit) : '—'}
          </span>
          <span className="text-[10px] text-gray-400">{def.unit}</span>
        </div>
      </div>
      <span className="mt-1 text-xs font-medium text-gray-600 text-center leading-tight">{def.name}</span>
      {warn && <span className="mt-0.5 text-[10px] font-bold text-red-500">경고</span>}
    </div>
  )
}
