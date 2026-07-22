// Ported from SUPERPLACE: POST /api/blog-analysis/keyword-volume/share (src/index.tsx ~121591)
// 키워드 검색량 리포트를 공유 토큰으로 저장 → /shared/keyword-volume/:token 에서 열람
import { json, resolveDB, getSessionUser } from '../../_utils'
import { spKwNormalizeKeywords, spKwAdCredentials, spKwAnalyzeVolumeKeyword, spKwBuildTrend, spFlaToken } from '../_naver'

async function ensureShareTable(db: any) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS blog_keyword_volume_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE,
    user_id TEXT,
    keywords_json TEXT,
    payload_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT
  )`).run()
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 연결이 필요합니다.' }, 500)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    const body = await request.json().catch(() => ({})) as any
    let payload = body.payload || body.report || null
    let keywords = spKwNormalizeKeywords(body.keywords || payload?.keywords || (payload?.results || []).map((r: any) => r.keyword), 5)

    if (!payload || !Array.isArray(payload.results) || !payload.trend) {
      if (!keywords.length) return json({ success: false, error: '공유할 키워드 데이터가 없습니다.' }, 400)
      const adCreds = spKwAdCredentials(env)
      if (!adCreds.customerId || !adCreds.apiSecret || !adCreds.accessLicense) {
        return json({ success: false, error: '네이버 검색광고 API 키가 없어 실제 검색량 공유 리포트를 생성할 수 없습니다.' }, 503)
      }
      const results: any[] = []
      for (const keyword of keywords) {
        results.push(await spKwAnalyzeVolumeKeyword(env, keyword))
        await new Promise(resolve => setTimeout(resolve, 160))
      }
      payload = { success: true, keywords, results, trend: await spKwBuildTrend(env, keywords, results), created_at: new Date().toISOString() }
    } else if (!keywords.length) {
      keywords = (payload.results || []).map((r: any) => String(r.keyword || '')).filter(Boolean).slice(0, 5)
    }

    payload = {
      keywords,
      results: (payload.results || []).slice(0, 5),
      trend: payload.trend || {},
      created_at: payload.created_at || new Date().toISOString()
    }

    const token = spFlaToken()
    await ensureShareTable(db)
    await db.prepare("INSERT INTO blog_keyword_volume_shares (token, user_id, keywords_json, payload_json, created_at, expires_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+90 days'))")
      .bind(token, String(me.id || ''), JSON.stringify(keywords), JSON.stringify(payload).slice(0, 900000)).run()

    const origin = new URL(request.url).origin
    return json({ success: true, token, url: `${origin}/shared/keyword-volume/${token}` })
  } catch (error) {
    console.error('[keyword-volume] share failed:', error)
    return json({ success: false, error: '공유 URL을 만들지 못했습니다.' }, 500)
  }
}
