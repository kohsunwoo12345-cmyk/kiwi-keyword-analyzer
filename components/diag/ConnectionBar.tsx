'use client'

import { Usb, Bluetooth, Play, Power, Loader2, AlertTriangle, Cpu, Zap, Network } from 'lucide-react'
import type { AdapterInfo, ConnectionStatus, TransportKind } from '@/lib/obd/types'

interface Props {
  status: ConnectionStatus
  transportKind: TransportKind | null
  deviceLabel: string | null
  adapterInfo: AdapterInfo
  error: string | null
  support: { serial: boolean; bluetooth: boolean }
  onConnect: (k: TransportKind) => void
  onDisconnect: () => void
}

const STATUS_META: Record<ConnectionStatus, { label: string; dot: string }> = {
  disconnected: { label: '연결 안 됨', dot: 'bg-gray-400' },
  connecting: { label: '연결 중…', dot: 'bg-amber-400 animate-pulse' },
  connected: { label: '연결됨', dot: 'bg-emerald-400' },
  error: { label: '오류', dot: 'bg-red-500' },
}

export function ConnectionBar({
  status,
  deviceLabel,
  adapterInfo,
  error,
  support,
  onConnect,
  onDisconnect,
}: Props) {
  const meta = STATUS_META[status]
  const busy = status === 'connecting'
  const connected = status === 'connected'

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
          <div>
            <div className="font-semibold">{meta.label}</div>
            <div className="text-xs text-slate-400">
              {connected ? deviceLabel : '오토바이 진단 포트에 어댑터를 연결하고 시작하세요'}
            </div>
          </div>
        </div>

        {connected ? (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Power className="w-4 h-4" /> 연결 해제
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              disabled={busy || !support.serial}
              onClick={() => onConnect('serial')}
              title={support.serial ? '' : '이 브라우저는 Web Serial 미지원 (데스크톱 크롬/엣지 권장)'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
              USB 연결
            </button>
            <button
              disabled={busy || !support.bluetooth}
              onClick={() => onConnect('bluetooth')}
              title={support.bluetooth ? '' : '이 브라우저는 Web Bluetooth 미지원'}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Bluetooth className="w-4 h-4" /> 블루투스(BLE)
            </button>
            <button
              disabled={busy}
              onClick={() => onConnect('demo')}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Play className="w-4 h-4" /> 데모 실행
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 bg-red-500/15 text-red-200 text-sm rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {connected && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <InfoChip icon={<Cpu className="w-4 h-4" />} label="어댑터" value={adapterInfo.adapter ?? '—'} />
          <InfoChip icon={<Network className="w-4 h-4" />} label="프로토콜" value={adapterInfo.protocol ?? '—'} />
          <InfoChip icon={<Zap className="w-4 h-4" />} label="배터리 전압" value={adapterInfo.voltage ?? '—'} />
        </div>
      )}
    </div>
  )
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-center gap-2.5">
      <span className="text-slate-400">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-400">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
    </div>
  )
}
