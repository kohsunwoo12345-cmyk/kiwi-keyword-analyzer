import Link from 'next/link'
import { Bike } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bike className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg">모토진단</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              노트북과 ELM327 어댑터로 오토바이 고장코드 · 실시간 데이터 · 로그를 확인하세요.
            </p>
          </div>
          <ul className="flex gap-6 text-sm">
            <li>
              <Link href="/" className="hover:text-blue-400 transition-colors">대시보드</Link>
            </li>
            <li>
              <Link href="/guide" className="hover:text-blue-400 transition-colors">연결 가이드</Link>
            </li>
          </ul>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© 2026 모토진단. 본인 차량 진단 용도로만 사용하세요.</p>
          <p>OBD-II · ELM327 · Web Serial / Web Bluetooth 기반</p>
        </div>
      </div>
    </footer>
  )
}
