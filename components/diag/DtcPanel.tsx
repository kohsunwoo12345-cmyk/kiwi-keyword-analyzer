'use client'

import { AlertTriangle, CheckCircle2, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import type { Dtc } from '@/lib/obd/types'

interface Props {
  dtcs: Dtc[]
  pendingDtcs: Dtc[]
  loading: boolean
  connected: boolean
  onRead: () => void
  onClear: () => void
}

export function DtcPanel({ dtcs, pendingDtcs, loading, connected, onRead, onClear }: Props) {
  const handleClear = () => {
    if (window.confirm('저장된 고장코드와 경고등(MIL)을 삭제합니다.\n실제 고장이 해결되지 않았다면 코드가 다시 나타날 수 있습니다. 계속할까요?')) {
      onClear()
    }
  }

  const total = dtcs.length + pendingDtcs.length

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> 고장코드 (DTC)
          {connected && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${total > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {total}건
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onRead}
            disabled={!connected || loading}
            className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} 다시 읽기
          </button>
          <button
            onClick={handleClear}
            disabled={!connected || loading || total === 0}
            className="flex items-center gap-1.5 text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> 코드 삭제
          </button>
        </div>
      </div>

      {!connected ? (
        <div className="text-center text-gray-400 py-8 text-sm">연결 후 고장코드를 확인할 수 있습니다.</div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center text-emerald-600 py-8">
          <CheckCircle2 className="w-10 h-10 mb-2" />
          <span className="font-medium">감지된 고장코드가 없습니다</span>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {[...dtcs, ...pendingDtcs].map((d, idx) => (
            <li key={`${d.code}-${d.status}-${idx}`} className="py-3 flex items-start gap-3">
              <span
                className={`font-mono font-bold text-sm px-2 py-1 rounded ${
                  d.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {d.code}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-800">{d.description}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {d.status === 'pending' ? '대기 코드 (간헐적 발생)' : '저장된 코드 (확정 고장)'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
