import { Env, json, ensureSchema, getSessionUser, resolveDB, ensureReferralCode } from '../_utils'

const paidOf = (u: any) => (u.plan && u.plan !== '없음') || (u.video_plan && u.video_plan !== '없음')

// GET /api/account/referral → 내 추천인 코드 · 친구 목록 · 내가 추천한 회원
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const code = await ensureReferralCode(db, me.id)

  const friends = (await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.plan, u.video_plan, u.created_at, f.via, f.created_at AS since
       FROM friendships f JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ? ORDER BY f.created_at DESC`,
    )
    .bind(me.id)
    .all()).results || []

  const referred = (await db
    .prepare('SELECT id, name, email, plan, video_plan, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC')
    .bind(me.id)
    .all()).results || []

  let referredByName = ''
  if (me.referred_by) {
    const r: any = await db.prepare('SELECT name FROM users WHERE id = ?').bind(me.referred_by).first()
    referredByName = r?.name || ''
  }

  const map = (u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    plan: u.plan || '없음',
    videoPlan: u.video_plan || '없음',
    paid: paidOf(u),
    via: u.via || '',
    since: u.since || u.created_at,
    createdAt: u.created_at,
  })

  return json({
    ok: true,
    code,
    referredByName,
    friends: friends.map(map),
    referred: referred.map(map),
    friendCount: friends.length,
    referredCount: referred.length,
  })
}
