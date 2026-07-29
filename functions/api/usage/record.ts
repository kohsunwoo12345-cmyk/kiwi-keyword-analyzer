import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity, resolveBucket, rateLimitOk } from '../_utils'
import { computeCharge, ensureAiUsage, getUsdKrw, resolveMarkup, resolveRefSurcharge, resolveCnSurcharge, MODEL_COST } from '../studio/_pricing'
import { creditPriceFor } from '../payments/prepare'
import { effectiveUnits, effectiveRes, effectiveFlags, effectiveRatio } from '../generate.js'
import { consumeGenCharge } from '../studio/_gencharge'

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
  // ⚠ 로그인 확인이 없었다. 그런데 이 경로는 (1) 정산 테이블 ai_usage 에 행을 넣고
  //   (2) resultUrl·refUrls 의 data: URL 을 R2 에 그대로 올린다(요청당 최대 5개, 개당 30MB).
  //   즉 비로그인 상태로 누구나 우리 버킷에 파일을 올리고 정산 통계를 오염시킬 수 있었다.
  //   실제로 익명 요청 한 번에 /api/media/gen/... 3개가 만들어지고 공개 조회까지 됐다.
  //   생성 자체(/api/generate)는 이미 로그인 필수라, 정상 흐름에서 비회원이 여기 올 일은 없다.
  //   (user_id='guest' 로 쌓이던 행은 보관함이 user_id 로만 조회하므로 아무도 못 보는 쓰레기였다.)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.', needLogin: true }, 401)
  // 한 번에 R2 객체 5개까지 만들 수 있으니 회원 단위로도 상한을 둔다.
  if (!(await rateLimitOk(db, `usagerec:${me.id}`, 120, 10)))
    return json({ ok: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, 429)
  const b: any = await (request.json().catch(() => null)) ?? {}
  const rate = await getUsdKrw(db) // 결제(생성) 시점의 그날 환율
  /* 모델은 그동안 요청 본문 값을 그대로 믿었다 — 길이·해상도·종류·비율은 서버가 다시 계산하는데
     정작 모델만 빠져 있었다. 비싼 모델로 만들고 싼 모델로 신고하면 그 차액만큼 덜 냈다.
     생성 시점에 서버가 발급한 토큰이 있으면 그 안의 확정값을 쓴다(1회용이라 중복 청구도 막힌다).
     토큰이 없으면 예전 방식 그대로 — 구버전 클라이언트가 갑자기 무과금되지 않게 한 폴백이다. */
  const staked = await consumeGenCharge(db, me.id, String(b.chargeToken || ''))
  if (staked?.alreadyConsumed) {
    // 같은 생성이 두 번 신고됐다 — 이미 청구했으므로 다시 빼지 않는다.
    return json({ ok: true, stored: false, charged: 0, duplicate: true })
  }
  const model = staked ? staked.model : String(b.model || '')
  const memberMarkup = me ? Number(me.credit_markup) || 0 : 0 // 회원별 전체 배수(원가=1). 0=미설정
  // 회원×모델 override > 회원 전체 배수 > 전역 모델 배수 > 기본값
  const markup = me ? await resolveMarkup(db, me.id, model, memberMarkup) : (memberMarkup || undefined)
  const creditKrw = await creditPriceFor(db, me)   // 회원 1크레딧 단가(원). 차감/매출 기준
  // 길이·해상도는 클라이언트 값을 그대로 믿지 않는다 — 그 모델로 실제 생성되는 값으로 환산해
  //  과금한다(조작된 요청으로 15초 생성을 1초로 신고하는 것도, 해상도를 못 받는 모델에
  //  4K 배율이 붙는 것도 막는다). 정상 클라이언트는 이미 스냅된 값을 보내므로 결과가 같다.
  /* 종류(이미지/영상)도 클라이언트 값을 믿지 않는다.
     길이·해상도는 이미 서버가 다시 계산하고 있었는데 kind 만 그대로 받아서, 영상 생성에
     kind:'image' 로 신고하면 units 가 1로 고정돼 effectiveUnits 를 통째로 건너뛰었다.
     그러면 10초 영상이 1초 요금으로 청구된다(Veo 336 → 33.6 크레딧, 최대 10배 과소청구).
     단가표가 그 모델의 과금 단위를 알고 있으므로 그 값을 쓴다. 표에 없을 때만 요청값을 본다. */
  const mc = (MODEL_COST as any)[model]
  const isImg = mc ? mc.u !== 'sec' : String(b.kind || '') === 'image'
  // 토큰이 있으면 길이·해상도·옵션도 생성 시점에 서버가 확정한 값을 쓴다.
  const eff = staked
    ? { provider: String(b.provider || ''), model, seconds: Number(staked.units) || 0, res: staked.res }
    : { provider: String(b.provider || ''), model, seconds: Number(b.units) || 0, res: b.res }
  const units = isImg ? 1 : effectiveUnits(eff, env)
  const effRes = isImg ? undefined : effectiveRes(eff, env)
  const c = computeCharge(
    {
      model,
      units,
      kind: isImg ? 'image' : 'video',
      res: effRes,
      audio: staked ? !!staked.audio : !!b.audio,
      /* 루마 실측 요금표용 — 이 둘이 없으면 표준 요금으로 잡혀 HDR 원가를 못 받는다.
         다만 요청값을 그대로 믿으면 반대로 헛돈을 받는다: 루마 "영상 편집·비율 변경" 은
         빌더가 hdr 필드를 아예 안 싣는데(문서상 SDR) 요금표에는 편집용 HDR 등급이 있어,
         lumaHdr 를 얹으면 SDR 을 받으면서 2배(EXR 3배)를 냈다.
         → 길이·해상도와 같은 원칙으로, 실제 요청에 실린 값만 청구한다. */
      ...effectiveFlags({ ...eff, hdr: staked ? !!staked.hdr : !!b.hdr, exr: staked ? !!staked.exr : !!b.exr }),
      refs: staked ? Number(staked.refs) || 0 : Math.max(0, Number(b.refs) || 0),
      // OpenAI 이미지는 가로/세로가 긴 비율이면 원가가 1.5배다 — 실제로 나간 크기 기준으로 본다
      //  (표에 없는 비율은 빌더가 1024x1024 정사각으로 떨어뜨린다 → 1.5배를 받으면 안 된다)
      ratio: effectiveRatio({ model, ratio: String((staked ? staked.ratio : b.ratio) || '1:1') }),
      // 제공사가 알려준 실제 소비 토큰이 있으면 추정 대신 그 값으로 과금한다
      usageTokens: Math.max(0, Number(b.usageTokens) || 0),
    },
    rate,
    markup,
    creditKrw,
  )

  // 레퍼런스 이미지 추가당 가산: 1장 추가마다 +surPct%. (회원별/전역 설정)
  const refCount = staked ? Number(staked.refs) || 0 : Math.max(0, Number(b.refs) || 0)
  const surPct = me ? await resolveRefSurcharge(db, me.id) : 0.5
  const refMult = 1 + (surPct / 100) * refCount
  // ControlNet 조절 사용 시 추가 가산: cn>0 이면 +cnPct% (전역 설정, 기본 10%)
  const cnCount = staked ? Number(staked.cn) || 0 : Math.max(0, Number(b.cn) || 0)
  const cnPct = cnCount > 0 ? await resolveCnSurcharge(db) : 0
  const cnMult = cnCount > 0 ? 1 + cnPct / 100 : 1
  const wantCredits = Math.round(c.credits * refMult * cnMult * 100) / 100

  // 크레딧 100% 차감 (로그인 사용자만).
  //  · 생성은 이미 유료 제공사에서 완료된 상태이므로, 잔액이 부족하더라도 실제 원가만큼 전액 차감한다.
  //    (예전처럼 "남은 잔액만" 차감하면 0.01크레딧 계정이 고가 영상을 사실상 공짜로 생성 → 손해).
  //  · 잔액이 음수가 되면 이후 생성은 /api/generate 의 credits>0 게이트에서 자동 차단(=미납 잠금).
  //  · 원자적 무조건 차감으로 동시 요청 시에도 이중차감 없이 정확히 원가만큼만 반영된다.
  let charged = 0
  let afterBal = Number(me?.credits) || 0
  if (me && wantCredits > 0) {
    const full: any = await db
      .prepare('UPDATE users SET credits = ROUND(credits - ?, 2) WHERE id = ?')
      .bind(wantCredits, me.id)
      .run()
    if (full?.meta?.changes === 1) charged = wantCredits
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

  const revenueKrw = Math.round(charged * creditKrw) // 실제 차감 크레딧 × 1크레딧 단가(원) = 매출

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
        units || (c.kind === 'image' ? 1 : 0),   // 과금에 쓴 값과 같은 값을 기록(감사 일치)
        c.usd,
        c.costKrwExact,   // 1원 미만도 그대로 — 관리자 원가 합계가 0 으로 쌓이지 않게
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
