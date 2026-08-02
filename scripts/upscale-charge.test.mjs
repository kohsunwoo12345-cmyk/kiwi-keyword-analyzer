/* 화질 올리기(업스케일) 과금 — 제대로 청구되고, 새어 나가지도 과청구되지도 않는지.
 *
 * 이 파일은 원래 upscale-free.test.mjs 였다. "업스케일은 어떤 경로로도 크레딧이 빠지면
 * 안 된다" 를 다섯 겹으로 지키던 검사였는데, 방침이 뒤집혀 이제는 과금한다.
 * 반대 방향이 됐다고 검사를 지우면 안 된다 — 돈이 오가는 자리는 어느 방향이든 못을 박아야 한다.
 * 그래서 같은 자리들을 "이번엔 제대로 청구되는가" 로 다시 지킨다.
 *
 * ※ 이름을 그대로 두면 안 되는 이유: 옛 검사의 ① "단가표에 업스케일 항목이 없다" 는
 *   새 항목 이름('화질 올리기 …')에 '업스케일' 이라는 글자가 없어서 그냥 통과해 버렸다.
 *   의도가 죽었는데 초록불이 켜지는 검사는 없는 것만 못하다.
 *
 * 지키는 것:
 *   ① 단가표에 업스케일 항목이 있다 (이미지·영상)
 *   ② 실제로 0이 아닌 금액이 나온다 — 이미지 1장 ≈ 1크레딧, 영상 1초 ≈ 0.2크레딧
 *   ③ 옛 이름·모르는 이름도 업스케일 단가로 잡힌다 (영상 기본값 $0.06/초로 새면 25배 과청구)
 *   ④ 스튜디오가 시작 전에 잔액을 확인한다 (몇 시간 돌린 뒤 막히면 그 시간이 헛수고다)
 *   ⑤ 성공했을 때만 기록한다 (실패한 업스케일에 요금을 물리지 않는다)
 *   ⑥ '무료'·'크레딧 0' 문구가 안 남아 있다 (돈을 받으면서 무료라고 하면 안 된다)
 *   ⑦ 서버 provider=upscale 생성 경로는 여전히 막혀 있다 — 우리는 서버에서 추론하지 않는다
 */
import { buildSync } from 'esbuild'
import vm from 'node:vm'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require_ = createRequire(import.meta.url)
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
const genSrc = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')
const studio = fs.readFileSync(ROOT + 'public/studio-nvc-prv-8b3k2/index.html', 'utf8')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}
const RATE = 1400, BASIS = 50

// ① 단가표에 있다
{
  const img = pricing.MODEL_COST[pricing.UPSCALE_IMG]
  const vid = pricing.MODEL_COST[pricing.UPSCALE_VID]
  ok('① 이미지 업스케일이 단가표에 있다', !!img && img.u === 'img' && img.usd > 0, JSON.stringify(img))
  ok('①-b 영상 업스케일이 단가표에 있다', !!vid && vid.u === 'sec' && vid.usd > 0, JSON.stringify(vid))
  ok('①-c 집계 제공사가 upscale 이다', img?.prov === 'upscale' && vid?.prov === 'upscale')
}

// ② 실제 금액 — 0이면 과금 전환이 안 된 것이고, 너무 크면 사고다
{
  const ci = pricing.computeCharge({ model: pricing.UPSCALE_IMG, units: 1, kind: 'image' }, RATE, undefined, BASIS)
  ok('② 이미지 1장이 0크레딧이 아니다', ci.credits > 0, `${ci.credits}크레딧`)
  ok('②-b 이미지 1장이 상식적인 범위다 (0.3~3크레딧)', ci.credits >= 0.3 && ci.credits <= 3, `${ci.credits}크레딧`)
  const cv = pricing.computeCharge({ model: pricing.UPSCALE_VID, units: 60, kind: 'video', res: '1080p' }, RATE, undefined, BASIS)
  ok('②-c 영상 60초가 0크레딧이 아니다', cv.credits > 0, `${cv.credits}크레딧`)
  ok('②-d 영상 초당이 상식적인 범위다 (0.05~1크레딧/초)', cv.credits / 60 >= 0.05 && cv.credits / 60 <= 1, `${(cv.credits/60).toFixed(3)}크레딧/초`)
  //  길이에 비례해야 한다 — 정액이면 30분짜리가 1초짜리와 같은 값이 된다
  const cv2 = pricing.computeCharge({ model: pricing.UPSCALE_VID, units: 120, kind: 'video', res: '1080p' }, RATE, undefined, BASIS)
  ok('②-e 영상 요금이 길이에 비례한다', Math.abs(cv2.credits - cv.credits * 2) < 0.05, `60초 ${cv.credits} vs 120초 ${cv2.credits}`)
}

// ③ 옛 이름이 새어 나가지 않는다 — 표에 없는 이름은 영상 기본값($0.06/초)으로 청구된다
{
  const legacy = ['업스케일 4K (영상 화질 향상)', 'Video Upscale', 'upscale-pro', '화질 올리기']
  const ref = pricing.computeCharge({ model: pricing.UPSCALE_VID, units: 10, kind: 'video', res: '1080p' }, RATE, undefined, BASIS)
  let bad = ''
  for (const model of legacy) {
    const c = pricing.computeCharge({ model, units: 10, kind: 'video', res: '1080p' }, RATE, undefined, BASIS)
    if (c.provider !== 'upscale') bad = `${model} → provider ${c.provider}`
    else if (Math.abs(c.credits - ref.credits) > 0.01) bad = `${model} → ${c.credits}크레딧 (정상 ${ref.credits})`
  }
  ok('③ 옛/모르는 업스케일 이름도 업스케일 단가로 잡힌다', !bad, bad)
  //  이미지로 부르면 이미지 단가여야 한다(초당 계산을 타면 안 된다)
  const ci = pricing.computeCharge({ model: '화질 올리기', units: 1, kind: 'image' }, RATE, undefined, BASIS)
  const ref2 = pricing.computeCharge({ model: pricing.UPSCALE_IMG, units: 1, kind: 'image' }, RATE, undefined, BASIS)
  ok('③-b 이미지로 부르면 이미지 단가로 잡힌다', Math.abs(ci.credits - ref2.credits) < 0.01, `${ci.credits} vs ${ref2.credits}`)
}

// ④ 스튜디오가 시작 전에 잔액을 확인한다
{
  ok('④ 업스케일이 시작 전에 크레딧 게이트를 지난다',
     /creditGate\(\{\s*model:uModel/.test(studio.replace(/\s*\n\s*/g, '')) || /creditGate\(\{ model:uModel/.test(studio),
     '잔액을 안 보면 몇 시간 돌린 뒤에 청구가 막힌다')
  ok('④-b 막히면 시작하지 않는다', /if\(blocked\)\{\s*n2\.w\.upscaling=false;/.test(studio.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ')) ||
     /if\(blocked\)\{ n2\.w\.upscaling=false/.test(studio))
  //  영상은 초당 과금이라 길이를 알아야 게이트가 성립한다
  ok('④-c 영상 길이를 재서 단위로 넘긴다', /uUnits\s*=\s*uIsImg\s*\?\s*1\s*:/.test(studio) && /meta\.dur/.test(studio))
}

// ⑤ 성공했을 때만 기록한다
{
  const m = /var uJob = uIsImg[\s\S]{0,1200}?\.catch\(function\(err\)/.exec(studio)
  const block = m ? m[0] : ''
  ok('⑤ 업스케일 성공 뒤에 요금을 기록한다', /recordCost\('upscale',\s*uModel/.test(block), '기록이 없으면 아무도 청구되지 않는다')
  const thenIdx = block.indexOf('.then('), catchIdx = block.indexOf('.catch(')
  const recIdx = block.indexOf("recordCost('upscale'")
  ok('⑤-b 기록이 실패 경로가 아니라 성공 경로에 있다',
     recIdx > thenIdx && (catchIdx < 0 || recIdx < catchIdx), '실패한 업스케일에 요금을 물리면 안 된다')
}

/* ⑥ "돈이 안 든다" 는 말이 어디에도 안 남아 있다
   처음엔 '자체 모델 · 무료' 라는 한 가지 문구만 찾았다. 그래서 통과했는데,
   정작 화면에는 "크레딧이 들지 않습니다" 가 그대로 남아 있었다 — 말만 다르고 뜻은 같다.
   한 가지 표현만 막으면 다른 표현으로 살아남는다. 뜻이 같은 말을 다 막는다. */
{
  const FREE = /무료|공짜|크레딧이 들지 않|크레딧 0|요금 0|크레딧이 차감되지 않/
  /* 주석은 화면에 안 나온다. 걷어내지 않으면 "예전엔 무료라고 적혀 있었다" 같은
     설명까지 위반으로 잡혀서, 고칠 것이 없는데도 계속 빨간불이 뜬다.
     (줄 주석은 손대지 않는다 — 문자열 안의 https:// 를 잘라 먹는다.) */
  const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ')
  const region = (src, anchor, before, after) => {
    const i = src.indexOf(anchor)
    return i < 0 ? '' : noComments(src.slice(Math.max(0, i - before), i + after))
  }
  //  버튼·안내가 그려지는 자리 전체(업스케일 위젯 마크업 ~ 완료 문구)
  const ui = region(studio, 'data-upscale>', 1200, 2400)
  const around = region(studio, '화질 올리는 중', 400, 1600)
  ok('⑥ 업스케일 안내에 "돈이 안 든다" 는 말이 없다', !FREE.test(ui),
     '돈을 받으면서 무료라고 하면 안 된다: ' + (ui.match(FREE) || [''])[0])
  ok('⑥-b 진행·완료 문구에도 없다', !FREE.test(around), (around.match(FREE) || [''])[0])
  //  서버가 돌려주는 안내문(옛 그래프가 provider=upscale 로 들어올 때 회원이 보는 문장)
  const srv = region(genSrc, 'upscaleMovedToClient', 900, 200)
  ok('⑥-c 서버 안내문에도 없다', !FREE.test(srv), (srv.match(FREE) || [''])[0])
  ok('⑥-d 대신 크레딧이 든다고 말한다', /크레딧이 듭니다/.test(ui), '아무 말도 안 하면 몰래 빠지는 것처럼 보인다')
}

// ⑦ 서버에서 추론하는 경로는 여전히 없다 — 우리 모델은 사용자 기기/빌려간 쪽에서 돈다
{
  ok('⑦ provider=upscale 서버 생성 경로가 막혀 있다',
     /provider === "upscale"/.test(genSrc) && /upscaleMovedToClient/.test(genSrc),
     '서버에서 돌리면 Cloudflare CPU 한도를 넘고(실측 타일당 1.44~32.5초) 우리 비용이 생긴다')
  ok('⑦-b fal 허가 목록에 upscale 이 없다', !/FAL_ALLOWED[^)]*"upscale"/.test(genSrc))
}

console.log(fails.length === 0
  ? '\n업스케일 과금 — 실패 0 (청구·게이트·기록·문구 전부 일치)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
