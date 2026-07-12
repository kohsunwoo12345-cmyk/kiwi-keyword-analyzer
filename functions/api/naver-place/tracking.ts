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
    const placeId = c.req.query('placeId')
    const authUser = tryGetUserFromHeaders(c)
    if (!authUser.ok) return authUser.response
    const user = authUser.user
    
    // DB 접근 시도
    const db = c.env.DB || c.env.marketing
    
    if (!db) {
      console.error('[Tracking List] No DB binding found')
      return c.json({ success: true, keywords: [] })
    }

    // 🔥 매일 자동 순위 업데이트 트리거 (await로 dedup 기록 완료 보장)
    await triggerDailyRankUpdateIfNeeded(c.env, c.executionCtx)
    
    let results = []
    
    try {
      if (placeId) {
        // 특정 Place의 추적 목록 (본인 데이터만)
        const data = await db.prepare(`
          SELECT t.*, 
                 (SELECT rank_number FROM naver_place_ranks 
                  WHERE place_id = t.place_id AND keyword = t.keyword 
                  ORDER BY created_at DESC LIMIT 1) as last_rank,
                 (SELECT total_count FROM naver_place_ranks 
                  WHERE place_id = t.place_id AND keyword = t.keyword 
                  ORDER BY created_at DESC LIMIT 1) as last_total_count,
                 (SELECT place_name FROM naver_place_ranks 
                  WHERE place_id = t.place_id AND keyword = t.keyword 
                  ORDER BY created_at DESC LIMIT 1) as place_name,
                 (SELECT created_at FROM naver_place_ranks 
                  WHERE place_id = t.place_id AND keyword = t.keyword 
                  ORDER BY created_at DESC LIMIT 1) as last_checked
          FROM naver_place_tracking t
          WHERE t.place_id = ? AND CAST(t.user_id AS INTEGER) = CAST(? AS INTEGER) AND t.status = 'active'
          ORDER BY t.created_at DESC
        `).bind(placeId, user.id).all()
        results = data.results || []
        console.log(`[Tracking List] Found ${results.length} keywords for place ${placeId} (user ${user.id})`)
      } else {
        // 모든 추적 목록 (본인 데이터만)
        const data = await db.prepare(`
          SELECT t.*, 
                 (SELECT rank_number FROM naver_place_ranks 
                  WHERE place_id = t.place_id AND keyword = t.keyword 
                  ORDER BY created_at DESC LIMIT 1) as last_rank,
                 (SELECT total_count FROM naver_place_ranks 
                  WHERE place_id = t.place_id AND keyword = t.keyword 
                  ORDER BY created_at DESC LIMIT 1) as last_total_count,
                 (SELECT place_name FROM naver_place_ranks 
                  WHERE place_id = t.place_id AND keyword = t.keyword 
                  ORDER BY created_at DESC LIMIT 1) as place_name,
                 (SELECT created_at FROM naver_place_ranks 
                  WHERE place_id = t.place_id AND keyword = t.keyword 
                  ORDER BY created_at DESC LIMIT 1) as last_checked
          FROM naver_place_tracking t
          WHERE CAST(t.user_id AS INTEGER) = CAST(? AS INTEGER) AND t.status = 'active'
          ORDER BY t.created_at DESC
        `).bind(user.id).all()
        results = data.results || []
        console.log(`[Tracking List] Found ${results.length} total tracking keywords for user ${user.id}`)
      }
    } catch (dbError) {
      console.warn('DB query failed', dbError)
    }
    
    return c.json({
      success: true,
      keywords: results
    })
  } catch (error) {
    console.error('Error fetching tracking keywords:', error)
    return c.json({ success: true, keywords: [] })
  }
}

export const onRequestPost: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    const { placeId, placeUrl, keyword, location } = await c.req.json()
    const authUser = tryGetUserFromHeaders(c)
    if (!authUser.ok) return authUser.response
    const user = authUser.user
    
    if (!placeId || !keyword) {
      return c.json({ success: false, error: '필수 정보를 입력해주세요.' }, 400)
    }
    
    // DB 접근 시도 (DB 또는 marketing 바인딩)
    const db = c.env.DB || c.env.marketing
    
    if (!db) {
      console.error('[Tracking] No DB binding found')
      return c.json({ 
        success: false, 
        error: 'DB 연결 실패: 바인딩이 설정되지 않았습니다.' 
      }, 500)
    }

    // ✅ place_tracking_limit 한도 체크 (관리자 제외)
    try {
      const userId = authUser.userId
      const userRow = await db.prepare(`SELECT academy_id, role FROM users WHERE id = ?`).bind(userId).first() as any
      const isAdmin = userRow?.role === 'admin' || userRow?.role === 'superadmin' || userId === 1 || userId === 6

      if (!isAdmin && userRow) {
        const academyId = userRow.academy_id || userId

        // 현재 활성 추적 키워드 수 (학원 전체 기준 - academy 소속 모든 사용자 합산)
        let currentCount = 0
        try {
          const countRow = await db.prepare(`
            SELECT COUNT(*) as cnt FROM naver_place_tracking npt
            JOIN users u ON CAST(u.id AS INTEGER) = CAST(npt.user_id AS INTEGER)
            WHERE (u.academy_id = ? OR u.id = ?) AND npt.status = 'active'
          `).bind(academyId, academyId).first() as any
          currentCount = countRow?.cnt || 0
        } catch (e) { /* 테이블 없으면 무시 */ }

        // 구독에서 place_tracking_limit 조회
        const sub = await db.prepare(`
          SELECT place_tracking_limit FROM subscriptions
          WHERE academy_id = ? AND status = 'active' AND subscription_end_date >= date('now')
          ORDER BY created_at DESC LIMIT 1
        `).bind(academyId).first() as any

        const trackingLimit = sub?.place_tracking_limit || 0
        if (trackingLimit > 0 && currentCount >= trackingLimit) {
          return c.json({
            success: false,
            error: `⛔ 네이버 플레이스 순위 추적 키워드 한도에 도달했습니다.\n\n현재 추적 중: ${currentCount}개 / 한도: ${trackingLimit}개\n\n기존 키워드를 삭제하거나 상위 플랜으로 업그레이드해주세요.`
          }, 403)
        }
        console.log(`[Tracking] 한도 체크 통과: ${currentCount}/${trackingLimit || '무제한'}`)
      }
    } catch (limitErr: any) {
      // 한도 체크 실패해도 등록 허용 (graceful degradation)
      console.warn('[Tracking] 한도 체크 실패 (등록 허용):', limitErr.message)
    }
    
    // 중복 확인
    let existing = null
    try {
      existing = await db.prepare(`
        SELECT id FROM naver_place_tracking
        WHERE CAST(user_id AS INTEGER) = CAST(? AS INTEGER) AND place_id = ? AND keyword = ? AND status = 'active'
      `).bind(user.id, placeId, keyword).first()
    } catch (e) {
      console.warn('[Tracking] Table check failed:', e)
      // 테이블 없으면 무시
    }
    
    if (existing) {
      return c.json({ 
        success: false, 
        error: '이미 추적 중인 키워드입니다.' 
      }, 400)
    }
    
    // 추적 등록
    try {
      const result = await db.prepare(`
        INSERT INTO naver_place_tracking (
          user_id, place_id, place_url, keyword, location, 
          status, last_check, created_at
        ) VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
      `).bind(authUser.userId, placeId, placeUrl || '', keyword, location || '').run()
      
      console.log('[Tracking] Successfully added:', { id: result.meta.last_row_id, placeId, keyword })
      
      return c.json({
        success: true,
        id: result.meta.last_row_id,
        message: '키워드 추적이 추가되었습니다. 매일 자동으로 순위를 확인합니다.'
      })
    } catch (dbError) {
      console.error('[Tracking] DB insert failed:', dbError)
      return c.json({
        success: false,
        error: 'DB 저장 실패: ' + dbError.message
      }, 500)
    }
  } catch (error) {
    console.error('Error adding tracking keyword:', error)
    return c.json({ success: false, error: '키워드 추가 실패: '  }, 500)
  }
}
