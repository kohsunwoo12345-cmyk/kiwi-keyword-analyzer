import { naverPlaceRankPage } from './_place_page'
import { withEmojiParser } from './_emoji'

export const onRequestGet: PagesFunction = async () =>
  new Response(withEmojiParser(naverPlaceRankPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
