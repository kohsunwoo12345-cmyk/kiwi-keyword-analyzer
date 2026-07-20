import { Env, json, ensureSchema, getSessionUser, resolveDB, sameOriginOk } from '../_utils'

// 노드 스튜디오 상세 활동 로깅 — 클라이언트가 배치로 전송(노드 추가/삭제/저장/실행 등).
// 생성 크레딧은 /api/usage/record(ai_usage)에도 남지만, 여기선 "어떤 노드에서" 무엇을 했는지 맥락까지 기록.
//  POST /api/studio/activity { events:[{action,nodeType?,detail?,credits?,model?}] }

const uid = (p: string) => p + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
const s = (v: any, n = 200) => (v == null ? '' : String(v)).slice(0, n)

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false }, 200)   // 로깅 실패는 조용히 통과(사용 흐름 방해 금지)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: true, skipped: 'guest' })
  if (!sameOriginOk(request)) return json({ ok: false }, 403)

  const b: any = await request.json().catch(() => ({}))
  const events: any[] = Array.isArray(b.events) ? b.events.slice(0, 100) : []
  if (!events.length) return json({ ok: true, saved: 0 })

  const now = new Date().toISOString()
  const stmt = db.prepare(
    'INSERT INTO studio_activity (id, user_id, action, node_type, detail, credits, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
  const rows = events.map((e) =>
    stmt.bind(uid('sa_'), me.id, s(e.action, 32), s(e.nodeType, 48), s(e.detail, 300), Number(e.credits) || 0, s(e.model, 80), s(e.ts, 40) || now),
  )
  try { await db.batch(rows) } catch { /* 조용히 무시 */ }
  return json({ ok: true, saved: rows.length })
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })
