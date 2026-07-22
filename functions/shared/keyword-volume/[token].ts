// Ported from SUPERPLACE: GET /shared/keyword-volume/:token (src/index.tsx ~121632)
// 공개 열람 페이지 (로그인 불필요) — 저장된 키워드 검색량 리포트를 HTML 로 렌더
import { resolveDB } from '../../api/_utils'
import { spKwSharedHtml } from '../../api/blog-analysis/_naver'

const htmlResp = (html: string, status = 200) =>
  new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })

export const onRequestGet: PagesFunction = async ({ params, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return htmlResp('<!DOCTYPE html><meta charset="UTF-8"><body style="font-family:sans-serif;padding:40px">DB 연결이 필요합니다.</body>', 500)
    const token = String((params as any).token || '')
    const row = await db.prepare("SELECT payload_json FROM blog_keyword_volume_shares WHERE token = ? AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))").bind(token).first().catch(() => null) as any
    if (!row) return htmlResp('<!DOCTYPE html><meta charset="UTF-8"><body style="font-family:sans-serif;padding:40px">공유 링크가 없거나 만료되었습니다.</body>', 404)
    let payload = {}
    try { payload = JSON.parse(row.payload_json || '{}') } catch (_) {}
    return htmlResp(spKwSharedHtml(payload))
  } catch (error) {
    console.error('[keyword-volume] shared page failed:', error)
    return htmlResp('<!DOCTYPE html><meta charset="UTF-8"><body style="font-family:sans-serif;padding:40px">공유 리포트를 불러오지 못했습니다.</body>', 500)
  }
}
