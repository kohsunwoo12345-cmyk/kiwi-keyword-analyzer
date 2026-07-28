// SUPERPLACE 퍼널 빌더 이식: PUT /api/funnels/:id/settings (DB중복방지 모드 + 헤더 스크립트)
import { resolveDB, getSessionUser } from '../../_utils'
import { ownsFunnel, forbidden } from '../../funnel/_own'
import { ensureFunnelSchema } from '../../funnel/_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestPut: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    // ⚠ header_scripts 는 퍼널 페이지에 그대로 삽입된다. 인증 없이 열려 있으면
    //   누구나 남의 랜딩페이지에 스크립트를 심을 수 있다.
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const id = params.id as string
    if (!(await ownsFunnel(db, me, id))) return forbidden()
    const body = (((await request.json().catch(() => null)) as any) || {})
    const { db_dedup_mode, header_scripts } = body
    const validModes = ['none', 'group', 'funnel']
    const mode = validModes.includes(db_dedup_mode) ? db_dedup_mode : 'none'
    await db.prepare(`
      UPDATE funnels SET db_dedup_mode=?, header_scripts=?, updated_at=?
      WHERE id=?
    `).bind(mode, header_scripts || '', new Date().toISOString(), id).run()
    return j({ success: true, message: '퍼널 설정이 저장되었습니다.', db_dedup_mode: mode })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
