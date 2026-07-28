import { Env, resolveDB, getSessionUser } from '../_utils'
import { ensureIgSchema, isIgAdmin } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/dm-logs?limit=50&offset=0 → DM 발송 내역
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, logs: [], error: 'DB 바인딩 없음' }, 200)
    // ⚠ 인증이 없어 로그인하지 않아도 조회됐다. 형제 엔드포인트(dm-rules)는 이미 세션을 요구한다 —
    //   같은 기준을 맞춘다. (이 기능은 아직 회원별로 나뉘어 있지 않아, 로그인한 회원끼리는 같은 내용을 본다)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, logs: [], error: '로그인이 필요합니다.' }, 401)
    await ensureIgSchema(db)
    const params = new URL(request.url).searchParams
    const limit = parseInt(params.get('limit') || '50')
    const offsetRaw = parseInt(params.get('offset') || '0')
    const offset = !isNaN(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0
    // ⚠ 예전에는 조건 없이 전부 읽어, 로그인만 하면 남이 보낸 DM 의 수신자·내용이 그대로 보였다
    const mine = isIgAdmin(me) ? '' : ' WHERE CAST(l.user_id AS TEXT) = CAST(? AS TEXT)'
    const args: any[] = isIgAdmin(me) ? [limit, offset] : [me.id, limit, offset]
    const logs = await db
      .prepare(
        `SELECT l.*, r.name as rule_name FROM instagram_dm_logs l
           LEFT JOIN instagram_dm_rules r ON l.rule_id = r.id${mine}
          ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...args)
      .all()
    const total = (isIgAdmin(me)
      ? await db.prepare(`SELECT COUNT(*) as c FROM instagram_dm_logs`).first()
      : await db.prepare(`SELECT COUNT(*) as c FROM instagram_dm_logs WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)`)
          .bind(me.id).first()) as any
    return j({ success: true, logs: logs.results || [], total: total?.c || 0 })
  } catch (e: any) {
    return j({ success: false, logs: [], error: '서버 오류가 발생했습니다.' }, 200)
  }
}
