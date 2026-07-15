import { json, getSessionUser, resolveDB } from '../../_utils'
import { aligoTemplates } from '../../_aligo'

// GET /api/kakao/alimtalk/templates?channelId=... → 발신프로필의 승인 템플릿 목록
// 알리고(Aligo) 우선, 실패 시 DB(kakao_templates) 폴백.
export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ ok: false, error: '로그인 필요' }, 401)
    const userId = String(me.id)
    const url = new URL(request.url)
    // channelId 는 알리고 발신프로필 키(senderkey). 미지정 시 환경변수 사용.
    const channelId = url.searchParams.get('channelId') || url.searchParams.get('pfId') || String((env as any)?.ALIGO_SENDER_KEY || '')

    let templates: any[] = []

    const r = await aligoTemplates(env, channelId)
    if (r.ok && r.templates) {
      templates = r.templates.map((t: any) => ({
        templateId: t.templateId || '',
        name: t.name || '',
        content: t.content || '',
        categoryCode: t.categoryCode || '',
        messageType: t.messageType || 'BA',
        status: t.status || 'REGISTERED', // APPROVED | PENDING | REGISTERED | REJECTED (알리고 정규화)
        inspStatus: t.inspStatus || '',
        rejectReason: t.rejectReason || '',
        buttons: t.buttons || [],
        dateCreated: t.dateCreated || '',
      }))
    }

    // Fallback: DB
    if (templates.length === 0) {
      try {
        const rows = await db
          .prepare(
            `SELECT template_id, name, content, status, reject_reason, category_code, message_type, created_at
             FROM kakao_templates WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
          )
          .bind(userId)
          .all()
        templates = (rows.results || []).map((r: any) => ({
          templateId: r.template_id || '',
          name: r.name || '',
          content: r.content || '',
          categoryCode: r.category_code || '',
          messageType: r.message_type || 'BA',
          status: r.status || 'PENDING',
          rejectReason: r.reject_reason || '',
          dateCreated: r.created_at || '',
        }))
      } catch (_) {}
    }

    return json({ ok: true, templates })
  } catch (e: any) {
    return json({ ok: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
