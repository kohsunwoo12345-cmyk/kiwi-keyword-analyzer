import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity } from '../_utils'
import { computeCharge, ensureAiUsage, getUsdKrw, resolveMarkup } from '../studio/_pricing'

// POST /api/usage/record { model, kind, units, res?, audio?, provider? }
//  → 스튜디오 생성 1건 확정. BYGENCY 세션으로 사용자 식별 → 크레딧 100% 차감 + 정산 기록.
//    (성공한 생성에서만 호출됨. 크레딧 부족 시에도 잔액까지는 차감하지 않고 기록만 남긴다.)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: true, stored: false })
  await ensureSchema(db)
  await ensureAiUsage(db)

  const me: any = await getSessionUser(request, db)
  const b: any = await request.json().catch(() => ({}))
  const rate = await getUsdKrw(db) // 결제(생성) 시점의 그날 환율
  const model = String(b.model || '')
  const memberMarkup = me ? Number(me.credit_markup) || 0 : 0 // 회원별 전체 배수(원가=1). 0=미설정
  // 회원×모델 override > 회원 전체 배수 > 전역 모델 배수 > 기본값
  const markup = me ? await resolveMarkup(db, me.id, model, memberMarkup) : (memberMarkup || undefined)
  const c = computeCharge(
    {
      model,
      units: Number(b.units) || 0,
      kind: b.kind,
      res: b.res,
      audio: !!b.audio,
    },
    rate,
    markup,
  )

  // 크레딧 100% 차감 (로그인 사용자만). 소수 크레딧 지원, 잔액 부족 시 있는 만큼만 차감하고 마이너스는 방지.
  let charged = 0
  if (me) {
    const balance = Number(me.credits) || 0
    charged = Math.round(Math.min(balance, c.credits) * 100) / 100
    if (charged > 0) {
      const after = Math.round((balance - charged) * 100) / 100
      await db.prepare('UPDATE users SET credits = ? WHERE id = ?').bind(after, me.id).run()
      await db
        .prepare(
          `INSERT INTO transactions (id, user_id, kind, amount, balance_after, memo, created_at) VALUES (?, ?, 'credit', ?, ?, ?, ?)`,
        )
        .bind('t_' + crypto.randomUUID().slice(0, 16), me.id, -charged, after, `AI 생성 · ${c.model}`, new Date().toISOString())
        .run()
      await logActivity(db, me.id, 'credit', `-${charged} 크레딧 · AI 생성(${c.model})`)
    }
  }

  const revenueKrw = charged * 50 // 실제 차감 크레딧 기준 매출
  try {
    const id = 'au' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    await db
      .prepare(
        `INSERT INTO ai_usage (id,user_id,email,name,provider,model,kind,units,usd,cost_krw,credits,revenue_krw,markup,usd_krw,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        id,
        me?.id || 'guest',
        me?.email || '',
        me?.name || '',
        c.provider,
        c.model,
        c.kind,
        Number(b.units) || (c.kind === 'image' ? 1 : 0),
        c.usd,
        c.costKrw,
        charged,
        revenueKrw,
        c.markup,
        c.usdKrw,
        new Date().toISOString(),
      )
      .run()
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e).slice(0, 160) }, 500)
  }

  return json({ ok: true, stored: true, charged, credits: c.credits })
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
