'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, FileText, Gauge, Bike, BookOpen } from 'lucide-react'
import { useDiagnostics } from '@/lib/obd/useDiagnostics'
import { transportSupport } from '@/lib/obd/transport'
import { ConnectionBar } from '@/components/diag/ConnectionBar'
import { LiveDashboard } from '@/components/diag/LiveDashboard'
import { DtcPanel } from '@/components/diag/DtcPanel'
import { LogPanel } from '@/components/diag/LogPanel'
import { MileagePanel } from '@/components/diag/MileagePanel'

type TabId = 'live' | 'dtc' | 'log' | 'mileage'

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'live', label: '실시간 데이터', icon: Activity },
  { id: 'dtc', label: '고장코드', icon: AlertTriangle },
  { id: 'log', label: '주행 로그', icon: FileText },
  { id: 'mileage', label: '주행거리', icon: Gauge },
]

export default function DiagnosticsPage() {
  const d = useDiagnostics()
  const [tab, setTab] = useState<TabId>('live')
  const [support, setSupport] = useState({ serial: false, bluetooth: false })

  useEffect(() => {
    setSupport(transportSupport())
  }, [])

  const connected = d.status === 'connected'

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
            <Bike className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">오토바이 진단 (OBD-II)</h1>
            <p className="text-sm text-gray-500">노트북 + 어댑터로 고장코드 · 실시간 데이터 · 로그를 확인하세요</p>
          </div>
        </div>
        <Link
          href="/guide"
          className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <BookOpen className="w-4 h-4" /> 연결 가이드
        </Link>
      </div>

      {/* 연결 바 */}
      <ConnectionBar
        status={d.status}
        transportKind={d.transportKind}
        deviceLabel={d.deviceLabel}
        adapterInfo={d.adapterInfo}
        error={d.error}
        support={support}
        onConnect={d.connect}
        onDisconnect={d.disconnect}
      />

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          const badge = t.id === 'dtc' && connected ? d.dtcs.length + d.pendingDtcs.length : null
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {badge != null && badge > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 탭 내용 */}
      <div>
        {tab === 'live' && <LiveDashboard activePids={d.activePids} latest={d.latest} history={d.history} />}
        {tab === 'dtc' && (
          <DtcPanel
            dtcs={d.dtcs}
            pendingDtcs={d.pendingDtcs}
            loading={d.dtcLoading}
            connected={connected}
            onRead={d.readDtcs}
            onClear={d.clearDtcs}
          />
        )}
        {tab === 'log' && (
          <LogPanel
            isLogging={d.isLogging}
            logRows={d.logRows}
            connected={connected}
            onStart={d.startLogging}
            onStop={d.stopLogging}
            onExport={d.exportCsv}
          />
        )}
        {tab === 'mileage' && <MileagePanel mileage={d.mileage} connected={connected} onRefresh={d.refreshMileage} />}
      </div>
    </div>
  )
}
