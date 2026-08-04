/* 날짜가 한국 기준인지 검증 —  node --disable-warning=ExperimentalWarning scripts/kst.test.mjs
 *
 * 시각은 UTC 로 저장한다(그건 옳다). 문제는 "며칠자" 로 묶을 때다.
 * UTC 날짜로 자르면 한국 00:00~09:00 에 일어난 일이 전날로 들어간다.
 *   · 아침 8시에 보낸 문자가 어제 막대에 붙고, 오늘 막대는 비어 있다
 *   · 블로그 순위를 아침에 한 번 낮에 한 번 보면 같은 날인데 두 줄이 되고,
 *     "오늘 것은 지우고 다시 넣는" 중복 제거가 엉뚱한 날을 지운다
 * 숫자가 조금 이상할 뿐 오류가 아니라서, 보는 사람이 자기 눈을 의심하게 된다.
 *
 * 실제 SQLite 엔진에 대고 확인한다 — 문자열만 보면 그 SQL 이 도는지 알 수 없다.
 */
import fs from 'node:fs'
import path from 'node:path'

/* node:sqlite 는 Node 22+ 에만 있다. 없는 환경에서 빨간 실패로 보이면 안 된다 —
   건너뛴 사실은 화면에 남긴다.
   ⚠ 이걸 빼먹어서 배포가 통째로 죽었다. Cloudflare Pages 빌드는 Node 20 이고,
     이 검사는 prebuild 로 도는 npm test 안에 있어서 여기서 터지면 사이트가 안 올라간다.
     내 컴퓨터는 Node 22 라 통과했고, 그래서 아무도 못 봤다. */
let DatabaseSync
try { ({ DatabaseSync } = await import('node:sqlite')) } catch {
  console.log('\n건너뜀 — 이 Node 에는 node:sqlite 가 없습니다(22+ 필요).\n')
  process.exit(0)
}

const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

/** 소스에서 SQL 을 그대로 꺼내 쓴다 — 손으로 옮겨 적으면 검사가 헛돈다. */
function sqlFrom(file, needle) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const i = src.indexOf(needle)
  if (i < 0) return null
  const s = src.lastIndexOf('`', i)
  const e = src.indexOf('`', i)
  return s < 0 || e < 0 ? null : src.slice(s + 1, e)
}

console.log('\n① 문자·알림톡 7일 추이가 한국 날짜로 묶인다')
{
  for (const [file, table] of [['functions/api/sms/logs.ts', 'sms_logs'], ['functions/api/alimtalk/logs.ts', 'alimtalk_logs']]) {
    const sql = sqlFrom(file, "AS d, COALESCE(SUM(recipients)")
    ok(!!sql, `${table} 추이 SQL 을 찾았다`)
    if (!sql) continue

    const db = new DatabaseSync(':memory:')
    db.exec(`CREATE TABLE ${table} (user_id TEXT, recipients INTEGER, sent INTEGER, created_at TEXT)`)
    const ins = db.prepare(`INSERT INTO ${table} (user_id, recipients, sent, created_at) VALUES ('u1', 1, 1, ?)`)
    //  한국 8월 4일 08:00 = UTC 8월 3일 23:00  ← 여기가 전날로 새던 자리
    ins.run('2026-08-03T23:00:00.000Z')
    //  한국 8월 4일 18:00 = UTC 8월 4일 09:00
    ins.run('2026-08-04T09:00:00.000Z')

    const rows = db.prepare(sql.replace(/user_id=\?/, "user_id='u1'").replace(/>= \?/, ">= '2026-07-01'")).all()
    ok(rows.length === 1, `${table} — 같은 한국 날짜의 두 건이 하루로 묶인다`, JSON.stringify(rows))
    ok(rows[0]?.d === '2026-08-04', `${table} — 그 하루는 8월 4일이다 (UTC 로 자르면 8월 3일)`, JSON.stringify(rows))
    ok(Number(rows[0]?.reqd) === 2, `${table} — 건수가 합쳐진다`, JSON.stringify(rows))
  }
}

console.log('\n② SQLite 가 우리 시각 형식을 실제로 읽는다')
{
  /* datetime() 이 형식을 못 읽으면 NULL 이 되고 추이가 통째로 사라진다.
     우리가 저장하는 모양(new Date().toISOString())으로 직접 확인한다. */
  const db = new DatabaseSync(':memory:')
  const iso = new Date('2026-08-03T23:00:00.000Z').toISOString()
  const r = db.prepare("SELECT substr(datetime(?, '+9 hours'),1,10) d").get(iso)
  ok(r.d === '2026-08-04', 'toISOString() 모양을 datetime() 이 읽는다', JSON.stringify(r))
  //  못 읽는 엔진을 만나도 추이가 사라지지는 않아야 한다(COALESCE 로 옛 방식으로 떨어진다)
  for (const f of ['functions/api/sms/logs.ts', 'functions/api/alimtalk/logs.ts'])
    ok(/COALESCE\(substr\(datetime\(created_at, '\+9 hours'\),1,10\), substr\(created_at,1,10\)\)/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')),
       `${f.split('/').slice(-2).join('/')} — 읽지 못하는 경우에도 추이가 비지 않는다`)
}

console.log('\n③ 블로그 순위의 "며칠자" 가 한국 날짜다')
{
  const brt = fs.readFileSync(path.join(ROOT, 'functions/api/blog-rank-track/_brt.ts'), 'utf8')
  ok(/export function kstDate/.test(brt) && /Asia\/Seoul/.test(brt), '한국 날짜 헬퍼가 있다')
  for (const f of ['functions/api/blog-rank-track/add.ts', 'functions/api/blog-rank-track/check-mine.ts']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
    ok(/const today = kstDate\(\)/.test(src), `${f.split('/').pop()} — 오늘을 한국 날짜로 잡는다`)
    ok(!/new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(src), `${f.split('/').pop()} — UTC 날짜로 되돌아가지 않았다`)
  }
  //  헬퍼 자체가 맞는 값을 주는지 (한국 00~09시 구간)
  const d = new Date('2026-08-03T23:00:00.000Z')
  ok(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }) === '2026-08-04', '헬퍼가 쓰는 방식이 8월 4일을 준다')
}

console.log(failed === 0 ? '\n한국 날짜 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
