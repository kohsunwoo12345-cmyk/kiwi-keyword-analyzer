import { instagramUnifiedPage } from './_instagram_page'
import { withEmojiParser } from './_emoji'

export const onRequestGet: PagesFunction = async () =>
  new Response(withEmojiParser(instagramUnifiedPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
