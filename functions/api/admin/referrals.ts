import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/referrals?q=검색어 → 회원별 가입/추천/친구/결제 조회
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const q = String(url.searchParams.get('q') || '').trim().toLowerCase()

  const users = (await db
    .prepare(
      `SELECT id, name, email, company, phone, plan, video_plan, credits, referral_code, referred_by, provider,
              country, postal_code, address1, address2, created_at,
              tos_consent, privacy_consent, marketing_consent, ai_consent, consent_at
       FROM users ORDER BY created_at DESC LIMIT 2000`,
    )
    .all()).results || []

  // 이름 맵 + 친구/추천 카운트
  const nameById = new Map<string, string>()
  for (const u of users as any[]) nameById.set(u.id, u.name)

  const friendCounts = new Map<string, number>()
  const fc = (await db.prepare('SELECT user_id, COUNT(*) AS n FROM friendships GROUP BY user_id').all()).results || []
  for (const r of fc as any[]) friendCounts.set(r.user_id, Number(r.n) || 0)

  const referredCounts = new Map<string, number>()
  const rc = (await db.prepare("SELECT referred_by AS id, COUNT(*) AS n FROM users WHERE referred_by IS NOT NULL AND referred_by != '' GROUP BY referred_by").all()).results || []
  for (const r of rc as any[]) referredCounts.set(r.id, Number(r.n) || 0)

  let rows = (users as any[]).map((u) => {
    const paidMarketer = u.plan && u.plan !== '없음'
    const paidVideo = u.video_plan && u.video_plan !== '없음'
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      plan: u.plan || '없음',
      videoPlan: u.video_plan || '없음',
      paid: !!(paidMarketer || paidVideo),
      credits: Number(u.credits) || 0,
      referralCode: u.referral_code || '',
      referredById: u.referred_by || '',
      referredByName: u.referred_by ? nameById.get(u.referred_by) || '(탈퇴/미상)' : '',
      friendCount: friendCounts.get(u.id) || 0,
      referredCount: referredCounts.get(u.id) || 0,
      company: u.company || '',
      phone: u.phone || '',
      provider: u.provider || 'email',
      country: u.country || '',
      postalCode: u.postal_code || '',
      address1: u.address1 || '',
      address2: u.address2 || '',
      addressDone: !!(u.country && u.postal_code && u.address1),
      createdAt: u.created_at,
      // 동의 내역
      tosConsent: Number(u.tos_consent) ? 1 : 0,
      privacyConsent: Number(u.privacy_consent) ? 1 : 0,
      marketingConsent: Number(u.marketing_consent) ? 1 : 0,
      aiConsent: Number(u.ai_consent) ? 1 : 0,
      consentAt: u.consent_at || '',
    }
  })

  if (q) {
    rows = rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.referralCode?.toLowerCase().includes(q) ||
        r.referredByName?.toLowerCase().includes(q) ||
        r.company?.toLowerCase().includes(q) ||
        r.address1?.toLowerCase().includes(q) ||
        r.country?.toLowerCase().includes(q),
    )
  }

  const totals = {
    members: rows.length,
    paid: rows.filter((r) => r.paid).length,
    unpaid: rows.filter((r) => !r.paid).length,
    referred: rows.filter((r) => r.referredById).length,
  }

  return json({ ok: true, totals, rows: rows.slice(0, 1000) })
}
