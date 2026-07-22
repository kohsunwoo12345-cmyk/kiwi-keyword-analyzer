// Ported from SUPERPLACE: POST /api/blog-analysis/keywords/trend (src/index.tsx ~121537)
// 네이버 검색광고 API 실제 검색량 + 데이터랩 30일 추이. API 키 없으면 503.
import { json, resolveDB, getSessionUser } from '../../_utils'
import { spKwNormalizeKeywords, spKwAdCredentials, spKwAnalyzeVolumeKeyword, spKwBuildTrend } from '../_naver'

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    const body = await request.json().catch(() => ({})) as any
    const keywords = spKwNormalizeKeywords(body.keywords || body.keyword || body.q, 5)
    if (!keywords.length) return json({ success: false, error: '키워드를 입력해주세요.' }, 400)

    const adCreds = spKwAdCredentials(env)
    if (!adCreds.customerId || !adCreds.apiSecret || !adCreds.accessLicense) {
      return json({
        success: false,
        error: '네이버 검색광고 API 키가 없어 실제 검색량을 조회할 수 없습니다. Cloudflare 환경변수 NAVER_AD_CUSTOMER_ID, NAVER_API_SECRET_KEY, NAVER_AD_ACCESS_LICENSE를 등록해 주세요.'
      }, 503)
    }

    const results: any[] = []
    for (const keyword of keywords) {
      let item: any
      try {
        item = await spKwAnalyzeVolumeKeyword(env, keyword)
      } catch (kwErr: any) {
        item = {
          keyword,
          monthly_pc_search: 0, monthly_mobile_search: 0, total_monthly_search: 0,
          competition_level: '정보 없음', difficulty_score: 0, opportunity_score: 0,
          recommended: false, blog_count: 0,
          volume_source: 'naver_ad_api_error', data_source: 'naver_ad_api_error',
          is_actual_search_volume: false, volume_error: kwErr?.message || String(kwErr)
        }
      }
      results.push(item)
      await new Promise(resolve => setTimeout(resolve, 160))
    }

    const adApiUsed = results.some(r => r.volume_source === 'naver_ad_api')
    const apiError = (results.find(r => r.volume_error) || {}).volume_error || ''
    const trend = await spKwBuildTrend(env, keywords, results)

    return json({
      success: true, keywords, results, count: results.length,
      ad_api_used: adApiUsed, api_error: apiError, trend, created_at: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[keyword-volume] trend endpoint failed:', error)
    return json({ success: false, error: error?.message || '키워드 검색량 조회 중 오류가 발생했습니다.' }, 500)
  }
}
