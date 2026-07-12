import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { FEATURES } from '@/lib/features'

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-soft)]">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient">
                <Sparkles size={18} className="text-white" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                바이<span className="brand-text">전시</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-soft)]">
              DB수집부터 콘텐츠 분석, 광고 최적화, AI 영상 제작까지. 마케터를 위한 올인원 그로스
              플랫폼, 바이전시.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">기능</h4>
            <ul className="mt-4 space-y-2.5">
              {FEATURES.slice(0, 4).map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/dashboard/${f.slug}`}
                    className="text-sm text-[var(--text-soft)] transition-colors hover:text-white"
                  >
                    {f.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">더보기</h4>
            <ul className="mt-4 space-y-2.5">
              {FEATURES.slice(4).map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/dashboard/${f.slug}`}
                    className="text-sm text-[var(--text-soft)] transition-colors hover:text-white"
                  >
                    {f.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-dim)] sm:flex-row sm:items-center">
          <p>© 2026 바이전시 (Bivience). All rights reserved.</p>
          <p>올인원 마케팅 그로스 플랫폼</p>
        </div>
      </div>
    </footer>
  )
}
