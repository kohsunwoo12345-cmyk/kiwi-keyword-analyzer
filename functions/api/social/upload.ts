// POST /api/social/upload  (multipart: toId, file) — 개인(DM) 채팅 사진/영상 업로드
//  · 친구끼리만 업로드 가능. R2 저장(미설정 시 D1 media_blobs 폴백). 반환 key 는 /api/media/<key> 로 서빙.
import { getSessionUser, resolveDB, resolveBucket, ensureSchema, json } from '../_utils'

const IMG = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'])
const VID = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
}
const MAX_IMG = 15 * 1024 * 1024 // 15MB
const MAX_VID = 200 * 1024 * 1024 // 200MB

async function areFriends(db: D1Database, a: string, b: string) {
  const r = await db.prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?').bind(a, b).first().catch(() => null)
  return !!r
}
function convId(a: string, b: string) { return 'dm_' + [a, b].sort().join('__') }

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const form = await request.formData().catch(() => null)
  if (!form) return json({ ok: false, error: '업로드 형식 오류' }, 400)
  const toId = String(form.get('toId') || '')
  if (!toId || !(await areFriends(db, me.id, toId))) return json({ ok: false, error: '친구만 첨부할 수 있습니다.' }, 403)

  const file = form.get('file') as unknown as File | null
  if (!file || typeof (file as any).arrayBuffer !== 'function') return json({ ok: false, error: '파일이 없습니다.' }, 400)
  const ct = String((file as any).type || '').toLowerCase()
  const isImg = IMG.has(ct), isVid = VID.has(ct)
  if (!isImg && !isVid) return json({ ok: false, error: '사진 또는 영상만 첨부할 수 있습니다.' }, 415)
  const size = Number((file as any).size || 0)
  if (isImg && size > MAX_IMG) return json({ ok: false, error: '사진은 최대 15MB까지 첨부할 수 있습니다.' }, 413)
  if (isVid && size > MAX_VID) return json({ ok: false, error: '영상은 최대 200MB까지 첨부할 수 있습니다.' }, 413)

  const ext = EXT[ct] || 'bin'
  const key = `dm-chat/${convId(me.id, toId)}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`
  const bytes = await (file as any).arrayBuffer()

  const R2: any = resolveBucket(env)
  if (R2) {
    await R2.put(key, bytes, { httpMetadata: { contentType: ct } })
  } else {
    await db.prepare(`CREATE TABLE IF NOT EXISTS media_blobs (key TEXT PRIMARY KEY, content_type TEXT, data BLOB, size INTEGER, created_at TEXT)`).run().catch(() => {})
    await db.prepare('INSERT OR REPLACE INTO media_blobs (key, content_type, data, size, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(key, ct, bytes, size, new Date().toISOString()).run()
  }

  return json({ ok: true, key, url: `/api/media/${key}`, kind: isVid ? 'video' : 'image', name: String((file as any).name || '').slice(0, 120) })
}
