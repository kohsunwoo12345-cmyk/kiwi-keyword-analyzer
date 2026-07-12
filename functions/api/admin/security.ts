import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, logSecurity } from '../_utils'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const blocked = (await db.prepare('SELECT ip, reason, source, created_at FROM blocked_ips ORDER BY created_at DESC LIMIT 500').all()).results || []
  const logs = (await db.prepare('SELECT ts, ip, method, path, status, severity, detail FROM security_log ORDER BY ts DESC LIMIT 300').all()).results || []

  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const events24: any = await db.prepare('SELECT COUNT(*) AS n FROM security_log WHERE ts > ?').bind(dayAgo).first()
  const warn24: any = await db.prepare("SELECT COUNT(*) AS n FROM security_log WHERE ts > ? AND severity IN ('warn','high')").bind(dayAgo).first()

  return json({
    ok: true,
    blocked,
    logs,
    stats: { blockedCount: blocked.length, events24: events24?.n || 0, threats24: warn24?.n || 0 },
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const body: any = await request.json().catch(() => ({}))
  const action = String(body.action || '')

  if (action === 'block') {
    const ip = String(body.ip || '').trim()
    if (!ip) return json({ ok: false, error: 'IP를 입력하세요.' }, 400)
    await db
      .prepare('INSERT OR REPLACE INTO blocked_ips (ip, reason, source, created_at) VALUES (?, ?, ?, ?)')
      .bind(ip, String(body.reason || '관리자 수동 차단'), 'manual', new Date().toISOString())
      .run()
    await logSecurity(db, { ip, severity: 'high', detail: '관리자 IP 차단' })
  } else if (action === 'unblock') {
    const ip = String(body.ip || '').trim()
    await db.prepare('DELETE FROM blocked_ips WHERE ip = ?').bind(ip).run()
  } else if (action === 'clear-logs') {
    await db.prepare('DELETE FROM security_log').run()
  } else {
    return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
  }
  return json({ ok: true })
}
