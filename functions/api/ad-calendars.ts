import { Env, json, ensureSchema, resolveDB, requireAdminUser } from './_utils'

// /api/ad-calendars — 전개 캘린더 목록 CRUD (D1, 우리 웹 DB)
//   여러 개의 캘린더를 생성/이름변경/삭제하고, 각 캘린더는 크롬 탭처럼 전환해 사용.
//   실제 일정 이벤트는 /api/ad-campaigns 에 advertiser_id = "_cal_<calendarId>" 버킷으로 저장됨.
//   GET     → 캘린더 목록 (없으면 기본 캘린더 1개 자동 생성)
//   POST    → 새 캘린더 생성 {name, color}
//   PUT     → 이름/색상 변경 {id, name, color}
//   DELETE ?id= → 캘린더 삭제 (+ 해당 캘린더의 이벤트도 함께 삭제)
// 인증: 관리자 세션(requireAdminUser)

function uid() { return 'cal' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function nowISO() { return new Date().toISOString() }

export async function ensureAdCalendarSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS ad_calendars (
    id TEXT PRIMARY KEY,
    name        TEXT DEFAULT '',
    color       TEXT DEFAULT '',
    owner_id    TEXT DEFAULT '',
    owner_email TEXT DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`).run().catch(() => {})
}
function rowOut(p: any) { return { id: p.id, name: p.name || '', color: p.color || '', created_at: p.created_at, updated_at: p.updated_at } }

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAdCalendarSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const me: any = guard.me
  const url = new URL(request.url)

  try {
    if (request.method === 'GET') {
      let rows: any = await db.prepare('SELECT * FROM ad_calendars ORDER BY created_at ASC').all()
      let results = (rows.results as any[]) || []
      // 캘린더가 하나도 없으면 기본 캘린더 자동 생성
      if (!results.length) {
        const id = uid(), ts = nowISO()
        await db.prepare(
          'INSERT INTO ad_calendars (id,name,color,owner_id,owner_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        ).bind(id, '마케팅 전개 캘린더', '#6366f1', String(me?.id || ''), String(me?.email || ''), ts, ts).run()
        results = [{ id, name: '마케팅 전개 캘린더', color: '#6366f1', created_at: ts, updated_at: ts }]
      }
      return json({ ok: true, calendars: results.map(rowOut) })
    }

    if (request.method === 'POST') {
      const body: any = await request.json().catch(() => ({}))
      const name = String(body.name || '').trim().slice(0, 80) || '새 캘린더'
      const color = String(body.color || '').slice(0, 20)
      const id = uid(), ts = nowISO()
      await db.prepare(
        'INSERT INTO ad_calendars (id,name,color,owner_id,owner_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
      ).bind(id, name, color, String(me?.id || ''), String(me?.email || ''), ts, ts).run()
      return json({ ok: true, id, name, color })
    }

    if (request.method === 'PUT') {
      const body: any = await request.json().catch(() => ({}))
      const id = body.id
      if (!id) return json({ ok: false, error: 'id가 필요합니다.' }, 400)
      const sets: string[] = [], vals: any[] = []
      if (body.name != null) { sets.push('name=?'); vals.push(String(body.name).trim().slice(0, 80)) }
      if (body.color != null) { sets.push('color=?'); vals.push(String(body.color).slice(0, 20)) }
      if (!sets.length) return json({ ok: false, error: '변경할 내용이 없습니다.' }, 400)
      sets.push('updated_at=?'); vals.push(nowISO()); vals.push(String(id))
      await db.prepare(`UPDATE ad_calendars SET ${sets.join(',')} WHERE id=?`).bind(...vals).run()
      return json({ ok: true })
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return json({ ok: false, error: 'id가 필요합니다.' }, 400)
      await db.prepare('DELETE FROM ad_calendars WHERE id=?').bind(String(id)).run()
      // 해당 캘린더의 이벤트도 정리
      await db.prepare('DELETE FROM ad_campaigns WHERE advertiser_id=?').bind('_cal_' + String(id)).run().catch(() => {})
      return json({ ok: true })
    }

    return json({ ok: false, error: '지원하지 않는 메서드' }, 405)
  } catch (e: any) {
    return json({ ok: false, error: String((e && e.message) || e).slice(0, 200) }, 500)
  }
}
