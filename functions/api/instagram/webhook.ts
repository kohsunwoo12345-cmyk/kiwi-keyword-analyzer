import { Env, resolveDB } from '../_utils'
import { ensureIgSchema } from './_ig'

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

// GET /api/instagram/webhook → Meta 웹훅 검증 (hub.challenge)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const params = new URL(request.url).searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')
  const verifyToken = (env as any)?.VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new Response(String(challenge), {
      status: 200,
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' },
    })
  }
  return text('Forbidden', 403)
}

// POST /api/instagram/webhook → 이벤트 수신 → DM 자동화
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return text('EVENT_RECEIVED', 200)
    await ensureIgSchema(db)
    const appSecret = (env as any)?.Instargram_APP_SECRET
    let body: any

    if (appSecret) {
      const rawBody = await request.text()
      const sigHeader = request.headers.get('x-hub-signature-256') || ''
      if (sigHeader) {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey('raw', encoder.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
        const computed = 'sha256=' + Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
        if (computed !== sigHeader) return text('Forbidden', 403)
      }
      body = JSON.parse(rawBody)
    } else {
      const sigCheck = request.headers.get('x-hub-signature-256') || ''
      if (sigCheck) return text('Forbidden', 403)
      body = await request.json()
    }

    try {
      await db
        .prepare(`INSERT INTO instagram_webhook_logs (event_type, payload, created_at) VALUES (?, ?, datetime('now'))`)
        .bind(body.object || 'unknown', JSON.stringify(body).substring(0, 2000))
        .run()
    } catch (_) {}

    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'comments' && change.value) {
            const comment = change.value
            const commentText = (comment.text || '').toLowerCase()
            const commenterId = comment.from?.id
            const commenterName = comment.from?.username
            const mediaId = comment.media?.id

            try {
              const { results: rules } = await db.prepare(`SELECT * FROM instagram_dm_rules WHERE active = 1`).all()

              for (const rule of ((rules || []) as any[])) {
                let keywords: string[] = []
                try {
                  keywords = JSON.parse(rule.keywords || '[]')
                } catch (_) {}

                const matched = keywords.some((kw: string) => commentText.includes(kw.toLowerCase()))
                if (!matched) continue

                if (rule.cooldown_days > 0 && commenterId) {
                  const recent = await db
                    .prepare(
                      `SELECT id FROM instagram_dm_logs WHERE rule_id = ? AND recipient_id = ? AND created_at > datetime('now', '-' || ? || ' days') LIMIT 1`,
                    )
                    .bind(rule.id, commenterId, rule.cooldown_days)
                    .first()
                  if (recent) continue
                }

                let dmStatus = 'pending'
                let errorMsg: string | null = null
                const igToken = (env as any)?.INSTAGRAM_ACCESS_TOKEN
                const igBusinessId = (env as any)?.Instargram_ID || (env as any)?.Instagram_ID || (env as any)?.INSTAGRAM_BUSINESS_ID

                if (igToken && igBusinessId && commenterId) {
                  try {
                    const dmRes = await fetch(`https://graph.instagram.com/v25.0/${igBusinessId}/messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${igToken}` },
                      body: JSON.stringify({
                        recipient: { id: commenterId },
                        message: { text: rule.message },
                        messaging_type: 'RESPONSE',
                      }),
                    })
                    const result = (await dmRes.json()) as any
                    if (result.message_id || result.recipient_id) {
                      dmStatus = 'sent'
                    } else {
                      dmStatus = 'failed'
                      errorMsg = JSON.stringify(result).substring(0, 200)
                    }
                  } catch (e: any) {
                    dmStatus = 'failed'
                    errorMsg = e.message
                  }
                }

                const matchedKw = keywords.find((kw: string) => commentText.includes(kw.toLowerCase())) || ''
                await db
                  .prepare(
                    `INSERT INTO instagram_dm_logs
                       (rule_id, recipient_id, recipient_username, trigger_keyword,
                        trigger_comment_id, trigger_post_id, message, status, error_message, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                  )
                  .bind(
                    rule.id,
                    commenterId || null,
                    commenterName || null,
                    matchedKw,
                    comment.id || null,
                    mediaId || null,
                    rule.message.substring(0, 500),
                    dmStatus,
                    errorMsg,
                  )
                  .run()

                if (dmStatus === 'sent') {
                  await db.prepare(`UPDATE instagram_dm_rules SET sent_count = sent_count + 1 WHERE id = ?`).bind(rule.id).run()
                }
              }
            } catch (_) {}
          }
        }
      }
    }

    return text('EVENT_RECEIVED', 200)
  } catch (e) {
    return text('EVENT_RECEIVED', 200)
  }
}
