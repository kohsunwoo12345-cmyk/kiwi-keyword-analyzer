'use client'

import { useEffect, useState } from 'react'
import { Gift, X, Copy, Check, Link2, Sparkles, Users } from 'lucide-react'
import { accountReferral } from '@/lib/auth'

const DISMISS_KEY = 'bg_event_referral_dismissed_v1'

/**
 * 대시보드 이벤트 창 — 친구 초대 리워드 이벤트 안내.
 * 친구가 요금제에 가입하면 결제액의 1%를 크레딧으로 지급.
 * 최초 방문 시 자동 노출(닫으면 localStorage 기억), 우하단 버튼으로 다시 열 수 있음.
 */
export function EventBanner() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState<'code' | 'link' | ''>('')

  useEffect(() => {
    setMounted(true)
    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      /* ignore */
    }
    // 로그인된 사용자만 추천 코드 로드
    accountReferral()
      .then((r) => {
        if (r.ok && r.code) {
          setCode(r.code)
          if (!dismissed) setOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    setOpen(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  async function copy(text: string, which: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      /* ignore */
    }
  }

  if (!mounted || !code) return null

  const inviteLink = `https://bygency.co/signup?ref=${code}`

  return (
    <>
      {/* 우하단 재오픈 버튼 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-transform hover:scale-105"
        >
          <Gift size={16} /> 초대 이벤트
        </button>
      )}

      {/* 이벤트 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={dismiss} />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* 헤더 */}
            <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-600 px-6 pb-8 pt-7 text-white">
              <button
                onClick={dismiss}
                aria-label="닫기"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <X size={16} />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <Sparkles size={13} /> 친구 초대 이벤트
              </span>
              <h2 className="mt-3 text-2xl font-black leading-snug tracking-tight break-keep">
                친구를 초대하고
                <br />
                크레딧을 받으세요!
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/85 break-keep">
                친구가 내 추천 코드로 가입한 뒤 <b className="text-white">요금제에 가입</b>하면,
                친구 <b className="text-white">결제액의 1%</b>를 크레딧으로 드려요.
              </p>
            </div>

            {/* 본문 */}
            <div className="px-6 py-5">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                  <Gift size={14} /> 내 추천 코드
                </p>
                <p className="mt-1.5 select-all font-mono text-3xl font-black tracking-widest text-slate-800">
                  {code}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => copy(code, 'code')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                  >
                    {copied === 'code' ? <><Check size={15} /> 복사됨</> : <><Copy size={15} /> 코드 복사</>}
                  </button>
                  <button
                    onClick={() => copy(inviteLink, 'link')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3.5 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50"
                  >
                    {copied === 'link' ? <><Check size={15} /> 복사됨</> : <><Link2 size={15} /> 초대 링크 복사</>}
                  </button>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2 break-keep">
                  <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-[11px] font-bold">1</span>
                  친구에게 내 추천 코드(또는 초대 링크)를 공유해요.
                </li>
                <li className="flex items-start gap-2 break-keep">
                  <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-[11px] font-bold">2</span>
                  친구가 코드로 가입하면 자동으로 친구가 돼요.
                </li>
                <li className="flex items-start gap-2 break-keep">
                  <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-[11px] font-bold">3</span>
                  친구가 요금제에 처음 가입하면 결제액의 1%가 크레딧으로 지급돼요.
                </li>
              </ul>

              <div className="mt-5 flex items-center justify-between gap-3">
                <a
                  href="/dashboard_USE17237_612/profile"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:underline"
                >
                  <Users size={15} /> 내 친구·추천 현황 보기
                </a>
                <button onClick={dismiss} className="text-sm font-medium text-slate-400 hover:text-slate-600">
                  다시 보지 않기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
