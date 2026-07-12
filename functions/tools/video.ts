import { videoMakerPage } from './_video_page'

export const onRequestGet: PagesFunction = async () =>
  new Response(videoMakerPage, { headers: { 'content-type': 'text/html; charset=utf-8' } })
