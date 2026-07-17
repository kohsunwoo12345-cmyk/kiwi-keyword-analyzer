// /api/generate — 노드 스튜디오 통합 생성 프록시
// POST: {provider, model, prompt, negative, refImage, firstFrame, lastFrame,
//        seconds, ratio, res, fps, motion, cfg, seed, dryRun?}
//   응답: {url}(동기) | {statusUrl}(비동기) | {dryRun:true,payload}(검증용, 호출 없음)
// GET  ?provider=runway&task=ID   → Runway 태스크 폴링
//      ?provider=google&op=NAME   → Veo 오퍼레이션 폴링
//      ?provider=google&file=URI  → Veo 결과 파일 스트리밍(키 서버측 유지)
// 키는 Cloudflare Pages 환경변수에서만 읽으며 절대 응답에 포함되지 않습니다.

const RUNWAY_VER = "2024-11-06";

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

/* 대본(텍스트)을 자체 다중엔진 TTS(/api/tts/v2/speak)로 음성(mp3) 합성 → R2 호스팅 → 공개 URL.
   이미 audioUrl 이 오면 그대로 사용. 실패 시 { error, status } 반환. */
async function synthTTSUrl(env, origin, b, _fetchT) {
  let audioUrl = String(b.audioUrl || "").trim();
  if (/^https?:\/\//.test(audioUrl)) return { audioUrl };
  const text = String(b.text || b.narration || "").trim();
  if (!text) return { error: "대사(텍스트)를 입력하세요.", status: 400 };
  const tr = await _fetchT(origin + "/api/tts/v2/speak", {
    method: "POST", headers: { "Content-Type": "application/json" },
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

/* ── 페이로드 빌더 (dryRun 검증도 이 함수를 그대로 사용) ── */
export function buildRunwayPayload(b) {
  const ratioMap = { "16:9": "1280:720", "9:16": "720:1280", "1:1": "960:960", "4:5": "832:1104" };
  const img = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  return {
    model: "gen4_turbo",
    promptImage: img,
    promptText: (b.prompt || "").slice(0, 1000),
    ratio: ratioMap[b.ratio] || "1280:720",
    duration: (Number(b.seconds) || 8) <= 7 ? 5 : 10,
    seed: Number.isFinite(Number(b.seed)) ? Number(b.seed) % 4294967295 : undefined
  };
}
/* Runway Gen-4 Aleph — 진짜 V2V(영상→영상). 입력 영상은 반드시 공개 URL(R2). */
const RUNWAY_RATIOS = { "16:9": "1280:720", "9:16": "720:1280", "1:1": "960:960", "4:5": "832:1104" };
export function buildAlephPayload(b) {
  return {
    model: "gen4_aleph",
    videoUri: b.srcVideo || null,
    promptText: (b.prompt || "").slice(0, 1000),
    ratio: RUNWAY_RATIOS[b.ratio] || "1280:720",
    seed: Number.isFinite(Number(b.seed)) ? Number(b.seed) % 4294967295 : undefined
  };
}
export function buildXaiPayload(b) {
  return {
    model: "grok-imagine-image",
    prompt: [b.prompt, b.negative ? ("피해야 할 것: " + b.negative) : ""].filter(Boolean).join("\n").slice(0, 1000),
    n: 1,
    response_format: "url"
  };
}
/* Seedance 모델명(프론트 표시명) → BytePlus ModelArk 모델 ID
   ※ 콘솔에서 실제 ID가 바뀌면 노드의 "Seedance 모델 ID 직접입력" 또는
     SEEDANCE_MODEL_ID 환경변수로 언제든 덮어쓸 수 있습니다. */
const SEEDANCE_IDS = {
  "Seedance 2.0":                "dreamina-seedance-2-0-260128",
  "Seedance 2.0 Fast":           "dreamina-seedance-2-0-fast-260128",
  "Seedance 1.5 Pro":            "seedance-1-5-pro",
  "Seedance 1.0 Pro":            "seedance-1-0-pro-250528",
  "Seedance 1.0 Pro Fast":       "seedance-1-0-pro-fast",
  "Seedance 1.0 Lite (텍스트→영상)": "seedance-1-0-lite-t2v-250428",
  "Seedance 1.0 Lite (이미지→영상)": "seedance-1-0-lite-i2v-250428",
  "Seedance 1.0":                "seedance-1-0-pro-250528"  // 구버전 표시명 호환
};
export function seedanceModelId(b, env) {
  const custom = b && typeof b.seedanceModel === "string" && b.seedanceModel.trim();
  if (custom) return custom;                       // 노드에서 직접 입력한 모델 ID 최우선
  const override = env && pick(env, ["SEEDANCE_MODEL_ID", "seedance_model_id"]);
  return override || SEEDANCE_IDS[b.model] || "seedance-1-0-pro-250528";
}
export function buildSeedancePayload(b, env) {
  const model = seedanceModelId(b, env);
  const ratio = b.ratio === "9:16" ? "9:16" : b.ratio === "1:1" ? "1:1" : "16:9";
  const first = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  const isV2 = /seedance-2/.test(model);   // dreamina-seedance-2-0-* 계열

  if (isV2) {
    // ── Seedance 2.0 공식 Reference-to-Video 형식 ──
    //  · ratio/duration/watermark 는 "최상위 필드"
    //  · 이미지 role:"reference_image"(최대 9), 영상 type:"video_url"+role:"reference_video"(최대 3,
    //    URL 전용 — 영상은 base64 불가), 오디오 role:"reference_audio"(최대 3)
    //  · 공식 스펙은 프롬프트 안에서 @Image1/@Video1/@Audio1 태그로 각 자산을 어떻게 쓸지
    //    명시해야 참조가 정확히 걸린다(태그 없이 첨부만 하면 모델이 무시할 수 있음).
    const dur = Math.min(Math.max(Number(b.seconds) || 5, 3), 12);
    // 레퍼런스 이미지 수집(3D 프레임 + 배경/참고 사진). 공식 한도 9장, 중복 제거.
    let refs = (Array.isArray(b.refImages) && b.refImages.length) ? b.refImages.slice()
             : [first, b.lastFrame];
    if (first && refs.indexOf(first) < 0) refs.unshift(first);
    const seenI = {}; refs = refs.filter(u => u && !seenI[u] && (seenI[u] = 1)).slice(0, 9);
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
    let text = (b.prompt || "").slice(0, 1500);
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
    const content = [{ type: "text", text }];
    for (const u of refs)    content.push({ type: "image_url", image_url: { url: u }, role: "reference_image" });
    for (const u of useVids) content.push({ type: "video_url", video_url: { url: u }, role: "reference_video" });
    for (const u of useAuds) content.push({ type: "audio_url", audio_url: { url: u }, role: "reference_audio" });
    // 오디오 생성 기본 OFF — 2.0 은 기본으로 오디오를 만드는데, 그 오디오가 콘텐츠 검열
    // ("output audio may contain sensitive information")에 걸려 생성이 통째로 실패함.
    // b.generateAudio === true 일 때만 켠다(그때만 오디오 포함 시도).
    const genAudio = b.generateAudio === true;
    const watermark = b.watermark === true;   // 기본 false(워터마크 없음)
    return { model, content, ratio, duration: dur, watermark, generate_audio: genAudio };
  }

  // ── Seedance 1.x 형식(텍스트에 --ratio/--duration, first/last_frame) ──
  const dur = (Number(b.seconds) || 8) <= 6 ? 5 : 10;
  const content = [{ type: "text",
    text: (b.prompt || "").slice(0, 800) + " --ratio " + ratio + " --duration " + dur }];
  if (first) content.push({ type: "image_url", image_url: { url: first }, role: "first_frame" });
  if (b.lastFrame) content.push({ type: "image_url", image_url: { url: b.lastFrame }, role: "last_frame" });
  return { model, content };
}
const ARK_HOSTS = {
  bp: "https://ark.ap-southeast.bytepluses.com/api/v3",   // BytePlus ModelArk (해외)
  vc: "https://ark.cn-beijing.volces.com/api/v3"          // Volcengine (중국)
};

/* ── Flux (Black Forest Labs) 이미지 생성 ── */
const FLUX_BASE = "https://api.bfl.ai/v1/";
const FLUX_ENDPOINTS = {
  "Flux 1.1 Pro Ultra": "flux-pro-1.1-ultra",
  "Flux 1.1 Pro":       "flux-pro-1.1",
  "Flux Pro":           "flux-pro",
  "Flux Dev":           "flux-dev",
  // 레퍼런스 이미지를 넣어 편집/재생성(image-to-image)
  "Flux Kontext Max (레퍼런스 편집)": "flux-kontext-max",
  "Flux Kontext Pro (레퍼런스 편집)": "flux-kontext-pro"
};
const FLUX_DIMS = { "16:9":[1344,768], "9:16":[768,1344], "1:1":[1024,1024], "4:5":[896,1120] };
export function buildFluxPayload(b) {
  let ep = FLUX_ENDPOINTS[b.model] || "flux-pro-1.1";
  const prompt = (b.prompt || "").slice(0, 1000);
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
               body: { prompt, aspect_ratio: b.ratio || "16:9", output_format: "png",
                       safety_tolerance: 6, finetune_id: loraId, finetune_strength: loraStrength } };
    const [w, h] = FLUX_DIMS[b.ratio] || FLUX_DIMS["16:9"];
    return { endpoint: "flux-pro-finetuned",
             body: { prompt, width: w, height: h, output_format: "png",
                     safety_tolerance: 6, finetune_id: loraId, finetune_strength: loraStrength } };
  }

  // ── 기본 ──
  if (ep === "flux-pro-1.1-ultra")
    return { endpoint: ep, body: { prompt, aspect_ratio: b.ratio || "16:9",
             output_format: "png", safety_tolerance: 6 } };
  const [w, h] = FLUX_DIMS[b.ratio] || FLUX_DIMS["16:9"];
  return { endpoint: ep, body: { prompt, width: w, height: h,
           output_format: "png", safety_tolerance: 6 } };
}

/* ── fal.ai Flux ControlNet (Canny / Depth / Pose) — 컴피UI식 ControlNet ──
   fal 이 전처리(윤곽/깊이/포즈 맵 추출)를 서버에서 대신 해주므로 원본 이미지만 넘기면 됨.
   Canny/Depth = 전용 control-lora 엔드포인트, Pose = flux-general + Union(openpose, control_mode 4). */
const FAL_QUEUE = "https://queue.fal.run/";
const FAL_IMG_SIZE = { "1:1": "square_hd", "16:9": "landscape_16_9", "9:16": "portrait_16_9", "4:5": "portrait_4_3" };

/* ── Kling (클링) fal.ai 폴백용 엔드포인트. 텍스트→영상 / 이미지→영상 (진짜 V2V는 Runway Aleph 사용) ── */
const KLING_FAL = {
  "Kling 2.1 Master (텍스트→영상)": "fal-ai/kling-video/v2.1/master/text-to-video",
  "Kling 2.1 Master (이미지→영상)": "fal-ai/kling-video/v2.1/master/image-to-video",
  "Kling 2.0 Master (텍스트→영상)": "fal-ai/kling-video/v2/master/text-to-video",
  "Kling 2.0 Master (이미지→영상)": "fal-ai/kling-video/v2/master/image-to-video",
  "Kling 1.6 Pro (텍스트→영상)": "fal-ai/kling-video/v1.6/pro/text-to-video",
  "Kling 1.6 Pro (이미지→영상)": "fal-ai/kling-video/v1.6/pro/image-to-video",
  "Kling 1.6 Standard (이미지→영상)": "fal-ai/kling-video/v1.6/standard/image-to-video",
  "Kling 2.0": "fal-ai/kling-video/v2/master/image-to-video",
  "Kling 1.6": "fal-ai/kling-video/v1.6/pro/image-to-video",
};
// 원본 프레임(영상 브리지)이 있으면 텍스트→영상이라도 이미지→영상으로 강제 (V2V 브리지)
function hasSrcFrame(b) { return !!(b && (b.firstFrame || b.refImage || b.image_url)); }
function klingModelId(b) {
  let id = KLING_FAL[b.model] || "fal-ai/kling-video/v2/master/image-to-video";
  if (hasSrcFrame(b) && /text-to-video/.test(id)) id = id.replace("text-to-video", "image-to-video");
  return id;
}

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
const KLING_API = {
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
function klingApiSpec(b) {
  const base = KLING_API[b.model] || { m: "kling-v2-master", mode: "pro", ep: "text2video" };
  // 원본 프레임(영상 브리지)이 있으면 image2video 로 강제 → 어떤 클링 모델이든 V2V처럼 변환
  return { ...base, ep: hasSrcFrame(b) ? "image2video" : base.ep };
}
function _stripDataUri(v) { return v ? String(v).replace(/^data:[^,]+,/, "") : ""; }
function buildKlingApiPayload(b, spec) {
  const dur = (Number(b.seconds) > 7 ? "10" : "5");
  const p = { model_name: spec.m, prompt: String(b.prompt || "").slice(0, 2500), mode: spec.mode, duration: dur };
  if (b.negative) p.negative_prompt = String(b.negative).slice(0, 2500);
  const cfg = Number(b.cfg);
  if (Number.isFinite(cfg) && cfg >= 0 && cfg <= 1) p.cfg_scale = cfg;   // Kling cfg_scale 범위 0~1
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
function buildMotionPayload(b) {
  const p = {
    prompt: String(b.prompt || "").slice(0, 2500),
    video_url: b.srcVideo || null,
  };
  if (b.negative) p.negative_prompt = String(b.negative).slice(0, 2000);
  // 스타일 반영 강도(0=원본 최대 보존, 1=스타일 최대) — 모델이 지원하면 사용
  const st = Number(b.v2vStrength);
  if (Number.isFinite(st)) p.strength = Math.max(0, Math.min(1, st));
  if (b.ratio) p.aspect_ratio = b.ratio;
  return p;
}

function buildKlingPayload(b) {
  const id = klingModelId(b);
  const p = { prompt: String(b.prompt || ""), duration: (Number(b.seconds) > 7 ? "10" : "5"), aspect_ratio: (b.ratio || "16:9") };
  if (b.negative) p.negative_prompt = String(b.negative);
  if (b.cfg != null) p.cfg_scale = Number(b.cfg);
  if (/image-to-video/.test(id)) {
    const img = b.firstFrame || b.refImage || b.image_url;
    if (img) p.image_url = img;
    if (b.lastFrame) p.tail_image_url = b.lastFrame;
  }
  return p;
}
const FAL_UNION_PATH = "Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro";
const FAL_UNION_MODE = { canny: 0, tile: 1, depth: 2, blur: 3, pose: 4, gray: 5 };   // Union-Pro control_mode
const _cl = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
/* fal ControlNet — flux-general + ControlNet Union 으로 통일.
   다중 스택(b.controlnets 배열) + 타입별 강도/start·end % 지원. (컴피UI식) */
export function buildFalControlPayload(b) {
  const prompt = (b.prompt || "").slice(0, 1500);
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

export function buildNanoPayload(b) {
  const prompt = (b.prompt || "").slice(0, 2000);
  const parts = [{ text: prompt }];
  // _refs(핸들러가 준비한 data:URI 배열)가 있으면 전부 인라인, 없으면 단일 폴백
  const refs = Array.isArray(b._refs) && b._refs.length ? b._refs
    : (function () { const r = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage; return r ? [r] : []; })();
  for (const ref of refs) {
    const m = /^data:(image\/[^;]+);base64,(.+)$/.exec(String(ref));
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  return { contents: [{ role: "user", parts }] };
}

/* ── OpenAI 이미지 생성 (gpt-image-1) — 텍스트→이미지, 레퍼런스 있으면 편집(images/edits) ──
   Cloudflare egress 가 OpenAI 지역차단(403 unsupported country) 되는 문제 → 미국 릴레이 경유.
   OPENAI_RELAY_URL 설정 시 그 베이스로, 없으면 api.openai.com 직접(차단될 수 있음). */
const OPENAI_SIZE = { "1:1": "1024x1024", "16:9": "1536x1024", "9:16": "1024x1536", "4:5": "1024x1536" };
function openaiBase(env) {
  return (pick(env, ["OPENAI_RELAY_URL", "openai_relay_url"]) || "https://api.openai.com").replace(/\/+$/, "");
}
// 표시명 → OpenAI 이미지 모델 ID (DALL·E 는 2026-05 폐지되어 제외)
const OPENAI_IMG_ID = {
  "GPT Image 2": "gpt-image-2", "GPT Image 1.5": "gpt-image-1.5",
  "GPT Image": "gpt-image-1", "GPT Image Mini": "gpt-image-1-mini"
};
export function buildOpenAIImagePayload(b) {
  return { model: OPENAI_IMG_ID[b.model] || "gpt-image-1", prompt: (b.prompt || "").slice(0, 4000),
           size: OPENAI_SIZE[b.ratio] || "1024x1024", n: 1 };
}

/* ── Hailuo (MiniMax) 영상 생성 ── */
const HAILUO_BASE = "https://api.minimax.io/v1";
const HAILUO_IDS = {
  "MiniMax Hailuo 02":        "MiniMax-Hailuo-02",
  "MiniMax T2V-01 Director":  "T2V-01-Director",
  "MiniMax I2V-01 Director":  "I2V-01-Director",
  "Hailuo MiniMax":           "MiniMax-Hailuo-02"   // 구버전 표시명 호환
};
export function buildHailuoPayload(b) {
  const p = { model: HAILUO_IDS[b.model] || "MiniMax-Hailuo-02",
              prompt: (b.prompt || "").slice(0, 2000) };
  const first = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  if (first) p.first_frame_image = first;
  p.duration = (Number(b.seconds) || 6) <= 6 ? 6 : 10;
  p.resolution = "1080P";
  return p;
}

/* ── Luma Dream Machine 영상 생성 ── */
const LUMA_BASE = "https://api.lumalabs.ai/dream-machine/v1";
const LUMA_IDS = {
  "Luma Ray 2":       "ray-2",
  "Luma Ray Flash 2": "ray-flash-2",
  "Luma Ray 1.6":     "ray-1-6",
  "Luma Ray2":        "ray-2"   // 구버전 표시명 호환
};
export function buildLumaPayload(b) {
  const p = { model: LUMA_IDS[b.model] || "ray-2",
              prompt: (b.prompt || "").slice(0, 1200),
              resolution: "1080p",
              duration: (Number(b.seconds) || 5) <= 6 ? "5s" : "9s",
              aspect_ratio: b.ratio || "16:9" };
  const first = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage || null;
  if (first) p.keyframes = { frame0: { type: "image", url: first } };
  return p;
}

export function buildVeoPayload(b) {
  const inst = { prompt: (b.prompt || "").slice(0, 1000) };
  const vImg = b.firstFrame || (b.refImages && b.refImages[0]) || b.refImage;
  // Veo 는 base64 만 받음. data:URI 일 때만, 실제 MIME 을 그대로 사용(JPEG를 PNG로 잘못 라벨링하던 버그 수정)
  if (vImg && /^data:image\//i.test(String(vImg))) {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(String(vImg));
    inst.image = { bytesBase64Encoded: String(vImg).split(",").pop(), mimeType: (m && m[1]) || "image/jpeg" };
  }
  return {
    instances: [inst],
    parameters: {
      aspectRatio: b.ratio === "9:16" ? "9:16" : "16:9",
      durationSeconds: Math.min(Math.max(Number(b.seconds) || 8, 5), 8),
      negativePrompt: b.negative || undefined,
      personGeneration: "allow_adult"   // 사람/얼굴 차단(코드 173) 완화 — 성인 허용
    }
  };
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

  /* ══ GET: 상태 폴링 / 파일 프록시 ══ */
  if (request.method === "GET") {
    if (u.searchParams.get("health")) { // 제공사 키 설정 여부 점검 (키 값은 절대 노출 안 함)
      return json({
        version:  "2026-07-13-v56 (remove-keys-page)", // 이 필드가 보이면 최신 코드가 프로덕션에 반영된 것
        build:    "2026-07-13-v56",                      // 스튜디오 STUDIO_BUILD 와 정확히 일치해야 최신
        runway:   !!k.runway,
        xai:      !!k.xai,
        google:   !!(k.google || gcpCreds(env)),
        seedance: !!k.seedance,
        flux:     !!k.flux,
        hailuo:   !!k.hailuo,
        luma:     !!k.luma,
        fal:      !!k.fal,
        kling:    !!(klingCreds(env) || k.fal),
        v2vAuto:  !!(k.runway || k.seedance || k.fal),
        motion:   !!k.fal,
        nanobanana: !!(gcpCreds(env) || k.google),
        openai:   !!k.openai,
        // 스튜디오가 실제로 쓰는 Seedance 모델 결정값 진단 (모델ID는 비밀 아님)
        seedanceModelOverride: pick(env, ["SEEDANCE_MODEL_ID", "seedance_model_id"]) || null,
        seedance20Maps: SEEDANCE_IDS["Seedance 2.0"]
      });
    }
    // (보안) 키 값/환경변수 조회 엔드포인트는 제거됨 — API 키는 어떤 응답에도 절대 노출하지 않습니다.
    if (u.searchParams.get("diag") === "keys") {
      return json({ error: "이 엔드포인트는 보안상 제거되었습니다. API 키는 노출되지 않습니다." }, 410);
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
    // 진단: GPT_API_KEY(OpenAI)로 gpt-image-1 이미지 생성이 되는지 실제 호출.
    //   /api/generate?diag=gptimage
    if (u.searchParams.get("diag") === "gptimage") {
      if (!k.openai) return json({ diag: "gptimage", usable: false, error: "GPT_API_KEY 미설정" });
      const prompt = u.searchParams.get("prompt") || "A photorealistic red apple on a wooden table, soft studio lighting";
      const t0 = Date.now();
      try {
        const r = await fetchT(openaiBase(env) + "/v1/images/generations", {
          method: "POST", headers: { "Authorization": "Bearer " + k.openai, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", n: 1 }) }, 60000);
        const j = await r.json().catch(() => ({}));
        const hasImg = !!(j.data && j.data[0] && (j.data[0].b64_json || j.data[0].url));
        return json({ diag: "gptimage", usable: r.ok && hasImg, httpStatus: r.status, hasImage: hasImg, tookMs: Date.now() - t0, relay: openaiBase(env) !== "https://api.openai.com",
          error: r.ok ? null : String((j.error && j.error.message) || JSON.stringify(j)).slice(0, 240),
          note: (!r.ok && r.status === 403) ? "403이면 보통 OpenAI 조직 인증(Verify Organization) 필요 — platform.openai.com/settings/organization 에서 인증 후 gpt-image-1 사용 가능." : undefined });
      } catch (e) {
        return json({ diag: "gptimage", usable: false, error: String((e && e.message) || e).slice(0, 200), tookMs: Date.now() - t0 });
      }
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
                      "hailuoai.video", "minimax.io", "minimaxi.com", "aliyuncs.com"]
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
        return url ? json({ url, kind: "video" }) : json({ status: "failed", error: "no video_url" });
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
      if (j.state === "failed") return json({ status: "failed", error: j.failure_reason || "Luma 생성 실패" });
      if (j.state === "completed") {
        const url = j.assets && j.assets.video;
        return url ? json({ url, kind: "video" }) : json({ status: "failed", error: "no video in assets" });
      }
      return json({ status: j.state || "dreaming" });
    }
    if (provider === "falq") {
      // 범용 fal 큐 폴링 (모션 전이 등)
      const task = u.searchParams.get("task");
      const model = u.searchParams.get("model") || "";
      if (!task || !model || !k.fal) return json({ status: "failed", error: "no task/model/key" }, 400);
      const base = FAL_QUEUE + model + "/requests/" + encodeURIComponent(task);
      const sr = await fetchT(base + "/status", { headers: { "Authorization": "Key " + k.fal } });
      const sj = await sr.json().catch(() => ({}));
      const st = String(sj.status || "").toUpperCase();
      if (st === "FAILED" || sj.error) return json({ status: "failed", error: sj.error || "생성 실패" });
      if (st !== "COMPLETED") return json({ status: (st || "IN_PROGRESS").toLowerCase() });
      const rr = await fetchT(base, { headers: { "Authorization": "Key " + k.fal } });
      const rj = await rr.json().catch(() => ({}));
      const url = (rj.video && rj.video.url) || rj.url || (rj.output && rj.output.video && rj.output.video.url) || (Array.isArray(rj.videos) && rj.videos[0] && rj.videos[0].url);
      return url ? json({ url, kind: "video" }) : json({ status: "failed", error: "모션 전이: 결과 영상 URL 없음" });
    }
    if (provider === "kling") {
      // 1순위: 클링 공식 API 폴링
      const cr = klingCreds(env);
      if (cr) {
        const task = u.searchParams.get("task");
        const ep = u.searchParams.get("ep") || "text2video";
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
        return url ? json({ url, kind: "video" }) : json({ status: "failed", error: "Kling: 결과 영상 URL 없음" });
      }
      // 2순위(폴백): fal.ai 폴링
      const task = u.searchParams.get("task");
      const model = u.searchParams.get("model") || "";
      if (!task || !model || !k.fal) return json({ status: "failed", error: "no task/model/key" }, 400);
      const base = FAL_QUEUE + model + "/requests/" + encodeURIComponent(task);
      const sr = await fetchT(base + "/status", { headers: { "Authorization": "Key " + k.fal } });
      const sj = await sr.json().catch(() => ({}));
      const st = String(sj.status || "").toUpperCase();
      if (st === "FAILED" || sj.error) return json({ status: "failed", error: sj.error || "Kling 생성 실패" });
      if (st !== "COMPLETED") return json({ status: (st || "IN_PROGRESS").toLowerCase() });
      const rr = await fetchT(base, { headers: { "Authorization": "Key " + k.fal } });
      const rj = await rr.json().catch(() => ({}));
      const url = (rj.video && rj.video.url) || rj.url || (rj.output && rj.output.video && rj.output.video.url);
      return url ? json({ url, kind: "video" }) : json({ status: "failed", error: "Kling: 결과에 영상 URL 없음" });
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
  const provider = b.provider;

  /* dryRun — 실제 호출 없이 매핑된 페이로드만 반환 (검증용) */
  if (b.dryRun) {
    const payload = provider === "runway" ? buildRunwayPayload(b)
                  : provider === "runway_aleph" ? buildAlephPayload(b)
                  : provider === "xai"    ? buildXaiPayload(b)
                  : provider === "google" ? buildVeoPayload(b)
                  : provider === "seedance" ? buildSeedancePayload(b, env)
                  : provider === "flux"     ? buildFluxPayload(b)
                  : provider === "falcontrol" ? buildFalControlPayload(b)
                  : provider === "nanobanana" ? buildNanoPayload(b)
                  : provider === "openai"   ? buildOpenAIImagePayload(b)
                  : provider === "hailuo"   ? buildHailuoPayload(b)
                  : provider === "luma"     ? buildLumaPayload(b) : null;
    return json({ dryRun: true, provider, payload,
                  note: "No provider API was called." });
  }

  if (provider === "runway") {
    if (!k.runway) return json({ error: "Runway 연동이 설정되지 않았습니다" }, 500);
    const payload = buildRunwayPayload(b);
    if (!payload.promptImage) return json({ error: "Runway(gen4_turbo)는 첫 프레임 또는 레퍼런스 이미지가 필요합니다. 레퍼런스 노드를 연결하세요." }, 400);
    const r = await fetchT("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: { "Authorization": "Bearer " + k.runway, "X-Runway-Version": RUNWAY_VER, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) return json({ error: "Runway HTTP " + r.status + ": " + String(j.error || j.message || JSON.stringify(j)).slice(0, 220) }, 502);
    return json({ statusUrl: "/api/generate?provider=runway&task=" + encodeURIComponent(j.id) });
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
      const r = await fetchT(FAL_QUEUE + model, {
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
        if (!k.fal) return json({ error: "V2V 브리지(Kling) 실패: " + String(j.message || JSON.stringify(j)).slice(0, 200) }, 502);
      }
      if (k.fal) {
        const model = klingModelId(kb);
        const r = await fetchT(FAL_QUEUE + model, {
          method: "POST", headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
          body: JSON.stringify(buildKlingPayload(kb))
        });
        const j = await r.json().catch(() => ({}));
        const reqId = j.request_id || j.requestId;
        if (r.ok && reqId) return json({ statusUrl: "/api/generate?provider=kling&task=" + encodeURIComponent(reqId) + "&model=" + encodeURIComponent(model), routed: "kling_bridge_fal" });
        return json({ error: "V2V 브리지(fal Kling) 실패: " + String(j.error || JSON.stringify(j)).slice(0, 200) }, 502);
      }
    }

    return json({ error: "V2V(영상→영상)를 하려면 Runway·Seedance(최고정확도) 또는 Kling·fal 중 하나 이상의 키가 필요합니다." }, 500);
  }

  /* 나레이션(AI 음성 해설) — 대본→TTS 음성 생성 후 원본 영상에 오디오 트랙을 덧입힘(보이스오버).
     화면 속 인물의 입은 움직이지 않음. (fal ffmpeg merge-audio-video) */
  if (provider === "narrate") {
    if (!k.fal) return json({ error: "나레이션 합성에는 FAL_API_KEY(영상·음성 병합)이 필요합니다." }, 500);
    const videoUrl = String(b.videoUrl || b.srcVideo || "").trim();
    if (!/^https?:\/\//.test(videoUrl))
      return json({ error: "나레이션을 입힐 영상의 공개 URL이 필요합니다. (출력 노드의 영상을 음성 노드에 연결하세요)" }, 400);
    const origin = new URL(request.url).origin;
    const tts = await synthTTSUrl(env, origin, b, fetchT);
    if (tts.error) return json({ error: "나레이션 " + tts.error }, tts.status || 502);
    // fal ffmpeg — 원본 영상 + 나레이션 오디오 병합 (env 로 모델 교체 가능)
    const model = pick(env, ["FAL_MERGE_MODEL", "fal_merge_model"]) || "fal-ai/ffmpeg-api/merge-audio-video";
    const r = await fetchT(FAL_QUEUE + model, {
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
    const tts = await synthTTSUrl(env, origin, b, fetchT);
    if (tts.error) return json({ error: "립싱크 " + tts.error }, tts.status || 502);
    // fal 립싱크 모델 (env 로 교체 가능). sync-lipsync 은 video_url+audio_url 규격.
    const model = pick(env, ["FAL_LIPSYNC_MODEL", "fal_lipsync_model"]) || "fal-ai/sync-lipsync";
    const payload = { video_url: videoUrl, audio_url: tts.audioUrl, sync_mode: "cut_off" };
    const r = await fetchT(FAL_QUEUE + model, {
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
    const r2 = await fetchT(FAL_QUEUE + model, {
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
    const r = await fetchT(FAL_QUEUE + model, {
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
    const payload = buildAlephPayload(b);
    if (!payload.videoUri || !/^https?:\/\//.test(payload.videoUri))
      return json({ error: "Runway Aleph(V2V)는 입력 영상의 공개 URL이 필요합니다. 영상을 옴니 레퍼런스에 넣으면 자동 업로드됩니다(R2)." }, 400);
    const r = await fetchT("https://api.dev.runwayml.com/v1/video_to_video", {
      method: "POST",
      headers: { "Authorization": "Bearer " + k.runway, "X-Runway-Version": RUNWAY_VER, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) return json({ error: "Runway Aleph HTTP " + r.status + ": " + String(j.error || j.message || JSON.stringify(j)).slice(0, 220) }, 502);
    return json({ statusUrl: "/api/generate?provider=runway&task=" + encodeURIComponent(j.id) }); // 폴링은 기존 runway 태스크와 동일
  }

  if (provider === "xai") {
    if (!k.xai) return json({ error: "Grok 연동이 설정되지 않았습니다" }, 500);
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
    // ② AI Studio 폴백
    const r = await fetchT(
      "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-001:predictLongRunning?key=" + encodeURIComponent(k.google),
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (j.error) return json({ error: "Veo: " + (vj.error?.message || "") + " / " + j.error.message }, 502);
    if (!j.name) return json({ error: "Veo: no operation" }, 502);
    return json({ statusUrl: "/api/generate?provider=google&op=" + encodeURIComponent(j.name) });
  }

  if (provider === "seedance") {
    if (!k.seedance) return json({ error: "Seedance 연동이 설정되지 않았습니다" }, 500);
    const payload = buildSeedancePayload(b, env);
    // 해외(bp) 호스트만 사용. 중국(vc) 호스트는 Cloudflare 글로벌 네트워크에서 무한정 멈춰(hang)
    // 플랫폼 502를 유발하므로 기본 제외. 필요하면 SEEDANCE_USE_CN=1 로 켤 수 있음.
    const hosts = pick(env, ["SEEDANCE_USE_CN", "seedance_use_cn"]) ? ["bp", "vc"] : ["bp"];
    // 스튜디오가 실제로 보낸 값을 에러에 그대로 실어, 노드에 원인이 보이게 한다.
    const imgN = payload.content.filter(c => c.type === "image_url").length;
    const tag = "[m:" + payload.model + " img:" + imgN + "]";
    let lastErr = null;
    for (const hostId of hosts) {
      let r, j; const t0 = Date.now();
      try {
        // fetchT 의 unhandled-rejection 차단으로 raw 502 는 사라졌으므로, bp 가 이미지
        // 검증 등으로 제출이 느려도(태스크 ID 반환까지 십수 초) 안전하게 기다린다.
        // 초과 시엔 crash 없이 읽을 수 있는 "시간 초과" JSON 이 노드에 표시된다.
        r = await fetchT(ARK_HOSTS[hostId] + "/contents/generations/tasks", {
          method: "POST",
          headers: { "Authorization": "Bearer " + k.seedance, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 22000);
        j = await r.json().catch(() => ({}));
      } catch (e) {
        lastErr = hostId + " 제출 실패(" + (Date.now() - t0) + "ms): " + String((e && e.message) || e).slice(0, 140);
        continue;
      }
      if (r.ok && j.id)
        return json({ statusUrl: "/api/generate?provider=seedance&host=" + hostId + "&task=" + encodeURIComponent(j.id) });
      lastErr = "HTTP " + r.status + " " + ((j.error && (j.error.message || j.error.code)) || String(JSON.stringify(j)).slice(0, 140));
      if (r.status !== 401 && r.status !== 403 && r.status !== 404) break;
    }
    return json({ error: "Seedance " + tag + ": " + String(lastErr).slice(0, 220) }, 502);
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
    const r = await fetchT(FAL_QUEUE + model, {
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
    let r;
    if (sa) {   // Vertex(서비스계정) — Veo와 동일 인증
      let tok; try { tok = await gcpToken(sa.email, sa.pem); } catch (e) { return json({ error: "나노바나나 토큰 실패: " + String((e && e.message) || e).slice(0, 160) }, 502); }
      const url = "https://" + VERTEX_LOC + "-aiplatform.googleapis.com/v1/projects/" + sa.pid + "/locations/" + VERTEX_LOC + "/publishers/google/models/" + NANO_MODEL + ":generateContent";
      r = await fetchT(url, { method: "POST", headers: { "Authorization": "Bearer " + tok, "Content-Type": "application/json" }, body: payload }, 60000);
    } else {    // AI Studio 키
      r = await fetchT("https://generativelanguage.googleapis.com/v1beta/models/" + NANO_MODEL + ":generateContent?key=" + encodeURIComponent(k.google),
        { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }, 60000);
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
    if (oaRefs.length) {   // 편집 (images/edits · multipart) — 여러 장 image[] 로 첨부
      const fd = new FormData();
      fd.append("model", p.model); fd.append("prompt", p.prompt); fd.append("size", p.size); fd.append("n", "1");
      let added = 0;
      for (const ref of oaRefs) {
        const m = /^data:(image\/[^;]+);base64,(.+)$/.exec(ref); if (!m) continue;
        const bin = atob(m[2]); const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        fd.append(oaRefs.length > 1 ? "image[]" : "image", new Blob([buf], { type: m[1] }), "img" + added + ".png");
        added++;
      }
      r = await fetchT(openaiBase(env) + "/v1/images/edits", { method: "POST", headers: { "Authorization": "Bearer " + k.openai }, body: fd }, 120000);
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

  if (provider === "kling") {
    // 1순위: 클링 공식 오픈플랫폼 API (KLING_ACCESS_KEY+KLING_SECRET_KEY 또는 KLING_API_KEY)
    const cr = klingCreds(env);
    if (cr) {
      const spec = klingApiSpec(b);
      const auth = await klingAuth(cr);
      const r = await fetchT(cr.base + "/v1/videos/" + spec.ep, {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify(buildKlingApiPayload(b, spec))
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.code !== 0 || !(j.data && j.data.task_id))
        return json({ error: "Kling: " + String(j.message || JSON.stringify(j) || "요청 실패").slice(0, 200) }, 502);
      return json({ statusUrl: "/api/generate?provider=kling&task=" + encodeURIComponent(j.data.task_id) + "&ep=" + spec.ep });
    }
    // 2순위(폴백): fal.ai 경유 (FAL_KEY 있을 때만)
    if (!k.fal) return json({ error: "Kling 연동이 설정되지 않았습니다. 환경변수 KLING_ACCESS_KEY·KLING_SECRET_KEY(또는 KLING_API_KEY) 를 넣어주세요." }, 500);
    const model = klingModelId(b);
    const r = await fetchT(FAL_QUEUE + model, {
      method: "POST",
      headers: { "Authorization": "Key " + k.fal, "Content-Type": "application/json" },
      body: JSON.stringify(buildKlingPayload(b))
    });
    const j = await r.json().catch(() => ({}));
    const reqId = j.request_id || j.requestId;
    if (!r.ok || !reqId)
      return json({ error: "Kling: " + (JSON.stringify(j.detail || j.error || j) || "").slice(0, 200) }, 502);
    return json({ statusUrl: "/api/generate?provider=kling&task=" + encodeURIComponent(reqId) + "&model=" + encodeURIComponent(model) });
  }

  return json({ error: "지원하지 않는 provider: " + provider + " (runway/runway_aleph/xai/google/seedance/flux/hailuo/luma/kling)" }, 400);
}

// redeploy marker a1aedb0
