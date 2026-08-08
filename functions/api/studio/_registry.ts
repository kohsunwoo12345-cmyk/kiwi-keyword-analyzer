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
import { ALIBABA_MODELS } from './_alibaba'
import { LTX_MODELS } from './_ltx'
import { RECRAFT_MODELS } from './_recraft'
import { BRIA_MODELS } from './_bria'
import { STABILITY_MODELS } from './_stability'

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
export async function ensureRegistry(db: D1Database) {
  await ensureOnce(db, 'schema_modelreg_v1', () => create(db), ['model_registry'])
  await seedAlibaba(db)
  await seedLtx(db)
  await seedRecraft(db)
  await enableRecraftRaster(db)
  await seedBria(db)
  await seedStability(db)
}

/* ── 알리바바 모델을 등록부에 한 번 심는다 ──────────────────────────────
   56개를 관리자가 손으로 등록하게 두면 반드시 몇 개가 빠진다. 코드에 표가 이미
   있으니(_alibaba.ts) 그대로 심는다. 심고 나면 다른 모델과 똑같이 다뤄진다 —
   관리자 화면에서 켜고 끄고, 단가를 덮고, 노드 피커에 뜬다.

   ⚠ INSERT OR IGNORE 다. 두 번 심지 않는다는 뜻이 아니라 **관리자가 손댄 것을
     덮지 않는다** 는 뜻이다. 껐거나 단가를 고쳐 둔 줄을 배포할 때마다 되돌리면
     관리자 화면이 아무 소용이 없어진다.
   ⚠ 실패해도 아무것도 막지 않는다. 등록부는 "있으면 더 보이는" 것이지
     없다고 스튜디오가 안 뜨면 안 된다. */
export async function seedAlibaba(db: D1Database) {
  return ensureOnce(db, 'seed_alibaba_v1', async () => {
    for (const r of ALIBABA_MODELS) {
      await db.prepare(
        `INSERT OR IGNORE INTO model_registry
           (name, cat, provider, model_id, kind, unit, usd, opts, enabled, verified_at, note, created_at)
         VALUES (?,?,?,?,?,?,?,?,1,?,?,?)`)
        .bind(r.name, r.cat, 'alibaba', r.id, r.kind, r.unit, r.usd,
              JSON.stringify(r.opts || {}), new Date().toISOString(),
              '알리바바 목록 API 로 확인된 모델' + (r.pinned ? ' · 날짜 고정판' : '') + ' · 단가 잠정',
              new Date().toISOString()).run()
    }
  }, ['model_registry'])
}

/* ── LTX 모델을 등록부에 심는다 — 단, **꺼진 채로** ────────────────────────
   알리바바와 딱 한 가지가 다르다: enabled 를 0 으로 심는다.

   왜 켜지 않는가. 알리바바 모델들은 운영 키로 제공사 목록 API 를 받아 "실재한다" 를
   확인하고 넣은 것이다. LTX 는 그 확인을 아직 못 했다 — 이 개발 환경에서 LTX 공식
   문서가 403 이라 모델 ID 표기(`ltx-2.3-pro` vs `ltx-2-3-pro`)조차 못 굳혔다.
   그 상태로 켜면 회원 노드 피커에 "고를 수는 있는데 누르면 404" 인 모델이 올라간다.
   이 파일 머리말이 경고하는 바로 그것이다.

   켜는 방법(배포된 서버에서, 1분):
     ① 관리자 → LTX 키 확인 을 연다 (읽기 전용 · 무과금)
     ② 판정이 "키가 작동합니다" 이고 모델 목록이 잡히면, 거기 나온 **실제 모델 ID** 를 본다
     ③ 관리자 → 모델 등록부 에서 그 ID 로 등록하거나, 이 줄의 스위치를 켠다
   ⚠ INSERT OR IGNORE 다. 관리자가 켜 둔 것을 배포할 때마다 도로 끄지 않는다. */
export async function seedLtx(db: D1Database) {
  return ensureOnce(db, 'seed_ltx_v1', async () => {
    for (const r of LTX_MODELS) {
      await db.prepare(
        `INSERT OR IGNORE INTO model_registry
           (name, cat, provider, model_id, kind, unit, usd, opts, enabled, verified_at, note, created_at)
         VALUES (?,?,?,?,?,?,?,?,0,NULL,?,?)`)
        .bind(r.name, r.cat, 'ltx', r.id, r.kind, r.unit, r.usd,
              JSON.stringify(r.opts || {}),
              '미확인 — 관리자 → LTX 키 확인 에서 제공사가 알려 준 모델 ID 를 본 뒤 켠다 · 단가 잠정',
              new Date().toISOString()).run()
    }
  }, ['model_registry'])
}

/* ── Recraft 모델도 **꺼진 채로** 심는다 ───────────────────────────────────
   LTX 와 이유가 조금 다르다. Recraft 는 모델 ID 를 공개 OpenAPI 명세의 enum 에서
   그대로 옮겼으니 "이름이 틀릴까" 걱정은 LTX 보다 훨씬 적다.
   그래도 켜지 않는 이유는 하나다 — **생성 경로가 아직 없다.** 이름이 맞든 틀리든
   지금 켜면 누르는 순간 실패한다. 켜고 안 켜고를 가르는 것은 이름이 아니라 경로다.

   그리고 벡터 모델에는 하나가 더 걸려 있다: 결과가 .svg 다. 우리 보관함·갤러리는
   png/jpg/webp 를 전제로 돈다. 이걸 안 풀고 켜면 "만들어지긴 했는데 화면에 안 뜨는"
   결과물이 쌓인다(_recraft.ts 머리말).

   켜는 순서: ① Recraft 키 확인(무과금)으로 키를 확정 → ② 생성 경로 연결
              → ③ 래스터부터 켜고, SVG 표시까지 되면 벡터를 켠다
   ⚠ INSERT OR IGNORE 다. 관리자가 켜 둔 것을 배포할 때마다 도로 끄지 않는다. */
export async function seedRecraft(db: D1Database) {
  return ensureOnce(db, 'seed_recraft_v1', async () => {
    for (const r of RECRAFT_MODELS) {
      await db.prepare(
        `INSERT OR IGNORE INTO model_registry
           (name, cat, provider, model_id, kind, unit, usd, opts, enabled, verified_at, note, created_at)
         VALUES (?,?,?,?,?,?,?,?,0,NULL,?,?)`)
        .bind(r.name, r.cat, 'recraft', r.id, r.kind, r.unit, r.usd,
              JSON.stringify(r.opts || {}),
              (r.vector ? '벡터(SVG) · 결과 표시 확인 필요 · ' : '')
                + '연결 전 — 관리자 → Recraft 키 확인 뒤 생성 경로를 붙이고 켠다 · 단가 잠정',
              new Date().toISOString()).run()
    }
  }, ['model_registry'])
}

/* ── Recraft 래스터를 켠다 ────────────────────────────────────────────────
   위 seedRecraft 는 전부 꺼진 채로 심었다. 그때는 생성 경로가 없었기 때문이다.
   이제 래스터 경로가 붙었으므로(generate.js · provider "recraft") 래스터만 켠다.

   ⚠ 벡터는 그대로 둔다. 결과가 .svg 라 보관함·업스케일이 받는지 확인 전이다.
     "만들어지긴 했는데 화면에 안 뜨는" 결과물이 쌓이는 쪽이 더 나쁘다.
   ⚠ 관리자가 꺼 둔 것을 되살리지 않는다 — 이미 손댄 줄인지 알 수 없으므로
     **처음 심은 그대로(enabled=0 이고 note 가 그때 문구인)** 인 줄만 켠다.
     관리자가 노트를 바꿨거나 켜 뒀다면 건드리지 않는다. */
export async function enableRecraftRaster(db: D1Database) {
  return ensureOnce(db, 'enable_recraft_raster_v1', async () => {
    for (const r of RECRAFT_MODELS) {
      if (r.vector) continue
      await db.prepare(
        `UPDATE model_registry SET enabled = 1, verified_at = ?, note = ?
          WHERE name = ? AND provider = 'recraft' AND enabled = 0 AND note LIKE '연결 전 —%'`)
        .bind(new Date().toISOString(),
              '키 확인됨(계정 조회 200 · 틀린 키 401) · 래스터 생성 경로 연결됨 · 단가 잠정',
              r.name).run()
    }
  }, ['model_registry'])
}

/* ── Bria 모델도 **꺼진 채로** 심는다 ─────────────────────────────────────
   이유는 Recraft 와 같다 — 경로(모델 이름)는 공식 노드 코드에서 그대로 읽었으니
   이름 걱정은 없다. 못 켜는 건 **생성 경로가 아직 없어서**다.

   Bria 에는 연결할 때 풀어야 할 것이 두 개 더 있다(_bria.ts 머리말):
     ① 인증이 `api_token` 헤더다 — 다른 제공사처럼 Bearer 로 보내면 전부 401 이다
     ② v2 는 비동기다 — request_id·status_url 폴링과 실패 환불이 붙어야 한다
   편집 모델(needsImage)은 원본 이미지가 없으면 아무 의미가 없다는 것도 노드 쪽에서
   같이 챙겨야 한다. 그래서 opts 에 needsImage 를 실어 둔다.
   ⚠ INSERT OR IGNORE 다. 관리자가 켜 둔 것을 배포할 때마다 도로 끄지 않는다. */
export async function seedBria(db: D1Database) {
  return ensureOnce(db, 'seed_bria_v1', async () => {
    for (const r of BRIA_MODELS) {
      await db.prepare(
        `INSERT OR IGNORE INTO model_registry
           (name, cat, provider, model_id, kind, unit, usd, opts, enabled, verified_at, note, created_at)
         VALUES (?,?,?,?,?,?,?,?,0,NULL,?,?)`)
        .bind(r.name, r.cat, 'bria', r.id, r.kind, r.unit, r.usd,
              JSON.stringify({ ...(r.opts || {}), needsImage: r.needsImage }),
              (r.needsImage ? '원본 이미지 필요 · ' : '')
                + '연결 전 — 관리자 → Bria 키 확인 뒤 생성 경로를 붙이고 켠다 · 단가 잠정',
              new Date().toISOString()).run()
    }
  }, ['model_registry'])
}

/* ── Stability 모델도 **꺼진 채로** 심는다 ────────────────────────────────
   앞선 셋과 이유가 하나 더 있다. 경로는 공개 명세에서 그대로 읽었고 생성 경로가 아직
   없는 것도 같지만, 여기는 **단가가 특히 위험하다** — 2026년 8월에 장당 크레딧이 크게
   바뀌었다는 보고가 있다(_stability.ts 머리말). 표가 틀린 채로 켜면 회원이 쓸 때마다
   그 차액을 우리가 물고, 그건 되돌릴 수 없다.

   켜는 순서: ① Stability 키 확인(무과금)으로 키 확정 → ② 생성 경로 연결
              → ③ **관리자 → 모델 단가에 청구서 실측값을 넣고** → ④ 켠다
   ⚠ INSERT OR IGNORE 다. 관리자가 켜 둔 것을 배포할 때마다 도로 끄지 않는다. */
export async function seedStability(db: D1Database) {
  return ensureOnce(db, 'seed_stability_v1', async () => {
    for (const r of STABILITY_MODELS) {
      await db.prepare(
        `INSERT OR IGNORE INTO model_registry
           (name, cat, provider, model_id, kind, unit, usd, opts, enabled, verified_at, note, created_at)
         VALUES (?,?,?,?,?,?,?,?,0,NULL,?,?)`)
        .bind(r.name, r.cat, 'stability', r.id, r.kind, r.unit, r.usd,
              JSON.stringify(r.opts || {}),
              '연결 전 — 키 확인 뒤 생성 경로를 붙이고, 단가를 실측값으로 덮은 다음 켠다 '
              + '(2026-08 크레딧 변경 보고 있음)',
              new Date().toISOString()).run()
    }
  }, ['model_registry'])
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
