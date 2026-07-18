import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/pending → 관리자 처리 대기(이벤트) 건수. 사이드바 배지용(가벼운 COUNT).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const cnt = async (sql: string): Promise<number> => {
    try { const r: any = await db.prepare(sql).first(); return Number(r?.c) || 0 } catch { return 0 }
  }
  const [plans, credits, points, senders, team, contacts] = await Promise.all([
    cnt("SELECT COUNT(*) c FROM plan_requests WHERE status='pending'"),
    cnt("SELECT COUNT(*) c FROM credit_requests WHERE status='pending'"),
    cnt("SELECT COUNT(*) c FROM point_requests WHERE status='pending'"),
    cnt("SELECT COUNT(*) c FROM sender_numbers WHERE status='pending'"),
    cnt("SELECT COUNT(*) c FROM team_orders WHERE status='pending'"),
    cnt("SELECT COUNT(*) c FROM contact_messages WHERE status='new'"),
  ])
  const approvals = plans + credits + points + senders + team
  return json({ ok: true, approvals, plans, credits, points, senders, team, contacts })
}
