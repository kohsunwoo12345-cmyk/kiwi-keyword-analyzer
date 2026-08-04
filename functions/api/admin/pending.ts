import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/pending → 관리자 처리 대기(이벤트) 건수. 사이드바 배지용(가벼운 COUNT).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  /* ⚠ 예전에는 세다가 실패하면 0 을 돌려줬다. 사이드바 배지가 0 이 되면
     발신번호 승인·플랜 신청이 쌓여도 관리자는 처리할 게 없다고 본다.
     0건과 못 셈은 다르다 — 못 셌으면 이 화면 전체가 실패했다고 말한다. */
  const cnt = async (sql: string): Promise<number> => {
    const r: any = await db.prepare(sql).first()
    return Number(r?.c) || 0
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
