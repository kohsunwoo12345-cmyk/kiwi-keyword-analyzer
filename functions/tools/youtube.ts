import { youtubeUnifiedPage } from './_youtube_page'

export const onRequestGet: PagesFunction = async () =>
  new Response(youtubeUnifiedPage, { headers: { 'content-type': 'text/html; charset=utf-8' } })
