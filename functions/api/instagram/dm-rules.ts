import { Env, getSessionUser, resolveDB } from '../_utils'
import { ensureIgSchema, isIgAdmin } from './_ig'

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
    // ⚠ 예전에는 조건 없이 전부 읽어, 로그인만 하면 남의 DM 규칙이 그대로 보였다.
    //   관리자만 전체를 본다.
    const rules = isIgAdmin(me)
      ? await db.prepare(`SELECT * FROM instagram_dm_rules ORDER BY created_at DESC`).all()
      : await db.prepare(
          `SELECT * FROM instagram_dm_rules WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT) ORDER BY created_at DESC`,
        ).bind(me.id).all()
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
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const body = (((await request.json().catch(() => null)) as any) || {})
    const { rule, editIdx } = body
    // rule 이 없으면 아래에서 rule.name 을 읽다가 터진다(500) — 잘못된 요청은 400 으로
    if (!rule || typeof rule !== 'object' || !String(rule.name || '').trim() || !String(rule.message || '').trim())
      return j({ success: false, error: '규칙 이름과 메시지를 입력하세요.' }, 400)

    if (editIdx !== null && editIdx !== undefined) {
      // ⚠ 예전에는 "전체 목록의 N번째" 를 고쳤다. 목록이 회원별로 나뉘지 않았으니
      //   같은 순번이 남의 규칙을 가리킬 수 있었다. 내 규칙 안에서의 순번으로 좁힌다.
      const existing = (await db
        .prepare(
          `SELECT id FROM instagram_dm_rules WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)
            ORDER BY created_at LIMIT -1 OFFSET ?`,
        )
        .bind(me.id, editIdx)
        .first()) as any

      if (existing) {
        await db
          .prepare(
            `UPDATE instagram_dm_rules SET name=?, keywords=?, message=?, post_url=?, cooldown_days=?, active=?, updated_at=datetime('now')
              WHERE id=? AND CAST(user_id AS TEXT) = CAST(? AS TEXT)`,
          )
          .bind(
            rule.name,
            JSON.stringify(rule.keywords),
            rule.message,
            rule.postUrl || null,
            rule.cooldown || 1,
            rule.active ? 1 : 0,
            existing.id,
            me.id,
          )
          .run()
        return j({ success: true, action: 'updated' })
      }
    }

    await db
      .prepare(
        `INSERT INTO instagram_dm_rules (user_id, name, keywords, message, post_url, cooldown_days, active, sent_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
      )
      .bind(
        me.id,
        String(rule.name).slice(0, 100),
        JSON.stringify(Array.isArray(rule.keywords) ? rule.keywords.slice(0, 50) : []),
        String(rule.message).slice(0, 2000),
        rule.postUrl ? String(rule.postUrl).slice(0, 500) : null,
        Math.max(0, Math.min(365, Math.round(Number(rule.cooldown) || 1))),
        rule.active ? 1 : 0,
      )
      .run()

    return j({ success: true, action: 'created' })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
