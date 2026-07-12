import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, logActivity } from '../_utils'

// 환경변수 이름은 SUPERPLACE와 동일: YouTube_Data_API_v3 (+ 흔한 대체 이름 폴백)
function ytKey(env: any): string {
  return env?.YouTube_Data_API_v3 || env?.YOUTUBE_DATA_API_V3 || env?.YOUTUBE_API_KEY || env?.YT_API_KEY || ''
}
const YT = 'https://www.googleapis.com/youtube/v3'

// POST /api/youtube/analyze { query } → YouTube Data API v3 실데이터 채널 분석 (1 크레딧)
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const query = String(body.query || '').trim()
  if (!query) return json({ ok: false, error: '채널명 또는 키워드를 입력하세요.' }, 400)

  const cost = 1
  const spend = await spendCredits(db, me.id, cost, '유튜브 분석', query)
  if (!spend.ok) return json({ ok: false, error: spend.error }, 402)
  const refund = async (reason: string) => {
    await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(cost, me.id).run()
    return json({ ok: false, error: reason, refunded: true }, 200)
  }

  const apiKey = ytKey(env)
  if (!apiKey) return refund('YouTube_Data_API_v3 환경변수가 설정되지 않았습니다.')

  try {
    // 1) 채널 확정: @핸들/UC.. 직접, 아니면 검색
    let channelId = ''
    if (query.startsWith('UC')) channelId = query
    else if (query.startsWith('@')) {
      const h = await (await fetch(`${YT}/channels?part=id&forHandle=${encodeURIComponent(query)}&key=${apiKey}`)).json() as any
      channelId = h.items?.[0]?.id || ''
    }
    if (!channelId) {
      const s = await (await fetch(`${YT}/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&order=relevance&regionCode=KR&key=${apiKey}`)).json() as any
      if (s.error) return refund(s.error.message || 'YouTube API 오류')
      channelId = s.items?.[0]?.id?.channelId || ''
    }
    if (!channelId) return refund('채널을 찾을 수 없습니다.')

    // 2) 채널 통계
    const c = await (await fetch(`${YT}/channels?part=statistics,snippet,brandingSettings&id=${channelId}&key=${apiKey}`)).json() as any
    if (c.error) return refund(c.error.message || 'YouTube API 오류')
    const ch = c.items?.[0]
    if (!ch) return refund('채널 정보를 불러올 수 없습니다.')
    const channel = {
      id: channelId,
      title: ch.snippet?.title || '',
      description: (ch.snippet?.description || '').slice(0, 300),
      thumbnail: ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url || '',
      subscriberCount: Number(ch.statistics?.subscriberCount || 0),
      viewCount: Number(ch.statistics?.viewCount || 0),
      videoCount: Number(ch.statistics?.videoCount || 0),
      publishedAt: ch.snippet?.publishedAt || '',
      country: ch.snippet?.country || '',
    }

    // 3) 최근 영상 12개 → 통계
    const sv = await (await fetch(`${YT}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=12&key=${apiKey}`)).json() as any
    const vids = (sv.items || []).map((it: any) => it.id?.videoId).filter(Boolean)
    let videos: any[] = []
    if (vids.length) {
      const vd = await (await fetch(`${YT}/videos?part=statistics,snippet&id=${vids.join(',')}&key=${apiKey}`)).json() as any
      videos = (vd.items || []).map((v: any) => ({
        id: v.id,
        title: v.snippet?.title || '',
        thumbnail: v.snippet?.thumbnails?.medium?.url || '',
        publishedAt: v.snippet?.publishedAt || '',
        viewCount: Number(v.statistics?.viewCount || 0),
        likeCount: Number(v.statistics?.likeCount || 0),
        commentCount: Number(v.statistics?.commentCount || 0),
      }))
    }

    // 4) 지표 계산
    const n = videos.length || 1
    const avgViews = Math.round(videos.reduce((s, v) => s + v.viewCount, 0) / n)
    const avgLikes = Math.round(videos.reduce((s, v) => s + v.likeCount, 0) / n)
    const avgComments = Math.round(videos.reduce((s, v) => s + v.commentCount, 0) / n)
    const engagementRate = avgViews ? +(((avgLikes + avgComments) / avgViews) * 100).toFixed(2) : 0
    // 업로드 빈도(월): 최근 영상 기간 기반
    let uploadsPerMonth = 0
    if (videos.length >= 2) {
      const newest = +new Date(videos[0].publishedAt)
      const oldest = +new Date(videos[videos.length - 1].publishedAt)
      const months = Math.max(0.5, (newest - oldest) / (1000 * 60 * 60 * 24 * 30))
      uploadsPerMonth = +(videos.length / months).toFixed(1)
    }

    await logActivity(db, me.id, 'credit', `유튜브 분석: ${channel.title} (-${cost})`)
    const fresh: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
    return json({
      ok: true,
      channel,
      videos,
      metrics: { avgViews, avgLikes, avgComments, engagementRate, uploadsPerMonth },
      credits: fresh?.credits ?? null,
    })
  } catch (e: any) {
    return refund(`분석 실패: ${String(e?.message || e).slice(0, 120)}`)
  }
}
