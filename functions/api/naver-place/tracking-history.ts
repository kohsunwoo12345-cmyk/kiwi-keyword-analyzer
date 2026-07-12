// Ported from SUPERPLACE (BYGENCY) — Hono 핸들러를 Cloudflare Pages Functions로 변환.
// Hono 컨텍스트(c) 호환 shim + 인증 무력화(툴 공개 동작, youtube 이식과 동일 패턴).
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
// 인증 shim — BYGENCY 대시보드 내 임베드 공개 도구이므로 통과시킴
const tryGetUserFromHeaders = (_c: any): { ok: true; user: any; userId: number } => ({ ok: true, user: { id: 0 }, userId: 0 })
const tryGetUserFromSession = async (_c: any): Promise<{ ok: true; user: any; userId: number }> => ({ ok: true, user: { id: 0 }, userId: 0 })
const getSessionUser = async (_c: any): Promise<any> => null
const kvRateLimit = async (..._a: any[]): Promise<boolean> => true
async function triggerDailyRankUpdateIfNeeded(_env?: any, _ctx?: any): Promise<void> {}
const puppeteer: any = (globalThis as any).puppeteer

export const onRequestGet: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    const trackingId = c.req.query('trackingId')
    const days = parseInt(c.req.query('days') || '30')
    const authUser = tryGetUserFromHeaders(c)
    if (!authUser.ok) return authUser.response
    const user = authUser.user
    
    const db = c.env.DB || c.env.marketing
    if (!db) return c.json({ success: true, history: [], summary: {} })
    
    try {
      // tracking 정보 조회 (본인 소유만)
      const tracking = await db.prepare(`
        SELECT * FROM naver_place_tracking WHERE id = ? AND CAST(user_id AS INTEGER) = CAST(? AS INTEGER)
      `).bind(trackingId, user.id).first()
      
      if (!tracking) return c.json({ success: false, error: '추적 정보를 찾을 수 없습니다.' }, 404)
      
      // 날짜별 순위 히스토리 조회
      const data = await db.prepare(`
        SELECT rank_number, total_count, place_name, created_at,
               date(created_at) as date
        FROM naver_place_ranks
        WHERE place_id = ? AND keyword = ?
          AND created_at >= datetime('now', '-${days} days')
        ORDER BY created_at ASC
        LIMIT 200
      `).bind(tracking.place_id, tracking.keyword).all()
      
      const history = data.results || []
      
      // 날짜별로 그룹화 (하루에 여러 번 측정된 경우 가장 최신 값 사용)
      const byDate: Record<string, any> = {}
      for (const row of history) {
        const date = row.date || row.created_at?.substring(0, 10)
        if (!byDate[date] || row.created_at > byDate[date].created_at) {
          byDate[date] = row
        }
      }
      const dailyHistory = Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date))
      
      // 통계 계산
      const ranks = dailyHistory.filter((r: any) => r.rank_number > 0).map((r: any) => r.rank_number)
      
      // place_name: 히스토리에서 가져오거나 tracking 테이블에서 가져오기
      const latestWithName = dailyHistory.slice().reverse().find((r: any) => r.place_name)
      const placeName = latestWithName?.place_name || tracking.place_name || null
      
      const summary = {
        totalDays: dailyHistory.length,
        bestRank: ranks.length > 0 ? Math.min(...ranks) : null,
        worstRank: ranks.length > 0 ? Math.max(...ranks) : null,
        avgRank: ranks.length > 0 ? (ranks.reduce((a: number, b: number) => a + b, 0) / ranks.length).toFixed(1) : null,
        latestRank: dailyHistory.length > 0 ? (dailyHistory[dailyHistory.length - 1] as any).rank_number : null,
        prevRank: dailyHistory.length > 1 ? (dailyHistory[dailyHistory.length - 2] as any).rank_number : null,
        tracking: { ...tracking, place_name: placeName }
      }
      
      return c.json({ success: true, history: dailyHistory, summary })
    } catch(e) {
      console.warn('[Tracking History] error:', e)
      return c.json({ success: true, history: [], summary: {} })
    }
  } catch (error) {
    console.error('Error fetching tracking history:', error)
    return c.json({ success: true, history: [], summary: {} })
  }
}
