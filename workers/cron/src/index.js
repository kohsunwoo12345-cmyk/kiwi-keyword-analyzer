/**
 * BYGENCY 크론 워커
 *
 * 하는 일은 하나뿐이다 — 정해진 시각에 Pages 쪽 크론 엔드포인트를 두드린다.
 * 생성 로직·과금·브랜드 킷은 전부 Pages Functions 안에 그대로 있고, 여기서는
 * 아무 것도 판단하지 않는다. (로직이 두 군데로 갈라지면 반드시 어긋난다)
 *
 *   /api/cron/video-schedules            — 정기 자동 생성(회원이 고른 현지 시각 기준)
 *   /api/naver-place/update-all-tracking — 네이버 플레이스 순위 추적(20건씩 배치)
 *   /api/cron/media-archive              — 생성물 영구 보관 그물(제공사 주소 → 우리 R2)
 *   /api/cron/gen-sweep                  — 결말 없는 차감 회수(실패했는데 안 돌아온 크레딧)
 *
 * 인증은 두 엔드포인트 모두 X-Cron-Token 규약을 쓴다. Pages 환경변수의 CRON_TOKEN 과
 * 이 워커의 시크릿 CRON_TOKEN 이 같아야 한다.
 *
 * ⚠ 일부러 TypeScript 가 아니라 평범한 JS 로 둔다 —
 *   Cloudflare 대시보드의 온라인 편집기에 그대로 붙여넣어 쓸 수 있어야 하기 때문.
 *   (wrangler 없이 브라우저만으로 배포하는 경로. README 의 "방법 C" 참고)
 */

const CRON_NAVER = '5 0 * * *'
/* 생성물 보관 그물 — 제공사 주소는 며칠이면 만료된다. 평소에는 생성이 끝나는 자리에서
   바로 옮기고, 거기서 실패한 것만 여기서 줍는다. 원본이 살아 있는 동안 주워야 하므로
   드물게 돌면 의미가 없다(하루에 한 번이면 그 사이에 만료된다). */
const CRON_ARCHIVE = '20 * * * *'
const MAX_ARCHIVE_CALLS = 6
/* 결말 없는 차감 회수 — 제출 때 뺀 크레딧이 성공도 실패도 확인되지 않은 채 남아 있는 건.
   브라우저 폴링이 끊기면(탭을 닫거나 20분을 넘기면) 되돌릴 사람이 아무도 없다.
   자주 돌 필요는 없다 — 30분 유예를 두고 확인하므로 시간당 한 번이면 충분하다. */
const CRON_SWEEP = '35 * * * *'
const MAX_SWEEP_CALLS = 6

/** 무료 플랜은 요청 하나당 하위 요청(subrequest) 50개가 상한이다. 넉넉히 아래로 잡는다. */
const MAX_VIDEO_CALLS = 5
const MAX_NAVER_BATCHES = 40
const NAVER_BATCH = 20

function siteUrl(env) {
  return String(env.SITE_URL || '').replace(/\/+$/, '')
}

async function hit(env, path, method) {
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
  } catch (e) {
    console.error(`[cron] ${method} ${path} → 실패: ${(e && e.message) || e}`)
    return { step: path, ok: false, body: String((e && e.message) || e) }
  }
}

/** 예약 영상 생성 — 한 번 호출에 최대 5건만 처리하므로 밀린 게 있으면 몇 번 더 두드린다. */
async function runVideoSchedules(env) {
  const steps = []
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
async function runNaverTracking(env) {
  const steps = []
  // ⚠ offset 을 올리지 않는다. 서버가 "아직 안 본 것부터" 집어오는 커서 방식이라
  //   매번 같은 파라미터로 부르면 자연히 다음 묶음이 처리된다.
  //   예전처럼 offset 을 올리면 방금 처리한 묶음을 다시 집어와 같은 항목만 반복해서 긁었다.
  for (let i = 0; i < MAX_NAVER_BATCHES; i++) {
    const r = await hit(env, `/api/naver-place/update-all-tracking?limit=${NAVER_BATCH}`, 'POST')
    steps.push(r)
    if (!r.ok) break
    if (!/"hasMore"\s*:\s*true/.test(r.body)) break
  }
  // 상한에 걸려 중간에 끊겼다면 로그로 남긴다(조용히 잘리면 "다 돈 줄" 안다)
  if (steps.length >= MAX_NAVER_BATCHES) console.warn(`[cron] 네이버 추적: 배치 상한 ${MAX_NAVER_BATCHES}개에 도달 — 남은 건 다음 실행으로`)
  return steps
}

/** 생성물 보관 — 아직 제공사 주소를 붙들고 있는 줄을 우리 R2 로 옮긴다. */
async function runMediaArchive(env) {
  const steps = []
  const due = await hit(env, '/api/cron/media-archive', 'GET')
  steps.push(due)
  if (!due.ok) return steps
  if (/"due"\s*:\s*0\b/.test(due.body)) return steps      // 다 우리 것이다 — 두드릴 필요 없다

  for (let i = 0; i < MAX_ARCHIVE_CALLS; i++) {
    const r = await hit(env, '/api/cron/media-archive', 'POST')
    steps.push(r)
    if (!r.ok) break
    //  이미 만료된 줄만 남으면 hasMore 가 false 로 온다 — 영원히 같은 묶음을 다시 집지 않는다
    if (!/"hasMore"\s*:\s*true/.test(r.body)) break
  }
  return steps
}

/** 결말 없는 차감 회수 — 실패로 확인되면 그 자리에서 크레딧을 되돌린다. */
async function runGenSweep(env) {
  const steps = []
  const due = await hit(env, '/api/cron/gen-sweep', 'GET')
  steps.push(due)
  if (!due.ok) return steps
  if (/"due"\s*:\s*0\b/.test(due.body)) return steps      // 결말을 기다리는 차감이 없다

  for (let i = 0; i < MAX_SWEEP_CALLS; i++) {
    const r = await hit(env, '/api/cron/gen-sweep', 'POST')
    steps.push(r)
    if (!r.ok) break
    if (!/"hasMore"\s*:\s*true/.test(r.body)) break
  }
  return steps
}

export default {
  async scheduled(event, env, ctx) {
    if (!env.CRON_TOKEN) { console.error('[cron] CRON_TOKEN 시크릿이 없습니다 — 설정 → Variables and Secrets 에 추가하세요'); return }
    const job = event.cron === CRON_NAVER ? runNaverTracking
              : event.cron === CRON_ARCHIVE ? runMediaArchive
              : event.cron === CRON_SWEEP ? runGenSweep
              : runVideoSchedules
    ctx.waitUntil(job(env).then((s) => {
      // 실패 사유를 요약 줄에 같이 싣는다. 따로 남긴 error 줄을 찾아 헤매지 않도록.
      const bad = s.filter((x) => !x.ok)
      const why = bad.map((x) => `${x.step} → ${String(x.body).slice(0, 200)}`).join(' | ')
      console.log(`[cron] ${event.cron} 완료 — ${s.length}단계, 실패 ${bad.length}` + (why ? ` · ${why}` : ''))
    }))
  },

  // 수동 실행/점검용. 시크릿과 같은 토큰을 요구하므로 아무나 두드릴 수 없다.
  //   curl -X POST -H "X-Cron-Token: ..." https://bygency-cron.<계정>.workers.dev/run?job=video
  async fetch(request, env) {
    const url = new URL(request.url)
    const jsonRes = (o, s = 200) =>
      new Response(JSON.stringify(o, null, 2), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } })

    if (url.pathname === '/' || url.pathname === '/health')
      return jsonRes({ ok: true, worker: 'kiwi-keyword-analyzer', site: siteUrl(env), tokenSet: !!env.CRON_TOKEN })

    if (url.pathname !== '/run') return jsonRes({ ok: false, error: 'not found' }, 404)
    if (!env.CRON_TOKEN || (request.headers.get('X-Cron-Token') || '') !== env.CRON_TOKEN)
      return jsonRes({ ok: false, error: '인증 실패' }, 401)

    const job = url.searchParams.get('job') || 'video'
    const steps = job === 'naver' ? await runNaverTracking(env)
                : job === 'archive' ? await runMediaArchive(env)
                : job === 'sweep' ? await runGenSweep(env)
                : await runVideoSchedules(env)
    return jsonRes({ ok: steps.every((s) => s.ok), job, steps })
  },
}
