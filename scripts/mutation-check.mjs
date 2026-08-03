/* 돌연변이 점검 —  node scripts/mutation-check.mjs   (npm run test:mutation)
 *
 * 테스트가 늘 통과하면 안심이 되지만, 그건 "지키고 있다" 가 아니라
 * "아무것도 안 보고 있다" 일 수도 있다. 실제로 회귀 테스트 하나가 엉뚱한 구문을
 * 세고 있던 것, 단언 하나가 통째로 헛돌고 있던 것을 이 방식으로 찾아냈다.
 *
 * 그래서 제품 코드를 일부러 망가뜨리고 npm test 가 잡아내는지 본다.
 * 잡아내지 못하는 돌연변이(=살아남은 것)가 있으면 그 자리는 사실상 무방비다.
 *
 * 각 항목은 "진짜 동작이 바뀌는" 변형이어야 한다. 주석·공백 변경은 의미가 없다.
 * 원본은 git 으로 되돌리므로 작업 트리가 깨끗한 상태에서 돌려야 한다.
 *
 * 인자로 걸러 낼 수 있다:  node scripts/mutation-check.mjs 과금
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const MUTATIONS = [
  // ── 요금 계산 ────────────────────────────────────────────────────────────
  { g: '요금', name: 'Seedance 2.0 단가를 낮춘다 (원가보다 싸게 받게 된다)',
    file: 'functions/api/studio/_pricing.ts',
    from: "'Seedance 2.0': 7.0,", to: "'Seedance 2.0': 5.0," },
  { g: '요금', name: '영상 프레임 수에서 +1 을 뺀다 (토큰이 과소 계산된다)',
    file: 'functions/api/studio/_pricing.ts',
    from: 'SEEDANCE_FPS * secs + 1', to: 'SEEDANCE_FPS * secs' },
  { g: '요금', name: '해상도 배수를 무시한다 (4K 를 1080p 값으로 받는다)',
    file: 'functions/api/studio/_pricing.ts',
    from: "const resMult = RES_MULT[input.res || '1080p'] || 1", to: 'const resMult = 1' },
  { g: '요금', name: '기본 마크업을 1배로 (마진이 사라진다)',
    file: 'functions/api/studio/_pricing.ts',
    from: 'const defaultMarkup = isSeed20 || isImg ? 2.5 : 3.0', to: 'const defaultMarkup = 1' },
  { g: '요금', name: '회원별 마크업 지정을 무시한다',
    file: 'functions/api/studio/_pricing.ts',
    from: 'const markup = markupOverride && markupOverride > 0 ? Math.max(1, markupOverride) : defaultMarkup',
    to: 'const markup = defaultMarkup' },
  { g: '요금', name: '원가를 정수로 반올림해 계산한다 (싼 호출이 공짜가 된다)',
    file: 'functions/api/studio/_pricing.ts',
    from: 'const costKrwExact = usd * rate', to: 'const costKrwExact = Math.round(usd * rate)' },
  { g: '요금', name: '관리자 실측 단가 지정을 무시한다',
    file: 'functions/api/studio/_pricing.ts',
    from: 'const hasOv = Number.isFinite(ov) && ov > 0', to: 'const hasOv = false' },
  { g: '요금', name: '업스케일 별칭 정규화를 끈다 (표에 없는 이름 → 영상 기본값 25배 과청구)',
    file: 'functions/api/studio/_pricing.ts',
    from: 'if (/업스케일|화질 올리기|upscale/i.test(model) && !MODEL_COST[model]) {',
    to: 'if (false) {' },

  // ── 차감·환불 ────────────────────────────────────────────────────────────
  { g: '과금', name: '차감을 가산으로 뒤집는다 (쓸수록 크레딧이 는다)',
    file: 'functions/api/studio/_gencharge.ts',
    from: "await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) - ?, 2) WHERE id = ?')\n      .bind(credits, me.id).run()",
    to: "await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) + ?, 2) WHERE id = ?')\n      .bind(credits, me.id).run()" },
  { g: '과금', name: '이미 쓴 토큰을 다시 청구한다 (이중 차감)',
    file: 'functions/api/studio/_gencharge.ts',
    from: 'if (!spec || spec.alreadyConsumed) return NONE', to: 'if (!spec) return NONE' },
  { g: '과금', name: '관리자 면제를 없앤다',
    file: 'functions/api/studio/_gencharge.ts',
    from: "if (!db || !me?.id || me.role === 'admin') return NONE", to: 'if (!db || !me?.id) return NONE' },
  { g: '과금', name: '환불의 조건부 잠금을 푼다 (환불이 여러 번 나간다)',
    file: 'functions/api/studio/_gencharge.ts',
    from: "`UPDATE gen_charges SET status = 'refunded' WHERE id = ? AND status = 'charged'`",
    to: "`UPDATE gen_charges SET status = 'refunded' WHERE id = ?`" },
  { g: '과금', name: '환불을 다시 차감으로 만든다',
    file: 'functions/api/studio/_gencharge.ts',
    from: "await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) + ?, 2) WHERE id = ?')\n      .bind(amt, row.user_id).run()",
    to: "await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) - ?, 2) WHERE id = ?')\n      .bind(amt, row.user_id).run()" },
  { g: '과금', name: '실측 정산의 중복 방지를 푼다 (폴링마다 차액이 또 빠진다)',
    file: 'functions/api/studio/_gencharge.ts',
    from: 'if (!claim?.meta?.changes) return 0', to: 'if (false) return 0' },
  { g: '과금', name: '실측 정산이 관리자 지정 단가를 덮어쓰게 한다',
    file: 'functions/api/studio/_gencharge.ts',
    from: 'if (Number.isFinite(Number(ovUsd)) && Number(ovUsd) > 0) return 0', to: 'if (false) return 0' },
  { g: '과금', name: '레퍼런스·CN 가산을 빼먹는다',
    file: 'functions/api/studio/_gencharge.ts',
    from: 'c.credits * (1 + (surPct / 100) * (spec.refs || 0)) * ((spec.cn || 0) > 0 ? 1 + cnPct / 100 : 1) * 100',
    to: 'c.credits * 100' },

  // ── 미디어 서빙 ──────────────────────────────────────────────────────────
  { g: '미디어', name: '승인 서류 차단을 푼다 (신분증이 공개 경로로 나간다)',
    file: 'functions/api/media/[[key]].ts',
    from: "if (/^sender-docs\\//i.test(key)) return cjson({ error: '파일 없음' }, 404)",
    to: "if (false) return cjson({ error: '파일 없음' }, 404)" },
  { g: '미디어', name: '영상 보관함 접두사 검사를 푼다 (버킷 전체가 열린다)',
    file: 'functions/api/videos/file/[[key]].ts',
    from: "if (!/^videos\\//.test(key) || key.includes('..')) return cjson({ error: '파일 없음' }, 404)",
    to: "if (false) return cjson({ error: '파일 없음' }, 404)" },
  { g: '미디어', name: '구간 요청에 문자열을 넘긴다 (영상 탐색이 깨진다)',
    file: 'functions/api/media/[[key]].ts',
    from: 'await R2.get(key, { range: request.headers })',
    to: 'await R2.get(key, { range: request.headers.get("Range") })' },
  { g: '미디어', name: '보관함 구간 요청도 문자열로 되돌린다',
    file: 'functions/api/videos/file/[[key]].ts',
    from: 'await R2.get(key, { range: request.headers })',
    to: 'await R2.get(key, { range: rangeHeader })' },
  { g: '미디어', name: '활성 콘텐츠(SVG/HTML) 를 인라인으로 내보낸다 (동일 출처 XSS)',
    file: 'functions/api/media/[[key]].ts',
    from: 'const active = isActiveType(ct)\n      // 활성 콘텐츠(SVG/HTML 등)는 타입을 중화하고 강제 다운로드 + 스크립트 차단 CSP\n      if (active) ct = \'application/octet-stream\'',
    to: 'const active = false' },

  // ── 신청 접수 ────────────────────────────────────────────────────────────
  { g: '신청', name: '신청 저장 실패를 다시 성공으로 답한다',
    file: 'functions/api/funnel/apply.ts', from: '  if (!saved) {', to: '  if (false) {' },
  { g: '신청', name: '임베드 폼 저장 실패를 다시 성공으로 답한다',
    file: 'functions/api/landing/form-submit.ts', from: '      if (!saved) {', to: '      if (false) {' },
  { g: '신청', name: '중복 제출 차단을 푼다 (유료 문자가 두 번 나간다)',
    file: 'functions/api/funnel/apply.ts',
    from: 'if (phone && !(await rateLimitOk(db, `apply:${page.id}:${phone}`, PHONE_LIMIT, WINDOW_MIN)))',
    to: 'if (false)' },
  { g: '신청', name: '초안·중지된 랜딩페이지도 접수한다',
    file: 'functions/api/funnel/apply.ts',
    from: '"SELECT id, group_id, title FROM funnel_landing_pages WHERE slug = ? AND (status IS NULL OR status = \'\' OR status = \'active\')",',
    to: '"SELECT id, group_id, title FROM funnel_landing_pages WHERE slug = ?",' },

  // ── 방문자 알림 ──────────────────────────────────────────────────────────
  { g: '알림', name: '방문자 id 없는 기록을 다시 받는다 (집계가 어긋난다)',
    file: 'functions/api/public-notices.ts',
    from: "if (!visitor) return json({ ok: false, error: '방문자 식별 불가' }, 200)",
    to: "if (false) return json({ ok: false, error: '방문자 식별 불가' }, 200)" },
  { g: '알림', name: '강력 알림 플래그를 항상 꺼서 내보낸다',
    file: 'functions/api/public-notices.ts',
    from: 'strong: !!Number(c.strong || 0),', to: 'strong: false,' },
  { g: '알림', name: '집행 종료 시각을 알려 주지 않는다 (끝난 광고가 남는다)',
    file: 'functions/api/public-notices.ts',
    from: "endAt: c.end_at || '',", to: "endAt: ''," },
  { g: '알림', name: '보지 않기 일수를 항상 3일로 고정한다 (관리자 설정 무시)',
    file: 'functions/api/public-notices.ts',
    from: 'snoozeDays: Math.max(1, Math.min(30, Number(c.snooze_days) || 3)),', to: 'snoozeDays: 3,' },
  { g: '알림', name: '다른 출처의 기록 요청을 허용한다 (CSRF)',
    file: 'functions/api/public-notices.ts',
    from: "if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)",
    to: "if (false) return json({ ok: false, error: '잘못된 요청' }, 403)" },
  { g: '알림', name: '이벤트 멱등 기록을 일반 INSERT 로 바꾼다 (폴링마다 노출이 쌓인다)',
    file: 'functions/api/_notices.ts',
    from: '`INSERT OR IGNORE INTO notice_visitor_events', to: '`INSERT INTO notice_visitor_events' },
  { g: '알림', name: '스누즈를 무시하고 계속 노출한다',
    file: 'functions/api/_notices.ts',
    from: 'export async function recordSnooze(db: D1Database, campaignId: string, visitor: string, days = 3) {\n  if (!campaignId || !visitor) return',
    to: 'export async function recordSnooze(db: D1Database, campaignId: string, visitor: string, days = 3) {\n  if (true) return' },
  // ── 인증·권한 ────────────────────────────────────────────────────────────
  { g: '인증', name: '정지된 회원의 세션을 계속 살려 둔다',
    file: 'functions/api/_utils.ts',
    from: "AND (u.status IS NULL OR u.status != 'suspended')", to: '' },
  { g: '인증', name: '만료된 세션도 통과시킨다',
    file: 'functions/api/_utils.ts',
    from: 'WHERE s.token = ? AND s.expires_at > ?', to: 'WHERE s.token = ?' },
  { g: '인증', name: '관리자 권한 검사를 푼다 (아무 회원이나 관리자 API)',
    file: 'functions/api/_utils.ts',
    from: "if (me.email !== ADMIN_EMAIL && me.role !== 'admin')", to: 'if (false)' },
  { g: '인증', name: '빈 비밀번호 해시를 일치로 본다',
    file: 'functions/api/_utils.ts',
    from: "if (typeof stored !== 'string' || !stored) return false", to: "if (typeof stored !== 'string' || !stored) return true" },
  { g: '인증', name: '비밀번호 비교를 앞부분만 본다',
    file: 'functions/api/_utils.ts',
    from: 'return timingSafeEqual(check, stored)', to: 'return check.slice(0, 8) === stored.slice(0, 8)' },
  { g: '인증', name: '다른 도메인 요청을 같은 출처로 본다 (CSRF 전반)',
    file: 'functions/api/_utils.ts',
    from: 'const src = origin || referer', to: 'const src = null' },
  { g: '인증', name: '비밀번호 변경 뒤 다른 기기 세션을 남겨 둔다',
    file: 'functions/api/account/password.ts',
    from: "await db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').bind(me.id, cur).run().catch(() => {})",
    to: '' },
  { g: '인증', name: '재설정 시도 횟수를 검사 뒤에 올린다 (병렬로 무제한)',
    file: 'functions/api/account/forgot-password.ts',
    from: "const inc: any = await db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE email = ? AND attempts < ?')\n      .bind(email, MAX_CODE_ATTEMPTS).run().catch(() => null)",
    to: "const inc: any = await db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE email = ?')\n      .bind(email).run().catch(() => null)" },
  { g: '인증', name: '재설정 뒤 전체 세션 무효화를 뺀다',
    file: 'functions/api/account/forgot-password.ts',
    from: "await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run().catch(() => {}) // 보안상 전체 세션 무효화",
    to: '' },

  // ── 소유권 ───────────────────────────────────────────────────────────────
  { g: '소유권', name: '퍼널 그룹 주인 확인을 통과시킨다',
    file: 'functions/api/funnel/_own.ts',
    from: "const r: any = await db.prepare('SELECT 1 AS ok FROM funnel_groups WHERE id = ? AND user_id = ?')\n    .bind(groupId, me.id).first().catch(() => null)\n  return !!r",
    to: 'return true' },
  { g: '소유권', name: '랜딩페이지 주인 확인을 통과시킨다',
    file: 'functions/api/funnel/_own.ts',
    from: '  ).bind(pageId, me.id).first().catch(() => null)\n  return !!r', to: '  ).bind(pageId, me.id).first().catch(() => null)\n  return true' },
  { g: '소유권', name: '신청자 일부만 내 것이어도 통과시킨다',
    file: 'functions/api/funnel/_own.ts',
    from: 'return Number(r?.n || 0) === ids.length', to: 'return Number(r?.n || 0) > 0' },
]

const filter = process.argv[2] || ''
const list = filter ? MUTATIONS.filter((m) => (m.g + ' ' + m.name).includes(filter)) : MUTATIONS
if (!list.length) { console.error(`"${filter}" 에 걸리는 항목이 없다.`); process.exit(2) }

const clean = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
if (clean) { console.error('작업 트리가 깨끗하지 않다. 커밋하거나 되돌린 뒤 돌려라.\n' + clean); process.exit(2) }

let survived = 0, skipped = 0
const results = []
let group = ''

for (const m of list) {
  if (m.g !== group) { group = m.g; console.log(`\n── ${group} ──`) }
  const src = fs.readFileSync(m.file, 'utf8')
  if (!src.includes(m.from)) {
    skipped++
    results.push({ ...m, verdict: 'SKIP' })
    console.log(`  건너뜀 ⚠  ${m.name}   (대상 코드를 찾지 못함 — 돌연변이 정의가 낡았다)`)
    continue
  }
  fs.writeFileSync(m.file, src.replace(m.from, m.to))
  let caught = false, by = ''
  try {
    execSync('npm test', { stdio: 'pipe', encoding: 'utf8', timeout: 900_000 })
  } catch (e) {
    caught = true
    const out = String(e.stdout || '') + String(e.stderr || '')
    by = (out.split('\n').filter((l) => /FAIL/.test(l))[0] || '').trim().slice(0, 90)
  }
  execSync(`git checkout -- "${m.file}"`)
  if (caught) {
    console.log(`  잡힘      ${m.name}\n              └ ${by}`)
    results.push({ ...m, verdict: 'CAUGHT', note: by })
  } else {
    survived++
    console.log(`  살아남음 ⚠  ${m.name}`)
    results.push({ ...m, verdict: 'SURVIVED' })
  }
}

console.log('\n──────────────────────────────')
console.log(`돌연변이 ${list.length}건 · 잡힘 ${results.filter((r) => r.verdict === 'CAUGHT').length} · 살아남음 ${survived} · 건너뜀 ${skipped}`)
if (survived) {
  console.log('\n살아남은 것 = 테스트가 보고 있지 않은 자리:')
  for (const r of results.filter((x) => x.verdict === 'SURVIVED')) console.log(`  · [${r.g}] ${r.name}\n      ${r.file}`)
}
process.exit(survived || skipped ? 1 : 0)
