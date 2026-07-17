/** 클로드(Claude) 스타일 선버스트 마크 — 클레이 오렌지, 로고 텍스트 없이 마크만.
 *  (상표 이미지를 그대로 복제하지 않은, 길이가 다른 광선의 인라인 SVG 근사) */
export function ClaudeMark({ size = 34, color = '#D97757' }: { size?: number; color?: string }) {
  const N = 11
  const lens = [30, 25, 29, 23, 30, 24, 28, 22, 29, 24, 27] // 광선 길이를 조금씩 다르게 → 유기적인 느낌
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Claude">
      <g transform="translate(50,50)">
        {lens.map((L, i) => (
          <rect key={i} x={-3} y={-14 - L} width={6} height={L} rx={3} fill={color} transform={`rotate(${(360 / N) * i})`} />
        ))}
      </g>
    </svg>
  )
}
