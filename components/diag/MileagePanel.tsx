'use client'

import { Gauge, RefreshCw, Info } from 'lucide-react'

interface MileageState {
  distanceSinceCleared: number | null
  odometer: number | null
  supported: boolean
  checked: boolean
}

interface Props {
  mileage: MileageState
  connected: boolean
  onRefresh: () => void
}

export function MileagePanel({ mileage, connected, onRefresh }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-blue-600" /> 주행거리 (키로수)
        </h3>
        <button
          onClick={onRefresh}
          disabled={!connected}
          className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 다시 조회
        </button>
      </div>

      {!connected ? (
        <div className="text-center text-gray-400 py-8 text-sm">연결 후 조회할 수 있습니다.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">누적 주행거리 (적산)</div>
              <div className="text-2xl font-bold text-gray-800 tabular-nums">
                {mileage.odometer != null ? `${mileage.odometer.toLocaleString('ko-KR')} km` : '미지원'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">DTC 삭제 후 주행거리</div>
              <div className="text-2xl font-bold text-gray-800 tabular-nums">
                {mileage.distanceSinceCleared != null ? `${mileage.distanceSinceCleared.toLocaleString('ko-KR')} km` : '미지원'}
              </div>
            </div>
          </div>

          {mileage.checked && mileage.odometer == null && (
            <div className="flex items-start gap-2 bg-amber-50 text-amber-800 text-sm rounded-lg px-3 py-2.5">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                이 차량은 표준 OBD-II로 <b>적산거리(키로수)를 제공하지 않습니다.</b> 오토바이는 대부분
                계기판 ECU에 거리 정보가 따로 저장되어, 제조사 전용 진단 장비로만 읽을 수 있습니다.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
