import { Env, getSessionUser, resolveDB } from '../_utils'
import { ensureIgSchema } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/dm-rules → DM 규칙 목록
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, rules: [], error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const rules = await db.prepare(`SELECT * FROM instagram_dm_rules ORDER BY created_at DESC`).all()
    const parsed = (rules.results || []).map((r: any) => ({
      ...r,
      keywords: JSON.parse(r.keywords || '[]'),
      active: r.active === 1,
    }))
    return j({ success: true, rules: parsed })
  } catch (e: any) {
    return j({ success: false, rules: [], error: '서버 오류가 발생했습니다.' }, 200)
  }
}

// POST /api/instagram/dm-rules → DM 규칙 저장/수정
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    const body = (await request.json()) as any
    const { rule, editIdx } = body

    if (editIdx !== null && editIdx !== undefined) {
      const existing = (await db
        .prepare(`SELECT id FROM instagram_dm_rules ORDER BY created_at LIMIT -1 OFFSET ?`)
        .bind(editIdx)
        .first()) as any

      if (existing) {
        await db
          .prepare(
            `UPDATE instagram_dm_rules SET name=?, keywords=?, message=?, post_url=?, cooldown_days=?, active=?, updated_at=datetime('now') WHERE id=?`,
          )
          .bind(
            rule.name,
            JSON.stringify(rule.keywords),
            rule.message,
            rule.postUrl || null,
            rule.cooldown || 1,
            rule.active ? 1 : 0,
            existing.id,
          )
          .run()
        return j({ success: true, action: 'updated' })
      }
    }

    await db
      .prepare(
        `INSERT INTO instagram_dm_rules (name, keywords, message, post_url, cooldown_days, active, sent_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
      )
      .bind(
        rule.name,
        JSON.stringify(rule.keywords),
        rule.message,
        rule.postUrl || null,
        rule.cooldown || 1,
        rule.active ? 1 : 0,
      )
      .run()

    return j({ success: true, action: 'created' })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
