// /api/mcp — Claude 커스텀 커넥터용 MCP 서버 (Streamable HTTP, stateless)
//
// 연결 방법:
//   · claude.ai / Claude Desktop:  설정 → 커넥터 → 커스텀 커넥터 추가
//       URL: https://nextvisionccompany.net/api/mcp            (MCP_AUTH_TOKEN 미설정 시)
//       URL: https://nextvisionccompany.net/api/mcp/<토큰>      (MCP_AUTH_TOKEN 설정 시)
//   · Claude Code:
//       claude mcp add --transport http nextvision https://nextvisionccompany.net/api/mcp \
//         --header "Authorization: Bearer <토큰>"
//
// 제공 도구: generate_video / check_video_status / generate_image / list_models
// 키는 Cloudflare 환경변수에서만 읽으며 응답에 절대 포함되지 않습니다.

import { onRequest as generateApi } from "../generate.js";

const SERVER_INFO = { name: "nextvision-studio", version: "1.0.0" };
const PROTO_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const TOOLS = [
  {
    name: "generate_video",
    description:
      "AI 영상 생성을 시작합니다 (Veo / Runway / Seedance). 실제 생성이 시작되며 과금이 발생할 수 있습니다. " +
      "즉시 완성되지 않고 task 토큰을 반환하므로, 이후 check_video_status 도구로 완료될 때까지 (보통 1~5분, 15~30초 간격) 상태를 확인하세요. " +
      "runway는 first_frame_url 또는 reference_image_url이 반드시 필요합니다(이미지에서 영상 생성). " +
      "이어지는 영상(체이닝)을 만들려면 앞 영상의 마지막 장면 이미지를 first_frame_url로 넣으세요.",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string", enum: ["veo", "runway", "seedance"],
                 description: "veo=Google Veo 3(텍스트→영상, 5~8초), runway=Runway Gen-4 Turbo(이미지→영상 필수, 5/10초), seedance=Seedance 1.0 Pro(텍스트/이미지→영상, 5/10초)" },
        prompt: { type: "string", description: "영상 내용 프롬프트 (한국어/영어)" },
        negative_prompt: { type: "string", description: "피해야 할 요소 (선택)" },
        first_frame_url: { type: "string", description: "첫 프레임 이미지 URL 또는 data URI (선택, runway는 필수)" },
        reference_image_url: { type: "string", description: "레퍼런스 이미지 URL 또는 data URI (선택)" },
        seconds: { type: "number", description: "영상 길이(초). veo 5~8, runway/seedance 5 또는 10. 기본 8" },
        ratio: { type: "string", enum: ["16:9", "9:16", "1:1"], description: "화면 비율, 기본 16:9" },
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
      "이미지를 생성합니다(model로 엔진 선택). 즉시 이미지 URL을 반환합니다(폴링 불필요). 과금이 발생할 수 있습니다. " +
      "생성된 이미지를 generate_video의 first_frame_url로 넣어 이미지→영상 워크플로를 만들 수 있습니다.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "이미지 내용 프롬프트" },
        model: { type: "string", enum: ["nanobanana", "gpt", "grok"], description: "nanobanana(=Gemini 2.5 Flash Image·기본), gpt(=OpenAI gpt-image-1), grok(=Grok Imagine). 모두 편집 지원(reference_image_url)" },
        reference_image_url: { type: "string", description: "나노바나나 편집용 입력 이미지 URL 또는 data URL (선택)" },
        negative_prompt: { type: "string", description: "피해야 할 요소 (선택)" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "list_models",
    description: "사용 가능한 AI 생성 모델과 각 모델의 특징/제약을 반환합니다.",
    inputSchema: { type: "object", properties: {} }
  }
];

const MODEL_INFO = {
  video: [
    { id: "veo", name: "Google Veo 3", input: "텍스트(+첫 프레임 이미지 선택)", duration: "5~8초", ratio: "16:9, 9:16", note: "가장 사실적인 화질. 결과가 base64로 반환되어 MCP에서는 크기 정보만 제공될 수 있음" },
    { id: "runway", name: "Runway Gen-4 Turbo", input: "이미지 필수(첫 프레임 또는 레퍼런스)", duration: "5초 또는 10초", ratio: "16:9, 9:16, 1:1", note: "이미지→영상 특화. CDN URL로 결과 제공" },
    { id: "seedance", name: "Seedance 1.0 Pro", input: "텍스트(+첫/마지막 프레임 이미지 선택)", duration: "5초 또는 10초", ratio: "16:9, 9:16, 1:1", note: "빠른 생성. CDN URL로 결과 제공" }
  ],
  image: [
    { id: "nanobanana", name: "Nano Banana (Gemini 2.5 Flash Image)", input: "텍스트(+편집용 입력 이미지 선택)", note: "generate_image 도구(model:nanobanana). 텍스트→이미지 및 이미지 편집. 즉시 URL 반환" },
    { id: "gpt", name: "GPT Image (OpenAI gpt-image-1)", input: "텍스트(+편집용 입력 이미지 선택)", note: "generate_image 도구(model:gpt). 미국 릴레이 경유. 생성 15~40초" },
    { id: "grok", name: "Grok Imagine", input: "텍스트", note: "generate_image 도구(model:grok). 즉시 URL 반환" }
  ],
  tip: "이어지는 영상: 영상1 완료 → 마지막 장면 이미지를 영상2의 first_frame_url로 전달. 노드 스튜디오(https://nextvisionccompany.net/studio/)에서는 노드 연결로 자동화됩니다."
};

/* ── 내부 헬퍼: 기존 /api/generate 핸들러 재사용 ── */
async function callGeneratePOST(env, origin, body) {
  const req = new Request(origin + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const res = await generateApi({ request: req, env });
  return res.json();
}
async function callGenerateGET(env, origin, statusUrl) {
  const req = new Request(origin + statusUrl);
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
async function runTool(name, args, env, origin) {
  args = args || {};

  if (name === "list_models") return MODEL_INFO;

  if (name === "generate_image") {
    if (!args.prompt) throw new Error("prompt는 필수입니다");
    const imgMap = { nanobanana: "nanobanana", nano: "nanobanana", gpt: "openai", gptimage: "openai", openai: "openai", grok: "xai", xai: "xai" };
    const provider = imgMap[String(args.model || "nanobanana").toLowerCase()] || "nanobanana";
    const ref = args.reference_image_url || null;
    const j = await callGeneratePOST(env, origin, {
      provider, prompt: args.prompt, negative: args.negative_prompt || "",
      refImage: ref, refImages: ref ? [ref] : []
    });
    if (j.error) throw new Error(j.error);
    let url = j.url;
    // 나노바나나는 base64 data URL 을 반환 → MCP 응답 폭증 방지 위해 R2 에 올려 공개 URL 로 교체
    if (url && url.startsWith("data:")) { const hosted = await hostDataUrl(env, origin, url); if (hosted) url = hosted; }
    return { status: "succeeded", image_url: url, model: provider === "nanobanana" ? "nanobanana" : "grok" };
  }

  if (name === "generate_video") {
    const providerMap = { veo: "google", runway: "runway", seedance: "seedance" };
    const provider = providerMap[args.model];
    if (!provider) throw new Error("model은 veo/runway/seedance 중 하나여야 합니다");
    if (!args.prompt) throw new Error("prompt는 필수입니다");
    const body = {
      provider,
      prompt: args.prompt,
      negative: args.negative_prompt || "",
      firstFrame: args.first_frame_url || null,
      refImage: args.reference_image_url || null,
      seconds: args.seconds || 8,
      ratio: args.ratio || "16:9",
      dryRun: !!args.dry_run
    };
    const j = await callGeneratePOST(env, origin, body);
    if (j.error) throw new Error(j.error);
    if (j.dryRun) return { dry_run: true, provider: j.provider, payload: j.payload, note: j.note };
    if (j.url) return { status: "succeeded", video_url: j.url, kind: j.kind || "video" };
    if (j.statusUrl) return {
      status: "generating",
      task: j.statusUrl,
      next: "check_video_status 도구에 이 task 값을 그대로 넣어 15~30초 간격으로 확인하세요 (보통 1~5분 소요)"
    };
    throw new Error("예상치 못한 응답: " + JSON.stringify(j).slice(0, 200));
  }

  if (name === "check_video_status") {
    const task = String(args.task || "");
    if (!task.startsWith("/api/generate?")) throw new Error("task 형식이 올바르지 않습니다. generate_video가 반환한 값을 그대로 사용하세요.");
    const j = await callGenerateGET(env, origin, task);
    if (j.status === "failed" || j.error) return { status: "failed", error: j.error || "생성 실패" };
    if (j.url) {
      if (String(j.url).startsWith("data:")) {
        // Veo 등은 base64 대용량으로 반환됨 — 대화 컨텍스트에 넣기엔 너무 큼
        const mb = Math.round(j.url.length * 0.75 / 1048576 * 10) / 10;
        return { status: "succeeded", kind: j.kind || "video",
                 note: "영상 생성 완료 (약 " + mb + "MB). base64 대용량이라 URL로 제공할 수 없습니다. " +
                       "다운로드하려면 노드 스튜디오(https://nextvisionccompany.net/studio/)에서 같은 프롬프트로 실행하거나, runway/seedance 모델을 사용하세요(CDN URL 제공)." };
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

async function handleRpc(msg, env, origin) {
  if (!msg || msg.jsonrpc !== "2.0" || !msg.method) return rpcError(msg && msg.id != null ? msg.id : null, -32600, "invalid request");
  const { method, id, params } = msg;
  const isNotification = (id === undefined || id === null) && method.startsWith("notifications/");
  if (isNotification) return null; // 알림은 응답 없음

  try {
    if (method === "initialize") {
      const want = params && params.protocolVersion;
      const proto = PROTO_VERSIONS.includes(want) ? want : PROTO_VERSIONS[1];
      return rpcResult(id, {
        protocolVersion: proto,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          "넥스트비전컴퍼니 AI 스튜디오 MCP 서버입니다. generate_video로 영상 생성을 시작하고 " +
          "check_video_status로 완료를 확인하세요(1~5분 소요). generate_image는 즉시 이미지 URL을 반환합니다. " +
          "실제 생성은 과금이 발생하므로 사용자의 명시적 요청이 있을 때만 실행하세요. 테스트는 dry_run:true를 사용하세요."
      });
    }
    if (method === "ping") return rpcResult(id, {});
    if (method === "tools/list") return rpcResult(id, { tools: TOOLS });
    if (method === "tools/call") {
      const name = params && params.name;
      try {
        const out = await runTool(name, params && params.arguments, env, origin);
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

/* ── 인증: MCP_AUTH_TOKEN 설정 시 Bearer 헤더 또는 URL 경로 세그먼트로 검증 ── */
function authorized(request, env, pathToken) {
  const token = env.MCP_AUTH_TOKEN || env.mcp_auth_token || null;
  if (!token) return true; // 토큰 미설정 → 공개 (설정 권장)
  const h = request.headers.get("Authorization") || "";
  if (h === "Bearer " + token) return true;
  if (pathToken && pathToken === token) return true;
  return false;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID, Anthropic-Beta",
  "Access-Control-Expose-Headers": "Mcp-Session-Id"
};
function jres(obj, status = 200) {
  return new Response(obj === null ? null : JSON.stringify(obj), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, CORS)
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = new URL(request.url).origin;
  const pathToken = params && params.path && params.path.length ? params.path[0] : null;

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!authorized(request, env, pathToken))
    return jres({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "unauthorized" } }, 401);
  if (request.method === "GET")    return jres({   // 브라우저로 열면 상태 표시(Claude 는 POST 로 호출 — 영향 없음)
    server: SERVER_INFO.name, version: SERVER_INFO.version, status: "ok",
    transport: "streamable-http (stateless)",
    endpoint: origin + "/api/mcp",
    tools: TOOLS.map(t => t.name),
    connect: "Claude → 설정 → 커넥터 → 커스텀 커넥터 추가 → 이 URL 등록. (이 페이지가 보이면 서버는 정상입니다)"
  }, 200);
  if (request.method === "DELETE") return new Response(null, { status: 200, headers: CORS }); // 세션 없음
  if (request.method !== "POST")   return jres({ error: "method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return jres(rpcError(null, -32700, "parse error"), 400); }

  if (Array.isArray(body)) { // 배치
    const out = [];
    for (const m of body) { const r = await handleRpc(m, env, origin); if (r) out.push(r); }
    return out.length ? jres(out) : new Response(null, { status: 202, headers: CORS });
  }
  const r = await handleRpc(body, env, origin);
  return r ? jres(r) : new Response(null, { status: 202, headers: CORS }); // 알림 → 202
}
