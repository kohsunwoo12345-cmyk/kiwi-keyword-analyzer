import { Env, json, ensureSchema, getSessionUser, resolveDB, verifyPassword, clearCookie, ADMIN_EMAIL, logActivity, purgeUserData } from '../_utils'

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

  const body: any = await (request.json().catch(() => null)) ?? {}
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

  // 본인 관련 데이터 정리 + 계정 삭제.
  //  지울 목록은 purgeUserData 한 곳에서만 관리한다 — 예전에는 본인 탈퇴와 관리자 삭제가
  //  각자 목록을 들고 있어 한쪽에만 추가되는 일이 반복됐고, 그래서 연락처·신청자·발송 이력이
  //  탈퇴 후에도 남아 있었다.
  await purgeUserData(db, uid, env)
  const del = async (sql: string, ...b: any[]) => { try { await db.prepare(sql).bind(...b).run() } catch { /* ignore */ } }
  await del('DELETE FROM users WHERE id = ?', uid)

  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() })
}
