# 모델 비교 — 우리 / Figma Weave / Higgsfield

작성 2026-08-03. 우리 목록은 코드(`MODEL_COST`)에서 직접 뽑았고, 두 경쟁 서비스는 공개 자료로
확인했다. **경쟁사 목록은 제품 화면을 직접 열어 센 것이 아니라 공개 문서·소개 글 기준이다.**
그쪽은 수시로 바뀌므로, 붙이기 전에 해당 모델 하나만 다시 확인하는 게 안전하다.

---

## 1. 우리 현황 — 64개

| 제공사 | 개수 | 모델 |
|---|---|---|
| 씨댄스(BytePlus) | 9 | 2.5 / 2.0 / 2.0 Fast / 2.0 Mini / 1.5 Pro / 1.0 Pro / 1.0 Pro Fast / 1.0 Lite T2V·I2V |
| Kling | 11 | 3.0 Pro·Fast / 2.1 Master / 2.0 Master / 1.6 Pro·Standard (각 T2V·I2V) |
| 씨드림(BytePlus) | 8 | 5.0 Pro / 5.0 Lite / 4.5 / 4.0 (각 생성·레퍼런스 편집) |
| Flux(BFL) | 8 | 2 Max / 2 Pro / 2 Flex / 1.1 Pro Ultra / 1.1 Pro / Dev / Kontext Max·Pro |
| Luma | 5 | Ray 3.2 / 영상 편집 / 비율 변경 / Uni 1 / Uni 1 Max |
| OpenAI | 4 | GPT Image 2 / 1.5 / 1 / Mini |
| MiniMax Hailuo | 3 | Hailuo 02 / T2V-01 Director / I2V-01 Director |
| Runway | 3 | Gen-4 / Gen-3 Alpha Turbo / Aleph(V2V) |
| xAI | 2 | Grok Imagine 영상·이미지 |
| 3D | 2 | Hyper3D Gen-2 / Hitem3D 2.0 |
| 업스케일 | 2 | 이미지 ×4 / 영상 ×4 |
| Google | 1 | Veo 3.1 |
| Nano Banana | 1 | |
| 그 외 | 5 | 립싱크 / 모션 전이 / 음악 / 나레이션 / V2V 자동 |

---

## 2. 세 서비스 비교

| 능력 | 우리 | Figma Weave | Higgsfield |
|---|---|---|---|
| **영상 — 씨댄스** | ✅ 9종 | ✅ | ✅ 2.0 |
| **영상 — Kling** | ✅ 11종 (3.0까지) | ✅ | ✅ 3.0 · **2.6** · **o1** |
| **영상 — Veo** | ✅ 3.1 | ✅ | ✅ 3.1 |
| **영상 — Runway** | ✅ Gen-4 · Aleph | ✅ Gen 계열 | — |
| **영상 — Luma Ray** | ✅ 3.2 | ✅ | — |
| **영상 — Wan (알리바바)** | ❌ **없음** | ✅ | ✅ 2.6 / 2.7 |
| **영상 — LTX (Lightricks)** | ❌ **없음** | ✅ | — |
| **영상 — Sora** | ❌ 없음 | — | ✅ Sora 2 |
| **영상 — Hailuo** | ✅ 3종 | — | — |
| **영상 — Grok Imagine** | ✅ | — | — |
| **이미지 — 씨드림** | ✅ 8종 | — | — |
| **이미지 — Flux** | ✅ 8종 | — | — |
| **이미지 — GPT Image** | ✅ 4종 | ✅ (Google 등) | — |
| **이미지 — Nano Banana** | ✅ | ✅ | ✅ |
| **이미지 — Stable Diffusion** | ❌ **없음** | ✅ | — |
| **이미지 — Recraft** | ❌ **없음** | ✅ | — |
| **이미지 — Bria** | ❌ **없음** | ✅ | — |
| **3D** | ✅ Hyper3D · Hitem3D | ✅ Hunyuan 3D · Rodin | — |
| **립싱크** | ✅ | — | ✅ LipSync Studio |
| **업스케일** | ✅ 이미지·영상 | ✅ | — |
| **음악·나레이션** | ✅ | ✅ (오디오) | — |
| **노드 캔버스** | ✅ | ✅ | — |
| **캐릭터 일관성 도구** | ❌ **없음** | — | ✅ **Soul ID** |
| **카메라 제어 도구** | 일부(카메라 프리셋) | — | ✅ **Cinema Studio** |
| **합성·마스킹·컬러그레이딩** | ❌ **없음** | ✅ | — |
| **MCP 연결** | ✅ | — | ✅ |

**한 줄 요약**
- 우리는 **모델 수(64)가 셋 중 가장 많다.** Higgsfield 는 15+, Weave 는 "주요 모델 전부" 를 표방한다.
- 우리가 진짜로 없는 것은 **모델 4~5개와 도구 3개**다. 아래.

---

## 3. 우리에게 없는 것 — 우선순위순

### ★★★ 1순위 — 둘 다 갖고 있는데 우리만 없다

| 모델 | 왜 필요한가 | 공식 API |
|---|---|---|
| **Wan 2.5 / 2.6 / 2.7** (알리바바) | Weave·Higgsfield **둘 다** 보유. 오픈소스 계열 중 가장 많이 쓰인다. 영상+오디오 동기, 립싱크 내장. 단가도 싸다(~$0.105/초) | [Alibaba Cloud Model Studio (DashScope)](https://www.alibabacloud.com/en/product/modelstudio) · 콘솔에서 API 키 발급 · OpenAI 호환 엔드포인트 |

### ★★ 2순위 — 한 곳이 갖고 있고, 우리 사업에 쓸모가 분명하다

| 모델 | 왜 필요한가 | 공식 API |
|---|---|---|
| **Recraft V4.1** | **벡터·로고·타이포그래피에 특화.** 마케팅 SaaS 에 바로 쓰인다 — 우리 이미지 모델 중 벡터를 내는 게 하나도 없다. 래스터 $0.035/장, 벡터 $0.08/장 | [recraft.ai/docs](https://www.recraft.ai/docs) · API 플랜 별도 |
| **Bria FIBO** | **라이선스 확보한 데이터로만 학습** — 상업적으로 가장 안전하다. 배경 제거($0.018) 등 편집 API 도 강함. 회원 상업물에 쓰기 좋다 | [bria.ai/pricing](https://bria.ai/pricing) · 무료 100건으로 시험 가능 |
| **LTX-2 / LTX 2.3** (Lightricks) | Weave 보유. **영상+오디오 동시 생성** 오픈 모델. 빠르고 싸다 | [console.ltx.io](https://console.ltx.io/) · 콘솔에서 키 발급·크레딧 구매 |

### ★ 3순위 — 있으면 좋지만 급하지 않다

| 모델 | 판단 | 공식 API |
|---|---|---|
| **Stable Diffusion (Stability AI)** | Flux 8종이 이미 상위 호환. 우선순위 낮음. Ultra $0.08 / Core $0.03 | [platform.stability.ai](https://platform.stability.ai/) |
| **Hunyuan 3D** (텐센트) | 3D 는 이미 2종 보유. 품질 비교 후 결정 | [Tencent Cloud Hunyuan 3D](https://www.tencentcloud.com/document/product/1284/75539) |
| **Kling 2.6 / o1** | 우리는 3.0·2.1·2.0·1.6 보유. 같은 제공사라 **키 추가 없이 모델 ID 만 추가**하면 된다 — 가장 싼 확장 | 기존 Kling 키 그대로 |

### ⛔ 붙이지 말 것

| 모델 | 이유 |
|---|---|
| **Sora 2** (OpenAI) | Higgsfield 가 갖고 있지만 — **API 가 2026-09-24 종료 예정**이다(앱·웹은 2026-04-26 종료). 지금 붙이면 두 달 뒤 버려야 한다. ⚠ 종료 일정은 재확인 필요 |

---

## 4. 모델이 아니라 "도구" 인 것 — 여기가 진짜 격차

모델을 아무리 늘려도 이건 안 따라진다. 경쟁사의 핵심 차별점이다.

| 도구 | 어디 | 무엇인가 | 우리 |
|---|---|---|---|
| **Soul ID** | Higgsfield | 같은 인물을 여러 컷에 걸쳐 **일관되게** 유지 | ❌ — 레퍼런스로 흉내는 내지만 전용 기능 없음 |
| **Cinema Studio** | Higgsfield | 카메라 워크(달리·팬·크레인 등)를 **골라서** 지정 | 일부 — 카메라 프리셋은 있으나 전용 화면 없음 |
| **합성·마스킹·컬러그레이딩** | Weave | 생성물을 캔버스에서 바로 **편집** | ❌ |

---

## 5. 제안하는 순서

1. **Kling 2.6 · o1 추가** — 키 추가 없이 모델 ID 만. 반나절.
2. **Wan** — 둘 다 갖고 있는 유일한 공백. 알리바바 계정·키 발급이 선행.
3. **Recraft** — 벡터/로고. 마케팅 SaaS 로서 차별점이 크다.
4. **Bria** — 상업 안전성. 회원에게 "저작권 안전" 을 내세울 수 있다.
5. **LTX-2** — 싸고 빠른 영상. 대량 생성 요금제에 유리.
6. 도구(Soul ID 류 캐릭터 일관성) — 모델보다 이게 체감 차이가 크다. 별도 기획 필요.

---

## 6. 이 문서의 한계

- 우리 목록은 코드에서 뽑아 **정확하다**.
- Weave·Higgsfield 목록은 **공개 자료 기준**이다. 제품 안에서 직접 세지 않았다.
  두 서비스 모두 모델을 자주 추가·교체하므로, 실제로 붙이기 전에 그 모델 하나만 다시 확인해야 한다.
- 가격은 조사 시점 공개값이다. 계약·지역에 따라 다르다.
- Sora 종료 일정은 검색 결과에 나온 것이라 **공식 공지로 재확인이 필요하다.**

## 참고

- [Figma Weave](https://www.figma.com/solutions/figma-ai-tool-weave/) · [Weave 이미지→영상](https://www.figma.com/solutions/ai-image-to-video-generator-weave/)
- [Higgsfield — 20+ 모델](https://higgsfield.ai/blog/free-unlimited-ai-video-generation-2026) · [Higgsfield 모델 비교](https://higgsfield.ai/blog/5-Best-AI-Video-Models-2026-Tested-Compared)
- [Alibaba Model Studio(Wan)](https://www.alibabacloud.com/en/product/modelstudio) · [LTX 개발자 콘솔](https://console.ltx.io/)
- [Recraft](https://www.recraft.ai/docs) · [Bria](https://bria.ai/pricing) · [Stability AI](https://platform.stability.ai/)
- [Hunyuan 3D APIs](https://www.tencentcloud.com/document/product/1284/75539) · [Rodin/Hyper3D](https://hyper3d.ai/blog/rodin-api-3d-generation)
