// SUPERPLACE 이식: GET /api/landing/all-submissions — 내 모든 랜딩 신청자
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  /* ⚠ 여기서 성공이라고 답하면 화면은 "신청자 없음" 을 띄운다.
     들어온 신청이 없는 것과 못 불러온 것은 완전히 다른 이야기다 —
     "이번 달 문의가 하나도 없네" 하고 광고를 끄는 판단까지 이어진다. */
  if (!db) return j({ success: false, error: '신청자 목록을 불러오지 못했습니다.', submissions: [] }, 503)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 200)
  const url = new URL(request.url)
  const limit = Math.min(2000, parseInt(url.searchParams.get('limit') || '500') || 500)
  try {
    const results = ((await db.prepare(`
      SELECT fs.id, fs.name, fs.phone, fs.email, fs.additional_data, fs.created_at, fs.landing_slug, fs.landing_title,
             lp.slug AS page_slug, lp.title AS page_title, lp.form_fields
      FROM form_submissions fs JOIN landing_pages lp ON fs.landing_page_id = lp.id
      WHERE lp.user_id = ? ORDER BY fs.created_at DESC LIMIT ?`).bind(me.id, limit).all()).results as any[]) || []
    const submissions = results.map((r) => {
      let extra: any = {}
      try { extra = JSON.parse(r.additional_data || '{}') } catch {}
      const raw = r.created_at || ''
      return { ...r, created_at: raw ? String(raw).replace(' ', 'T').replace(/Z?$/, 'Z') : raw, grade: extra.grade || null, message: extra.message || null, landing_slug: r.landing_slug || r.page_slug, landing_title: r.landing_title || r.page_title }
    })
    return j({ success: true, submissions })
  } catch {
    return j({ success: false, error: '신청자 목록을 불러오지 못했습니다.', submissions: [] }, 500)
  }
}
