// Ported from SUPERPLACE: 블로그 순위 추적 공용 헬퍼 (src/index.tsx ~125562)
// (_ 프리픽스 = Pages 라우팅 제외, import 전용)
// NOTE: 우리 users.id 는 TEXT → user_id/academy_id 컬럼을 TEXT 로 정의하고 String(me.id) 사용
import { getSessionUser } from '../_utils'

export async function initBrtTables(db: any) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS blog_rank_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    academy_id TEXT,
    blog_id TEXT,
    blog_url TEXT NOT NULL,
    keyword TEXT NOT NULL,
    latest_rank INTEGER,
    prev_rank INTEGER,
    last_checked_date TEXT,
    last_result_source TEXT,
    last_total_checked INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS blog_rank_track_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    rank INTEGER,
    checked_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run()
  try { await db.prepare(`ALTER TABLE blog_rank_tracks ADD COLUMN blog_id TEXT`).run() } catch (_) {}
  try { await db.prepare(`ALTER TABLE blog_rank_tracks ADD COLUMN last_result_source TEXT`).run() } catch (_) {}
  try { await db.prepare(`ALTER TABLE blog_rank_tracks ADD COLUMN last_total_checked INTEGER DEFAULT 0`).run() } catch (_) {}
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_blog_rank_tracks_user_status ON blog_rank_tracks(user_id, status)`).run() } catch (_) {}
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_blog_rank_history_track_date ON blog_rank_track_history(track_id, checked_date)`).run() } catch (_) {}
}

/** 한국 날짜(YYYY-MM-DD).
 *  checked_date 는 "며칠자 순위" 를 담는 칸이라 반드시 한국 날짜여야 한다.
 *  UTC 로 계산하면 한국 00:00~09:00 사이의 확인이 전날로 들어간다 —
 *  아침에 한 번, 낮에 한 번 보면 같은 날인데 두 줄이 되고 7일 그래프의 하루가 통째로 빈다.
 *  같은 이유로 "오늘 것은 지우고 다시 넣는" 중복 제거도 엉뚱한 날을 지운다. */
export function kstDate(d: Date = new Date()): string {
  try { return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }) }
  catch { return new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10) }
}

/** 세션 사용자 → { userId(TEXT), isAdmin, academyId(TEXT) }. 우리 스키마엔 academy_id/user_type 이 없으므로 role 만 사용. */
export async function getBrtUser(request: Request, db: any): Promise<{ userId: string, isAdmin: boolean, academyId: string } | null> {
  try {
    const me: any = await getSessionUser(request, db)
    if (!me) return null
    const userId = String(me.id)
    const isAdmin = me.role === 'admin'
    return { userId, isAdmin, academyId: userId }
  } catch { return null }
}
