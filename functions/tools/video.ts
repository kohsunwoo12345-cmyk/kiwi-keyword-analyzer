import { videoMakerPage } from './_video_page'
import { withEmojiParser } from './_emoji'

export const onRequestGet: PagesFunction = async () =>
  new Response(withEmojiParser(videoMakerPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
