import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { ensureSchedules } from './schedules'
import { MODEL_COST } from './_pricing'
// @ts-ignore — 생성 엔드포인트를 그대로 재사용(과금·크레딧 게이트·브랜드 킷 전부 동일 적용)
import { onRequest as generateApi } from '../generate.js'

// 예약을 "지금 한 번" 돌린다 — 크론을 15분 기다리지 않고 결과를 바로 확인하기 위한 것.
//  ⚠ 다음 실행 시각(next_run_at)과 실행 횟수(runs)는 건드리지 않는다.
//     수동 확인 때문에 정기 일정이 밀리거나 횟수 제한이 깎이면 안 되기 때문.
//     대신 last_run_at/last_status 는 남겨서 무슨 일이 있었는지 보이게 한다.
//  크레딧은 일반 생성과 똑같이 차감된다(생성 API 를 그대로 태우므로).

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureSchedules(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)

  let b: any = {}
  try { b = (await request.json()) ?? {} } catch { return json({ ok: false, error: '잘못된 요청' }, 400) }
  const id = String(b.id || '').trim()
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)

  const s: any = await db.prepare('SELECT * FROM studio_schedules WHERE id = ? AND user_id = ?')
    .bind(id, me.id).first()
  if (!s) return json({ ok: false, error: '없는 예약입니다.' }, 404)
  if (!(MODEL_COST as any)[s.model])
    return json({ ok: false, error: '알 수 없는 모델입니다: ' + s.model }, 400)

  const nowIso = new Date().toISOString()
  const origin = new URL(request.url).origin
  let status = '', result = '', payload: any = {}

  try {
    // 로그인 쿠키를 그대로 넘겨 본인 자격으로 생성한다(크론과 달리 MCP 토큰이 필요 없다).
    const req = new Request(origin + '/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        provider: (MODEL_COST as any)[s.model]?.prov || 'seedance',
        model: s.model, kind: 'video', prompt: s.prompt,
        seconds: Number(s.seconds) || 5, ratio: s.ratio || '16:9', res: s.res || '1080p',
      }),
    })
    const res: Response = await generateApi({ request: req, env })
    const j: any = await res.json().catch(() => ({}))
    payload = j || {}
    if (j && j.error) status = '실패: ' + String(j.error).slice(0, 160)
    else if (j && j.url) { status = '완료(수동 실행)'; result = String(j.url) }
    else if (j && j.statusUrl) { status = '생성 시작됨(수동 실행)'; result = String(j.statusUrl) }
    else status = '실패: 예상치 못한 응답'
  } catch (e: any) {
    status = '실패: ' + String((e && e.message) || e).slice(0, 160)
  }

  const ok = !/^실패/.test(status)
  // 수동 실행이 성공했다면 원인이 해결된 것이므로 연속 실패 기록을 지운다
  //  (자동 중지 직전까지 갔던 예약이 다시 3번의 기회를 갖는다)
  await db.prepare(
    'UPDATE studio_schedules SET last_run_at=?, last_status=?, last_result=?' + (ok ? ', fail_streak=0' : '') +
    ' WHERE id=? AND user_id=?',
  ).bind(nowIso, status, result, id, me.id).run().catch(() => {})

  return json({
    ok, status, result,
    url: payload.url || '', statusUrl: payload.statusUrl || '',
    error: ok ? '' : status,
  }, ok ? 200 : 200)   // 실패도 200 으로 돌려준다 — 화면에서 사유를 그대로 보여주기 위해
}
