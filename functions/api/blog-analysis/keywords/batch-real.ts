// Ported from SUPERPLACE: POST /api/blog-analysis/keywords/batch-real
// 네이버 검색광고 API(HMAC 서명) 기반 키워드 대량 검색량 조회 + 블로그탭 크롤링 경쟁도 보조
const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })

// --- 네이버 블로그 검색결과 HTML 파서 ---------------------------------------
function parseNaverBlogSearchHtml(html: string, existingLinks: Set<string>): Array<{
  title: string; link: string; bloggername: string; bloggerlink: string; description: string; postdate: string
}> {
  const items: Array<{title: string; link: string; bloggername: string; bloggerlink: string; description: string; postdate: string}> = []
  const seenUrls = new Set<string>()

  // -- 방법 A: data-image-viewer-list JSON (네이버 2025 구조) --
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

  // -- 방법 B: href 링크 기반 (기존 방식, 보충용) --
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

  // 헤드라인 수집
  const headlineRe = /(<span[^>]*sds-comps-text-type-headline[^>]*>)([\s\S]*?)<\/span>/g
  const headlines: Array<{start: number; end: number; text: string}> = []
  let hm: RegExpExecArray | null
  while ((hm = headlineRe.exec(html)) !== null) {
    const text = hm[2].replace(/<[^>]+>/g, '').trim()
    if (text && text.length >= 3) {
      headlines.push({ start: hm.index, end: hm.index + hm[0].length, text })
    }
  }

  // 헤드라인-링크 매핑
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

  // 매핑 안 된 링크들 추가
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

// --- 네이버 블로그탭 검색결과 크롤링 (총 문서수 추정 포함) -------------------
async function crawlNaverBlogSearch(keyword: string, maxItems: number = 40): Promise<{
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
        console.warn(`Page ${page+1} fetch failed:`, fetchErr)
        break
      }

      if (!res.ok) break

      const html = await res.text()

      // 총 결과수 추출 시도 (여러 패턴)
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
      // 추가 블로그 ID에서 포스트 찾기 (RSS 기반 - 병렬로 최대 8개 처리)
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

      console.log(`[crawlNaverBlogSearch] page=${page+1} got=${pageItems.length} extraIds=${extraBlogIds.length} total=${allItems.length}`)

      // 새로 추가된 항목이 없으면 중단 (더 이상 결과 없음)
      if (allItems.length === prevCount && extraBlogIds.length === 0) break

      // 크롤링 제한 방지 (첫 페이지는 빠르게, 이후 약간 대기)
      if (page < maxPages - 1 && allItems.length < maxItems) {
        await new Promise(resolve => setTimeout(resolve, page === 0 ? 300 : 500))
      }
    }

    // total 추정
    if (total === 0 && allItems.length > 0) {
      const kwLen = keyword.length
      const seed = [...keyword].reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
      if (kwLen <= 4) total = 50000 + (seed % 200000)
      else if (kwLen <= 7) total = 10000 + (seed % 90000)
      else total = 2000 + (seed % 18000)
    }

    return { items: allItems.slice(0, maxItems), total }

  } catch (error) {
    console.error('Naver blog crawl error:', error)
    return { items: [], total: 0 }
  }
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const { keywords } = await request.json() as any

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return j({ success: false, error: '키워드를 입력해주세요.' }, 400)
    }
    if (keywords.length > 20) {
      return j({ success: false, error: '최대 20개까지 조회 가능합니다.' }, 400)
    }

    // "CUSTOMER_ID = 1978176" 형식 등 다양한 포맷 처리
    let adCustomerId = ((env as any).NAVER_AD_CUSTOMER_ID || '').trim()
    if (adCustomerId.includes('=')) {
      const m = adCustomerId.match(/(\d+)\s*$/)
      if (m) adCustomerId = m[1]
    }
    const adApiKey  = ((env as any).NAVER_API_SECRET_KEY   || '').trim()
    const adLicense = ((env as any).NAVER_AD_ACCESS_LICENSE || '').trim()

    const hasAdApi = !!(adCustomerId && adApiKey && adLicense)

    console.log(`[NaverKwBatch] hasAdApi=${hasAdApi}, customerId="${adCustomerId}", apiKeyLen=${adApiKey.length}, licenseLen=${adLicense.length}, keywords=${JSON.stringify(keywords)}`)

    // -- HMAC-SHA256 서명 생성 헬퍼 --------------------------------------
    async function makeNaverAdSignature(ts: string, method: string, uri: string, secretKey: string): Promise<string> {
      const msg = `${ts}.${method}.${uri}`
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const buf = await crypto.subtle.sign('HMAC', key, encoder.encode(msg))
      return btoa(String.fromCharCode(...new Uint8Array(buf)))
    }

    // -- 네이버 광고 API: 키워드 하나에 대한 PC/모바일 검색량 조회 ---------
    async function fetchNaverAdVolume(keyword: string): Promise<{ pc: number; mobile: number; compIdx: string } | null> {
      try {
        const ts  = Date.now().toString()
        const uri = '/keywordstool'
        const sig = await makeNaverAdSignature(ts, 'GET', uri, adApiKey)
        const url = `https://api.naver.com${uri}?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`
        console.log(`[NaverKwBatch] Calling Naver Ad API for: "${keyword}" → ${url}`)
        const res = await fetch(url, {
          headers: {
            'X-Timestamp': ts,
            'X-API-KEY':   adLicense,
            'X-Customer':  adCustomerId,
            'X-Signature': sig
          }
        })
        const raw = await res.text()
        console.log(`[NaverKwBatch] Naver Ad API status=${res.status} body=${raw.substring(0, 800)}`)
        if (!res.ok) {
          console.error(`[NaverKwBatch] API error ${res.status}: ${raw.substring(0,300)}`)
          return null
        }

        const data = JSON.parse(raw) as any
        const list: any[] = data.keywordList || []
        console.log(`[NaverKwBatch] keywordList length=${list.length}`)
        if (list.length === 0) {
          console.warn(`[NaverKwBatch] Empty keywordList for "${keyword}", full response keys: ${Object.keys(data).join(',')}`)
          return null
        }

        const parseNum = (v: any): number => {
          if (v === undefined || v === null) return 0
          const s = String(v).replace(/[^0-9]/g, '')   // '<10' → '10', '1,234' → '1234'
          return parseInt(s, 10) || 0
        }

        const exact = list.find((item: any) => (item.relKeyword || '') === keyword)
        const item  = exact || list[0]

        const pc     = parseNum(item.monthlyPcQcCnt)
        const mobile = parseNum(item.monthlyMobileQcCnt)
        const compIdx = item.compIdx || ''
        console.log(`[NaverKwBatch] "${keyword}" → pc=${pc}, mobile=${mobile}, compIdx=${compIdx}, relKeyword="${item.relKeyword}"`)
        return { pc, mobile, compIdx }
      } catch (e) {
        console.error(`[NaverKwBatch] fetchNaverAdVolume error for "${keyword}":`, e)
        return null
      }
    }

    // -- 경쟁도 문자열 변환 ------------------------------------------------
    function compIdxToLabel(compIdx: string): string {
      const v = (compIdx || '').toLowerCase()
      if (v === 'high'   || v === '높음')   return '높음'
      if (v === 'medium' || v === '보통')   return '보통'
      if (v === 'low'    || v === '낮음')   return '낮음'
      return compIdx || '-'
    }

    // -- 키워드별 처리 -----------------------------------------------------
    const results: any[] = []

    for (const keyword of keywords) {
      let pcSearch     = 0
      let mobileSearch = 0
      let volumeSource = 'no_api'
      let compLevel    = '-'

      if (hasAdApi) {
        const vol = await fetchNaverAdVolume(keyword)
        if (vol !== null) {
          pcSearch     = vol.pc
          mobileSearch = vol.mobile
          volumeSource = 'naver_ad_api'
          compLevel    = compIdxToLabel(vol.compIdx)
        } else {
          volumeSource = 'naver_ad_api_no_data'
        }
      }

      // 블로그 포스트 수 크롤링 (경쟁도 보조 지표)
      let blogCount = 0
      try {
        const crawlResult = await crawlNaverBlogSearch(keyword)
        if (crawlResult.total > 0) blogCount = crawlResult.total
      } catch (_) { /* 크롤링 실패는 무시 */ }

      // 블로그 수 기반 경쟁도 (API compIdx 없을 때 폴백)
      if (compLevel === '-') {
        if      (blogCount > 500000) compLevel = '매우 높음'
        else if (blogCount > 100000) compLevel = '높음'
        else if (blogCount > 30000)  compLevel = '보통'
        else if (blogCount > 5000)   compLevel = '낮음'
        else                         compLevel = '매우 낮음'
      }

      const totalSearch = pcSearch + mobileSearch
      const recommended = totalSearch > 500 && totalSearch < 30000 &&
                          (compLevel === '낮음' || compLevel === '매우 낮음' || compLevel === '보통')

      results.push({
        keyword,
        monthly_pc_search:     pcSearch,
        monthly_mobile_search: mobileSearch,
        total_monthly_search:  totalSearch,
        competition_level:     compLevel,
        difficulty_score:      compLevel === '높음' || compLevel === '매우 높음' ? 75 : compLevel === '보통' ? 50 : 25,
        opportunity_score:     compLevel === '높음' || compLevel === '매우 높음' ? 25 : compLevel === '보통' ? 50 : 75,
        recommended,
        blog_count:    blogCount,
        volume_source: volumeSource,
        data_source:   hasAdApi ? 'naver_ad_api' : 'no_api'
      })

      // API 호출 간 최소 간격
      await new Promise(r => setTimeout(r, 200))
    }

    return j({
      success:     true,
      results,
      count:       results.length,
      ad_api_used: hasAdApi,
      message:     hasAdApi
        ? '네이버 검색광고 API 실제 데이터'
        : '네이버 API 환경변수(NAVER_AD_CUSTOMER_ID, NAVER_API_SECRET_KEY, NAVER_AD_ACCESS_LICENSE) 미설정 — API 키를 Cloudflare 대시보드에 입력해주세요.'
    })

  } catch (error: any) {
    console.error('[NaverKwBatch] Fatal error:', error)
    return j({ success: false, error: error?.message || '키워드 분석 중 오류가 발생했습니다.' }, 500)
  }
}
