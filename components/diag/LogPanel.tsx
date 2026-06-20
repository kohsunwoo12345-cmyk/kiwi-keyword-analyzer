'use client'

import { Play, Square, Download, FileText } from 'lucide-react'
import type { LogRow } from '@/lib/obd/types'
import { PID_LIST, formatValue } from '@/lib/obd/pids'

interface Props {
  isLogging: boolean
  logRows: LogRow[]
  connected: boolean
  onStart: () => void
  onStop: () => void
  onExport: () => void
}

// 표에 보여줄 대표 컬럼
const COLS = PID_LIST.filter(p => ['rpm', 'speed', 'coolant', 'throttle'].includes(p.id))

export function LogPanel({ isLogging, logRows, connected, onStart, onStop, onExport }: Props) {
  const recent = logRows.slice(-8).reverse()
  const duration =
    logRows.length >= 2 ? Math.round((logRows[logRows.length - 1].t - logRows[0].t) / 1000) : 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" /> 주행 로그
          {logRows.length > 0 && (
            <span className="text-xs text-gray-500">
              {logRows.length.toLocaleString('ko-KR')}행 · {duration}초
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          {isLogging ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
            >
              <Square className="w-3.5 h-3.5" /> 기록 중지
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={!connected}
              className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500 disabled:opacity-40 transition-colors"
            >
              <Play className="w-3.5 h-3.5" /> 기록 시작
            </button>
          )}
          <button
            onClick={onExport}
            disabled={logRows.length === 0}
            className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV 저장
          </button>
        </div>
      </div>

      {isLogging && (
        <div className="mb-3 flex items-center gap-2 text-sm text-red-500">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> 기록 중…
        </div>
      )}

      {logRows.length === 0 ? (
        <div className="text-center text-gray-400 py-8 text-sm">
          {connected ? '‘기록 시작’을 누르면 실시간 데이터가 누적됩니다.' : '연결 후 로그를 기록할 수 있습니다.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">시각</th>
                {COLS.map(c => (
                  <th key={c.id} className="py-2 px-3 font-medium whitespace-nowrap">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                    {new Date(r.t).toLocaleTimeString('ko-KR')}
                  </td>
                  {COLS.map(c => (
                    <td key={c.id} className="py-2 px-3 tabular-nums">
                      {r.values[c.id] != null ? formatValue(r.values[c.id], c.unit) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {logRows.length > recent.length && (
            <div className="text-center text-xs text-gray-400 mt-2">최근 8행만 표시 · 전체는 CSV로 저장</div>
          )}
        </div>
      )}
    </div>
  )
}
