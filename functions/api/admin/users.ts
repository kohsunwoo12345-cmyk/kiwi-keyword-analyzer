import { Env, json, ensureSchema, seedAdmin, getSessionUser, publicUser, ADMIN_EMAIL, resolveDB } from '../_utils'

async function requireAdmin(request: Request, db: D1Database) {
  const me: any = await getSessionUser(request, db)
  if (!me) return { error: json({ ok: false, error: '로그인이 필요합니다.' }, 401) }
  if (me.email !== ADMIN_EMAIL && me.role !== 'admin')
    return { error: json({ ok: false, error: '관리자 권한이 필요합니다.' }, 403) }
  return { me }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdmin(request, db)
  if (guard.error) return guard.error

  const { results } = await db
    .prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 1000')
    .all()
  const users = (results || []).map(publicUser)

  const total = users.length
  const admins = users.filter((u: any) => u.role === 'admin').length
  const suspended = users.filter((u: any) => u.status === 'suspended').length
  const today = new Date().toISOString().slice(0, 10)
  const newToday = users.filter((u: any) => (u.createdAt || '').slice(0, 10) === today).length
  const byPlan = {
    Starter: users.filter((u: any) => u.plan === 'Starter').length,
    Pro: users.filter((u: any) => u.plan === 'Pro').length,
    Business: users.filter((u: any) => u.plan === 'Business').length,
  }

  return json({ ok: true, users, stats: { total, admins, suspended, newToday, byPlan } })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdmin(request, db)
  if (guard.error) return guard.error

  const body: any = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  const id = String(body.id || '')
  if (!id) return json({ ok: false, error: '대상 id가 없습니다.' }, 400)

  if (action === 'suspend') {
    await db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").bind(id).run()
  } else if (action === 'activate') {
    await db.prepare("UPDATE users SET status = 'active' WHERE id = ?").bind(id).run()
  } else if (action === 'delete') {
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  } else if (action === 'plan') {
    const plan = ['Starter', 'Pro', 'Business'].includes(body.plan) ? body.plan : 'Starter'
    await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, id).run()
  } else {
    return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
  }
  return json({ ok: true })
}
