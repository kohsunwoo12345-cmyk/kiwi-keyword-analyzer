// 회원 API 키 관리 — GET(목록, 마스킹) / POST(생성, 평문 1회 노출)
import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { ensureApiKeysSchema, generateApiKeyPlain, hashApiKey, maskApiKey, API_KEY_MAX, hasVideoApiAccess } from '../_apikeys'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureApiKeysSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const rows = await db.prepare(
    `SELECT id, name, key_masked, status, call_count, last_used_at, created_at FROM api_keys
     WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC`,
  ).bind(me.id).all()
  return json({ ok: true, keys: (rows.results as any[]) || [], max: API_KEY_MAX, canUse: hasVideoApiAccess(me) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureApiKeysSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!hasVideoApiAccess(me)) return json({ ok: false, error: 'API는 노드형 AI 영상 플랜에서만 사용할 수 있습니다.' }, 403)

  const cnt: any = await db.prepare(`SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ? AND status = 'active'`).bind(me.id).first()
  if (Number(cnt?.n || 0) >= API_KEY_MAX) return json({ ok: false, error: `API 키는 최대 ${API_KEY_MAX}개까지 만들 수 있습니다.` }, 400)

  const body: any = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 60) || '새 API 키'
  const plain = generateApiKeyPlain()
  const hash = await hashApiKey(plain)
  const id = 'ak_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)
  await db.prepare(
    `INSERT INTO api_keys (id, user_id, name, key_hash, key_masked, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
  ).bind(id, me.id, name, hash, maskApiKey(plain), new Date().toISOString()).run()
  // 평문 키는 이 응답에서 1회만 노출 (이후 재조회 불가)
  return json({ ok: true, id, name, key: plain, masked: maskApiKey(plain) })
}
