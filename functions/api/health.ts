import { Env, json, ensureSchema, seedAdmin, resolveDB, resolveBucket, bindingKeys, ADMIN_EMAIL } from './_utils'

// 배포/바인딩 진단용: https://<도메인>/api/health
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = resolveDB(env)
  const bucket = resolveBucket(env)
  let dbOk = false
  let userCount = -1
  let adminSeeded = false
  let error: string | undefined

  if (db) {
    try {
      await ensureSchema(db)
      await seedAdmin(db, env)
      const row: any = await db.prepare('SELECT COUNT(*) AS n FROM users').first()
      userCount = row?.n ?? 0
      const admin = await db.prepare('SELECT id FROM users WHERE email = ?').bind(ADMIN_EMAIL).first()
      adminSeeded = !!admin
      dbOk = true
    } catch (e: any) {
      error = String(e?.message || e)
    }
  }

  // 도구별 환경변수 연결 진단 (값은 절대 노출하지 않고 설정 여부만)
  const has = (k: string) => {
    const v = (env as any)?.[k]
    return typeof v === 'string' ? v.trim().length > 0 : !!v
  }
  const anyHas = (...ks: string[]) => ks.some(has)
  // 이름 대소문자를 가리지 않고 존재 확인 (Cloudflare 환경변수는 대소문자 구분)
  const hasCI = (...ks: string[]) => {
    const wanted = new Set(ks.map((k) => k.toLowerCase()))
    for (const k of Object.keys((env as any) || {})) {
      if (wanted.has(k.toLowerCase())) { const v = (env as any)[k]; if (typeof v === 'string' ? v.trim() : v) return true }
    }
    return false
  }
  const tools = {
    '유튜브 분석': { ok: anyHas('YouTube_Data_API_v3', 'YOUTUBE_DATA_API_V3', 'YOUTUBE_API_KEY'), keys: { YouTube_Data_API_v3: has('YouTube_Data_API_v3') } },
    '블로그·플레이스(네이버)': { ok: has('NAVER_CLIENT_ID') && has('NAVER_CLIENT_SECRET'), keys: { NAVER_CLIENT_ID: has('NAVER_CLIENT_ID'), NAVER_CLIENT_SECRET: has('NAVER_CLIENT_SECRET') } },
    '블로그 키워드(네이버 광고)': { ok: has('NAVER_AD_CUSTOMER_ID') && has('NAVER_API_SECRET_KEY'), keys: { NAVER_AD_CUSTOMER_ID: has('NAVER_AD_CUSTOMER_ID'), NAVER_API_SECRET_KEY: has('NAVER_API_SECRET_KEY'), NAVER_AD_ACCESS_LICENSE: has('NAVER_AD_ACCESS_LICENSE') } },
    '문자·알림톡(알리고)': { ok: has('ALIGO_API_KEY') && (has('ALIGO_ID_KEY') || has('ALIGO_USER_ID')), keys: { ALIGO_API_KEY: has('ALIGO_API_KEY'), ALIGO_ID_KEY: has('ALIGO_ID_KEY') || has('ALIGO_USER_ID'), ALIGO_SENDER_KEY: has('ALIGO_SENDER_KEY'), ALIGO_PROXY_URL: has('ALIGO_PROXY_URL'), ALIGO_SENDER_optional: has('ALIGO_SENDER') } },
    '이메일(Resend)': { ok: hasCI('RESEND_API_KEY', 'RESEND_KEY', 'RESEND_APIKEY'), keys: { 'RESEND_API_KEY(대소문자무관)': hasCI('RESEND_API_KEY', 'RESEND_KEY', 'RESEND_APIKEY'), RESEND_FROM_optional: has('RESEND_FROM') } },
    '결제(Toss)': { ok: anyHas('TOSS_SECRET_KEY', 'TOSS_API_PG_SECRET', 'TOSS_PG_SECRET_KEY') && anyHas('TOSS_CLIENT_KEY', 'TOSS_PG_CLIENT_KEY'), keys: { TOSS_SECRET_KEY: anyHas('TOSS_SECRET_KEY', 'TOSS_API_PG_SECRET', 'TOSS_PG_SECRET_KEY'), TOSS_CLIENT_KEY: anyHas('TOSS_CLIENT_KEY', 'TOSS_PG_CLIENT_KEY') } },
    'AI(OpenAI)': { ok: has('OPENAI_API_KEY'), keys: { OPENAI_API_KEY: has('OPENAI_API_KEY') } },
    'AI 영상(Pexels/TTS)': { ok: anyHas('PEXELS_API_KEY') , keys: { PEXELS_API_KEY: has('PEXELS_API_KEY'), PIXABAY_API_KEY: has('PIXABAY_API_KEY'), ElevenLabs_API_KEY: has('ElevenLabs_API_KEY'), Text_to_Speech: has('Text_to_Speech'), OpenAI_Text_to_speech: has('OpenAI_Text_to_speech'), HF_TOKEN: has('HF_TOKEN') } },
    '알림톡 발신프로필/템플릿(알리고)': { ok: has('ALIGO_SENDER_KEY'), keys: { ALIGO_SENDER_KEY: has('ALIGO_SENDER_KEY'), ALIGO_TEMPLATE_CODE: has('ALIGO_TEMPLATE_CODE') } },
  }

  // 보안: 관리자 이메일·내부 바인딩 변수명·원시 DB 오류는 공개 응답에서 제외
  //  (adminEmail/detectedBindings 노출은 난독화 관리자 URL·타깃 공격 정보 누출)
  return json({
    ok: true,
    functions: true,
    dbBinding: !!db,
    dbOk,
    r2Binding: !!bucket,
    userCount,
    adminSeeded,
    envCheck: tools,
    hint: db
      ? 'D1 정상 감지. 로그인 사용 가능.'
      : 'D1 바인딩이 감지되지 않았습니다. 이 도메인을 서비스하는 Pages 프로젝트의 Production 환경에 D1 바인딩을 추가하고 재배포하세요.',
    error: error ? true : undefined, // 원시 오류 문자열 대신 불리언만 노출
  })
}
