import { smsPage } from './_sms_page'
import { withEmojiParser } from './_emoji'

export const onRequestGet: PagesFunction = async () =>
  new Response(withEmojiParser(smsPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
