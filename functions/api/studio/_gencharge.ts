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
  /* 실제로 얼마를 뺐는지와, 어느 제공사 작업의 것인지 — 비동기 영상이 실패했을 때
     그 금액을 되돌리려면 둘 다 필요하다(기존 표에는 없어서 추가한다). */
  for (const col of ['credits REAL DEFAULT 0', "task_key TEXT DEFAULT ''", "status TEXT DEFAULT ''", "usage_id TEXT DEFAULT ''"])
    await db.prepare(`ALTER TABLE gen_charges ADD COLUMN ${col}`).run().catch(() => {})
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
): Promise<(GenChargeSpec & { alreadyConsumed?: boolean; usageId?: string }) | null> {
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
    /* 이미 소비된 토큰이라도 "그 생성이 어느 줄에 기록됐는지" 는 알려 준다.
       보관 신고(usage/record)가 프롬프트·결과물을 그 줄에 붙일 때 쓴다 —
       클라이언트가 chargeRef 를 되돌려 주지 않아도(오래된 캐시 등) 서버끼리 이어진다. */
    if (row.consumed_at) return { model: String(row.model || ''), units: Number(row.units) || 0,
                                  usageId: String(row.usage_id || ''), alreadyConsumed: true }
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

/* ── 생성 시점 차감 ──
   토큰을 만들어 응답에 실어 보내는 것만으로는 "싸게 신고하는" 쪽만 막힌다.
   차감 자체가 여전히 클라이언트가 부르는 신고 창구(/api/usage/record)에서 일어나기 때문에,
   그 호출을 아예 생략하면 생성물은 받고 요금은 0 이었다 — 제공사 비용은 우리가 이미 냈는데도.
   그래서 생성이 성공한 그 자리에서 서버가 토큰을 직접 소비하고 차감한다.
   신고 창구는 이제 늘 "이미 청구됨" 을 보게 되고, 보관·아카이브만 맡는다. */
export async function settleGenCharge(
  db: D1Database, me: any, token: string, taskKey: string | null,
  deps: {
    computeCharge: any; getUsdKrw: any; resolveMarkup: any; resolveRefSurcharge: any
    resolveCnSurcharge: any; creditPriceFor: any; ensureAiUsage: any; resolveCostOverride?: any
  },
): Promise<{ credits: number; usageId: string }> {
  const NONE = { credits: 0, usageId: '' }
  if (!db || !me?.id || me.role === 'admin') return NONE          // 관리자는 기존 게이트와 동일하게 면제
  const spec = await consumeGenCharge(db, String(me.id), token)
  if (!spec || spec.alreadyConsumed) return NONE                  // 없는/이미 쓴 토큰 → 청구 안 함
  try {
    const rate = await deps.getUsdKrw(db)
    const markup = await deps.resolveMarkup(db, me.id, spec.model, Number(me.credit_markup) || 0)
    const creditKrw = await deps.creditPriceFor(db, me)
    //  관리자가 청구서를 보고 넣은 실측 단가가 있으면 그 값으로 청구한다(추정보다 정확하다)
    const ovUsd = deps.resolveCostOverride ? await deps.resolveCostOverride(db, spec.model) : undefined
    const c = deps.computeCharge(
      { model: spec.model, units: spec.units, res: spec.res, audio: !!spec.audio,
        ratio: spec.ratio, refs: spec.refs || 0, hdr: !!spec.hdr, exr: !!spec.exr },
      rate, markup, creditKrw, ovUsd)
    const surPct = await deps.resolveRefSurcharge(db, me.id)
    const cnPct = (spec.cn || 0) > 0 ? await deps.resolveCnSurcharge(db) : 0
    const credits = Math.round(
      c.credits * (1 + (surPct / 100) * (spec.refs || 0)) * ((spec.cn || 0) > 0 ? 1 + cnPct / 100 : 1) * 100) / 100
    if (!(credits > 0)) return NONE

    /* 잔액이 모자라도 원가 전액을 뺀다 — 생성은 끝났고 제공사 비용은 나갔다.
       (음수가 되면 다음 생성은 /api/generate 의 credits>0 게이트에서 막힌다 = 미납 잠금) */
    await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) - ?, 2) WHERE id = ?')
      .bind(credits, me.id).run()
    const row: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first().catch(() => null)
    const after = Math.round((Number(row?.credits) || 0) * 100) / 100
    await db.prepare(
      `UPDATE gen_charges SET credits = ?, task_key = ?, status = 'charged' WHERE id = ?`,
    ).bind(credits, String(taskKey || ''), token).run().catch(() => {})
    await db.prepare(
      `INSERT INTO transactions (id,user_id,kind,amount,balance_after,memo,created_at) VALUES (?,?,'credit',?,?,?,?)`,
    ).bind('t_' + crypto.randomUUID().slice(0, 16), me.id, -credits, after,
           'AI 생성 · ' + c.model, new Date().toISOString()).run().catch(() => {})
    let usageId = ''
    try {
      await deps.ensureAiUsage(db)
      usageId = 'au' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      await db.prepare(
        `INSERT INTO ai_usage (id,user_id,email,name,provider,model,kind,units,usd,cost_krw,credits,revenue_krw,markup,usd_krw,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).bind(usageId, me.id, me.email || '', me.name || '', c.provider, c.model, c.kind,
             spec.units, c.usd, c.costKrwExact, credits, Math.round(credits * creditKrw),
             c.markup, c.usdKrw, new Date().toISOString()).run()
    } catch { usageId = '' }
    //  이 생성이 기록된 줄 번호를 토큰에 적어 둔다 — 보관 신고가 나중에 같은 줄을 찾아 붙는다.
    if (usageId) await db.prepare('UPDATE gen_charges SET usage_id = ? WHERE id = ?').bind(usageId, token).run().catch(() => {})
    return { credits, usageId }
  } catch {
    return NONE
  }
}

/** 비동기 생성이 실패로 확정되면 제출 때 뺀 금액을 정확히 한 번만 되돌린다. */
export async function refundGenCharge(db: D1Database, taskKey: string): Promise<number> {
  if (!db || !taskKey) return 0
  try {
    await ensureGenCharges(db)
    const row: any = await db.prepare(
      `SELECT id, user_id, credits, model FROM gen_charges WHERE task_key = ? AND status = 'charged' LIMIT 1`,
    ).bind(String(taskKey).slice(0, 300)).first()
    if (!row) return 0
    const amt = Math.round(Number(row.credits || 0) * 100) / 100
    if (!(amt > 0)) return 0
    // 조건부 UPDATE — 동시에 두 번 들어와도 한쪽만 성공한다(환불이 두 번 나가지 않는다).
    const upd: any = await db.prepare(
      `UPDATE gen_charges SET status = 'refunded' WHERE id = ? AND status = 'charged'`,
    ).bind(row.id).run()
    if (!upd?.meta?.changes) return 0
    await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) + ?, 2) WHERE id = ?')
      .bind(amt, row.user_id).run()
    const u2: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(row.user_id).first().catch(() => null)
    const after = Math.round((Number(u2?.credits) || 0) * 100) / 100
    await db.prepare(
      `INSERT INTO transactions (id,user_id,kind,amount,balance_after,memo,created_at) VALUES (?,?,'credit',?,?,?,?)`,
    ).bind('t_' + crypto.randomUUID().slice(0, 16), row.user_id, amt, after,
           '생성 실패 환불 · ' + String(row.model || ''), new Date().toISOString()).run().catch(() => {})
    return amt
  } catch {
    return 0
  }
}
