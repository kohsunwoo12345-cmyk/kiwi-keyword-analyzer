// GET/POST /api/admin/msg-rates — 문자·알림톡 발송 요금표
//   GET  : 회원도 볼 수 있다(자기 발송 비용을 알아야 하므로). 관리자에게만 원가(알리고 기준가)를 보여준다.
//   POST : 관리자만. 알리고 기준 단가와 배수를 고친다.
import { Env, json, ensureSchema, resolveDB, getSessionUser, requireAdminUser } from '../_utils'
import { getMsgRates, setMsgRates, DEFAULT_BASE_KRW, DEFAULT_MULTIPLIER, KIND_LABEL } from '../_msgcost'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const isAdmin = me.role === 'admin' || me.role === 'superadmin'
  const r = await getMsgRates(db)
  // 회원에게는 "얼마 나가는지"(청구 포인트)만. 원가와 배수는 우리 마진이라 관리자에게만.
  return json({
    ok: true,
    charge: r.charge,
    labels: KIND_LABEL,
    ...(isAdmin ? { base: r.base, multiplier: r.multiplier, defaults: { base: DEFAULT_BASE_KRW, multiplier: DEFAULT_MULTIPLIER } } : {}),
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const b: any = await (request.json().catch(() => null)) ?? {}
  const r = await setMsgRates(db, { base: b.base, multiplier: b.multiplier })
  return json({ ok: true, base: r.base, multiplier: r.multiplier, charge: r.charge, labels: KIND_LABEL })
}
