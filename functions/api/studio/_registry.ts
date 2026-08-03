/* ══════════════════════════════════════════════════════════════════════════
   모델 등록부 — 코드를 고치지 않고 모델을 늘린다
   ──────────────────────────────────────────────────────────────────────────
   스튜디오의 모델 표(MODELS·MODEL_COST·MODEL_PROVIDER·MODEL_OPTS)는 index.html 에
   박혀 있다. 제공사가 새 모델을 내놓을 때마다 코드를 고치고 배포해야 했다.

   여기 등록된 것은 스튜디오가 뜰 때 그 표들에 얹힌다 — 배포 없이 노드에 나타난다.
   ⚠ 등록 전에 반드시 "그 모델이 실제로 있는가" 를 제공사에 물어 확인한다(무과금).
     확인 없이 넣으면 회원이 고를 수는 있는데 누르면 404 가 나는 모델이 생긴다.
   ══════════════════════════════════════════════════════════════════════════ */
import { ensureOnce } from '../_utils'

export type ModelRow = {
  name: string          // 스튜디오 표시명 (모델 표의 열쇠)
  cat: string           // 피커 분류 — '영상' · '영상 · Kling' · '이미지' 등
  provider: string      // seedance · kling · seedream · flux · openai …
  modelId: string       // 제공사가 아는 모델 ID
  kind: string          // video | image | 3d
  unit: string          // sec | img | 3d | tok
  usd: number           // 단위당 원가(달러)
  opts: any             // { secs, ratios, res, audio, watermark, neg }
  enabled: number
  verifiedAt?: string | null
  note?: string | null
}

async function create(db: D1Database) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS model_registry (
       name TEXT PRIMARY KEY,
       cat TEXT NOT NULL,
       provider TEXT NOT NULL,
       model_id TEXT NOT NULL,
       kind TEXT NOT NULL,
       unit TEXT NOT NULL,
       usd REAL NOT NULL,
       opts TEXT,
       enabled INTEGER NOT NULL DEFAULT 1,
       verified_at TEXT,
       note TEXT,
       created_at TEXT
     )`).run()
}
export function ensureRegistry(db: D1Database) {
  return ensureOnce(db, 'schema_modelreg_v1', () => create(db), ['model_registry'])
}

const parseOpts = (s: any) => { try { return JSON.parse(String(s || '{}')) } catch { return {} } }

/** 스튜디오에 얹을 목록. 켜져 있는 것만. */
export async function listEnabled(db: D1Database): Promise<ModelRow[]> {
  await ensureRegistry(db)
  const r: any = await db.prepare(
    `SELECT name, cat, provider, model_id, kind, unit, usd, opts, enabled, verified_at, note
       FROM model_registry WHERE enabled = 1 ORDER BY cat, name`).all()
  return (((r && r.results) || []) as any[]).map((x) => ({
    name: String(x.name), cat: String(x.cat), provider: String(x.provider),
    modelId: String(x.model_id), kind: String(x.kind), unit: String(x.unit),
    usd: Number(x.usd) || 0, opts: parseOpts(x.opts), enabled: 1,
    verifiedAt: x.verified_at || null, note: x.note || null,
  }))
}

/** 관리자 화면용 — 꺼진 것까지 전부. */
export async function listAll(db: D1Database): Promise<ModelRow[]> {
  await ensureRegistry(db)
  const r: any = await db.prepare(
    `SELECT name, cat, provider, model_id, kind, unit, usd, opts, enabled, verified_at, note
       FROM model_registry ORDER BY cat, name`).all()
  return (((r && r.results) || []) as any[]).map((x) => ({
    name: String(x.name), cat: String(x.cat), provider: String(x.provider),
    modelId: String(x.model_id), kind: String(x.kind), unit: String(x.unit),
    usd: Number(x.usd) || 0, opts: parseOpts(x.opts), enabled: Number(x.enabled) ? 1 : 0,
    verifiedAt: x.verified_at || null, note: x.note || null,
  }))
}

export async function upsert(db: D1Database, row: ModelRow) {
  await ensureRegistry(db)
  await db.prepare(
    `INSERT INTO model_registry (name, cat, provider, model_id, kind, unit, usd, opts, enabled, verified_at, note, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(name) DO UPDATE SET
       cat = excluded.cat, provider = excluded.provider, model_id = excluded.model_id,
       kind = excluded.kind, unit = excluded.unit, usd = excluded.usd, opts = excluded.opts,
       enabled = excluded.enabled, verified_at = excluded.verified_at, note = excluded.note`)
    .bind(row.name, row.cat, row.provider, row.modelId, row.kind, row.unit,
          Number(row.usd) || 0, JSON.stringify(row.opts || {}),
          row.enabled ? 1 : 0, row.verifiedAt || null, row.note || null,
          new Date().toISOString()).run()
}

export async function setEnabled(db: D1Database, name: string, on: boolean) {
  await ensureRegistry(db)
  await db.prepare('UPDATE model_registry SET enabled = ? WHERE name = ?')
    .bind(on ? 1 : 0, String(name)).run()
}

export async function remove(db: D1Database, name: string) {
  await ensureRegistry(db)
  await db.prepare('DELETE FROM model_registry WHERE name = ?').bind(String(name)).run()
}

/** 등록부에 있는 모델의 제공사 모델 ID — 생성 경로가 이걸로 실제 호출한다. */
export async function modelIdOf(db: D1Database, name: string): Promise<{ provider: string; modelId: string } | null> {
  if (!name) return null
  await ensureRegistry(db)
  const r: any = await db.prepare(
    'SELECT provider, model_id FROM model_registry WHERE name = ? AND enabled = 1').bind(String(name)).first()
  return r ? { provider: String(r.provider), modelId: String(r.model_id) } : null
}
