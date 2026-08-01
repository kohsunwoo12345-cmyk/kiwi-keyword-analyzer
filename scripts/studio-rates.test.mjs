/* 스튜디오 화면이 보여 주는 금액과 서버가 실제로 빼는 금액이 같은지 —
 *   node scripts/studio-rates.test.mjs  (npm run test:pricing 에 포함)
 *
 * 스튜디오(public/studio-.../index.html)는 "이 생성에 몇 크레딧" 을 미리 보여 주려고
 * 서버 단가표를 통째로 복사해 갖고 있다. 두 표는 손으로 맞춰 왔는데, 한쪽만 고치면
 * 화면 금액과 실제 차감액이 조용히 갈린다 — 실제로 OpenAI 이미지 단가가 그렇게 어긋났고,
 * 회원은 표시된 값을 보고 눌렀는데 다른 금액이 빠졌다.
 *
 * 사람이 두 파일을 눈으로 맞추는 대신, 여기서 기계가 맞춘다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  //  워커에는 있고 맨 vm 컨텍스트에는 없는 표준 전역 — 번들에 딸려 온 모듈이 최상위에서
  //  이것들을 쓰면(예: _utils 의 new TextEncoder()) 단가와 무관한 이유로 죽는다.
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console,
                    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto, fetch,
                    btoa, atob, setTimeout, clearTimeout, structuredClone }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

const { MODEL_COST, SEEDANCE_PER_M } = await load('functions/api/studio/_pricing.ts')

const studioPath = 'public/studio-nvc-prv-8b3k2/index.html'
const html = fs.readFileSync(studioPath, 'utf8')

let failed = 0
const ok = (cond, name, detail = '') => {
  if (cond) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

/* 스튜디오 쪽 단가표를 글자에서 읽어 낸다.
   HTML 을 통째로 실행할 수는 없다(IIFE 안이고 DOM 을 건드린다) — 표 리터럴만 뽑는다. */
function studioModelCost() {
  const out = {}
  const re = /'([^']+)':\s*\{\s*u:\s*'([a-z0-9]+)'\s*,\s*usd:\s*([\d.]+)/g
  let m
  while ((m = re.exec(html))) out[m[1]] = { u: m[2], usd: Number(m[3]) }
  return out
}
function studioSeedancePerM() {
  const blk = /var\s+SEEDANCE_PER_M\s*=\s*\{([\s\S]*?)\}\s*;/.exec(html)
  if (!blk) return null
  const out = {}
  const re = /'([^']+)'\s*:\s*([\d.]+)/g
  let m
  while ((m = re.exec(blk[1]))) out[m[1]] = Number(m[2])
  return out
}

console.log('\n① 씨댄스 100만 토큰당 단가 — 서버와 스튜디오가 같은 값인가')
{
  const s = studioSeedancePerM()
  ok(!!s, '스튜디오에서 SEEDANCE_PER_M 을 읽었다', studioPath)
  if (s) {
    for (const k of Object.keys(SEEDANCE_PER_M))
      ok(s[k] === SEEDANCE_PER_M[k], `${k} = $${SEEDANCE_PER_M[k]}/M`, `스튜디오 ${s[k]}`)
    for (const k of Object.keys(s))
      ok(SEEDANCE_PER_M[k] != null, `${k} — 서버 표에도 있다(스튜디오에만 있는 모델 금지)`)
  }
}

console.log('\n② 씨댄스 토큰 계산식 — 프레임 = fps × 초 + 1')
{
  /* 청구서로 확인한 값이다. 한쪽만 예전 식(fps × 초)으로 되돌아가면
     화면에는 싸게 보이고 실제로는 더 빠진다. */
  ok(/SEEDANCE_FPS\s*\*\s*sc\s*\+\s*1/.test(html), '스튜디오가 (fps × 초 + 1) 프레임으로 계산한다')
  const src = fs.readFileSync('functions/api/studio/_pricing.ts', 'utf8')
  ok(/SEEDANCE_FPS\s*\*\s*secs\s*\+\s*1/.test(src), '서버가 (fps × 초 + 1) 프레임으로 계산한다')
}

console.log('\n③ 단가표에 함께 있는 모델은 값이 같아야 한다')
{
  const s = studioModelCost()
  let n = 0
  const diff = []
  for (const k of Object.keys(MODEL_COST)) {
    if (!s[k]) continue            // 스튜디오에 없는 모델은 화면에 안 나오므로 어긋날 일이 없다
    n++
    if (s[k].u !== MODEL_COST[k].u || Math.abs(s[k].usd - MODEL_COST[k].usd) > 1e-9)
      diff.push(`${k}: 서버 ${MODEL_COST[k].u}/$${MODEL_COST[k].usd} vs 스튜디오 ${s[k].u}/$${s[k].usd}`)
  }
  ok(n > 20, `양쪽에 같이 있는 모델 ${n}종을 대조했다`)
  ok(diff.length === 0, '값이 어긋난 모델이 없다', diff.slice(0, 8).join(' · '))
}

console.log(failed === 0 ? '\n스튜디오·서버 단가 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
