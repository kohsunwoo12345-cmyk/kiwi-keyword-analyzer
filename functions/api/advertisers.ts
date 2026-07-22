import { Env, json, ensureSchema, resolveDB, requireAdminUser } from './_utils'

// /api/advertisers — 광고주 관리 CRUD (D1, 우리 웹 DB)
//   GET    ?id=  → 단건, 없으면 전체 목록 (?q= 검색)
//   POST   → 등록
//   PUT    → 수정 (body.id 필요)
//   DELETE ?id= → 삭제
// 인증: 관리자 세션(requireAdminUser) — 넥스트바이전시 관리자 대시보드에서 이식.

function uid() { return 'adv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function nowISO() { return new Date().toISOString() }

export async function ensureAdvertiserSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS advertisers (
    id TEXT PRIMARY KEY,
    reg_date     TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    place_url    TEXT DEFAULT '',
    industry     TEXT DEFAULT '',
    product      TEXT DEFAULT '',
    price        TEXT DEFAULT '',
    source       TEXT DEFAULT '',
    contact      TEXT DEFAULT '',
    memo         TEXT DEFAULT '',
    status       TEXT DEFAULT 'active',
    owner_id     TEXT DEFAULT '',
    owner_email  TEXT DEFAULT '',
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_adv_reg ON advertisers(reg_date)`).run().catch(() => {})
}

const FIELDS = ['reg_date', 'company_name', 'place_url', 'industry', 'product', 'price', 'source', 'contact', 'memo', 'status'] as const
function pickFields(b: any): Record<string, string> {
  const o: Record<string, string> = {}
  for (const f of FIELDS) { if (b[f] != null) o[f] = String(b[f]).slice(0, 1000) }
  return o
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAdvertiserSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const me: any = guard.me
  const url = new URL(request.url)

  try {
    if (request.method === 'GET') {
      const id = url.searchParams.get('id')
      if (id) {
        const row = await db.prepare('SELECT * FROM advertisers WHERE id=?').bind(id).first()
        return json({ ok: true, advertiser: row || null })
      }
      const q = (url.searchParams.get('q') || '').trim()
      let rows: any
      if (q) {
        const like = '%' + q + '%'
        rows = await db.prepare(
          'SELECT * FROM advertisers WHERE company_name LIKE ? OR industry LIKE ? OR place_url LIKE ? ORDER BY reg_date DESC, created_at DESC',
        ).bind(like, like, like).all()
      } else {
        rows = await db.prepare('SELECT * FROM advertisers ORDER BY reg_date DESC, created_at DESC').all()
      }
      const items = (rows.results as any[]) || []
      return json({ ok: true, advertisers: items, total: items.length })
    }

    if (request.method === 'POST') {
      const b: any = await request.json().catch(() => ({}))
      const f = pickFields(b)
      if (!f.company_name || !f.company_name.trim()) return json({ ok: false, error: '업체 이름은 필수입니다.' }, 400)
      if (!f.reg_date) f.reg_date = nowISO().slice(0, 10)
      const id = uid(), ts = nowISO()
      await db.prepare(
        `INSERT INTO advertisers (id,reg_date,company_name,place_url,industry,product,price,source,contact,memo,status,owner_id,owner_email,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).bind(id, f.reg_date, f.company_name, f.place_url || '', f.industry || '', f.product || '', f.price || '', f.source || '', f.contact || '', f.memo || '', f.status || 'active',
        String(me?.id || ''), String(me?.email || ''), ts, ts).run()
      return json({ ok: true, id })
    }

    if (request.method === 'PUT') {
      const b: any = await request.json().catch(() => ({}))
      const id = b.id
      if (!id) return json({ ok: false, error: 'id가 필요합니다.' }, 400)
      const f = pickFields(b)
      const cols = Object.keys(f)
      if (!cols.length) return json({ ok: false, error: '수정할 내용이 없습니다.' }, 400)
      const sets = cols.map((c) => c + '=?').concat(['updated_at=?'])
      const vals = cols.map((c) => f[c]).concat([nowISO(), id])
      await db.prepare('UPDATE advertisers SET ' + sets.join(',') + ' WHERE id=?').bind(...vals).run()
      return json({ ok: true })
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id') || (await request.json().catch(() => ({})) as any).id
      if (!id) return json({ ok: false, error: 'id가 필요합니다.' }, 400)
      await db.prepare('DELETE FROM advertisers WHERE id=?').bind(id).run()
      // 해당 광고주의 캘린더 이벤트도 함께 정리
      await db.prepare('DELETE FROM ad_campaigns WHERE advertiser_id=?').bind(id).run().catch(() => {})
      return json({ ok: true })
    }

    return json({ ok: false, error: '지원하지 않는 메서드' }, 405)
  } catch (e: any) {
    return json({ ok: false, error: '서버 오류: ' + String((e && e.message) || e).slice(0, 200) }, 500)
  }
}
