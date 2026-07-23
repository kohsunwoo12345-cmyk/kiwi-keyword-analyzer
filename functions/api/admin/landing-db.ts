// 관리자: 각 회원이 랜딩페이지로 수집한 DB(신청자) + 랜딩페이지 목록 조회 · 엑셀/CSV 다운로드
//  GET /api/admin/landing-db                         → 회원별 랜딩 요약(페이지수·신청수)
//  GET /api/admin/landing-db?userId=<id>             → 해당 회원의 랜딩페이지 목록 + 신청 DB
//  GET /api/admin/landing-db?userId=<id>&format=xlsx → 신청 DB 엑셀 다운로드 (userId 생략 시 전체)
import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { buildXlsx, sheetToCsv, type Sheet } from './_xlsx'

const SUB_COLS: [string, string][] = [
  ['user_name', '회원'], ['user_email', '회원이메일'], ['page_title', '랜딩페이지'], ['page_slug', 'slug'],
  ['name', '신청자명'], ['phone', '연락처'], ['email', '이메일'], ['extra', '추가정보'], ['created_at', '신청일시'],
]

function kst(iso: any) { try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) } catch { return String(iso || '') } }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if ('error' in guard) return guard.error

  const url = new URL(request.url)
  const userId = String(url.searchParams.get('userId') || '').trim()
  const format = String(url.searchParams.get('format') || 'json')
  const q = String(url.searchParams.get('q') || '').trim().toLowerCase()

  // ── 엑셀/CSV 다운로드 ─────────────────────────────────────────────
  if (format === 'xlsx' || format === 'csv') {
    const where = userId ? 'lp.user_id = ?' : '1=1'
    const binds: any[] = userId ? [userId] : []
    const rows = ((await db.prepare(
      `SELECT fs.name, fs.phone, fs.email, fs.additional_data, fs.created_at,
              lp.title AS page_title, lp.slug AS page_slug, u.name AS user_name, u.email AS user_email
         FROM form_submissions fs
         JOIN landing_pages lp ON fs.landing_page_id = lp.id
         LEFT JOIN users u ON u.id = lp.user_id
        WHERE ${where} ORDER BY fs.created_at DESC LIMIT 100000`,
    ).bind(...binds).all()).results || []) as any[]
    const dataRows = rows.map((r) => {
      let extra = ''
      try { const o = JSON.parse(r.additional_data || '{}'); extra = Object.entries(o).filter(([k]) => !['grade', 'message'].includes(k)).map(([k, v]) => `${k}:${v}`).join(' / ') } catch {}
      const map: Record<string, any> = { user_name: r.user_name || '', user_email: r.user_email || '', page_title: r.page_title || '', page_slug: r.page_slug || '', name: r.name || '', phone: r.phone || '', email: r.email || '', extra, created_at: kst(r.created_at) }
      return SUB_COLS.map(([k]) => map[k] ?? '')
    })
    const sheet: Sheet = { name: '랜딩DB', headers: SUB_COLS.map(([, h]) => h), rows: dataRows }
    const fname = `landing_db_${userId || 'all'}_${new Date().toISOString().slice(0, 10)}`
    if (format === 'csv') {
      return new Response('﻿' + sheetToCsv(sheet), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${fname}.csv"` } })
    }
    const buf = buildXlsx([sheet])
    return new Response(buf, { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': `attachment; filename="${fname}.xlsx"` } })
  }

  // ── 특정 회원: 랜딩페이지 목록 + 신청 DB ──────────────────────────
  if (userId) {
    const pages = ((await db.prepare(
      `SELECT lp.id, lp.title, lp.slug, lp.status, lp.view_count, lp.created_at,
              (SELECT COUNT(*) FROM form_submissions fs WHERE fs.landing_page_id = lp.id) AS submission_count
         FROM landing_pages lp WHERE lp.user_id = ? ORDER BY lp.created_at DESC`,
    ).bind(userId).all()).results || []) as any[]
    const subs = ((await db.prepare(
      `SELECT fs.id, fs.name, fs.phone, fs.email, fs.additional_data, fs.created_at, lp.title AS page_title, lp.slug AS page_slug
         FROM form_submissions fs JOIN landing_pages lp ON fs.landing_page_id = lp.id
        WHERE lp.user_id = ? ORDER BY fs.created_at DESC LIMIT 5000`,
    ).bind(userId).all()).results || []) as any[]
    const submissions = subs.map((r) => { let extra: any = {}; try { extra = JSON.parse(r.additional_data || '{}') } catch {}; return { id: r.id, name: r.name, phone: r.phone, email: r.email, extra, page_title: r.page_title, page_slug: r.page_slug, created_at: r.created_at } })
    const u: any = await db.prepare('SELECT name, email FROM users WHERE id = ?').bind(userId).first().catch(() => null)
    return json({ ok: true, user: { id: userId, name: u?.name || '', email: u?.email || '' }, pages, submissions })
  }

  // ── 회원별 요약 ───────────────────────────────────────────────────
  const users = ((await db.prepare(
    `SELECT u.id, u.name, u.email,
            COUNT(DISTINCT lp.id) AS page_count,
            (SELECT COUNT(*) FROM form_submissions fs JOIN landing_pages lp2 ON fs.landing_page_id = lp2.id WHERE lp2.user_id = u.id) AS submission_count,
            MAX(lp.created_at) AS last_page_at
       FROM landing_pages lp JOIN users u ON u.id = lp.user_id
      GROUP BY u.id ORDER BY submission_count DESC, page_count DESC LIMIT 1000`,
  ).all()).results || []) as any[]
  const filtered = q ? users.filter((u) => String(u.name || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q)) : users
  const stats = {
    totalPages: Number((await db.prepare('SELECT COUNT(*) AS c FROM landing_pages').first().catch(() => null) as any)?.c) || 0,
    totalSubmissions: Number((await db.prepare('SELECT COUNT(*) AS c FROM form_submissions').first().catch(() => null) as any)?.c) || 0,
    totalUsers: users.length,
  }
  return json({ ok: true, users: filtered, stats })
}
