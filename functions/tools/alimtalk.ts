import { alimtalkPage } from './_alimtalk_page'
import { withEmojiParser } from './_emoji'

export const onRequestGet: PagesFunction = async () =>
  new Response(withEmojiParser(alimtalkPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
