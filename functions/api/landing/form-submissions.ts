// SUPERPLACE 이식: GET /api/landing/form-submissions?slug=... — 랜딩 최근 신청자 목록
//  퍼널 랜딩페이지면 funnel_applicants, 아니면 form_submissions 조회.
import { resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ownsPage, isAdminUser, forbidden } from '../funnel/_own'
import { ensureFunnelSchema } from '../funnel/_schema'
import { normalizeApplicants } from '../funnel/_applicants'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env as any)
    //  못 불러온 것을 "신청자 없음" 으로 보여 주면 안 된다 (all-submissions 와 같은 이유)
    if (!db) return j({ success: false, error: '신청자 목록을 불러오지 못했습니다.', submissions: [] }, 503)
    await ensureSchema(db)
    await ensureFunnelSchema(db)
    // ⚠ 여기는 신청자의 이름·전화번호·이메일이 그대로 나오는 곳인데 인증이 전혀 없었다.
    //   slug 는 공개 주소라 누구나 알 수 있으므로, 사실상 전 고객의 개인정보가 열려 있었다.
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')
    const limit = Math.max(1, Math.min(500, parseInt(url.searchParams.get('limit') || '500') || 500))
    if (!slug) return j({ success: true, submissions: [] })

    // 1) 퍼널 랜딩페이지
    const fp: any = await db.prepare('SELECT id FROM funnel_landing_pages WHERE slug = ?').bind(slug).first()
    if (fp) {
      if (!(await ownsPage(db, me, fp.id))) return forbidden()
      const { results } = await db.prepare(`
        SELECT fa.* FROM funnel_applicants fa WHERE fa.landing_page_id = ? ORDER BY fa.created_at DESC LIMIT ?
      `).bind(fp.id, limit).all()
      return j({ success: true, submissions: normalizeApplicants((results as any[]) || []) })
    }

    // 2) 일반 landing_pages → form_submissions
    const page: any = await db.prepare('SELECT id, user_id FROM landing_pages WHERE slug = ?').bind(slug).first()
    if (!page) return j({ success: true, submissions: [] })
    if (!isAdminUser(me) && String(page.user_id || '') !== String(me.id)) return forbidden()
    const { results } = await db.prepare(`
      SELECT id, name, phone, email, additional_data, created_at, landing_slug, landing_title
      FROM form_submissions WHERE landing_page_id = ? ORDER BY created_at DESC LIMIT ?
    `).bind(page.id, limit).all()
    const submissions = ((results as any[]) || []).map((r: any) => {
      let extra: any = {}
      try { extra = JSON.parse(r.additional_data || '{}') } catch (e) {}
      const createdAtUtc = r.created_at ? String(r.created_at).replace(' ', 'T').replace(/Z?$/, 'Z') : r.created_at
      return { ...r, created_at: createdAtUtc, grade: extra.grade || null, message: extra.message || null }
    })
    return j({ success: true, submissions })
  } catch (err) {
    return j({ success: false, error: '신청자 목록을 불러오지 못했습니다.', submissions: [] }, 500)
  }
}
