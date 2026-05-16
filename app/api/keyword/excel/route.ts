export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

// ── Edge 호환 Excel(xlsx) 생성 ──────────────────────────
// xlsx 패키지(Node.js 전용) 대신 순수 OOXML 문자열로 직접 생성

function escXml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface Sheet {
  name: string
  rows: (string | number)[][]
}

function buildXlsx(sheets: Sheet[]): Uint8Array {
  // 각 시트 XML 생성
  const sheetXmls = sheets.map(({ rows }) => {
    const rowsXml = rows.map((row, ri) => {
      const cells = row.map((cell, ci) => {
        const colLetter = String.fromCharCode(65 + (ci % 26))
        const ref = `${colLetter}${ri + 1}`
        if (typeof cell === 'number') {
          return `<c r="${ref}"><v>${cell}</v></c>`
        }
        const s = escXml(cell)
        return `<c r="${ref}" t="inlineStr"><is><t>${s}</t></is></c>`
      }).join('')
      return `<row r="${ri + 1}">${cells}</row>`
    }).join('')
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rowsXml}</sheetData>
</worksheet>`
  })

  // workbook.xml
  const sheetRefs = sheets.map((s, i) =>
    `<sheet name="${escXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  ).join('')

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetRefs}</sheets>
</workbook>`

  // workbook rels
  const wbRelsEntries = sheets.map((_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('')
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${wbRelsEntries}
</Relationships>`

  // [Content_Types].xml
  const sheetContentTypes = sheets.map((_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('')
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheetContentTypes}
</Types>`

  // _rels/.rels
  const dotRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  // ZIP 조립 (독립적인 minimal ZIP)
  const files: { name: string; data: string }[] = [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: dotRels },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
    ...sheets.map((_, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: sheetXmls[i],
    })),
  ]

  return buildZip(files)
}

// ── 순수 JS ZIP builder (Deflate 없이 Store 방식) ────────
function buildZip(files: { name: string; data: string }[]): Uint8Array {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const centralDir: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = enc.encode(file.name)
    const dataBytes = enc.encode(file.data)
    const crc = crc32(dataBytes)
    const size = dataBytes.length

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const dv = new DataView(localHeader.buffer)
    dv.setUint32(0, 0x04034b50, true)  // signature
    dv.setUint16(4, 20, true)           // version needed
    dv.setUint16(6, 0, true)            // flags
    dv.setUint16(8, 0, true)            // compression (store)
    dv.setUint16(10, 0, true)           // mod time
    dv.setUint16(12, 0, true)           // mod date
    dv.setUint32(14, crc, true)         // CRC-32
    dv.setUint32(18, size, true)        // compressed size
    dv.setUint32(22, size, true)        // uncompressed size
    dv.setUint16(26, nameBytes.length, true) // file name length
    dv.setUint16(28, 0, true)           // extra field length
    localHeader.set(nameBytes, 30)

    // Central directory entry
    const central = new Uint8Array(46 + nameBytes.length)
    const cdv = new DataView(central.buffer)
    cdv.setUint32(0, 0x02014b50, true)  // signature
    cdv.setUint16(4, 20, true)          // version made by
    cdv.setUint16(6, 20, true)          // version needed
    cdv.setUint16(8, 0, true)           // flags
    cdv.setUint16(10, 0, true)          // compression
    cdv.setUint16(12, 0, true)          // mod time
    cdv.setUint16(14, 0, true)          // mod date
    cdv.setUint32(16, crc, true)        // CRC-32
    cdv.setUint32(20, size, true)       // compressed
    cdv.setUint32(24, size, true)       // uncompressed
    cdv.setUint16(28, nameBytes.length, true)
    cdv.setUint16(30, 0, true)          // extra
    cdv.setUint16(32, 0, true)          // comment
    cdv.setUint16(34, 0, true)          // disk start
    cdv.setUint16(36, 0, true)          // internal attr
    cdv.setUint32(38, 0, true)          // external attr
    cdv.setUint32(42, offset, true)     // local header offset
    central.set(nameBytes, 46)

    parts.push(localHeader, dataBytes)
    centralDir.push(central)
    offset += localHeader.length + size
  }

  // End of central directory
  const cdSize = centralDir.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const edv = new DataView(eocd.buffer)
  edv.setUint32(0, 0x06054b50, true)
  edv.setUint16(4, 0, true)
  edv.setUint16(6, 0, true)
  edv.setUint16(8, files.length, true)
  edv.setUint16(10, files.length, true)
  edv.setUint32(12, cdSize, true)
  edv.setUint32(16, offset, true)
  edv.setUint16(20, 0, true)

  const all = [...parts, ...centralDir, eocd]
  const total = all.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const a of all) { out.set(a, pos); pos += a.length }
  return out
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// ── API Handler ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q')
  if (!keyword) return NextResponse.json({ error: '키워드를 입력하세요' }, { status: 400 })

  const baseUrl = req.nextUrl.origin
  const apiRes = await fetch(`${baseUrl}/api/keyword?q=${encodeURIComponent(keyword)}`)
  if (!apiRes.ok) return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 })
  const data = await apiRes.json() as any

  const today = new Date().toISOString().slice(0, 10)

  const sheets: Sheet[] = [
    // ── 시트1: 기본정보 ──
    {
      name: '기본정보',
      rows: [
        ['키워드 분석 리포트'],
        ['생성일시', new Date().toLocaleString('ko-KR')],
        [],
        ['=== 검색량 ==='],
        ['키워드', data.keyword],
        ['등급', data.grade?.grade ?? '-'],
        ['PC 검색량', data.pcSearch ?? 0],
        ['모바일 검색량', data.mobileSearch ?? 0],
        ['총 검색량', data.totalSearch ?? 0],
        ['예상 검색량(당월)', data.estimatedSearch ?? 0],
        [],
        ['=== 콘텐츠 발행량 ==='],
        ['블로그 발행량', data.blogCount ?? 0],
        ['카페 발행량', data.cafeCount ?? 0],
        ['뉴스 발행량', data.newsCount ?? 0],
        [],
        ['=== 광고 정보 ==='],
        ['경쟁도', data.competitionLevel ?? '-'],
        ['포화도', data.saturation?.label ?? '-'],
        ['이슈성 지수', `${data.issueIndex ?? 0}%`],
        ['PC CPC', data.pcBid ?? 0],
        ['모바일 CPC', data.mobileBid ?? 0],
        ['PC CTR', data.pcCtr ? `${data.pcCtr}%` : '-'],
        ['모바일 CTR', data.mobileCtr ? `${data.mobileCtr}%` : '-'],
        [],
        ['=== 구글 데이터 ==='],
        ['구글 검색 결과 수', data.google?.totalResults ?? '-'],
      ],
    },
    // ── 시트2: 연관 키워드 ──
    {
      name: '연관키워드',
      rows: [
        ['키워드', 'PC검색량', '모바일검색량', '총검색량', '블로그발행량', '카페발행량', '포화도(%)', '경쟁도'],
        ...(data.relKeywords ?? []).map((r: any) => [
          r.keyword, r.pcSearch ?? 0, r.mobileSearch ?? 0, r.totalSearch ?? 0,
          r.blogCount ?? 0, r.cafeCount ?? 0, `${r.saturationRatio ?? 0}%`, r.competitionLevel ?? '보통',
        ]),
      ],
    },
    // ── 시트3: 월별 트렌드 ──
    {
      name: '월별트렌드',
      rows: [
        ['월', 'PC검색량', '모바일검색량', '합계', '비율(%)'],
        ...(data.monthlyTrends ?? []).map((m: any, i: number) => [
          m.month, m.pc ?? 0, m.mobile ?? 0,
          (m.pc ?? 0) + (m.mobile ?? 0),
          `${data.monthlyRatio?.[i]?.ratio ?? 0}%`,
        ]),
      ],
    },
    // ── 시트4: 요일별 분포 ──
    {
      name: '요일별분포',
      rows: [
        ['요일', '검색비율(%)'],
        ...(data.weekdayTrends ?? []).map((w: any) => [w.day, `${w.ratio}%`]),
      ],
    },
    // ── 시트5: 성향 분석 ──
    {
      name: '성향분석',
      rows: [
        ['=== 성별 분포 ==='],
        ['남성', `${data.genderRatio?.male ?? 50}%`],
        ['여성', `${data.genderRatio?.female ?? 50}%`],
        [],
        ['=== 디바이스 분포 ==='],
        ['PC', `${data.deviceRatio?.pc ?? 30}%`],
        ['모바일', `${data.deviceRatio?.mobile ?? 70}%`],
        [],
        ['=== 연령대 분포 ==='],
        ...Object.entries(data.ageGroup ?? {}).map(([age, pct]) => [age, `${pct}%`]),
      ],
    },
    // ── 시트6: 구글 검색 결과 ──
    {
      name: '구글검색결과',
      rows: [
        ['구글 검색 결과 수', data.google?.totalResults ?? '-'],
        [],
        ['순위', '제목', 'URL', '설명'],
        ...(data.google?.topResults ?? []).map((r: any, i: number) => [
          i + 1, r.title ?? '', r.link ?? '', r.description ?? '',
        ]),
      ],
    },
  ]

  const buf = buildXlsx(sheets)
  const fileName = encodeURIComponent(`키워드분석_${keyword}_${today}.xlsx`)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
    },
  })
}
