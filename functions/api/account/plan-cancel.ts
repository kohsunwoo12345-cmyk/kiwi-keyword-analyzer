import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity, addNotification } from '../_utils'

const TRACKS = ['marketer', 'video']

// POST /api/account/plan-cancel { track:'marketer'|'video' }
// → 해당 트랙 구독을 즉시 해지(플랜을 '없음'으로). 승인 대기 중인 같은 트랙 신청도 함께 취소.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const track = TRACKS.includes(String(body.track)) ? String(body.track) : 'marketer'
  const col = track === 'video' ? 'video_plan' : 'plan'
  const current = track === 'video' ? (me.video_plan || '없음') : (me.plan || '없음')
  if (current === '없음') return json({ ok: false, error: '이용 중인 구독이 없습니다.' }, 400)

  await db.prepare(`UPDATE users SET ${col} = '없음' WHERE id = ?`).bind(me.id).run()
  // 같은 트랙의 승인 대기 신청은 함께 취소 처리
  try {
    await db
      .prepare("UPDATE plan_requests SET status = 'cancelled', decided_at = ? WHERE user_id = ? AND track = ? AND status = 'pending'")
      .bind(new Date().toISOString(), me.id, track)
      .run()
  } catch {}

  const label = track === 'video' ? 'AI 영상' : '마케터'
  await logActivity(db, me.id, 'plan', `${label} 구독 취소: ${current} → 없음`)
  try {
    await addNotification(db, me.id, '구독 취소 완료', `${label} ${current} 구독이 취소되었습니다. 언제든 다시 시작할 수 있어요.`)
  } catch {}
  return json({ ok: true })
}
