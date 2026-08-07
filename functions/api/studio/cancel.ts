import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { ensureGenCharges, refundGenCharge } from './_gencharge'
import { keys, arkBase, FAL_QUEUE, LUMA_BASE, RUNWAY_VER } from '../generate.js'

/* ── 제작 취소 ──
   회원이 진행률 막대의 [취소] 를 누르면 여기로 온다. 하는 일은 두 가지다.
     ㉠ 제공사에게 "그만해라" 고 말한다 — 되는 곳만.
     ㉡ 제출 때 뺀 크레딧을 되돌린다 — 되는지와 무관하게 무조건.

   ⚠ 먼저 사실부터. "취소하면 제공사 돈도 안 나간다" 는 언제나 참이 아니다.
      확인한 제공사들의 취소 규격이 하나같이 같은 말을 한다:
        · fal      — "cancels a request that has not started processing"
        · Luma     — 대기(pending) 상태만 취소, processing 에 들어가면 불가
        · ModelArk — "취소" 는 대기 중(queued) 작업에 대한 것
      즉 취소가 통하는 구간은 "제출됐지만 아직 순서가 안 온" 동안뿐이다.
      한 번 돌기 시작하면 우리가 무슨 짓을 해도 그 연산은 끝까지 가고, 그건 청구된다.
      (Kling·Hailuo·FLUX·Veo·Grok 은 공개된 취소 규격 자체가 없다.)

   그래서 우리가 회원에게 약속할 수 있는 것과 없는 것을 갈라 둔다:
     · 약속한다 — 취소하면 회원 크레딧은 전액 돌아온다. 언제 눌렀든.
     · 약속 못 한다 — 제공사 원가. 이미 시작했으면 그건 우리가 떠안는다.
   화면에도 그대로 말한다. "취소됐다" 고만 하고 뒤에서 우리가 물어내는 것과,
   "이미 시작돼서 제공사 쪽은 못 멈췄고 요금은 저희가 부담한다" 고 말하는 것은 다르다.

   ※ 여기서 제공사 취소 호출이 실패해도 환불은 그대로 한다. 실패를 이유로 환불을
     미루면, 정작 회원은 아무것도 못 받았는데 돈만 빠진 채로 남는다. */

/** statusUrl(=/api/generate?provider=..&task=..) 에서 어느 제공사의 어느 작업인지 되읽는다. */
function parseTask(taskKey: string): { provider: string; q: URLSearchParams } | null {
  try {
    const u = new URL(String(taskKey), 'https://x.invalid')
    const provider = String(u.searchParams.get('provider') || '')
    if (!provider) return null
    return { provider, q: u.searchParams }
  } catch {
    return null
  }
}

/** fal 큐 주소에서 request_id 를 꺼낸다 — .../requests/<id>/status 또는 .../requests/<id> */
function falReqId(url: string): string | null {
  const m = /\/requests\/([^/?#]+)/.exec(String(url || ''))
  return m ? m[1] : null
}

export interface CancelOutcome {
  /** 제공사에게 실제로 중지를 시켰는가(HTTP 2xx). null = 취소 규격이 없는 제공사 */
  stopped: boolean | null
  /** 회원에게 보여 줄 한 줄 */
  note: string
}

/* 제공사별 취소. 규격이 없는 곳은 시도조차 하지 않는다 —
   없는 주소를 찔러 보고 404 를 받아 "실패" 로 적으면, 우리가 뭘 잘못한 것처럼 보인다. */
export async function cancelAtProvider(env: any, taskKey: string): Promise<CancelOutcome> {
  const p = parseTask(taskKey)
  if (!p) return { stopped: null, note: '작업 주소를 알아볼 수 없어 제공사에는 알리지 못했습니다.' }
  const k: any = keys(env)
  const NO_API = (name: string): CancelOutcome => ({
    stopped: null,
    note: name + ' 은 취소 규격을 제공하지 않습니다 — 제공사 쪽 작업은 그대로 끝납니다.',
  })
  const ok2xx = async (pr: Promise<Response>): Promise<boolean> => {
    try { const r = await pr; return r.status >= 200 && r.status < 300 } catch { return false }
  }

  try {
    switch (p.provider) {
      case 'runway':
      case 'runway_aleph': {
        const t = p.q.get('task')
        if (!t || !k.runway) return NO_API('Runway')
        const done = await ok2xx(fetch('https://api.dev.runwayml.com/v1/tasks/' + encodeURIComponent(t), {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + k.runway, 'X-Runway-Version': RUNWAY_VER },
        }))
        return { stopped: done, note: done ? 'Runway 작업을 중지했습니다.' : 'Runway 가 중지를 받지 않았습니다(이미 진행 중일 수 있습니다).' }
      }
      case 'seedance':
      case 'seedream':
      case 'ark3d': {
        //  인계 제출(sub)이면 아직 태스크 번호가 없을 수 있다 — 그때는 제공사에 알릴 것도 없다.
        const t = p.q.get('task')
        if (!t) return { stopped: null, note: '아직 제공사에 접수되기 전이라 알릴 작업이 없습니다.' }
        if (!k.seedance) return NO_API('ModelArk')
        const base = arkBase(env, p.q.get('host') === 'vc' ? 'vc' : 'bp')
        const done = await ok2xx(fetch(base + '/contents/generations/tasks/' + encodeURIComponent(t), {
          method: 'DELETE', headers: { Authorization: 'Bearer ' + k.seedance },
        }))
        return { stopped: done, note: done ? '씨댄스(ModelArk) 작업을 중지했습니다.' : '씨댄스가 중지를 받지 않았습니다(대기 중인 작업만 취소됩니다).' }
      }
      case 'luma': {
        const t = p.q.get('task')
        if (!t || !k.luma) return NO_API('Luma')
        const done = await ok2xx(fetch(LUMA_BASE + '/generations/' + encodeURIComponent(t), {
          method: 'DELETE', headers: { Authorization: 'Bearer ' + k.luma },
        }))
        return { stopped: done, note: done ? 'Luma 작업을 중지했습니다.' : 'Luma 가 중지를 받지 않았습니다(대기 중인 작업만 취소됩니다).' }
      }
      case 'falq': {
        const t = p.q.get('task'), model = p.q.get('model')
        if (!t || !model || !k.fal) return NO_API('fal')
        const done = await ok2xx(fetch(FAL_QUEUE + model + '/requests/' + encodeURIComponent(t) + '/cancel', {
          method: 'PUT', headers: { Authorization: 'Key ' + k.fal },
        }))
        return { stopped: done, note: done ? 'fal 작업을 중지했습니다.' : 'fal 이 중지를 받지 않았습니다(이미 시작한 작업은 취소되지 않습니다).' }
      }
      case 'falcontrol': {
        const st = p.q.get('status') || ''
        const id = falReqId(st)
        //  status 주소는 .../{model}/requests/{id}/status 꼴이라 모델 경로를 그대로 잘라 쓴다
        const cancelUrl = st.replace(/\/status(\?.*)?$/, '/cancel')
        if (!id || !k.fal || !/^https:\/\/[^/]*fal\.run\//.test(cancelUrl)) return NO_API('fal')
        const done = await ok2xx(fetch(cancelUrl, { method: 'PUT', headers: { Authorization: 'Key ' + k.fal } }))
        return { stopped: done, note: done ? 'fal 작업을 중지했습니다.' : 'fal 이 중지를 받지 않았습니다(이미 시작한 작업은 취소되지 않습니다).' }
      }
      case 'kling':   return NO_API('Kling')
      case 'hailuo':  return NO_API('Hailuo')
      case 'flux':    return NO_API('FLUX(BFL)')
      case 'google':  return NO_API('Veo(Google)')
      case 'xai':     return NO_API('Grok(xAI)')
      default:        return { stopped: null, note: '이 제공사에는 취소 규격이 없습니다.' }
    }
  } catch (e: any) {
    return { stopped: false, note: '제공사에 중지를 알리다 실패했습니다: ' + String((e && e.message) || e).slice(0, 120) }
  }
}

// POST /api/studio/cancel { taskKey }
//   → { ok, stopped, refunded, note }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

  const b: any = (await request.json().catch(() => null)) || {}
  const taskKey = String(b.taskKey || '').slice(0, 300)
  if (!taskKey) return json({ ok: false, error: '취소할 작업이 없습니다.' }, 400)

  /* 남의 작업을 취소하지 못하게 한다 — 작업 주소만 알면 되는 구조라 이 확인이 없으면
     주소를 주워 남의 생성을 멈추고 남의 크레딧을 환불 처리할 수 있다. */
  await ensureGenCharges(db)
  //  같은 작업 주소가 두 번 나올 수 있다 — 지금 취소하는 건 가장 최근 것이다(환불이 집는 줄과 같아야 한다)
  const row: any = await db
    .prepare(`SELECT id, user_id, status FROM gen_charges WHERE task_key = ? ORDER BY created_at DESC LIMIT 1`)
    .bind(taskKey)
    .first()
    .catch(() => null)
  if (row && String(row.user_id) !== String(me.id) && me.role !== 'admin')
    return json({ ok: false, error: '이 작업은 취소할 수 없습니다.' }, 403)

  const out = await cancelAtProvider(env, taskKey)
  //  환불은 제공사 응답과 무관하게 한다(위 주석 참조). 두 번 눌러도 한 번만 나간다.
  const refunded = await refundGenCharge(db, taskKey)

  /* 회원에게 할 말을 여기서 정한다 — 화면이 저마다 다르게 말하면 같은 상황이 다르게 보인다.
     "돌려줬다" 와 "제공사는 못 멈췄다" 는 서로 다른 사실이라 둘 다 말한다. */
  const money = refunded > 0
    ? refunded + ' 크레딧을 돌려드렸습니다.'
    : (row && String(row.status) === 'refunded' ? '이미 환불된 작업입니다.' : '차감된 크레딧이 없어 환불할 것이 없습니다.')

  return json({ ok: true, stopped: out.stopped, refunded, note: out.note, message: money + ' ' + out.note })
}
