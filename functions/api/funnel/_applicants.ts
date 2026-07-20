// 신청자 행 정규화 (_ 프리픽스 = 라우팅 제외, import 전용)
// funnel_applicants 는 신구 두 저장 방식을 병행한다:
//   - 신규(빌더/폼): name/phone/email/additional_data 컬럼에 직접 저장
//   - 레거시(apply.ts): data_json 에 {name, phone, email, extra} JSON 저장
// 빌더 화면은 a.name/a.phone/a.email/a.additional_data 를 읽으므로, 레거시 행을 펼쳐 채워준다.

export function normalizeApplicants(rows: any[]): any[] {
  return (rows || []).map((r) => {
    const out: any = { ...r }
    if ((out.name == null || out.phone == null) && out.data_json) {
      try {
        const d = JSON.parse(out.data_json)
        if (out.name == null) out.name = d.name || ''
        if (out.phone == null) out.phone = d.phone || ''
        if (out.email == null) out.email = d.email || ''
        if (out.additional_data == null) {
          const extra = d.extra ?? d.data ?? null
          out.additional_data = extra != null ? (typeof extra === 'string' ? extra : JSON.stringify(extra)) : JSON.stringify({})
        }
      } catch { /* ignore */ }
    }
    out.name = out.name || ''
    out.phone = out.phone || ''
    out.email = out.email || ''
    // created_at 을 UTC(Z) 로 보정 (KST 변환은 프런트에서)
    if (out.created_at && typeof out.created_at === 'string' && !/[Z+]/.test(out.created_at)) {
      out.created_at = out.created_at.replace(' ', 'T').replace(/Z?$/, 'Z')
    }
    return out
  })
}
