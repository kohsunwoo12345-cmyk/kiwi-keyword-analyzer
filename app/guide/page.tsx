import Link from 'next/link'
import { Usb, Bluetooth, Globe, Cable, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: '연결 가이드 — 오토바이 진단',
  description: 'ELM327 어댑터로 오토바이를 노트북에 연결하는 방법과 준비물, 한계점 안내',
}

export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> 진단 대시보드로
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">연결 가이드</h1>
        <p className="text-gray-500">노트북으로 오토바이 고장코드 · 실시간 데이터 · 로그를 읽기 위한 준비물과 방법입니다.</p>
      </div>

      {/* 준비물 */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-bold text-gray-900 mb-4">1. 준비물</h2>
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-3">
            <Cable className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>
              <b>ELM327 OBD 어댑터</b> — USB형(가장 안정적) 또는 BLE(블루투스 4.0)형. 저가형 블루투스 어댑터는
              대부분 <b>Bluetooth Classic(SPP)</b>이라 브라우저에서 동작하지 않습니다. 블루투스를 쓰려면 반드시 <b>BLE</b> 모델이어야 합니다.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Cable className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>
              <b>차종에 맞는 진단 커넥터</b> — 16핀 OBD-II 포트가 있는 기종은 그대로 연결합니다. 혼다/야마하/스즈키/가와사키 등은
              전용 변환 케이블(예: 4핀/6핀)이 필요할 수 있습니다.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>
              <b>데스크톱 크롬 또는 엣지 브라우저</b> — Web Serial / Web Bluetooth는 이 브라우저들에서만 동작합니다.
              (사파리·파이어폭스, iOS는 미지원)
            </span>
          </li>
        </ul>
      </section>

      {/* 연결 방법 */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-bold text-gray-900 mb-4">2. 연결 방법</h2>
        <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
          <li>오토바이 시동키를 ON 위치로 둡니다. (엔진 시동까지는 선택)</li>
          <li>ELM327 어댑터를 진단 포트에 꽂고, USB형이면 노트북에 케이블을 연결합니다.</li>
          <li>
            대시보드에서 <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded"><Usb className="w-3 h-3" />USB 연결</span> 또는
            <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded ml-1"><Bluetooth className="w-3 h-3" />블루투스</span> 버튼을 누릅니다.
          </li>
          <li>브라우저 팝업에서 해당 장치를 선택하면 자동으로 초기화 후 데이터가 표시됩니다.</li>
        </ol>
        <div className="mt-4 flex items-start gap-2 bg-emerald-50 text-emerald-800 text-sm rounded-lg px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>어댑터가 없어도 <b>‘데모 실행’</b> 버튼으로 모든 화면과 기능을 미리 체험할 수 있습니다.</span>
        </div>
      </section>

      {/* 읽을 수 있는 것 */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-bold text-gray-900 mb-4">3. 무엇을 읽을 수 있나요?</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> 고장코드(DTC) 읽기 / 삭제
          </div>
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> 실시간 데이터 (회전수 · 차속 · 수온 · 스로틀 · 전압 등) 및 로그 저장
          </div>
          <div className="flex items-start gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <span>
              <b>주행거리(키로수)</b> — 표준 OBD-II에는 적산거리 항목이 없습니다. 오토바이는 거리 정보가 계기판 ECU에 따로
              저장되는 경우가 많아, 일반 ELM327로는 대부분 읽을 수 없고 제조사 전용 장비가 필요합니다.
            </span>
          </div>
        </div>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> 알아두기
        </h2>
        <ul className="space-y-1.5 text-sm text-amber-800 list-disc list-inside">
          <li>오토바이는 자동차와 달리 OBD 표준화가 약해, 차종에 따라 일부 항목이 안 읽힐 수 있습니다.</li>
          <li>본인 소유 차량 진단 용도로만 사용하세요.</li>
          <li>고장코드 삭제는 실제 고장을 고치는 것이 아니라 기록만 지웁니다.</li>
        </ul>
      </section>
    </div>
  )
}
