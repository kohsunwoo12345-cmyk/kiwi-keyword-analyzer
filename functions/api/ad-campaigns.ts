import { Env, json, ensureSchema, resolveDB, requireAdminUser } from './_utils'
import { signAdcalShare } from './_adcal'

// /api/ad-campaigns — 광고주별 광고 집행/일정 캘린더 이벤트 CRUD (D1, 우리 웹 DB)
//   GET  ?advertiser_id=          → 해당 광고주(또는 '_general') 이벤트 목록
//   GET  ?share=<advertiser_id>   → 공유용 서명 토큰 + URL 발급
//   POST   → 이벤트 등록
//   PUT    → 이벤트 수정 (body.id 필요)
//   DELETE ?id= → 이벤트 삭제
// 인증: 관리자 세션(requireAdminUser)

function uid() { return 'cmp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function nowISO() { return new Date().toISOString() }

export async function ensureAdCampaignSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS ad_campaigns (
    id TEXT PRIMARY KEY,
    advertiser_id TEXT DEFAULT '',
    title       TEXT DEFAULT '',
    type        TEXT DEFAULT 'run',
    color       TEXT DEFAULT '',
    start_date  TEXT DEFAULT '',
    end_date    TEXT DEFAULT '',
    memo        TEXT DEFAULT '',
    result      TEXT DEFAULT '',
    ad_result   TEXT DEFAULT '',
    cost_result TEXT DEFAULT '',
    link        TEXT DEFAULT '',
    owner_id    TEXT DEFAULT '',
    owner_email TEXT DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_adcmp_adv ON ad_campaigns(advertiser_id, start_date)`).run().catch(() => {})
  // 기존 테이블 마이그레이션 (컬럼 추가 — 이미 있으면 무시)
  for (const col of ['color', 'ad_result', 'cost_result', 'link']) {
    await db.prepare(`ALTER TABLE ad_campaigns ADD COLUMN ${col} TEXT DEFAULT ''`).run().catch(() => {})
  }
}

const FIELDS = ['advertiser_id', 'title', 'type', 'color', 'start_date', 'end_date', 'memo', 'result', 'ad_result', 'cost_result', 'link'] as const
function pickFields(b: any): Record<string, string> {
  const o: Record<string, string> = {}
  for (const f of FIELDS) { if (b[f] != null) o[f] = String(b[f]).slice(0, 4000) }
  return o
}
function rowOut(p: any) {
  return {
    id: p.id, advertiser_id: p.advertiser_id, title: p.title || '', type: p.type || 'run', color: p.color || '',
    start_date: p.start_date || '', end_date: p.end_date || p.start_date || '',
    memo: p.memo || '', result: p.result || '', ad_result: p.ad_result || '', cost_result: p.cost_result || '', link: p.link || '',
    created_at: p.created_at, updated_at: p.updated_at,
  }
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAdCampaignSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const me: any = guard.me
  const url = new URL(request.url)

  try {
    if (request.method === 'GET') {
      // 공유 토큰 발급
      const shareId = url.searchParams.get('share')
      if (shareId) {
        const token = await signAdcalShare(env, shareId)
        return json({ ok: true, token, url: `${url.origin}/adcal/${token}` })
      }
      const aid = url.searchParams.get('advertiser_id')
      if (!aid) return json({ ok: false, error: 'advertiser_id가 필요합니다.' }, 400)
      const { results } = await db.prepare(
        'SELECT * FROM ad_campaigns WHERE advertiser_id=? ORDER BY start_date ASC, created_at ASC',
      ).bind(String(aid)).all()
      return json({ ok: true, events: ((results as any[]) || []).map(rowOut) })
    }

    if (request.method === 'POST') {
      const body: any = await request.json().catch(() => ({}))
      const f = pickFields(body)
      if (!f.advertiser_id) return json({ ok: false, error: 'advertiser_id가 필요합니다.' }, 400)
      if (!f.start_date) return json({ ok: false, error: '시작일이 필요합니다.' }, 400)
      const id = uid(), ts = nowISO()
      await db.prepare(
        `INSERT INTO ad_campaigns (id,advertiser_id,title,type,color,start_date,end_date,memo,result,ad_result,cost_result,link,owner_id,owner_email,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).bind(id, f.advertiser_id, f.title || '', f.type || 'run', f.color || '', f.start_date, f.end_date || f.start_date,
        f.memo || '', f.result || '', f.ad_result || '', f.cost_result || '', f.link || '', String(me?.id || ''), String(me?.email || ''), ts, ts).run()
      return json({ ok: true, id })
    }

    if (request.method === 'PUT') {
      const body: any = await request.json().catch(() => ({}))
      const id = body.id
      if (!id) return json({ ok: false, error: 'id가 필요합니다.' }, 400)
      const f = pickFields(body)
      const sets: string[] = [], vals: any[] = []
      for (const k of FIELDS) { if (f[k] != null) { sets.push(`${k}=?`); vals.push(f[k]) } }
      if (!sets.length) return json({ ok: false, error: '변경할 내용이 없습니다.' }, 400)
      sets.push('updated_at=?'); vals.push(nowISO()); vals.push(String(id))
      await db.prepare(`UPDATE ad_campaigns SET ${sets.join(',')} WHERE id=?`).bind(...vals).run()
      return json({ ok: true })
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return json({ ok: false, error: 'id가 필요합니다.' }, 400)
      await db.prepare('DELETE FROM ad_campaigns WHERE id=?').bind(String(id)).run()
      return json({ ok: true })
    }

    return json({ ok: false, error: '지원하지 않는 메서드' }, 405)
  } catch (e: any) {
    return json({ ok: false, error: String((e && e.message) || e).slice(0, 200) }, 500)
  }
}
