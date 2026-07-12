import { Env, json, getSessionUser, resolveDB } from '../../_utils'

// DELETE /api/sms/templates/:templateId → 소유자 확인 후 삭제
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)
  try {
    const templateId = String((params as any).templateId || '')
    const owned = await db
      .prepare(`SELECT id FROM sms_templates WHERE id = ? AND user_id = ?`)
      .bind(templateId, me.id)
      .first()
    if (!owned) return json({ success: false, error: '템플릿을 찾을 수 없습니다.' }, 404)
    await db.prepare(`DELETE FROM sms_templates WHERE id = ?`).bind(templateId).run()
    return json({ success: true })
  } catch (err) {
    console.error('Delete template error:', err)
    return json({ success: false, error: '템플릿 삭제 실패' }, 500)
  }
}
