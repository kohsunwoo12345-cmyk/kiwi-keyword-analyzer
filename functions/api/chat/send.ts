import { Env, json, ensureSchema, getSessionUser, resolveDB, addNotification } from '../_utils'

// 질문 내용에 맞춘 일반 자동응답(FAQ). 한글이 있으면 한국어, 아니면 영어로 답한다.
function cannedReply(text: string): string {
  const s = text.toLowerCase()
  const ko = /[가-힣]/.test(text)
  const has = (re: RegExp) => re.test(text) || re.test(s)

  // 인사
  if (has(/^\s*(안녕|하이|반가|ㅎㅇ|hi|hello|hey)/)) {
    return ko
      ? '안녕하세요! 😊 BYGENCY 고객센터입니다. 요금·기능·도입 상담 등 무엇이든 편하게 물어봐 주세요.'
      : 'Hello! 😊 This is BYGENCY Support. Feel free to ask about pricing, features, or getting started.'
  }
  // 결제 · 환불 · 세금계산서
  if (has(/환불|영수증|세금계산서|결제.?(안|오류|실패|취소)|입금|refund|invoice|receipt|billing/)) {
    return ko
      ? '결제·환불·세금계산서 관련은 담당자 확인이 필요해요. cs@bygency.co 로 주문 정보와 함께 문의 주시면 신속히 처리해 드리겠습니다.'
      : 'For payment, refund, or tax-invoice matters, please email cs@bygency.co with your order details and we’ll help you right away.'
  }
  // 요금 · 가격 · 플랜
  if (has(/요금|가격|비용|얼마|플랜|가입비|price|cost|pricing|plan|fee/)) {
    return ko
      ? 'BYGENCY 요금제 안내드릴게요 😊\n· 마케터: Plus 29,000원 / Pro 89,000원 / Max 249,000원 (월)\n· AI 영상 제작: Plus 49,000원 / Pro 149,000원 / Max 390,000원 (월)\n카드 없이 무료로 가입해 체험하실 수 있어요. 자세한 내용은 bygency.co/pricing 을 참고해 주세요!'
      : 'Here are our plans 😊\n· Marketer: Plus ₩29,000 / Pro ₩89,000 / Max ₩249,000 per month\n· AI Video: Plus ₩49,000 / Pro ₩149,000 / Max ₩390,000 per month\nYou can sign up free without a card. See bygency.co/pricing for details!'
  }
  // AI 영상 · 스튜디오
  if (has(/영상|스튜디오|숏폼|node|studio|veo|seedance|runway|video/)) {
    return ko
      ? 'AI 영상은 NODE STUDIO 노드 에디터에서 프롬프트로 광고·숏폼 영상을 만드는 기능이에요. AI 영상 제작 플랜(Plus 49,000원~)으로 이용하실 수 있습니다.'
      : 'AI videos are created in NODE STUDIO — a node editor that turns prompts into ads and short-form clips. Available on the AI Video plans (from ₩49,000/mo).'
  }
  // 문자 · 알림톡
  if (has(/문자|알림톡|sms|발신번호|캠페인|메시지 발송/)) {
    return ko
      ? '문자·알림톡은 발신번호 등록(관리자 승인) 후 크레딧으로 발송돼요. 대시보드 > 문자/알림톡 메뉴에서 이용하실 수 있습니다.'
      : 'SMS and KakaoTalk alerts are sent using credits after your sender number is approved. You’ll find them under Dashboard > SMS / Alimtalk.'
  }
  // 가입 · 로그인 · 계정
  if (has(/가입|회원|로그인|비밀번호|계정|signup|sign up|log ?in|password|account/)) {
    return ko
      ? '가입은 bygency.co/signup 에서 카드 없이 무료로 하실 수 있어요. 비밀번호는 로그인 후 프로필 페이지에서 변경 가능하고, 문제가 있으면 cs@bygency.co 로 알려주세요.'
      : 'Sign up free (no card) at bygency.co/signup. You can change your password on the profile page after logging in — any issues, email cs@bygency.co.'
  }
  // 도입 · 상담 · 견적 · 엔터프라이즈
  if (has(/도입|상담|영업|견적|대량|엔터프라이즈|계약|제휴|sales|enterprise|quote|demo/)) {
    return ko
      ? '도입·대량 사용·제휴 상담은 cs@bygency.co 또는 bygency.co/contact 로 남겨주시면 담당자가 빠르게 안내드리겠습니다.'
      : 'For enterprise, bulk usage, or partnership inquiries, reach us at cs@bygency.co or bygency.co/contact and our team will follow up quickly.'
  }
  // 기능 문의
  if (has(/기능|무엇|뭐.?(하|할|가능)|할 수 있|어떤|사용법|feature|what can|how to/)) {
    return ko
      ? 'BYGENCY는 올인원 마케팅 플랫폼이에요. DB수집 랜딩페이지 · 유튜브/블로그/플레이스 분석 · 문자·알림톡 · CRM · 리포트, 그리고 NODE STUDIO로 AI 광고·숏폼 영상까지 한 곳에서 만드실 수 있습니다.'
      : 'BYGENCY is an all-in-one marketing platform: lead-capture landing pages, YouTube/blog/Place analysis, SMS & KakaoTalk, CRM, reports, and AI ad/short-form video in NODE STUDIO — all in one place.'
  }
  // 기본
  return ko
    ? '문의 주셔서 감사합니다! 조금 더 자세히 알려주시면 정확히 안내드릴게요. 급하시면 cs@bygency.co 또는 bygency.co/contact 로 문의 주시면 담당자가 도와드립니다.'
    : 'Thanks for reaching out! Tell us a bit more and we’ll help precisely. For anything urgent, contact cs@bygency.co or bygency.co/contact and our team will assist you.'
}

// POST /api/chat/send { text, conv_id?, name?, email? } → 고객센터 채팅 메시지 전송
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)

  const b: any = await request.json().catch(() => ({}))
  const text = String(b.text || '').trim().slice(0, 2000)
  if (!text) return json({ ok: false, error: '메시지를 입력하세요.' }, 400)

  // 대화 식별: 로그인=user_id, 게스트=클라이언트가 준 conv_id(없으면 새로 발급)
  let convId = String(b.conv_id || '').slice(0, 60)
  if (me) convId = me.id
  if (!convId) convId = 'g_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)

  const name = me?.name || String(b.name || '').trim().slice(0, 40) || '게스트'
  const email = me?.email || String(b.email || '').trim().slice(0, 120)

  const id = 'sc_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)
  await db
    .prepare(
      `INSERT INTO support_chats (id, conv_id, user_id, name, email, sender, text, read_admin, read_user, created_at)
       VALUES (?, ?, ?, ?, ?, 'user', ?, 0, 1, ?)`,
    )
    .bind(id, convId, me?.id || '', name, email, text, new Date().toISOString())
    .run()

  // 자동응답(FAQ): 사람 상담원이 최근(15분 내) 답한 적 없을 때만 즉시 일반 답변을 남긴다.
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const humanRecent: any = await db
      .prepare("SELECT 1 FROM support_chats WHERE conv_id = ? AND sender = 'admin' AND created_at > ? LIMIT 1")
      .bind(convId, cutoff)
      .first()
    if (!humanRecent) {
      const reply = cannedReply(text)
      await db
        .prepare(
          `INSERT INTO support_chats (id, conv_id, user_id, name, email, sender, text, read_admin, read_user, created_at)
           VALUES (?, ?, ?, '자동응답', '', 'bot', ?, 1, 0, ?)`,
        )
        .bind('sc_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18), convId, me?.id || '', reply, new Date(Date.now() + 500).toISOString())
        .run()
    }
  } catch {
    /* 자동응답 실패는 메시지 전송을 막지 않음 */
  }

  return json({ ok: true, conv_id: convId, id })
}
