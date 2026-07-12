import { Env, resolveDB } from '../_utils'
import { ensureIgSchema } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/webhook-logs?limit=20 → 웹훅 수신 내역
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, logs: [], error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    const limitRaw = parseInt(new URL(request.url).searchParams.get('limit') || '20')
    const limit = !isNaN(limitRaw) && limitRaw > 0 && limitRaw <= 1000 ? limitRaw : 20
    const logs = await db
      .prepare(`SELECT id, event_type, processed, created_at FROM instagram_webhook_logs ORDER BY created_at DESC LIMIT ?`)
      .bind(limit)
      .all()
    return j({ success: true, logs: logs.results || [] })
  } catch (e: any) {
    return j({ success: false, logs: [], error: '서버 오류가 발생했습니다.' }, 200)
  }
}
