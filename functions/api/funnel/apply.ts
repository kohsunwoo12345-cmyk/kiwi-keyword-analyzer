// 공개 퍼널 신청 처리 + 자동응답 실행
//  POST /api/funnel/apply { slug, name?, phone, email?, extra? }
//   1) funnel_applicants 저장
//   2) 매칭되는 자동응답(trigger=form_submit) 을 즉시/KST예약 발송 (문자, 가능 시 알림톡)
import { resolveDB, ensureSchema } from '../_utils'
import { ensureFunnelSchema } from './_schema'
import { sendSms, aligoAlimtalk, kstReserve, kstSenddate, timingToMinutes } from '../_aligo'

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
  const data = { name, phone: b.phone || '', email: String(b.email || '').slice(0, 120), extra: b.extra || b.data || null }
  await db.prepare('INSERT INTO funnel_applicants (landing_page_id, data_json, created_at) VALUES (?, ?, ?)')
    .bind(page.id, JSON.stringify(data), new Date().toISOString()).run().catch(() => {})

  // 매칭 자동응답: 이 페이지(또는 그룹 전체/전역) + form_submit + active
  const rules = (await db.prepare(
    `SELECT * FROM funnel_auto_responses
     WHERE status = 'active' AND trigger = 'form_submit'
       AND (landing_page_id = ? OR landing_page_id IS NULL)
       AND (group_id = ? OR group_id IS NULL)`,
  ).bind(page.id, page.group_id).all().catch(() => ({ results: [] }))).results || []

  const fired: any[] = []
  for (const r of rules as any[]) {
    const content = String(r.content || '').replace(/\{이름\}|\{name\}/g, name || '고객').replace(/\{페이지\}/g, page.title || '')
    const off = timingToMinutes(r.timing)
    if (!phone && r.type !== 'email') { fired.push({ id: r.id, sent: false, reason: '수신 전화번호 없음' }); continue }
    try {
      if (r.type === 'alimtalk' && r.tpl_code) {
        const ar = await aligoAlimtalk(env, { tplCode: r.tpl_code, items: [{ to: phone, message: content, subject: r.subject || '알림톡' }], from: r.sender_number, failover: true, senddate: off > 0 ? kstSenddate(off) : undefined })
        fired.push({ id: r.id, type: 'alimtalk', sent: ar.ok, reserved: off > 0, reason: ar.error })
      } else if (r.type === 'email') {
        fired.push({ id: r.id, type: 'email', sent: false, reason: '이메일 채널 미구성(문자/알림톡 사용)' })
      } else {
        // sms (또는 tpl_code 없는 alimtalk → 문자로 확실히 발송)
        const opts: any = { from: r.sender_number }
        if (off > 0) { const rv = kstReserve(off); opts.rdate = rv.rdate; opts.rtime = rv.rtime }
        const sr = await sendSms(env, phone, content, opts)
        fired.push({ id: r.id, type: 'sms', sent: sr.sent, reserved: !!sr.reserved, reason: sr.reason })
      }
    } catch (e: any) { fired.push({ id: r.id, sent: false, reason: String(e?.message || e).slice(0, 100) }) }
  }
  return j({ success: true, applicantSaved: true, firedCount: fired.filter((f) => f.sent).length, fired })
}
