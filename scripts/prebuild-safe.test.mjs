/* 빌드를 죽이는 검사가 없는가 —  node scripts/prebuild-safe.test.mjs
 *
 * ── 왜 이 파일이 있는가 ────────────────────────────────────────────────────
 * npm test 는 prebuild 로 돈다. 여기서 하나라도 터지면 npm run build 가 죽고,
 * Cloudflare Pages 배포가 통째로 실패한다. 사이트가 안 올라간다.
 *
 * 실제로 그랬다. kst.test.mjs 가 node:sqlite 를 최상단에서 정적으로 import 했는데,
 * 그 모듈은 Node 22+ 에만 있다. Cloudflare 빌드는 Node 20 이라 그 줄에서
 * ERR_UNKNOWN_BUILTIN_MODULE 로 즉사했다.
 *   · 내 컴퓨터는 Node 22 라 npm test 가 멀쩡히 통과했다 — 그래서 아무도 못 봤다
 *   · 배포 로그를 열어 보기 전까지는 "올라간 줄" 알고 있었다
 *
 * 그래서 "빌드 환경에 없을 수도 있는 것" 을 정적으로 부르는 검사를 여기서 막는다.
 * 없으면 조용히 건너뛰도록 감싸야 한다(try { await import(...) } catch { skip }).
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '\n         ' + detail : ''}`) }
}

/** 빌드 환경(Node 20)에 없을 수 있는 것들. 늘어나면 여기에 적는다. */
const RISKY = ['node:sqlite']

/** package.json 의 test 사슬에서 실제로 도는 스크립트만 뽑는다 — 안 도는 파일은 상관없다. */
function chainScripts() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const seen = new Set()
  const out = new Set()
  const walk = (name) => {
    if (seen.has(name)) return
    seen.add(name)
    const cmd = String((pkg.scripts || {})[name] || '')
    for (const m of cmd.matchAll(/npm run ([\w:-]+)/g)) walk(m[1])
    for (const m of cmd.matchAll(/node\s+(?:--[\w=-]+\s+)*(scripts\/[\w.-]+\.mjs)/g)) out.add(m[1])
  }
  walk('test')
  return [...out]
}

/*  ⚠ 이 파일 자신은 뺀다 — 위험한 모듈 이름을 "문자열로" 들고 있을 뿐인데,
    그걸 쓰는 것으로 세면 자기가 자기를 잡는다(실제로 그렇게 걸렸다). */
const SELF = 'scripts/prebuild-safe.test.mjs'
const scripts = chainScripts().filter((s) => s !== SELF)

console.log('\n① prebuild 로 도는 검사를 실제로 찾았다 (검사가 헛돌지 않게)')
{
  ok(scripts.length >= 20, `test 사슬에서 검사 ${scripts.length}개를 찾았다`,
     '사슬을 못 읽으면 아래 검사가 통째로 헛돈다')
  ok(scripts.every((s) => fs.existsSync(path.join(ROOT, s))),
     '사슬에 적힌 파일이 전부 실제로 있다',
     scripts.filter((s) => !fs.existsSync(path.join(ROOT, s))).join(', '))
}

console.log('\n② 빌드 환경에 없을 수 있는 모듈을 정적으로 부르지 않는다')
{
  const bad = []
  for (const s of scripts) {
    const src = fs.readFileSync(path.join(ROOT, s), 'utf8')
    for (const mod of RISKY) {
      //  최상단 정적 import — 이게 있으면 그 모듈이 없는 Node 에서 파일이 즉사한다
      const staticRe = new RegExp(`^\\s*import\\s[^\\n]*from\\s+['"]${mod}['"]`, 'm')
      if (staticRe.test(src)) bad.push(`${s} → import ... from '${mod}'`)
    }
  }
  ok(bad.length === 0,
     `없을 수 있는 모듈을 정적으로 부르는 검사가 없다 (${RISKY.join(', ')})`,
     bad.join('\n         ') + (bad.length ? '\n         → try { await import(...) } catch { 건너뜀 } 으로 감싸세요' : ''))
}

console.log('\n③ 그 모듈을 쓰는 검사는 없을 때 조용히 건너뛴다')
{
  const users = scripts.filter((s) => {
    const src = fs.readFileSync(path.join(ROOT, s), 'utf8')
    return RISKY.some((m) => src.includes(m))
  })
  ok(users.length >= 1, `그 모듈을 쓰는 검사를 찾았다 (${users.length}개)`,
     '하나도 없으면 이 검사가 아무것도 지키지 않는다')
  const noSkip = users.filter((s) => {
    const src = fs.readFileSync(path.join(ROOT, s), 'utf8')
    return !(/await import\(/.test(src) && /process\.exit\(0\)/.test(src))
  })
  ok(noSkip.length === 0, '전부 건너뛰기 처리가 돼 있다',
     noSkip.join(', ') + (noSkip.length ? '\n         → 없으면 exit(0) 으로 조용히 넘어가야 빌드가 안 죽는다' : ''))
}

console.log(failed === 0
  ? '\n빌드 안전 — 실패 0 (prebuild 검사가 빌드를 죽이지 않는다)'
  : `\n실패 ${failed}건 — 이대로 두면 배포가 통째로 실패합니다`)
process.exit(failed ? 1 : 0)
