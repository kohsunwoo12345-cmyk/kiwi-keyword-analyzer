// POST /api/upload/landing-image (multipart: file|image) — 랜딩/퍼널 빌더의 이미지·썸네일 업로드
//  · R2 저장(미설정 시 D1 media_blobs 폴백). 반환 url 은 /api/media/<key> 로 서빙된다.
//
// 예전 상태가 어땠는가:
//  1) 인증이 통째로 무력화돼 있었다(주석에 "인증 shim — 공개 도구이므로 통과시킴").
//     로그인 없이 누구나 10MB 파일을 무제한 올릴 수 있었다. 같이 있던 레이트리밋도
//     `const kvRateLimit = async () => true` 라 항상 통과하는 껍데기였다.
//  2) userId 를 폼 데이터에서 받아 저장 경로에 썼다 — 남의 폴더에 파일을 밀어 넣을 수 있었다.
//  3) 버킷을 c.env.R2 로 찾았는데 이 프로젝트의 바인딩 이름은 BUCKET 이다. 그래서 R2 분기는
//     한 번도 실행되지 않고 늘 base64 data URL 폴백으로 떨어졌다 — 회원이 넣은 사진이
//     통째로 문자열이 되어 html_content 에 박히고, 썸네일은 data: URL 이라 카톡 미리보기가 안 됐다.
//  4) 그렇게 만든 주소가 /api/image/<key> 였는데 그런 라우트는 이 저장소에 없다(404).
//  5) image/svg+xml 을 허용했다. SVG 는 스크립트를 품을 수 있어 업로드 단계에서 받지 않는다.
import { getSessionUser, resolveDB, resolveBucket, ensureSchema, rateLimitOk, clientIp } from '../_utils'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

const ALLOWED: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif',
}
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const UPLOAD_LIMIT = 60           // 회원당 10분에 60장
const WINDOW_MIN = 10

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env as any)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)

    if (!(await rateLimitOk(db, `imgup:${me.id}`, UPLOAD_LIMIT, WINDOW_MIN)))
      return j({ success: false, error: '업로드가 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, 429)
    if (!(await rateLimitOk(db, `imgup:ip:${clientIp(request) || 'unknown'}`, UPLOAD_LIMIT * 2, WINDOW_MIN)))
      return j({ success: false, error: '업로드가 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, 429)

    const form = await request.formData().catch(() => null)
    if (!form) return j({ success: false, error: '업로드 형식 오류' }, 400)
    const file = (form.get('file') || form.get('image')) as unknown as File | null
    if (!file || typeof (file as any).arrayBuffer !== 'function')
      return j({ success: false, error: '이미지 파일이 없습니다.' }, 400)

    const ct = String((file as any).type || '').toLowerCase()
    const ext = ALLOWED[ct]
    if (!ext) return j({ success: false, error: '허용되지 않은 이미지 형식입니다. (png/jpg/gif/webp/avif)' }, 415)
    const size = Number((file as any).size || 0)
    if (size > MAX_SIZE) return j({ success: false, error: '파일 크기는 10MB 이하여야 합니다.' }, 413)

    // 파일명과 시각만으로 주소가 정해지면 남의 업로드를 추측할 수 있다 → 무작위 조각을 넣는다.
    const key = `landing-images/${me.id}/${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}.${ext}`
    const bytes = await (file as any).arrayBuffer()

    const R2: any = resolveBucket(env as any)
    if (R2) {
      await R2.put(key, bytes, { httpMetadata: { contentType: ct } })
    } else {
      await db.prepare(`CREATE TABLE IF NOT EXISTS media_blobs (key TEXT PRIMARY KEY, content_type TEXT, data BLOB, size INTEGER, created_at TEXT)`).run().catch(() => {})
      await db.prepare('INSERT OR REPLACE INTO media_blobs (key, content_type, data, size, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(key, ct, bytes, size, new Date().toISOString()).run()
    }

    // 공개 페이지(og:image)는 절대 주소여야 카톡·페북이 읽는다.
    const origin = new URL(request.url).origin
    return j({ success: true, key, url: `${origin}/api/media/${key}`, message: '이미지가 업로드되었습니다.' })
  } catch (err: any) {
    return j({ success: false, error: '이미지 업로드 중 오류가 발생했습니다.' }, 500)
  }
}
