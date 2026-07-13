import { json, getSessionUser, resolveDB } from '../../_utils'
import { makeSolapiAuthHeader } from '../../_solapi'

// POST /api/kakao/alimtalk/send { pfId, templateCode, recipients:[{to,variables}] }
// SUPERPLACE Hono 라우트 이식 — Solapi 다건 발송(send-many, ATA). 포인트 선차감(25P/건).
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
    const me: any = await getSessionUser(request, db)
    const userId = String(me?.id || '')
    if (!userId || userId === 'undefined') return json({ ok: false, error: '로그인 필요' }, 401)

    const body: any = await request.json().catch(() => ({}))
    const { pfId, templateCode, recipients } = body
    if (!pfId || !templateCode || !recipients?.length) return json({ ok: false, error: '필수 항목 누락' }, 400)

    const apiKey = String((env as any)?.SOLAPI_API_KEY || '').trim()
    const apiSecret = String((env as any)?.SOLAPI_API_SECRET || '').trim()
    if (!apiKey || !apiSecret) return json({ ok: false, error: 'SOLAPI_API_KEY / SOLAPI_API_SECRET 환경변수 미설정' }, 500)

    // ── 포인트 선차감 (25P × 수신자 수) ──
    const COST_PER_MSG = 25
    const totalCost = COST_PER_MSG * recipients.length
    let userRow: any = null
    try {
      userRow = await db.prepare('SELECT id, points FROM users WHERE id = ? LIMIT 1').bind(userId).first()
    } catch (_) {}
    const curPoints = userRow?.points || 0
    if (curPoints < totalCost) {
      return json({ ok: false, error: `포인트가 부족합니다. 필요: ${totalCost}P, 보유: ${curPoints}P` })
    }
    try {
      await db.prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?').bind(totalCost, userId, totalCost).run()
    } catch (_) {
      return json({ ok: false, error: '포인트 차감 중 오류가 발생했습니다.' })
    }

    const auth = await makeSolapiAuthHeader(apiKey, apiSecret)

    // 채널의 발신 전화번호 조회 (from 필드)
    let fromPhone = ''
    try {
      const chRow: any = await db.prepare(`SELECT phone_number FROM kakao_channels WHERE channel_id = ? LIMIT 1`).bind(pfId).first()
      if (chRow?.phone_number) fromPhone = String(chRow.phone_number).replace(/-/g, '')
    } catch (_) {}
    if (!fromPhone) fromPhone = String((env as any)?.SENDER_PHONE || '').replace(/-/g, '')

    // variables 키를 "#{변수명}" 형태로 정규화
    const normalizeVariables = (vars: Record<string, string>): Record<string, string> => {
      const result: Record<string, string> = {}
      for (const [k, v] of Object.entries(vars || {})) {
        const key = /^#\{.+\}$/.test(k) ? k : `#{${k}}`
        result[key] = String(v)
      }
      return result
    }
    const messages = recipients.map((r: any) => ({
      to: String(r.to).replace(/-/g, ''),
      from: fromPhone,
      type: 'ATA',
      kakaoOptions: {
        pfId,
        templateId: templateCode,
        variables: normalizeVariables(r.variables || {}),
        disableSms: true,
      },
    }))

    const solapiBody = { messages }
    let res: Response
    let result: any
    try {
      res = await fetch('https://api.solapi.com/messages/v4/send-many', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(solapiBody),
      })
      result = await res.json()
    } catch (sendErr: any) {
      try {
        await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(totalCost, userId).run()
      } catch (_) {}
      return json({ ok: false, error: 'Solapi 요청 실패: ' + (sendErr?.message || String(sendErr)) })
    }

    if (!res.ok) {
      try {
        await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(totalCost, userId).run()
      } catch (_) {}
    }

    // 발송 로그 저장
    const successCount = result?.groupInfo?.count?.total || result?.count?.total || recipients.length
    const status = res.ok ? 'success' : 'failed'
    const errMsg = !res.ok
      ? result?.errorMessage || result?.message || result?.error || JSON.stringify(result).slice(0, 200)
      : null
    try {
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS kakao_alimtalk_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT, template_code TEXT, recipient_count INTEGER,
            status TEXT, error_message TEXT, points_used INTEGER DEFAULT 0,
            sent_at TEXT DEFAULT CURRENT_TIMESTAMP
          )`,
        )
        .run()
      try {
        await db.prepare('ALTER TABLE kakao_alimtalk_logs ADD COLUMN points_used INTEGER DEFAULT 0').run()
      } catch (_) {}
      await db
        .prepare(
          `INSERT INTO kakao_alimtalk_logs (user_id, template_code, recipient_count, status, error_message, points_used)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(userId, templateCode, recipients.length, status, errMsg, res.ok ? totalCost : 0)
        .run()
    } catch (_) {}

    if (!res.ok)
      return json({
        ok: false,
        error: result?.errorMessage || result?.message || result?.error || `Solapi HTTP ${res.status}`,
        detail: result,
      })
    return json({ ok: true, successCount, groupId: result?.groupId, pointsUsed: totalCost })
  } catch (e: any) {
    return json({ ok: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
