// 발신번호 사전등록(승인) — 스키마 · 필수 서류 정의 · 공통 조회
//
// 통신사/알리고 정책상 발신번호는 "그 번호가 신청인 명의"임을 서류로 증명해야 등록된다.
// 그래서 승인은 서류가 "전부" 첨부됐을 때만 가능하다(관리자도 건너뛸 수 없다).

export type OwnerType = 'personal' | 'business'

export interface DocSpec {
  type: string
  label: string
  hint: string
}

// 서류 정의. key 는 sender_documents.doc_type 에 그대로 들어간다.
export const DOC_SPECS: Record<string, DocSpec> = {
  telecom: {
    type: 'telecom',
    label: '통신서비스 이용증명원',
    hint: '통신사(SKT·KT·LGU+ 등)에서 발급. 신청한 발신번호와 명의자가 그대로 보여야 합니다.',
  },
  bizreg: {
    type: 'bizreg',
    label: '사업자등록증',
    hint: '사업자등록번호·상호·대표자명이 보이게 촬영/스캔해 주세요.',
  },
  idcard: {
    type: 'idcard',
    label: '신분증 사본',
    hint: '주민등록번호 뒤 7자리는 가려서 올려주세요.',
  },
  consent: {
    type: 'consent',
    label: '위임장(명의자 동의서)',
    hint: '번호 명의자와 신청자가 다를 때 필수입니다. 명의자 서명이 보여야 합니다.',
  },
}

/** 이 신청에 필요한 서류 목록. 명의 종류·타인명의 여부로 달라진다. */
export function requiredDocs(ownerType: string, thirdParty: boolean | number): string[] {
  const list = ownerType === 'business' ? ['telecom', 'bizreg'] : ['telecom', 'idcard']
  if (thirdParty) list.push('consent')
  return list
}

export const OWNER_LABEL: Record<string, string> = {
  personal: '개인',
  business: '사업자·법인',
}

export const STATUS_LABEL: Record<string, string> = {
  draft: '서류 준비중',
  pending: '승인 대기',
  approved: '승인 완료',
  rejected: '반려',
}

export async function ensureSenderSchema(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS sender_documents (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        file_name TEXT,
        content_type TEXT,
        size INTEGER,
        created_at TEXT NOT NULL
      )`,
    )
    .run()
    .catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sender_docs ON sender_documents(sender_id)').run().catch(() => {})
  // sender_numbers 는 이미 있는 테이블 — 신청서 항목만 덧붙인다(있으면 조용히 실패).
  for (const col of [
    "owner_type TEXT DEFAULT 'personal'",
    'owner_name TEXT',
    'biz_no TEXT',
    'third_party INTEGER DEFAULT 0',
    'reject_reason TEXT',
    'submitted_at TEXT',
    'decided_by TEXT',
  ]) {
    await db.prepare(`ALTER TABLE sender_numbers ADD COLUMN ${col}`).run().catch(() => {})
  }
}

export interface SenderDoc {
  id: string
  docType: string
  label: string
  fileName: string
  contentType: string
  size: number
  createdAt: string
  url: string
}

/** 신청 여러 건의 서류를 한 번에 읽어 sender_id 별로 묶는다. */
export async function docsBySender(db: D1Database, senderIds: string[]): Promise<Record<string, SenderDoc[]>> {
  const out: Record<string, SenderDoc[]> = {}
  const ids = senderIds.filter((s) => typeof s === 'string' && s).slice(0, 500)
  if (!ids.length) return out
  const marks = ids.map(() => '?').join(',')
  const rows =
    (
      await db
        .prepare(
          `SELECT id, sender_id, doc_type, file_name, content_type, size, created_at
           FROM sender_documents WHERE sender_id IN (${marks}) ORDER BY created_at`,
        )
        .bind(...ids)
        .all()
        .catch(() => ({ results: [] as any[] }))
    ).results || []
  for (const r of rows as any[]) {
    const sid = String(r.sender_id)
    ;(out[sid] ||= []).push({
      id: String(r.id),
      docType: String(r.doc_type),
      label: DOC_SPECS[String(r.doc_type)]?.label || String(r.doc_type),
      fileName: String(r.file_name || ''),
      contentType: String(r.content_type || ''),
      size: Number(r.size || 0),
      createdAt: String(r.created_at || ''),
      // 서류는 개인정보(신분증·사업자등록증)라 공개 /api/media 로 서빙하지 않는다.
      url: `/api/sender/doc/${r.id}`,
    })
  }
  return out
}

/** 아직 안 올라온 필수 서류. 빈 배열이어야 승인 가능. */
export function missingDocs(row: any, docs: SenderDoc[]): DocSpec[] {
  const need = requiredDocs(String(row?.owner_type || 'personal'), Number(row?.third_party || 0))
  const have = new Set((docs || []).map((d) => d.docType))
  return need.filter((t) => !have.has(t)).map((t) => DOC_SPECS[t]).filter(Boolean)
}
