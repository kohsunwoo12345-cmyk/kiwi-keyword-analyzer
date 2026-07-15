/** 국가 ISO 코드 → 한국어 국가명 + 도시/지역 한국어화 (접속 통계 위치 표기용) */

const COUNTRY_KO: Record<string, string> = {
  KR: '대한민국', US: '미국', JP: '일본', CN: '중국', TW: '대만', HK: '홍콩', MO: '마카오',
  GB: '영국', DE: '독일', FR: '프랑스', IT: '이탈리아', ES: '스페인', NL: '네덜란드', BE: '벨기에',
  CH: '스위스', AT: '오스트리아', SE: '스웨덴', NO: '노르웨이', DK: '덴마크', FI: '핀란드', IE: '아일랜드',
  PL: '폴란드', PT: '포르투갈', CZ: '체코', GR: '그리스', RU: '러시아', UA: '우크라이나', TR: '튀르키예',
  CA: '캐나다', MX: '멕시코', BR: '브라질', AR: '아르헨티나', CL: '칠레', CO: '콜롬비아',
  AU: '호주', NZ: '뉴질랜드', IN: '인도', ID: '인도네시아', TH: '태국', VN: '베트남', PH: '필리핀',
  MY: '말레이시아', SG: '싱가포르', HK_: '홍콩', BD: '방글라데시', PK: '파키스탄', LK: '스리랑카',
  AE: '아랍에미리트', SA: '사우디아라비아', QA: '카타르', KW: '쿠웨이트', IL: '이스라엘', EG: '이집트',
  ZA: '남아프리카공화국', NG: '나이지리아', KE: '케냐', MN: '몽골', KZ: '카자흐스탄', UZ: '우즈베키스탄',
  MM: '미얀마', KH: '캄보디아', LA: '라오스', NP: '네팔',
}

const CITY_KO: Record<string, string> = {
  // 대한민국
  Seoul: '서울', Busan: '부산', Incheon: '인천', Daegu: '대구', Daejeon: '대전', Gwangju: '광주',
  Ulsan: '울산', Suwon: '수원', Seongnam: '성남', Goyang: '고양', Yongin: '용인', Bucheon: '부천',
  Ansan: '안산', Cheongju: '청주', Jeonju: '전주', Cheonan: '천안', Anyang: '안양', Jeju: '제주',
  'Jeju City': '제주', Gimhae: '김해', Pohang: '포항', Changwon: '창원', Uijeongbu: '의정부',
  Namyangju: '남양주', Hwaseong: '화성', Pyeongtaek: '평택', Gyeonggi: '경기', 'Gyeonggi-do': '경기',
  // 해외 주요 도시
  Tokyo: '도쿄', Osaka: '오사카', Yokohama: '요코하마', Beijing: '베이징', Shanghai: '상하이',
  'Hong Kong': '홍콩', Taipei: '타이베이', Singapore: '싱가포르', Bangkok: '방콕', 'Ho Chi Minh City': '호치민',
  Hanoi: '하노이', Jakarta: '자카르타', Manila: '마닐라', Delhi: '델리', Mumbai: '뭄바이',
  'New York': '뉴욕', 'Los Angeles': '로스앤젤레스', 'San Francisco': '샌프란시스코', Seattle: '시애틀',
  Chicago: '시카고', 'Ashburn': '애슈번', London: '런던', Paris: '파리', Berlin: '베를린',
  Amsterdam: '암스테르담', Frankfurt: '프랑크푸르트', Sydney: '시드니', Toronto: '토론토',
}

export function countryKo(iso?: string): string {
  const c = (iso || '').toUpperCase()
  if (!c) return '미상'
  return COUNTRY_KO[c] || c
}

export function cityKo(city?: string): string {
  const s = (city || '').trim()
  if (!s) return ''
  return CITY_KO[s] || s
}

/** "대한민국 · 서울" 형태의 한국어 위치 문자열 */
export function locationKo(country?: string, region?: string, city?: string): string {
  const nation = countryKo(country)
  const local = cityKo(city) || cityKo(region)
  if (nation === '미상' && !local) return '미상'
  return local ? `${nation} · ${local}` : nation
}
