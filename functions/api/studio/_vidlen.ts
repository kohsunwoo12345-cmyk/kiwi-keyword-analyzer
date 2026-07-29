/* 원본 영상 길이를 서버가 직접 잰다.
 *
 * 업스케일·V2V 자동·모션 전이·나레이션·립싱크·목소리 교체·Runway Aleph·루마 영상편집/비율변경은
 * 결과 길이가 "원본 영상 길이" 로 정해진다. 요청에 길이 필드가 없으니 빌더에 물어볼 수도 없어,
 * 지금까지는 클라이언트가 신고한 값을 그대로 청구했다 — 짧게 신고하면 그만큼 덜 냈다.
 * (스튜디오는 정직하게 재서 보내지만, 그건 클라이언트를 믿는다는 뜻이다.)
 *
 * MP4/MOV 는 moov 박스 안 mvhd 에 timescale 과 duration 이 들어 있다. 그 두 값만 읽으면
 * 파일 전체를 받지 않고도 길이를 알 수 있다 — Range 로 앞뒤 일부만 가져온다.
 * (webm 등 다른 컨테이너는 못 읽는다. 그럴 땐 신고값으로 물러난다 — 생성을 막지는 않는다.)
 */

/** MP4/MOV 바이트에서 재생 길이(초)를 읽는다. 못 찾으면 null. */
export function parseMp4Duration(buf: Uint8Array): number | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const u32 = (o: number) => dv.getUint32(o)
  const tag = (o: number) =>
    String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3])

  /* 박스는 [크기 4바이트][종류 4바이트][내용] 이 이어진 구조이고, moov 안에 mvhd 가 있다.
     크기 0 = "파일 끝까지", 크기 1 = 뒤에 64비트 크기가 따라온다(대용량). 둘 다 실제로 나온다. */
  const walk = (start: number, end: number, depth: number): number | null => {
    let o = start
    while (o + 8 <= end && depth < 8) {
      let size = u32(o)
      const type = tag(o + 4)
      let head = 8
      if (size === 1) {
        if (o + 16 > end) return null
        // 64비트 크기 — 상위 32비트는 현실적으로 0이다(4GB 이상 박스는 없다)
        const hi = u32(o + 8), lo = u32(o + 12)
        size = hi * 4294967296 + lo
        head = 16
      } else if (size === 0) {
        size = end - o
      }
      if (size < head) return null                       // 망가진 박스 — 무한루프 방지
      if (type === 'mvhd') {
        const p = o + head
        if (p + 4 > end) return null
        const ver = buf[p]
        if (ver === 1) {
          //  v1: [버전1+플래그3][생성8][수정8][timescale4][duration8]
          if (p + 32 > end) return null
          const ts = u32(p + 20)
          const hi = u32(p + 24), lo = u32(p + 28)
          const dur = hi * 4294967296 + lo
          return ts > 0 ? dur / ts : null
        }
        //  v0: [버전1+플래그3][생성4][수정4][timescale4][duration4]
        if (p + 20 > end) return null
        const ts = u32(p + 12)
        const dur = u32(p + 16)
        return ts > 0 ? dur / ts : null
      }
      // moov·trak·mdia 같은 상자 박스는 안으로 들어간다
      if (type === 'moov' || type === 'trak' || type === 'mdia') {
        const inner = walk(o + head, Math.min(o + size, end), depth + 1)
        if (inner != null) return inner
      }
      o += size
    }
    return null
  }
  return walk(0, buf.byteLength, 0)
}

async function range(url: string, from: number, to: number, timeoutMs = 8000): Promise<Uint8Array | null> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { headers: { Range: `bytes=${from}-${to}` }, signal: ctl.signal })
    if (!r.ok && r.status !== 206) return null
    return new Uint8Array(await r.arrayBuffer())
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/** 공개 URL 의 영상 길이(초). 읽지 못하면 null — 부르는 쪽이 신고값으로 물러난다. */
export async function probeRemoteVideoSeconds(url: string): Promise<number | null> {
  const u = String(url || '').trim()
  if (!/^https?:\/\//i.test(u)) return null
  const CHUNK = 512 * 1024
  //  ① 앞부분 — 스트리밍용으로 만든 파일은 moov 가 앞에 있다(faststart)
  const head = await range(u, 0, CHUNK - 1)
  if (head && head.byteLength) {
    const d = parseMp4Duration(head)
    if (d && d > 0) return d
  }
  /* ② 뒷부분 — 인코더가 그냥 뱉은 파일은 moov 가 끝에 있다.
        전체 크기를 모르면 끝에서부터 못 자르므로 Content-Range 로 크기를 알아낸다. */
  try {
    const probe = await fetch(u, { headers: { Range: 'bytes=0-1' } })
    const cr = probe.headers.get('content-range') || ''
    const total = Number(/\/(\d+)\s*$/.exec(cr)?.[1] || probe.headers.get('content-length') || 0)
    if (total > CHUNK) {
      const tail = await range(u, Math.max(0, total - CHUNK), total - 1)
      if (tail && tail.byteLength) {
        const d = parseMp4Duration(tail)
        if (d && d > 0) return d
      }
    }
  } catch { /* 크기를 못 알아내면 포기 — 신고값으로 물러난다 */ }
  return null
}

/* 결과 길이가 원본에서 정해지는 기능들 — 이 목록에 있으면 원본을 재서 청구한다.
   (빌더에 길이 필드가 없어 effectiveUnits 가 요청값을 그대로 돌려주는 것들이다) */
export const SOURCE_LENGTH_MODELS = new Set([
  '업스케일 4K (영상 화질 향상)',
  'V2V 자동 (최고정확도·모델 자동선택)',
  '모션 전이 (원본 움직임 유지·Motion Transfer)',
  'Runway Aleph (영상→실사 V2V)',
  '나레이션 (AI 음성 해설)',
  '립싱크 (인물 말하기)',
  'Luma Ray 3.2 (영상 편집)',
  'Luma Ray 3.2 (비율 변경)',
])

/** 요청 본문에서 원본 영상 URL 을 찾는다(기능마다 필드 이름이 다르다). */
export function sourceVideoUrl(b: any): string {
  return String((b && (b.srcVideo || b.srcVideoUrl || b.videoUrl || b.video_url)) || '').trim()
}
