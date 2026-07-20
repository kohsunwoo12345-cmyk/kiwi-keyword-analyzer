import {
  Env,
  json,
  ensureSchema,
  resolveDB,
  hashPassword,
  verifyPassword,
  clientIp,
  geoFrom,
  logSecurity,
} from '../_utils'
import { resendEmail } from '../_external'

// POST /api/account/forgot-password
//  { action: 'request', email }              → 이메일로 6자리 인증코드 발송 (Resend, 발신 cs@bygency.co)
//  { action: 'verify',  email, code, next }  → 코드 검증 후 새 비밀번호 설정 + 기존 세션 무효화
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)

  const body: any = await request.json().catch(() => ({}))
  const action = String(body.action || 'request')
  const email = String(body.email || '').trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return json({ ok: false, error: '올바른 이메일을 입력하세요.' }, 400)

  const ip = clientIp(request)
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  if (action === 'request') {
    const user: any = await db.prepare('SELECT id, name, provider FROM users WHERE email = ?').bind(email).first()
    // 계정 존재 여부를 노출하지 않기 위해 항상 성공처럼 응답 (이메일 열거 방지)
    if (!user) return json({ ok: true })

    // 재발송 쿨다운 (60초) — 남용 방지
    const existing: any = await db.prepare('SELECT last_sent_at FROM password_resets WHERE email = ?').bind(email).first()
    if (existing?.last_sent_at && now - +new Date(existing.last_sent_at) < 60_000) {
      return json({ ok: true, cooldown: true })
    }

    // 6자리 코드 생성 (crypto 기반)
    const rnd = crypto.getRandomValues(new Uint32Array(1))[0]
    const code = String(100000 + (rnd % 900000))
    const codeHash = await hashPassword(code)
    const expires = new Date(now + 10 * 60_000).toISOString() // 10분 유효
    await db
      .prepare(`INSERT INTO password_resets (email, code_hash, expires_at, attempts, last_sent_at, created_at)
                VALUES (?, ?, ?, 0, ?, ?)
                ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, last_sent_at = excluded.last_sent_at`)
      .bind(email, codeHash, expires, nowIso, nowIso)
      .run()

    const html = `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
        <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#6d28d9">BYGENCY</div>
        <h1 style="font-size:20px;margin:24px 0 8px">비밀번호 재설정 인증코드</h1>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">
          안녕하세요${user.name ? ` ${user.name}님` : ''}. 아래 6자리 인증코드를 입력해 비밀번호를 재설정하세요.
          이 코드는 <b>10분간</b> 유효합니다.
        </p>
        <div style="font-size:34px;font-weight:800;letter-spacing:0.35em;background:#f5f3ff;color:#6d28d9;text-align:center;padding:18px 0;border-radius:14px;border:1px solid #ede9fe">
          ${code}
        </div>
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:20px 0 0">
          본인이 요청하지 않았다면 이 메일을 무시하세요. 계정은 안전하며 비밀번호는 변경되지 않습니다.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
        <p style="color:#94a3b8;font-size:12px;margin:0">© BYGENCY · cs@bygency.co</p>
      </div>`

    const sent = await resendEmail(env, {
      to: email,
      subject: '[BYGENCY] 비밀번호 재설정 인증코드',
      html,
      from: 'BYGENCY <cs@bygency.co>',
    })
    if (!sent.ok) {
      await logSecurity(db, { ip, method: 'POST', path: '/api/account/forgot-password', status: 502, severity: 'warn', detail: `비밀번호 재설정 메일 발송 실패: ${sent.error || ''}`.slice(0, 120) })
      return json({ ok: false, error: '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 502)
    }
    return json({ ok: true })
  }

  if (action === 'verify') {
    const code = String(body.code || '').trim()
    const next = String(body.next || '')
    if (!code) return json({ ok: false, error: '인증코드를 입력하세요.' }, 400)
    if (next.length < 8) return json({ ok: false, error: '새 비밀번호는 8자 이상이어야 합니다.' }, 400)

    const row: any = await db.prepare('SELECT code_hash, expires_at, attempts FROM password_resets WHERE email = ?').bind(email).first()
    if (!row) return json({ ok: false, error: '인증코드를 먼저 요청하세요.' }, 400)
    if (+new Date(row.expires_at) < now) {
      await db.prepare('DELETE FROM password_resets WHERE email = ?').bind(email).run()
      return json({ ok: false, error: '인증코드가 만료되었습니다. 다시 요청하세요.' }, 400)
    }
    if (Number(row.attempts) >= 5) {
      await db.prepare('DELETE FROM password_resets WHERE email = ?').bind(email).run()
      return json({ ok: false, error: '시도 횟수를 초과했습니다. 코드를 다시 요청하세요.' }, 429)
    }
    const okCode = await verifyPassword(code, row.code_hash)
    if (!okCode) {
      await db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE email = ?').bind(email).run()
      return json({ ok: false, error: '인증코드가 올바르지 않습니다.' }, 400)
    }

    const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (!user) return json({ ok: false, error: '계정을 찾을 수 없습니다.' }, 404)
    const ph = await hashPassword(next)
    await db.prepare('UPDATE users SET password_hash = ?, password_set = 1 WHERE id = ?').bind(ph, user.id).run()
    await db.prepare('DELETE FROM password_resets WHERE email = ?').bind(email).run()
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run() // 보안상 전체 세션 무효화
    const geo = geoFrom(request)
    await logSecurity(db, { ip, method: 'POST', path: '/api/account/forgot-password', status: 200, severity: 'warn', detail: `비밀번호 재설정 완료: ${email}`, country: geo.country, city: geo.city })
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
