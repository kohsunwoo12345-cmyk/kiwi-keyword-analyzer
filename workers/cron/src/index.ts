/**
 * BYGENCY 크론 워커
 *
 * 하는 일은 하나뿐이다 — 정해진 시각에 Pages 쪽 크론 엔드포인트를 두드린다.
 * 생성 로직·과금·브랜드 킷은 전부 Pages Functions 안에 그대로 있고, 여기서는
 * 아무 것도 판단하지 않는다. (로직이 두 군데로 갈라지면 반드시 어긋난다)
 *
 *   /api/cron/video-schedules          — 정기 자동 생성(회원이 고른 현지 시각 기준)
 *   /api/naver-place/update-all-tracking — 네이버 플레이스 순위 추적(20건씩 배치)
 *
 * 인증은 두 엔드포인트 모두 X-Cron-Token 규약을 쓴다. Pages 환경변수의 CRON_TOKEN 과
 * 이 워커의 시크릿 CRON_TOKEN 이 같아야 한다.
 */

export interface Env {
  SITE_URL: string
  CRON_TOKEN: string
}

const CRON_VIDEO = '*/15 * * * *'
const CRON_NAVER = '5 0 * * *'

/** 무료 플랜은 요청 하나당 하위 요청(subrequest) 50개가 상한이다. 넉넉히 아래로 잡는다. */
const MAX_VIDEO_CALLS = 5
const MAX_NAVER_BATCHES = 40
const NAVER_BATCH = 20

type Step = { step: string; ok: boolean; body: string }

function siteUrl(env: Env): string {
  return String(env.SITE_URL || '').replace(/\/+$/, '')
}

async function hit(env: Env, path: string, method: 'GET' | 'POST'): Promise<Step> {
  const url = siteUrl(env) + path
  try {
    const res = await fetch(url, {
      method,
      headers: { 'X-Cron-Token': env.CRON_TOKEN || '', 'User-Agent': 'bygency-cron/1.0' },
    })
    const body = (await res.text()).slice(0, 500)
    // 401 이면 토큰 불일치다. 조용히 넘어가면 "돌고 있는 줄 알았는데 아무것도 안 됨" 이 된다.
    if (!res.ok) console.error(`[cron] ${method} ${path} → HTTP ${res.status} ${body}`)
    return { step: path, ok: res.ok, body }
  } catch (e: any) {
    console.error(`[cron] ${method} ${path} → 실패: ${e?.message || e}`)
    return { step: path, ok: false, body: String(e?.message || e) }
  }
}

/** 예약 영상 생성 — 한 번 호출에 최대 5건만 처리하므로 밀린 게 있으면 몇 번 더 두드린다. */
export async function runVideoSchedules(env: Env): Promise<Step[]> {
  const steps: Step[] = []
  // 먼저 대기 건수를 본다. 0이면 POST 를 아예 안 보내 쓸데없는 실행을 아낀다.
  const due = await hit(env, '/api/cron/video-schedules', 'GET')
  steps.push(due)
  if (!due.ok) return steps
  if (/"due"\s*:\s*0\b/.test(due.body)) return steps

  for (let i = 0; i < MAX_VIDEO_CALLS; i++) {
    const r = await hit(env, '/api/cron/video-schedules', 'POST')
    steps.push(r)
    if (!r.ok) break
    if (/"processed"\s*:\s*0\b/.test(r.body)) break   // 더 처리할 게 없다
  }
  return steps
}

/** 네이버 플레이스 추적 — hasMore 가 false 가 될 때까지 배치를 이어서 돈다. */
export async function runNaverTracking(env: Env): Promise<Step[]> {
  const steps: Step[] = []
  let offset = 0
  for (let i = 0; i < MAX_NAVER_BATCHES; i++) {
    const r = await hit(env, `/api/naver-place/update-all-tracking?offset=${offset}&limit=${NAVER_BATCH}`, 'POST')
    steps.push(r)
    if (!r.ok) break
    if (!/"hasMore"\s*:\s*true/.test(r.body)) break
    offset += NAVER_BATCH
  }
  // 상한에 걸려 중간에 끊겼다면 로그로 남긴다(조용히 잘리면 "다 돈 줄" 안다)
  if (steps.length >= MAX_NAVER_BATCHES) console.warn(`[cron] 네이버 추적: 배치 상한 ${MAX_NAVER_BATCHES}개에 도달 — 남은 건 다음 실행으로`)
  return steps
}

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (!env.CRON_TOKEN) { console.error('[cron] CRON_TOKEN 시크릿이 없습니다 — wrangler secret put CRON_TOKEN'); return }
    const job = event.cron === CRON_NAVER ? runNaverTracking : runVideoSchedules
    ctx.waitUntil(job(env).then((s) => {
      console.log(`[cron] ${event.cron} 완료 — ${s.length}단계, 실패 ${s.filter((x) => !x.ok).length}`)
    }))
  },

  // 수동 실행/점검용. 시크릿과 같은 토큰을 요구하므로 아무나 두드릴 수 없다.
  //   curl -X POST -H "X-Cron-Token: ..." https://bygency-cron.<계정>.workers.dev/run?job=video
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const jsonRes = (o: any, s = 200) =>
      new Response(JSON.stringify(o, null, 2), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } })

    if (url.pathname === '/' || url.pathname === '/health')
      return jsonRes({ ok: true, worker: 'bygency-cron', site: siteUrl(env), tokenSet: !!env.CRON_TOKEN })

    if (url.pathname !== '/run') return jsonRes({ ok: false, error: 'not found' }, 404)
    if (!env.CRON_TOKEN || (request.headers.get('X-Cron-Token') || '') !== env.CRON_TOKEN)
      return jsonRes({ ok: false, error: '인증 실패' }, 401)

    const job = url.searchParams.get('job') || 'video'
    const steps = job === 'naver' ? await runNaverTracking(env) : await runVideoSchedules(env)
    return jsonRes({ ok: steps.every((s) => s.ok), job, steps })
  },
}
