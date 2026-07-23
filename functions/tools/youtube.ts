import { youtubeUnifiedPage } from './_youtube_page'
import { withEmojiParser } from './_emoji'

export const onRequestGet: PagesFunction = async () =>
  new Response(withEmojiParser(youtubeUnifiedPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
