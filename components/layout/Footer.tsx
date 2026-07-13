import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { FEATURES } from '@/lib/features'
import { Logo } from '@/components/Brand'

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#05070e]">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[900px] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[130px]" />
      <div className="relative mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo size={32} wordClassName="text-white" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              DB수집부터 콘텐츠 분석, 광고 최적화, AI 영상 제작까지. 마케터를 위한 올인원 그로스
              플랫폼, BYGENCY.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-slate-500">비즈니스 문의</span>
                <a href="mailto:biz@bygency.co" className="font-medium text-violet-300 hover:text-violet-200 hover:underline">
                  biz@bygency.co
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-500">공식 문의 메일</span>
                <a href="mailto:cs@bygency.co" className="font-medium text-violet-300 hover:text-violet-200 hover:underline">
                  cs@bygency.co
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">기능</h4>
            <ul className="mt-4 space-y-2.5">
              {FEATURES.slice(0, 4).map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/features/${f.slug}`}
                    className="text-sm text-slate-400 transition-colors hover:text-violet-300"
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
                    href={`/features/${f.slug}`}
                    className="text-sm text-slate-400 transition-colors hover:text-violet-300"
                  >
                    {f.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/pricing" className="text-sm text-slate-400 transition-colors hover:text-violet-300">
                  요금제
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 회사 바로 보기 */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-6 backdrop-blur sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-white">BYGENCY를 만드는 회사가 궁금하신가요?</p>
            <p className="mt-1 text-xs text-slate-400">마케팅 기술을 만드는 팀, (주)Next Vision Company를 소개합니다.</p>
          </div>
          <a
            href="https://nextvisionccompany.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex flex-shrink-0 items-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:brightness-110"
          >
            회사 바로 보기
            <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© 2026 (주)Next Vision Company. All rights reserved.</p>
          <p>BYGENCY · 올인원 마케팅 그로스 플랫폼</p>
        </div>
      </div>
    </footer>
  )
}
