/* 강력 알림(광고 집행) 회귀 테스트 —  node scripts/strong-notice.test.mjs
 *
 * 관리자가 강력 알림을 집행하면 방문자 화면 정중앙에 떠야 하고,
 * 집행 기간·CTA·미디어·"N일 보지 않기"·성과 집계가 전부 맞물려야 한다.
 * 한 칸만 어긋나도 "광고를 내보냈는데 아무도 못 봤다" 또는 "성과가 0으로 보인다" 가 된다.
 *
 * 그래서 진짜 핸들러(admin/notices · public-notices)를 인메모리 D1 위에서 순서대로 돌려
 * 관리자가 넣은 값이 방문자에게 그대로 나가는지, 그리고 방문자의 동작이 관리자 화면으로
 * 정확히 돌아오는지를 본다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console, AbortController,
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto, fetch,
    btoa, atob, setTimeout, clearTimeout, structuredClone,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

let failed = 0
const ok = (cond, name, detail = '') => {
  if (cond) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

/* ── 인메모리 D1 ──
   notice_campaigns / notice_visitor_events / notice_snoozes 만 흉내 낸다.
   ALTER TABLE 로 붙는 컬럼(strong·snooze_days 등)은 행 객체에 기본값으로 넣어 둔다. */
function makeDB(sessionUser) {
  let who = sessionUser          // 지금 이 요청을 보낸 사람(관리자 발송 → 방문 로 바꿔 가며 쓴다)
  const camps = new Map()
  const events = new Map()   // "campaign|visitor|kind" → row  (실제 UNIQUE INDEX 와 같은 열쇠)
  const snoozes = new Map()  // "campaign|visitor" → row
  const audit = []

  const colsOf = (sql) => {
    const m = /INSERT INTO \w+ \(([^)]*)\)/i.exec(sql)
    return m ? m[1].split(',').map((c) => c.trim()) : []
  }

  return {
    prepare(sql) {
      const s = String(sql)
      let b = []
      const stmt = {
        bind: (...a) => { b = a; return stmt },
        first: async () => {
          if (/FROM notice_campaigns WHERE id/i.test(s)) return camps.get(b[0]) || null
          if (/COUNT\(\*\).*FROM notice_snoozes/i.test(s))
            return { n: [...snoozes.values()].filter((r) => r.campaign_id === b[0]).length }
          if (/FROM users|session/i.test(s)) return who
          return null
        },
        all: async () => {
          if (/FROM notice_campaigns/i.test(s)) {
            let rows = [...camps.values()]
            if (/target = 'visitors'/i.test(s)) rows = rows.filter((r) => r.target === 'visitors')
            rows.sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))
            return { results: rows }
          }
          if (/FROM notice_snoozes/i.test(s)) {
            // WHERE visitor = ? AND until > ?
            const rows = [...snoozes.values()].filter((r) => r.visitor === b[0] && r.until > b[1])
            return { results: rows }
          }
          if (/FROM notice_visitor_events/i.test(s)) {
            let rows = [...events.values()]
            if (/WHERE visitor = \? AND kind = 'read'/i.test(s)) rows = rows.filter((r) => r.visitor === b[0] && r.kind === 'read')
            else if (/WHERE campaign_id = \?/i.test(s)) rows = rows.filter((r) => r.campaign_id === b[0])
            if (/GROUP BY kind/i.test(s)) {
              const byKind = {}
              for (const r of rows) {
                const k = (byKind[r.kind] ||= { kind: r.kind, total: 0, members: 0, guests: 0 })
                k.total++
                if (r.is_member === 1 || r.is_member === 2) k.members++
                else k.guests++
              }
              return { results: Object.values(byKind) }
            }
            return { results: rows }
          }
          return { results: [] }
        },
        run: async () => {
          if (/INSERT INTO notice_campaigns/i.test(s)) {
            const cols = colsOf(s)
            // 값 자리에 리터럴('visitors', 0)이 섞여 있어 컬럼 수와 바인드 수가 다르다 — 뒤에서부터 맞춘다.
            const vals = /VALUES \(([^)]*)\)/i.exec(s)[1].split(',').map((v) => v.trim())
            const row = { strong: 0, snooze_days: 3, scope_path: null, start_at: null, end_at: null }
            let bi = 0
            cols.forEach((c, i) => {
              const v = vals[i]
              if (v === '?') row[c] = b[bi++]
              else row[c] = v.replace(/^'|'$/g, '') === v ? Number(v) : v.replace(/^'|'$/g, '')
            })
            camps.set(row.id, row)
          }
          if (/INSERT OR IGNORE INTO notice_visitor_events/i.test(s)) {
            const [id, campaign_id, visitor, ip, user_id, is_member, member_email, kind, path, created_at] = b
            const key = `${campaign_id}|${visitor}|${kind}`
            if (!events.has(key)) events.set(key, { id, campaign_id, visitor, ip, user_id, is_member, member_email, kind, path, created_at })
          }
          if (/INSERT INTO notice_snoozes/i.test(s)) {
            const [campaign_id, visitor, until, created_at] = b
            snoozes.set(`${campaign_id}|${visitor}`, { campaign_id, visitor, until, created_at })  // ON CONFLICT DO UPDATE
          }
          if (/INSERT INTO audit/i.test(s)) audit.push(b)
          //  발송 취소(삭제) — 캠페인과 딸린 기록을 실제로 지운다
          if (/DELETE FROM notice_campaigns/i.test(s)) camps.delete(b[0])
          if (/DELETE FROM notice_visitor_events/i.test(s))
            for (const [k, v] of events) if (v.campaign_id === b[0]) events.delete(k)
          if (/DELETE FROM notice_snoozes/i.test(s))
            for (const [k, v] of snoozes) if (v.campaign_id === b[0]) snoozes.delete(k)
          return { success: true, meta: { changes: 1 } }
        },
      }
      return stmt
    },
    batch: async () => [],
    exec: async () => ({}),
    dump: async () => new ArrayBuffer(0),
    __camps: camps, __events: events, __snoozes: snoozes,
    //  발송은 관리자로, 방문은 회원/비회원으로 — 같은 DB 에서 사람만 바꿔 끼운다
    __as(u) { who = u; return this },
  }
}

const ADMIN = { id: 'a1', user_id: 'a1', email: 'admin@bygency.com', name: '관리자', role: 'admin', expires_at: '2099-01-01T00:00:00Z' }

const adminNotices = await load('functions/api/admin/notices.ts')
const publicNotices = await load('functions/api/public-notices.ts')

const ctx = (db, request) => ({ request, env: { DB: db, marketing: db }, params: {}, waitUntil: () => {}, next: async () => new Response('') })

async function send(db, payload) {
  const request = new Request('https://bygency.com/api/admin/notices', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'bg_session=fake', origin: 'https://bygency.com' },
    body: JSON.stringify(payload),
  })
  const res = await adminNotices.onRequestPost(ctx(db, request))
  return { status: res.status, body: await res.json() }
}
/* loggedIn=true 면 세션 쿠키를 실어 보낸다 — 로그인한 회원이 접속한 상황이다.
   쿠키가 없으면 서버는 비회원으로 분류하므로, 회원/비회원 집계를 보려면 이 구분이 필요하다. */
async function visit(db, { path = '/', visitor = 'vz_1', loggedIn = false } = {}) {
  const request = new Request(`https://bygency.com/api/public-notices?path=${encodeURIComponent(path)}&visitor=${visitor}`,
    loggedIn ? { headers: { cookie: 'bg_session=fake' } } : undefined)
  const res = await publicNotices.onRequestGet(ctx(db, request))
  return (await res.json()).notices || []
}
async function act(db, { campaignId, visitor = 'vz_1', kind, days, path = '/', loggedIn = false }) {
  const request = new Request('https://bygency.com/api/public-notices', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://bygency.com', ...(loggedIn ? { cookie: 'bg_session=fake' } : {}) },
    body: JSON.stringify({ campaignId, visitor, kind, days, path }),
  })
  const res = await publicNotices.onRequestPost(ctx(db, request))
  return { status: res.status, body: await res.json() }
}

async function detail(db, id) {
  const request = new Request(`https://bygency.com/api/admin/notices?id=${encodeURIComponent(id)}`, {
    headers: { cookie: 'bg_session=fake', origin: 'https://bygency.com' },
  })
  const res = await adminNotices.onRequestGet(ctx(db, request))
  return { status: res.status, body: await res.json() }
}
async function remove(db, id) {
  const request = new Request(`https://bygency.com/api/admin/notices?id=${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { cookie: 'bg_session=fake', origin: 'https://bygency.com' },
  })
  const res = await adminNotices.onRequestDelete(ctx(db, request))
  return { status: res.status, body: await res.json() }
}

const AD = {
  title: '7월 한정 · 영상 제작 반값',
  body: '지금 신청하면 첫 달 50% 할인.',
  target: 'visitors',
  imageUrl: '/api/media/ad.jpg',
  videoUrl: '/api/media/ad.mp4',
  ctaLabel: '지금 신청하기',
  ctaUrl: '/signup?utm=strong-notice',
  strong: true,
  snoozeDays: 3,
}

console.log('\n① 관리자가 넣은 값이 방문자에게 그대로 나간다')
let campId = ''
{
  const db = makeDB(ADMIN)
  const r = await send(db, AD)
  ok(r.body.ok === true, '강력 알림 집행이 생성된다', JSON.stringify(r.body))
  ok(r.body.strong === true, '강력 알림으로 저장된다')
  campId = r.body.campaignId

  const seen = await visit(db)
  ok(seen.length === 1, '방문자에게 노출된다', `${seen.length}건`)
  const n = seen[0]
  ok(n.strong === true, '강력 알림 표시가 방문자 쪽으로 전달된다 → 화면 정중앙 모달')
  ok(n.snoozeDays === 3, '"3일 동안 보지 않기" 일수가 전달된다', `${n.snoozeDays}`)
  ok(n.imageUrl === AD.imageUrl, '사진이 전달된다')
  ok(n.videoUrl === AD.videoUrl, '영상이 전달된다')
  ok(n.ctaLabel === AD.ctaLabel && n.ctaUrl === AD.ctaUrl, 'CTA 라벨·링크가 전달된다')
  ok(n.title === AD.title && n.body === AD.body, '제목·내용이 전달된다')

  /* 종료 시각과 서버 시각도 함께 내려 준다.
     이게 없으면 화면은 다음 폴링(45초)이 와야 집행이 끝난 걸 알아, 끝난 광고가 최대 45초 더 떠 있었다.
     now 를 같이 주는 이유는 방문자 PC 시계가 틀어져 있을 수 있어서다. */
  const withEnd = await send(db, { ...AD, endAt: new Date(Date.now() + 3600000).toISOString() })
  const seen2 = await visit(db, { visitor: 'vz_end' })
  const e = seen2.find((x) => x.id === withEnd.body.campaignId)
  ok(!!e && !!e.endAt, '집행 종료 시각이 방문자 쪽으로 전달된다', e && e.endAt)
  const raw = await (async () => {
    const request = new Request('https://bygency.com/api/public-notices?path=/&visitor=vz_end2')
    return (await (await publicNotices.onRequestGet(ctx(db, request))).json())
  })()
  ok(!!raw.now && Math.abs(Date.parse(raw.now) - Date.now()) < 5000, '서버 시각을 함께 준다(시계 차이 보정용)', raw.now)
}

console.log('\n② 집행 날짜 — 시작 전에는 안 뜨고, 기간 안에서만 뜨고, 끝나면 사라진다')
{
  const db = makeDB(ADMIN)
  const now = Date.now()
  const iso = (ms) => new Date(ms).toISOString()

  const future = await send(db, { ...AD, title: '아직 시작 전', startAt: iso(now + 86400000), endAt: iso(now + 2 * 86400000) })
  const live = await send(db, { ...AD, title: '집행 중', startAt: iso(now - 3600000), endAt: iso(now + 3600000) })
  const past = await send(db, { ...AD, title: '이미 끝남', startAt: iso(now - 2 * 86400000), endAt: iso(now - 86400000) })
  ok(future.body.ok && live.body.ok && past.body.ok, '세 집행이 모두 생성된다')

  const seen = await visit(db, { visitor: 'vz_date' })
  const ids = seen.map((n) => n.id)
  ok(ids.length === 1 && ids[0] === live.body.campaignId, '집행 기간 안인 것만 노출된다', seen.map((n) => n.title).join(', '))

  //  거꾸로 된 기간은 저장 자체가 막혀야 한다 — 통과시키면 영원히 안 뜨는 집행이 만들어진다
  const bad = await send(db, { ...AD, startAt: iso(now + 86400000), endAt: iso(now) })
  ok(bad.status === 400, '종료가 시작보다 앞서면 거부된다', `status ${bad.status}`)
}

console.log('\n③ "N일 동안 보지 않기" 가 실제로 숨긴다')
{
  const db = makeDB(ADMIN)
  const r = await send(db, { ...AD, snoozeDays: 3, endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
  const id = r.body.campaignId

  ok((await visit(db, { visitor: 'vz_s' })).length === 1, '누르기 전에는 보인다')
  const sn = await act(db, { campaignId: id, visitor: 'vz_s', kind: 'snooze', days: 3 })
  ok(sn.body.snoozedDays === 3, '3일 스누즈가 기록된다', JSON.stringify(sn.body))
  ok((await visit(db, { visitor: 'vz_s' })).length === 0, '누른 뒤에는 그 방문자에게 안 보인다')
  ok((await visit(db, { visitor: 'vz_other' })).length === 1, '다른 방문자에게는 그대로 보인다(개인별 숨김)')

  //  숨김 기한은 정확히 N일이어야 한다 — 여기가 틀리면 광고가 너무 일찍/늦게 다시 뜬다
  const row = [...db.__snoozes.values()][0]
  const days = (Date.parse(row.until) - Date.now()) / 86400000
  ok(Math.abs(days - 3) < 0.01, '숨김 기한이 정확히 3일 뒤다', `${days.toFixed(3)}일`)

  //  집행마다 일수가 다를 수 있다
  const db2 = makeDB(ADMIN)
  const r2 = await send(db2, { ...AD, snoozeDays: 7, endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
  const seen2 = await visit(db2, { visitor: 'vz_7' })
  ok(seen2[0].snoozeDays === 7, '집행마다 다른 일수를 쓸 수 있다(7일)', `${seen2[0].snoozeDays}`)
  await act(db2, { campaignId: r2.body.campaignId, visitor: 'vz_7', kind: 'snooze', days: 7 })
  const d7 = (Date.parse([...db2.__snoozes.values()][0].until) - Date.now()) / 86400000
  ok(Math.abs(d7 - 7) < 0.01, '7일 집행은 7일 뒤에 풀린다', `${d7.toFixed(3)}일`)
}

console.log('\n④ 신청(CTA)까지 — 전환이 기록되고 링크가 실제로 갈 수 있는 주소다')
{
  const db = makeDB(ADMIN)
  const r = await send(db, AD)
  const id = r.body.campaignId
  await visit(db, { visitor: 'vz_c' })

  const conv = await act(db, { campaignId: id, visitor: 'vz_c', kind: 'convert' })
  ok(conv.body.ok === true, 'CTA 클릭(전환)이 기록된다')

  const stats = await statsOf(db, id)
  ok(stats.views.total === 1, '노출 1건', JSON.stringify(stats.views))
  ok(stats.conversions.total === 1, '전환 1건', JSON.stringify(stats.conversions))

  //  같은 사람이 두 번 눌러도 전환은 1건 — 성과가 부풀지 않아야 한다
  await act(db, { campaignId: id, visitor: 'vz_c', kind: 'convert' })
  ok((await statsOf(db, id)).conversions.total === 1, '같은 방문자가 다시 눌러도 전환은 1건')

  /* CTA 링크가 실제로 우리 사이트 안의 살아 있는 경로인지 — 신청 페이지가 정말 있는지 본다.
     여기가 없으면 "눌렀는데 404" 가 된다. */
  const path = AD.ctaUrl.split('?')[0]
  const built = fs.existsSync('out' + path + '.html') || fs.existsSync('out' + path + '/index.html')
  const src = fs.existsSync('app' + path + '/page.tsx')
  ok(built || src, `CTA 링크(${path})가 실제로 존재하는 페이지다`, built ? '빌드 산출물 확인' : '소스 확인')

  //  바깥 주소·잘못된 스킴은 막혀야 한다(팝업에서 javascript: 가 실행되면 안 된다)
  const bad = await send(db, { ...AD, ctaUrl: 'javascript:alert(1)' })
  ok(bad.status === 400, 'javascript: 링크는 거부된다', `status ${bad.status}`)
  const rel = await send(db, { ...AD, ctaUrl: 'signup' })
  ok(rel.status === 400, '/ 로 시작하지 않는 링크는 거부된다', `status ${rel.status}`)
}

console.log('\n⑤ 성과 조회 — 관리자 화면이 읽는 값이 방문자 동작과 일치한다')
{
  const db = makeDB(ADMIN)
  const r = await send(db, { ...AD, endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
  const id = r.body.campaignId

  // 방문자 3명: 모두 노출, 1명 읽음(X), 1명 전환(CTA), 1명 스누즈
  for (const v of ['v1', 'v2', 'v3']) await visit(db, { visitor: v })
  await act(db, { campaignId: id, visitor: 'v1', kind: 'read' })
  await act(db, { campaignId: id, visitor: 'v2', kind: 'convert' })
  await act(db, { campaignId: id, visitor: 'v3', kind: 'snooze', days: 3 })

  const st = await statsOf(db, id)
  ok(st.views.total === 3, '노출 3', `${st.views.total}`)
  ok(st.reads.total === 1, '읽음 1', `${st.reads.total}`)
  ok(st.conversions.total === 1, '전환 1', `${st.conversions.total}`)
  ok(st.snoozes === 1, '보지 않기 1', `${st.snoozes}`)

  // 노출은 방문자·캠페인당 1건 — 새로고침해도 부풀지 않아야 한다
  for (let i = 0; i < 5; i++) await visit(db, { visitor: 'v1' })
  ok((await statsOf(db, id)).views.total === 3, '새로고침을 반복해도 노출은 늘지 않는다')
}

console.log('\n⑥ 강력 알림은 "접속 전체" 집행에서만 쓸 수 있다')
{
  const db = makeDB(ADMIN)
  const bad = await send(db, { ...AD, target: 'all' })
  ok(bad.status === 400, '회원 대상 알림에 강력 알림을 걸면 거부된다', `status ${bad.status}`)
  const okRes = await send(db, { ...AD, strong: false })
  ok(okRes.body.ok === true && okRes.body.strong === false, '강력 알림을 끄면 일반 방문자 팝업으로 나간다')
  const seen = await visit(db, { visitor: 'vz_n' })
  ok(seen[0] && seen[0].strong === false, '일반 팝업은 strong=false 로 내려간다 → 하단 토스트')
}

console.log('\n⑦ 비회원과 로그인한 회원 모두에게 나가고, 성과가 따로 집계된다')
{
  const MEMBER = { id: 'u9', user_id: 'u9', email: 'mem@x.co', name: '회원', role: 'user', expires_at: '2099-01-01T00:00:00Z' }
  //  ⓐ 로그인한 회원 — 세션이 있으면 회원으로 분류돼야 한다
  {
    const db = makeDB(ADMIN)
    const r = await send(db, { ...AD, endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
    db.__as(MEMBER)                                   // 여기부터는 로그인한 회원이 접속한 상황
    const seen = await visit(db, { visitor: 'vz_member', loggedIn: true })
    ok(seen.length === 1 && seen[0].strong === true, 'ⓐ 로그인한 회원에게도 강력 알림이 나간다', `${seen.length}건`)
    await act(db, { campaignId: r.body.campaignId, visitor: 'vz_member', kind: 'convert', loggedIn: true })
    const st = await statsOf(db, r.body.campaignId)
    ok(st.views.members === 1 && st.views.guests === 0, 'ⓐ 회원 노출로 집계된다', JSON.stringify(st.views))
    ok(st.conversions.members === 1, 'ⓐ 회원 전환으로 집계된다', JSON.stringify(st.conversions))
  }
  //  ⓑ 비회원 — 세션이 없으면 비회원으로 분류돼야 한다
  {
    const db = makeDB(ADMIN)
    const r = await send(db, { ...AD, endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
    db.__as(null)                                     // 여기부터는 로그인하지 않은 방문자
    const seen = await visit(db, { visitor: 'vz_guest' })
    ok(seen.length === 1 && seen[0].strong === true, 'ⓑ 비회원에게도 강력 알림이 나간다', `${seen.length}건`)
    const st = await statsOf(db, r.body.campaignId)
    ok(st.views.guests === 1 && st.views.members === 0, 'ⓑ 비회원 노출로 집계된다', JSON.stringify(st.views))
  }
  /* 화면 쪽: 회원 콘솔에서도 강력 알림이 떠야 한다.
     예전에는 /dashboard 로 시작하는 경로를 통째로 건너뛰어, 로그인한 회원은 집행을 한 번도 못 봤다. */
  const pop = fs.readFileSync('components/PublicNoticePopups.tsx', 'utf8')
  /* skip 에 회원 콘솔이 들어가면 로그인한 회원이 집행을 다시 못 보게 된다.
     가입·로그인 화면(isFunnelPath)이 들어가는 것은 의도한 것이다 — 거기서는 광고가 길을 막고,
     보지도 않은 노출이 쌓인다. 그래서 "회원 콘솔만" 콕 집어 확인한다. */
  const skipLine = (/const skip = .*/.exec(pop) || [''])[0]
  ok(/isAdminConsole/.test(skipLine) && !/isMemberConsole/.test(skipLine),
     '관리자 콘솔·가입 길목만 제외한다(회원 콘솔을 통째로 건너뛰지 않는다)', skipLine)
  ok(/isFunnelPath/.test(skipLine), '가입·로그인 화면에서는 조회 자체를 하지 않는다(헛노출 방지)', skipLine)
  /* 회원 콘솔에서는 토스트만 빼고 강력 알림은 띄운다.
     강력 알림이 떠 있는 동안에도 토스트를 뺀다 — 가림막 뒤에 깔려 눌리지 않는 유령 카드가 되기 때문이다. */
  const toastLine = (/const toasts = .*/.exec(pop) || [''])[0]
  ok(/isMemberConsole/.test(toastLine) && /\[\]/.test(toastLine), '회원 콘솔에서는 일반 토스트만 빼고 강력 알림은 띄운다', toastLine)
  ok(/strongOne/.test(toastLine), '강력 알림이 떠 있으면 토스트를 띄우지 않는다(가림막 뒤 유령 카드 방지)', toastLine)
}

console.log('\n⑧ 관리자 상세 조회에 강력 알림 정보와 성과가 함께 나온다')
{
  const db = makeDB(ADMIN)
  const r = await send(db, { ...AD, snoozeDays: 7, scopePath: '/pricing', endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
  const id = r.body.campaignId
  await visit(db, { path: '/pricing', visitor: 'd1' })
  await act(db, { campaignId: id, visitor: 'd1', kind: 'convert', path: '/pricing' })
  await act(db, { campaignId: id, visitor: 'd2', kind: 'snooze', days: 7 })

  const d = await detail(db, id)
  ok(d.body.ok === true, '상세 조회가 된다', JSON.stringify(d.body).slice(0, 120))
  const c = d.body.campaign || {}
  ok(c.strong === true, '강력 알림 여부가 나온다', String(c.strong))
  ok(c.snoozeDays === 7, '보지 않기 일수가 나온다', String(c.snoozeDays))
  ok(c.scopePath === '/pricing', '집행 경로가 나온다', c.scopePath)
  ok(!!c.endAt, '집행 종료 시각이 나온다', c.endAt)
  const vs = d.body.visitorStats || {}
  ok(vs.views?.total === 1, '노출 집계가 함께 나온다', JSON.stringify(vs.views))
  ok(vs.conversions?.total === 1, '전환 집계가 함께 나온다', JSON.stringify(vs.conversions))
  ok(vs.snoozes === 1, '보지 않기 집계가 함께 나온다', String(vs.snoozes))
}

console.log('\n⑨ 경로 한정 집행은 그 경로에서만 나간다')
{
  const db = makeDB(ADMIN)
  const r = await send(db, { ...AD, scopePath: '/pricing', endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
  ok((await visit(db, { path: '/pricing', visitor: 'p1' })).length === 1, '지정 경로에서는 나간다')
  ok((await visit(db, { path: '/pricing/detail', visitor: 'p2' })).length === 1, '하위 경로에서도 나간다')
  ok((await visit(db, { path: '/', visitor: 'p3' })).length === 0, '다른 경로에서는 나가지 않는다')
  ok(r.body.ok === true, '경로 한정 강력 집행이 생성된다')
}

console.log('\n⑩ 발송 취소(삭제)하면 집행과 기록이 함께 사라진다')
{
  const db = makeDB(ADMIN)
  const r = await send(db, { ...AD, endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
  const id = r.body.campaignId
  await visit(db, { visitor: 'x1' })
  await act(db, { campaignId: id, visitor: 'x1', kind: 'convert' })
  await act(db, { campaignId: id, visitor: 'x2', kind: 'snooze', days: 3 })
  ok(db.__events.size > 0 && db.__snoozes.size > 0, '삭제 전에는 기록이 있다')

  const del = await remove(db, id)
  ok(del.body.ok === true, '삭제된다', JSON.stringify(del.body))
  ok((await visit(db, { visitor: 'x3' })).length === 0, '삭제 후에는 더 이상 노출되지 않는다')
  ok(db.__events.size === 0, '방문자 이벤트도 함께 지워진다', `${db.__events.size}건 남음`)
  ok(db.__snoozes.size === 0, '숨김 기록도 함께 지워진다', `${db.__snoozes.size}건 남음`)
  ok((await remove(db, id)).status === 404, '없는 집행을 지우려 하면 404 다')
}

console.log('\n⑪ 잘못된 입력과 권한 없는 요청을 막는다')
{
  const db = makeDB(ADMIN)
  //  미디어 주소도 CTA 와 같은 기준으로 막아야 한다 — 팝업 안에서 실행되면 안 된다
  ok((await send(db, { ...AD, imageUrl: 'javascript:alert(1)' })).status === 400, '사진 주소에 javascript: 는 거부된다')
  ok((await send(db, { ...AD, videoUrl: 'javascript:alert(1)' })).status === 400, '영상 주소에 javascript: 는 거부된다')
  ok((await send(db, { ...AD, scopePath: 'pricing' })).status === 400, '/ 로 시작하지 않는 경로는 거부된다')
  ok((await send(db, { ...AD, title: '' })).status === 400, '제목이 비면 거부된다')

  //  보지 않기 일수는 1~30 으로 강제돼야 한다(0 이면 영원히 안 숨고, 9999 면 사실상 영구 차단)
  const zero = await send(db, { ...AD, snoozeDays: 0 })
  ok(zero.body.snoozeDays === 3, '0 을 넣으면 기본 3일로 잡힌다', String(zero.body.snoozeDays))
  const huge = await send(db, { ...AD, snoozeDays: 9999 })
  ok(huge.body.snoozeDays === 30, '너무 큰 값은 30일로 잘린다', String(huge.body.snoozeDays))

  //  방문자 쪽에서 임의 일수를 보내도 서버가 잘라야 한다
  const camp = await send(db, { ...AD, endAt: new Date(Date.now() + 30 * 86400000).toISOString() })
  const sn = await act(db, { campaignId: camp.body.campaignId, visitor: 'z1', kind: 'snooze', days: 9999 })
  ok(sn.body.snoozedDays === 30, '방문자가 9999일을 보내도 30일로 잘린다', String(sn.body.snoozedDays))

  //  관리자가 아니면 집행할 수 없다
  const dbUser = makeDB({ id: 'u1', user_id: 'u1', email: 'u@x.co', name: '회원', role: 'user', expires_at: '2099-01-01T00:00:00Z' })
  ok((await send(dbUser, AD)).status === 403, '일반 회원은 집행할 수 없다')
  const dbNone = makeDB(null)
  ok((await send(dbNone, AD)).status === 401, '비로그인은 집행할 수 없다')
  ok((await detail(dbUser, 'nc_x')).status === 403, '일반 회원은 성과를 볼 수 없다')
  ok((await remove(dbUser, 'nc_x')).status === 403, '일반 회원은 집행을 지울 수 없다')
}

console.log('\n⑫ 화면 쪽 구현이 요구를 지키는지 (정중앙 · 미디어 재생 · 보지 않기)')
{
  const pop = fs.readFileSync('components/PublicNoticePopups.tsx', 'utf8')
  const media = fs.readFileSync('components/NoticeMedia.tsx', 'utf8')

  ok(/StrongNoticeModal/.test(pop) && /n\.strong/.test(pop), '강력 알림이면 전용 모달로 분기한다')
  ok(/fixed inset-0[^"]*flex items-center justify-center/.test(pop), '모달이 화면 정중앙에 놓인다(inset-0 + 중앙 정렬)')
  ok(/bg-black\/70/.test(pop), '뒤 화면을 가리는 가림막이 있다')
  ok(/role="dialog"[\s\S]{0,80}aria-modal="true"/.test(pop), '스크린리더에 모달로 알린다')
  ok(/e\.key === 'Escape'/.test(pop), 'Esc 로 빠져나갈 수 있다(키보드만 쓰는 사람)')
  ok(/document\.body\.style\.overflow = 'hidden'/.test(pop), '열려 있는 동안 뒤 페이지 스크롤을 잠근다')
  ok(/snoozeLabel/.test(pop) && /일 동안 보지 않기/.test(pop), '"N일 동안 보지 않기" 버튼이 있다')
  /* 가림막 클릭으로 닫히면 광고가 실수로 사라진다 — onClick 이 가림막에 붙어 있으면 안 된다 */
  const overlay = /aria-hidden="true"[\s\S]{0,220}?bg-black\/70/.test(pop)
  ok(overlay && !/bg-black\/70[\s\S]{0,120}onClick/.test(pop), '가림막 클릭으로는 닫히지 않는다(실수 방지)')

  ok(/autoPlay/.test(media) && /playsInline/.test(media), '영상이 자동 재생된다(모바일 포함)')
  ok(/controls/.test(media), '영상 재생 컨트롤이 있다')
  ok(/<img/.test(media), '사진도 표시된다')
  ok(/full \?/.test(media), '강력 알림에서는 미디어를 잘라내지 않고 크게 보여 준다')
}

async function statsOf(db, id) {
  const n = await load('functions/api/_notices.ts')
  return n.getVisitorStats(db, id)
}

console.log('\n⑯ 방문자 id 가 없는 기록은 아예 받지 않는다 (집계가 스스로 어긋나지 않게)')
{
  /* 노출(GET)은 빈 id 를 건너뛴다. 그런데 POST 만 받아 주면
       · 서로 다른 사람의 전환이 (campaign, '', kind) 한 줄로 뭉쳐 1건으로 세지고
       · 노출 0 인데 전환이 있는 화면이 나오고
       · 스누즈는 저장 키가 방문자라서 남지 않는데 ok 라고 답한다.
     시크릿 모드처럼 저장소가 막힌 브라우저에서 실제로 그랬다. */
  const db = makeDB(ADMIN)
  const sent = await send(db, { ...AD, snoozeDays: 3 })
  ok(sent.body.ok === true, '집행이 만들어졌다(뒤 단언들이 헛돌지 않게 먼저 확인)', JSON.stringify(sent.body))
  const id = sent.body.campaignId

  const conv = await act(db, { campaignId: id, visitor: '', kind: 'convert' })
  ok(conv.body.ok === false && /방문자/.test(String(conv.body.error)), '방문자 id 없는 전환은 거절한다', JSON.stringify(conv.body))
  const s1 = await statsOf(db, id)
  ok(s1.conversions.total === 0, '거절했으니 전환으로 세지 않는다', String(s1.conversions.total))

  const rd = await act(db, { campaignId: id, visitor: '', kind: 'read' })
  ok(rd.body.ok === false && /방문자/.test(String(rd.body.error)), '방문자 id 없는 읽음도 거절한다', JSON.stringify(rd.body))

  const sn = await act(db, { campaignId: id, visitor: '', kind: 'snooze', days: 3 })
  ok(sn.body.ok === false && /방문자/.test(String(sn.body.error)), '저장도 못 하면서 스누즈를 성공이라고 답하지 않는다', JSON.stringify(sn.body))
  ok(sn.body.snoozedDays === undefined, '보지 않기 일수를 알려 주지 않는다')
  const s2 = await statsOf(db, id)
  ok(s2.snoozes === 0, '스누즈로도 세지 않는다', String(s2.snoozes))

  //  정상 방문자는 그대로 세어야 한다 — 막느라 기능을 죽이지 않았다
  await visit(db, { visitor: 'vz_ok1' })
  const good = await act(db, { campaignId: id, visitor: 'vz_ok1', kind: 'convert' })
  ok(good.body.ok === true, '방문자 id 가 있으면 정상 기록된다', JSON.stringify(good.body))
  const s3 = await statsOf(db, id)
  ok(s3.conversions.total === 1, '정상 전환은 정확히 1건으로 센다', String(s3.conversions.total))
  ok(s3.views.total >= 1, '노출도 세어져 전환이 노출을 넘지 않는다', `노출 ${s3.views.total} · 전환 ${s3.conversions.total}`)
}

console.log('\n⑰ 다른 사이트에서 보낸 기록 요청은 받지 않는다 (CSRF)')
{
  /* 이 POST 는 로그인 없이도 통하는 공개 엔드포인트다. 출처를 안 보면
     남의 사이트가 방문자 브라우저를 빌려 전환·읽음·스누즈를 마음대로 찍을 수 있다 —
     광고 성과가 조작되고, 남의 광고를 방문자 몰래 "보지 않기" 로 꺼 버릴 수도 있다. */
  const db = makeDB(ADMIN)
  const sent = await send(db, { ...AD, snoozeDays: 3 })
  ok(sent.body.ok === true, '집행이 만들어졌다(뒤 단언들이 헛돌지 않게 먼저 확인)', JSON.stringify(sent.body))
  const id = sent.body.campaignId
  await visit(db, { visitor: 'vz_csrf' })

  const evil = async (kind) => {
    const request = new Request('https://bygency.com/api/public-notices', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example.com' },
      body: JSON.stringify({ campaignId: id, visitor: 'vz_csrf', kind, days: 3, path: '/' }),
    })
    const res = await publicNotices.onRequestPost(ctx(db, request))
    return { status: res.status, body: await res.json() }
  }

  const c = await evil('convert')
  ok(c.status === 403, '다른 사이트의 전환 기록은 403 이다', String(c.status))
  const s0 = await statsOf(db, id)
  ok(s0.conversions.total === 0, '전환으로 세지 않는다', String(s0.conversions.total))

  const sn = await evil('snooze')
  ok(sn.status === 403, '다른 사이트의 스누즈도 403 이다', String(sn.status))
  ok((await statsOf(db, id)).snoozes === 0, '스누즈로도 세지 않는다')
  ok((await visit(db, { visitor: 'vz_csrf' })).length === 1, '남의 사이트가 광고를 대신 꺼 버리지 못한다')

  //  우리 사이트에서 온 것은 그대로 통해야 한다
  const good = await act(db, { campaignId: id, visitor: 'vz_csrf', kind: 'convert' })
  ok(good.body.ok === true, '우리 사이트에서 온 기록은 정상 처리된다', JSON.stringify(good.body))
  ok((await statsOf(db, id)).conversions.total === 1, '정상 전환만 1건으로 센다')
}

console.log(failed === 0 ? '\n강력 알림 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
