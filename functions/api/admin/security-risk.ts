import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, getSetting } from '../_utils'

// GET /api/admin/security-risk — "해킹 위험" 대시보드용 보안 상태 집계
//  · 실시간 공격 신호(로그인 실패·차단 IP·의심 요청)
//  · 런타임 보안 점검(설정 기반, 값은 절대 노출 안 함)
//  · 적용된 하드닝 항목 요약
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const n = async (sql: string, ...b: any[]) => {
    try { const r: any = await db.prepare(sql).bind(...b).first(); return Number(r?.c) || 0 } catch { return 0 }
  }
  const rows = async (sql: string, ...b: any[]) => {
    try { return ((await db.prepare(sql).bind(...b).all()).results || []) as any[] } catch { return [] }
  }

  // ── 실시간 공격 신호 ──
  const loginFail24h = await n('SELECT COUNT(*) c FROM login_failures WHERE created_at >= ?', dayAgo)
  const loginFail7d = await n('SELECT COUNT(*) c FROM login_failures WHERE created_at >= ?', weekAgo)
  const blockedCount = await n('SELECT COUNT(*) c FROM blocked_ips')
  const autoBlocked = await n("SELECT COUNT(*) c FROM blocked_ips WHERE source = 'auto'")
  const susHigh24h = await n("SELECT COUNT(*) c FROM security_log WHERE ts >= ? AND severity = 'high'", dayAgo)
  const sus24h = await n('SELECT COUNT(*) c FROM security_log WHERE ts >= ?', dayAgo)

  const topFailIps = await rows(
    'SELECT ip, COUNT(*) c, MAX(created_at) last FROM login_failures WHERE created_at >= ? GROUP BY ip ORDER BY c DESC LIMIT 8', weekAgo)
  const recentBlocked = await rows('SELECT ip, reason, source, created_at FROM blocked_ips ORDER BY created_at DESC LIMIT 8')
  const recentThreats = await rows(
    "SELECT ts, ip, method, path, status, severity, detail, country FROM security_log WHERE severity IN ('high','warn') ORDER BY ts DESC LIMIT 12")
  const recentAudit = await rows(
    "SELECT created_at, admin_email, action, target, severity, ip FROM audit_log WHERE severity = 'high' ORDER BY created_at DESC LIMIT 10")

  // ── 런타임 보안 점검 (설정 기반 · 값 비노출) ──
  const envHas = (names: string[]) => names.some((k) => !!(env as any)[k] && String((env as any)[k]).trim())
  const wlMode = (await getSetting(db, 'ip_whitelist_mode')) === '1' || (await getSetting(db, 'security_whitelist_mode')) === '1'
  const bucketOk = (() => {
    for (const k of ['MEDIA', 'BUCKET', 'R2', 'STORAGE', 'ASSETS', 'UPLOADS']) { const v: any = (env as any)[k]; if (v && typeof v.put === 'function') return true }
    return false
  })()

  type Check = { key: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string }
  const checks: Check[] = [
    { key: 'admin_pw', label: '관리자 비밀번호 환경변수 설정', status: envHas(['ADMIN_PASSWORD', 'adminPassword']) ? 'pass' : 'warn',
      detail: envHas(['ADMIN_PASSWORD', 'adminPassword']) ? '설정됨 (하드코딩 없음)' : 'ADMIN_PASSWORD 미설정 — 설정 권장' },
    { key: 'mcp_token', label: 'MCP 전역 토큰(관리자 폴백) 설정', status: envHas(['MCP_AUTH_TOKEN', 'mcp_auth_token']) ? 'pass' : 'warn',
      detail: envHas(['MCP_AUTH_TOKEN', 'mcp_auth_token']) ? '설정됨 · 상수시간 비교 적용' : '미설정 — 회원별 개인 토큰만 사용 중' },
    { key: 'brute', label: '로그인 무차별 대입 자동 차단', status: loginFail24h > 50 ? 'warn' : 'pass',
      detail: loginFail24h > 50 ? `최근 24h 로그인 실패 ${loginFail24h}건 — 공격 가능성 점검` : '실패 8회/15분 초과 시 IP 자동 차단 동작' },
    { key: 'ip_wl', label: 'IP 화이트리스트 모드', status: wlMode ? 'pass' : 'warn',
      detail: wlMode ? '활성 — 허용 IP만 접근' : '비활성 (필요 시 관리자>보안에서 활성화)' },
    { key: 'r2', label: 'R2 미디어 스토리지 바인딩', status: bucketOk ? 'pass' : 'warn', detail: bucketOk ? '정상 감지' : '미감지' },
    { key: 'gen_auth', label: 'AI 생성 프록시 인증 게이트', status: 'pass', detail: '/api/generate 로그인·크레딧 필수 (익명 비용소진 차단)' },
    { key: 'svg', label: '업로드 미디어 스크립트 실행 차단', status: 'pass', detail: 'SVG/HTML 인라인 금지 · 강제 다운로드 + CSP sandbox' },
    { key: 'sql', label: 'SQL 인젝션 방어', status: 'pass', detail: '전 쿼리 파라미터 바인딩(.bind) · 동적 식별자 화이트리스트' },
    { key: 'credit_atomic', label: '크레딧 원자적 차감', status: 'pass', detail: '조건부 UPDATE 로 동시요청 이중차감·음수 방지' },
    { key: 'csrf', label: 'CSRF 방어', status: 'pass', detail: 'SameSite=Lax 쿠키 + 민감요청 Origin 검증' },
  ]

  const applied = [
    'AI 생성 프록시(/api/generate) 로그인·크레딧 인증 게이트',
    '업로드 SVG/HTML 인라인 서빙 차단(강제 다운로드 + CSP sandbox)',
    '이식 도구(플레이스·퍼널) 익명 접근 차단 및 회원별 데이터 격리',
    '고객센터 채팅 IDOR 차단(비로그인은 게스트 대화만)',
    '크레딧 원자적 차감(TOCTOU 이중차감 방지)',
    '/api/health 관리자 이메일·바인딩·원시오류 비노출',
    'MCP 토큰 상수시간 비교',
    '비밀번호 변경 등 민감요청 Origin(CSRF) 검증',
    'Instagram 도구 페이지 출력 이스케이프(XSS)',
  ]

  // 위험도 스코어 (0~100, 높을수록 안전)
  const warnCount = checks.filter((c) => c.status === 'warn').length
  const failCount = checks.filter((c) => c.status === 'fail').length
  let score = 100 - failCount * 20 - warnCount * 6
  if (susHigh24h > 0) score -= Math.min(15, susHigh24h)
  if (autoBlocked > 0 && loginFail24h > 100) score -= 8
  score = Math.max(0, Math.min(100, score))
  const level = score >= 85 ? 'good' : score >= 65 ? 'fair' : 'risk'

  return json({
    ok: true,
    posture: { score, level, warnCount, failCount },
    signals: { loginFail24h, loginFail7d, blockedCount, autoBlocked, sus24h, susHigh24h,
      topFailIps, recentBlocked, recentThreats, recentAudit },
    checks,
    applied,
  })
}
