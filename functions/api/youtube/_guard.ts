// 유튜브 데이터 API 보호 (_ 프리픽스 = 라우팅 제외, import 전용)
//
// 왜 필요한가:
//  YouTube Data API 는 하루 할당량(기본 10,000 유닛)이 정해져 있고,
//  search.list 한 번이 100 유닛이다. 즉 아무나 부를 수 있는 검색 엔드포인트가
//  하나라도 열려 있으면 100번의 요청으로 그날 할당량이 전부 사라지고,
//  돈을 낸 회원들의 유튜브 기능이 하루 종일 멈춘다.
//
//  실제로 쓰이는 /api/youtube/analyze 는 로그인 + 크레딧 차감을 이미 거친다.
//  이식 과정에서 딸려 온 나머지 엔드포인트들만 무방비였다 — 같은 기준으로 맞춘다.
import { resolveDB, getSessionUser, clientIp, rateLimitOk } from '../_utils'

const IP_LIMIT = 60      // 10분에 60회 (사람이 쓰는 속도로는 충분하다)
const WINDOW_MIN = 10

/** 통과하면 null, 막아야 하면 그대로 돌려줄 Response */
export async function ytGuard(request: Request, env: any): Promise<Response | null> {
  const deny = (msg: string, status: number) =>
    new Response(JSON.stringify({ ok: false, success: false, error: msg }), {
      status, headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  const db = resolveDB(env)
  if (!db) return null   // DB 가 없으면 판단할 수 없다 — 기능을 막지는 않는다
  const me: any = await getSessionUser(request, db).catch(() => null)
  if (!me) return deny('로그인이 필요합니다.', 401)
  if (!(await rateLimitOk(db, `yt:${me.id}:${clientIp(request)}`, IP_LIMIT, WINDOW_MIN)))
    return deny('유튜브 조회 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.', 429)
  return null
}
