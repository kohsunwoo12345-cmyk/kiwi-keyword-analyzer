import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity } from '../_utils'

// URL 안전한 ASCII slug (한글 등 비ASCII는 경로 인코딩 문제 → 랜덤 ASCII로 대체)
function slugify(s: string): string {
  const ascii = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
  return ascii || 'lp-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8)
}

// POST /api/landing/save { id?, slug?, title, headline, subtext, cta, theme, fields[], published }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const title = String(b.title || '무제 랜딩페이지').slice(0, 80)
  const headline = String(b.headline || '').slice(0, 120)
  const subtext = String(b.subtext || '').slice(0, 400)
  const cta = String(b.cta || '신청하기').slice(0, 30)
  const theme = String(b.theme || 'violet')
  const fields = JSON.stringify(Array.isArray(b.fields) ? b.fields.slice(0, 8) : ['name', 'phone'])
  const published = b.published ? 1 : 0
  const now = new Date().toISOString()

  if (b.id) {
    // 수정 (본인 소유 확인)
    const row: any = await db.prepare('SELECT * FROM landing_pages WHERE id = ? AND user_id = ?').bind(String(b.id), me.id).first()
    if (!row) return json({ ok: false, error: '페이지를 찾을 수 없습니다.' }, 404)
    await db
      .prepare('UPDATE landing_pages SET title=?, headline=?, subtext=?, cta=?, theme=?, fields=?, published=?, updated_at=? WHERE id=?')
      .bind(title, headline, subtext, cta, theme, fields, published, now, row.id)
      .run()
    return json({ ok: true, id: row.id, slug: row.slug, published: !!published })
  }

  // 신규 — 고유 slug 생성
  let base = slugify(b.slug || title) || 'landing'
  let slug = base
  for (let i = 0; i < 6; i++) {
    const dup = await db.prepare('SELECT id FROM landing_pages WHERE slug = ?').bind(slug).first()
    if (!dup) break
    slug = `${base}-${crypto.randomUUID().slice(0, 4)}`
  }
  const id = 'lp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  await db
    .prepare(`INSERT INTO landing_pages (id, user_id, slug, title, headline, subtext, cta, theme, fields, published, views, leads, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`)
    .bind(id, me.id, slug, title, headline, subtext, cta, theme, fields, published, now, now)
    .run()
  await logActivity(db, me.id, 'landing', `랜딩페이지 생성: ${title}`)
  return json({ ok: true, id, slug, published: !!published })
}
