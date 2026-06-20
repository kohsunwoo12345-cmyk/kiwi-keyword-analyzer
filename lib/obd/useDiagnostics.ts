'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AdapterInfo,
  ConnectionStatus,
  Dtc,
  LiveSample,
  LogRow,
  PidDef,
  Transport,
  TransportKind,
} from './types'
import { Elm327Client } from './elm327'
import { SerialTransport, BluetoothTransport } from './transport'
import { DemoTransport } from './demo'
import { PID_LIST, MILEAGE_PIDS, dtcDescription } from './pids'

const HISTORY_LEN = 90 // 차트용 링버퍼 길이
const LOG_MAX = 10000 // 로그 최대 행
const MISS_LIMIT = 3 // 연속 미응답 시 PID 비활성화
const DEFAULT_POLL_MS = 350

interface MileageState {
  distanceSinceCleared: number | null
  odometer: number | null
  supported: boolean
  checked: boolean
}

function makeTransport(kind: TransportKind): Transport {
  if (kind === 'serial') return new SerialTransport()
  if (kind === 'bluetooth') return new BluetoothTransport()
  return new DemoTransport()
}

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'name' in e) {
    const name = (e as { name?: string }).name
    if (name === 'NotFoundError') return '장치를 선택하지 않았습니다.'
    if (name === 'SecurityError') return '브라우저 보안 정책으로 접근이 차단되었습니다. (HTTPS 환경 필요)'
  }
  return e instanceof Error ? e.message : String(e)
}

const roundVal = (v: number) => Math.round(v * 10) / 10
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function useDiagnostics() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [transportKind, setTransportKind] = useState<TransportKind | null>(null)
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null)
  const [adapterInfo, setAdapterInfo] = useState<AdapterInfo>({ adapter: null, protocol: null, voltage: null })

  const [latest, setLatest] = useState<LiveSample>({})
  const [history, setHistory] = useState<LogRow[]>([])
  const [activePids, setActivePids] = useState<PidDef[]>([])

  const [dtcs, setDtcs] = useState<Dtc[]>([])
  const [pendingDtcs, setPendingDtcs] = useState<Dtc[]>([])
  const [dtcLoading, setDtcLoading] = useState(false)

  const [isLogging, setIsLogging] = useState(false)
  const [logRows, setLogRows] = useState<LogRow[]>([])

  const [mileage, setMileage] = useState<MileageState>({
    distanceSinceCleared: null,
    odometer: null,
    supported: false,
    checked: false,
  })

  const clientRef = useRef<Elm327Client | null>(null)
  const runningRef = useRef(false)
  const loggingRef = useRef(false)
  const activePidsRef = useRef<PidDef[]>([])
  const missRef = useRef<Record<string, number>>({})
  const pollIntervalRef = useRef(DEFAULT_POLL_MS)
  const logRowsRef = useRef<LogRow[]>([])

  useEffect(() => {
    logRowsRef.current = logRows
  }, [logRows])

  const readDtcsInternal = useCallback(async (client: Elm327Client) => {
    setDtcLoading(true)
    try {
      const stored = await client.readDtcs()
      const pending = await client.readPendingDtcs()
      setDtcs(stored.map(code => ({ code, description: dtcDescription(code), status: 'stored' as const })))
      setPendingDtcs(pending.map(code => ({ code, description: dtcDescription(code), status: 'pending' as const })))
    } finally {
      setDtcLoading(false)
    }
  }, [])

  const refreshMileageInternal = useCallback(async (client: Elm327Client) => {
    const distBytes = await client.query(MILEAGE_PIDS.distanceSinceCleared.mode, MILEAGE_PIDS.distanceSinceCleared.pid).catch(() => null)
    const odoBytes = await client.query(MILEAGE_PIDS.odometer.mode, MILEAGE_PIDS.odometer.pid).catch(() => null)
    const distance = distBytes && distBytes.length >= 2 ? Math.round(MILEAGE_PIDS.distanceSinceCleared.decode(distBytes)) : null
    const odometer = odoBytes && odoBytes.length >= 4 ? Math.round(MILEAGE_PIDS.odometer.decode(odoBytes)) : null
    setMileage({ distanceSinceCleared: distance, odometer, supported: odometer != null, checked: true })
  }, [])

  const pollLoop = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    while (runningRef.current && client.connected) {
      const sample: LiveSample = {}
      for (const def of activePidsRef.current) {
        if (!runningRef.current) break
        try {
          const bytes = await client.query(def.mode, def.pid)
          if (bytes && bytes.length >= def.bytes) {
            sample[def.id] = roundVal(def.decode(bytes))
            missRef.current[def.id] = 0
          } else {
            const m = (missRef.current[def.id] ?? 0) + 1
            missRef.current[def.id] = m
            if (m >= MISS_LIMIT) {
              activePidsRef.current = activePidsRef.current.filter(p => p.id !== def.id)
              setActivePids([...activePidsRef.current])
            }
          }
        } catch {
          /* 단일 PID 실패는 무시하고 계속 폴링 */
        }
      }
      if (Object.keys(sample).length > 0) {
        const row: LogRow = { t: Date.now(), values: sample }
        setLatest(prev => ({ ...prev, ...sample }))
        setHistory(prev => {
          const next = [...prev, row]
          return next.length > HISTORY_LEN ? next.slice(next.length - HISTORY_LEN) : next
        })
        if (loggingRef.current) {
          setLogRows(prev => (prev.length >= LOG_MAX ? prev : [...prev, row]))
        }
      }
      await delay(pollIntervalRef.current)
    }
  }, [])

  const connect = useCallback(
    async (kind: TransportKind) => {
      if (status === 'connecting' || status === 'connected') return
      setError(null)
      setStatus('connecting')
      setLatest({})
      setHistory([])
      try {
        const client = new Elm327Client(makeTransport(kind))
        await client.open()
        await client.initialize()
        clientRef.current = client
        setTransportKind(kind)
        setDeviceLabel(client.label())
        setStatus('connected')

        const adapter = await client.readAdapterId()
        const protocol = await client.readProtocol()
        const voltage = await client.readVoltage()
        setAdapterInfo({ adapter, protocol, voltage })

        activePidsRef.current = [...PID_LIST]
        missRef.current = {}
        setActivePids([...PID_LIST])

        await refreshMileageInternal(client)
        await readDtcsInternal(client)

        runningRef.current = true
        void pollLoop()
      } catch (e) {
        setStatus('error')
        setError(errMsg(e))
        try {
          await clientRef.current?.close()
        } catch {
          /* noop */
        }
        clientRef.current = null
      }
    },
    [status, pollLoop, readDtcsInternal, refreshMileageInternal],
  )

  const disconnect = useCallback(async () => {
    runningRef.current = false
    loggingRef.current = false
    setIsLogging(false)
    const client = clientRef.current
    clientRef.current = null
    try {
      await client?.close()
    } catch {
      /* noop */
    }
    setStatus('disconnected')
    setTransportKind(null)
    setDeviceLabel(null)
    setAdapterInfo({ adapter: null, protocol: null, voltage: null })
  }, [])

  const readDtcs = useCallback(async () => {
    const client = clientRef.current
    if (client) await readDtcsInternal(client)
  }, [readDtcsInternal])

  const clearDtcs = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    setDtcLoading(true)
    try {
      await client.clearDtcs()
      await readDtcsInternal(client)
    } finally {
      setDtcLoading(false)
    }
  }, [readDtcsInternal])

  const refreshMileage = useCallback(async () => {
    const client = clientRef.current
    if (client) await refreshMileageInternal(client)
  }, [refreshMileageInternal])

  const startLogging = useCallback(() => {
    setLogRows([])
    logRowsRef.current = []
    loggingRef.current = true
    setIsLogging(true)
  }, [])

  const stopLogging = useCallback(() => {
    loggingRef.current = false
    setIsLogging(false)
  }, [])

  const exportCsv = useCallback(() => {
    const rows = logRowsRef.current
    if (!rows.length) return
    const ids = PID_LIST.map(p => p.id)
    const header = ['시각', ...PID_LIST.map(p => `${p.name}(${p.unit})`)]
    const lines = [header.join(',')]
    for (const r of rows) {
      const cells = [new Date(r.t).toLocaleString('ko-KR'), ...ids.map(id => (r.values[id] ?? '').toString())]
      lines.push(cells.join(','))
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `obd-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  useEffect(() => {
    return () => {
      runningRef.current = false
      void clientRef.current?.close()
      clientRef.current = null
    }
  }, [])

  return {
    status,
    error,
    transportKind,
    deviceLabel,
    adapterInfo,
    latest,
    history,
    activePids,
    dtcs,
    pendingDtcs,
    dtcLoading,
    isLogging,
    logRows,
    mileage,
    connect,
    disconnect,
    readDtcs,
    clearDtcs,
    refreshMileage,
    startLogging,
    stopLogging,
    exportCsv,
  }
}
