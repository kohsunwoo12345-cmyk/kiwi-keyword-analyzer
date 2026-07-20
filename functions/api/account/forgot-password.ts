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
import { resendEmail, emailShell } from '../_external'

// POST /api/account/forgot-password
//  { action: 'request', email }              → 이메일로 6자리 인증코드 발송 (Resend, 발신 cs@bygency.co)
//  { action: 'verify',  email, code, next }  → 코드 검증 후 새 비밀번호 설정 + 기존 세션 무효화
//
// 어떤 경우에도 예외를 밖으로 던지지 않고 JSON 을 반환한다(던지면 Cloudflare 가 본문 없는 502 를
// 내려 프런트가 "네트워크 오류"로만 보게 됨). 실패 사유는 항상 JSON error 로 노출한다.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    return await handle(ctx.request, ctx.env)
  } catch (e: any) {
    return json({ ok: false, error: '비밀번호 재설정 처리 중 오류: ' + String(e?.message || e).slice(0, 160) }, 200)
  }
}

async function handle(request: Request, env: Env): Promise<Response> {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 200)
  await ensureSchema(db).catch(() => {})
  // 배포본 스키마가 아직 갱신되지 않았을 수 있으므로 사용 직전 테이블 보장(방어적)
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS password_resets (email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at TEXT NOT NULL, attempts INTEGER DEFAULT 0, last_sent_at TEXT, created_at TEXT NOT NULL)`,
  ).run().catch(() => {})

  const body: any = await request.json().catch(() => ({}))
  const action = String(body.action || 'request')
  const email = String(body.email || '').trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return json({ ok: false, error: '올바른 이메일을 입력하세요.' }, 200)

  const ip = clientIp(request)
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  if (action === 'request') {
    const user: any = await db.prepare('SELECT id, name, provider, password_set FROM users WHERE email = ?').bind(email).first()
    // 계정 존재 여부를 노출하지 않기 위해 없는 계정은 성공처럼 응답 (이메일 열거 방지)
    if (!user) return json({ ok: true })

    // 구글(소셜) 로그인 계정은 인증번호 발송 차단 — "구글로만" 로그인. 본인이 직접
    //   비밀번호를 설정한 경우(password_set=1)에만 재설정 허용.
    const isSocial = user.provider && user.provider !== 'email'
    const hasOwnPassword = Number(user.password_set) === 1
    if (isSocial && !hasOwnPassword) {
      return json({ ok: false, error: '구글 계정으로 가입한 이메일입니다. "구글로 로그인"을 이용해 주세요.', social: String(user.provider) }, 200)
    }

    // 재발송 쿨다운 (3분) — 남용 방지
    const existing: any = await db.prepare('SELECT last_sent_at FROM password_resets WHERE email = ?').bind(email).first().catch(() => null)
    if (existing?.last_sent_at && now - +new Date(existing.last_sent_at) < 3 * 60_000) {
      const wait = Math.ceil((3 * 60_000 - (now - +new Date(existing.last_sent_at))) / 1000)
      return json({ ok: false, error: `인증번호는 3분에 한 번만 보낼 수 있어요. ${wait}초 후 다시 시도해 주세요.`, cooldown: true, wait }, 200)
    }

    // 6자리 코드 생성 (crypto 기반)
    const rnd = crypto.getRandomValues(new Uint32Array(1))[0]
    const code = String(100000 + (rnd % 900000))
    const codeHash = await hashPassword(code)
    const expires = new Date(now + 3 * 60_000).toISOString() // 3분 유효
    await db
      .prepare(`INSERT INTO password_resets (email, code_hash, expires_at, attempts, last_sent_at, created_at)
                VALUES (?, ?, ?, 0, ?, ?)
                ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, last_sent_at = excluded.last_sent_at`)
      .bind(email, codeHash, expires, nowIso, nowIso)
      .run()

    const html = emailShell(`
        <h1 style="font-size:19px;margin:16px 0 8px">비밀번호 재설정 인증코드</h1>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 18px">
          안녕하세요${user.name ? ` ${user.name}님` : ''}. 아래 6자리 인증코드를 입력해 비밀번호를 재설정하세요.
          이 코드는 <b>3분간</b> 유효합니다.
        </p>
        <div style="font-size:34px;font-weight:800;letter-spacing:0.35em;background:#eff6ff;color:#1d4ed8;text-align:center;padding:18px 0;border-radius:14px;border:1px solid #dbeafe">
          ${code}
        </div>
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:18px 0 0">
          본인이 요청하지 않았다면 이 메일을 무시하세요. 계정은 안전하며 비밀번호는 변경되지 않습니다.
        </p>`)

    const sent = await resendEmail(env, {
      to: email,
      subject: '[BYGENCY] 비밀번호 재설정 인증코드',
      html,
      from: 'BYGENCY <cs@bygency.co>',
    }, { db, kind: 'reset', userId: user.id })
    if (!sent.ok) {
      await logSecurity(db, { ip, method: 'POST', path: '/api/account/forgot-password', status: 502, severity: 'warn', detail: `비밀번호 재설정 메일 발송 실패: ${sent.error || ''}`.slice(0, 160) }).catch(() => {})
      // 실제 사유를 그대로 노출(도메인 미인증/키 미설정 등 진단 가능하도록)
      return json({ ok: false, error: '인증 메일 발송 실패: ' + (sent.error || '알 수 없는 오류') }, 200)
    }
    return json({ ok: true })
  }

  if (action === 'verify') {
    const code = String(body.code || '').trim()
    const next = String(body.next || '')
    if (!code) return json({ ok: false, error: '인증코드를 입력하세요.' }, 200)
    if (next.length < 8) return json({ ok: false, error: '새 비밀번호는 8자 이상이어야 합니다.' }, 200)

    const row: any = await db.prepare('SELECT code_hash, expires_at, attempts FROM password_resets WHERE email = ?').bind(email).first()
    if (!row) return json({ ok: false, error: '인증코드를 먼저 요청하세요.' }, 200)
    if (+new Date(row.expires_at) < now) {
      await db.prepare('DELETE FROM password_resets WHERE email = ?').bind(email).run().catch(() => {})
      return json({ ok: false, error: '인증코드가 만료되었습니다. 다시 요청하세요.' }, 200)
    }
    if (Number(row.attempts) >= 5) {
      await db.prepare('DELETE FROM password_resets WHERE email = ?').bind(email).run().catch(() => {})
      return json({ ok: false, error: '시도 횟수를 초과했습니다. 코드를 다시 요청하세요.' }, 200)
    }
    const okCode = await verifyPassword(code, row.code_hash)
    if (!okCode) {
      await db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE email = ?').bind(email).run().catch(() => {})
      return json({ ok: false, error: '인증코드가 올바르지 않습니다.' }, 200)
    }

    const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (!user) return json({ ok: false, error: '계정을 찾을 수 없습니다.' }, 200)
    const ph = await hashPassword(next)
    // 재설정으로 비밀번호를 직접 설정하면 password_set=1 → 이후 비밀번호 로그인 허용
    await db.prepare('UPDATE users SET password_hash = ?, password_set = 1 WHERE id = ?').bind(ph, user.id).run()
    await db.prepare('DELETE FROM password_resets WHERE email = ?').bind(email).run().catch(() => {})
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run().catch(() => {}) // 보안상 전체 세션 무효화
    const geo = geoFrom(request)
    await logSecurity(db, { ip, method: 'POST', path: '/api/account/forgot-password', status: 200, severity: 'warn', detail: `비밀번호 재설정 완료: ${email}`, country: geo.country, city: geo.city }).catch(() => {})
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 200)
}
