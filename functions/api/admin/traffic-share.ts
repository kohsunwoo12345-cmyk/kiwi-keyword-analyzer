// SUPERPLACE 이식: /api/admin/traffic-share — 유입 경로 공유 링크(토큰) 생성/조회/삭제
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from '../landing/_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

/**
 * ⚠ 관리자 전용이었다. 같은 화면(랜딩 경로 분석)이 회원 대시보드에도 붙어 있어
 *   회원은 "공유 링크 만들기" 를 누르면 늘 "권한 없음" 이었다.
 *   회원에게 열되, 자기 랜딩페이지의 slug 인지 반드시 확인한다 —
 *   확인 없이 열면 남의 랜딩 유입 리포트를 누구나 공개 링크로 만들어 뿌릴 수 있다.
 */
async function guard(request: Request, db: D1Database, slug: string) {
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return { err: j({ ok: false, error: '로그인이 필요합니다.' }, 401) }
  if (me.role === 'admin' || me.role === 'superadmin') return { err: null }
  const own = await db.prepare('SELECT id FROM landing_pages WHERE slug = ? AND user_id = ?').bind(slug, me.id).first().catch(() => null)
  if (!own) return { err: j({ ok: false, error: '권한이 없습니다.' }, 403) }
  return { err: null }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env); if (!db) return j({ ok: false, error: 'DB 없음' }, 500)
  const slug = new URL(request.url).searchParams.get('slug') || ''
  if (!slug) return j({ ok: false, error: 'slug 필요' }, 400)
  const { err } = await guard(request, db, slug); if (err) return err
  const row = await db.prepare(`SELECT * FROM landing_traffic_shares WHERE slug = ?`).bind(slug).first().catch(() => null)
  return j({ ok: true, share: row || null })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env); if (!db) return j({ ok: false, error: 'DB 없음' }, 500)
  const b: any = await (request.json().catch(() => null)) ?? {}
  const slug = String(b.slug || '')
  if (!slug) return j({ ok: false, error: 'slug 필요' }, 400)
  const { err } = await guard(request, db, slug); if (err) return err
  const existing: any = await db.prepare(`SELECT token FROM landing_traffic_shares WHERE slug = ?`).bind(slug).first().catch(() => null)
  if (existing) {
    await db.prepare(`UPDATE landing_traffic_shares SET title=?, subtitle=?, thumbnail_url=?, og_title=?, og_description=?, updated_at=CURRENT_TIMESTAMP WHERE slug=?`)
      .bind(b.title || '', b.subtitle || '', b.thumbnail_url || '', b.og_title || '', b.og_description || '', slug).run()
    return j({ ok: true, token: existing.token })
  }
  // 이 토큰 하나로 누구나 그 랜딩의 유입 리포트를 본다 — Math.random 말고 암호학적 난수로 뽑는다.
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  const token = slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + '_' + rand
  await db.prepare(`INSERT INTO landing_traffic_shares (token, slug, title, subtitle, thumbnail_url, og_title, og_description) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(token, slug, b.title || '', b.subtitle || '', b.thumbnail_url || '', b.og_title || '', b.og_description || '').run()
  return j({ ok: true, token })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env); if (!db) return j({ ok: false, error: 'DB 없음' }, 500)
  const slug = new URL(request.url).searchParams.get('slug') || ''
  if (!slug) return j({ ok: false, error: 'slug 필요' }, 400)
  const { err } = await guard(request, db, slug); if (err) return err
  await db.prepare(`DELETE FROM landing_traffic_shares WHERE slug = ?`).bind(slug).run().catch(() => {})
  return j({ ok: true })
}
