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
  // ── 문자 발송 (건당 유료) ────────────────────────────────────────────────
  { g: '문자', name: '알리고 묶음 상한 500을 넘긴다 (규격 초과 → 통째 실패)',
    file: 'functions/api/_aligo.ts', from: 'const CHUNK = 500', to: 'const CHUNK = 5000' },
  { g: '문자', name: '잘못된 번호를 걸러내지 않는다 (쓰레기 번호에 요금이 나간다)',
    file: 'functions/api/_aligo.ts',
    from: '.filter((i) => i.to.length >= 10 && i.message.trim())', to: '' },
  { g: '문자', name: '짧은 문자도 LMS 로 보낸다 (요금이 더 나간다)',
    file: 'functions/api/_aligo.ts',
    from: "const msgType = opts.msgType || (longest > 90 ? 'LMS' : 'SMS')", to: "const msgType = opts.msgType || 'LMS'" },
  { g: '문자', name: '긴 문자를 SMS 로 보낸다 (잘려서 나간다)',
    file: 'functions/api/_aligo.ts',
    from: 'const longest = list.reduce((a, c) => Math.max(a, byteLen(c.message)), 0)', to: 'const longest = 0' },
  { g: '문자', name: '제공사가 실패로 답해도 성공으로 집계한다',
    file: 'functions/api/_aligo.ts',
    from: '      errorCnt += part.length\n      lastReason = r.data?.message || `알리고 응답코드 ${r.data?.result_code ?? r.status}`',
    to: '      successCnt += part.length' },
  { g: '문자', name: '발신번호가 없어도 발송을 시도한다',
    file: 'functions/api/_aligo.ts',
    from: "if (!sender) return { sent: false, successCnt: 0, errorCnt: items.length, reason: '발신번호가 없습니다. 발신번호를 등록·승인 받아 선택해 주세요.' }",
    to: '' },
  // ── 결제 (실입금) ────────────────────────────────────────────────────────
  { g: '결제', name: '남의 주문도 승인할 수 있게 한다 (남의 결제로 내 크레딧)',
    file: 'functions/api/payments/confirm.ts',
    from: "if (order.user_id !== me.id) return json({ ok: false, error: '본인 주문이 아닙니다.' }, 403)", to: '' },
  { g: '결제', name: '결제 금액 대조를 뺀다 (1원 내고 10만 크레딧)',
    file: 'functions/api/payments/confirm.ts',
    from: "if (order.amount !== amount) return json({ ok: false, error: '결제 금액이 일치하지 않습니다.' }, 400)", to: '' },
  { g: '결제', name: '지급 선점(조건부 UPDATE)을 푼다 (동시 요청에 두 배 지급)',
    file: 'functions/api/payments/confirm.ts',
    from: '  if (!claim || Number(claim.meta?.changes || 0) === 0)\n    return json({ ok: false, error: \'이미 처리된 주문입니다.\' }, 409)',
    to: '' },
  { g: '결제', name: '이미 결제된 주문을 다시 받는다',
    file: 'functions/api/payments/confirm.ts',
    from: "if (order.status === 'paid') return json({ ok: false, error: '이미 처리된 주문입니다.' }, 409)", to: '' },
  { g: '결제', name: '클라이언트가 보낸 금액만큼 크레딧을 준다 (주문 대신)',
    file: 'functions/api/payments/confirm.ts',
    from: "await applyBalance(db, me.id, 'credit', order.credits,", to: "await applyBalance(db, me.id, 'credit', amount," },
  { g: '결제', name: '승인 실패인데도 크레딧을 지급한다',
    file: 'functions/api/payments/confirm.ts', from: '  if (!conf.ok) {', to: '  if (false) {' },
  { g: '결제', name: '주문 금액을 크레딧 단가와 무관하게 만든다',
    file: 'functions/api/payments/prepare.ts',
    from: 'const amount = Math.round(credits * rate)', to: 'const amount = credits' },
  { g: '결제', name: '충전 수량 상한을 없앤다',
    file: 'functions/api/payments/prepare.ts',
    from: 'if (!credits || credits <= 0 || credits > 100000)', to: 'if (false)' },
  // ── API 키 (외부 대여) ───────────────────────────────────────────────────
  { g: 'API', name: '정지·해지된 키도 통과시킨다',
    file: 'functions/api/_apikeys.ts',
    from: "if (!key || key.status !== 'active') return null", to: 'if (!key) return null' },
  { g: 'API', name: '정지된 회원의 키도 통과시킨다',
    file: 'functions/api/_apikeys.ts',
    from: '"SELECT * FROM users WHERE id = ? AND (status IS NULL OR status != \'suspended\') LIMIT 1",',
    to: '"SELECT * FROM users WHERE id = ? LIMIT 1",' },
  { g: 'API', name: '접두사 검사를 빼서 아무 문자열이나 키로 본다',
    file: 'functions/api/_apikeys.ts',
    from: 'if (!raw || !raw.startsWith(API_KEY_PREFIX)) return null', to: 'if (!raw) return null' },
  { g: 'API', name: '영상 플랜이 없어도 API 를 쓸 수 있게 한다',
    file: 'functions/api/_apikeys.ts',
    from: 'export function hasVideoApiAccess(user: any): boolean {\n  if (!user) return false',
    to: 'export function hasVideoApiAccess(user: any): boolean {\n  if (true) return true\n  if (!user) return false' },
  { g: 'API', name: '만료된 영상 플랜도 유효로 본다',
    file: 'functions/api/_apikeys.ts',
    from: "if (vplan && vplan !== '없음' && (!vuntil || String(vuntil) > now)) return true",
    to: "if (vplan && vplan !== '없음') return true" },
  { g: 'API', name: '분당 생성 한도를 없앤다',
    file: 'functions/api/_apikeys.ts',
    from: 'if (Number(r?.m || 0) > API_RATE.postMin) return { ok: false, retryAfter: 60,', to: 'if (false) return { ok: false, retryAfter: 60,' },
  { g: 'API', name: '동시 진행 제한을 없앤다',
    file: 'functions/api/_apikeys.ts',
    from: 'if (Number(p?.n || 0) >= API_RATE.concurrent) return { ok: false, retryAfter: 15,', to: 'if (false) return { ok: false, retryAfter: 15,' },
  // ── 미들웨어 (바깥문) ────────────────────────────────────────────────────
  { g: '미들웨어', name: '차단된 IP 를 그대로 들여보낸다',
    file: 'functions/_middleware.ts',
    from: 'if (await isBlocked(db, ip)) {', to: 'if (false) {' },
  { g: '미들웨어', name: '관리자 콘솔 접근 잠금을 푼다',
    file: 'functions/_middleware.ts',
    from: 'if (!(await isAdminAccessAllowed(db, ip, devTok))) {', to: 'if (false) {' },
  { g: '미들웨어', name: '크론 토큰을 길이만 보고 통과시킨다',
    file: 'functions/_middleware.ts',
    from: 'if (expected && got.length === expected.length && ctEqStr(got, expected)) return next()',
    to: 'if (expected && got.length === expected.length) return next()' },
  { g: '미들웨어', name: '크론 토큰이 없어도 보안 검사를 건너뛴다',
    file: 'functions/_middleware.ts',
    from: 'if (CRON_PATH_RE.test(path)) {\n    const expected = String((env as any).CRON_TOKEN || \'\')',
    to: 'if (CRON_PATH_RE.test(path)) {\n    return next()\n    const expected = String((env as any).CRON_TOKEN || \'\')' },
  { g: '미들웨어', name: '화이트리스트 모드를 무시한다',
    file: 'functions/_middleware.ts',
    from: 'if (!(await isWhitelisted(db, ip))) {', to: 'if (false) {' },
  { g: '미들웨어', name: '자동 차단 임계값을 없앤다 (스크래핑 무제한)',
    file: 'functions/_middleware.ts',
    from: 'if (recent > ABUSE_THRESHOLD) {', to: 'if (false) {' },
  // ── 생성 게이트 (제공사 호출 전 마지막 문) ───────────────────────────────
  { g: '게이트', name: '잔액 부족을 통과시킨다 (제공사 비용이 우리 몫이 된다)',
    file: 'functions/api/generate.js',
    from: 'if (need > 0 && Number(me.credits) < need) {', to: 'if (false) {' },
  { g: '게이트', name: '과금 토큰을 발급하지 않는다 (생성은 되고 청구는 안 된다)',
    file: 'functions/api/generate.js',
    from: '      context.__chargeToken = await issueGenCharge(db, me.id, {', to: '      context.__chargeToken = null && await issueGenCharge(db, me.id, {' },
  { g: '게이트', name: '레퍼런스·CN 가산을 게이트에서 뺀다 (통과시켜 놓고 더 크게 빠진다)',
    file: 'functions/api/generate.js',
    from: 'const need = Math.round(cc.credits * refMult * cnMult * 100) / 100', to: 'const need = Math.round(cc.credits * 100) / 100' },
  { g: '게이트', name: '생성 요청 한도를 게이트에서 뺀다',
    file: 'functions/api/generate.js',
    from: 'if (!rl.ok) return json({ error: rl.reason || "요청이 너무 많습니다. 잠시 후 다시 시도하세요.", retryAfter: rl.retryAfter || 30 }, 429)',
    to: 'if (false) return json({ error: "", retryAfter: 30 }, 429)' },
  { g: '게이트', name: '15초 버스트 가드를 없앤다',
    file: 'functions/api/generate.js',
    from: 'if (Number(rl.burst || 0) > 5) return json({ error: "짧은 시간에 너무 많은 생성을 요청했습니다. 잠시 후 다시 시도하세요.", retryAfter: 15 }, 429)',
    to: 'if (false) return json({ error: "", retryAfter: 15 }, 429)' },
  { g: '게이트', name: '게이트 계산을 신고값 그대로 쓴다 (짧게 신고하면 덜 낸다)',
    file: 'functions/api/generate.js',
    from: 'let gUnits = isImg ? 1 : effectiveUnits({ ...pbody, model: mdl }, env)', to: 'let gUnits = isImg ? 1 : Number(pbody.duration || 8)' },
  // ── 관리자 고위험 조작 ───────────────────────────────────────────────────
  { g: '관리', name: '크레딧 전체 회수에서 확인 문자열을 없앤다 (실수 한 번에 전원 0)',
    file: 'functions/api/admin/credits-recall.ts',
    from: "if (String(b.confirm || '') !== 'RECALL')", to: 'if (false)' },
  { g: '관리', name: '크레딧 전체 회수를 아무나 하게 한다',
    file: 'functions/api/admin/credits-recall.ts',
    from: '  const guard = await requireAdminUser(request, db)\n  if (guard.error) return guard.error\n  const admin = { id: guard.me.id, email: guard.me.email }',
    to: '  const guard = await requireAdminUser(request, db)\n  const admin = { id: guard.me?.id, email: guard.me?.email }' },
  { g: '관리', name: '관리자 제외 조건을 무시하고 관리자 크레딧까지 회수한다',
    file: 'functions/api/admin/credits-recall.ts',
    from: "const where = includeAdmin ? 'credits > 0' : \"credits > 0 AND role != 'admin'\"",
    to: "const where = 'credits > 0'" },
  { g: '관리', name: '회수 기록(감사 로그)을 남기지 않는다',
    file: 'functions/api/admin/credits-recall.ts',
    from: "  await logAudit(db, admin, 'credits_recall_all',", to: "  if (false) await logAudit(db, admin, 'credits_recall_all'," },
  // ── 쿠폰 (실결제 금액을 정한다) ─────────────────────────────────────────
  { g: '쿠폰', name: '전체 사용 한도를 무시한다 (1회 쿠폰이 무한이 된다)',
    file: 'functions/api/_coupons.ts',
    from: 'if (Number(c.max_uses) > 0 && Number(c.used_count) >= Number(c.max_uses)) return fail(', to: 'if (false) return fail(' },
  { g: '쿠폰', name: '1인 사용 한도를 무시한다',
    file: 'functions/api/_coupons.ts',
    from: 'if (Number(r?.n) >= Number(c.per_user_limit)) return fail(', to: 'if (false) return fail(' },
  { g: '쿠폰', name: '만료된 쿠폰을 받아 준다',
    file: 'functions/api/_coupons.ts',
    from: "if (c.expires_at && new Date(c.expires_at).getTime() < now) return fail('사용 기간이 만료된 쿠폰입니다.')", to: '' },
  { g: '쿠폰', name: '비활성 쿠폰을 받아 준다',
    file: 'functions/api/_coupons.ts',
    from: "if (!Number(c.active)) return fail('사용할 수 없는(비활성) 쿠폰입니다.')", to: '' },
  { g: '쿠폰', name: '정액 할인이 원금을 넘게 한다 (환불이 발생한다)',
    file: 'functions/api/_coupons.ts',
    from: 'discount = Math.min(Number(c.discount_value) || 0, original)', to: 'discount = Number(c.discount_value) || 0' },
  { g: '쿠폰', name: '할인율 상한을 없앤다 (100% 넘는 할인)',
    file: 'functions/api/_coupons.ts',
    from: 'const pct = Math.max(0, Math.min(100, Number(c.discount_value) || 0))', to: 'const pct = Number(c.discount_value) || 0' },
  { g: '쿠폰', name: '사용 확정의 조건부 UPDATE 를 푼다 (동시에 넣으면 다 통과)',
    file: 'functions/api/_coupons.ts',
    from: 'WHERE id = ? AND (max_uses IS NULL OR max_uses <= 0 OR COALESCE(used_count, 0) < max_uses)`,',
    to: 'WHERE id = ?`,' },
  { g: '쿠폰', name: '1인 한도에 걸렸을 때 전체 사용횟수를 되돌리지 않는다',
    file: 'functions/api/_coupons.ts',
    from: "      await db.prepare('UPDATE coupons SET used_count = COALESCE(used_count, 0) - 1 WHERE id = ? AND COALESCE(used_count, 0) > 0')\n        .bind(c.id).run().catch(() => {})",
    to: '' },
  { g: '쿠폰', name: '적용 대상(플랜) 제한을 무시한다',
    file: 'functions/api/_coupons.ts',
    from: 'if (c.scope_plan && c.scope_plan !== opts.plan) return fail(', to: 'if (false) return fail(' },
  // ── CRM 집행 (포인트로 문자를 산다) ─────────────────────────────────────
  { g: 'CRM', name: '실패한 건의 포인트를 환불하지 않는다',
    file: 'functions/api/crm/_dispatch.ts',
    from: 'if (failed > 0) await refundPoints(db, c.user_id, unit * failed,', to: 'if (false) await refundPoints(db, c.user_id, unit * failed,' },
  { g: 'CRM', name: '포인트를 먼저 빼지 않고 발송한다 (무료 발송)',
    file: 'functions/api/crm/_dispatch.ts',
    from: '  if (!spend.ok) {', to: '  if (false) {' },
  { g: 'CRM', name: '이미 발송 중인 집행을 또 보낸다 (중복 발송·이중 차감)',
    file: 'functions/api/crm/_dispatch.ts',
    from: "if (!claim || Number(claim.meta?.changes || 0) === 0) return { ok: false, error: '이미 발송 처리 중입니다.' }", to: '' },
  { g: 'CRM', name: '발신번호가 없어도 발송하고 환불하지 않는다',
    file: 'functions/api/crm/_dispatch.ts',
    from: '    if (!from) {', to: '    if (false) {' },
  { g: 'CRM', name: '성공 건수를 수신자 수로 덮어쓴다 (실패를 성공으로 집계)',
    file: 'functions/api/crm/_dispatch.ts',
    from: 'sent = Math.max(0, Math.min(targets.length, r.successCnt))', to: 'sent = targets.length' },
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
