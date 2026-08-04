/* 남의 자원을 건드리는 자리 검사 —  node scripts/ownership.test.mjs
 *
 * 로그인만 확인하고 "id 로 고치고 지우는" 코드가 가장 흔한 사고다.
 * 주소창의 숫자 하나만 바꾸면 남의 랜딩페이지가 지워지고 남의 신청자 명단이 사라진다.
 * 오류도 안 나고 로그도 정상이라, 당한 쪽이 말해 주기 전에는 아무도 모른다.
 *
 * 보는 방법:
 *   1) user_id / owner_id 칸을 가진 표 = 회원 소유 자원으로 본다.
 *   2) 그 표를 UPDATE·DELETE 하면서 WHERE 에 id 만 있고 주인 칸이 없으면 잡는다.
  *   3) 단, 같은 파일에서 주인을 따로 확인했으면(ownsXxx(...) · id+user_id SELECT ·
 *      관리자·크론 검사) 통과시킨다.
 *   4) 그래도 남는 자리는 아래 OK_BY_DESIGN 에 이유와 함께 적는다.
 *
 * 검사는 문자열을 보는 것이라 완벽하지 않다. 대신 "예외가 늘면 바로 보이게" 해 둔다 —
 * 조용히 늘어나는 예외가 검사를 무력화하는 흔한 경로다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '\n         ' + detail : ''}`) }
}

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ').replace(/--[^\n]*/g, ' ')
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

/* 주인 확인이 아니라 "서버가 스스로 고른 행" 을 고치는 자리들. */
const OK_BY_DESIGN = new Map([
  ['instagram/webhook.ts', '웹훅이 스스로 고른 규칙의 발송 횟수만 올린다 (id 가 밖에서 오지 않는다)'],
  ['leads/collect.ts', '공개 폼 — slug 로 찾은 페이지의 리드 수만 올린다'],
  ['pwa/track.ts', '같은 파일에서 dup.user_id 와 대조해 남의 것이면 403 을 준다'],
  ['v1/model-file/[[path]].ts', '리스 토큰으로 확인된 대여 건의 호출 수만 올린다'],
])

const files = walk(path.join(ROOT, 'functions'))

/* ① 회원 소유 표 모으기 — user_id / owner_id 를 가진 표 */
const owned = new Set()
for (const p of files) {
  const src = strip(fs.readFileSync(p, 'utf8'))
  for (const m of src.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?(\w+)[`"\]]?\s*\(([\s\S]{0,2500}?)\)\s*`/gi))
    if (/\b(user_id|owner_id)\b/i.test(m[2])) owned.add(m[1].toLowerCase())
}
/* 주인 칸이 없어도 회원 자원인 표들 — 퍼널은 신청자→랜딩→그룹→퍼널→회원 으로 타고 올라간다.
   칸이 없다고 검사에서 빼면 정작 제일 아픈 자리(남의 신청자 명단 삭제)가 빠진다. */
for (const t of ['funnel_landing_pages', 'funnel_applicants', 'funnel_groups', 'funnel_ab_tests',
                 'funnel_group_connections', 'blog_rank_track_history'])
  owned.add(t)

const OWNCHK = /\bowns[A-Z]\w*\s*\(|WHERE\s+id\s*=\s*\?\s+AND\s+(?:CAST\()?user_id|user_id\s*=\s*\?\s+AND\s+id\s*=\s*\?/
const ADMIN = /requireAdminUser|isAdminUser|isIgAdmin|role\s*===\s*'(?:admin|superadmin)'|ADMIN_EMAIL|CRON_TOKEN/

const endpoints = files.filter((p) => p.includes('/functions/api/') && !path.basename(p).startsWith('_'))
const bad = []
let scanned = 0, exempted = 0
for (const p of endpoints) {
  const src = strip(fs.readFileSync(p, 'utf8'))
  if (!/export const onRequest/.test(src)) continue
  const rel = path.relative(path.join(ROOT, 'functions/api'), p)
  const guarded = OWNCHK.test(src) || ADMIN.test(src)
  for (const m of src.matchAll(/\b(UPDATE|DELETE FROM)\s+[`"[]?(\w+)[`"\]]?([\s\S]{0,400}?)(?=`|'|"|\n\s*\))/gi)) {
    const t = m[2].toLowerCase()
    if (!owned.has(t)) continue
    const stmt = m[0]
    const wi = stmt.search(/\bWHERE\b/i)
    if (wi < 0) continue
    const where = stmt.slice(wi)
    if (/user_id|owner_id/i.test(where)) continue                 // WHERE 에 주인이 있다
    if (!/\bid\s*=\s*\?/i.test(where)) continue                   // 밖에서 온 id 로 짚는 게 아니다
    scanned++
    if (guarded) continue
    if (OK_BY_DESIGN.has(rel)) { exempted++; continue }
    bad.push(`${rel}\n           ${stmt.replace(/\s+/g, ' ').slice(0, 120)}`)
  }
}

console.log('\n① 회원 소유 자원을 id 만 보고 고치거나 지우지 않는다')
{
  ok(owned.size > 50, `회원 소유 표를 충분히 모았다 (${owned.size}개)`, String(owned.size))
  for (const t of ['funnel_landing_pages', 'funnel_applicants', 'sms_templates', 'contact_groups', 'landing_pages'])
    ok(owned.has(t), `${t} 을 회원 소유로 본다`)
  ok(bad.length === 0, `주인 확인 없이 id 로 고치는 자리가 없다 (해당 구문 ${scanned}곳)`, bad.join('\n         '))
}

console.log('\n② 예외가 조용히 늘지 않는다')
{
  const have = new Set(endpoints.map((p) => path.relative(path.join(ROOT, 'functions/api'), p)))
  const stale = [...OK_BY_DESIGN.keys()].filter((k) => !have.has(k))
  ok(stale.length === 0, '없는 파일이 예외에 남아 있지 않다', stale.join(', '))
  ok(OK_BY_DESIGN.size <= 4, `예외가 늘지 않았다 (${OK_BY_DESIGN.size}개 · 이번에 쓰인 것 ${exempted}건)`, String(OK_BY_DESIGN.size))
}

console.log(failed === 0 ? '\n소유권 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
