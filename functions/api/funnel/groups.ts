// Ported from SUPERPLACE: GET/POST /api/funnel/groups (Hono → CF Pages Functions)
import { resolveDB } from '../_utils'
import { ensureFunnelSchema } from './_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 퍼널 그룹 목록
export const onRequestGet: PagesFunction = async ({ env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: true, groups: [] })
    await ensureFunnelSchema(db)
    let groups: any[] = []

    try {
      // 기본 그룹 목록 가져오기
      const result = await db.prepare(`
        SELECT id, name, description, color, created_at, updated_at
        FROM funnel_groups
        WHERE funnel_id IS NULL OR funnel_id = 0
        ORDER BY created_at DESC
      `).all()

      groups = (result.results as any[]) || []

      // 각 그룹의 랜딩페이지 수와 신청자 수 계산
      for (const group of groups) {
        try {
          // 랜딩페이지 수
          const lpCount: any = await db.prepare(`
            SELECT COUNT(*) as count FROM funnel_landing_pages WHERE group_id = ?
          `).bind(group.id).first()
          group.landing_page_count = lpCount?.count || 0

          // 신청자 수
          const applicantCount: any = await db.prepare(`
            SELECT COUNT(*) as count
            FROM funnel_applicants
            WHERE landing_page_id IN (SELECT id FROM funnel_landing_pages WHERE group_id = ?)
          `).bind(group.id).first()
          group.applicant_count = applicantCount?.count || 0
        } catch (countError) {
          console.warn('Count error for group', group.id, countError)
          group.landing_page_count = 0
          group.applicant_count = 0
        }
      }
    } catch (dbError) {
      console.warn('DB error, returning empty groups', dbError)
    }

    return j({ success: true, groups: groups })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return j({ success: true, groups: [] })
  }
}

// 퍼널 그룹 생성
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const { name, description, color } = (await request.json()) as any
    const userId = 0 // 대시보드 임베드 공개 도구 — 인증 무력화

    if (!name) {
      return j({ success: false, error: '그룹 이름을 입력해주세요.' }, 400)
    }

    const now = new Date().toISOString()
    const result = await db.prepare(`
      INSERT INTO funnel_groups (user_id, name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, name, description || '', color || '#6366f1', now, now).run()

    return j({
      success: true,
      message: '퍼널 그룹이 생성되었습니다.',
      id: result.meta.last_row_id,
    })
  } catch (error) {
    console.error('Error creating group:', error)
    return j({ success: false, error: '그룹 생성 실패' }, 500)
  }
}
