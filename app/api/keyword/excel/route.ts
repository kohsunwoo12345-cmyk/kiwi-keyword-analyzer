import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q')
  if (!keyword) return NextResponse.json({ error: '키워드를 입력하세요' }, { status: 400 })

  // 분석 데이터 가져오기
  const baseUrl = req.nextUrl.origin
  const apiRes = await fetch(`${baseUrl}/api/keyword?q=${encodeURIComponent(keyword)}`)
  if (!apiRes.ok) return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 })
  const data = await apiRes.json()

  const wb = XLSX.utils.book_new()

  // ── 시트 1: 기본 정보 ─────────────────────────────────
  const basicRows = [
    ['키워드 분석 리포트', '', '', ''],
    ['생성일시', new Date().toLocaleString('ko-KR'), '', ''],
    ['', '', '', ''],
    ['=== 기본 정보 ===', '', '', ''],
    ['키워드', data.keyword],
    ['등급', data.grade?.grade || '-'],
    ['경쟁도', data.competitionLevel || '-'],
    ['포화도', data.saturation?.label || '-'],
    ['', '', '', ''],
    ['=== 검색량 ===', '', '', ''],
    ['PC 검색량', data.pcSearch || 0],
    ['모바일 검색량', data.mobileSearch || 0],
    ['총 검색량', data.totalSearch || 0],
    ['예상 검색량(당월)', data.estimatedSearch || 0],
    ['', '', '', ''],
    ['=== 콘텐츠 발행량 ===', '', '', ''],
    ['블로그 발행량', data.blogCount || 0],
    ['카페 발행량', data.cafeCount || 0],
    ['뉴스 발행량', data.newsCount || 0],
    ['', '', '', ''],
    ['=== 광고 정보 ===', '', '', ''],
    ['PC 입찰가(CPC)', data.pcBid || 0],
    ['모바일 입찰가(CPC)', data.mobileBid || 0],
    ['PC 클릭률(CTR)', data.pcCtr ? `${data.pcCtr}%` : '-'],
    ['모바일 클릭률(CTR)', data.mobileCtr ? `${data.mobileCtr}%` : '-'],
    ['', '', '', ''],
    ['=== 구글 데이터 ===', '', '', ''],
    ['구글 검색 결과 수', data.google?.totalResults || '-'],
    ['', '', '', ''],
    ['=== 이슈성 정보 ===', '', '', ''],
    ['이슈성 지수', `${data.issueIndex || 0}%`],
    ['최초 등장일(추정)', data.firstAppearDate || '-'],
  ]
  const wsBasic = XLSX.utils.aoa_to_sheet(basicRows)
  wsBasic['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsBasic, '기본정보')

  // ── 시트 2: 연관 키워드 ───────────────────────────────
  const relHeader = ['키워드', 'PC검색량', '모바일검색량', '총검색량', '블로그발행량', '카페발행량', '포화도(%)', '경쟁도', '등급']
  const relRows = (data.relKeywords || []).map((r: any) => [
    r.keyword,
    r.pcSearch || 0,
    r.mobileSearch || 0,
    r.totalSearch || 0,
    r.blogCount || 0,
    r.cafeCount || 0,
    `${r.saturationRatio || 0}%`,
    r.competitionLevel || '보통',
    r.grade || '-',
  ])
  const wsRel = XLSX.utils.aoa_to_sheet([relHeader, ...relRows])
  wsRel['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, wsRel, '연관키워드')

  // ── 시트 3: 월별 트렌드 ───────────────────────────────
  const trendHeader = ['기간', 'PC검색량', '모바일검색량', '합계', '비율(%)']
  const trendRows = (data.monthlyTrends || []).map((m: any, i: number) => [
    m.month,
    m.pc || 0,
    m.mobile || 0,
    (m.pc || 0) + (m.mobile || 0),
    `${(data.monthlyRatio?.[i]?.ratio) || 0}%`,
  ])
  const wsTrend = XLSX.utils.aoa_to_sheet([trendHeader, ...trendRows])
  wsTrend['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsTrend, '월별트렌드')

  // ── 시트 4: 요일별 분포 ───────────────────────────────
  const weekdayHeader = ['요일', '검색 비율(%)']
  const weekdayRows = (data.weekdayTrends || []).map((w: any) => [w.day, `${w.ratio}%`])
  const wsWeekday = XLSX.utils.aoa_to_sheet([weekdayHeader, ...weekdayRows])
  wsWeekday['!cols'] = [{ wch: 8 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsWeekday, '요일별분포')

  // ── 시트 5: 성향 분석 ─────────────────────────────────
  const personalityRows = [
    ['=== 성별 분포 ==='],
    ['남성', `${data.genderRatio?.male || 50}%`],
    ['여성', `${data.genderRatio?.female || 50}%`],
    [''],
    ['=== 디바이스 분포 ==='],
    ['PC', `${data.deviceRatio?.pc || 30}%`],
    ['모바일', `${data.deviceRatio?.mobile || 70}%`],
    [''],
    ['=== 연령대 분포 ==='],
    ...Object.entries(data.ageGroup || {}).map(([age, pct]) => [age, `${pct}%`]),
  ]
  const wsPersonality = XLSX.utils.aoa_to_sheet(personalityRows)
  wsPersonality['!cols'] = [{ wch: 15 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsPersonality, '성향분석')

  // ── 시트 6: 구글 상위 노출 ────────────────────────────
  const googleHeader = ['순위', '제목', 'URL', '설명']
  const googleRows = (data.google?.topResults || []).map((r: any, i: number) => [
    i + 1,
    r.title || '',
    r.link || '',
    r.description || '',
  ])
  const wsGoogle = XLSX.utils.aoa_to_sheet([
    ['구글 검색 결과 수', data.google?.totalResults || '-'],
    [''],
    googleHeader,
    ...googleRows,
  ])
  wsGoogle['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 50 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, wsGoogle, '구글검색결과')

  // ── 버퍼 생성 ─────────────────────────────────────────
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const fileName = encodeURIComponent(`키워드분석_${keyword}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
    },
  })
}
