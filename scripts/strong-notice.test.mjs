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
    module: { exports: {} }, exports: {}, require: require_, console,
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
          if (/FROM users|session/i.test(s)) return sessionUser
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
          return { success: true, meta: { changes: 1 } }
        },
      }
      return stmt
    },
    batch: async () => [],
    exec: async () => ({}),
    dump: async () => new ArrayBuffer(0),
    __camps: camps, __events: events, __snoozes: snoozes,
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
async function visit(db, { path = '/', visitor = 'vz_1' } = {}) {
  const request = new Request(`https://bygency.com/api/public-notices?path=${encodeURIComponent(path)}&visitor=${visitor}`)
  const res = await publicNotices.onRequestGet(ctx(db, request))
  return (await res.json()).notices || []
}
async function act(db, { campaignId, visitor = 'vz_1', kind, days, path = '/' }) {
  const request = new Request('https://bygency.com/api/public-notices', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://bygency.com' },
    body: JSON.stringify({ campaignId, visitor, kind, days, path }),
  })
  const res = await publicNotices.onRequestPost(ctx(db, request))
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

console.log('\n⑦ 화면 쪽 구현이 요구를 지키는지 (정중앙 · 미디어 재생 · 보지 않기)')
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

console.log(failed === 0 ? '\n강력 알림 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
