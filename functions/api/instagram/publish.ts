import { Env, getSessionUser, resolveDB } from '../_utils'
import { ensureIgSchema, getIgCredentials } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// POST /api/instagram/publish → 이미지/카루셀/릴스 발행
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
  await ensureIgSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const userId = String(me.id)
  const creds = await getIgCredentials(db, userId)
  if (!creds) return j({ success: false, error: '연결된 Instagram 계정이 없습니다. 먼저 계정을 연동해주세요.' }, 400)

  const body = (await request.json()) as any
  const { mediaType = 'IMAGE', imageUrl, videoUrl, caption = '', coverUrl, children } = body

  if (!mediaType) return j({ success: false, error: 'mediaType은 필수입니다.' }, 400)

  const BASE = `https://graph.instagram.com/v25.0`
  const igId = creds.igId
  const token = creds.token

  try {
    if (mediaType === 'CAROUSEL') {
      if (!Array.isArray(children) || children.length < 2) {
        return j({ success: false, error: '카루셀은 이미지 URL이 2개 이상 필요합니다.' }, 400)
      }
      const childIds: string[] = []
      for (const imgUrl of children) {
        const childRes = await fetch(`${BASE}/${igId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imgUrl, is_carousel_item: true, access_token: token }),
        })
        const childData = (await childRes.json()) as any
        if (childData.error)
          return j({ success: false, error: `카루셀 아이템 생성 실패: ${childData.error.message}`, detail: childData.error }, 400)
        childIds.push(childData.id)
      }
      const containerRes = await fetch(`${BASE}/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: 'CAROUSEL', caption, children: childIds.join(','), access_token: token }),
      })
      const containerData = (await containerRes.json()) as any
      if (containerData.error)
        return j({ success: false, error: `카루셀 컨테이너 생성 실패: ${containerData.error.message}`, detail: containerData.error }, 400)

      const publishRes = await fetch(`${BASE}/${igId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
      })
      const publishData = (await publishRes.json()) as any
      if (publishData.error)
        return j({ success: false, error: `발행 실패: ${publishData.error.message}`, detail: publishData.error }, 400)
      return j({ success: true, mediaId: publishData.id, message: '카루셀이 성공적으로 발행되었습니다.' })
    }

    if (mediaType === 'IMAGE') {
      if (!imageUrl) return j({ success: false, error: '이미지 URL(imageUrl)은 필수입니다.' }, 400)
      const containerRes = await fetch(`${BASE}/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
      })
      const containerData = (await containerRes.json()) as any
      if (containerData.error)
        return j({ success: false, error: `이미지 컨테이너 생성 실패: ${containerData.error.message}`, detail: containerData.error }, 400)

      const publishRes = await fetch(`${BASE}/${igId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
      })
      const publishData = (await publishRes.json()) as any
      if (publishData.error)
        return j({ success: false, error: `발행 실패: ${publishData.error.message}`, detail: publishData.error }, 400)
      return j({ success: true, mediaId: publishData.id, message: '이미지가 성공적으로 발행되었습니다.' })
    }

    if (mediaType === 'REELS' || mediaType === 'VIDEO') {
      if (!videoUrl) return j({ success: false, error: '동영상 URL(videoUrl)은 필수입니다.' }, 400)
      const containerPayload: any = { media_type: 'REELS', video_url: videoUrl, caption, access_token: token }
      if (coverUrl) containerPayload.cover_url = coverUrl
      const containerRes = await fetch(`${BASE}/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerPayload),
      })
      const containerData = (await containerRes.json()) as any
      if (containerData.error)
        return j({ success: false, error: `릴스 컨테이너 생성 실패: ${containerData.error.message}`, detail: containerData.error }, 400)

      const containerId = containerData.id
      let statusCode = 'IN_PROGRESS'
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const statusRes = await fetch(`${BASE}/${containerId}?fields=status_code,status&access_token=${token}`)
        const statusData = (await statusRes.json()) as any
        statusCode = statusData.status_code || 'IN_PROGRESS'
        if (statusCode === 'FINISHED') break
        if (statusCode === 'ERROR')
          return j({ success: false, error: '동영상 업로드 처리 중 오류가 발생했습니다.', detail: statusData }, 400)
      }
      if (statusCode !== 'FINISHED')
        return j({ success: false, error: '동영상 업로드 대기 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' }, 408)

      const publishRes = await fetch(`${BASE}/${igId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerId, access_token: token }),
      })
      const publishData = (await publishRes.json()) as any
      if (publishData.error)
        return j({ success: false, error: `발행 실패: ${publishData.error.message}`, detail: publishData.error }, 400)
      return j({ success: true, mediaId: publishData.id, message: '릴스/동영상이 성공적으로 발행되었습니다.' })
    }

    return j({ success: false, error: `지원하지 않는 mediaType: ${mediaType}` }, 400)
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
