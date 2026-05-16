'use client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import type { AnalysisData } from '../KeywordAnalysis'
import { Monitor, Smartphone, Globe, ExternalLink, Lightbulb } from 'lucide-react'

interface Props {
  data: AnalysisData
}

const SECTION_TIPS: Record<string, { tip: string; color: string; bg: string }> = {
  VIEW:    { tip: '제목 앞부분에 키워드 배치, 정보성·이미지 중심 콘텐츠', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  블로그:   { tip: '키워드 포함 제목 + 본문 3회 이상 자연스럽게 삽입', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  뉴스:    { tip: '최신 이슈 + 언론사 배포 + 키워드 제목 포함', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  지식iN:  { tip: '자연스러운 Q&A 형식, 답변 채택률 높이기', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  쇼핑:    { tip: '상품명에 키워드 정확히 포함, 리뷰 수·가격 경쟁력', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  이미지:  { tip: '파일명·alt 속성에 키워드, 고화질 원본 이미지', color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200' },
  동영상:  { tip: '유튜브 제목·태그에 키워드 포함, 섬네일 최적화', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  카페:    { tip: '활성 카페 내 키워드 포함 게시글, 댓글 활성화', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  지도:    { tip: '네이버 플레이스 등록, 리뷰 확보, 주소 키워드 포함', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
}

const SECTION_COLOR: Record<string, string> = {
  VIEW: 'bg-blue-500',
  블로그: 'bg-green-500',
  뉴스: 'bg-red-500',
  지식iN: 'bg-purple-500',
  쇼핑: 'bg-orange-500',
  이미지: 'bg-pink-500',
  동영상: 'bg-rose-500',
  카페: 'bg-teal-500',
  지도: 'bg-amber-500',
}

// VIEW 섹션 모의 데이터
function getViewItems(keyword: string) {
  return [
    { title: `${keyword} 완전 정리 (2025년 최신)`, blog: '네이버블로그', date: '2025.05.12', rank: 1 },
    { title: `실제 경험자가 알려주는 ${keyword} 팁`, blog: '티스토리', date: '2025.05.10', rank: 2 },
    { title: `${keyword} 추천 BEST 5 비교 분석`, blog: '네이버블로그', date: '2025.05.08', rank: 3 },
    { title: `${keyword} 초보자 가이드 — 이것만 알면 됩니다`, blog: '브런치', date: '2025.05.05', rank: 4 },
    { title: `전문가가 말하는 ${keyword} 핵심 포인트`, blog: '네이버블로그', date: '2025.05.01', rank: 5 },
    { title: `${keyword} 장단점 솔직 후기 3개월 사용기`, blog: '티스토리', date: '2025.04.28', rank: 6 },
    { title: `${keyword} 관련 자주 묻는 질문 총정리`, blog: '네이버블로그', date: '2025.04.22', rank: 7 },
  ]
}

export function TabSection({ data }: Props) {
  const sections = data.sections || []
  const viewItems = getViewItems(data.keyword)

  // 구글 상위 결과 (있으면 표시)
  const googleResults = data.google?.topResults || []

  return (
    <div className="space-y-6">

      {/* ── PC / 모바일 섹션 배치 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PC 섹션 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-500" />
              PC 섹션 배치 순서
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {sections.map((s, i) => {
              const tip = SECTION_TIPS[s.name]
              const dotColor = SECTION_COLOR[s.name] || 'bg-gray-400'
              return (
                <div
                  key={s.name}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${
                    i === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center ${i < 3 ? dotColor : 'bg-gray-100'} ${i < 3 ? 'text-white' : 'text-gray-500'} text-xs font-bold rounded-full flex-shrink-0`}>
                    {i + 1}
                  </span>
                  <span className="text-lg">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 text-sm">{s.name}</span>
                    {tip && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{tip.tip}</p>
                    )}
                  </div>
                  {s.count !== undefined && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      TOP {s.count}
                    </span>
                  )}
                </div>
              )
            })}
          </CardBody>
        </Card>

        {/* 모바일 섹션 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-500" />
              모바일 섹션 배치 순서
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {[...sections].slice(0, 6).map((s, i) => {
              // 모바일은 PC와 약간 다른 순서
              const mobileOrder = i % 3 === 0 ? i + 1 : i % 3 === 1 ? i - 1 : i
              const dotColor = SECTION_COLOR[s.name] || 'bg-gray-400'
              return (
                <div
                  key={s.name}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${
                    i === 0 ? 'border-green-200 bg-green-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center ${i < 3 ? dotColor : 'bg-gray-100'} ${i < 3 ? 'text-white' : 'text-gray-500'} text-xs font-bold rounded-full flex-shrink-0`}>
                    {i + 1}
                  </span>
                  <span className="text-lg">{s.icon}</span>
                  <span className="font-semibold text-gray-800 text-sm">{s.name}</span>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* ── VIEW 섹션 TOP 7 ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-base">📋</span>
            네이버 VIEW 섹션 TOP 7 (스마트블록 상위 노출)
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {viewItems.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 border transition-all ${
                i < 3 ? 'border-green-100' : 'border-transparent hover:border-gray-100'
              }`}
            >
              <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                i < 3 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {item.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                    item.blog === '네이버블로그' ? 'bg-green-100 text-green-700' :
                    item.blog === '티스토리' ? 'bg-orange-100 text-orange-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>{item.blog}</span>
                  <span className="text-xs text-gray-400">{item.date}</span>
                </div>
              </div>
              {i < 3 && (
                <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold flex-shrink-0">TOP{item.rank}</span>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-2 p-3 bg-gray-50 rounded-xl">
            * VIEW 섹션은 실시간으로 변경될 수 있습니다. 네이버 스마트블록 기준 모의 데이터입니다.
          </p>
        </CardBody>
      </Card>

      {/* ── 구글 상위 노출 (실제 데이터) ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            구글 검색 상위 노출
            <span className="ml-auto text-xs font-normal text-gray-400">
              총 <strong className="text-blue-600">{data.google?.totalResults}</strong> 결과
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          {googleResults.length > 0 ? (
            <div className="space-y-2">
              {googleResults.map((r, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-blue-100 text-blue-600 text-xs font-bold rounded-lg">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline line-clamp-1"
                    >
                      {r.title || r.link}
                      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{r.link}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">구글 검색 데이터를 가져오는 중입니다</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── 섹션 분석 가이드 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: '📋', title: 'VIEW 섹션 노출 팁',
            desc: '키워드를 제목 앞부분에 배치하고 정보성 내용을 충실히 담으세요. 이미지와 구조화된 목차가 노출에 유리합니다.',
            color: 'bg-blue-50 border-blue-200 text-blue-800',
          },
          {
            icon: '🛍️', title: '쇼핑 섹션 노출 팁',
            desc: '상품명에 키워드를 정확히 포함하고 가격 경쟁력과 리뷰 수를 높이세요. 카테고리 최적화도 중요합니다.',
            color: 'bg-green-50 border-green-200 text-green-800',
          },
          {
            icon: <Globe className="w-5 h-5 text-indigo-600" />, title: '구글 SEO 팁',
            desc: '메타 타이틀·디스크립션에 키워드 포함, 내부 링크 구조 최적화, 페이지 속도 개선이 핵심입니다.',
            color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
          },
        ].map((guide, i) => (
          <div key={i} className={`border rounded-2xl p-4 ${guide.color}`}>
            <div className="text-2xl mb-2">
              {typeof guide.icon === 'string' ? guide.icon : guide.icon}
            </div>
            <h4 className="font-bold text-sm mb-1.5">{guide.title}</h4>
            <p className="text-xs opacity-80 leading-relaxed">{guide.desc}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
