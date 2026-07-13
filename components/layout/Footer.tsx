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
                    href={`/features/${f.slug}`}
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
                    href={`/features/${f.slug}`}
                    className="text-sm text-[var(--text-soft)] transition-colors hover:text-violet-600"
                  >
                    {f.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 회사 바로 보기 */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-violet-50 to-white px-6 py-6 sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">BYGENCY를 만드는 회사가 궁금하신가요?</p>
            <p className="mt-1 text-xs text-[var(--text-soft)]">마케팅 기술을 만드는 팀, (주)Next Vision Company를 소개합니다.</p>
          </div>
          <a
            href="https://nextvisionccompany.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex flex-shrink-0 items-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-105"
          >
            회사 바로 보기
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-0.5">
              <path d="M7 17L17 7M8 7h9v9" />
            </svg>
          </a>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-dim)] sm:flex-row sm:items-center">
          <p>© 2026 (주)Next Vision Company. All rights reserved.</p>
          <p>BYGENCY · 올인원 마케팅 그로스 플랫폼</p>
        </div>
      </div>
    </footer>
  )
}
