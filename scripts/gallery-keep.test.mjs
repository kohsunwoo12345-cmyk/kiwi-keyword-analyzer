/* 보관함은 지우지 않는다 — "영상 만료됨" 이 다시 생기지 않게 못을 박는다.
 *
 * 만료의 원인은 두 개였고 둘 다 조용했다:
 *   ㉠ 제공사 URL 을 우리 R2 로 옮기다 한 번 실패하면 그 임시 URL 을 그대로 저장했다.
 *      그 순간엔 잘 보이니 아무도 모르다가 며칠 뒤 "원본 만료" 로 바뀐다.
 *   ㉡ 120개를 넘으면 오래된 것부터 지웠다. 보관함인데 보관이 안 됐다.
 *
 * 둘 다 "지금 화면"에서는 멀쩡해 보이는 종류의 결함이라, 눈으로는 다시 놓치기 쉽다.
 * 그래서 코드에 못을 박아 둔다.
 */
import fs from 'node:fs'
const ROOT = new URL('../', import.meta.url).pathname
const src = fs.readFileSync(ROOT + 'public/studio-nvc-prv-8b3k2/index.html', 'utf8')
const flat = src.replace(/\s+/g, ' ')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

// ① 아무것도 지우지 않는다
{
  const m = /function trimGallery\(\)\{([\s\S]{0,400}?)\n\}/.exec(src) || /function trimGallery\(\)\{([^\n]*)\}/.exec(src)
  const body = m ? m[1] : ''
  ok('① trimGallery 가 보관함을 지우지 않는다', !!body && !/IDB\.del/.test(body), body.slice(0, 120))
  //  다른 곳에서 개수로 잘라 내지 않는지 — 예전 방식(slice(120)) 이 되살아나면 잡는다
  ok('①-b 개수 상한으로 잘라 내는 코드가 없다', !/mine\.slice\(\s*\d+\s*\)/.test(src))
}

// ② 옮기기 실패 시 다시 해 본다
{
  ok('② R2 옮기기가 재시도한다', /rehostToR2\(url,\s*tries\s*-\s*1\)/.test(flat.replace(/ /g, '')) || /rehostToR2\(url, tries-1\)/.test(flat),
     '한 번 실패하고 포기하면 임시 URL 이 그대로 저장된다')
  ok('②-b 기본 시도 횟수가 2회 이상이다', /tries\s*=\s*tries==null\s*\?\s*([2-9])\s*:/.test(src.replace(/\s+/g, ' ')))
}

// ③ 뒤늦게라도 고친다
{
  ok('③ 남아 있는 제공사 주소를 다시 옮기는 경로가 있다', /function healGallery\(/.test(src))
  ok('③-b 보관함을 열 때 그 경로가 돈다', /healGallery\(\)\.then\(/.test(flat),
     '열 때 안 돌면 원본이 만료된 뒤에야 알게 된다')
  //  이미 우리 주소인 것은 건드리지 않아야 한다(쓸데없이 다시 올리면 R2 가 불어난다)
  ok('③-c 이미 우리 주소인 항목은 건너뛴다', /!\/\\\/api\\\/media\\\/\/\.test\(g\.url\)/.test(src) || /api\\\/media\\\/\/\.test\(g\.url\)/.test(src))
}

console.log(fails.length === 0
  ? '\n보관함 보존 — 실패 0 (지우지 않음 · 재시도 · 뒤늦은 복구)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
