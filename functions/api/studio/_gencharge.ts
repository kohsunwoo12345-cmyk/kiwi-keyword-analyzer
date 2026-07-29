/* 생성 과금 토큰 — "무엇을 만들었는지" 를 서버가 정하게 한다.
 *
 * 스튜디오 경로(/api/generate)는 잔액만 확인하고 차감하지 않는다. 실제 차감은
 * 클라이언트가 부르는 /api/usage/record 가 하는데, 거기서 모델 이름을 요청 본문에서
 * 그대로 받아 썼다. 길이·해상도·종류는 서버가 다시 계산하도록 막아 뒀는데 모델만 빠져 있었다.
 * 그래서 비싼 모델로 만들고 싼 모델로 신고하면 그 차액만큼 덜 냈고,
 * 아예 신고하지 않으면 한 푼도 내지 않았다.
 *
 * 생성 시점에 서버가 확정한 값(모델·길이·해상도·옵션)을 토큰에 묶어 두고,
 * 차감할 때 그 토큰의 값을 쓴다. 토큰은 한 번만 쓸 수 있어 중복 청구도 막힌다.
 *
 * 토큰이 없으면 예전처럼 요청 본문 값으로 계산한다 — 구버전 클라이언트가 갑자기
 * 과금되지 않는 일이 없도록 한 폴백이다.
 */

export interface GenChargeSpec {
  model: string
  units: number
  res?: string
  audio?: boolean
  ratio?: string
  refs?: number
  cn?: number
  hdr?: boolean
  exr?: boolean
}

export async function ensureGenCharges(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS gen_charges (
         id TEXT PRIMARY KEY, user_id TEXT NOT NULL, model TEXT NOT NULL,
         units REAL, res TEXT, audio INTEGER, ratio TEXT, refs INTEGER, cn INTEGER,
         hdr INTEGER, exr INTEGER, created_at TEXT, consumed_at TEXT )`,
    )
    .run()
    .catch(() => {})
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_gen_charges_user ON gen_charges (user_id, created_at)`)
    .run()
    .catch(() => {})
}

/** 생성 직전에 서버가 확정한 값을 저장하고 토큰을 돌려준다. 실패해도 생성은 막지 않는다. */
export async function issueGenCharge(db: D1Database, userId: string, spec: GenChargeSpec): Promise<string | null> {
  try {
    await ensureGenCharges(db)
    const id = 'gc_' + crypto.randomUUID().replace(/-/g, '')
    await db
      .prepare(
        `INSERT INTO gen_charges (id,user_id,model,units,res,audio,ratio,refs,cn,hdr,exr,created_at,consumed_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL)`,
      )
      .bind(
        id, String(userId), String(spec.model || ''), Number(spec.units) || 0,
        spec.res == null ? null : String(spec.res), spec.audio ? 1 : 0,
        spec.ratio == null ? null : String(spec.ratio),
        Math.max(0, Number(spec.refs) || 0), Math.max(0, Number(spec.cn) || 0),
        spec.hdr ? 1 : 0, spec.exr ? 1 : 0, new Date().toISOString(),
      )
      .run()
    return id
  } catch {
    return null // 토큰 발급 실패는 생성을 막지 않는다 — 폴백 경로로 과금된다
  }
}

/** 토큰을 한 번만 쓰도록 소비하고 서버가 저장해 둔 값을 돌려준다. 못 쓰면 null. */
export async function consumeGenCharge(
  db: D1Database,
  userId: string,
  token: string,
): Promise<(GenChargeSpec & { alreadyConsumed?: boolean }) | null> {
  const id = String(token || '').trim()
  if (!id) return null
  try {
    await ensureGenCharges(db)
    const row: any = await db
      .prepare(`SELECT * FROM gen_charges WHERE id = ? AND user_id = ?`)
      .bind(id, String(userId))
      .first()
    if (!row) return null
    // 이미 쓴 토큰이면 두 번째 요청은 과금하지 않는다(재시도·중복 전송으로 두 번 빠지는 것을 막는다).
    if (row.consumed_at) return { model: String(row.model || ''), units: Number(row.units) || 0, alreadyConsumed: true }
    const upd: any = await db
      .prepare(`UPDATE gen_charges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL`)
      .bind(new Date().toISOString(), id)
      .run()
    // 동시에 두 번 들어와도 UPDATE 가 한 번만 성공한다 → 한쪽만 과금된다.
    if (!upd?.meta?.changes) return { model: String(row.model || ''), units: Number(row.units) || 0, alreadyConsumed: true }
    return {
      model: String(row.model || ''),
      units: Number(row.units) || 0,
      res: row.res == null ? undefined : String(row.res),
      audio: !!row.audio,
      ratio: row.ratio == null ? undefined : String(row.ratio),
      refs: Number(row.refs) || 0,
      cn: Number(row.cn) || 0,
      hdr: !!row.hdr,
      exr: !!row.exr,
    }
  } catch {
    return null
  }
}
