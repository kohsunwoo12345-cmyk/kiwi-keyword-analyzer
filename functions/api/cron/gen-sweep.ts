/* 결말이 안 온 차감을 되찾는 그물 — 정기 실행
   ──────────────────────────────────────────────────────────────────────────
   비동기 영상은 "제출된 순간" 에 차감한다. 그 돈이 돌아오는 길은 하나뿐이었다:
   브라우저가 폴링을 계속해서 실패 응답을 우리 서버로 한 번 지나가게 하는 것.
   그런데 그 길은 회원 쪽 사정으로 쉽게 끊긴다.
     · 탭을 닫는다 (영상은 몇 분씩 걸린다 — 닫고 나중에 보러 오는 게 보통이다)
     · 폴링이 시간을 넘긴다 (스튜디오는 3초 × 400회 = 약 20분에서 손을 뗀다)
     · 네트워크가 열 번 연속 끊긴다 (pollJob 이 그 자리에서 포기한다)
     · 제공사가 실패 응답도 안 주고 계속 "진행 중" 으로 남는다
   넷 중 어느 것이든, 회원 지갑에서는 돈이 나갔는데 결과물은 없고 환불도 없다.
   이건 "생성 실패인데 크레딧이 나갔다" 그 자체다. 크론에서도 도는 검사가 없었다.

   그래서 서버가 스스로 확인한다. 확인 방법은 관리자 화면(admin/gen-status)이 쓰는 것과
   같다 — 우리가 저장해 둔 폴링 주소(gen_charges.task_key)를 우리 자신에게 물어본다.
   제공사별 조회 코드를 여기 다시 쓸 필요가 없고, 제공사가 늘어나도 이 파일은 그대로다.

   ⚠ 상태 조회는 돈이 들지 않는다 — 만들라고 시키는 게 아니라 어떻게 됐는지만 묻는다.
   ⚠ 성공한 건은 절대 환불하지 않는다. 결과물이 나왔으면 제공사 비용은 이미 나갔고,
     그걸 돌려주면 회원은 영상을 받고 돈은 안 낸 것이 된다.
   ⚠ "아직 진행 중" 도 환불하지 않는다 — 다만 영원히 기다리지는 않는다(DEAD_MS).

   GET  — 확인할 게 몇 건인지만 본다(워커가 이걸 보고 POST 를 아낀다)
   POST — 한 묶음 확인하고 { processed, refunded, hasMore } 를 돌려준다
*/
import { Env, json, resolveDB } from '../_utils'
import { ensureGenCharges, refundGenCharge } from '../studio/_gencharge'
import { recordGenFailure } from '../studio/_genfail'
import { onRequest as generateApi } from '../generate.js'

/** 이만큼 지나도 결말이 없으면 확인 대상. 정상 생성은 대개 1~5분, 씨댄스 2.0 은 10분을 넘기기도 한다. */
const GRACE_MS = 30 * 60_000
/** 이만큼 지나도록 "진행 중" 이면 결말이 없는 것으로 보고 되돌린다(회원 쪽에 유리하게). */
const DEAD_MS = 24 * 3600_000
/** 한 번에 확인할 건수 — 건마다 제공사 조회가 한 번 붙는다(서브리퀘스트 한도). */
const BATCH = 5
/** 이만큼 확인해 보고도 계속 "모르겠다" 면 손을 뗀다(관리자 화면에 남는다). */
const MAX_TRIES = 8

function auth(request: Request, env: any): boolean {
  const expected = String(env.CRON_TOKEN || '')
  return !!expected && (request.headers.get('X-Cron-Token') || '') === expected
}

const dueSql = `
  SELECT id, user_id, model, credits, task_key, created_at, COALESCE(sweep_tries,0) AS tries
    FROM gen_charges
   WHERE status = 'charged' AND COALESCE(task_key,'') <> '' AND swept_at IS NULL
     AND created_at < ? AND COALESCE(sweep_tries,0) < ?
   ORDER BY created_at ASC LIMIT ?`

async function pending(db: D1Database): Promise<number> {
  const r: any = await db.prepare(
    `SELECT COUNT(*) AS c FROM gen_charges
      WHERE status = 'charged' AND COALESCE(task_key,'') <> '' AND swept_at IS NULL
        AND created_at < ? AND COALESCE(sweep_tries,0) < ?`)
    .bind(new Date(Date.now() - GRACE_MS).toISOString(), MAX_TRIES).first().catch(() => ({ c: 0 }))
  return Number(r?.c) || 0
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  if (!auth(request, env as any)) return json({ ok: false, error: '인증 실패' }, 401)
  await ensureGenCharges(db)
  const due = await pending(db)
  return json({ ok: true, due, hasMore: due > 0 })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  if (!auth(request, env as any)) return json({ ok: false, error: '인증 실패' }, 401)
  await ensureGenCharges(db)

  const origin = new URL(request.url).origin
  /* 폴링 주소(?task=…)는 로그인을 요구한다. 크론에는 세션이 없으니 전역 MCP 토큰으로 들어간다 —
     /api/v1 이 내부 호출에 쓰는 것과 같은 길이다. 없으면 조회 자체를 못 하므로 그대로 말한다. */
  const gtok = String((env as any).MCP_AUTH_TOKEN || (env as any).mcp_auth_token || '')
  if (!gtok) return json({ ok: false, error: 'MCP_AUTH_TOKEN 이 없어 제공사 상태를 조회할 수 없습니다.' }, 500)

  const rows: any = await db.prepare(dueSql)
    .bind(new Date(Date.now() - GRACE_MS).toISOString(), MAX_TRIES, BATCH)
    .all().catch(() => ({ results: [] }))

  const now = Date.now()
  let refunded = 0, refundedCredits = 0, succeeded = 0, running = 0, gaveUp = 0
  const seen: any[] = []

  for (const r of (rows.results || []) as any[]) {
    const taskKey = String(r.task_key || '')
    const age = now - Date.parse(String(r.created_at || '')) || 0
    let state = 'unknown'
    let reason = ''
    try {
      const inner = new Request(origin + taskKey, { headers: { Authorization: 'Bearer ' + gtok } })
      /* __internalBilling — 이 조회로 generate.js 의 자동 환불·자동 보관이 또 돌지 않게 한다.
         되돌릴지 말지는 여기서 우리가 정한다(그래야 실패 기록도 한 자리에서 남는다). */
      const res = await generateApi({ request: inner, env, __internalBilling: true } as any)
      const body: any = await res.json().catch(() => ({}))
      if (body && body.url && !body.error) state = 'succeeded'
      else if (body && (body.status === 'failed' || body.error)) { state = 'failed'; reason = String(body.error || '제공사가 실패로 끝냈습니다.') }
      else state = 'running'
    } catch (e: any) {
      state = 'unknown'
      reason = '조회 실패: ' + String((e && e.message) || e).slice(0, 200)
    }

    if (state === 'failed') {
      const back = await refundGenCharge(db, taskKey)
      if (back > 0) { refunded++; refundedCredits += back }
      await recordGenFailure(db, {
        userId: String(r.user_id || ''), model: String(r.model || ''), kind: 'video',
        stage: 'run', reason: reason || '제공사가 실패로 끝냈습니다.', taskKey, refunded: back,
      })
      //  refundGenCharge 가 swept_at 을 찍는다 — 여기서 또 건드리지 않는다
    } else if (state === 'succeeded') {
      succeeded++
      await db.prepare(`UPDATE gen_charges SET swept_at = ? WHERE id = ? AND swept_at IS NULL`)
        .bind(new Date().toISOString(), r.id).run().catch(() => {})
    } else if (age > DEAD_MS) {
      /* 하루가 지나도록 성공도 실패도 아니면 결말이 없는 것으로 본다.
         회원 쪽에 유리하게 되돌린다 — 만들어졌는지도 모르는 것에 돈을 물릴 수는 없다. */
      const back = await refundGenCharge(db, taskKey)
      if (back > 0) { refunded++; refundedCredits += back; gaveUp++ }
      await recordGenFailure(db, {
        userId: String(r.user_id || ''), model: String(r.model || ''), kind: 'video',
        stage: 'run', reason: '하루가 지나도록 결과가 확인되지 않아 자동 환불했습니다. ' + reason, taskKey, refunded: back,
      })
    } else {
      running++
      await db.prepare(`UPDATE gen_charges SET sweep_tries = COALESCE(sweep_tries,0) + 1 WHERE id = ?`)
        .bind(r.id).run().catch(() => {})
    }
    seen.push({ id: r.id, model: r.model, credits: Number(r.credits) || 0, state, ageMin: Math.round(age / 60000) })
  }

  const left = await pending(db)
  return json({
    ok: true,
    processed: seen.length,
    refunded, refundedCredits: Math.round(refundedCredits * 100) / 100,
    succeeded, running, gaveUp,
    hasMore: left > 0 && seen.length > 0,
    due: left,
    items: seen,
  })
}
