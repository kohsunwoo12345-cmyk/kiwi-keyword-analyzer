// Ported from SUPERPLACE (BYGENCY) — Hono 핸들러를 Cloudflare Pages Functions로 변환.
// 시스템/크론 엔드포인트: CRON_TOKEN 게이트 유지. 토큰이 없으면 실제 세션으로 fallback하되
// 본인 추적만 처리하여 교차 사용자 데이터 노출/수정을 방지한다.
import { getSessionUser, resolveDB } from '../_utils'
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
const kvRateLimit = async (..._a: any[]): Promise<boolean> => true
async function triggerDailyRankUpdateIfNeeded(_env?: any, _ctx?: any): Promise<void> {}
const puppeteer: any = (globalThis as any).puppeteer

export const onRequestPost: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    // 크론 인증: CRON_TOKEN 일치(시스템 전체 배치) OR 로그인된 세션(본인 추적만) 허용
    const cronToken = c.req.header('X-Cron-Token')
    const expectedToken = c.env.CRON_TOKEN || ''
    const knownTokens = [expectedToken].filter(Boolean)
    const tokenOk = knownTokens.length > 0 && knownTokens.includes(cronToken || '')

    const db = resolveDB(c.env) || c.env.DB || c.env.marketing
    if (!db) return c.json({ success: false, error: 'DB 바인딩 없음' }, 500)

    // 크론 토큰이 없으면 실제 세션으로 fallback — 이 경우 본인 추적만 처리(교차 사용자 차단)
    let sessionUserId: string | null = null
    if (!tokenOk) {
      const me: any = await getSessionUser(context.request, db)
      if (!me) {
        return c.json({ success: false, error: 'Unauthorized', needLogin: true }, 401)
      }
      sessionUserId = me.id
    }

    // 배치 처리 지원: offset/limit 쿼리 파라미터
    const offset = parseInt(c.req.query('offset') || '0', 10)
    const batchSize = parseInt(c.req.query('limit') || '20', 10)

    // 활성 추적 키워드 가져오기 (세션 fallback이면 본인 것만)
    const userScope = sessionUserId ? ' AND user_id = ?' : ''
    const bindArgs: any[] = sessionUserId ? [sessionUserId, batchSize, offset] : [batchSize, offset]
    let trackingList = []
    try {
      const data = await db.prepare(`
        SELECT * FROM naver_place_tracking
        WHERE status = 'active'${userScope}
        ORDER BY COALESCE(last_check, '1970-01-01') ASC
        LIMIT ? OFFSET ?
      `).bind(...bindArgs).all()
      trackingList = data.results || []
    } catch (dbError: any) {
      // NULLS FIRST 미지원 SQLite fallback
      try {
        const data2 = await db.prepare(`
          SELECT * FROM naver_place_tracking
          WHERE status = 'active'${userScope}
          ORDER BY last_check ASC
          LIMIT ? OFFSET ?
        `).bind(...bindArgs).all()
        trackingList = data2.results || []
      } catch (e2) {
        return c.json({ success: false, error: 'DB 조회 실패' }, 500)
      }
    }
    
    const results = []
    
    // 각 추적 항목에 대해 순위 체크
    let successCount = 0
    let errorCount = 0
    
    for (const tracking of trackingList) {
      try {
        // 순위 체크 로직
        const placeId = tracking.place_id
        const keyword = tracking.keyword
        const placeUrl = tracking.place_url
        
        let rank: number | null = null
        let totalCount = 0
        let placeName: string | null = null
        let foundPlace = false
        
        console.log(`[Cron] Checking: ${keyword} for Place ${placeId}`)

        // ── pcmap Apollo State 파서 (전체 업체 수 + 순위 동시 추출) ──
        const parsePcmapApollo = (html: string): { items: Array<{id: string, name: string | null}>, total: number } => {
          const items: Array<{id: string, name: string | null}> = []
          let total = 0
          try {
            const apolloIdx = html.indexOf('__APOLLO_STATE__')
            if (apolloIdx < 0) return { items, total }
            const stateStart = html.indexOf('=', apolloIdx) + 1
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
            const rq = state['ROOT_QUERY']
            if (!rq) return { items, total }
            // places() → restaurantList() → placeList() → nxPlaces() 우선순위
            // placeList는 {businesses:{items}} 구조, 나머지는 {items} 구조
            const getActualItems = (v: any): any[] => {
              if (!v || typeof v !== 'object') return []
              if (Array.isArray(v.businesses?.items) && v.businesses.items.length > 0) return v.businesses.items
              if (Array.isArray(v.items) && v.items.length > 0) return v.items
              return []
            }
            const listKey = Object.keys(rq).find(k =>
              k.startsWith('places(') || k.startsWith('restaurantList(') ||
              k.startsWith('placeList(') || k.startsWith('nxPlaces(')
            ) || Object.keys(rq).filter(k => {
              return getActualItems(rq[k]).length > 0
            }).sort((a, b) => getActualItems(rq[b]).length - getActualItems(rq[a]).length)[0]
            if (!listKey) return { items, total }
            const listData = rq[listKey]
            // placeList 구조: {businesses: {total, items}} 또는 places/nxPlaces 구조: {total, items}
            const actualItems2: any[] = listData?.businesses?.items || listData?.items || []
            const actualTotal2: number = listData?.businesses?.total || listData?.total || 0
            if (!Array.isArray(actualItems2) || actualItems2.length === 0) {
              if (actualTotal2 > 0) total = actualTotal2
              return { items, total }
            }
            if (actualTotal2 > 0) total = actualTotal2
            for (const item of actualItems2) {
              const ref = item.__ref || ''
              const colonIdx = ref.lastIndexOf(':')
              const id = colonIdx >= 0 ? ref.substring(colonIdx + 1) : ''
              if (id && /^\d+$/.test(id)) {
                const ps = state[ref]
                items.push({ id, name: ps?.normalizedName || ps?.name || null })
              }
            }
          } catch (e) {
            console.warn('[Cron pcmap] Parse error:', e instanceof Error ? e.message : String(e))
          }
          return { items, total }
        }

        // ── 1차: pcmap.place.naver.com/place/list (다중 페이지, 전체 업체 수 정확) ──
        try {
          const pcmapHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Referer': `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}`,
            'Cache-Control': 'no-cache'
          }
          const places: Array<{id: string, name: string | null}> = []
          const seenIds = new Set<string>()
          let pcmapTotal = 0
          let pageSize = 100

          // 1페이지
          for (const disp of [100, 70, 50]) {
            try {
              await new Promise(r => setTimeout(r, 300))
              const resp = await fetch(
                `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}&type=all&display=${disp}&start=1`,
                { headers: pcmapHeaders }
              )
              if (!resp.ok) continue
              const html = await resp.text()
              const { items, total } = parsePcmapApollo(html)
              if (total > 0) pcmapTotal = total
              console.log(`[Cron pcmap] Page1 disp=${disp}: ${items.length}개, total=${pcmapTotal}`)
              if (items.length > 0 || pcmapTotal > 0) {
                if (items.length > 0) pageSize = items.length
                for (const item of items) {
                  if (seenIds.has(item.id)) continue
                  seenIds.add(item.id)
                  places.push(item)
                  if (item.id === placeId) {
                    rank = places.length
                    placeName = item.name || placeName
                    foundPlace = true
                    console.log(`[Cron pcmap] 🎯 Page1 순위 ${rank}! Name: ${placeName}`)
                  }
                }
                break
              }
            } catch (e) { console.warn(`[Cron pcmap] Page1 disp=${disp} error:`, e instanceof Error ? e.message : String(e)) }
          }

          // 2~10페이지 (아직 못 찾은 경우)
          if (!foundPlace && places.length > 0) {
            const maxPages = pcmapTotal > 0 ? Math.min(10, Math.ceil(pcmapTotal / pageSize)) : 10
            console.log(`[Cron pcmap] ${maxPages}페이지까지 추가 크롤링 (total=${pcmapTotal})`)
            for (let pg = 2; pg <= maxPages && !foundPlace; pg++) {
              const startIdx = (pg - 1) * pageSize + 1
              try {
                await new Promise(r => setTimeout(r, 400))
                const resp = await fetch(
                  `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}&type=all&display=100&start=${startIdx}`,
                  { headers: pcmapHeaders }
                )
                if (!resp.ok) { if (resp.status === 400 || resp.status === 500) break; continue }
                const html = await resp.text()
                const { items } = parsePcmapApollo(html)
                console.log(`[Cron pcmap] Page${pg} (start=${startIdx}): ${items.length}개`)
                if (items.length === 0) break
                for (const item of items) {
                  if (seenIds.has(item.id)) continue
                  seenIds.add(item.id)
                  places.push(item)
                  if (item.id === placeId) {
                    rank = places.length
                    placeName = item.name || placeName
                    foundPlace = true
                    console.log(`[Cron pcmap] 🎯 Page${pg} 순위 ${rank}!`)
                    break
                  }
                }
              } catch (e) { console.warn(`[Cron pcmap] Page${pg} error:`, e instanceof Error ? e.message : String(e)) }
            }
          }

          // totalCount: pcmap total 우선, 없으면 수집 개수
          totalCount = pcmapTotal > 0 ? pcmapTotal : places.length
          console.log(`[Cron pcmap] 완료: 수집=${places.length}개, DB total=${pcmapTotal}, found=${foundPlace}, rank=${rank}`)
        } catch (pcmapErr) {
          console.warn('[Cron pcmap] Error:', pcmapErr instanceof Error ? pcmapErr.message : String(pcmapErr))
        }

        // ── 2차: Puppeteer (MYBROWSER 있을 때, pcmap 실패 시) ──
        if (!foundPlace && c.env.MYBROWSER) {
          let browser = null
          try {
            browser = await puppeteer.launch(c.env.MYBROWSER)
            const places: Array<{id: string, name: string | null}> = []
            const seenIds = new Set<string>()
            for (let pageNum = 1; pageNum <= 5 && !foundPlace; pageNum++) {
              const start = (pageNum - 1) * 10 + 1
              const searchUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=m_view&sm=mtb_jum&start=${start}`
              console.log(`[Cron Puppeteer Page ${pageNum}] URL: ${searchUrl}`)
              let page = null
              try {
                page = await browser.newPage()
                await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 })
                await new Promise(r => setTimeout(r, 2000))
                const html = await page.content()
                const placePattern = /<li[^>]*data-loc_plc-doc-id="(\d+)"[^>]*>([\s\S]*?)<\/li>/g
                let placeMatch, pageResults = 0
                while ((placeMatch = placePattern.exec(html)) !== null) {
                  const foundId = placeMatch[1]
                  const content = placeMatch[2]
                  if (seenIds.has(foundId)) continue
                  seenIds.add(foundId); pageResults++
                  const nameMatch = content.match(/<span class="YwYLL">(.*?)<\/span>/)
                  let name = null
                  if (nameMatch) name = nameMatch[1].replace(/<mark>/g, '').replace(/<\/mark>/g, '').replace(/\s+/g, ' ').trim()
                  places.push({ id: foundId, name: name || `Place ${foundId}` })
                  if (foundId === placeId) {
                    rank = places.length; placeName = name || null; foundPlace = true
                    console.log(`[Cron Puppeteer] Found at rank ${rank}!`); break
                  }
                }
                await page.close(); page = null
                if (foundPlace || pageResults === 0) break
                await new Promise(r => setTimeout(r, 1000))
              } catch (pageError) {
                console.error(`[Cron Puppeteer Page ${pageNum}] Error:`, pageError)
                if (page) await page.close()
                break
              }
            }
            if (totalCount === 0) totalCount = places.length
            console.log(`[Cron Puppeteer] 완료. Total: ${totalCount}, Found: ${foundPlace}, Rank: ${rank}`)
          } catch (browserError) {
            console.error('[Cron Puppeteer] Browser error:', browserError)
          } finally {
            if (browser) await browser.close()
          }
        }
        
        // ── 3차: Fallback — search.naver.com Apollo State (최종 보험) ──
        if (!foundPlace) {
          try {
            console.log(`[Cron Fallback] Using Apollo State crawl for: ${keyword}`)
            const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=place`
            const response = await fetch(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'Referer': 'https://search.naver.com/'
              }
            })
            const html = await response.text()
            let currentRank = 0
            const cronSeenIds = new Set<string>()
            try {
              const apolloIdx = html.indexOf('__APOLLO_STATE__')
              if (apolloIdx >= 0) {
                const stateStart = html.indexOf('=', apolloIdx) + 1
                let depth = 0, stateEnd = stateStart
                for (let i = stateStart; i < html.length; i++) {
                  if (html[i] === '{') depth++
                  else if (html[i] === '}') { depth--; if (depth === 0) { stateEnd = i + 1; break } }
                }
                const state = JSON.parse(html.substring(stateStart, stateEnd).trim())
                const rq = state['ROOT_QUERY']
                const nxKey = rq ? Object.keys(rq).find(k => k.startsWith('nxPlaces')) : null
                if (nxKey) {
                  const nx = rq[nxKey]
                  if (nx?.total > 0 && totalCount === 0) totalCount = nx.total
                  if (nx?.items && Array.isArray(nx.items)) {
                    for (const item of nx.items) {
                      if (!item.__ref?.startsWith('PlaceSummary:')) continue
                      const foundId = item.__ref.replace('PlaceSummary:', '')
                      if (cronSeenIds.has(foundId)) continue
                      cronSeenIds.add(foundId); currentRank++
                      if (foundId === placeId) {
                        rank = currentRank
                        if (totalCount === 0) totalCount = nx.total || currentRank
                        const ps = state[item.__ref]
                        placeName = ps?.normalizedName || ps?.name || null
                        console.log(`[Cron Fallback] Apollo State: Found at rank ${rank}/${totalCount}`)
                        break
                      }
                    }
                    if (!rank && totalCount === 0) totalCount = currentRank
                  }
                }
              }
            } catch (apolloErr) {
              console.warn('[Cron Fallback] Apollo State parse error:', apolloErr)
            }
            // Apollo 실패 시 data-loc_plc-doc-id fallback
            if (rank === null) {
              const placePattern = /data-loc_plc-doc-id="(\d+)"/g
              const fallbackSeen = new Set<string>()
              let fallbackRank = 0, m
              while ((m = placePattern.exec(html)) !== null) {
                const foundId = m[1]
                if (fallbackSeen.has(foundId)) continue
                fallbackSeen.add(foundId); fallbackRank++
                if (foundId === placeId) {
                  rank = fallbackRank
                  if (totalCount === 0) totalCount = fallbackSeen.size
                  console.log(`[Cron Fallback] docId fallback: Found at rank ${rank}`)
                  break
                }
              }
              if (!rank && totalCount === 0) totalCount = fallbackRank
            }
          } catch (crawlError) {
            console.warn('[Cron Fallback] Error:', crawlError)
          }
        }
        
        // DB에 순위 저장
        if (rank !== null) {
          try {
            await db.prepare(`
              INSERT INTO naver_place_ranks (
                user_id, place_id, place_url, keyword, location,
                rank_number, total_count, place_name, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(
              tracking.user_id, placeId, placeUrl, keyword, tracking.location || '',
              rank, totalCount, placeName || tracking.place_name || `Place ${placeId}`
            ).run()
            
            console.log(`[Cron] ✅ Saved rank ${rank}/${totalCount} for ${keyword}`)
          } catch (dbError) {
            console.warn('[Cron] DB insert failed:', dbError)
          }
        } else {
          console.log(`[Cron] ⚠️  Place not found for ${keyword}`)
        }
        
        // 마지막 체크 시간 업데이트
        try {
          await db.prepare(`
            UPDATE naver_place_tracking
            SET last_check = datetime('now'), last_rank = ?
            WHERE id = ?
          `).bind(rank, tracking.id).run()
        } catch (dbError) {
          console.warn('[Cron] DB update failed:', dbError)
        }
        
        results.push({
          placeId: placeId,
          keyword: keyword,
          rank: rank,
          totalCount: totalCount,
          success: rank !== null
        })
        
        if (rank !== null) {
          successCount++
        } else {
          errorCount++
        }
        
        // Rate limiting (2초 대기)
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error('[Cron] Error updating tracking', tracking.id, error)
        errorCount++
        results.push({
          placeId: tracking.place_id,
          keyword: tracking.keyword,
          success: false,
          error: '요청 처리 중 오류가 발생했습니다.'
        })
      }
    }
    
    console.log(`[Cron] Summary - Success: ${successCount}, Error: ${errorCount}`)
    
    return c.json({
      success: true,
      updated: results.length,
      successCount: successCount,
      errorCount: errorCount,
      results: results
    })
  } catch (error) {
    console.error('Error in cron update:', error)
    return c.json({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
