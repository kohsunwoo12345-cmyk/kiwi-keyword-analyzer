// SUPERPLACE 퍼널 빌더 이식: PUT/DELETE /api/funnel/auto-responses/:id (자동응답 상태 토글/삭제)
import { resolveDB, getSessionUser } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 자동응답 수정 (status 토글 또는 내용 수정)
export const onRequestPut: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const id = params.id as string
    const body = (await request.json()) as any
    const updates: string[] = []
    const p: any[] = []
    for (const f of ['type', 'subject', 'content', 'timing', 'trigger', 'status', 'sender_number', 'tpl_code']) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); p.push(body[f]) }
    }
    if (!updates.length) return j({ success: true, message: '변경 사항 없음' })
    p.push(id, me.id)
    await db.prepare(`UPDATE funnel_auto_responses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...p).run()
    return j({ success: true, message: '수정되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '수정 실패' }, 500)
  }
}

// 자동응답 삭제
export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const id = params.id as string
    await db.prepare(`DELETE FROM funnel_auto_responses WHERE id = ? AND user_id = ?`).bind(id, me.id).run()
    return j({ success: true, message: '삭제되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '삭제 실패' }, 500)
  }
}
