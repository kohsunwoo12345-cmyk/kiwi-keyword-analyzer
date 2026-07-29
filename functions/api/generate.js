// /api/generate — 노드 스튜디오 통합 생성 프록시
// POST: {provider, model, prompt, negative, refImage, firstFrame, lastFrame,
//        seconds, ratio, res, fps, motion, cfg, seed, dryRun?}
//   응답: {url}(동기) | {statusUrl}(비동기) | {dryRun:true,payload}(검증용, 호출 없음)
// GET  ?provider=runway&task=ID   → Runway 태스크 폴링
//      ?provider=google&op=NAME   → Veo 오퍼레이션 폴링
//      ?provider=google&file=URI  → Veo 결과 파일 스트리밍(키 서버측 유지)
// 키는 Cloudflare Pages 환경변수에서만 읽으며 절대 응답에 포함되지 않습니다.

import { getSessionUser, resolveDB, getUserByMcpToken } from "./_utils";
import { getUserByApiKey, enforceRateLimit, ensureApiKeysSchema } from "./_apikeys";
import { MODEL_COST, computeCharge, getUsdKrw, resolveMarkup, resolveRefSurcharge, resolveCnSurcharge } from "./studio/_pricing";
import { getBrandKit, applyBrandKit } from "./studio/brandkit";
import { MODEL_COST as MODEL_COST_SRV } from "./studio/_pricing";
import { creditPriceFor } from "./payments/prepare";

const RUNWAY_VER = "2024-11-06";

// 상수 시간 문자열 비교 (토큰 타이밍 사이드채널 방지)
function ctEqStr(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function pick(env, names) {
  for (const n of names) if (env[n]) return String(env[n]).trim();   // 붙여넣기 시 끝 공백·줄바꿈 제거(구글 "API key not valid" 방지)
  return null;
}
function keys(env) {
  return {
    runway: pick(env, ["Runway_API_KEY", "RUNWAY_API_KEY", "runway_api_key"]),
    xai:    pick(env, ["Grok_API_KEY", "GROK_API_KEY", "grok_api_key"]),
    google: pick(env, ["VEO_API_KEY", "veo_api_key"]),
    seedance: pick(env, ["Seedance_API_KEY", "SEEDANCE_API_KEY", "seedance_api_key"]),
    flux: pick(env, ["FLUX_API_KEY", "flux_api_key", "BFL_API_KEY"]),
    hailuo: pick(env, ["Hailuo_API_KEY", "HAILUO_API_KEY", "hailuo_api_key", "MINIMAX_API_KEY"]),
    luma: pick(env, ["Luma_API_KEY", "LUMA_API_KEY", "luma_api_key"]),
    fal: pick(env, ["Fal_API_KEY", "FAL_API_KEY", "fal_api_key", "FAL_KEY", "Fal_KEY"]),
    openai: pick(env, ["GPT_API_KEY", "OPENAI_API_KEY", "gpt_api_key", "openai_api_key"])
  };
}
/* R2 버킷 자동 감지 (업로드/media 호스팅과 동일 규칙) */
function r2BucketOf(env) {
  for (const name of ["MEDIA", "BUCKET", "R2", "R2_BUCKET", "STORAGE", "ASSETS",
                      "media", "bucket", "r2", "storage", "MEDIA_BUCKET", "UPLOADS", "uploads"]) {
    const v = env[name];
    if (v && typeof v.put === "function" && typeof v.get === "function") return v;
  }
  for (const kk in env) { const v = env[kk];
    if (v && typeof v.put === "function" && typeof v.get === "function" &&
        (typeof v.createMultipartUpload === "function" || typeof v.head === "function")) return v; }
  return null;
}

/* 음악 생성에 사용 가능한 엔진 (키 보유 순) — 추가 키 발급 불필요 */
export function musicEngines(env, k) {
  const list = [];
  if (pick(env, ["ElevenLabs_API_KEY", "ELEVENLABS_API_KEY", "elevenlabs_api_key"])) list.push("elevenlabs");
  if (k.hailuo) list.push("minimax");
  if (k.fal) list.push("fal");
  return list;
}
/* data: 이미지(첫 프레임 등)를 R2 에 올려 공개 URL 로 바꾼다.
   Grok(xAI) 영상처럼 "공개 URL 만" 받는 제공사에서, 스튜디오가 보낸 data:URI 첫 프레임이
   조용히 버려져 이어보기가 되지 않던 문제를 막는다. 실패하면 null(원래 동작 유지). */
export async function hostImageDataUri(env, origin, dataUri) {
  try {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(String(dataUri || ""));
    if (!m) return null;
    const bucket = r2BucketOf(env);
    if (!bucket) return null;
    const bin = atob(m[2]);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const ext = m[1] === "image/png" ? ".png" : m[1] === "image/webp" ? ".webp" : ".jpg";
    const key = "u/" + crypto.randomUUID() + ext;
    await bucket.put(key, buf, { httpMetadata: { contentType: m[1] } });
    return origin + "/api/media/" + key;
  } catch { return null; }
}

/* 오디오 바이트를 R2 에 올려 공개 URL 반환 (버킷 없으면 data URL 폴백) */
async function hostAudioBytes(env, origin, bytes, mime) {
  try {
    const bucket = r2BucketOf(env);
    if (bucket) {
      const key = "u/" + crypto.randomUUID() + ".mp3";
      await bucket.put(key, bytes, { httpMetadata: { contentType: mime || "audio/mpeg" } });
      return origin + "/api/media/" + key;
    }
  } catch { /* 폴백 */ }
  try {
    let bin = ""; for (const c of bytes) bin += String.fromCharCode(c);
    return "data:" + (mime || "audio/mpeg") + ";base64," + btoa(bin);
  } catch { return null; }
}

/* 대본(텍스트)을 자체 다중엔진 TTS(/api/tts/v2/speak)로 음성(mp3) 합성 → R2 호스팅 → 공개 URL.
   이미 audioUrl 이 오면 그대로 사용. 실패 시 { error, status } 반환. */
async function synthTTSUrl(env, origin, b, _fetchT, cookie) {
  let audioUrl = String(b.audioUrl || "").trim();
  if (/^https?:\/\//.test(audioUrl)) return { audioUrl };
  const text = String(b.text || b.narration || "").trim();
  if (!text) return { error: "대사(텍스트)를 입력하세요.", status: 400 };
  // 내부 호출: TTS 엔드포인트가 로그인 세션을 요구하므로 원 사용자 쿠키를 전달한다.
  const ttsHeaders = { "Content-Type": "application/json" };
  if (cookie) ttsHeaders["Cookie"] = cookie;
  const tr = await _fetchT(origin + "/api/tts/v2/speak", {
    method: "POST", headers: ttsHeaders,
    body: JSON.stringify({ text: text.slice(0, 4000), voice_id: b.voice || "gtts:ko-KR-Neural2-A", speaking_rate: Number(b.rate) || 1.0 })
  }, 60000);
  const ctt = (tr.headers.get("content-type") || "").toLowerCase();
  if (!tr.ok || /json/.test(ctt)) {
    let em = ""; try { em = /json/.test(ctt) ? String((await tr.json()).error || "") : (await tr.text()); } catch {}
    return { error: "음성 합성 실패: " + em.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220), status: 502 };
  }
  const audioBuf = await tr.arrayBuffer();
  if (!audioBuf || audioBuf.byteLength < 64) return { error: "음성이 비어 있습니다(TTS 응답 없음).", status: 502 };
  const bucket = r2BucketOf(env);
  if (!bucket) return { error: "오디오 저장용 R2 버킷을 찾을 수 없습니다.", status: 500 };
  const key = "narr/" + crypto.randomUUID() + ".mp3";
  await bucket.put(key, audioBuf, { httpMetadata: { contentType: "audio/mpeg" } });
  return { audioUrl: origin + "/api/media/" + key };
}

/* ── GCP 서비스 계정 OAuth2 (Vertex AI 정식 인증 — 지역 무관) ── */
export function gcpCreds(env) {
  // 방법 A: 세 개의 개별 변수
  const pid = pick(env, ["GCP_PROJECT_ID", "gcp_project_id"]);
  const email = pick(env, ["GCP_CLIENT_EMAIL", "gcp_client_email"]);
  let pem = pick(env, ["GCP_PRIVATE_KEY", "gcp_private_key"]);
  if (pem) pem = pem.replace(/\\n/g, "\n");
  if (pid && email && pem) return { pid, email, pem };
  // 방법 B: 서비스 계정 JSON 통째로 (VEO_API_KEY 등 어디든)
  const raw = pick(env, ["GCP_SERVICE_ACCOUNT", "GOOGLE_APPLICATION_CREDENTIALS_JSON",
                         "VEO_API_KEY", "veo_api_key"]);
  if (raw && raw.trim().startsWith("{")) {
    try {
      const j = JSON.parse(raw);
      if (j.project_id && j.client_email && j.private_key)
        return { pid: j.project_id, email: j.client_email,
                 pem: String(j.private_key).replace(/\\n/g, "\n") };
    } catch { /* JSON 파싱 실패 → 무시 */ }
  }
  return null;
}
export async function gcpToken(email, pem) {
  const enc = new TextEncoder();
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64u(enc.encode(JSON.stringify({
    iss: email, scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600
  })));
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(header + "." + claim));
  const jwt = header + "." + claim + "." + b64u(sig);
  const r = await fetchT("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + jwt
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("gcp token: " + JSON.stringify(j).slice(0, 160));
  return j.access_token;
}
const VERTEX_LOC = "us-central1";
// Veo 3.0 계열(veo-3.0-generate-001)은 2026-06-30 부로 지원 종료 → 현행 3.1 로 고정.
const VEO_MODEL = "veo-3.1-generate-001";
/* Vertex(GA)와 Gemini 개발자 API(AI Studio)는 같은 모델을 다른 이름으로 부른다.
   구글 공식 단가 문서(ai.google.dev/gemini-api/docs/pricing)의 Veo 3.1 항목에 적힌 ID 는
   veo-3.1-generate-preview · veo-3.1-fast-generate-preview · veo-3.1-lite-generate-preview 다.
   Vertex 쪽은 -001 로 부르지만, AI Studio 폴백에 -001 을 그대로 보내면 모르는 모델이라 실패한다
   (그래서 두 Vertex 경로가 막힌 계정에서는 폴백이 아무 소용이 없었다).
   문서에 적힌 이름을 먼저 쓰고, 계정에 따라 GA 이름만 열려 있을 수 있으니 -001 로도 한 번 더 시도한다. */
const VEO_AISTUDIO_MODELS = ["veo-3.1-generate-preview", "veo-3.1-generate-001"];
function vertexBase(pid) {
  return "https://" + VERTEX_LOC + "-aiplatform.googleapis.com/v1/projects/" + pid +
         "/locations/" + VERTEX_LOC + "/publishers/google/models/" + VEO_MODEL;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

/* 제공사 호출 타임아웃. Cloudflare Workers 에서 AbortController 가 멈춘 커넥션을
   확실히 취소하지 못하는 경우가 있어(→ 플랫폼 502), Promise.race 로 무조건 제한한다.
   fetch 가 안 끝나도 타임아웃 Promise 가 먼저 reject → 함수가 읽을 수 있는 에러를 반환하고 종료. */
async function fetchT(url, opts, ms) {
  const t = ms || 15000;
  const ctl = new AbortController();
  let timer;
  const fetchP = fetch(url, Object.assign({}, opts || {}, { signal: ctl.signal }));
  // 핵심: 타임아웃이 이기면 이 fetch 는 버려지고, 이후 abort 로 reject 된다.
  //   그 reject 를 아무도 await 하지 않으면 Cloudflare 에서 "unhandled rejection" 이
  //   되어 함수 자체가 죽고 → try/catch 를 우회한 raw 502(Bad gateway) 가 난다.
  //   (제공사 응답이 빠른 Runway 등은 타임아웃이 안 나서 멀쩡, 느린 Seedance 만 502)
  //   → 버려질 fetch 의 reject 를 항상 삼켜서 unhandled rejection 을 원천 차단한다.
  fetchP.catch(() => {});
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      try { ctl.abort(); } catch (e) { /* best-effort */ }
      reject(new Error("제공사 응답 시간 초과(" + (t / 1000) + "s) — 제공사 지연 또는 무응답"));
    }, t);
  });
  try {
    return await Promise.race([fetchP, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/* 프롬프트 길이 제한.
   카메라 프리셋·비율 힌트·레퍼런스 @태그 바인딩은 모두 프롬프트 "뒤"에 붙는다.
   그런데 각 제공사 한도에 맞춰 뒤를 그냥 잘라내면(=예전 .slice(0,N)) 프롬프트가 조금만
   길어도 그 지시문들이 통째로 사라졌다 — 카메라 모션을 골라도 반영되지 않던 원인.
   한도를 넘으면 본문 중간을 줄이고 뒤쪽 지시문은 그대로 남긴다. */
const CUT_KEEP = 260;   // 뒤쪽 지시문 보존 길이(카메라 ~90 · 비율 ~50 · @태그 블록 ~150)
export function cut(s, max) {
  s = String(s == null ? "" : s);
  if (s.length <= max) return s;
  const keep = Math.min(CUT_KEEP, Math.floor(max / 3));
  return s.slice(0, max - keep - 1) + "…" + s.slice(s.length - keep);
}

/* ── 페이로드 빌더 (dryRun 검증도 이 함수를 그대로 사용) ── */
// Runway 표시명 → API 모델 ID (Gen-3/Gen-4 모두 image_to_video 엔드포인트 공용)
export const RUNWAY_MODELS = {
  "Runway Gen-4": "gen4_turbo",
  "Runway Gen-3 Alpha Turbo": "gen3a_turbo",
};
/* gen3a_turbo 도 2026-07-30 에 종료된다(공식 표: "Gen-3 Alpha Turbo and Gen-4 Aleph are
   deprecated and will be officially sunset on July 30th, 2026 — upgrade Gen-3 Alpha Turbo
   to Gen-4.5 or Gen-4 Turbo"). 그날이 지나면 이 ID 로 보낸 요청은 그냥 실패한다.
   gen4_turbo 는 같은 초당 5크레딧이라 갈아타도 요금이 달라지지 않는다 → 안전한 대체다.
   Aleph 과 같은 방식으로, 모델 이름 문제일 때만 다음 후보로 물러난다. */
export const RUNWAY_ALT = { gen3a_turbo: ["gen3a_turbo", "gen4_turbo"] };
export function buildRunwayPayload(b) {
  // Runway 허용 비율 전체 — 4:3·3:4·21:9 가 빠져 있어 16:9 로 폴백되고 있었다.
  const ratioMap = { "16:9": "1280:720", "9:16": "720:1280", "1:1": "960:960",
                     "4:3": "1104:832", "3:4": "832:1104", "4:5": "832:1104", "21:9": "1584:672" };
  const img = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  // Runway 는 promptImage 를 [{uri, position:"first"|"last"}] 배열로도 받는다 → 끝 프레임 지정 가능.
  //  끝 프레임이 있을 때만 배열 형태로 보내고, 없으면 기존 문자열 형태를 그대로 유지한다(회귀 방지).
  //  ※ position first/last 는 gen4_turbo·gen3a_turbo 공식 지원(확인 완료) → caps 에서 포트 개방.
  const promptImage = (img && b.lastFrame)
    ? [{ uri: img, position: "first" }, { uri: b.lastFrame, position: "last" }]
    : img;
  return {
    model: RUNWAY_MODELS[b.model] || "gen4_turbo",
    promptImage,
    promptText: cut(b.prompt, 1000),
    ratio: ratioMap[b.ratio] || "1280:720",
    duration: (Number(b.seconds) || 8) <= 7 ? 5 : 10,
    seed: Number.isFinite(Number(b.seed)) ? Number(b.seed) % 4294967295 : undefined
  };
}
/* Runway Gen-4 Aleph — 진짜 V2V(영상→영상). 입력 영상은 반드시 공개 URL(R2). */
const RUNWAY_RATIOS = { "16:9": "1280:720", "9:16": "720:1280", "1:1": "960:960",
                     "4:3": "1104:832", "3:4": "832:1104", "4:5": "832:1104", "21:9": "1584:672" };
/* Aleph 모델 ID 후보. gen4_aleph 는 2026-07-30 종료 예정이고 후속이 aleph2 다
   (Runway 문서: "Gen-4 Aleph is deprecated and will be officially sunset on July 30th, 2026").
   그날이 지나면 gen4_aleph 는 죽는다. 새 ID 를 먼저 시도하고, 아직 계정에 안 열려 있으면
   기존 ID 로 물러난다 — 클링 3.0 때와 같은 방식이다. */
export const ALEPH_MODELS = ["aleph2", "gen4_aleph"];
export function buildAlephPayload(b, forceModel) {
  return {
    model: forceModel || ALEPH_MODELS[0],
    videoUri: b.srcVideo || null,
    promptText: cut(b.prompt, 1000),
    ratio: RUNWAY_RATIOS[b.ratio] || "1280:720",
    seed: Number.isFinite(Number(b.seed)) ? Number(b.seed) % 4294967295 : undefined
  };
}
/* 비율 필드를 받지 않는 제공사(Grok·Nano Banana·Hailuo 등)를 위해, 선택한 비율을
   프롬프트에 문장으로 얹어 실제 구도에 반영되게 한다. 필드로 보내는 제공사는 건드리지 않는다. */
const RATIO_WORDS = {
  "16:9": "16:9 widescreen landscape composition",
  "9:16": "9:16 vertical portrait composition, tall frame",
  "1:1":  "1:1 square composition",
  "4:5":  "4:5 portrait composition",
  "4:3":  "4:3 landscape composition",
  "3:4":  "3:4 portrait composition",
  "3:2":  "3:2 landscape composition",
  "2:3":  "2:3 portrait composition",
  "5:4":  "5:4 landscape composition",
  "21:9": "21:9 ultrawide cinematic composition",
  "9:21": "9:21 ultratall vertical composition"
};
export function withRatioHint(text, ratio) {
  const w = RATIO_WORDS[String(ratio || "").trim()];
  if (!w) return text || "";
  if (new RegExp(String(ratio).replace(":", "\\s*:\\s*")).test(text || "")) return text || "";  // 이미 언급됨
  return [text, "Aspect ratio: " + w + "."].filter(Boolean).join("\n");
}
export function buildXaiPayload(b) {
  const p = {
    model: "grok-imagine-image",
    prompt: cut(withRatioHint([b.prompt, b.negative ? ("피해야 할 것: " + b.negative) : ""].filter(Boolean).join("\n"), b.ratio), 1000),
    n: 1,
    response_format: "url"
  };
  // 공식 SDK 는 image_url 로 소스 이미지를 받는다(URL 또는 base64) → 레퍼런스가 있으면 image-to-image.
  const ref = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  if (ref) p.image_url = ref;
  return p;
}
// Grok(xAI) 영상 생성 페이로드 — 공식 스펙: POST /v1/videos/generations, model grok-imagine-video-1.5,
//  image:{url}(image-to-video, 공개 URL 만), duration. 모델명은 GROK_VIDEO_MODEL env 로 덮어쓰기 가능.
export function buildXaiVideoPayload(b, env) {
  const img = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  const p = {
    model: (env && pick(env, ["GROK_VIDEO_MODEL", "grok_video_model"])) || "grok-imagine-video-1.5",
    prompt: cut(withRatioHint([b.prompt, b.negative ? ("피해야 할 것: " + b.negative) : ""].filter(Boolean).join("\n"), b.ratio), 1000),
    //  Grok 영상은 5·8·10초만 받는다. 예전엔 1~20 을 그대로 흘려보내, API·MCP 로 임의 값이
    //  들어오면 제공사가 거부하거나 실제 길이와 과금이 어긋났다 → 허용값으로 스냅한다.
    duration: [5, 8, 10].reduce((a, c) => {
      const w = Number(b.seconds) || 5; return Math.abs(c - w) < Math.abs(a - w) ? c : a; }, 5)
  };
  // 영상 엔드포인트는 이미지와 달리 aspect_ratio 를 실제 필드로 받는다(문서 예시 기준).
  //  예전엔 프롬프트 문구로만 넣어 구도가 어긋날 수 있었다 → 필드로도 보낸다(문구는 보조로 유지).
  const XAI_RATIOS = ["16:9", "9:16", "1:1"];
  if (XAI_RATIOS.indexOf(String(b.ratio || "").trim()) >= 0) p.aspect_ratio = String(b.ratio).trim();
  if (img && /^https?:\/\//.test(String(img))) p.image = { url: String(img) };  // data:URL 은 불가(공개 URL 필요)
  return p;
}
/* Seedance 모델명(프론트 표시명) → BytePlus ModelArk 모델 ID
   ※ 콘솔에서 실제 ID가 바뀌면 노드의 "Seedance 모델 ID 직접입력" 또는
     SEEDANCE_MODEL_ID 환경변수로 언제든 덮어쓸 수 있습니다. */
export const SEEDANCE_IDS = {
  // 날짜 접미사는 "그 변형의 출시일"이지 패밀리 공용값이 아니다(공식 문서 확인):
  //   base·fast = 260128, mini = 260615(2026-06-15 출시).
  // 또한 공식 문서상 BytePlus/ModelArk 에 표기된 2.0 은 mini 뿐이고,
  // base·fast 는 Volcengine(중국) 쪽에 doubao- 접두사로 문서화돼 있다.
  // → dreamina-(BytePlus) 우선, 안 되면 doubao-(Volcengine 표기), 마지막으로 접미사 없는 형태.
  "Seedance 2.0":                ["dreamina-seedance-2-0-260128", "dreamina-seedance-2-0"],
  "Seedance 2.0 Fast":           ["dreamina-seedance-2-0-fast-260128", "dreamina-seedance-2-0-fast"],
  "Seedance 2.0 Mini":           ["dreamina-seedance-2-0-mini-260615", "dreamina-seedance-2-0-mini"],  // 첫 ID 는 실제 작동 확인됨
  // ↓ 1.x 는 계정 모델 목록(diag=ark-models)에서 확인한 실제 ID. 추측이던 무접미사 형태는 뒤로 뺀다.
  //   1.5 Pro 와 1.0 Pro Fast 는 날짜 접미사가 빠져 404 였던 것(미개통이 아니었음).
  "Seedance 1.5 Pro":            ["seedance-1-5-pro-251215", "seedance-1-5-pro"],
  "Seedance 1.0 Pro":            ["seedance-1-0-pro-250528", "seedance-1-0-pro"],
  "Seedance 1.0 Pro Fast":       ["seedance-1-0-pro-fast-251015", "seedance-1-0-pro-fast"],
  "Seedance 1.0 Lite (텍스트→영상)": ["seedance-1-0-lite-t2v-250428", "seedance-1-0-lite-t2v"],
  "Seedance 1.0 Lite (이미지→영상)": ["seedance-1-0-lite-i2v-250428", "seedance-1-0-lite-i2v"],
  "Seedance 1.0":                ["seedance-1-0-pro-250528", "seedance-1-0-pro"]  // 구버전 표시명 호환
};
/* 이 모델에 시도할 ID 후보들(우선순위 순). 직접입력·환경변수가 있으면 그것만 사용. */
/* 첫 프레임(이어보기)이 있는데 "텍스트→영상" 모델이 선택된 경우, 같은 계열의 "이미지→영상"
   모델로 바꿔 준다. t2v 모델 ID 에 이미지를 보내면 제공사가 거부해 요청이 통째로 실패한다.
   (스튜디오는 t2v 모델에서 첫 프레임 포트를 숨기지만 /api/v1·MCP 는 임의로 보낼 수 있다) */
function seedanceI2VSwap(model, b) {
  const hasFirst = !!(b && (b.firstFrame || b.refImage || (b.refImages && b.refImages[0])));
  if (!hasFirst) return model;
  return String(model || "").replace("(텍스트→영상)", "(이미지→영상)");
}
/* 계정에서 실제로 조회되는 ModelArk 모델 ID 목록 (5분 캐시).
   하드코딩한 후보가 전부 404(InvalidEndpointOrModel.NotFound) 일 때, 날짜 접미사만 다른
   같은 계열 ID 를 여기서 찾아 자동으로 쓴다 — 콘솔에서 개통해도 접미사가 다르면 계속
   404 가 나던 문제(예: Seedance 1.0 Lite)를 코드 수정 없이 흡수한다. */
let _arkCat = null, _arkCatAt = 0, _arkCatSrc = null;
export async function arkModelCatalog(key) {
  if (_arkCat && Date.now() - _arkCatAt < 300000) return _arkCat;
  const ids = new Set();
  const probes = [];
  for (const p of ["/models?page_size=200", "/models", "/foundation_models", "/endpoints"]) {
    try {
      const r = await fetchT(ARK_HOSTS.bp + p, { headers: { "Authorization": "Bearer " + key } }, 8000);
      const t = await r.text();
      probes.push({ path: p, httpStatus: r.status, bytes: t.length, head: String(t).slice(0, 160) });
      if (!r.ok) continue;
      (String(t).match(/[a-z0-9]+(?:-[a-z0-9]+){2,}/gi) || [])
        .filter(x => /^(seedance|seedream|seededit|doubao|dreamina|dola)/i.test(x))
        .forEach(x => ids.add(x));
      if (ids.size) { _arkCatSrc = { path: p, httpStatus: r.status, probes }; break; }
    } catch (e) { probes.push({ path: p, error: String((e && e.message) || e).slice(0, 80) }); }
  }
  if (!_arkCatSrc) _arkCatSrc = { path: null, probes };
  _arkCat = [...ids]; _arkCatAt = Date.now();
  return _arkCat;
}
export function arkCatalogSource() { return _arkCatSrc; }
/* 날짜 접미사(-250428 등)를 뗀 계열 이름 */
export function arkStem(id) { return String(id || "").replace(/-\d{6}$/, ""); }
/* 카탈로그에서 같은 계열의 다른 ID 를 찾는다(이미 시도한 것은 제외) */
export function arkPickByStem(catalog, candidates) {
  const stems = [...new Set((candidates || []).map(arkStem))];
  const tried = new Set(candidates || []);
  for (const st of stems) {
    const hit = (catalog || []).find(x => !tried.has(x) && arkStem(x) === st);
    if (hit) return hit;
  }
  for (const st of stems) {
    const hit = (catalog || []).find(x => !tried.has(x) && x.indexOf(st) === 0);
    if (hit) return hit;
  }
  return null;
}
export function seedanceModelIds(b, env) {
  const custom = b && typeof b.seedanceModel === "string" && b.seedanceModel.trim();
  if (custom) return [custom];                     // 노드에서 직접 입력한 모델 ID 최우선
  const override = env && pick(env, ["SEEDANCE_MODEL_ID", "seedance_model_id"]);
  if (override) return [override];
  const v = SEEDANCE_IDS[seedanceI2VSwap(b && b.model, b)] || SEEDANCE_IDS[b && b.model] || "seedance-1-0-pro-250528";
  return Array.isArray(v) ? v.slice() : [v];
}
export function seedanceModelId(b, env) { return seedanceModelIds(b, env)[0]; }
export function buildSeedancePayload(b, env, forceModel) {
  const model = forceModel || seedanceModelId(b, env);
  // Seedance 2.0 공식 지원 비율: 21:9 · 16:9 · 4:3 · 1:1 · 3:4 · 9:16.
  //  예전엔 9:16·1:1 만 통과시키고 나머지를 전부 16:9 로 뭉개, 4:3·3:4·21:9 선택이 무시됐다.
  //  (1.x 는 --ratio 로 텍스트에 실리며 같은 표기를 쓴다)
  const SEEDANCE_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
  const ratio = SEEDANCE_RATIOS.indexOf(String(b.ratio || "").trim()) >= 0 ? String(b.ratio).trim() : "16:9";
  const first = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  const isV2 = /seedance-2/.test(model);   // dreamina-seedance-2-0-* 계열
  // 해상도 — 공식 지원은 480p·720p·1080p. 2.0 은 최상위 resolution 필드, 1.x 는 --resolution 텍스트 명령.
  //  예전엔 아예 보내지 않아, 노드에서 720p/4K 를 골라도 결과는 그대로인데 과금만 달라졌다.
  //  540p 는 표에 없어 기본값 1080p 로 떨어졌다 — 가장 낮은 화질을 고른 회원에게
  //  1080p 를 내보내고 1080p 요금(4배)을 물리던 자리다. 지원되는 최근접 480p 로 내린다.
  const SEEDANCE_RES = { "480p": "480p", "540p": "480p", "720p": "720p", "1080p": "1080p", "4K": "1080p", "4k": "1080p" };
  const resolution = SEEDANCE_RES[String(b.res || "").trim()] || "1080p";

  if (isV2) {
    // ── Seedance 2.0 공식 Reference-to-Video 형식 ──
    //  · ratio/duration/watermark 는 "최상위 필드"
    //  · 이미지 role:"reference_image"(최대 9), 영상 type:"video_url"+role:"reference_video"(최대 3,
    //    URL 전용 — 영상은 base64 불가), 오디오 role:"reference_audio"(최대 3)
    //  · 공식 스펙은 프롬프트 안에서 @Image1/@Video1/@Audio1 태그로 각 자산을 어떻게 쓸지
    //    명시해야 참조가 정확히 걸린다(태그 없이 첨부만 하면 모델이 무시할 수 있음).
    // Seedance 2.0 의 duration 은 4~15 범위의 "이산 허용값"만 받는다 — 4·5·6·8·10·12·15.
    //  범위만 자르면 7·9·11·13·14 가 그대로 나가 제공사가 거부한다(노드는 스냅하지만
    //  MCP·API 키 등 다른 경로는 임의 값을 보낼 수 있으므로 서버에서도 스냅한다).
    const SEEDANCE2_DURATIONS = [4, 5, 6, 8, 10, 12, 15];
    const wantSec = Math.round(Number(b.seconds) || 5);
    const dur = SEEDANCE2_DURATIONS.reduce(
      (a, c) => (Math.abs(c - wantSec) < Math.abs(a - wantSec) ? c : a), SEEDANCE2_DURATIONS[0]);
    // 2.0 의 이미지는 공개 URL 과 base64 를 모두 받는다(공식: data:image/<소문자>;base64,…).
    //  base64 인라인을 쓰는 이유: URL 로 주면 제공사가 우리 R2 를 가져오느라 제출이 길어져
    //  타임아웃 → 502 로 이어진다(영상 레퍼런스만 URL 전용이라 어쩔 수 없이 URL).
    //  형식이 어긋난 값(대문자 포맷·data:가 아닌 스킴)은 제출 자체를 깨뜨리므로 여기서 거른다.
    const okImg = (s) => /^https?:\/\//.test(s) || /^data:image\/[a-z0-9.+-]+;base64,/.test(s);
    // ── 역할 분리 ──
    //  2.0 은 "이미지→영상"(first_frame/last_frame 사이를 보간)과 "레퍼런스→영상"
    //  (reference_image 로 정체성·구도 유지)이 서로 다른 모드다. 첫 프레임까지 전부
    //  reference_image 로 보내면 의도한 i2v 가 아니라 무거운 레퍼런스 모드로 흘러간다.
    //  (같은 이미지를 first_frame 으로 보내는 1.x 경로는 정상 동작한다.)
    //  first 는 1.x 용으로 refImages[0] 까지 폴백하지만, 2.0 에서는 그 폴백을 쓰지 않는다.
    //  "첫 프레임 포트에 실제로 연결한 경우"에만 i2v 이고, 레퍼런스만 붙였다면 레퍼런스 모드여야 한다.
    const firstF = b.firstFrame && okImg(b.firstFrame) ? b.firstFrame : null;
    const lastF  = b.lastFrame && okImg(b.lastFrame) ? b.lastFrame : null;
    // 스튜디오는 firstFrame 을 refImages[0] 과 겹쳐 보내므로, 프레임으로 쓴 것은 레퍼런스에서 뺀다.
    let refs = (Array.isArray(b.refImages) ? b.refImages.slice() : []);
    const seenI = {};
    refs = refs.filter(u => u && okImg(u) && u !== firstF && u !== lastF
                            && !seenI[u] && (seenI[u] = 1)).slice(0, 9);
    // 영상 레퍼런스(공개 URL 전용, 최대 3) — 단일 srcVideo + 선택적 refVideos 배열
    const vids = [], seenV = {};
    [b.srcVideo].concat(Array.isArray(b.refVideos) ? b.refVideos : [])
      .forEach(v => { if (v && /^https?:\/\//.test(v) && !seenV[v] && (seenV[v] = 1)) vids.push(v); });
    const useVids = vids.slice(0, 3);
    // 오디오 레퍼런스(공개 URL, 최대 3)
    const auds = [], seenA = {};
    [b.audioUrl].concat(Array.isArray(b.refAudios) ? b.refAudios : [])
      .forEach(a => { if (a && /^https?:\/\//.test(a) && !seenA[a] && (seenA[a] = 1)) auds.push(a); });
    const useAuds = auds.slice(0, 3);

    // ── @태그 바인딩: 사용자가 프롬프트에 직접 @태그를 쓰지 않았을 때만 자동으로 붙인다 ──
    //  Seedance 에는 negative_prompt 필드가 없다 → 노드의 네거티브 입력이 그냥 버려지지 않도록
    //  Luma 와 같은 방식으로 프롬프트 안에 "피해야 할 것"으로 접어 넣는다.
    let text = [(b.prompt || ""), b.negative ? ("피해야 할 것: " + String(b.negative)) : ""]
      .filter(Boolean).join("\n");
    const tags = [];
    refs.forEach((_, i) => tags.push("@Image" + (i + 1)));
    useVids.forEach((_, i) => tags.push("@Video" + (i + 1)));
    useAuds.forEach((_, i) => tags.push("@Audio" + (i + 1)));
    if (tags.length && !/@(Image|Video|Audio)\d/.test(text)) {
      const hint = [];
      if (useVids.length) hint.push("@Video1 의 카메라 워크·모션·연출을 그대로 따르세요");
      if (refs.length) hint.push("@Image1" + (refs.length > 1 ? "~@Image" + refs.length : "") + " 는 인물/피사체·배경 참고");
      if (useAuds.length) hint.push("@Audio1 은 사운드/음성 참고");
      text = (text ? text + "\n\n" : "") + "[레퍼런스 바인딩: " + tags.join(", ") + " — " + hint.join(", ") + "]";
    }
    const content = [{ type: "text", text: cut(text, 1500) }];
    // 첫/마지막 프레임은 전용 role 로. last_frame 은 공식적으로 first_frame 이 있을 때만 유효하다.
    if (firstF) content.push({ type: "image_url", image_url: { url: firstF }, role: "first_frame" });
    if (firstF && lastF) content.push({ type: "image_url", image_url: { url: lastF }, role: "last_frame" });
    for (const u of refs)    content.push({ type: "image_url", image_url: { url: u }, role: "reference_image" });
    for (const u of useVids) content.push({ type: "video_url", video_url: { url: u }, role: "reference_video" });
    for (const u of useAuds) content.push({ type: "audio_url", audio_url: { url: u }, role: "reference_audio" });
    // 오디오 생성 기본 OFF — 2.0 은 기본으로 오디오를 만드는데, 그 오디오가 콘텐츠 검열
    // ("output audio may contain sensitive information")에 걸려 생성이 통째로 실패함.
    // b.generateAudio === true 일 때만 켠다(그때만 오디오 포함 시도).
    const genAudio = b.generateAudio === true;
    const watermark = b.watermark === true;   // 기본 false(워터마크 없음)
    // return_last_frame — 공식 "클립 이어붙이기" 방식. 켜면 결과에 last_frame_url(제공사가 만든
    //  진짜 마지막 프레임, 원본 해상도·무손실 경로)이 함께 온다. 이걸 다음 클립의 first_frame 으로
    //  넘기는 것이 ModelArk 가 안내하는 연속 생성법이다.
    //  (브라우저에서 영상을 다시 디코딩해 캔버스로 뽑던 방식은 축소·재압축·CORS 실패 위험이 있다)
    return { model, content, ratio, resolution, duration: dur, watermark, generate_audio: genAudio, return_last_frame: true };
  }

  // ── Seedance 1.x 형식(텍스트에 --ratio/--duration, first/last_frame) ──
  //  Lite 는 t2v·i2v 가 서로 다른 모델 ID 다. t2v 에 이미지를 붙이거나 i2v 에 안 붙이면
  //  제공사가 반려한다. 스튜디오는 포트로 막지만 API·MCP 는 임의로 보낼 수 있어 여기서도 맞춘다.
  const liteT2V = /lite-t2v/.test(model), liteI2V = /lite-i2v/.test(model);
  const dur = (Number(b.seconds) || 8) <= 6 ? 5 : 10;
  const content = [{ type: "text",
    text: cut([(b.prompt || ""), b.negative ? ("피해야 할 것: " + String(b.negative)) : ""]
            .filter(Boolean).join("\n"), 800)
          + " --ratio " + ratio + " --duration " + dur + " --resolution " + resolution }];
  if (first && !liteT2V) content.push({ type: "image_url", image_url: { url: first }, role: "first_frame" });
  if (b.lastFrame && !liteT2V) content.push({ type: "image_url", image_url: { url: b.lastFrame }, role: "last_frame" });
  // i2v 모델인데 이미지가 없으면 제공사가 반려하므로, 표시명이 t2v 인 형제 모델로 되돌린다.
  if (liteI2V && !first) return { model: model.replace("lite-i2v", "lite-t2v"), content };
  return { model, content };
}
const ARK_HOSTS = {
  bp: "https://ark.ap-southeast.bytepluses.com/api/v3",   // BytePlus ModelArk (해외)
  vc: "https://ark.cn-beijing.volces.com/api/v3"          // Volcengine (중국)
};

/* ── Seedream (씨드림) — ByteDance/BytePlus ModelArk 이미지 생성 ──
   ※ 씨댄스(Seedance)와 동일한 ByteDance ModelArk API 다. 그래서 별도 키가 아니라
     Seedance_API_KEY(= ByteDance 키)를 그대로 공유해서 인증한다.
   ※ 콘솔에서 실제 모델 ID 가 바뀌면 노드의 "Seedream 모델 ID 직접입력"(b.seedreamModel) 또는
     SEEDREAM_MODEL_ID 환경변수로 언제든 덮어쓸 수 있다(코드 수정 불필요). */
/* 표시명 → BytePlus ModelArk 모델 ID "후보 목록".
   첫 번째가 공식 확인된 ID. 콘솔/리전에 따라 날짜접미사나 doubao- 접두사(중국 Volcengine 표기)를
   요구하는 경우가 있어, "모델 없음(404/InvalidParameter)" 응답이면 다음 후보로 자동 재시도한다.
   → 콘솔에서 ID 체계가 바뀌어도 코드 수정 없이 스스로 맞춘다. */
export const SEEDREAM_IDS = {
  // 콘솔(BytePlus 인터내셔널) 실제 카드명: Dola-Seedream-5.0-pro/lite, ByteDance-Seedream-4.5 → 해당 접두사 후보를 최우선.
  // 콘솔 실제 Model ID(회원 제공): Pro=dola-seedream-5-0-pro-260628, Lite=seedream-5-0-260128
  // ↓ 전부 계정 모델 목록(diag=ark-models)에서 확인한 실제 ID. 무접미사 별칭을 예비 후보로 둔다.
  "Seedream 5.0 Pro":               ["dola-seedream-5-0-pro-260628", "dola-seedream-5-0-pro"],
  "Seedream 5.0 Pro (레퍼런스 편집)":  ["dola-seedream-5-0-pro-260628", "dola-seedream-5-0-pro"],
  "Seedream 5.0 Lite":              ["seedream-5-0-260128", "seedream-5-0"],
  "Seedream 5.0 Lite (레퍼런스 편집)": ["seedream-5-0-260128", "seedream-5-0"],
  "Seedream 4.5":                   ["seedream-4-5-251128", "seedream-4-5"],
  "Seedream 4.5 (레퍼런스 편집)":     ["seedream-4-5-251128", "seedream-4-5"],
  "Seedream 4.0":                   ["seedream-4-0-250828", "seedream-4-0"],
  "Seedream 4.0 (레퍼런스 편집)":     ["seedream-4-0-250828", "seedream-4-0"],
  "Seedream 3.0":                   ["seedream-3-0-t2i-250415", "seedream-3-0-t2i"],
  "SeedEdit 3.0 (레퍼런스 편집)":     ["seededit-3-0-i2i-250628", "seededit-3-0-i2i"]
};
/* 이 모델에 시도할 ID 후보들(우선순위 순). 직접입력·환경변수가 있으면 그것만 사용. */
export function seedreamModelIds(b, env) {
  const custom = b && typeof b.seedreamModel === "string" && b.seedreamModel.trim();
  if (custom) return [custom];                     // 노드에서 직접 입력한 모델 ID 최우선
  const override = env && pick(env, ["SEEDREAM_MODEL_ID", "seedream_model_id"]);
  if (override) return [override];
  return SEEDREAM_IDS[b && b.model] || ["seedream-4-0-250828"];
}
export function seedreamModelId(b, env) { return seedreamModelIds(b, env)[0]; }
/* "이 모델 ID 자체가 없다"는 응답인지 판별 → 다음 후보로 재시도할 조건 */
/* "이 모델 ID 가 없다/안 열렸다" 인지 판정. 다음 후보 ID 로 넘어갈지, 그리고 진단에서
   "미개통" 으로 표시할지가 이 함수 하나에 달려 있다.
   예전 정규식은 model 뒤 아무 데나 "invalid" 가 있으면 미개통으로 봤다. 그래서
   "the model ... has invalid parameters" 같은 '파라미터 오류'까지 미개통으로 뭉개져,
   실제로는 개통돼 있는데 "미개통" 이라고 잘못 보고됐다.
   → 제공사가 쓰는 명시적 코드와 문구만 인정한다. */
export function seedreamModelMissing(status, j) {
  const code = String((j && j.error && j.error.code) || "").toLowerCase();
  const msg  = String((j && j.error && j.error.message) || "").toLowerCase();
  if (/modelnotfound|modelnotopen|invalidendpointormodel|endpointisinvalid|notfound/.test(code)) return true;
  if (/model .*(does not exist|not exist|not found|is not available|unavailable|not activated|not enabled)/.test(msg)) return true;
  if (/(unknown|unsupported) model|no such model/.test(msg)) return true;
  // 404 인데 위 문구가 없더라도 경로/모델 문제로 보고 다음 후보를 시도한다.
  return status === 404;
}
// 비율 → ModelArk 이미지 크기(WxH, 각 변 512~2048). 기본 16:9.
const SEEDREAM_SIZES = {
  "16:9": "2048x1152", "9:16": "1152x2048", "1:1": "2048x2048",
  "4:5": "1632x2048",  "5:4": "2048x1632",  "4:3": "2048x1536",
  "3:4": "1536x2048",  "3:2": "2048x1360",  "2:3": "1360x2048"
};
// Seedream 4.5/5.0 는 최소 3,686,400px(2560x1440급) 이상을 요구(작으면 400) → 비율 유지한 채 픽셀 수를 끌어올린다.
function seedreamMinSize(size, modelId) {
  if (!/seedream-(4-5|5-0)/.test(String(modelId || ""))) return size;
  const m = /^(\d+)x(\d+)$/.exec(size || ""); if (!m) return "2048x2048";
  let w = +m[1], h = +m[2]; const MIN = 3686400;
  if (w * h < MIN) { const s = Math.sqrt(MIN / (w * h)) * 1.03; w = Math.round(w * s); h = Math.round(h * s); }
  return w + "x" + h;
}
export function buildSeedreamPayload(b, env, modelOverride) {
  const model = modelOverride || seedreamModelId(b, env);
  const size = seedreamMinSize(SEEDREAM_SIZES[b && b.ratio] || "2048x1152", model);
  const body = {
    model,
    prompt: cut(b && b.prompt, 1500),
    size,
    response_format: "url",
    watermark: b && b.watermark === true    // 기본 워터마크 없음
  };
  // 레퍼런스 편집(i2i) — 레퍼런스 이미지가 있으면 image 필드로 첨부.
  //  · 4.x / 5.0: 다중 레퍼런스 배열 (5.0 Pro 최대 10장, 5.0 Lite·4.x 최대 14장)
  //  · Seedream 3.0 / SeedEdit 3.0: 단일 이미지만
  const refs = [];
  const seen = {};
  const push = (v) => { if (v && !seen[v] && (seen[v] = 1)) refs.push(v); };
  if (Array.isArray(b && b.refImages)) b.refImages.forEach(push);
  push(b && b.firstFrame); push(b && b.refImage);
  const isPro5 = /seedream-5-0-pro/.test(model);
  const multi = /seedream-(4|5)/.test(model);       // 4.x·5.x 계열만 다중 레퍼런스
  if (refs.length) {
    body.image = multi ? refs.slice(0, isPro5 ? 10 : 14) : refs[0];
  }
  // 여러 장 연속생성 방지(1장만). 단, 5.0 Pro 는 이 파라미터를 지원하지 않아 보내면 거부됨.
  if (multi && !isPro5) body.sequential_image_generation = "disabled";
  return body;
}

/* ── Flux (Black Forest Labs) 이미지 생성 ── */
const FLUX_BASE = "https://api.bfl.ai/v1/";
/* BFL 엔드포인트 표.
   · flux-pro(FLUX.1 [pro] 1.0)는 BFL 이 공식 폐지한 엔드포인트다 → 403 Forbidden.
     대체는 flux-pro-1.1 · flux-kontext-pro 이고 둘 다 이미 아래에 있다.
   · flux-2-dev 는 BFL API 에 없는 이름이다. FLUX.2 [dev]는 가중치를 받아 직접 돌리는
     오픈웨이트 배포판이라 API 로는 서비스되지 않는다. API 로 제공되는 FLUX.2 는
     pro · max · flex 세 가지다 → pro·max 를 후보로 넣어 probe-all 로 확인한다. */
export const FLUX_ENDPOINTS = {
  "Flux 2 Max":         "flux-2-max",
  "Flux 2 Pro":         "flux-2-pro",
  "Flux 2 Flex":        "flux-2-flex",
  "Flux 1.1 Pro Ultra": "flux-pro-1.1-ultra",
  "Flux 1.1 Pro":       "flux-pro-1.1",
  "Flux Pro":           "flux-pro",   // BFL 공식 폐지 — 403. 진단에 드러나도록 표에는 남겨 둔다.
  "Flux Dev":           "flux-dev",
  // 레퍼런스 이미지를 넣어 편집/재생성(image-to-image)
  "Flux Kontext Max (레퍼런스 편집)": "flux-kontext-max",
  "Flux Kontext Pro (레퍼런스 편집)": "flux-kontext-pro"
};
/* width/height 로 크기를 지정하는 Flux 모델용 치수표.
   ── 제공사가 직접 알려 준 제약(diag=flux-check 로 확인) ──
     · flux-pro-1.1 · flux-dev  : width·height 가 32의 배수여야 한다(multiple_of 32)
     · flux-2-max/pro/flex      : 64 이상이기만 하면 된다(32배수·상한 제약 없음)
   두 집합을 모두 만족하려면 32의 배수를 쓰면 된다.

   16:9 가 1344x768 이었는데 이 값은 1.750, 즉 실제로는 7:4 다(16:9 = 1.7778).
   비율을 "16:9" 라고 표시해 놓고 다른 비율을 내보내고 있었다 — 768 높이에서 12px 어긋난다.
   32의 배수이면서 정확히 16:9 인 조합은 1024x576(화소 43% 손실)이나 1536x864(1.x 상한 초과)
   뿐이라 둘 다 대가가 크다. 대신 오차가 가장 작은 32배수 조합을 골랐다:
     1312x736 = 1.7826 → 오차 0.27% (기존 1.56% 의 1/6). 화소는 0.97MP 로 거의 그대로.
   1:1(1024x1024)·4:5(896x1120)은 원래 정확했으므로 그대로 둔다. */
const FLUX_DIMS = { "16:9":[1312,736], "9:16":[736,1312], "1:1":[1024,1024], "4:5":[896,1120] };
/* FLUX.2 전용 치수. diag=flux-check 로 확정했다 — flux-2-max/pro/flex 는 하한 64 뿐이고
   32배수 제약도 상한도 없다(1000·99999 를 넣어도 width/height 오류가 나지 않았다).
   그래서 1.x 때문에 감수했던 0.27% 오차를 여기서는 감수할 이유가 없다.
     1344x756 = 정확히 16:9, 1.016MP — 32배수 조합(1312x736)보다 화소도 조금 많다.
   1:1·4:5 는 32배수 조합이 이미 정확해 그대로 쓴다. */
const FLUX2_DIMS = { "16:9":[1344,756], "9:16":[756,1344], "1:1":[1024,1024], "4:5":[896,1120] };
const fluxDims = (ep, ratio) => {
  const t = /^flux-2-/.test(String(ep)) ? FLUX2_DIMS : FLUX_DIMS;
  return t[ratio] || t["16:9"];
};
export function buildFluxPayload(b) {
  let ep = FLUX_ENDPOINTS[b.model] || "flux-pro-1.1";
  const prompt = cut(b.prompt, 1000);
  const ref = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  const stripB64 = (v) => v ? String(v).replace(/^data:image\/[^;]+;base64,/, "") : null;

  // ── Flux Kontext: 레퍼런스 이미지 + 프롬프트 → 편집/재생성 (컨트롤넷/로라와 별개) ──
  if (/kontext/.test(ep)) {
    const img = stripB64(ref);
    const body = { prompt, aspect_ratio: b.ratio || "16:9", output_format: "png",
                   safety_tolerance: img ? 2 : 6 };   // input_image 있으면 tolerance 최대 2
    if (img) body.input_image = img;
    return { endpoint: ep, body };
  }

  /* 레퍼런스 이미지 — Kontext 가 아닌 Flux 모델도 레퍼런스를 받는다.
     · FLUX.2 (flex·dev): input_image, input_image_2 … input_image_8 (API 최대 8장)
     · FLUX 1.x (ultra·pro·dev): image_prompt(base64) + image_prompt_strength
     예전엔 Kontext 외에는 레퍼런스를 통째로 버렸다 — 노드는 1장을 받아 요금까지 가산하는데
     실제 요청에는 실리지 않아 "레퍼런스가 무시된다" 로 보였다. */
  const isFlux2 = /^flux-2-/.test(ep);
  const allRefs = (() => {
    const out = [], seen = {};
    const push = (v) => { const s = stripB64(v); if (s && !seen[s] && (seen[s] = 1)) out.push(s); };
    if (Array.isArray(b.refImages)) b.refImages.forEach(push);
    push(b.firstFrame); push(b.refImage);
    return out;
  })();
  //  1.x 의 image_prompt 는 기본 강도가 0.1 로 매우 약해, 붙여도 반영이 거의 안 보인다.
  //  레퍼런스를 "일부러 연결한" 경우이므로 중간 강도로 올려 실제로 구도·스타일이 반영되게 한다.
  const IMG_PROMPT_STRENGTH = 0.5;
  const withRefs = (body) => {
    if (!allRefs.length) return body;
    if (isFlux2) {
      allRefs.slice(0, 8).forEach((v, i) => { body[i === 0 ? "input_image" : "input_image_" + (i + 1)] = v; });
    } else {
      body.image_prompt = allRefs[0];
      body.image_prompt_strength = IMG_PROMPT_STRENGTH;
    }
    return body;
  };

  const cn = String(b.controlnet || "").toLowerCase();          // '', 'canny', 'depth'
  const loraId = String(b.lora || "").trim();                    // BFL finetune_id
  const loraStrength = Math.max(0, Math.min(2, Number(b.loraStrength) || 1.1));
  const ctrlImg = stripB64(ref);

  // ── ControlNet (Canny 윤곽선 / Depth 깊이): 레퍼런스 이미지를 구조 가이드로 사용 ──
  if ((cn === "canny" || cn === "depth") && ctrlImg) {
    const isCanny = cn === "canny";
    ep = isCanny ? "flux-pro-1.0-canny" : "flux-pro-1.0-depth";
    const body = { prompt, control_image: ctrlImg, output_format: "png",
                   steps: 50, guidance: isCanny ? 30 : 15, safety_tolerance: 6 };
    if (isCanny) { body.canny_low_threshold = 50; body.canny_high_threshold = 200; }
    if (loraId) { ep += "-finetuned"; body.finetune_id = loraId; body.finetune_strength = loraStrength; }
    return { endpoint: ep, body };
  }

  // ── LoRA (BFL finetune): 컨트롤넷 없이 순수 생성 ──
  if (loraId) {
    if (ep === "flux-pro-1.1-ultra")
      return { endpoint: "flux-pro-1.1-ultra-finetuned",
               body: withRefs({ prompt, aspect_ratio: b.ratio || "16:9", output_format: "png",
                       safety_tolerance: 6, finetune_id: loraId, finetune_strength: loraStrength }) };
    const [w, h] = fluxDims(ep, b.ratio);
    return { endpoint: "flux-pro-finetuned",
             body: withRefs({ prompt, width: w, height: h, output_format: "png",
                     safety_tolerance: 6, finetune_id: loraId, finetune_strength: loraStrength }) };
  }

  // ── 기본 ──
  if (ep === "flux-pro-1.1-ultra")
    return { endpoint: ep, body: withRefs({ prompt, aspect_ratio: b.ratio || "16:9",
             output_format: "png", safety_tolerance: 6 }) };
  const [w, h] = fluxDims(ep, b.ratio);
  return { endpoint: ep, body: withRefs({ prompt, width: w, height: h,
           output_format: "png", safety_tolerance: 6 }) };
}

/* ── fal.ai Flux ControlNet (Canny / Depth / Pose) — 컴피UI식 ControlNet ──
   fal 이 전처리(윤곽/깊이/포즈 맵 추출)를 서버에서 대신 해주므로 원본 이미지만 넘기면 됨.
   Canny/Depth = 전용 control-lora 엔드포인트, Pose = flux-general + Union(openpose, control_mode 4). */
const FAL_QUEUE = "https://queue.fal.run/";
/* ══ 중개(fal.ai) 사용 허가 목록 — 여기 없는 기능은 fal 로 나갈 수 없다 ══
   원칙: 제공사 공식 API 를 연동해 둔 모델은 예외 없이 그 공식 API 로만 나간다.
   같은 모델을 중개로 부르면 ①공식 기준으로 만든 단가표와 실제 청구가 어긋나고
   ②제공사 쪽 사용 이력이 갈라진다.
   아래는 "그 모델의 제공사 API 가 아예 없어서 fal 로만 되는" 기능들이다 —
   Wan(모션 전이)·Topaz(업스케일)·sync-lipsync(립싱크/목소리교체)·
   ffmpeg 병합(나레이션)·stable-audio(음악)·FLUX.1-dev+ControlNet Union.
   씨댄스·씨드림·3D·클링·루마·Veo·런웨이·미니맥스·BFL·GPT·Grok 은 절대 들어오면 안 된다.
   새 기능을 fal 로 붙이려면 이 목록에 이름을 넣어야 하고, 그때 위 원칙을 다시 따져야 한다. */
const FAL_ALLOWED = new Set(["motion", "upscale", "narrate", "lipsync", "revoice", "music", "falcontrol", "falq", "v2v_auto"]);
/* 공식 API 를 연동해 둔 제공사 — 이 이름으로는 fal 호출이 불가능하다(아래 falFetch 가 던진다) */
const OFFICIAL_ONLY = new Set(["seedance", "seedream", "ark3d", "promptgen", "kling", "klingextend",
                               "luma", "google", "nanobanana", "runway", "runway_aleph", "hailuo",
                               "flux", "openai", "xai"]);
/* fal 로 나가는 모든 요청은 이 함수를 거친다. 허가 목록 밖이면 호출 자체가 막힌다.
   (예전엔 클링·씨댄스가 fal 로 새는 코드가 실제로 있었다 — 지우는 것만으로는 또 들어온다.) */
function falFetch(routeName, url, init, timeoutMs) {
  if (OFFICIAL_ONLY.has(routeName))
    throw new Error("라우팅 위반: " + routeName + " 은(는) 공식 API 로만 나가야 합니다. fal 경유 금지.");
  if (!FAL_ALLOWED.has(routeName))
    throw new Error("라우팅 위반: " + routeName + " 은(는) fal 사용 허가 목록에 없습니다.");
  return fetchT(url, init, timeoutMs);
}
const FAL_IMG_SIZE = { "1:1": "square_hd", "16:9": "landscape_16_9", "9:16": "portrait_16_9", "4:5": "portrait_4_3" };

/* Kling 은 공식 오픈플랫폼 API 만 사용한다.
   예전엔 fal.ai 경유 엔드포인트 표(KLING_FAL)와 그 페이로드 빌더를 두고 공식 키가 없을 때
   폴백했는데, 같은 모델을 중개로 부르면 요금이 우리 단가표(공식 기준)와 달라지고
   제공사 쪽 사용 이력도 갈라진다. 표·빌더째로 지워 다시 배선되지 않게 했다. */
// 원본 프레임(영상 브리지)이 있으면 텍스트→영상이라도 이미지→영상으로 강제 (V2V 브리지)
function hasSrcFrame(b) { return !!(b && (b.firstFrame || b.refImage || b.image_url)); }

/* ── Kling 공식 오픈플랫폼 API (직접 호출) — 환경변수 KLING_* 만 넣으면 우선 사용 ──
   AccessKey/SecretKey(JWT HS256) 방식 또는 단일 토큰(KLING_API_KEY) 방식 모두 지원. */
function klingCreds(env) {
  const ak = pick(env, ["KLING_ACCESS_KEY", "Kling_AccessKey", "KLING_AK", "KLINGAI_ACCESS_KEY", "kling_access_key"]);
  const sk = pick(env, ["KLING_SECRET_KEY", "Kling_SecretKey", "KLING_SK", "KLINGAI_SECRET_KEY", "kling_secret_key"]);
  const token = pick(env, ["KLING_API_KEY", "Kling_API_KEY", "KLINGAI_API_KEY", "KLING_JWT", "kling_api_key"]);
  const base = (pick(env, ["KLING_API_BASE", "Kling_API_BASE", "kling_api_base"]) || "https://api-singapore.klingai.com").replace(/\/+$/, "");
  if (ak && sk) return { mode: "aksk", ak, sk, base };
  if (token) return { mode: "token", token, base };
  return null;
}
function _b64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function _b64urlStr(str) { return _b64url(new TextEncoder().encode(str)); }
async function klingJWT(ak, sk) {
  const now = Math.floor(Date.now() / 1000);
  const data = _b64urlStr(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." +
               _b64urlStr(JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 }));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(sk), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return data + "." + _b64url(sig);
}
async function klingAuth(cr) {
  return "Bearer " + (cr.mode === "aksk" ? await klingJWT(cr.ak, cr.sk) : cr.token);
}
// 표시 이름 → 공식 API 스펙 (model_name / mode / 엔드포인트)
/* Kling 3.0 의 공식 model_name 은 v2 계열의 "-master" 표기와 다르다(kling-v3 계열).
   콘솔 표기가 갈릴 수 있어 후보를 순서대로 시도한다 — Seedance 와 같은 방식. */
export const KLING_ALT = { "kling-v3-master": ["kling-v3", "kling-v3-master", "kling-v3-std"] };
export const KLING_API = {
  "Kling 3.0 Pro (텍스트→영상)": { m: "kling-v3-master", mode: "pro", ep: "text2video" },
  "Kling 3.0 Pro (이미지→영상)": { m: "kling-v3-master", mode: "pro", ep: "image2video" },
  "Kling 3.0 Fast (텍스트→영상)": { m: "kling-v3-master", mode: "std", ep: "text2video" },
  "Kling 3.0 Fast (이미지→영상)": { m: "kling-v3-master", mode: "std", ep: "image2video" },
  "Kling 2.1 Master (텍스트→영상)": { m: "kling-v2-1-master", mode: "pro", ep: "text2video" },
  "Kling 2.1 Master (이미지→영상)": { m: "kling-v2-1-master", mode: "pro", ep: "image2video" },
  "Kling 2.0 Master (텍스트→영상)": { m: "kling-v2-master", mode: "pro", ep: "text2video" },
  "Kling 2.0 Master (이미지→영상)": { m: "kling-v2-master", mode: "pro", ep: "image2video" },
  "Kling 1.6 Pro (텍스트→영상)": { m: "kling-v1-6", mode: "pro", ep: "text2video" },
  "Kling 1.6 Pro (이미지→영상)": { m: "kling-v1-6", mode: "pro", ep: "image2video" },
  "Kling 1.6 Standard (이미지→영상)": { m: "kling-v1-6", mode: "std", ep: "image2video" },
  "Kling 2.0": { m: "kling-v2-master", mode: "pro", ep: "image2video" },
  "Kling 1.6": { m: "kling-v1-6", mode: "pro", ep: "image2video" },
};
export function klingApiSpec(b) {
  const base = KLING_API[b.model] || { m: "kling-v2-master", mode: "pro", ep: "text2video" };
  // 원본 프레임(영상 브리지)이 있으면 image2video 로 강제 → 어떤 클링 모델이든 V2V처럼 변환
  return { ...base, ep: hasSrcFrame(b) ? "image2video" : base.ep };
}
function _stripDataUri(v) { return v ? String(v).replace(/^data:[^,]+,/, "") : ""; }
export function buildKlingApiPayload(b, spec) {
  // Kling 공식 API 의 duration 은 text2video·image2video 모두 "5" 또는 "10" 두 값만 받는다.
  //  (한때 3.0 은 3~15 라고 보고 그대로 흘려보냈는데, 3·8·12·15 는 제공사가 거부한다.)
  const rawSec = Number(b.seconds) || 5;
  const dur = rawSec > 7 ? "10" : "5";
  const p = { model_name: spec.m, prompt: cut(b.prompt, 2500), mode: spec.mode, duration: dur };
  if (b.negative) p.negative_prompt = String(b.negative).slice(0, 2500);
  // 노드의 CFG 슬라이더는 0~100 인데 Kling 은 0~1 만 받는다.
  //  예전엔 0~1 만 통과시켜, 슬라이더 값(기본 70)이 매번 조용히 버려졌다 → 0~100 을 0~1 로 환산.
  const cfgRaw = Number(b.cfg);
  if (Number.isFinite(cfgRaw)) {
    const cfg = cfgRaw > 1 ? cfgRaw / 100 : cfgRaw;
    if (cfg >= 0 && cfg <= 1) p.cfg_scale = Math.round(cfg * 100) / 100;
  }
  if (spec.ep === "image2video") {
    const img = _stripDataUri(b.firstFrame || b.refImage || b.image_url);
    if (img) p.image = img;                       // URL 또는 순수 base64
    const tail = _stripDataUri(b.lastFrame);
    if (tail) p.image_tail = tail;
  } else {
    p.aspect_ratio = (b.ratio || "16:9");
  }
  return p;
}

/* ── 모션 전이(Motion Transfer) 레이어 — 힉스필드식 ──
   레퍼런스 영상 전체를 fal의 video-to-video 모델에 넣어 원본의 움직임(리듬·제스처·카메라 무빙)을
   유지한 채 프롬프트 스타일로 변환. base 모델과 무관하게 공통으로 작동한다.
   실제 fal 엔드포인트는 환경변수로 지정(모델 교체 자유). 기본값은 Wan V2V. */
function falV2VModel(env) {
  return pick(env, ["FAL_V2V_MODEL", "V2V_FAL_MODEL", "FAL_MOTION_MODEL", "fal_v2v_model"]) || "fal-ai/wan-vace-14b";
}
export function buildMotionPayload(b) {
  const p = {
    prompt: cut(b.prompt, 2500),
    video_url: b.srcVideo || null,
  };
  if (b.negative) p.negative_prompt = String(b.negative).slice(0, 2000);
  // 외형 레퍼런스 — VACE 는 ref_image_url 로 "적용할 외형"을 받는다. 이걸 안 보내면
  //  노드의 이미지 레퍼런스 포트가 열려 있어도 실제로는 아무 영향이 없다.
  //  fal 이 직접 가져가므로 공개 URL 만 유효(base64 불가).
  const refImg = [b.firstFrame, (b.refImages && b.refImages[0]), b.refImage]
    .find((v) => v && /^https?:\/\//.test(String(v)));
  if (refImg) p.ref_image_url = String(refImg);
  // 스타일 반영 강도(0=원본 최대 보존, 1=스타일 최대) — 모델이 지원하면 사용
  const st = Number(b.v2vStrength);
  if (Number.isFinite(st)) p.strength = Math.max(0, Math.min(1, st));
  if (b.ratio) p.aspect_ratio = b.ratio;
  return p;
}

const FAL_UNION_PATH = "Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro";
const FAL_UNION_MODE = { canny: 0, tile: 1, depth: 2, blur: 3, pose: 4, gray: 5 };   // Union-Pro control_mode
const _cl = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
/* fal ControlNet — flux-general + ControlNet Union 으로 통일.
   다중 스택(b.controlnets 배열) + 타입별 강도/start·end % 지원. (컴피UI식) */
export function buildFalControlPayload(b) {
  const prompt = cut(b.prompt, 1500);
  const ref = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;   // 컨트롤 이미지(base64 data URI 또는 URL)
  const steps = Math.max(4, Math.min(50, Math.round(Number(b.cnSteps) || 28)));         // 샘플링 스텝(품질/속도)
  const guidance = _cl(b.cnGuidance, 1, 10, 3.5);                                        // 프롬프트 반영 강도(CFG)
  const size = FAL_IMG_SIZE[b.ratio] || "square_hd";
  // 다중 스택: b.controlnets 배열이 우선, 없으면 단일 b.controlnet 로 폴백(하위호환)
  let list = Array.isArray(b.controlnets) && b.controlnets.length ? b.controlnets
           : (b.controlnet ? [{ type: b.controlnet, strength: b.loraStrength, start: b.cnStart, end: b.cnEnd }] : []);
  const controlnets = list
    .filter(c => FAL_UNION_MODE[String(c.type || "").toLowerCase()] != null)
    .slice(0, 3)   // 최대 3스택
    .map(c => ({
      path: FAL_UNION_PATH,
      control_image_url: c.control_image_url || ref,
      control_mode: FAL_UNION_MODE[String(c.type).toLowerCase()],
      conditioning_scale: _cl(c.strength, 0.05, 2, 1),
      start_percentage: _cl(c.start, 0, 1, 0),
      end_percentage: _cl(c.end, 0, 1, 1)
    }));
  const body = { prompt, image_size: size, num_inference_steps: steps, guidance_scale: guidance,
                 num_images: 1, output_format: "png", enable_safety_checker: true, controlnets };
  const seedN = Number(b.seed);
  if (Number.isFinite(seedN) && seedN >= 0) body.seed = Math.floor(seedN) % 2147483647;   // 시드 고정(재현)
  return { model: "fal-ai/flux-general", body };
}

/* ── Nano Banana (Gemini 2.5 Flash Image) — 텍스트/이미지→이미지 ──
   Vertex(서비스계정) 우선, 없으면 AI Studio 키. role:"user" 필수(Vertex). */
const NANO_MODEL = "gemini-2.5-flash-image";

/* http(s) 이미지 URL → data:URI(base64). 실패/비이미지/과대(6MB↑)면 null. */
async function urlToDataUri(u) {
  try {
    const r = await fetchT(u, {}, 15000);
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "image/png").split(";")[0];
    if (!/^image\//.test(ct)) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (!buf.length || buf.length > 6 * 1024 * 1024) return null;
    let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return "data:" + ct + ";base64," + btoa(bin);
  } catch { return null; }
}
/* 다중 레퍼런스 이미지 수집(최대 max장) → data:URI 배열. URL 은 base64 로 변환. */
async function collectRefDataUris(b, max) {
  max = max || 12;
  const raw = [];
  if (b.firstFrame) raw.push(b.firstFrame);
  if (Array.isArray(b.refImages)) for (const u of b.refImages) raw.push(u);
  if (b.refImage) raw.push(b.refImage);
  const out = [], seen = {};
  for (const u of raw) {
    if (!u || seen[u]) continue; seen[u] = 1;
    if (/^data:image\//i.test(u)) out.push(u);
    else if (/^https?:\/\//i.test(u)) { const d = await urlToDataUri(u); if (d) out.push(d); }
    if (out.length >= max) break;
  }
  return out;
}

/* gemini-2.5-flash-image(나노바나나)가 generationConfig.imageConfig.aspectRatio 로 받는 비율.
   문서상 지원 목록 — 이 밖의 값은 필드로 보내지 않고 프롬프트 힌트만 남긴다. */
const NANO_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
export function buildNanoPayload(b) {
  const ratio = String(b.ratio || "").trim();
  // 비율은 ①필드(imageConfig.aspectRatio) ②프롬프트 힌트 둘 다로 전달 —
  //  구버전 엔드포인트가 필드를 무시하거나(400 시 재시도) 해도 구도가 반영되도록.
  const prompt = cut(withRatioHint((b.prompt || ""), ratio), 2000);
  const parts = [{ text: prompt }];
  // _refs(핸들러가 준비한 data:URI 배열)가 있으면 전부 인라인, 없으면 단일 폴백
  const refs = Array.isArray(b._refs) && b._refs.length ? b._refs
    : (function () { const r = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage; return r ? [r] : []; })();
  for (const ref of refs) {
    const m = /^data:(image\/[^;]+);base64,(.+)$/.exec(String(ref));
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  const out = { contents: [{ role: "user", parts }] };
  if (NANO_RATIOS.indexOf(ratio) >= 0) out.generationConfig = { imageConfig: { aspectRatio: ratio } };
  return out;
}
// imageConfig 를 모르는 엔드포인트(400 INVALID_ARGUMENT)에 대비한 폴백 페이로드
function nanoPayloadNoRatio(p) {
  const c = JSON.parse(p); delete c.generationConfig; return JSON.stringify(c);
}

/* ── OpenAI 이미지 생성 (gpt-image-1) — 텍스트→이미지, 레퍼런스 있으면 편집(images/edits) ──
   Cloudflare egress 가 OpenAI 지역차단(403 unsupported country) 되는 문제 → 미국 릴레이 경유.
   OPENAI_RELAY_URL 설정 시 그 베이스로, 없으면 api.openai.com 직접(차단될 수 있음). */
/* GPT Image 가 받는 사이즈는 1024x1024 · 1536x1024 · 1024x1536 뿐이다(= 1:1 · 3:2 · 2:3).
   노드 선택지를 그 셋으로 바꿀 때 이 표를 같이 고치지 않아, 3:2·2:3 을 골라도 키가 없어
   1024x1024 로 떨어졌다 — 세 선택지가 전부 정사각형으로 나왔다.
   16:9·9:16·4:5 는 예전 표기 호환으로 가장 가까운 가로/세로 사이즈에 매핑해 둔다. */
const OPENAI_SIZE = { "1:1": "1024x1024",
                      "3:2": "1536x1024", "2:3": "1024x1536",
                      "16:9": "1536x1024", "9:16": "1024x1536", "4:5": "1024x1536",
                      "4:3": "1536x1024", "3:4": "1024x1536" };
function openaiBase(env) {
  return (pick(env, ["OPENAI_RELAY_URL", "openai_relay_url"]) || "https://api.openai.com").replace(/\/+$/, "");
}
// 표시명 → OpenAI 이미지 모델 ID (DALL·E 는 2026-05 폐지되어 제외)
export const OPENAI_IMG_ID = {
  "GPT Image 2": "gpt-image-2", "GPT Image 1.5": "gpt-image-1.5",
  "GPT Image": "gpt-image-1", "GPT Image Mini": "gpt-image-1-mini"
};
export function buildOpenAIImagePayload(b) {
  /* quality 를 안 보내면 OpenAI 기본값이 적용되는데, 그 값이 문서에 명시돼 있지 않다.
     같은 모델·같은 크기라도 low/medium/high 원가가 $0.011 / $0.042 / $0.167 로 15배 차이라
     원가가 비결정적이면 정확한 과금 자체가 불가능하다. 단가표가 잡고 있는 medium 으로 고정한다. */
  return { model: OPENAI_IMG_ID[b.model] || "gpt-image-1", prompt: cut(b.prompt, 4000),
           size: OPENAI_SIZE[b.ratio] || "1024x1024", quality: "medium", n: 1 };
}

/* ── Hailuo (MiniMax) 영상 생성 ── */
const HAILUO_BASE = "https://api.minimax.io/v1";
export const HAILUO_IDS = {
  "MiniMax Hailuo 02":        "MiniMax-Hailuo-02",
  "MiniMax T2V-01 Director":  "T2V-01-Director",
  "MiniMax I2V-01 Director":  "I2V-01-Director",
  "Hailuo MiniMax":           "MiniMax-Hailuo-02"   // 구버전 표시명 호환
};
export function buildHailuoPayload(b) {
  const first = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  // T2V-01 Director 는 이미지를 받지 않는다. 첫 프레임(이어보기)이 있으면 같은 계열의
  // I2V-01 Director 로 바꿔 준다 — 그대로 보내면 제공사가 거부해 요청이 통째로 실패한다.
  let mid = HAILUO_IDS[b.model] || "MiniMax-Hailuo-02";
  if (first && mid === "T2V-01-Director") mid = "I2V-01-Director";
  const p = { model: mid, prompt: cut(withRatioHint(b.prompt || "", b.ratio), 2000) };
  if (first) p.first_frame_image = first;
  // 끝 프레임(시작~끝 보간) — 공식 문서상 MiniMax-Hailuo-02 계열만 지원한다.
  //  Director(01) 계열은 6초 고정 구형 모델이라 대상에서 제외한다.
  if (first && b.lastFrame && /Hailuo-02/i.test(mid)) p.last_frame_image = b.lastFrame;
  // T2V-01 / I2V-01 Director 계열은 6초 고정 모델이다. 10초를 보내면 제공사가 거부한다.
  //  (스튜디오는 6초만 노출하지만, /api/v1/generate·MCP 는 임의 값을 보낼 수 있다.)
  const only6 = /Director|T2V-01|I2V-01/i.test(String(b.model || "")) || /01-Director/i.test(p.model);
  p.duration = only6 ? 6 : ((Number(b.seconds) || 6) <= 6 ? 6 : 10);
  // Hailuo 02 는 1080P 에서 6초만 지원한다 — 10초는 768P/512P 에서만 된다.
  //  해상도를 1080P 로 고정해 두면 10초 선택이 무효 조합이 되어 거절당한다.
  p.resolution = p.duration > 6 ? "768P" : "1080P";
  return p;
}

/* ── Luma Dream Machine 영상 생성 ── */
const LUMA_BASE = "https://agents.lumalabs.ai/v1";   // Luma Agents API (구 dream-machine/v1 은 이 키를 인증하지 않는다)

/* ══ BytePlus ModelArk 3D 생성 (Hyper3D / Hitem3D) ══
   이미지·영상 모델과 달리 "실제 3D 파일(메쉬+텍스처)" 을 만든다.

   요청 형식 — 회원이 콘솔에서 가져온 실제 예시로 확정됐다.
     POST /contents/generations/tasks
     { model, content: [{ type:"text", text:"<프롬프트> --옵션 값 --옵션 값 …" }] }
   씨댄스 1.x 와 같은 "프롬프트 뒤에 지시어를 붙이는" 방식이다.
   (앞서 text 를 비워 보낸 진단이 InvalidParameter 로 실패했던 건 이미지가 필수라서가
    아니라 프롬프트 자체가 비어 있었기 때문이다 — 텍스트만으로 생성된다.)

   옵션(콘솔 예시에 나온 것 그대로. Hyper3D/Rodin 계열 파라미터다)
     --mesh_mode        Quad=사각형 위주 토폴로지(리깅·애니메이션에 유리) / Raw=원본 삼각형 메쉬
     --hd_texture       고해상도 텍스처
     --material         PBR=물리기반(금속·거칠기 맵 포함) / Shaded=단순 셰이딩
     --addons           HighPack 등 부가 산출물 묶음
     --quality_override 목표 폴리곤 수
     --use_original_alpha  입력 이미지의 알파(투명) 채널 사용 여부
     --bbox_condition   [x,y,z] 바운딩 박스 비율 — 물체의 가로세로높이 비를 강제
     --TAPose           캐릭터를 T/A 포즈로 세운다(리깅용) */
export const ARK3D_IDS = {
  "Hyper3D Gen-2 (3D 생성)": ["hyper3d-gen2-260112", "hyper3d-gen2"],
  // 실제 ID 는 probe-all 의 계정 카탈로그 조회에서 확인했다(hitem3d-2-0-251223).
  //  접미사 없는 형태를 앞에 두면 404 두 번을 왕복한 뒤에야 성공한다 — 확인된 ID 를 먼저 쓴다.
  "Hitem3D 2.0 (3D 생성)":   ["hitem3d-2-0-251223", "hitem3d-2-0", "hitem3d-20"],
};
const ARK3D_MESH = { "Quad": "Quad", "Raw": "Raw" };
const ARK3D_MAT  = { "PBR": "PBR", "Shaded": "Shaded" };
export function ark3dModelIds(b, env) {
  const custom = b && typeof b.ark3dModel === "string" && b.ark3dModel.trim();
  if (custom) return [custom];
  const override = env && pick(env, ["ARK3D_MODEL_ID", "ark3d_model_id"]);
  if (override) return [override];
  return ARK3D_IDS[b && b.model] || ARK3D_IDS["Hyper3D Gen-2 (3D 생성)"];
}
/* 응답 어디에 결과가 있든 찾아낸다 — 필드 이름을 미리 알 필요가 없게.
   처음엔 model_url·file_url 같은 이름 후보를 훑었는데, 그건 내 추측이라
   제공사가 다른 이름을 쓰면 결과가 있는데도 "못 찾음" 으로 실패했다.
   (그걸 확인하려고 유료 생성을 1회 돌릴 참이었다 — 그럴 필요가 없다.)
   대신 응답 전체를 훑어 http(s) URL 을 전부 모으고, 3D 파일 확장자 → 키 이름 →
   등장 순서로 골라 준다. 고른 근거와 후보 전체를 함께 돌려줘 판단을 가릴 수 없게 한다. */
const MESH_EXT = /\.(glb|gltf|obj|fbx|usdz|usd|ply|stl|zip|3mf|blend)(\?|#|$)/i;
export function findResultUrls(node, path, out) {
  out = out || []; path = path || "";
  if (node == null) return out;
  if (typeof node === "string") {
    if (/^https?:\/\//i.test(node)) out.push({ url: node, key: path });
    return out;
  }
  if (Array.isArray(node)) { node.forEach((v, i) => findResultUrls(v, path + "[" + i + "]", out)); return out; }
  if (typeof node === "object") {
    for (const kk of Object.keys(node)) findResultUrls(node[kk], path ? path + "." + kk : kk, out);
  }
  return out;
}
export function pickMeshUrl(resp) {
  const all = findResultUrls(resp);
  if (!all.length) return null;
  const byExt = all.find(x => MESH_EXT.test(x.url));
  if (byExt) return { ...byExt, 근거: "3D 파일 확장자" };
  const byKey = all.find(x => /(model|mesh|glb|gltf|asset|file|download|result|output)/i.test(x.key));
  if (byKey) return { ...byKey, 근거: "필드 이름" };
  return { ...all[0], 근거: "응답에서 처음 발견된 URL" };
}
export function buildArk3dPayload(b, env, forceModel) {
  const model = forceModel || ark3dModelIds(b, env)[0];
  // 지시어는 프롬프트 뒤에 붙는다 → cut() 으로 잘려 나가지 않도록 프롬프트만 먼저 줄인다.
  const flags = [];
  const push = (k2, v) => { if (v !== undefined && v !== null && v !== "") flags.push("--" + k2 + " " + v); };
  push("mesh_mode", ARK3D_MESH[String(b.meshMode || "").trim()] || "Raw");
  push("hd_texture", b.hdTexture === false ? "false" : "true");
  push("material", ARK3D_MAT[String(b.material || "").trim()] || "PBR");
  if (b.addons) push("addons", String(b.addons).trim());
  const q = Number(b.quality);
  if (Number.isFinite(q) && q > 0) push("quality_override", Math.round(q));
  push("use_original_alpha", b.useAlpha === true ? "true" : "false");
  // bbox 는 [x,y,z] 형태. 세 값이 다 있을 때만 보낸다(부분값은 제공사가 반려한다).
  const bx = [b.bboxX, b.bboxY, b.bboxZ].map(Number);
  if (bx.every(v => Number.isFinite(v) && v > 0)) push("bbox_condition", "[" + bx.map(Math.round).join(",") + "]");
  push("TAPose", b.taPose === true ? "true" : "false");
  // 노드에서 직접 넣은 추가 지시어(우리가 아직 모르는 옵션을 쓰고 싶을 때)
  const extra = String(b.ark3dFlags || "").trim();
  if (extra) flags.push(extra);
  const tail = flags.length ? " " + flags.join(" ") : "";
  const prompt = cut(String(b.prompt || "").trim(), 1800) + tail;
  const content = [{ type: "text", text: prompt }];
  // 레퍼런스 이미지 — 씨댄스와 같은 봉투를 쓰므로 image_url 도 같은 형식일 가능성이 크지만
  //  아직 확인되지 않았다. 이미지를 실제로 연결한 경우에만 붙인다(텍스트 전용 경로는 확정됐다).
  const refs = [];
  const pushImg = (v) => { if (v && String(v).trim()) refs.push(String(v).trim()); };
  if (Array.isArray(b.refImages)) b.refImages.forEach(pushImg);
  pushImg(b.firstFrame); pushImg(b.refImage);
  refs.slice(0, 4).forEach((url) => content.push({ type: "image_url", image_url: { url } }));
  return { model, content };
}

/* ── 루마: 키가 "있는가" 가 아니라 "통하는가" 를 본다 ──
   예전엔 health 가 !!k.luma 로만 답했다. 그런데 키는 설정돼 있는데 루마가 모든 요청을
   403 "Not authenticated" 로 거부하는 상태였다(헤더 표기법 4가지를 모두 시도해 확인).
   그 결과 스튜디오에 루마 모델이 계속 보였고, 회원이 고르면 선차감 → 생성 실패 → 환불이
   반복된다. 그래서 읽기 전용 목록 조회로 실제 통용 여부를 확인한다.
     · 401/403(자격증명 명시적 거부)일 때만 "사용 불가" 로 본다
     · 5xx·타임아웃은 일시 장애일 수 있으므로 사용 가능으로 남겨 둔다(멀쩡한 제공사를 숨기지 않기 위함)
   10분 캐시라 부팅 지연이 없고, 키를 고치면 다음 만료 때 자동으로 되살아난다. */
let _lumaOk = { at: 0, ok: true };
async function lumaUsable(key) {
  if (!key) return false;
  const now = Date.now();
  if (_lumaOk.at && now - _lumaOk.at < 600000) return _lumaOk.ok;
  try {
    /* Agents API 의 /generations 는 POST 전용이라 GET 에는 405 가 온다 — 이건 "살아 있다" 는 뜻이다.
       그래서 401/403(자격증명 명시적 거부)일 때만 사용 불가로 본다. 405·404·5xx·타임아웃은
       사용 가능으로 남긴다(멀쩡한 제공사를 숨겨 회원이 못 고르게 되는 쪽이 더 나쁘다). */
    const r = await fetchT(LUMA_BASE + "/generations",
      { headers: { "Authorization": "Bearer " + key, "accept": "application/json" } }, 6000);
    _lumaOk = { at: now, ok: !(r.status === 401 || r.status === 403) };
  } catch (_e) { _lumaOk = { at: now, ok: true }; }
  return _lumaOk.ok;
}

/* ── 카메라 모션 프리셋 (힉스필드 DoP 스타일) ──
   프롬프트에 시네마틱 카메라 지시문을 주입한다. 모든 영상 모델(씨댄스·Kling·Veo·Runway 등)이
   프롬프트의 카메라 언어에 반응하므로 모델 무관하게 동작한다. b.camera 에 프리셋 이름을 넣으면 적용. */
export const CAMERA_PRESETS = {
  "크래시 줌":      "rapid crash zoom-in toward the subject, aggressive push-in, cinematic impact",
  "돌리 인":        "slow smooth dolly-in toward the subject, shallow depth of field, cinematic",
  "돌리 아웃":      "slow dolly-out revealing the scene, expanding composition, cinematic",
  "360 오빗":       "camera orbits 360 degrees around the subject, smooth circular tracking shot",
  "불릿타임":       "bullet-time effect, time nearly frozen while the camera sweeps around the subject",
  "FPV 드론":       "fast FPV drone shot weaving through the scene, dynamic first-person aerial movement",
  "핸드헬드":       "handheld camera with subtle natural shake, documentary realism",
  "크레인 업":      "crane shot rising upward, revealing the scene from above, majestic sweep",
  "로우앵글 트래킹": "low-angle tracking shot following the subject, dramatic perspective, ground-level speed",
  "슬로우 팬":      "slow horizontal pan across the scene, steady cinematic sweep"
};
export function applyCameraPreset(b) {
  const phrase = b && b.camera && CAMERA_PRESETS[String(b.camera).trim()];
  if (phrase) b.prompt = String(b.prompt || "").trim() + (b.prompt ? ", " : "") + phrase;
  return b;
}
/* ── Luma Agents API (문서: docs.agents.lumalabs.ai) ──
   그동안 우리는 구세대 Dream Machine API(api.lumalabs.ai/dream-machine/v1)에
   ray-2 계열을 보내고 있었다. 이 계정 키는 새 Agents API 용이라 인증부터 거부됐다
   (그 API 는 살아 있어서 403 을 주므로 "키가 잘못됐다" 로 보였고, 결제수단·프로젝트 ID
    같은 엉뚱한 원인을 세 번 짚었다. 결정적 증거는 새 주소에 GET 을 보냈을 때의 405 —
    404 도 403 도 아닌 405 는 "그 경로는 있고 POST 만 받는다" 는 뜻이다).

   확정된 규격
     기본 주소   https://agents.lumalabs.ai/v1
     인증        Authorization: Bearer <키>
     제출        POST /v1/generations
     폴링        GET  /v1/generations/{id}   → state: completed|failed, output[0].url
     이미지      { prompt, aspect_ratio }                      (기본 type=image, uni-1)
     영상        { model:"ray-3.2", type:"video", prompt, aspect_ratio,
                   video:{ resolution:"720p", duration:"5s", start_frame, end_frame } }
     이미지 편집 { type:"image_edit", prompt, source:{ url } } */
export const LUMA_IDS = {
  "Luma Ray 3.2":                 "ray-3.2",
  "Luma Ray 3.2 (영상 편집)":      "ray-3.2",
  "Luma Ray 3.2 (비율 변경)":      "ray-3.2",
  "Luma Uni 1":                   "uni-1",
  "Luma Uni 1 Max":               "uni-1-max",
  /* 예전 그래프 호환 — 지금 노드 목록에는 없지만 저장해 둔 워크플로우에는 남아 있을 수 있다.
     여기에 없으면 아래 기본값(uni-1)으로 떨어지는데, 그건 이미지 모델이다.
     즉 "영상을 만들라" 고 저장해 둔 그래프가 이미지를 만들면서 요금은 영상 기준으로
     붙었다(5초 1080p $1.20 vs 실제 이미지 원가 $0.04 — 30배). 전부 현행 영상 모델로 보낸다. */
  "Luma Ray 2":                   "ray-3.2",
  "Luma Ray2":                    "ray-3.2",
  "Luma Ray Flash 2":             "ray-3.2",
  "Luma Ray 1.6":                 "ray-3.2",
};
/* 같은 ray-3.2 라도 type 에 따라 하는 일과 받는 필드가 다르다.
     video         텍스트/이미지 → 영상. start_frame·end_frame·keyframes·loop 사용
     video_edit    기존 영상을 프롬프트로 편집. source 필수, 비율은 원본에서 파생돼 무시됨
     video_reframe 영상 비율 변경. source + aspect_ratio 필수.
                   문서상 video.edit·loop·start_frame·end_frame 미지원, HDR 도 불가(SDR 전용) */
const LUMA_TYPE = {
  "Luma Ray 3.2 (영상 편집)": "video_edit",
  "Luma Ray 3.2 (비율 변경)": "video_reframe",
};
const LUMA_MAX_KEYFRAMES = 64;   // 문서: 다중 키프레임 앵커 최대 64개
const LUMA_VIDEO_MODELS = { "ray-3.2": 1 };
/* 아래 열거값은 문서(guides/model)로 확인한 것이다. 처음 옮길 때 구 API 기억으로
   9초·4K·9:21 을 넣었는데 셋 다 ray-3.2 에 없는 값이었다 — 그대로 뒀으면 길이는
   제공사가 반려하고, 4K 는 요금만 더 받고 1080p 가 나왔을 것이다.
     해상도 540p·720p·1080p (4K 없음) · 길이 5s·10s · 비율 6종(9:21 없음) */
const LUMA_RES_ALLOW = ["540p", "720p", "1080p"];
const LUMA_RES = { "540p": "540p", "720p": "720p", "1080p": "1080p",
                   // 노드에서 4K 를 고르면 지원 최대치인 1080p 로 내린다(없는 값을 보내지 않기 위함)
                   "4K": "1080p", "4k": "1080p" };
const LUMA_SECS = [5, 10];
export const LUMA_RATIOS = ["9:16", "3:4", "1:1", "4:3", "16:9", "21:9"];          // 영상(ray-3.2) 6종
/* 이미지(uni-1·uni-1-max) 9종 — 영상과 겹치는 값이 1:1·16:9·9:16 뿐이다.
   4:3·3:4·21:9 는 이미지에 없고, 3:1·2:1·3:2·2:3·1:2·1:3 은 이미지에만 있다.
   "영상의 6종은 이미지 9종의 부분집합일 것" 이라고 넘겨짚었다가 절반이 틀렸다. */
export const LUMA_IMG_RATIOS = ["3:1", "2:1", "16:9", "3:2", "1:1", "2:3", "9:16", "1:2", "1:3"];
// style="manga" 는 세로 비율만 허용한다. 가로·정사각과 함께 보내면 제출 단계에서 422 다.
const LUMA_MANGA_RATIOS = ["2:3", "9:16", "1:2", "1:3"];
/* image_ref 한 장. 문서상 url · data(+media_type) · file_id 중 정확히 하나만 담아야 한다. */
function lumaImageRef(v) {
  const t = String(v || "").trim();
  if (/^data:image\//i.test(t)) {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(t);
    return { data: t.split(",").pop(), media_type: (m && m[1]) || "image/png" };
  }
  return { url: t };
}
/* 영상 편집·비율 변경의 source. 문서상 셋 중 하나다.
     generation_id  이전 루마 생성물을 그대로 가리킨다(업로드 불필요·가장 안전)
     url            외부에 호스팅된 영상
     data           인라인 데이터. 이 경우 media_type 이 필요하다(video/*) */
function lumaVideoSource(b, srcVid) {
  const gid = String(b.lumaSourceId || "").trim();
  if (gid) return { generation_id: gid };
  const v = String(srcVid || "").trim();
  if (/^data:/i.test(v)) {
    const m = /^data:(video\/[a-z0-9.+-]+);base64,/i.exec(v);
    return { data: v.split(",").pop(), media_type: (m && m[1]) || "video/mp4" };
  }
  return { url: v };
}
export function buildLumaPayload(b) {
  const id = LUMA_IDS[b.model] || "uni-1";
  const isVideo = !!LUMA_VIDEO_MODELS[id];
  const first = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  // (다른 세션이 구 API 의 keyframes.frame1 로 '마지막 프레임' 을 추가했었다.
  //  같은 의도를 Agents API 형식인 video.end_frame 으로 이어받는다.)

  if (!isVideo) {
    /* 이미지 — 레퍼런스가 있으면 편집(image_edit), 없으면 생성.
       문서: 텍스트→이미지는 image_ref 최대 9장, 편집은 원본이 별도 슬롯을 차지해 최대 8장.
       예전엔 첫 장만 쓰고 나머지를 버렸다 — 노드는 여러 장을 받고 요금까지 가산하는데
       실제 요청에는 한 장만 실렸다. */
    // 프롬프트 한도는 문서상 6,000자다(1,200 으로 잘라 길게 쓴 설명이 통째로 날아가고 있었다).
    const p = { model: id, prompt: cut(b.prompt, 6000) };
    /* 비율은 생략 가능하고, 생략하면 모델이 프롬프트에 맞춰 고른다.
       허용 9종 밖이면 보내지 않는다 — 없는 값을 보내 반려당하는 것보다 모델에 맡기는 편이 낫다. */
    const ir = String(b.ratio || "").trim();
    if (LUMA_IMG_RATIOS.indexOf(ir) >= 0) p.aspect_ratio = ir;
    /* 스타일 프리셋. manga 는 세로 비율 전용이라, 가로·정사각과 함께 보내면 422 로 반려된다.
       그 조합이면 비율을 빼서 모델이 세로 중에서 고르게 한다(요청이 통째로 실패하지 않도록). */
    const st2 = String(b.lumaStyle || "").trim().toLowerCase();
    if (st2 === "manga") {
      p.style = "manga";
      if (p.aspect_ratio && LUMA_MANGA_RATIOS.indexOf(p.aspect_ratio) < 0) delete p.aspect_ratio;
    }
    const refs = [];
    const add = (v) => { const t = v && String(v).trim(); if (t && refs.indexOf(t) < 0) refs.push(t); };
    if (Array.isArray(b.refImages)) b.refImages.forEach(add);
    add(b.firstFrame); add(b.refImage);
    if (refs.length) {
      p.type = "image_edit";
      p.source = { url: refs[0] };
      const extra = refs.slice(1, 9);                 // 원본 1 + 참조 8
      if (extra.length) p.image_ref = extra.map(lumaImageRef);
    } else if (Array.isArray(b.styleRefs) && b.styleRefs.length) {
      p.image_ref = b.styleRefs.slice(0, 9).map(lumaImageRef);         // 생성 시 스타일 참조(최대 9)
    }
    if (b.webSearch === true) p.web_search = true;    // 생성 전 웹에서 시각 참조 검색
    const fmt = String(b.imgFormat || "").toLowerCase();
    if (fmt === "png" || fmt === "jpeg") p.output_format = fmt;
    return p;
  }
  // 영상 — 모델이 안 받는 길이를 보내지 않도록 허용값 중 가장 가까운 값으로 스냅한다
  const raw = Number(b.seconds) || 5;
  const sec = LUMA_SECS.reduce((a, c) => Math.abs(c - raw) < Math.abs(a - raw) ? c : a, LUMA_SECS[0]);
  // 비율도 허용 6종 밖이면 16:9 로 떨어뜨린다(없는 값을 보내면 제공사가 반려한다)
  const ar = LUMA_RATIOS.indexOf(String(b.ratio || "")) >= 0 ? b.ratio : "16:9";
  const vtype = LUMA_TYPE[b.model] || "video";
  const srcVid = b.srcVideo || b.srcVideoUrl || null;

  // ── 영상 비율 변경 ── source 와 목표 비율만 받는다. 나머지 영상 옵션은 문서상 미지원.
  if (vtype === "video_reframe") {
    const q = { model: id, type: "video_reframe", aspect_ratio: ar, source: lumaVideoSource(b, srcVid) };
    if (String(b.prompt || "").trim()) q.prompt = cut(b.prompt, 1200);
    return q;
  }
  // ── 영상 편집 ── 비율은 원본에서 파생되므로 보내지 않는다(보내도 무시된다).
  if (vtype === "video_edit") {
    const q = { model: id, type: "video_edit", prompt: cut(b.prompt, 1200),
                source: lumaVideoSource(b, srcVid), video: {} };
    const res = LUMA_RES[String(b.res || "").trim()];
    if (res) q.video.resolution = res;
    // 편집 강도 — 노드 슬라이더는 0~100, 제공사는 0~1
    const st = Number(b.v2vStrength);
    if (Number.isFinite(st)) q.video.edit = { strength: Math.max(0, Math.min(1, st > 1 ? st / 100 : st)) };
    else q.video.edit = { auto_controls: true };
    if (!Object.keys(q.video).length) delete q.video;
    return q;
  }

  const p = { model: id, type: "video", prompt: cut(b.prompt, 1200),
              aspect_ratio: ar,
              video: { resolution: LUMA_RES[String(b.res || "").trim()] || "1080p", duration: sec + "s" } };
  if (b.lumaHdr === true) p.video.hdr = true;                       // HDR 출력(720p·1080p)
  // EXR 내보내기는 문서상 hdr:true 가 전제다 — 단독으로 보내면 반려된다.
  if (b.lumaExr === true && p.video.hdr === true) p.video.exr_export = true;
  if (b.lumaLoop === true && !b.lastFrame) p.video.loop = true;     // 끊김 없는 반복(생성 전용)
  // 이전 생성 이어붙이기 — 문서상 start_frame/end_frame 중 "하나만" generation_id 를 가져야 한다.
  const extId = String(b.lumaExtendId || "").trim();
  if (extId) {
    p.video[b.lumaExtendAt === "end" ? "end_frame" : "start_frame"] = { generation_id: extId };
    return p;
  }
  /* 다중 키프레임 — 이미지 레퍼런스를 여러 장 연결하면 앵커로 쓴다(최대 64).
     keyframe_indexes 는 각 앵커가 놓일 프레임 위치다. 첫 장은 시작, 마지막 장은 끝,
     나머지는 그 사이에 균등 배치한다. 두 장 이하면 기존 start/end 방식이 더 단순하다. */
  const anchors = [];
  const addA = (v) => { const t = v && String(v).trim(); if (t && anchors.indexOf(t) < 0) anchors.push(t); };
  if (Array.isArray(b.refImages)) b.refImages.forEach(addA);
  addA(b.firstFrame); addA(b.refImage);
  if (anchors.length > 2) {
    const use = anchors.slice(0, LUMA_MAX_KEYFRAMES);
    const lastIdx = Math.max(1, sec * 24 - 1);        // 24fps 기준 마지막 프레임 위치
    p.video.keyframes = use.map((url) => ({ url }));
    p.video.keyframe_indexes = use.map((_v, i) => Math.round((i / (use.length - 1)) * lastIdx));
    return p;
  }
  if (first) p.video.start_frame = { url: first };
  if (b.lastFrame) p.video.end_frame = { url: b.lastFrame };
  return p;
}

export function buildVeoPayload(b, opts) {
  const inst = { prompt: cut(b.prompt, 1000) };
  const vImg = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage;
  // Veo 는 base64 만 받음. data:URI 일 때만, 실제 MIME 을 그대로 사용(JPEG를 PNG로 잘못 라벨링하던 버그 수정)
  if (vImg && /^data:image\//i.test(String(vImg))) {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(String(vImg));
    inst.image = { bytesBase64Encoded: String(vImg).split(",").pop(), mimeType: (m && m[1]) || "image/jpeg" };
  }
  // Veo 는 lastFrame 으로 끝 프레임을 받는다(시작~끝 보간). 첫 프레임이 있을 때만 유효.
  if (inst.image && b.lastFrame && /^data:image\//i.test(String(b.lastFrame))) {
    const lm = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(String(b.lastFrame));
    inst.lastFrame = { bytesBase64Encoded: String(b.lastFrame).split(",").pop(), mimeType: (lm && lm[1]) || "image/jpeg" };
  }
  // Veo 3.1 의 durationSeconds 는 4·6·8 만 받는다(Veo 2 시절의 5~8 클램프가 남아 4초 선택이 5초로 밀렸다).
  const VEO_SECS = [4, 6, 8];
  const wantSec = Math.round(Number(b.seconds) || 8);
  const dur = VEO_SECS.reduce((a, c) => (Math.abs(c - wantSec) < Math.abs(a - wantSec) ? c : a), VEO_SECS[0]);
  const p = {
    aspectRatio: b.ratio === "9:16" ? "9:16" : "16:9",
    durationSeconds: dur,
    negativePrompt: b.negative || undefined,
    personGeneration: "allow_adult"   // 사람/얼굴 차단(코드 173) 완화 — 성인 허용
  };
  // generateAudio·resolution 은 Vertex 경로 전용 파라미터(AI Studio 폴백은 모르는 필드로 거부한다).
  //  Veo 3.x 는 오디오를 기본 생성하므로, 노드 토글이 꺼져 있으면 명시적으로 끈다(과금 기준과 일치시킨다).
  if (!(opts && opts.noVertexOnly)) {
    p.generateAudio = b.generateAudio === true;
    p.resolution = String(b.res || "").trim() === "720p" ? "720p" : "1080p";
  }
  return { instances: [inst], parameters: p };
}

/* ── "실제로 생성된 길이·해상도" ──
   과금은 요청값이 아니라 제공사에 실제로 나간 값을 기준으로 해야 한다.
   빌더들이 모델별 허용값으로 스냅/클램프하므로(예: Veo 7→6초, Seedance 1.x 8→10초,
   Kling 1.6 12→10초), 요청값으로 청구하면 8초 만들고 30초를 물리는 식의 어긋남이 생긴다.
   스튜디오는 화면에서 이미 스냅하지만 /api/v1/generate·MCP 는 임의 값을 보낼 수 있다.
   표를 따로 두면 빌더와 어긋나므로, 빌더를 실제로 돌려 그 결과에서 값을 읽는다. */
const RES_AWARE = { seedance: 1, google: 1, luma: 1, upscale: 1 };
export function effectiveUnits(body, env) {
  const raw = Math.max(1, Math.round(Number((body && (body.seconds ?? body.units)) || 8)));
  const prov = String((body && body.provider) || "");
  const num = (v) => { const n = Number(String(v == null ? "" : v).replace(/[^\d.]/g, "")); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };
  try {
    const b = Object.assign({}, body, { seconds: raw });
    if (prov === "seedance") {
      const p = buildSeedancePayload(b, env);
      if (p.duration) return num(p.duration) || raw;
      const m = /--duration\s+(\d+)/.exec((p.content && p.content[0] && p.content[0].text) || "");
      return m ? Number(m[1]) : raw;
    }
    if (prov === "google") return num(buildVeoPayload(b).parameters.durationSeconds) || raw;
    if (prov === "runway") return num(buildRunwayPayload(b).duration) || raw;
    /* 루마는 길이가 video.duration("5s"/"10s") 안에 있다. 최상위 .duration 을 보고 있어
       항상 undefined → 요청값을 그대로 썼다. 그래서 7초로 부르면 실제로는 5초가 생성되는데
       요금은 (units>5 라서) 10초 요금이 붙었다 — 1080p 기준 $1.20 짜리에 $3.60 을 물린 셈.
       비율 변경(초당 과금)은 20초로 부르면 10초만 만들고 20초치를 물렸다. */
    if (prov === "luma") { const lp = buildLumaPayload(b); return num(lp.video && lp.video.duration) || raw; }
    if (prov === "hailuo") return num(buildHailuoPayload(b).duration) || raw;
    if (prov === "kling")  return num(buildKlingApiPayload(b, klingApiSpec(b)).duration) || raw;
    if (prov === "xai")    return num(buildXaiVideoPayload(b, env).duration) || raw;
  } catch (_e) { /* 빌더가 던지면 요청값을 그대로 쓴다 */ }
  return raw;
}
export function effectiveRes(body, env) {
  const prov = String((body && body.provider) || "");
  const raw = String((body && body.res) || "1080p");
  //  해상도 필드를 아예 받지 않는 제공사(Kling·Runway·MiniMax·Grok 등)는 무엇을 골라도
  //  결과가 같다 → 과금 배율이 달라지지 않도록 1080p(1.0배)로 고정한다.
  if (!RES_AWARE[prov]) return "1080p";
  try {
    if (prov === "seedance") {
      const p = buildSeedancePayload(Object.assign({}, body), env);
      if (p.resolution) return p.resolution;                       // 2.0 — 최상위 필드
      const m = /--resolution\s+(\S+)/.exec((p.content && p.content[0] && p.content[0].text) || "");
      return m ? m[1] : "1080p";                                   // 1.x — 텍스트 명령
    }
    if (prov === "google") return buildVeoPayload(Object.assign({}, body)).parameters.resolution || "1080p";
    /* 루마는 빌더에 물어본다. Agents API 의 ray-3.2 는 540p·720p·1080p 만 받고 4K 가 없어
       빌더가 4K 를 1080p 로 내리는데, 예전엔 여기서 요청값을 그대로 반환했다 —
       옛 그래프에 4K 가 남아 있으면 2.6배를 청구하고 1080p 를 내보내는 셈이었다.
       (노드 목록에서는 이미 4K 를 뺐지만, 저장된 그래프는 옛 값을 그대로 들고 있다.) */
    if (prov === "luma") {
      const p = buildLumaPayload(Object.assign({}, body));
      return (p.video && p.video.resolution) || "1080p";
    }
  } catch (_e) {}
  // 업스케일은 고른 값을 그대로 받는다(4K 포함)
  return /^(480p|540p|720p|1080p|4K)$/i.test(raw) ? raw : "1080p";
}

export async function onRequest(context) {
  try {
    return await handle(context);
  } catch (e) {
    // 예상 못 한 예외도 원인이 보이도록 항상 읽을 수 있는 JSON 으로 반환 (raw 502 방지)
    return json({ error: "서버 예외: " + String((e && e.message) || e).slice(0, 300) }, 502);
  }
}

async function handle(context) {
  const { request, env } = context;
  const k = keys(env);
  const u = new URL(request.url);

  // ── 인증·크레딧 게이트 (익명 호출로 유료 제공사 API 소진하는 denial-of-wallet 차단) ──
  //  · POST(실제 생성) 및 제공사 호출을 유발하는 GET(submit/media/file/op/task) 은 로그인 필수.
  //  · 세션 쿠키(스튜디오) · 회원 API키(bg_live_) · 회원 개인 MCP 토큰(bgm_) · 전역 MCP 토큰 순으로 인증.
  //  · ?health 진단(제공사 설정 여부 불리언)만 예외로 허용.
  const method = request.method;
  let gateUser = null;   // 인증된 회원(브랜드 킷 자동 적용에 사용)
  const gateGet = method === "GET" && ["submit", "media", "file", "op", "task"].some((p) => u.searchParams.has(p));
  if (method === "POST" || gateGet) {
    const db = resolveDB(env);
    let me = db ? await getSessionUser(request, db) : null;
    // 아래 POST 본문 처리(브랜드 킷 자동 적용)에서 쓰기 위해 인증 결과를 바깥으로 넘긴다.
    if (!me && db) {
      // 회원 API 키(bg_live_) 인증 — 노드형 AI 영상 플랜 사용자의 직접 API 호출
      const ak = await getUserByApiKey(db, request.headers.get("Authorization"));
      if (ak) me = ak.user;
    }
    if (!me && db) {
      // 회원 개인 MCP 토큰(bgm_) 인증 — Claude MCP 커넥터가 /api/mcp 를 거쳐 내부 호출할 때 사용.
      //  (API 키는 bg_live_ 접두사만 인정하므로 bgm_ 토큰은 위 게이트를 통과하지 못한다.
      //   이 분기가 없으면 회원이 개인 MCP 토큰으로 연결했을 때 모든 생성이 401 "로그인이 필요합니다" 로 실패한다.)
      const bearer = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      if (bearer) {
        const mu = await getUserByMcpToken(db, bearer);
        if (mu) me = mu;
      }
    }
    if (!me) {
      // 전역 MCP 토큰(관리자 폴백) 도 허용 — 상수시간 비교
      const bearer = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      const gtok = env.MCP_AUTH_TOKEN || env.mcp_auth_token || "";
      if (gtok && bearer && ctEqStr(bearer, String(gtok))) me = { role: "admin", credits: Number.MAX_SAFE_INTEGER };
    }
    if (!me) return json({ error: "로그인이 필요합니다.", needLogin: true }, 401);
    gateUser = me;
    // 실제 생성(POST)은 크레딧 보유자(또는 관리자)만 — dryRun 검증 요청은 통과
    if (method === "POST") {
      let pbody = {};
      try { pbody = await request.clone().json(); } catch (_e) {}
      const dry = !!(pbody && pbody.dryRun);
      const isAdmin = me.role === "admin";
      if (!dry && !isAdmin && !(Number(me.credits) > 0)) {
        return json({ error: "크레딧이 부족합니다. 요금제를 활성화해 주세요.", needPlan: true }, 402);
      }
      if (!dry && !isAdmin && db && me.id) {
        // ── 남용 방지 ①: 사전 잔액 게이트 — 예상 과금 이상 보유해야 생성 시작 ──
        //  유료 제공사 호출 "이전"에 차단하므로, 잔액이 부족하면 제공사 비용 자체가 발생하지 않는다.
        //  precheck 와 동일한 공식(computeCharge)을 서버에서 재계산해 클라이언트 우회를 무력화한다.
        try {
          const mdl = String(pbody.model || "");
          if (mdl && MODEL_COST[mdl]) {
            const rate = await getUsdKrw(db);
            const mk = await resolveMarkup(db, me.id, mdl, Number(me.credit_markup) || 0);
            const ckw = await creditPriceFor(db, me);
            //  게이트도 "실제로 생성될 길이·해상도" 기준이어야 확정 과금과 어긋나지 않는다.
            const isImg = MODEL_COST[mdl] && MODEL_COST[mdl].u === "img";
            const gUnits = isImg ? 1 : effectiveUnits(pbody, env);
            const gRes = isImg ? undefined : effectiveRes(pbody, env);
            const cc = computeCharge({ model: mdl, units: gUnits, res: gRes, audio: !!pbody.generateAudio }, rate, mk, ckw);
            const surPct = await resolveRefSurcharge(db, me.id);
            const refMult = 1 + (surPct / 100) * Math.max(0, Number(pbody.refCount) || 0);
            const cnCount = Math.max(0, (pbody.controlnets && pbody.controlnets.length) || Number(pbody.cn) || 0);
            const cnMult = cnCount > 0 ? 1 + (await resolveCnSurcharge(db)) / 100 : 1;
            const need = Math.round(cc.credits * refMult * cnMult * 100) / 100;
            if (need > 0 && Number(me.credits) < need) {
              return json({ error: `크레딧이 부족합니다. 필요 ${need.toLocaleString("ko-KR")}크레딧 · 보유 ${Number(me.credits).toLocaleString("ko-KR")}크레딧`, need, balance: Number(me.credits), needPlan: true }, 402);
            }
          }
        } catch (_e) { /* 추정 실패 시 credits>0 게이트로 통과 (락아웃 방지) */ }
        // ── 남용 방지 ②: 레이트리밋(분/시/일) + 15초 버스트 가드 (denial-of-wallet 완화) ──
        try { await ensureApiKeysSchema(db); } catch (_e) {}
        const rl = await enforceRateLimit(db, me.id, "post", false);
        if (!rl.ok) return json({ error: rl.reason || "요청이 너무 많습니다. 잠시 후 다시 시도하세요.", retryAfter: rl.retryAfter || 30 }, 429);
        try {
          const burst = await db.prepare(
            "SELECT COUNT(*) AS n FROM api_rate WHERE user_id=? AND kind='post' AND ts>?"
          ).bind(String(me.id), new Date(Date.now() - 15000).toISOString()).first();
          if (Number(burst && burst.n || 0) > 5) return json({ error: "짧은 시간에 너무 많은 생성을 요청했습니다. 잠시 후 다시 시도하세요.", retryAfter: 15 }, 429);
        } catch (_e) { /* 집계 실패는 통과 (락아웃 방지) */ }
      }
    }
  }

  /* ══ GET: 상태 폴링 / 파일 프록시 ══ */
  if (request.method === "GET") {
    if (u.searchParams.has("health")) { // 제공사 키 설정 여부 점검 (키 값은 절대 노출 안 함) — ?health 또는 ?health=1 모두 허용
      // 루마는 "키가 있다" 와 "그 키가 통한다" 가 다르다 — 실제로 확인한다(아래 lumaUsable 주석 참조)
      const lumaOk = await lumaUsable(k.luma);
      return json({
        version:  "2026-07-13-v56 (remove-keys-page)", // 이 필드가 보이면 최신 코드가 프로덕션에 반영된 것
        build:    "2026-07-13-v56",                      // 스튜디오 STUDIO_BUILD 와 정확히 일치해야 최신
        runway:   !!k.runway,
        xai:      !!k.xai,
        google:   !!(k.google || gcpCreds(env)),
        seedance: !!k.seedance,
        seedream: !!k.seedance,   // 씨드림 = ByteDance ModelArk 이미지, 씨댄스와 같은 키 공유
        flux:     !!k.flux,
        hailuo:   !!k.hailuo,
        luma:     lumaOk,          // 키 유무가 아니라 "그 키가 실제로 통하는가"
        lumaKeySet: !!k.luma,      // 키 자체는 있는지(진단용) — 키는 있는데 luma:false 면 키가 거부된 것
        fal:      !!k.fal,
        /* 클링은 공식 오픈플랫폼 API 로만 나간다(중개 폴백 제거). fal 키가 있어도 대체되지 않으므로
           공식 키가 없으면 여기서 false 를 돌려 스튜디오가 클링 모델을 아예 숨기게 한다.
           예전엔 (klingCreds || fal) 로 답해, 공식 키가 없어도 모델이 목록에 남아 매번 실패했다. */
        kling:    !!klingCreds(env),
        klingOfficial: !!klingCreds(env),
        klingRoute: klingCreds(env) ? "official" : "none",
        ark3d:    !!k.seedance,   // 3D 메시(Hyper3D·Hitem3D) — 씨댄스와 같은 ModelArk 키
        v2vAuto:  !!(k.runway || k.seedance || k.fal),
        // 배포된 ByteDance 키 지문(값 노출 없이 회원 콘솔 키와 동일한지 대조용)
        seedanceKeyId: k.seedance ? (String(k.seedance).slice(0, 8) + "…" + String(k.seedance).slice(-4)) : null,
        motion:   !!k.fal,
        nanobanana: !!(gcpCreds(env) || k.google),
        openai:   !!k.openai,
        // 음성/립싱크 파이프라인 연동 상태
        elevenlabs: !!pick(env, ["ElevenLabs_API_KEY", "ELEVENLABS_API_KEY", "elevenlabs_api_key"]),
        lipsync:  !!k.fal,                                                                     // fal sync-lipsync
        revoice:  !!(pick(env, ["ElevenLabs_API_KEY", "ELEVENLABS_API_KEY", "elevenlabs_api_key"]) && k.fal), // 목소리 교체+립싱크
        narrateReady: !!(k.fal && pick(env, ["Text_to_Speech", "OpenAI_Text_to_speech", "ElevenLabs_API_KEY", "OPENAI_API_KEY"])), // TTS+병합
        music:    musicEngines(env, k).length > 0,   // 음악(BGM) — ElevenLabs/MiniMax/fal 재사용
        upscale:  !!k.fal,                            // 영상 업스케일 (fal Topaz)
        // 스튜디오가 실제로 쓰는 Seedance 모델 결정값 진단 (모델ID는 비밀 아님)
        seedanceModelOverride: pick(env, ["SEEDANCE_MODEL_ID", "seedance_model_id"]) || null,
        seedance20Maps: SEEDANCE_IDS["Seedance 2.0"],
        seedreamModelOverride: pick(env, ["SEEDREAM_MODEL_ID", "seedream_model_id"]) || null,
        seedream40Maps: SEEDREAM_IDS["Seedream 4.0"][0]
      });
    }
    // (보안) 키 값/환경변수 조회 엔드포인트는 제거됨 — API 키는 어떤 응답에도 절대 노출하지 않습니다.
    if (u.searchParams.get("diag") === "keys") {
      return json({ error: "이 엔드포인트는 보안상 제거되었습니다. API 키는 노출되지 않습니다." }, 410);
    }
    // ── 남용 방지: 진단(diag) 엔드포인트는 실제 유료 제공사 생성 태스크를 제출하므로 관리자 전용 ──
    //  (익명 GET 으로 Seedance/Flux/Veo 등 유료 호출을 소진하는 denial-of-wallet 차단)
    {
      const diagVal = u.searchParams.get("diag");
      if (diagVal && diagVal !== "keys") {
        const ddb = resolveDB(env);
        let dme = ddb ? await getSessionUser(request, ddb) : null;
        if (!dme || dme.role !== "admin") {
          const bearer = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
          const gtok = env.MCP_AUTH_TOKEN || env.mcp_auth_token || "";
          if (gtok && bearer && ctEqStr(bearer, String(gtok))) dme = { role: "admin" };
        }
        if (!dme || dme.role !== "admin") return json({ error: "진단 엔드포인트는 관리자 전용입니다.", needAdmin: true }, 403);
      }
    }
    // GET 기반 Seedance 제출 — 스튜디오 POST 가 (원인불명) 플랫폼 502 날 때의 우회 경로.
    // 이미지/영상은 이미 공개 URL 이라 쿼리스트링으로 충분하고, GET 은 진단들처럼 안정적이다.
    //   ?submit=seedance&model=Seedance 2.0&mid=..&prompt=..&ratio=16:9&seconds=5&img=URL&img2=URL&vid=URL
    if (u.searchParams.get("submit") === "seedance") {
      if (!k.seedance) return json({ error: "Seedance 연동이 설정되지 않았습니다" }, 500);
      const b = {
        model: u.searchParams.get("model") || "Seedance 2.0",
        seedanceModel: u.searchParams.get("mid") || undefined,
        prompt: u.searchParams.get("prompt") || "",
        ratio: u.searchParams.get("ratio") || "16:9",
        seconds: Number(u.searchParams.get("seconds")) || 5,
        firstFrame: u.searchParams.get("img") || null,
        lastFrame: u.searchParams.get("img2") || null,
        srcVideo: u.searchParams.get("vid") || null,
        audioUrl: u.searchParams.get("aud") || null,
        generateAudio: u.searchParams.get("genaudio") === "1",
        watermark: u.searchParams.get("wm") === "1"
      };
      const payload = buildSeedancePayload(b, env);
      let r, j; const t0 = Date.now();
      try {
        r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 22000);
        j = await r.json().catch(() => ({}));
      } catch (e) {
        return json({ error: "Seedance 제출 실패(" + (Date.now() - t0) + "ms): " + String((e && e.message) || e).slice(0, 140) }, 502);
      }
      if (r.ok && j.id)
        return json({ statusUrl: "/api/generate?provider=seedance&host=bp&task=" + encodeURIComponent(j.id) });
      return json({ error: "Seedance HTTP " + r.status + " " +
        String((j.error && (j.error.message || j.error.code)) || JSON.stringify(j)).slice(0, 180) }, 502);
    }
    // 진단(2.0 공식 형식): BytePlus 공식 샘플 URL(이미지+영상)로 정확한 2.0 페이로드 제출.
    // bp 자기네 공개 URL이라 즉시 로드됨 → 형식/키/네트워크가 맞으면 무조건 태스크ID 반환.
    //   /api/generate?diag=seedance2
    if (u.searchParams.get("diag") === "seedance2") {
      if (!k.seedance) return json({ diag: "seedance2", error: "Seedance 키가 서버에 없음" });
      const model = u.searchParams.get("model") || "dreamina-seedance-2-0-260128";
      const S = "https://ark-doc.tos-ap-southeast-1.bytepluses.com/doc";
      const payload = { model, content: [
        { type: "text", text: "A cinematic photorealistic product shot, smooth camera move." },
        { type: "image_url", image_url: { url: S + "_image/r2v_tea_pic1.jpg" }, role: "reference_image" },
        { type: "image_url", image_url: { url: S + "_image/r2v_tea_pic2.jpg" }, role: "reference_image" },
        { type: "video_url", video_url: { url: S + "_video/r2v_tea_video1.mp4" }, role: "reference_video" }
      ], ratio: "16:9", duration: 5, watermark: false };
      const started = Date.now();
      try {
        const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 22000);
        const text = await r.text();
        let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
        return json({ diag: "seedance2", model, httpStatus: r.status, ok: r.ok,
                      tookMs: Date.now() - started, response: j || String(text).slice(0, 600) });
      } catch (e) {
        return json({ diag: "seedance2", model, tookMs: Date.now() - started,
                      error: String((e && e.message) || e).slice(0, 300) });
      }
    }
    // 진단(씨드림): 사장님 키로 ByteDance ModelArk 이미지 생성을 실제로 호출해 이미지 URL 까지 확인.
    //   /api/generate?diag=seedream                          (기본 Seedream 4.0)
    //   /api/generate?diag=seedream&model=seedream-3-0-t2i-250415&prompt=...
    if (u.searchParams.get("diag") === "seedream") {
      if (!k.seedance) return json({ diag: "seedream", error: "Seedream 키(=Seedance_API_KEY) 가 서버에 없음" });
      const model = u.searchParams.get("model") || "seedream-4-0-250828";
      const prompt = u.searchParams.get("prompt") || "a photorealistic red apple on a wooden table, soft studio lighting, high detail";
      const payload = { model, prompt, size: "1024x1024", response_format: "url", watermark: false };
      const started = Date.now();
      try {
        const r = await fetchT(ARK_HOSTS.bp + "/images/generations", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 60000);
        const text = await r.text();
        let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
        const url = j && j.data && j.data[0] && j.data[0].url;
        return json({ diag: "seedream", model, httpStatus: r.status, ok: r.ok && !!url,
                      tookMs: Date.now() - started, imageUrl: url || null,
                      response: url ? undefined : (j || String(text).slice(0, 600)) });
      } catch (e) {
        return json({ diag: "seedream", model, tookMs: Date.now() - started,
                      error: String((e && e.message) || e).slice(0, 300) });
      }
    }
    // 진단(씨드림 전체): 등록된 모든 Seedream 이미지 모델을 실제로 한 번씩 생성해 개별 성공/실패 보고.
    //   /api/generate?diag=seedream-all      (관리자 · 모델당 ~$0.03 · 편집모델은 샘플 이미지로 검증)
    if (u.searchParams.get("diag") === "seedream-all") {
      if (!k.seedance) return json({ diag: "seedream-all", error: "Seedream 키(=Seedance_API_KEY) 가 서버에 없음" });
      const sample = "https://ark-doc.tos-ap-southeast-1.bytepluses.com/doc_image/r2v_tea_pic1.jpg";
      // 표시명 단위로 검증 — 실제 생성과 똑같이 후보 ID 를 순서대로 시도해 "실제로 먹히는 ID"를 찾는다.
      //  ※ 모델별로 병렬 실행 → 전체 소요 = 가장 느린 1개(≈8초). (순차면 합계로 100초 넘어 타임아웃)
      const items = await Promise.all(Object.keys(SEEDREAM_IDS).map(async (name) => {
        const isEdit = /편집/.test(name);
        const probe = { model: name, prompt: "a photorealistic red apple on a wooden table, soft studio light", ratio: "1:1" };
        if (isEdit) probe.refImages = [sample];
        const t0 = Date.now(); const tried = [];
        let done = null;
        for (const mid of seedreamModelIds(probe, env)) {
          const body = buildSeedreamPayload(probe, env, mid);
          // 진단은 최소 크기로(비용·시간 절감). 단 4.5/5.0 은 최소 3,686,400px 요건이 있어 축소하면 400 → 그대로 둠.
          if (!/seedream-(4-5|5-0)/.test(mid)) body.size = "1024x1024";
          try {
            const r = await fetchT(ARK_HOSTS.bp + "/images/generations", {
              method: "POST", headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
              body: JSON.stringify(body) }, 60000);
            const j = await r.json().catch(() => ({}));
            const url = j && j.data && j.data[0] && j.data[0].url;
            if (r.ok && url) { done = { ok: true, modelId: mid, imageUrl: url, httpStatus: r.status }; break; }
            const err = String((j.error && (j.error.message || j.error.code)) || JSON.stringify(j)).slice(0, 180);
            tried.push({ modelId: mid, httpStatus: r.status, error: err });
            if (!seedreamModelMissing(r.status, j)) break;   // 모델ID 문제가 아니면 다음 후보도 동일하게 실패
          } catch (e) {
            tried.push({ modelId: mid, error: String((e && e.message) || e).slice(0, 180) });
          }
        }
        return done
          ? { model: name, ok: true, modelId: done.modelId, tookMs: Date.now() - t0, imageUrl: done.imageUrl }
          : { model: name, ok: false, tookMs: Date.now() - t0, tried };
      }));
      const okCount = items.filter(x => x.ok).length;
      return json({ diag: "seedream-all", okCount, failCount: items.length - okCount, total: items.length,
                    works: items.filter(x => x.ok).map(x => x.model + " → " + x.modelId),
                    fails: items.filter(x => !x.ok).map(x => x.model), items });
    }
    // 초고속 존재확인(무과금·1초 내): 일부러 너무 작은 size 로 보내 '검증 단계'에서 즉시 반려시킨다.
    //  → 404/모델없음 = ID 틀림/미개통,  그 외(400 param 등) = 모델 존재(ID 정상). 실제 생성은 안 함.
    //   /api/generate?diag=seedream-check
    if (u.searchParams.get("diag") === "seedream-check") {
      if (!k.seedance) return json({ diag: "seedream-check", error: "Seedream 키(=Seedance_API_KEY) 가 서버에 없음" });
      const items = await Promise.all(Object.keys(SEEDREAM_IDS).map(async (name) => {
        const probe = { model: name, prompt: "t", ratio: "1:1" };
        const tried = [];
        for (const mid of seedreamModelIds(probe, env)) {
          try {
            const r = await fetchT(ARK_HOSTS.bp + "/images/generations", {
              method: "POST", headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
              body: JSON.stringify({ model: mid, prompt: "t", size: "64x64", response_format: "url" }) }, 15000);
            const j = await r.json().catch(() => ({}));
            if (!seedreamModelMissing(r.status, j)) return { model: name, exists: true, modelId: mid, httpStatus: r.status };
            tried.push({ modelId: mid, httpStatus: r.status });
          } catch (e) { tried.push({ modelId: mid, error: String((e && e.message) || e).slice(0, 80) }); }
        }
        return { model: name, exists: false, tried };
      }));
      return json({ diag: "seedream-check",
        note: "400/param=존재(ID정상), 404=없음/미개통. 실제 생성 안 함(무과금·빠름).",
        exists: items.filter(x => x.exists).map(x => x.model + " → " + x.modelId),
        missing: items.filter(x => !x.exists).map(x => x.model), items });
    }
    // 단일 모델을 '공식 예제와 100% 동일한' 본문으로 실제 호출해 전체 응답을 그대로 반환(증거용).
    //   /api/generate?diag=seedream3                          (기본 seedream-3-0-t2i-250415)
    //   /api/generate?diag=seedream3&model=<정확한 모델ID>     (다른 ID 시험)
    if (u.searchParams.get("diag") === "seedream3") {
      if (!k.seedance) return json({ diag: "seedream3", error: "Seedance_API_KEY 미설정" });
      const model = u.searchParams.get("model") || "seedream-3-0-t2i-250415";
      const body = { model, prompt: "a red apple on a wooden table", response_format: "url", size: "1024x1024", guidance_scale: 3, watermark: true };
      const endpoint = ARK_HOSTS.bp + "/images/generations";
      const t0 = Date.now();
      try {
        const r = await fetchT(endpoint, {
          method: "POST", headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(body) }, 60000);
        const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
        const url = j && j.data && j.data[0] && j.data[0].url;
        return json({ diag: "seedream3", model, endpoint,
          keyId: String(k.seedance).slice(0, 8) + "…" + String(k.seedance).slice(-4),
          httpStatus: r.status, ok: r.ok && !!url, imageUrl: url || null, tookMs: Date.now() - t0,
          raw: url ? undefined : (j || String(text)).toString ? String(text).slice(0, 700) : j });
      } catch (e) {
        return json({ diag: "seedream3", model, endpoint, error: String((e && e.message) || e).slice(0, 200), tookMs: Date.now() - t0 });
      }
    }
    // 최근 실패한 생성 요청의 원문 에러 + 우리가 보낸 본문 형태(URL 스킴 포함)를 그대로 보여준다.
    //   /api/generate?diag=gen-errors
    if (u.searchParams.get("diag") === "gen-errors") {
      const edb = resolveDB(env);
      if (!edb) return json({ diag: "gen-errors", error: "DB 바인딩 없음" });
      try {
        await edb.prepare(
          `CREATE TABLE IF NOT EXISTS gen_errors (id TEXT PRIMARY KEY, provider TEXT, model TEXT,
             err TEXT, shape TEXT, created_at TEXT)`).run();   // 없으면 만들어 "테이블 없음" 혼동 제거
        const rows = await edb.prepare(
          `SELECT provider, model, err, shape, created_at FROM gen_errors
           ORDER BY created_at DESC LIMIT 20`).all();
        return json({ diag: "gen-errors",
          note: "shape.content 의 scheme 이 data:image 면 base64 가 그대로 나간 것, https 면 정상 URL.",
          items: (rows && rows.results) || [] });
      } catch (e) {
        return json({ diag: "gen-errors", items: [], note: "아직 기록된 실패 없음", error: String((e && e.message) || e).slice(0, 160) });
      }
    }
    // 계정에 실제로 열려 있는 모델 목록을 제공사에 직접 물어본다(무과금).
    //   /api/generate?diag=ark-models
    //  "미개통이라 404"인지 "우리가 쓴 ID 가 틀려서 404"인지를 추측 없이 가른다.
    //  ModelArk 는 OpenAI 호환 계열이라 목록 경로가 배포마다 다를 수 있어 후보를 순회한다.
    if (u.searchParams.get("diag") === "ark-models") {
      if (!k.seedance) return json({ diag: "ark-models", error: "Seedance_API_KEY 미설정" });
      const paths = ["/models", "/models?page_size=200", "/foundation_models", "/endpoints"];
      const out = await Promise.all(paths.map(async (p) => {
        try {
          const r = await fetchT(ARK_HOSTS.bp + p, {
            headers: { "Authorization": "Bearer " + k.seedance }
          }, 15000);
          const text = await r.text();
          let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
          // 응답 형태가 제각각이라, 문자열 중 모델ID 처럼 보이는 것만 훑어 모은다.
          const ids = [...new Set(String(text).match(/[a-z0-9]+(?:-[a-z0-9]+){2,}/gi) || [])]
            .filter(s => /seedance|seedream|seededit|doubao|dreamina|dola/i.test(s));
          return { path: p, httpStatus: r.status, ok: r.ok, modelIds: ids.slice(0, 120),
                   raw: ids.length ? undefined : String(text).slice(0, 200) };
        } catch (e) { return { path: p, error: String((e && e.message) || e).slice(0, 120) }; }
      }));
      const hit = out.find(x => x.ok && x.modelIds && x.modelIds.length);
      return json({ diag: "ark-models",
        note: "계정에서 조회되는 모델 ID 목록. 여기 있는데 404 면 권한/미개통, 아예 없으면 그 ID 자체가 없는 것.",
        found: hit ? hit.modelIds : null, tried: out });
    }
    /* ══ ModelArk 3D 엔드포인트 탐지 (무과금) ══
       /api/generate?diag=ark3d-path
       3D 는 영상(/contents/generations/tasks)·이미지(/images/generations)와 다른 경로를 쓴다.
       문서 접근이 막혀 있어, 후보 경로에 "모델만 있고 필수 파라미터는 없는" 본문을 POST 해
       404(그 경로 없음) / 400·422(경로는 있고 파라미터만 반려) 로 갈라 실제 경로를 찾는다.
       필수 파라미터가 없으므로 작업은 만들어지지 않는다(무과금). */
    if (u.searchParams.get("diag") === "ark3d-path") {
      if (!k.seedance) return json({ diag: "ark3d-path", error: "Seedance_API_KEY 미설정" });
      const mid = u.searchParams.get("model") || "hyper3d-gen2-260112";
      const paths = [
        "/3d/generations/tasks", "/3d/generations", "/contents/generations/tasks",
        "/3d_generations/tasks", "/generations/3d/tasks", "/models/3d/generations/tasks",
        "/threed/generations/tasks", "/mesh/generations/tasks", "/3d/tasks",
        "/contents/generations/3d/tasks", "/3d/models/generations/tasks", "/assets/generations/tasks"
      ];
      const bodies = [{ model: mid }, { model: mid, content: [] }, { model: mid, prompt: "" }];
      const out = [];
      for (const path of paths) {
        for (let bi = 0; bi < bodies.length; bi++) {
          try {
            const r = await fetchT(ARK_HOSTS.bp + path, {
              method: "POST",
              headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
              body: JSON.stringify(bodies[bi])
            }, 10000);
            const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* 비JSON */ }
            const code = (j && j.error && j.error.code) || "";
            const msg = (j && j.error && j.error.message) || String(t).slice(0, 160);
            /* 게이트웨이가 없는 경로에 "본문 없는 200" 을 돌려주는 바람에 가짜 히트가 대량으로 잡혔다.
               실제 API 응답은 반드시 JSON 본문이 있다 → 본문이 있어야만 경로가 있는 것으로 본다. */
            const hasBody = !!(j && Object.keys(j).length);
            const pathExists = hasBody && !(r.status === 404 && /not\s*found|no\s*route|InvalidEndpointOrModel/i.test(code + " " + msg));
            out.push({ path, bodyIdx: bi, httpStatus: r.status, code, message: String(msg).slice(0, 180), pathExists });
            // 경로가 확인되면 그 경로의 나머지 본문 변형만 더 보고 다음 경로로
            if (pathExists && r.status !== 404) break;
          } catch (e) { out.push({ path, bodyIdx: bi, httpStatus: 0, code: "", message: String((e && e.message) || e).slice(0, 120), pathExists: false }); }
        }
      }
      const hits = out.filter(x => x.pathExists);
      return json({ diag: "ark3d-path", model: mid,
        note: "본문이 있는 응답만 실제 경로로 셉니다(게이트웨이가 없는 경로에 빈 200 을 주기 때문). "
            + "400/422 는 '경로는 맞고 파라미터만 부족' 이라는 뜻이며 작업은 생성되지 않습니다(무과금).",
        찾은경로: hits.map(x => x.path + " [" + x.httpStatus + (x.code ? " " + x.code : "") + "] " + x.message),
        전체: out });
    }

    /* ══ ModelArk 작업 조회 (읽기 전용·무과금) ══
       /api/generate?diag=ark-task&id=cgt-...
       이미 만들어진 작업의 상태와 결과 형식을 그대로 본다. GET 이라 아무것도 생성되지 않는다.
       3D 응답이 어떤 필드에 결과 URL 을 담는지 확인하는 용도. */
    if (u.searchParams.get("diag") === "ark-task") {
      if (!k.seedance) return json({ diag: "ark-task", error: "Seedance_API_KEY 미설정" });
      const id = String(u.searchParams.get("id") || "").trim();
      if (!id) return json({ diag: "ark-task", error: "id 파라미터가 필요합니다 (예: &id=cgt-...)" });
      try {
        const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks/" + encodeURIComponent(id),
          { headers: { "Authorization": "Bearer " + k.seedance } }, 15000);
        const t = await r.text(); let j2 = null; try { j2 = JSON.parse(t); } catch { /* 비JSON */ }
        return json({ diag: "ark-task", id, httpStatus: r.status,
          note: "GET 조회라 생성·과금이 없습니다. 결과 URL 이 어느 필드에 오는지 확인하세요.",
          응답: j2 || String(t).slice(0, 1200) });
      } catch (e) { return json({ diag: "ark-task", id, error: String((e && e.message) || e).slice(0, 200) }); }
    }

    /* ══ FLUX / BFL 정밀 진단 (무과금) ══
       /api/generate?diag=flux-check
       probe-all 은 "키가 거부됐다" 와 "그 모델만 없다" 를 구분하지 못한다(둘 다 실패로 보인다).
       여기서는 셋을 따로 확인해 원인을 확정한다.
        1) 키 자체가 유효한가  — GET /v1/get_result?id=<존재하지 않는 UUID>  (읽기 전용)
                                 401/403 → 키 문제,  그 외 → 키는 통과
        2) 헤더 방식           — x-key 와 Authorization: Bearer 둘 다 시도(계정마다 다르다)
        3) 모델별 접근 권한    — output_format 에 존재하지 않는 열거값을 넣어 422 로 끊는다.
                                 (빈 프롬프트는 BFL 이 수락해 실제 과금 작업이 생긴다 — 절대 쓰지 말 것)
       응답 본문을 자르지 않고 그대로 싣는다. 우리 해석이 아니라 BFL 원문으로 판단하기 위함이다. */
    if (u.searchParams.get("diag") === "flux-check") {
      if (!k.flux) return json({ diag: "flux-check", error: "FLUX/BFL 키 미설정" });
      const kv = String(k.flux);
      const shape = { length: kv.length, prefix: kv.slice(0, 4), suffix: kv.slice(-4),
                      looksUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kv),
                      hasWhitespace: /\s/.test(kv) };
      const call = async (url, headers, body) => {
        try {
          const r = await fetchT(url, body ? { method: "POST", headers, body: JSON.stringify(body) } : { headers }, 12000);
          const t = await r.text(); let j2 = null; try { j2 = JSON.parse(t); } catch { /* 비JSON */ }
          return { status: r.status, body: j2 || String(t).slice(0, 500) };
        } catch (e) { return { status: 0, body: String((e && e.message) || e).slice(0, 200) }; }
      };
      const HX = { "x-key": kv, "Content-Type": "application/json", "accept": "application/json" };
      const HB = { "Authorization": "Bearer " + kv, "Content-Type": "application/json", "accept": "application/json" };
      const DEAD = "00000000-0000-0000-0000-000000000000";
      // 1) 인증 확인 — 읽기 전용. 작업이 없으므로 아무것도 생성/과금되지 않는다.
      const [authX, authB] = await Promise.all([
        call(FLUX_BASE + "get_result?id=" + DEAD, HX),
        call(FLUX_BASE + "get_result?id=" + DEAD, HB),
      ]);
      const authOK = (a) => a.status !== 401 && a.status !== 403 && a.status !== 0;
      const useHdr = authOK(authX) ? HX : (authOK(authB) ? HB : HX);
      const hdrName = authOK(authX) ? "x-key" : (authOK(authB) ? "Authorization: Bearer" : "(둘 다 거부됨)");
      // 3) 모델별 — 잘못된 열거값이라 검증 단계에서 반려된다(작업 미생성).
      const per = await Promise.all(Object.entries(FLUX_ENDPOINTS).map(async ([name, ep]) => {
        const x = await call(FLUX_BASE + ep, useHdr, { prompt: "probe", output_format: "__probe_invalid__" });
        const created = x.status >= 200 && x.status < 300;
        const verdict =
          created                          ? "⚠️ 작업이 생성됨 — 진단에서 제외해야 함"
          : x.status === 422 || x.status === 400 ? "✅ 소환 가능 (검증 반려 = 모델 존재)"
          : x.status === 401               ? "❌ 인증 실패 — 키가 잘못됨"
          : x.status === 402               ? "❌ 크레딧 부족 — BFL 계정 충전 필요"
          : x.status === 403               ? "❌ 접근 거부 — 이 모델에 대한 권한 없음(플랜/약관 동의 필요)"
          : x.status === 404               ? "❌ 엔드포인트 없음 — 모델 ID 폐지/오타"
          : x.status === 429               ? "⚠️ 요청 한도 초과 — 잠시 후 재시도"
          :                                  "❓ 예상 밖 응답";
        return { model: name, endpoint: ep, httpStatus: x.status, 판정: verdict, 응답: x.body };
      }));
      /* 4) 파라미터를 "정말 읽는가" — 무시되는 필드를 잡아낸다.
         1차 시도는 잘못된 방법이었다. 올바른 값(width:1344 / aspect_ratio:"16:9")을 넣고
         "오류가 안 났으니 수용됐다" 고 판정했는데, BFL 은 모르는 필드를 반려하지 않고
         그냥 버린다(extra=ignore). 그래서 aspect_ratio 전용인 1.1-ultra 에서조차
         width/height 가 "수용됨" 으로 나왔다 — 무시와 수용을 구분하지 못한 것이다.

         그래서 값을 "일부러 틀리게" 넣는다. 엔드포인트가 그 필드를 실제로 파싱한다면
         반드시 그 필드 이름이 담긴 검증 오류가 돌아온다. 파싱하지 않고 버린다면
         output_format 오류만 온다. 이 차이로 무시 여부가 확정된다.
         output_format 을 항상 틀리게 두므로 어느 쪽이든 작업은 생성되지 않는다.

         이게 중요한 이유: 지금 코드는 FLUX.2(max/pro/flex)에 width/height 를 보낸다.
         이 계열이 aspect_ratio 전용이라면 비율 지정이 통째로 무시되고 전부 기본 비율로
         나온다 — 나노바나나에서 겪은 것과 같은 유형의 버그다. */
      /* ※ 이 방법의 한계도 적어 둔다. 제약이 걸린 필드(숫자 범위·열거형)에만 통한다.
         자유 문자열 필드는 틀린 값을 넣어도 검증기가 잡지 않을 수 있어, "오류가 없다" 가
         "무시된다" 를 뜻하지 않는다. aspect_ratio 는 형식이 맞되 범위를 벗어난 값
         ("100:1") 을 써서 의미 검증기라도 걸리게 한다. */
      const FIELD_CASES = [
        // ① 하한 확인 — 파싱한다면 width/height 오류가 뜬다
        { 이름: "width/height 하한", 필드: ["width", "height"], extra: { width: 7, height: 7 } },
        // ② 32의 배수 제약이 있는지 — 하한은 넘되 32로 나눠지지 않는 값
        { 이름: "width/height 32배수", 필드: ["width", "height"], extra: { width: 1000, height: 1000 } },
        // ③ 상한이 몇인지 — 오류 메시지의 le/lt 값으로 드러난다
        { 이름: "width/height 상한", 필드: ["width", "height"], extra: { width: 99999, height: 99999 } },
        // ④ 비율 — 형식은 맞되 범위를 벗어난 값
        { 이름: "aspect_ratio 범위", 필드: ["aspect_ratio"], extra: { aspect_ratio: "100:1" } },
      ];
      const paramCheck = await Promise.all(
        Object.entries(FLUX_ENDPOINTS).map(async ([name, ep]) => {
          const rows = await Promise.all(FIELD_CASES.map(async (c) => {
            const x = await call(FLUX_BASE + ep, useHdr,
              Object.assign({ prompt: "probe", output_format: "__probe_invalid__" }, c.extra));
            const det = JSON.stringify((x.body && x.body.detail) || x.body || "");
            // 검증 오류의 loc 안에 그 필드 이름이 있으면 = 실제로 읽고 있다.
            const parsed = c.필드.some(kf => new RegExp('"' + kf + '"').test(det));
            const created = x.status >= 200 && x.status < 300;
            return { 필드: c.이름, httpStatus: x.status,
                     판정: created ? "⚠️ 작업 생성됨(진단 제외)"
                          : parsed ? "✅ 이 필드로 오류가 났다 = 실제로 읽는다"
                          : (x.status === 422 || x.status === 400) ? "· 이 필드에 대한 불만 없음"
                          : "❓ " + x.status,
                     상세: det.slice(0, 700) };
          }));
          const P = (r) => /실제로 읽는다/.test(r.판정);
          const whRead = P(rows[0]) || P(rows[1]) || P(rows[2]);
          const arRead = P(rows[3]);
          const 결론 =
            whRead && !arRead ? "width/height 로 지정한다"
            : !whRead && arRead ? "aspect_ratio 로 지정한다"
            : whRead && arRead ? "둘 다 읽는다"
            : "width/height 를 읽지 않는다 → aspect_ratio 방식 (자유 문자열이라 오류로는 확인 불가)";
          // 현재 코드가 이 엔드포인트에 실제로 무엇을 보내는지 함께 싣는다(대조용).
          const sent = buildFluxPayload({ model: name, prompt: "x", ratio: "16:9" });
          const 우리가보내는것 = Object.keys(sent.body).filter(kf => /^(width|height|aspect_ratio)$/.test(kf)).join(", ") || "(비율 필드 없음)";
          return { model: name, endpoint: ep, 결론, 우리가보내는것, 검사: rows };
        }));

      /* ── 아직 안 쓰는 BFL 엔드포인트 탐색 ──
         가격 페이지에 FLUX 3 · FLUX.2 klein · Outpainting · Eraser · VTO 가 보였다.
         우리 목록에 없는 것들이라 실재하는지 확인한다. output_format 을 틀리게 두므로
         있으면 422(검증 반려), 없으면 404 다 — 어느 쪽이든 작업은 생기지 않는다. */
      const CANDIDATES = [
        "flux-3", "flux-3-pro", "flux-3-max",
        "flux-2-klein", "flux-2-klein-4b", "flux-2-klein-9b", "flux-2-dev",
        "flux-pro-1.0-fill", "flux-pro-1.0-expand", "flux-pro-1.0-canny", "flux-pro-1.0-depth",
        "flux-outpainting", "flux-eraser", "flux-vto", "flux-fill", "flux-expand",
      ];
      const known = new Set(Object.values(FLUX_ENDPOINTS));
      const 미사용탐색 = await Promise.all(CANDIDATES.filter(ep => !known.has(ep)).map(async (ep) => {
        const x = await call(FLUX_BASE + ep, useHdr, { prompt: "probe", output_format: "__probe_invalid__" });
        const created = x.status >= 200 && x.status < 300;
        return { endpoint: ep, httpStatus: x.status,
          판정: created ? "⚠️ 작업 생성됨(진단 제외)"
               : (x.status === 422 || x.status === 400) ? "✅ 있음 — 우리 목록에 없는 모델"
               : x.status === 404 ? "· 없음"
               : x.status === 403 ? "❌ 권한 없음(플랜 필요)"
               : "❓ " + x.status,
          응답: typeof x.body === "string" ? x.body.slice(0, 120) : JSON.stringify(x.body).slice(0, 200) };
      }));

      return json({ diag: "flux-check",
        note: "전부 읽기 전용이거나 '존재하지 않는 열거값' 요청이라 생성물·과금이 없습니다.",
        미사용탐색: 미사용탐색.filter(x => !/· 없음/.test(x.판정)).length
          ? 미사용탐색 : [{ 결과: "후보 " + 미사용탐색.length + "개 모두 없음(404) — 추가할 것 없음" }],
        파라미터수용: paramCheck,
        키형태: shape,
        인증확인: { 사용헤더: hdrName,
                    "x-key": { httpStatus: authX.status, 응답: authX.body },
                    "Bearer": { httpStatus: authB.status, 응답: authB.body },
                    결론: hdrName === "(둘 다 거부됨)"
                      ? "키가 BFL 에서 거부됩니다 — 키 자체를 다시 발급/설정해야 합니다."
                      : "키는 인증을 통과합니다 — 아래 모델별 결과가 실제 원인입니다." },
        모델별: per });
    }

    /* ══ ModelArk 계정 요금 정보 탐색 (읽기 전용·무과금) ══
       /api/generate?diag=ark-price
       BytePlus 문서는 자바스크립트로 그려서 서버가 표를 읽을 수 없다. 대신 계정 API 에
       단가·사용량 정보가 있는지 GET 으로만 훑는다. 있으면 문서보다 정확하다 —
       추정값이 아니라 이 계정에 실제로 적용되는 값이기 때문이다. */
    if (u.searchParams.get("diag") === "ark-price") {
      if (!k.seedance) return json({ diag: "ark-price", error: "Seedance_API_KEY 미설정" });
      const H = { "Authorization": "Bearer " + k.seedance };
      const paths = ["/models?page_size=200", "/billing/price", "/prices", "/pricing",
                     "/account/balance", "/billing/balance", "/usage", "/billing/usage"];
      const rows = await Promise.all(paths.map(async (path) => {
        try {
          const r = await fetchT(ARK_HOSTS.bp + path, { headers: H }, 10000);
          const t = await r.text(); let j2 = null; try { j2 = JSON.parse(t); } catch { /* 비JSON */ }
          // 모델 목록은 너무 길다 — 단가로 보이는 필드가 있는지만 본다
          const hasPrice = /price|cost|billing|unit_price|rate/i.test(t);
          return { path, httpStatus: r.status, 단가정보포함: hasPrice,
                   응답: path.indexOf("/models") === 0 ? (hasPrice ? String(t).slice(0, 1500) : "(단가 필드 없음)")
                                                       : (j2 || String(t).slice(0, 600)) };
        } catch (e) { return { path, httpStatus: 0, 응답: String((e && e.message) || e).slice(0, 120) }; }
      }));
      const hit = rows.filter(x => x.httpStatus === 200 && x.단가정보포함);
      return json({ diag: "ark-price",
        note: "GET 조회만 합니다 — 생성·과금이 없습니다.",
        결론: hit.length ? "단가로 보이는 정보가 있는 경로: " + hit.map(x => x.path).join(", ")
                        : "계정 API 에서 단가 정보를 찾지 못했습니다 — 콘솔 가격표를 직접 봐야 합니다.",
        시도: rows });
    }

    /* ══ 제공사 단가 한 번에 모아 읽기 (읽기 전용·무과금) ══
       /api/generate?diag=prices

       왜 필요한가: 개발 환경에서는 제공사 문서가 전부 403 이라 내가 직접 못 본다.
       검색으로는 값이 서로 어긋난다 — Veo 만 해도 $0.40/초 와 토큰 기준 $0.10/초 가
       같이 나오고, 씨댄스는 $0.045 · $0.03 · $0.01 세 가지가 돌아다닌다. 그런 값으로
       청구를 바꾸면 루마 때처럼 건당 손실이 난다. 배포된 서버는 문서를 읽을 수 있으므로
       여러 곳을 한 번에 받아 "단가로 보이는 줄" 만 추려 준다. 주소를 하나씩 넣을 필요가 없다. */
    if (u.searchParams.get("diag") === "prices") {
      /* 한 곳당 주소를 여러 개 둔다 — 첫 번째가 404 이거나 자바스크립트로 그리는 문서면
         다음 후보로 넘어간다. 지난 실행에서 런웨이는 404, 클링·미니맥스·BFL 은 본문이
         1~2KB 짜리 껍데기였다. 문서 도구를 만들었으면 그 실패도 도구가 흡수해야 한다. */
      const TARGETS = [
        { 제공사: "Google Veo · 나노바나나", 말: ["Veo", "Nano Banana", "Imagen"], 넓게: ["Veo"],
          urls: ["https://ai.google.dev/gemini-api/docs/pricing"] },
        /* FLUX.2 는 "장당" 이 아니라 메가픽셀 단가다(입력 레퍼런스도 과금). 표 전체가 필요하다. */
        { 제공사: "BFL Flux", 말: ["per image", "FLUX", "megapixel"], 넓게: ["megapixel", "FLUX.2"],
          urls: ["https://docs.bfl.ai/quick_start/pricing.md", "https://docs.bfl.ml/quick_start/pricing.md",
                 "https://docs.bfl.ai/quick_start/pricing", "https://docs.bfl.ml/quick_start/pricing",
                 "https://docs.bfl.ai/pricing.md", "https://bfl.ai/pricing"] },
        /* 미니맥스 — 문서 사이트가 자바스크립트로 그려서 본문이 1~2KB 껍데기로만 온다.
           BFL 이 .md 로 성공했듯 정적 원문을 주는 주소를 먼저 시도한다. */
        { 제공사: "MiniMax Hailuo", 말: ["Hailuo", "video", "price"], 넓게: ["Hailuo"],
          urls: ["https://platform.minimax.io/document/price.md", "https://platform.minimaxi.com/document/price.md",
                 "https://platform.minimax.io/docs/price", "https://platform.minimax.io/document/price",
                 "https://platform.minimaxi.com/document/price", "https://www.minimax.io/price"] },
        /* 런웨이 — 실제 단가 페이지는 /guides/pricing/ 이다(루트는 목차만 온다) */
        { 제공사: "Runway", 말: ["credit", "Gen-4", "aleph", "per second"], 넓게: ["credit"],
          urls: ["https://docs.dev.runwayml.com/guides/pricing.md", "https://docs.dev.runwayml.com/guides/pricing/",
                 "https://docs.dev.runwayml.com/guides/pricing", "https://docs.dev.runwayml.com/llms.txt",
                 "https://docs.dev.runwayml.com/pricing"] },
        /* 클링 — /global/dev/pricing 은 74바이트 리다이렉트 껍데기였다. 다른 경로를 넓게 시도. */
        { 제공사: "Kling", 말: ["price", "credit", "point", "点"], 넓게: ["point", "master"],
          urls: ["https://app.klingai.com/global/docs/point-policy", "https://klingai.com/document-api/pricing/base/video",
                 "https://app.klingai.com/global/dev/document-api/productBilling/prePaidResourcePackage",
                 "https://docs.qingque.cn/d/home/eZQDvbNVLLlvsdM4SLmfhLcNn", "https://klingai.com/global/dev/pricing"] },
        /* BytePlus — 문서가 자바스크립트로 그려진다(본문에 "Copy Page" 만 온다). 원문 주소를 먼저. */
        { 제공사: "BytePlus ModelArk (씨댄스·씨드림)", 말: ["Seedance", "Seedream", "price", "per second"],
          넓게: ["Seedance", "Seedream"],
          urls: ["https://docs.byteplus.com/en/docs/ModelArk/Pricing.md", "https://docs.byteplus.com/en/docs/ModelArk/llms.txt",
                 "https://docs.byteplus.com/en/docs/ModelArk/1099320", "https://www.byteplus.com/en/product/modelark/pricing",
                 "https://docs.byteplus.com/en/docs/ModelArk/Pricing"] },
      ];
      const fetchText = async (url) => {
        const r = await fetchT(url, { headers: { "accept": "text/html,text/markdown", "user-agent": "Mozilla/5.0" } }, 15000);
        const raw = await r.text();
        return { status: r.status, raw };
      };
      const grab = async (t) => {
        try {
          // 후보를 순서대로 시도해 "실제 본문이 있는" 첫 응답을 쓴다
          let picked = null;
          for (const url of t.urls) {
            let got; try { got = await fetchText(url); } catch (_e) { continue; }
            const plain = got.raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            if (got.status === 200 && plain.length > 3000) { picked = { url, ...got }; break; }
            if (!picked && got.status === 200) picked = { url, ...got };   // 예비
          }
          if (!picked) return { 제공사: t.제공사, 시도한주소: t.urls, 결과: "전부 실패" };
          const r = { status: picked.status }; const raw = picked.raw; t.url = picked.url;
          const text = raw.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
            .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
          const spa = /enable JavaScript|__NEXT_DATA__/i.test(raw) && text.length < 6000;
          // "$0.40" 처럼 값이 있는 줄만 추린다 — 전체를 실으면 응답이 감당이 안 된다
          const priceLines = [...new Set((text.match(/[^\n]{0,120}\$\s?\d[\d.,]*\s?[^\n]{0,120}/g) || []))]
            .filter((ln) => t.말.some((w) => new RegExp(w, "i").test(ln)) || /per (second|image|video|clip|megapixel)/i.test(ln))
            .slice(0, 40);
          /* 단가 한 줄만 봐서는 어느 모델·해상도인지 모른다 — Veo 가 그랬다
             ("720p 초당 $0.10" 만 나오고 1080p·4K·모델 구분이 없었다).
             그래서 지정한 말 주변은 넓게(3,000자) 떠서 표 전체가 보이게 한다. */
          let 넓게본문 = undefined;
          if (t.넓게 && t.넓게.length) {
            넓게본문 = {};
            for (const w of t.넓게) {
              const hits = []; const re = new RegExp(w, "gi"); let m3, guard = 0;
              while ((m3 = re.exec(text)) && guard++ < 4) {
                hits.push(text.slice(Math.max(0, m3.index - 300), m3.index + 3000));
                re.lastIndex = m3.index + 3000;
              }
              넓게본문[w] = hits.length ? hits : "(못 찾음)";
            }
          }
          return { 제공사: t.제공사, url: t.url, httpStatus: r.status, 전체길이: text.length,
                   자바스크립트로그리는문서: spa || undefined,
                   단가로보이는줄: priceLines.length ? priceLines : "(못 찾음 — 이 문서에서는 값을 추릴 수 없습니다)",
                   넓게본문 };
        } catch (e) { return { 제공사: t.제공사, 시도한주소: t.urls, httpStatus: 0, 오류: String((e && e.message) || e).slice(0, 140) }; }
      };
      const rows = await Promise.all(TARGETS.map(grab));
      return json({ diag: "prices",
        note: "문서를 GET 으로만 읽습니다 — 생성·과금이 없습니다.",
        // 대조 편하도록 우리 표에서 직접 읽어 싣는다(외워서 적으면 여기서부터 틀어진다)
        현재우리단가: Object.keys(MODEL_COST_SRV || {})
          .reduce((o, n) => { const m = MODEL_COST_SRV[n] || {};
            o[n] = (m.u === "sec" ? "초당 $" + m.usd + (m.audio ? " + 오디오 초당 $" + m.audio : "")
                                  : "1" + (m.u === "img" ? "장" : m.u === "3d" ? "개" : "회") + "당 $" + m.usd);
            return o; }, {}),
        결과: rows });
    }

    /* ══ 제공사 문서 대신 읽어오기 (읽기 전용·무과금) ══
       /api/generate?diag=doc&url=https://docs.agents.lumalabs.ai/...

       왜 필요한가: 개발 환경에서 제공사 문서 사이트가 전부 403 으로 막혀 있어
       규격을 확인할 수 없다. 배포된 서버는 막히지 않으므로 서버가 대신 읽어 준다.
       그러면 추측 대신 문서 원문으로 구현할 수 있다.

       열린 프록시가 되지 않도록 호스트를 제공사 문서 도메인으로만 제한한다.
       (진단 자체가 관리자 전용이지만, 그것만 믿지 않고 한 겹 더 둔다.) */
    if (u.searchParams.get("diag") === "doc") {
      const target = String(u.searchParams.get("url") || "").trim();
      if (!target) return json({ diag: "doc", error: "url 파라미터가 필요합니다" });
      let host = "";
      try { const t = new URL(target); if (t.protocol !== "https:") throw 0; host = t.hostname; }
      catch { return json({ diag: "doc", error: "https URL 이 아닙니다" }); }
      const ALLOW = /(^|\.)(lumalabs\.ai|bfl\.ai|byteplus\.com|volcengine\.com|klingai\.com|minimax\.io|minimaxi\.com|runwayml\.com|x\.ai|openai\.com|google\.dev|fal\.ai|elevenlabs\.io)$/i;
      if (!ALLOW.test(host)) return json({ diag: "doc", error: "허용되지 않은 호스트입니다: " + host, 허용: ALLOW.source });
      try {
        const r = await fetchT(target, { headers: { "accept": "text/html,application/json", "user-agent": "Mozilla/5.0" } }, 15000);
        const t = await r.text();
        // HTML 이면 태그를 걷어내 본문만 남긴다(문서 페이지가 대부분 HTML 이라 그대로면 읽기 어렵다)
        const isHtml = /^\s*</.test(t);
        const text = isHtml
          ? t.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
             .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
             .replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
             .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim()
          : t;
        // 문서 안의 링크도 같이 뽑아 준다 — 다음에 어느 페이지를 볼지 정하기 위해
        const links = isHtml ? [...new Set((t.match(/href="([^"]+)"/g) || [])
          .map(x => x.slice(6, -1)).filter(x => /^(https?:|\/)/.test(x)))].slice(0, 60) : [];
        /* 문서 사이트가 자바스크립트로 본문을 그리면 받아온 HTML 에는 껍데기만 있다
           (BytePlus 가 그렇다 — "You need to enable JavaScript" 만 오고 표가 없다).
           그걸 본문으로 착각해 "읽었다" 고 하면 안 되므로, 신호를 보고 사실대로 말한다.
           같은 페이지라도 .md 판본이 따로 있는 경우가 많아(루마가 그랬다) 그것도 시도한다. */
        const spa = /enable JavaScript|noscript|__NEXT_DATA__/i.test(t) && text.length < 6000;
        let mdText = null;
        if (spa) {
          const mdUrl = target.replace(/\/+$/, "") + "/index.md";
          try {
            const r2 = await fetchT(mdUrl, { headers: { "accept": "text/markdown,text/plain" } }, 12000);
            if (r2.ok) { const t2 = await r2.text(); if (t2 && !/^\s*</.test(t2)) mdText = t2.slice(0, 12000); }
          } catch (_e) { /* 없으면 그만 */ }
        }
        /* 긴 문서는 앞 12,000자에서 잘려 정작 필요한 표가 안 보인다(구글 가격표가 55KB 였다).
           q= 로 찾을 말을 주면 그 주변만 잘라 준다. 여러 개는 쉼표로 구분한다. */
        const q = String(u.searchParams.get("q") || "").trim();
        let 발췌 = undefined;
        if (q) {
          const terms = q.split(",").map((x) => x.trim()).filter(Boolean);
          발췌 = {};
          for (const term of terms) {
            const hits = [];
            const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            let m2, guard = 0;
            while ((m2 = re.exec(text)) && guard++ < 8) {
              hits.push(text.slice(Math.max(0, m2.index - 200), m2.index + 1600));
              re.lastIndex = m2.index + 1600;        // 겹치지 않게 건너뛴다
            }
            발췌[term] = hits.length ? hits : "(이 문서에서 못 찾음)";
          }
        }
        return json({ diag: "doc", url: target, httpStatus: r.status,
          자바스크립트로그리는문서: spa || undefined,
          발췌,
          전체길이: text.length,
          안내: spa && !mdText
            ? "이 문서는 본문을 자바스크립트로 그려서 서버가 받아온 HTML 에는 표가 없습니다. 화면에서 직접 복사해 주셔야 합니다."
            : undefined,
          마크다운판본: mdText || undefined,
          본문: q ? "(발췌 모드 — 위 발췌만 실었습니다)" : text.slice(0, 12000), 링크: q ? undefined : links });
      } catch (e) { return json({ diag: "doc", url: target, error: String((e && e.message) || e).slice(0, 200) }); }
    }

    /* ══ Luma 정밀 진단 (무과금) ══
       /api/generate?diag=luma-check
       probe-all 에서 403 이 났는데, 403 은 "키 없음" 이 아니라 "인증은 됐지만 거부" 다.
       읽기 전용 목록 조회로 키 유효성부터 가른다 — 생성 호출이 아니라 과금이 없다. */
    if (u.searchParams.get("diag") === "luma-check") {
      if (!k.luma) return json({ diag: "luma-check", error: "LUMA_API_KEY 미설정 — 값 자체가 없습니다" });
      const kv = String(k.luma);
      const call = async (path, body) => {
        try {
          const h = { "Authorization": "Bearer " + kv, "accept": "application/json", "Content-Type": "application/json" };
          const r = await fetchT(LUMA_BASE + path, body ? { method: "POST", headers: h, body: JSON.stringify(body) } : { headers: h }, 12000);
          const t = await r.text(); let j2 = null; try { j2 = JSON.parse(t); } catch { /* 비JSON */ }
          return { status: r.status, body: j2 || String(t).slice(0, 400) };
        } catch (e) { return { status: 0, body: String((e && e.message) || e).slice(0, 200) }; }
      };
      // 읽기 전용: 생성 목록 1건 조회. 키가 살아 있으면 200(빈 배열이어도), 죽었으면 401/403.
      const list = await call("/generations?limit=1");
      /* 403 "Not authenticated" 는 보통 "자격증명 자체를 못 읽었다" 는 뜻이다
         (계정 거부라면 보통 다른 문구가 온다). 헤더 방식이 틀린 것인지, 키가 죽은 것인지
         가르기 위해 다른 표기법도 읽기 전용으로 시도한다. 전부 GET 이라 과금이 없다. */
      /* 프로젝트 ID — 루마 콘솔에 프로젝트 ID 라는 값이 있다. 이게 API 호출에 필요한지는
         문서를 못 봐서 단정할 수 없으므로, 추측 대신 실제로 시도해 본다.
         Luma_PROJECT_ID 환경변수를 넣어 두면 아래 표기법들을 전부 읽기 전용으로 시험하고,
         그중 200 이 나오는 게 있으면 그 방식을 실제 호출에도 반영하면 된다.
         값이 없으면 이 시험은 건너뛴다(그 자체로 "안 넣어도 되는지" 는 판정 못 함). */
      /* 환경변수 이름은 대소문자·밑줄 표기가 조금만 달라도 pick() 이 못 찾는다.
         (Luma_PROJECT_ID / LUMA_PROJECT_ID / luma_project_id 만 후보였다.)
         정규화해서(소문자·밑줄 제거) 비교하면 LumaProjectId·LUMA-PROJECT-ID 도 잡힌다. */
      const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
      const projKey = Object.keys(env || {}).find(n => norm(n) === "lumaprojectid" && env[n]);
      const proj = projKey ? String(env[projKey]).trim() : null;
      // 값은 절대 싣지 않고 "이름" 만 보여 준다 — 어떤 이름으로 들어가 있는지 확인용.
      const envNames = Object.keys(env || {})
        .filter(n => /luma|proj/i.test(n))
        .map(n => n + (env[n] ? " (값 있음)" : " (값 비어 있음)"));
      const projCases = proj ? [
        { 이름: "헤더 X-Project-Id",  h: { "Authorization": "Bearer " + kv, "X-Project-Id": proj } },
        { 이름: "헤더 Luma-Project-Id", h: { "Authorization": "Bearer " + kv, "Luma-Project-Id": proj } },
        { 이름: "헤더 X-Luma-Project", h: { "Authorization": "Bearer " + kv, "X-Luma-Project": proj } },
        { 이름: "쿼리 project_id",    h: { "Authorization": "Bearer " + kv }, q: "&project_id=" + encodeURIComponent(proj) },
      ] : [];
      const hdrVariants = await Promise.all([
        { 이름: "Authorization: Bearer <key>", h: { "Authorization": "Bearer " + kv } },
        { 이름: "Authorization: <key> (Bearer 없음)", h: { "Authorization": kv } },
        { 이름: "x-api-key", h: { "x-api-key": kv } },
        { 이름: "x-api-key + Bearer 동시", h: { "x-api-key": kv, "Authorization": "Bearer " + kv } },
        ...projCases,
      ].map(async (v) => {
        try {
          const r = await fetchT(LUMA_BASE + "/generations?limit=1" + (v.q || ""),
            { headers: Object.assign({ "accept": "application/json" }, v.h) }, 12000);
          const t = await r.text(); let j2 = null; try { j2 = JSON.parse(t); } catch { /* 비JSON */ }
          return { 방식: v.이름, httpStatus: r.status, 응답: j2 || String(t).slice(0, 200) };
        } catch (e) { return { 방식: v.이름, httpStatus: 0, 응답: String((e && e.message) || e).slice(0, 120) }; }
      }));
      /* ── 어느 주소가 이 키를 받아주는가 (읽기 전용·무과금) ──
         대시보드가 ray-3.2 / uni-1 을 쓴다고 알려 준다. 우리 코드는 ray-2 계열을
         구세대 dream-machine/v1 에 보내고 있었다 — 키가 새 API 용이면 인증부터 막힌다.
         결제 문제로 본 앞선 판단은 틀렸다(잔액 $10, Add funds 완료 상태였다).
         그래서 주소 후보를 GET 으로만 훑어 어디가 200 을 주는지 찾는다. */
      /* 회원이 알려 준 문서 주소가 docs.agents.lumalabs.ai 다 — 우리가 두드리던
         api.lumalabs.ai 와 다른 호스트다. ray-3.2·uni-1 은 이 새 API 의 모델일 가능성이
         크다. agents 계열 호스트를 후보에 넣는다. */
      const BASES = [
        "https://api.lumalabs.ai/dream-machine/v1",
        "https://api.lumalabs.ai/dream-machine/v2",
        "https://api.lumalabs.ai/v1",
        "https://api.lumalabs.ai/v2",
        "https://api.lumalabs.ai/api/v1",
        "https://api.luma.ai/v1",
        // ── agents 계열 ──
        "https://api.agents.lumalabs.ai/v1",
        "https://api.agents.lumalabs.ai",
        "https://agents.lumalabs.ai/api/v1",
        "https://agents.lumalabs.ai/v1",
        "https://api.lumalabs.ai/agents/v1",
      ];
      const PATHS = ["/generations?limit=1", "/generations/video?limit=1", "/generations/image?limit=1", "/models", "/credits",
        // 프로젝트가 경로에 들어가는 형태일 수도 있다
        ...(proj ? ["/projects/" + encodeURIComponent(proj) + "/generations?limit=1"] : [])];
      const baseProbe = [];
      for (const base of BASES) for (const path of PATHS) {
        baseProbe.push((async () => {
          const h = { "Authorization": "Bearer " + kv, "accept": "application/json" };
          if (proj) h["X-Project-Id"] = proj;
          try {
            const r = await fetchT(base + path, { headers: h }, 8000);
            const t = await r.text(); let j2 = null; try { j2 = JSON.parse(t); } catch { /* 비JSON */ }
            return { 주소: base + path, httpStatus: r.status, 응답: j2 || String(t).slice(0, 120) };
          } catch (e) { return { 주소: base + path, httpStatus: 0, 응답: String((e && e.message) || e).slice(0, 80) }; }
        })());
      }
      /* 앞 버전은 404 행을 걸러 냈는데, 그 바람에 "어떤 주소가 존재조차 안 하는지" 가
         응답에서 사라져 판단 근거가 잘렸다. 전부 싣고, 대신 상태코드별로 묶어 보여 준다. */
      const allRows = await Promise.all(baseProbe);
      const byStatus = {};
      allRows.forEach(x => { (byStatus[x.httpStatus] = byStatus[x.httpStatus] || []).push(x.주소); });
      const baseRows = allRows.filter(x => x.httpStatus !== 404);   // 상세는 404 제외(요약에는 남는다)
      const baseOK = baseRows.find(x => x.httpStatus === 200);
      const anyOK = hdrVariants.find(v => v.httpStatus === 200);
      const per = await Promise.all(Object.entries(LUMA_IDS).map(async ([name, id]) => {
        // 실제 빌더가 만드는 본문 그대로 보내되 prompt 만 비운다 — 그래야 "우리가 진짜 보내는 요청"
        //  을 시험한다. (예전엔 {model,prompt:""} 를 직접 만들어 보내, ray-3.2 가 영상 모델인데도
        //   type 이 빠져 "Type 'image' is not supported" 라는 엉뚱한 오류가 났다.)
        const probeBody = buildLumaPayload({ model: name, prompt: "", ratio: "16:9", seconds: 5, res: "720p" });
        const x = await call("/generations", probeBody);
        const created = !!(x.body && x.body.id);
        const verdict =
          created                                ? "⚠️ 작업이 생성됨 — 진단에서 제외해야 함"
          : x.status === 400 || x.status === 422  ? "✅ 소환 가능 (파라미터 반려 = 모델 존재)"
          : x.status === 401                      ? "❌ 인증 실패 — 키가 잘못됨/만료"
          : x.status === 402                      ? "❌ 크레딧 부족"
          : x.status === 403                      ? "❌ 자격증명 거부 — 위 '키유효성' 의 결론을 보세요(모델 문제가 아닙니다)"
          : x.status === 404                      ? "❌ 모델 ID 없음"
          :                                         "❓ 예상 밖 응답";
        return { model: name, id, httpStatus: x.status, 판정: verdict, 응답: x.body };
      }));
      return json({ diag: "luma-check",
        note: "목록 조회는 읽기 전용, 모델 확인은 prompt 를 비운 반려 요청입니다. 생성물·과금이 없습니다.",
        키형태: { length: kv.length, prefix: kv.slice(0, 6), suffix: kv.slice(-4), hasWhitespace: /\s/.test(kv) },
        프로젝트ID: proj
          ? { 설정됨: true, 읽은변수이름: projKey, 값앞자리: String(proj).slice(0, 8) + "…",
              안내: "아래 '헤더방식별' 에서 프로젝트 ID 를 붙인 4가지 표기법 결과를 보세요. 200 이 나오는 게 있으면 그 방식이 정답입니다." }
          : { 설정됨: false,
              루마·proj가들어간환경변수이름: envNames.length ? envNames : "(하나도 없음)",
              안내: envNames.length
                ? "비슷한 이름은 있는데 'lumaprojectid' 로 정규화했을 때 일치하는 게 없습니다. 위 목록의 철자를 확인하세요."
                : "이 배포에 루마 관련 환경변수가 하나도 안 보입니다. Cloudflare Pages 는 환경변수를 배포 시점에 묶으므로, "
                  + "값을 넣은 뒤 재배포(또는 새 커밋)가 있어야 반영됩니다. 또 Production/Preview 환경을 각각 확인하세요." },
        주소탐색: { 결론: baseOK ? ("이 주소가 키를 받습니다 → " + baseOK.주소 + " · 여기에 맞춰 LUMA_BASE 와 모델 ID 를 바꿔야 합니다.")
                            : "시도한 주소 중 200 을 주는 곳이 없습니다 — 대시보드의 'show snippet' cURL 이 정확한 주소를 알려 줍니다.",
                    상태코드별요약: byStatus, 시도: baseRows },
        현재코드: { LUMA_BASE, 쓰는모델: LUMA_IDS,
                    비고: "Agents API 로 교체 완료. 구세대 dream-machine/v1 주소가 위 '주소탐색' 에 403 으로 남는 건 그 API 가 이 키를 모르기 때문이며 정상이다." },
        헤더방식별: hdrVariants,
        키유효성: { httpStatus: list.status, 응답: list.body,
          결론: list.status === 405
                ? "정상입니다. Agents API 의 /generations 는 POST 전용이라 GET 조회에는 405 가 옵니다(인증 거부가 아님). 실제 판정은 아래 '모델별' 을 보세요."
              : list.status === 200 ? "키는 유효합니다 — 모델별 결과가 실제 원인입니다."
              : anyOK ? ("헤더 표기법이 문제입니다 — '" + anyOK.방식 + "' 로 보내면 통과합니다. 코드를 그 방식으로 고쳐야 합니다.")
              : /not authenticated/i.test(JSON.stringify(list.body || ""))
                ? "자격증명이 거부됩니다. 지금까지 배제된 것: (1) 주소 — /generations 가 404 가 아니라 403 이므로 "
                  + "그 엔드포인트는 존재하고, v2·/v1·/api/v1 은 전부 404 라 살아 있는 API 는 여기뿐이다. "
                  + "(2) 헤더 전달 — 'Bearer 없음' 에서만 500 이 오므로 요청은 루마 앱까지 도달한다. "
                  + "(3) 키 — 서로 다른 키 두 개가 같은 결과였다. (4) 잔액·결제 — 대시보드에 $10 과 Add funds 완료가 확인됐다. "
                  + "남은 것은 프로젝트 ID 다. Luma_PROJECT_ID 가 비어 있으면 위 '헤더방식별' 의 프로젝트 표기법 4가지가 "
                  + "통째로 건너뛰어지므로, 그 값을 넣고 다시 실행해야 판정할 수 있다."
              : list.status === 401 ? "키가 잘못됐거나 만료됐습니다 — 재발급 필요."
              : "예상 밖 응답 — 아래 원문을 확인하세요." },
        모델별: per });
    }

    /* ⚠️ diag=ark3d-spec 은 제거했다.
       ModelArk 가 text:"" 를 반려하지 않고 수락해 실제 3D 작업이 생성됐다
       (cgt-20260728090647-cp2rb). "필수 필드를 비우면 반려된다" 는 전제가 이 제공사에서
       또 깨진 것이다(앞서 Flux 에서도 같은 일이 있었다).
       ── 그 작업을 조회한 결과(diag=ark-task)로 밝혀진 것 ──
         status: "failed", error.code: "InvalidParameter"
       즉 게이트웨이는 봉투(envelope)만 보고 접수했고, 모델 단계에서 반려됐다.
       따라서 "요청 형식을 확인했다" 고 말할 수 없다. 확인된 것은 이것뿐이다:
         · POST /contents/generations/tasks 경로와 { model, content:[...] } 봉투는 맞다
         · content:[{type:"text", text:""}] 만으로는 3D 생성에 부족하다(필수 파라미터 누락)
       Hyper3D 계열은 이미지→3D 가 기본이므로 image_url 이 필수일 가능성이 크지만,
       그것도 추측이다 — 유료 작업을 또 만들지 않고 확인할 방법으로만 좁혀야 한다.
       먼저 읽기 전용인 diag=ark-model 로 모델 정보에 입력 규격이 있는지 본다.
       앞으로 형식 탐색이 필요하면 "빈 값" 이 아니라 "존재하지 않는 열거값" 으로만 시도할 것.
       (빈 값은 접수돼 버린다는 것이 이 사고로 확정됐다.) */

    /* ══ ModelArk 모델 상태 대조 (읽기 전용·무과금) ══
       /api/generate?diag=ark-pricing

       처음엔 단가를 얻으려고 만들었는데, 계정 API(/models)는 단가를 주지 않는다
       — 응답에 price·cost·billing 계열 필드가 아예 없다(확인 완료). 문서도 자바스크립트로
       그려져 못 읽으니, BytePlus 단가는 콘솔에서 사람이 보는 수밖에 없다.

       대신 이 응답에는 단가보다 더 급한 게 들어 있다: 모델마다 status 가 있고
       "Shutdown" 인 것들이 실제로 있다. 우리가 쓰는 ID 가 아직 살아 있는지를 여기서 대조한다.
       (계정에 실제로 열려 있는 ID 목록도 함께 보여 줘, 표기가 바뀌었을 때 바로 갈아탈 수 있게 한다.) */
    if (u.searchParams.get("diag") === "ark-pricing") {
      if (!k.seedance) return json({ diag: "ark-pricing", error: "Seedance_API_KEY 미설정" });
      let cat = {}, raw = { httpStatus: 0, 바이트: 0 };
      try {
        const r = await fetchT(ARK_HOSTS.bp + "/models?page_size=200", { headers: { "Authorization": "Bearer " + k.seedance } }, 12000);
        const t = await r.text(); raw = { httpStatus: r.status, 바이트: t.length };
        const j = JSON.parse(t);
        for (const m of (j.data || [])) cat[m.id] = { status: m.status || "", domain: m.domain || "", task: (m.task_type || []).join("/") };
      } catch (e) { return json({ diag: "ark-pricing", 오류: String((e && e.message) || e).slice(0, 160) }); }

      // 우리가 쓰는 ID 후보 전체 — 첫 후보가 살아 있는지가 핵심이다
      const groups = { "씨댄스(영상)": SEEDANCE_IDS, "씨드림(이미지)": SEEDREAM_IDS, "3D": ARK3D_IDS };
      const rows = [];
      for (const [g, table] of Object.entries(groups)) {
        for (const [name, ids] of Object.entries(table)) {
          const hit = ids.map((id) => ({ id, 카탈로그: cat[id] ? (cat[id].status || "Active") : "없음" }));
          const live = hit.find((h) => h.카탈로그 !== "없음" && !/shutdown/i.test(h.카탈로그));
          rows.push({ 분류: g, 모델: name, 후보: hit,
                      판정: live ? (live.id === ids[0] ? "정상(첫 후보 사용)" : "⚠ 첫 후보가 죽음 → " + live.id + " 로 물러남")
                                 : "❌ 살아 있는 후보 없음" });
        }
      }
      // 계정에 실제로 열려 있는 영상·이미지·3D 계열 ID (표기가 바뀌었을 때 대조용)
      const 계정목록 = Object.keys(cat)
        .filter((id) => /seedance|seedream|seededit|dreamina|hyper3d|hitem3d|dola/i.test(id))
        .map((id) => id + " [" + (cat[id].status || "Active") + "]").sort();
      return json({ diag: "ark-pricing",
        note: "GET 만 합니다 — 생성·과금이 없습니다. 이 API 는 단가를 제공하지 않아(price 계열 필드 없음) 모델 상태만 대조합니다.",
        카탈로그: { ...raw, 모델수: Object.keys(cat).length },
        문제있는것: rows.filter((r) => !/^정상/.test(r.판정)),
        전체판정: rows,
        계정에열려있는관련ID: 계정목록 });
    }

    /* ══ 지난 작업 목록 조회 (읽기 전용·무과금) ══
       /api/generate?diag=ark-tasks[&filter=hyper3d]
       콘솔 체험(Playground)에서 3D 를 한 번이라도 돌린 적이 있다면 그 작업이 계정에 남아
       있다. 성공한 작업 하나만 찾으면 결과 형식을 공짜로 확인할 수 있다 — 이걸 보려고
       유료 생성을 새로 돌릴 이유가 없다. */
    if (u.searchParams.get("diag") === "ark-tasks") {
      if (!k.seedance) return json({ diag: "ark-tasks", error: "Seedance_API_KEY 미설정" });
      const filter = String(u.searchParams.get("filter") || "").trim().toLowerCase();
      const H = { "Authorization": "Bearer " + k.seedance };
      const tryGet = async (path) => {
        try {
          const r = await fetchT(ARK_HOSTS.bp + path, { headers: H }, 12000);
          const t = await r.text(); let j2 = null; try { j2 = JSON.parse(t); } catch { /* 비JSON */ }
          return { path, httpStatus: r.status, body: j2, textHead: j2 ? undefined : String(t).slice(0, 200) };
        } catch (e) { return { path, httpStatus: 0, textHead: String((e && e.message) || e).slice(0, 120) }; }
      };
      // 목록 경로가 어떤 형태인지 모르므로 몇 가지를 GET 으로만 시도한다(생성 없음).
      const rows = await Promise.all([
        tryGet("/contents/generations/tasks?page_size=50"),
        tryGet("/contents/generations/tasks?limit=50"),
        tryGet("/contents/generations/tasks"),
      ]);
      const okRow = rows.find(x => x.httpStatus === 200 && x.body && Object.keys(x.body).length);
      let 목록 = null, 성공한3D = null;
      if (okRow) {
        const arr = okRow.body.items || okRow.body.data || okRow.body.tasks
          || (Array.isArray(okRow.body) ? okRow.body : null);
        if (Array.isArray(arr)) {
          목록 = arr.map(x => ({ id: x.id, model: x.model, status: x.status, created_at: x.created_at }));
          const want = (x) => (!filter || String(x.model || "").toLowerCase().indexOf(filter) >= 0);
          const hit = arr.find(x => x.status === "succeeded" && want(x)
            && /hyper3d|hitem3d|rodin/i.test(String(x.model || "")));
          // 3D 성공 건이 없으면, 필터에 맞는 성공 건이라도 형식 참고용으로 보여 준다
          성공한3D = hit || arr.find(x => x.status === "succeeded" && want(x)) || null;
        }
      }
      return json({ diag: "ark-tasks",
        note: "GET 조회만 합니다 — 생성·과금이 없습니다.",
        경로시도: rows.map(x => x.path + " → " + x.httpStatus),
        목록: 목록 || "(목록 조회가 지원되지 않거나 형식을 못 읽었습니다)",
        결과형식참고: 성공한3D
          ? { id: 성공한3D.id, model: 성공한3D.model, content: 성공한3D.content,
              안내: "이 content 구조가 결과 형식입니다. diag=ark-task&id=" + 성공한3D.id + " 로 전체를 볼 수 있습니다." }
          : "성공한 작업을 못 찾았습니다. 콘솔 체험에서 3D 를 한 번 돌리신 적이 있다면 그 작업 ID 로 diag=ark-task&id=... 를 실행해 주세요." });
    }

    /* ══ 3D 생성 1회 실제 실행 (⚠️ 과금됨 · 명시적 확인 필수) ══
       /api/generate?diag=ark3d-run&confirm=yes[&prompt=...][&model=Hitem3D 2.0 (3D 생성)]

       왜 필요한가: 성공한 3D 작업의 응답을 아직 한 번도 못 봤다. 결과 URL 이 어느 필드로
       오는지 모르면 노드를 붙여도 결과를 꺼낼 수 없다. 폴링 코드는 흔한 이름들을 훑도록
       해 뒀지만, 그건 추측이고 실물로 확정해야 한다.

       확인 파라미터가 없으면 아무것도 하지 않는다. 앞서 두 번(Flux 3건·3D 1건) 진단이
       실수로 유료 작업을 만든 적이 있어, 이번엔 과금되는 호출을 우연히 밟을 수 없게 했다. */
    if (u.searchParams.get("diag") === "ark3d-run") {
      if (!k.seedance) return json({ diag: "ark3d-run", error: "Seedance_API_KEY 미설정" });
      if (u.searchParams.get("confirm") !== "yes")
        return json({ diag: "ark3d-run", 실행안함: true,
          경고: "이 진단은 실제 3D 모델을 1개 생성합니다 — 과금됩니다(잠정 단가 약 $0.4).",
          목적: "성공 응답에서 결과 파일 URL 이 어느 필드로 오는지 확인하기 위한 1회 실행입니다.",
          실행하려면: "같은 주소 끝에 &confirm=yes 를 붙이세요." });
      const name = u.searchParams.get("model") || "Hyper3D Gen-2 (3D 생성)";
      const b2 = { model: name,
        prompt: u.searchParams.get("prompt") || "a simple ceramic coffee mug, plain white, studio lighting",
        meshMode: "Raw", material: "PBR", hdTexture: true, quality: 200000 };
      const payload = buildArk3dPayload(b2, env);
      const t0 = Date.now();
      try {
        const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
          method: "POST", headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload) }, 25000);
        const j2 = await r.json().catch(() => ({}));
        if (!r.ok || !j2.id)
          return json({ diag: "ark3d-run", 보낸본문: payload, httpStatus: r.status, 응답: j2,
            결과: "제출 실패 — 작업이 만들어지지 않았으므로 과금되지 않습니다." });
        // 최대 ~50초 동안 상태를 본다. 안 끝나면 task id 로 나중에 조회하면 된다.
        let last = null;
        for (let i = 0; i < 10; i++) {
          await new Promise((res) => setTimeout(res, 5000));
          const pr = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks/" + encodeURIComponent(j2.id),
            { headers: { "Authorization": "Bearer " + k.seedance } }, 12000);
          last = await pr.json().catch(() => ({}));
          if (last.status === "succeeded" || last.status === "failed") break;
        }
        return json({ diag: "ark3d-run", 보낸본문: payload, taskId: j2.id,
          걸린시간ms: Date.now() - t0, 최종응답: last,
          안내: last && last.status === "succeeded"
            ? "성공했습니다. '최종응답.content' 안의 필드명을 보고 폴링 코드에 반영합니다."
            : "아직 진행 중이거나 실패했습니다. 진행 중이면 diag=ark-task&id=" + j2.id + " 로 나중에 다시 보세요." });
      } catch (e) { return json({ diag: "ark3d-run", 보낸본문: payload, error: String((e && e.message) || e).slice(0, 200) }); }
    }

    /* ══ ModelArk 모델 정보 조회 (읽기 전용·무과금) ══
       /api/generate?diag=ark-model&id=hyper3d-gen2-260112
       모델 카드에 입력 규격(필수 파라미터)이 실려 있는지 본다. GET 이라 생성이 없다. */
    if (u.searchParams.get("diag") === "ark-model") {
      if (!k.seedance) return json({ diag: "ark-model", error: "Seedance_API_KEY 미설정" });
      const id = String(u.searchParams.get("id") || "").trim();
      if (!id) return json({ diag: "ark-model", error: "id 파라미터가 필요합니다 (예: &id=hyper3d-gen2-260112)" });
      const H = { "Authorization": "Bearer " + k.seedance };
      const tryGet = async (path) => {
        try {
          const r = await fetchT(ARK_HOSTS.bp + path, { headers: H }, 12000);
          const t = await r.text(); let j2 = null; try { j2 = JSON.parse(t); } catch { /* 비JSON */ }
          return { path, httpStatus: r.status, 응답: j2 || String(t).slice(0, 800) };
        } catch (e) { return { path, httpStatus: 0, 응답: String((e && e.message) || e).slice(0, 150) }; }
      };
      const rows = await Promise.all([
        tryGet("/models/" + encodeURIComponent(id)),
        tryGet("/models?page_size=200"),
      ]);
      // 목록 응답에서 이 모델 항목만 뽑아 준다(전체는 너무 길다).
      let 해당모델 = null;
      const listBody = rows[1] && rows[1].응답;
      const arr = listBody && (listBody.data || listBody.items || listBody.models);
      if (Array.isArray(arr)) 해당모델 = arr.filter(x => JSON.stringify(x).indexOf(id) >= 0);
      return json({ diag: "ark-model", id,
        note: "GET 조회만 합니다 — 생성·과금이 없습니다.",
        모델단건: rows[0], 목록에서찾은항목: 해당모델 || "(목록 형식이 배열이 아니라 추출 못함)",
        목록httpStatus: rows[1].httpStatus });
    }

    /* ══ 전체 모델 소환 확인 (무과금) ══
       /api/generate?diag=probe-all            모든 제공사·모든 모델
       /api/generate?diag=probe-all&provider=kling   특정 제공사만

       원리: "그 모델이 존재하는지" 만 확인한다. 필수 필드(프롬프트·이미지 등)를 일부러
       비워 보내므로 제공사는 항상 파라미터 오류로 반려하고 작업이 만들어지지 않는다.
         · 400/422 등 파라미터 오류  → 모델은 존재함(소환 가능)
         · 404 / model not found    → 그 ID 가 없거나 미개통
       읽기 전용 조회(GET)가 있는 제공사(OpenAI·Gemini)는 그걸 쓴다 — 더 확실하고 안전하다. */
    if (u.searchParams.get("diag") === "probe-all") {
      const only = String(u.searchParams.get("provider") || "").trim();
      const want = (p) => !only || only === p;
      const t0 = Date.now();
      const R = (name, provider, id, status, code, message, extra) => ({
        model: name, provider, id, httpStatus: status,
        ok: extra && extra.forceOk !== undefined ? extra.forceOk : !seedreamModelMissing(status, code ? { error: { code, message } } : null),
        code: code || "", message: String(message || "").slice(0, 160),
      });
      const post = async (url, headers, body, ms) => {
        try {
          const r = await fetchT(url, { method: "POST", headers, body: JSON.stringify(body) }, ms || 12000);
          const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* 비JSON */ }
          return { status: r.status, j, t };
        } catch (e) { return { status: 0, j: null, t: String((e && e.message) || e) }; }
      };
      const get = async (url, headers, ms) => {
        try {
          const r = await fetchT(url, { headers }, ms || 12000);
          const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* 비JSON */ }
          return { status: r.status, j, t };
        } catch (e) { return { status: 0, j: null, t: String((e && e.message) || e) }; }
      };
      const errOf = (x) => ({ code: (x.j && x.j.error && (x.j.error.code || x.j.error.type)) || (x.j && x.j.code) || "",
                              msg: (x.j && x.j.error && (x.j.error.message || x.j.error)) || (x.j && x.j.message) || String(x.t || "").slice(0, 160) });
      const jobs = [];

      // ── BytePlus ModelArk: 영상(Seedance) ──
      if (k.seedance && want("seedance")) for (const [name, ids] of Object.entries(SEEDANCE_IDS)) {
        const id = Array.isArray(ids) ? ids[0] : ids;
        jobs.push((async () => { const x = await post(ARK_HOSTS.bp + "/contents/generations/tasks",
          { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" }, { model: id, content: [] });
          const e = errOf(x); return R(name, "seedance", id, x.status, e.code, e.msg); })());
      }
      // ── BytePlus ModelArk: 이미지(Seedream/SeedEdit) ──
      if (k.seedance && want("seedream")) for (const [name, ids] of Object.entries(SEEDREAM_IDS)) {
        const id = Array.isArray(ids) ? ids[0] : ids;
        jobs.push((async () => { const x = await post(ARK_HOSTS.bp + "/images/generations",
          { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" }, { model: id, prompt: "" });
          const e = errOf(x); return R(name, "seedream", id, x.status, e.code, e.msg); })());
      }
      // ── BytePlus ModelArk: 프롬프트 LLM (OpenAI 호환 chat/completions) ──
      if (k.seedance && want("promptgen")) jobs.push((async () => {
        // 접미사 없는 ID 는 전부 404 였다 → 계정 카탈로그에서 실제 LLM ID 를 뽑아 그걸로 확인한다.
        let ids = [];
        try {
          const r = await fetchT(ARK_HOSTS.bp + "/models?page_size=200", { headers: { "Authorization": "Bearer " + k.seedance } }, 10000);
          const t = await r.text();
          ids = [...new Set(String(t).match(/[a-z0-9]+(?:-[a-z0-9]+){1,}/gi) || [])]
            .filter(x => /^(deepseek|dola-seed|doubao|skylark|kimi|glm|gpt-oss|bytedance-seed)/i.test(x))
            // 임베딩·번역 전용, 그리고 이미지·영상 생성 모델은 chat/completions 로 쓸 수 없다.
            //  (dola-seedream-5-0-pro 가 400 을 내 LLM 으로 오인됐다)
            .filter(x => !/embedding|translation|tokenizer|seedream|seedance|seededit|dreamina/i.test(x))
            .map(x => x.toLowerCase());
        } catch (_e) { /* 무시 */ }
        if (!ids.length) return { model: "프롬프트 LLM", provider: "promptgen", id: "(카탈로그에서 못 찾음)",
          httpStatus: 0, ok: false, code: "", message: "계정 카탈로그에 LLM 계열 ID 가 없습니다" };
        const checked = await Promise.all(ids.slice(0, 60).map(async (id) => {
          const x = await post(ARK_HOSTS.bp + "/chat/completions",
            { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" }, { model: id, messages: [] });
          const e = errOf(x); return { id, status: x.status, ok: !seedreamModelMissing(x.status, x.j), msg: e.msg };
        }));
        const good = checked.filter(c => c.ok);
        return { model: "프롬프트 LLM (카탈로그 " + ids.length + "개 중 " + checked.length + "개 확인)", provider: "promptgen",
          id: good.map(c => c.id).join(", ") || "(전부 호출 불가)", httpStatus: 200, ok: good.length > 0, code: "",
          message: "소환 가능: " + (good.map(c => c.id).join(", ") || "없음")
                 + " · 불가: " + (checked.filter(c => !c.ok).map(c => c.id + "[" + c.status + "]").join(", ") || "없음") };
      })());
      // ── BytePlus ModelArk: 3D (엔드포인트 미확인 → 카탈로그 조회로 존재만 확인) ──
      if (k.seedance && want("ark3d")) jobs.push((async () => {
        try {
          const r = await fetchT(ARK_HOSTS.bp + "/models?page_size=200", { headers: { "Authorization": "Bearer " + k.seedance } }, 10000);
          const t = await r.text();
          const hits = [...new Set(String(t).match(/[a-z0-9]+(?:-[a-z0-9]+){1,}/gi) || [])].filter(x => /hyper3d|hitem3d|rodin/i.test(x));
          return { model: "3D (Hyper3D·Hitem3D)", provider: "ark3d", id: hits.join(", ") || "(카탈로그에서 못 찾음)",
                   httpStatus: r.status, ok: hits.length > 0, code: "", message: hits.length ? "카탈로그에서 발견 — 호출 규격은 별도 확인 필요" : "카탈로그에 3D 계열 ID 없음" };
        } catch (e) { return { model: "3D (Hyper3D·Hitem3D)", provider: "ark3d", id: "-", httpStatus: 0, ok: false, code: "", message: String((e && e.message) || e).slice(0, 120) }; }
      })());
      // ── Kling (프롬프트 비움 → 파라미터 반려) ──
      if (want("kling")) {
        const cr = klingCreds(env);
        if (cr) { const auth = await klingAuth(cr);
          for (const [name, spec] of Object.entries(KLING_API)) {
            const mids = KLING_ALT[spec.m] || [spec.m];
            jobs.push((async () => { const x = await post(cr.base + "/v1/videos/" + spec.ep,
              { "Authorization": auth, "Content-Type": "application/json" }, { model_name: mids[0], prompt: "", mode: spec.mode, duration: "5" });
              const e = errOf(x);
              const bad = /model|not\s*exist|not\s*found/i.test(String(e.code) + " " + String(e.msg));
              return R(name, "kling", mids[0], x.status, e.code, e.msg, { forceOk: !bad }); })());
          }
        }
      }
      // ── Runway (promptImage 없음 → 400) ──
      if (k.runway && want("runway")) for (const [name, id] of Object.entries(RUNWAY_MODELS)) {
        jobs.push((async () => { const x = await post("https://api.dev.runwayml.com/v1/image_to_video",
          { "Authorization": "Bearer " + k.runway, "X-Runway-Version": RUNWAY_VER, "Content-Type": "application/json" },
          { model: id, promptText: "", ratio: "1280:720", duration: 5 });
          const e = errOf(x); const bad = /model/i.test(String(e.msg)) && /invalid|unknown|not/i.test(String(e.msg));
          return R(name, "runway", id, x.status, e.code, e.msg,
            { forceOk: x.status !== 404 && x.status !== 401 && x.status !== 403 && !bad }); })());
      }
      // ── Luma (프롬프트 비움) ──
      /* 루마는 실제 빌더가 만드는 본문에서 prompt 만 비워 보낸다.
         예전엔 {model, prompt:""} 를 직접 조립해, 영상 모델인 ray-3.2 에 type:"video" 가
         빠진 채로 나갔다 → "Type 'image' is not supported" 라는, 우리 코드와 무관한
         오류가 진단에 찍혔다. 진단이 실제와 다른 요청을 시험하면 검증이 아니다. */
      if (k.luma && want("luma")) for (const [name, id] of Object.entries(LUMA_IDS)) {
        jobs.push((async () => {
          let probeBody;
          try { probeBody = buildLumaPayload({ model: name, prompt: "", ratio: "16:9", seconds: 5, res: "720p" }); }
          catch (_e) { probeBody = { model: id, prompt: "" }; }
          const x = await post(LUMA_BASE + "/generations",
          { "Authorization": "Bearer " + k.luma, "Content-Type": "application/json" }, probeBody);
          const e = errOf(x);
          // 403 Not authenticated = 키가 없거나 잘못됨. "모델 있음" 이 아니라 "쓸 수 없음" 이다.
          return R(name, "luma", id, x.status, e.code, e.msg,
            { forceOk: x.status !== 404 && x.status !== 401 && x.status !== 403 }); })());
      }
      // ── MiniMax (프롬프트 비움 → base_resp 오류) ──
      if (k.hailuo && want("hailuo")) for (const [name, id] of Object.entries(HAILUO_IDS)) {
        jobs.push((async () => { const x = await post(HAILUO_BASE + "/video_generation",
          { "Authorization": "Bearer " + k.hailuo, "Content-Type": "application/json" }, { model: id, prompt: "" });
          const br = (x.j && x.j.base_resp) || {};
          const bad = /model/i.test(String(br.status_msg || "")) && /invalid|not/i.test(String(br.status_msg || ""));
          return R(name, "hailuo", id, x.status, String(br.status_code || ""), br.status_msg || String(x.t).slice(0, 120), { forceOk: !bad }); })());
      }
      /* ── Google Veo / Nano Banana ──
         AI Studio 키(VEO_API_KEY)로 조회하고, 그게 안 되면 Vertex 서비스계정으로 다시 확인한다.
         실제 생성은 서비스계정 경로가 1순위라, 키가 죽어 있어도 생성은 될 수 있다. */
      if (want("google")) {
        const sa = gcpCreds(env);
        for (const id of ["veo-3.1-generate-001", NANO_MODEL]) {
          jobs.push((async () => {
            const label = id === NANO_MODEL ? "Nano Banana" : "Google Veo 3.1";
            if (k.google) {
              const x = await get("https://generativelanguage.googleapis.com/v1beta/models/" + id + "?key=" + encodeURIComponent(k.google));
              if (x.status === 200) return R(label, "google", id, 200, "", "AI Studio 키로 확인됨", { forceOk: true });
              if (!sa) { const e = errOf(x); return R(label, "google", id, x.status, e.code, e.msg + " (서비스계정 미설정)", { forceOk: false }); }
            }
            if (!sa) return R(label, "google", id, 0, "", "구글 인증 없음(VEO_API_KEY·서비스계정 모두 없음)", { forceOk: false });
            try {
              const tok = await gcpToken(sa.email, sa.pem);
              // publisher 모델은 GET 리소스가 아니다(앞서 404 HTML 이 왔다) →
              //  실제 생성과 같은 엔드포인트에 빈 본문을 POST 해 400(파라미터)/404(모델없음)로 가른다. 작업은 생기지 않는다.
              const isVeo = /veo/i.test(id);
              const url2 = "https://" + VERTEX_LOC + "-aiplatform.googleapis.com/v1/projects/" + sa.pid
                + "/locations/" + VERTEX_LOC + "/publishers/google/models/" + id + (isVeo ? ":predictLongRunning" : ":generateContent");
              const x2 = await post(url2, { "Authorization": "Bearer " + tok, "Content-Type": "application/json" },
                isVeo ? { instances: [], parameters: {} } : { contents: [] });
              const e2 = errOf(x2);
              const okNow = x2.status === 400 || x2.status === 200;   // 400=파라미터 반려(모델 존재)
              return R(label, "google", id, x2.status, e2.code,
                (okNow ? "Vertex 서비스계정으로 확인됨" : "") + " " + String(e2.msg).replace(/<[^>]*>/g, "").slice(0, 140),
                { forceOk: okNow });
            } catch (e) { return R(label, "google", id, 0, "", "서비스계정 토큰 실패: " + String((e && e.message) || e).slice(0, 100), { forceOk: false }); }
          })());
        }
      }
      // ── OpenAI (읽기 전용 모델 조회) ──
      if (k.openai && want("openai")) for (const [name, id] of Object.entries(OPENAI_IMG_ID)) {
        jobs.push((async () => { const x = await get(openaiBase(env) + "/v1/models/" + id, { "Authorization": "Bearer " + k.openai });
          const e = errOf(x); return R(name, "openai", id, x.status, e.code, e.msg, { forceOk: x.status === 200 }); })());
      }
      // ── xAI Grok (읽기 전용 모델 조회) ──
      if (k.xai && want("xai")) for (const id of ["grok-imagine-image", (pick(env, ["GROK_VIDEO_MODEL", "grok_video_model"]) || "grok-imagine-video-1.5")]) {
        jobs.push((async () => { const x = await get("https://api.x.ai/v1/models/" + id, { "Authorization": "Bearer " + k.xai });
          const e = errOf(x); return R(/video/.test(id) ? "Grok Imagine (영상)" : "Grok Imagine", "xai", id, x.status, e.code, e.msg, { forceOk: x.status === 200 }); })());
      }
      /* ── Flux / BFL ──
         ⚠️ 빈 프롬프트({prompt:""})는 BFL 이 그대로 "수락" 해 실제 작업이 생성된다(과금).
            실제로 flux-2-flex·kontext-max·kontext-pro 에서 작업이 만들어졌다.
            → 반드시 "검증 단계에서 걸리는" 잘못된 열거값을 보내 422 로 끊는다. 작업은 만들어지지 않는다. */
      if (k.flux && want("flux")) for (const [name, ep] of Object.entries(FLUX_ENDPOINTS)) {
        jobs.push((async () => { const x = await post(FLUX_BASE + ep,
          { "x-key": k.flux, "Content-Type": "application/json" },
          { prompt: "probe", output_format: "__probe_invalid__" });
          const e = errOf(x);
          // 200 이 오면 검증을 통과해 작업이 생겼다는 뜻 — 진단으로서 실패다. 사실대로 표시한다.
          const created = x.status >= 200 && x.status < 300;
          return R(name, "flux", ep, x.status, e.code,
            created ? "⚠️ 작업이 생성됐습니다(검증을 통과함) — 이 항목은 진단에서 제외해야 합니다" : e.msg,
            { forceOk: x.status === 422 || x.status === 400 }); })());
      }

      const items = await Promise.all(jobs);
      const okList = items.filter(x => x.ok), ngList = items.filter(x => !x.ok);
      const byProv = {};
      items.forEach(x => { (byProv[x.provider] = byProv[x.provider] || { ok: 0, ng: 0 })[x.ok ? "ok" : "ng"]++; });
      return json({ diag: "probe-all", elapsedMs: Date.now() - t0,
        note: "필수 필드를 비워 보내 '모델 존재 여부' 만 확인합니다. 실제 생성물은 만들어지지 않아 과금이 없습니다. "
            + "OpenAI·Google·Grok 은 읽기 전용 모델 조회(GET)로 확인합니다.",
        summary: { total: items.length, ok: okList.length, ng: ngList.length, byProvider: byProv },
        소환불가: ngList.map(x => x.provider + " · " + x.model + " → " + x.id + " [" + x.httpStatus + (x.code ? " " + x.code : "") + "] " + x.message),
        소환가능: okList.map(x => x.provider + " · " + x.model + " → " + x.id),
        items });
    }

    /* 이미지 모델(Seedream/SeedEdit) 존재확인 — Seedance 와 같은 방식.
       prompt 를 비워 제출하면 존재하는 모델은 400(InvalidParameter), 없는 모델은
       404(InvalidEndpointOrModel.NotFound) 를 준다. 이미지도 태스크가 생기지 않아 무과금.
         /api/generate?diag=seedream-check */
    if (u.searchParams.get("diag") === "seedream-check") {
      if (!k.seedance) return json({ diag: "seedream-check", error: "Seedance_API_KEY 미설정" });
      const checkOne = async (id) => {
        try {
          const r = await fetchT(ARK_HOSTS.bp + "/images/generations", {
            method: "POST", headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
            body: JSON.stringify({ model: id, prompt: "" }) }, 15000);
          const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
          const missing = seedreamModelMissing(r.status, j);
          return { id, exists: !missing, httpStatus: r.status,
                   code: String((j && j.error && j.error.code) || ""),
                   message: String((j && j.error && j.error.message) || text).slice(0, 220) };
        } catch (e) { return { id, exists: false, error: String((e && e.message) || e).slice(0, 100) }; }
      };
      const items = await Promise.all(Object.keys(SEEDREAM_IDS).map(async (name) => {
        const ids = SEEDREAM_IDS[name];
        const tried = await Promise.all(ids.map(checkOne));
        const hit = tried.find(x => x.exists) || tried[0];
        return { model: name, id: hit.id, exists: tried.some(x => x.exists),
                 httpStatus: hit.httpStatus, code: hit.code, message: hit.message,
                 candidates: tried.map(x => x.id + (x.exists ? "✓" : "✗") + "[" + (x.httpStatus || "-") + (x.code ? " " + x.code : "") + "]") };
      }));
      const miss = items.filter(x => !x.exists);
      let catalog = null, suggest = [];
      if (miss.length) {
        try {
          catalog = await arkModelCatalog(k.seedance);
          for (const it of miss) {
            const ids = SEEDREAM_IDS[it.model];
            const alt = arkPickByStem(catalog, ids);
            const listed = (catalog || []).filter(x => ids.indexOf(x) >= 0);
            suggest.push({ model: it.model, tried: ids, catalogMatch: alt, listedInCatalog: listed,
              nearby: (catalog || []).filter(x => /seedream|seededit|dola/i.test(x)).slice(0, 12),
              verdict: alt ? "카탈로그에 같은 계열의 다른 ID 가 있습니다 — 그 ID 로 바꾸면 됩니다."
                : listed.length ? "ID 는 맞습니다(카탈로그에 있음). 호출만 404 → 콘솔에서 개통 필요."
                : "계정 카탈로그에 이 계열이 없습니다." });
          }
        } catch (_e) { /* 무시 */ }
      }
      return json({ diag: "seedream-check",
        note: "prompt 를 비워 제출합니다. 400 InvalidParameter=ID 정상, 404 InvalidEndpointOrModel.NotFound=ID 없음/미개통. 이미지는 생성되지 않습니다(무과금).",
        catalogSeedream: catalog ? catalog.filter(x => /seedream|seededit|dola/i.test(x)) : undefined,
        exists: items.filter(x => x.exists).map(x => x.model + " → " + x.id),
        missing: miss.map(x => x.model + " → " + x.id),
        suggest: suggest.length ? suggest : undefined, items });
    }
    // 초고속 존재확인(무과금): 각 Seedance 모델을 content 없이 제출 → 404/NotFound=ID없음, 그 외=존재(파라미터만 반려·태스크 미생성).
    //   /api/generate?diag=seedance-check
    if (u.searchParams.get("diag") === "seedance-check") {
      if (!k.seedance) return json({ diag: "seedance-check", error: "Seedance_API_KEY 미설정" });
      // 각 표시명의 후보 ID를 전부 확인 → 어떤 후보가 실제로 존재하는지 드러난다.
      const checkOne = async (id) => {
        try {
          const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
            method: "POST", headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
            body: JSON.stringify({ model: id, content: [] }) }, 15000);
          const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
          const missing = seedreamModelMissing(r.status, j);
          const taskId = j && (j.id || (j.data && j.data.id));
          if (taskId) return { id, exists: true, httpStatus: r.status, taskId };   // 실제 제출됨(존재 확정)
          // 판정 근거를 그대로 실어 준다 — 우리 해석이 아니라 제공사 원문으로 확인할 수 있게.
          return { id, exists: !missing, httpStatus: r.status,
                   code: String((j && j.error && j.error.code) || ""),
                   message: String((j && j.error && j.error.message) || "").slice(0, 300),
                   raw: j ? undefined : String(text).slice(0, 300),
                   err: String((j && j.error && (j.error.message || j.error.code)) || text).slice(0, 140) };
        } catch (e) { return { id, exists: false, error: String((e && e.message) || e).slice(0, 100) }; }
      };
      const items = await Promise.all(Object.keys(SEEDANCE_IDS).map(async (name) => {
        const ids = Array.isArray(SEEDANCE_IDS[name]) ? SEEDANCE_IDS[name] : [SEEDANCE_IDS[name]];
        const tried = await Promise.all(ids.map(checkOne));
        const hit = tried.find(x => x.exists) || tried[0];
        return { model: name, id: hit.id, exists: tried.some(x => x.exists),
                 httpStatus: hit.httpStatus, taskId: hit.taskId, err: hit.err,
                 code: hit.code, message: hit.message, raw: hit.raw,
                 candidates: tried.map(x => x.id + (x.exists ? "✓" : "✗") + "[" + (x.httpStatus || "-") + (x.code ? " " + x.code : "") + "]") };
      }));
      // 없다고 나온 모델은 계정 카탈로그와 대조해, "접미사만 다른 ID 가 있는지" 까지 알려 준다.
      const missItems = items.filter(x => !x.exists);
      let catalog = null, suggest = [];
      if (missItems.length) {
        try {
          catalog = await arkModelCatalog(k.seedance);
          for (const it of missItems) {
            const ids = Array.isArray(SEEDANCE_IDS[it.model]) ? SEEDANCE_IDS[it.model] : [SEEDANCE_IDS[it.model]];
            const alt = arkPickByStem(catalog, ids);
            const near = (catalog || []).filter(x => x.indexOf(arkStem(ids[0]).split("-").slice(0, 4).join("-")) === 0);
            // 세 갈래로 정확히 구분한다.
            //  ① 카탈로그에 접미사가 다른 ID 가 있다 → 자동 보정 가능
            //  ② 카탈로그에 "우리가 이미 시도한 그 ID" 만 있다 → ID 는 맞고 호출 권한이 없다(개통 필요)
            //  ③ 카탈로그에 계열 자체가 없다 → 이 계정/리전에 그 모델이 없다
            const listedSame = (catalog || []).filter(x => ids.indexOf(x) >= 0);
            const verdict = alt
              ? "카탈로그에 같은 계열의 다른 ID 가 있습니다 — 자동으로 그 ID 를 씁니다."
              : listedSame.length
                ? "모델 ID 는 맞습니다(카탈로그에 그대로 있음). 그런데 이 API 키로 호출하면 404 입니다 → "
                  + "BytePlus 콘솔에서 이 모델을 '개통(Activate/Enable)' 해야 합니다. 목록에 보이는 것과 개통은 별개입니다."
                : "계정 카탈로그에 이 계열 자체가 없습니다(리전/계정에서 사용 불가).";
            suggest.push({ model: it.model, tried: ids, catalogMatch: alt,
                           listedInCatalog: listedSame, nearby: near.slice(0, 8), verdict });
          }
        } catch (_e) { /* 무시 */ }
      }
      return json({ diag: "seedance-check",
        catalogCount: catalog ? catalog.length : undefined,
        catalogSource: catalog ? arkCatalogSource() : undefined,
        catalogAll: catalog || undefined,
        catalogSeedanceLite: catalog ? catalog.filter(x => /lite/i.test(x)) : undefined,
        suggest: suggest.length ? suggest : undefined,
        note: "candidates 의 [HTTP 코드] 를 그대로 보세요. 404·ModelNotFound·ModelNotOpen=ID 없음/미개통, "
            + "400 InvalidParameter=ID 는 정상(내용을 비워 보냈으니 당연한 반려). content 를 비워 보내므로 태스크는 생성되지 않습니다(무과금).",
        exists: items.filter(x => x.exists).map(x => x.model + " → " + x.id),
        missing: items.filter(x => !x.exists).map(x => x.model + " → " + x.id), items });
    }
    // 단일 Seedance 모델을 '실제 생성과 동일한 본문'으로 실제 제출 → task_id 또는 전체 에러 반환(증거용).
    //   /api/generate?diag=seedancesub                       (기본 Seedance 2.0 Mini · 텍스트→영상 · 5초)
    //   /api/generate?diag=seedancesub&model=Seedance 2.0    (다른 모델)
    if (u.searchParams.get("diag") === "seedancesub") {
      if (!k.seedance) return json({ diag: "seedancesub", error: "Seedance_API_KEY 미설정" });
      const name = u.searchParams.get("model") || "Seedance 2.0 Mini";
      const body = buildSeedancePayload({ model: name, prompt: "a cat walking in a sunny garden, cinematic, smooth camera", ratio: "16:9", seconds: 5 }, env);
      const endpoint = ARK_HOSTS.bp + "/contents/generations/tasks";
      const t0 = Date.now();
      try {
        const r = await fetchT(endpoint, {
          method: "POST", headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(body) }, 30000);
        const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
        const taskId = j && (j.id || (j.data && j.data.id));
        return json({ diag: "seedancesub", model: name, sentModel: body.model, httpStatus: r.status,
          ok: r.ok && !!taskId, taskId: taskId || null, tookMs: Date.now() - t0,
          raw: taskId ? undefined : String(text).slice(0, 700), sentBody: body });
      } catch (e) {
        return json({ diag: "seedancesub", model: name, error: String((e && e.message) || e).slice(0, 200), sentBody: body });
      }
    }
    // 진단(씨댄스 전체): 등록된 모든 Seedance 영상 모델 검증.
    //   /api/generate?diag=seedance-all          (기본=무과금 구조검증: 모델ID 매핑만)
    //   /api/generate?diag=seedance-all&real=1   (실제 제출 — 완료 시 모델당 영상 과금 발생)
    if (u.searchParams.get("diag") === "seedance-all") {
      if (!k.seedance) return json({ diag: "seedance-all", error: "Seedance 키가 서버에 없음" });
      const real = u.searchParams.get("real") === "1";
      const seen = {}, items = [];
      for (const name of Object.keys(SEEDANCE_IDS)) {
        const id = seedanceModelId({ model: name }, env);
        if (seen[id]) continue; seen[id] = 1;
        if (!real) { items.push({ model: id, name, submitted: false, note: "구조검증(무과금)" }); continue; }
        const payload = buildSeedancePayload({ model: name, prompt: "A cinematic photorealistic product shot, smooth camera move.", seconds: 5, ratio: "16:9" }, env);
        const t0 = Date.now();
        try {
          const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
            method: "POST", headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
            body: JSON.stringify(payload) }, 22000);
          const j = await r.json().catch(() => ({}));
          items.push({ model: id, name, submitted: r.ok && !!j.id, httpStatus: r.status, tookMs: Date.now() - t0, taskId: j.id || null,
                       error: j.id ? null : String((j.error && (j.error.message || j.error.code)) || JSON.stringify(j)).slice(0, 180) });
        } catch (e) {
          items.push({ model: id, name, submitted: false, tookMs: Date.now() - t0, error: String((e && e.message) || e).slice(0, 180) });
        }
      }
      return json({ diag: "seedance-all", real, okCount: items.filter(x => real ? x.submitted : true).length, total: items.length,
                    note: real ? "제출 성공 = 모델ID·키·형식 정상(완료 시 영상 과금)" : "무과금 구조검증 · 실제 제출은 &real=1", items });
    }
    // 진단: 실제 이미지 생성이 되는지 끝까지(제출→폴링→이미지 URL) 확인.
    //   /api/generate?diag=flux                 (기본 Flux 1.1 Pro)
    //   /api/generate?diag=flux&model=Flux 1.1 Pro Ultra&prompt=...
    if (u.searchParams.get("diag") === "flux") {
      if (!k.flux) return json({ diag: "flux", error: "Flux 키가 서버에 없음" });
      const model = u.searchParams.get("model") || "Flux 1.1 Pro";
      const prompt = u.searchParams.get("prompt") || "a photorealistic red apple on a wooden table, soft studio lighting, high detail";
      const { endpoint, body } = buildFluxPayload({ model, prompt, ratio: "1:1" });
      const started = Date.now();
      try {
        const r = await fetchT(FLUX_BASE + endpoint, {
          method: "POST", headers: { "x-key": k.flux, "Content-Type": "application/json", "accept": "application/json" },
          body: JSON.stringify(body)
        }, 20000);
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.id)
          return json({ diag: "flux", model, ok: false, submitStatus: r.status, response: j, tookMs: Date.now() - started });
        const poll = j.polling_url || (FLUX_BASE + "get_result?id=" + encodeURIComponent(j.id));
        let out = null, last = "Pending";
        for (let i = 0; i < 12; i++) {
          await new Promise(res => setTimeout(res, 1800));
          const pr = await fetchT(poll, { headers: { "x-key": k.flux, "accept": "application/json" } }, 15000);
          const pj = await pr.json().catch(() => ({}));
          last = pj.status || last;
          if (pj.status === "Ready") { out = pj.result && pj.result.sample; break; }
          if (["Error", "Failed", "Content Moderated", "Request Moderated"].includes(pj.status))
            return json({ diag: "flux", model, ok: false, status: pj.status, tookMs: Date.now() - started });
        }
        return json({ diag: "flux", model, ok: !!out, status: out ? "Ready" : last,
                      imageUrl: out, tookMs: Date.now() - started });
      } catch (e) {
        return json({ diag: "flux", model, ok: false, error: String((e && e.message) || e).slice(0, 200), tookMs: Date.now() - started });
      }
    }
    // 진단: 나노바나나(Gemini 2.5 Flash Image)가 되는지 — ①AI Studio 키(VEO_API_KEY) ②Vertex 서비스계정 둘 다 시도.
    //   /api/generate?diag=nanobanana   (모델명 override: &model=gemini-2.5-flash-image)
    if (u.searchParams.get("diag") === "nanobanana") {
      const sa = gcpCreds(env);
      if (!k.google && !sa) return json({ diag: "nanobanana", usable: false, error: "구글 인증 없음 (VEO_API_KEY 또는 GCP 서비스계정 미설정)" });
      const models = [u.searchParams.get("model") || "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"];
      const prompt = u.searchParams.get("prompt") || "A photorealistic red apple on a wooden table, soft studio lighting";
      const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
      const out = { diag: "nanobanana", hasStudioKey: !!k.google, hasVertex: !!sa, tried: [] };
      const hasImgOf = (j) => ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).some(p => p.inlineData || p.inline_data);
      // ① AI Studio 키
      if (k.google) for (const m of models) {
        const t0 = Date.now();
        try {
          const r = await fetchT("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + encodeURIComponent(k.google),
            { method: "POST", headers: { "Content-Type": "application/json" }, body }, 25000);
          const j = await r.json().catch(() => ({})); const hasImg = hasImgOf(j);
          out.tried.push({ auth: "studio_key", model: m, httpStatus: r.status, ok: r.ok && hasImg, hasImage: hasImg, tookMs: Date.now() - t0, error: r.ok ? null : String((j.error && j.error.message) || JSON.stringify(j)).slice(0, 200) });
          if (r.ok && hasImg) return json({ ...out, usable: true, via: "studio_key", model: m });
        } catch (e) { out.tried.push({ auth: "studio_key", model: m, error: String((e && e.message) || e).slice(0, 160) }); }
      }
      // ② Vertex 서비스계정 (Veo가 이걸로 도는 경우 — 같은 계정으로 나노바나나 가능)
      if (sa) {
        try {
          const tok = await gcpToken(sa.email, sa.pem);
          const hostFor = (loc) => loc === "global" ? "https://aiplatform.googleapis.com" : "https://" + loc + "-aiplatform.googleapis.com";
          for (const loc of [VERTEX_LOC, "global"]) for (const m of models) {
            const t0 = Date.now();
            try {
              const url = hostFor(loc) + "/v1/projects/" + sa.pid + "/locations/" + loc + "/publishers/google/models/" + m + ":generateContent";
              const r = await fetchT(url, { method: "POST", headers: { "Authorization": "Bearer " + tok, "Content-Type": "application/json" }, body }, 25000);
              const j = await r.json().catch(() => ({})); const hasImg = hasImgOf(j);
              out.tried.push({ auth: "vertex", loc, model: m, httpStatus: r.status, ok: r.ok && hasImg, hasImage: hasImg, tookMs: Date.now() - t0, error: r.ok ? null : String((j.error && j.error.message) || JSON.stringify(j)).slice(0, 200) });
              if (r.ok && hasImg) return json({ ...out, usable: true, via: "vertex", loc, model: m });
            } catch (e) { out.tried.push({ auth: "vertex", loc, model: m, error: String((e && e.message) || e).slice(0, 160) }); }
          }
        } catch (e) { out.tried.push({ auth: "vertex", error: "token: " + String((e && e.message) || e).slice(0, 160) }); }
      }
      return json({ ...out, usable: false, note: "모두 실패. studio_key error가 'API key not valid'면 VEO_API_KEY 값 무효, vertex가 되면 그쪽으로 붙이면 됨." });
    }
    // 진단: GPT_API_KEY(OpenAI)로 이미지 생성이 되는지 실제 호출.
    //   /api/generate?diag=gptimage                 → 기본 gpt-image-1
    //   /api/generate?diag=gptimage&model=GPT Image 2 → 실제 고른 모델로 테스트(friendly 이름 또는 raw id)
    if (u.searchParams.get("diag") === "gptimage") {
      if (!k.openai) return json({ diag: "gptimage", usable: false, error: "GPT_API_KEY 미설정" });
      const prompt = u.searchParams.get("prompt") || "A photorealistic red apple on a wooden table, soft studio lighting";
      const reqModel = u.searchParams.get("model") || "";
      const modelId = OPENAI_IMG_ID[reqModel] || reqModel || "gpt-image-1";   // friendly 이름이면 매핑, 아니면 raw
      const size = u.searchParams.get("size") || "1024x1024";   // 실제 경로 재현용(16:9=1536x1024)
      const quality = u.searchParams.get("quality") || "";       // low|medium|high — 미지정 시 OpenAI 기본(느림)
      const body = { model: modelId, prompt, size, n: 1 };
      if (quality) body.quality = quality;
      const t0 = Date.now();
      try {
        const r = await fetchT(openaiBase(env) + "/v1/images/generations", {
          method: "POST", headers: { "Authorization": "Bearer " + k.openai, "Content-Type": "application/json" },
          body: JSON.stringify(body) }, 120000);
        const j = await r.json().catch(() => ({}));
        const hasImg = !!(j.data && j.data[0] && (j.data[0].b64_json || j.data[0].url));
        return json({ diag: "gptimage", model: modelId, size, quality: quality || "(default)", usable: r.ok && hasImg, httpStatus: r.status, hasImage: hasImg, tookMs: Date.now() - t0, relay: openaiBase(env) !== "https://api.openai.com",
          error: r.ok ? null : String((j.error && j.error.message) || JSON.stringify(j)).slice(0, 240),
          note: (!r.ok && r.status === 403) ? "403이면 보통 OpenAI 조직 인증(Verify Organization) 필요 — platform.openai.com/settings/organization 에서 인증." : undefined });
      } catch (e) {
        return json({ diag: "gptimage", model: modelId, usable: false, error: String((e && e.message) || e).slice(0, 200), tookMs: Date.now() - t0,
          note: "timeout/네트워크면 그 모델이 릴레이·Cloudflare 시간제한을 넘겼을 가능성(gpt-image-2 는 느림)." });
      }
    }
    // 진단: 레퍼런스 편집(/v1/images/edits)이 특정 모델로 실제 되는지 확인 (128x128 테스트 이미지 첨부).
    //   /api/generate?diag=gptedit&model=GPT Image 2   ← gpt-image-2 편집 지원 여부를 회원 키로 확정
    if (u.searchParams.get("diag") === "gptedit") {
      if (!k.openai) return json({ diag: "gptedit", usable: false, error: "GPT_API_KEY 미설정" });
      const reqModel = u.searchParams.get("model") || "GPT Image 2";
      const modelId = OPENAI_IMG_ID[reqModel] || reqModel || "gpt-image-2";
      const TEST_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABv0lEQVR4nO3VSREDQRADwQVWIAx7YBmGHp0RQlC6vveL3g7Ch/6bRpABMaDLLdSAGNA8hhrQHIQJ6qZ8QAxoHkMNaA7CBHVTPiAGNI+hBjQHYYK6KR8QA5rHUAOagzBB3ZQPiAHNY6gBzUGYoG7KB8SA5jHUgOYgTFA35QNiQPMYakBzECaom/IBMaB5DDWgOQgT1E35gBjQPIYa0ByECeqmfEAMaB5DDWgOwgR1Uz4gBjSPoQY0B2GCuikfEAOax1ADmoMwQd2UD4gBzWOoAc1BmKBuygfEgOYx1IDmIExQN+UDYkDzGGpAcxAmqJvyATGgeQw1oDkIE9RN+YAY0DyGGtAchAnqpnxADGgeQw1oDsIEdVM+IAY0j6EGNAdhgropHxADmsdQA5qDMEHdlA+IAc1jqAHNQZigbsoHxIDmMdSA5iBMUDflA2JA8xhqQHMQJqib8gExoHkMNaA5CBPUTfmAGNA8hhrQHIQJ6qZ8QAxoHkMNaA7CBHVTPiAGNI+hBjQHYYK6KR8QA5rHUAOagzBB3ZQPiAHNY6gBzUGYoG7KB8SA5jHUgOYgTFA35QNiQPMYakBzECaoOYuJ/j1tBPzAsgH8AAAAAElFTkSuQmCC";
      const bin = atob(TEST_PNG_B64); const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const t0 = Date.now();
      try {
        const fd = new FormData();
        fd.append("model", modelId); fd.append("prompt", "Turn the background into a sunset sky."); fd.append("size", "1024x1024"); fd.append("n", "1");
        fd.append("image", new Blob([buf], { type: "image/png" }), "test.png");
        const r = await fetchT(openaiBase(env) + "/v1/images/edits", { method: "POST", headers: { "Authorization": "Bearer " + k.openai }, body: fd }, 120000);
        const j = await r.json().catch(() => ({}));
        const d0 = j.data && j.data[0];
        const hasImg = !!(d0 && (d0.b64_json || d0.url));
        const outBytes = d0 && d0.b64_json ? Math.round(d0.b64_json.length * 3 / 4) : (d0 && d0.url ? -1 : 0);   // 결과 이미지 실제 용량(에코 아님 증명)
        const usedModel = (j.model || j.usage && j.usage.model) || modelId;
        return json({ diag: "gptedit", model: modelId, usedModel, endpoint: "/v1/images/edits", usable: r.ok && hasImg, httpStatus: r.status, hasImage: hasImg, outBytes, tookMs: Date.now() - t0,
          error: r.ok ? null : String((j.error && j.error.message) || JSON.stringify(j)).slice(0, 300),
          note: (r.ok && hasImg) ? "이 모델은 OpenAI 편집(edits)을 직접 지원 → 레퍼런스 편집도 이 모델 그대로 사용 가능." : "실패 시 error 문구 확인(사이즈는 16의 배수·비율 1:3~3:1 이어야 함). 앱은 같은 모델로 1024x1024 재시도합니다." });
      } catch (e) {
        return json({ diag: "gptedit", model: modelId, usable: false, error: String((e && e.message) || e).slice(0, 200), tookMs: Date.now() - t0 });
      }
    }
    // 진단(전체 이미지 모델): 스튜디오에 노출된 "모든 이미지 모델"을 실제 생성 경로 그대로 호출해
    // 모델별 성공/실패를 한 번에 보고한다. 노드에 넣기 전 "무엇이 진짜 되는지" 확정하는 용도.
    //   /api/generate?diag=images-all               (전체)
    //   /api/generate?diag=images-all&only=seedream (특정 제공사만)
    //   ※ 실제 생성이므로 모델당 이미지 1장 비용이 발생합니다.
    if (u.searchParams.get("diag") === "images-all") {
      const only = (u.searchParams.get("only") || "").trim();
      const prompt = u.searchParams.get("prompt") || "a photorealistic red apple on a wooden table, soft studio lighting";
      // [표시명, provider] — MODEL_COST(u:'img') 와 같은 집합을 코드 한 곳에서 관리
      const IMG_MODELS_DIAG = [
        ...Object.keys(SEEDREAM_IDS).map(n => [n, "seedream"]),
        ...Object.keys(FLUX_ENDPOINTS).map(n => [n, "flux"]),
        ...Object.keys(OPENAI_IMG_ID).map(n => [n, "openai"]),
        ["Nano Banana", "nanobanana"],
        ["Grok Imagine", "xai"]
      ].filter(([n, p]) => !only || p === only);

      const items = [];
      for (const [name, prov] of IMG_MODELS_DIAG) {
        const t0 = Date.now();
        try {
          // 실제 생성과 동일한 본문으로 자기 자신(POST)을 호출 → 라우팅·페이로드·키까지 그대로 검증
          const rr = await fetchT(new URL("/api/generate", u.origin).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json", "cookie": request.headers.get("cookie") || "" },
            body: JSON.stringify({ provider: prov, model: name, prompt, ratio: "1:1" })
          }, 120000);
          const jj = await rr.json().catch(() => ({}));
          if (jj.url) { items.push({ model: name, provider: prov, ok: true, tookMs: Date.now() - t0, kind: jj.kind || "image" }); continue; }
          if (jj.statusUrl) { items.push({ model: name, provider: prov, ok: true, async: true, tookMs: Date.now() - t0, note: "비동기 제출 성공(폴링 필요)" }); continue; }
          items.push({ model: name, provider: prov, ok: false, httpStatus: rr.status, tookMs: Date.now() - t0,
                       error: String(jj.error || JSON.stringify(jj)).slice(0, 200) });
        } catch (e) {
          items.push({ model: name, provider: prov, ok: false, tookMs: Date.now() - t0, error: String((e && e.message) || e).slice(0, 200) });
        }
      }
      const okCount = items.filter(x => x.ok).length;
      return json({ diag: "images-all", only: only || "(전체)", okCount, failCount: items.length - okCount, total: items.length,
                    fails: items.filter(x => !x.ok).map(x => x.model), items });
    }
    // 진단: Gemini Omni Flash(영상) 가 Vertex 서비스계정으로 되는지 + 응답 형식 확인.
    //   /api/generate?diag=geminiomni   (모델 override: &model=gemini-omni-flash)
    if (u.searchParams.get("diag") === "geminiomni") {
      const sa = gcpCreds(env);
      if (!sa) return json({ diag: "geminiomni", usable: false, error: "Vertex 서비스계정(GCP) 미설정 — Gemini Omni 는 Vertex 필요" });
      const model = u.searchParams.get("model") || "gemini-omni-flash";
      const prompt = u.searchParams.get("prompt") || "A cinematic 4s clip of a red sports car driving on a coastal road at sunset";
      const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
      const out = { diag: "geminiomni", model, tried: [] };
      let tok; try { tok = await gcpToken(sa.email, sa.pem); } catch (e) { return json({ ...out, usable: false, error: "토큰 실패: " + String((e && e.message) || e).slice(0, 160) }); }
      const hostFor = (loc) => loc === "global" ? "https://aiplatform.googleapis.com" : "https://" + loc + "-aiplatform.googleapis.com";
      for (const loc of [VERTEX_LOC, "global"]) {
        const t0 = Date.now();
        try {
          const url = hostFor(loc) + "/v1/projects/" + sa.pid + "/locations/" + loc + "/publishers/google/models/" + model + ":generateContent";
          const r = await fetchT(url, { method: "POST", headers: { "Authorization": "Bearer " + tok, "Content-Type": "application/json" }, body }, 55000);
          const j = await r.json().catch(() => ({}));
          const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
          const mediaPart = parts.find(p => (p.inlineData || p.inline_data || p.fileData || p.file_data));
          const md = mediaPart && (mediaPart.inlineData || mediaPart.inline_data || mediaPart.fileData || mediaPart.file_data) || {};
          out.tried.push({ loc, httpStatus: r.status, ok: r.ok, tookMs: Date.now() - t0,
            hasMedia: !!mediaPart, mimeType: md.mimeType || md.mime_type || null,
            mediaKind: mediaPart ? (mediaPart.fileData || mediaPart.file_data ? "fileUri" : "inlineBase64") : null,
            fileUri: (md.fileUri || md.file_uri || null),
            respKeys: Object.keys(j).slice(0, 8),
            error: r.ok ? null : String((j.error && j.error.message) || JSON.stringify(j)).slice(0, 240) });
          if (r.ok && mediaPart) return json({ ...out, usable: true, via: "vertex", loc });
        } catch (e) { out.tried.push({ loc, error: String((e && e.message) || e).slice(0, 180), tookMs: Date.now() - t0 }); }
      }
      return json({ ...out, usable: false,
        note: "usable:true 면 그 loc/응답형식으로 정식 연결. 404면 모델 접근권한/리전, 400이면 responseModalities 등 파라미터 필요일 수 있음(그 error 문구로 판단)." });
    }
    // 진단 비교: 같은 이미지를 ①우리 R2 URL ②base64 인라인 두 방식으로 각각 제출해 결과 비교.
    // bp 가 우리 R2 를 못 가져와 502 나는지, base64 인라인이면 되는지 한 번에 판별.
    //   /api/generate?diag=seedance-cmp
    if (u.searchParams.get("diag") === "seedance-cmp") {
      if (!k.seedance) return json({ diag: "seedance-cmp", error: "Seedance 키가 서버에 없음" });
      const model = "dreamina-seedance-2-0-260128";
      const origin = new URL(request.url).origin;
      let bucket = null;
      for (const kk in env) { const v = env[kk];
        if (v && typeof v.put === "function" && typeof v.get === "function" &&
            (typeof v.createMultipartUpload === "function" || typeof v.head === "function")) { bucket = v; break; } }
      const submit = async (imageUrlOrData, label) => {
        const payload = { model, content: [
          { type: "text", text: "A cinematic photorealistic product shot." },
          { type: "image_url", image_url: { url: imageUrlOrData }, role: "reference_image" }
        ], ratio: "16:9", duration: 5, watermark: false };
        const t0 = Date.now();
        try {
          const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
            method: "POST",
            headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }, 22000);
          const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch {}
          return { label, httpStatus: r.status, ok: r.ok, tookMs: Date.now() - t0,
                   response: j || String(text).slice(0, 300) };
        } catch (e) { return { label, tookMs: Date.now() - t0, error: String((e && e.message) || e).slice(0, 200) }; }
      };
      // 이미지 준비: 우리 R2 URL 과 base64 둘 다
      let r2Url = null, dataUri = null, prepErr = null;
      try {
        const src = await fetchT(origin + "/images/marketing-hero.png", {}, 10000);
        const buf = await src.arrayBuffer();
        if (bucket) { await bucket.put("diag/ref.png", buf, { httpMetadata: { contentType: "image/png" } });
                      r2Url = origin + "/api/media/diag/ref.png"; }
        let bin = ""; const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        dataUri = "data:image/png;base64," + btoa(bin);
      } catch (e) { prepErr = String((e && e.message) || e).slice(0, 150); }
      const out = { diag: "seedance-cmp", prepErr, r2Url,
                    dataUriKB: dataUri ? Math.round(dataUri.length / 1024) : 0 };
      out.viaR2  = r2Url   ? await submit(r2Url, "r2-url")   : { skipped: "no R2" };
      out.viaB64 = dataUri ? await submit(dataUri, "base64") : { skipped: "no data" };
      return json(out);
    }
    // 진단: 서버에서 사장님 키로 Seedance(BytePlus)를 직접 호출한 "생 응답"을 그대로 반환.
    // 스튜디오/캐시/큰 데이터 전부 배제 → 브라우저로 URL만 열면 진짜 원인이 보인다.
    //   /api/generate?diag=seedance                (기본 1.0 Pro)
    //   /api/generate?diag=seedance&model=dreamina-seedance-2-0-260128   (2.0 직접 지정)
    if (u.searchParams.get("diag") === "seedance") {
      if (!k.seedance) return json({ diag: "seedance", error: "Seedance 키가 서버에 없음" });
      const model = u.searchParams.get("model") || "seedance-1-0-pro-250528";
      const payload = { model, content: [{ type: "text", text: "a calm blue sky over the sea --ratio 16:9 --duration 5" }] };
      const started = Date.now();
      try {
        const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 20000);
        const text = await r.text();
        let j = null; try { j = JSON.parse(text); } catch { /* 비JSON 응답 */ }
        return json({ diag: "seedance", model, host: "bp", httpStatus: r.status, ok: r.ok,
                      tookMs: Date.now() - started, response: j || String(text).slice(0, 600) });
      } catch (e) {
        return json({ diag: "seedance", model, host: "bp", tookMs: Date.now() - started,
                      error: String((e && e.message) || e).slice(0, 300) });
      }
    }
    // 진단2: 스튜디오 생성과 "똑같이" 이미지(레퍼런스)를 포함해서 Seedance 2.0 호출.
    //   /api/generate?diag=seedance-img
    if (u.searchParams.get("diag") === "seedance-img") {
      if (!k.seedance) return json({ diag: "seedance-img", error: "Seedance 키가 서버에 없음" });
      const model = u.searchParams.get("model") || "dreamina-seedance-2-0-260128";
      const origin = new URL(request.url).origin;
      const imgUrl = origin + "/images/marketing-hero.png"; // 공개 이미지 = 스튜디오가 보내는 image_url 재현
      const payload = { model, content: [
        { type: "text", text: "a photorealistic scene --ratio 16:9 --duration 5" },
        { type: "image_url", image_url: { url: imgUrl }, role: "first_frame" }
      ]};
      const started = Date.now();
      try {
        const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 20000);
        const text = await r.text();
        let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
        return json({ diag: "seedance-img", model, imgUrl, httpStatus: r.status, ok: r.ok,
                      tookMs: Date.now() - started, response: j || String(text).slice(0, 600) });
      } catch (e) {
        return json({ diag: "seedance-img", model, imgUrl, tookMs: Date.now() - started,
                      error: String((e && e.message) || e).slice(0, 300) });
      }
    }
    // 진단2b: 스튜디오와 똑같이 first_frame + last_frame 2장을 보내는 경우 (Seedance 2.0)
    //   /api/generate?diag=seedance-img2
    if (u.searchParams.get("diag") === "seedance-img2") {
      if (!k.seedance) return json({ diag: "seedance-img2", error: "Seedance 키가 서버에 없음" });
      const model = u.searchParams.get("model") || "dreamina-seedance-2-0-260128";
      const origin = new URL(request.url).origin;
      const imgUrl = origin + "/images/marketing-hero.png";
      const payload = { model, content: [
        { type: "text", text: "a photorealistic scene --ratio 16:9 --duration 5" },
        { type: "image_url", image_url: { url: imgUrl }, role: "first_frame" },
        { type: "image_url", image_url: { url: imgUrl }, role: "last_frame" }
      ]};
      const started = Date.now();
      try {
        const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 20000);
        const text = await r.text();
        let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
        return json({ diag: "seedance-img2", model, httpStatus: r.status, ok: r.ok,
                      tookMs: Date.now() - started, response: j || String(text).slice(0, 600) });
      } catch (e) {
        return json({ diag: "seedance-img2", model, tookMs: Date.now() - started,
                      error: String((e && e.message) || e).slice(0, 300) });
      }
    }
    // 진단2c: 스튜디오와 완전히 동일 — R2 에 이미지를 올린 뒤 그 /api/media URL 을
    // first_frame + last_frame 으로 Seedance 2.0 에 보냄.  /api/generate?diag=seedance-r2img
    if (u.searchParams.get("diag") === "seedance-r2img") {
      if (!k.seedance) return json({ diag: "seedance-r2img", error: "Seedance 키가 서버에 없음" });
      let bucket = null;
      for (const kk in env) { const v = env[kk];
        if (v && typeof v.put === "function" && typeof v.get === "function" &&
            (typeof v.createMultipartUpload === "function" || typeof v.head === "function")) { bucket = v; break; } }
      if (!bucket) return json({ diag: "seedance-r2img", error: "R2 없음" });
      const origin = new URL(request.url).origin;
      const model = u.searchParams.get("model") || "dreamina-seedance-2-0-260128";
      const started = Date.now();
      try {
        // 실제 이미지를 R2 에 저장 → 그 공개 URL 생성 (스튜디오 호스팅과 동일)
        const src = await fetchT(origin + "/images/marketing-hero.png", {}, 10000);
        const imgBuf = await src.arrayBuffer();
        await bucket.put("diag/ref.png", imgBuf, { httpMetadata: { contentType: "image/png" } });
        const imgUrl = origin + "/api/media/diag/ref.png";
        // 스튜디오와 100% 동일하게 buildSeedancePayload(2.0 형식: reference_image) 사용
        const payload = buildSeedancePayload(
          { model: "Seedance 2.0", seedanceModel: model, prompt: "a photorealistic cinematic scene",
            ratio: "16:9", seconds: 5, firstFrame: imgUrl }, env);
        const submitAt = Date.now();
        const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 22000);
        const text = await r.text();
        let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
        return json({ diag: "seedance-r2img", model, imgUrl, payloadShape: payload,
                      httpStatus: r.status, ok: r.ok, submitMs: Date.now() - submitAt,
                      tookMs: Date.now() - started, response: j || String(text).slice(0, 600) });
      } catch (e) {
        return json({ diag: "seedance-r2img", model, tookMs: Date.now() - started,
                      error: String((e && e.message) || e).slice(0, 300) });
      }
    }
    // 진단2d: V2V(영상 레퍼런스) 가 실제로 BytePlus 에 받아들여지는지 검증.
    //   스튜디오와 100% 동일하게 buildSeedancePayload(Seedance 2.0)로 reference_video 를 포함해 제출.
    //   /api/generate?diag=seedance-v2v                         (사이트 공개 영상 /videos/hero.mp4 사용)
    //   /api/generate?diag=seedance-v2v&vid=https://.../clip.mp4  (직접 영상 URL 지정)
    //   ok:true + response.id 가 나오면 = 모델/요금제가 reference_video 를 정식 수용(=V2V 작동).
    //   400 이면 response.error 문구로 원인(모델 미지원/URL 접근불가 등) 확인.
    if (u.searchParams.get("diag") === "seedance-v2v") {
      if (!k.seedance) return json({ diag: "seedance-v2v", error: "Seedance 키가 서버에 없음" });
      const origin = new URL(request.url).origin;
      const model = u.searchParams.get("model") || "dreamina-seedance-2-0-260128";
      const vid = u.searchParams.get("vid") || (origin + "/videos/hero.mp4");
      const img = u.searchParams.get("img") || (origin + "/images/marketing-hero.png");
      const started = Date.now();
      try {
        // 스튜디오 생성과 동일: reference_image(3D 프레임) + reference_video(원본 영상) + @태그 바인딩
        const payload = buildSeedancePayload(
          { model: "Seedance 2.0", seedanceModel: model,
            prompt: "convert the reference clip into photorealistic live-action, keep the same motion",
            ratio: "16:9", seconds: 5, firstFrame: img, srcVideo: vid }, env);
        const submitAt = Date.now();
        const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 22000);
        const text = await r.text();
        let j = null; try { j = JSON.parse(text); } catch { /* 비JSON */ }
        const roles = (payload.content || []).map(c => c.role || c.type);
        return json({ diag: "seedance-v2v", model, vid, img,
                      hasReferenceVideo: roles.includes("reference_video"),
                      contentRoles: roles, payloadText: (payload.content && payload.content[0] && payload.content[0].text) || "",
                      httpStatus: r.status, ok: r.ok, submitMs: Date.now() - submitAt,
                      taskId: (j && j.id) || null,
                      statusUrl: (j && j.id) ? ("/api/generate?provider=seedance&host=bp&task=" + encodeURIComponent(j.id)) : null,
                      tookMs: Date.now() - started, response: j || String(text).slice(0, 600) });
      } catch (e) {
        return json({ diag: "seedance-v2v", model, vid, tookMs: Date.now() - started,
                      error: String((e && e.message) || e).slice(0, 300) });
      }
    }
    // 진단3: R2 저장소가 실제로 되는지 (스튜디오 이미지 호스팅 경로)
    if (u.searchParams.get("diag") === "r2") {
      let bucket = null;
      for (const kk in env) { const v = env[kk];
        if (v && typeof v.put === "function" && typeof v.get === "function" &&
            (typeof v.createMultipartUpload === "function" || typeof v.head === "function")) { bucket = v; break; } }
      if (!bucket) return json({ diag: "r2", ok: false, error: "R2 바인딩을 찾을 수 없음" });
      try {
        const key = "diag/test.txt";
        await bucket.put(key, "hello");
        const got = await bucket.get(key);
        const body = got ? await got.text() : null;
        return json({ diag: "r2", ok: body === "hello", readBack: body });
      } catch (e) { return json({ diag: "r2", ok: false, error: String((e && e.message) || e).slice(0, 200) }); }
    }
    const media = u.searchParams.get("media");
    if (media) { // 결과 영상 CORS-safe 중계 (마지막 프레임 추출용) — 제공사 도메인만 허용
      let host = "";
      try { host = new URL(media).hostname; } catch { return json({ error: "bad url" }, 400); }
      const okHost = ["cloudfront.net", "runwayml.com", "bytepluses.com", "volces.com",
                      "byteimg.com", "volccdn.com", "googleapis.com", "googleusercontent.com",
                      "bfl.ai", "blob.core.windows.net", "cdn-luma.com", "lumalabs.ai",
                      "hailuoai.video", "minimax.io", "minimaxi.com", "aliyuncs.com",
                      // fal 결과(립싱크·업스케일·모션 전이·ControlNet), Grok, Kling — 빠져 있어 403 이었다
                      "fal.media", "fal.run", "fal.ai", "x.ai", "klingai.com", "kling.ai"]
        .some(d => host === d || host.endsWith("." + d));
      if (!okHost) return json({ error: "host not allowed" }, 403);
      const fwd = {};
      const rng = request.headers.get("Range");
      if (rng) fwd["Range"] = rng; // 브라우저 <video> 시크가 동작하도록 Range 전달
      const fr = await fetch(media, { headers: fwd });
      const h = new Headers();
      h.set("Content-Type", fr.headers.get("Content-Type") || "video/mp4");
      for (const name of ["Content-Range", "Accept-Ranges", "Content-Length"]) {
        const v0 = fr.headers.get(name); if (v0) h.set(name, v0);
      }
      h.set("Access-Control-Allow-Origin", "*");
      h.set("Cache-Control", "no-store");
      return new Response(fr.body, { status: fr.status, headers: h });
    }
    const provider = u.searchParams.get("provider");

    if (provider === "runway") {
      const task = u.searchParams.get("task");
      if (!task || !k.runway) return json({ status: "failed", error: "no task/key" }, 400);
      const r = await fetchT("https://api.dev.runwayml.com/v1/tasks/" + encodeURIComponent(task), {
        headers: { "Authorization": "Bearer " + k.runway, "X-Runway-Version": RUNWAY_VER }
      });
      const j = await r.json();
      if (j.status === "SUCCEEDED") return json({ url: (j.output && j.output[0]) || null, kind: "video" });
      if (j.status === "FAILED") return json({ status: "failed", error: j.failure || "runway failed" });
      return json({ status: j.status || "RUNNING" });
    }

    if (provider === "xai") {
      // Grok 영상 폴링 — GET /v1/videos/{request_id} → status "done" 이면 video.url
      const task = u.searchParams.get("task");
      if (!task || !k.xai) return json({ status: "failed", error: "no task/key" }, 400);
      const r = await fetchT("https://api.x.ai/v1/videos/" + encodeURIComponent(task), {
        headers: { "Authorization": "Bearer " + k.xai }
      });
      const j = await r.json().catch(() => ({}));
      const st = String(j.status || "").toLowerCase();
      const url = (j.video && j.video.url) || (j.data && j.data[0] && j.data[0].url) || null;
      if ((st === "done" || st === "completed" || st === "succeeded") && url) return json({ url, kind: "video" });
      if (st === "failed" || st === "error") return json({ status: "failed", error: (j.error && (j.error.message || j.error)) || "grok video failed" });
      return json({ status: st || "processing" });
    }

    if (provider === "google") {
      const sop = u.searchParams.get("sop");
      if (sop) { // 서비스 계정 오퍼레이션 폴링
        const sa = gcpCreds(env);
        if (!sa) return json({ status: "failed", error: "no service account" }, 400);
        const tok = await gcpToken(sa.email, sa.pem);
        const r = await fetchT(vertexBase(sa.pid) + ":fetchPredictOperation", {
          method: "POST",
          headers: { "Authorization": "Bearer " + tok, "Content-Type": "application/json" },
          body: JSON.stringify({ operationName: sop })
        });
        const j = await r.json();
        if (j.error) return json({ status: "failed", error: j.error.message });
        if (!j.done) return json({ status: "RUNNING" });
        const v0 = (j.response?.videos || [])[0] || {};
        if (v0.bytesBase64Encoded) return json({ url: "data:video/mp4;base64," + v0.bytesBase64Encoded, kind: "video" });
        return v0.gcsUri ? json({ url: v0.gcsUri, kind: "video" })
                         : json({ status: "failed", error: "no video in SA response" });
      }
      const vop = u.searchParams.get("vop");
      if (vop && k.google) { // Vertex Express 오퍼레이션 폴링
        const r = await fetchT(
          "https://aiplatform.googleapis.com/v1/publishers/google/models/veo-3.1-generate-001:fetchPredictOperation?key=" + encodeURIComponent(k.google),
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationName: vop }) });
        const j = await r.json();
        if (j.error) return json({ status: "failed", error: j.error.message });
        if (!j.done) return json({ status: "RUNNING" });
        const vids = j.response?.videos || j.response?.generatedSamples || [];
        const v0 = vids[0] || {};
        if (v0.bytesBase64Encoded) return json({ url: "data:video/mp4;base64," + v0.bytesBase64Encoded, kind: "video" });
        const uri = v0.gcsUri || v0.video?.uri || null;
        return uri ? json({ url: uri, kind: "video" }) : json({ status: "failed", error: "no video in vertex response" });
      }
      const file = u.searchParams.get("file");
      if (file && k.google) { // Veo 결과 파일 스트리밍 (키 비노출)
        const fr = await fetch(file + (file.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(k.google));
        return new Response(fr.body, { status: fr.status, headers: { "Content-Type": fr.headers.get("Content-Type") || "video/mp4" } });
      }
      const op = u.searchParams.get("op");
      if (!op || !k.google) return json({ status: "failed", error: "no op/key" }, 400);
      const r = await fetchT("https://generativelanguage.googleapis.com/v1beta/" + op + "?key=" + encodeURIComponent(k.google));
      const j = await r.json();
      if (j.error) return json({ status: "failed", error: j.error.message });
      if (!j.done) return json({ status: "RUNNING" });
      const uri = j.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || null;
      return uri ? json({ url: "/api/generate?provider=google&file=" + encodeURIComponent(uri), kind: "video" })
                 : json({ status: "failed", error: "no video in response" });
    }
    /* ── 3D 생성 결과 폴링 ──
       성공 시 결과가 어느 필드로 오는지는 아직 실물을 못 봤다(씨댄스는 content.video_url).
       그래서 흔한 이름들을 순서대로 훑고, 그래도 못 찾으면 원본 응답을 그대로 실어
       "무엇이 왔는지" 를 노드에서 바로 확인할 수 있게 한다 — 추측으로 실패를 감추지 않는다. */
    if (provider === "ark3d") {
      const task = u.searchParams.get("task");
      if (!task || !k.seedance) return json({ status: "failed", error: "no task/key" }, 400);
      const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks/" + encodeURIComponent(task), {
        headers: { "Authorization": "Bearer " + k.seedance }
      });
      const j = await r.json().catch(() => ({}));
      if (j.status === "succeeded") {
        // 필드 이름을 모르는 상태에서도 결과를 꺼낸다(위 pickMeshUrl 주석 참조)
        const hit = pickMeshUrl(j.content != null ? j.content : j);
        if (hit) return json({ url: hit.url, kind: "model3d",
          찾은위치: hit.key, 근거: hit.근거, 후보전체: findResultUrls(j).map(x => x.key), raw: j.content });
        return json({ status: "failed",
          error: "생성은 성공했는데 응답에 URL 형태의 값이 하나도 없습니다 — 아래 원본을 확인해야 합니다.", raw: j });
      }
      if (j.status === "failed" || j.error)
        return json({ status: "failed", error: (j.error && j.error.message) || "3D 생성 실패" });
      return json({ status: j.status || "RUNNING" });
    }
    if (provider === "seedance") {
      const task = u.searchParams.get("task");
      const hostId = u.searchParams.get("host") === "vc" ? "vc" : "bp";
      if (!task || !k.seedance) return json({ status: "failed", error: "no task/key" }, 400);
      const r = await fetchT(ARK_HOSTS[hostId] + "/contents/generations/tasks/" + encodeURIComponent(task), {
        headers: { "Authorization": "Bearer " + k.seedance }
      });
      const j = await r.json();
      if (j.status === "succeeded") {
        const url = j.content?.video_url || null;
        // return_last_frame 으로 받은 "제공사가 만든 마지막 프레임" — 이어보기의 다음 클립
        // first_frame 으로 그대로 쓴다(원본 해상도 URL, 브라우저 재추출 불필요).
        const lastFrame = j.content?.last_frame_url || j.content?.last_frame || null;
        /* ModelArk 은 실제 소비 토큰을 usage 로 돌려준다. 우리는 그동안 이걸 버리고
           해상도·길이로 원가를 추정했는데, 제공사가 알려주는 실측값이 있으면 그걸 쓰는 게 정확하다.
           스튜디오가 그대로 /api/usage/record 로 넘기면 추정 없이 청구된다. */
        const tokens = Number(j.usage?.completion_tokens ?? j.usage?.total_tokens ?? 0) || 0;
        return url ? json({ url, kind: "video", lastFrame, usageTokens: tokens }) : json({ status: "failed", error: "no video_url" });
      }
      if (j.status === "failed" || j.error) return json({ status: "failed", error: (j.error && j.error.message) || "seedance failed" });
      return json({ status: j.status || "RUNNING" });
    }
    if (provider === "flux") {
      const poll = u.searchParams.get("poll");
      if (!poll || !k.flux) return json({ status: "failed", error: "no poll/key" }, 400);
      let host = ""; try { host = new URL(poll).hostname; } catch { return json({ status: "failed", error: "bad poll url" }, 400); }
      if (!(host === "api.bfl.ai" || host.endsWith(".bfl.ai"))) return json({ status: "failed", error: "host not allowed" }, 403);
      const r = await fetchT(poll, { headers: { "x-key": k.flux, "accept": "application/json" } });
      const j = await r.json().catch(() => ({}));
      if (j.status === "Ready") {
        const url = j.result && j.result.sample;
        return url ? json({ url, kind: "image" }) : json({ status: "failed", error: "no image in result" });
      }
      if (["Error", "Failed", "Request Moderated", "Content Moderated"].includes(j.status))
        return json({ status: "failed", error: "Flux: " + j.status });
      return json({ status: j.status || "Pending" });
    }
    if (provider === "falcontrol") {
      const st = u.searchParams.get("status"), rs = u.searchParams.get("result");
      if (!st || !k.fal) return json({ status: "failed", error: "no status/key" }, 400);
      const okHost = (v) => { try { const h = new URL(v).hostname; return h.endsWith("fal.run") || h.endsWith("fal.ai") || h.endsWith("fal.media"); } catch { return false; } };
      if (!okHost(st) || (rs && !okHost(rs))) return json({ status: "failed", error: "host not allowed" }, 403);
      const r = await fetchT(st, { headers: { "Authorization": "Key " + k.fal, "accept": "application/json" } });
      const j = await r.json().catch(() => ({}));
      const status = j.status;
      if (status === "COMPLETED") {
        const rr = await fetchT(rs, { headers: { "Authorization": "Key " + k.fal, "accept": "application/json" } });
        const rj = await rr.json().catch(() => ({}));
        const url = rj.images && rj.images[0] && rj.images[0].url;
        return url ? json({ url, kind: "image" }) : json({ status: "failed", error: "fal: 결과에 이미지 없음" });
      }
      if (status === "FAILED" || j.error) return json({ status: "failed", error: "fal: " + (j.error || status || "실패") });
      return json({ status: status || "IN_PROGRESS" });
    }
    if (provider === "hailuo") {
      const task = u.searchParams.get("task");
      if (!task || !k.hailuo) return json({ status: "failed", error: "no task/key" }, 400);
      const r = await fetchT(HAILUO_BASE + "/query/video_generation?task_id=" + encodeURIComponent(task),
        { headers: { "Authorization": "Bearer " + k.hailuo } });
      const j = await r.json().catch(() => ({}));
      if (j.status === "Fail") return json({ status: "failed", error: "Hailuo 생성 실패" });
      if (j.status !== "Success") return json({ status: j.status || "Processing" });
      const fid = j.file_id;
      if (!fid) return json({ status: "failed", error: "no file_id" });
      const gid = pick(env, ["Hailuo_GROUP_ID", "HAILUO_GROUP_ID", "MINIMAX_GROUP_ID", "hailuo_group_id"]);
      const fr = await fetchT(HAILUO_BASE + "/files/retrieve?file_id=" + encodeURIComponent(fid) +
                             (gid ? "&GroupId=" + encodeURIComponent(gid) : ""),
        { headers: { "Authorization": "Bearer " + k.hailuo } });
      const fj = await fr.json().catch(() => ({}));
      const url = fj.file && (fj.file.download_url || fj.file.backup_download_url);
      return url ? json({ url, kind: "video" }) : json({ status: "failed", error: "no download_url" });
    }
    if (provider === "luma") {
      const task = u.searchParams.get("task");
      if (!task || !k.luma) return json({ status: "failed", error: "no task/key" }, 400);
      const r = await fetchT(LUMA_BASE + "/generations/" + encodeURIComponent(task),
        { headers: { "Authorization": "Bearer " + k.luma, "accept": "application/json" } });
      const j = await r.json().catch(() => ({}));
      if (j.state === "failed")
        return json({ status: "failed", error: (j.failure_reason || "Luma 생성 실패") + (j.failure_code ? " (" + j.failure_code + ")" : "") });
      if (j.state === "completed") {
        // Agents API 는 output 배열로 준다(구 API 의 assets.video 가 아니다).
        const out = Array.isArray(j.output) ? j.output : [];
        const url = (out[0] && out[0].url) || (j.assets && (j.assets.video || j.assets.image)) || null;
        if (!url) return json({ status: "failed", error: "결과에 URL 이 없습니다", raw: j });
        const isVid = /\.(mp4|mov|webm)(\?|#|$)/i.test(url) || String(j.type || "").indexOf("video") >= 0;
        return json({ url, kind: isVid ? "video" : "image" });
      }
      return json({ status: j.state || "queued" });
    }
    if (provider === "falq") {
      // 범용 fal 큐 폴링 (모션 전이 등)
      const task = u.searchParams.get("task");
      const model = u.searchParams.get("model") || "";
      if (!task || !model || !k.fal) return json({ status: "failed", error: "no task/model/key" }, 400);
      const base = FAL_QUEUE + model + "/requests/" + encodeURIComponent(task);
      const sr = await falFetch("falq", base + "/status", { headers: { "Authorization": "Key " + k.fal } });
      const sj = await sr.json().catch(() => ({}));
      const st = String(sj.status || "").toUpperCase();
      if (st === "FAILED" || sj.error) return json({ status: "failed", error: sj.error || "생성 실패" });
      if (st !== "COMPLETED") return json({ status: (st || "IN_PROGRESS").toLowerCase() });
      const rr = await falFetch("falq", base, { headers: { "Authorization": "Key " + k.fal } });
      const rj = await rr.json().catch(() => ({}));
      const url = (rj.video && rj.video.url) || rj.url || (rj.output && rj.output.video && rj.output.video.url) || (Array.isArray(rj.videos) && rj.videos[0] && rj.videos[0].url);
      return url ? json({ url, kind: "video" }) : json({ status: "failed", error: "모션 전이: 결과 영상 URL 없음" });
    }
    if (provider === "kling") {
      // 1순위: 클링 공식 API 폴링
      const cr = klingCreds(env);
      if (cr) {
        const task = u.searchParams.get("task");
        // ep 는 Kling 조회 경로에 그대로 들어가므로 허용 목록으로 고정(경로 조작 차단)
        const EP_OK = { text2video: 1, image2video: 1, "video-extend": 1 };
        const epRaw = u.searchParams.get("ep") || "text2video";
        const ep = EP_OK[epRaw] ? epRaw : "text2video";
        if (!task) return json({ status: "failed", error: "no task" }, 400);
        const auth = await klingAuth(cr);
        const r = await fetchT(cr.base + "/v1/videos/" + ep + "/" + encodeURIComponent(task), { headers: { "Authorization": auth } });
        const j = await r.json().catch(() => ({}));
        if (j.code !== 0) return json({ status: "failed", error: String(j.message || "Kling 조회 실패").slice(0, 200) });
        const st = String((j.data && j.data.task_status) || "").toLowerCase();
        if (st === "failed") return json({ status: "failed", error: String((j.data && j.data.task_status_msg) || "Kling 생성 실패").slice(0, 200) });
        if (st !== "succeed") return json({ status: st || "processing" });
        const vids = (j.data && j.data.task_result && j.data.task_result.videos) || [];
        const url = vids[0] && vids[0].url;
        // videoId — Kling "영상 확장"(video-extend)이 이 id 를 요구한다. 30일 내 Kling 생성분만 확장 가능.
        const videoId = (vids[0] && (vids[0].id || vids[0].video_id)) || null;
        return url ? json({ url, kind: "video", videoId, videoProvider: "kling" })
                   : json({ status: "failed", error: "Kling: 결과 영상 URL 없음" });
      }
      /* 예전엔 여기에 fal.ai 폴링 폴백이 있었다. 제출 자체가 공식 API 로만 나가게 바뀌어
         새로 들어올 작업이 없고, model 을 쿼리로 받아 fal 로 중계하는 모양이라
         남의 fal 작업을 우리 키로 조회하는 통로가 되기도 했다 → 없앴다. */
      return json({ status: "failed", error: "Kling 연동이 설정되지 않았습니다(공식 API 키 필요)" }, 400);
    }
    return json({ error: "unknown provider" }, 400);
  }

  /* ══ POST: 생성 요청 ══ */
  if (request.method !== "POST") return json({ error: "method" }, 405);
  // 본문이 너무 크면(=예전 스튜디오가 원본 프레임을 통째로 보내는 경우) 파싱하다 함수가 죽어
  // Cloudflare 플랫폼 502가 남 → 먼저 크기를 보고 읽을 수 있는 에러로 막는다.
  const cl = Number(request.headers.get("Content-Length") || 0);
  if (cl > 3 * 1024 * 1024)
    return json({ error: "요청 데이터가 너무 큽니다(" + Math.round(cl / 1024 / 1024) + "MB). 이미지가 R2로 업로드되지 않고 원본이 통째로 실렸습니다 — Ctrl+Shift+R(강력 새로고침) 후 다시 시도하세요." }, 413);
  let b; try { b = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  applyCameraPreset(b);   // 카메라 모션 프리셋(b.camera) → 프롬프트에 시네마틱 지시문 주입
  // ── 브랜드 킷 자동 적용 ──
  //  계정에 저장해 둔 톤앤매너·컬러·금지 요소를 모든 생성에 자동으로 얹는다.
  //  스튜디오·공개 API·Claude MCP 어디서 호출해도 같은 브랜드 룩이 유지된다.
  //  요청에 brandKit:false 를 주면 이번 생성만 건너뛴다(원본 그대로 뽑고 싶을 때).
  if (b.brandKit !== false && gateUser && gateUser.id) {
    try {
      const db2 = resolveDB(env);
      const kit = db2 ? await getBrandKit(db2, gateUser.id) : null;
      if (kit) {
        const out = applyBrandKit(kit, b.prompt || "", b.negative || "");
        b.prompt = out.prompt; b.negative = out.negative;
        // 로고를 레퍼런스로 쓰기로 했다면 레퍼런스 목록 맨 뒤에 붙인다(첫 프레임은 건드리지 않는다)
        if (kit.useLogo && /^https?:\/\//.test(kit.logoUrl)) {
          const refs = Array.isArray(b.refImages) ? b.refImages.slice() : [];
          if (refs.indexOf(kit.logoUrl) < 0) refs.push(kit.logoUrl);
          b.refImages = refs;
        }
      }
    } catch (_e) { /* 브랜드 킷 실패가 생성을 막지는 않는다 */ }
  }
  const provider = b.provider;

  /* dryRun — 실제 호출 없이 매핑된 페이로드만 반환 (검증용) */
  if (b.dryRun) {
    const payload = provider === "runway" ? buildRunwayPayload(b)
                  : provider === "runway_aleph" ? buildAlephPayload(b)
                  : provider === "xai"    ? buildXaiPayload(b)
                  : provider === "google" ? buildVeoPayload(b)
                  : provider === "seedance" ? buildSeedancePayload(b, env)
                  : provider === "seedream" ? buildSeedreamPayload(b, env)
                  : provider === "music"    ? { engines: musicEngines(env, k), prompt: (b.prompt || "").slice(0, 300), seconds: Math.min(Math.max(Number(b.seconds) || 30, 10), 120) }
                  // 필드명은 실제 제출과 같아야 한다(예전엔 미리보기만 factor 로 찍혀 실제 요청과 달라 보였다)
                  : provider === "upscale"  ? { model: pick(env, ["FAL_UPSCALE_MODEL", "fal_upscale_model"]) || "fal-ai/topaz/upscale/video", video_url: b.srcVideo || null, upscale_factor: (b.res === "4K" ? 4 : 2) }
                  : provider === "flux"     ? buildFluxPayload(b)
                  : provider === "falcontrol" ? buildFalControlPayload(b)
                  : provider === "nanobanana" ? buildNanoPayload(b)
                  : provider === "openai"   ? buildOpenAIImagePayload(b)
                  : provider === "hailuo"   ? buildHailuoPayload(b)
                  : provider === "luma"     ? buildLumaPayload(b)
                  // Kling 은 제출 직전 klingApiSpec 으로 엔드포인트/모드를 정하므로 그 결정값을 미리보기로 제공
                  : provider === "kling"    ? (() => { const s = klingApiSpec(b);
                      return { model: s.m, mode: s.mode, endpoint: "/v1/videos/" + s.ep,
                               prompt: (b.prompt || "").slice(0, 200), duration: (Number(b.seconds) || 5) <= 6 ? 5 : 10,
                               aspect_ratio: b.ratio || "16:9" }; })() : null;
    return json({ dryRun: true, provider, payload,
                  note: "No provider API was called." });
  }

  if (provider === "runway") {
    if (!k.runway) return json({ error: "Runway 연동이 설정되지 않았습니다" }, 500);
    const payload = buildRunwayPayload(b);
    if (!payload.promptImage) return json({ error: "Runway(gen4_turbo)는 첫 프레임 또는 레퍼런스 이미지가 필요합니다. 레퍼런스 노드를 연결하세요." }, 400);
    // 종료 예정 ID(gen3a_turbo)는 실패 시 같은 요금의 후속(gen4_turbo)으로 물러난다
    const rwIds = RUNWAY_ALT[payload.model] || [payload.model];
    let rwStatus = 502, rwMsg = "요청 실패";
    for (const mid of rwIds) {
      const r = await fetchT("https://api.dev.runwayml.com/v1/image_to_video", {
        method: "POST",
        headers: { "Authorization": "Bearer " + k.runway, "X-Runway-Version": RUNWAY_VER, "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, model: mid })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.id) return json({ statusUrl: "/api/generate?provider=runway&task=" + encodeURIComponent(j.id), modelId: mid });
      rwStatus = r.status;
      rwMsg = "[" + mid + "] " + String(j.error || j.message || JSON.stringify(j)).slice(0, 200);
      // 모델 이름 문제가 아니면(잔액·검열·파라미터) 다른 ID 로 바꿔도 결과가 같다
      if (!/model|not\s*found|invalid|unsupported|deprecat|sunset/i.test(rwMsg)) break;
    }
    return json({ error: "Runway HTTP " + rwStatus + ": " + rwMsg }, 502);
  }

  /* ── V2V 자동 라우팅 (정확도 최상) ──
     원본 영상 하나로 진짜 영상→영상 변환을 수행. 사용 가능한 네이티브 V2V 모델 중
     최고 품질을 자동 선택: 1) Runway Gen-4 Aleph(실사 리스타일 최상급) → 2) Seedance V2V(reference_video).
     둘 다 실패/미설정이면 명확히 안내. (프레임 재조립식 저품질 우회는 쓰지 않음) */
  if (provider === "v2v_auto") {
    const srcUrl = b.srcVideo || "";
    const hasNativeSrc = srcUrl && /^https?:\/\//.test(srcUrl);
    if (!hasNativeSrc && !hasSrcFrame(b))
      return json({ error: "V2V(영상→영상)는 원본 영상이 필요합니다. 영상을 옴니 레퍼런스(영상)에 넣으면 자동 업로드됩니다(R2)." }, 400);

    // 1순위: Runway Gen-4 Aleph — 실사 V2V 최상급 (원본 영상 URL 필요)
    if (hasNativeSrc && k.runway) {
      const payload = buildAlephPayload(b);
      const r = await fetchT("https://api.dev.runwayml.com/v1/video_to_video", {
        method: "POST",
        headers: { "Authorization": "Bearer " + k.runway, "X-Runway-Version": RUNWAY_VER, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.id) return json({ statusUrl: "/api/generate?provider=runway&task=" + encodeURIComponent(j.id), routed: "runway_aleph" });
      if (!k.seedance) return json({ error: "Runway Aleph V2V 실패 HTTP " + r.status + ": " + String(j.error || j.message || JSON.stringify(j)).slice(0, 200) }, 502);
      // Aleph 실패 → Seedance 로 폴백
    }

    // 2순위: Seedance V2V (reference_video, 원본 영상 URL 필요)
    if (hasNativeSrc && k.seedance) {
      const sb = Object.assign({}, b, { model: "Seedance 2.0" }); // reference_video 지원 모델 강제
      const payload = buildSeedancePayload(sb, env);
      const hosts = pick(env, ["SEEDANCE_USE_CN", "seedance_use_cn"]) ? ["bp", "vc"] : ["bp"];
      let lastErr = null;
      for (const hostId of hosts) {
        let r, j;
        try {
          r = await fetchT(ARK_HOSTS[hostId] + "/contents/generations/tasks", {
            method: "POST",
            headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }, 22000);
          j = await r.json().catch(() => ({}));
        } catch (e) { lastErr = String((e && e.message) || e).slice(0, 140); continue; }
        if (r.ok && j.id) return json({ statusUrl: "/api/generate?provider=seedance&host=" + hostId + "&task=" + encodeURIComponent(j.id), routed: "seedance" });
        lastErr = "HTTP " + r.status + " " + ((j.error && (j.error.message || j.error.code)) || "");
        if (r.status !== 401 && r.status !== 403 && r.status !== 404) break;
      }
      return json({ error: "Seedance V2V 실패: " + String(lastErr).slice(0, 200) }, 502);
    }

    // 3순위: 모션 전이(fal) — 원본 영상의 움직임을 유지하며 스타일 변환 (base 모델 무관 공통 레이어)
    if (hasNativeSrc && k.fal) {
      const model = falV2VModel(env);
      const r = await falFetch("motion", FAL_QUEUE + model, {
        method: "POST", headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
        body: JSON.stringify(buildMotionPayload(b))
      });
      const j = await r.json().catch(() => ({}));
      const reqId = j.request_id || j.requestId;
      if (r.ok && reqId) return json({ statusUrl: "/api/generate?provider=falq&task=" + encodeURIComponent(reqId) + "&model=" + encodeURIComponent(model), routed: "motion" });
      // 모션 전이 실패 → 프레임 브리지로 계속
    }

    // 4순위(브리지): 위가 모두 안 되면, 원본 프레임을 이미지→영상으로 이어받아 변환 (Kling)
    if (hasSrcFrame(b)) {
      const cr = klingCreds(env);
      const kb = Object.assign({}, b, { model: "Kling 2.1 Master (이미지→영상)" });
      if (cr) {
        const spec = klingApiSpec(kb);
        const auth = await klingAuth(cr);
        const r = await fetchT(cr.base + "/v1/videos/image2video", {
          method: "POST", headers: { "Authorization": auth, "Content-Type": "application/json" },
          body: JSON.stringify(buildKlingApiPayload(kb, spec))
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.code === 0 && j.data && j.data.task_id)
          return json({ statusUrl: "/api/generate?provider=kling&task=" + encodeURIComponent(j.data.task_id) + "&ep=image2video", routed: "kling_bridge" });
        return json({ error: "V2V 브리지(Kling) 실패: " + String(j.message || JSON.stringify(j)).slice(0, 200) }, 502);
      }
      /* 클링 브리지도 공식 API 로만 간다(위 분기). fal 경유는 같은 모델을 중개로 부르는 것이라 없앴다. */
    }

    return json({ error: "V2V(영상→영상)를 하려면 Runway·Seedance·Kling 중 하나 이상의 공식 API 키가 필요합니다(모션 전이만 쓰려면 FAL_API_KEY)." }, 500);
  }

  /* 나레이션(AI 음성 해설) — 대본→TTS 음성 생성 후 원본 영상에 오디오 트랙을 덧입힘(보이스오버).
     화면 속 인물의 입은 움직이지 않음. (fal ffmpeg merge-audio-video) */
  if (provider === "narrate") {
    if (!k.fal) return json({ error: "나레이션 합성에는 FAL_API_KEY(영상·음성 병합)이 필요합니다." }, 500);
    const videoUrl = String(b.videoUrl || b.srcVideo || "").trim();
    if (!/^https?:\/\//.test(videoUrl))
      return json({ error: "나레이션을 입힐 영상의 공개 URL이 필요합니다. (출력 노드의 영상을 음성 노드에 연결하세요)" }, 400);
    const origin = new URL(request.url).origin;
    const tts = await synthTTSUrl(env, origin, b, fetchT, request.headers.get("cookie"));
    if (tts.error) return json({ error: "나레이션 " + tts.error }, tts.status || 502);
    // fal ffmpeg — 원본 영상 + 나레이션 오디오 병합 (env 로 모델 교체 가능)
    const model = pick(env, ["FAL_MERGE_MODEL", "fal_merge_model"]) || "fal-ai/ffmpeg-api/merge-audio-video";
    const r = await falFetch("narrate", FAL_QUEUE + model, {
      method: "POST", headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, audio_url: tts.audioUrl })
    });
    const j = await r.json().catch(() => ({}));
    const reqId = j.request_id || j.requestId;
    if (!r.ok || !reqId) return json({ error: "나레이션 합성(fal " + model + ") 실패: " + String(j.detail || j.error || JSON.stringify(j)).slice(0, 220) }, 502);
    return json({ statusUrl: "/api/generate?provider=falq&task=" + encodeURIComponent(reqId) + "&model=" + encodeURIComponent(model), audioUrl: tts.audioUrl });
  }

  /* 립싱크(인물이 말하는 영상) — 대본→TTS 음성 생성 후 audio-driven 립싱크 모델로
     화면 속 인물의 입 모양을 음성에 맞춰 실제로 움직이게 함. (fal sync-lipsync) */
  if (provider === "lipsync") {
    if (!k.fal) return json({ error: "립싱크에는 FAL_API_KEY 가 필요합니다." }, 500);
    const videoUrl = String(b.videoUrl || b.srcVideo || "").trim();
    if (!/^https?:\/\//.test(videoUrl))
      return json({ error: "립싱크할 영상의 공개 URL이 필요합니다. (얼굴/인물이 나오는 영상을 연결하세요)" }, 400);
    const origin = new URL(request.url).origin;
    const tts = await synthTTSUrl(env, origin, b, fetchT, request.headers.get("cookie"));
    if (tts.error) return json({ error: "립싱크 " + tts.error }, tts.status || 502);
    // fal 립싱크 모델 (env 로 교체 가능). sync-lipsync 은 video_url+audio_url 규격.
    const model = pick(env, ["FAL_LIPSYNC_MODEL", "fal_lipsync_model"]) || "fal-ai/sync-lipsync";
    const payload = { video_url: videoUrl, audio_url: tts.audioUrl, sync_mode: "cut_off" };
    const r = await falFetch("lipsync", FAL_QUEUE + model, {
      method: "POST", headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(() => ({}));
    const reqId = j.request_id || j.requestId;
    if (!r.ok || !reqId) return json({ error: "립싱크(fal " + model + ") 실패: " + String(j.detail || j.error || JSON.stringify(j)).slice(0, 220) }, 502);
    return json({ statusUrl: "/api/generate?provider=falq&task=" + encodeURIComponent(reqId) + "&model=" + encodeURIComponent(model), audioUrl: tts.audioUrl });
  }

  /* 목소리 교체 → 립싱크 (Revoice) — 영상에서 뽑은 음성을 ElevenLabs Speech-to-Speech 로
     다른 목소리로 교체한 뒤, 그 음성에 맞춰 인물 입 모양을 립싱크. (클라이언트가 추출 음성 URL 제공) */
  if (provider === "revoice") {
    const el = pick(env, ["ElevenLabs_API_KEY", "ELEVENLABS_API_KEY", "elevenlabs_api_key"]);
    if (!el) return json({ error: "목소리 교체에는 ElevenLabs_API_KEY 가 필요합니다." }, 500);
    if (!k.fal) return json({ error: "립싱크에는 FAL_API_KEY 가 필요합니다." }, 500);
    const videoUrl = String(b.videoUrl || "").trim();
    const audioUrl = String(b.audioUrl || "").trim();
    if (!/^https?:\/\//.test(videoUrl)) return json({ error: "영상의 공개 URL이 필요합니다(얼굴이 보이는 영상)." }, 400);
    if (!/^https?:\/\//.test(audioUrl)) return json({ error: "영상에서 추출한 음성의 공개 URL이 필요합니다(영상에 말소리가 있어야 합니다)." }, 400);
    const voice = (String(b.voice || "").replace(/^el:/, "").trim()) || "21m00Tcm4TlvDq8ikWAM";
    const stsModel = String(b.stsModel || "eleven_multilingual_sts_v2");
    const origin = new URL(request.url).origin;

    // 1) 추출 음성 가져오기
    const ar = await fetchT(audioUrl, {}, 30000);
    if (!ar.ok) return json({ error: "추출한 음성을 불러오지 못했습니다." }, 502);
    const inBuf = await ar.arrayBuffer();
    if (!inBuf || inBuf.byteLength < 128) return json({ error: "추출한 음성이 비어 있습니다(영상에 말소리가 없을 수 있습니다)." }, 400);
    const inType = ar.headers.get("content-type") || "audio/wav";

    // 2) ElevenLabs Speech-to-Speech — 억양·타이밍 유지하며 목소리만 교체
    const fd = new FormData();
    fd.append("audio", new Blob([inBuf], { type: inType }), "in." + (/wav/i.test(inType) ? "wav" : /mp3|mpeg/i.test(inType) ? "mp3" : "webm"));
    fd.append("model_id", stsModel);
    fd.append("output_format", "mp3_44100_128");
    fd.append("remove_background_noise", "true");
    const sr = await fetchT("https://api.elevenlabs.io/v1/speech-to-speech/" + encodeURIComponent(voice),
      { method: "POST", headers: { "xi-api-key": el, "accept": "audio/mpeg" }, body: fd }, 120000);
    if (!sr.ok) { let et = ""; try { et = await sr.text(); } catch {} return json({ error: "일레븐랩스 목소리 교체 실패 HTTP " + sr.status + ": " + et.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220) }, 502); }
    const newBuf = await sr.arrayBuffer();
    if (!newBuf || newBuf.byteLength < 128) return json({ error: "교체된 음성이 비어 있습니다." }, 502);

    // 3) R2 호스팅
    const bucket = r2BucketOf(env);
    if (!bucket) return json({ error: "오디오 저장용 R2 버킷을 찾을 수 없습니다." }, 500);
    const key = "revoice/" + crypto.randomUUID() + ".mp3";
    await bucket.put(key, newBuf, { httpMetadata: { contentType: "audio/mpeg" } });
    const newAudioUrl = origin + "/api/media/" + key;

    // 4) fal 립싱크 — 원본 영상 + 교체된 음성
    const model = pick(env, ["FAL_LIPSYNC_MODEL", "fal_lipsync_model"]) || "fal-ai/sync-lipsync";
    const r2 = await falFetch("revoice", FAL_QUEUE + model, {
      method: "POST", headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl, audio_url: newAudioUrl, sync_mode: "cut_off" })
    });
    const j2 = await r2.json().catch(() => ({}));
    const reqId2 = j2.request_id || j2.requestId;
    if (!r2.ok || !reqId2) return json({ error: "립싱크(fal " + model + ") 실패: " + String(j2.detail || j2.error || JSON.stringify(j2)).slice(0, 220) }, 502);
    return json({ statusUrl: "/api/generate?provider=falq&task=" + encodeURIComponent(reqId2) + "&model=" + encodeURIComponent(model), audioUrl: newAudioUrl });
  }

  /* 모션 전이(Motion Transfer) 단독 — 원본 영상의 움직임 유지 + 스타일 변환 (fal video-to-video) */
  if (provider === "motion") {
    if (!k.fal) return json({ error: "모션 전이(V2V)는 FAL_API_KEY 가 필요합니다." }, 500);
    const src = b.srcVideo || "";
    if (!/^https?:\/\//.test(src)) return json({ error: "모션 전이는 원본 영상의 공개 URL이 필요합니다. 영상을 옴니 레퍼런스(영상)에 넣으면 자동 업로드됩니다(R2)." }, 400);
    const model = falV2VModel(env);
    const r = await falFetch("motion", FAL_QUEUE + model, {
      method: "POST", headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
      body: JSON.stringify(buildMotionPayload(b))
    });
    const j = await r.json().catch(() => ({}));
    const reqId = j.request_id || j.requestId;
    if (!r.ok || !reqId) return json({ error: "모션 전이(fal " + model + ") 실패: " + String(j.detail || j.error || JSON.stringify(j)).slice(0, 200) }, 502);
    return json({ statusUrl: "/api/generate?provider=falq&task=" + encodeURIComponent(reqId) + "&model=" + encodeURIComponent(model) });
  }

  if (provider === "runway_aleph") {
    if (!k.runway) return json({ error: "Runway 연동이 설정되지 않았습니다" }, 500);
    const srcUri = buildAlephPayload(b).videoUri;
    if (!srcUri || !/^https?:\/\//.test(srcUri))
      return json({ error: "Runway Aleph(V2V)는 입력 영상의 공개 URL이 필요합니다. 영상을 옴니 레퍼런스에 넣으면 자동 업로드됩니다(R2)." }, 400);
    // 새 모델 ID(aleph2)를 먼저 쓰고, 그 ID 를 모른다는 응답이면 기존 ID 로 한 번 더 시도한다.
    let lastMsg = "요청 실패", lastStatus = 502;
    for (const mid of ALEPH_MODELS) {
      const r = await fetchT("https://api.dev.runwayml.com/v1/video_to_video", {
        method: "POST",
        headers: { "Authorization": "Bearer " + k.runway, "X-Runway-Version": RUNWAY_VER, "Content-Type": "application/json" },
        body: JSON.stringify(buildAlephPayload(b, mid))
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.id) return json({ statusUrl: "/api/generate?provider=runway&task=" + encodeURIComponent(j.id), modelId: mid });
      lastStatus = r.status;
      lastMsg = "[" + mid + "] " + String(j.error || j.message || JSON.stringify(j)).slice(0, 200);
      // 모델 이름 문제가 아니면(잔액·검열·파라미터) 다른 ID 를 시도해도 결과가 같다.
      if (!/model|not\s*found|invalid|unsupported|deprecat/i.test(lastMsg)) break;
    }
    return json({ error: "Runway Aleph HTTP " + lastStatus + ": " + lastMsg }, 502);
  }

  if (provider === "xai") {
    if (!k.xai) return json({ error: "Grok 연동이 설정되지 않았습니다" }, 500);
    const isVideo = b.kind === "video" || /영상/.test(String(b.model || ""));
    if (isVideo) {
      // 영상: 비동기 — 생성 태스크 POST → request_id 받아 폴링 statusUrl 반환
      const ep = pick(env, ["GROK_VIDEO_ENDPOINT", "grok_video_endpoint"]) || "https://api.x.ai/v1/videos/generations";
      // Grok 영상은 공개 URL 만 받는다. 이어보기(앞 영상의 마지막 프레임)는 data:URI 로 오므로
      // 그대로 두면 첫 프레임이 조용히 빠져 "이어지지 않는" 영상이 나온다 → R2 에 올려 URL 로 바꾼다.
      const _first = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
      if (_first && /^data:image\//i.test(String(_first))) {
        const hosted = await hostImageDataUri(env, new URL(request.url).origin, _first);
        if (hosted) b = { ...b, firstFrame: hosted };
      }
      const r = await fetchT(ep, {
        method: "POST",
        headers: { "Authorization": "Bearer " + k.xai, "Content-Type": "application/json" },
        body: JSON.stringify(buildXaiVideoPayload(b, env))
      });
      const j = await r.json().catch(() => ({}));
      const direct = (j.video && j.video.url) || (j.data && j.data[0] && j.data[0].url) || null;   // 혹시 즉시 URL
      if (direct) return json({ url: direct, kind: "video" });
      const id = j.request_id || j.id || null;
      if (r.ok && id) return json({ statusUrl: "/api/generate?provider=xai&task=" + encodeURIComponent(id), kind: "video" });
      return json({ error: "Grok 영상 HTTP " + r.status + ": " + String(JSON.stringify(j.error || j)).slice(0, 220) }, 502);
    }
    const r = await fetchT("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": "Bearer " + k.xai, "Content-Type": "application/json" },
      body: JSON.stringify(buildXaiPayload(b))
    });
    const j = await r.json().catch(() => ({}));
    const url = j.data?.[0]?.url || null;
    if (!r.ok || !url) return json({ error: "Grok HTTP " + r.status + ": " + String(JSON.stringify(j.error || j)).slice(0, 220) }, 502);
    return json({ url, kind: "image" });
  }

  if (provider === "google") {
    /* Veo 는 이미지를 base64(bytesBase64Encoded)로만 받는다. 그런데 스튜디오는 google 을
       "URL 로 보내는 제공사" 목록에도, "base64 로 인라인하는 제공사" 목록에도 넣지 않아
       값이 들어온 그대로 흘러간다 — 파일을 방금 올린 경우는 data:URI 라 괜찮지만,
       앞 노드에서 생성된 결과를 첫 프레임으로 이으면 R2 의 https 주소라서 조용히 버려졌다.
       (노드에는 첫/끝 프레임 포트가 열려 있고 요금도 그대로 붙는데 이미지→영상이 아니라
        텍스트→영상으로 만들어진다.) 여기서 서버가 직접 base64 로 바꾼다 —
       /api/v1/generate·MCP 로 들어오는 요청까지 한 곳에서 덮인다. */
    const toData = async (v) => (v && /^https?:\/\//i.test(String(v)) ? (await urlToDataUri(v)) || v : v);
    b = { ...b, firstFrame: await toData(b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage),
                lastFrame: await toData(b.lastFrame) };
    const payload = buildVeoPayload(b);
    // ⓪ 서비스 계정(OAuth2) — 정식 Vertex 경로, 지역/키 제약 없음
    const sa = gcpCreds(env);
    if (sa) {
      try {
        const tok = await gcpToken(sa.email, sa.pem);
        const r0 = await fetchT(vertexBase(sa.pid) + ":predictLongRunning", {
          method: "POST",
          headers: { "Authorization": "Bearer " + tok, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const j0 = await r0.json();
        if (r0.ok && j0.name)
          return json({ statusUrl: "/api/generate?provider=google&sop=" + encodeURIComponent(j0.name) });
        if (j0.error) return json({ error: "Vertex(SA): " + j0.error.message }, 502);
      } catch (e) { return json({ error: "Vertex(SA): " + String(e.message || e).slice(0, 200) }, 502); }
    }
    if (!k.google) return json({ error: "Veo 연동이 설정되지 않았습니다" }, 500);
    // ① Vertex AI Express (지역 우회)
    const vr = await fetchT(
      "https://aiplatform.googleapis.com/v1/publishers/google/models/veo-3.1-generate-001:predictLongRunning?key=" + encodeURIComponent(k.google),
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const vj = await vr.json().catch(() => ({}));
    if (vr.ok && vj.name)
      return json({ statusUrl: "/api/generate?provider=google&vop=" + encodeURIComponent(vj.name) });
    // ② AI Studio 폴백 — generateAudio/resolution 은 Gemini API 가 모르는 필드라 빼고 보낸다
    const aiBody = JSON.stringify(buildVeoPayload(b, { noVertexOnly: true }));
    let lastErr = "no operation";
    for (const mid of VEO_AISTUDIO_MODELS) {
      const r = await fetchT(
        "https://generativelanguage.googleapis.com/v1beta/models/" + mid + ":predictLongRunning?key=" + encodeURIComponent(k.google),
        { method: "POST", headers: { "Content-Type": "application/json" }, body: aiBody });
      const j = await r.json().catch(() => ({}));
      if (j.name) return json({ statusUrl: "/api/generate?provider=google&op=" + encodeURIComponent(j.name), modelId: mid });
      lastErr = "[" + mid + "] " + String((j.error && j.error.message) || "no operation");
      // 모델 이름 문제가 아니면(키·할당량·검열) 다른 이름으로 바꿔도 결과가 같다
      if (!/model|not found|unsupported|invalid/i.test(lastErr)) break;
    }
    return json({ error: "Veo: " + (vj.error?.message || "") + " / " + lastErr }, 502);
  }

  /* ── 3D 생성 제출 (Hyper3D / Hitem3D) ──
     씨댄스와 같은 경로·봉투를 쓰고 키도 같다. 모델 ID 후보를 순서대로 시도하고,
     전부 "없음" 이면 계정 카탈로그에서 같은 계열 ID 를 찾아 한 번 더 시도한다
     (콘솔 표기와 실제 ID 의 날짜 접미사 차이를 흡수하기 위함 — 씨댄스와 같은 방식). */
  if (provider === "ark3d") {
    if (!k.seedance) return json({ error: "3D 연동이 설정되지 않았습니다(Seedance_API_KEY 공용)" }, 500);
    if (!String(b.prompt || "").trim() && !(b.refImages || b.firstFrame || b.refImage))
      return json({ error: "3D 생성에는 설명(프롬프트)이나 레퍼런스 이미지가 필요합니다." }, 400);
    const candidates = ark3dModelIds(b, env);
    const tried = [];
    let lastErr = null;
    const submit = async (mid, ms) => {
      const payload = buildArk3dPayload(b, env, mid);
      const r = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
        method: "POST",
        headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, ms);
      const j = await r.json().catch(() => ({}));
      return { r, j };
    };
    const BUDGET_MS = 30000, started = Date.now();
    for (const mid of candidates) {
      const leftMs = BUDGET_MS - (Date.now() - started);
      if (leftMs < 4000) { tried.push("(시간부족·중단)"); break; }
      let out;
      try { out = await submit(mid, Math.min(22000, leftMs)); }
      catch (e) { lastErr = "제출 실패: " + String((e && e.message) || e).slice(0, 140); tried.push(mid + "=ERR"); continue; }
      const { r, j } = out;
      if (r.ok && j.id) return json({ statusUrl: "/api/generate?provider=ark3d&task=" + encodeURIComponent(j.id), modelId: mid });
      const eCode = (j.error && j.error.code) || "";
      const eMsg = (j.error && j.error.message) || String(JSON.stringify(j)).slice(0, 140);
      lastErr = "HTTP " + r.status + " [" + mid + "]" + (eCode ? " <" + eCode + ">" : "") + " " + eMsg;
      tried.push(mid + "=" + r.status);
      if (!(seedreamModelMissing(r.status, j) || r.status >= 500)) break;   // 파라미터·인증 오류는 ID 를 바꿔도 같다
    }
    // 후보가 전부 "모델 없음" 이면 계정 카탈로그에서 같은 계열을 찾아 1회 더
    try {
      const catalog = await arkModelCatalog(k.seedance);
      const alt = arkPickByStem(catalog, candidates);
      if (alt) {
        const { r, j } = await submit(alt, 15000);
        if (r.ok && j.id) return json({ statusUrl: "/api/generate?provider=ark3d&task=" + encodeURIComponent(j.id), modelId: alt });
        tried.push(alt + "=" + r.status);
      }
    } catch (_e) { /* 카탈로그 조회 실패는 무시 */ }
    return json({ error: "3D 생성 제출 실패 — " + (lastErr || "원인 불명"), tried }, 502);
  }
  if (provider === "seedance") {
    if (!k.seedance) return json({ error: "Seedance 연동이 설정되지 않았습니다" }, 500);
    // 해외(bp) 호스트만 사용. 중국(vc) 호스트는 Cloudflare 글로벌 네트워크에서 무한정 멈춰(hang)
    // 플랫폼 502를 유발하므로 기본 제외. 필요하면 SEEDANCE_USE_CN=1 로 켤 수 있음.
    const hosts = pick(env, ["SEEDANCE_USE_CN", "seedance_use_cn"]) ? ["bp", "vc"] : ["bp"];
    const candidates = seedanceModelIds(b, env);   // 모델 ID 후보(콘솔 표기·날짜 차이 자동 흡수)
    const tag = "[m:" + candidates[0] + "]";
    let lastErr = null;
    const tried = [];   // 후보별 결과를 모아 에러에 실어 준다(어느 ID 에서 무엇이 났는지 보이게)
    // 후보를 여러 개 시도하면 최악의 경우 (후보수 × 개별 타임아웃) 만큼 걸려 함수 자체가
    // 플랫폼 타임아웃(502)에 걸릴 수 있다. 전체 예산을 두고, 남은 시간에 맞춰 개별 타임아웃을 줄인다.
    const BUDGET_MS = 30000;
    const started = Date.now();
    outer:
    for (const hostId of hosts) {
      for (const mid of candidates) {
        const leftMs = BUDGET_MS - (Date.now() - started);
        if (leftMs < 4000) {   // 남은 시간이 너무 적으면 새 후보를 시작하지 않는다
          if (tried.length) { tried.push("(시간부족·중단)"); }
          break outer;
        }
        const payload = buildSeedancePayload(b, env, mid);
        // 스튜디오가 실제로 보낸 값을 에러에 그대로 실어, 노드에 원인이 보이게 한다.
        const imgN = payload.content.filter(c => c.type === "image_url").length;
        let r, j; const t0 = Date.now();
        try {
          // fetchT 의 unhandled-rejection 차단으로 raw 502 는 사라졌으므로, bp 가 이미지
          // 검증 등으로 제출이 느려도(태스크 ID 반환까지 십수 초) 안전하게 기다린다.
          // 초과 시엔 crash 없이 읽을 수 있는 "시간 초과" JSON 이 노드에 표시된다.
          r = await fetchT(ARK_HOSTS[hostId] + "/contents/generations/tasks", {
            method: "POST",
            headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }, Math.min(22000, leftMs));
          j = await r.json().catch(() => ({}));
        } catch (e) {
          lastErr = hostId + " 제출 실패(" + (Date.now() - t0) + "ms): " + String((e && e.message) || e).slice(0, 140);
          tried.push(mid + "=ERR");
          continue;   // 다음 후보/호스트로
        }
        if (r.ok && j.id)
          return json({ statusUrl: "/api/generate?provider=seedance&host=" + hostId + "&task=" + encodeURIComponent(j.id), modelId: mid });
        // 제공사 코드와 메시지를 둘 다 남긴다 — 코드만 보면 "미개통(ModelNotOpen)" 인지
        //  "파라미터 오류(InvalidParameter)" 인지 한눈에 갈린다(예전엔 메시지만 남아 구분이 안 됐다).
        const eCode = (j.error && j.error.code) || "";
        const eMsg = (j.error && j.error.message) || String(JSON.stringify(j)).slice(0, 140);
        lastErr = "HTTP " + r.status + " [" + mid + " img:" + imgN + "]"
          + (eCode ? " <" + eCode + ">" : "") + " " + eMsg
          + (/modelnotopen|not activated|not enabled/i.test(eCode + " " + eMsg)
              ? " — 이 모델은 계정에서 아직 개통되지 않았습니다(BytePlus 콘솔에서 활성화 필요)." : "");
        tried.push(mid + "=" + r.status);
        // 다음 후보로 넘어갈 조건: 모델 ID 없음(404) 또는 제공사 5xx.
        //  ModelArk 는 미개통·미배포 모델에 404 가 아니라 500(InternalServiceError)을 주는 경우가 있어,
        //  5xx 에서 멈추면 남은 후보 ID 를 한 번도 못 써 보고 "제공사 서버 오류"로 끝나 버린다.
        //  400(파라미터)·401/403(인증)·402(잔액)·429(한도)는 ID 를 바꿔도 동일하므로 즉시 중단.
        if (!(seedreamModelMissing(r.status, j) || r.status >= 500)) break outer;
      }
    }
    // 모든 후보가 "모델 없음" 으로 끝났다면, 계정 카탈로그에서 같은 계열의 실제 ID 를 찾아 1회 더 시도한다.
    //  (콘솔에서 개통했는데 날짜 접미사가 우리 표와 다른 경우 — 코드 수정 없이 자동으로 맞춘다)
    if (/InvalidEndpointOrModel|NotFound|404/i.test(String(lastErr || ""))) {
      try {
        const cat = await arkModelCatalog(k.seedance);
        const alt = arkPickByStem(cat, candidates);
        if (alt) {
          const r2 = await fetchT(ARK_HOSTS.bp + "/contents/generations/tasks", {
            method: "POST",
            headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
            body: JSON.stringify(buildSeedancePayload(b, env, alt))
          }, 22000);
          const j2 = await r2.json().catch(() => ({}));
          tried.push(alt + "=" + r2.status + "(카탈로그)");
          if (r2.ok && j2.id)
            return json({ statusUrl: "/api/generate?provider=seedance&host=bp&task=" + encodeURIComponent(j2.id), modelId: alt });
          lastErr = "HTTP " + r2.status + " [" + alt + " 카탈로그]"
            + ((j2.error && j2.error.code) ? " <" + j2.error.code + ">" : "") + " "
            + ((j2.error && j2.error.message) || "");
        } else if (cat && cat.length) {
          const listed = cat.filter(x => candidates.indexOf(x) >= 0);
          lastErr = String(lastErr || "") + (listed.length
            ? " · 이 모델 ID 는 계정 카탈로그에 있으나 호출은 404 입니다 → BytePlus 콘솔에서 해당 모델을 개통(Activate)해 주세요."
            : " · 계정 카탈로그(" + cat.length + "개)에 같은 계열 ID 가 없습니다 — 이 계정/리전에서 사용할 수 없는 모델입니다.");
        }
      } catch (_e) { /* 카탈로그 조회 실패는 무시 */ }
    }
    const trail = tried.length > 1 ? " · 시도: " + tried.join(", ") : "";
    // 실패한 제출을 서버에 남긴다 — 노드 화면의 원문을 사람이 옮겨 적어야만 원인을 알 수 있는 상황을 없앤다.
    //  (diag=gen-errors 로 조회. 실패 시에만 기록하고, 본문은 요약만 남겨 용량을 묶는다.)
    try {
      const edb = resolveDB(env);
      if (edb) {
        const p0 = buildSeedancePayload(b, env, candidates[0]);
        const shape = {
          model: p0.model, ratio: p0.ratio, duration: p0.duration,
          watermark: p0.watermark, generate_audio: p0.generate_audio,
          content: (p0.content || []).map(c => c.type === "text"
            ? { type: "text", len: String(c.text || "").length }
            : { type: c.type, role: c.role, scheme: String(
                (c.image_url && c.image_url.url) || (c.video_url && c.video_url.url) ||
                (c.audio_url && c.audio_url.url) || "").slice(0, 12) })
        };
        await edb.prepare(
          `CREATE TABLE IF NOT EXISTS gen_errors (id TEXT PRIMARY KEY, provider TEXT, model TEXT,
             err TEXT, shape TEXT, created_at TEXT)`).run();
        await edb.prepare(
          `INSERT INTO gen_errors (id, provider, model, err, shape, created_at) VALUES (?,?,?,?,?,?)`)
          .bind("ge_" + crypto.randomUUID().slice(0, 12), "seedance", String(b.model || ""),
                String(lastErr).slice(0, 400) + trail, JSON.stringify(shape).slice(0, 900),
                new Date().toISOString()).run();
      }
    } catch (_e) { /* 로깅 실패가 생성 응답을 막지 않도록 */ }
    return json({ error: "Seedance " + tag + ": " + String(lastErr).slice(0, 200) + trail }, 502);
  }

  if (provider === "seedream") {
    // 씨드림 = ByteDance ModelArk 이미지 생성. 씨댄스와 같은 키(Seedance_API_KEY) 공유.
    if (!k.seedance) return json({ error: "Seedream(ByteDance) 연동이 설정되지 않았습니다 — Seedance_API_KEY 를 등록하세요." }, 500);
    const hosts = pick(env, ["SEEDANCE_USE_CN", "seedance_use_cn"]) ? ["bp", "vc"] : ["bp"];
    const candidates = seedreamModelIds(b, env);   // 모델 ID 후보(콘솔 표기 차이 자동 흡수)
    const tag = "[m:" + candidates[0] + "]";
    let lastErr = null;
    outer:
    for (const hostId of hosts) {
      for (const mid of candidates) {
        const body = buildSeedreamPayload(b, env, mid);
        let r, j; const t0 = Date.now();
        try {
          r = await fetchT(ARK_HOSTS[hostId] + "/images/generations", {
            method: "POST",
            headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }, 60000);
          j = await r.json().catch(() => ({}));
        } catch (e) {
          lastErr = hostId + " 호출 실패(" + (Date.now() - t0) + "ms): " + String((e && e.message) || e).slice(0, 140);
          continue;
        }
        const d0 = r.ok && j.data && j.data[0];
        if (d0 && d0.url) return json({ url: d0.url, kind: "image", modelId: mid });
        if (d0 && d0.b64_json) return json({ url: "data:image/png;base64," + d0.b64_json, kind: "image", modelId: mid });
        lastErr = "HTTP " + r.status + " [" + mid + "] " + ((j.error && (j.error.message || j.error.code)) || String(JSON.stringify(j)).slice(0, 160));
        // 모델 ID 문제(404) 또는 제공사 5xx 면 다음 후보로 — ModelArk 는 미개통 모델에 500 을 주기도 한다.
        // 그 외(검열·잔액·형식·인증)는 후보를 더 시도해도 동일하므로 중단.
        if (!(seedreamModelMissing(r.status, j) || r.status >= 500)) break outer;
      }
    }
    return json({ error: "Seedream " + tag + ": " + String(lastErr).slice(0, 220) }, 502);
  }

  if (provider === "flux") {
    if (!k.flux) return json({ error: "Flux 연동이 설정되지 않았습니다" }, 500);
    const { endpoint, body } = buildFluxPayload(b);
    const r = await fetchT(FLUX_BASE + endpoint, {
      method: "POST",
      headers: { "x-key": k.flux, "Content-Type": "application/json", "accept": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) return json({ error: "Flux: " + (j.error || JSON.stringify(j) || "").slice(0, 200) }, 502);
    const poll = j.polling_url || (FLUX_BASE + "get_result?id=" + encodeURIComponent(j.id));
    return json({ statusUrl: "/api/generate?provider=flux&poll=" + encodeURIComponent(poll) });
  }

  if (provider === "falcontrol") {
    if (!k.fal) return json({ error: "fal 연동이 설정되지 않았습니다 (FAL_API_KEY 미설정)" }, 500);
    const { model, body } = buildFalControlPayload(b);
    if (!body.controlnets || !body.controlnets.length)
      return json({ error: "ControlNet 타입을 하나 이상 선택하세요 (Canny/Depth/Pose)." }, 400);
    if (!body.controlnets.every(c => c.control_image_url))
      return json({ error: "ControlNet은 레퍼런스 이미지가 필요합니다. 사진/영상 레퍼런스를 연결하세요." }, 400);
    const r = await falFetch("falcontrol", FAL_QUEUE + model, {
      method: "POST",
      headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json", "accept": "application/json" },
      body: JSON.stringify(body)
    }, 30000);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: "fal HTTP " + r.status + ": " + String((j.detail && (j.detail.msg || JSON.stringify(j.detail))) || j.error || JSON.stringify(j)).slice(0, 220) }, 502);
    // fal 이 동기로 바로 결과를 준 경우
    const sync = j.images && j.images[0] && j.images[0].url;
    if (sync) return json({ url: sync, kind: "image" });
    const st = j.status_url, rs = j.response_url;
    if (!st || !rs) return json({ error: "fal: 응답에 status_url/이미지 없음: " + JSON.stringify(j).slice(0, 180) }, 502);
    return json({ statusUrl: "/api/generate?provider=falcontrol&status=" + encodeURIComponent(st) + "&result=" + encodeURIComponent(rs) });
  }

  if (provider === "nanobanana") {
    const sa = gcpCreds(env);
    if (!sa && !k.google) return json({ error: "나노바나나: 구글 인증이 없습니다 (Vertex 서비스계정 또는 VEO_API_KEY 필요)" }, 500);
    const nanoRefs = await collectRefDataUris(b, 12);   // 레퍼런스 최대 12장 (합성/편집)
    const payload = JSON.stringify(buildNanoPayload(Object.assign({}, b, { _refs: nanoRefs })));
    let nanoUrl, nanoHeaders;
    if (sa) {   // Vertex(서비스계정) — Veo와 동일 인증
      let tok; try { tok = await gcpToken(sa.email, sa.pem); } catch (e) { return json({ error: "나노바나나 토큰 실패: " + String((e && e.message) || e).slice(0, 160) }, 502); }
      nanoUrl = "https://" + VERTEX_LOC + "-aiplatform.googleapis.com/v1/projects/" + sa.pid + "/locations/" + VERTEX_LOC + "/publishers/google/models/" + NANO_MODEL + ":generateContent";
      nanoHeaders = { "Authorization": "Bearer " + tok, "Content-Type": "application/json" };
    } else {    // AI Studio 키
      nanoUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + NANO_MODEL + ":generateContent?key=" + encodeURIComponent(k.google);
      nanoHeaders = { "Content-Type": "application/json" };
    }
    let r = await fetchT(nanoUrl, { method: "POST", headers: nanoHeaders, body: payload }, 60000);
    // imageConfig(비율) 미지원 엔드포인트면 400 → 비율 필드만 빼고 1회 재시도 (프롬프트 힌트는 유지)
    if (r.status === 400 && /"imageConfig"|generationConfig/.test(payload)) {
      r = await fetchT(nanoUrl, { method: "POST", headers: nanoHeaders, body: nanoPayloadNoRatio(payload) }, 60000);
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: "나노바나나 HTTP " + r.status + ": " + String((j.error && j.error.message) || JSON.stringify(j)).slice(0, 220) }, 502);
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    const inline = (parts.map(p => p.inlineData || p.inline_data).find(Boolean));
    if (!inline || !inline.data) {
      const fr = j.promptFeedback || (j.candidates && j.candidates[0] && j.candidates[0].finishReason);
      return json({ error: "나노바나나: 응답에 이미지 없음(안전필터 가능): " + String(JSON.stringify(fr || j)).slice(0, 200) }, 502);
    }
    return json({ url: "data:" + (inline.mimeType || inline.mime_type || "image/png") + ";base64," + inline.data, kind: "image" });
  }

  if (provider === "openai") {
    if (!k.openai) return json({ error: "OpenAI 연동이 설정되지 않았습니다 (GPT_API_KEY 미설정)" }, 500);
    const p = buildOpenAIImagePayload(b);
    const oaRefs = await collectRefDataUris(b, 12);   // 레퍼런스 최대 12장
    let r;
    if (oaRefs.length) {   // 편집 (images/edits · multipart)
      // 첨부 이미지들을 blob 파트로 준비 (여러 장은 image 필드를 '반복' — 현행 OpenAI 규격, image[] 아님)
      const blobs = [];
      for (const ref of oaRefs) {
        const m = /^data:(image\/[^;]+);base64,(.+)$/.exec(ref); if (!m) continue;
        const bin = atob(m[2]); const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        blobs.push(new Blob([buf], { type: m[1] }));
      }
      // OpenAI 공식 규격: gpt-image-2 편집 사이즈는 W×H(둘 다 16의 배수), 비율 1:3~3:1, 최대 3840x2160.
      const okSize = (s) => {
        const m = /^(\d+)x(\d+)$/.exec(s || ""); if (!m) return "1024x1024";
        let w = Math.round(+m[1] / 16) * 16, h = Math.round(+m[2] / 16) * 16;
        w = Math.max(256, Math.min(3840, w)); h = Math.max(256, Math.min(2160, h));
        if (w / h > 3) w = Math.round((h * 3) / 16) * 16;
        if (h / w > 3) h = Math.round((w * 3) / 16) * 16;
        return w + "x" + h;
      };
      const postEdit = (model, size) => {
        const fd = new FormData();
        fd.append("model", model); fd.append("prompt", p.prompt); fd.append("size", size); fd.append("n", "1");
        blobs.forEach((bl, i) => fd.append("image", bl, "img" + i + ".png"));
        return fetchT(openaiBase(env) + "/v1/images/edits", { method: "POST", headers: { "Authorization": "Bearer " + k.openai }, body: fd }, 120000);
      };
      // 선택한 모델(예: gpt-image-2) 그대로 GPT_API_KEY 로 편집 — 모델 다운그레이드 없음(항상 2.0 유지).
      const editSize = okSize(p.size);
      r = await postEdit(p.model, editSize);
      // 실패 시 '같은 모델'로 안전 사이즈(1024x1024)로 1회만 재시도 — 사이즈/속도(타임아웃) 이슈 완화, 모델은 유지.
      if (!r.ok && editSize !== "1024x1024") r = await postEdit(p.model, "1024x1024");
    } else {   // 생성 (images/generations)
      r = await fetchT(openaiBase(env) + "/v1/images/generations", {
        method: "POST", headers: { "Authorization": "Bearer " + k.openai, "Content-Type": "application/json" },
        body: JSON.stringify(p) }, 90000);
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: "OpenAI HTTP " + r.status + ": " + String((j.error && j.error.message) || JSON.stringify(j)).slice(0, 220) }, 502);
    const d0 = j.data && j.data[0];
    if (d0 && d0.b64_json) return json({ url: "data:image/png;base64," + d0.b64_json, kind: "image" });
    if (d0 && d0.url) return json({ url: d0.url, kind: "image" });
    return json({ error: "OpenAI: 응답에 이미지 없음: " + JSON.stringify(j).slice(0, 180) }, 502);
  }

  if (provider === "hailuo") {
    if (!k.hailuo) return json({ error: "Hailuo(MiniMax) 연동이 설정되지 않았습니다" }, 500);
    const r = await fetchT(HAILUO_BASE + "/video_generation", {
      method: "POST",
      headers: { "Authorization": "Bearer " + k.hailuo, "Content-Type": "application/json" },
      body: JSON.stringify(buildHailuoPayload(b))
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.task_id)
      return json({ error: "Hailuo: " + ((j.base_resp && j.base_resp.status_msg) || JSON.stringify(j) || "").slice(0, 200) }, 502);
    return json({ statusUrl: "/api/generate?provider=hailuo&task=" + encodeURIComponent(j.task_id) });
  }

  /* ── 음악(BGM) 생성 — 추가 키 불필요: 기존 키를 우선순위대로 재사용 ──
     ① ElevenLabs Music(ELEVENLABS_API_KEY) → ② MiniMax Music(Hailuo 키) → ③ fal Stable Audio(FAL 키)
     한 엔진이 실패하면 다음 엔진으로 자동 폴백. 결과는 R2 에 올려 공개 URL 로 반환. */
  if (provider === "music") {
    const engines = musicEngines(env, k);
    if (!engines.length) return json({ error: "음악 생성 연동이 없습니다 — ElevenLabs·MiniMax(Hailuo)·fal 키 중 하나가 필요합니다." }, 500);
    const origin = u.origin;
    const promptTxt = cut(b.prompt, 800);
    if (!promptTxt) return json({ error: "음악 설명(prompt)을 입력하세요." }, 400);
    const secs = Math.min(Math.max(Number(b.seconds) || 30, 10), 120);
    const errs = [];
    for (const eng of engines) {
      try {
        if (eng === "elevenlabs") {
          const key = pick(env, ["ElevenLabs_API_KEY", "ELEVENLABS_API_KEY", "elevenlabs_api_key"]);
          // Eleven Music — 경로가 계정/버전에 따라 다를 수 있어 두 경로 순차 시도
          for (const path of ["/v1/music", "/v1/music/compose"]) {
            const r = await fetchT("https://api.elevenlabs.io" + path, {
              method: "POST",
              headers: { "xi-api-key": key, "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: promptTxt, music_length_ms: secs * 1000 })
            }, 90000);
            if (!r.ok) { if (path === "/v1/music/compose") errs.push("elevenlabs HTTP " + r.status); continue; }
            const buf = new Uint8Array(await r.arrayBuffer());
            if (buf.length < 1000) { errs.push("elevenlabs: 응답이 오디오가 아님"); break; }
            const url = await hostAudioBytes(env, origin, buf, "audio/mpeg");
            if (url) return json({ url, kind: "audio", engine: "elevenlabs", seconds: secs });
            errs.push("elevenlabs: R2 업로드 실패"); break;
          }
        } else if (eng === "minimax") {
          const r = await fetchT(HAILUO_BASE + "/music_generation", {
            method: "POST",
            headers: { "Authorization": "Bearer " + k.hailuo, "Content-Type": "application/json" },
            body: JSON.stringify({ model: pick(env, ["MINIMAX_MUSIC_MODEL"]) || "music-1.5",
              prompt: promptTxt, lyrics: String(b.lyrics || "").slice(0, 600) || undefined })
          }, 90000);
          const j = await r.json().catch(() => ({}));
          const hex = j && j.data && (j.data.audio || j.data.audio_hex);
          const aurl = j && j.data && (j.data.audio_url || j.data.url);
          if (aurl) return json({ url: aurl, kind: "audio", engine: "minimax", seconds: secs });
          if (hex && /^[0-9a-f]+$/i.test(hex)) {
            const buf = new Uint8Array(hex.length / 2);
            for (let i = 0; i < buf.length; i++) buf[i] = parseInt(hex.substr(i * 2, 2), 16);
            const url = await hostAudioBytes(env, origin, buf, "audio/mpeg");
            if (url) return json({ url, kind: "audio", engine: "minimax", seconds: secs });
          }
          errs.push("minimax: " + ((j.base_resp && j.base_resp.status_msg) || ("HTTP " + r.status)));
        } else if (eng === "fal") {
          const model = pick(env, ["FAL_MUSIC_MODEL", "fal_music_model"]) || "fal-ai/stable-audio-25/text-to-audio";
          const r = await falFetch("music", "https://fal.run/" + model, {
            method: "POST",
            headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptTxt, seconds_total: secs })
          }, 120000);
          const j = await r.json().catch(() => ({}));
          const url = (j.audio && j.audio.url) || (j.audio_file && j.audio_file.url) || j.url;
          if (r.ok && url) return json({ url, kind: "audio", engine: "fal", seconds: secs });
          errs.push("fal: " + String((j.detail && JSON.stringify(j.detail)) || j.error || ("HTTP " + r.status)).slice(0, 120));
        }
      } catch (e) { errs.push(eng + ": " + String((e && e.message) || e).slice(0, 100)); }
    }
    return json({ error: "음악 생성 실패 — " + errs.join(" · ").slice(0, 300) }, 502);
  }

  /* ── 영상 업스케일 (4K 화질 향상) — fal Topaz. 원본 영상 URL 필요 ── */
  if (provider === "upscale") {
    if (!k.fal) return json({ error: "업스케일은 FAL_API_KEY 가 필요합니다." }, 500);
    const src = b.srcVideo || "";
    if (!/^https?:\/\//.test(src)) return json({ error: "업스케일할 원본 영상이 필요합니다. 영상을 옴니 레퍼런스(영상)에 넣으면 자동 업로드됩니다(R2)." }, 400);
    const model = pick(env, ["FAL_UPSCALE_MODEL", "fal_upscale_model"]) || "fal-ai/topaz/upscale/video";
    const r = await falFetch("upscale", FAL_QUEUE + model, {
      method: "POST",
      headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: src, upscale_factor: b.res === "4K" ? 4 : 2 })
    }, 30000);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: "업스케일 제출 실패 HTTP " + r.status + ": " + String(JSON.stringify(j)).slice(0, 180) }, 502);
    if (j.video && j.video.url) return json({ url: j.video.url, kind: "video" });
    if (!j.request_id) return json({ error: "업스케일: 응답에 task 없음: " + JSON.stringify(j).slice(0, 160) }, 502);
    return json({ statusUrl: "/api/generate?provider=falq&model=" + encodeURIComponent(model) + "&task=" + encodeURIComponent(j.request_id) });
  }

  if (provider === "luma") {
    if (!k.luma) return json({ error: "Luma 연동이 설정되지 않았습니다" }, 500);
    const r = await fetchT(LUMA_BASE + "/generations", {
      method: "POST",
      headers: { "Authorization": "Bearer " + k.luma, "Content-Type": "application/json", "accept": "application/json" },
      body: JSON.stringify(buildLumaPayload(b))
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id)
      return json({ error: "Luma: " + (JSON.stringify(j.detail || j) || "").slice(0, 200) }, 502);
    return json({ statusUrl: "/api/generate?provider=luma&task=" + encodeURIComponent(j.id) });
  }

  // ── Kling 영상 확장(video-extend) — "앞 영상을 그대로 더 길게" ──
  //  첫 프레임 이어붙이기와 달리 원본 클립 자체를 연장하므로 모션·카메라가 끊기지 않는다.
  //  제약(제공사): Kling 이 생성한 영상만 · 30일 이내 · 5/10초 클립 · 한 번에 약 4~5초 추가.
  //  → 그래서 Kling 공식 API 로 만든 결과의 videoId 가 있을 때만 호출한다.
  if (provider === "klingextend") {
    const cr = klingCreds(env);
    if (!cr) return json({ error: "Kling 연동이 설정되지 않았습니다" }, 500);
    const videoId = String(b.videoId || "").trim();
    if (!videoId) return json({ error: "확장할 Kling 영상 ID가 없습니다. (Kling 공식 API로 만든 30일 이내 영상만 확장할 수 있습니다)" }, 400);
    const auth = await klingAuth(cr);
    const body = { video_id: videoId };
    if (b.prompt) body.prompt = cut(String(b.prompt), 2000);
    if (b.negative) body.negative_prompt = cut(String(b.negative), 2000);
    if (Number.isFinite(Number(b.cfgScale))) body.cfg_scale = Number(b.cfgScale);
    const r = await fetchT(cr.base + "/v1/videos/video-extend", {
      method: "POST",
      headers: { "Authorization": auth, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.code !== 0 || !(j.data && j.data.task_id))
      return json({ error: "Kling 확장: " + String(j.message || JSON.stringify(j) || "요청 실패").slice(0, 200) }, 502);
    return json({ statusUrl: "/api/generate?provider=kling&task=" + encodeURIComponent(j.data.task_id) + "&ep=video-extend", kind: "video" });
  }

  if (provider === "kling") {
    // 1순위: 클링 공식 오픈플랫폼 API (KLING_ACCESS_KEY+KLING_SECRET_KEY 또는 KLING_API_KEY)
    const cr = klingCreds(env);
    if (cr) {
      const spec = klingApiSpec(b);
      const auth = await klingAuth(cr);
      // 모델명 표기가 갈리는 계열(3.0)은 후보를 순서대로 시도하고, 마지막 오류를 그대로 보고한다.
      const mids = KLING_ALT[spec.m] || [spec.m];
      let lastMsg = "요청 실패";
      for (const mid of mids) {
        const r = await fetchT(cr.base + "/v1/videos/" + spec.ep, {
          method: "POST",
          headers: { "Authorization": auth, "Content-Type": "application/json" },
          body: JSON.stringify(buildKlingApiPayload(b, { ...spec, m: mid }))
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.code === 0 && j.data && j.data.task_id)
          return json({ statusUrl: "/api/generate?provider=kling&task=" + encodeURIComponent(j.data.task_id) + "&ep=" + spec.ep });
        lastMsg = "[" + mid + "] " + String(j.message || JSON.stringify(j) || "요청 실패");
        // 모델명 문제가 아니면(잔액·검열·파라미터 등) 다른 후보를 시도해도 의미가 없다.
        if (!/model|not\s*exist|not\s*found|invalid.*name|不存在/i.test(lastMsg)) break;
      }
      return json({ error: "Kling: " + lastMsg.slice(0, 220) }, 502);
    }
    /* 예전엔 여기서 fal.ai 를 경유해 같은 클링 모델을 불렀다. 지금은 하지 않는다 —
       클링은 공식 오픈플랫폼 API 를 직접 연동해 두었고, 같은 모델을 제공하는 중개(fal)로
       나가면 ①요금이 우리 단가표(공식 기준)와 달라지고 ②제공사 쪽 사용 이력이 갈라진다.
       공식 키가 없으면 조용히 우회하지 말고 설정하라고 알린다. */
    return json({ error: "Kling 연동이 설정되지 않았습니다. 환경변수 KLING_ACCESS_KEY·KLING_SECRET_KEY(또는 KLING_API_KEY) 를 넣어주세요." }, 500);
  }

  return json({ error: "지원하지 않는 provider: " + provider + " (runway/runway_aleph/xai/google/seedance/flux/hailuo/luma/kling)" }, 400);
}

// redeploy marker a1aedb0
