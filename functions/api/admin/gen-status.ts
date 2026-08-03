import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

/* ── 이 생성, 제공사 쪽에서는 어떻게 됐나 ──
   관리자 화면의 "미리보기 없음 (아카이브 안 됨)" 은 우리 표에 결과 주소가 없다는 뜻일 뿐이다.
   그 한 줄만 보고는 세 가지가 구분되지 않는다:
     ㉠ 영상은 만들어졌는데 결과 주소만 우리 줄에 안 붙었다  → 제공사 요금은 나갔다
     ㉡ 회원이 보관함에서 지웠다                              → 제공사 요금은 나갔다
     ㉢ 제공사 쪽에서 실패했다                                → 대개 제공사 요금은 안 나간다
   구분하려면 제공사에게 직접 물어보는 수밖에 없다. 그래서 그 통로를 연다.

   작업 번호는 이미 갖고 있다 — 정산할 때 gen_charges.task_key 에 그 생성의 조회 주소를
   통째로 적어 뒀다(/api/generate?provider=…&task=…). 그 주소가 곧 우리 폴링 창구라서,
   제공사별 조회 코드를 여기 다시 쓸 필요가 없다. 우리 자신에게 그대로 물어본다 —
   제공사가 늘어나도 이 파일은 그대로다.

   ⚠ 조회만 한다. 여기서 환불하거나 값을 고치지 않는다 — 관리자가 보고 판단할 재료만 준다. */

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const u = new URL(request.url)
  const id = String(u.searchParams.get('id') || '').slice(0, 40)
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)

  const row: any = await db
    .prepare(`SELECT id, user_id, model, credits, task_key, status, usage_id, created_at
                FROM gen_charges WHERE usage_id = ? LIMIT 1`)
    .bind(id)
    .first()
    .catch(() => null)

  /* 과금 줄을 못 찾는 경우가 있다 — 아주 예전 기록이거나, 금액이 안 붙은 보관 전용 줄이다.
     "모른다" 를 "실패했다" 로 바꿔 말하지 않는다. */
  if (!row)
    return json({ ok: true, found: false,
      note: '이 기록에 연결된 과금 줄이 없습니다(옛 기록이거나 보관 전용 줄).' })

  const taskKey = String(row.task_key || '')
  const charge = {
    credits: Number(row.credits) || 0,
    status: String(row.status || ''),            // charged | refunded | ''
    refunded: String(row.status || '') === 'refunded',
    taskKey,
    at: String(row.created_at || ''),
  }
  if (!taskKey)
    return json({ ok: true, found: true, charge,
      note: '작업 번호가 없습니다(즉시 결과형 생성은 조회할 작업이 없습니다).' })

  //  우리 폴링 창구에 그대로 물어본다. 관리자 쿠키를 그대로 넘겨야 통과한다.
  let provider: any = null
  try {
    const target = new URL(taskKey, u.origin)
    const r = await fetch(target.toString(), {
      headers: { cookie: request.headers.get('cookie') || '' },
    })
    const j: any = await r.json().catch(() => ({}))
    provider = {
      http: r.status,
      //  셋 중 하나로 정리한다 — 화면이 저마다 해석하면 같은 상황이 다르게 보인다.
      state: j && j.url ? 'succeeded' : (j && (j.status === 'failed' || j.error) ? 'failed' : 'running'),
      url: (j && j.url) || '',
      error: (j && j.error) || '',
      raw: j && j.status ? String(j.status) : '',
      usageTokens: Number(j && j.usageTokens) || 0,
    }
  } catch (e: any) {
    provider = { state: 'unknown', error: '조회 실패: ' + String((e && e.message) || e).slice(0, 160) }
  }

  /* 제공사 요금이 나갔는지에 대한 우리 판단.
     성공했으면 연산이 끝난 것이라 나갔다고 본다. 실패는 "대개 안 나간다" 지, 확정은 청구서다 —
     그 차이를 문구에 남긴다(추정을 사실처럼 적어 두면 나중에 그걸 근거로 판단하게 된다). */
  const cost =
    provider?.state === 'succeeded' ? '제공사 요금 나감(작업이 완료됨)'
    : provider?.state === 'failed' ? '제공사 요금은 대개 안 나감(실패 · 확정은 청구서)'
    : provider?.state === 'running' ? '아직 진행 중'
    : '알 수 없음'

  return json({ ok: true, found: true, charge, provider, cost })
}
