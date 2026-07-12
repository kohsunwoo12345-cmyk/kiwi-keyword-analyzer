import { instagramUnifiedPage } from './_instagram_page'

export const onRequestGet: PagesFunction = async () =>
  new Response(instagramUnifiedPage, { headers: { 'content-type': 'text/html; charset=utf-8' } })
