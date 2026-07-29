// POST /api/sender/upload (multipart: senderId, docType, file) — 발신번호 승인 서류 첨부
//  · 신분증·사업자등록증이 올라오는 경로다. 공개 /api/media 가 아니라 인증이 필요한
//    /api/sender/doc/<id> 로만 서빙한다(키를 알아도 남이 못 본다).
import { json, ensureSchema, getSessionUser, resolveDB, resolveBucket, rateLimitOk, asText, sameOriginOk } from '../_utils'
import { ensureSenderSchema, DOC_SPECS, requiredDocs } from './_schema'

const OK_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
}
const MAX = 12 * 1024 * 1024 // 12MB

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  if (!(await rateLimitOk(db, `sendup:${me.id}`, 60, 10)))
    return json({ ok: false, error: '업로드가 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, 429)

  const form = await request.formData().catch(() => null)
  if (!form) return json({ ok: false, error: '업로드 형식 오류' }, 400)
  const senderId = asText(form.get('senderId'), 64)
  const docType = asText(form.get('docType'), 24)
  if (!DOC_SPECS[docType]) return json({ ok: false, error: '알 수 없는 서류 종류입니다.' }, 400)

  const row: any = await db.prepare('SELECT * FROM sender_numbers WHERE id = ?').bind(senderId).first().catch(() => null)
  if (!row || String(row.user_id) !== String(me.id)) return json({ ok: false, error: '신청을 찾을 수 없습니다.' }, 404)
  const status = String(row.status || 'draft')
  if (status === 'approved') return json({ ok: false, error: '이미 승인된 신청입니다.' }, 409)
  // 이 신청에 필요 없는 서류는 받지 않는다(불필요한 개인정보 보관 방지).
  const need = requiredDocs(String(row.owner_type || 'personal'), Number(row.third_party || 0))
  if (!need.includes(docType)) return json({ ok: false, error: '이 신청에는 필요하지 않은 서류입니다.' }, 400)

  const file = form.get('file') as unknown as File | null
  if (!file || typeof (file as any).arrayBuffer !== 'function') return json({ ok: false, error: '파일이 없습니다.' }, 400)
  const ct = String((file as any).type || '').toLowerCase()
  const ext = OK_TYPES[ct]
  if (!ext) return json({ ok: false, error: '사진(JPG·PNG·WEBP·HEIC) 또는 PDF만 첨부할 수 있습니다.' }, 415)
  const size = Number((file as any).size || 0)
  if (size <= 0) return json({ ok: false, error: '빈 파일입니다.' }, 400)
  if (size > MAX) return json({ ok: false, error: '파일은 최대 12MB까지 첨부할 수 있습니다.' }, 413)

  const key = `sender-docs/${me.id}/${senderId}/${docType}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`
  const bytes = await (file as any).arrayBuffer()
  const R2: any = resolveBucket(env)
  if (R2) {
    await R2.put(key, bytes, { httpMetadata: { contentType: ct } })
  } else {
    await db
      .prepare('CREATE TABLE IF NOT EXISTS media_blobs (key TEXT PRIMARY KEY, content_type TEXT, data BLOB, size INTEGER, created_at TEXT)')
      .run()
      .catch(() => {})
    await db
      .prepare('INSERT OR REPLACE INTO media_blobs (key, content_type, data, size, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(key, ct, bytes, size, new Date().toISOString())
      .run()
  }

  // 같은 종류를 다시 올리면 교체한다(구 파일은 저장소에서도 지운다).
  const olds =
    (
      await db
        .prepare('SELECT id, storage_key FROM sender_documents WHERE sender_id = ? AND doc_type = ?')
        .bind(senderId, docType)
        .all()
        .catch(() => ({ results: [] as any[] }))
    ).results || []
  for (const o of olds as any[]) {
    if (R2) await R2.delete(String(o.storage_key)).catch(() => {})
    else await db.prepare('DELETE FROM media_blobs WHERE key = ?').bind(String(o.storage_key)).run().catch(() => {})
  }
  if ((olds as any[]).length)
    await db.prepare('DELETE FROM sender_documents WHERE sender_id = ? AND doc_type = ?').bind(senderId, docType).run().catch(() => {})

  const id = 'sd_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)
  await db
    .prepare(
      `INSERT INTO sender_documents (id, sender_id, user_id, doc_type, storage_key, file_name, content_type, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, senderId, me.id, docType, key, asText((file as any).name, 120), ct, size, new Date().toISOString())
    .run()

  // 서류를 갈아끼우면 반려 사유는 지운다(다시 제출할 수 있게).
  if (status === 'rejected') await db.prepare("UPDATE sender_numbers SET status='draft' WHERE id=? AND user_id=?").bind(senderId, me.id).run().catch(() => {})

  return json({ ok: true, doc: { id, docType, label: DOC_SPECS[docType].label, fileName: asText((file as any).name, 120), contentType: ct, size, url: `/api/sender/doc/${id}` } })
}
