import {
  Env, json, ensureSchema, resolveDB, requireAdminUser, sameOriginOk, clientIp, logAudit,
  getSetting, setSetting, parseCookies, ensureAdminAclTable, isAdminAccessAllowed,
  newAdminDeviceToken, ADMIN_DEVICE_COOKIE,
} from '../_utils'

// 관리자 콘솔 접근 잠금 — 허용 IP/기기 관리 + 활성화 토글
//  GET  /api/admin/access-lock            → { enabled, currentIp, thisDeviceRegistered, ips[], devices[] }
//  POST { action:'enable'|'disable' }     → 잠금 켜기/끄기 (켤 때 현재 IP·기기 자동 등록해 잠금 방지)
//  POST { action:'add_ip', ip, label }    → 허용 IP 추가
//  POST { action:'remove_ip', value }     → 허용 IP 삭제
//  POST { action:'register_device', label } → 이 기기 등록(쿠키 발급)
//  POST { action:'remove_device', value } → 기기 등록 해제
//
//  ※ 이 엔드포인트는 미들웨어의 관리자 잠금 대상에서 제외되어(잠금 중에도 접근 가능),
//    로그인한 관리자가 언제든 잠금을 해제/복구할 수 있다(엔드포인트가 requireAdminUser 로 보호됨).

const uid = (p: string) => p + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
const COOKIE_MAXAGE = 60 * 60 * 24 * 365 // 1년
function deviceCookie(token: string): string {
  return `${ADMIN_DEVICE_COOKIE}=${token}; Path=/; Max-Age=${COOKIE_MAXAGE}; HttpOnly; Secure; SameSite=Lax`
}

async function loadLists(db: D1Database) {
  const rows = (await db.prepare('SELECT id, kind, value, label, created_at FROM admin_acl ORDER BY created_at DESC').all().catch(() => ({ results: [] }))).results as any[] || []
  return {
    ips: rows.filter((r) => r.kind === 'ip').map((r) => ({ id: r.id, value: r.value, label: r.label || '', createdAt: r.created_at })),
    devices: rows.filter((r) => r.kind === 'device').map((r) => ({ id: r.id, value: r.value, label: r.label || '', createdAt: r.created_at })),
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  await ensureAdminAclTable(db)

  const ip = clientIp(request)
  const devTok = parseCookies(request)[ADMIN_DEVICE_COOKIE] || ''
  const lists = await loadLists(db)
  const thisDeviceRegistered = !!devTok && lists.devices.some((d) => d.value === devTok)
  const currentIpAllowed = lists.ips.some((i) => i.value === ip)
  return json({
    ok: true,
    enabled: (await getSetting(db, 'admin_lock_enabled')) === 'on',
    currentIp: ip,
    currentIpAllowed,
    thisDeviceRegistered,
    ips: lists.ips,
    // 기기 토큰 원문은 노출하지 않고 라벨/시각만 (현재 기기 여부 표시용 isThis 포함)
    devices: lists.devices.map((d) => ({ id: d.id, label: d.label, createdAt: d.createdAt, isThis: d.value === devTok })),
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  await ensureAdminAclTable(db)
  const admin = { id: guard.me.id, email: guard.me.email }
  const ip = clientIp(request)
  const now = new Date().toISOString()
  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')

  async function addAcl(kind: 'ip' | 'device', value: string, label: string) {
    await db.prepare(
      `INSERT INTO admin_acl (id, kind, value, label, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(kind, value) DO UPDATE SET label = excluded.label`,
    ).bind(uid('acl_'), kind, value, label || null, now).run()
  }

  if (action === 'enable') {
    // 잠금 방지: 켜기 전에 현재 IP + 현재 기기를 자동 등록해 활성화 관리자가 반드시 허용되게 한다
    let setCookie = ''
    if (ip && ip !== 'unknown') await addAcl('ip', ip, '활성화한 IP(자동 등록)')
    let devTok = parseCookies(request)[ADMIN_DEVICE_COOKIE] || ''
    if (!devTok || devTok.length < 16) { devTok = newAdminDeviceToken(); setCookie = deviceCookie(devTok) }
    await addAcl('device', devTok, '활성화한 기기(자동 등록)')
    await setSetting(db, 'admin_lock_enabled', 'on')
    await logAudit(db, admin, 'admin_lock_enable', ip, '관리자 접근 잠금 활성화', 'warn', ip)
    return json({ ok: true, enabled: true, currentIp: ip }, 200, setCookie ? { 'Set-Cookie': setCookie } : {})
  }

  if (action === 'disable') {
    await setSetting(db, 'admin_lock_enabled', 'off')
    await logAudit(db, admin, 'admin_lock_disable', ip, '관리자 접근 잠금 해제', 'warn', ip)
    return json({ ok: true, enabled: false })
  }

  if (action === 'add_ip') {
    const raw = String(b.ip || '').trim().slice(0, 60)
    if (!raw) return json({ ok: false, error: 'IP 주소를 입력하세요.' }, 400)
    // 간단 검증: IPv4/IPv6 문자만 허용
    if (!/^[0-9a-fA-F:.]+$/.test(raw)) return json({ ok: false, error: 'IP 주소 형식이 올바르지 않습니다.' }, 400)
    await addAcl('ip', raw, String(b.label || '').trim().slice(0, 40))
    await logAudit(db, admin, 'admin_lock_add_ip', raw, String(b.label || ''), 'info', ip)
    return json({ ok: true })
  }

  if (action === 'remove_ip') {
    const value = String(b.value || '').trim()
    if (!value) return json({ ok: false, error: 'value 필요' }, 400)
    await db.prepare("DELETE FROM admin_acl WHERE kind='ip' AND value = ?").bind(value).run()
    await logAudit(db, admin, 'admin_lock_remove_ip', value, '', 'info', ip)
    return json({ ok: true })
  }

  if (action === 'register_device') {
    let devTok = parseCookies(request)[ADMIN_DEVICE_COOKIE] || ''
    let setCookie = ''
    if (!devTok || devTok.length < 16) { devTok = newAdminDeviceToken(); setCookie = deviceCookie(devTok) }
    await addAcl('device', devTok, String(b.label || '이 기기').trim().slice(0, 40))
    await logAudit(db, admin, 'admin_lock_register_device', '', String(b.label || ''), 'info', ip)
    return json({ ok: true, registered: true }, 200, setCookie ? { 'Set-Cookie': setCookie } : {})
  }

  if (action === 'remove_device') {
    // 기기는 id 로 삭제 (토큰 원문은 클라이언트에 노출하지 않음)
    const id = String(b.value || b.id || '').trim()
    if (!id) return json({ ok: false, error: 'id 필요' }, 400)
    await db.prepare("DELETE FROM admin_acl WHERE kind='device' AND id = ?").bind(id).run()
    await logAudit(db, admin, 'admin_lock_remove_device', id, '', 'info', ip)
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
