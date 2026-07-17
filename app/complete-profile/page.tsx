'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Building2, Mail, Hash, ArrowRight, AlertCircle, Check, LogOut, Globe, Phone, UserPlus, Briefcase } from 'lucide-react'
import { Logo } from '@/components/Brand'
import { Button } from '@/components/ui'
import { useAuth, saveAddress, logout } from '@/lib/auth'

const inputBase =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] pl-11 pr-3.5 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-[var(--text-dim)]'

// 국가 → 국제전화 국가번호 (선택 시 전화번호 앞에 자동으로 붙는다)
const COUNTRY_DIAL: Record<string, string> = {
  대한민국: '+82', 미국: '+1', 일본: '+81', 중국: '+86', 대만: '+886', 홍콩: '+852',
  싱가포르: '+65', 캐나다: '+1', 영국: '+44', 호주: '+61', 독일: '+49', 프랑스: '+33',
  네덜란드: '+31', 스페인: '+34', 이탈리아: '+39', 베트남: '+84', 태국: '+66',
  인도네시아: '+62', 말레이시아: '+60', 필리핀: '+63', 인도: '+91', 아랍에미리트: '+971',
  사우디아라비아: '+966', 브라질: '+55', 멕시코: '+52', 기타: '',
}
const COUNTRIES = Object.keys(COUNTRY_DIAL)

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, ready } = useAuth()

  const [country, setCountry] = useState('대한민국')
  const [company, setCompany] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [phone, setPhone] = useState('')
  const [refCode, setRefCode] = useState('')

  const dialCode = COUNTRY_DIAL[country] || ''
  const [agreeTos, setAgreeTos] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMkt, setAgreeMkt] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  // 간편로그인(구글) 후 아직 필수 약관에 동의하지 않은 회원 → 이 화면에서 동의를 받는다.
  const needConsent = !!user && user.role !== 'admin' && !(user.tosConsent === 1 && user.privacyConsent === 1)

  // 인증/완료 상태에 따른 리다이렉트
  useEffect(() => {
    if (!ready) return
    if (!user) {
      router.replace('/login')
      return
    }
    const consentDone = user.role === 'admin' || (user.tosConsent === 1 && user.privacyConsent === 1)
    if (user.addressComplete && consentDone) {
      router.replace(user.role === 'admin' ? '/adminsunkoh028741_11263' : '/dashboard_USE17237_612')
      return
    }
    // 기존 입력값이 있으면 채워두기
    if (user.country) setCountry(user.country)
    if (user.company) setCompany(user.company)
    if (user.postalCode) setPostalCode(user.postalCode)
    if (user.address1) setAddress1(user.address1)
    if (user.address2) setAddress2(user.address2)
    // 저장된 전화번호에서 국가번호를 떼고 로컬 번호만 입력창에 채운다
    if (user.phone) {
      const code = COUNTRY_DIAL[user.country || country] || ''
      setPhone(code ? user.phone.replace(code, '').trim() : user.phone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user])

  function validate() {
    const e: Record<string, string> = {}
    if (!country) e.country = '국가를 선택해 주세요.'
    if (!company.trim()) e.company = '회사 이름을 입력해 주세요.'
    if (!phone.trim()) e.phone = '전화번호를 입력해 주세요.'
    if (!address1.trim()) e.address1 = '사업장 주소를 입력해 주세요.'
    if (needConsent && !(agreeTos && agreePrivacy)) e.consent = '필수 약관에 모두 동의해 주세요.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError('')
    if (!validate()) return
    setLoading(true)
    ;(async () => {
      const localPhone = phone.trim()
      const fullPhone = dialCode ? `${dialCode} ${localPhone}` : localPhone
      const res = await saveAddress({
        country,
        company: company.trim(),
        postalCode: postalCode.trim() || undefined,
        address1: address1.trim(),
        address2: address2.trim() || undefined,
        phone: fullPhone,
        ref: refCode.trim() || undefined,
        ...(needConsent ? { tos: agreeTos ? 1 : 0, privacy: agreePrivacy ? 1 : 0, marketing: agreeMkt ? 1 : 0 } : {}),
      })
      if (!res.ok || !res.user) {
        setFormError(res.error || '주소 저장에 실패했습니다.')
        setLoading(false)
        return
      }
      // 회원가입 완료 → 대시보드가 아니라 노드형 스튜디오로 바로 입장 + 요금제 활성화 유도
      if (res.user.role === 'admin') router.replace('/adminsunkoh028741_11263')
      else window.location.replace('/studio-nvc-prv-8b3k2/?welcome=1')
    })()
  }

  if (!ready || !user || (user.addressComplete && !needConsent)) {
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
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">가입 정보를 입력해 주세요</h1>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {user.name}님, 서비스 이용을 위해 국가·회사 이름·전화번호·사업장 주소를 입력해 주세요.
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
                    style={{ colorScheme: 'dark' }}
                    className={inputBase + ' appearance-none pr-9 text-[var(--text)]'}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} style={{ color: '#0f172a', background: '#ffffff' }}>{c}</option>
                    ))}
                  </select>
                </div>
                {errors.country && <p className="mt-1.5 text-xs text-rose-300">{errors.country}</p>}
              </div>

              {/* 회사 이름 */}
              <div>
                <label htmlFor="company" className="mb-1.5 block text-sm font-medium">
                  회사 이름 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="예: (주)바이전시"
                    autoComplete="organization"
                    className={inputBase}
                  />
                </div>
                {errors.company && <p className="mt-1.5 text-xs text-rose-300">{errors.company}</p>}
              </div>

              {/* 전화번호 — 국가 선택 시 국가번호가 앞에 자동으로 붙습니다 */}
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
                  전화번호 <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex min-w-[68px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm font-medium text-[var(--text-soft)]">
                    {dialCode || '—'}
                  </div>
                  <div className="relative flex-1">
                    <Phone size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-0000-0000"
                      autoComplete="tel"
                      className={inputBase}
                    />
                  </div>
                </div>
                {errors.phone && <p className="mt-1.5 text-xs text-rose-300">{errors.phone}</p>}
              </div>

              {/* 추천인 코드 (아직 추천 연결이 없을 때만) */}
              {!user.referredBy && (
                <div>
                  <label htmlFor="ref" className="mb-1.5 block text-sm font-medium">
                    추천인 코드 <span className="ml-1 text-xs font-normal text-[var(--text-dim)]">(선택)</span>
                  </label>
                  <div className="relative">
                    <UserPlus size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                    <input
                      id="ref"
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                      placeholder="(선택) 예: BGXXXXXX"
                      className={inputBase}
                    />
                  </div>
                </div>
              )}

              {/* 우편번호 */}
              <div>
                <label htmlFor="postal" className="mb-1.5 block text-sm font-medium">
                  우편번호 <span className="ml-1 text-xs font-normal text-[var(--text-dim)]">(선택)</span>
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

              {/* 약관 동의 — 간편로그인(구글) 후 이 단계에서 필수 동의 */}
              {needConsent && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                  <p className="mb-3 text-sm font-medium">서비스 이용을 위해 약관에 동의해 주세요.</p>
                  <div className="space-y-2.5">
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--text-soft)] select-none">
                      <input type="checkbox" checked={agreeTos} onChange={(e) => setAgreeTos(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[var(--border)] accent-blue-600" />
                      <span className="leading-snug">
                        <span className="font-medium text-slate-400">[필수] </span>
                        <a href="/legal/terms" target="_blank" rel="noreferrer" className="font-medium text-blue-300 hover:underline">서비스 이용약관</a>에 동의합니다.
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--text-soft)] select-none">
                      <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[var(--border)] accent-blue-600" />
                      <span className="leading-snug">
                        <span className="font-medium text-slate-400">[필수] </span>
                        <a href="/legal/privacy" target="_blank" rel="noreferrer" className="font-medium text-blue-300 hover:underline">개인정보처리방침</a>에 동의합니다.
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--text-soft)] select-none">
                      <input type="checkbox" checked={agreeMkt} onChange={(e) => setAgreeMkt(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[var(--border)] accent-blue-600" />
                      <span className="leading-snug">
                        <span className="font-medium text-slate-400">[선택] </span>
                        마케팅 정보 수신에 동의합니다.
                      </span>
                    </label>
                  </div>
                  {errors.consent && <p className="mt-2 text-xs text-rose-300">{errors.consent}</p>}
                </div>
              )}

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
