import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'

// 브랜드 킷 — "우리 브랜드답게"를 모든 생성에 자동으로 입히는 계정별 설정.
//  톤앤매너·컬러·피해야 할 것을 한 번 저장해 두면, 스튜디오·공개 API·Claude MCP 어디서
//  생성하든 서버가 프롬프트에 자동으로 얹는다. (매번 같은 문구를 붙여 넣지 않아도 된다)
//  로고는 URL 만 보관하며, 레퍼런스 이미지로 쓸지는 생성 시점에 선택한다.

const MAX_LEN = 600

export interface BrandKit {
  enabled: boolean
  name: string
  tone: string       // 톤앤매너·스타일 지시문 (프롬프트 뒤에 붙는다)
  palette: string    // 컬러/조명 지시문
  negative: string   // 브랜드가 피해야 할 것 (네거티브에 합쳐진다)
  logoUrl: string    // 로고 이미지(공개 URL) — 레퍼런스로 쓸 수 있음
  useLogo: boolean   // 로고를 레퍼런스 이미지로 자동 첨부할지
}

export async function ensureBrandKit(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS studio_brandkit (
      user_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL DEFAULT '',
      tone TEXT NOT NULL DEFAULT '',
      palette TEXT NOT NULL DEFAULT '',
      negative TEXT NOT NULL DEFAULT '',
      logo_url TEXT NOT NULL DEFAULT '',
      use_logo INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    )`,
  ).run().catch(() => {})
}

/** (서버 내부용 — /api/generate·MCP 가 사용) 회원의 브랜드 킷. 없거나 꺼져 있으면 null. */
export async function getBrandKit(db: D1Database, userId: string): Promise<BrandKit | null> {
  try {
    await ensureBrandKit(db)
    const r: any = await db.prepare(
      'SELECT enabled, name, tone, palette, negative, logo_url, use_logo FROM studio_brandkit WHERE user_id = ?',
    ).bind(userId).first()
    if (!r || Number(r.enabled) !== 1) return null
    const kit: BrandKit = {
      enabled: true,
      name: String(r.name || ''),
      tone: String(r.tone || ''),
      palette: String(r.palette || ''),
      negative: String(r.negative || ''),
      logoUrl: String(r.logo_url || ''),
      useLogo: Number(r.use_logo) === 1,
    }
    // 내용이 하나도 없으면 적용할 게 없다
    if (!kit.tone && !kit.palette && !kit.negative && !(kit.useLogo && kit.logoUrl)) return null
    return kit
  } catch { return null }
}

/** 브랜드 킷을 프롬프트/네거티브에 적용한 문자열을 돌려준다(순수 함수 — 테스트 용이). */
export function applyBrandKit(kit: BrandKit | null, prompt: string, negative: string) {
  if (!kit) return { prompt, negative }
  const bits: string[] = []
  if (kit.tone) bits.push(kit.tone)
  if (kit.palette) bits.push(kit.palette)
  let p = String(prompt || '')
  if (bits.length) {
    const tag = '[브랜드 톤: ' + bits.join(' · ') + ']'
    // 이미 같은 지시문이 들어 있으면 중복해서 붙이지 않는다(사용자가 직접 적은 경우)
    if (p.indexOf(tag) < 0) p = p ? p + '\n\n' + tag : tag
  }
  let n = String(negative || '')
  if (kit.negative && n.indexOf(kit.negative) < 0) n = n ? n + ', ' + kit.negative : kit.negative
  return { prompt: p, negative: n }
}

const clean = (v: any) => String(v == null ? '' : v).slice(0, MAX_LEN)

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureBrandKit(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const r: any = await db.prepare(
    'SELECT enabled, name, tone, palette, negative, logo_url, use_logo FROM studio_brandkit WHERE user_id = ?',
  ).bind(me.id).first()
  return json({
    ok: true,
    kit: r
      ? { enabled: Number(r.enabled) === 1, name: r.name || '', tone: r.tone || '', palette: r.palette || '',
          negative: r.negative || '', logoUrl: r.logo_url || '', useLogo: Number(r.use_logo) === 1 }
      : { enabled: true, name: '', tone: '', palette: '', negative: '', logoUrl: '', useLogo: false },
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureBrandKit(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  let b: any = {}
  try { b = await request.json() } catch { return json({ ok: false, error: '잘못된 요청' }, 400) }
  const logo = clean(b.logoUrl).trim()
  if (logo && !/^https?:\/\//.test(logo)) return json({ ok: false, error: '로고는 업로드된 공개 URL 이어야 합니다.' }, 400)
  await db.prepare(
    `INSERT INTO studio_brandkit (user_id, enabled, name, tone, palette, negative, logo_url, use_logo, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       enabled=excluded.enabled, name=excluded.name, tone=excluded.tone, palette=excluded.palette,
       negative=excluded.negative, logo_url=excluded.logo_url, use_logo=excluded.use_logo,
       updated_at=excluded.updated_at`,
  ).bind(
    me.id, b.enabled === false ? 0 : 1, clean(b.name), clean(b.tone), clean(b.palette),
    clean(b.negative), logo, b.useLogo ? 1 : 0, new Date().toISOString(),
  ).run()
  return json({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureBrandKit(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  await db.prepare('DELETE FROM studio_brandkit WHERE user_id = ?').bind(me.id).run()
  return json({ ok: true })
}
