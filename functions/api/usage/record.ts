import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity, resolveBucket } from '../_utils'
import { computeCharge, ensureAiUsage, getUsdKrw, resolveMarkup, resolveRefSurcharge, resolveCnSurcharge } from '../studio/_pricing'

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}
function ctExt(ct: string): string {
  const c = (ct || '').toLowerCase()
  if (c.includes('png')) return '.png'
  if (c.includes('webp')) return '.webp'
  if (c.includes('gif')) return '.gif'
  if (c.includes('jpeg') || c.includes('jpg')) return '.jpg'
  if (c.includes('svg')) return '.svg'
  if (c.includes('webm')) return '.webm'
  if (c.includes('quicktime') || c.includes('mov')) return '.mov'
  if (c.includes('mp4')) return '.mp4'
  if (c.includes('audio')) return '.mp3'
  return ''
}
// 생성 미디어를 저장 가능한 URL 로 변환.
//  · data: URL → R2 업로드(가능 시) → /api/media/<key>. R2 없으면 작은 이미지만 인라인 보관.
//  · http(s)/상대경로 → 그대로 저장(재업로드로 인한 대용량 전송 회피).
async function persistMedia(env: any, url: string): Promise<string> {
  if (!url || typeof url !== 'string') return ''
  try {
    if (url.startsWith('data:')) {
      const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(url)
      if (!m) return ''
      const ct = m[1] || 'application/octet-stream'
      const bytes = m[2] ? b64ToBytes(m[3]) : new TextEncoder().encode(decodeURIComponent(m[3]))
      const bucket = resolveBucket(env)
      if (bucket && bytes.length <= 30_000_000) {
        const key = 'gen/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + ctExt(ct)
        await bucket.put(key, bytes, { httpMetadata: { contentType: ct } })
        return '/api/media/' + key
      }
      return ct.startsWith('image/') && url.length <= 600_000 ? url : ''
    }
    return url // http(s) or /api/...
  } catch {
    return url.startsWith('data:') ? '' : url
  }
}

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

  // 레퍼런스 이미지 추가당 가산: 1장 추가마다 +surPct%. (회원별/전역 설정)
  const refCount = Math.max(0, Number(b.refs) || 0)
  const surPct = me ? await resolveRefSurcharge(db, me.id) : 0.5
  const refMult = 1 + (surPct / 100) * refCount
  // ControlNet 조절 사용 시 추가 가산: cn>0 이면 +cnPct% (전역 설정, 기본 10%)
  const cnCount = Math.max(0, Number(b.cn) || 0)
  const cnPct = cnCount > 0 ? await resolveCnSurcharge(db) : 0
  const cnMult = cnCount > 0 ? 1 + cnPct / 100 : 1
  const wantCredits = Math.round(c.credits * refMult * cnMult * 100) / 100

  // 크레딧 100% 차감 (로그인 사용자만). 원자적 조건부 차감으로 동시 요청 이중차감·음수(TOCTOU) 방지.
  //  · 잔액 ≥ 필요분이면 정확히 필요분 차감. 부족하면 남은 잔액만큼만 원자적으로 차감.
  let charged = 0
  let afterBal = Number(me?.credits) || 0
  if (me && wantCredits > 0) {
    const full: any = await db
      .prepare('UPDATE users SET credits = ROUND(credits - ?, 2) WHERE id = ? AND credits >= ?')
      .bind(wantCredits, me.id, wantCredits)
      .run()
    if (full?.meta?.changes === 1) {
      charged = wantCredits
    } else {
      // 잔액 부족: 현재 남은 잔액을 읽어 그만큼만 0 으로 (credits <= rem 가드로 그새 증가 시 중복차감 방지)
      const cur: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
      const rem = Math.max(0, Math.round((Number(cur?.credits) || 0) * 100) / 100)
      if (rem > 0) {
        const part: any = await db.prepare('UPDATE users SET credits = 0 WHERE id = ? AND credits <= ? AND credits > 0').bind(me.id, rem).run()
        if (part?.meta?.changes === 1) charged = rem
      }
    }
    if (charged > 0) {
      const row: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
      afterBal = Math.round((Number(row?.credits) || 0) * 100) / 100
      await db
        .prepare(
          `INSERT INTO transactions (id, user_id, kind, amount, balance_after, memo, created_at) VALUES (?, ?, 'credit', ?, ?, ?, ?)`,
        )
        .bind('t_' + crypto.randomUUID().slice(0, 16), me.id, -charged, afterBal, `AI 생성 · ${c.model}`, new Date().toISOString())
        .run()
      await logActivity(db, me.id, 'credit', `-${charged} 크레딧 · AI 생성(${c.model})`)
    }
  }

  const revenueKrw = charged * 50 // 실제 차감 크레딧 기준 매출

  // 생성 콘텐츠 아카이브 — 프롬프트/레퍼런스/결과. 실패해도 기록/차감은 유지.
  const prompt = String(b.prompt || '').slice(0, 4000)
  const resultKind = String(b.resultKind || (c.kind === 'image' ? 'image' : 'video')).slice(0, 12)
  let refsJson = ''
  let resultUrl = ''
  try {
    const rawRefs: string[] = Array.isArray(b.refUrls) ? b.refUrls.slice(0, 4) : []
    const persisted: string[] = []
    for (const r of rawRefs) {
      const u = await persistMedia(env, String(r || ''))
      if (u) persisted.push(u)
    }
    if (persisted.length) refsJson = JSON.stringify(persisted)
    resultUrl = await persistMedia(env, String(b.resultUrl || ''))
  } catch {
    /* 아카이브 실패 무시 */
  }

  try {
    const id = 'au' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    await db
      .prepare(
        `INSERT INTO ai_usage (id,user_id,email,name,provider,model,kind,units,usd,cost_krw,credits,revenue_krw,markup,usd_krw,created_at,prompt,refs,result_url,result_kind)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
        prompt,
        refsJson,
        resultUrl,
        resultKind,
      )
      .run()
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e).slice(0, 160) }, 500)
  }

  return json({ ok: true, stored: true, charged, credits: wantCredits, refCount, refSurchargePct: surPct, cnCount, cnSurchargePct: cnPct })
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
