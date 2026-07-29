// POST /api/crm/campaigns/:id/send — 집행 즉시 발송 / 예약 취소
//   { action: 'send' }    지금 바로 발송
//   { action: 'cancel' }  예약 취소 (발송 전에만)
import { Env, json, ensureSchema, getSessionUser, resolveDB, asText, rateLimitOk } from '../../../_utils'
import { ensureCrmSchema, ownsCampaign } from '../../_schema'
import { dispatchCampaign } from '../../_dispatch'

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const id = String((params as any).id || '')
  if (!(await ownsCampaign(db, me, id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)

  const b: any = await (request.json().catch(() => null)) ?? {}
  const action = asText(b.action, 20) || 'send'

  if (action === 'cancel') {
    const r = await db.prepare(
      "UPDATE crm_executions SET status = 'canceled', scheduled_at = NULL, updated_at = ? WHERE id = ? AND status IN ('draft','scheduled','failed')",
    ).bind(new Date().toISOString(), id).run()
    if (!r.meta || r.meta.changes === 0) return json({ ok: false, error: '이미 발송되어 취소할 수 없습니다.' }, 409)
    return json({ ok: true, status: 'canceled' })
  }

  // 발송은 유료 동작이라 연타를 막는다(발송 자체는 dispatch 가 조건부 선점으로 한 번만 나가게 한다)
  if (!(await rateLimitOk(db, `crmsend:${me.id}`, 30, 10)))
    return json({ ok: false, error: '발송 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, 429)

  const r = await dispatchCampaign(db, env as any, id)
  return json({ ...r }, r.ok ? 200 : 200)
}
