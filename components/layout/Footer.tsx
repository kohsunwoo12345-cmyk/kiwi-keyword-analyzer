import Link from 'next/link'
import { FEATURES } from '@/lib/features'
import { Logo } from '@/components/Brand'

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo size={32} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-soft)]">
              DB수집부터 콘텐츠 분석, 광고 최적화, AI 영상 제작까지. 마케터를 위한 올인원 그로스
              플랫폼, BYGENCY.
            </p>
            <ul className="mt-5 space-y-1.5 text-sm">
              <li className="flex items-center gap-2 text-[var(--text-soft)]">
                <span className="text-[var(--text-dim)]">비즈니스 문의</span>
                <a href="mailto:biz@bygency.co" className="font-medium text-violet-600 hover:underline">
                  biz@bygency.co
                </a>
              </li>
              <li className="flex items-center gap-2 text-[var(--text-soft)]">
                <span className="text-[var(--text-dim)]">공식 문의 메일</span>
                <a href="mailto:cs@bygency.co" className="font-medium text-violet-600 hover:underline">
                  cs@bygency.co
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text)]">기능</h4>
            <ul className="mt-4 space-y-2.5">
              {FEATURES.slice(0, 4).map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/dashboard_USE17237_612/${f.slug}`}
                    className="text-sm text-[var(--text-soft)] transition-colors hover:text-violet-600"
                  >
                    {f.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text)]">더보기</h4>
            <ul className="mt-4 space-y-2.5">
              {FEATURES.slice(4).map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/dashboard_USE17237_612/${f.slug}`}
                    className="text-sm text-[var(--text-soft)] transition-colors hover:text-violet-600"
                  >
                    {f.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-dim)] sm:flex-row sm:items-center">
          <p>© 2026 (주)Next Vision Company. All rights reserved.</p>
          <p>BYGENCY · 올인원 마케팅 그로스 플랫폼</p>
        </div>
      </div>
    </footer>
  )
}
