// POST /api/usage/record — 스튜디오 생성 1건의 AI 비용/사용량을 "사용자별"로 D1 에 저장.
// 스튜디오(로그인 상태)가 생성 성공 시 호출. 세션 쿠키로 사용자를 식별한다.
// body: { provider, model, kind, units, usd }

const HMAC_SECRET = "nvc_hmac_secret_2024";
const SESSION_COOKIE = "nvc_session";

function parseCookies(h = "") { const o = {}; for (const p of h.split(";")) { const [k, ...v] = p.trim().split("="); if (k) o[k.trim()] = decodeURIComponent(v.join("=")); } return o; }
function fromB64url(b) { const s = b.replace(/-/g, "+").replace(/_/g, "/"); const p = s.length % 4 ? "=".repeat(4 - s.length % 4) : ""; return new TextDecoder().decode(Uint8Array.from(atob(s + p), c => c.charCodeAt(0))); }
async function verifyToken(t) { if (!t) return null; const [b, s] = t.split("."); if (!b || !s) return null; try { const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(HMAC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]); const ok = await crypto.subtle.verify("HMAC", k, Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)), new TextEncoder().encode(b)); if (!ok) return null; const p = JSON.parse(fromB64url(b)); if (p.exp && p.exp < Date.now() / 1000) return null; return p; } catch { return null; } }
function parseUserDataHeader(req) { try { const b = req.headers.get("X-User-Data-Base64"); if (!b) return null; return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)))); } catch { return null; } }
function resp(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": "true" } }); }

async function ensureTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY, user_id TEXT DEFAULT '', email TEXT DEFAULT '', name TEXT DEFAULT '',
    provider TEXT DEFAULT '', model TEXT DEFAULT '', kind TEXT DEFAULT '',
    units REAL DEFAULT 0, usd REAL DEFAULT 0, created_at TEXT NOT NULL
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id)").run().catch(() => {});
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_usage(created_at)").run().catch(() => {});
}

export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return resp({ ok: false, error: "bad json" }, 400); }

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const user = (await verifyToken(cookies[SESSION_COOKIE])) || parseUserDataHeader(request);
  const uid = (user && (user.id || user.email)) ? String(user.id || user.email) : "guest";
  const email = (user && user.email) || "";
  const name = (user && user.name) || "";

  const usd = Math.max(0, Number(b.usd) || 0);
  const units = Math.max(0, Number(b.units) || 0);
  const provider = String(b.provider || "").slice(0, 40);
  const model = String(b.model || "").slice(0, 80);
  const kind = String(b.kind || "").slice(0, 20);

  if (!env || !env.DB) return resp({ ok: true, stored: false });
  try {
    await ensureTable(env.DB);
    const id = "au" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await env.DB.prepare(`INSERT INTO ai_usage (id,user_id,email,name,provider,model,kind,units,usd,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, uid, email, name, provider, model, kind, units, usd, new Date().toISOString()).run();
    return resp({ ok: true, stored: true });
  } catch (e) {
    return resp({ ok: false, error: String((e && e.message) || e).slice(0, 160) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-User-Data-Base64" } });
}
