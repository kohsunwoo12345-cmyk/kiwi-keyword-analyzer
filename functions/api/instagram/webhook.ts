import { Env, resolveDB } from '../_utils'
import { ensureIgSchema, igOwnerByBusinessId, getIgCredentials } from './_ig'

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
      // ⚠ 예전에는 서명 헤더가 "있을 때만" 검증했다. 즉 헤더를 아예 안 보내면 검사를 건너뛰고
      //   그대로 처리됐다 — 아무나 가짜 이벤트를 넣어 남의 계정 토큰으로 DM 을 쏘게 만들 수 있다.
      //   앱 시크릿이 설정돼 있으면 서명은 필수다.
      if (!sigHeader) return text('Forbidden', 403)
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey('raw', encoder.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
      const computed = 'sha256=' + Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
      // 길이가 다르면 바로 탈락시키고, 같으면 상수시간으로 비교한다(타이밍으로 서명을 캐내지 못하게)
      if (computed.length !== sigHeader.length) return text('Forbidden', 403)
      let diff = 0
      for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ sigHeader.charCodeAt(i)
      if (diff !== 0) return text('Forbidden', 403)
      try { body = JSON.parse(rawBody) } catch { return text('EVENT_RECEIVED', 200) }
    } else {
      const sigCheck = request.headers.get('x-hub-signature-256') || ''
      if (sigCheck) return text('Forbidden', 403)
      body = await request.json().catch(() => ({}))
    }

    // 이 이벤트가 "누구의 인스타 계정" 으로 들어온 것인지 먼저 정한다.
    //  웹훅 entry.id 는 인스타 비즈니스 계정 ID 이고, 우리는 그걸 회원과 연결해 두었다.
    //  ⚠ 이 구분이 없어서 예전에는 A 의 게시물 댓글에 B 의 규칙이 돌고,
    //     B 의 문구가 A 의 댓글 작성자에게 DM 으로 나갔다.
    const firstEntryId = String((body.entry && body.entry[0] && body.entry[0].id) || '')
    const ownerId = await igOwnerByBusinessId(db, firstEntryId)

    try {
      await db
        .prepare(`INSERT INTO instagram_webhook_logs (user_id, event_type, payload, created_at) VALUES (?, ?, ?, datetime('now'))`)
        .bind(ownerId, body.object || 'unknown', JSON.stringify(body).substring(0, 2000))
        .run()
    } catch (_) {}

    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        // entry 마다 계정이 다를 수 있으므로 여기서 다시 확인한다
        const entryOwnerId = String(entry.id || '') === firstEntryId
          ? ownerId
          : await igOwnerByBusinessId(db, String(entry.id || ''))
        for (const change of entry.changes || []) {
          if (change.field === 'comments' && change.value) {
            const comment = change.value
            const commentText = (comment.text || '').toLowerCase()
            const commenterId = comment.from?.id
            const commenterName = comment.from?.username
            const mediaId = comment.media?.id

            try {
              // 그 계정 주인의 규칙만 돌린다. 주인을 못 찾으면(연결 정보 없음) 아무것도 하지 않는다 —
              //  예전처럼 전체 규칙을 돌리면 남의 문구가 이 댓글 작성자에게 나간다.
              if (!entryOwnerId) continue
              const { results: rules } = await db.prepare(
                `SELECT * FROM instagram_dm_rules WHERE active = 1 AND CAST(user_id AS TEXT) = CAST(? AS TEXT)`,
              ).bind(entryOwnerId).all()

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
                      `SELECT id FROM instagram_dm_logs WHERE rule_id = ? AND recipient_id = ?
                         AND created_at > datetime('now', '-' || ? || ' days') LIMIT 1`,
                    )
                    .bind(rule.id, commenterId, rule.cooldown_days)
                    .first()
                  if (recent) continue
                }

                let dmStatus = 'pending'
                let errorMsg: string | null = null
                // ⚠ 예전에는 환경변수의 계정 토큰 하나로만 보냈다. 회원별로 연결한 계정이 따로 있는데
                //   엉뚱한 계정에서 DM 이 나가게 된다. 그 회원이 연결해 둔 토큰을 먼저 쓴다.
                const cred = await getIgCredentials(db, entryOwnerId)
                const igToken = cred?.token || (env as any)?.INSTAGRAM_ACCESS_TOKEN
                const igBusinessId =
                  cred?.igId ||
                  String(entry.id || '') ||
                  (env as any)?.Instargram_ID ||
                  (env as any)?.Instagram_ID ||
                  (env as any)?.INSTAGRAM_BUSINESS_ID

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
                       (user_id, rule_id, recipient_id, recipient_username, trigger_keyword,
                        trigger_comment_id, trigger_post_id, message, status, error_message, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                  )
                  .bind(
                    entryOwnerId,
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
