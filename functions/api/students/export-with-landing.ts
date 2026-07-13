import { json, getSessionUser, resolveDB } from '../_utils'

// GET /api/students/export-with-landing → 학생 목록 + 최신 랜딩페이지 URL CSV 다운로드
// SUPERPLACE Hono 라우트 이식. 세션 사용자 기준.
export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 연결 실패' }, 500)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)
    const userId = String(me.id)
    const userRow: any = await db.prepare('SELECT id, academy_id FROM users WHERE id = ?').bind(userId).first()
    const academyId = userRow?.academy_id || userId

    const studentsResult = await db
      .prepare(
        `SELECT id, name, parent_phone FROM students
         WHERE academy_id = ? AND (status IS NULL OR status != 'deleted') ORDER BY name ASC`,
      )
      .bind(academyId)
      .all()
    const students = studentsResult.results || []

    const landingPagesResult = await db
      .prepare(`SELECT id, title, slug, created_at FROM landing_pages WHERE user_id = ? ORDER BY created_at DESC`)
      .bind(userId)
      .all()
    const landingPages = landingPagesResult.results || []

    const origin = 'https://wearesuperplace.com'
    const studentLandingMap: Record<string, string> = {}
    for (const page of landingPages as any[]) {
      const title = (page.title as string) || ''
      for (const student of students as any[]) {
        const sName = (student.name as string) || ''
        if (sName && title.includes(sName) && !studentLandingMap[sName]) {
          studentLandingMap[sName] = `${origin}/landing/${page.slug}`
        }
      }
    }

    let csv = '\uFEFF'
    csv += '학생 이름,랜딩페이지 URL,학부모 연락처\n'
    for (const student of students as any[]) {
      const name = String(student.name || '').replace(/"/g, '""')
      const url = String(studentLandingMap[student.name as string] || '')
      const phone = ''
      csv += `"${name}","${url}","${phone}"\n`
    }

    const dateStr = new Date().toISOString().split('T')[0]
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="students_sms_${dateStr}.csv"`,
      },
    })
  } catch (error: any) {
    return json({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
