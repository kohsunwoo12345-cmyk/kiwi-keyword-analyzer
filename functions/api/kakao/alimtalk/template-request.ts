import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../../_utils'
import { aligoTemplateRequest } from '../../_aligo'

// POST /api/kakao/alimtalk/template-request { tplCode, senderkey? } → 기존 템플릿 승인(심사) 재요청
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const tplCode = String(b.tplCode || b.templateId || '').trim()
  if (!tplCode) return json({ ok: false, error: '템플릿 코드가 필요합니다.' }, 400)
  let senderKey = String(b.senderkey || b.senderKey || '').trim()
  if (!senderKey) {
    const ch: any = await db.prepare('SELECT channel_id FROM kakao_channels WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(me.id).first().catch(() => null)
    if (ch?.channel_id) senderKey = String(ch.channel_id)
  }
  if (!senderKey) senderKey = String((env as any)?.ALIGO_SENDER_KEY || '')

  const r = await aligoTemplateRequest(env, { senderKey, tplCode })
  return json({ ok: r.ok, error: r.error })
}
