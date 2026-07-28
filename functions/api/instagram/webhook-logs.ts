import { Env, resolveDB, getSessionUser } from '../_utils'
import { ensureIgSchema, isIgAdmin } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/webhook-logs?limit=20 → 웹훅 수신 내역
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, logs: [], error: 'DB 바인딩 없음' }, 200)
    // ⚠ 인증이 없어 로그인하지 않아도 조회됐다. 형제 엔드포인트(dm-rules)는 이미 세션을 요구한다 —
    //   같은 기준을 맞춘다. (이 기능은 아직 회원별로 나뉘어 있지 않아, 로그인한 회원끼리는 같은 내용을 본다)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, logs: [], error: '로그인이 필요합니다.' }, 401)
    await ensureIgSchema(db)
    const limitRaw = parseInt(new URL(request.url).searchParams.get('limit') || '20')
    const limit = !isNaN(limitRaw) && limitRaw > 0 && limitRaw <= 1000 ? limitRaw : 20
    // ⚠ 예전에는 전부 읽었다 — 내 계정으로 들어온 것만 보여 준다
    const logs = isIgAdmin(me)
      ? await db.prepare(`SELECT id, event_type, processed, created_at FROM instagram_webhook_logs ORDER BY created_at DESC LIMIT ?`)
          .bind(limit).all()
      : await db.prepare(
          `SELECT id, event_type, processed, created_at FROM instagram_webhook_logs
            WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT) ORDER BY created_at DESC LIMIT ?`,
        ).bind(me.id, limit).all()
    return j({ success: true, logs: logs.results || [] })
  } catch (e: any) {
    return j({ success: false, logs: [], error: '서버 오류가 발생했습니다.' }, 200)
  }
}
