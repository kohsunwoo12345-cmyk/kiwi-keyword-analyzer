// GET/POST /api/account/lead-alert — 신청자 알림 수신 설정 (회원 본인)
//   앱 알림·이메일은 무료라 기본 켬. 문자는 포인트가 나가므로 기본 끔.
import { Env, json, ensureSchema, getSessionUser, resolveDB, sameOriginOk } from '../_utils'
import { getLeadAlertPrefs, setLeadAlertPrefs } from '../_leadalert'
import { getMsgRates } from '../_msgcost'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const prefs = await getLeadAlertPrefs(db, String(me.id))
  const rates = await getMsgRates(db, me.id)
  return json({
    ok: true,
    prefs,
    // 문자 알림을 켤 때 건당 얼마가 나가는지 미리 보여준다
    smsCost: rates.charge.sms,
    defaults: { email: String(me.email || ''), phone: String(me.phone || '') },
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  const b: any = (await request.json().catch(() => null)) ?? {}
  const prefs = await setLeadAlertPrefs(db, String(me.id), b)
  return json({ ok: true, prefs })
}
