export const runtime = 'edge'

/**
 * /api/trends
 * 네이버 쇼핑 인사이트 실제 트렌드 데이터 제공 API
 * 
 * GET /api/trends?type=all          → 전체 카테고리 트렌드
 * GET /api/trends?cid=50000000&count=20  → 특정 카테고리 트렌드
 * GET /api/trends?type=categories   → 카테고리 목록
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchRealTrendingKeywords,
  fetchAllCategoryTrends,
  fetchShoppingCategories,
  NAVER_SHOPPING_CATEGORIES,
} from '@/lib/naver-api'

// 6분 캐시 (네이버 쇼핑 인사이트는 일별 집계)
export const revalidate = 360

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') || 'single'
  const cidParam = searchParams.get('cid')
  const count = parseInt(searchParams.get('count') || '20', 10)
  const device = (searchParams.get('device') || '') as 'pc' | 'mo' | ''
  const sex = (searchParams.get('sex') || '') as 'f' | 'm' | ''
  const age = searchParams.get('age') || ''

  try {
    // 카테고리 목록 반환
    if (type === 'categories') {
      const categories = await fetchShoppingCategories()
      return NextResponse.json({
        ok: true,
        categories: categories.length > 0 ? categories : NAVER_SHOPPING_CATEGORIES,
      })
    }

    // 전체 카테고리 트렌드 (병렬 조회)
    if (type === 'all') {
      const allTrends = await fetchAllCategoryTrends(Math.min(count, 20))
      
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(now)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      return NextResponse.json({
        ok: true,
        type: 'all',
        dateRange: `${twoDaysAgo.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ~ ${yesterday.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`,
        updatedAt: now.toISOString(),
        data: allTrends,
        totalCategories: allTrends.length,
      })
    }

    // 단일 카테고리 트렌드
    const cid = cidParam ? parseInt(cidParam, 10) : 50000000
    const keywords = await fetchRealTrendingKeywords(cid, count, device, sex, age)

    // 카테고리 정보
    const categoryInfo = NAVER_SHOPPING_CATEGORIES.find(c => c.cid === cid)

    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(now)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    return NextResponse.json({
      ok: true,
      type: 'single',
      cid,
      category: categoryInfo || { cid, name: '전체', icon: '📊' },
      dateRange: `${twoDaysAgo.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ~ ${yesterday.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`,
      updatedAt: now.toISOString(),
      keywords,
      count: keywords.length,
      isRealData: keywords.length > 0,
    })

  } catch (e) {
    console.error('[TrendsAPI] error:', e)
    return NextResponse.json({ ok: false, error: '트렌드 데이터 조회 실패' }, { status: 500 })
  }
}
