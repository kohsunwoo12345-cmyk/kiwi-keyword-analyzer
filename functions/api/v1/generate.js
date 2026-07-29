// 공개 생성 API v1 — 노드형 AI 영상 플랜 회원이 API 키(bg_live_)로 이미지·영상 모델 직접 호출.
//  · POST /api/v1/generate : { provider, model, prompt, ... } → 생성 시작(이미지=즉시 URL, 영상=task 반환)
//  · GET  /api/v1/generate?provider=...&task=...|op=... : 비동기 영상 상태 폴링
//  키 1개로 모든 모델 호출 가능. 크레딧은 스튜디오(UI)와 동일 규칙으로 차감된다.
import { onRequest as generateApi, effectiveUnits, effectiveRes, effectiveFlags, effectiveRatio } from "../generate.js";
import { resolveDB, ensureSchema, json } from "../_utils";
import { getUserByApiKey, logApiCall, hasVideoApiAccess, ensureApiKeysSchema, enforceRateLimit, beginApiCall, finishApiCall, attachApiCallTask, refundFailedTask } from "../_apikeys";
import { computeCharge, getUsdKrw, resolveMarkup, ensureAiUsage, resolveCostOverride, MODEL_COST } from "../studio/_pricing";

// 크레딧 차감 + 사용/거래 기록 (스튜디오 usage/record 와 동일)
async function commitCharge(db, me, c, units) {
  try { await ensureAiUsage(db); } catch {}
  const balance = Number(me.credits) || 0;
  const charged = Math.round(Math.min(balance, c.credits) * 100) / 100;
  if (charged > 0) {
    // ⚠ 읽은 잔액으로 계산한 절대값을 덮어쓰면, 동시에 진행 중인 다른 생성의 차감이 지워진다.
    //   (API 는 동시 생성을 허용하므로 실제로 일어난다 — 둘 다 100을 읽고 각각 30을 빼면 70이 된다)
    //   상대 차감으로 바꾸고, 기록용 잔액은 차감 뒤에 다시 읽는다.
    await db.prepare("UPDATE users SET credits = ROUND(COALESCE(credits,0) - ?, 2) WHERE id = ?").bind(charged, me.id).run();
    const freshRow = await db.prepare("SELECT credits FROM users WHERE id = ?").bind(me.id).first().catch(() => null);
    const after = Math.round((Number(freshRow && freshRow.credits) || 0) * 100) / 100;
    try {
      await db.prepare(
        "INSERT INTO transactions (id,user_id,kind,amount,balance_after,memo,created_at) VALUES (?,?,'credit',?,?,?,?)"
      ).bind("t_" + crypto.randomUUID().slice(0, 16), me.id, -charged, after, "API 생성 · " + c.model, new Date().toISOString()).run();
    } catch {}
    me.credits = after;
  }
  try {
    const id = "au" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await db.prepare(
      "INSERT INTO ai_usage (id,user_id,email,name,provider,model,kind,units,usd,cost_krw,credits,revenue_krw,markup,usd_krw,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(id, me.id, me.email || "", me.name || "", c.provider, c.model, c.kind,
      units || (c.kind === "image" ? 1 : 0), c.usd, c.costKrwExact, charged, charged * 50, c.markup, c.usdKrw, new Date().toISOString()).run();
  } catch {}
  return charged;
}

function apiErr(msg, status) { return json({ ok: false, error: msg }, status); }
function rateErr(rl) {
  const res = json({ ok: false, error: rl.reason || "요청이 너무 많습니다.", retryAfter: rl.retryAfter || 60, rateLimited: true }, 429);
  try { res.headers.set("Retry-After", String(rl.retryAfter || 60)); } catch (_e) {}
  return res;
}

async function authApi(request, env) {
  const db = resolveDB(env);
  if (!db) return { err: apiErr("DB 바인딩 없음", 500) };
  await ensureSchema(db); await ensureApiKeysSchema(db);
  const ak = await getUserByApiKey(db, request.headers.get("Authorization"));
  if (!ak) return { err: apiErr("유효한 API 키가 필요합니다. Authorization: Bearer bg_live_...", 401) };
  if (!hasVideoApiAccess(ak.user)) return { err: apiErr("API는 노드형 AI 영상 플랜에서만 사용할 수 있습니다.", 403) };
  return { db, me: ak.user, keyId: ak.keyId };
}

export const onRequestPost = async ({ request, env }) => {
  const a = await authApi(request, env);
  if (a.err) return a.err;
  const { db, me, keyId } = a;
  const isAdmin = me.role === "admin";

  const body = await (request.json().catch(() => null)) ?? {};
  const provider = String(body.provider || "");
  const model = String(body.model || "");
  /* 과금 종류는 단가표에서 정한다 — 호출자가 보낸 kind 를 믿으면 안 된다.
     ① kind:"image" 를 붙여 보내면 units 가 1로 고정돼 8초 영상을 1초 값으로 청구했다.
     ② 스스로 추측하는 정규식도 틀렸다 — "Grok Imagine (영상)" 이 /grok/ 에 걸려
        영상인데 이미지로 잡혔고(초당 $0.10 × 5초 대신 $0.10), 같은 이유로
        "Flux …" 이름을 가진 영상 모델이 생기면 그대로 새어 나간다.
     단가표에 있는 모델은 그 u 값이 유일한 기준이고, 모르는 모델일 때만 예전 추측을 쓴다.
     (스튜디오의 precheck·usage/record 도 같은 방식으로 이미 굳혀 두었다.) */
  const mcV = MODEL_COST[model];
  const kind = mcV ? (mcV.u === "sec" ? "video" : "image")
                   : String(body.kind || (/image|nano|gpt|grok|flux/i.test(provider + model) ? "image" : "video"));
  //  과금 단위는 "요청한 길이"가 아니라 "실제로 생성될 길이" 여야 한다 — 빌더가 모델별
  //  허용값으로 스냅하므로(Veo 7→6초, Seedance 1.x 8→10초 등) 요청값으로 청구하면 어긋난다.
  const units = kind === "image" ? 1 : effectiveUnits(body, env);
  const billRes = kind === "image" ? undefined : effectiveRes(body, env);
  if (!model && !provider) return apiErr("model 또는 provider 는 필수입니다.", 400);

  // 남용 방지: 슬라이딩 윈도우 레이트리밋 + 동시 진행 제한 (관리자 면제)
  const rl = await enforceRateLimit(db, me.id, "post", isAdmin);
  if (!rl.ok) return rateErr(rl);

  // 크레딧 사전 확인
  let est = null;
  try {
    const rate = await getUsdKrw(db);
    const markup = await resolveMarkup(db, me.id, model, Number(me.credit_markup) || 0);
    /* 레퍼런스 장수·HDR·EXR 은 원가 자체를 바꾼다(루마 이미지·루마 영상 HDR·FLUX.2 입력 MP).
       스튜디오는 refs 를 넘기는데 이 경로만 빠져 있어, API 로 부르면 같은 생성이 더 싸게 나갔다. */
    const refsV = Array.isArray(body.refImages) ? body.refImages.length
                : Math.max(0, Number(body.refs) || 0);
    /* HDR·EXR·비율도 "요청한 값" 이 아니라 "실제로 요청에 실린 값" 으로 청구한다.
       lumaHdr 를 얹어 보내면 루마 영상 편집은 SDR 을 내주면서 2배(EXR 3배)를 받았고,
       표에 없는 비율을 보내면 OpenAI 는 정사각을 내주면서 1.5배를 받았다. */
    const fl = effectiveFlags({ ...body, model });
    est = computeCharge({ model, units, kind, res: billRes, audio: !!body.audio,
                          refs: refsV, hdr: fl.hdr, exr: fl.exr,
                          ratio: effectiveRatio({ ...body, model }) }, rate, markup, undefined, await resolveCostOverride(db, model));
    if (!isAdmin && (Number(me.credits) || 0) < (est?.credits || 0)) {
      return json({ ok: false, error: "크레딧이 부족합니다.", need: est?.credits, have: Number(me.credits) || 0, needPlan: true }, 402);
    }
  } catch { /* 견적 실패해도 생성 시도 */ }

  // pending 호출 기록 (동시성 카운트 + 감사 로그)
  const callId = await beginApiCall(db, { keyId, userId: me.id, endpoint: "/api/v1/generate", provider, model, kind });

  try {
    // 내부적으로 기존 생성 파이프라인 재사용 (관리자 토큰 있으면 그것으로, 없으면 API 키 그대로 전달 → generate.js 가 재인증)
    const genTok = env.MCP_AUTH_TOKEN || env.mcp_auth_token || String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const origin = new URL(request.url).origin;
    const headers = { "Content-Type": "application/json" };
    if (genTok) headers["Authorization"] = "Bearer " + genTok;
    const innerReq = new Request(origin + "/api/generate", { method: "POST", headers, body: JSON.stringify(body) });
    /* 이 경로는 아래 commitCharge 로 스스로 차감한다 — 생성 API 안의 자동 차감(settleGenCharge)까지
       걸리면 같은 생성에 두 번 빠진다. 서버가 만든 컨텍스트 값이라 클라이언트가 흉내낼 수 없다. */
    const res = await generateApi({ request: innerReq, env, __internalBilling: true });
    const data = await res.json().catch(() => ({}));

    const ok = res.ok && !data.error;
    if (ok) {
      let charged = 0;
      try { if (est) charged = await commitCharge(db, me, est, kind === "image" ? 1 : units); } catch {}
      await finishApiCall(db, callId, { status: "ok", credits: charged });
      //  영상은 제출 시점에 차감하고 결과는 나중에 나온다 → 태스크 식별자를 남겨,
      //  폴링에서 실패로 확정되면 이 차감을 되돌릴 수 있게 한다.
      if (data && typeof data.statusUrl === "string") await attachApiCallTask(db, callId, data.statusUrl);
      return json({ ok: true, ...data, credits_charged: charged, credits_remaining: Number(me.credits) || 0 });
    }
    await finishApiCall(db, callId, { status: "failed", credits: 0, error: data.error || `HTTP ${res.status}` });
    return json({ ok: false, error: data.error || "생성 실패", detail: data }, res.status || 500);
  } catch (e) {
    await finishApiCall(db, callId, { status: "failed", credits: 0, error: String((e && e.message) || e).slice(0, 200) });
    return apiErr("생성 처리 중 오류가 발생했습니다.", 500);
  }
};

// 비동기 영상 상태 폴링 (과금은 POST 시점에 이미 처리됨)
export const onRequestGet = async ({ request, env }) => {
  const a = await authApi(request, env);
  if (a.err) return a.err;
  const rl = await enforceRateLimit(a.db, a.me.id, "get", a.me.role === "admin");
  if (!rl.ok) return rateErr(rl);
  const genTok = env.MCP_AUTH_TOKEN || env.mcp_auth_token || String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const url = new URL(request.url);
  const origin = url.origin;
  const headers = {};
  if (genTok) headers["Authorization"] = "Bearer " + genTok;
  const innerReq = new Request(origin + "/api/generate" + url.search, { headers });
  const out = await generateApi({ request: innerReq, env, __internalBilling: true });
  //  실패로 확정된 태스크면, 제출 시 차감했던 크레딧을 1회만 돌려준다.
  let body = null;
  try { body = await out.clone().json(); } catch { return out; }
  if (body && (body.status === "failed" || (body.error && !body.url))) {
    const refunded = await refundFailedTask(a.db, "/api/generate" + url.search, body.error || "생성 실패");
    if (refunded > 0) return json({ ...body, credits_refunded: refunded }, out.status || 200);
  }
  return out;
};
