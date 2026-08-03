'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X, MoonStar } from 'lucide-react'
import { NoticeMedia } from '@/components/NoticeMedia'

interface PubNotice {
  id: string; title: string; body: string
  imageUrl: string; videoUrl?: string; ctaLabel: string; ctaUrl: string; createdAt: string
  /** 강력 알림 — 하단 토스트가 아니라 화면 정중앙에 가림막과 함께 띄운다(광고 집행용) */
  strong?: boolean
  /** "N일 동안 보지 않기" 의 N — 집행마다 정한다(기본 3일) */
  snoozeDays?: number
  /** 집행 종료 시각(ISO). 있으면 그 순간에 정확히 내린다 */
  endAt?: string
}

// 같은 세션에서 닫은 알림은 새로고침 전까지 다시 뜨지 않게 (기간형은 새 방문 때 다시 노출)
function sessionDismissed(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem('bg_notice_dismissed') || '[]')) } catch { return new Set() }
}
function addSessionDismissed(id: string) {
  try { const s = sessionDismissed(); s.add(id); sessionStorage.setItem('bg_notice_dismissed', JSON.stringify([...s])) } catch { /* noop */ }
}

/* 저장소를 못 쓰는 브라우저가 실제로 있다 — 시크릿 모드, "사이트 데이터 차단",
   third-party 저장이 막힌 iframe. 예전에는 그럴 때 빈 방문자 id 를 돌려줬는데,
   그러면 이렇게 됐다(실측):
    · 노출은 아예 기록되지 않고(서버가 빈 id 를 건너뛴다)
    · 전환은 서로 다른 사람이 전부 한 줄로 뭉쳐 집계가 어긋나고
    · "N일 보지 않기" 가 저장되지 않는다 — 서버는 ok 라고 답하는데 0건이 남는다.
      강력 알림은 화면을 통째로 가로막으므로, 그 방문자는 페이지를 넘길 때마다
      다시 막히고 끄는 방법이 없다.
   그래서 localStorage → 쿠키 → 메모리 순으로 물러난다. 어느 단계든 id 는 안정적이다. */
let memVisitor = ''

function readCookie(name: string): string {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
    return m ? decodeURIComponent(m[1]) : ''
  } catch { return '' }
}

function getVisitorId(): string {
  try {
    const v = localStorage.getItem('bg_visitor')
    if (v) return v
  } catch { /* 저장소 차단 — 아래로 물러난다 */ }

  //  쿠키는 전체 새로고침을 넘어서도 남는다 — 메모리보다 먼저 본다
  const fromCookie = readCookie('bg_visitor')
  if (fromCookie) {
    try { localStorage.setItem('bg_visitor', fromCookie) } catch { /* noop */ }
    return fromCookie
  }
  if (memVisitor) return memVisitor

  const fresh = 'vz_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  memVisitor = fresh   //  둘 다 막혀 있어도 이 페이지 세션 안에서는 일관된다
  try { localStorage.setItem('bg_visitor', fresh) } catch { /* noop */ }
  try { document.cookie = `bg_visitor=${fresh}; max-age=31536000; path=/; SameSite=Lax` } catch { /* noop */ }
  return fresh
}

// 홈페이지·공개페이지 방문자(비회원 포함) 팝업 알림 — "접속 전체" 발송.
// 하단→상단 슬라이드로 올라오고, X 를 눌러야 사라진다(=읽음). CTA 클릭 = 전환 기록.
export function PublicNoticePopups() {
  const pathname = usePathname() || '/'
  const [items, setItems] = useState<PubNotice[]>([])
  const [closing, setClosing] = useState<Record<string, boolean>>({})
  //  폴링 콜백이 최신 closing 을 보게 한다(useCallback 의존성에 넣으면 닫을 때마다 폴링이 새로 걸린다)
  const closingRef = useRef<Record<string, boolean>>({})
  closingRef.current = closing
  /* 방문자 PC 시계와 서버 시계의 차이(ms). 응답의 now 로 매번 갱신한다.
     이걸 보정하지 않으면 시계가 틀어진 사람에게 광고가 일찍 사라지거나 끝난 뒤에도 남는다. */
  const skewRef = useRef(0)
  const [shown, setShown] = useState(false)

  /* ── 어디까지 띄울지 ──
     관리자 콘솔은 완전히 제외한다 — 광고를 만드는 화면을 그 광고가 가로막으면 일을 못 한다.
     회원 콘솔(대시보드)에서는 "강력 알림" 만 띄운다. 광고 집행은 비회원뿐 아니라 회원도 봐야 하는데,
     예전에는 콘솔 경로를 통째로 건너뛰어 로그인한 회원은 집행을 한 번도 보지 못했다.
     일반 토스트는 콘솔에 회원 전용 팝업(NoticePopups)이 따로 있어 겹치므로 콘솔에서는 계속 뺀다. */
  const isAdminConsole = pathname.startsWith('/adminsunkoh')
  const isMemberConsole = pathname.startsWith('/dashboard')
  /* 가입·로그인·정보입력 화면에서는 알림을 아예 띄우지 않는다.
     이 화면들은 광고가 유도하는 목적지이거나 회원이 반드시 통과해야 하는 길목이라,
     화면 한가운데를 가로막으면 광고가 자기 목적을 방해한다.
     (실측: /login 에서 모달이 로그인 버튼을 덮어 30초 동안 누를 수 없었다.
      CTA 가 /signup 을 가리키는 집행이면 도착한 신청 화면을 그 광고가 다시 가린다.)

     화면에서 숨기는 것으로 끝내면 안 된다 — 목록을 받아 오는 것만으로 서버에 "노출" 이 기록되기 때문이다.
     (실측: /login 에서 아무도 보지 않은 노출이 6건 쌓였다. 노출은 방문자·캠페인당 1건이라
      그 뒤 실제로 본 노출은 무시되고, 회원/비회원 집계도 로그인 전 상태로 굳는다.)
     그래서 이 화면들에서는 조회 자체를 하지 않는다. */
  const FUNNEL_PATHS = ['/login', '/signup', '/complete-profile']
  const isFunnelPath = FUNNEL_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const skip = isAdminConsole || isFunnelPath

  const poll = useCallback(() => {
    if (skip) return
    const visitor = getVisitorId()
    fetch(`/api/public-notices?path=${encodeURIComponent(pathname)}&visitor=${encodeURIComponent(visitor)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && Array.isArray(d.notices)) {
          if (d.now) { const t = Date.parse(d.now); if (Number.isFinite(t)) skewRef.current = t - Date.now() }
          const dismissed = sessionDismissed()
          /* 서버가 지금 내려 준 목록이 곧 "지금 떠 있어야 할 것" 이다.
             예전에는 합치기만 하고 빼지 않아서, 한 번 뜬 알림이 세션 내내 따라다녔다:
               · 랜딩 경로 한정 집행(scope_path)이 다른 페이지로 넘어가도 계속 떴다.
               · 집행 종료 시각이 지나도 열려 있던 탭에서는 계속 떴다.
               · 다른 탭에서 "N일 보지 않기" 를 눌러도 이 탭에서는 계속 떴다.
             이미 떠 있는 것의 객체는 그대로 물려준다 — 새 객체로 갈아끼우면 영상이 처음부터 다시 돈다. */
          setItems((prev) => {
            const byId = new Map(prev.map((n) => [n.id, n]))
            const next = (d.notices as PubNotice[])
              .filter((n) => !dismissed.has(n.id))
              .map((n) => byId.get(n.id) || n)
            //  닫히는 중인 것은 남겨 둔다(내려가는 애니메이션이 중간에 끊기지 않게)
            const closingNow = prev.filter((n) => closingRef.current[n.id] && !next.some((x) => x.id === n.id))
            return [...next, ...closingNow]
          })
        }
      })
      .catch(() => {})
  }, [pathname, skip])

  useEffect(() => {
    if (skip) { setItems([]); return }
    poll()
    const iv = setInterval(poll, 45000)
    const t = setTimeout(() => setShown(true), 60)
    /* 탭을 다시 볼 때 곧바로 확인한다 — 다른 탭에서 "보지 않기" 를 눌렀거나 집행이 끝났는데도
       이 탭만 45초 동안 옛 상태로 남아 있는 일을 없앤다. */
    const onWake = () => { if (document.visibilityState === 'visible') poll() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      clearInterval(iv); clearTimeout(t)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [poll, skip])

  /* 집행 종료 시각이 지나면 그 순간에 내린다(다음 폴링을 기다리지 않는다).
     서버와의 시계 차이를 보정한 시각으로 판단한다. */
  useEffect(() => {
    if (items.length === 0) return
    const serverNow = () => Date.now() + skewRef.current
    const drop = () => {
      const t = serverNow()
      setItems((prev) => {
        const next = prev.filter((n) => !(n.endAt && Date.parse(n.endAt) <= t))
        //  바뀐 게 없으면 같은 배열을 그대로 돌려준다 — 매초 새 배열을 넣으면 이 effect 가 스스로를 다시 돌린다
        return next.length === prev.length ? prev : next
      })
    }
    drop()
    const iv = setInterval(drop, 1000)
    return () => clearInterval(iv)
  }, [items])

  /* CTA 를 누르면 이 요청을 보내자마자 페이지가 넘어간다. 보통의 fetch 는 그때 취소돼서
     전환이 기록되지 않는다 — 실측으로 전환 1건이 통째로 사라졌다(광고 성과가 과소 집계된다).
     keepalive 를 켜면 페이지를 떠나도 요청이 끝까지 간다. */
  const post = (campaignId: string, kind: 'read' | 'convert' | 'snooze', days?: number) => {
    try {
      fetch('/api/public-notices', {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
        keepalive: true,
        body: JSON.stringify({ campaignId, visitor: getVisitorId(), kind, days, path: pathname }),
      }).catch(() => {})
    } catch { /* noop */ }
  }

  const animateOut = (id: string) => {
    setClosing((c) => ({ ...c, [id]: true }))
    addSessionDismissed(id)
    setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id))
      setClosing((c) => { const n = { ...c }; delete n[id]; return n })
    }, 320)
  }
  // X = 읽음(닫기). 기간형이면 새 방문 때 다시 뜸(스누즈 아님)
  const dismiss = (id: string) => { post(id, 'read'); animateOut(id) }
  /* "N일 동안 보지 않기" = N일간 숨김(서버 스누즈). 이후 집행 기간이 남아 있으면 다시 노출된다.
     N 은 집행마다 관리자가 정한다(기본 3일). */
  const snoozeDays = (n: PubNotice) => { post(n.id, 'snooze', snoozeN(n)); animateOut(n.id) }

  const go = (n: PubNotice) => {
    post(n.id, 'convert')
    if (n.ctaUrl) {
      if (/^https?:\/\//i.test(n.ctaUrl)) window.open(n.ctaUrl, '_blank', 'noopener,noreferrer')
      else window.location.href = n.ctaUrl
    }
    animateOut(n.id)
  }

  if (skip || items.length === 0) return null
  /* 강력 알림은 화면을 가로막으므로 한 번에 하나만 띄운다(가장 최근 집행).
     나머지는 예전처럼 하단 토스트로 쌓인다 — 두 종류가 동시에 떠도 서로 가리지 않는다. */
  const strongOne = items.find((n) => n.strong)
  /* 회원 콘솔에서는 광고(강력 알림)만 — 일반 토스트는 콘솔 자체 팝업과 겹친다.
     강력 알림이 떠 있는 동안에도 토스트를 빼 둔다. 토스트는 z-300, 모달 가림막은 z-400 이라
     토스트가 가림막 뒤에 깔린다 — 흐릿하게 보이는데 눌리지는 않는 유령 카드가 된다(실측 확인).
     모달을 닫으면 그때 정상으로 뜬다. */
  const toasts = isMemberConsole || strongOne ? [] : items.filter((n) => n !== strongOne).slice(0, 3)

  return (
    <>
      {strongOne && (
        <StrongNoticeModal
          n={strongOne}
          closing={!!closing[strongOne.id]}
          onClose={() => dismiss(strongOne.id)}
          onSnooze={() => snoozeDays(strongOne)}
          onCta={() => go(strongOne)}
        />
      )}
      <ToastStack
        items={toasts}
        shown={shown}
        closing={closing}
        onClose={dismiss}
        onSnooze={(n) => snoozeDays(n)}
        onCta={go}
      />
    </>
  )
}

/* ── 하단 토스트(일반 알림) ── */
function ToastStack({
  items, shown, closing, onClose, onSnooze, onCta,
}: {
  items: PubNotice[]; shown: boolean; closing: Record<string, boolean>
  onClose: (id: string) => void; onSnooze: (n: PubNotice) => void; onCta: (n: PubNotice) => void
}) {
  if (items.length === 0) return null
  const visible = items

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[300] flex flex-col items-center gap-3 p-4 sm:items-end sm:p-6">
      {visible.map((n) => {
        const isClosing = closing[n.id]
        return (
          <div
            key={n.id}
            className={[
              'pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300 ease-out',
              shown && !isClosing ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
            ].join(' ')}
            style={{ boxShadow: '0 20px 50px -12px rgba(0,0,0,.35)' }}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
            <NoticeMedia imageUrl={n.imageUrl} videoUrl={n.videoUrl} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-extrabold leading-snug text-slate-900">{n.title}</div>
                <button
                  onClick={() => onClose(n.id)}
                  aria-label="닫기"
                  className="-mr-1 -mt-1 flex-shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              </div>
              {n.body && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">{n.body}</p>}
              {n.ctaLabel && n.ctaUrl && (
                <button
                  onClick={() => onCta(n)}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110 active:scale-[0.99]"
                >
                  {n.ctaLabel}
                </button>
              )}
              <div className="mt-1.5 text-center">
                <button
                  onClick={() => onSnooze(n)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-slate-600"
                >
                  <MoonStar size={11} /> {snoozeLabel(n)}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* 집행마다 정한 "N일 동안 보지 않기" — 서버가 안 내려주면 3일 */
function snoozeN(n: PubNotice): number {
  const d = Number(n.snoozeDays)
  return Number.isFinite(d) && d >= 1 ? Math.min(30, Math.round(d)) : 3
}
function snoozeLabel(n: PubNotice): string {
  return `${snoozeN(n)}일 동안 보지 않기`
}

/* ── 강력 알림 — 화면 정중앙 + 가림막 ──
   접속하자마자 화면 한가운데를 차지하는 광고 집행이다. 그래서 일반 토스트보다 지켜야 할 게 많다.
     · 가림막을 눌러도 닫히지 않는다 — 실수로 스쳐서 광고가 사라지면 집행이 무의미해진다.
       닫는 길은 X 와 "N일 동안 보지 않기" 두 개로 분명히 둔다.
     · Esc 는 받는다 — 키보드만 쓰는 사람에게 빠져나갈 길이 없으면 안 된다.
     · 열려 있는 동안 뒤 페이지 스크롤을 잠근다(모달 뒤가 같이 움직이면 조작이 어긋난다).
     · 영상이 길어도 모달 안에서만 스크롤되게 한다 — 화면 밖으로 CTA 가 밀려나면 신청을 못 한다. */
function StrongNoticeModal({
  n, closing, onClose, onSnooze, onCta,
}: {
  n: PubNotice; closing: boolean
  onClose: () => void; onSnooze: () => void; onCta: () => void
}) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const open = shown && !closing
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={n.title}
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
    >
      {/* 가림막 — 클릭으로 닫히지 않는다(광고가 실수로 사라지지 않게) */}
      <div
        aria-hidden="true"
        className={[
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <div
        className={[
          'relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 ease-out',
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        ].join(' ')}
        style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,.6)' }}
      >
        <div className="h-1.5 w-full flex-shrink-0 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
        {/* 내용이 길어도 모달 안에서만 스크롤 — CTA 가 화면 밖으로 밀려나지 않는다 */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NoticeMedia imageUrl={n.imageUrl} videoUrl={n.videoUrl} full />
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold leading-snug text-slate-900 sm:text-xl">{n.title}</h2>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="-mr-1.5 -mt-1.5 flex-shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            {n.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 sm:text-[15px]">{n.body}</p>
            )}
          </div>
        </div>
        {/* CTA 는 스크롤 밖에 고정 — 영상이 길어도 신청 버튼은 늘 보인다 */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-5 pb-4 pt-3 sm:px-6">
          {n.ctaLabel && n.ctaUrl && (
            <button
              onClick={onCta}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110 active:scale-[0.99]"
            >
              {n.ctaLabel}
            </button>
          )}
          <div className="mt-2 flex items-center justify-center gap-4">
            <button
              onClick={onSnooze}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-slate-600"
            >
              <MoonStar size={12} /> {snoozeLabel(n)}
            </button>
            <button onClick={onClose} className="text-xs font-medium text-slate-400 transition hover:text-slate-600">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
