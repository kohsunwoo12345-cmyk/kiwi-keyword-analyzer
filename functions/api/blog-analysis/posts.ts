// Ported from SUPERPLACE: GET /api/blog-analysis/posts (recent-posts alias) — 네이버 RSS 최근 글
const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })

export const onRequestGet: PagesFunction = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const blogId = url.searchParams.get('blogId')
    const count = Math.min(30, parseInt(url.searchParams.get('count') || '15'))
    if (!blogId) return j({ success: false, error: 'blogId가 필요합니다.' }, 400)

    const rssUrl = `https://rss.blog.naver.com/${blogId}.xml`
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
    })

    if (!response.ok) {
      return j({ success: true, posts: [], total: 0 })
    }

    const xml = await response.text()
    const items: any[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match2
    while ((match2 = itemRegex.exec(xml)) !== null) {
      const itemXml = match2[1]
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i) || itemXml.match(/<link[^>]*href="([^"]+)"/i)
      const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i)
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)

      let dateStr = ''
      if (dateMatch) {
        try {
          const d = new Date(dateMatch[1])
          dateStr = d.toISOString().slice(0, 10)
        } catch(e2) { dateStr = dateMatch[1].slice(0, 10) }
      }

      const rawDesc = (descMatch?.[1] || '').replace(/<[^>]+>/g, '').trim()
      items.push({
        title: (titleMatch?.[1] || '').trim(),
        link: (linkMatch?.[1] || '').trim(),
        date: dateStr,
        description: rawDesc.slice(0, 200)
      })

      if (items.length >= count) break
    }

    return j({ success: true, posts: items, total: items.length })
  } catch (error: any) {
    console.error('Posts fetch error:', error)
    return j({ success: true, posts: [], total: 0 })
  }
}
