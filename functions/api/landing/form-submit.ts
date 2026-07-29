// SUPERPLACE 이식: POST /api/landing/form-submit — 외부 임베드/랜딩 폼 제출 공개 엔드포인트
//  1) funnel_landing_pages(active) 매칭 시 → DB중복방지 후 funnel_applicants 저장 + 자동응답(문자/이메일) 발송
//  2) 아니면 landing_pages → form_submissions 폴백
import { resolveDB, ensureSchema, clientIp, rateLimitOk } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'
import { fireAutoResponses } from '../funnel/_autofire'

// 공개 엔드포인트 남용 한도 — funnel/apply 와 같은 기준(제출 1건 = 유료 문자 1건)
const IP_LIMIT = 20
const PHONE_LIMIT = 1
const WINDOW_MIN = 10

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } })
const digits = (s: any) => String(s || '').replace(/[^0-9]/g, '')

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env as any)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureSchema(db)
    await ensureFunnelSchema(db)
    const body: any = await (request.json().catch(() => null)) ?? {}
    const { landing_slug, name, phone, email, grade, message, ...rest } = body
    if (!landing_slug) return j({ success: false, error: 'landing_slug is required' })

    // ── 남용·중복 제출 차단 ──────────────────────────────────────────────────
    //  자동응답 문자는 건당 유료 → 로그인 없는 이 경로를 막지 않으면 요금이 그대로 새어 나간다.
    const ip = clientIp(request)
    if (!(await rateLimitOk(db, `apply:ip:${ip}`, IP_LIMIT, WINDOW_MIN)))
      return j({ success: false, error: '잠시 후 다시 시도해 주세요.' }, 429)
    const phoneDigits = digits(phone)
    if (phoneDigits && !(await rateLimitOk(db, `apply:slug:${landing_slug}:${phoneDigits}`, PHONE_LIMIT, WINDOW_MIN)))
      return j({ success: false, duplicate: true, message: '이미 신청이 접수되었습니다.' })

    const additionalData = JSON.stringify({ grade: grade || null, message: message || null, ...rest })

    // 1) 퍼널 랜딩페이지 우선
    const funnelPage: any = await db.prepare(
      "SELECT id, group_id, title FROM funnel_landing_pages WHERE slug = ? AND status = 'active'",
    ).bind(landing_slug).first().catch(() => null)

    if (funnelPage) {
      const groupId = funnelPage.group_id
      let funnelId: number | null = null
      let dedupMode = 'none'
      try {
        const grp: any = await db.prepare(`SELECT funnel_id FROM funnel_groups WHERE id=?`).bind(groupId).first()
        if (grp) funnelId = grp.funnel_id
      } catch (e) {}
      if (funnelId) {
        try {
          const fn: any = await db.prepare(`SELECT db_dedup_mode FROM funnels WHERE id=?`).bind(funnelId).first()
          if (fn) dedupMode = fn.db_dedup_mode || 'none'
        } catch (e) {}
      }
      const ph = digits(phone)
      if (ph && dedupMode !== 'none') {
        try {
          let dup: any = null
          if (dedupMode === 'group') {
            dup = await db.prepare(`SELECT fa.id FROM funnel_applicants fa WHERE fa.phone=? AND fa.landing_page_id IN (SELECT id FROM funnel_landing_pages WHERE group_id=?) LIMIT 1`).bind(phone, groupId).first()
          } else if (dedupMode === 'funnel') {
            dup = await db.prepare(`SELECT fa.id FROM funnel_applicants fa WHERE fa.phone=? AND fa.landing_page_id IN (SELECT flp.id FROM funnel_landing_pages flp JOIN funnel_groups fg ON fg.id=flp.group_id WHERE fg.funnel_id=?) LIMIT 1`).bind(phone, funnelId).first()
          }
          if (dup) return j({ success: false, duplicate: true, message: '이전에 신청이 완료 되셨습니다.' })
        } catch (e) {}
      }
      try {
        await db.prepare(`INSERT INTO funnel_applicants (landing_page_id, name, phone, email, additional_data, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(funnelPage.id, name || '', phone || '', email || '', additionalData, new Date().toISOString()).run()
      } catch (e) {}
      // 자동응답(문자/알림톡/이메일) 발송 — best-effort
      try { await fireAutoResponses(env, db, funnelPage, { name, phone, email }) } catch (e) {}
      return j({ success: true, message: '신청이 완료되었습니다.' })
    }

    // 2) 일반 landing_pages → form_submissions
    const page: any = await db.prepare('SELECT id, user_id, title FROM landing_pages WHERE slug = ?').bind(landing_slug).first().catch(() => null)
    if (!page) return j({ success: false, error: 'Landing page not found' })
    const landingTitle = page.title || ''
    try {
      await db.prepare(`INSERT INTO form_submissions (form_id, landing_page_id, name, phone, email, additional_data, landing_slug, landing_title, created_at) VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(page.id, name || '', phone || '', email || '', additionalData, landing_slug, landingTitle, new Date().toISOString()).run()
    } catch (e) {
      try {
        await db.prepare(`INSERT INTO form_submissions (form_id, landing_page_id, name, phone, email, additional_data, created_at) VALUES (0, ?, ?, ?, ?, ?, ?)`)
          .bind(page.id, name || '', phone || '', email || '', additionalData, new Date().toISOString()).run()
      } catch (e2) {
        await db.prepare(`INSERT INTO form_submissions (form_id, name, phone, email, created_at) VALUES (0, ?, ?, ?, ?)`)
          .bind(name || '', phone || '', email || '', new Date().toISOString()).run().catch(() => {})
      }
    }
    return j({ success: true, message: '신청이 완료되었습니다.' })
  } catch (err) {
    return j({ success: false, error: String(err) })
  }
}
