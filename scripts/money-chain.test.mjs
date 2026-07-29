/* 생성 1건 = 차감 1건 = 거래 1줄 = 관리자 1줄, 금액까지 전부 같아야 한다.
   실제 핸들러(usage/record)와 실제 정산 함수(settleGenCharge)를 가짜 D1 위에서 순서대로 돌려
   "돈이 나간 만큼 정확히, 한 번만 들어오는지" 를 본다.
   보관 신고(usage/record)는 그 뒤에 와도 잔액을 건드리면 안 되고,
   관리자 화면이 읽는 줄은 한 줄이어야 한다(두 줄이면 합계가 갈린다). */
import { buildSync } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
const require_ = createRequire(import.meta.url);
/* 저장소 위치는 체크아웃마다 다르다 — 배포 서버는 /home/user 가 아니다.
   빌드가 npm test 를 먼저 돌리므로, 경로를 박아 두면 그 서버에서 테스트가 파일을 못 찾아
   빌드 자체가 죽는다. 이 파일 위치에서 저장소 뿌리를 구한다. */
const ROOT = new URL("../", import.meta.url).pathname;

function load(file) {
  const out = buildSync({ entryPoints: [ROOT + file], bundle: true, write: false, format: "cjs",
                          platform: "neutral", target: "es2022", external: ["node:*"] });
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console, Response, Request,
                    Headers, URL, TextEncoder, TextDecoder, crypto, fetch, btoa, atob, setTimeout, clearTimeout, structuredClone };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file });
  return sandbox.module.exports;
}

const USER = { id: "u1", email: "u@x.co", name: "회원", role: "user", credits: 100000,
               user_id: "u1", expires_at: "2099-01-01T00:00:00Z", credit_markup: 0 };

function makeDB() {
  const charges = new Map(), tx = [], usage = new Map();
  let credits = 100000;
  const db = {
    prepare(sql) {
      const s = String(sql); let a = [];
      const stmt = {
        bind: (...x) => { a = x; return stmt },
        first: async () => {
          if (/FROM gen_charges/i.test(s)) {
            if (/WHERE task_key/i.test(s)) return [...charges.values()].find((r) => r.task_key === a[0] && r.status === "charged") || null;
            const r = charges.get(a[0]);
            return r && String(r.user_id) === String(a[1]) ? r : null;
          }
          if (/SELECT credits/i.test(s)) return { credits };
          if (/FROM\s+users|session/i.test(s)) return USER;
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => {
          if (/INSERT INTO gen_charges/i.test(s)) {
            const [id, user_id, model, units, res] = a;
            charges.set(id, { id, user_id, model, units, res, consumed_at: null, status: "", task_key: "", credits: 0 });
            return { meta: { changes: 1 } };
          }
          if (/UPDATE gen_charges SET credits/i.test(s)) {
            const r = charges.get(a[2]); if (r) { r.credits = a[0]; r.task_key = a[1]; r.status = "charged" }
            return { meta: { changes: r ? 1 : 0 } };
          }
          if (/UPDATE gen_charges SET status = 'refunded'/i.test(s)) {
            const r = charges.get(a[0]);
            if (!r || r.status !== "charged") return { meta: { changes: 0 } };
            r.status = "refunded"; return { meta: { changes: 1 } };
          }
          if (/UPDATE gen_charges SET consumed_at/i.test(s)) {
            const r = charges.get(a[1]);
            if (!r || r.consumed_at) return { meta: { changes: 0 } };
            r.consumed_at = a[0]; return { meta: { changes: 1 } };
          }
          if (/UPDATE users SET credits/i.test(s)) {
            const sign = /-\s*\?/.test(s) ? -1 : 1;
            credits = Math.round((credits + sign * Number(a[0])) * 100) / 100;
            return { meta: { changes: 1 } };
          }
          if (/INSERT INTO transactions/i.test(s)) { tx.push({ amount: a[2], memo: a[4] }); return { meta: { changes: 1 } } }
          if (/INSERT INTO ai_usage/i.test(s)) {
            usage.set(a[0], { id: a[0], model: a[5], units: a[7], usd: a[8], costKrw: a[9],
                              credits: a[10], revenue: a[11], prompt: a[15] ?? "", result: a[17] ?? "" });
            return { meta: { changes: 1 } };
          }
          if (/UPDATE ai_usage SET prompt/i.test(s)) {
            const r = usage.get(a[4]);
            if (!r || String(r.id) !== String(a[4])) return { meta: { changes: 0 } };
            r.prompt = a[0]; r.result = a[2]; return { meta: { changes: 1 } };
          }
          return { meta: { changes: 1 } };
        },
      };
      return stmt;
    },
    batch: async () => [], exec: async () => ({}), dump: async () => new ArrayBuffer(0),
    __bal: () => credits, __tx: tx, __usage: usage, __charges: charges,
  };
  return db;
}

const gc = load("functions/api/studio/_gencharge.ts");
const rec = load("functions/api/usage/record.ts");
const pricing = load("functions/api/studio/_pricing.ts");
const prepare = load("functions/api/payments/prepare.ts");
const DEPS = { computeCharge: pricing.computeCharge, getUsdKrw: pricing.getUsdKrw,
               resolveMarkup: pricing.resolveMarkup, resolveRefSurcharge: pricing.resolveRefSurcharge,
               resolveCnSurcharge: pricing.resolveCnSurcharge, creditPriceFor: prepare.creditPriceFor,
               ensureAiUsage: pricing.ensureAiUsage };

const report = async (db, body) => {
  const request = new Request("https://x/api/usage/record", {
    method: "POST", headers: { "content-type": "application/json", cookie: "bg_session=fake" },
    body: JSON.stringify(body),
  });
  const res = await rec.onRequestPost({ request, env: { DB: db, marketing: db }, params: {}, waitUntil: () => {}, next: async () => new Response("") });
  return await res.json();
};

const bad = [];
const MODELS = [["Google Veo 3.1", 10, "1080p"], ["Kling 2.1 Master (이미지→영상)", 5, "1080p"],
                ["Seedance 2.0", 8, "1080p"], ["Nano Banana", 1, undefined], ["Flux 2 Max", 1, undefined],
                ["나레이션 (AI 음성 해설)", 30, "1080p"], ["립싱크 (인물 말하기)", 12, "1080p"],
                ["음악 생성 (BGM·뮤직)", 60, "1080p"], ["Hyper3D Gen-2 (3D 생성)", 1, undefined]];

for (const [model, units, res] of MODELS) {
  const db = makeDB();
  const before = db.__bal();
  // ① 생성 성공 → 서버가 토큰을 발급하고 그 자리에서 차감
  const token = await gc.issueGenCharge(db, "u1", { model, units, res });
  const out = await gc.settleGenCharge(db, USER, token, null, DEPS);
  const afterCharge = db.__bal();
  // ② 그 뒤 스튜디오가 보관 신고 — 잔액을 건드리면 안 된다
  const r = await report(db, { chargeToken: token, chargeRef: out.usageId, model, units, res,
                               kind: res ? "video" : "image", prompt: "테스트", resultUrl: "https://x/a.mp4" });

  const tag = model + " " + (res ? units + "초" : "1장");
  if (!(out.credits > 0)) bad.push(tag + " — 차감이 0 (돈은 나갔는데 안 받았다)");
  if (Math.abs(before - afterCharge - out.credits) > 1e-9) bad.push(tag + " — 잔액 변화 ≠ 차감액");
  if (db.__bal() !== afterCharge) bad.push(tag + " — 보관 신고가 잔액을 " + afterCharge + "→" + db.__bal() + " 로 바꿨다");
  if (r.charged !== 0) bad.push(tag + " — 보관 신고가 charged " + r.charged + " 를 반환");
  if (db.__tx.length !== 1) bad.push(tag + " — 거래 기록이 " + db.__tx.length + "줄 (1줄이어야 한다)");
  else if (Math.abs(-db.__tx[0].amount - out.credits) > 1e-9) bad.push(tag + " — 거래 금액 ≠ 차감액");
  const rows = [...db.__usage.values()];
  if (rows.length !== 1) bad.push(tag + " — 관리자 줄이 " + rows.length + "개 (1개여야 합계가 안 갈린다)");
  else {
    const u = rows[0];
    if (Math.abs(u.credits - out.credits) > 1e-9) bad.push(tag + " — 관리자 줄 크레딧 ≠ 차감액");
    if (!(u.costKrw > 0)) bad.push(tag + " — 관리자 줄 원가가 0 (비용 합계에 안 쌓인다)");
    if (u.model !== model) bad.push(tag + " — 관리자 줄 모델이 '" + u.model + "'");
    if (!u.prompt) bad.push(tag + " — 프롬프트가 그 줄에 안 붙었다(아카이브가 따로 논다)");
  }
}

/* ── 실측 단가(관리자 입력)가 실제 차감에 반영되는가 ──
   Kling·BytePlus 처럼 공식 문서에 단일 단가가 없는 제공사는, 청구서를 보고 넣은 값이 정답이다.
   그 값이 추정 공식을 이기고 그대로 청구되는지 본다(안 그러면 입력해도 소용이 없다). */
{
  const model = "Kling 2.1 Master (이미지→영상)", units = 10;
  const db = makeDB();
  const before = db.__bal();
  const token = await gc.issueGenCharge(db, "u1", { model, units, res: "1080p" });
  //  실측 단가를 넣지 않았을 때
  const plain = await gc.settleGenCharge(db, USER, token, null, DEPS);
  //  같은 생성에 초당 $1 을 실측으로 넣으면 — 10초니까 $10 어치가 나와야 한다
  const db2 = makeDB();
  const t2 = await gc.issueGenCharge(db2, "u1", { model, units, res: "1080p" });
  const withOv = await gc.settleGenCharge(db2, USER, t2, null,
    { ...DEPS, resolveCostOverride: async () => 1 });
  const ratio = withOv.credits / Math.max(plain.credits, 1e-9);
  //  단가 $0.095/초 → $1/초 이면 약 10.5배. 정확한 배수보다 "실측이 이겼는가" 가 요점이다.
  if (!(withOv.credits > plain.credits * 5))
    bad.push("실측 단가 — 넣어도 청구가 안 바뀐다 (추정 " + plain.credits + " · 실측 " + withOv.credits + ")");
  //  실측이 없을 때는 예전처럼 추정값이어야 한다(입력 안 한 모델이 갑자기 달라지면 안 된다)
  if (!(plain.credits > 0)) bad.push("실측 단가 — 미입력 시 추정 청구가 0");
  if (db.__bal() !== Math.round((before - plain.credits) * 100) / 100)
    bad.push("실측 단가 — 미입력 경로에서 잔액이 어긋난다");
  console.log("실측 단가 반영 — 추정 " + plain.credits + "크레딧 → 실측($1/초) " + withOv.credits +
              "크레딧 (" + ratio.toFixed(1) + "배)");
}

console.log("생성 1건 → 차감·거래·관리자 줄 대조 — 모델 " + MODELS.length + "종");
if (!bad.length)
  console.log("\n어긋남 0건 ✅ (차감 1회 · 거래 1줄 · 관리자 1줄 · 금액 전부 일치 · 신고는 잔액 불변)");
else { console.log("\n어긋남 " + bad.length + "건"); bad.forEach((b) => console.log("  ❌ " + b)); }
process.exit(bad.length ? 1 : 0);
