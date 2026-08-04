/* 스키마 일관성 검증 —  node scripts/schema-consistency.test.mjs
 *
 * 코드가 읽고 쓰는 표·칸이 실제로 만들어지는지 소스 전체를 대조한다.
 *
 * 왜 필요한가:
 *  이식된 기능은 코드만 따라오고 스키마 보장이 빠지는 일이 있다. 그러면
 *  운영 DB 에 옛 표가 남아 있는 동안은 도는 것처럼 보이다가, D1 을 새로 만들면
 *  그 순간 조용히 죽는다. 실제로 플레이스 순위 추적이 그랬다 —
 *  "추적 추가" 는 500, 목록은 오류 없이 빈 화면이었다.
 *  타입 검사도 테스트도 이런 건 못 잡는다. SQL 은 문자열이라서다.
 *
 * 무엇을 보나:
 *  1) 코드가 쓰는 표 이름이 어딘가에서 CREATE 되는가
 *  2) INSERT 에 적은 칸이 그 표의 스키마에 있는가
 *     (CREATE 본문 + ALTER ADD COLUMN + 컬럼 보강 헬퍼를 모두 모아 본다)
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '\n         ' + detail : ''}`) }
}

/* SQL 은 문자열 안에 있어 JS 주석뿐 아니라 SQL 주석(--)도 지워야 한다.
   처음엔 -- 를 안 지워서 "kind TEXT, -- 설명" 다음 칸을 통째로 놓쳤다(오탐 50건). */
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/[^\n]*/g, ' ')
  .replace(/--[^\n]*/g, ' ')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|js)$/.test(e.name)) out.push(p)
  }
  return out
}

/** '(' 위치에서 짝이 맞는 ')' 인덱스 */
function balanced(s, start) {
  let d = 0
  for (let i = start; i < s.length; i++) {
    if (s[i] === '(') d++
    else if (s[i] === ')') { d--; if (d === 0) return i }
  }
  return -1
}
/** 최상위 콤마로만 자른다 (DEFAULT (datetime('now')) 같은 중첩을 지킨다) */
function splitTop(body) {
  const out = []; let buf = '', d = 0
  for (const ch of body) {
    if (ch === '(') d++
    else if (ch === ')') d--
    if (ch === ',' && d === 0) { out.push(buf); buf = '' } else buf += ch
  }
  out.push(buf); return out
}

const files = walk(path.join(ROOT, 'functions'))
const sources = files.map((p) => [p, strip(fs.readFileSync(p, 'utf8'))])

/* ── 1) 스키마 모으기 ────────────────────────────────────────────────────── */
const schema = new Map()      // table -> Set(cols)
const dynamic = new Set()     // 컬럼을 변수로 붙이는 표 — 칸 대조에서 뺀다
const add = (t, c) => {
  const k = t.toLowerCase()
  if (!schema.has(k)) schema.set(k, new Set())
  if (c) schema.get(k).add(c.toLowerCase())
}

for (const [, src] of sources) {
  for (const m of src.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?(\w+)[`"\]]?\s*(?=\()/gi)) {
    const op = src.indexOf('(', m.index + m[0].length - 1)
    const cp = balanced(src, op)
    if (cp < 0) continue
    add(m[1])
    for (const line of splitTop(src.slice(op + 1, cp))) {
      const mm = /^\s*[`"[]?(\w+)[`"\]]?\s+\w/.exec(line)
      if (mm && !['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT'].includes(mm[1].toUpperCase()))
        add(m[1], mm[1])
    }
  }
  //  ALTER TABLE t ADD COLUMN c ...
  for (const m of src.matchAll(/ALTER\s+TABLE\s+[`"[]?(\w+)[`"\]]?\s+ADD\s+COLUMN\s+[`"[]?(\w+)/gi)) add(m[1], m[2])
  //  ALTER TABLE ${tbl} ADD COLUMN ${col}  — 표·칸이 변수다
  for (const m of src.matchAll(/ALTER TABLE \$\{(\w+)\} ADD COLUMN/g)) { /* 표까지 변수 */ }
  //  addMissingColumns(db, 'table', { col: 'col TEXT', ... })
  for (const m of src.matchAll(/addMissingColumns\(\s*db\s*,\s*'(\w+)'\s*,\s*(?=\{)/g)) {
    const op = src.indexOf('{', m.index + m[0].length - 1)
    const cp = (() => { let d = 0; for (let i = op; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return i } } return -1 })()
    if (cp < 0) continue
    for (const c of src.slice(op + 1, cp).matchAll(/(\w+)\s*:/g)) add(m[1], c[1])
  }
  //  for (const [tbl, col] of [['t','c TEXT'], ...]) { ALTER TABLE ${tbl} ADD COLUMN ${col} }
  for (const m of src.matchAll(/for \(const \[\w+, ?\w+\] of \[([\s\S]*?)\]\)\s*\{[\s\S]{0,200}?ALTER TABLE \$\{\w+\} ADD COLUMN/g))
    for (const t of m[1].matchAll(/\[\s*'(\w+)'\s*,\s*'(\w+)/g)) add(t[1], t[2])
  //  for (const col of ['a TEXT', ...]) ALTER TABLE t ADD COLUMN ${col}
  /* for (const col of ['a TEXT', "b TEXT DEFAULT ''"]) → ALTER TABLE t ADD COLUMN ${col}
     따옴표가 홑·겹 섞여 있고 줄바꿈이 끼므로 둘 다 받는다. */
  for (const m of src.matchAll(/for \(const \w+ of \[([\s\S]*?)\]\)[\s\S]{0,300}?ALTER TABLE (\w+) ADD COLUMN \$\{/g))
    for (const c of m[1].matchAll(/['"](\w+)/g)) add(m[2], c[1])
  //  표 이름이 변수면 칸 대조가 불가능하다 — 그 표는 빼 둔다
  for (const m of src.matchAll(/ALTER TABLE (\w+) ADD COLUMN \$\{/g)) dynamic.add(m[1].toLowerCase())
}

/* ── 2) 표 참조 대조 ────────────────────────────────────────────────────── */
/* SQL 키워드·별칭·문장 속 낱말이 표 이름처럼 잡힌다 — 알려진 잡음은 제외한다. */
const NOISE = new Set(['select', 'set', 'values', 'table', 'where', 'and', 'or', 'as', 'on', 'not', 'exists',
  'if', 'by', 'order', 'group', 'limit', 'case', 'when', 'then', 'else', 'end', 'distinct', 'all', 'union',
  'left', 'inner', 'outer', 'cross', 'using', 'pragma', 'temp', 'main', 'json', 'json_each',
  'above', 'below', 'og', 'title', 'photorealistic', 'skipped', 'ads', 'classes', 'students', 'nxplaces', '로'])

const usedTables = new Map()
for (const [p, src] of sources)
  for (const m of src.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+[`"[]?(\w+)[`"\]]?/gi)) {
    const t = m[1].toLowerCase()
    if (NOISE.has(t) || t.startsWith('sqlite') || t.length <= 2) continue
    if (!usedTables.has(t)) usedTables.set(t, new Set())
    usedTables.get(t).add(path.relative(ROOT, p))
  }

console.log('\n① 코드가 쓰는 표는 모두 어딘가에서 만들어진다')
{
  const missing = [...usedTables].filter(([t]) => !schema.has(t))
  ok(missing.length === 0,
     `만들어지지 않는 표가 없다 (참조 ${usedTables.size}개 · 스키마 ${schema.size}개)`,
     missing.map(([t, fs_]) => `${t}  ←  ${[...fs_].slice(0, 2).join(', ')}`).join('\n         '))
}

/* ── 3) INSERT 칸 대조 ─────────────────────────────────────────────────── */
console.log('\n② INSERT 가 적는 칸은 모두 그 표에 있다')
{
  const bad = []
  for (const [p, src] of sources)
    for (const m of src.matchAll(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"[]?(\w+)[`"\]]?\s*(?=\()/gi)) {
      const t = m[1].toLowerCase()
      if (!schema.has(t) || schema.get(t).size === 0 || dynamic.has(t)) continue
      const op = src.indexOf('(', m.index + m[0].length - 1)
      const cp = balanced(src, op)
      if (cp < 0) continue
      const cols = splitTop(src.slice(op + 1, cp)).map((c) => c.trim().replace(/[`"[\]]/g, '').toLowerCase())
      if (!cols.every((c) => /^\w+$/.test(c))) continue        // SELECT ... 형태는 건너뛴다
      const miss = cols.filter((c) => !schema.get(t).has(c))
      if (miss.length) bad.push(`${t}.${miss.join(',')}  ←  ${path.relative(ROOT, p)}`)
    }
  ok(bad.length === 0, '없는 칸에 넣는 INSERT 가 없다', bad.join('\n         '))
}

console.log('\n③ 스키마 수집이 실제로 동작한다 (검사가 헛돌지 않게)')
{
  //  아무것도 못 모았는데 "문제 없음" 이라고 답하면 최악이다 — 표본으로 확인한다
  ok(schema.size > 100, `표를 충분히 모았다 (${schema.size}개)`, String(schema.size))
  for (const [t, c] of [['users', 'credits'], ['transactions', 'amount'], ['sessions', 'ip'],
                        ['gen_charges', 'status'], ['naver_place_tracking', 'share_title'],
                        ['plan_requests', 'months'], ['instagram_dm_logs', 'user_id']])
    ok(schema.get(t)?.has(c), `${t}.${c} 을 스키마에서 찾는다`, JSON.stringify([...(schema.get(t) || [])].slice(0, 8)))
  ok(usedTables.size > 100, `표 참조를 충분히 모았다 (${usedTables.size}개)`, String(usedTables.size))
}

console.log(failed === 0 ? '\n스키마 일관성 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
