import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'

// 캐릭터 라이브러리 — "일관된 인물" 레퍼런스 묶음의 계정별 서버 보존.
//  레퍼런스 사진(R2 공개 URL) 몇 장을 이름으로 저장해두고, 스튜디오 노드·Claude MCP 에서
//  이름만으로 불러와 모든 생성(씨드림 다중 레퍼런스·씨댄스 2.0·나노바나나 등)에 재사용한다.
//  이미지 원본은 기존 업로드 경로(R2)를 그대로 쓰며 여기엔 URL 만 저장한다.

const MAX_CHARS = 30      // 회원당 캐릭터 수
const MAX_IMAGES = 8      // 캐릭터당 레퍼런스 장수

export async function ensureCharacters(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS studio_characters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      images TEXT NOT NULL DEFAULT '[]',
      note TEXT NOT NULL DEFAULT '',
      ts TEXT,
      updated_at TEXT
    )`,
  ).run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_characters_user ON studio_characters (user_id, ts DESC)').run().catch(() => {})
}

/** (서버 내부용 — MCP 도 사용) 회원의 캐릭터를 이름으로 조회. 없으면 null. */
export async function findCharacter(db: D1Database, userId: string, name: string): Promise<{ id: string; name: string; images: string[] } | null> {
  try {
    await ensureCharacters(db)
    const row: any = await db.prepare(
      'SELECT id, name, images FROM studio_characters WHERE user_id = ? AND name = ? COLLATE NOCASE LIMIT 1',
    ).bind(userId, String(name || '').trim()).first()
    if (!row) return null
    let images: string[] = []
    try { images = JSON.parse(row.images) } catch {}
    return { id: row.id, name: row.name, images: images.filter((u) => /^https?:\/\//.test(u)).slice(0, MAX_IMAGES) }
  } catch { return null }
}

export async function listCharacters(db: D1Database, userId: string) {
  await ensureCharacters(db)
  const rows: any = await db.prepare(
    'SELECT id, name, images, note, ts FROM studio_characters WHERE user_id = ? ORDER BY ts DESC LIMIT ?',
  ).bind(userId, MAX_CHARS).all()
  return (rows.results || []).map((r: any) => {
    let images: string[] = []
    try { images = JSON.parse(r.images) } catch {}
    return { id: r.id, name: r.name, images, note: r.note || '', ts: r.ts || '' }
  })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  return json({ ok: true, characters: await listCharacters(db, me.id) })
}

// POST { id?, name, images[], note? } — id 있으면 수정, 없으면 생성(같은 이름은 덮어씀)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureCharacters(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)

  let b: any = {}
  try { b = (await request.json()) ?? {} } catch { return json({ ok: false, error: '잘못된 요청' }, 400) }
  const name = String(b.name || '').trim().slice(0, 40)
  if (!name) return json({ ok: false, error: '캐릭터 이름을 입력하세요.' }, 400)
  const images = (Array.isArray(b.images) ? b.images : [])
    .map((u: any) => String(u || '').trim())
    .filter((u: string) => /^https?:\/\//.test(u) && u.length < 800)
    .slice(0, MAX_IMAGES)
  if (!images.length) return json({ ok: false, error: '레퍼런스 사진을 1장 이상 올려주세요. (업로드된 원격 URL 만 저장됩니다)' }, 400)
  const note = String(b.note || '').slice(0, 200)
  const now = new Date().toISOString()

  // 같은 이름이 있으면 갱신(덮어쓰기), 아니면 개수 제한 확인 후 생성
  const existing: any = b.id
    ? await db.prepare('SELECT id FROM studio_characters WHERE id = ? AND user_id = ?').bind(String(b.id), me.id).first()
    : await db.prepare('SELECT id FROM studio_characters WHERE user_id = ? AND name = ? COLLATE NOCASE').bind(me.id, name).first()
  if (existing) {
    await db.prepare('UPDATE studio_characters SET name = ?, images = ?, note = ?, ts = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .bind(name, JSON.stringify(images), note, now, now, existing.id, me.id).run()
    return json({ ok: true, id: existing.id, updated: true, characters: await listCharacters(db, me.id) })
  }
  const cnt: any = await db.prepare('SELECT COUNT(*) AS c FROM studio_characters WHERE user_id = ?').bind(me.id).first()
  if (cnt && Number(cnt.c) >= MAX_CHARS) return json({ ok: false, error: `캐릭터는 최대 ${MAX_CHARS}개까지 저장할 수 있습니다. 안 쓰는 캐릭터를 삭제해 주세요.` }, 400)
  const id = 'ch_' + crypto.randomUUID().slice(0, 12)
  await db.prepare('INSERT INTO studio_characters (id, user_id, name, images, note, ts, updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, me.id, name, JSON.stringify(images), note, now, now).run()
  return json({ ok: true, id, created: true, characters: await listCharacters(db, me.id) })
}

// DELETE ?id=ch_xxx
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureCharacters(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  await db.prepare('DELETE FROM studio_characters WHERE id = ? AND user_id = ?').bind(id, me.id).run()
  return json({ ok: true, characters: await listCharacters(db, me.id) })
}
