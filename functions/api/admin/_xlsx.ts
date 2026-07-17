// 라이브러리 없이 최소 XLSX 생성기 — ZIP(STORE, 무압축) + inlineStr 셀.
// 여러 시트(테이블)를 한 파일로 만든다. 엑셀/구글시트에서 정상 오픈.

const enc = new TextEncoder()

function crc32(buf: Uint8Array): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}
const CTRL = new RegExp('[' + [0,1,2,3,4,5,6,7,8,11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(c=>'\\u'+('000'+c.toString(16)).slice(-4)).join('') + ']', 'g')
const xesc = (s: any) =>
  String(s == null ? '' : s)
    .replace(CTRL, '')
    .replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[m])
function colRef(n: number): string {
  let s = ''
  n++
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}

export interface Sheet { name: string; headers: string[]; rows: (string | number | null)[][] }

function sheetXml(sh: Sheet): string {
  const all: (string | number | null)[][] = [sh.headers, ...sh.rows]
  const rowsXml = all.map((row, ri) => {
    const cells = row.map((v, ci) => {
      const ref = colRef(ci) + (ri + 1)
      if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`
    }).join('')
    return `<row r="${ri + 1}">${cells}</row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`
}

const u16 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff])
const u32 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff])
function concat(arrs: Uint8Array[]): Uint8Array {
  let len = 0; for (const a of arrs) len += a.length
  const out = new Uint8Array(len); let o = 0
  for (const a of arrs) { out.set(a, o); o += a.length }
  return out
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const nameBytes = enc.encode(f.name)
    const crc = crc32(f.data)
    const size = f.data.length
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), nameBytes,
    ])
    chunks.push(local, f.data)
    const cen = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(offset), nameBytes,
    ])
    central.push(cen)
    offset += local.length + f.data.length
  }
  const centralBytes = concat(central)
  const eocd = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralBytes.length), u32(offset), u16(0),
  ])
  return concat([...chunks, centralBytes, eocd])
}

// 시트 → CSV 문자열 (엑셀 한글용 UTF-8 BOM 포함)
export function sheetToCsv(sh: Sheet): string {
  const esc = (v: any) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [sh.headers, ...sh.rows].map((row) => row.map(esc).join(','))
  return String.fromCharCode(0xFEFF) + lines.join('\r\n')
}
// 여러 파일을 하나의 ZIP(무압축)으로 — 전체 DB를 테이블별 CSV 묶음으로 받을 때 사용
export function zipFiles(files: { name: string; data: Uint8Array }[]): Uint8Array {
  return zipStore(files)
}

export function buildXlsx(sheets: Sheet[]): Uint8Array {
  if (!sheets.length) sheets = [{ name: 'Sheet1', headers: ['(비어 있음)'], rows: [] }]
  const files: { name: string; data: Uint8Array }[] = []
  const add = (name: string, str: string) => files.push({ name, data: enc.encode(str) })
  const usedNames = new Set<string>()
  const names = sheets.map((s, i) => {
    let nm = (s.name || 'Sheet' + (i + 1)).replace(/[\\/*?:\[\]]/g, ' ').slice(0, 31).trim() || 'Sheet' + (i + 1)
    let base = nm, k = 2
    while (usedNames.has(nm.toLowerCase())) { nm = (base.slice(0, 28) + '_' + k).slice(0, 31); k++ }
    usedNames.add(nm.toLowerCase())
    return nm
  })

  add('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
    `</Types>`)
  add('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  add('xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
    names.map((nm, i) => `<sheet name="${xesc(nm)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    `</sheets></workbook>`)
  add('xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `</Relationships>`)
  sheets.forEach((sh, i) => add(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sh)))

  return zipStore(files)
}
