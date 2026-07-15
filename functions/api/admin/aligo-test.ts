import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { sendSms, aligoAlimtalk, aligoRemain, aligoConfigured, aligoAlimtalkConfigured } from '../_aligo'

const has = (v: any) => !!String(v ?? '').trim()

// 관리자 승인 발신번호 → 환경변수 순으로 발신번호 결정
async function resolveSender(db: D1Database, env: any, adminId: string, explicit?: string): Promise<string> {
  let from = String(explicit || '').replace(/[^0-9]/g, '')
  if (!from) {
    const sr: any = await db.prepare("SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1").bind(adminId).first().catch(() => null)
    if (sr?.phone) from = String(sr.phone).replace(/[^0-9]/g, '')
  }
  if (!from) from = String(env?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')
  return from
}

// GET /api/admin/aligo-test
//   (파라미터 없음)          → 설정/연결 점검 (무료: 잔여건수 조회)
//   ?to=010...&sender=02...  → 실제 문자 발송 테스트 (주소창만으로 가능)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const to = (url.searchParams.get('to') || '').replace(/[^0-9]/g, '')

  // 주소창 테스트: ?to= 가 있으면 실제 발송
  if (to.length >= 10) {
    const text = url.searchParams.get('text') || '[BYGENCY] 알리고 발송 테스트입니다.'
    const from = await resolveSender(db, env, guard.me.id, url.searchParams.get('sender') || '')
    const r = await sendSms(env, to, text, { from })
    return json({ ok: r.sent, kind: 'sms', to, from: from || null, result: r }, r.sent ? 200 : 200)
  }

  const e: any = env
  const config = {
    ALIGO_API_KEY: has(e.ALIGO_API_KEY),
    ALIGO_ID_KEY: has(e.ALIGO_ID_KEY) || has(e.ALIGO_USER_ID),
    ALIGO_SENDER_KEY: has(e.ALIGO_SENDER_KEY),
    ALIGO_SENDER_optional: has(e.ALIGO_SENDER),
    ALIGO_PROXY_URL: has(e.ALIGO_PROXY_URL),
    ALIGO_PROXY_TOKEN: has(e.ALIGO_PROXY_TOKEN),
    smsReady: aligoConfigured(env),
    alimtalkReady: aligoAlimtalkConfigured(env),
  }
  // 잔여 건수 조회 = 실제 인증/연결 검증 (문자 소모 없음)
  const remain = await aligoRemain(env)
  return json({ ok: true, config, remain })
}

// POST /api/admin/aligo-test { to, text?, kind?, tplCode?, sender? } → 실제 발송 테스트
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const body: any = await request.json().catch(() => ({}))
  const to = String(body.to || '').replace(/[^0-9]/g, '')
  if (to.length < 10) return json({ ok: false, error: '수신 번호(to)를 정확히 입력하세요.' }, 400)
  const text = String(body.text || '[BYGENCY] 알리고 발송 테스트입니다.')
  const kind = String(body.kind || 'sms')

  // 발신번호: 지정값 → 관리자 승인 발신번호 → 환경변수
  let from = String(body.sender || '').replace(/[^0-9]/g, '')
  if (!from) {
    const sr: any = await db.prepare("SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1").bind(guard.me.id).first().catch(() => null)
    if (sr?.phone) from = String(sr.phone).replace(/[^0-9]/g, '')
  }
  if (!from) from = String((env as any)?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')

  if (kind === 'alimtalk') {
    const tplCode = String(body.tplCode || (env as any)?.ALIGO_TEMPLATE_CODE || '')
    const r = await aligoAlimtalk(env, { tplCode, from, failover: false, items: [{ to, message: text, subject: 'BYGENCY 테스트' }] })
    return json({ ok: r.ok, kind: 'alimtalk', result: r })
  }

  const r = await sendSms(env, to, text, { from })
  return json({ ok: r.sent, kind: 'sms', from: from || null, result: r })
}
