// GET    /api/sender/doc/:id — 발신번호 승인 서류 열람. 본인 또는 관리자만.
// DELETE /api/sender/doc/:id — 본인이 첨부한 서류 삭제(승인 전까지).
//
// 신분증·사업자등록증이라 공개 서빙(/api/media)에서는 일부러 막아 두었다.
import { json, ensureSchema, getSessionUser, resolveDB, resolveBucket, asText, sameOriginOk, ADMIN_EMAIL } from '../../_utils'
import { ensureSenderSchema } from '../_schema'

const INLINE_OK = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])

// 관리자 판정 기준은 requireAdminUser 와 동일하게 맞춘다.
const isAdminUser = (me: any) => !!me && (me.email === ADMIN_EMAIL || me.role === 'admin' || me.role === 'superadmin')

async function load(db: D1Database, id: string) {
  return await db.prepare('SELECT * FROM sender_documents WHERE id = ?').bind(id).first().catch(() => null)
}

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const id = asText((params as any).id, 64)
  const doc: any = await load(db, id)
  if (!doc) return json({ ok: false, error: '서류를 찾을 수 없습니다.' }, 404)
  if (String(doc.user_id) !== String(me.id) && !isAdminUser(me)) return json({ ok: false, error: '권한이 없습니다.' }, 403)

  const key = String(doc.storage_key || '')
  const ct = String(doc.content_type || 'application/octet-stream')
  const safeCt = INLINE_OK.has(ct) ? ct : 'application/octet-stream'
  const dl = new URL(request.url).searchParams.get('dl') === '1'
  const name = (String(doc.file_name || '') || key.split('/').pop() || 'document').replace(/["\\\r\n]/g, '')
  const headers = new Headers({
    'Content-Type': safeCt,
    'X-Content-Type-Options': 'nosniff',
    // 개인정보 — 공유 캐시/CDN 에 남지 않게.
    'Cache-Control': 'private, no-store',
    'Content-Disposition': `${dl || safeCt === 'application/octet-stream' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`,
  })

  const R2: any = resolveBucket(env)
  if (R2) {
    const obj: any = await R2.get(key).catch(() => null)
    if (obj) {
      if (obj.size) headers.set('Content-Length', String(obj.size))
      return new Response(obj.body, { status: 200, headers })
    }
  }
  const row: any = await db.prepare('SELECT content_type, data FROM media_blobs WHERE key = ?').bind(key).first().catch(() => null)
  if (!row || row.data == null) return json({ ok: false, error: '파일 없음' }, 404)
  return new Response(row.data, { status: 200, headers })
}

export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const id = asText((params as any).id, 64)
  const doc: any = await load(db, id)
  if (!doc) return json({ ok: false, error: '서류를 찾을 수 없습니다.' }, 404)
  const admin = isAdminUser(me)
  if (String(doc.user_id) !== String(me.id) && !admin) return json({ ok: false, error: '권한이 없습니다.' }, 403)

  const sender: any = await db.prepare('SELECT status FROM sender_numbers WHERE id = ?').bind(String(doc.sender_id)).first().catch(() => null)
  if (!admin && String(sender?.status || '') === 'approved') return json({ ok: false, error: '승인된 신청의 서류는 삭제할 수 없습니다.' }, 409)

  const R2: any = resolveBucket(env)
  if (R2) await R2.delete(String(doc.storage_key)).catch(() => {})
  else await db.prepare('DELETE FROM media_blobs WHERE key = ?').bind(String(doc.storage_key)).run().catch(() => {})
  await db.prepare('DELETE FROM sender_documents WHERE id = ?').bind(id).run()
  // 서류가 빠졌으니 승인 대기 상태는 유지될 수 없다.
  if (String(sender?.status || '') === 'pending')
    await db.prepare("UPDATE sender_numbers SET status='draft', submitted_at='' WHERE id=?").bind(String(doc.sender_id)).run().catch(() => {})
  return json({ ok: true })
}
