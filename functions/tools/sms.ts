import { smsPage } from './_sms_page'

export const onRequestGet: PagesFunction = async () =>
  new Response(smsPage, { headers: { 'content-type': 'text/html; charset=utf-8' } })
