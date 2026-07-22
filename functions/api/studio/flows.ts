import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'

// 스튜디오 "이름 붙여 저장한 워크플로우" 목록의 계정별 서버 보존.
// 브라우저 IndexedDB(기기 로컬)와 별개로 계정에 저장 → 다른 PC/브라우저에서도 목록이 보인다.
// 대용량 base64 미디어는 클라이언트에서 제거하고 전송(원격 URL 은 유지).
async function ensureTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS studio_saved_flows (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL DEFAULT '',
        nodes INTEGER NOT NULL DEFAULT 0,
        ts TEXT,
        updated_at TEXT
      )`,
    )
    .run()
    .catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_saved_flows_user ON studio_saved_flows (user_id, ts DESC)`).run().catch(() => {})
}

// GET /api/studio/flows → 계정에 저장된 이름별 워크플로우 목록
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureTable(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const rows: any = await db
    .prepare('SELECT id, name, data, nodes, ts FROM studio_saved_flows WHERE user_id = ? ORDER BY ts DESC')
    .bind(me.id)
    .all()
    .catch(() => ({ results: [] }))
  const flows = (rows.results || []).map((r: any) => {
    let data: any = null
    try { data = r.data ? JSON.parse(r.data) : null } catch { data = null }
    return { id: r.id, name: r.name, data, nodes: r.nodes || 0, ts: r.ts || '' }
  })
  return json({ ok: true, flows })
}

// POST /api/studio/flows { id, name, data, nodes, ts } → 하나 저장(업서트)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureTable(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const b: any = await request.json().catch(() => ({}))
  const id = String(b.id || '').trim()
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  const payload = b && b.data != null ? JSON.stringify(b.data) : ''
  if (payload.length > 4_000_000) return json({ ok: false, error: '워크플로우 용량이 너무 큽니다.' }, 413)
  const now = new Date().toISOString()
  const name = String(b.name || '제목 없음').slice(0, 200)
  const nodes = Number(b.nodes) || 0
  const ts = String(b.ts || '').slice(0, 40)
  // 소유권 보장: 다른 사용자의 id 를 덮어쓰지 못하도록 user_id 조건부 업서트
  const existing: any = await db.prepare('SELECT user_id FROM studio_saved_flows WHERE id = ?').bind(id).first().catch(() => null)
  if (existing && existing.user_id !== me.id) return json({ ok: false, error: '권한 없음' }, 403)
  await db
    .prepare(
      `INSERT INTO studio_saved_flows (id, user_id, name, data, nodes, ts, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data, nodes = excluded.nodes, ts = excluded.ts, updated_at = excluded.updated_at`,
    )
    .bind(id, me.id, name, payload, nodes, ts, now)
    .run()
  return json({ ok: true, updatedAt: now })
}

// DELETE /api/studio/flows?id=... → 하나 삭제
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureTable(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  await db.prepare('DELETE FROM studio_saved_flows WHERE id = ? AND user_id = ?').bind(id, me.id).run().catch(() => {})
  return json({ ok: true })
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })
