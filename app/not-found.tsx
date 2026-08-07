'use client'

/* ══════════════════════════════════════════════════════════════════════════
   없는 주소로 들어왔을 때 보이는 화면
   ──────────────────────────────────────────────────────────────────────────
   ⚠ 이 파일이 없으면 Next 가 만들어 주는 기본 화면이 나간다. 실제로 그랬다:

       "404: This page could not be found."

     흰 배경에 영어 한 줄, 로고도 메뉴도 돌아갈 링크도 없다.
     주소를 잘못 눌렀거나 검색에서 옛 주소로 들어온 사람이 여기서 그냥 나가 버린다.
     한국어 서비스인데 영어만 나오는 것도 그대로 두면 안 된다.
   ══════════════════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { Home, ArrowRight, LifeBuoy } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  '페이지를 찾을 수 없습니다': {
    en: 'We couldn’t find that page',
    ja: 'ページが見つかりません',
    zh: '找不到该页面',
  },
  '주소가 바뀌었거나, 지워진 페이지일 수 있어요. 아래에서 찾으시던 곳으로 바로 가실 수 있습니다.': {
    en: 'The address may have changed, or the page may have been removed. You can jump straight to where you were headed below.',
    ja: 'アドレスが変わったか、削除されたページかもしれません。下からお探しの場所へ直接移動できます。',
    zh: '地址可能已更改，或该页面已被删除。您可以从下方直接前往要找的位置。',
  },
  '홈으로': { en: 'Go home', ja: 'ホームへ', zh: '返回首页' },
  '문의하기': { en: 'Contact us', ja: 'お問い合わせ', zh: '联系我们' },
  '자주 찾는 곳': { en: 'Popular destinations', ja: 'よく見られるページ', zh: '常去的页面' },
  '기능 둘러보기': { en: 'Explore features', ja: '機能を見る', zh: '浏览功能' },
  '요금제': { en: 'Pricing', ja: '料金プラン', zh: '价格方案' },
  '회사소개': { en: 'About', ja: '会社紹介', zh: '关于我们' },
  '로그인': { en: 'Log in', ja: 'ログイン', zh: '登录' },
  '이용약관': { en: 'Terms of Service', ja: '利用規約', zh: '服务条款' },
  '개인정보처리방침': { en: 'Privacy Policy', ja: 'プライバシーポリシー', zh: '隐私政策' },
  '찾으시던 주소가 맞다면 알려주세요 — 바로 고치겠습니다.': {
    en: 'If you believe this address should work, tell us — we’ll fix it right away.',
    ja: 'このアドレスで合っているはずだとお思いでしたらお知らせください。すぐ直します。',
    zh: '如果您认为这个地址应该有效，请告诉我们，我们会立刻修复。',
  },
}

const LINKS = [
  { href: '/features', label: '기능 둘러보기' },
  { href: '/pricing', label: '요금제' },
  { href: '/about', label: '회사소개' },
  { href: '/login', label: '로그인' },
  { href: '/legal/terms', label: '이용약관' },
  { href: '/legal/privacy', label: '개인정보처리방침' },
]

export default function NotFound() {
  const t = useT(M)
  return (
    <div className="site-dark flex min-h-screen flex-col overflow-x-clip">
      <Navbar />

      <main className="relative flex flex-1 items-center overflow-hidden pb-24 pt-36">
        {/*  장식 — 정지된 빛 덩어리. 움직이지 않으므로 값이 들지 않는다. */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-blue-700/20 blur-[140px]" />
        <div className="dot-grid mask-fade-b pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative mx-auto w-full max-w-3xl px-5 text-center">
          <p className="brand-text text-[76px] font-black leading-none tracking-tight sm:text-[104px]">404</p>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t('페이지를 찾을 수 없습니다')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('주소가 바뀌었거나, 지워진 페이지일 수 있어요. 아래에서 찾으시던 곳으로 바로 가실 수 있습니다.')}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Home size={16} /> {t('홈으로')}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:border-blue-400/40"
            >
              <LifeBuoy size={16} /> {t('문의하기')}
            </Link>
          </div>

          <div className="mt-14">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              {t('자주 찾는 곳')}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-[var(--text-soft)] transition-colors hover:border-blue-400/40 hover:text-[var(--text)]"
                >
                  {t(l.label)}
                  <ArrowRight size={16} className="text-blue-300 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>

          <p className="mt-10 text-xs text-[var(--text-dim)]">
            {t('찾으시던 주소가 맞다면 알려주세요 — 바로 고치겠습니다.')}{' '}
            <a href="mailto:biz@nextbygency.com" className="font-medium text-blue-300 hover:underline">
              biz@nextbygency.com
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
