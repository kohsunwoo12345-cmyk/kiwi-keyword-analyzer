// 관리자: 회원별 · 랜딩페이지별 신청자(DB) 조회 · 다운로드
//
//  어떤 회원의 어떤 랜딩페이지에서 어떤 DB가 나왔는지를 한 화면에서 본다.
//  ⚠ 신청자는 두 곳에 나뉘어 쌓인다 —
//     빌더로 만든 일반 랜딩 → landing_pages / form_submissions
//     퍼널 랜딩            → funnel_landing_pages / funnel_applicants
//     한쪽만 보면 퍼널로 들어온 신청자가 통째로 안 보인다. 둘을 합쳐서 보여준다.
//
//  GET /api/admin/leads                        → 회원별 요약(페이지 수·신청 수·최근 신청)
//  GET /api/admin/leads?userId=<id>            → 그 회원의 랜딩페이지별 요약
//  GET /api/admin/leads?userId=<id>&slug=<s>   → 그 페이지의 신청자 목록
//  GET /api/admin/leads?...&format=csv|xlsx    → 같은 조건 그대로 다운로드
import { Env, json, ensureSchema, resolveDB, requireAdminUser, asText } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'
import { buildXlsx, sheetToCsv, type Sheet } from './_xlsx'

const kst = (iso: any) => { try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) } catch { return String(iso || '') } }

const LEAD_COLS: [string, string][] = [
  ['owner', '회원'], ['owner_email', '회원이메일'], ['source_label', '페이지종류'],
  ['page_title', '랜딩페이지'], ['page_slug', 'slug'],
  ['name', '신청자명'], ['phone', '연락처'], ['email', '이메일'], ['extra', '추가정보'], ['created_at', '신청일시'],
]

function parseExtra(raw: any): string {
  try {
    const o = JSON.parse(String(raw || '{}'))
    return Object.entries(o)
      .filter(([, v]) => v !== null && v !== '' && v !== undefined)
      .map(([k, v]) => `${k}:${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' / ')
      .slice(0, 500)
  } catch { return '' }
}

/** 두 출처의 신청자를 하나로 합쳐서 읽는다 */
async function loadLeads(db: D1Database, o: { userId?: string; slug?: string; limit?: number }) {
  const limit = Math.max(1, Math.min(100000, o.limit || 5000))
  const out: any[] = []

  // 1) 일반 랜딩
  {
    const w: string[] = []
    const b: any[] = []
    if (o.userId) { w.push('lp.user_id = ?'); b.push(o.userId) }
    if (o.slug) { w.push('lp.slug = ?'); b.push(o.slug) }
    const rows = ((await db.prepare(
      `SELECT fs.id, fs.name, fs.phone, fs.email, fs.additional_data, fs.created_at,
              lp.title AS page_title, lp.slug AS page_slug, lp.user_id AS owner_id,
              u.name AS owner, u.email AS owner_email
         FROM form_submissions fs
         JOIN landing_pages lp ON fs.landing_page_id = lp.id
         LEFT JOIN users u ON u.id = lp.user_id
        ${w.length ? 'WHERE ' + w.join(' AND ') : ''}
        ORDER BY fs.created_at DESC LIMIT ?`,
    ).bind(...b, limit).all()).results || []) as any[]
    for (const r of rows) out.push({ ...r, source: 'landing', source_label: '랜딩페이지', id: `l${r.id}` })
  }

  // 2) 퍼널 랜딩
  {
    const w: string[] = []
    const b: any[] = []
    if (o.userId) { w.push('fg.user_id = ?'); b.push(o.userId) }
    if (o.slug) { w.push('flp.slug = ?'); b.push(o.slug) }
    const rows = ((await db.prepare(
      `SELECT fa.id, fa.name, fa.phone, fa.email, fa.additional_data, fa.created_at,
              flp.title AS page_title, flp.slug AS page_slug, fg.user_id AS owner_id,
              u.name AS owner, u.email AS owner_email
         FROM funnel_applicants fa
         JOIN funnel_landing_pages flp ON flp.id = fa.landing_page_id
         LEFT JOIN funnel_groups fg ON fg.id = flp.group_id
         LEFT JOIN users u ON u.id = fg.user_id
        ${w.length ? 'WHERE ' + w.join(' AND ') : ''}
        ORDER BY fa.created_at DESC LIMIT ?`,
    ).bind(...b, limit).all()).results || []) as any[]
    for (const r of rows) out.push({ ...r, source: 'funnel', source_label: '퍼널 랜딩', id: `f${r.id}` })
  }

  out.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  return out.slice(0, limit).map((r) => ({
    id: r.id,
    source: r.source,
    source_label: r.source_label,
    ownerId: String(r.owner_id ?? ''),
    owner: r.owner || '(알 수 없음)',
    owner_email: r.owner_email || '',
    page_title: r.page_title || '',
    page_slug: r.page_slug || '',
    name: r.name || '',
    phone: r.phone || '',
    email: r.email || '',
    extra: parseExtra(r.additional_data),
    created_at: r.created_at || '',
  }))
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureFunnelSchema(db).catch(() => {})
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const userId = asText(url.searchParams.get('userId'), 64)
  const slug = asText(url.searchParams.get('slug'), 120)
  const format = asText(url.searchParams.get('format'), 8)
  const q = asText(url.searchParams.get('q'), 60).trim().toLowerCase()

  // ── 다운로드 (지금 보고 있는 조건 그대로) ──
  if (format === 'csv' || format === 'xlsx') {
    const leads = await loadLeads(db, { userId, slug, limit: 100000 })
    const sheet: Sheet = {
      name: '신청자DB',
      headers: LEAD_COLS.map(([, h]) => h),
      rows: leads.map((r: any) => LEAD_COLS.map(([k]) => (k === 'created_at' ? kst(r.created_at) : r[k] ?? ''))),
    }
    const fname = `leads_${slug || userId || 'all'}_${new Date().toISOString().slice(0, 10)}`
    if (format === 'csv') {
      return new Response('﻿' + sheetToCsv(sheet), {
        headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${fname}.csv"` },
      })
    }
    return new Response(buildXlsx([sheet]), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="${fname}.xlsx"`,
      },
    })
  }

  // ── 3단계: 한 페이지의 신청자 ──
  if (userId && slug) {
    const leads = await loadLeads(db, { userId, slug, limit: 5000 })
    const u: any = await db.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(userId).first().catch(() => null)
    return json({
      ok: true, level: 'leads',
      user: u ? { id: String(u.id), name: u.name || '', email: u.email || '' } : null,
      page: { slug, title: leads[0]?.page_title || slug, source: leads[0]?.source || '' },
      leads,
    })
  }

  // ── 2단계: 회원의 랜딩페이지별 요약 ──
  if (userId) {
    const pages = ((await db.prepare(
      `SELECT lp.slug, lp.title, 'landing' AS source, lp.status, lp.view_count AS views, lp.created_at,
              (SELECT COUNT(*) FROM form_submissions fs WHERE fs.landing_page_id = lp.id) AS leads,
              (SELECT MAX(fs.created_at) FROM form_submissions fs WHERE fs.landing_page_id = lp.id) AS last_lead_at
         FROM landing_pages lp WHERE lp.user_id = ?`,
    ).bind(userId).all()).results || []) as any[]
    const fpages = ((await db.prepare(
      `SELECT flp.slug, flp.title, 'funnel' AS source, flp.status, 0 AS views, flp.created_at,
              (SELECT COUNT(*) FROM funnel_applicants fa WHERE fa.landing_page_id = flp.id) AS leads,
              (SELECT MAX(fa.created_at) FROM funnel_applicants fa WHERE fa.landing_page_id = flp.id) AS last_lead_at
         FROM funnel_landing_pages flp
         JOIN funnel_groups fg ON fg.id = flp.group_id
        WHERE fg.user_id = ?`,
    ).bind(userId).all()).results || []) as any[]
    const all = [...pages, ...fpages]
      .map((p) => ({
        slug: p.slug || '', title: p.title || p.slug || '(제목 없음)',
        source: p.source, sourceLabel: p.source === 'funnel' ? '퍼널 랜딩' : '랜딩페이지',
        status: p.status || '', views: Number(p.views || 0), leads: Number(p.leads || 0),
        createdAt: p.created_at || '', lastLeadAt: p.last_lead_at || '',
      }))
      .sort((a, b) => b.leads - a.leads || String(b.lastLeadAt).localeCompare(String(a.lastLeadAt)))
    const u: any = await db.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(userId).first().catch(() => null)
    return json({
      ok: true, level: 'pages',
      user: u ? { id: String(u.id), name: u.name || '', email: u.email || '' } : null,
      pages: all,
      totals: { pages: all.length, leads: all.reduce((s, p) => s + p.leads, 0), views: all.reduce((s, p) => s + p.views, 0) },
    })
  }

  // ── 1단계: 회원별 요약 ──
  const rows = ((await db.prepare(
    `SELECT u.id, u.name, u.email, u.plan,
            (SELECT COUNT(*) FROM landing_pages lp WHERE lp.user_id = u.id)
              + (SELECT COUNT(*) FROM funnel_landing_pages flp JOIN funnel_groups fg ON fg.id = flp.group_id WHERE fg.user_id = u.id) AS pages,
            (SELECT COUNT(*) FROM form_submissions fs JOIN landing_pages lp2 ON fs.landing_page_id = lp2.id WHERE lp2.user_id = u.id)
              + (SELECT COUNT(*) FROM funnel_applicants fa JOIN funnel_landing_pages f2 ON f2.id = fa.landing_page_id
                   JOIN funnel_groups g2 ON g2.id = f2.group_id WHERE g2.user_id = u.id) AS leads,
            (SELECT MAX(fs.created_at) FROM form_submissions fs JOIN landing_pages lp3 ON fs.landing_page_id = lp3.id WHERE lp3.user_id = u.id) AS last_lead_at
       FROM users u
      ORDER BY leads DESC, pages DESC LIMIT 1000`,
  ).all()).results || []) as any[]
  const users = rows
    .filter((r) => Number(r.pages || 0) > 0 || Number(r.leads || 0) > 0)
    .filter((r) => !q || String(r.name || '').toLowerCase().includes(q) || String(r.email || '').toLowerCase().includes(q))
    .map((r) => ({
      userId: String(r.id), name: r.name || '', email: r.email || '', plan: r.plan || '',
      pages: Number(r.pages || 0), leads: Number(r.leads || 0), lastLeadAt: r.last_lead_at || '',
    }))
  return json({
    ok: true, level: 'users', users,
    totals: { users: users.length, pages: users.reduce((s, u) => s + u.pages, 0), leads: users.reduce((s, u) => s + u.leads, 0) },
  })
}
