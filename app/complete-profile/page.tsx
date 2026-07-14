'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Building2, Mail, Hash, ArrowRight, AlertCircle, Check, LogOut, Globe } from 'lucide-react'
import { Logo } from '@/components/Brand'
import { Button } from '@/components/ui'
import { useAuth, saveAddress, logout } from '@/lib/auth'

const inputBase =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] pl-11 pr-3.5 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-[var(--text-dim)]'

const COUNTRIES = [
  '대한민국', '미국', '일본', '중국', '대만', '홍콩', '싱가포르', '캐나다', '영국', '호주',
  '독일', '프랑스', '네덜란드', '스페인', '이탈리아', '베트남', '태국', '인도네시아', '말레이시아',
  '필리핀', '인도', '아랍에미리트', '사우디아라비아', '브라질', '멕시코', '기타',
]

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, ready } = useAuth()

  const [country, setCountry] = useState('대한민국')
  const [postalCode, setPostalCode] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  // 인증/완료 상태에 따른 리다이렉트
  useEffect(() => {
    if (!ready) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (user.addressComplete) {
      router.replace(user.role === 'admin' ? '/adminsunkoh028741_11263' : '/dashboard_USE17237_612')
      return
    }
    // 기존 입력값이 있으면 채워두기
    if (user.country) setCountry(user.country)
    if (user.postalCode) setPostalCode(user.postalCode)
    if (user.address1) setAddress1(user.address1)
    if (user.address2) setAddress2(user.address2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user])

  function validate() {
    const e: Record<string, string> = {}
    if (!country) e.country = '국가를 선택해 주세요.'
    if (!postalCode.trim()) e.postalCode = '우편번호를 입력해 주세요.'
    if (!address1.trim()) e.address1 = '사업장 주소를 입력해 주세요.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError('')
    if (!validate()) return
    setLoading(true)
    ;(async () => {
      const res = await saveAddress({
        country,
        postalCode: postalCode.trim(),
        address1: address1.trim(),
        address2: address2.trim() || undefined,
      })
      if (!res.ok || !res.user) {
        setFormError(res.error || '주소 저장에 실패했습니다.')
        setLoading(false)
        return
      }
      router.replace(res.user.role === 'admin' ? '/adminsunkoh028741_11263' : '/dashboard_USE17237_612')
    })()
  }

  if (!ready || !user || user.addressComplete) {
    return (
      <main className="site-dark grid min-h-screen place-items-center bg-[var(--bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </main>
    )
  }

  return (
    <main className="site-dark relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
      <div aria-hidden className="animate-drift pointer-events-none absolute -top-44 -left-32 h-[30rem] w-[30rem] rounded-full bg-blue-700/25 blur-[120px]" />
      <div aria-hidden className="animate-drift-slow pointer-events-none absolute -bottom-48 right-1/4 h-[32rem] w-[32rem] rounded-full bg-cyan-700/18 blur-[130px]" />

      {/* 상단바 */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo size={30} wordClassName="text-white" />
        <button
          onClick={() => logout().then(() => router.replace('/login'))}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-[var(--text-soft)] backdrop-blur transition-colors hover:text-[var(--text)]"
        >
          <LogOut size={15} /> 로그아웃
        </button>
      </div>

      <div className="relative z-[1] grid min-h-screen place-items-center px-5 py-24">
        <div className="w-full max-w-lg animate-fade-up">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-blue-200 backdrop-blur">
              <MapPin size={13} /> 가입 마지막 단계
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">사업장 주소를 입력해 주세요</h1>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {user.name}님, 서비스 이용을 위해 국가와 사업장 주소·우편번호를 모두 입력해야 합니다.
            </p>
          </div>

          <div className="card px-7 py-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)] sm:px-9">
            {formError && (
              <div className="mb-6 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {/* 국가 */}
              <div>
                <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
                  국가 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputBase + ' appearance-none pr-9'}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {errors.country && <p className="mt-1.5 text-xs text-rose-300">{errors.country}</p>}
              </div>

              {/* 우편번호 */}
              <div>
                <label htmlFor="postal" className="mb-1.5 block text-sm font-medium">
                  우편번호 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    id="postal"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="예: 06236"
                    autoComplete="postal-code"
                    className={inputBase}
                  />
                </div>
                {errors.postalCode && <p className="mt-1.5 text-xs text-rose-300">{errors.postalCode}</p>}
              </div>

              {/* 기본 주소 */}
              <div>
                <label htmlFor="addr1" className="mb-1.5 block text-sm font-medium">
                  사업장 주소 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    id="addr1"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    placeholder="도로명 또는 지번 주소"
                    autoComplete="street-address"
                    className={inputBase}
                  />
                </div>
                {errors.address1 && <p className="mt-1.5 text-xs text-rose-300">{errors.address1}</p>}
              </div>

              {/* 상세 주소 */}
              <div>
                <label htmlFor="addr2" className="mb-1.5 block text-sm font-medium">
                  상세 주소 <span className="ml-1 text-xs font-normal text-[var(--text-dim)]">(선택)</span>
                </label>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    id="addr2"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    placeholder="건물명, 층, 호수 등"
                    autoComplete="address-line2"
                    className={inputBase}
                  />
                </div>
              </div>

              <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
                {loading ? '저장 중…' : '입력 완료하고 시작하기'}
                {!loading && <ArrowRight size={17} />}
              </Button>
            </form>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[var(--text-dim)]">
              <Check size={13} className="text-blue-400" /> 입력하신 정보는 계정에 안전하게 저장됩니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
