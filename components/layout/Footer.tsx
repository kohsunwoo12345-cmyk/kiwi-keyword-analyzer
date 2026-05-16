import Link from 'next/link'
import { Leaf } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg">키위분석</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              네이버 키워드 분석의 모든 것.<br />
              데이터 기반으로 스마트하게 운영하세요.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">서비스</h4>
            <ul className="space-y-2 text-sm">
              {[
                ['키워드 분석', '/keyword'],
                ['검색 순위 추적', '/rank-tracker'],
                ['영향력 순위', '/influence-rank'],
                ['키워드 추천', '/keyword-suggest'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-green-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">도구</h4>
            <ul className="space-y-2 text-sm">
              {[
                ['트렌드', '/trends'],
                ['키워드 확장', '/keyword-expand'],
                ['대량 분석', '/bulk-analysis'],
                ['간편 조회', '/quick-search'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-green-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">정보</h4>
            <ul className="space-y-2 text-sm">
              {[
                ['요금제', '/pricing'],
                ['로그인', '/login'],
                ['회원가입', '/signup'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-green-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© 2025 키위분석. All rights reserved.</p>
          <p>네이버 검색광고 API 기반 키워드 분석 서비스</p>
        </div>
      </div>
    </footer>
  )
}
