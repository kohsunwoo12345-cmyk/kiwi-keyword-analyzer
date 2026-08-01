/* 모델 대여·ControlNet 외부 API — 돈과 접근권이 걸린 자리를 지킨다.
 *
 * 실제 workerd·D1 로 도는 검사는 따로 돌렸지만 그건 일회성이다. 여기서는 저장소에 남아
 * 매 빌드마다 도는 못을 박는다. 지키는 것은 "새면 큰일 나는 것" 들이다:
 *   ① 대여·ControlNet 이 단가표에 있고 0원이 아니다 (없으면 공짜로 나간다)
 *   ② 리스 토큰이 서명된다 — 위조·만료가 실제로 막힌다
 *   ③ 빌려주는 파일이 저장소에 실제로 있고, 목록에 라이선스·출처가 적혀 있다
 *   ④ 모델 파일은 리스 없이 못 받는다 (그 문이 대여의 전부다)
 *   ⑤ 생성 모델 목록에 비생성 항목(업스케일·대여·컨트롤넷)이 안 섞인다
 *   ⑥ API 경로에도 가산율(레퍼런스·ControlNet)이 적용된다 — 스튜디오보다 싸면 안 된다
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
const lease = load('functions/api/v1/_lease.ts')
const src = (p) => fs.readFileSync(ROOT + p, 'utf8')
const mfileSrc = src('functions/api/v1/model-file/[[path]].ts')
const mcpSrc = src('functions/api/mcp/[[path]].js')
const v1genSrc = src('functions/api/v1/generate.js')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}
const RATE = 1400, BASIS = 50

// ① 값이 있다
{
  const l = pricing.MODEL_COST[pricing.LEASE_SR]
  ok('① 대여가 단가표에 있다', !!l && l.usd > 0, JSON.stringify(l))
  const c = pricing.computeCharge({ model: pricing.LEASE_SR, units: 1, kind: 'image' }, RATE, undefined, BASIS)
  ok('①-b 대여가 0크레딧이 아니다', c.credits > 0, `${c.credits}크레딧`)
  const cn = pricing.MODEL_COST[pricing.CONTROLNET_IMG]
  ok('①-c ControlNet 이 단가표에 있다', !!cn && cn.usd > 0 && cn.prov === 'falcontrol', JSON.stringify(cn))
  const cc = pricing.computeCharge({ model: pricing.CONTROLNET_IMG, units: 1, kind: 'image' }, RATE, undefined, BASIS)
  ok('①-d ControlNet 이 0크레딧이 아니다', cc.credits > 0, `${cc.credits}크레딧`)
  /* 표에 없으면 이미지 기본값($0.05)으로 잡힌다 — 값이 그것과 우연히 같으면
     "표에 있다" 를 확인해도 실제로는 기본값을 쓰는 것과 구분이 안 된다. */
  const fallback = pricing.computeCharge({ model: '존재하지않는모델XYZ', units: 1, kind: 'image' }, RATE, undefined, BASIS)
  ok('①-e ControlNet 값이 "표에 없을 때의 기본값" 과 구분된다', cc.credits !== fallback.credits,
     `둘 다 ${cc.credits}크레딧이면 표에 없는 것과 같다`)
}

// ② 서명 — 위조·만료가 실제로 막히는지 함수를 직접 돌려 본다
{
  const S = 'test-secret-0123456789'
  const now = Math.floor(Date.now() / 1000)
  const good = await lease.signLease(S, { l: 'lz_1', u: 'u1', m: 'sr-x4-fast', e: now + 3600 })
  ok('② 서명한 토큰이 검증을 통과한다', !!(await lease.verifyLease(S, good)))
  /*  서명 한 글자 변조.
      ⚠ 마지막 글자를 고치면 안 된다 — base64url 의 끝 글자는 남는 비트를 채우는 자리라
      32바이트 서명에서는 상위 4비트만 의미가 있다. 그래서 글자를 바꿔도 디코드 결과가
      그대로일 때가 있고, 그때 검증이 통과해 이 검사가 "됐다 안 됐다" 한다(실제로 그랬다).
      의미 비트가 온전한 앞쪽 글자를 고친다. */
  const [gb, gs] = good.split('.')
  const t1 = gb + '.' + (gs[0] === 'A' ? 'B' : 'A') + gs.slice(1)
  ok('②-b 서명을 고치면 거부된다', (await lease.verifyLease(S, t1)) === null)
  //  본문(권한) 변조 — 기간을 늘려도 서명이 안 맞아야 한다
  const [body, sig] = good.split('.')
  const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
  p.e = now + 315360000
  const nb = Buffer.from(JSON.stringify(p)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  ok('②-c 기간을 늘려 위조하면 거부된다', (await lease.verifyLease(S, nb + '.' + sig)) === null)
  //  다른 열쇠로 만든 토큰
  const other = await lease.signLease('다른열쇠-0123456789', { l: 'lz_1', u: 'u1', m: 'sr-x4-fast', e: now + 3600 })
  ok('②-d 다른 열쇠로 만든 토큰은 거부된다', (await lease.verifyLease(S, other)) === null)
  //  이미 지난 토큰
  const old = await lease.signLease(S, { l: 'lz_1', u: 'u1', m: 'sr-x4-fast', e: now - 10 })
  ok('②-e 기간이 지난 토큰은 거부된다', (await lease.verifyLease(S, old)) === null)
  ok('②-f 빈 값·쓰레기를 넣어도 통과하지 않는다',
     (await lease.verifyLease(S, '')) === null && (await lease.verifyLease(S, 'x.y')) === null && (await lease.verifyLease(S, good.split('.')[0])) === null)
  //  서명 비교가 일찍 끝나면 안 된다(어디까지 맞았는지가 시간으로 샌다)
  ok('②-g 서명 비교가 중간에 끊기지 않는다', /diff \|= expect\[i\] \^ got\[i\]/.test(src('functions/api/v1/_lease.ts')),
     '한 바이트라도 빨리 끝내면 서명을 한 글자씩 맞춰 나갈 수 있다')
}

// ③ 빌려주는 파일이 실제로 있다
{
  const list = Object.values(lease.LENDABLE)
  ok('③ 빌려줄 모델이 하나 이상 있다', list.length > 0)
  let missing = ''
  for (const m of list) {
    for (const f of m.files) if (!fs.existsSync(ROOT + f.path)) missing = m.id + ':' + f.path
    if (!m.license) missing = m.id + ' 라이선스 없음'
    if (!m.source) missing = m.id + ' 출처 없음'
  }
  ok('③-b 파일이 저장소에 실제로 있고 라이선스·출처가 적혀 있다', !missing, missing)
  //  SDK 도 실제로 있어야 한다 — 문서가 가리키는 주소다
  ok('③-c SDK 파일이 있다', fs.existsSync(ROOT + 'public/sdk/bygency-sr.js'))
}

// ④ 리스 없이는 파일이 안 나간다
{
  ok('④ 토큰이 없으면 401 로 막는다', /if \(!token\) return json\([^)]*401\)/.test(mfileSrc.replace(/\s+/g, ' ')))
  ok('④-b 유효하지 않으면 403 으로 막는다', /resolveLease\(/.test(mfileSrc) && /403/.test(mfileSrc))
  ok('④-c 취소·만료를 DB 에서 다시 확인한다',
     /revoked_at/.test(src('functions/api/v1/_lease.ts')) && /expires_at/.test(src('functions/api/v1/_lease.ts')),
     '서명만 보면 취소해도 계속 받아간다')
  ok('④-d 빌린 모델의 파일만 준다', /m\?\.files\.find\(/.test(mfileSrc), '토큰 하나로 다른 모델까지 받아가면 안 된다')
}

// ⑤ 생성 목록이 깨끗하다
{
  ok('⑤ 비생성 항목을 카탈로그에서 거른다', /NON_GEN_PROV/.test(mcpSrc))
  const m = /const NON_GEN_PROV = \{([^}]*)\}/.exec(mcpSrc)
  const body = m ? m[1] : ''
  ok('⑤-b 업스케일·대여·컨트롤넷이 모두 걸러진다',
     /upscale/.test(body) && /lease/.test(body) && /falcontrol/.test(body), body.trim())
  ok('⑤-c 영상·이미지 목록 양쪽에 적용된다',
     (mcpSrc.match(/!NON_GEN_PROV\[x\.provider\]/g) || []).length >= 2)
}

// ⑥ API 경로에도 가산율이 붙는다
{
  ok('⑥ API 가 레퍼런스·ControlNet 가산을 적용한다',
     /resolveRefSurcharge/.test(v1genSrc) && /resolveCnSurcharge/.test(v1genSrc),
     '빠지면 같은 생성이 API 로만 싸게 나간다')
  ok('⑥-b 가산을 실제로 곱한다', /credits: Math\.round\(est\.credits \* mult \* 100\) \/ 100/.test(v1genSrc))
  //  잔액 확인이 가산을 곱한 뒤에 이뤄져야 한다 — 먼저 보면 모자란 채로 통과한다
  const multIdx = v1genSrc.indexOf('est = { ...est, credits:')
  const gateIdx = v1genSrc.indexOf('(Number(me.credits) || 0) < (est?.credits || 0)')
  ok('⑥-c 잔액 확인이 가산 반영 뒤에 온다', multIdx > 0 && gateIdx > multIdx)
}

console.log(fails.length === 0
  ? '\n모델 대여·ControlNet — 실패 0 (값·서명·접근권·가산 전부 살아 있음)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
