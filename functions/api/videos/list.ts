// Ported from SUPERPLACE: GET /api/videos/list — 내 영상 목록 조회
import { getSessionUser, resolveDB } from '../_utils'

async function ensureVideoGalleryTable(DB: any) {
  try {
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS video_gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        template_name TEXT,
        format TEXT DEFAULT 'short',
        duration INTEGER DEFAULT 0,
        size_mb REAL DEFAULT 0,
        thumbnail TEXT,
        video_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_vg_user ON video_gallery(user_id)`).run()
  } catch (_) {}
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const cjson = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const DB: any = resolveDB(env)
    if (!DB) return cjson({ ok: false, error: 'DB 미설정' }, 500)
    await ensureVideoGalleryTable(DB)
    const _vlUser: any = await getSessionUser(request, DB)
    if (!_vlUser) return cjson({ ok: false, error: '로그인 필요' }, 401)
    const userId = String(_vlUser.id)
    const sp = new URL(request.url).searchParams
    const limit = Math.min(parseInt(sp.get('limit') || '200'), 500)
    const _offsetRaw = parseInt(sp.get('offset') || '0'); const offset = (!isNaN(_offsetRaw) && _offsetRaw >= 0) ? _offsetRaw : 0
    const userIdStr = String(userId)
    const rows = await DB.prepare(`
      SELECT id, name, template_name, format, duration, size_mb, thumbnail, video_url, created_at
      FROM video_gallery
      WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).bind(userIdStr, limit, offset).all()
    const totalRow = await DB.prepare(
      `SELECT COUNT(*) as cnt FROM video_gallery WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)`
    ).bind(userIdStr).first() as any
    const videos = (rows.results || []).map((v: any) => ({
      key: String(v.id),
      url: v.video_url || '',
      title: v.name || '영상',
      ratio: v.format === 'long' ? '16:9' : v.format === 'sq' ? '1:1' : '9:16',
      size: Math.round((v.size_mb || 0) * 1024 * 1024),
      scenes: 1,
      thumb: v.thumbnail || '',
      tplName: v.template_name || '',
      duration: v.duration || 0,
      createdAt: v.created_at || new Date().toISOString(),
    }))
    return cjson({ ok: true, videos, total: totalRow?.cnt || 0, debug_uid: userIdStr })
  } catch (e: any) {
    return cjson({ ok: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
