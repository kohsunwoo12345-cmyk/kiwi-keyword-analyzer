/**
 * 한국시간(KST, Asia/Seoul) 기준 날짜/시간 포맷터.
 * 서버(D1)는 ISO(UTC)로 저장하므로, 브라우저 타임존과 무관하게 항상 KST로 표기한다.
 */

const DOW = ['일', '월', '화', '수', '목', '금', '토']

function parts(iso: string): { y: number; mo: number; d: number; h: number; mi: number; dow: number } | null {
  const date = new Date(iso)
  if (Number.isNaN(+date)) return null
  // en-CA + Asia/Seoul → "2026-07-15, 17:30" 형태의 부분값을 안전하게 추출
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  })
  const map: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value
  const y = Number(map.year), mo = Number(map.month), d = Number(map.day)
  let h = Number(map.hour); if (h === 24) h = 0
  const mi = Number(map.minute)
  // KST 요일 계산 (UTC 밀리초를 KST로 이동시켜 getUTCDay)
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
  return { y, mo, d, h, mi, dow }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-07-15 17:30" (KST) */
export function kstDateTime(iso: string): string {
  const p = parts(iso)
  if (!p) return '-'
  return `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`
}

/** "2026-07-15" (KST) */
export function kstDate(iso: string): string {
  const p = parts(iso)
  if (!p) return '-'
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}`
}

/** "2026년 7월 15일 (화) 17:30" (KST) */
export function kstLong(iso: string): string {
  const p = parts(iso)
  if (!p) return '-'
  return `${p.y}년 ${p.mo}월 ${p.d}일 (${DOW[p.dow]}) ${pad(p.h)}:${pad(p.mi)}`
}

/** 현재 시각의 KST 자정(00:00) 시각을 ms 로 반환 (상대 표기 계산용) */
function kstStartOfDay(iso: string): number | null {
  const p = parts(iso)
  if (!p) return null
  return Date.UTC(p.y, p.mo - 1, p.d)
}

/** 상대 표기: 오늘 / 어제 / N일 전 / 이번 달 / 지난달 / N개월 전 (KST 기준) */
export function relKST(iso: string): { label: string; tone: 'today' | 'recent' | 'month' | 'old' } | null {
  const p = parts(iso)
  if (!p) return null
  const nowIso = new Date().toISOString()
  const np = parts(nowIso)
  if (!np) return null
  const a = kstStartOfDay(iso)
  const b = kstStartOfDay(nowIso)
  if (a === null || b === null) return null
  const days = Math.floor((b - a) / 86400000)
  if (days <= 0) return { label: '오늘', tone: 'today' }
  if (days === 1) return { label: '어제', tone: 'recent' }
  if (days < 7) return { label: `${days}일 전`, tone: 'recent' }
  if (p.y === np.y && p.mo === np.mo) return { label: '이번 달', tone: 'month' }
  // 지난달 판별
  let ly = np.y, lm = np.mo - 1
  if (lm === 0) { lm = 12; ly -= 1 }
  if (p.y === ly && p.mo === lm) return { label: '지난달', tone: 'old' }
  return { label: `${Math.floor(days / 30)}개월 전`, tone: 'old' }
}

/** 상대 시간(방금/N분 전/N시간 전/N일 전 …) — 타임존 무관(경과시간 기준) */
export function relAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return ''
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return '방금'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}일 전`
  const mon = Math.floor(day / 30)
  if (mon < 12) return `${mon}개월 전`
  return `${Math.floor(mon / 12)}년 전`
}
