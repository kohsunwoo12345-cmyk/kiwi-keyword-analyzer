import { youtubeUnifiedPage } from './_youtube_page'
import { withEmojiParser } from './_emoji'

// 유튜브 분석 페이지 — 이모지를 고퀄 SVG 로 표시(로고는 유튜브 브랜드 SVG 유지)
export const onRequestGet: PagesFunction = async () =>
  new Response(withEmojiParser(youtubeUnifiedPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
