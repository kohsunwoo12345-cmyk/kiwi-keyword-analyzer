// Ported from SUPERPLACE: POST /api/blog-analysis/monitoring/add — 키워드 순위 모니터링 추가
import { json, resolveDB, getSessionUser } from '../../_utils'

async function ensureMonitoringSchema(db: any) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      blog_url TEXT,
      blog_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rank_monitoring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      blog_id INTEGER,
      keyword TEXT,
      current_rank INTEGER,
      previous_rank INTEGER,
      best_rank INTEGER,
      worst_rank INTEGER,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rank_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitoring_id INTEGER,
      rank INTEGER,
      check_date TEXT DEFAULT CURRENT_TIMESTAMP
    )`),
  ])
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureMonitoringSchema(db)

    const user: any = await getSessionUser(request, db)
    if (!user) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    const { keyword, blogUrl } = await request.json() as any

    if (!keyword || !blogUrl) {
      return json({ success: false, error: '키워드와 블로그 URL을 입력해주세요.' }, 400)
    }

    // 블로그 조회 또는 생성
    const blog = await db.prepare(`
      SELECT id FROM blogs WHERE user_id = ? AND blog_url = ?
    `).bind(user.id, blogUrl).first()

    let blogId = blog?.id

    if (!blogId) {
      const blogResult = await db.prepare(`
        INSERT INTO blogs (user_id, blog_url, blog_id)
        VALUES (?, ?, ?)
      `).bind(user.id, blogUrl, blogUrl.split('/').pop()).run()

      blogId = blogResult.meta.last_row_id
    }

    // 현재 순위 조회 (샘플)
    const currentRank = Math.floor(Math.random() * 50) + 1

    // 모니터링 추가
    const result = await db.prepare(`
      INSERT INTO rank_monitoring
      (user_id, blog_id, keyword, current_rank, previous_rank, best_rank, worst_rank)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(user.id, blogId, keyword, currentRank, currentRank, currentRank, currentRank).run()

    // 이력 추가
    await db.prepare(`
      INSERT INTO rank_history (monitoring_id, rank)
      VALUES (?, ?)
    `).bind(result.meta.last_row_id, currentRank).run()

    return json({
      success: true,
      monitoring_id: result.meta.last_row_id,
      current_rank: currentRank,
      message: '모니터링이 추가되었습니다.'
    })
  } catch (error) {
    console.error('Monitoring add error:', error)
    return json({ success: false, error: '모니터링 추가 중 오류가 발생했습니다.' }, 500)
  }
}
