import { blogAnalysisPage } from './_blog_page'

export const onRequestGet: PagesFunction = async () =>
  new Response(blogAnalysisPage, { headers: { 'content-type': 'text/html; charset=utf-8' } })
