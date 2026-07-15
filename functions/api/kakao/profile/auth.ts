import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../../_utils'
import { aligoProfileAuth } from '../../_aligo'

// POST /api/kakao/profile/auth { plusid, phone } → 카카오 채널 인증번호 요청(관리자 카톡으로 발송)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const r = await aligoProfileAuth(env, { plusid: String(b.plusid || ''), phonenumber: String(b.phone || b.phonenumber || '') })
  return json({ ok: r.ok, error: r.error, note: r.ok ? '카카오톡으로 인증번호가 발송되었습니다. 인증번호를 입력해 채널 등록을 완료하세요.' : undefined })
}
