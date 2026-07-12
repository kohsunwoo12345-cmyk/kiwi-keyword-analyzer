import { Env, resolveDB } from '../_utils'
import { ensureIgSchema } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/dm-logs?limit=50&offset=0 → DM 발송 내역
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, logs: [], error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    const params = new URL(request.url).searchParams
    const limit = parseInt(params.get('limit') || '50')
    const offsetRaw = parseInt(params.get('offset') || '0')
    const offset = !isNaN(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0
    const logs = await db
      .prepare(
        `SELECT l.*, r.name as rule_name FROM instagram_dm_logs l LEFT JOIN instagram_dm_rules r ON l.rule_id = r.id ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(limit, offset)
      .all()
    const total = (await db.prepare(`SELECT COUNT(*) as c FROM instagram_dm_logs`).first()) as any
    return j({ success: true, logs: logs.results || [], total: total?.c || 0 })
  } catch (e: any) {
    return j({ success: false, logs: [], error: '서버 오류가 발생했습니다.' }, 200)
  }
}
