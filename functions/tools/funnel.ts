import { funnelBuilderPage } from './_funnel_page'

export const onRequestGet: PagesFunction = async () =>
  new Response(funnelBuilderPage, { headers: { 'content-type': 'text/html; charset=utf-8' } })
