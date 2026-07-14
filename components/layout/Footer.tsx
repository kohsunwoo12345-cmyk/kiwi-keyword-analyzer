'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { FEATURES } from '@/lib/features'
import { Logo } from '@/components/Brand'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  'DB수집부터 콘텐츠 분석, 광고 최적화, AI 영상 제작까지. 마케터를 위한 올인원 그로스 플랫폼, BYGENCY.': {
    en: 'From lead capture to content analytics, ad optimization, and AI video — BYGENCY, the all-in-one growth platform for marketers.',
    ja: 'リード獲得からコンテンツ分析、広告最適化、AI動画制作まで。マーケターのためのオールインワン・グロースプラットフォーム、BYGENCY。',
    zh: '从获客、内容分析、广告优化到 AI 视频制作。BYGENCY，为营销人打造的一体化增长平台。',
  },
  '비즈니스 문의': { en: 'Business', ja: 'ビジネス問い合わせ', zh: '商务咨询' },
  '공식 문의 메일': { en: 'Support', ja: '公式問い合わせ', zh: '官方邮箱' },
  기능: { en: 'Features', ja: '機能', zh: '功能' },
  더보기: { en: 'More', ja: 'もっと見る', zh: '更多' },
  요금제: { en: 'Pricing', ja: '料金', zh: '价格' },
  'BYGENCY를 만드는 회사가 궁금하신가요?': {
    en: 'Curious about the company behind BYGENCY?',
    ja: 'BYGENCYを作る会社が気になりますか？',
    zh: '想了解 BYGENCY 背后的公司吗？',
  },
  '마케팅 기술을 만드는 팀, (주)Next Vision Company를 소개합니다.': {
    en: 'Meet Next Vision Company — the team building marketing technology.',
    ja: 'マーケティング技術を作るチーム、Next Vision Companyをご紹介します。',
    zh: '认识打造营销技术的团队 —— Next Vision Company。',
  },
  '회사 바로 보기': { en: 'Visit the company', ja: '会社を見る', zh: '访问公司' },
  'BYGENCY · 올인원 마케팅 그로스 플랫폼': {
    en: 'BYGENCY · All-in-one marketing growth platform',
    ja: 'BYGENCY · オールインワン マーケティング グロース プラットフォーム',
    zh: 'BYGENCY · 一体化营销增长平台',
  },
}

export function Footer() {
  const t = useT(M)
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#05070e]">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[900px] -translate-x-1/2 rounded-full bg-blue-700/15 blur-[130px]" />
      <div className="relative mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo size={32} wordClassName="text-white" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              {t('DB수집부터 콘텐츠 분석, 광고 최적화, AI 영상 제작까지. 마케터를 위한 올인원 그로스 플랫폼, BYGENCY.')}
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-slate-500">{t('비즈니스 문의')}</span>
                <a href="mailto:biz@bygency.co" className="font-medium text-blue-300 hover:text-blue-200 hover:underline">
                  biz@bygency.co
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-500">{t('공식 문의 메일')}</span>
                <a href="mailto:cs@bygency.co" className="font-medium text-blue-300 hover:text-blue-200 hover:underline">
                  cs@bygency.co
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">{t('기능')}</h4>
            <ul className="mt-4 space-y-2.5">
              {FEATURES.slice(0, 4).map((f) => (
                <li key={f.slug}>
                  <Link href={`/features/${f.slug}`} className="text-sm text-slate-400 transition-colors hover:text-blue-300">
                    {f.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">{t('더보기')}</h4>
            <ul className="mt-4 space-y-2.5">
              {FEATURES.slice(4).map((f) => (
                <li key={f.slug}>
                  <Link href={`/features/${f.slug}`} className="text-sm text-slate-400 transition-colors hover:text-blue-300">
                    {f.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/pricing" className="text-sm text-slate-400 transition-colors hover:text-blue-300">
                  {t('요금제')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 회사 바로 보기 */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-6 backdrop-blur sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-white">{t('BYGENCY를 만드는 회사가 궁금하신가요?')}</p>
            <p className="mt-1 text-xs text-slate-400">{t('마케팅 기술을 만드는 팀, (주)Next Vision Company를 소개합니다.')}</p>
          </div>
          <a
            href="https://nextvisionccompany.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex flex-shrink-0 items-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:brightness-110"
          >
            {t('회사 바로 보기')}
            <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© 2026 (주)Next Vision Company. All rights reserved.</p>
          <p>{t('BYGENCY · 올인원 마케팅 그로스 플랫폼')}</p>
        </div>
      </div>
    </footer>
  )
}
