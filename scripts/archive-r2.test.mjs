/* 생성물은 평생 남아야 한다 — 만료되는 남의 주소를 저장하지 않는다.
 *
 * 두 가지가 겹쳐서 "만든 게 사라졌다" 가 됐다.
 *   ㉠ 제공사 결과 주소(http)를 그대로 저장했다. 저장한 그날은 잘 보이니 아무도 모르다가
 *      며칠 뒤 원본이 만료되면 보관함과 관리자 화면에서 한꺼번에 죽는다.
 *   ㉡ 새로고침해서 이어받은 생성(resumePendingJobs)은 요금 줄 번호도 토큰도 못 보낸다 —
 *      둘 다 제출 응답에만 실려 왔고 새로고침에 사라진다. 그래서 결과물이 돈 붙은 줄에
 *      안 붙고, 금액 0짜리 줄이 따로 생겼다(관리자 화면 "미리보기 없음 (아카이브 안 됨)").
 *
 * 실제로 돌려서 확인한 것(workerd + 로컬 D1/R2 + 제공사를 흉내 낸 미디어 서버):
 *   고치기 전 — 돈 붙은 줄 result_url 은 빈 값 · 제공사 주소를 든 0원 줄이 하나 더 생김
 *   고친 뒤   — 줄 하나만 남고 result_url 이 /api/media/gen/….mp4 (받아 보니 307,200바이트)
 *   예전 기록 — 보관함을 열면 제공사 주소가 R2 주소로 바뀌어 저장됨
 * 그 확인은 손으로 돌린 것이라 여기 남지 않는다. 다시 새지 않도록 구조를 붙잡아 둔다.
 *
 * ── 그 뒤에 하나가 더 있었다(㉢) ────────────────────────────────────────
 *   ㉠ 을 고쳤는데도 영상이 계속 사라졌다. R2 의 put() 은 "길이를 모르는 스트림" 을
 *      받지 않는데, 영상은 큰 파일이라 제공사·CDN 이 content-length 없이(chunked)
 *      내려 주는 일이 흔하다. 그러면 put() 이 터지고 catch 가 그걸 삼킨 뒤 제공사
 *      주소를 그대로 저장했다 — 결국 ㉠ 을 고치기 전과 같은 결과가 됐다.
 *      흉내 서버로 재현했다: content-length 를 주면 /api/media/… 로, 안 주면
 *      제공사 주소가 그대로 저장된다. 같은 코드, 같은 영상.
 *   그래서 옮기는 코드를 _media.ts 한 군데로 합쳤다(세 군데가 같은 결함이었다).
 *   길이를 알면 흘려보내고, 모르면 상한을 두고 받아서 재고 넣는다.
 *   ⚠ 이 파일은 "구조" 만 본다. 실제로 되는지는 arch.mjs(종단 검사)가 잰다.
 */
import fs from 'node:fs'
const ROOT = new URL('../', import.meta.url).pathname
const rec = fs.readFileSync(ROOT + 'functions/api/usage/record.ts', 'utf8')
const gal = fs.readFileSync(ROOT + 'functions/api/studio/gallery.ts', 'utf8')
const med = fs.readFileSync(ROOT + 'functions/api/_media.ts', 'utf8')
const gen = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')
const chg = fs.readFileSync(ROOT + 'functions/api/studio/_gencharge.ts', 'utf8')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

// ① 제공사 주소를 그대로 저장하지 않는다 — 옮기는 일은 _media.ts 한 군데가 한다
{
  ok('① 옮기는 코드가 한 군데로 모여 있다', /export async function saveMediaToR2/.test(med),
     '세 군데가 각자 갖고 있었고 셋 다 같은 결함이었다')
  ok('①-b 신고 창구가 그 한 군데를 쓴다',
     /import \{ saveMediaToR2 \} from '\.\.\/_media'/.test(rec) && /await saveMediaToR2\(env, url\)/.test(rec))
  ok('①-c 제공사 주소를 받아서 R2 에 넣는다',
     /const r = await fetch\(url\)/.test(med) && /bucket\.put\(key, /.test(med))

  //  ★ ㉢ 이 다시 새지 않게 붙잡는 자리 ★
  ok('①-d 길이를 알면 흘려보낸다(메모리에 안 올린다)',
     /if \(known > 0\)/.test(med) && /bucket\.put\(key, r\.body/.test(med),
     '큰 영상을 통째로 읽으면 워커가 죽는다')
  ok('①-e 길이를 모르면 받아서 재고 넣는다',
     /readCapped\(/.test(med) && /bucket\.put\(key, bytes/.test(med),
     'R2 는 길이를 모르는 스트림을 거절한다 — 스트림을 그대로 주면 그 자리에서 터진다')
  ok('①-f 받는 양에 상한이 있다(무한정 안 받는다)',
     /MAX_BUFFER_BYTES/.test(med) && /total > cap/.test(med))
  ok('①-g 못 옮겼으면 왜인지 돌려준다(조용히 안 삼킨다)',
     /reason\?: string/.test(med) && /moved: false, reason:/.test(med),
     '삼키면 만료되는 주소가 저장된 줄도 모르고 지나간다 — 실제로 그렇게 잃었다')
  //  실패해도 아무것도 안 보이는 것보다는 원본이라도 보이는 편이 낫다
  ok('①-h 옮기기에 실패하면 원본 주소로 물러난다', /return \{ url, moved: false/.test(med))
  //  확장자가 틀리면 브라우저가 영상을 못 연다
  ok('①-i 확장자를 주소에서도 추정한다', /ctExt\(ct\) \|\| urlExt\(url\)/.test(med))
}

// ④ 브라우저가 신고를 못 하고 끝나도 서버가 보관한다
{
  ok('④ 서버가 직접 보관하는 경로가 있다', /export async function archiveGenResult/.test(chg),
     '탭을 닫거나 끊기면 신고가 안 온다 — 그래도 영상은 남아야 한다')
  ok('④-b 완료 응답에서 실제로 부른다', /archiveGenResult\(resolveDB\(context\.env\), key, rurl, kind/.test(gen))
  ok('④-c 응답을 붙잡지 않는다(waitUntil)',
     /context\.waitUntil\(job\(\)\)/.test(gen),
     '받아서 올리는 동안 회원 화면이 멈추면 안 된다')
  ok('④-d 이미 주소가 있으면 안 건드린다',
     /if \(String\(cur\.result_url \|\| ''\)\) return 'already'/.test(chg),
     '브라우저가 먼저 넣었을 수 있다 — 서로 덮어쓰면 안 된다')
  ok('④-e 비어 있을 때만 쓴다(경합 대비)', /COALESCE\(result_url,''\) = ''/.test(chg))
  ok('④-f 같은 작업 주소가 겹치면 최근 것을 본다', /ORDER BY created_at DESC LIMIT 1/.test(chg),
     '옛 줄을 집으면 "이미 있다" 로 끝나고 새 생성은 영영 안 붙는다')
}

// ⑤ 노드도 우리 주소로 갈아탄다
{
  const st = fs.readFileSync(ROOT + 'public/studio-nvc-prv-8b3k2/index.html', 'utf8')
  ok('⑤ 서버가 보관한 주소를 알려 준다', /storedUrl: resultUrl/.test(rec))
  ok('⑤-b 스튜디오가 그 주소로 갈아탄다',
     /function adoptStoredUrl\(/.test(st) && /adoptStoredUrl\(resultUrl, d&&d\.storedUrl\)/.test(st),
     '노드만 제공사 주소를 붙들고 있으면 며칠 뒤 그 노드만 빈다')
  ok('⑤-c 우리 주소일 때만 갈아탄다', /\/\^\\\/api\\\/media\\\/\/\.test\(String\(newUrl\)\)/.test(st))
  ok('⑤-d 되돌리기 기록에 안 넣는다',
     /if\(hit\)\{ try\{ render\(\); \}catch\(_r\)\{\} try\{ autosave\(\); \}catch\(_a\)\{\} \}/.test(st),
     'snapshot() 이면 Ctrl+Z 한 번에 주소가 도로 만료되는 것으로 돌아간다')
}

// ② 새로고침해서 이어받은 생성도 같은 줄에 붙는다
{
  ok('② 작업 주소로 요금 줄을 찾는다',
     /SELECT usage_id FROM gen_charges WHERE task_key = \? AND user_id = \?/.test(rec),
     '브라우저는 새로고침 뒤 줄 번호를 모른다 — 서버가 작업 주소로 찾아야 한다')
  ok('②-b 남의 줄을 건드리지 않는다(user_id 확인)', /task_key = \? AND user_id = \?/.test(rec))
  ok('②-c 줄 번호가 있을 때만 쓴다', /usage_id != ''/.test(rec))
  ok('②-d 찾은 값이 실제로 쓰인다',
     /String\(b\.chargeRef \|\| staked\?\.usageId \|\| byTask \|\| ''\)/.test(rec),
     '찾아 놓고 안 쓰면 그대로 별도 줄이 생긴다')
  //  순서가 뒤바뀌면 원래 있던 값이 무시된다
  ok('②-e 클라이언트가 준 값이 우선이다',
     rec.indexOf('b.chargeRef ||') < rec.indexOf('byTask ||'))
}

// ③ 이미 쌓인 기록도 뒤늦게 옮긴다
{
  ok('③ 보관함을 열 때 옮기는 경로가 있다', /async function healToR2\(/.test(gal))
  ok('③-b 실제로 호출된다', /await healToR2\(env, db, rows\.results \|\| \[\], me\.id\)/.test(gal))
  ok('③-c 제공사 주소인 것만 고른다', /\/\^https\?:\\\/\\\/\/i\.test\(String\(r\.result_url/.test(gal))
  //  200건을 한 요청에서 옮기면 그 요청이 죽는다
  ok('③-d 한 번에 조금씩만 옮긴다', /HEAL_PER_LOAD/.test(gal) && /slice\(0, HEAL_PER_LOAD\)/.test(gal))
  ok('③-e 옮긴 주소를 DB 에 되쓴다', /UPDATE ai_usage SET result_url = \? WHERE id = \? AND user_id = \?/.test(gal))
  ok('③-f 이번 응답부터 새 주소로 준다', /r\.result_url = saved\.url/.test(gal),
     '되쓰기만 하고 응답은 옛 주소면 그 화면에서는 여전히 깨져 보인다')
  //  여기도 같은 결함이 있었다 — 합친 코드를 쓰는지 확인한다
  ok('③-h 보관함도 합친 코드를 쓴다',
     /saveMediaToR2\(env, String\(r\.result_url\)\)/.test(gal) && /if \(!saved\.moved\) continue/.test(gal))
  //  만료된 것은 살릴 수 없다 — 그렇다고 지우면 안 된다(기록은 남아야 한다)
  ok('③-g 못 옮겨도 지우지 않는다', !/DELETE FROM ai_usage/.test(gal))
}

console.log(fails.length === 0
  ? '\n생성물 영구 보관 — 실패 0 (R2 로 옮김 · 이어받은 생성도 같은 줄 · 예전 기록 뒤늦게 복구)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
