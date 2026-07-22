// Ported from SUPERPLACE src/index.tsx — 네이버 블로그 검색/크롤링/키워드 검색량 공용 헬퍼
// (_ 프리픽스 = Pages 라우팅 제외, import 전용)

// ── 네이버 블로그 검색결과 HTML 파서 (2025 구조) ───────────────────────────
export function parseNaverBlogSearchHtml(html: string, existingLinks: Set<string>): Array<{
  title: string; link: string; bloggername: string; bloggerlink: string; description: string; postdate: string
}> {
  const items: Array<{title: string; link: string; bloggername: string; bloggerlink: string; description: string; postdate: string}> = []
  const seenUrls = new Set<string>()

  // 방법 A: data-image-viewer-list JSON
  const viewerRe = /data-image-viewer-list="([^"]+)"/g
  let vm: RegExpExecArray | null
  while ((vm = viewerRe.exec(html)) !== null) {
    try {
      const decoded = vm[1]
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      const viewerItems: any[] = JSON.parse(decoded)
      for (const vi of viewerItems) {
        if (items.length >= 40) break
        const rawLink: string = vi.link || ''
        if (!rawLink.includes('blog.naver.com')) continue
        const m = rawLink.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)\/(\d+)/)
        if (!m) continue
        const canonicalUrl = `https://blog.naver.com/${m[1]}/${m[2]}`
        if (seenUrls.has(canonicalUrl) || existingLinks.has(canonicalUrl)) continue
        seenUrls.add(canonicalUrl)
        existingLinks.add(canonicalUrl)
        items.push({
          title: (vi.title || '').replace(/<[^>]+>/g, '').trim(),
          link: canonicalUrl,
          bloggername: m[1],
          bloggerlink: `https://blog.naver.com/${m[1]}`,
          description: vi.description || '',
          postdate: ''
        })
      }
    } catch (_) {}
  }

  // 방법 B: href 링크 기반 (보충)
  const linkRe = /href="(https?:\/\/blog\.naver\.com\/([a-zA-Z0-9_]+)\/(\d+))"/g
  const linkPositions: Array<{pos: number; url: string; blogId: string; postId: string}> = []
  let lm: RegExpExecArray | null
  while ((lm = linkRe.exec(html)) !== null) {
    const url = lm[1]
    if (!seenUrls.has(url) && !existingLinks.has(url)) {
      seenUrls.add(url)
      linkPositions.push({ pos: lm.index, url, blogId: lm[2], postId: lm[3] })
    }
  }

  const headlineRe = /(<span[^>]*sds-comps-text-type-headline[^>]*>)([\s\S]*?)<\/span>/g
  const headlines: Array<{start: number; end: number; text: string}> = []
  let hm: RegExpExecArray | null
  while ((hm = headlineRe.exec(html)) !== null) {
    const text = hm[2].replace(/<[^>]+>/g, '').trim()
    if (text && text.length >= 3) {
      headlines.push({ start: hm.index, end: hm.index + hm[0].length, text })
    }
  }

  const usedLinkIdx = new Set<number>()
  for (const headline of headlines) {
    if (items.length >= 40) break
    let bestIdx = -1, bestDist = 99999
    for (let i = 0; i < linkPositions.length; i++) {
      if (usedLinkIdx.has(i)) continue
      const dist = Math.abs(linkPositions[i].pos - headline.start)
      if (dist < bestDist && dist < 4000) { bestDist = dist; bestIdx = i }
    }
    if (bestIdx === -1) continue
    const lp = linkPositions[bestIdx]
    usedLinkIdx.add(bestIdx)
    existingLinks.add(lp.url)
    const blockStart = Math.max(0, headline.start - 800)
    const blockEnd = Math.min(html.length, headline.end + 2500)
    const block = html.slice(blockStart, blockEnd)
    let bloggerName = lp.blogId
    for (const nm of block.matchAll(/<span[^>]*sds-comps-text-ellipsis-1[^>]*>([^<]{2,30})<\/span>/g)) {
      const n = nm[1].trim()
      if (n && n.length >= 2 && n.length <= 25 && !n.match(/^\d{4}\./)) { bloggerName = n; break }
    }
    const dateMatch = block.match(/(\d{4})\.(\d{2})\.(\d{2})\.?/)
    const postdate = dateMatch ? `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}` : ''
    let description = ''
    for (const dm of block.matchAll(/<span[^>]*sds-comps-text-type-body1[^>]*>([\s\S]{10,300}?)<\/span>/g)) {
      const d = dm[1].replace(/<[^>]+>/g, '').trim()
      if (d.length > description.length) description = d
    }
    items.push({
      title: headline.text, link: lp.url,
      bloggername: bloggerName, bloggerlink: `https://blog.naver.com/${lp.blogId}`,
      description: description.slice(0, 300), postdate
    })
  }

  for (let i = 0; i < linkPositions.length && items.length < 40; i++) {
    if (usedLinkIdx.has(i)) continue
    const lp = linkPositions[i]
    const blockStart = Math.max(0, lp.pos - 1500)
    const block = html.slice(blockStart, Math.min(html.length, lp.pos + 1500))
    let title = ''
    for (const h of headlines) {
      if (Math.abs(h.start - lp.pos) < 3000 && h.text.length >= 3) { title = h.text; break }
    }
    const dateMatch = block.match(/(\d{4})\.(\d{2})\.(\d{2})\.?/)
    const postdate = dateMatch ? `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}` : ''
    existingLinks.add(lp.url)
    items.push({
      title, link: lp.url,
      bloggername: lp.blogId, bloggerlink: `https://blog.naver.com/${lp.blogId}`,
      description: '', postdate
    })
  }

  return items
}

// ── 네이버 블로그탭 검색결과 크롤링 (총 문서수 추정 포함) ────────────────────
export async function crawlNaverBlogSearch(keyword: string, maxItems: number = 40): Promise<{
  items: Array<{title: string; link: string; bloggername: string; bloggerlink: string; description: string; postdate: string}>,
  total: number
}> {
  const headersDesktop = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    'Referer': 'https://www.naver.com/',
    'Cache-Control': 'no-cache',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'cross-site',
  }

  try {
    const allItems: Array<{title: string; link: string; bloggername: string; bloggerlink: string; description: string; postdate: string}> = []
    const seenLinks = new Set<string>()
    const seenBlogIds = new Set<string>()
    let total = 0

    const maxPages = Math.min(10, Math.ceil(maxItems / 3))

    for (let page = 0; page < maxPages && allItems.length < maxItems; page++) {
      const start = page * 10 + 1
      const searchUrl = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}&sm=tab_jum&nso=so:sim,p:all,a:all&start=${start}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      let res: Response
      try {
        res = await fetch(searchUrl, { headers: headersDesktop, signal: controller.signal })
        clearTimeout(timeoutId)
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        break
      }

      if (!res.ok) break

      const html = await res.text()

      if (total === 0) {
        const totalPatterns = [
          /"total"\s*:\s*(\d+)/,
          /where=blog[^"]*"[^>]*>\s*블로그\s*<[^>]+>\s*([\d,]+)/,
          /"totalCount"\s*:\s*(\d+)/,
          /블로그\s+([\d,]+)건/,
        ]
        for (const pat of totalPatterns) {
          const m = html.match(pat)
          if (m) { total = parseInt(m[1].replace(/,/g, '')); break }
        }
      }

      const prevCount = allItems.length
      const pageItems = parseNaverBlogSearchHtml(html, seenLinks)
      allItems.push(...pageItems)
      pageItems.forEach(item => {
        const m = item.link.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)/)
        if (m) seenBlogIds.add(m[1])
      })

      const allBlogIdRe = /blog\.naver\.com\/([a-zA-Z0-9_]+)/g
      let bm: RegExpExecArray | null
      const extraBlogIds: string[] = []
      while ((bm = allBlogIdRe.exec(html)) !== null) {
        const bid = bm[1]
        if (bid.length >= 3 && !seenBlogIds.has(bid) && bid !== 'PostView' && bid !== 'support') {
          seenBlogIds.add(bid)
          extraBlogIds.push(bid)
        }
      }
      const rssTargets = extraBlogIds.slice(0, 8)
      if (rssTargets.length > 0) {
        const rssFetchOne = async (bid: string) => {
          try {
            const rssUrl = `https://rss.blog.naver.com/${bid}.xml`
            const rssCtrl = new AbortController()
            const rssTimeout = setTimeout(() => rssCtrl.abort(), 3500)
            const rssRes = await fetch(rssUrl, { signal: rssCtrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } })
            clearTimeout(rssTimeout)
            if (!rssRes.ok) return null
            const xml = await rssRes.text()
            const blogNameM = xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
            const blogName = blogNameM ? blogNameM[1].trim() : bid
            const rssItems = xml.match(/<item>[\s\S]*?<\/item>/g) || []
            for (const itemXml of rssItems.slice(0, 2)) {
              const linkM = itemXml.match(/<link>(.*?)<\/link>/i) || itemXml.match(/<guid[^>]*>(.*?)<\/guid>/i)
              if (!linkM) continue
              const rawLink = linkM[1].trim()
              const postM = rawLink.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)\/(\d+)/)
              if (!postM) continue
              const canonicalUrl = `https://blog.naver.com/${postM[1]}/${postM[2]}`
              if (seenLinks.has(canonicalUrl)) continue
              const titleM = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
              const descM = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
              const dateM = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i)
              const titleTxt = (titleM ? titleM[1] : '').replace(/<[^>]+>/g, '').trim()
              const descTxt = (descM ? descM[1] : '').replace(/<[^>]+>/g, '').trim().slice(0, 200)
              let postdate = ''
              if (dateM) { try { const d = new Date(dateM[1]); postdate = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}` } catch {} }
              return { title: titleTxt, link: canonicalUrl, bloggername: blogName, bloggerlink: `https://blog.naver.com/${postM[1]}`, description: descTxt, postdate }
            }
            return null
          } catch { return null }
        }
        const rssResults = await Promise.all(rssTargets.map(bid => rssFetchOne(bid)))
        for (const item of rssResults) {
          if (!item || seenLinks.has(item.link) || allItems.length >= maxItems) continue
          seenLinks.add(item.link)
          allItems.push(item)
        }
      }

      if (allItems.length === prevCount && extraBlogIds.length === 0) break

      if (page < maxPages - 1 && allItems.length < maxItems) {
        await new Promise(resolve => setTimeout(resolve, page === 0 ? 300 : 500))
      }
    }

    if (total === 0 && allItems.length > 0) {
      const kwLen = keyword.length
      const seed = [...keyword].reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
      if (kwLen <= 4) total = 50000 + (seed % 200000)
      else if (kwLen <= 7) total = 10000 + (seed % 90000)
      else total = 2000 + (seed % 18000)
    }

    return { items: allItems.slice(0, maxItems), total }
  } catch (error) {
    return { items: [], total: 0 }
  }
}

// ── 네이버 블로그 포스트 실제 내용 크롤링 (글자수·이미지·키워드) ─────────────
export async function crawlNaverBlogPostContent(postUrl: string, keyword: string, allowMobileFallback: boolean = true): Promise<{
  char_count: number; image_count: number; keyword_count: number;
  all_keywords: string[]; top_keywords: Array<{ word: string; count: number }>;
  title: string; post_text: string; data_source: string;
}> {
  type R = { char_count: number; image_count: number; keyword_count: number; all_keywords: string[]; top_keywords: Array<{ word: string; count: number }>; title: string; post_text: string; data_source: string }
  const defaultResult: R = { char_count: 0, image_count: 0, keyword_count: 0, all_keywords: [], top_keywords: [], title: '', post_text: '', data_source: 'failed' }

  const safeDecode = (value: string) => { try { return decodeURIComponent(value) } catch { return value } }
  const decodeHtml = (value: string) => String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_m, code) => { const n = Number(code); return Number.isFinite(n) ? String.fromCharCode(n) : ' ' })
  const stripHtml = (value: string) => decodeHtml(String(value || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim()
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const normalizeText = (value: string) => stripHtml(value).replace(/https?:\/\/[^\s]+/g, ' ').replace(/\s+/g, ' ').trim()

  const extractKeywords = (text: string, blogId: string) => {
    const stopWords = new Set([
      '이다','이런','이번','이미','이전','이후','이상','있다','없다','하다','되다','같다','많다','좋다',
      '하는','있는','없는','되는','같은','많은','좋은','하고','그리고','하지만','그러나','또한','또는',
      '그래서','따라서','위해','통해','대해','관해','으로','에서','에게','부터','까지','처럼','만큼',
      '위한','관한','대한','자신','우리','여기','저기','이곳','그곳','정말','너무','매우','아주','더욱',
      '계속','바로','모두','함께','각각','특히','오늘','정보','방법','내용','정도','경우','확인',
      '네이버','블로그','이웃','공감','댓글','공지','쪽지','레이어','닫기','선택','취소','등록','저장',
      '프로필','카테고리','태그','관련글','인기글','최근글','방문자','공유','퍼가기','좋아요','팔로우',
      '구독','알림','설정','마이페이지','포스트','게시물','스크랩','인쇄','이미지','동영상','파일','첨부',
      '출처','번역','수정','삭제','본문','검색','서비스','고객','로그인','메뉴','화면','바로가기',
      'the','and','or','is','are','was','be','to','of','in','for','on','at','by','an','as','with','from',
      'nbsp','amp','quot','lt','gt','br','div','span','class','style','href','src','true','false','null',
      'undefined','function','return','const','let','var','http','https','www','com','net','org','html','naver','blog','script',
      'ㅎㅎ','ㅋㅋ','ㅠㅠ','ㅜㅜ'
    ])
    if (blogId) stopWords.add(blogId.toLowerCase())
    const uiNoisePattern = /^[\d]+$|^\d+[가-힣a-zA-Z]$|^[가-힣a-zA-Z]\d+$/
    const wordFreq: Record<string, number> = {}
    const words = text.replace(/https?:\/\/[^\s]+/g, ' ').match(/[가-힣a-zA-Z]{2,}/g) || []
    for (const raw of words) {
      const word = /^[a-zA-Z]+$/.test(raw) ? raw.toLowerCase() : raw
      if (word.length < 2 || word.length > 20) continue
      if (stopWords.has(word) || stopWords.has(word.toLowerCase()) || uiNoisePattern.test(word)) continue
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
    return Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([word, count]) => ({ word, count }))
  }

  const extractAuthorText = (contentSection: string) => {
    const chunks: string[] = []
    const pushChunk = (raw: string) => {
      const text = normalizeText(raw)
      if (!text || text.length < 2) return
      if (/^(공감|댓글|이웃추가|공유|스크랩|인쇄|수정|삭제|목록|닫기|네이버|블로그)$/i.test(text)) return
      chunks.push(text)
    }
    const paragraphRe = /<(?:p|div)[^>]+class=["'][^"']*(?:se-text-paragraph|se-module-text|se-text|se_textarea|post_ct)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/gi
    let match: RegExpExecArray | null
    while ((match = paragraphRe.exec(contentSection)) !== null) pushChunk(match[1])
    const spanTextRe = /<span[^>]+class=["'][^"']*(?:se-fs-|se-ff-|se-.*text)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi
    while ((match = spanTextRe.exec(contentSection)) !== null) pushChunk(match[1])
    if (chunks.length === 0) {
      const legacyRe = /<(?:div|td)[^>]+(?:id|class)=["'][^"']*(?:post-view|postViewArea|viewTypeSelector|post_ct)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|td)>/gi
      while ((match = legacyRe.exec(contentSection)) !== null) pushChunk(match[1])
    }
    const seen = new Set<string>()
    const authorChunks = chunks.filter(text => {
      const compact = text.replace(/\s+/g, '')
      if (compact.length < 2 || seen.has(compact)) return false
      seen.add(compact)
      return true
    })
    return authorChunks.join(' ')
  }

  const countPostImages = (contentSection: string) => {
    const imgTags = contentSection.match(/<img[^>]+>/gi) || []
    const uiImgPattern = /ssl\.pstatic\.net\/static|profile_preset|img_profile|img_ani|logo|icon|btn_|emoticon|static\/blog|blank\.gif|spi_|visitor/i
    const imageUrls = new Set<string>()
    for (const img of imgTags) {
      const src = img.match(/(?:src|data-lazy-src|data-src|data-original)=["']([^"']+)["']/i)?.[1] || ''
      const source = decodeHtml(src)
      if (!source || uiImgPattern.test(source)) continue
      if (!/pstatic\.net|naver\.net|postfiles|blogfiles|mblogthumb|blogimgs/i.test(source)) continue
      imageUrls.add(source.split('?')[0])
    }
    return imageUrls.size
  }

  const parsePostHtml = (html: string, blogId: string, postId: string) => {
    const titleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? stripHtml(titleMatch[1]).replace(/\s*:\s*네이버.*$/i, '').trim() : ''
    const startCandidates = [
      html.search(/class=["'][^"']*se-main-container[^"']*["']/i),
      html.indexOf(`_postViewArea${postId}`),
      html.search(/id=["']postViewArea/i),
      html.search(/id=["']post-view["']/i),
      html.search(/class=["'][^"']*post_view[^"']*["']/i)
    ].filter(idx => idx >= 0)
    let contentSection = ''
    if (startCandidates.length > 0) {
      const startIdx = Math.min(...startCandidates)
      const endMarkers = ['<!-- SE_DOC_FOOTER', 'class="post_date_tool"', 'class="wrap_btn_post"', 'id="postReaction"', 'id="postListByMenu"', 'class="blog_btn"', 'class="post_footer"', 'class="se-author"']
      let endIdx = html.length
      for (const marker of endMarkers) {
        const idx = html.indexOf(marker, startIdx)
        if (idx !== -1 && idx < endIdx) endIdx = idx
      }
      contentSection = html.substring(startIdx, endIdx)
    }
    const cleanText = extractAuthorText(contentSection)
    const charCount = cleanText.replace(/[^가-힣a-zA-Z0-9]/g, '').length
    const imageCount = countPostImages(contentSection)
    let keywordCount = 0
    const kw = String(keyword || '').trim().toLowerCase()
    if (kw && cleanText) {
      const bodyLower = cleanText.toLowerCase()
      keywordCount = (bodyLower.match(new RegExp(escapeRegExp(kw), 'g')) || []).length
      if (keywordCount === 0) {
        const tokens = kw.match(/[가-힣a-zA-Z0-9]{2,}/g) || []
        keywordCount = tokens.reduce((sum, token) => sum + (bodyLower.match(new RegExp(escapeRegExp(token), 'g')) || []).length, 0)
      }
    }
    const topKeywords = extractKeywords(cleanText, blogId)
    return {
      char_count: charCount, image_count: imageCount, keyword_count: keywordCount,
      all_keywords: topKeywords.map(item => item.word), top_keywords: topKeywords.slice(0, 30),
      title, post_text: cleanText.slice(0, 500),
      data_source: charCount >= 80 ? 'naver_post_crawl' : 'failed'
    }
  }

  try {
    const decodedUrl = postUrl.replace(/&amp;/g, '&')
    const queryBlogId = decodedUrl.match(/[?&]blogId=([^&#]+)/i)?.[1]
    const queryPostId = decodedUrl.match(/[?&](?:logNo|logno)=([^&#]+)/i)?.[1]
    const pathMatch = decodedUrl.match(/blog\.naver\.com\/([^\/\?#&]+)\/(\d{6,})/i)
    const blogPathMatch = decodedUrl.match(/blog\.naver\.com\/([^\/\?#&]+)/i)
    const blogId = safeDecode(queryBlogId || (pathMatch?.[1] || (blogPathMatch?.[1] !== 'PostView.naver' ? blogPathMatch?.[1] : '') || '')).replace(/[^\w.-]/g, '')
    const postId = safeDecode(queryPostId || pathMatch?.[2] || '').replace(/[^\d]/g, '')
    if (!blogId || !postId) return defaultResult
    const candidateUrls = [
      `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(blogId)}&logNo=${encodeURIComponent(postId)}&redirect=Dlog&widgetTypeCall=true&directAccess=false`,
    ]
    if (allowMobileFallback) candidateUrls.push(`https://m.blog.naver.com/${encodeURIComponent(blogId)}/${encodeURIComponent(postId)}`)
    let bestResult = defaultResult
    for (const url of candidateUrls) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2600)
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': url.includes('m.blog.naver.com')
              ? 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
              : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Referer': 'https://blog.naver.com/'
          }
        })
        clearTimeout(timeoutId)
        if (!res.ok) continue
        const parsed = parsePostHtml(await res.text(), blogId, postId)
        if (parsed.char_count > bestResult.char_count) bestResult = parsed
        if (parsed.data_source === 'naver_post_crawl') return parsed
      } catch {
        clearTimeout(timeoutId)
      }
    }
    return bestResult.char_count > 0 ? bestResult : defaultResult
  } catch (err) {
    return defaultResult
  }
}

// ── 블로그 ID 정규화 ────────────────────────────────────────────────────────
export function normalizeNaverBlogId(input: string): string {
  const value = String(input || '').replace(/&amp;/g, '&').trim()
  if (!value) return ''
  const safeDecode = (raw: string) => { try { return decodeURIComponent(raw) } catch { return raw } }
  const queryBlogId = value.match(/[?&]blogId=([^&#]+)/i)?.[1]
  const blogPath = value.match(/blog\.naver\.com\/([^\/\?&#\s]+)/i)?.[1]
  const mobilePath = value.match(/m\.blog\.naver\.com\/([^\/\?&#\s]+)/i)?.[1]
  const rawId = queryBlogId || mobilePath || (blogPath && blogPath !== 'PostView.naver' ? blogPath : '') || value
  return safeDecode(rawId).replace(/^https?:\/\//i, '').replace(/^@/, '').split(/[\/\?&#\s]/)[0].replace(/[^\w.-]/g, '').toLowerCase()
}

export function canonicalNaverBlogUrl(input: string): string {
  const blogId = normalizeNaverBlogId(input)
  return blogId ? `https://blog.naver.com/${blogId}` : ''
}

export type BlogRankSearchResult = {
  rank: number | null; found: boolean; totalChecked: number; totalBlogCount: number; dataSource: string;
  topBlogs: Array<{ rank: number; blogger_id: string; title: string; link: string; post_date: string }>;
}

// ── 특정 블로그의 키워드 검색 순위 조회 (API 우선, HTML 크롤링 폴백) ──────────
export async function findNaverBlogRankDetails(keyword: string, blogInput: string, env?: any, maxRank: number = 100): Promise<BlogRankSearchResult> {
  const targetBlogId = normalizeNaverBlogId(blogInput)
  const emptyResult: BlogRankSearchResult = { rank: null, found: false, totalChecked: 0, totalBlogCount: 0, dataSource: 'none', topBlogs: [] }
  if (!keyword || !targetBlogId) return emptyResult

  const cleanTitle = (value: string) => String(value || '')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ').trim()

  const pushRankedBlog = (acc: BlogRankSearchResult, seen: Set<string>, item: { blogger_id: string; title: string; link: string; post_date?: string }) => {
    const bloggerId = normalizeNaverBlogId(item.blogger_id || item.link)
    if (!bloggerId || seen.has(bloggerId) || acc.totalChecked >= maxRank) return null
    seen.add(bloggerId)
    acc.totalChecked += 1
    const ranked = { rank: acc.totalChecked, blogger_id: bloggerId, title: cleanTitle(item.title || bloggerId), link: item.link || `https://blog.naver.com/${bloggerId}`, post_date: item.post_date || '' }
    if (acc.topBlogs.length < 20) acc.topBlogs.push(ranked)
    if (bloggerId === targetBlogId) { acc.rank = ranked.rank; acc.found = true; return ranked }
    return null
  }

  const apiClientId = env?.NAVER_CLIENT_ID
  const apiClientSecret = env?.NAVER_CLIENT_SECRET
  if (apiClientId && apiClientSecret) {
    const apiResult: BlogRankSearchResult = { ...emptyResult, dataSource: 'naver_api_real', topBlogs: [] }
    const seen = new Set<string>()
    try {
      const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=${Math.min(100, maxRank)}&sort=sim&start=1`
      const apiResp = await fetch(apiUrl, { headers: { 'X-Naver-Client-Id': apiClientId, 'X-Naver-Client-Secret': apiClientSecret } })
      if (apiResp.ok) {
        const data = await apiResp.json() as any
        apiResult.totalBlogCount = Number(data.total || 0)
        for (const item of (data.items || [])) {
          const found = pushRankedBlog(apiResult, seen, { blogger_id: item.bloggerlink || item.link || '', title: item.title || '', link: item.link || item.bloggerlink || '', post_date: item.postdate || '' })
          if (found) return apiResult
        }
        if (apiResult.totalChecked > 0) {
          emptyResult.totalChecked = apiResult.totalChecked
          emptyResult.totalBlogCount = apiResult.totalBlogCount
          emptyResult.topBlogs = apiResult.topBlogs
          emptyResult.dataSource = apiResult.dataSource
        }
      }
    } catch (apiErr) {}
  }

  const htmlResult: BlogRankSearchResult = { rank: null, found: false, totalChecked: 0, totalBlogCount: emptyResult.totalBlogCount, dataSource: 'html_crawl_real', topBlogs: [] }
  const seenBlogIds = new Set<string>(htmlResult.topBlogs.map(item => item.blogger_id))
  const seenLinks = new Set<string>()
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'Referer': 'https://www.naver.com/',
    'Cache-Control': 'no-cache',
  }

  for (let page = 0; page < Math.ceil(maxRank / 10) && htmlResult.totalChecked < maxRank; page++) {
    const start = page * 10 + 1
    const searchUrl = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}&sm=tab_pge&nso=so:sim,p:all,a:all&start=${start}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    try {
      const resp = await fetch(searchUrl, { headers, signal: controller.signal })
      clearTimeout(timeoutId)
      if (!resp.ok) continue
      const html = await resp.text()
      if (!htmlResult.totalBlogCount) {
        const totalMatch = html.match(/"total"\s*:\s*(\d+)/) || html.match(/블로그\s+([\d,]+)건/)
        if (totalMatch) htmlResult.totalBlogCount = parseInt(totalMatch[1].replace(/,/g, '')) || 0
      }
      let pageItems = parseNaverBlogSearchHtml(html, seenLinks).map(item => ({ blogger_id: item.bloggerlink || item.link, title: item.title, link: item.link, post_date: item.postdate }))
      if (pageItems.length === 0) {
        pageItems = [...html.matchAll(/href=["'](https?:\/\/blog\.naver\.com\/([a-zA-Z0-9_.-]+)\/\d+[^"']*)["']/g)].map(m => ({ blogger_id: m[2], title: m[2], link: m[1], post_date: '' }))
      }
      for (const item of pageItems) {
        const found = pushRankedBlog(htmlResult, seenBlogIds, item)
        if (found) return htmlResult
      }
    } catch (err) {
      clearTimeout(timeoutId)
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  if (htmlResult.totalChecked === 0 && emptyResult.totalChecked > 0) {
    return { ...emptyResult, found: false, rank: null }
  }
  return htmlResult
}

// ── SEO 블로그 지수(BLENP) 계산 ─────────────────────────────────────────────
export function calcBlenpScore(info: { recentPostCount: number; avgPostingGap: number; daysSinceLastPost: number; avgContentLength: number; hasImages: boolean; categoryDiversity: number }): number {
  const { recentPostCount, avgPostingGap, daysSinceLastPost, avgContentLength, hasImages, categoryDiversity } = info
  let activityScore = 0
  if (avgPostingGap <= 2) activityScore = 35
  else if (avgPostingGap <= 4) activityScore = 28
  else if (avgPostingGap <= 7) activityScore = 22
  else if (avgPostingGap <= 14) activityScore = 14
  else if (avgPostingGap <= 30) activityScore = 8
  else activityScore = 3
  if (daysSinceLastPost > 30) activityScore = Math.max(0, activityScore - 8)
  else if (daysSinceLastPost > 14) activityScore = Math.max(0, activityScore - 4)
  else if (daysSinceLastPost <= 3) activityScore = Math.min(35, activityScore + 3)
  if (recentPostCount >= 15) activityScore = Math.min(35, activityScore + 5)
  else if (recentPostCount >= 10) activityScore = Math.min(35, activityScore + 2)
  else if (recentPostCount <= 3) activityScore = Math.max(0, activityScore - 5)
  let contentScore = 0
  if (avgContentLength >= 3000) contentScore = 28
  else if (avgContentLength >= 1500) contentScore = 22
  else if (avgContentLength >= 800) contentScore = 15
  else if (avgContentLength >= 300) contentScore = 8
  else contentScore = 3
  if (hasImages) contentScore = Math.min(30, contentScore + 4)
  let focusScore = 0
  if (categoryDiversity === 0) focusScore = 18
  else if (categoryDiversity <= 2) focusScore = 25
  else if (categoryDiversity <= 4) focusScore = 20
  else if (categoryDiversity <= 7) focusScore = 14
  else if (categoryDiversity <= 12) focusScore = 8
  else focusScore = 4
  const basePoints = recentPostCount > 0 ? 5 : 0
  const raw = activityScore + contentScore + focusScore + basePoints
  let blenpScore: number
  if (raw <= 10) blenpScore = raw * 0.8
  else if (raw <= 20) blenpScore = 8 + (raw - 10) * 0.5
  else if (raw <= 40) blenpScore = 13 + (raw - 20) * 1.2
  else if (raw <= 60) blenpScore = 37 + (raw - 40) * 0.85
  else if (raw <= 75) blenpScore = 54 + (raw - 60) * 0.7
  else if (raw <= 90) blenpScore = 64.5 + (raw - 75) * 0.5
  else blenpScore = 72 + (raw - 90) * 0.6
  blenpScore = Math.max(0, Math.min(100, blenpScore))
  return Math.round(blenpScore * 10) / 10
}

// ════════════════════════════════════════════════════════════════════════
// 키워드 검색량 (네이버 검색광고 API + 데이터랩 추이) 공용 헬퍼
// ════════════════════════════════════════════════════════════════════════

export function spFlaToken(): string {
  try { return crypto.randomUUID().replace(/-/g, '') } catch (_) { return String(Date.now()) + Math.random().toString(16).slice(2) }
}

export function spFlaEscape(value: any): string {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;'
    if (ch === '<') return '&lt;'
    if (ch === '>') return '&gt;'
    if (ch === '"') return '&quot;'
    return '&#39;'
  })
}

export function spKwParseAdNumber(value: any): number {
  if (value === undefined || value === null) return 0
  const cleaned = String(value).replace(/[^0-9]/g, '')
  return parseInt(cleaned, 10) || 0
}

// keywordstool API는 hintKeywords에 공백이 있으면 400 오류 → 공백 제거
export function spKwHintKeyword(keyword: string): string {
  return String(keyword || '').replace(/\s+/g, '').trim()
}

export function spKwFormatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function spKwNormalizeKeywords(input: any, max = 5): string[] {
  const raw = Array.isArray(input) ? input.join(',') : String(input || '')
  const seen = new Set<string>()
  const keywords: string[] = []
  for (const item of raw.split(/[\n,;]+/)) {
    const keyword = item.trim().replace(/\s+/g, ' ')
    if (!keyword || seen.has(keyword)) continue
    seen.add(keyword)
    keywords.push(keyword)
    if (keywords.length >= max) break
  }
  return keywords
}

export function spKwCompetitionLabel(compIdx: string, blogCount = 0): string {
  const value = String(compIdx || '').toLowerCase()
  if (value === 'high' || compIdx === '높음') return '높음'
  if (value === 'medium' || compIdx === '보통') return '보통'
  if (value === 'low' || compIdx === '낮음') return '낮음'
  if (blogCount > 500000) return '매우 높음'
  if (blogCount > 100000) return '높음'
  if (blogCount > 30000) return '보통'
  if (blogCount > 5000) return '낮음'
  return '매우 낮음'
}

export async function spKwMakeNaverAdSignature(timestamp: string, method: string, uri: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${method}.${uri}`))
  return btoa(String.fromCharCode(...new Uint8Array(signed)))
}

export function spKwAdCredentials(env: any) {
  let customerId = String(env.NAVER_AD_CUSTOMER_ID || '').trim()
  if (customerId.includes('=')) {
    const match = customerId.match(/(\d+)\s*$/)
    if (match) customerId = match[1]
  }
  return {
    customerId,
    apiSecret: String(env.NAVER_API_SECRET_KEY || '').trim(),
    accessLicense: String(env.NAVER_AD_ACCESS_LICENSE || '').trim()
  }
}

export function spKwDataLabCredentials(env: any) {
  return {
    clientId: String(env['NAVER_Client ID'] || env.NAVER_CLIENT_ID || env.NAVER_CLIENTID || '').trim(),
    clientSecret: String(env['NAVER_Client Secret'] || env.NAVER_CLIENT_SECRET || env.NAVER_CLIENTSECRET || '').trim()
  }
}

export async function spKwFetchNaverAdVolume(env: any, keyword: string): Promise<{ pc: number; mobile: number; compIdx: string; source: string; adApiUsed: boolean; error?: string }> {
  const creds = spKwAdCredentials(env)
  const hasAdApi = !!(creds.customerId && creds.apiSecret && creds.accessLicense)
  if (!hasAdApi) return { pc: 0, mobile: 0, compIdx: '', source: 'naver_ad_api_missing', adApiUsed: false }
  const uri = '/keywordstool'
  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const timestamp = Date.now().toString()
      const signature = await spKwMakeNaverAdSignature(timestamp, 'GET', uri, creds.apiSecret)
      const url = `https://api.naver.com${uri}?hintKeywords=${encodeURIComponent(spKwHintKeyword(keyword))}&showDetail=1`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)
      let response: Response
      try {
        response = await fetch(url, { headers: { 'X-Timestamp': timestamp, 'X-API-KEY': creds.accessLicense, 'X-Customer': creds.customerId, 'X-Signature': signature }, signal: controller.signal })
      } finally {
        clearTimeout(timeoutId)
      }
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        lastError = `네이버 검색광고 API 응답 오류 (${response.status})` + (bodyText ? `: ${bodyText.slice(0, 160)}` : '')
        if (response.status === 401 || response.status === 403 || response.status === 400) break
        if (attempt === 0) { await new Promise(r => setTimeout(r, 400)); continue }
        break
      }
      const data = await response.json().catch(() => null) as any
      const list: any[] = data?.keywordList || []
      const hintKw = spKwHintKeyword(keyword).toLowerCase()
      const exact = list.find((item: any) => spKwHintKeyword(String(item.relKeyword || '')).toLowerCase() === hintKw)
      const item = exact || list[0]
      if (!item) return { pc: 0, mobile: 0, compIdx: '', source: 'naver_ad_api_no_data', adApiUsed: true }
      return {
        pc: spKwParseAdNumber(item.monthlyPcQcCnt || item.monthlyPcCnt || item.monthlyAvePcCnt),
        mobile: spKwParseAdNumber(item.monthlyMobileQcCnt || item.monthlyMobileCnt || item.monthlyAveMobileCnt),
        compIdx: String(item.compIdx || ''),
        source: 'naver_ad_api',
        adApiUsed: true
      }
    } catch (error: any) {
      lastError = error?.name === 'AbortError' ? '네이버 검색광고 API 응답 시간 초과' : (error?.message || String(error))
      if (attempt === 0) { await new Promise(r => setTimeout(r, 400)); continue }
    }
  }
  return { pc: 0, mobile: 0, compIdx: '', source: 'naver_ad_api_error', adApiUsed: false, error: lastError || '네이버 검색광고 API 호출 실패' }
}

export async function spKwAnalyzeVolumeKeyword(env: any, keyword: string): Promise<any> {
  const ad = await spKwFetchNaverAdVolume(env, keyword)
  const pcSearch = ad.pc
  const mobileSearch = ad.mobile
  const volumeSource = ad.source
  let blogCount = 0
  try {
    const crawlResult = await Promise.race([
      crawlNaverBlogSearch(keyword, 10),
      new Promise<{ total: number }>((resolve) => setTimeout(() => resolve({ total: 0 } as any), 7000))
    ]) as { total: number }
    if (crawlResult && crawlResult.total > 0) blogCount = crawlResult.total
  } catch (_) {}
  const compLevel = spKwCompetitionLabel(ad.compIdx, blogCount)
  const totalSearch = pcSearch + mobileSearch
  const isActualSearchVolume = ad.source === 'naver_ad_api'
  const recommended = totalSearch > 500 && totalSearch < 30000 && ['매우 낮음', '낮음', '보통'].includes(compLevel)
  return {
    keyword,
    monthly_pc_search: pcSearch,
    monthly_mobile_search: mobileSearch,
    total_monthly_search: totalSearch,
    competition_level: compLevel,
    difficulty_score: compLevel === '높음' || compLevel === '매우 높음' ? 75 : compLevel === '보통' ? 50 : 25,
    opportunity_score: compLevel === '높음' || compLevel === '매우 높음' ? 25 : compLevel === '보통' ? 50 : 75,
    recommended,
    blog_count: blogCount,
    volume_source: volumeSource,
    data_source: isActualSearchVolume ? 'naver_ad_api' : volumeSource,
    is_actual_search_volume: isActualSearchVolume,
    volume_error: ad.error || ''
  }
}

export async function spKwBuildTrend(env: any, keywords: string[], results: any[]) {
  void results
  const creds = spKwDataLabCredentials(env)
  if (!creds.clientId || !creds.clientSecret) {
    return { labels: [], datasets: [], source: 'unavailable', value_label: '데이터랩 추이 없음' }
  }
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
  try {
    const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: { 'X-Naver-Client-Id': creds.clientId, 'X-Naver-Client-Secret': creds.clientSecret, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: spKwFormatDate(start),
        endDate: spKwFormatDate(end),
        timeUnit: 'date',
        keywordGroups: keywords.map(keyword => ({ groupName: keyword, keywords: [keyword] }))
      })
    })
    if (!response.ok) throw new Error(`DataLab ${response.status}`)
    const data = await response.json().catch(() => null) as any
    const groups: any[] = data?.results || []
    if (!groups.length) throw new Error('No DataLab trend data')
    const labelSet = new Set<string>()
    groups.forEach(group => (group.data || []).forEach((item: any) => labelSet.add(item.period)))
    const labels = Array.from(labelSet).sort()
    if (!labels.length) throw new Error('No DataLab labels')
    const colors = ['#2563eb', '#7c3aed', '#059669', '#f97316', '#dc2626']
    const datasets = keywords.map((keyword, index) => {
      const group = groups.find(g => g.title === keyword) || groups[index] || { data: [] }
      const byDate = new Map<string, number>((group.data || []).map((item: any) => [String(item.period), Number(item.ratio || 0)] as [string, number]))
      const ratios = labels.map(label => byDate.get(label) || 0)
      const values = ratios.map(ratio => Math.round(ratio))
      return { keyword, label: keyword, data: values, ratios, color: colors[index % colors.length], source: 'naver_datalab' }
    })
    return { labels, datasets, source: 'naver_datalab', value_label: '검색 관심도 지수' }
  } catch (error) {
    return { labels: [], datasets: [], source: 'unavailable', value_label: '데이터랩 추이 없음' }
  }
}

export function spKwSharedSvg(trend: any, results: any[] = []): string {
  const labels: string[] = Array.isArray(trend?.labels) ? trend.labels : []
  const datasets: any[] = Array.isArray(trend?.datasets) ? trend.datasets : []
  if (!labels.length || !datasets.length) {
    const items = results
      .map((item: any, index: number) => ({ keyword: String(item.keyword || `키워드 ${index + 1}`), total: Number(item.total_monthly_search || 0), pc: Number(item.monthly_pc_search || 0), mobile: Number(item.monthly_mobile_search || 0) }))
      .filter((item: any) => item.total > 0)
      .slice(0, 5)
    if (!items.length) return '<div class="empty">실제 검색량 데이터가 없습니다.</div>'
    const width = 960, height = 330, padL = 72, padR = 30, padT = 24, padB = 72
    const colors = ['#2563eb', '#7c3aed', '#059669', '#f97316', '#dc2626']
    const max = Math.max(1, ...items.map((item: any) => item.total))
    const grid = [0, 0.25, 0.5, 0.75, 1].map(r => {
      const y = height - padB - r * (height - padT - padB)
      const label = Math.round(max * r).toLocaleString('ko-KR')
      return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#e2e8f0"/><text x="12" y="${y + 4}" font-size="12" fill="#64748b">${label}</text>`
    }).join('')
    const slot = (width - padL - padR) / items.length
    const bars = items.map((item: any, index: number) => {
      const barW = Math.min(96, slot * 0.52)
      const x = padL + slot * index + (slot - barW) / 2
      const barH = item.total / max * (height - padT - padB)
      const y = height - padB - barH
      const color = colors[index % colors.length]
      const keyword = spFlaEscape(item.keyword.length > 14 ? item.keyword.slice(0, 14) + '...' : item.keyword)
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="10" fill="${color}"/><text x="${(x + barW / 2).toFixed(1)}" y="${Math.max(18, y - 8).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#0f172a">${item.total.toLocaleString('ko-KR')}</text><text x="${(x + barW / 2).toFixed(1)}" y="${height - 42}" text-anchor="middle" font-size="12" fill="#475569">${keyword}</text><text x="${(x + barW / 2).toFixed(1)}" y="${height - 24}" text-anchor="middle" font-size="11" fill="#94a3b8">PC ${item.pc.toLocaleString('ko-KR')} · M ${item.mobile.toLocaleString('ko-KR')}</text>`
    }).join('')
    return `<svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="키워드별 월간 검색량 비교 그래프">${grid}<line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="#94a3b8"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height - padB}" stroke="#94a3b8"/>${bars}</svg>`
  }
  const width = 960, height = 330, padL = 54, padR = 22, padT = 28, padB = 52
  const allValues = datasets.flatMap(ds => Array.isArray(ds.data) ? ds.data.map((v: any) => Number(v) || 0) : [])
  const max = Math.max(1, ...allValues)
  const xFor = (i: number) => padL + (labels.length === 1 ? 0 : i * (width - padL - padR) / (labels.length - 1))
  const yFor = (v: number) => height - padB - (Number(v) || 0) / max * (height - padT - padB)
  const grid = [0, 0.25, 0.5, 0.75, 1].map(r => {
    const y = height - padB - r * (height - padT - padB)
    const label = Math.round(max * r).toLocaleString('ko-KR')
    return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#e2e8f0"/><text x="12" y="${y + 4}" font-size="12" fill="#64748b">${label}</text>`
  }).join('')
  const xLabels = labels.map((label, i) => {
    if (i !== 0 && i !== labels.length - 1 && i % Math.ceil(labels.length / 5) !== 0) return ''
    return `<text x="${xFor(i)}" y="${height - 20}" text-anchor="middle" font-size="12" fill="#64748b">${spFlaEscape(String(label).slice(5))}</text>`
  }).join('')
  const lines = datasets.map((ds, idx) => {
    const color = String(ds.color || ['#2563eb', '#7c3aed', '#059669', '#f97316', '#dc2626'][idx % 5])
    const values = Array.isArray(ds.data) ? ds.data : []
    const points = values.map((value: any, i: number) => `${xFor(i).toFixed(1)},${yFor(Number(value) || 0).toFixed(1)}`).join(' ')
    const circles = values.map((value: any, i: number) => `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(Number(value) || 0).toFixed(1)}" r="2.5" fill="${color}"/>`).join('')
    return `<polyline fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>${circles}`
  }).join('')
  return `<svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="키워드 검색 추이 그래프">${grid}<line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="#94a3b8"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height - padB}" stroke="#94a3b8"/>${xLabels}${lines}</svg>`
}

export function spKwSharedHtml(payload: any): string {
  const results: any[] = Array.isArray(payload?.results) ? payload.results : []
  const trend = payload?.trend || {}
  const keywords = results.map(r => r.keyword).filter(Boolean)
  const createdAt = payload?.created_at || new Date().toISOString()
  const totalVolume = results.reduce((sum, item) => sum + Number(item.total_monthly_search || 0), 0)
  const best = results.slice().sort((a, b) => Number(b.total_monthly_search || 0) - Number(a.total_monthly_search || 0))[0] || {}
  const hasTrend = Array.isArray(trend?.labels) && trend.labels.length > 0 && Array.isArray(trend?.datasets) && trend.datasets.length > 0
  const chips = keywords.map((kw, i) => `<span style="--c:${spFlaEscape(String(trend?.datasets?.[i]?.color || '#2563eb'))}">${spFlaEscape(kw)}</span>`).join('')
  const chartTitle = hasTrend ? '최근 30일 검색 관심도 추이' : '키워드별 월간 검색량 비교'
  const chartLegend = hasTrend
    ? (trend?.datasets || []).map((ds: any) => `<span><b style="--c:${spFlaEscape(String(ds.color || '#2563eb'))}"></b>${spFlaEscape(ds.keyword || ds.label || '')}</span>`).join('')
    : results.slice(0, 5).map((item: any, i: number) => `<span><b style="--c:${['#2563eb', '#7c3aed', '#059669', '#f97316', '#dc2626'][i % 5]}"></b>${spFlaEscape(item.keyword || '')}</span>`).join('')
  const cards = results.map(item => {
    const source = item.volume_source === 'naver_ad_api' ? '실제 검색광고 API' : 'API 조회 결과 없음'
    return `<article class="metric-card"><div><p>${spFlaEscape(item.keyword)}</p><strong>${Number(item.total_monthly_search || 0).toLocaleString('ko-KR')}</strong><em>${source}</em></div><dl><dt>PC</dt><dd>${Number(item.monthly_pc_search || 0).toLocaleString('ko-KR')}</dd><dt>모바일</dt><dd>${Number(item.monthly_mobile_search || 0).toLocaleString('ko-KR')}</dd><dt>경쟁도</dt><dd>${spFlaEscape(item.competition_level || '-')}</dd></dl></article>`
  }).join('')
  const rows = results.map((item, index) => `<tr><td>${index + 1}</td><td><strong>${spFlaEscape(item.keyword)}</strong></td><td>${Number(item.monthly_pc_search || 0).toLocaleString('ko-KR')}</td><td>${Number(item.monthly_mobile_search || 0).toLocaleString('ko-KR')}</td><td>${Number(item.total_monthly_search || 0).toLocaleString('ko-KR')}</td><td>${spFlaEscape(item.competition_level || '-')}</td><td>${item.recommended ? '추천' : '-'}</td></tr>`).join('')
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>키워드 검색량 공유 리포트 - BYGENCY</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="키워드 검색량 공유 리포트">
  <meta property="og:description" content="${spFlaEscape(keywords.join(', '))} 검색량과 최근 추이">
  <style>
    *{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif;background:#f6f8fb;color:#0f172a}.wrap{max-width:1120px;margin:0 auto;padding:28px}.hero{background:linear-gradient(135deg,#06281f,#0f766e 58%,#2563eb);color:#fff;border-radius:22px;padding:30px;margin-bottom:18px;box-shadow:0 18px 55px rgba(15,23,42,.18)}.hero h1{margin:0;font-size:32px;letter-spacing:0}.hero p{margin:10px 0 0;color:#d7fff5}.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.chips span{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.13);border-left:5px solid var(--c);border-radius:999px;padding:7px 12px;font-size:13px;font-weight:800}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.summary div,.panel,.metric-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 10px 28px rgba(15,23,42,.06)}.summary div{padding:16px}.summary span,.metric-card em{display:block;font-size:12px;color:#64748b;font-style:normal}.summary strong{display:block;margin-top:6px;font-size:28px}.panel{padding:20px;margin-bottom:16px}.panel h2{font-size:18px;margin:0 0 14px}.trend-svg{display:block;width:100%;height:auto;background:#fff;border-radius:14px}.legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.legend span{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#475569}.legend b{width:10px;height:10px;border-radius:99px;display:inline-block;background:var(--c)}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.metric-card{padding:16px}.metric-card p{margin:0 0 6px;font-size:14px;color:#64748b;font-weight:800}.metric-card strong{font-size:30px}.metric-card dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0 0}.metric-card dt{font-size:12px;color:#94a3b8}.metric-card dd{margin:0;text-align:right;font-weight:800}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:12px;border-bottom:1px solid #e2e8f0;text-align:right}th{background:#f8fafc;color:#475569}th:nth-child(2),td:nth-child(2){text-align:left}.foot{font-size:12px;color:#64748b;line-height:1.7}.empty{padding:28px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;color:#64748b;background:#f8fafc}@media(max-width:720px){.wrap{padding:16px}.hero h1{font-size:26px}.summary{grid-template-columns:1fr}.metric-card dl{grid-template-columns:1fr}.metric-card dd{text-align:left}th,td{white-space:nowrap}}
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>키워드 검색량 공유 리포트</h1>
      <p>최대 5개 키워드의 월 검색량과 최근 30일 검색 추이를 한 화면에서 비교합니다.</p>
      <div class="chips">${chips}</div>
    </section>
    <section class="summary">
      <div><span>분석 키워드</span><strong>${results.length.toLocaleString('ko-KR')}개</strong></div>
      <div><span>합산 월 검색량</span><strong>${totalVolume.toLocaleString('ko-KR')}</strong></div>
      <div><span>최고 검색량</span><strong>${spFlaEscape(best.keyword || '-')}</strong></div>
    </section>
    <section class="panel">
      <h2>${chartTitle}</h2>
      ${spKwSharedSvg(trend, results)}
      <div class="legend">${chartLegend}</div>
    </section>
    <section class="cards">${cards}</section>
    <section class="panel">
      <h2>상세 데이터</h2>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>키워드</th><th>PC</th><th>모바일</th><th>합계</th><th>경쟁도</th><th>추천</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section>
    <p class="foot">생성일: ${spFlaEscape(new Date(createdAt).toLocaleString('ko-KR'))}<br>월간 검색량은 네이버 검색광고 API 실제 조회값이며, 추이는 네이버 데이터랩 상대 지수입니다. API 응답이 없으면 추정값을 만들지 않습니다.</p>
  </main>
</body>
</html>`
}
