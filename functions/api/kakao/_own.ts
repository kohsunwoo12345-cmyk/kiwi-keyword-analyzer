// 카카오 발신프로필(senderkey) 소유 확인 — _ 프리픽스 = 라우팅 제외, import 전용.
//
// 왜 필요한가:
//  senderkey 는 "그 회원이 전화 인증(/api/kakao/profile/add)으로 등록한 카카오 공식 채널" 식별자다.
//  발송·템플릿 엔드포인트들이 요청 본문/쿼리의 senderkey 를 그대로 받아 알리고에 넘기고 있어서,
//  남의 senderkey 를 적기만 하면
//    · 남의 공식 채널 이름으로 알림톡 발송(사칭 — 스팸 신고도 그 채널이 받는다)
//    · 남의 채널에 등록된 전화번호를 문자 발신번호로 사용(발신번호 사전등록제 위반)
//    · 남의 템플릿 목록(문구 전체) 열람 · 남의 채널에 템플릿 생성/심사요청
//  이 가능했다.

/** senderkey 가 이 회원의 채널인가 (등록한 적 없는 키면 false) */
export async function ownsKakaoChannel(db: D1Database, userId: string, senderKey: string): Promise<boolean> {
  if (!userId || !senderKey) return false
  const r: any = await db
    .prepare('SELECT 1 AS ok FROM kakao_channels WHERE user_id = ? AND channel_id = ?')
    .bind(userId, senderKey)
    .first()
    .catch(() => null)
  return !!r
}

export function notMyChannel() {
  return new Response(JSON.stringify({ ok: false, error: '내 카카오 채널이 아닙니다.' }), {
    status: 403,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
