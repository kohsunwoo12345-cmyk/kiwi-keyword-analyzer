import { json, getSessionUser, resolveDB } from '../../_utils'
import { makeSolapiAuthHeader } from '../../_solapi'

// GET /api/kakao/alimtalk/templates?channelId=... → 채널의 승인 템플릿 목록
// SUPERPLACE Hono 라우트 이식. Solapi 우선, 실패 시 DB(kakao_templates) 폴백.
export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ ok: false, error: '로그인 필요' }, 401)
    const userId = String(me.id)
    const url = new URL(request.url)
    const channelId = url.searchParams.get('channelId') || url.searchParams.get('pfId') || ''

    const apiKey = String((env as any)?.SOLAPI_API_KEY || '').trim()
    const apiSecret = String((env as any)?.SOLAPI_API_SECRET || '').trim()

    let templates: any[] = []

    if (apiKey && apiSecret && channelId) {
      const auth = await makeSolapiAuthHeader(apiKey, apiSecret)
      const apiUrl = `https://api.solapi.com/kakao/v2/templates?channelId=${encodeURIComponent(channelId)}&limit=100`
      const res = await fetch(apiUrl, { headers: { Authorization: auth } })
      if (res.ok) {
        const data: any = await res.json()
        const list = data.templateList || data.templates || data.list || []
        templates = list.map((t: any) => ({
          templateId: t.templateId || t.id || '',
          name: t.name || '',
          content: t.content || '',
          categoryCode: t.categoryCode || '',
          messageType: t.messageType || 'BA',
          status: t.status || 'PENDING',
          rejectReason: (t.comments || []).map((c: any) => c.content || '').join(' / ') || t.rejectReason || '',
          buttons: t.buttons || [],
          dateCreated: t.dateCreated || '',
        }))
      }
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
