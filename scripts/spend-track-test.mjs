// 제공사 실제 사용액 계산 검증 — 잔액 스냅샷에서 '하루에 실제로 쓴 금액' 을 뽑는 규칙.
//  실행:  npm i -D esbuild && node scripts/spend-track-test.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-'))
fs.writeFileSync(path.join(dir, '_utils.mjs'), 'export const json=()=>null;\n')
execFileSync('npx', ['esbuild', 'functions/api/admin/_spend.ts', '--format=esm', '--platform=neutral',
  '--outfile=' + path.join(dir, 'spend.mjs'), '--log-level=error'], { stdio: 'inherit' })
const S = await import(path.join(dir, 'spend.mjs'))

const out = []; const ok = (n, c, i) => out.push([n, !!c, i == null ? '' : String(i)])
const snap = (d, t, b) => ({ created_at: `${d}T${t}:00.000Z`, balance: b })

// 하루에 여러 번 찍혀도 그날 마지막 값만 쓴다
{
  const days = S.dailyBalances([snap('2026-07-01','01:00',1000), snap('2026-07-01','20:00',900), snap('2026-07-02','23:00',700)])
  ok('하루 여러 기록 → 마지막 값', JSON.stringify(days) === JSON.stringify([['2026-07-01',900],['2026-07-02',700]]), JSON.stringify(days))
}
// 잔액이 줄어든 만큼이 사용량, USD 환산도 맞는가
{
  const u = S.dailyUsage([['2026-07-01',1000],['2026-07-02',700],['2026-07-03',650]], 0.01)
  ok('사용량 = 전날 − 그날', u[0].usedUnits === 300 && u[1].usedUnits === 50, JSON.stringify(u.map(x=>x.usedUnits)))
  ok('USD 환산 (크레딧×단가)', u[0].usedUsd === 3 && u[1].usedUsd === 0.5, JSON.stringify(u.map(x=>x.usedUsd)))
}
// 충전한 날은 사용량을 알 수 없다 → 계산에서 뺀다
{
  const u = S.dailyUsage([['2026-07-01',100],['2026-07-02',900],['2026-07-03',850]], 0.01)
  ok('충전한 날 표시·제외', u[0].recharged === true && u[0].usedUnits === null && u[0].usedUsd === null, JSON.stringify(u[0]))
  ok('충전 다음날은 정상 계산', u[1].usedUnits === 50, String(u[1].usedUnits))
}
// USD 환산 단가가 없는 제공사(문자 수 등)는 금액을 만들지 않는다
{
  const u = S.dailyUsage([['2026-07-01',10000],['2026-07-02',9000]], null)
  ok('환산 단가 없으면 금액 없음', u[0].usedUnits === 1000 && u[0].usedUsd === null, JSON.stringify(u[0]))
}
// 기록이 하루뿐이면 계산할 수 없다(비교 대상 없음)
{
  ok('기록 1일 → 계산 없음', S.dailyUsage([['2026-07-01',100]], 1).length === 0)
}
fs.rmSync(dir, { recursive: true, force: true })
let fail = 0
for (const [n, p, i] of out) { if (!p) fail++; console.log((p ? 'PASS ' : 'FAIL ') + n + (i ? '  — ' + i : '')) }
console.log(`\n${out.length - fail}/${out.length} passed`)
process.exit(fail ? 1 : 0)
