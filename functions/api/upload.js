// /api/upload — 업로드된 이미지/영상을 R2 에 저장하고 공개 URL 을 돌려준다.
// 이 URL 은 Luma / Runway Aleph 등 "공개 URL 만 받는" 제공사에 그대로 넘길 수 있고,
// 큰 미디어를 요청 본문에 담지 않게 해 Cloudflare 함수 502(용량초과)도 막는다.
// POST  body=raw binary, Content-Type=image/* 또는 video/*   → { url, key, size, contentType }
// 보안: 로그인 세션 필요(익명 업로드 차단), 이미지/영상 MIME 만 허용.

import { resolveDB, getSessionUser } from "./_utils";

const ALLOWED_CT = /^(image\/(png|jpe?g|gif|webp|avif|svg\+xml)|video\/(mp4|webm|quicktime|x-matroska)|audio\/(mpeg|mp3|wav|x-wav|wave|webm|ogg|mp4|aac|x-m4a|m4a))(;|$)/i;

function r2Bucket(env) {
  // ① 흔한 바인딩 이름 우선
  for (const name of ["MEDIA", "BUCKET", "R2", "R2_BUCKET", "STORAGE", "ASSETS",
                      "media", "bucket", "r2", "storage", "MEDIA_BUCKET", "UPLOADS", "uploads"]) {
    const v = env[name];
    if (v && typeof v.put === "function" && typeof v.get === "function") return v;
  }
  // ② 자동 감지 — R2 고유 메서드(head/createMultipartUpload)로 KV 와 구분
  for (const k in env) {
    const v = env[k];
    if (v && typeof v.put === "function" && typeof v.get === "function" &&
        (typeof v.createMultipartUpload === "function" || typeof v.head === "function")) return v;
  }
  return null;
}

function j(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
               "Access-Control-Allow-Origin": "*" }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS")
    return new Response(null, { headers: {
      "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type" } });
  if (request.method !== "POST") return j({ error: "method" }, 405);

  // 로그인 세션 필수 — 익명의 스토리지 남용/임의 파일 호스팅 차단
  try {
    const db = resolveDB(env);
    const user = db ? await getSessionUser(request, db) : null;
    if (!user) return j({ error: "로그인이 필요합니다." }, 401);
  } catch {
    return j({ error: "인증 확인 실패" }, 401);
  }

  const bucket = r2Bucket(env);
  if (!bucket) return j({ error: "R2 버킷 바인딩을 찾을 수 없습니다. Cloudflare Pages → Settings → Functions → R2 bindings 를 확인하세요." }, 500);

  try {
    const ct = request.headers.get("Content-Type") || "application/octet-stream";
    if (!ALLOWED_CT.test(ct)) return j({ error: "이미지/영상/오디오 파일만 업로드할 수 있습니다." }, 415);
    const buf = await request.arrayBuffer();
    if (!buf || buf.byteLength === 0) return j({ error: "빈 파일" }, 400);
    if (buf.byteLength > 200 * 1024 * 1024) return j({ error: "200MB 초과 파일은 업로드할 수 없습니다" }, 413);
    const ext = (ct.split("/")[1] || "bin").split(";")[0].split("+")[0];
    const key = "u/" + crypto.randomUUID() + "." + ext;
    await bucket.put(key, buf, { httpMetadata: { contentType: ct } });
    const origin = new URL(request.url).origin;
    return j({ url: origin + "/api/media/" + key, key, size: buf.byteLength, contentType: ct });
  } catch (e) {
    return j({ error: "업로드 실패: " + String((e && e.message) || e).slice(0, 220) }, 502);
  }
}
