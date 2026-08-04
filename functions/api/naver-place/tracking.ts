// Ported from SUPERPLACE (BYGENCY) — Hono 핸들러를 Cloudflare Pages Functions로 변환.
// Hono 컨텍스트(c) 호환 shim. 인증은 실제 세션(getSessionUser)으로 복원되어 계정별로 격리된다.
import { getSessionUser, resolveDB } from '../_utils'
import { ensurePlaceSchema } from './_schema'
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

    // DB 접근 시도
    const db = resolveDB(c.env) || c.env.DB || c.env.marketing
    if (db) await ensurePlaceSchema(db as any)

    if (!db) {
      console.error('[Tracking List] No DB binding found')
      /*  못 불러온 것을 "추적 키워드 없음" 으로 보여 주면 안 된다 —
          화면이 그 빈 목록을 진짜 값으로 캐시해서 다음 방문에도 없는 것처럼 보인다. */
      return c.json({ success: false, error: '추적 목록을 불러오지 못했습니다.', keywords: [] }, 503)
    }

    // 실제 세션 인증 — 로그인한 본인만 접근 가능
    const me: any = await getSessionUser(context.request, db)
    if (!me) return c.json({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

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
          WHERE t.place_id = ? AND t.user_id = ? AND t.status = 'active'
          ORDER BY t.created_at DESC
        `).bind(placeId, me.id).all()
        results = data.results || []
        console.log(`[Tracking List] Found ${results.length} keywords for place ${placeId} (user ${me.id})`)
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
          WHERE t.user_id = ? AND t.status = 'active'
          ORDER BY t.created_at DESC
        `).bind(me.id).all()
        results = data.results || []
        console.log(`[Tracking List] Found ${results.length} total tracking keywords for user ${me.id}`)
      }
    } catch (dbError) {
      /* ⚠ 예전에는 여기서 로그만 남기고 그대로 success: true · 빈 목록으로 나갔다.
         화면은 "추적 키워드 없음" 을 띄우고 그 빈 목록을 localStorage 에 캐시한다 —
         다음 방문에도 없는 것처럼 보인다. 못 불러왔으면 못 불러왔다고 말한다. */
      console.warn('DB query failed', dbError)
      return c.json({ success: false, error: '추적 목록을 불러오지 못했습니다.', keywords: [] }, 500)
    }

    return c.json({
      success: true,
      keywords: results
    })
  } catch (error) {
    console.error('Error fetching tracking keywords:', error)
    return c.json({ success: false, error: '추적 목록을 불러오지 못했습니다.', keywords: [] }, 500)
  }
}

export const onRequestPost: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    const _b: any = await c.req.json().catch(() => null)
    if (!_b || typeof _b !== 'object') return c.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, 400)
    const { placeId, placeUrl, keyword, location } = _b

    if (!placeId || !keyword) {
      return c.json({ success: false, error: '필수 정보를 입력해주세요.' }, 400)
    }

    // DB 접근 시도 (DB 또는 marketing 바인딩)
    const db = resolveDB(c.env) || c.env.DB || c.env.marketing
    if (db) await ensurePlaceSchema(db as any)

    if (!db) {
      console.error('[Tracking] No DB binding found')
      return c.json({
        success: false,
        error: 'DB 연결 실패: 바인딩이 설정되지 않았습니다.'
      }, 500)
    }

    // 실제 세션 인증 — 로그인한 본인만 등록 가능
    const me: any = await getSessionUser(context.request, db)
    if (!me) return c.json({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

    /* 한도 검사는 여기 있었지만 한 번도 돈 적이 없다 — 이식된 학원 SaaS 의 스키마를 본다.
       users.academy_id · subscriptions.academy_id · subscriptions.place_tracking_limit ·
       subscriptions.subscription_end_date 는 이 제품 어디에도 없는 칸이다.
       그래서 첫 질의가 곧바로 던지고 아래 catch 가 "등록 허용" 으로 넘겼다.
       즉 한도는 지금까지 아무에게도 걸린 적이 없다(추적 하나당 실패 질의만 한 번씩 더 나갔다).
       이 제품엔 플랜별 추적 한도라는 개념 자체가 없으므로, 있는 척하는 코드를 지운다.
       한도를 두려면 그때 요금제 쪽에 칸을 만들고 여기서 읽으면 된다. */

    // 중복 확인
    let existing = null
    try {
      existing = await db.prepare(`
        SELECT id FROM naver_place_tracking
        WHERE user_id = ? AND place_id = ? AND keyword = ? AND status = 'active'
      `).bind(me.id, placeId, keyword).first()
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
      `).bind(me.id, placeId, placeUrl || '', keyword, location || '').run()
      
      console.log('[Tracking] Successfully added:', { id: result.meta.last_row_id, placeId, keyword })
      
      return c.json({
        success: true,
        id: result.meta.last_row_id,
        message: '키워드 추적이 추가되었습니다. 매일 자동으로 순위를 확인합니다.'
      })
    } catch (dbError) {
      console.error('[Tracking] DB insert failed:', dbError)
      // DB 오류 원문은 로그에만 남긴다 — 클라이언트에 스키마/쿼리 내용을 흘리지 않는다.
      return c.json({
        success: false,
        error: 'DB 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'
      }, 500)
    }
  } catch (error) {
    console.error('Error adding tracking keyword:', error)
    return c.json({ success: false, error: '키워드 추가 실패: '  }, 500)
  }
}
