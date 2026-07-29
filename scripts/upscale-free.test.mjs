/* 화질 올리기(업스케일)는 어떤 경로로도 크레딧이 빠지면 안 된다.
 *
 * 우리 자체 초해상 모델로 브라우저에서 처리하므로 제공사에 나가는 비용이 0이다.
 * "지금 무료" 인 것과 "무료일 수밖에 없는" 것은 다르다 — 나중에 누가 단가표에 되살리거나
 * 외부 API 경로를 다시 열면 그날부터 회원 크레딧이 빠진다. 그게 안 되도록 못을 박고,
 * 그 못들이 그대로 있는지 여기서 지킨다.
 *
 * 겹겹이 막아 둔 것:
 *   ① 단가표에 업스케일 항목이 없다      → 과금 토큰 자체가 발급되지 않는다
 *   ② computeCharge 가 0원으로 되돌린다  → 표에 되살려도 금액이 0이다
 *   ③ 서버 provider=upscale 경로가 막혔다 → 외부 유료 API 로 나갈 수 없다
 *   ④ fal 허가 목록에서 빠졌다           → 실수로 호출해도 게이트가 막는다
 *   ⑤ 스튜디오 모델 목록에 없다          → 노드에서 고를 수 없다
 */
import { buildSync } from 'esbuild'
import vm from 'node:vm'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require_ = createRequire(import.meta.url)
/* 저장소 위치는 체크아웃마다 다르다 — 배포 서버는 /home/user 가 아니다.
   빌드가 npm test 를 먼저 돌리므로, 경로를 박아 두면 그 서버에서 테스트가 파일을 못 찾아
   빌드 자체가 죽는다. 이 파일 위치에서 저장소 뿌리를 구한다. */
const ROOT = new URL('../', import.meta.url).pathname

function load(file) {
  const out = buildSync({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs',
                          platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console, Response, Request,
                    Headers, URL, TextEncoder, TextDecoder, crypto, fetch, btoa, atob, setTimeout, clearTimeout, AbortController }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}
const pricing = load('functions/api/studio/_pricing.ts')
const gen = load('functions/api/generate.js')
const genSrc = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')
const studio = fs.readFileSync(ROOT + 'public/studio-nvc-prv-8b3k2/index.html', 'utf8')
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

// ① 단가표에 없다 → 과금 토큰이 발급될 수 없다
{
  const hit = Object.keys(pricing.MODEL_COST).filter((m) => /업스케일|upscale/i.test(m))
  ok('① 단가표에 업스케일 항목이 없다', hit.length === 0, hit.join(', '))
}

// ② 금액 계산이 0으로 되돌린다 (표에 되살아나도)
{
  const names = ['업스케일 4K (영상 화질 향상)', '화질 올리기', 'Video Upscale', 'upscale-pro']
  let bad = ''
  for (const model of names) for (const units of [1, 10, 300]) {
    const c = pricing.computeCharge({ model, units, kind: 'video', res: '4K' }, 1400, 3, 50)
    if (c.credits !== 0 || c.usd !== 0 || c.costKrwExact !== 0) bad = `${model} ${units}초 → ${c.credits}크레딧`
  }
  ok('② computeCharge 가 업스케일을 0원으로 되돌린다', !bad, bad)
}

// ③ 서버 생성 경로가 막혔다 (외부 유료 API 로 못 나간다)
{
  const src = stripComments(genSrc)
  const blocked = /provider === "upscale"\s*\)\s*\{[\s\S]{0,400}?upscaleMovedToClient/.test(src)
  ok('③ provider=upscale 이 즉시 거부된다', blocked)
  const noTopaz = !/topaz/i.test(src)
  ok('③-b Topaz(외부 유료) 호출이 코드에 남아 있지 않다', noTopaz)
}

// ④ fal 허가 목록에서 빠졌다
{
  const m = /const FAL_ALLOWED = new Set\(\[([^\]]*)\]\)/.exec(stripComments(genSrc))
  const list = (m?.[1] || '').replace(/["'\s]/g, '').split(',').filter(Boolean)
  ok('④ fal 허가 목록에 upscale 이 없다', !list.includes('upscale'), list.join(','))
}

// ⑤ 스튜디오 모델 목록·단가표에 없다 (노드에서 고를 수 없다)
{
  const objSrc = (re) => { const i = studio.search(re); const s0 = studio.indexOf('{', i); let d = 0, j = s0
    for (; j < studio.length; j++) { if (studio[j] === '{') d++; else if (studio[j] === '}') { d--; if (!d) { j++; break } } }
    return studio.slice(s0, j) }
  const arrSrc = (re) => { const i = studio.search(re); const s0 = studio.indexOf('[', i); let d = 0, j = s0
    for (; j < studio.length; j++) { if (studio[j] === '[') d++; else if (studio[j] === ']') { d--; if (!d) { j++; break } } }
    return studio.slice(s0, j) }
  const MODELS = eval('(' + arrSrc(/var\s+MODELS\s*=/) + ')')
  const UI_COST = eval('(' + objSrc(/var\s+MODEL_COST\s*=/) + ')')
  const inList = MODELS.filter(([, n]) => /업스케일|upscale/i.test(n)).map(([, n]) => n)
  ok('⑤ 노드 모델 목록에 업스케일이 없다', inList.length === 0, inList.join(', '))
  const inCost = Object.keys(UI_COST).filter((m) => /업스케일|upscale/i.test(m))
  ok('⑤-b 스튜디오 단가표에도 없다', inCost.length === 0, inCost.join(', '))
}

// ⑥ 화면은 배율이 아니라 화질로 고르고, 그 값이 실제 목표 픽셀로 나간다
{
  const hasQ = /var UP_QUALITY = \[/.test(studio)
  ok('⑥ 화질 목록(UP_QUALITY)이 있다', hasQ)
  const px = [...studio.matchAll(/id:'(\w+)',\s*label:'([^']+)',\s*px:(\d+)/g)].map((m) => `${m[2]}=${m[3]}px`)
  ok('⑥-b 화질마다 목표 픽셀이 정해져 있다', px.length >= 3, px.join(' · '))
  //  고른 화질이 실제 초해상 실행에 목표값으로 전달되는지 (안 그러면 이름만 바뀐 것이다)
  ok('⑥-c 고른 화질이 longTarget 으로 전달된다', /uOpts\s*=\s*\{\s*longTarget:\s*uQ\.px\s*\}/.test(studio))
  //  버튼이 배율 표기로 되돌아가지 않았는지
  ok('⑥-d 배율(2×/4×) 버튼이 남아 있지 않다', !/data-upscaleset="[24]"/.test(studio))
}

// ⑦ 업스케일 실행이 서버·과금을 부르지 않는다 (브라우저 안에서 끝난다)
{
  const i = studio.indexOf("[data-upscale]')")
  const block = studio.slice(i, i + 2000)
  ok('⑦ 업스케일 실행이 recordCost 를 부르지 않는다', !/recordCost\(/.test(block))
  ok('⑦-b 업스케일 실행이 서버 생성 API 를 부르지 않는다', !/callProxy\(|generateWithAPI\(/.test(block))
}

console.log(fails.length === 0
  ? '\n업스케일 무료 보장 — 실패 0 (다섯 겹 전부 살아 있음)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
