/* 돌연변이 점검 —  node scripts/mutation-check.mjs
 *
 * 테스트가 늘 통과하면 안심이 되지만, 그건 "지키고 있다" 가 아니라
 * "아무것도 안 보고 있다" 일 수도 있다. 실제로 이번에 회귀 테스트 하나가
 * 엉뚱한 구문을 세고 있던 걸 발견했다.
 *
 * 그래서 제품 코드를 일부러 망가뜨리고 npm test 가 잡아내는지 본다.
 * 잡아내지 못하는 돌연변이(=살아남은 것)가 있으면 그 자리는 사실상 무방비다.
 *
 * 각 항목은 "진짜 동작이 바뀌는" 변형이어야 한다. 주석·공백 변경은 의미가 없다.
 * 원본은 git 으로 되돌리므로 작업 트리가 깨끗한 상태에서 돌려야 한다.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const MUTATIONS = [
  {
    name: 'Seedance 2.0 단가를 낮춘다 (원가보다 싸게 받게 된다)',
    file: 'functions/api/studio/_pricing.ts',
    from: "'Seedance 2.0': 7.0,", to: "'Seedance 2.0': 5.0,",
  },
  {
    name: '영상 프레임 수에서 +1 을 뺀다 (토큰이 과소 계산된다)',
    file: 'functions/api/studio/_pricing.ts',
    from: 'SEEDANCE_FPS * secs + 1', to: 'SEEDANCE_FPS * secs',
  },
  {
    name: '승인 서류 차단을 푼다 (신분증이 공개 경로로 나간다)',
    file: 'functions/api/media/[[key]].ts',
    from: "if (/^sender-docs\\//i.test(key)) return cjson({ error: '파일 없음' }, 404)",
    to: "if (false) return cjson({ error: '파일 없음' }, 404)",
  },
  {
    name: '영상 보관함 접두사 검사를 푼다 (버킷 전체가 열린다)',
    file: 'functions/api/videos/file/[[key]].ts',
    from: "if (!/^videos\\//.test(key) || key.includes('..')) return cjson({ error: '파일 없음' }, 404)",
    to: "if (false) return cjson({ error: '파일 없음' }, 404)",
  },
  {
    name: '구간 요청에 문자열을 넘긴다 (영상 탐색이 깨진다)',
    file: 'functions/api/media/[[key]].ts',
    from: 'await R2.get(key, { range: request.headers })',
    to: 'await R2.get(key, { range: request.headers.get("Range") })',
  },
  {
    name: '신청 저장 실패를 다시 성공으로 답한다',
    file: 'functions/api/funnel/apply.ts',
    from: '  if (!saved) {', to: '  if (false) {',
  },
  {
    name: '임베드 폼 저장 실패를 다시 성공으로 답한다',
    file: 'functions/api/landing/form-submit.ts',
    from: '      if (!saved) {', to: '      if (false) {',
  },
  {
    name: '방문자 id 없는 기록을 다시 받는다 (집계가 어긋난다)',
    file: 'functions/api/public-notices.ts',
    from: "if (!visitor) return json({ ok: false, error: '방문자 식별 불가' }, 200)",
    to: "if (false) return json({ ok: false, error: '방문자 식별 불가' }, 200)",
  },
  {
    name: '강력 알림 플래그를 항상 꺼서 내보낸다',
    file: 'functions/api/public-notices.ts',
    from: 'strong: !!Number(c.strong || 0),', to: 'strong: false,',
  },
  {
    name: '집행 종료 시각을 알려 주지 않는다 (끝난 광고가 남는다)',
    file: 'functions/api/public-notices.ts',
    from: "endAt: c.end_at || '',", to: "endAt: '',",
  },
]

const clean = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
if (clean) { console.error('작업 트리가 깨끗하지 않다. 커밋하거나 되돌린 뒤 돌려라.\n' + clean); process.exit(2) }

let survived = 0
const results = []

for (const m of MUTATIONS) {
  const src = fs.readFileSync(m.file, 'utf8')
  if (!src.includes(m.from)) {
    results.push({ ...m, verdict: 'SKIP', note: '대상 코드를 찾지 못함 — 돌연변이 정의가 낡았다' })
    console.log(`  SKIP  ${m.name}`)
    continue
  }
  fs.writeFileSync(m.file, src.replace(m.from, m.to))
  let caught = false
  let by = ''
  try {
    execSync('npm test', { stdio: 'pipe', encoding: 'utf8', timeout: 900_000 })
  } catch (e) {
    caught = true
    const out = String(e.stdout || '') + String(e.stderr || '')
    const line = out.split('\n').filter((l) => /FAIL/.test(l))[0] || ''
    by = line.trim().slice(0, 80)
  }
  execSync(`git checkout -- "${m.file}"`)
  if (caught) {
    console.log(`  잡힘  ${m.name}\n          └ ${by}`)
    results.push({ ...m, verdict: 'CAUGHT', note: by })
  } else {
    survived++
    console.log(`  살아남음 ⚠  ${m.name}`)
    results.push({ ...m, verdict: 'SURVIVED' })
  }
}

console.log('\n──────────────────────────────')
console.log(`돌연변이 ${MUTATIONS.length}건 · 잡힘 ${results.filter((r) => r.verdict === 'CAUGHT').length} · 살아남음 ${survived} · 건너뜀 ${results.filter((r) => r.verdict === 'SKIP').length}`)
if (survived) {
  console.log('\n살아남은 것 = 테스트가 보고 있지 않은 자리:')
  for (const r of results.filter((x) => x.verdict === 'SURVIVED')) console.log('  · ' + r.name + '   (' + r.file + ')')
}
process.exit(survived ? 1 : 0)
