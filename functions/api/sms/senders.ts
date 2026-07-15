import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'

// GET /api/sms/senders → 발신번호 목록 (승인된 sender_numbers). 페이지는 { id, phone_number } 를 사용.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)
  try {
    const rows = await db
      .prepare(
        `SELECT id, phone AS phone_number, status FROM sender_numbers
         WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC`,
      )
      .bind(me.id)
      .all()
    const senders: any[] = (rows.results as any[]) || []
    // 승인된 발신번호가 없으면 알리고 기본 발신번호(ALIGO_SENDER)를 대체로 노출
    if (senders.length === 0) {
      const from = String((env as any)?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')
      if (from) senders.push({ id: 'default', phone_number: from, status: 'approved' })
    }
    return json({ success: true, senders })
  } catch (err) {
    console.error('Get senders error:', err)
    return json({ success: false, error: '발신번호 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
}
