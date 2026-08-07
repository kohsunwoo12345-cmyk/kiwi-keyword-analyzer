import { ensureOnce } from '../_utils'
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

/* ⚠ 표 만들기는 한 번이면 된다. 요청마다 반복하면 Cloudflare 가 D1 질의 하나하나를
   서브리퀘스트로 세어 요청당 한도를 갉아먹는다(실측 회원 41회 · 관리자 5회 — 관리자는
   이 경로를 아예 안 탄다). ⚠ 이 차이가 회원 502 의 원인이라고 적어 두었는데 확인된 게 아니다:
   당시 무료 요금제로 알고 계산했지만 실제 계정은 Workers 유료였다. 왕복을 줄이는 근거일 뿐이다.
   같은 isolate 안에서는 한 번만 하고, 실패하면 다음 요청에서 다시 시도한다. */
/* ⚠ 아래 칸을 새로 추가하면 이 열쇠의 번호를 반드시 올려야 한다 —
     ensureOnce 는 "표시가 있고 그 표가 있으면" 통째로 건너뛴다. 번호를 그대로 두면
     새 칸은 이미 도는 DB(=운영)에 영영 안 생긴다(_pricing.ts ensureAiUsage 주석 참조).
     v1 → v2: swept_at·sweep_tries 추가(방치된 차감을 되찾는 그물). */
export async function ensureGenCharges(db: D1Database): Promise<void> {
  return ensureOnce(db, 'schema_gencharges_v2', () => __ensureGenCharges(db), ['gen_charges'])
}
async function __ensureGenCharges(db: D1Database): Promise<void> {
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
  /* swept_at·sweep_tries — 결말이 안 온 차감을 서버가 뒤늦게 확인할 때 쓴다.
     브라우저가 폴링을 끝까지 해 줘야만 환불이 일어나던 구조라, 탭을 닫거나 폴링이
     시간을 넘기면 차감만 남았다(= 만들어지지 않았는데 돈이 나간 자리). */
  for (const col of ['credits REAL DEFAULT 0', "task_key TEXT DEFAULT ''", "status TEXT DEFAULT ''",
                     "usage_id TEXT DEFAULT ''", 'reconciled_at TEXT',
                     'swept_at TEXT', 'sweep_tries INTEGER DEFAULT 0'])
    await db.prepare(`ALTER TABLE gen_charges ADD COLUMN ${col}`).run().catch(() => {})
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_gen_charges_user ON gen_charges (user_id, created_at)`)
    .run()
    .catch(() => {})
  //  그물이 매시간 훑는 조건 — 색인이 없으면 표가 커질수록 훑는 값이 비싸진다
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_gen_charges_sweep ON gen_charges (status, swept_at, created_at)`)
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

/* ── 제공사 실측 정산 ──
   비동기 영상은 "제출된 순간" 에 차감한다. 그때는 아직 제공사가 얼마를 청구할지 모르므로
   해상도·길이·fps 로 토큰 수를 추정해서 매긴다(ModelArk 의 공식과 같은 식이다).
   완료 응답에는 제공사가 실제로 쓴 토큰 수(usage.completion_tokens)가 들어온다.
   추정과 실측이 어긋나면 그 차액만큼 회원이 더 내거나 덜 낸 채로 끝난다 —
   완료 시점에 정확히 한 번 차액만 맞춘다(더 받았으면 돌려주고, 덜 받았으면 더 뺀다).

   status 는 'charged' 그대로 둔다 — 나중에 실패로 뒤집혀도 환불 경로가 그대로 동작해야 한다.
   중복 실행은 reconciled_at 조건부 UPDATE 로 막는다(폴링은 여러 번 들어온다). */
export async function reconcileGenCharge(
  db: D1Database, taskKey: string, usageTokens: number,
  deps: {
    computeCharge: any; getUsdKrw: any; resolveMarkup: any; resolveRefSurcharge: any
    resolveCnSurcharge: any; creditPriceFor: any; resolveCostOverride?: any
  },
): Promise<number> {
  if (!db || !taskKey || !(Number(usageTokens) > 0)) return 0
  try {
    await ensureGenCharges(db)
    //  같은 작업 주소가 두 번 나올 수 있다 — 가장 최근 것이 지금 끝난 그 생성이다(환불과 같은 이유).
    const row: any = await db.prepare(
      `SELECT * FROM gen_charges WHERE task_key = ? AND status = 'charged' AND reconciled_at IS NULL
        ORDER BY created_at DESC LIMIT 1`,
    ).bind(String(taskKey).slice(0, 300)).first()
    if (!row) return 0
    // 먼저 자리를 잡는다 — 동시에 두 번 들어와도 한쪽만 통과한다.
    const claim: any = await db.prepare(
      `UPDATE gen_charges SET reconciled_at = ? WHERE id = ? AND reconciled_at IS NULL`,
    ).bind(new Date().toISOString(), row.id).run()
    if (!claim?.meta?.changes) return 0

    const me: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(String(row.user_id)).first()
    if (!me) return 0
    /* 관리자가 청구서를 보고 넣은 실측 단가가 있으면 그게 우선이다 — 그건 "이 값으로 청구하라" 는
       명시적 지시라서, 제공사 토큰 수로 다시 계산해 덮으면 그 지시를 말없이 뒤집는 것이 된다.
       (reconciled_at 은 이미 찍었으므로 폴링이 계속 들어와도 여기서 반복 조회하지 않는다.) */
    const ovUsd = deps.resolveCostOverride ? await deps.resolveCostOverride(db, String(row.model || '')) : undefined
    if (Number.isFinite(Number(ovUsd)) && Number(ovUsd) > 0) return 0
    const rate = await deps.getUsdKrw(db)
    const markup = await deps.resolveMarkup(db, me.id, String(row.model || ''), Number(me.credit_markup) || 0)
    const creditKrw = await deps.creditPriceFor(db, me)
    const c = deps.computeCharge(
      { model: String(row.model || ''), units: Number(row.units) || 0,
        res: row.res == null ? undefined : String(row.res), audio: !!row.audio,
        ratio: row.ratio == null ? undefined : String(row.ratio),
        refs: Number(row.refs) || 0, hdr: !!row.hdr, exr: !!row.exr,
        usageTokens: Math.max(0, Number(usageTokens) || 0) },
      rate, markup, creditKrw)
    const refs = Number(row.refs) || 0
    const cn = Number(row.cn) || 0
    const surPct = await deps.resolveRefSurcharge(db, me.id)
    const cnPct = cn > 0 ? await deps.resolveCnSurcharge(db) : 0
    const exact = Math.round(c.credits * (1 + (surPct / 100) * refs) * (cn > 0 ? 1 + cnPct / 100 : 1) * 100) / 100
    const was = Math.round(Number(row.credits || 0) * 100) / 100
    const delta = Math.round((exact - was) * 100) / 100
    if (Math.abs(delta) < 0.01) return 0            // 추정이 맞았다 — 건드리지 않는다

    await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) - ?, 2) WHERE id = ?')
      .bind(delta, me.id).run()
    const u2: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first().catch(() => null)
    const after = Math.round((Number(u2?.credits) || 0) * 100) / 100
    await db.prepare(`UPDATE gen_charges SET credits = ? WHERE id = ?`).bind(exact, row.id).run().catch(() => {})
    await db.prepare(
      `INSERT INTO transactions (id,user_id,kind,amount,balance_after,memo,created_at) VALUES (?,?,'credit',?,?,?,?)`,
    ).bind('t_' + crypto.randomUUID().slice(0, 16), me.id, -delta, after,
           '제공사 실측 정산 · ' + String(row.model || ''), new Date().toISOString()).run().catch(() => {})
    // 관리자 정산 화면이 읽는 줄도 실측값으로 고쳐 둔다 — 원가·매출 합계가 어긋나지 않게.
    if (row.usage_id)
      await db.prepare(
        `UPDATE ai_usage SET usd = ?, cost_krw = ?, credits = ?, revenue_krw = ? WHERE id = ?`,
      ).bind(c.usd, c.costKrwExact, exact, Math.round(exact * creditKrw), String(row.usage_id)).run().catch(() => {})
    return delta
  } catch {
    return 0
  }
}

/* ── 결과물을 서버가 직접 보관한다 ────────────────────────────────────────
   여태 결과 주소는 브라우저가 /api/usage/record 로 신고해 줘야만 남았다.
   그래서 회원이 완료 직전에 탭을 닫거나·새로고침하거나·인터넷이 끊기면, 영상은
   제공사에 멀쩡히 있는데 우리 표에는 아무것도 안 남았다 — 노드에도 보관함에도
   관리자 생성기록에도 안 나온다. 회원 눈에는 "만든 영상이 사라졌다" 다.

   완료를 확인하는 자리는 서버다(폴링 응답이 서버를 지나간다). 거기서 우리가 직접 넣는다.
   브라우저 신고는 그대로 둔다 — 프롬프트·레퍼런스는 브라우저만 알고, 이쪽은
   이미 주소가 있으면 건드리지 않으므로 서로 덮어쓰지 않는다.
   ⚠ 응답을 붙잡지 않는다. 부르는 쪽이 waitUntil 로 응답 뒤에 돌린다. */
export async function archiveGenResult(
  db: D1Database,
  taskKey: string,
  resultUrl: string,
  kind: string,
  save: (url: string) => Promise<{ url: string; moved: boolean }>,
): Promise<'saved' | 'already' | 'skip'> {
  if (!db || !taskKey || !resultUrl) return 'skip'
  try {
    await ensureGenCharges(db)
    /* 가장 최근 것을 본다. 작업 주소는 제공사가 주는 값이라 우리가 유일함을 보장하지 못한다 —
       같은 주소가 두 번 나오면 옛 줄을 집어서 "이미 있다" 로 끝나고, 새 생성은 영영 안 붙는다.
       (검사에서 실제로 그렇게 걸렸다) */
    const row: any = await db.prepare(
      `SELECT usage_id FROM gen_charges WHERE task_key = ? AND usage_id != ''
        ORDER BY created_at DESC LIMIT 1`,
    ).bind(String(taskKey).slice(0, 300)).first()
    const usageId = String(row?.usage_id || '')
    if (!usageId) return 'skip'                 // 요금 줄이 없다(관리자 생성 등) — 붙일 자리가 없다
    //  이미 주소가 있으면 아무것도 안 한다. 브라우저가 먼저 넣었을 수도 있다.
    const cur: any = await db.prepare('SELECT result_url FROM ai_usage WHERE id = ? LIMIT 1').bind(usageId).first()
    if (!cur) return 'skip'
    if (String(cur.result_url || '')) return 'already'
    const saved = await save(String(resultUrl))
    if (!saved.url) return 'skip'
    /* 그 사이에 브라우저가 넣었을 수 있다 — 빈 줄일 때만 쓴다(서로 덮어쓰지 않는다). */
    await db.prepare(
      `UPDATE ai_usage SET result_url = ?, result_kind = COALESCE(NULLIF(result_kind,''), ?)
        WHERE id = ? AND COALESCE(result_url,'') = ''`,
    ).bind(saved.url, String(kind || 'video'), usageId).run()
    return 'saved'
  } catch {
    return 'skip'
  }
}

/** 비동기 생성이 실패로 확정되면 제출 때 뺀 금액을 정확히 한 번만 되돌린다. */
export async function refundGenCharge(db: D1Database, taskKey: string): Promise<number> {
  if (!db || !taskKey) return 0
  try {
    await ensureGenCharges(db)
    /* 가장 최근 것을 본다. 작업 주소는 제공사가 주는 값이라 우리가 유일함을 보장하지 못한다 —
       같은 주소가 두 번 나오면 옛 줄을 집어서, 실패한 것은 이번 건인데 지난 건의 금액이
       돌아간다. 두 건의 금액이 다르면 그 차액만큼 회원이 손해를 본다.
       (archiveGenResult 가 같은 이유로 이미 이렇게 하고 있다 — 여기만 빠져 있었다) */
    const row: any = await db.prepare(
      `SELECT id, user_id, credits, model, usage_id FROM gen_charges WHERE task_key = ? AND status = 'charged'
        ORDER BY created_at DESC LIMIT 1`,
    ).bind(String(taskKey).slice(0, 300)).first()
    if (!row) return 0
    const amt = Math.round(Number(row.credits || 0) * 100) / 100
    if (!(amt > 0)) return 0
    // 조건부 UPDATE — 동시에 두 번 들어와도 한쪽만 성공한다(환불이 두 번 나가지 않는다).
    /* ⚠ 이 한 문장은 모양을 바꾸지 않는다 — 동시에 두 번 들어와도 한 번만 통과하는 잠금이고,
       sql-contract·mutation-check 가 이 문장을 글자 그대로 집어 검증한다.
       뒤처리(swept_at·ai_usage 표시)는 아래에서 따로 한다. */
    const upd: any = await db.prepare(
      `UPDATE gen_charges SET status = 'refunded' WHERE id = ? AND status = 'charged'`,
    ).bind(row.id).run()
    if (!upd?.meta?.changes) return 0
    //  언제 결말이 났는지 남긴다(회수 그물이 다시 집지 않게 — status 로도 걸러지지만 기록이 남는다)
    await db.prepare(`UPDATE gen_charges SET swept_at = COALESCE(swept_at, ?) WHERE id = ?`)
      .bind(new Date().toISOString(), row.id).run().catch(() => {})
    await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) + ?, 2) WHERE id = ?')
      .bind(amt, row.user_id).run()
    const u2: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(row.user_id).first().catch(() => null)
    const after = Math.round((Number(u2?.credits) || 0) * 100) / 100
    await db.prepare(
      `INSERT INTO transactions (id,user_id,kind,amount,balance_after,memo,created_at) VALUES (?,?,'credit',?,?,?,?)`,
    ).bind('t_' + crypto.randomUUID().slice(0, 16), row.user_id, amt, after,
           '생성 실패 환불 · ' + String(row.model || ''), new Date().toISOString()).run().catch(() => {})
    /* ── 관리자 정산 표에도 알린다 ──
       환불은 여태 gen_charges 에만 남았다. 그래서 관리자 "AI 사용 · 수익 정산" 화면은
       돌려준 건까지 매출·순이익으로 세고 있었다 — 실패해서 한 푼도 못 받은 생성이
       화면에서는 돈을 번 것으로 보인다. 금액 칸을 지우지는 않는다(무엇을 얼마에 팔려다
       돌려줬는지가 사라진다). 표시만 남기고, 합계를 내는 쪽이 이 표시를 보고 뺀다. */
    if (row.usage_id)
      await db.prepare(
        `UPDATE ai_usage SET refunded = 1, refund_credits = ? WHERE id = ?`,
      ).bind(amt, String(row.usage_id)).run().catch(() => {})
    return amt
  } catch {
    return 0
  }
}
