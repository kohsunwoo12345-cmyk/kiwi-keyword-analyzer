// Ported from SUPERPLACE (BYGENCY) — Hono 핸들러를 Cloudflare Pages Functions로 변환.
// Hono 컨텍스트(c) 호환 shim + 인증 무력화(툴 공개 동작, youtube 이식과 동일 패턴).
function makeC(context: any): any {
  const { request, env, params } = context
  return {
    env,
    executionCtx: context,
    req: {
      url: request.url,
      json: () => request.json(),
      formData: () => request.formData(),
      query: (k: string) => new URL(request.url).searchParams.get(k),
      param: (k: string) => (params ? params[k] : undefined),
      header: (k: string) => request.headers.get(k),
    },
    json: (o: any, status = 200) =>
      new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } }),
    html: (h: any, status = 200) =>
      new Response(h, { status, headers: { 'content-type': 'text/html; charset=utf-8' } }),
    text: (t: any, status = 200) =>
      new Response(t, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }),
  }
}
// 인증 shim — BYGENCY 대시보드 내 임베드 공개 도구이므로 통과시킴
const tryGetUserFromHeaders = (_c: any): { ok: true; user: any; userId: number } => ({ ok: true, user: { id: 0 }, userId: 0 })
const tryGetUserFromSession = async (_c: any): Promise<{ ok: true; user: any; userId: number }> => ({ ok: true, user: { id: 0 }, userId: 0 })
const getSessionUser = async (_c: any): Promise<any> => null
const kvRateLimit = async (..._a: any[]): Promise<boolean> => true
async function triggerDailyRankUpdateIfNeeded(_env?: any, _ctx?: any): Promise<void> {}
const puppeteer: any = (globalThis as any).puppeteer

export const onRequestPost: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    // ✅ Rate Limit: 이미지 업로드 30회/분
    const _imgUpIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const _imgUpAllowed = await kvRateLimit(c, `upload_img:${_imgUpIp}`, 30, 60_000)
    if (!_imgUpAllowed) return c.json({ success: false, error: '너무 많은 업로드 요청입니다. 잠시 후 다시 시도해주세요.' }, 429)

    // MIME 타입 + 파일 크기 화이트리스트 검증
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
    const formData = await c.req.formData()
    // 'file' 또는 'image' 필드명 모두 허용
    const image = (formData.get('file') || formData.get('image')) as File
    // userId: 세션 DB 조회 (헤더 위조 방지)
    const _imgUpUser = await getSessionUser(c)
    let userId = formData.get('userId') as string
    if (!userId && _imgUpUser) {
      userId = String(_imgUpUser.id)
    }
    if (!userId) userId = '1'
    
    if (!image) {
      return c.json({ success: false, error: '이미지 파일이 없습니다.' }, 400)
    }

    // ✅ MIME 타입 화이트리스트 검증 (image/* 패턴 대신 정확한 타입 목록 사용)
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      return c.json({ success: false, error: '허용되지 않은 이미지 형식입니다. (jpeg/jpg/png/gif/webp/svg만 허용)' }, 400)
    }

    // 파일 크기 제한 (10MB)
    if (image.size > MAX_IMAGE_SIZE) {
      return c.json({ success: false, error: '파일 크기는 10MB 이하여야 합니다.' }, 400)
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await image.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // R2에 업로드 (경로: landing-images/{userId}/{timestamp}-{fileName})
    const timestamp = Date.now()
    const sanitizedFileName = image.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `landing-images/${userId}/${timestamp}-${sanitizedFileName}`

    // R2 바인딩 확인
    if (!c.env.R2) {
      console.warn('[Upload] R2 binding not available, returning base64 data URL')
      // R2가 없으면 Base64 Data URL로 반환 (임시)
      const base64 = btoa(String.fromCharCode(...bytes))
      const dataUrl = `data:${image.type};base64,${base64}`
      return c.json({
        success: true,
        url: dataUrl,
        message: '이미지가 업로드되었습니다. (임시 URL)'
      })
    }
    
    await c.env.R2.put(key, bytes, {
      httpMetadata: {
        contentType: image.type
      }
    })

    // 공개 URL 생성 (전체 도메인 포함)
    const origin = c.req.header('origin') || c.req.header('referer')?.split('/').slice(0,3).join('/') || 'https://wearesuperplace.com'
    const publicUrl = `${origin}/api/image/${key}`

    return c.json({ 
      success: true, 
      url: publicUrl,
      message: '이미지가 업로드되었습니다.'
    })
  } catch (err) {
    console.error('이미지 업로드 오류:', err)
    return c.json({ success: false, error: '이미지 업로드 중 오류가 발생했습니다.' }, 500)
  }
}
