import { json, getSessionUser, resolveDB } from '../../_utils'
import { ownsKakaoChannel, notMyChannel } from '../_own'
import { aligoAlimtalk } from '../../_aligo'

// #{변수} 치환: 템플릿 본문 + 수신자 변수 → 최종 알림톡 문구
function renderTemplate(content: string, vars: Record<string, any>): string {
  let out = String(content || '')
  for (const [k, v] of Object.entries(vars || {})) {
    const bare = k.replace(/^#\{|\}$/g, '')
    out = out.split(`#{${bare}}`).join(String(v ?? ''))
  }
  return out
}

// POST /api/kakao/alimtalk/send { pfId, templateCode, content?, recipients:[{to,variables,message?}] }
// 알리고(Aligo) 다건 알림톡 발송. 포인트 선차감(25P/건).
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
    const me: any = await getSessionUser(request, db)
    const userId = String(me?.id || '')
    if (!userId || userId === 'undefined') return json({ ok: false, error: '로그인 필요' }, 401)

    const body: any = await (request.json().catch(() => null)) ?? {}
    const { pfId, templateCode, recipients, content } = body
    if (!templateCode || !recipients?.length) return json({ ok: false, error: '필수 항목 누락' }, 400)
    if (recipients.length > 1000) return json({ ok: false, error: '한 번에 최대 1,000명까지 발송할 수 있습니다.' }, 400)

    const apiKey = String((env as any)?.ALIGO_API_KEY || '').trim()
    const userIdEnv = String((env as any)?.ALIGO_USER_ID || '').trim()
    // 발신프로필 키: pfId(선택된 채널) 우선, 없으면 환경변수
    // ⚠ pfId 를 그대로 썼다. senderkey 는 "그 회원이 전화 인증으로 등록한 카카오 채널" 식별자라,
    //   남의 senderkey 를 적으면 남의 공식 채널 이름으로 알림톡이 나가고, 아래 발신번호 조회도
    //   그 채널에 등록된 남의 전화번호를 발신번호로 집어 온다(발신번호 사전등록제 위반).
    const wantKey = String(pfId || '').trim()
    if (wantKey && !(await ownsKakaoChannel(db, userId, wantKey))) return notMyChannel()
    const senderKey = String(wantKey || (env as any)?.ALIGO_SENDER_KEY || '').trim()
    if (!apiKey || !userIdEnv) return json({ ok: false, error: 'ALIGO_API_KEY / ALIGO_USER_ID 환경변수 미설정' }, 500)
    if (!senderKey) return json({ ok: false, error: '알림톡 발신프로필 키(ALIGO_SENDER_KEY)가 필요합니다.' }, 500)

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
      // ⚠ 실제로 차감됐는지(changes) 확인해야 한다. 위의 잔액 검사는 읽기 시점 기준이라
      //   같은 순간에 두 요청이 들어오면 둘 다 통과하는데, 조건부 UPDATE 는 한 쪽만 성공한다.
      //   결과를 안 보면 진 쪽이 차감 없이 알림톡을 그냥 보낸다(= 무료 발송).
      const upd: any = await db.prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?')
        .bind(totalCost, userId, totalCost).run()
      if (Number(upd?.meta?.changes || 0) === 0)
        return json({ ok: false, error: `포인트가 부족합니다. 필요: ${totalCost}P` })
    } catch (_) {
      return json({ ok: false, error: '포인트 차감 중 오류가 발생했습니다.' })
    }

    // 발신번호: 선택 채널의 발신번호 → 본인 승인 발신번호 → 환경변수 폴백
    let fromPhone = ''
    try {
      const chRow: any = await db.prepare(`SELECT phone_number FROM kakao_channels WHERE channel_id = ? AND user_id = ? LIMIT 1`).bind(senderKey, userId).first()
      if (chRow?.phone_number) fromPhone = String(chRow.phone_number).replace(/[^0-9]/g, '')
    } catch (_) {}
    if (!fromPhone) {
      try {
        const sr: any = await db.prepare("SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1").bind(userId).first()
        if (sr?.phone) fromPhone = String(sr.phone).replace(/[^0-9]/g, '')
      } catch (_) {}
    }
    if (!fromPhone) fromPhone = String((env as any)?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')

    // 각 수신자의 최종 문구 구성: message 우선, 없으면 템플릿(content) + 변수 치환
    const items = recipients.map((r: any) => {
      const vars = r.variables || {}
      const msg = String(r.message || (content ? renderTemplate(content, vars) : content) || '').trim()
      return { to: String(r.to).replace(/-/g, ''), message: msg, subject: 'BYGENCY 알림' }
    })

    // 알리고 알림톡 발송 (실패 시 SMS 대체발송)
    const sendRes = await aligoAlimtalk(env, {
      tplCode: templateCode,
      senderKey,
      from: fromPhone,
      failover: true,
      items,
    })
    const okSend = sendRes.ok
    if (!okSend) {
      try {
        await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(totalCost, userId).run()
      } catch (_) {}
    }

    // 발송 로그 저장
    const successCount = okSend ? (sendRes.sent || recipients.length) : 0
    const status = okSend ? 'success' : 'failed'
    const errMsg = okSend ? null : String(sendRes.error || '알림톡 발송 실패').slice(0, 200)
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
        .bind(userId, templateCode, recipients.length, status, errMsg, okSend ? totalCost : 0)
        .run()
    } catch (_) {}

    if (!okSend)
      return json({
        ok: false,
        error: sendRes.error || '알림톡 발송 실패',
        detail: sendRes.data,
      })
    return json({ ok: true, successCount, pointsUsed: totalCost })
  } catch (e: any) {
    return json({ ok: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
