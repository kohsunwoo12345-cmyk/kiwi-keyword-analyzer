import { blogAnalysisPage } from './_blog_page'
import { withEmojiParser } from './_emoji'

export const onRequestGet: PagesFunction = async () =>
  new Response(withEmojiParser(blogAnalysisPage), { headers: { 'content-type': 'text/html; charset=utf-8' } })
