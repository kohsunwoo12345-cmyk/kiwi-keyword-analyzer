/* 네이버 플레이스 순위 추적 스키마 (_ 프리픽스 = 라우팅 제외, import 전용)
 *
 * ⚠ 이 두 표는 다른 제품에서 이식되면서 스키마 보장이 함께 오지 않았다.
 *   코드는 읽고 쓰는데 어디서도 만들지 않아, 이 저장소가 만든 D1 에서는
 *   "추적 추가" 가 500 으로 죽고 목록은 늘 비어 있었다(실측).
 *   운영 DB 에 이식 당시의 표가 남아 있어 지금은 도는 것처럼 보일 수 있지만,
 *   D1 을 새로 만들면 그 순간 기능이 사라진다. 다른 기능들과 같은 방식으로 보장한다.
 *
 * 컬럼은 실제 질의에서 쓰는 것을 그대로 맞췄다(tracking.ts · rank.ts ·
 * rank-history.ts · tracking/[id].ts · tracking/[id]/share-settings.ts).
 */

let ready: Promise<void> | null = null

async function build(db: D1Database): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS naver_place_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    place_url TEXT,
    keyword TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'active',
    share_title TEXT,
    share_subtitle TEXT,
    share_thumbnail TEXT,
    last_check TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run().catch(() => {})
  await db.prepare(`CREATE TABLE IF NOT EXISTS naver_place_ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    place_url TEXT,
    keyword TEXT NOT NULL,
    location TEXT,
    rank_number INTEGER,
    total_count INTEGER,
    place_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run().catch(() => {})
  /* 순위 이력은 "이 장소·이 키워드의 가장 최근 값" 을 계속 뒤져 본다(목록 화면이
     추적 한 줄마다 네 번씩 찾는다). 색인이 없으면 이력이 쌓일수록 목록이 느려진다. */
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_npr_place_kw ON naver_place_ranks(place_id, keyword, created_at)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_npt_user ON naver_place_tracking(user_id, status)`).run().catch(() => {})
  //  이식 당시의 표가 이미 있으면 위 CREATE 는 지나간다 — 그때 빠져 있을 수 있는 칸만 덧댄다
  for (const col of ['share_title TEXT', 'share_subtitle TEXT', 'share_thumbnail TEXT', 'location TEXT', 'last_check TEXT'])
    await db.prepare(`ALTER TABLE naver_place_tracking ADD COLUMN ${col}`).run().catch(() => {})
  for (const col of ['location TEXT', 'place_name TEXT', 'total_count INTEGER'])
    await db.prepare(`ALTER TABLE naver_place_ranks ADD COLUMN ${col}`).run().catch(() => {})
}

/** 요청마다 반복하면 서브리퀘스트 한도를 갉아먹는다 — 이 아이솔레이트에서 한 번만 한다. */
export function ensurePlaceSchema(db: D1Database): Promise<void> {
  if (!ready) ready = build(db).catch(() => {})
  return ready
}
