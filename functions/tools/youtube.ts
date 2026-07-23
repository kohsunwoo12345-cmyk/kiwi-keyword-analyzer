import { youtubeUnifiedPage } from './_youtube_page'
import { stripEmojis } from './_emoji'

// 유튜브 분석 페이지 — 이모지 전부 제거(유튜브 로고 SVG 만 유지)
export const onRequestGet: PagesFunction = async () =>
  new Response(stripEmojis(youtubeUnifiedPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
