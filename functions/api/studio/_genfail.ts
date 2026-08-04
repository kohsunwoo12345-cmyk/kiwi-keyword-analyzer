/* ══════════════════════════════════════════════════════════════════════════
   생성이 안 됐을 때 — 어디서 왜 막혔는지 남긴다
   ──────────────────────────────────────────────────────────────────────────
   여태 생성이 실패하면 아무 데도 안 남았다.
     · 제출 단계에서 막히면(얼굴 거절·모델 미개통 등) ai_usage 줄조차 안 생긴다.
       회원 화면에는 빨간 상자가 뜨고 끝이라, 관리자는 "무슨 일이 있었는지" 를 볼 길이 없었다.
     · 진행 중 실패는 환불만 하고 사유를 버렸다.
     · 결과물을 우리 R2 로 못 옮긴 것도 조용히 지나갔다("미리보기 없음" 의 정체).
   세 자리 전부 여기에 적는다. 관리자 생성기록의 [실패] 화면이 이 표를 읽는다.

   ⚠ 실패 기록이 생성을 막으면 안 된다. 여기서 나는 오류는 전부 삼킨다 —
     실패를 적다가 회원의 다음 생성이 죽으면 그게 더 큰 문제다.
   ══════════════════════════════════════════════════════════════════════════ */
import { ensureOnce } from '../_utils'

/** 어느 단계에서 막혔나 */
export type FailStage =
  | 'submit'    // 제공사에 넣는 순간 거절 — 대개 정책(얼굴)·모델 미개통·키 문제
  | 'run'       // 접수는 됐는데 만드는 도중 실패 — 환불 대상
  | 'archive'   // 영상은 나왔는데 우리 R2 로 못 옮겼다 — 남의 주소는 곧 만료된다

export type FailRow = {
  userId: string
  email?: string
  name?: string
  provider?: string
  model?: string
  kind?: string
  stage: FailStage
  reason: string
  taskKey?: string
  usageId?: string
  refunded?: number
  prompt?: string
}

async function create(db: D1Database) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS gen_failures (
       id TEXT PRIMARY KEY,
       user_id TEXT DEFAULT '', email TEXT DEFAULT '', name TEXT DEFAULT '',
       provider TEXT DEFAULT '', model TEXT DEFAULT '', kind TEXT DEFAULT '',
       stage TEXT DEFAULT '', reason TEXT DEFAULT '',
       task_key TEXT DEFAULT '', usage_id TEXT DEFAULT '',
       refunded REAL DEFAULT 0, prompt TEXT DEFAULT '',
       created_at TEXT NOT NULL
     )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_genfail_time ON gen_failures(created_at)').run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_genfail_user ON gen_failures(user_id, created_at)').run().catch(() => {})
  /* 같은 작업+단계는 한 줄만. 아래 SELECT 로도 걸러 내지만, 폴링이 겹치면 둘 다
     "아직 없다" 를 보고 둘 다 넣는다 — 그건 SELECT 로 막을 수 없다.
     작업 주소가 없는 실패(제출 거절)는 서로 다른 건이므로 이 규칙에서 뺀다.
     이미 중복이 쌓인 배포본에서는 이 색인이 안 만들어질 수 있다 — 그때는 예전처럼 SELECT 만으로 막는다. */
  await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_genfail_task_stage
    ON gen_failures(task_key, stage) WHERE task_key <> ''`).run().catch(() => {})
}
export function ensureGenFailures(db: D1Database) {
  return ensureOnce(db, 'schema_genfail_v1', () => create(db), ['gen_failures'])
}

/* 같은 실패를 두 번 적지 않는다.
   한 생성이 폴링으로 여러 번 조회되면 실패 응답도 여러 번 지나간다 — 그때마다 적으면
   화면이 같은 줄로 도배된다. 작업 주소+단계가 같으면 이미 적힌 것으로 본다. */
async function alreadyLogged(db: D1Database, taskKey: string, stage: string): Promise<boolean> {
  if (!taskKey) return false
  const r: any = await db.prepare(
    'SELECT 1 AS x FROM gen_failures WHERE task_key = ? AND stage = ? LIMIT 1')
    .bind(String(taskKey).slice(0, 300), stage).first().catch(() => null)
  return !!r
}

/** 실패 한 건을 남긴다. 절대 던지지 않는다. */
export async function recordGenFailure(db: D1Database | null, row: FailRow): Promise<void> {
  if (!db || !row || !row.reason) return
  try {
    await ensureGenFailures(db)
    if (await alreadyLogged(db, String(row.taskKey || ''), row.stage)) return
    await db.prepare(
      `INSERT OR IGNORE INTO gen_failures
         (id,user_id,email,name,provider,model,kind,stage,reason,task_key,usage_id,refunded,prompt,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(
        'gf_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20),
        String(row.userId || ''), String(row.email || ''), String(row.name || ''),
        String(row.provider || ''), String(row.model || ''), String(row.kind || ''),
        String(row.stage), String(row.reason).slice(0, 1200),
        String(row.taskKey || '').slice(0, 300), String(row.usageId || ''),
        Number(row.refunded) || 0, String(row.prompt || '').slice(0, 1000),
        new Date().toISOString(),
      ).run()
  } catch { /* 실패를 적다가 생성을 죽이지 않는다 */ }
}

/** 이미 적어 둔 실패에 환불액을 뒤늦게 채운다(환불은 기록 뒤에 확정될 수 있다).
 *  ⚠ 환불 대상은 'run' 뿐이다. 단계를 안 걸면 같은 작업의 'archive' 줄에도 같은 금액이
 *  적혀 관리자 합계가 두 배로 보인다(보관 실패는 환불하지 않는다). */
export async function markRefunded(db: D1Database | null, taskKey: string, credits: number): Promise<void> {
  if (!db || !taskKey || !(credits > 0)) return
  try {
    await ensureGenFailures(db)
    await db.prepare("UPDATE gen_failures SET refunded = ? WHERE task_key = ? AND stage = 'run' AND refunded = 0")
      .bind(credits, String(taskKey).slice(0, 300)).run()
  } catch { /* 표가 없으면 없는 대로 */ }
}
