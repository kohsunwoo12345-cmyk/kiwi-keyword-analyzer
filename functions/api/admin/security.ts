import {
  Env,
  json,
  ensureSchema,
  seedAdmin,
  resolveDB,
  requireAdminUser,
  logSecurity,
  logAudit,
  logExport,
  getSetting,
  setSetting,
  clientIp,
  addNotification,
} from '../_utils'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const nowIso = new Date().toISOString()
  const dayAgo = new Date(Date.now() - 86400000).toISOString()

  const [blocked, whitelist, logs, loginFailures, sessions, audit, exports, reports, installs] = await Promise.all([
    db.prepare('SELECT ip, reason, source, country, city, created_at FROM blocked_ips ORDER BY created_at DESC LIMIT 500').all(),
    db.prepare('SELECT ip, label, created_at FROM ip_whitelist ORDER BY created_at DESC LIMIT 500').all(),
    db.prepare('SELECT ts, ip, method, path, status, severity, detail, country, city, ua FROM security_log ORDER BY ts DESC LIMIT 400').all(),
    db.prepare('SELECT email, ip, ua, country, created_at FROM login_failures ORDER BY created_at DESC LIMIT 200').all(),
    db.prepare(`SELECT s.token, s.user_id, s.created_at, s.expires_at, s.ip, s.ua, s.country, u.name, u.email, u.role
                FROM sessions s LEFT JOIN users u ON u.id = s.user_id
                WHERE s.expires_at > ? ORDER BY s.created_at DESC LIMIT 300`).bind(nowIso).all(),
    db.prepare('SELECT admin_email, action, target, detail, severity, ip, created_at FROM audit_log ORDER BY created_at DESC LIMIT 300').all(),
    db.prepare('SELECT admin_email, filename, kind, rows, bytes, ip, created_at FROM export_audit ORDER BY created_at DESC LIMIT 200').all(),
    db.prepare('SELECT id, reporter_email, target_type, target_id, target_desc, reason, status, created_at, decided_at FROM content_reports ORDER BY (status=\'open\') DESC, created_at DESC LIMIT 200').all(),
    db.prepare('SELECT id, user_email, endpoint, platform, allowed, ip, country, city, ua, created_at FROM app_installs ORDER BY created_at DESC LIMIT 300').all(),
  ])

  // 세션 토큰은 앞 8자만 노출 (마스킹)
  const sessRows = (sessions.results || []).map((s: any) => ({
    token: (s.token || '').slice(0, 8),
    fullToken: s.token, // 강제 종료용 (관리자 전용)
    user_id: s.user_id,
    name: s.name,
    email: s.email,
    role: s.role,
    ip: s.ip,
    ua: s.ua,
    country: s.country,
    created_at: s.created_at,
    expires_at: s.expires_at,
  }))

  const count = async (sql: string, ...b: any[]) => {
    const r: any = await db.prepare(sql).bind(...b).first()
    return r?.n || 0
  }
  const [events24, threats24, loginFails24, activeSessions, pendingReports, pushAllowed] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM security_log WHERE ts > ?', dayAgo),
    count("SELECT COUNT(*) AS n FROM security_log WHERE ts > ? AND severity IN ('warn','high')", dayAgo),
    count('SELECT COUNT(*) AS n FROM login_failures WHERE created_at > ?', dayAgo),
    count('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?', nowIso),
    count("SELECT COUNT(*) AS n FROM content_reports WHERE status = 'open'"),
    count('SELECT COUNT(*) AS n FROM app_installs WHERE allowed = 1'),
  ])

  const whitelistMode = (await getSetting(db, 'whitelist_mode')) === 'on'

  return json({
    ok: true,
    settings: { whitelistMode },
    blocked: blocked.results || [],
    whitelist: whitelist.results || [],
    logs: logs.results || [],
    loginFailures: loginFailures.results || [],
    sessions: sessRows,
    audit: audit.results || [],
    exports: exports.results || [],
    reports: reports.results || [],
    installs: installs.results || [],
    stats: {
      blockedCount: (blocked.results || []).length,
      whitelistCount: (whitelist.results || []).length,
      events24,
      threats24,
      loginFails24,
      activeSessions,
      pendingReports,
      installsTotal: (installs.results || []).length,
      pushAllowed,
    },
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const admin = { id: guard.me.id, email: guard.me.email }
  const adminIp = clientIp(request)

  const body: any = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  const now = new Date().toISOString()

  switch (action) {
    case 'block': {
      const ip = String(body.ip || '').trim()
      if (!ip) return json({ ok: false, error: 'IP를 입력하세요.' }, 400)
      await db
        .prepare('INSERT OR REPLACE INTO blocked_ips (ip, reason, source, created_at, country, city) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(ip, String(body.reason || '관리자 수동 차단'), 'manual', now, String(body.country || ''), String(body.city || ''))
        .run()
      await logSecurity(db, { ip, severity: 'high', detail: '관리자 IP 차단' })
      await logAudit(db, admin, 'ip_block', ip, String(body.reason || ''), 'high', adminIp)
      break
    }
    case 'unblock':
    case 'delete-ip': {
      const ip = String(body.ip || '').trim()
      await db.prepare('DELETE FROM blocked_ips WHERE ip = ?').bind(ip).run()
      await logAudit(db, admin, action === 'delete-ip' ? 'ip_delete' : 'ip_unblock', ip, '', 'info', adminIp)
      break
    }
    case 'unblock-many': {
      const ips: string[] = Array.isArray(body.ips) ? body.ips : []
      for (const ip of ips) await db.prepare('DELETE FROM blocked_ips WHERE ip = ?').bind(String(ip)).run()
      await logAudit(db, admin, 'ip_unblock_many', `${ips.length}건`, ips.join(','), 'info', adminIp)
      break
    }
    case 'unblock-all': {
      await db.prepare('DELETE FROM blocked_ips').run()
      await logAudit(db, admin, 'ip_unblock_all', '전체', '', 'warn', adminIp)
      break
    }
    case 'whitelist-add': {
      const ip = String(body.ip || '').trim()
      if (!ip) return json({ ok: false, error: 'IP를 입력하세요.' }, 400)
      await db.prepare('INSERT OR REPLACE INTO ip_whitelist (ip, label, created_at) VALUES (?, ?, ?)').bind(ip, String(body.label || ''), now).run()
      await logAudit(db, admin, 'whitelist_add', ip, String(body.label || ''), 'info', adminIp)
      break
    }
    case 'whitelist-remove': {
      await db.prepare('DELETE FROM ip_whitelist WHERE ip = ?').bind(String(body.ip || '')).run()
      await logAudit(db, admin, 'whitelist_remove', String(body.ip || ''), '', 'info', adminIp)
      break
    }
    case 'whitelist-mode': {
      const on = body.enabled ? 'on' : 'off'
      await setSetting(db, 'whitelist_mode', on)
      await logAudit(db, admin, 'whitelist_mode', on, '', 'high', adminIp)
      break
    }
    case 'clear-logs': {
      await db.prepare('DELETE FROM security_log').run()
      await logAudit(db, admin, 'clear_security_logs', '', '', 'warn', adminIp)
      break
    }
    case 'clear-login-failures': {
      await db.prepare('DELETE FROM login_failures').run()
      await logAudit(db, admin, 'clear_login_failures', '', '', 'info', adminIp)
      break
    }
    case 'force-logout': {
      const token = String(body.token || '')
      await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
      await logAudit(db, admin, 'session_kill', token.slice(0, 8), '', 'warn', adminIp)
      break
    }
    case 'force-logout-user': {
      const uid = String(body.userId || '')
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(uid).run()
      await logAudit(db, admin, 'session_kill_user', uid, '', 'warn', adminIp)
      break
    }
    case 'force-logout-all': {
      // 관리자 본인 세션은 유지
      await db.prepare('DELETE FROM sessions WHERE user_id != ?').bind(admin.id).run()
      await logAudit(db, admin, 'session_kill_all', '전체', '', 'high', adminIp)
      break
    }
    case 'report-action': {
      const id = String(body.id || '')
      const status = String(body.status || '') // hidden | ignored | restored
      if (!['hidden', 'ignored', 'restored', 'open'].includes(status)) return json({ ok: false, error: '잘못된 상태' }, 400)
      await db.prepare('UPDATE content_reports SET status = ?, decided_at = ? WHERE id = ?').bind(status, now, id).run()
      await logAudit(db, admin, 'report_' + status, id, '', 'info', adminIp)
      break
    }
    case 'push-send': {
      // 실제 웹푸시 발송은 VAPID 키가 필요 — 여기서는 허용 사용자에게 대시보드 알림으로 발송
      const title = String(body.title || 'BYGENCY 알림')
      const bodyText = String(body.body || '')
      const targets = (await db.prepare('SELECT DISTINCT user_id FROM app_installs WHERE allowed = 1 AND user_id != ""').all()).results || []
      let sent = 0
      for (const t of targets as any[]) {
        if (t.user_id) {
          await addNotification(db, t.user_id, title, bodyText).catch(() => {})
          sent++
        }
      }
      await logAudit(db, admin, 'push_send', `${sent}명`, title, 'info', adminIp)
      return json({ ok: true, sent })
    }
    case 'export-log': {
      await logExport(db, admin, {
        filename: String(body.filename || 'export.csv'),
        kind: String(body.kind || 'csv'),
        rows: Number(body.rows || 0),
        bytes: Number(body.bytes || 0),
        ip: adminIp,
      })
      await logAudit(db, admin, 'data_export', String(body.filename || ''), `${body.rows || 0} rows`, 'info', adminIp)
      break
    }
    default:
      return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
  }
  return json({ ok: true })
}
