import { Env, json, ensureSchema, resolveDB, requireAdminUser, logAudit, clientIp, sameOriginOk } from '../_utils'

// 관리자: 모든 사용자의 노드 스튜디오(워크플로우) 조회 · 불러오기 · 대신 저장
//  GET  /api/admin/studio-nodes                 → 워크플로우 보유 사용자 목록 + 노드수 + 크레딧 사용
//  GET  /api/admin/studio-nodes?userId=X         → 해당 사용자 노드 요약 + 활동기록 + 크레딧 사용 내역
//  GET  /api/admin/studio-nodes?userId=X&raw=1   → 해당 사용자 워크플로우 원본(스튜디오 불러오기용)
//  POST /api/admin/studio-nodes { userId, data } → 관리자가 그 사용자 워크플로우로 저장(대신 저장)

async function ensureWf(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS studio_workflows (user_id TEXT PRIMARY KEY, payload TEXT NOT NULL DEFAULT '', updated_at TEXT)`).run().catch(() => {})
}

// 노드 1개를 가볍게 요약(미디어 base64 제외)
function summarizeNode(n: any) {
  const w = n && n.w ? n.w : {}
  const pick = (k: string) => { const v = w[k]; return typeof v === 'string' ? v.slice(0, 160) : (typeof v === 'number' ? v : undefined) }
  return {
    id: n && n.id, type: n && n.type, title: n && (n.title || n.type),
    prompt: pick('prompt') || pick('text') || undefined,
    negative: pick('negative') || undefined,
    model: pick('model') || undefined,
    sec: typeof w.sec === 'number' ? w.sec : undefined,
    ratio: pick('ratio') || undefined,
    res: pick('res') || undefined,
    imgs: Array.isArray(w.imgs) ? w.imgs.length : undefined,
    vids: Array.isArray(w.vids) ? w.vids.length : undefined,
    bypass: !!(n && n.bypass),
  }
}
function parsePayload(payload: string): { docs: any[]; nodeCount: number } {
  let p: any = null
  try { p = payload ? JSON.parse(payload) : null } catch { p = null }
  const docs = (p && Array.isArray(p.docs)) ? p.docs : (p && p.nodes ? [{ id: 'd', name: '워크플로우', data: p }] : [])
  let nodeCount = 0
  for (const d of docs) { const ns = d && d.data && Array.isArray(d.data.nodes) ? d.data.nodes : []; nodeCount += ns.length }
  return { docs, nodeCount }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureWf(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const raw = url.searchParams.get('raw') === '1'

  if (userId) {
    const wf: any = await db.prepare('SELECT payload, updated_at FROM studio_workflows WHERE user_id = ?').bind(userId).first().catch(() => null)
    if (raw) {
      // 스튜디오에서 그대로 불러올 원본 payload
      let data: any = null; try { data = wf && wf.payload ? JSON.parse(wf.payload) : null } catch { data = null }
      return json({ ok: true, data })
    }
    const user: any = await db.prepare('SELECT id, name, email, plan, credits FROM users WHERE id = ?').bind(userId).first().catch(() => null)
    const parsed = wf ? parsePayload(wf.payload) : { docs: [], nodeCount: 0 }
    const docs = parsed.docs.map((d: any) => ({
      id: d.id, name: d.name,
      nodes: (d.data && Array.isArray(d.data.nodes) ? d.data.nodes : []).map(summarizeNode),
      links: (d.data && Array.isArray(d.data.links) ? d.data.links.length : 0),
    }))
    // 상세 활동기록
    const activity = (await db.prepare(
      'SELECT action, node_type, detail, credits, model, created_at FROM studio_activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 300',
    ).bind(userId).all().catch(() => ({ results: [] }))).results || []
    // 크레딧 사용(ai_usage)
    const usage = (await db.prepare(
      'SELECT model, kind, credits, prompt, result_kind, created_at FROM ai_usage WHERE user_id = ? ORDER BY created_at DESC LIMIT 200',
    ).bind(userId).all().catch(() => ({ results: [] }))).results || []
    const creditSum = (usage as any[]).reduce((a, r) => a + (Number(r.credits) || 0), 0)
    return json({
      ok: true,
      user: user ? { id: user.id, name: user.name, email: user.email, plan: user.plan, credits: Number(user.credits) || 0 } : { id: userId },
      updatedAt: wf ? wf.updated_at : null,
      nodeCount: parsed.nodeCount, docCount: docs.length, docs,
      activity, usage, creditSum: Math.round(creditSum * 100) / 100, genCount: (usage as any[]).length,
    })
  }

  // 목록: 워크플로우 보유 사용자
  const wfs = (await db.prepare('SELECT user_id, payload, updated_at FROM studio_workflows ORDER BY updated_at DESC LIMIT 1000').all().catch(() => ({ results: [] }))).results || []
  // 사용자 정보 매핑
  const ids = (wfs as any[]).map((w) => w.user_id).filter(Boolean)
  const userMap: Record<string, any> = {}
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50); if (!chunk.length) continue
    const q = chunk.map(() => '?').join(',')
    const us = (await db.prepare(`SELECT id, name, email, plan FROM users WHERE id IN (${q})`).bind(...chunk).all().catch(() => ({ results: [] }))).results || []
    for (const u of us as any[]) userMap[u.id] = u
  }
  // 사용자별 크레딧 합계
  const credAgg = (await db.prepare('SELECT user_id, ROUND(SUM(credits),2) AS c, COUNT(*) AS n FROM ai_usage GROUP BY user_id').all().catch(() => ({ results: [] }))).results || []
  const credMap: Record<string, { c: number; n: number }> = {}
  for (const r of credAgg as any[]) credMap[r.user_id] = { c: Number(r.c) || 0, n: Number(r.n) || 0 }

  const rows = (wfs as any[]).map((w) => {
    const parsed = parsePayload(w.payload)
    const u = userMap[w.user_id] || {}
    const cr = credMap[w.user_id] || { c: 0, n: 0 }
    return {
      userId: w.user_id, name: u.name || '(알 수 없음)', email: u.email || '', plan: u.plan || '',
      nodeCount: parsed.nodeCount, docCount: parsed.docs.length, updatedAt: w.updated_at,
      creditsUsed: cr.c, genCount: cr.n,
    }
  })
  return json({ ok: true, users: rows, total: rows.length })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureWf(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const b: any = await request.json().catch(() => ({}))
  const userId = String(b.userId || '')
  if (!userId) return json({ ok: false, error: 'userId 필요' }, 400)
  const payload = b && b.data != null ? JSON.stringify(b.data) : ''
  if (payload.length > 4_000_000) return json({ ok: false, error: '워크플로우 용량이 너무 큽니다.' }, 413)
  const now = new Date().toISOString()
  await db.prepare(
    'INSERT INTO studio_workflows (user_id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at',
  ).bind(userId, payload, now).run()
  await db.prepare('INSERT INTO studio_activity (id, user_id, action, node_type, detail, credits, model, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
    .bind('sa_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), userId, 'admin_save', '', '관리자가 대신 저장', '', now).run().catch(() => {})
  await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'studio_admin_save', 'user:' + userId, '워크플로우 대신 저장', 'info', clientIp(request))
  return json({ ok: true, updatedAt: now })
}
