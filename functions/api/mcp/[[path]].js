// /api/mcp — Claude 커스텀 커넥터용 MCP 서버 (Streamable HTTP, stateless)
//
// 연결 방법:
//   · claude.ai / Claude Desktop (권장 · 원클릭 OAuth):
//       설정 → 커넥터 → 커스텀 커넥터 추가 → URL: https://nextbygency.com/api/mcp
//       토큰 복사 불필요. Claude 가 401 의 WWW-Authenticate 를 보고 스스로 OAuth 흐름을 시작해
//       로그인·승인 창을 띄우고 액세스 토큰을 받아간다. (OAuth 2.1 + DCR + PKCE)
//   · 수동 방식(호환 유지): https://nextbygency.com/api/mcp/<개인토큰>
//   · Claude Code:
//       claude mcp add --transport http bygency https://nextbygency.com/api/mcp \
//         --header "Authorization: Bearer <토큰>"
//
// 제공 도구: generate_video / check_video_status / generate_image / list_models
// 모델 목록은 스튜디오 단가표(studio/_pricing MODEL_COST)에서 자동 생성 — 스튜디오와 항상 동일.
// 키는 Cloudflare 환경변수에서만 읽으며 응답에 절대 포함되지 않습니다.

import { onRequest as generateApi, CAMERA_PRESETS } from "../generate.js";
import { resolveDB, ensureSchema, getUserByMcpToken } from "../_utils";
import { getUserByAccessToken } from "../oauth/_oauth";
import { computeCharge, getUsdKrw, resolveMarkup, ensureAiUsage, MODEL_COST, PROV_LABEL } from "../studio/_pricing";
import { findCharacter, listCharacters } from "../studio/characters";

const SERVER_INFO = { name: "bygency-studio", version: "1.1.0" };

/* ── 모델 카탈로그: 스튜디오 단가표(MODEL_COST)에서 그대로 생성 ──
   노드 스튜디오에서 쓸 수 있는 모델 = MCP 로 쓸 수 있는 모델 이 되도록 단일 소스로 묶는다.
   (예전에는 veo/runway/seedance 3종만 하드코딩되어 있어 씨드림·Flux·Kling 등을 Claude 로 부를 수 없었고,
    게다가 body 에 model 을 싣지 않아 씨댄스가 항상 1.0 Pro 로 고정되었다.) */
const slug = (s) => String(s).toLowerCase()
  .replace(/\([^)]*\)/g, " ")            // 괄호 설명 제거
  .replace(/[^a-z0-9가-힣]+/g, "-")
  .replace(/^-+|-+$/g, "");

const CATALOG = Object.keys(MODEL_COST).map((name) => {
  const m = MODEL_COST[name];
  return {
    name,                                  // 스튜디오 표시명 = /api/generate 의 model 값
    id: slug(name),                        // 짧은 식별자(선택적으로 사용 가능)
    provider: m.prov,
    providerLabel: PROV_LABEL[m.prov] || m.prov,
    kind: m.u === "img" ? "image" : "video",
    unit: m.u,
    usd: m.usd,
    audioUsd: m.audio || 0,
  };
});
const VIDEO_CATALOG = CATALOG.filter((x) => x.kind === "video" && x.provider !== "music");
const IMAGE_CATALOG = CATALOG.filter((x) => x.kind === "image");

// 예전 MCP 가 쓰던 짧은 이름 → 표시명 (기존 커넥터 호환)
const LEGACY_ALIAS = {
  veo: "Google Veo 3.1", runway: "Runway Gen-4", seedance: "Seedance 1.0 Pro",
  nanobanana: "Nano Banana", nano: "Nano Banana",
  gpt: "GPT Image", gptimage: "GPT Image", openai: "GPT Image",
  grok: "Grok Imagine", xai: "Grok Imagine",
};

/** 입력(표시명·슬러그·구버전 별칭)을 카탈로그 항목으로 해석 */
function resolveModel(input, kind) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  const pool = kind === "image" ? IMAGE_CATALOG : kind === "video" ? VIDEO_CATALOG : CATALOG;
  const alias = LEGACY_ALIAS[raw.toLowerCase()];
  const want = alias || raw;
  return pool.find((x) => x.name === want)
      || pool.find((x) => x.name.toLowerCase() === want.toLowerCase())
      || pool.find((x) => x.id === slug(want))
      || null;
}

async function estimateMcp(db, me, modelName, units, res, audio) {
  const c = CATALOG.find((x) => x.name === modelName); if (!c) return null;
  const rate = await getUsdKrw(db);
  const markup = await resolveMarkup(db, me.id, modelName, Number(me.credit_markup) || 0);
  return computeCharge({ model: modelName, units: units || 0, kind: c.kind, res, audio: !!audio }, rate, markup);
}
// 크레딧 차감 + 사용/거래 기록 (스튜디오 usage/record 와 동일 규칙)
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
      ).bind("t_" + crypto.randomUUID().slice(0, 16), me.id, -charged, after, "MCP 생성 · " + c.model, new Date().toISOString()).run();
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
const PROTO_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const TOOLS = [
  {
    name: "generate_video",
    description:
      "AI 영상 생성을 시작합니다. 스튜디오에 연결된 모든 영상 모델(Veo·Runway·씨댄스·Kling·Hailuo·Luma 등)을 사용할 수 있습니다. " +
      "실제 생성이 시작되며 과금이 발생할 수 있습니다. " +
      "즉시 완성되지 않고 task 토큰을 반환하므로, 이후 check_video_status 도구로 완료될 때까지 (보통 1~5분, 15~30초 간격) 상태를 확인하세요. " +
      "Runway 계열은 first_frame_url 또는 reference_image_url이 반드시 필요합니다(이미지에서 영상 생성). " +
      "이어지는 영상(체이닝)을 만들려면 앞 영상의 마지막 장면 이미지를 first_frame_url로 넣으세요.",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string", enum: VIDEO_CATALOG.map((x) => x.name),
                 description: "영상 모델 표시명. 예: 'Seedance 2.0', 'Google Veo 3.1', 'Kling 2.1 Master (이미지→영상)'. "
                   + "구버전 별칭(veo/runway/seedance)도 계속 동작합니다. 목록은 list_models 로 확인하세요." },
        prompt: { type: "string", description: "영상 내용 프롬프트 (한국어/영어)" },
        negative_prompt: { type: "string", description: "피해야 할 요소 (선택)" },
        first_frame_url: { type: "string", description: "첫 프레임 이미지 URL 또는 data URI (선택, Runway 계열은 필수)" },
        last_frame_url: { type: "string", description: "마지막 프레임 이미지 URL (선택, 씨댄스 1.x 등 지원 모델)" },
        reference_image_url: { type: "string", description: "레퍼런스 이미지 URL 또는 data URI (선택)" },
        source_video_url: { type: "string", description: "원본 영상 URL (선택). V2V·모션 전이·립싱크 계열 모델에 필요" },
        seconds: { type: "number", description: "영상 길이(초). 모델별 지원값이 다름(대개 5/8/10). 기본 8" },
        ratio: { type: "string", enum: ["16:9", "9:16", "1:1"], description: "화면 비율, 기본 16:9" },
        generate_audio: { type: "boolean", description: "오디오 동시 생성 (씨댄스 2.0 등 지원 모델만, 기본 false)" },
        camera: { type: "string", enum: Object.keys(CAMERA_PRESETS),
                  description: "카메라 모션 프리셋 (선택). 시네마틱 카메라 지시문을 프롬프트에 자동 주입 — 크래시 줌·돌리 인·360 오빗·불릿타임·FPV 드론 등" },
        character: { type: "string", description: "저장된 캐릭터 이름 (선택). 계정의 캐릭터 라이브러리에서 레퍼런스 사진을 자동으로 불러와 인물 일관성을 유지합니다. list_characters 로 목록 확인" },
        dry_run: { type: "boolean", description: "true면 실제 호출 없이 제공사로 보낼 페이로드만 미리보기 (과금 없음)" }
      },
      required: ["model", "prompt"]
    }
  },
  {
    name: "check_video_status",
    description:
      "generate_video가 반환한 task 토큰으로 영상 생성 상태를 확인합니다. " +
      "완료되면 영상 URL을 반환합니다. 아직 진행 중이면 status를 반환하니 15~30초 후 다시 호출하세요.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "generate_video가 반환한 task 문자열 그대로" }
      },
      required: ["task"]
    }
  },
  {
    name: "generate_image",
    description:
      "이미지를 생성합니다. 스튜디오에 연결된 모든 이미지 모델(씨드림·Flux·나노바나나·GPT Image·Grok 등)을 사용할 수 있습니다. " +
      "즉시 이미지 URL을 반환합니다(폴링 불필요). 과금이 발생할 수 있습니다. " +
      "생성된 이미지를 generate_video의 first_frame_url로 넣어 이미지→영상 워크플로를 만들 수 있습니다.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "이미지 내용 프롬프트" },
        model: { type: "string", enum: IMAGE_CATALOG.map((x) => x.name),
                 description: "이미지 모델 표시명. 예: 'Seedream 4.0', 'Flux 1.1 Pro', 'Nano Banana', 'GPT Image 2'. "
                   + "구버전 별칭(nanobanana/gpt/grok)도 계속 동작합니다. 미지정 시 Nano Banana." },
        reference_image_url: { type: "string", description: "레퍼런스/편집용 입력 이미지 URL 또는 data URL (선택)" },
        reference_image_urls: { type: "array", items: { type: "string" },
                 description: "레퍼런스 이미지 여러 장 (선택). 씨드림 4.x/5.0·나노바나나 등 다중 레퍼런스 지원 모델용" },
        character: { type: "string", description: "저장된 캐릭터 이름 (선택). 계정의 캐릭터 라이브러리에서 레퍼런스 사진을 자동으로 불러와 같은 인물로 생성합니다. list_characters 로 목록 확인" },
        ratio: { type: "string", enum: ["16:9", "9:16", "1:1", "4:5", "3:4", "4:3"], description: "화면 비율(지원 모델만), 기본 16:9" },
        negative_prompt: { type: "string", description: "피해야 할 요소 (선택)" },
        dry_run: { type: "boolean", description: "true면 실제 호출 없이 페이로드만 미리보기 (과금 없음)" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "generate_music",
    description:
      "배경음악(BGM)·음악을 생성합니다. 즉시 오디오 URL을 반환합니다. 과금이 발생할 수 있습니다. " +
      "생성한 음악 URL을 generate_video(씨댄스 2.0)의 audio 참조로 쓰거나 영상 편집에 사용할 수 있습니다.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "원하는 음악 설명 (장르·분위기·악기·템포 등). 예: '잔잔한 로파이 힙합, 카페 분위기'" },
        seconds: { type: "number", description: "길이(초). 10~120, 기본 30" },
        lyrics: { type: "string", description: "가사 (선택 · 지원 엔진에서만 반영)" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "list_characters",
    description: "계정에 저장된 캐릭터(일관된 인물 레퍼런스 묶음) 목록을 반환합니다. generate_image / generate_video 의 character 파라미터에 이름을 넣으면 그 인물로 생성됩니다.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_models",
    description: "사용 가능한 AI 생성 모델과 각 모델의 특징/제약을 반환합니다.",
    inputSchema: { type: "object", properties: {} }
  }
];

/* list_models 응답 — 카탈로그에서 생성(스튜디오와 항상 동일) */
function modelInfo() {
  const row = (x) => ({
    model: x.name,                       // generate_video / generate_image 의 model 에 그대로 넣는 값
    provider: x.providerLabel,
    price: x.unit === "img" ? `$${x.usd}/장` : `$${x.usd}/초${x.audioUsd ? ` (+$${x.audioUsd}/초 오디오)` : ""}`,
  });
  return {
    video: VIDEO_CATALOG.map(row),
    image: IMAGE_CATALOG.map(row),
    usage: "generate_video / generate_image 의 model 에는 위 'model' 값을 그대로 넣으세요. "
         + "구버전 별칭(veo·runway·seedance·nanobanana·gpt·grok)도 계속 동작합니다.",
    notes: [
      "Runway 계열은 first_frame_url(또는 reference_image_url)이 필수입니다.",
      "V2V·모션 전이·립싱크 계열은 source_video_url 이 필요합니다.",
      "씨댄스 2.0 은 generate_audio:true 로 오디오 동시 생성이 가능합니다.",
      "씨드림 4.x/5.0 은 reference_image_urls 로 다중 레퍼런스를 지원합니다.",
    ],
    tip: "이어지는 영상: 영상1 완료 → 마지막 장면 이미지를 영상2의 first_frame_url로 전달. 노드 스튜디오(https://nextbygency.com/studio-nvc-prv-8b3k2/)에서는 노드 연결로 자동화됩니다.",
  };
}

/* ── 내부 헬퍼: 기존 /api/generate 핸들러 재사용 ── */
async function callGeneratePOST(env, origin, body, token) {
  const headers = { "Content-Type": "application/json" };
  // 내부 호출도 /api/generate 인증 게이트를 통과하도록 인증 토큰(회원 개인 토큰 또는 전역 MCP 토큰) 전달
  if (token) headers["Authorization"] = "Bearer " + token;
  const req = new Request(origin + "/api/generate", { method: "POST", headers, body: JSON.stringify(body) });
  const res = await generateApi({ request: req, env });
  return res.json();
}
async function callGenerateGET(env, origin, statusUrl, token) {
  const headers = {};
  if (token) headers["Authorization"] = "Bearer " + token;
  const req = new Request(origin + statusUrl, { headers });
  const res = await generateApi({ request: req, env });
  return res.json();
}
/* base64 data URL 을 R2 에 올려 공개 URL 로 반환 (없거나 실패하면 null → 원본 data URL 유지) */
function mcpR2(env) {
  for (const n of ["MEDIA", "BUCKET", "R2", "R2_BUCKET", "STORAGE", "ASSETS", "media", "bucket", "r2", "storage", "UPLOADS"]) {
    const v = env[n]; if (v && typeof v.put === "function" && typeof v.get === "function") return v;
  }
  for (const k in env) { const v = env[k];
    if (v && typeof v.put === "function" && typeof v.get === "function" && (typeof v.createMultipartUpload === "function" || typeof v.head === "function")) return v; }
  return null;
}
async function hostDataUrl(env, origin, dataUrl) {
  try {
    const m = /^data:(image\/[^;]+);base64,(.+)$/.exec(dataUrl); if (!m) return null;
    const bucket = mcpR2(env); if (!bucket) return null;
    const bin = atob(m[2]); const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const ext = (m[1].split("/")[1] || "png").split("+")[0];
    const key = "u/" + crypto.randomUUID() + "." + ext;
    await bucket.put(key, buf, { httpMetadata: { contentType: m[1] } });
    return origin + "/api/media/" + key;
  } catch { return null; }
}

/* ── 도구 실행 ── */
async function runTool(name, args, env, origin, ctx) {
  args = args || {};
  const me = ctx && ctx.user, db = ctx && ctx.db;
  // /api/generate 인증 게이트 통과용 토큰: 회원 개인 MCP 토큰 우선, 없으면 전역 MCP 토큰(관리자 폴백)
  const genTok = (me && me.mcp_token) ? me.mcp_token : (env.MCP_AUTH_TOKEN || env.mcp_auth_token || "");

  if (name === "list_models") return modelInfo();

  if (name === "list_characters") {
    if (!me || !db) throw new Error("회원 인증이 필요합니다.");
    const chars = await listCharacters(db, me.id).catch(() => []);
    return { characters: chars.map((c) => ({ name: c.name, images: c.images.length, note: c.note })),
      usage: "generate_image / generate_video 의 character 에 이름을 넣으면 해당 인물 레퍼런스가 자동 적용됩니다. 캐릭터는 스튜디오의 [캐릭터] 노드에서 저장합니다." };
  }

  if (name === "generate_music") {
    if (!args.prompt) throw new Error("prompt(음악 설명)는 필수입니다");
    const secs = Math.min(Math.max(Number(args.seconds) || 30, 10), 120);
    const MUSIC_MODEL = "음악 생성 (BGM·뮤직)";
    let est = null;
    if (me && db) {
      est = await estimateMcp(db, me, MUSIC_MODEL, secs);
      if (est && (Number(me.credits) || 0) < est.credits)
        throw new Error("크레딧이 부족합니다. 필요 " + est.credits + "크레딧 · 보유 " + (Number(me.credits) || 0) + "크레딧. nextbygency.com/pricing 에서 충전하세요.");
    }
    const j = await callGeneratePOST(env, origin, {
      provider: "music", model: MUSIC_MODEL,
      prompt: args.prompt, lyrics: args.lyrics || undefined, seconds: secs
    }, genTok);
    if (j.error) throw new Error(j.error);
    let url = j.url;
    if (url && url.startsWith("data:")) { const hosted = await hostDataUrl(env, origin, url); if (hosted) url = hosted; }
    let charged = null;
    if (me && db && est) charged = await commitCharge(db, me, est, secs);
    return { status: "succeeded", audio_url: url, engine: j.engine, seconds: secs,
      credits_charged: charged == null ? undefined : charged, credits_remaining: me ? me.credits : undefined };
  }

  if (name === "generate_image") {
    if (!args.prompt) throw new Error("prompt는 필수입니다");
    const c = resolveModel(args.model || "Nano Banana", "image");
    if (!c) throw new Error("알 수 없는 이미지 모델: " + args.model + " — list_models 로 사용 가능한 model 값을 확인하세요.");
    // 크레딧 사전 확인(로그인 토큰 사용자) — 부족하면 생성 자체를 막음
    let est = null;
    if (me && db && !args.dry_run) {
      est = await estimateMcp(db, me, c.name, 1);
      if (est && (Number(me.credits) || 0) < est.credits)
        throw new Error("크레딧이 부족합니다. 필요 " + est.credits + "크레딧 · 보유 " + (Number(me.credits) || 0) + "크레딧. nextbygency.com/pricing 에서 충전하세요.");
    }
    // 레퍼런스: 단일/다중 모두 수용 (씨드림 4.x·5.0 등은 다중 레퍼런스 지원)
    const refs = [];
    if (Array.isArray(args.reference_image_urls)) for (const u of args.reference_image_urls) if (u) refs.push(String(u));
    if (args.reference_image_url && refs.indexOf(String(args.reference_image_url)) < 0) refs.unshift(String(args.reference_image_url));
    if (args.character && me && db) {
      const ch = await findCharacter(db, me.id, args.character);
      if (!ch) throw new Error("캐릭터 '" + args.character + "' 를 찾을 수 없습니다. list_characters 로 목록을 확인하세요.");
      for (const u of ch.images) if (refs.indexOf(u) < 0) refs.unshift(u);   // 캐릭터 레퍼런스를 최우선으로
    }
    const j = await callGeneratePOST(env, origin, {
      provider: c.provider,
      model: c.name,                       // ★ 제공사 내부 모델ID 결정에 필수 (없으면 기본 모델로 고정됨)
      prompt: args.prompt, negative: args.negative_prompt || "",
      ratio: args.ratio || "16:9",
      refImage: refs[0] || null, refImages: refs,
      refCount: refs.length,
      dryRun: !!args.dry_run
    }, genTok);
    if (j.error) throw new Error(j.error);
    if (j.dryRun) return { dry_run: true, model: c.name, provider: j.provider, payload: j.payload, note: j.note };
    let url = j.url;
    // 나노바나나 등은 base64 data URL 을 반환 → MCP 응답 폭증 방지 위해 R2 에 올려 공개 URL 로 교체
    if (url && url.startsWith("data:")) { const hosted = await hostDataUrl(env, origin, url); if (hosted) url = hosted; }
    let charged = null;
    if (me && db && est) charged = await commitCharge(db, me, est, 1);
    return { status: "succeeded", image_url: url, model: c.name, provider: c.providerLabel,
      credits_charged: charged == null ? undefined : charged, credits_remaining: me ? me.credits : undefined };
  }

  if (name === "generate_video") {
    const c = resolveModel(args.model, "video");
    if (!c) throw new Error("알 수 없는 영상 모델: " + args.model + " — list_models 로 사용 가능한 model 값을 확인하세요.");
    if (!args.prompt) throw new Error("prompt는 필수입니다");
    const seconds = args.seconds || 8;
    // 크레딧 사전 확인 (dry_run 은 과금 없음)
    let est = null;
    if (me && db && !args.dry_run) {
      est = await estimateMcp(db, me, c.name, seconds, "1080p", !!args.generate_audio);
      if (est && (Number(me.credits) || 0) < est.credits)
        throw new Error("크레딧이 부족합니다. 필요 " + est.credits + "크레딧 · 보유 " + (Number(me.credits) || 0) + "크레딧. nextbygency.com/pricing 에서 충전하세요.");
    }
    let vidRefs = args.reference_image_url ? [String(args.reference_image_url)] : [];
    if (args.character && me && db) {
      const ch = await findCharacter(db, me.id, args.character);
      if (!ch) throw new Error("캐릭터 '" + args.character + "' 를 찾을 수 없습니다. list_characters 로 목록을 확인하세요.");
      vidRefs = ch.images.concat(vidRefs.filter((u) => ch.images.indexOf(u) < 0));
    }
    const ref = vidRefs[0] || null;
    const body = {
      provider: c.provider,
      model: c.name,                       // ★ 제공사 내부 모델ID 결정에 필수 (없으면 기본 모델로 고정됨)
      prompt: args.prompt,
      negative: args.negative_prompt || "",
      firstFrame: args.first_frame_url || null,
      lastFrame: args.last_frame_url || null,
      refImage: ref,
      refImages: vidRefs,
      srcVideo: args.source_video_url || null,   // V2V·모션 전이·립싱크 계열
      seconds,
      ratio: args.ratio || "16:9",
      generateAudio: !!args.generate_audio,
      camera: args.camera || undefined,   // 카메라 모션 프리셋 → 서버가 프롬프트에 주입
      dryRun: !!args.dry_run
    };
    const j = await callGeneratePOST(env, origin, body, genTok);
    if (j.error) throw new Error(j.error);
    if (j.dryRun) return { dry_run: true, model: c.name, provider: j.provider, payload: j.payload, note: j.note };
    // 생성이 시작/완료되면(=과금 발생) 이 시점에 크레딧 차감. check_video_status 는 추가 차감 없음.
    let charged = null;
    if (me && db && est) charged = await commitCharge(db, me, est, seconds);
    const extra = charged == null ? {} : { credits_charged: charged, credits_remaining: me ? me.credits : undefined };
    if (j.url) return Object.assign({ status: "succeeded", video_url: j.url, kind: j.kind || "video" }, extra);
    if (j.statusUrl) return Object.assign({
      status: "generating",
      task: j.statusUrl,
      next: "check_video_status 도구에 이 task 값을 그대로 넣어 15~30초 간격으로 확인하세요 (보통 1~5분 소요). 크레딧은 이미 차감되었습니다."
    }, extra);
    throw new Error("예상치 못한 응답: " + JSON.stringify(j).slice(0, 200));
  }

  if (name === "check_video_status") {
    const task = String(args.task || "");
    if (!task.startsWith("/api/generate?")) throw new Error("task 형식이 올바르지 않습니다. generate_video가 반환한 값을 그대로 사용하세요.");
    const j = await callGenerateGET(env, origin, task, genTok);
    if (j.status === "failed" || j.error) return { status: "failed", error: j.error || "생성 실패" };
    if (j.url) {
      if (String(j.url).startsWith("data:")) {
        // Veo 등은 base64 대용량으로 반환됨 — 대화 컨텍스트에 넣기엔 너무 큼
        const mb = Math.round(j.url.length * 0.75 / 1048576 * 10) / 10;
        return { status: "succeeded", kind: j.kind || "video",
                 note: "영상 생성 완료 (약 " + mb + "MB). base64 대용량이라 URL로 제공할 수 없습니다. " +
                       "다운로드하려면 노드 스튜디오(https://nextbygency.com/studio-nvc-prv-8b3k2/)에서 같은 프롬프트로 실행하거나, runway/seedance 모델을 사용하세요(CDN URL 제공)." };
      }
      const abs = String(j.url).charAt(0) === "/" ? origin + j.url : j.url;
      return { status: "succeeded", video_url: abs, kind: j.kind || "video" };
    }
    return { status: (j.status || "RUNNING").toLowerCase(), note: "아직 생성 중입니다. 15~30초 후 다시 확인하세요." };
  }

  throw new Error("알 수 없는 도구: " + name);
}

/* ── JSON-RPC 처리 ── */
function rpcResult(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id, error: { code, message } }; }

async function handleRpc(msg, env, origin, ctx) {
  if (!msg || msg.jsonrpc !== "2.0" || !msg.method) return rpcError(msg && msg.id != null ? msg.id : null, -32600, "invalid request");
  const { method, id, params } = msg;
  const isNotification = (id === undefined || id === null) && method.startsWith("notifications/");
  if (isNotification) return null; // 알림은 응답 없음

  try {
    if (method === "initialize") {
      const want = params && params.protocolVersion;
      const proto = PROTO_VERSIONS.includes(want) ? want : PROTO_VERSIONS[1];
      const acct = ctx && ctx.user ? (ctx.user.email || ctx.user.name || "회원") : null;
      const bal = ctx && ctx.user ? (Number(ctx.user.credits) || 0) : null;
      return rpcResult(id, {
        protocolVersion: proto,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          "BYGENCY(바이전시) AI 스튜디오 MCP 서버입니다. generate_video로 영상 생성을 시작하고 " +
          "check_video_status로 완료를 확인하세요(1~5분 소요). generate_image는 즉시 이미지 URL을 반환합니다. " +
          "생성 1건마다 연결된 본인 BYGENCY 계정" + (acct ? "(" + acct + ", 잔여 " + bal + "크레딧)" : "") +
          "에서 크레딧이 차감됩니다. 크레딧이 부족하면 생성이 거부됩니다(nextbygency.com/pricing 에서 충전). " +
          "실제 생성은 과금이 발생하므로 사용자의 명시적 요청이 있을 때만 실행하고, 테스트는 dry_run:true를 사용하세요."
      });
    }
    if (method === "ping") return rpcResult(id, {});
    if (method === "tools/list") return rpcResult(id, { tools: TOOLS });
    if (method === "tools/call") {
      const name = params && params.name;
      try {
        const out = await runTool(name, params && params.arguments, env, origin, ctx);
        return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        return rpcResult(id, { content: [{ type: "text", text: String(e.message || e) }], isError: true });
      }
    }
    if (method === "resources/list") return rpcResult(id, { resources: [] });
    if (method === "prompts/list") return rpcResult(id, { prompts: [] });
    return rpcError(id, -32601, "method not found: " + method);
  } catch (e) {
    return rpcError(id, -32603, String(e.message || e).slice(0, 300));
  }
}

/* ── 인증: 회원별 개인 MCP 토큰(본인 계정 크레딧 차감) 우선, 전역 MCP_AUTH_TOKEN 은 관리자 폴백 ──
   반환: { user } 회원 · { global:true } 전역 · null 미인증 */
async function resolveMcpAuth(request, env, db, pathToken) {
  const bearer = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const cand = pathToken || bearer || "";
  if (cand && db) {
    // ① OAuth 액세스 토큰(Claude 커넥터 "연결" 승인으로 발급) — 힉스필드식 원클릭 연동 경로
    const ou = await getUserByAccessToken(db, cand);
    if (ou) return { user: ou };
    // ② 개인 MCP 토큰(수동 발급 URL) — 기존 방식 계속 지원
    const u = await getUserByMcpToken(db, cand);
    if (u) return { user: u };
  }
  const gtok = env.MCP_AUTH_TOKEN || env.mcp_auth_token || null;
  if (gtok && ctEq(cand, String(gtok))) return { global: true };
  return null;
}
// 상수 시간 문자열 비교 — 토큰 비교 시 타이밍 사이드채널 방지
function ctEq(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID, Anthropic-Beta",
  "Access-Control-Expose-Headers": "Mcp-Session-Id"
};
function jres(obj, status = 200, extraHeaders) {
  return new Response(obj === null ? null : JSON.stringify(obj), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      CORS, extraHeaders || {})
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = new URL(request.url).origin;
  const pathToken = params && params.path && params.path.length ? params.path[0] : null;

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // GET = 상태 페이지(공개). 토큰이 있으면 그 회원의 잔여 크레딧까지 표시.
  if (request.method === "GET") {
    let who = null, credits = null;
    try {
      const db = resolveDB(env);
      if (db) { await ensureSchema(db); const a = await resolveMcpAuth(request, env, db, pathToken);
        if (a && a.user) { who = a.user.email || a.user.name || "회원"; credits = Number(a.user.credits) || 0; } }
    } catch {}
    return jres({
      server: SERVER_INFO.name, version: SERVER_INFO.version, status: "ok",
      transport: "streamable-http (stateless)",
      endpoint: origin + "/api/mcp",
      authenticated: !!who, account: who || undefined, credits: credits == null ? undefined : credits,
      tools: TOOLS.map(t => t.name),
      connect: who
        ? "연결 정상 · 이 계정으로 크레딧이 차감됩니다."
        : "개인 연결 URL(스튜디오 프로필 → MCP 연결)을 등록하세요. 토큰 없이 이 URL만 등록하면 생성이 거부됩니다."
    }, 200);
  }
  if (request.method === "DELETE") return new Response(null, { status: 200, headers: CORS }); // 세션 없음
  if (request.method !== "POST")   return jres({ error: "method not allowed" }, 405);

  // POST = 실제 RPC. 회원 개인 토큰(또는 전역 토큰) 필수.
  const db = resolveDB(env);
  if (db) { try { await ensureSchema(db); } catch {} }
  const auth = await resolveMcpAuth(request, env, db, pathToken);
  if (!auth) {
    // RFC 9728: 보호 리소스 메타데이터 위치를 알려주면 Claude 가 스스로 OAuth 연결 흐름을 시작한다.
    // (커넥터에 서버 주소만 넣어도 로그인·승인 창이 뜨는 이유)
    const origin = new URL(request.url).origin;
    return jres({ jsonrpc: "2.0", id: null, error: { code: -32001,
      message: "unauthorized: 연결이 필요합니다. Claude 커넥터에서 이 서버를 연결하면 로그인·승인 후 자동으로 인증됩니다. (또는 스튜디오 → 프로필 → MCP 연결에서 개인 URL 발급)" } }, 401,
      { "WWW-Authenticate": 'Bearer realm="bygency", resource_metadata="' + origin + '/.well-known/oauth-protected-resource"' });
  }
  const ctx = { db, user: auth.user || null };

  let body;
  try { body = await request.json(); }
  catch { return jres(rpcError(null, -32700, "parse error"), 400); }

  if (Array.isArray(body)) { // 배치
    const out = [];
    for (const m of body) { const r = await handleRpc(m, env, origin, ctx); if (r) out.push(r); }
    return out.length ? jres(out) : new Response(null, { status: 202, headers: CORS });
  }
  const r = await handleRpc(body, env, origin, ctx);
  return r ? jres(r) : new Response(null, { status: 202, headers: CORS }); // 알림 → 202
}
