// Ported from SUPERPLACE: GET /api/youtube/video-detail
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })
  const apiKey = (env as any)?.YouTube_Data_API_v3
  if(!apiKey) return j({ok:false, error:'API 키 없음'})
  const reqUrl = new URL(request.url)
  const url = reqUrl.searchParams.get('url') || reqUrl.searchParams.get('id') || ''
  if(!url) return j({ok:false, error:'영상 URL 또는 ID 없음'})

  // Extract video ID
  let videoId = url
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  if(ytMatch) videoId = ytMatch[1]
  else if(url.length !== 11) {
    const simple = url.replace(/^.*[?&]v=/, '').split('&')[0]
    if(simple.length === 11) videoId = simple
  }

  try {
    // 1. 영상 기본 정보 + 통계
    const videoResp = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails,topicDetails&id=${videoId}&key=${apiKey}`
    )
    const videoData = await videoResp.json() as any
    if(videoData.error) return j({ok:false, error: videoData.error.message})
    if(!videoData.items || videoData.items.length === 0) return j({ok:false, error:'영상을 찾을 수 없습니다'})

    const v = videoData.items[0]
    const snippet = v.snippet || {}
    const stats = v.statistics || {}
    const contentDetails = v.contentDetails || {}

    // Duration parse
    const dur = contentDetails.duration || ''
    const durMatch = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    let durationStr = ''
    if(durMatch) {
      const h = parseInt(durMatch[1]||'0'), m = parseInt(durMatch[2]||'0'), s = parseInt(durMatch[3]||'0')
      if(h > 0) durationStr = `${h}시간 ${m}분 ${s}초`
      else if(m > 0) durationStr = `${m}분 ${s}초`
      else durationStr = `${s}초`
    }

    // Engagement rate
    const views = parseInt(stats.viewCount||'0')
    const likes = parseInt(stats.likeCount||'0')
    const comments = parseInt(stats.commentCount||'0')
    const engRate = views > 0 ? ((likes + comments) / views * 100).toFixed(2) : '0'

    // 2. 댓글 상위 10개
    let topComments: any[] = []
    try {
      const cmtResp = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=10&order=relevance&key=${apiKey}`
      )
      const cmtData = await cmtResp.json() as any
      if(cmtData.items) {
        topComments = cmtData.items.map((c:any) => ({
          text: c.snippet?.topLevelComment?.snippet?.textDisplay || '',
          likeCount: c.snippet?.topLevelComment?.snippet?.likeCount || 0,
          author: c.snippet?.topLevelComment?.snippet?.authorDisplayName || ''
        }))
      }
    } catch(e) {}

    // 3. 자막/대본 - YouTube timedtext API (무료, OAuth 불필요) + captions API
    let captions: any[] = []
    let captionText = ''
    let captionFull = ''
    let captionNote = ''
    try {
      const captionListResp = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
      )
      const captionListData = await captionListResp.json() as any
      if(captionListData.items && captionListData.items.length > 0) {
        captions = captionListData.items.map((c:any) => ({
          id: c.id,
          language: c.snippet?.language || '',
          name: c.snippet?.name || '',
          trackKind: c.snippet?.trackKind || ''
        }))
        captionNote = `자막 트랙 ${captions.length}개 확인됨`
      } else {
        captionNote = '이 영상에는 공개 자막이 없습니다.'
      }
    } catch(e) {
      captionNote = '자막 정보를 가져올 수 없습니다.'
    }

    // 3b. YouTube timedtext 무료 API로 자막 전체 텍스트 가져오기
    try {
      // 한국어 우선, 없으면 영어, 없으면 자동생성
      const langPriority = ['ko', 'en', '']
      for(const lang of langPriority) {
        const ttUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
        try {
          const ttResp = await fetch(ttUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' }
          })
          if(ttResp.ok) {
            const ttData = await ttResp.json() as any
            if(ttData && ttData.events) {
              const lines: string[] = []
              ttData.events.forEach((ev: any) => {
                if(ev.segs) {
                  const line = ev.segs.map((s: any) => s.utf8 || '').join('').replace(/\n/g, ' ').trim()
                  if(line && line !== '&nbsp;') lines.push(line)
                }
              })
              if(lines.length > 0) {
                captionFull = lines.join('\n')
                captionNote = `✅ 자막 전체 대본 가져오기 완료 (${lines.length}줄, 언어: ${lang || '자동'})`
                break
              }
            }
          }
        } catch(e2) {}
      }
      // timedtext xml 방식도 시도
      if(!captionFull) {
        const xmlUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=ko&fmt=srv3`
        try {
          const xmlResp = await fetch(xmlUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
          if(xmlResp.ok) {
            const xmlText = await xmlResp.text()
            const textMatches = xmlText.match(/>([^<]+)</g)
            if(textMatches && textMatches.length > 2) {
              captionFull = textMatches.map(m => m.replace(/>/,'').replace(/<$/,'').trim()).filter(Boolean).join('\n')
              if(captionFull.length > 50) captionNote = `✅ XML 자막 대본 추출 완료`
              else captionFull = ''
            }
          }
        } catch(e3) {}
      }
    } catch(e:any) {}

    // 4. 채널 정보
    let channelInfo: any = {}
    try {
      const chResp = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${snippet.channelId}&key=${apiKey}`
      )
      const chData = await chResp.json() as any
      if(chData.items && chData.items.length > 0) {
        const ch = chData.items[0]
        channelInfo = {
          title: ch.snippet?.title || '',
          subscriberCount: ch.statistics?.subscriberCount || '0',
          videoCount: ch.statistics?.videoCount || '0',
          viewCount: ch.statistics?.viewCount || '0',
          thumbnail: ch.snippet?.thumbnails?.default?.url || ''
        }
      }
    } catch(e) {}

    // 5. 태그 및 카테고리 분석
    const tags = snippet.tags || []
    const description = snippet.description || ''

    // Description에서 링크 및 타임스탬프 추출
    const timestamps: string[] = []
    const tsRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]\s*(.+)/g
    let tsMatch
    while((tsMatch = tsRegex.exec(description)) !== null) {
      timestamps.push(`${tsMatch[1]} - ${tsMatch[2].trim()}`)
    }

    return j({
      ok: true,
      videoId,
      title: snippet.title || '',
      channelTitle: snippet.channelTitle || '',
      channelId: snippet.channelId || '',
      publishedAt: snippet.publishedAt || '',
      description,
      thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || '',
      duration: durationStr,
      tags: tags.slice(0, 30),
      stats: {
        viewCount: stats.viewCount || '0',
        likeCount: stats.likeCount || '0',
        commentCount: stats.commentCount || '0',
        favoriteCount: stats.favoriteCount || '0',
        engagementRate: engRate
      },
      channelInfo,
      topComments,
      captions,
      captionText,
      captionFull,
      captionNote,
      timestamps,
      definition: contentDetails.definition || '',
      licensedContent: contentDetails.licensedContent || false
    })
  } catch(e:any) {
    return j({ok:false, error: '서버 오류가 발생했습니다.'||'영상 분석 오류'})
  }
}
