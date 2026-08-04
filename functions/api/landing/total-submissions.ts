// SUPERPLACE 이식: GET /api/landing/total-submissions — 내 랜딩 전체 신청자 수
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ total: 0 })
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ total: 0 })
  try {
    const row: any = await db.prepare(
      `SELECT COUNT(fs.id) AS total FROM form_submissions fs JOIN landing_pages lp ON fs.landing_page_id = lp.id WHERE lp.user_id = ?`,
    ).bind(me.id).first()
    return j({ total: Number(row?.total || 0) })
  } catch {
    /* ⚠ 여기서 0 을 돌려주면 화면의 "총 신청자" 가 0 으로 바뀐다.
       신청이 없는 것과 못 세는 것은 완전히 다른 이야기다 — 0 을 보고 광고를 끄는
       판단까지 이어진다. 못 셌으면 못 셌다고 말하고, 화면은 숫자 대신 – 를 띄운다. */
    return j({ ok: false, error: '신청자 수를 세지 못했습니다.' }, 500)
  }
}
