// Ported from SUPERPLACE (BYGENCY) — Hono 핸들러를 Cloudflare Pages Functions로 변환.
// Hono 컨텍스트(c) 호환 shim. 인증은 실제 세션(getSessionUser)으로 복원되어 계정별로 격리된다.
import { getSessionUser, resolveDB } from '../_utils'
function makeC(context: any): any {
  const { request, env, params } = context
  return {
    env,
    executionCtx: context,
    req: {
      url: request.url,
      json: () => request.json(),
      formData: () => request.formData(),
      query: (k: string) => new URL(request.url).searchParams.get(k),
      param: (k: string) => (params ? params[k] : undefined),
      header: (k: string) => request.headers.get(k),
    },
    json: (o: any, status = 200) =>
      new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } }),
    html: (h: any, status = 200) =>
      new Response(h, { status, headers: { 'content-type': 'text/html; charset=utf-8' } }),
    text: (t: any, status = 200) =>
      new Response(t, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }),
  }
}
const kvRateLimit = async (..._a: any[]): Promise<boolean> => true
async function triggerDailyRankUpdateIfNeeded(_env?: any, _ctx?: any): Promise<void> {}
const puppeteer: any = (globalThis as any).puppeteer

export const onRequestGet: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    const placeId = c.req.query('placeId')
    const keyword = c.req.query('keyword')
    const days = parseInt(c.req.query('days') || '30')

    // DB 접근 시도
    const db = resolveDB(c.env) || c.env.DB || c.env.marketing

    if (!db) {
      console.error('[Rank History] No DB binding found')
      return c.json({ success: true, history: [] })
    }

    // 실제 세션 인증 — 본인 추적 데이터만 조회
    const me: any = await getSessionUser(context.request, db)
    if (!me) return c.json({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

    // 🔥 매일 자동 순위 업데이트 트리거 (await로 dedup 기록 완료 보장)
    await triggerDailyRankUpdateIfNeeded(c.env, c.executionCtx)

    let results = []
    try {
      if (placeId && keyword) {
        // 특정 place + keyword 조합 히스토리 (본인 추적 데이터만)
        const data = await db.prepare(`
          SELECT r.rank_number, r.total_count, r.place_name, r.keyword, r.created_at,
                 date(r.created_at) as date
          FROM naver_place_ranks r
          INNER JOIN naver_place_tracking t ON r.place_id = t.place_id AND r.keyword = t.keyword
          WHERE r.place_id = ? AND r.keyword = ?
            AND t.user_id = ?
            AND t.status = 'active'
            AND r.created_at >= datetime('now', '-${days} days')
          ORDER BY r.created_at ASC
          LIMIT 200
        `).bind(placeId, keyword, me.id).all()
        results = data.results || []
      } else if (placeId) {
        // 특정 place의 전체 키워드 히스토리 (본인 추적 데이터만)
        const data = await db.prepare(`
          SELECT r.rank_number, r.total_count, r.place_name, r.keyword, r.created_at,
                 date(r.created_at) as date
          FROM naver_place_ranks r
          INNER JOIN naver_place_tracking t ON r.place_id = t.place_id AND r.keyword = t.keyword
          WHERE r.place_id = ?
            AND t.user_id = ?
            AND t.status = 'active'
            AND r.created_at >= datetime('now', '-${days} days')
          ORDER BY r.created_at DESC
          LIMIT 200
        `).bind(placeId, me.id).all()
        results = data.results || []
      } else {
        // 전체 히스토리 (최근 N일) - 본인 추적 place_id 기준
        const data = await db.prepare(`
          SELECT r.rank_number, r.total_count, r.place_name, r.keyword, r.place_id, r.created_at,
                 date(r.created_at) as date
          FROM naver_place_ranks r
          INNER JOIN naver_place_tracking t ON r.place_id = t.place_id AND r.keyword = t.keyword
          WHERE t.user_id = ?
            AND t.status = 'active'
            AND r.created_at >= datetime('now', '-${days} days')
          ORDER BY r.created_at DESC
          LIMIT 200
        `).bind(me.id).all()
        results = data.results || []
      }
    } catch(e) {
      console.warn('[Rank History] query error:', e)
    }
    
    console.log(`[Rank History] Found ${results.length} records for place=${placeId}, keyword=${keyword}, user=${me.id}`)
    
    return c.json({
      success: true,
      history: results
    })
  } catch (error) {
    console.error('Error fetching rank history:', error)
    return c.json({ success: true, history: [] })
  }
}
