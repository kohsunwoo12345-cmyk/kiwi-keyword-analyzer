/* 첫 화면을 그리는 동안에는 아무것도 더 요청하지 않는다.
 *
 * 홈을 실물로 재 보니 화면이 그려질 무렵(+717ms) 여섯 개의 API 요청이 한꺼번에 나갔다:
 *   /api/visit · /api/me · /api/plan-config · /api/public-notices · /api/chat/thread · /api/geo
 * 이 중 방문 기록·팝업 알림·상담 스레드·국가 판별은 첫 화면에 아무 영향이 없다.
 * 그런데도 같은 순간에 나가서, 브라우저는 남은 스크립트·이미지와 연결을 나눠 쓰고
 * 서버는 회원 한 명이 들어올 때마다 워커를 여섯 번 깨운다.
 *
 * 그래서 "브라우저가 한가해지면" 으로 미룬다. 화면이 다 그려진 뒤에 도는 일이라
 * 사람이 느끼는 시점은 그대로고, 첫 화면은 그만큼 빨리 끝난다.
 *
 * requestIdleCallback 이 없는 브라우저(사파리 구버전)에서는 짧은 타이머로 대신한다 —
 * 없다고 아예 안 하면 방문 통계가 그 브라우저에서만 통째로 빠진다.
 */
export function onIdle(fn: () => void, timeout = 2000): () => void {
  if (typeof window === 'undefined') return () => {}
  const w = window as any
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(fn, { timeout })
    return () => { try { w.cancelIdleCallback(id) } catch { /* ignore */ } }
  }
  const t = setTimeout(fn, 300)
  return () => clearTimeout(t)
}
