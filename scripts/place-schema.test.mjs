/* 플레이스 순위 추적 스키마 검증 —  node scripts/place-schema.test.mjs
 *
 * 이 기능의 두 표(naver_place_tracking · naver_place_ranks)는 다른 제품에서
 * 이식되면서 스키마 보장이 함께 오지 않았다. 코드는 읽고 쓰는데 어디서도
 * 만들지 않아, 이 저장소가 만든 D1 에서는 "추적 추가" 가 500 으로 죽고
 * 목록은 늘 비어 있었다(실측). 운영 DB 에 이식 당시의 표가 남아 있어 지금은
 * 도는 것처럼 보일 수 있지만, D1 을 새로 만들면 그 순간 기능이 사라진다.
 *
 * 그래서 진짜 SQLite 에 ensurePlaceSchema 로 표를 만든 뒤,
 * 제품이 실제로 쓰는 질의를 소스에서 뽑아 그대로 돌린다.
 * 코드가 쓰는 칸이 스키마에 없으면 여기서 바로 터진다.
 */
import fs from 'node:fs'
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

let DatabaseSync
try { ({ DatabaseSync } = await import('node:sqlite')) } catch {
  console.log('\n건너뜀 — 이 Node 에는 node:sqlite 가 없습니다(22+ 필요).\n')
  process.exit(0)
}

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

async function load(file) {
  const out = await build({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console,
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}'), btoa, atob, setTimeout, clearTimeout, structuredClone,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

/** 제품 파일에서 SQL 을 그대로 꺼낸다(주석 제거 후). */
function sqlFrom(file, re) {
  const raw = fs.readFileSync(ROOT + file, 'utf8')
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
  const m = re.exec(src)
  return m ? m[0].replace(/`/g, '').replace(/\s+/g, ' ').trim() : null
}

const sqlite = new DatabaseSync(':memory:')
/* ensurePlaceSchema 는 D1 인터페이스를 받으므로, 진짜 SQLite 를 D1 모양으로 감싼다. */
const d1 = {
  prepare(sql) {
    const s = String(sql)
    const mk = (b) => ({
      async run() { const r = sqlite.prepare(s).run(...b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } } },
      async first() { return sqlite.prepare(s).get(...b) ?? null },
      async all() { return { results: sqlite.prepare(s).all(...b) } },
    })
    return { bind: (...b) => mk(b), ...mk([]) }
  },
  async batch(st) { return (st || []).map(() => ({ results: [] })) },
  async dump() { return new ArrayBuffer(0) },
}

const { ensurePlaceSchema } = await load('functions/api/naver-place/_schema.ts')

console.log('\n① 스키마 보장이 두 표를 실제로 만든다')
{
  await ensurePlaceSchema(d1)
  const names = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name)
  ok(names.includes('naver_place_tracking'), 'naver_place_tracking 이 생긴다', JSON.stringify(names))
  ok(names.includes('naver_place_ranks'), 'naver_place_ranks 가 생긴다', JSON.stringify(names))

  //  두 번 불러도 터지지 않아야 한다(요청마다 지나간다)
  await ensurePlaceSchema(d1)
  ok(true, '두 번 불러도 문제없다')
}

console.log('\n①-b 이식 당시의 옛 표가 이미 있으면 빠진 칸만 덧댄다')
{
  /* 운영 DB 에는 이식 당시 모양의 표가 남아 있다 — CREATE IF NOT EXISTS 는 그냥 지나간다.
     그때 share_* 같은 뒤에 생긴 칸이 없으면 공유 설정 저장이 그 자리에서 죽는다. */
  const old = new DatabaseSync(':memory:')
  old.exec(`CREATE TABLE naver_place_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, place_id TEXT, place_url TEXT,
    keyword TEXT, status TEXT, created_at TEXT)`)          // 옛 모양 — location·last_check·share_* 없음
  old.exec(`CREATE TABLE naver_place_ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, place_id TEXT, place_url TEXT,
    keyword TEXT, rank_number INTEGER, created_at TEXT)`)  // 옛 모양 — location·place_name·total_count 없음
  const oldD1 = {
    prepare(sql) {
      const q = String(sql)
      const mk = (b) => ({
        async run() { const r = old.prepare(q).run(...b); return { meta: { changes: r.changes } } },
        async first() { return old.prepare(q).get(...b) ?? null },
        async all() { return { results: old.prepare(q).all(...b) } },
      })
      return { bind: (...b) => mk(b), ...mk([]) }
    },
    async batch(st) { return (st || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
  const mod = await load('functions/api/naver-place/_schema.ts')   // 모듈 상태(1회 보장)를 새로 받는다
  await mod.ensurePlaceSchema(oldD1)

  const cols = (t) => old.prepare(`PRAGMA table_info(${t})`).all().map((r) => r.name)
  const tcols = cols('naver_place_tracking')
  for (const c of ['share_title', 'share_subtitle', 'share_thumbnail', 'location', 'last_check'])
    ok(tcols.includes(c), `옛 추적 표에 ${c} 칸이 덧대어진다`, JSON.stringify(tcols))
  const rcols = cols('naver_place_ranks')
  for (const c of ['location', 'place_name', 'total_count'])
    ok(rcols.includes(c), `옛 순위 표에 ${c} 칸이 덧대어진다`, JSON.stringify(rcols))

  //  덧댄 뒤 실제 질의가 도는지까지 본다
  const upd = sqlFrom('functions/api/naver-place/tracking/[id]/share-settings.ts', /UPDATE naver_place_tracking SET share_title[^`]*/)
  old.prepare("INSERT INTO naver_place_tracking (user_id, place_id, keyword, status) VALUES ('u1','1','kw','active')").run()
  let threw = ''
  try { old.prepare(upd).run('제목', '부제', null, 1, 'u1') } catch (e) { threw = String(e.message) }
  ok(!threw, '옛 표에서도 공유 설정이 저장된다', threw)
}

console.log('\n② 제품이 쓰는 질의가 그대로 돈다 (칸이 없으면 여기서 터진다)')
{
  const insTrack = sqlFrom('functions/api/naver-place/tracking.ts', /INSERT INTO naver_place_tracking \([\s\S]*?VALUES[\s\S]*?\)\s*`/)
  ok(!!insTrack, '추적 등록 문장을 소스에서 찾았다', String(insTrack).slice(0, 50) + '…')
  let threw = ''
  try { sqlite.prepare(insTrack).run('u1', '1234567', 'https://place.naver.com/1234567', '강남 미용실', '') }
  catch (e) { threw = String(e.message) }
  ok(!threw, '추적 등록이 실제로 들어간다', threw)

  const insRank = sqlFrom('functions/api/naver-place/rank.ts', /INSERT INTO naver_place_ranks \([\s\S]*?VALUES[\s\S]*?\)\s*`/)
  ok(!!insRank, '순위 기록 문장을 소스에서 찾았다', String(insRank).slice(0, 50) + '…')
  threw = ''
  try { sqlite.prepare(insRank).run('u1', '1234567', 'https://place.naver.com/1234567', '강남 미용실', '', 3, 120, '우리 미용실') }
  catch (e) { threw = String(e.message) }
  ok(!threw, '순위 기록이 실제로 들어간다', threw)

  const upd = sqlFrom('functions/api/naver-place/tracking/[id]/share-settings.ts', /UPDATE naver_place_tracking SET share_title[^`]*/)
  ok(!!upd, '공유 설정 문장을 소스에서 찾았다', String(upd).slice(0, 50) + '…')
  threw = ''
  try { sqlite.prepare(upd).run('제목', '부제', '/api/media/t.png', 1, 'u1') }
  catch (e) { threw = String(e.message) }
  ok(!threw, '공유 설정이 실제로 저장된다 (share_* 칸이 없으면 여기서 터진다)', threw)

  const del = sqlFrom('functions/api/naver-place/tracking/[id].ts', /UPDATE naver_place_tracking SET status = 'deleted'[^`]*/)
  ok(!!del, '삭제 문장을 소스에서 찾았다', String(del).slice(0, 50) + '…')
  threw = ''
  let changes = -1
  try { changes = sqlite.prepare(del).run(1, 'u1').changes } catch (e) { threw = String(e.message) }
  ok(!threw && changes === 1, '본인 추적은 삭제된다', threw || String(changes))
  ok(sqlite.prepare(del).run(1, 'someone-else').changes === 0, '남의 추적은 삭제되지 않는다 (user_id 조건이 실제로 막는다)')
}

console.log('\n③ 목록 질의가 그대로 돈다 (순위 이력을 끌어다 붙인다)')
{
  const sel = sqlFrom('functions/api/naver-place/tracking.ts', /SELECT t\.\*,[\s\S]*?FROM naver_place_tracking t[\s\S]*?ORDER BY t\.created_at DESC/)
  ok(!!sel, '목록 질의를 소스에서 찾았다', String(sel).slice(0, 50) + '…')
  sqlite.prepare("UPDATE naver_place_tracking SET status='active' WHERE id=1").run()
  let rows = null, threw = ''
  try { rows = sqlite.prepare(sel).all('1234567', 'u1') } catch (e) { threw = String(e.message) }
  ok(!threw, '목록 질의가 돈다', threw)
  ok(rows && rows.length === 1, '추적 한 줄이 나온다', String(rows && rows.length))
  ok(rows && rows[0].last_rank === 3, '최근 순위가 붙어 나온다', String(rows && rows[0].last_rank))
  ok(rows && rows[0].place_name === '우리 미용실', '장소 이름도 붙어 나온다', String(rows && rows[0].place_name))
  ok(rows && rows[0].last_total_count === 120, '전체 개수도 붙어 나온다', String(rows && rows[0].last_total_count))
}

console.log('\n④ 회원 탈퇴 시 지우는 문장도 그대로 돈다')
{
  //  개인정보다 — 지우는 문장이 표 이름을 잘못 짚고 있으면 남는다
  const del = sqlFrom('functions/api/_utils.ts', /DELETE FROM naver_place_tracking WHERE user_id = \?/)
  ok(!!del, '탈퇴 정리 문장을 소스에서 찾았다', String(del))
  let threw = ''
  try { sqlite.prepare(del).run('u1') } catch (e) { threw = String(e.message) }
  ok(!threw, '탈퇴 정리가 실제로 돈다', threw)
  ok(sqlite.prepare('SELECT COUNT(*) c FROM naver_place_tracking').get().c === 0, '그 회원의 추적이 남지 않는다')
}

console.log(failed === 0 ? '\n플레이스 스키마 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
