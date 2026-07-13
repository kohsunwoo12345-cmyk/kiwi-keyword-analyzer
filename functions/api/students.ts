import { json, getSessionUser, resolveDB } from './_utils'

// GET /api/students → 세션 사용자(학원)의 학생 목록. SUPERPLACE Hono 라우트 이식.
export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 연결 실패' }, 500)

    // 세션 DB 조회로 인증 (헤더/쿼리 위조 방지)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)
    const userId = me.id
    const academyId = me.academy_id || me.id

    let students: any[] = []
    try {
      // students + classes JOIN (class_name, class_fee 포함)
      const result1 = await db
        .prepare(
          `SELECT s.*, c.name as class_name, COALESCE(c.monthly_fee, 0) as class_fee
           FROM students s
           LEFT JOIN classes c ON s.class_id = c.id
           WHERE s.academy_id = ? AND (s.status IS NULL OR s.status != 'deleted')
           ORDER BY s.id DESC`,
        )
        .bind(academyId)
        .all()
      students = result1.results || []
    } catch (joinErr) {
      try {
        const result1 = await db
          .prepare(
            `SELECT * FROM students WHERE academy_id = ? AND (status IS NULL OR status != 'deleted') ORDER BY id DESC`,
          )
          .bind(academyId)
          .all()
        students = result1.results || []
      } catch (err1) {
        // 보안: academy_id 필터링 실패 시 절대 전체 학생을 반환하지 않음
        students = []
      }
    }

    return json({ success: true, students })
  } catch (error) {
    return json({ success: false, error: '학생 목록 조회 실패: ' }, 500)
  }
}
