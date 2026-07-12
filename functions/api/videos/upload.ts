// Ported from SUPERPLACE: POST /api/videos/upload — 제작 영상 R2 업로드 + 메타 저장
import { getSessionUser, resolveDB, resolveBucket } from '../_utils'

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

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const cjson = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const DB: any = resolveDB(env)
    if (!DB) return cjson({ ok: false, error: 'DB 미설정' }, 500)
    await ensureVideoGalleryTable(DB)
    const _h1cUser: any = await getSessionUser(request, DB)
    const userId: any = String(_h1cUser?.id || '')
    if (!userId || userId === 'undefined') return cjson({ ok: false, error: '로그인 필요' }, 401)
    const userIdNum = parseInt(userId)
    const userIdVal = isNaN(userIdNum) ? userId : userIdNum

    const formData = await request.formData()
    const file = formData.get('video') as unknown as File
    const metaRaw = formData.get('meta')
    const meta = metaRaw ? JSON.parse(metaRaw as string) : {}
    const thumb = (formData.get('thumbnail') as string) || ''

    if (!file) return cjson({ ok: false, error: '파일 없음' }, 400)

    const timestamp = Date.now()
    const ext = 'mp4'
    const contentType = 'video/mp4'
    const key = `videos/${userId}/${timestamp}.${ext}`
    const sizeMb = parseFloat(((file as any).size / 1024 / 1024).toFixed(2))

    const bytes = await (file as any).arrayBuffer()
    const R2: any = resolveBucket(env)
    if (R2) {
      await R2.put(key, bytes, { httpMetadata: { contentType } })
    } else {
      console.warn('[upload] R2 not configured, video not stored')
    }

    const videoUrl = `/api/videos/file/${key}`
    const dateStr = new Date(timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    const name = (meta.name || meta.title || ('영상_' + dateStr)).slice(0, 100)

    const result = await DB.prepare(`
      INSERT INTO video_gallery (user_id, name, template_name, format, duration, size_mb, thumbnail, video_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(userIdVal, name, meta.tplName || '', meta.fmt || 'short', meta.dur || 0, sizeMb, thumb, videoUrl).run()

    return cjson({ ok: true, key, url: videoUrl, id: result.meta.last_row_id })
  } catch (e: any) {
    console.error('[upload error]', e)
    return cjson({ ok: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
