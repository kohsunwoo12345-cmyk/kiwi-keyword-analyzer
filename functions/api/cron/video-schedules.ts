import { Env, json, ensureSchema, resolveDB, addNotification } from '../_utils'
import { ensureSchedules, computeNextRun, FAIL_LIMIT, estimateScheduleCredits } from '../studio/schedules'
import { MODEL_COST } from '../studio/_pricing'
// @ts-ignore — 생성 엔드포인트를 내부에서 그대로 재사용(과금·크레딧 게이트·브랜드 킷 전부 동일 적용)
import { onRequest as generateApi } from '../generate.js'

// 정기 자동 생성 실행기 — 외부 스케줄러가 주기적으로 호출한다(이 저장소의 다른 배치와 같은 규약).
//   curl -X POST -H "X-Cron-Token: $CRON_TOKEN" https://<도메인>/api/cron/video-schedules
// 한 번 호출에 "지금 실행할 때가 된" 예약만 처리하고, 각 예약의 다음 실행 시각을 다시 계산한다.
// 크레딧 차감·플랜 게이트·브랜드 킷은 일반 생성과 완전히 동일하게 적용된다(회원 MCP 토큰으로 호출).

const MAX_PER_TICK = 5   // 한 번에 처리할 예약 수 — 함수 실행시간·동시 과금 폭주 방지

/** 실패를 회원에게 알린다.
 *  이게 없으면 크레딧 부족·키 만료로 예약이 조용히 안 도는데 회원은 모른 채 기다린다. */
async function notifyFail(db: D1Database, s: any, status: string, streak: number) {
  const name = String(s.name || '').trim() || '(이름 없는 예약)'
  const reason = String(status).replace(/^실패:\s*/, '')
  const hit = streak >= FAIL_LIMIT
  const title = hit ? '정기 자동 생성이 중지되었습니다' : '정기 자동 생성이 실패했습니다'
  const body = hit
    ? `"${name}" 예약이 ${FAIL_LIMIT}회 연속 실패해 자동으로 껐습니다.\n마지막 사유: ${reason}\n원인을 고친 뒤 스튜디오에서 다시 저장하면 재개됩니다.`
    : `"${name}" 예약이 실행되지 않았습니다.\n사유: ${reason}\n${FAIL_LIMIT}회 연속 실패하면 예약이 자동으로 꺼집니다.`
  await addNotification(db, String(s.user_id), title, body).catch(() => {})
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  const expected = String((env as any).CRON_TOKEN || '')
  const got = request.headers.get('X-Cron-Token') || ''
  if (!expected || got !== expected) return json({ ok: false, error: '인증 실패' }, 401)

  await ensureSchema(db)
  await ensureSchedules(db)
  const nowIso = new Date().toISOString()

  const due: any = await db.prepare(
    `SELECT s.*, u.mcp_token AS mcp_token, u.credits AS credits,
            u.role AS role, u.credit_markup AS credit_markup
       FROM studio_schedules s JOIN users u ON u.id = s.user_id
      WHERE s.enabled = 1 AND s.next_run_at IS NOT NULL AND s.next_run_at <= ?
      ORDER BY s.next_run_at ASC LIMIT ?`,
  ).bind(nowIso, MAX_PER_TICK).all().catch(() => ({ results: [] }))

  const origin = new URL(request.url).origin
  const results: any[] = []

  for (const s of (due.results || []) as any[]) {
    // ── 선점(claim) ──────────────────────────────────────────────────────────
    //  ⚠ 이게 없으면 크론 틱이 겹칠 때 같은 예약이 두 번 실행되어 영상도 크레딧도 두 배로 나간다.
    //     크론이 1분마다 도는 데다 수동 실행(/run)까지 있어 겹칠 여지가 실제로 있다.
    //     "읽은 그 시각 그대로일 때만" 다음 시각으로 밀어 두는 조건부 UPDATE 로 한 명만 이기게 한다.
    //     진 쪽은 changes=0 을 받고 조용히 건너뛴다.
    const nextAt = computeNextRun(String(s.freq || 'weekly'), Number(s.hour) || 0, Number(s.minute) || 0,
      Number(s.weekday) || 0, Date.now(), String(s.tz || 'Asia/Seoul'))
    const claim: any = await db.prepare(
      'UPDATE studio_schedules SET next_run_at = ?, last_run_at = ? WHERE id = ? AND enabled = 1 AND next_run_at = ?',
    ).bind(nextAt, nowIso, s.id, s.next_run_at).run().catch(() => null)
    if (!claim || Number(claim.meta?.changes || 0) === 0) {
      results.push({ id: s.id, skipped: '다른 실행이 이미 가져감' })
      continue
    }

    // 횟수 제한을 다 쓴 예약은 더 돌리지 않고 끈다
    if (Number(s.max_runs) > 0 && Number(s.runs) >= Number(s.max_runs)) {
      await db.prepare('UPDATE studio_schedules SET enabled = 0, last_status = ? WHERE id = ?')
        .bind('완료(횟수 소진)', s.id).run().catch(() => {})
      results.push({ id: s.id, skipped: '횟수 소진' })
      continue
    }
    // 회원 토큰이 없으면 생성 API 를 회원 자격으로 호출할 수 없다 → 사유를 남기고 넘어간다
    if (!s.mcp_token) {
      const msg = '실행 불가: 계정 MCP 토큰 없음(스튜디오에서 한 번 발급하세요)'
      await db.prepare('UPDATE studio_schedules SET last_status=? WHERE id=?')
        .bind(msg, s.id).run().catch(() => {})
      await notifyFail(db, s, msg, 0)
      results.push({ id: s.id, error: 'no token' })
      continue
    }

    // 크레딧이 모자라면 제공사 호출 전에 끊는다 — 유료 API 를 때린 뒤 실패하면 돈만 나간다.
    //  생성 API 안에도 같은 게이트가 있지만, 여기서 먼저 잡아야 사유가 명확히 남는다.
    if (String(s.role || '') !== 'admin') {
      const need = await estimateScheduleCredits(db, { id: s.user_id, credits: s.credits, credit_markup: s.credit_markup },
        { model: String(s.model), seconds: Number(s.seconds) || 5, res: String(s.res || '1080p') })
      const have = Number(s.credits) || 0
      if (have <= 0 || (need > 0 && have < need)) {
        const msg = `실패: 크레딧 부족 (필요 ${need.toLocaleString('ko-KR')} · 보유 ${have.toLocaleString('ko-KR')})`
        const streak0 = (Number(s.fail_streak) || 0) + 1
        const stop = streak0 >= FAIL_LIMIT
        // 제공사를 부르지 않았으므로 runs 는 올리지 않는다. next_run_at 은 선점 때 이미 옮겼다.
        await db.prepare(
          'UPDATE studio_schedules SET last_status=?, fail_streak=?' + (stop ? ', enabled=0' : '') + ' WHERE id=?',
        ).bind(msg, streak0, s.id).run().catch(() => {})
        await notifyFail(db, s, msg, streak0)
        results.push({ id: s.id, status: msg, nextRunAt: nextAt, failStreak: streak0, disabled: stop })
        continue
      }
    }

    let status = '', result = ''
    try {
      const req = new Request(origin + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.mcp_token },
        // provider 는 모델명에서 서버 단가표로 역산한다(스튜디오가 보내던 값과 동일).
        //  이게 없으면 생성 API 가 "지원하지 않는 provider" 로 거부한다.
        body: JSON.stringify({
          provider: (MODEL_COST as any)[s.model]?.prov || 'seedance',
          model: s.model, kind: 'video', prompt: s.prompt,
          seconds: Number(s.seconds) || 5, ratio: s.ratio || '16:9', res: s.res || '1080p',
        }),
      })
      const res: Response = await generateApi({ request: req, env })
      const j: any = await res.json().catch(() => ({}))
      if (j && j.error) { status = '실패: ' + String(j.error).slice(0, 160) }
      else if (j && j.url) { status = '완료'; result = String(j.url) }
      else if (j && j.statusUrl) { status = '생성 시작됨'; result = String(j.statusUrl) }
      else { status = '실패: 예상치 못한 응답' }
    } catch (e: any) {
      status = '실패: ' + String((e && e.message) || e).slice(0, 160)
    }

    const failed = /^실패/.test(status)
    const streak = failed ? (Number(s.fail_streak) || 0) + 1 : 0
    // 연속 실패가 한계에 닿으면 끈다 — 키가 빠졌거나 크레딧이 없는 예약이
    //  매일 조용히 실패하며 로그만 쌓이는 걸 막는다.
    const disable = failed && streak >= FAIL_LIMIT
    // ⚠ enabled 는 "끌 때만" 쓴다. 예전처럼 enabled=1 을 되쓰면,
    //   생성이 도는 사이 관리자가 끈 예약이 되살아난다.
    //   next_run_at 도 선점 단계에서 이미 옮겨 두었으므로 여기서 건드리지 않는다.
    //   runs 는 성공했을 때만 올린다 — max_runs 는 "몇 개를 만들 것인가"이지
    //   "몇 번 시도할 것인가"가 아니다. 실패가 횟수를 깎으면 아무것도 못 받고 끝난다.
    await db.prepare(
      `UPDATE studio_schedules SET last_status=?, last_result=?, fail_streak=?`
      + (failed ? '' : ', runs=runs+1') + (disable ? ', enabled=0' : '') + ' WHERE id=?',
    ).bind(status, result, streak, s.id).run().catch(() => {})
    // 실패는 회원에게 알린다. 성공은 보관함에 결과가 들어가므로 알리지 않는다(알림 피로).
    if (failed) await notifyFail(db, s, status, streak)
    results.push({ id: s.id, status, nextRunAt: nextAt, failStreak: streak, disabled: disable })
  }

  return json({ ok: true, processed: results.length, results })
}

// GET 은 상태 확인용(토큰 필요) — 지금 실행 대기 중인 예약 수만 알려준다
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  const expected = String((env as any).CRON_TOKEN || '')
  if (!expected || (request.headers.get('X-Cron-Token') || '') !== expected)
    return json({ ok: false, error: '인증 실패' }, 401)
  await ensureSchedules(db)
  const r: any = await db.prepare(
    'SELECT COUNT(*) AS c FROM studio_schedules WHERE enabled = 1 AND next_run_at <= ?',
  ).bind(new Date().toISOString()).first().catch(() => ({ c: 0 }))
  return json({ ok: true, due: Number(r?.c) || 0 })
}
