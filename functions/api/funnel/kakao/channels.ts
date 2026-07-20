// 퍼널 빌더 알림톡 채널 목록 — 기존 /api/kakao/user/channels 핸들러를 그대로 재사용
// (응답 계약 { ok, channels:[{channelId, channelName, searchId, ...}] } 동일)
export { onRequestGet } from '../../kakao/user/channels'
