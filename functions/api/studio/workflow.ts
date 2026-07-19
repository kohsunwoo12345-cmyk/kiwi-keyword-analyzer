import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'

// 스튜디오 워크플로우 서버 자동저장 — 계정별 1행(payload JSON). 브라우저 IndexedDB 와 별개로
// 계정에 보존되어 캐시 삭제·다른 기기에서도 복원 가능. (미디어 base64 는 클라이언트에서 제거해 전송)
async function ensureTable(db: D1Database): Promise<void> {
  await db
    .prepare(`CREATE TABLE IF NOT EXISTS studio_workflows (user_id TEXT PRIMARY KEY, payload TEXT NOT NULL DEFAULT '', updated_at TEXT)`)
    .run()
    .catch(() => {})
}

// GET /api/studio/workflow → 계정에 저장된 워크플로우 페이로드
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureTable(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const row: any = await db.prepare('SELECT payload, updated_at FROM studio_workflows WHERE user_id = ?').bind(me.id).first().catch(() => null)
  let data: any = null
  try { data = row && row.payload ? JSON.parse(row.payload) : null } catch { data = null }
  return json({ ok: true, data, updatedAt: (row && row.updated_at) || null })
}

// POST /api/studio/workflow { data } → 계정에 저장(덮어쓰기)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureTable(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const b: any = await request.json().catch(() => ({}))
  const payload = b && b.data != null ? JSON.stringify(b.data) : ''
  if (payload.length > 4_000_000) return json({ ok: false, error: '워크플로우 용량이 너무 큽니다.' }, 413)
  const now = new Date().toISOString()
  await db
    .prepare('INSERT INTO studio_workflows (user_id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at')
    .bind(me.id, payload, now)
    .run()
  return json({ ok: true, updatedAt: now })
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })
