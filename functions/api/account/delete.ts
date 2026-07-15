import { Env, json, ensureSchema, getSessionUser, resolveDB, verifyPassword, clearCookie, ADMIN_EMAIL, logActivity } from '../_utils'

// POST /api/account/delete { password?, confirmEmail? } → 본인 계정 영구 삭제
// - 일반(이메일) 계정: 비밀번호 확인 필수
// - 간편로그인(구글/카카오)에서 비밀번호를 설정한 적 없는 계정: 이메일 주소 입력으로 확인
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  // 관리자 계정은 삭제 불가(안전장치)
  if (me.email === ADMIN_EMAIL || me.role === 'admin') {
    return json({ ok: false, error: '관리자 계정은 삭제할 수 없습니다.' }, 403)
  }

  const body: any = await request.json().catch(() => ({}))
  const password = String(body.password || '')
  const confirmEmail = String(body.confirmEmail || '').trim().toLowerCase()

  const isSocial = me.provider && me.provider !== 'email'
  const hasPassword = Number(me.password_set) === 1

  if (isSocial && !hasPassword) {
    // 비밀번호가 없는 간편로그인 계정 → 이메일 주소로 확인
    if (!confirmEmail || confirmEmail !== String(me.email || '').toLowerCase()) {
      return json({ ok: false, error: '확인을 위해 계정 이메일 주소를 정확히 입력해 주세요.', needEmail: true }, 400)
    }
  } else {
    // 비밀번호 확인 필수
    if (!password) return json({ ok: false, error: '계정 삭제를 위해 비밀번호를 입력해 주세요.', needPassword: true }, 400)
    const valid = await verifyPassword(password, me.password_hash)
    if (!valid) return json({ ok: false, error: '비밀번호가 올바르지 않습니다.' }, 400)
  }

  const uid = me.id
  await logActivity(db, uid, 'delete', '회원 탈퇴(계정 삭제)').catch(() => {})

  // 본인 관련 데이터 정리 + 계정 삭제 (존재하지 않는 테이블/컬럼은 무시)
  const del = async (sql: string, ...b: any[]) => { try { await db.prepare(sql).bind(...b).run() } catch { /* ignore */ } }
  await del('DELETE FROM sessions WHERE user_id = ?', uid)
  await del('DELETE FROM transactions WHERE user_id = ?', uid)
  await del('DELETE FROM notifications WHERE user_id = ?', uid)
  await del('DELETE FROM activity_log WHERE user_id = ?', uid)
  await del('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', uid, uid)
  await del('DELETE FROM plan_requests WHERE user_id = ?', uid)
  await del('DELETE FROM point_requests WHERE user_id = ?', uid)
  await del('DELETE FROM credit_requests WHERE user_id = ?', uid)
  await del('DELETE FROM credit_orders WHERE user_id = ?', uid)
  await del('DELETE FROM sender_numbers WHERE user_id = ?', uid)
  // 추천 관계 정리: 이 사용자를 추천인으로 둔 회원은 추천인 해제
  await del("UPDATE users SET referred_by = '' WHERE referred_by = ?", uid)
  await del('DELETE FROM referral_rewards WHERE referrer_id = ? OR friend_id = ?', uid, uid)
  await del('DELETE FROM users WHERE id = ?', uid)

  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() })
}
