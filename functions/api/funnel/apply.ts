// 공개 퍼널 신청 처리 + 자동응답 실행
//  POST /api/funnel/apply { slug, name?, phone, email?, extra? }
//   1) funnel_applicants 저장
//   2) 매칭되는 자동응답(trigger=form_submit) 을 즉시/KST예약 발송 (문자, 가능 시 알림톡)
import { resolveDB, ensureSchema } from '../_utils'
import { ensureFunnelSchema } from './_schema'
import { fireAutoResponses } from './_autofire'

const j = (o: any, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } })
const digits = (s: any) => String(s || '').replace(/[^0-9]/g, '')

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const db = resolveDB(env as any)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureFunnelSchema(db)
  const b: any = await request.json().catch(() => ({}))
  const slug = String(b.slug || '').trim()
  if (!slug) return j({ success: false, error: 'slug가 필요합니다.' }, 400)

  const page: any = await db.prepare('SELECT id, group_id, title FROM funnel_landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
  if (!page) return j({ success: false, error: '랜딩페이지를 찾을 수 없습니다.' }, 404)

  const phone = digits(b.phone)
  const name = String(b.name || '').slice(0, 60)
  const email = String(b.email || '').trim().toLowerCase()
  const extra = b.extra || b.data || null
  const data = { name, phone: b.phone || '', email: String(b.email || '').slice(0, 120), extra }
  // 신구 컬럼 병행 저장: 빌더가 읽는 name/phone/email/additional_data + 레거시 data_json
  const additionalData = JSON.stringify(extra && typeof extra === 'object' ? extra : { extra: extra || '' })
  await db.prepare('INSERT INTO funnel_applicants (landing_page_id, name, phone, email, additional_data, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(page.id, name, b.phone || '', email, additionalData, JSON.stringify(data), new Date().toISOString())
    .run()
    .catch(async () => {
      // 구버전 스키마(name 등 컬럼 없음) 폴백
      await db.prepare('INSERT INTO funnel_applicants (landing_page_id, data_json, created_at) VALUES (?, ?, ?)')
        .bind(page.id, JSON.stringify(data), new Date().toISOString()).run().catch(() => {})
    })

  // 매칭 자동응답(문자/알림톡/이메일) 실행 — 공용 헬퍼
  const fired = await fireAutoResponses(env, db, page, { name, phone: b.phone || '', email })
  return j({ success: true, applicantSaved: true, firedCount: fired.filter((f) => f.sent).length, fired })
}
