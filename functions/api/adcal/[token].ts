import { verifyAdcalShare } from '../_adcal'
import { resolveDB } from '../_utils'

// /api/adcal/<token> — 공유 캘린더 실시간 데이터 (공개 JSON, 읽기전용, 인증 불필요)
function resp(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } })
}

export const onRequestGet: PagesFunction<any> = async ({ params, env }) => {
  const token = Array.isArray(params.token) ? params.token[0] : (params.token as string)
  const v = await verifyAdcalShare(env, token)
  if (!v) return resp({ ok: false, error: 'invalid token' }, 404)
  const db = resolveDB(env)
  if (!db) return resp({ ok: true, advertiser: null, events: [] })
  try {
    const aid = String(v.aid)
    let adv: any = null, calName = ''
    if (aid.indexOf('_cal_') === 0) {
      const cal: any = await db.prepare('SELECT name FROM ad_calendars WHERE id=?').bind(aid.slice(5)).first().catch(() => null)
      calName = (cal && cal.name) || '전개 캘린더'
    } else if (aid !== '_general') {
      adv = await db.prepare('SELECT company_name,industry,product,status FROM advertisers WHERE id=?').bind(aid).first()
    }
    const { results } = await db.prepare(
      'SELECT title,type,color,start_date,end_date,memo,result,ad_result,cost_result,link FROM ad_campaigns WHERE advertiser_id=? ORDER BY start_date ASC',
    ).bind(aid).all()
    const events = ((results as any[]) || []).map((e) => ({
      title: e.title || '', type: e.type || 'run', color: e.color || '',
      start: (e.start_date || '').slice(0, 10), end: (e.end_date || e.start_date || '').slice(0, 10),
      memo: e.memo || '', result: e.result || '', ad_result: e.ad_result || '', cost_result: e.cost_result || '', link: e.link || '',
    }))
    return resp({ ok: true, advertiser: adv || null, calendar_name: calName, events })
  } catch {
    return resp({ ok: false, error: 'db error' }, 500)
  }
}
