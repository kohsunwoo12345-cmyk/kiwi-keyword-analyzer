// 구조화 데이터(JSON-LD) 주입 — AEO/GEO(AI 답변엔진·검색엔진 최적화)용.
// 서버/클라이언트 컴포넌트 양쪽에서 사용 가능. 정적 export 시 HTML 에 그대로 포함되어 크롤러가 읽는다.
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data)
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
