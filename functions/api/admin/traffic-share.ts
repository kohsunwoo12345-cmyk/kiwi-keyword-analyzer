// SUPERPLACE 이식: /api/admin/traffic-share — 유입 경로 공유 링크(토큰) 생성/조회/삭제
import { Env, resolveDB, ensureSchema, requireAdminUser } from '../_utils'
import { ensureLandingSchema } from '../landing/_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

async function guard(request: Request, db: D1Database) {
  await ensureSchema(db); await ensureLandingSchema(db)
  const g = await requireAdminUser(request, db)
  return g.error ? j({ ok: false, error: '권한 없음' }, 403) : null
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env); if (!db) return j({ ok: false, error: 'DB 없음' }, 500)
  const err = await guard(request, db); if (err) return err
  const slug = new URL(request.url).searchParams.get('slug') || ''
  if (!slug) return j({ ok: false, error: 'slug 필요' }, 400)
  const row = await db.prepare(`SELECT * FROM landing_traffic_shares WHERE slug = ?`).bind(slug).first().catch(() => null)
  return j({ ok: true, share: row || null })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env); if (!db) return j({ ok: false, error: 'DB 없음' }, 500)
  const err = await guard(request, db); if (err) return err
  const b: any = await request.json().catch(() => ({}))
  const slug = String(b.slug || '')
  if (!slug) return j({ ok: false, error: 'slug 필요' }, 400)
  const existing: any = await db.prepare(`SELECT token FROM landing_traffic_shares WHERE slug = ?`).bind(slug).first().catch(() => null)
  if (existing) {
    await db.prepare(`UPDATE landing_traffic_shares SET title=?, subtitle=?, thumbnail_url=?, og_title=?, og_description=?, updated_at=CURRENT_TIMESTAMP WHERE slug=?`)
      .bind(b.title || '', b.subtitle || '', b.thumbnail_url || '', b.og_title || '', b.og_description || '', slug).run()
    return j({ ok: true, token: existing.token })
  }
  const rand = Math.random().toString(36).slice(2, 10)
  const token = slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + '_' + rand
  await db.prepare(`INSERT INTO landing_traffic_shares (token, slug, title, subtitle, thumbnail_url, og_title, og_description) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(token, slug, b.title || '', b.subtitle || '', b.thumbnail_url || '', b.og_title || '', b.og_description || '').run()
  return j({ ok: true, token })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env); if (!db) return j({ ok: false, error: 'DB 없음' }, 500)
  const err = await guard(request, db); if (err) return err
  const slug = new URL(request.url).searchParams.get('slug') || ''
  if (!slug) return j({ ok: false, error: 'slug 필요' }, 400)
  await db.prepare(`DELETE FROM landing_traffic_shares WHERE slug = ?`).bind(slug).run().catch(() => {})
  return j({ ok: true })
}
