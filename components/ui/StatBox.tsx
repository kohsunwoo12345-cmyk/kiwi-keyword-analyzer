import { cn, formatNumberFull } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatBoxProps {
  label: string
  value: string | number
  subValue?: string
  icon?: React.ReactNode
  trend?: number
  highlight?: boolean
  className?: string
  unit?: string
}

export function StatBox({ label, value, subValue, icon, trend, highlight, className, unit }: StatBoxProps) {
  const displayValue = typeof value === 'number' ? formatNumberFull(value) : value

  return (
    <div className={cn(
      'rounded-xl border p-4 flex flex-col gap-1',
      highlight ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white',
      className
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="flex items-end gap-1.5 mt-1">
        <span className={cn('text-xl font-bold', highlight ? 'text-green-700' : 'text-gray-900')}>
          {displayValue}
        </span>
        {unit && <span className="text-sm text-gray-500 mb-0.5">{unit}</span>}
        {trend !== undefined && (
          <span className={cn('text-xs flex items-center gap-0.5 mb-0.5', trend > 0 ? 'text-red-500' : trend < 0 ? 'text-blue-500' : 'text-gray-400')}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {subValue && <span className="text-xs text-gray-400">{subValue}</span>}
    </div>
  )
}
