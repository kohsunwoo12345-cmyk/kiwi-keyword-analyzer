// 공개 생성 API v1 — 노드형 AI 영상 플랜 회원이 API 키(bg_live_)로 이미지·영상 모델 직접 호출.
//  · POST /api/v1/generate : { provider, model, prompt, ... } → 생성 시작(이미지=즉시 URL, 영상=task 반환)
//  · GET  /api/v1/generate?provider=...&task=...|op=... : 비동기 영상 상태 폴링
//  키 1개로 모든 모델 호출 가능. 크레딧은 스튜디오(UI)와 동일 규칙으로 차감된다.
import { onRequest as generateApi } from "../generate.js";
import { resolveDB, ensureSchema, json } from "../_utils";
import { getUserByApiKey, logApiCall, hasVideoApiAccess, ensureApiKeysSchema, enforceRateLimit, beginApiCall, finishApiCall } from "../_apikeys";
import { computeCharge, getUsdKrw, resolveMarkup, ensureAiUsage } from "../studio/_pricing";

// 크레딧 차감 + 사용/거래 기록 (스튜디오 usage/record 와 동일)
async function commitCharge(db, me, c, units) {
  try { await ensureAiUsage(db); } catch {}
  const balance = Number(me.credits) || 0;
  const charged = Math.round(Math.min(balance, c.credits) * 100) / 100;
  if (charged > 0) {
    const after = Math.round((balance - charged) * 100) / 100;
    await db.prepare("UPDATE users SET credits = ? WHERE id = ?").bind(after, me.id).run();
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
      units || (c.kind === "image" ? 1 : 0), c.usd, c.costKrw, charged, charged * 50, c.markup, c.usdKrw, new Date().toISOString()).run();
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

  const body = await request.json().catch(() => ({}));
  const provider = String(body.provider || "");
  const model = String(body.model || "");
  const kind = String(body.kind || (/image|nano|gpt|grok|flux/i.test(provider + model) ? "image" : "video"));
  const units = Number(body.seconds || body.units || (kind === "image" ? 1 : 8)) || 8;
  if (!model && !provider) return apiErr("model 또는 provider 는 필수입니다.", 400);

  // 남용 방지: 슬라이딩 윈도우 레이트리밋 + 동시 진행 제한 (관리자 면제)
  const rl = await enforceRateLimit(db, me.id, "post", isAdmin);
  if (!rl.ok) return rateErr(rl);

  // 크레딧 사전 확인
  let est = null;
  try {
    const rate = await getUsdKrw(db);
    const markup = await resolveMarkup(db, me.id, model, Number(me.credit_markup) || 0);
    est = computeCharge({ model, units, kind, res: body.res, audio: !!body.audio }, rate, markup);
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
    const res = await generateApi({ request: innerReq, env });
    const data = await res.json().catch(() => ({}));

    const ok = res.ok && !data.error;
    if (ok) {
      let charged = 0;
      try { if (est) charged = await commitCharge(db, me, est, kind === "image" ? 1 : units); } catch {}
      await finishApiCall(db, callId, { status: "ok", credits: charged });
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
  return generateApi({ request: innerReq, env });
};
