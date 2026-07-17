import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, logAudit, clientIp } from '../_utils'

// GET  /api/admin/credits-recall  → 현재 전체 보유 크레딧 합계·대상 회원 수(미리보기)
// POST /api/admin/credits-recall {includeAdmin?:boolean, confirm:'RECALL'} → 전체 회원 크레딧 0으로 회수
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const all: any = await db.prepare("SELECT COUNT(*) c, COALESCE(SUM(credits),0) s FROM users WHERE credits > 0").first()
  const nonAdmin: any = await db.prepare("SELECT COUNT(*) c, COALESCE(SUM(credits),0) s FROM users WHERE credits > 0 AND role != 'admin'").first()
  return json({
    ok: true,
    total: { users: Number(all?.c) || 0, credits: Math.round((Number(all?.s) || 0) * 100) / 100 },
    nonAdmin: { users: Number(nonAdmin?.c) || 0, credits: Math.round((Number(nonAdmin?.s) || 0) * 100) / 100 },
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const admin = { id: guard.me.id, email: guard.me.email }
  const ip = clientIp(request)

  const b: any = await request.json().catch(() => ({}))
  if (String(b.confirm || '') !== 'RECALL')
    return json({ ok: false, error: '확인 문자열(RECALL)이 필요합니다.' }, 400)
  const includeAdmin = !!b.includeAdmin

  // 회수 전 합계(감사 로그용)
  const where = includeAdmin ? 'credits > 0' : "credits > 0 AND role != 'admin'"
  const before: any = await db.prepare(`SELECT COUNT(*) c, COALESCE(SUM(credits),0) s FROM users WHERE ${where}`).first()
  const affected = Number(before?.c) || 0
  const recalled = Math.round((Number(before?.s) || 0) * 100) / 100

  // 전체 크레딧 0으로 회수
  await db.prepare(`UPDATE users SET credits = 0 WHERE ${where}`).run()

  await logAudit(db, admin, 'credits_recall_all', includeAdmin ? '전체(관리자 포함)' : '전체(관리자 제외)',
    `${affected}명 · ${recalled} 크레딧 회수`, 'high', ip)

  return json({ ok: true, affected, recalled, includeAdmin })
}
