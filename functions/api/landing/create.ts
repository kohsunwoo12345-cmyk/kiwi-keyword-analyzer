// SUPERPLACE 이식: POST /api/landing/create — 커스텀 HTML 랜딩페이지 생성 (구독한도 게이팅 제거, 관리자/회원 공용)
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema, randSlug, extractFormFields, landingIdShape, newLandingId } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 200)

  const b: any = await request.json().catch(() => ({}))
  const title = String(b.title || '제목 없음').trim()
  const subtitle = b.subtitle != null ? String(b.subtitle) : null
  const template_type = String(b.template_type || 'custom')
  const input_data = b.input_data || {}
  const og_title = b.og_title || null
  const og_description = b.og_description || null
  const thumbnail_url = b.thumbnail_url || null
  // ⚠ folder_id 를 그대로 믿었다 — 남의 폴더 번호를 적어 그 폴더 안에 페이지를 만들 수 있었다
  //   (move-to-folder 와 같은 문제). 내 폴더가 아니면 폴더 없음으로 만든다.
  let folder_id = b.folder_id || null
  if (folder_id) {
    const own = await db.prepare('SELECT id FROM landing_folders WHERE id = ? AND user_id = ?').bind(folder_id, me.id).first().catch(() => null)
    if (!own) folder_id = null
  }
  const form_id = b.form_id || null

  // 커스텀 빌더: input_data.html 을 그대로 저장
  let html = String((input_data && input_data.html) || b.html_content || '')
  const slug = randSlug()
  if (html.includes('SLUG_HERE')) html = html.replace(/SLUG_HERE/g, slug)

  const origin = new URL(request.url).origin
  const landingUrl = `${origin}/landing/${slug}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(landingUrl)}`
  const formFields = b.form_fields || extractFormFields(html)

  // ⚠ 빌더가 "저장 & 배포" 로 보내는 header_script(픽셀/헤드 태그) 를 예전에는 아예 버렸다.
  //   새로 만들 때 넣은 픽셀이 조용히 사라져, 편집으로 다시 넣기 전까지 추적이 안 됐다.
  const header_script = b.header_script ? String(b.header_script).slice(0, 20000) : null

  try {
    // ⚠ 실제 배포본 테이블은 id TEXT PRIMARY KEY · created_at NOT NULL(기본값 없음) 이라
    //   id/created_at 을 빼고 넣으면 NOT NULL 로 매번 터졌다 = 랜딩 새로 만들기가 아예 안 됐다.
    const shape = await landingIdShape(db)
    const cols = ['user_id', 'academy_id', 'slug', 'title', 'subtitle', 'template_type', 'content_json', 'content', 'html_content', 'qr_code_url', 'thumbnail_url', 'og_title', 'og_description', 'folder_id', 'form_id', 'form_fields', 'header_script', 'status']
    const vals: any[] = [
      me.id, me.academy_id || me.id, slug, title, subtitle, template_type,
      JSON.stringify({ ...(input_data || {}), html: '__inline__' }), html, html,
      qrCodeUrl, thumbnail_url, og_title, og_description, folder_id, form_id, formFields, header_script, 'published',
    ]
    const newId = shape.textId ? newLandingId() : null
    if (newId) { cols.unshift('id'); vals.unshift(newId) }
    const nowIso = new Date().toISOString()
    if (shape.needsCreatedAt) { cols.push('created_at', 'updated_at'); vals.push(nowIso, nowIso) }
    const res = await db.prepare(
      `INSERT INTO landing_pages (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    ).bind(...vals).run()
    return j({ success: true, message: '랜딩페이지가 생성되었습니다.', slug, url: `/landing/${slug}`, qrCodeUrl, id: newId || res.meta.last_row_id })
  } catch (e: any) {
    return j({ success: false, error: '랜딩페이지 생성 실패: ' + String(e?.message || e).slice(0, 160) }, 200)
  }
}
