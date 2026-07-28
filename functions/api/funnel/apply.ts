// 공개 퍼널 신청 처리 + 자동응답 실행
//  POST /api/funnel/apply { slug, name?, phone, email?, extra? }
//   1) funnel_applicants 저장
//   2) 매칭되는 자동응답(trigger=form_submit) 을 즉시/KST예약 발송 (문자, 가능 시 알림톡)
import { resolveDB, ensureSchema, clientIp, rateLimitOk } from '../_utils'
import { ensureFunnelSchema } from './_schema'
import { fireAutoResponses } from './_autofire'

// 공개 엔드포인트 남용 한도 — 제출 한 번마다 유료 문자/알림톡이 나가므로 반드시 필요하다
const IP_LIMIT = 20      // 같은 IP 에서 10분에 20건까지 (NAT 뒤 단체 신청 여지를 남긴 값)
const PHONE_LIMIT = 1    // 같은 번호·같은 페이지는 10분에 1건 (더블클릭·재제출로 문자가 두 번 가는 것 방지)
const WINDOW_MIN = 10

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

  // 초안·중지된 페이지는 공개 접수를 받지 않는다(status 가 비어 있는 과거 데이터는 활성으로 본다)
  const page: any = await db.prepare(
    "SELECT id, group_id, title FROM funnel_landing_pages WHERE slug = ? AND (status IS NULL OR status = '' OR status = 'active')",
  ).bind(slug).first().catch(() => null)
  if (!page) return j({ success: false, error: '랜딩페이지를 찾을 수 없습니다.' }, 404)

  const phone = digits(b.phone)

  // ── 남용·중복 제출 차단 ────────────────────────────────────────────────────
  //  자동응답 문자는 건당 유료다. 여기서 안 막으면 스크립트 한 번에 요금이 빠져나간다.
  const ip = clientIp(request)
  if (!(await rateLimitOk(db, `apply:ip:${ip}`, IP_LIMIT, WINDOW_MIN)))
    return j({ success: false, error: '잠시 후 다시 시도해 주세요.' }, 429)
  if (phone && !(await rateLimitOk(db, `apply:${page.id}:${phone}`, PHONE_LIMIT, WINDOW_MIN)))
    return j({ success: false, duplicate: true, message: '이미 신청이 접수되었습니다.' })

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
