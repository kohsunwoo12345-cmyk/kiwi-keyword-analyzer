import { alimtalkPage } from './_alimtalk_page'

export const onRequestGet: PagesFunction = async () =>
  new Response(alimtalkPage, { headers: { 'content-type': 'text/html; charset=utf-8' } })
