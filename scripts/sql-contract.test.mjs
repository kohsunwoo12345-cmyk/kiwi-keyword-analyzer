/* SQL 계약 검증 —  node scripts/sql-contract.test.mjs
 *
 * 다른 테스트들은 가짜 D1 위에서 돈다. 빠르고 다루기 쉽지만 위험이 하나 있다 —
 * 가짜가 진짜 SQLite 와 다르게 굴면, 테스트는 제품이 아니라 가짜를 검사하게 된다.
 * (실제로 가짜가 진짜보다 엄격해서 조건을 지워도 통과하던 일이 있었다.)
 *
 * 그래서 여기서는 제품이 쓰는 "조건부 문장" 을 진짜 SQLite 엔진에 그대로 던져
 * 우리가 기대하는 대로 동작하는지 확인한다. 이 파일이 통과해야 다른 테스트의
 * 가짜가 흉내 내는 규칙이 사실이라고 말할 수 있다.
 *
 * 여기 적힌 SQL 은 제품 소스에서 그대로 읽어 온다 — 손으로 옮겨 적으면
 * 제품이 바뀌어도 이 파일만 그대로라 검사가 헛돈다.
 */
import fs from 'node:fs'

/* node:sqlite 는 Node 22+ 에만 있다. 없는 환경에서 빨간 실패로 보이면 안 된다 —
   건너뛴 사실은 화면에 남긴다. */
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

/** 제품 파일에서 SQL 한 조각을 그대로 꺼낸다(주석은 먼저 지운다). */
function sqlFrom(file, re) {
  const raw = fs.readFileSync(ROOT + file, 'utf8')
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
  const m = re.exec(src)
  return m ? m[0].replace(/`/g, '').replace(/\s+/g, ' ').trim() : null
}

const db = new DatabaseSync(':memory:')
const changes = (sql, ...a) => db.prepare(sql).run(...a).changes

console.log('\n① 환불 이중 실행 잠금 — 두 번째는 아무 행도 바꾸지 못한다')
{
  const sql = sqlFrom('functions/api/studio/_gencharge.ts', /UPDATE gen_charges SET status = 'refunded' WHERE[^`]*/)
  ok(!!sql, '제품 소스에서 문장을 찾았다', String(sql))
  db.exec("CREATE TABLE gen_charges (id TEXT PRIMARY KEY, status TEXT)")
  db.exec("INSERT INTO gen_charges VALUES ('g1','charged')")
  ok(changes(sql, 'g1') === 1, '첫 환불은 통과한다')
  ok(changes(sql, 'g1') === 0, '두 번째는 막힌다 (통과하면 쓰지도 않은 크레딧이 늘어난다)')
}

console.log('\n② 결제 지급 선점 — 동시 요청 중 하나만 통과한다')
{
  const sql = sqlFrom('functions/api/payments/confirm.ts', /UPDATE credit_orders SET status = 'paid'[^"]*/)
  ok(!!sql, '제품 소스에서 문장을 찾았다', String(sql))
  db.exec("CREATE TABLE credit_orders (order_id TEXT PRIMARY KEY, status TEXT, payment_key TEXT, paid_at TEXT)")
  db.exec("INSERT INTO credit_orders VALUES ('o1','pending','','')")
  ok(changes(sql, 'pk', 'now', 'o1') === 1, '첫 승인은 통과한다')
  ok(changes(sql, 'pk', 'now', 'o1') === 0, '두 번째는 막힌다 (통과하면 크레딧이 두 배로 지급된다)')
}

console.log('\n③ 인증코드 시도 상한 — 증가하면서 검사해야 병렬로 뚫리지 않는다')
{
  const sql = sqlFrom('functions/api/account/forgot-password.ts', /UPDATE password_resets SET attempts = attempts \+ 1 WHERE[^']*'/)
  const stmt = (sql || '').replace(/'$/, '')
  ok(!!stmt, '제품 소스에서 문장을 찾았다', String(stmt))
  db.exec("CREATE TABLE password_resets (email TEXT PRIMARY KEY, attempts INTEGER DEFAULT 0)")
  db.exec("INSERT INTO password_resets VALUES ('a@x.co', 0)")
  const got = Array.from({ length: 8 }, () => changes(stmt, 'a@x.co', 5))
  ok(got.filter(Boolean).length === 5, '8번 던져도 5번만 통과한다 (6자리 코드는 상한이 없으면 뚫린다)', JSON.stringify(got))
}

console.log('\n④ 제한 되돌리기 — 방금 쓴 한 칸만 지운다')
{
  const sql = sqlFrom('functions/api/_utils.ts', /DELETE FROM rate_hits WHERE rowid = \(SELECT MAX\(rowid\)[^']*/)
  ok(!!sql, '제품 소스에서 문장을 찾았다', String(sql))
  db.exec("CREATE TABLE rate_hits (k TEXT NOT NULL, at TEXT NOT NULL)")
  for (const t of ['t0', 't1', 't2']) db.prepare("INSERT INTO rate_hits VALUES (?, ?)").run('apply:7:010', t)
  db.prepare("INSERT INTO rate_hits VALUES (?, ?)").run('other', 't9')
  ok(changes(sql, 'apply:7:010') === 1, '한 줄만 지운다 (여러 줄을 지우면 제한이 통째로 풀린다)')
  const rest = db.prepare("SELECT k, at FROM rate_hits ORDER BY rowid").all()
  ok(rest.length === 3 && rest.some((r) => r.k === 'other'), '남의 키는 건드리지 않는다', JSON.stringify(rest))
  ok(!rest.some((r) => r.k === 'apply:7:010' && r.at === 't2'), '가장 최근 것이 지워진다', JSON.stringify(rest))
}

console.log('\n⑤ 노출 멱등 기록 — 45초마다 폴링해도 한 번만 쌓인다')
{
  const sql = sqlFrom('functions/api/_notices.ts', /INSERT OR IGNORE INTO notice_visitor_events[^`]*/)
  ok(!!sql, '제품 소스에서 문장을 찾았다', String(sql).slice(0, 60) + '…')
  db.exec(`CREATE TABLE notice_visitor_events (
    id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, visitor TEXT, ip TEXT, user_id TEXT,
    is_member INTEGER DEFAULT 0, member_email TEXT, kind TEXT, path TEXT, created_at TEXT NOT NULL)`)
  db.exec("CREATE UNIQUE INDEX idx_nve_uniq ON notice_visitor_events(campaign_id, visitor, kind)")
  const got = Array.from({ length: 5 }, (_, i) =>
    changes(sql, 'nve' + i, 'c1', 'v1', '1.2.3.4', '', 0, '', 'view', '/', 'now'))
  ok(got.filter(Boolean).length === 1, '5번 폴링해도 노출은 1건이다', JSON.stringify(got))

  //  종류가 다르면 따로 쌓여야 한다 — 전환이 노출에 묻히면 안 된다
  ok(changes(sql, 'nveX', 'c1', 'v1', '1.2.3.4', '', 0, '', 'convert', '/', 'now') === 1, '같은 방문자라도 전환은 따로 쌓인다')
  //  다른 방문자도 따로 쌓여야 한다
  ok(changes(sql, 'nveY', 'c1', 'v2', '1.2.3.4', '', 0, '', 'view', '/', 'now') === 1, '다른 방문자는 따로 쌓인다')
}

console.log('\n⑥ 스누즈는 덮어쓴다 — 다시 누르면 기간이 갱신된다')
{
  const sql = sqlFrom('functions/api/_notices.ts', /INSERT INTO notice_snoozes[^`]*/)
  ok(!!sql, '제품 소스에서 문장을 찾았다', String(sql).slice(0, 60) + '…')
  db.exec(`CREATE TABLE notice_snoozes (campaign_id TEXT NOT NULL, visitor TEXT NOT NULL,
    until TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (campaign_id, visitor))`)
  changes(sql, 'c1', 'v1', '2026-08-06', 'now')
  changes(sql, 'c1', 'v1', '2026-08-20', 'now')
  const rows = db.prepare("SELECT * FROM notice_snoozes").all()
  ok(rows.length === 1, '같은 방문자는 한 줄로 유지된다', String(rows.length))
  ok(rows[0].until === '2026-08-20', '기간이 새 값으로 갱신된다', String(rows[0].until))
}

console.log('\n⑦ 쿠폰 한도 — 전체·1인 모두 조건부 문장이 실제로 막는다')
{
  const upd = sqlFrom('functions/api/_coupons.ts', /UPDATE coupons SET used_count = COALESCE\(used_count, 0\) \+ 1[\s\S]*?max_uses\)/)
  const ins = sqlFrom('functions/api/_coupons.ts', /INSERT INTO coupon_redemptions[\s\S]*?< \?/)
  ok(!!upd && !!ins, '제품 소스에서 두 문장을 찾았다')
  db.exec("CREATE TABLE coupons (id TEXT PRIMARY KEY, used_count INTEGER DEFAULT 0, max_uses INTEGER DEFAULT 0)")
  db.exec("INSERT INTO coupons VALUES ('c1', 0, 1)")
  db.exec(`CREATE TABLE coupon_redemptions (id TEXT PRIMARY KEY, coupon_id TEXT, code TEXT, user_id TEXT,
    plan_request_id TEXT, track TEXT, plan TEXT, months INT, original_krw INT, discount_krw INT, final_krw INT, created_at TEXT)`)
  ok(changes(upd, 'c1') === 1, '1회짜리 쿠폰의 첫 사용은 통과한다')
  ok(changes(upd, 'c1') === 0, '두 번째는 막힌다 (동시에 넣어도 한도를 넘지 않는다)')

  const insArgs = (id) => [id, 'c1', 'CODE', 'u1', 'p1', 'video', 'Pro', 1, 100000, 20000, 80000, 'now', 1, 'c1', 'u1', 1]
  ok(changes(ins, ...insArgs('r1')) === 1, '1인 한도 1회 — 첫 기록은 들어간다')
  ok(changes(ins, ...insArgs('r2')) === 0, '같은 회원의 두 번째는 막힌다')
  const free = (id) => [id, 'c1', 'CODE', 'u9', 'p1', 'video', 'Pro', 1, 100000, 20000, 80000, 'now', 0, 'c1', 'u9', 0]
  ok(changes(ins, ...free('z1')) === 1 && changes(ins, ...free('z2')) === 1, '1인 한도가 0(무제한)이면 계속 들어간다')
}

console.log('\n⑧ 세션 조회 — 만료·정지를 SQL 이 직접 거른다')
{
  const sql = sqlFrom('functions/api/_utils.ts', /SELECT u\.\* FROM sessions s JOIN users u[^`]*/)
  ok(!!sql, '제품 소스에서 문장을 찾았다', String(sql).slice(0, 60) + '…')
  db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, status TEXT)")
  db.exec("CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT)")
  db.exec("INSERT INTO users VALUES ('u1','a@x.co','active'), ('u2','b@x.co','suspended'), ('u3','c@x.co',NULL)")
  db.exec("INSERT INTO sessions VALUES ('t1','u1','2999-01-01'), ('t2','u2','2999-01-01'), ('t3','u3','2999-01-01'), ('t4','u1','2000-01-01')")
  const get = (tok) => db.prepare(sql).all(tok, '2026-08-03T00:00:00Z')
  ok(get('t1').length === 1, '정상 회원은 조회된다')
  ok(get('t2').length === 0, '정지된 회원은 조회되지 않는다 (조회되면 정지가 무의미하다)')
  ok(get('t3').length === 1, 'status 가 없는 옛 회원은 조회된다 (IS NULL 을 빼면 전원 로그아웃된다)')
  ok(get('t4').length === 0, '만료된 세션은 조회되지 않는다')
}

console.log(failed === 0 ? '\nSQL 계약 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
