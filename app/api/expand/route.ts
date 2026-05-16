export const runtime = 'edge'

/**
 * /api/expand
 * 네이버 자동완성 API를 활용한 실제 연관 키워드 확장
 * 
 * GET /api/expand?q=키워드&depth=1  → 연관 키워드 트리 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchRealRelatedKeywords } from '@/lib/naver-api'

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q')
  const depth = parseInt(req.nextUrl.searchParams.get('depth') || '1', 10)
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10', 10)

  if (!keyword) {
    return NextResponse.json({ error: '키워드를 입력하세요' }, { status: 400 })
  }

  try {
    // 1단계: 시드 키워드 자동완성
    const related = await fetchRealRelatedKeywords(keyword, Math.min(limit, 20))

    // 2단계: 각 연관 키워드도 자동완성 (depth=2 이상일 때)
    let expandedTree: { keyword: string; children: string[] }[] = []

    if (depth >= 2 && related.length > 0) {
      const childResults = await Promise.allSettled(
        related.slice(0, 5).map(async (relKw) => {
          const children = await fetchRealRelatedKeywords(relKw, 5)
          return { keyword: relKw, children }
        })
      )

      expandedTree = childResults
        .filter((r): r is PromiseFulfilledResult<{ keyword: string; children: string[] }> => r.status === 'fulfilled')
        .map(r => r.value)
      
      // depth=1 키워드들 중 트리에 없는 것들도 추가
      for (const kw of related.slice(5)) {
        expandedTree.push({ keyword: kw, children: [] })
      }
    }

    return NextResponse.json({
      ok: true,
      seed: keyword,
      related,
      tree: depth >= 2 ? expandedTree : related.map(k => ({ keyword: k, children: [] })),
      count: related.length,
      isRealData: true,
      source: '네이버 자동완성',
    })
  } catch (e) {
    console.error('[ExpandAPI]', e)
    return NextResponse.json({ error: '연관 키워드 조회 실패' }, { status: 500 })
  }
}
