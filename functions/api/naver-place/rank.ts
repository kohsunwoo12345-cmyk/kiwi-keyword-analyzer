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
    const { placeId: inputPlaceId, placeUrl, keyword, location } = await c.req.json()
    const authUser = tryGetUserFromHeaders(c)
    if (!authUser.ok) return authUser.response
    const user = authUser.user
    
    // 🎯 키워드 변형 생성 함수 (더 많은 결과 수집)
    function generateKeywordVariations(baseKeyword: string): string[] {
      const variations = [baseKeyword] // 원본 키워드 포함
      const words = baseKeyword.split(' ').filter(w => w.length > 0)
      
      if (words.length >= 2) {
        // 단어 순서 변경
        variations.push(words.slice().reverse().join(' '))
        
        // 부분 키워드 (처음 2개, 마지막 2개)
        if (words.length >= 3) {
          variations.push(words.slice(0, 2).join(' '))
          variations.push(words.slice(-2).join(' '))
        }
        
        // 각 단어 단독
        words.forEach(word => {
          if (word.length >= 2) {
            variations.push(word)
          }
        })
      }
      
      // 중복 제거 및 최대 5개로 제한
      return [...new Set(variations)].slice(0, 5)
    }
    
    // ── placeUrl에서 placeId 자동 추출 ──
    // 지원 URL 형식:
    //   map.naver.com/p/search/{검색어}/place/{ID}   ← 네이버 지도 PC
    //   m.place.naver.com/place/{ID}                 ← 네이버 플레이스 모바일
    //   m.place.naver.com/restaurant/{ID}            ← 식당
    //   naver.me/{단축ID}                            ← 단축 URL (ID 포함 시)
    const extractPlaceIdFromUrl = (url: string): string | null => {
      if (!url) return null
      // 1순위: /place/숫자 패턴 (map.naver.com/p/search/.../place/ID 포함)
      const m1 = url.match(/\/place\/(\d{5,})/)
      if (m1) return m1[1]
      // 2순위: place.naver.com 카테고리 경로 (restaurant, cafe, beauty 등)
      const m2 = url.match(/place\.naver\.com\/(?:restaurant|cafe|beauty|hospital|pharmacy|accommodation|shopping|culture|activity)\/(\d{5,})/)
      if (m2) return m2[1]
      // 3순위: naver.me 단축URL 내 7자리+ 숫자
      const m3 = url.match(/naver\.me\/[A-Za-z0-9]*?\/?(\d{7,})/)
      if (m3) return m3[1]
      // 4순위: 경로 내 7~10자리 숫자 (timestamp 12자리 제외)
      const m4 = url.match(/\/(\d{7,10})(?:\/|$|\?)/)
      if (m4) return m4[1]
      // 5순위: URL 내 최초의 7자리+ 숫자 (10자리 이하, timestamp 방지)
      const m5 = url.match(/(\d{7,10})/)
      if (m5) return m5[1]
      return null
    }

    let placeId = inputPlaceId
    if (!placeId && placeUrl) {
      placeId = extractPlaceIdFromUrl(placeUrl) || undefined
    }
    
    if (!keyword) {
      return c.json({ success: false, error: '키워드를 입력해주세요.' }, 400)
    }
    
    if (!placeId) {
      return c.json({ success: false, error: 'Place ID를 찾을 수 없습니다. map.naver.com, m.place.naver.com 등 네이버 플레이스 URL을 확인해주세요.' }, 400)
    }

    // 🗺️ placeId로 업체 좌표(x,y) 자동 추출 -> pcmap 검색 정확도 향상
    // 핵심: 좌표 없으면 네이버가 키워드의 지명을 다른 지역으로 오해할 수 있음
    // 예: "신원동 영어학원" -> 좌표 없으면 서울 관악구 신림동으로 처리, 고양시 덕양구 신원동 업체는 미노출
    let placeCoordX: string | null = null  // 경도(lng)
    let placeCoordY: string | null = null  // 위도(lat)
    let fetchedPlaceName: string | null = null
    try {
      const placePageResp = await fetch(`https://m.place.naver.com/place/${placeId}/home`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept-Language': 'ko-KR,ko;q=0.9'
        }
      })
      if (placePageResp.ok) {
        const placeHtml = await placePageResp.text()
        // 좌표 추출 ("x": "126.889...", "y": "37.663...")
        const xMatch = placeHtml.match(/"x"\s*:\s*"?([\d.]+)"?/)
        const yMatch = placeHtml.match(/"y"\s*:\s*"?([\d.]+)"?/)
        if (xMatch && yMatch) {
          placeCoordX = xMatch[1]
          placeCoordY = yMatch[1]
          console.log(`[Place Coords] placeId=${placeId} → x=${placeCoordX}, y=${placeCoordY}`)
        }
        // 업체명 미리 추출
        const nameMatch = placeHtml.match(/"name"\s*:\s*"([^"]+)"/)
        if (nameMatch) fetchedPlaceName = nameMatch[1]
      }
    } catch(coordErr) {
      console.warn('[Place Coords] 좌표 추출 실패:', coordErr instanceof Error ? coordErr.message : String(coordErr))
    }
    
    // 🔥 네이버 검색 API 우선, 실패 시 웹 크롤링
    let rank = null
    let totalCount = 0
    let naverPlaceTotalCount = 0  // 전체 업체 수 - 최외부 스코프에 선언 (바닥 코드에서도 참조 가능)
    let placeName = fetchedPlaceName  // 좌표 추출 시 이미 이름 확보
    let foundPlace = false
    let useAPI = false
    
    try {
      // 🌟 1차 시도: 네이버 검색 API 사용
      const naverClientId = c.env.NAVER_CLIENT_ID || c.env.NAVER_AD_CUSTOMER_ID
      const naverClientSecret = c.env.NAVER_CLIENT_SECRET || c.env.NAVER_API_SECRET_KEY
      
      if (naverClientId && naverClientSecret) {
        console.log(`[Naver API] Using Naver Search API for keyword: ${keyword}`)
        useAPI = true
        
        // 최대 300개까지 조회 (100개씩 3번)
        const allPlaces = []
        
        for (let start = 1; start <= 300; start += 100) {
          const apiUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(keyword)}&display=100&start=${start}&sort=random`
          
          console.log(`[Naver API] Fetching: ${apiUrl}`)
          
          const apiResponse = await fetch(apiUrl, {
            headers: {
              'X-Naver-Client-Id': naverClientId,
              'X-Naver-Client-Secret': naverClientSecret
            }
          })
          
          if (!apiResponse.ok) {
            console.warn(`[Naver API] HTTP error: ${apiResponse.status}`)
            useAPI = false
            break
          }
          
          const apiData = await apiResponse.json()
          console.log(`[Naver API] Response - total: ${apiData.total}, items: ${apiData.items?.length || 0}`)
          
          if (!apiData.items || apiData.items.length === 0) {
            break
          }
          
          allPlaces.push(...apiData.items)
          
          // 전체 결과보다 많이 요청하면 중단
          if (start + 100 > apiData.total) {
            break
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        console.log(`[Naver API] Total places fetched: ${allPlaces.length}`)
        
        // Place ID로 순위 찾기
        totalCount = allPlaces.length
        
        for (let i = 0; i < allPlaces.length; i++) {
          const item = allPlaces[i]
          
          // link에서 Place ID 추출
          const linkMatch = item.link?.match(/place[\/=](\d+)/)
          const foundPlaceId = linkMatch ? linkMatch[1] : null
          
          if (foundPlaceId === placeId) {
            rank = i + 1
            // HTML 태그 제거
            placeName = item.title
              .replace(/<b>/g, '')
              .replace(/<\/b>/g, '')
              .trim()
            foundPlace = true
            console.log(`[Naver API] 🎯 Found target place at rank ${rank}! Name: ${placeName}`)
            break
          }
        }
        
        console.log(`[Naver API] Search completed. Found: ${foundPlace}, Rank: ${rank}, Total: ${totalCount}`)
      }
      
      // 2차 시도: __APOLLO_STATE__ 추출 방식 (네이버 검색 PC 버전)
      // 핵심 발견: 네이버 PC 검색의 __APOLLO_STATE__에 nxPlaces.items 배열로 정확한 순서의 Place ID가 있음
      // data-loc_plc-doc-id는 마지막 결과가 누락되는 버그가 있어 Apollo State가 더 정확함
      if (!useAPI || !foundPlace) {
        let pcmapTotal = naverPlaceTotalCount  // 로컬 참조 (crawl 블록 전용)
        console.log(`[Apollo State Crawl] Starting Apollo State extraction for: ${keyword}`)
        
        // __APOLLO_STATE__에서 nxPlaces items 순서대로 Place ID 추출
        const extractFromApolloState = (html: string): Array<{id: string, name: string | null}> => {
          const results: Array<{id: string, name: string | null}> = []
          
          try {
            // __APOLLO_STATE__ JSON 추출
            const apolloIdx = html.indexOf('__APOLLO_STATE__')
            if (apolloIdx < 0) return results
            
            const stateStart = html.indexOf('=', apolloIdx) + 1
            let depth = 0, stateEnd = stateStart
            for (let i = stateStart; i < html.length; i++) {
              if (html[i] === '{') depth++
              else if (html[i] === '}') {
                depth--
                if (depth === 0) { stateEnd = i + 1; break }
              }
            }
            
            const stateStr = html.substring(stateStart, stateEnd).trim()
            const state = JSON.parse(stateStr)
            const rootQuery = state['ROOT_QUERY']
            if (!rootQuery) return results
            
            // nxPlaces 쿼리 키 찾기 (실제 검색 결과 목록)
            const nxKey = Object.keys(rootQuery).find(k => k.startsWith('nxPlaces'))
            if (!nxKey) return results
            
            const nxData = rootQuery[nxKey]
            if (!nxData?.items || !Array.isArray(nxData.items)) return results
            
            // items 배열에서 순서대로 Place ID 추출 (이것이 실제 순위!)
            for (const item of nxData.items) {
              if (item.__ref && item.__ref.startsWith('PlaceSummary:')) {
                const id = item.__ref.replace('PlaceSummary:', '')
                // PlaceSummary에서 업체명 추출
                const placeSummary = state[item.__ref]
                const name = placeSummary?.normalizedName || placeSummary?.name || null
                results.push({ id, name })
              }
            }
            
            console.log(`[Apollo State] Extracted ${results.length} places from nxPlaces.items (total in DB: ${nxData.total || '?'})`)
          } catch (e) {
            console.warn('[Apollo State] Parse error:', e instanceof Error ? e.message : String(e))
          }
          
          return results
        }
        
        // data-loc_plc-doc-id 속성으로 추출 (보조 수단)
        const extractFromDocIds = (html: string, seenSet: Set<string>): Array<{id: string, name: string | null}> => {
          const results: Array<{id: string, name: string | null}> = []
          const pattern = /data-loc_plc-doc-id="(\d+)"/g
          let m
          while ((m = pattern.exec(html)) !== null) {
            const id = m[1]
            if (!seenSet.has(id)) {
              seenSet.add(id)
              results.push({ id, name: null })
            }
          }
          return results
        }
        
        const places: Array<{id: string, name: string | null}> = []
        const seenIds = new Set<string>()
        
        // -- 헬퍼: 한 페이지 결과를 places에 추가 후 타겟 발견 여부 반환
        const fetchAndProcessPage = async (url: string, label: string, pageNum: number): Promise<boolean> => {
          try {
            await new Promise(resolve => setTimeout(resolve, 300))
            const resp = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.7',
                'Referer': 'https://search.naver.com/',
                'Cache-Control': 'no-cache'
              }
            })
            if (!resp.ok) {
              console.warn(`[${label}] Page ${pageNum} HTTP ${resp.status}`)
              return false
            }
            const html = await resp.text()
            const apolloResults = extractFromApolloState(html)
            const toProcess = apolloResults.length > 0 ? apolloResults : extractFromDocIds(html, new Set())
            console.log(`[${label}] Page ${pageNum}: apollo=${apolloResults.length}, docId=${toProcess.length - apolloResults.length}, total=${toProcess.length}`)
            if (toProcess.length === 0) return false // 더 이상 결과 없음
            
            for (const item of toProcess) {
              if (seenIds.has(item.id)) continue
              seenIds.add(item.id)
              places.push(item)
              if (item.id === placeId) {
                rank = places.length
                placeName = item.name || null
                foundPlace = true
                console.log(`[${label}] 🎯 Page ${pageNum}, 순위 ${rank}! Name: ${placeName}`)
                return true
              }
            }
            return false
          } catch (e) {
            console.warn(`[${label}] Page ${pageNum} error:`, e instanceof Error ? e.message : String(e))
            return false
          }
        }

        // -- 1차: pcmap.place.naver.com/restaurant/list (restaurantList Apollo 키 사용)
        // 핵심: 네이버 pcmap은 display=100이면 한 번에 100개 반환 가능 (Apollo state의 restaurantList 쿼리)
        // URL /place/list -> /restaurant/list 로 리다이렉트되므로 직접 /restaurant/list 사용
        console.log(`[pcmap Apollo] 크롤링 시작: ${keyword}`)
        
        // pcmap Apollo State에서 restaurantList() 키 추출
        // total도 함께 반환하여 전체 업체 수 표시에 사용
        const extractFromPcmapApolloState = (html: string): { items: Array<{id: string, name: string | null}>, total: number } => {
          const items: Array<{id: string, name: string | null}> = []
          let total = 0
          try {
            const apolloIdx = html.indexOf('__APOLLO_STATE__')
            if (apolloIdx < 0) return { items, total }
            const stateStart = html.indexOf('=', apolloIdx) + 1
            // 브라켓 매칭으로 정확한 JSON 경계 파악 (문자열 내 중괄호 무시)
            let depth = 0, stateEnd = stateStart, inStr = false, esc = false
            for (let i = stateStart; i < Math.min(html.length, stateStart + 2000000); i++) {
              const ch = html[i]
              if (esc) { esc = false; continue }
              if (ch === '\\' && inStr) { esc = true; continue }
              if (ch === '"') { inStr = !inStr; continue }
              if (!inStr) {
                if (ch === '{') depth++
                else if (ch === '}') { depth--; if (depth === 0) { stateEnd = i + 1; break } }
              }
            }
            const state = JSON.parse(html.substring(stateStart, stateEnd).trim())
            const rootQuery = state['ROOT_QUERY']
            if (!rootQuery) return { items, total }
            // pcmap Apollo 키 우선순위:
            // 1) places({input:{...}}) - /place/list URL (모든 업종, 가장 정확)
            // 2) restaurantList({...})  - /restaurant/list URL (음식점 전용)
            // 3) placeList({...})       - 구버전 키
            // 4) nxPlaces({...})        - search.naver.com 검색 결과
            // 5) 기타 items 배열이 가장 큰 키 (fallback)
            const listKey = Object.keys(rootQuery).find(k =>
              k.startsWith('places(') ||
              k.startsWith('restaurantList(') ||
              k.startsWith('placeList(') ||
              k.startsWith('nxPlaces(')
            )
            if (!listKey) {
              // fallback: 어떤 키든 items 배열이 가장 큰 것 찾기
              // placeList는 businesses.items 구조, 다른 키는 items 직접 구조
              const getItemsFromValue = (v: any): any[] => {
                if (!v || typeof v !== 'object') return []
                if (Array.isArray(v.businesses?.items) && v.businesses.items.length > 0) return v.businesses.items
                if (Array.isArray(v.items) && v.items.length > 0) return v.items
                return []
              }
              const getTotalFromValue = (v: any): number => {
                if (!v || typeof v !== 'object') return 0
                return v.businesses?.total || v.total || 0
              }
              const allItemKeys = Object.keys(rootQuery).filter(k => {
                return getItemsFromValue(rootQuery[k]).length > 0
              })
              // 가장 items가 많은 키 선택
              const fallbackKey = allItemKeys.sort((a, b) => {
                return getItemsFromValue(rootQuery[b]).length - getItemsFromValue(rootQuery[a]).length
              })[0]
              if (!fallbackKey) return { items, total }
              const fd = rootQuery[fallbackKey]
              const fdItems = getItemsFromValue(fd)
              const fdTotal = getTotalFromValue(fd)
              if (fdTotal > 0) total = fdTotal
              console.warn(`[pcmap Apollo] listKey 없음 - fallback 사용: ${fallbackKey.substring(0, 50)}, items=${fdItems.length}, total=${fdTotal}`)
              for (const item of fdItems) {
                const ref = item.__ref || ''
                const colonIdx = ref.lastIndexOf(':')
                const id = colonIdx >= 0 ? ref.substring(colonIdx + 1) : ''
                if (id && /^\d+$/.test(id)) {
                  const ps = state[ref]
                  items.push({ id, name: ps?.normalizedName || ps?.name || null })
                }
              }
              return { items, total }
            }
            const listData = rootQuery[listKey]
            // placeList 구조: {businesses: {total, items}} 또는 places/nxPlaces 구조: {total, items}
            // 두 가지 구조 모두 지원
            const actualItems: any[] = listData?.businesses?.items || listData?.items || []
            const actualTotal: number = listData?.businesses?.total || listData?.total || 0
            if (!Array.isArray(actualItems) || actualItems.length === 0) {
              // items가 없어도 total은 저장 (전체 개수 표시용)
              if (actualTotal > 0) total = actualTotal
              // placeList인 경우 businesses 내부의 데이터 재확인
              console.log(`[pcmap Apollo] listKey=${listKey.substring(0,40)}, items=${actualItems.length}, total=${actualTotal}`)
              return { items, total }
            }
            // total 반환 (전체 업체 수)
            if (actualTotal > 0) total = actualTotal
            for (const item of actualItems) {
              const ref = item.__ref || ''
              // RestaurantListSummary:ID, PlaceListBusinessesItem:ID, PlaceSummary:ID 등 다양한 형식 지원
              const colonIdx = ref.lastIndexOf(':')
              const id = colonIdx >= 0 ? ref.substring(colonIdx + 1) : ''
              if (id && /^\d+$/.test(id)) {
                const ps = state[ref]
                const name = ps?.normalizedName || ps?.name || null
                items.push({ id, name })
              }
            }
            console.log(`[pcmap Apollo] Extracted ${items.length} places (total in DB: ${actualTotal || '?'})`)
          } catch (e) {
            console.warn('[pcmap Apollo] Parse error:', e instanceof Error ? e.message : String(e))
          }
          return { items, total }
        }
        
        // ══════════════════════════════════════════════════════════════
        // pcmap 1차: /place/list URL + start 파라미터로 페이지네이션 (최대 10페이지 × 100개)
        // ⚠️ 핵심: /place/list 는 places({input:{...}}) Apollo 키 반환 (total 포함)
        //         /restaurant/list 는 restaurantList 키 반환하지만 음식점만 검색됨
        //         학원/병원/기타 모든 업종 -> /place/list 사용해야 정확한 결과
        // ══════════════════════════════════════════════════════════════
        {
          const pcmapHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Referer': `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}`,
            'Cache-Control': 'no-cache'
          }
          // 🎯 좌표가 있으면 x,y 파라미터 추가 -> 올바른 지역 검색 보장
          const coordParam = placeCoordX && placeCoordY ? `&x=${placeCoordX}&y=${placeCoordY}` : ''
          if (coordParam) {
            console.log(`[pcmap Apollo] 좌표 포함 검색: x=${placeCoordX}, y=${placeCoordY}`)
          }

          // 첫 페이지 fetch해서 한 페이지당 반환 개수(pageSize)를 동적으로 파악
          let pcmapPageSize = 100  // display=100 사용시 100개/페이지
          let firstPageSuccess = false

          // 첫 페이지 시도: /place/list 사용 (모든 업종 검색 가능, display=100 -> 100개 반환)
          // /restaurant/list 는 음식점 카테고리만 반환하므로 학원 등은 total이 매우 작게 나옴
          for (const disp of [100, 70, 50]) {
            const pcmapUrl = `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}${coordParam}&type=all&display=${disp}&start=1`
            try {
              await new Promise(resolve => setTimeout(resolve, 300))
              const resp = await fetch(pcmapUrl, { headers: pcmapHeaders })
              if (resp.ok) {
                const html = await resp.text()
                const { items: pcmapResults, total: pcmapPageTotal } = extractFromPcmapApolloState(html)
                if (pcmapPageTotal > 0) pcmapTotal = pcmapPageTotal
                console.log(`[pcmap Apollo] Page1 display=${disp}: ${pcmapResults.length}개, total=${pcmapTotal}`)
                if (pcmapResults.length > 0 || pcmapTotal > 0) {
                  // 실제 반환 개수를 페이지 크기로 사용
                  if (pcmapResults.length > 0) pcmapPageSize = pcmapResults.length
                  for (const item of pcmapResults) {
                    if (seenIds.has(item.id)) continue
                    seenIds.add(item.id)
                    places.push(item)
                    if (item.id === placeId) {
                      rank = places.length
                      placeName = item.name || placeName
                      foundPlace = true
                      console.log(`[pcmap Apollo] 🎯 Page1 순위 ${rank}! Name: ${placeName}`)
                    }
                  }
                  firstPageSuccess = true
                  break // 결과 있으면 display 루프 종료
                }
              } else {
                console.warn(`[pcmap Apollo] HTTP ${resp.status} for display=${disp} start=1`)
              }
            } catch(e) {
              console.warn(`[pcmap Apollo] Error (display=${disp} start=1):`, e instanceof Error ? e.message : String(e))
            }
          }

          // 2~10 페이지 추가 크롤링 (아직 못 찾았거나 total이 1페이지 초과인 경우)
          // pcmapTotal > 0이면 최대 (total/pageSize) 페이지까지, 최대 10페이지 제한 (1000개)
          if (firstPageSuccess && !foundPlace) {
            const estimatedPages = pcmapTotal > 0
              ? Math.min(10, Math.ceil(pcmapTotal / pcmapPageSize))
              : 10
            console.log(`[pcmap Apollo] ${estimatedPages}페이지까지 추가 크롤링 (pageSize≈${pcmapPageSize}, total=${pcmapTotal})`)

            for (let pageNum = 2; pageNum <= estimatedPages && !foundPlace; pageNum++) {
              const startIdx = (pageNum - 1) * pcmapPageSize + 1
              const pcmapUrl = `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}${coordParam}&type=all&display=100&start=${startIdx}`
              try {
                await new Promise(resolve => setTimeout(resolve, 400))  // 429 방지 딜레이
                const resp = await fetch(pcmapUrl, { headers: pcmapHeaders })
                if (resp.ok) {
                  const html = await resp.text()
                  const { items: pageResults } = extractFromPcmapApolloState(html)
                  console.log(`[pcmap Apollo] Page${pageNum} (start=${startIdx}): ${pageResults.length}개`)
                  if (pageResults.length === 0) {
                    console.log(`[pcmap Apollo] Page${pageNum} 결과 없음, 크롤링 종료`)
                    break
                  }
                  for (const item of pageResults) {
                    if (seenIds.has(item.id)) continue
                    seenIds.add(item.id)
                    places.push(item)
                    if (item.id === placeId) {
                      rank = places.length
                      placeName = item.name || placeName
                      foundPlace = true
                      console.log(`[pcmap Apollo] 🎯 Page${pageNum} 순위 ${rank}! Name: ${placeName}`)
                      break
                    }
                  }
                } else if (resp.status === 429) {
                  console.warn(`[pcmap Apollo] 429 Too Many Requests – Page${pageNum} 건너뜀`)
                  await new Promise(resolve => setTimeout(resolve, 2000))  // 2초 대기 후 계속
                } else if (resp.status === 400 || resp.status === 500) {
                  console.warn(`[pcmap Apollo] HTTP ${resp.status} – Page${pageNum} 크롤링 중단`)
                  break
                } else {
                  console.warn(`[pcmap Apollo] HTTP ${resp.status} – Page${pageNum}`)
                }
              } catch(e) {
                console.warn(`[pcmap Apollo] Page${pageNum} error:`, e instanceof Error ? e.message : String(e))
              }
            }
          }
          console.log(`[pcmap Apollo] 누적: ${places.length}개, found: ${foundPlace}, total=${pcmapTotal}`)
        }

        // -- 3차: search.naver.com PC 검색 (pcmap에서 못 찾은 경우 fallback)
        if (!foundPlace) {
          console.log(`[Search Apollo] Fallback 시작: ${keyword}`)
          const pcUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=place`
          await fetchAndProcessPage(pcUrl, 'Search Apollo', 1)
          // search.naver.com은 페이지네이션 미지원 - 1페이지만 시도
        }

        // -- 4차: 모바일 검색 페이지 1~5 (여전히 못 찾은 경우)
        if (!foundPlace) {
          console.log(`[Mobile Apollo] 1~5페이지 크롤링 시작: ${keyword}`)
          for (let pageNum = 1; pageNum <= 5 && !foundPlace; pageNum++) {
            // 모바일은 start=1,11,21,31,41 (10개씩)
            const mStart = (pageNum - 1) * 10 + 1
            const mobileUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=place&sm=mtb_jum&start=${mStart}`
            try {
              await new Promise(resolve => setTimeout(resolve, 400))
              const resp = await fetch(mobileUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'ko-KR,ko;q=0.9',
                  'Referer': 'https://m.search.naver.com/'
                }
              })
              if (resp.ok) {
                const html = await resp.text()
                const apolloResults = extractFromApolloState(html)
                const toProcess = apolloResults.length > 0 ? apolloResults : extractFromDocIds(html, new Set())
                console.log(`[Mobile Apollo] Page ${pageNum} (start=${mStart}): ${toProcess.length}개`)
                if (toProcess.length === 0) break
                for (const item of toProcess) {
                  if (seenIds.has(item.id)) continue
                  seenIds.add(item.id)
                  places.push(item)
                  if (item.id === placeId) {
                    rank = places.length
                    placeName = item.name || null
                    foundPlace = true
                    console.log(`[Mobile Apollo] 🎯 Page ${pageNum}, 순위 ${rank}!`)
                    break
                  }
                }
              } else if (resp.status === 429) {
                console.warn(`[Mobile Apollo] 429 – Page ${pageNum} 건너뜀`)
                await new Promise(resolve => setTimeout(resolve, 2000))
              } else {
                console.warn(`[Mobile Apollo] HTTP ${resp.status} – Page ${pageNum}`)
              }
            } catch (e) {
              console.warn(`[Mobile Apollo] Page ${pageNum} error:`, e instanceof Error ? e.message : String(e))
            }
          }
        }

        // -- 추가: pcmapTotal이 0이고 결과도 없으면 search.naver.com에서 totalCount 확보
        if (pcmapTotal === 0 && places.length === 0) {
          console.log(`[Search.naver totalCount] pcmap 결과 없음, search.naver.com에서 총 업체 수 확보 시도`)
          try {
            await new Promise(resolve => setTimeout(resolve, 300))
            const snUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=place`
            const snResp = await fetch(snUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'Referer': 'https://search.naver.com/'
              }
            })
            if (snResp.ok) {
              const snHtml = await snResp.text()
              // __APOLLO_STATE__ nxPlaces.total 추출
              try {
                const apolloIdx = snHtml.indexOf('__APOLLO_STATE__')
                if (apolloIdx >= 0) {
                  const stateStart = snHtml.indexOf('=', apolloIdx) + 1
                  let depth = 0, stateEnd = stateStart
                  for (let i = stateStart; i < snHtml.length; i++) {
                    if (snHtml[i] === '{') depth++
                    else if (snHtml[i] === '}') { depth--; if (depth === 0) { stateEnd = i + 1; break } }
                  }
                  const state = JSON.parse(snHtml.substring(stateStart, stateEnd).trim())
                  const rq = state['ROOT_QUERY']
                  if (rq) {
                    const nxKey = Object.keys(rq).find(k => k.startsWith('nxPlaces'))
                    if (nxKey && rq[nxKey]?.total > 0) {
                      pcmapTotal = rq[nxKey].total
                      console.log(`[Search.naver totalCount] nxPlaces.total = ${pcmapTotal}`)
                      // 결과 아이템도 수집
                      const items = rq[nxKey].items || []
                      for (const item of items) {
                        if (item.__ref?.startsWith('PlaceSummary:')) {
                          const id = item.__ref.replace('PlaceSummary:', '')
                          const ps = state[item.__ref]
                          const name = ps?.normalizedName || ps?.name || null
                          if (!seenIds.has(id)) {
                            seenIds.add(id)
                            places.push({ id, name })
                            if (id === placeId) {
                              rank = places.length; placeName = name; foundPlace = true
                              console.log(`[Search.naver] 🎯 순위 ${rank}! Name: ${name}`)
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch(parseErr) {
                console.warn('[Search.naver totalCount] Parse error:', parseErr)
              }
              // totalCount를 숫자로 HTML에서도 추출 시도
              if (pcmapTotal === 0) {
                const totalMatch = snHtml.match(/총\s*<em[^>]*>(\d[\d,]*)<\/em>\s*(?:개|건)/) ||
                                   snHtml.match(/"total"\s*:\s*(\d+)/) ||
                                   snHtml.match(/totalCount["']?\s*:\s*(\d+)/)
                if (totalMatch) {
                  pcmapTotal = parseInt(totalMatch[1].replace(/,/g, ''))
                  console.log(`[Search.naver totalCount] HTML에서 추출: ${pcmapTotal}`)
                }
              }
            }
          } catch(snErr) {
            console.warn('[Search.naver totalCount] Error:', snErr)
          }
        }

        // totalCount: pcmapTotal(전체 DB 수) 우선, 없으면 수집된 개수
        naverPlaceTotalCount = pcmapTotal  // 외부 스코프로 동기화
        totalCount = pcmapTotal > 0 ? pcmapTotal : places.length
        console.log(`[크롤링 완료] 총 수집: ${places.length}개, DB total: ${pcmapTotal}, 발견: ${foundPlace}, 순위: ${rank}`)
      }
      
      // 3차 시도: Cloudflare Puppeteer 크롤링 (MYBROWSER 있을 때만)
      if ((!foundPlace) && c.env.MYBROWSER) {
          // 🚀 Cloudflare Workers Puppeteer - 실제 브라우저 크롤링
          console.log(`[Puppeteer] Starting browser automation for: ${keyword}`)
          
          let browser = null
          try {
            browser = await puppeteer.launch(c.env.MYBROWSER)
            const places = []
            const seenIds = new Set()
            
            // 최대 5페이지까지 크롤링
            const MAX_PAGES = 5
            
            for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
              const start = (pageNum - 1) * 10 + 1
              const searchUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=m_view&sm=mtb_jum&start=${start}`
              
              console.log(`[Puppeteer Page ${pageNum}] Fetching: ${searchUrl}`)
              
              let page = null
              try {
                page = await browser.newPage()
                
                // 페이지 로드 (JavaScript 렌더링 대기)
                await page.goto(searchUrl, {
                  waitUntil: 'networkidle0',  // 네트워크가 조용해질 때까지
                  timeout: 30000
                })
                
                // 추가 2초 대기 (AJAX 요청 완료)
                await new Promise(resolve => setTimeout(resolve, 2000))
                
                // HTML 추출
                const html = await page.content()
                
                // Place ID 파싱
                const placePattern = /<li[^>]*data-loc_plc-doc-id="(\d+)"[^>]*>([\s\S]*?)<\/li>/g
                let placeMatch
                let pageResults = 0
                
                while ((placeMatch = placePattern.exec(html)) !== null) {
                  const foundId = placeMatch[1]
                  const content = placeMatch[2]
                  
                  // 중복 제거
                  if (seenIds.has(foundId)) continue
                  seenIds.add(foundId)
                  pageResults++
                  
                  // 업체명 추출
                  const nameMatch = content.match(/<span class="YwYLL">(.*?)<\/span>/)
                  let name = null
                  
                  if (nameMatch) {
                    name = nameMatch[1]
                      .replace(/<mark>/g, '')
                      .replace(/<\/mark>/g, '')
                      .replace(/\s+/g, ' ')
                      .trim()
                  }
                  
                  places.push({
                    id: foundId,
                    name: name || `Place ${foundId}`
                  })
                  
                  // 타겟 Place 발견
                  if (foundId === placeId) {
                    rank = places.length
                    placeName = name || null
                    foundPlace = true
                    console.log(`[Puppeteer Page ${pageNum}] 🎯 Found target place at rank ${rank}!`)
                    break
                  }
                }
                
                console.log(`[Puppeteer Page ${pageNum}] Found ${pageResults} new places (total: ${places.length})`)
                
                await page.close()
                page = null
                
                // 타겟을 찾았거나 결과가 없으면 중단
                if (foundPlace || pageResults === 0) {
                  break
                }
                
                // Rate limiting (페이지 간 1초 대기)
                await new Promise(resolve => setTimeout(resolve, 1000))
                
              } catch (pageError) {
                console.error(`[Puppeteer Page ${pageNum}] Error:`, pageError)
                if (page) await page.close()
                break
              }
            }
            
            totalCount = places.length
            console.log(`[Puppeteer] Completed. Total: ${totalCount}, Found: ${foundPlace}, Rank: ${rank}`)
            
          } catch (browserError) {
            console.error('[Puppeteer] Browser error:', browserError)
          } finally {
            if (browser) {
              await browser.close()
            }
          }
      }
      
      // 4차 시도: Browserless.io 크롤링 (BROWSERLESS_TOKEN 있을 때만)
      if ((!foundPlace) && c.env.BROWSERLESS_TOKEN) {
        const browserlessToken = c.env.BROWSERLESS_TOKEN
          // 🚀 Browserless.io를 통한 실제 브라우저 크롤링
          console.log(`[Browserless] Starting browser automation for: ${keyword}`)
          
          const places = []
          const seenIds = new Set()
          
          // 최대 5페이지까지 크롤링
          const MAX_PAGES = 5
          
          for (let page = 1; page <= MAX_PAGES; page++) {
            const start = (page - 1) * 10 + 1
            const searchUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=m_view&sm=mtb_jum&start=${start}`
            
            console.log(`[Browserless Page ${page}] Fetching: ${searchUrl}`)
            
            try {
              // Browserless.io API 호출 (실제 Chrome 브라우저 실행)
              const browserlessResponse = await fetch(`https://chrome.browserless.io/content?token=${browserlessToken}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  url: searchUrl,
                  waitFor: 2000, // 2초 대기 (JavaScript 렌더링)
                  gotoOptions: {
                    waitUntil: 'networkidle0' // 네트워크가 조용해질 때까지 대기
                  }
                })
              })
              
              if (!browserlessResponse.ok) {
                console.warn(`[Browserless Page ${page}] HTTP error: ${browserlessResponse.status}`)
                break
              }
              
              const html = await browserlessResponse.text()
              
              // 🎯 각 Place 항목 파싱
              const placePattern = /<li[^>]*data-loc_plc-doc-id="(\d+)"[^>]*>([\s\S]*?)<\/li>/g
              let placeMatch
              let pageResults = 0
              
              while ((placeMatch = placePattern.exec(html)) !== null) {
                const foundId = placeMatch[1]
                const content = placeMatch[2]
                
                // 중복 제거
                if (seenIds.has(foundId)) continue
                seenIds.add(foundId)
                pageResults++
                
                // 업체명 추출
                const nameMatch = content.match(/<span class="YwYLL">(.*?)<\/span>/)
                let name = null
                
                if (nameMatch) {
                  name = nameMatch[1]
                    .replace(/<mark>/g, '')
                    .replace(/<\/mark>/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                }
                
                places.push({
                  id: foundId,
                  name: name || `Place ${foundId}`
                })
                
                // 타겟 Place 발견
                if (foundId === placeId) {
                  rank = places.length
                  placeName = name || null
                  foundPlace = true
                  console.log(`[Browserless Page ${page}] 🎯 Found target place at rank ${rank}!`)
                  break
                }
              }
              
              console.log(`[Browserless Page ${page}] Found ${pageResults} new places (total: ${places.length})`)
              
              // 타겟을 찾았거나 결과가 없으면 중단
              if (foundPlace || pageResults === 0) {
                break
              }
              
              // Rate limiting (페이지 간 1초 대기)
              await new Promise(resolve => setTimeout(resolve, 1000))
              
            } catch (error) {
              console.error(`[Browserless Page ${page}] Error:`, error)
              break
            }
          }
          
          totalCount = places.length
          console.log(`[Browserless] Completed. Total: ${totalCount}, Found: ${foundPlace}, Rank: ${rank}`)
      }
      
      // 5차 시도 (최종 fallback): 강화된 Apollo State 크롤링
      if (!foundPlace) {
        console.log(`[Enhanced Web Crawl] Using enhanced crawl for: ${keyword}`)
        
        const places: Array<{id: string, name: string | null}> = []
        const seenIds = new Set<string>()
          
        // Apollo State 추출 함수 (재사용) - pcmap places() 키 우선
        const extractApolloIds = (html: string): Array<{id: string, name: string | null}> => {
          try {
            const apolloIdx = html.indexOf('__APOLLO_STATE__')
            if (apolloIdx < 0) return []
            const stateStart = html.indexOf('=', apolloIdx) + 1
            let depth = 0, stateEnd = stateStart
            for (let i = stateStart; i < html.length; i++) {
              if (html[i] === '{') depth++
              else if (html[i] === '}') { depth--; if (depth === 0) { stateEnd = i + 1; break } }
            }
            const state = JSON.parse(html.substring(stateStart, stateEnd).trim())
            const rq = state['ROOT_QUERY']
            if (!rq) return []
            // pcmap places() 키 우선
            const placesKey = Object.keys(rq).find(k => k.startsWith('places('))
            const nxKey = Object.keys(rq).find(k => k.startsWith('nxPlaces'))
            const activeKey = placesKey || nxKey
            if (!activeKey) return []
            const nx = rq[activeKey]
            if (!nx?.items || !Array.isArray(nx.items)) return []
            return nx.items
              .filter((i: any) => i.__ref?.startsWith('PlaceSummary:'))
              .map((i: any) => {
                const id = i.__ref.replace('PlaceSummary:', '')
                const ps = state[i.__ref]
                return { id, name: ps?.normalizedName || ps?.name || null }
              })
          } catch { return [] }
        }
          
        // 다중 URL 패턴으로 검색 (pcmap 우선 + search.naver + Mobile)
        const searchUrls = [
          { url: `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}&type=all&display=100&start=1`, pc: true, pcmap: true },
          { url: `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=place`, pc: true, pcmap: false },
          { url: `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=place&sm=mtb_jum`, pc: false, pcmap: false },
        ]
        
        for (const { url: searchUrl, pc, pcmap } of searchUrls) {
          console.log(`[Enhanced Web Crawl] Trying URL: ${searchUrl}`)
          
          try {
            const response = await fetch(searchUrl, {
              headers: pcmap ? {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'Referer': `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}`,
                'Cache-Control': 'no-cache'
              } : pc ? {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'Referer': 'https://search.naver.com/'
              } : {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'Referer': 'https://m.search.naver.com/'
              }
            })
            
            if (!response.ok) continue
            
            const html = await response.text()
            
            // Apollo State 우선 추출 (정확한 순서)
            const apolloItems = extractApolloIds(html)
            let variantCount = 0
            
            if (apolloItems.length > 0) {
              // Apollo State 결과 사용
              for (const item of apolloItems) {
                if (seenIds.has(item.id)) continue
                seenIds.add(item.id)
                variantCount++
                places.push(item)
                
                if (item.id === placeId) {
                  rank = places.length
                  placeName = item.name
                  foundPlace = true
                  console.log(`[Enhanced Web Crawl] 🎯 Found via Apollo State at rank ${rank}! Name: ${item.name}`)
                  break
                }
              }
            } else {
              // Apollo State 없으면 data-loc_plc-doc-id로 fallback
              const p1 = /data-loc_plc-doc-id="(\d+)"/g
              let m
              while ((m = p1.exec(html)) !== null) {
                const foundId = m[1]
                if (seenIds.has(foundId)) continue
                seenIds.add(foundId)
                variantCount++
                places.push({ id: foundId, name: null })
                if (foundId === placeId) {
                  rank = places.length
                  foundPlace = true
                  console.log(`[Enhanced Web Crawl] 🎯 Found via docId at rank ${rank}!`)
                  break
                }
              }
            }
            
            console.log(`[Enhanced Web Crawl] URL "${searchUrl}": found ${variantCount} new places (total: ${places.length})`)
            
            if (foundPlace) {
              console.log(`[Enhanced Web Crawl] Target found! Stopping search.`)
              break
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
            
          } catch (error) {
            console.error(`[Enhanced Web Crawl] Error with URL "${searchUrl}":`, error)
          }
        }
          
        totalCount = places.length
        console.log(`[Enhanced Web Crawl] Completed. Total: ${totalCount}, Found: ${foundPlace}`)
      }
      
      // 검색 결과를 찾지 못한 경우
      if (!foundPlace) {
        console.warn(`Place ${placeId} not found in search results for "${keyword}" (checked ${totalCount} places across ${Math.ceil(totalCount / 10)} pages)`)
        
        // Place 정보 직접 조회
        try {
          console.log(`[Place Name] Fetching place info from: https://m.place.naver.com/place/${placeId}/home`)
          const placeResponse = await fetch(`https://m.place.naver.com/place/${placeId}/home`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
            }
          })
          
          if (placeResponse.ok) {
            const placeHtml = await placeResponse.text()
            
            // 1. JSON 데이터에서 "name" 추출 (가장 정확)
            const jsonNameMatch = placeHtml.match(/"name"\s*:\s*"([^"]+)"/)
            if (jsonNameMatch) {
              placeName = jsonNameMatch[1].trim()
              console.log(`[Place Name] Found from JSON: ${placeName}`)
            }
            
            // 2. title 태그에서 추출 (fallback)
            if (!placeName) {
              const titleMatch = placeHtml.match(/<title>([^<]+)<\/title>/)
              if (titleMatch) {
                placeName = titleMatch[1]
                  .replace(/\s*[-|].*$/, '') // " - 네이버" 등 제거
                  .replace(/네이버\s*플레이스/g, '') // "네이버 플레이스" 제거
                  .trim()
                console.log(`[Place Name] Found from title: ${placeName}`)
              }
            }
            
            // 3. og:title 메타태그에서 추출 (fallback)
            if (!placeName) {
              const ogTitleMatch = placeHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)
              if (ogTitleMatch) {
                placeName = ogTitleMatch[1]
                  .replace(/\s*[-|].*$/, '')
                  .trim()
                console.log(`[Place Name] Found from og:title: ${placeName}`)
              }
            }
            
            console.log(`[Place Name] Final result: ${placeName || 'NOT FOUND'}`)
          }
        } catch (e) {
          console.warn('[Place Name] Failed to fetch place info:', e.message)
        }
        
        // totalCount가 0이면 naverPlaceTotalCount로 재설정
        if (totalCount === 0 && naverPlaceTotalCount > 0) totalCount = naverPlaceTotalCount
        
        // 순위 없음: DB에 rank=null로 저장하고 totalCount와 함께 성공 응답
        const dbForNotFound = c.env.DB || c.env.marketing
        if (dbForNotFound && placeName) {
          try {
            await dbForNotFound.prepare(`
              INSERT INTO naver_place_ranks (
                user_id, place_id, place_url, keyword, location, 
                rank_number, total_count, place_name, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(
              authUser.userId, placeId, placeUrl || '', keyword, location || '', 
              null, totalCount, placeName
            ).run()
          } catch (dbError) {
            console.warn('[Rank] DB save (not found) failed:', dbError)
          }
        }
        
        return c.json({
          success: true,
          found: false,
          rank: null,
          totalCount: totalCount,
          keyword: keyword,
          placeId: placeId,
          placeName: placeName || `Place ${placeId}`,
          percentage: null,
          message: `'${keyword}' 검색 결과 총 ${totalCount}개 업체 중 해당 플레이스가 없습니다. (순위권 밖)`
        })
      }
      
    } catch (crawlError) {
      console.error('Crawling failed:', crawlError)
      return c.json({
        success: false,
        error: '크롤링 처리 중 오류가 발생했습니다.',
        details: '네이버 검색 페이지 접근 중 오류가 발생했습니다.'
      }, 500)
    }
    
    // Place 이름이 없으면 키워드 기반으로 생성
    if (!placeName) {
      // 키워드에서 업종/지역 추출하여 Place 이름 생성
      const keywordParts = keyword.split(' ')
      if (keywordParts.length >= 2) {
        placeName = `${keywordParts[keywordParts.length - 1]} (${placeId})`
      } else {
        placeName = `${keyword} 업체 (${placeId})`
      }
    }
    
    // DB 저장 (히스토리 추적용)
    const db = c.env.DB || c.env.marketing
    if (db) {
      try {
        await db.prepare(`
          INSERT INTO naver_place_ranks (
            user_id, place_id, place_url, keyword, location, 
            rank_number, total_count, place_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          authUser.userId, placeId, placeUrl || '', keyword, location || '', 
          rank, totalCount, placeName
        ).run()
        console.log('[Rank] Successfully saved to DB:', { rank, placeId, keyword })
      } catch (dbError) {
        console.warn('[Rank] DB save failed:', dbError)
      }
    } else {
      console.warn('[Rank] No DB binding available, skipping save')
    }
    
    // 항상 성공 응답 반환 (rank는 크롤링된 실제 순위)
    return c.json({
      success: true,
      rank: rank,
      found: true,
      totalCount: totalCount,
      keyword: keyword,
      placeId: placeId,
      placeName: placeName,
      percentage: totalCount > 0 ? ((rank / totalCount) * 100).toFixed(1) : '?',
      message: `'${keyword}' 검색 시 ${rank}위입니다. (전체 ${totalCount}개 업체 중, 광고 제외)`
    })
  } catch (error) {
    console.error('Error checking place rank:', error)
    return c.json({ success: false, error: '순위 확인 실패: '  }, 500)
  }
}
