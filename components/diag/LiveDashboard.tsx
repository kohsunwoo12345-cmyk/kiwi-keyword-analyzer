'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity } from 'lucide-react'
import type { LiveSample, LogRow, PidDef } from '@/lib/obd/types'
import { formatValue } from '@/lib/obd/pids'
import { Gauge } from './Gauge'

interface Props {
  activePids: PidDef[]
  latest: LiveSample
  history: LogRow[]
}

export function LiveDashboard({ activePids, latest, history }: Props) {
  const [metric, setMetric] = useState('rpm')

  if (activePids.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
        <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
        실시간 데이터 수신 대기 중… (연결 후 자동으로 표시됩니다)
      </div>
    )
  }

  const chartPid = activePids.find(p => p.id === metric) ?? activePids[0]
  const data = history.map((r, i) => ({ i, v: r.values[chartPid.id] ?? null }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {activePids.map(def => (
          <Gauge key={def.id} def={def} value={latest[def.id]} />
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> 실시간 그래프
          </h3>
          <div className="flex flex-wrap gap-1">
            {activePids.map(p => (
              <button
                key={p.id}
                onClick={() => setMetric(p.id)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  chartPid.id === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="i" tick={false} axisLine={{ stroke: '#e5e7eb' }} height={8} />
              <YAxis
                domain={[chartPid.min, chartPid.max]}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e5e7eb' }}
                width={48}
              />
              <Tooltip
                formatter={value => {
                  const num = typeof value === 'number' ? value : Number(value)
                  return [`${formatValue(num, chartPid.unit)} ${chartPid.unit}`, chartPid.name]
                }}
                labelFormatter={() => ''}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-right text-sm text-gray-500">
          현재값:{' '}
          <span className="font-bold text-gray-800">
            {latest[chartPid.id] != null ? `${formatValue(latest[chartPid.id], chartPid.unit)} ${chartPid.unit}` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
