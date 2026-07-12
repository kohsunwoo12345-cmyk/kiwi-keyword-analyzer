import { naverPlaceRankPage } from './_place_page'

export const onRequestGet: PagesFunction = async () =>
  new Response(naverPlaceRankPage, { headers: { 'content-type': 'text/html; charset=utf-8' } })
