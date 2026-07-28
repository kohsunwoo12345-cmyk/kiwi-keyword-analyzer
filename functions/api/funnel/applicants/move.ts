// SUPERPLACE 퍼널 빌더 이식: POST /api/funnel/applicants/move (신청자 다른 그룹으로 이동)
import { resolveDB, getSessionUser } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'
import { ownsApplicants, ownsGroup, forbidden } from '../_own'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const { ids, target_group_id } = (((await request.json().catch(() => null)) as any) || {})
    if (!Array.isArray(ids) || !ids.length || !target_group_id) {
      return j({ success: false, error: '이동할 신청자와 대상 그룹을 지정하세요.' }, 400)
    }
    if (ids.length > 1000) return j({ success: false, error: '한 번에 최대 1,000건까지 이동할 수 있습니다.' }, 400)
    // 옮기는 쪽·받는 쪽 둘 다 내 것이어야 한다.
    //  받는 쪽만 확인하면 남의 신청자를 내 그룹으로 빼올 수 있고,
    //  보내는 쪽만 확인하면 내 신청자를 남의 그룹에 밀어 넣을 수 있다.
    if (!(await ownsApplicants(db, me, ids))) return forbidden()
    if (!(await ownsGroup(db, me, target_group_id))) return forbidden()
    // 대상 그룹의 "엑셀 전용" 대표 랜딩페이지 확보 (없으면 생성)
    const slug = 'excel-import-group-' + target_group_id
    let targetLpId: number
    const realLp: any = await db.prepare(`SELECT id FROM funnel_landing_pages WHERE group_id = ? AND slug != ? LIMIT 1`).bind(target_group_id, slug).first()
    if (realLp) {
      targetLpId = realLp.id
    } else {
      const importLp: any = await db.prepare(`SELECT id FROM funnel_landing_pages WHERE group_id = ? AND slug = ? LIMIT 1`).bind(target_group_id, slug).first()
      if (importLp) targetLpId = importLp.id
      else {
        const ins = await db.prepare(`INSERT INTO funnel_landing_pages (group_id, title, slug, status, html_content, created_at) VALUES (?, '[엑셀 직접등록]', ?, 'draft', '', ?)`).bind(target_group_id, slug, new Date().toISOString()).run()
        targetLpId = ins.meta.last_row_id as number
      }
    }
    const placeholders = ids.map(() => '?').join(',')
    await db.prepare(`UPDATE funnel_applicants SET landing_page_id = ? WHERE id IN (${placeholders})`).bind(targetLpId, ...ids).run()
    return j({ success: true, message: '이동되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '이동 실패' }, 500)
  }
}
