// 예약 발송 실행기 — 외부 스케줄러가 주기적으로 호출한다(이 저장소의 다른 배치와 같은 규약).
//   curl -X POST -H "X-Cron-Token: $CRON_TOKEN" https://<도메인>/api/cron/crm-dispatch
// 예약 시각이 지난 CRM 집행을 실제로 발송한다. 발송·과금·환불은 수동 발송과 완전히 같은 함수를 쓴다.
import { Env, json, ensureSchema, resolveDB } from '../_utils'
import { ensureCrmSchema } from '../crm/_schema'
import { dispatchCampaign } from '../crm/_dispatch'

const MAX_PER_TICK = 20 // 한 번에 처리할 집행 수 — 실행시간·동시 과금 폭주 방지

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  const expected = String((env as any).CRON_TOKEN || '')
  const got = request.headers.get('X-Cron-Token') || ''
  if (!expected || got !== expected) return json({ ok: false, error: '인증 실패' }, 401)

  await ensureSchema(db)
  await ensureCrmSchema(db)
  const now = new Date().toISOString()

  const due = ((await db.prepare(
    `SELECT id, name, user_id FROM crm_executions
      WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?
      ORDER BY scheduled_at ASC LIMIT ?`,
  ).bind(now, MAX_PER_TICK).all().catch(() => ({ results: [] }))).results as any[]) || []

  const results: any[] = []
  for (const c of due) {
    // dispatchCampaign 이 'sending' 으로 조건부 선점하므로, 크론이 겹쳐 돌아도 두 번 나가지 않는다.
    const r = await dispatchCampaign(db, env as any, c.id).catch((e: any) => ({ ok: false, error: String(e?.message || e) }))
    results.push({ id: c.id, name: c.name, ...r })
  }

  return json({ ok: true, processed: results.length, results })
}

// GET 은 상태 확인용 — 대기 중인 예약이 몇 건인지만 알려 준다(토큰 필요).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  const expected = String((env as any).CRON_TOKEN || '')
  const got = request.headers.get('X-Cron-Token') || ''
  if (!expected || got !== expected) return json({ ok: false, error: '인증 실패' }, 401)
  await ensureCrmSchema(db)
  const now = new Date().toISOString()
  const r: any = await db.prepare(
    "SELECT COUNT(*) AS due, (SELECT COUNT(*) FROM crm_executions WHERE status='scheduled') AS scheduled FROM crm_executions WHERE status='scheduled' AND scheduled_at <= ?",
  ).bind(now).first().catch(() => null)
  return json({ ok: true, due: Number(r?.due || 0), scheduled: Number(r?.scheduled || 0), now })
}
