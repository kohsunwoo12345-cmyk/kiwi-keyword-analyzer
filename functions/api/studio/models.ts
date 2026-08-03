/* 스튜디오가 뜰 때 읽어 가는 "추가로 등록된 모델" 목록.
   ⚠ 비밀은 하나도 안 나간다 — 표시명·분류·제공사·모델 ID·단가·옵션뿐이다.
     모델 ID 는 제공사 공개 문서에 그대로 실려 있는 값이라 감출 것이 아니다.
   ⚠ 실패해도 절대 화면을 막지 않는다. 등록부가 비었거나 표가 없으면 빈 목록을 준다 —
     그래야 코드에 박힌 기본 모델들은 언제나 그대로 뜬다. */
import { resolveDB } from '../_utils'
import { listEnabled } from './_registry'

export const onRequestGet: PagesFunction = async ({ env }) => {
  const json = (o: any, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const db = resolveDB(env as any)
    if (!db) return json({ ok: true, models: [] })
    return json({ ok: true, models: await listEnabled(db) })
  } catch {
    return json({ ok: true, models: [] })
  }
}
