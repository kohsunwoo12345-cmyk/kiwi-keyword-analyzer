/* 강력 알림 — 실제 브라우저 검증  (node scripts/strong-notice.ui.test.mjs)
 *
 * 서버 테스트(strong-notice.test.mjs)는 "값이 오가는가" 를 본다.
 * 여기서는 "사람 눈앞에서 실제로 그렇게 되는가" 를 본다 — 정중앙에 뜨는지, 영상이 정말 재생되는지,
 * 사진이 정말 디코딩되는지, 버튼을 눌렀을 때 서버로 무엇이 나가는지.
 * 화면 코드는 글자만 맞춰 놓고 실제로는 안 되는 경우가 흔해서, 이 층이 없으면 "됐다" 를 말할 수 없다.
 *
 * 빌드 산출물(out/)과 크로미움이 있어야 돌아간다. 둘 중 하나라도 없으면 조용히 건너뛴다
 * (빌드 없이 돌리는 환경에서 빨간 실패로 보이면 안 된다 — 건너뛴 사실은 화면에 남긴다).
 *   먼저 `npm run build` → 그 다음 `npm run test:ui`   (npm run verify 가 둘을 이어서 한다)
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const OUT = path.join(process.cwd(), 'out')
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome']
  .find((p) => fs.existsSync(p))

if (!fs.existsSync(path.join(OUT, 'index.html'))) {
  console.log('\n건너뜀 — 빌드 산출물(out/)이 없습니다. `npm run build` 뒤에 다시 실행하세요.\n')
  process.exit(0)
}
let chromium
try { ({ chromium } = require_('playwright')) } catch {
  console.log('\n건너뜀 — playwright 가 없습니다.\n')
  process.exit(0)
}

/* 검증용 사진을 코드에서 만든다 — 저장소에 바이너리를 넣지 않고도 "진짜 이미지" 를 쓴다.
   (외부 라이브러리 없이 최소 PNG 를 직접 인코딩) */
function makePng(w, h, rgb) {
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3).fill(Buffer.from(rgb))])
  const raw = Buffer.concat(Array.from({ length: h }, () => row))
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(body) >>> 0 : crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
const PNG = makePng(320, 180, [40, 90, 220])

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
               '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  let f = path.join(OUT, p)
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html')
  if (!fs.existsSync(f)) f = path.join(OUT, p + '.html')
  if (!fs.existsSync(f)) { res.writeHead(404); res.end('nf'); return }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' })
  res.end(fs.readFileSync(f))
})
await new Promise((r) => server.listen(0, r))
const BASE = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {})

/* ── 1) 브라우저가 직접 만든 진짜 webm ──
   ffmpeg 빌드에 인코더가 없어서, 크로미움의 MediaRecorder 로 실제 영상 파일을 만든다.
   크로미움이 만든 것을 크로미움이 재생하므로 "코덱이 없어서 못 틀었다" 는 변수가 사라진다. */
const mk = await browser.newContext()
const mkp = await mk.newPage()
await mkp.goto(BASE + '/')
const VIDEO_B64 = await mkp.evaluate(async () => {
  const cv = document.createElement('canvas')
  cv.width = 320; cv.height = 180
  const cx = cv.getContext('2d')
  let i = 0
  const timer = setInterval(() => { cx.fillStyle = `rgb(${(i * 9) % 256},${(255 - i * 5) % 256},120)`; cx.fillRect(0, 0, 320, 180); i++ }, 40)
  const rec = new MediaRecorder(cv.captureStream(25), { mimeType: 'video/webm' })
  const chunks = []
  rec.ondataavailable = (e) => chunks.push(e.data)
  rec.start()
  await new Promise((r) => setTimeout(r, 2000))
  await new Promise((r) => { rec.onstop = r; rec.stop() })
  clearInterval(timer)
  const buf = await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()
  let s = ''
  const b = new Uint8Array(buf)
  for (let k = 0; k < b.length; k++) s += String.fromCharCode(b[k])
  return btoa(s)
})
await mk.close()
const VIDEO = Buffer.from(VIDEO_B64, 'base64')
console.log(`\n테스트용 영상 ${VIDEO.length.toLocaleString()}바이트 · 사진 ${PNG.length}바이트 (브라우저가 직접 인코딩)\n`)

const NOTICE = {
  id: 'nc_strong', title: '7월 한정 · 영상 제작 반값', body: '지금 신청하면 첫 달 50% 할인.',
  imageUrl: '/__t/ad.png', videoUrl: '/__t/ad.webm',
  ctaLabel: '지금 신청하기', ctaUrl: '/signup', strong: true, snoozeDays: 3,
  createdAt: new Date().toISOString(),
}

/* 회원 콘솔은 로그인하지 않으면 /login 으로 튕긴다(ProfileGate).
   그대로 두면 "대시보드에서 확인했다" 가 사실은 /login 에서 확인한 것이 된다 — 실제로 그렇게 속았다.
   그래서 콘솔을 볼 때는 마케팅 플랜이 살아 있는 회원으로 로그인시킨다. */
const MEMBER_ME = {
  ok: true,
  user: {
    id: 'u9', name: '회원', email: 'mem@x.co', role: 'user', status: 'active',
    plan: 'Pro', planUntil: '2099-12-31', videoPlan: 'Pro', videoPlanUntil: '2099-12-31',
    addressComplete: true, credits: 1000,
  },
  creditPriceKrw: 65, maxNodes: 100,
}

async function open(notices, at = '/', { loggedIn = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const posts = []
  //  Playwright 는 "나중에 등록한 라우트" 를 먼저 본다 — 포괄 규칙을 맨 위에 둬야 구체 규칙이 이긴다.
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  if (loggedIn) await page.route('**/api/me*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MEMBER_ME) }))
  await page.route('**/__t/ad.webm', (r) => r.fulfill({ status: 200, contentType: 'video/webm', body: VIDEO }))
  await page.route('**/__t/ad.png', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }))
  await page.route('**/api/public-notices*', async (r) => {
    if (r.request().method() === 'POST') {
      posts.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, snoozedDays: 3 }) })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, notices }) })
  })
  await page.goto(BASE + at, { waitUntil: 'domcontentloaded' })
  return { ctx, page, posts }
}

console.log('① 강력 알림이 화면 정중앙에 뜬다')
{
  const { ctx, page } = await open([NOTICE])
  const modal = page.locator('[role="dialog"]')
  await modal.waitFor({ state: 'visible', timeout: 15000 })
  ok(true, '모달이 나타난다')

  const box = await modal.locator('> div').nth(1).boundingBox()
  const vp = page.viewportSize()
  const dx = Math.abs(box.x + box.width / 2 - vp.width / 2)
  const dy = Math.abs(box.y + box.height / 2 - vp.height / 2)
  ok(dx < 3 && dy < 3, '가로·세로 모두 화면 정중앙이다', `중심 오차 x${dx.toFixed(1)}px y${dy.toFixed(1)}px`)

  const dim = await page.locator('[role="dialog"] [aria-hidden="true"]').first().evaluate((el) => getComputedStyle(el).backgroundColor)
  ok(/rgba\(0, 0, 0, 0\.7\)/.test(dim), '뒤 화면이 가림막으로 덮인다', dim)
  ok(await page.evaluate(() => document.body.style.overflow) === 'hidden', '뒤 페이지 스크롤이 잠긴다')
  ok(await page.locator('[role="dialog"]').getAttribute('aria-modal') === 'true', '스크린리더에 모달로 알린다')
  await ctx.close()
}

console.log('\n② 영상이 실제로 재생된다')
{
  const { ctx, page } = await open([NOTICE])
  const v = page.locator('[role="dialog"] video')
  await v.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(1500)
  const st = await v.evaluate((el) => ({
    t: el.currentTime, paused: el.paused, w: el.videoWidth, h: el.videoHeight,
    ready: el.readyState, dur: el.duration, err: el.error ? el.error.code : 0,
  }))
  ok(st.err === 0, '영상 로드 오류가 없다', `error ${st.err}`)
  ok(st.w > 0 && st.h > 0, `영상 크기를 읽었다 (${st.w}×${st.h})`)
  ok(st.ready >= 3, '재생 가능한 상태까지 버퍼링됐다', `readyState ${st.ready}`)
  ok(!st.paused, '재생 중이다(멈춰 있지 않다)')
  ok(st.t > 0.2, '재생 위치가 실제로 흘렀다', `currentTime ${st.t.toFixed(2)}s`)

  /* 광고 영상은 loop 로 돈다 — 끝에 닿으면 시간이 0 으로 되감긴다.
     그래서 "커졌는가" 가 아니라 "실제로 프레임이 진행됐는가" 를 본다.
     timeupdate 이벤트 수 + 시간 변화량을 함께 보면 되감김도 진행으로 잡힌다. */
  const prog = await v.evaluate((el) => new Promise((r) => {
    const t0 = el.currentTime
    let ticks = 0
    const on = () => { ticks++ }
    el.addEventListener('timeupdate', on)
    setTimeout(() => { el.removeEventListener('timeupdate', on); r({ t0, t1: el.currentTime, ticks, dur: el.duration }) }, 900)
  }))
  const moved = prog.ticks > 0 && Math.abs(prog.t1 - prog.t0) > 0.1
  ok(moved, '계속 흘러간다(정지 프레임이 아니다)', `${prog.t0.toFixed(2)}s → ${prog.t1.toFixed(2)}s · timeupdate ${prog.ticks}회 · 길이 ${prog.dur.toFixed(2)}s`)
  await ctx.close()
}

console.log('\n③ 사진만 있는 집행은 사진이 실제로 그려진다')
{
  const { ctx, page } = await open([{ ...NOTICE, videoUrl: '' }])
  const img = page.locator('[role="dialog"] img')
  await img.waitFor({ state: 'visible', timeout: 15000 })
  const st = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight, done: el.complete }))
  ok(st.done && st.w > 0, `사진이 실제로 디코딩됐다 (${st.w}×${st.h})`)
  const box = await img.boundingBox()
  ok(box.width > 200 && box.height > 50, '사진이 화면에 실제 크기로 보인다', `${Math.round(box.width)}×${Math.round(box.height)}`)
  await ctx.close()
}

console.log('\n④ "3일 동안 보지 않기" 가 서버로 정확히 간다')
{
  const { ctx, page, posts } = await open([NOTICE])
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.getByRole('button', { name: /3일 동안 보지 않기/ }).click()
  await page.waitForTimeout(600)
  const sn = posts.find((p) => p.kind === 'snooze')
  ok(!!sn, '스누즈 요청이 전송된다', JSON.stringify(posts))
  ok(sn && sn.days === 3, '일수가 3일로 전달된다', sn && String(sn.days))
  ok(sn && sn.campaignId === NOTICE.id, '어느 집행인지 함께 전달된다')
  ok(await page.locator('[role="dialog"]').count() === 0, '누르면 모달이 닫힌다')
  ok(await page.evaluate(() => document.body.style.overflow) !== 'hidden', '닫으면 페이지 스크롤이 풀린다')
  await ctx.close()
}

console.log('\n⑤ 신청(CTA) — 전환이 기록되고 신청 페이지로 실제로 넘어간다')
{
  const { ctx, page, posts } = await open([NOTICE])
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.getByRole('button', { name: '지금 신청하기' }).click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)
  const cv = posts.find((p) => p.kind === 'convert')
  ok(!!cv, 'CTA 클릭이 전환으로 기록된다', JSON.stringify(posts))
  ok(new URL(page.url()).pathname.replace(/\/$/, '') === '/signup', '신청 페이지로 이동한다', page.url())
  //  이동한 곳이 진짜 신청 화면인지 — 입력칸이 실제로 있어야 "신청까지 문제 없음" 이다
  const inputs = await page.locator('form input, input[type="email"], input[type="password"]').count()
  ok(inputs >= 2, '신청 화면에 입력칸이 실제로 있다', `${inputs}개`)
  await ctx.close()
}

console.log('\n⑥ Esc 로 닫힌다 · 가림막을 눌러도 닫히지 않는다')
{
  const { ctx, page, posts } = await open([NOTICE])
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  //  가림막(모달 바깥 왼쪽 위)을 눌러 본다 — 광고가 실수로 사라지면 안 된다
  await page.mouse.click(20, 20)
  await page.waitForTimeout(400)
  ok(await page.locator('[role="dialog"]').count() === 1, '가림막 클릭으로는 닫히지 않는다')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  ok(await page.locator('[role="dialog"]').count() === 0, 'Esc 로는 닫힌다')
  ok(posts.some((p) => p.kind === 'read'), 'Esc 로 닫아도 읽음으로 기록된다')
  await ctx.close()
}

console.log('\n⑦ 일반 알림은 예전처럼 하단 토스트로 뜬다(강력 알림과 겹치지 않는다)')
{
  const soft = { ...NOTICE, id: 'nc_soft', strong: false, title: '일반 공지', videoUrl: '' }
  const { ctx, page } = await open([NOTICE, soft])
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  ok(await page.locator('[role="dialog"]').count() === 1, '강력 알림은 한 번에 하나만 뜬다')
  /* 강력 알림이 떠 있는 동안에는 토스트를 띄우지 않는다.
     토스트는 z-300, 모달 가림막은 z-400 이라 토스트가 가림막 뒤에 깔린다 —
     흐릿하게 보이는데 눌리지는 않는 유령 카드가 된다(실제 서버에서 확인했다). */
  ok(await page.getByText('일반 공지').count() === 0, '모달이 떠 있는 동안에는 토스트를 띄우지 않는다')

  //  모달을 닫으면 그때 토스트가 정상으로 뜨고, 실제로 눌린다
  await page.locator('[role="dialog"]').getByLabel('닫기').click()
  await page.waitForTimeout(900)
  const toast = page.getByText('일반 공지')
  ok(await toast.count() === 1, '모달을 닫으면 토스트가 뜬다')
  const tb = await toast.first().boundingBox()
  const vp = page.viewportSize()
  ok(tb.y > vp.height * 0.5, '토스트는 화면 아래쪽에 있다', `y=${Math.round(tb.y)} / ${vp.height}`)
  const onTop = await toast.first().evaluate((el) => {
    const card = el.closest('.pointer-events-auto') || el
    const r = card.getBoundingClientRect()
    const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return !!mid && card.contains(mid)
  })
  ok(onTop, '토스트가 가림막에 덮이지 않고 실제로 눌리는 상태다')
  await ctx.close()
}

console.log('\n⑧ 모바일에서도 정중앙에 들어오고 CTA 가 화면 안에 있다')
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.route('**/__t/ad.webm', (r) => r.fulfill({ status: 200, contentType: 'video/webm', body: VIDEO }))
  await page.route('**/__t/ad.png', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }))
  await page.route('**/api/public-notices*', (r) => r.request().method() === 'POST'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, notices: [NOTICE] }) }))
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })

  const card = await page.locator('[role="dialog"] > div').nth(1).boundingBox()
  const vp = page.viewportSize()
  ok(card.x >= 0 && card.x + card.width <= vp.width + 1, '모달이 가로로 넘치지 않는다', `${Math.round(card.x)}~${Math.round(card.x + card.width)} / ${vp.width}`)
  ok(card.height <= vp.height, '모달이 세로로 화면을 넘지 않는다', `${Math.round(card.height)} / ${vp.height}`)

  //  CTA 는 스크롤과 무관하게 화면 안에 있어야 한다 — 밀려나면 신청을 못 한다
  const cta = await page.getByRole('button', { name: '지금 신청하기' }).boundingBox()
  ok(cta && cta.y + cta.height <= vp.height + 1, 'CTA 버튼이 화면 안에 보인다', cta ? `아래끝 ${Math.round(cta.y + cta.height)} / ${vp.height}` : '없음')
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '가로 스크롤이 생기지 않는다')
  await ctx.close()
}

console.log('\n⑨ 로그인한 회원(대시보드)에서도 강력 알림이 뜬다 · 관리자 콘솔에서는 안 뜬다')
{
  const soft = { ...NOTICE, id: 'nc_soft2', strong: false, title: '일반 공지', videoUrl: '' }
  //  회원 콘솔 — 광고는 떠야 하고, 일반 토스트는 콘솔 자체 팝업과 겹치므로 안 떠야 한다
  {
    const { ctx, page } = await open([NOTICE, soft], '/dashboard_USE17237_612', { loggedIn: true })
    await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
    //  /login 으로 튕긴 채 확인하면 "대시보드에서 봤다" 가 거짓이 된다 — 경로를 반드시 확인한다.
    ok(new URL(page.url()).pathname.startsWith('/dashboard'), '실제로 회원 콘솔에 머물러 있다', page.url())
    ok(true, '회원 콘솔(대시보드)에서 강력 알림이 뜬다')
    const box = await page.locator('[role="dialog"] > div').nth(1).boundingBox()
    const vp = page.viewportSize()
    const dy = Math.abs(box.y + box.height / 2 - vp.height / 2)
    ok(dy < 3, '회원 콘솔에서도 화면 정중앙이다', `세로 오차 ${dy.toFixed(1)}px`)
    const v = page.locator('[role="dialog"] video')
    await page.waitForTimeout(1200)
    const st = await v.evaluate((el) => ({ t: el.currentTime, paused: el.paused }))
    ok(!st.paused && st.t > 0.2, '회원 콘솔에서도 영상이 실제로 재생된다', `currentTime ${st.t.toFixed(2)}s`)
    ok(await page.getByText('일반 공지').count() === 0, '일반 토스트는 회원 콘솔에서 뜨지 않는다(콘솔 자체 팝업과 겹치지 않게)')
    await ctx.close()
  }
  //  관리자 콘솔 — 광고를 만드는 화면을 그 광고가 가로막으면 안 된다
  {
    const { ctx, page } = await open([NOTICE], '/adminsunkoh028741_11263/notices')
    await page.waitForTimeout(2500)
    ok(await page.locator('[role="dialog"]').count() === 0, '관리자 콘솔에서는 뜨지 않는다')
    await ctx.close()
  }
  //  랜딩 페이지(공개) — 비회원이 보는 자리
  {
    const { ctx, page } = await open([NOTICE], '/pricing')
    await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
    ok(true, '공개 페이지(요금제)에서도 뜬다')
    await ctx.close()
  }
}

console.log('\n⑩ 더 이상 해당되지 않는 알림은 내려간다(따라다니지 않는다)')
{
  /* 서버가 지금 내려 주는 목록이 곧 "지금 떠 있어야 할 것" 이다.
     예전에는 합치기만 하고 빼지 않아서 한 번 뜬 알림이 세션 내내 따라다녔다 —
     랜딩 한정 집행이 다른 페이지까지 따라오고, 집행이 끝나도 열린 탭에서는 계속 떴다. */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  let servePath = null            // 이 경로에서만 집행을 내려 준다
  const AD = { ...NOTICE, id: 'nc_scoped', strong: false, title: '요금제 전용 광고', videoUrl: '', imageUrl: '' }
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/public-notices*', (r) => {
    if (r.request().method() === 'POST') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    const p = new URL(r.request().url()).searchParams.get('path')
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, notices: p === servePath ? [AD] : [] }) })
  })

  servePath = '/pricing'
  await page.goto(BASE + '/pricing', { waitUntil: 'domcontentloaded' })
  await page.getByText('요금제 전용 광고').waitFor({ timeout: 15000 })
  ok(true, '경로 한정 집행이 해당 경로에서 뜬다')

  //  다른 경로로 이동 — 서버는 더 이상 안 내려 준다
  await page.evaluate(() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await page.waitForTimeout(2500)
  ok(await page.getByText('요금제 전용 광고').count() === 0, '경로를 벗어나면 내려간다(따라다니지 않는다)')

  /* 집행이 끝나(서버가 목록에서 빼) 다시 그 경로로 와도 뜨지 않아야 한다.
     같은 경로에 머무는 동안에는 다음 폴링(45초 주기)에서 사라진다 — 그 주기가 지나치게 길지 않은지는
     아래에서 소스로 확인한다(브라우저 테스트에서 45초를 기다리게 하지 않는다). */
  servePath = '/pricing'
  await page.evaluate(() => { window.history.pushState({}, '', '/pricing'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await page.getByText('요금제 전용 광고').waitFor({ timeout: 15000 })
  ok(true, '다시 해당 경로로 오면 뜬다')
  servePath = '__none__'                               // 집행 종료
  await page.evaluate(() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await page.waitForTimeout(2000)
  await page.evaluate(() => { window.history.pushState({}, '', '/pricing'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await page.waitForTimeout(2500)
  ok(await page.getByText('요금제 전용 광고').count() === 0, '집행이 끝나면 그 경로로 돌아와도 뜨지 않는다')

  const src = fs.readFileSync('components/PublicNoticePopups.tsx', 'utf8')
  const iv = Number((/setInterval\(poll, (\d+)\)/.exec(src) || [])[1] || 0)
  ok(iv > 0 && iv <= 60000, `같은 화면에 머물러도 ${iv / 1000}초 안에 다시 확인한다(끝난 집행이 오래 남지 않게)`)
  await ctx.close()
}

console.log('\n⑪ CTA 가 없는 집행도 깨지지 않는다')
{
  const noCta = { ...NOTICE, id: 'nc_nocta', ctaLabel: '', ctaUrl: '' }
  const { ctx, page, posts } = await open([noCta])
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  ok(await page.getByRole('button', { name: '지금 신청하기' }).count() === 0, 'CTA 버튼이 없다')
  ok(await page.getByRole('button', { name: /일 동안 보지 않기/ }).count() === 1, '보지 않기 버튼은 남아 있다')
  await page.locator('[role="dialog"]').getByLabel('닫기').click()
  await page.waitForTimeout(600)
  ok(await page.locator('[role="dialog"]').count() === 0, 'CTA 가 없어도 닫을 수 있다')
  ok(posts.some((p) => p.kind === 'read'), '닫으면 읽음으로 기록된다')
  await ctx.close()
}

console.log('\n⑫ 제목·내용에 태그를 넣어도 그대로 글자로만 보인다(스크립트 실행 없음)')
{
  const evil = {
    ...NOTICE, id: 'nc_xss', videoUrl: '', imageUrl: '',
    title: '<img src=x onerror="window.__pwned=1">할인',
    body: '<script>window.__pwned2=1</script>내용',
  }
  const { ctx, page } = await open([evil])
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(700)
  ok(await page.evaluate(() => !(window).__pwned && !(window).__pwned2), '주입된 스크립트가 실행되지 않는다')
  ok(await page.locator('[role="dialog"] img').count() === 0, '태그가 실제 요소로 만들어지지 않는다')
  ok((await page.locator('[role="dialog"] h2').innerText()).includes('할인'), '글자는 그대로 보인다')
  await ctx.close()
}

console.log('\n⑬ 강력 알림이 여러 건이어도 화면이 하나로 유지된다')
{
  const a = { ...NOTICE, id: 'nc_a', title: '광고 A', videoUrl: '', imageUrl: '' }
  const b2 = { ...NOTICE, id: 'nc_b', title: '광고 B', videoUrl: '', imageUrl: '' }
  const { ctx, page } = await open([a, b2])
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  ok(await page.locator('[role="dialog"]').count() === 1, '모달은 하나만 뜬다')
  ok((await page.locator('[role="dialog"] h2').innerText()).includes('광고 A'), '서버가 먼저 준 것(최근 집행)이 뜬다')
  //  하나를 닫으면 다음 강력 알림이 이어서 뜬다 — 조용히 사라지면 안 된다
  await page.locator('[role="dialog"]').getByLabel('닫기').click()
  await page.waitForTimeout(700)
  ok(await page.locator('[role="dialog"]').count() === 1, '닫으면 다음 강력 알림이 이어서 뜬다')
  ok((await page.locator('[role="dialog"] h2').innerText()).includes('광고 B'), '두 번째 집행이 표시된다')
  await ctx.close()
}

console.log('\n⑭ 집행 종료 시각에 정확히 내려간다 · 탭을 다시 보면 즉시 확인한다')
{
  /* 예전에는 종료 시각이 지나도 다음 폴링(45초)이 와야 사라졌다 — 끝난 광고가 최대 45초 더 떠 있었다.
     서버가 종료 시각과 자기 시각을 함께 주므로, 화면이 그 순간에 정확히 내릴 수 있다. */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  let polls = 0
  const endsIn = (ms) => new Date(Date.now() + ms).toISOString()
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/public-notices*', (r) => {
    if (r.request().method() === 'POST') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    polls++
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, now: new Date().toISOString(),
      notices: [{ ...NOTICE, id: 'nc_end', videoUrl: '', imageUrl: '', endAt: endsIn(4000) }],
    }) })
  })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
  const t0 = Date.now()
  ok(true, '집행 중에는 떠 있다')

  await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 12000 })
  const elapsed = Date.now() - t0
  //  폴링 주기(45초)를 기다리지 않고 종료 시각 직후에 사라져야 한다
  ok(elapsed < 8000, `종료 시각이 되자 바로 내려갔다 (${(elapsed / 1000).toFixed(1)}초 · 폴링 주기 45초를 기다리지 않음)`)

  //  탭을 다시 볼 때 곧바로 서버에 다시 물어본다(다른 탭에서 숨김을 눌렀을 수 있다)
  const before = polls
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')) })
  await page.waitForTimeout(800)
  ok(polls > before, '탭을 다시 보면 즉시 다시 확인한다', `폴링 ${before} → ${polls}`)
  await ctx.close()
}

console.log('\n⑮ 가입·로그인 길목은 광고가 막지 않고, 헛노출도 안 남긴다')
{
  /* 실제 집행에서 잡은 두 가지다.
     · /login 에서 모달이 로그인 버튼을 덮어 30초 동안 누를 수 없었다.
       CTA 가 /signup 을 가리키는 집행이면 도착한 신청 화면을 그 광고가 다시 가린다.
     · 화면에서 숨기는 것만으로는 부족하다 — 목록을 받아 오는 것만으로 서버에 "노출" 이 기록돼,
       아무도 보지 않은 노출이 쌓이고 나중의 진짜 노출은 (방문자당 1건이라) 무시된다. */
  for (const at of ['/login', '/signup', '/complete-profile']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    let polled = 0
    await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    await page.route('**/api/public-notices*', (r) => {
      polled++
      return r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, now: new Date().toISOString(), notices: [NOTICE] }) })
    })
    await page.goto(BASE + at, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    ok(await page.locator('[role="dialog"]').count() === 0, `${at} — 광고가 화면을 막지 않는다`)
    ok(polled === 0, `${at} — 조회조차 하지 않는다(보지 않은 노출이 안 쌓인다)`, `조회 ${polled}회`)
    await ctx.close()
  }
}

console.log('\n⑯ CTA 로 페이지가 넘어가도 전환 기록이 살아남는다')
{
  /* 실측: 보통의 fetch 는 이동과 함께 취소돼 전환이 통째로 사라졌다(광고 성과 과소 집계).
     keepalive 를 켜야 페이지를 떠나도 요청이 끝까지 간다. */
  const src = fs.readFileSync('components/PublicNoticePopups.tsx', 'utf8')
  ok(/keepalive:\s*true/.test(src), '기록 요청에 keepalive 가 켜져 있다')

  //  실제로 눌러서 요청이 서버까지 도달하는지 3회 본다(경합이라 한 번으로는 못 잡는다)
  for (let i = 1; i <= 3; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    const got = []
    await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    await page.route('**/api/public-notices*', (r) => {
      if (r.request().method() === 'POST') { got.push(JSON.parse(r.request().postData() || '{}').kind) ; return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, now: new Date().toISOString(), notices: [NOTICE] }) })
    })
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByRole('button', { name: '지금 신청하기' }).click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1200)
    ok(got.includes('convert'), `${i}회차 — 전환 요청이 서버까지 도달했다`, JSON.stringify(got))
    await ctx.close()
  }
}

console.log('\n⑰ 관리자 폼에서 강력 알림을 실제로 집행한다')
{
  /* 사람이 쓰듯 폼을 채워 발송하고, 서버로 나가는 요청 본문을 그대로 확인한다.
     "화면에는 켰는데 서버로는 안 갔다" 가 가장 흔한 실패라 여기를 눈이 아니라 값으로 본다. */
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } })
  const page = await ctx.newPage()
  page.on('dialog', (d) => d.accept())            // 발송 확인창은 승인
  const sent = []
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"campaigns":[],"users":[]}' }))
  await page.route('**/api/admin/notices', async (r) => {
    if (r.request().method() === 'POST') {
      sent.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"campaignId":"nc_x","strong":true,"snoozeDays":7}' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"campaigns":[]}' })
  })
  await page.goto(BASE + '/adminsunkoh028741_11263/notices', { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('예) 여름 프로모션 시작!').waitFor({ timeout: 15000 })

  await page.getByPlaceholder('예) 여름 프로모션 시작!').fill('7월 한정 · 영상 제작 반값')
  await page.getByPlaceholder('알림에 표시할 내용을 입력하세요.').fill('지금 신청하면 첫 달 50% 할인.')
  await page.getByPlaceholder('또는 이미지 URL 붙여넣기').fill('/api/media/ad.png')
  await page.getByPlaceholder('또는 동영상 URL (mp4 등)').fill('/api/media/ad.mp4')
  await page.getByPlaceholder('예) 지금 확인하기').fill('지금 신청하기')
  await page.getByPlaceholder('/dashboard_USE17237_612 또는 https://...').fill('/signup')

  // 강력 알림 체크박스는 "접속 전체" 를 골라야 나타난다
  ok(await page.getByText('강력 알림으로 집행', { exact: true }).count() === 0, '회원 대상일 때는 강력 알림 설정이 보이지 않는다')
  await page.getByRole('button', { name: '접속 전체(비회원)' }).click()
  await page.getByText('강력 알림으로 집행', { exact: true }).waitFor({ timeout: 5000 })
  ok(true, '"접속 전체" 를 고르면 강력 알림 설정이 나타난다')

  ok(await page.locator('input[type="number"]').count() === 0, '체크 전에는 보지 않기 일수 칸이 숨어 있다')
  await page.locator('input[type="checkbox"]').first().check()
  await page.getByRole('button', { name: '7일', exact: true }).click()
  ok(await page.locator('input[type="number"]').inputValue() === '7', '보지 않기 일수를 7일로 고를 수 있다')

  // 집행 기간(한국시간)
  const dt = page.locator('input[type="datetime-local"]')
  await dt.nth(0).fill('2026-08-01T09:00')
  await dt.nth(1).fill('2026-08-31T23:59')

  await page.getByRole('button', { name: /발송/ }).last().click()
  await page.waitForTimeout(1200)

  ok(sent.length === 1, '발송 요청이 한 번 나간다', `${sent.length}건`)
  const p = sent[0] || {}
  ok(p.strong === true, '강력 알림 설정이 서버로 전달된다', JSON.stringify(p.strong))
  ok(p.snoozeDays === 7, '보지 않기 일수(7)가 전달된다', String(p.snoozeDays))
  ok(p.target === 'visitors', '대상이 접속 전체로 전달된다', p.target)
  ok(p.imageUrl === '/api/media/ad.png' && p.videoUrl === '/api/media/ad.mp4', '사진·영상이 전달된다')
  ok(p.ctaLabel === '지금 신청하기' && p.ctaUrl === '/signup', 'CTA 가 전달된다')
  //  집행 날짜는 KST 입력 → UTC 로 변환돼 나가야 한다 (09:00 KST = 00:00 UTC)
  ok(p.startAt === '2026-08-01T00:00:00.000Z', '집행 시작이 KST→UTC 로 변환돼 전달된다', p.startAt)
  ok(p.endAt === '2026-08-31T14:59:00.000Z', '집행 종료가 KST→UTC 로 변환돼 전달된다', p.endAt)
  await ctx.close()
}

await browser.close()
server.close()
console.log(failed === 0 ? '\n강력 알림 브라우저 검증 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
