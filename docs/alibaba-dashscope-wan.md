<!-- 이 문서는 조사 결과다. 코드가 아니라 근거다.
     이 환경에서는 alibabacloud.com·help.aliyun.com 이 프록시에 막혀 직접 열지 못했다.
     그래서 1차 근거는 PyPI 의 공식 SDK(dashscope) 소스와 GitHub 상의 문서 축자 미러다.
     신뢰도 A/B/C 표기를 그대로 남겨 두었다 — C 는 코드에 상수로 박지 말 것.
     단가 숫자는 전부 미확정(C)이다. 실제 청구서를 보기 전에는 단가표에 넣지 않는다. -->

# 알리바바 DashScope (Wan / 만상) — 구현용 정리본

작성 기준: 4개 조사 각도 + 반박 검증 결과 통합. 원 조사가 알리바바 공식 도메인을 직접 열지 못했으므로(프록시 CONNECT 403), **1차 근거는 PyPI 의 공식 SDK `dashscope 1.26.5` 소스와 GitHub 상의 공식 문서 축자 미러**다.

신뢰도 표기:
- **A** = 공식 SDK 소스 + 문서 미러 양쪽에서 교차 확인 (그대로 코딩해도 됨)
- **B** = 문서 미러 원문만 (코딩 가능, 첫 실호출에서 확인)
- **C** = 2차 소스/추정 (코드에 상수로 박지 말 것)

---

## 0. 반박으로 뒤집힌 것 — 먼저 폐기할 8가지

| # | 폐기할 서술 | 정정값 | 왜 바뀌었나 (한 줄) |
|---|---|---|---|
| 1 | `/services/aigc/video-generation/video-synthesis` 가 "영상 생성 범용 경로" | **wan2.7 신 프로토콜 전용 경로**. 레거시 kf2v/s2v 는 `/services/aigc/image2video/video-synthesis` | 문서 원문에 "此接口为新版协议，仅支持wan2.7模型" 이 있고, kf2v 문서 curl 이 다른 경로를 쓴다 |
| 2 | 필수 헤더는 `Authorization` + `Content-Type` 2개 | **3개**. `X-DashScope-Async: enable` 이 POST 에 필수 | 같은 헤더 표의 세 번째 必选 행을 누락 — 빼면 `current user api does not support synchronous calls` 로 100% 실패 |
| 3 | `/api/v1/tasks/{id}` 는 "모든 비동기 모델 공용" | **일부 모델(部分模型: 이미지·영상 등) 공용**. Batch 는 `/compatible-mode/v1/batches/{batch_id}` 로 별개 | 문서 첫 문장이 "部分模型", 실제 반례로 Batch API 존재 |
| 4 | 권장 폴링 간격 15초 | **문서에 그런 문구 없음.** SDK 는 1초 시작 → 3스텝마다 2배 → **상한 5초** 백오프 | 문서 729줄 전체에 "轮询/polling/15" 0건, SDK 는 `wait_seconds=1, max_wait_seconds=5, increment_steps=3` |
| 5 | 태스크 취소는 `/tasks/{id}/cancel` (메서드 생략) | **POST** `/api/v1/tasks/{task_id}/cancel`, `PENDING` 상태만 가능 (그 외 HTTP 400 `UnsupportedOperation`) | 문서 curl 이 `-X POST`, 상태 제약도 명시 |
| 6 | 잘못된 키는 항상 `{"code":"InvalidApiKey","message":"Invalid API-key provided."}` | **본문 모양이 2종이고 엔드포인트로 결정되지 않는다.** 평평형 / OpenAI 봉투형이 같은 호스트에서 섞여 나온다. PascalCase 와 snake_case 는 **같은 오류의 별칭** | 공식 error-code 페이지 제목이 `401-InvalidApiKey/invalid_api_key` 로 슬래시 병기, `/compatible-mode/v1/models` 가 평평형을 반환한 실측 존재 |
| 7 | 없는 모델 → `Model.NotFound` (점 있음) | **`ModelNotFound` / `model_not_found`** (점 없음). `Model.NotFound` 는 DashScope 에 존재하지 않으며, 점 찍힌 `InvalidEndpointOrModel.NotFound` 는 **바이트댄스 Volcano Ark** 의 코드다 | 문서 미러 전체에 `Model.NotFound` 0건, 404 제목은 `404-ModelNotFound/model_not_found` |
| 8 | 영상 단가 축 = 해상도 / 이미지 단가 = 모델당 1줄 | 영상 단가 축은 **모델마다 다름**(해상도 \| 종횡비 \| 에디션 \| 없음). 이미지는 **모델 × 리전 × 일부 파라미터**(예: `prompt_extend`) | 같은 문단에 aspect ratio·edition 축이 병렬로 서술됨. `z-image-turbo` 는 `prompt_extend` 로 단가 2배 차이 |

추가 폐기: "무료 쿼터가 30~90일로 조정됐다" → **90일로 표준화**(2025-09-08 03:00 UTC 이후 최초 활성화, 싱가포르/국제판 한정. 그 이전 계정은 종전 유지). "30~90일" 은 변경 *전* 총론 문장이다.

---

## 1. 리전 / 호스트 — 반드시 분리

| 리전 | HTTP base | 상태 |
|---|---|---|
| 중국 본토(베이징) | `https://dashscope.aliyuncs.com/api/v1` | **A** (SDK `common/env.py` 기본값, `api_region` 기본 `cn-beijing`) |
| 국제(싱가포르) | `https://dashscope-intl.aliyuncs.com/api/v1` | **B** (문서 미러. SDK 에는 `dashscope-intl` 문자열이 **없다** — 환경변수 오버라이드로만 지정) |
| 미국(버지니아) | `https://dashscope-us.aliyuncs.com/api/v1` | **C**. `dashscope-us.aliyuncs.com/compatible-mode/v1` 만 error-code 문서에 확인됨. **video-synthesis 병기는 어느 문서에도 없다** |

- OpenAI 호환 base: `https://dashscope.aliyuncs.com/compatible-mode/v1` (**A**). 세그먼트는 `compatible-mode` — `openai/v1` 아님.
- WebSocket: `wss://dashscope.aliyuncs.com/api-ws/v1/inference` (**A**)
- 워크스페이스 전용 도메인(마이그레이션 권고, **기존 도메인은 계속 동작**):
  - `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
  - `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
  - `https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com` (독일은 이 형태만 존재)
  - 경로(`/api/v1/services/...`, `/api/v1/tasks/{id}`)는 도메인과 무관하게 동일.
- **베이징 / 싱가포르 / 버지니아는 API Key·엔드포인트·모델 목록이 완전히 분리**된다. 교차 호출은 인증 실패 또는 "모델 없음" 으로 떨어진다. 미국 리전은 일부 모델이 `-us` 접미사를 요구한다(예: `qwen-max-us`, `wan2.6-t2v-us`).
- SDK 오버라이드 환경변수: `DASHSCOPE_HTTP_BASE_URL`, `DASHSCOPE_WEBSOCKET_BASE_URL`, `DASHSCOPE_COMPATIBLE_BASE_URL`, `DASHSCOPE_API_REGION_ENV`, `DASHSCOPE_API_VERSION_ENV` (**A**)
- Python SDK `1.25.16` 미만이면 국제 base 지정 시 `url error, please check url!` 발생.

**URL 조립 규칙 (A, `api_entities/api_request_factory.py` + `constants.py SERVICE_API_PATH="services"`)**
```
{base}/services/{task_group}/{task}/{function}
```

---

## 2. 엔드포인트 — 글자 그대로

호스트만 바꿔 쓰면 되는 경로들(중국판 예시. 국제판은 `dashscope` → `dashscope-intl`):

### 영상
| 용도 | 메서드 + 경로 | 신뢰도 |
|---|---|---|
| wan2.7 신 프로토콜 (t2v/i2v/r2v 전부) | `POST /api/v1/services/aigc/video-generation/video-synthesis` | **A** |
| 레거시 t2v (2.1~2.6) | `POST /api/v1/services/aigc/video-generation/video-synthesis` | **B** (같은 경로에 본문 스키마만 다름) |
| 레거시 첫/끝프레임(kf2v) | `POST /api/v1/services/aigc/image2video/video-synthesis` | **B** |
| 립싱크(s2v) | `POST /api/v1/services/aigc/image2video/video-synthesis` | **B** |
| 레거시 i2v (`input.img_url`) 의 경로 | 미확정 — `video-generation` 인지 `image2video` 인지 문서 미러에서 확정 못 함 | **불확실** |

> SDK 근거(**A**): `dashscope/aigc/video_synthesis.py` 의 `VideoSynthesis(BaseAsyncApi)` 가 `task = "video-generation"`, 모듈명에서 `function = "video-synthesis"`, `task_group = "aigc"`.

### 이미지
| 용도 | 메서드 + 경로 | 신뢰도 |
|---|---|---|
| 레거시 t2i (wan2.5 이하) | `POST /api/v1/services/aigc/text2image/image-synthesis` | **A** (`ImageSynthesis`, task=`text2image`) |
| 이미지 편집 / i2i | `POST /api/v1/services/aigc/image2image/image-synthesis` | **A** (SDK `__get_i2i_task()` 가 모델명에 `imageedit` 또는 `wan2.5-i2i` 포함 시 task 를 `image2image` 로 스위치) |
| wan2.6/2.7 **동기** 호출 | `POST /api/v1/services/aigc/multimodal-generation/generation` | **A** (`ImageGeneration.sync_task="multimodal-generation"`) |
| wan2.6/2.7 **비동기** 호출 | `POST /api/v1/services/aigc/image-generation/generation` | **A** (`ImageGeneration.async_task="image-generation"`) |

### 태스크 관리 (이미지·영상 공용, "모든 비동기 모델" 아님)
| 용도 | 메서드 + 경로 | 신뢰도 |
|---|---|---|
| 단건 조회 | `GET /api/v1/tasks/{task_id}` | **A** |
| 목록 조회 | `GET /api/v1/tasks/` (`start_time`, `end_time`, `model_name`, `status`, `api_key_id`, `page_no`, `page_size`) | **A** |
| 취소 | `POST /api/v1/tasks/{task_id}/cancel` | **A** (`PENDING` 만 가능) |

- 위 3개 각각에 **20 QPS**, 아리윤 **주계정 단위**(서브계정 합산) 제한.
- `task_id` 및 결과 URL 보존 **24시간**. 이후 조회 시 `task_status: "UNKNOWN"`.
- SDK 는 조회 시 URL 의 `/api/` 를 `/api-task/` 로 치환한다(`http_request.py:145`) — 직접 HTTP 로 짤 때는 무시해도 되지만, SDK 로그와 대조할 때 헷갈리지 말 것.

### 텍스트(참고 — 키 검증 논의용)
`POST /api/v1/services/aigc/text-generation/generation` (**A**). 모델: `qwen-turbo`, `qwen-plus`, `qwen-max` (폐기: `qwen-v1`, `qwen-plus-v1`, `bailian-v1`, `dolly-12b-v2`)

---

## 3. 헤더 규칙

### 태스크 생성(POST) — 필수 3개
```
Content-Type: application/json
Authorization: Bearer sk-xxxx
X-DashScope-Async: enable
```
누락 시: `current user api does not support synchronous calls`

### 태스크 조회/취소(GET, POST cancel) — 필수 1개
```
Authorization: Bearer sk-xxxx
```
**조회에 `X-DashScope-Async` 를 붙이지 말 것.** SDK 도 `if self.async_request and self.query is False:` 조건으로 query 요청에는 붙이지 않는다.

### wan2.6/2.7 동기 호출(`multimodal-generation/generation`)
`X-DashScope-Async` **없음**. 1회 요청으로 결과 수신.

### 선택 헤더
- `X-DashScope-WorkSpace: {workspace_id}` (**A**, `base_api.py:563`)
- `X-DashScope-OssResourceResolve: enable` (**A**, 로컬 파일 업로드 시 SDK 가 자동 추가)
- 그 외 SDK 에 존재: `X-DashScope-SSE`, `X-DashScope-Plugin`, `X-DashScope-DataInspection`, `X-DashScope-EncryptionKey`

> SDK 가 실제로 보내는 값은 `Content-Type: application/json; charset=utf-8` 이고 `Accept: application/json; charset=utf-8` 도 함께 붙는다. 문서 표기(`application/json`)와 다르지만 둘 다 동작한다.

---

## 4. 모델 ID — 글자 그대로 (접두사 함정 주의)

### 영상
```
wan2.7 (신 프로토콜):
  wan2.7-t2v, wan2.7-t2v-2026-06-12, wan2.7-t2v-2026-04-25
  wan2.7-i2v, wan2.7-i2v-2026-04-25
  wan2.7-r2v, wan2.7-r2v-2026-06-12
wan2.6:  wan2.6-t2v, wan2.6-t2v-us, wan2.6-i2v, wan2.6-i2v-flash, wan2.6-i2v-us,
         wan2.6-r2v, wan2.6-r2v-flash
wan2.5:  wan2.5-t2v-preview, wan2.5-i2v-preview
wan2.2:  wan2.2-t2v-plus, wan2.2-i2v-plus, wan2.2-i2v-flash, wan2.2-kf2v-flash,
         wan2.2-s2v, wan2.2-s2v-detect, wan2.2-animate-move, wan2.2-animate-mix
wanx2.1: wanx2.1-t2v-turbo, wanx2.1-t2v-plus, wanx2.1-i2v-turbo, wanx2.1-i2v-plus,
         wanx2.1-kf2v-plus, wanx2.1-vace-plus
폐기(SDK deprecated): wanx-txt2video-pro (→wanx2.1-t2v-plus), wanx-img2video-pro (→wanx2.1-i2v-plus), wanx-kf2v
```
**접두사 규칙: 2.1 세대 = `wanx2.1-`, 2.2 이상 = `wan2.` (**A**, SDK `VideoSynthesis.Models` 상수와 일치)

### 이미지 — ★ 여기서 리전별 표기가 갈린다 (충돌 있음)
```
확정(가격표 미러): wan2.7-image, wan2.7-image-pro
   ⚠ wan2.7-t2i / wan2.7-i2i 라는 ID 는 존재하지 않는다 (가격표에 없고 코드 검색 0건)
wan2.6:  wan2.6-t2i, wan2.6-image
wan2.5:  wan2.5-t2i-preview, wan2.5-i2i-preview
wan2.2:  wan2.2-t2i-flash, wan2.2-t2i-plus
국제(싱가포르) 가격표 표기: wan2.1-t2i-plus, wan2.1-t2i-turbo        ← 'wanx' 아님
중국(베이징) 가격표 표기:   wanx2.1-t2i-plus, wanx2.1-t2i-turbo,
                            wanx2.0-t2i-turbo, wanx2.1-imageedit
구세대(SDK 상수):  wanx-v1, wanx-sketch-to-image-v1, wanx2.1-imageedit
기타:  qwen-image-edit, z-image-turbo, aitryon-parsing-v1
```
> **충돌 미해결**: image 각도의 문서 미러는 `wanx2.1-t2i-turbo` 를 그대로 쓰고, pricing 각도의 가격표 미러는 국제판에서 `wan2.1-t2i-turbo` 로 적는다. **국제판에 실제로 어느 쪽이 있는지는 실호출로만 확정 가능.** 구현 시 두 문자열을 모두 후보에 넣고 응답으로 판별할 것.

---

## 5. 요청 본문 스키마

### 5-1. wan2.7 t2v (신 프로토콜) — **B**
```json
POST /api/v1/services/aigc/video-generation/video-synthesis
{
  "model": "wan2.7-t2v-2026-04-25",
  "input": {
    "prompt": "...",                 // 필수, 최대 5000자
    "negative_prompt": "...",        // 선택, 최대 500자
    "audio_url": "https://.../x.mp3" // 선택, wav/mp3, 2~30초, 15MB 이하. 미제공 시 BGM 자동생성
  },
  "parameters": {
    "resolution": "720P",   // "720P" | "1080P", 기본 1080P
    "ratio": "16:9",        // 16:9(기본) | 9:16 | 1:1 | 4:3 | 3:4
    "duration": 15,         // 정수 [2,15], 기본 5
    "prompt_extend": true,  // 기본 true
    "watermark": true,      // 기본 false
    "seed": 123             // [0, 2147483647]
  }
}
```

### 5-2. wan2.7 i2v/r2v — **B**
```json
{
  "model": "wan2.7-i2v-2026-04-25",
  "input": {
    "prompt": "...",                                    // 선택
    "media": [                                          // 필수
      {"type": "first_frame", "url": "https://.../a.png"},
      {"type": "driving_audio", "url": "https://.../a.mp3"}
    ]
  },
  "parameters": { "resolution": "720P", "duration": 10, "prompt_extend": true, "watermark": true }
}
```
- `type` 허용값: `first_frame`, `last_frame`, `driving_audio`, `first_clip` (+ SDK `MediaType` 에는 `reference_image`, `reference_video`, `reference_voice`, `video` 도 존재)
- 허용 조합만: `first_frame` / `first_frame+driving_audio` / `first_frame+last_frame` / `first_frame+last_frame+driving_audio` / `first_clip` / `first_clip+last_frame`
- 각 type 은 배열 내 최대 1회
- `url` = 공개 HTTP(S) / `oss://dashscope-instant/...` / `data:image/png;base64,...`
- **i2v 에는 `ratio` 가 없다** (입력 이미지를 따름)

### 5-3. 레거시 t2v (2.1~2.6) — **B**
```json
{
  "model": "wan2.6-t2v",
  "input": { "prompt": "...", "audio_url": "..." },
  "parameters": { "size": "1280*720", "duration": 10, "prompt_extend": true, "shot_type": "multi" }
}
```
- **구분자는 `*` 이지 `x` 가 아니다.**
- 모델별 기본 size: `wan2.2-t2v-plus` = `1920*1080`, `wanx2.1-t2v-turbo` = `1280*720`, `wanx2.1-t2v-plus` = `1280*720`(720P만)
- `duration`: wan2.2-t2v-plus / wanx2.1-t2v-plus / wanx2.1-t2v-turbo 는 **5초 고정, 변경 불가**
- `shot_type` 은 wan2.6 전용 — wan2.7 에서는 무시됨(프롬프트로 서술)

### 5-4. 레거시 i2v / kf2v / s2v — 필드명이 전부 다르다 (**B**)
| 계열 | 이미지 필드 |
|---|---|
| 레거시 i2v | `input.img_url` (Base64 데이터 URI 허용), 템플릿은 `input.template` (예 `"flying"`) |
| kf2v (`/image2video/`) | `input.first_frame_url` + `input.last_frame_url` |
| s2v (`/image2video/`) | `input.image_url` (**`img_url` 아님**) + `input.audio_url`, `parameters.style: "speech"` |
| 레거시 r2v | `input.reference_urls[]` |

### 5-5. 레거시 t2i — **B**
```json
POST /api/v1/services/aigc/text2image/image-synthesis
{
  "model": "wanx2.1-t2i-turbo",
  "input": { "prompt": "...", "negative_prompt": "..." },
  "parameters": { "size": "1024*1024", "n": 4, "seed": 1, "prompt_extend": true, "watermark": false }
}
```
- `n`: 1~4, **기본 4** (장수만큼 과금 — 반드시 명시적으로 1 로 낮출 것)
- prompt 길이: wan2.5-t2i-preview 2000자 / wan2.2·2.1 계열 500자 / wanx2.0-t2i-turbo 800자
- size: 기본 `1024*1024`, 변 [512,1440], 최대 `1440*1440`

### 5-6. `wanx2.1-imageedit` — **B**
```json
POST /api/v1/services/aigc/image2image/image-synthesis
{
  "model": "wanx2.1-imageedit",
  "input": {
    "function": "description_edit",   // 필수
    "prompt": "...",                  // 필수, 800자 이내
    "base_image_url": "https://...",  // 필수, 공개 URL. URL 에 한글/중문 불가
    "mask_image_url": "https://..."   // description_edit_with_mask 일 때만 필수. Base64 불가
  },
  "parameters": { "n": 1, "seed": 1, "watermark": false }
}
```
`function` 허용값: `stylization_all`, `stylization_local`, `description_edit`, `description_edit_with_mask`, `remove_watermark`, `expand`, `super_resolution`, `colorization`, `doodle`, `control_cartoon_feature`
- 여기서는 `n` 기본이 **1** (t2i 의 4와 다름)
- 마스크: 흰색 RGB(255,255,255)=편집, 검정 RGB(0,0,0)=유지, base 와 동일 해상도

### 5-7. wan2.6/2.7 이미지 (신 프로토콜) — 구조가 chat 형식 (**B**)
```json
POST /api/v1/services/aigc/multimodal-generation/generation   // 동기
{
  "model": "wan2.6-t2i",
  "input": { "messages": [ { "role": "user", "content": [ { "text": "..." } ] } ] },
  "parameters": { "size": "1280*1280", "n": 1, "negative_prompt": "", "prompt_extend": true, "watermark": false }
}
```
- **핵심 차이: `negative_prompt` 가 `input` 이 아니라 `parameters` 로 이동.**
- 편집 시 `content` 배열에 `{"image": "https://..."}` 를 텍스트와 함께 넣는다.
- 권장 해상도: 1:1=`1280*1280`, 3:4=`1104*1472`, 4:3=`1472*1104`, 9:16=`960*1696`, 16:9=`1696*960`
- `wan2.6-image` 의 `enable_interleave`: false(기본, 편집 모드 — 참조 1~4장, n 1~4) / true(인터리브 — 참조 0~1장, n 반드시 1, `max_images` 1~5)
- `wan2.7-image*`: `size` = `1K`/`2K`(기본)/`4K`(pro 의 t2i 모드만), `reference_images` 0~9장, `enable_sequential`, `thinking_mode`, `bbox_list`, `color_palette`

---

## 6. 응답 스키마

### 6-1. 태스크 생성 성공
```json
{ "output": { "task_status": "PENDING", "task_id": "0385dc79-..." }, "request_id": "4909100c-..." }
```
### 6-2. 태스크 생성 실패 — **최상위** code/message
```json
{ "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-..." }
```
### 6-3. 영상 완료 조회
```json
{ "request_id": "...", "output": {
    "task_id": "...", "task_status": "SUCCEEDED",
    "submit_time": "2025-09-29 14:18:52.331", "scheduled_time": "...", "end_time": "...",
    "orig_prompt": "...",
    "video_url": "https://dashscope-result-sh.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx" },
  "usage": { "duration": 10, "output_video_duration": 10, "video_count": 1, "ratio": "16:9", "SR": 720 } }
```
- `video_url` 은 **SUCCEEDED 일 때만** 반환, **24시간 만료**, MP4/H.264 → **즉시 다운로드해 자체 스토리지로 옮길 것.**

### 6-4. 레거시 이미지 완료 조회 — 배열이다
```json
{ "output": { "task_status": "SUCCEEDED",
    "results": [ { "orig_prompt": "...", "actual_prompt": "...", "url": "https://...png" } ],
    "task_metrics": { "TOTAL": 1, "SUCCEEDED": 1, "FAILED": 0 } },
  "usage": { "image_count": 1 } }
```
- `actual_prompt` 는 `prompt_extend` 켰을 때만.
- **부분 실패**: `results[]` 안에 `{"code":"InternalError.Timeout","message":"..."}` 가 섞여 오고, 한 장이라도 성공하면 `task_status` 는 SUCCEEDED. → 반드시 항목별로 `url` 유무를 검사할 것.
- 전체 실패 시 `output` 레벨에 code/message + `task_status: "FAILED"`.

### 6-5. wan2.6/2.7 이미지 응답 — 완전히 다르다
```json
{ "output": { "choices": [ { "finish_reason": "stop", "message": {
      "content": [ { "image": "https://...png?Expires=xxx", "type": "image" } ], "role": "assistant" } } ],
    "finished": true },
  "usage": { "image_count": 1, "size": "1280*1280" }, "request_id": "..." }
```
→ `results[].url` 이 아니라 **`choices[0].message.content[].image`**.

### 6-6. task_status 열거값
`PENDING` → `RUNNING` → `SUCCEEDED` | `FAILED`, 그 외 `CANCELED`, `UNKNOWN`(없거나 24시간 만료)
> 주의: 단건 조회 응답 문서의 열거에는 `CANCELED` 가 빠져 있고 배치 조회 쪽에만 등장한다. 파서는 6개 모두 받아야 한다.

### 6-7. 오류 위치가 두 곳이다 — 반드시 둘 다 볼 것
| 상황 | 위치 |
|---|---|
| 태스크 **생성** 실패 | 최상위 `code` / `message` |
| 태스크 **실행** 실패 | `output.code` / `output.message` |
| OpenAI 호환 모드 | `error.code` / `error.message` (+ 최상위 `request_id` 동반) |
| 이미지 **부분** 실패 | `output.results[i].code` / `.message` |

---

## 7. 오류 코드 파싱 규칙 (구현 필수)

### 7-1. 본문 모양 2종 — **엔드포인트로 결정되지 않는다**
```
평평형:  { "code": "InvalidApiKey", "message": "...", "request_id": "..." }
봉투형:  { "error": { "message": "...", "type": "...", "param": null, "code": "..." }, "request_id": "..." }
```
- `/compatible-mode/v1` 도 어느 계층이 거절했는지에 따라 **평평형을 반환**한다 (실측: `token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/models` → `{"code":"InvalidApiKey","message":"No API-key provided."}`)
- 봉투형 안에 PascalCase 가 들어오기도 한다 (공식 예시: `'code':'Arrearage', 'param':None, 'type':'Arrearage'`)
- `request_id` 는 네이티브 전용이 아니다.

### 7-2. PascalCase / snake_case 는 **같은 오류의 별칭**
공식 error-code 페이지 제목이 슬래시로 병기:
```
401-InvalidApiKey/invalid_api_key
403-AccessDenied/access_denied
404-ModelNotFound/model_not_found
400-DataInspectionFailed/data_inspection_failed
429-Throttling.AllocationQuota/insufficient_quota
500-InternalError/internal_error
```
snake_case 단독 등재도 있음: `400-invalid_request_error`, `400-invalid_value`

### 7-3. 권장 파서
```js
function normErr(parsed) {
  const raw = (parsed && (parsed.code || parsed.error?.code || parsed.output?.code)) || "";
  const msg = (parsed && (parsed.message || parsed.error?.message || parsed.output?.message)) || "";
  return {
    raw,
    key: String(raw).toLowerCase().replace(/[._-]/g, ""),  // InvalidApiKey / invalid_api_key → "invalidapikey"
    msg: String(msg),
  };
}
```
**메시지는 절대 완전일치(===)로 비교하지 말 것** — 접미 안내 URL(`For details, see: https://help.aliyun.com/zh/model-studio/error-code#apikey-error`)과 끝 공백(`"Incorrect API key provided. "`)이 붙는다.

### 7-4. 실제 관측된 401 두 문자열
```
네이티브:  401 { "code":"InvalidApiKey", "message":"Invalid API-key provided." }
           401 { "code":"InvalidApiKey", "message":"No API-key provided." }
호환모드:  401 { "error": { "message":"Incorrect API key provided. ",
                            "type":"invalid_request_error", "param":null,
                            "code":"invalid_api_key" } }
```

### 7-5. 코드 → 의미 매핑 (겹침 주의)
| 상황 | 나올 수 있는 코드 |
|---|---|
| 키 무효/지역 불일치 | `401 InvalidApiKey` \| `401 invalid_api_key` |
| 모델 부재 | `404 ModelNotFound` \| `404 model_not_found` \| `400 InvalidParameter`("Model not exist.") |
| 호환 모드 미지원 모델 | `404 model_not_supported` |
| 권한/미개통 | `403 AccessDenied.Unpurchased` \| `403 Model.AccessDenied` \| `403 AllocationQuota.FreeTierOnly` \| `429 CommodityNotPurchased` \| **호환 모드에서는 `400 invalid_parameter_error`("The product is not activated...")** |
| 엔드포인트/모델 종류 불일치 | `400 InvalidParameter` + `url error, please check url！` (**네이티브 경로에서만**. 구버전 SDK 도 같은 메시지) |
| 연체 | `400 Arrearage` |
| 레이트리밋 | `429 Throttling.RateQuota`(RPM) \| `429 Throttling.AllocationQuota`(TPM) \| `insufficient_quota` |
| 지재권 차단 | `400 IPInfringementSuspect` |
| 취소 불가 상태 | `400 UnsupportedOperation` |

**★ 핵심: `404 ModelNotFound` 의 대표 메시지가 "The model xxx does not exist **or you do not have access to it.**" 라서 "모델 부재" 와 "권한 없음" 은 코드만으로 원리적으로 분리 불가.** 탐침 해석은 반드시 리전·호출 모드를 고정한 상태에서 해야 한다.

---

## 8. 폴링 전략

문서에 권장 간격은 없다. **SDK 구현(A)을 그대로 따를 것**:
```
wait = 1s, 3회마다 ×2, 상한 5s
→ 1,1,1, 2,2,2, 4,4,4, 5,5,5, ...
```
- 영상 생성은 통상 1~5분, 레거시 t2i 는 1~3분, 이미지 편집은 5~15초.
- 조회 엔드포인트 20 QPS(계정 단위) — 동시 태스크가 많으면 폴링 자체가 429 를 유발할 수 있다.
- 고빈도 조회가 필요하면 문서가 비동기 콜백을 권하지만, **콜백 규격은 확보 못 함**(§11 참조).

---

## 9. 과금 모델

### 영상 (**A**, 공식 문서 원문)
```
Cost = Video unit price × Video duration (seconds)
```
- **입력 무과금, 출력만 과금.** 성공 생성된 초 수만 계산.
- 5초/10초에 별도 단가가 있는 게 아니라 같은 초당 단가 × 초 수.
- **초당 단가를 가르는 축은 모델마다 다르다**:
  - (a) 해상도별 (480P/720P/1080P) — "Some models"
  - (b) 종횡비별 (1:1 / 3:4 등) — 예: EMO 10초 1:1 ≈ USD 0.11, 30초 3:4 ≈ USD 0.69
  - (c) 에디션별 (Standard / Professional)
  - (d) 축 없음
- → **단가표 스키마는 `모델 × variantAxis({resolution|aspectRatio|edition|none}) × variant → 단가` + 초** 형태여야 한다. "모델 × 해상도" 2차원 표로 만들면 EMO 계열을 표현할 수 없다.

### 이미지 (**B**, model-pricing 페이지 미러)
```
Cost = Image unit price × Number of images generated
Cost does not depend on image resolution or aspect ratio.
```
그러나 **"모델당 1줄" 로는 안 된다**. 최소 키: `[모델 ID × 리전(deployment scope) × 일부 파라미터]`
- `z-image-turbo`: `prompt_extend=false` $0.015/장, `prompt_extend=true` $0.03/장 (중국 ¥0.01434 / ¥0.02868) — **2배**
- 리전차: `wan2.2-t2i-plus` $0.05(SG) vs $0.020070(BJ), `wan2.2-t2i-flash` $0.025 vs $0.028671(중국이 더 비쌈), `qwen-image-edit` $0.045 vs $0.043, `wan2.7-image-pro` $0.075 vs $0.068761, `wan2.6-t2i` $0.03 vs $0.028671
- 과금 방향 예외: `aitryon-parsing-v1` 은 **출력 무료 / 입력 이미지 장수 과금**($0.000574/장)

### 공통 (**A**)
- **실패한 호출은 과금되지 않고 무료 쿼터도 차감하지 않는다.** (`Failed calls and processing errors do not incur charges or consume your free quota`)
- 과금은 `task_status == SUCCEEDED` 기준. PENDING 접수만으로는 과금되지 않는다.
- 무료 쿼터: **싱가포르 리전 + service deployment scope = International 모델만**, **90일**, 계정당 1회(2025-09-08 03:00 UTC 이후 최초 활성화 기준. 그 이전 활성화 계정은 종전 유효기간 유지).
- 통화 분리: 국제판 USD(`alibabacloud.com/help/en/model-studio/model-pricing`), 중국판 CNY(`help.aliyun.com/zh/model-studio/model-pricing`) — **별도 문서**.

### 단가 숫자 — 전부 미확정 (**C**, 코드에 박지 말 것)
| 항목 | 후보값들 |
|---|---|
| 국제 영상 720P/초 | $0.084 / $0.086012 / $0.10 / $0.14 (최대 1.7배 차이) |
| 국제 영상 1080P/초 | $0.108 / $0.143353 / $0.15 / $0.18 |
| 중국 wan2.6 | 문생도 ¥0.2/장, 영상 720P ¥0.6/초, 1080P ¥1/초 (2차 소스 3건 일치) |
| 중국 wan2.6 무료 | 문생도 50장 / 영상 50초, 개통 후 90일 |
| 국제 영상 무료 | "10 seconds per 90 days" (검색 요약 2회) |
| 480P | **어느 소스에도 숫자 없음** |

---

## 10. ★ 생성 없이 키 살아 있는지 확인하는 방법 (안전한 순서)

### 원칙
1. **판정은 "인증이 통과했는가" 이지 "요청이 성공했는가" 가 아니다.** 401(`invalidapikey`)만 "키 죽음" 이고, 400/403/404/429 는 전부 "키는 살아 있고 다른 이유로 거절" 이다.
2. **intl / cn 두 호스트를 모두 찔러야 한다.** 리전 분리 때문에 **"한쪽 200, 한쪽 401" 이 정상 결과**다. **양쪽 다 401 이라야 키가 죽은 것.**
3. **trufflehog 방식(실제 `qwen-turbo` 생성 POST)은 절대 채택 금지** — 유효 키면 토큰이 실제로 소모된다.

---

### 방법 1 — 태스크 조회에 날조 ID (가장 안전, 기본값으로 채택)
```http
GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/00000000-0000-0000-0000-000000000000
Authorization: Bearer {KEY}
```
- **GET 이고 생성 파이프라인을 건드리지 않는다.** 헤더는 `Authorization` 하나만. `Content-Type` / `X-DashScope-Async` 붙이지 말 것.
- 판정:
  - `401` + `invalidapikey` → **이 리전에서 키 거부**
  - `200` + `task_status: "UNKNOWN"` → **키 유효** (문서상 만료 태스크 응답과 동일 형태)
  - `400 InvalidParameter` / `404` → **키 유효** (형식/부재 문제이므로 인증은 통과)
  - `403 *AccessDenied*` / `400 Arrearage` / `429 Throttling.*` → **키 유효, 다만 계정 상태 이상** — 별도 상태로 보고할 것
- 미확정 리스크: "존재한 적 없는 task_id" 의 정확한 응답이 (200 UNKNOWN / 404 / 400) 중 무엇인지 문서로 확정 못 함. **다만 어느 쪽이든 401 과 구분되므로 liveness 판정에는 영향 없다.**
- 20 QPS 제한 대상이므로 헬스체크 주기를 초당 1회 이상으로 올리지 말 것.

### 방법 2 — OpenAI 호환 모델 목록 (교차 확인용, 리전 판별에도 유용)
```http
GET https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models
Authorization: Bearer {KEY}
```
- 토큰을 생성하지 않는 조회. 유효 키로 200 이 관측됨(**C** — 서드파티 관측, 공식 레퍼런스 미확인).
- `GET /api/v1/models` 도 200 이 관측됨(**C**).
- 부가 이득: 200 이면 응답 목록으로 **이 키가 어느 리전/어느 모델에 접근 가능한지** 를 그대로 알 수 있다. §4 의 `wan2.1-t2i-turbo` vs `wanx2.1-t2i-turbo` 충돌도 여기서 실측으로 해소된다.
- 이 경로가 **평평형 401** 을 돌려준 실측이 있으므로 파서는 §7-3 을 반드시 적용.

### 방법 3 — 없는 모델 ID 로 제출 (조건부, 기본 off)
```http
POST {host}/api/v1/services/aigc/video-generation/video-synthesis
Authorization: Bearer {KEY}
Content-Type: application/json
X-DashScope-Async: enable

{"model":"__probe_nonexistent__","input":{"prompt":"probe"},"parameters":{}}
```
- 존재하지 않는 모델이므로 큐에 들어갈 수 없다. `404 ModelNotFound|model_not_found` 또는 `400 InvalidParameter`("Model not exist.") 가 나오면 키 유효.
- 방법 1·2 보다 위험한 이유: POST 이고, "검증이 큐 적재보다 먼저 돈다" 는 전제에 의존한다(문서 미확인).
- **2xx 가 나오면 즉시 경보** — 접수됐다는 뜻이므로 `POST /api/v1/tasks/{task_id}/cancel` 로 취소하고 콘솔 사용량을 확인할 것.

### 방법 4 — 실존 모델 + 필수값 누락 (가장 위험, 사람 승인 하에만)
`{"model":"wan2.7-t2v","input":{},"parameters":{}}` 로 "그 모델이 이 계정/리전에 있는가" 를 확인.
- "모델 없음" 계열 오류 → 모델 부재 / "prompt 가 없다" 계열 → 모델 존재.
- **하지만 §7-5 대로 부재와 무권한은 코드로 분리되지 않는다.** 그리고 검증-큐 순서가 문서로 확인되지 않았으므로 **돈이 나갈 수 있는 유일한 자리**다. 현재 repo 가 `&models=1` 게이트 뒤에 두고 기본 off 로 둔 설계가 옳다 — 유지할 것.

### 판정 로직 (그대로 구현 가능)
```js
const DEAD = new Set(["invalidapikey", "unauthorized", "authenticationerror"]);
const ALIVE_BUT_BLOCKED = /accessdenied|arrearage|throttling|insufficientquota|commoditynotpurchased|allocationquota/;

function verdict(status, parsed) {
  const { key, msg } = normErr(parsed);
  if (status === 401 || DEAD.has(key)) return "KEY_REJECTED";        // 이 리전에서 죽음
  if (status === 403 || ALIVE_BUT_BLOCKED.test(key)) return "KEY_OK_BLOCKED"; // 키는 살아있음
  if (status === 0) return "UNREACHABLE";                             // 네트워크 — 판정 불가
  return "KEY_OK";                                                    // 200/400/404/429 전부 인증 통과
}
// 최종: intl·cn 결과를 합쳐서 —
//   둘 다 KEY_REJECTED           → 키 죽음
//   한쪽이라도 KEY_OK/BLOCKED    → 키 살아있음 + 그 리전이 이 키의 홈
//   둘 다 UNREACHABLE            → 판정 불가 (죽음으로 보고하지 말 것)
```

### 부수 단서
- 키 접두사로 종류를 구분할 수 있다: `sk-` = 일반 키, `sk-sp-` = Token Plan 키. 잘못된 짝을 쓰면 방향에 따라 다른 401 문자열이 나온다(`sk-` → Token Plan 엔드포인트 = `Incorrect API key provided`, `sk-sp-` → 표준 dashscope = `InvalidApiKey`).
- **401 문자열로 "엔드포인트를 잘못 골랐는지" 를 판정하지 말 것.** base URL 을 고정해 두고 별도로 검증하는 방식이어야 한다.

---

## 11. 현재 repo 에 바로 걸리는 수정 지점

`/home/user/kiwi-keyword-analyzer/functions/api/generate.js`

| 위치 | 문제 | 수정 |
|---|---|---|
| **2361행** `if (r.status === 404) return r.검사 + " → 경로 없음(404) · 이 엔드포인트가 아니다";` | 404 를 무조건 "경로 없음" 으로 단정하고 **2371행의 모델 판별 분기보다 먼저 return** 한다. 진짜 `404 ModelNotFound` 를 경로 문제로 오독함. (아이러니하게 2371행 정규식엔 이미 올바른 `ModelNotFound` 가 있는데 도달 불가) | 404 는 body 의 code 를 먼저 보고 `ModelNotFound` / `model_not_found` / `model_not_supported` 면 "모델 없음", 아니면 "경로 없음" 으로 분기 |
| **2306-2307행** `parsed.code \|\| parsed.error?.code` | 두 위치를 보는 것까지는 옳으나 **정규화가 없다** | `.toLowerCase().replace(/[._-]/g,"")` 정규화 후 비교 (§7-3). `output.code` 도 추가할 것 |
| **2350행 부근** `X-DashScope-Async: enable` 를 POST 에만 붙임 | 이 부분은 **올바르다** (조회 GET 에는 안 붙임). 유지 | — |
| **2287-2297행 MODEL_CANDIDATES** | `wanx2.1-t2i-turbo`, `wanx2.1-imageedit` 를 **intl 호스트에도** 던진다. 두 ID 는 중국(베이징) 표기. 또 `wan2.6-t2i` / `wan2.5-t2i-preview` 를 `text2image/image-synthesis` 로 고정 — 2.6 은 **신 프로토콜**(`multimodal-generation/generation` 또는 `image-generation/generation`) | intl 후보에 `wan2.1-t2i-turbo`, `wan2.5-i2i-preview` 추가(양쪽 표기 모두 후보로 둘 것), 2.6/2.7 계열은 신 프로토콜 경로로 분기 |
| **2273-2277행 PATHS** | `video-generation/video-synthesis` 만 두었다. 레거시 kf2v/s2v 경로 누락 | `/api/v1/services/aigc/image2video/video-synthesis` 추가, `/api/v1/services/aigc/multimodal-generation/generation`, `/api/v1/services/aigc/image-generation/generation` 추가 |
| **2325행 TASK_PROBE** | 설계 자체는 **가장 안전한 방법(§10 방법 1)** 이라 옳다. 다만 `Content-Type` 이 GET 에도 붙는다(2313행 `H` 재사용) | GET 용 헤더를 `{Authorization}` 만으로 분리 |
| — | 방법 2(모델 목록 조회) 탐침이 없다 | `GET {host}/compatible-mode/v1/models` 와 `GET {host}/api/v1/models` 를 추가하면 리전 판별 + 실제 사용 가능 모델 목록을 생성 없이 확보 가능 |
| `docs/model-gap-weave-higgsfield.md:73` | 과거 조사값 `~$0.105/초` 가 버전·해상도·리전 표기 없이 적혀 있다 | 단가표에 그대로 쓰지 말 것 (§9 참조) |

---

## 12. 아직 모르는 것 — 실제 키를 넣고 찔러 봐야 확정되는 목록

### 최우선 (구현 차단 요소)
1. **날조된 task_id 조회의 정확한 응답** — `200 + UNKNOWN` / `404` / `400 InvalidParameter` 중 무엇인가. 헬스체크 판정 로직의 기반이므로 첫 실호출에서 반드시 기록할 것.
2. **`GET /compatible-mode/v1/models` 와 `GET /api/v1/models` 가 실제로 200 을 주는가**, 응답 스키마가 OpenAI 형식(`{"object":"list","data":[...]}`)인가. 공식 레퍼런스 페이지를 못 찾았다.
3. **우리 키가 어느 리전인가** (Beijing / Singapore / US-Virginia). 이게 정해지지 않으면 통화도 단가도 모델 ID 표기도 전부 미정. → §10 방법 1+2 를 양쪽 호스트에 돌리면 즉시 확정된다.
4. **이미지 모델 ID 표기 충돌**: 국제판이 `wan2.1-t2i-turbo` 인가 `wanx2.1-t2i-turbo` 인가. 문서 미러와 가격표 미러가 서로 다르게 적는다.
5. **리전별 모델 가용성 표.** `wan2.7-t2v` / `wan2.2-t2v-plus` / `wanx2.1-i2v-turbo` 등이 국제판에 실제로 있는가. 문서는 "모델·엔드포인트·키가 동일 리전이어야 한다" 고만 말한다.

### 과금 (금액이 걸린 것)
6. **국제판 영상 초당 USD 정가** — 후보 4개가 최대 1.7배 차이. 콘솔 가격 페이지 또는 실제 청구서로만 확정 가능.
7. **480P 단가** — 어느 소스에도 숫자가 없다. 480P 를 지원하는 모델 목록도 미확정.
8. **과금 초 계산이 올림인가 반올림인가** (3.4초 요청 → 3초? 4초?).
9. **wan2.6 의 `min(10, duration)` 과금 상한이 실재하는가**, 아니면 단순히 최대 길이 10초 서술의 오독인가.
10. **접수(200 PENDING) 후 FAILED 로 끝난 태스크의 과금 여부가 모델별로 동일한가.** 이미지는 "실패 무과금" 이 명시되지만 영상·콘텐츠 심사 거절 케이스는 미확인.
11. **태스크 조회(GET /tasks/{id}) 자체가 무과금인가** — 명시 문장을 못 찾았다. (추론상 무료지만 근거는 없다)
12. **현재 프로모션 할인(40% OFF 등)의 대상 모델과 종료일.** 프로모션가를 단가표 기준으로 삼으면 종료 시 역마진.
13. **국제판 무료 쿼터의 실제 값** — 영상 "90일당 10초" 는 중신뢰, 이미지 쪽은 전혀 모름.

### 프로토콜 세부
14. **"파라미터 검증이 큐 적재보다 먼저 도는가"** — 방법 3/4 탐침의 안전성이 여기 달려 있다. 문서로 확인 불가. 첫 시도는 콘솔 사용량을 열어 둔 채로 할 것.
15. **레거시 i2v(`input.img_url`) 의 정확한 경로** — `video-generation` 인지 `image2video` 인지.
16. **`wan2.7-t2v` 같은 날짜 없는 별칭과 `wan2.7-t2v-2026-06-12` / `-2026-04-25` 스냅샷의 관계.** 별칭이 항상 최신인가, 두 스냅샷이 동시에 유효한가. 두 문서 스냅샷이 서로 다른 날짜를 예시로 쓴다.
17. **`actual_prompt` 필드가 영상 응답에도 오는가.** 공식 영상 문서 4종의 응답 표에는 `orig_prompt` 만 있고, 3rd party 구현체에만 `actual_prompt` 가 있다.
18. **비동기 콜백(async task callback) 규격.** 문서가 링크만 걸고 페이지는 확보 못 함.
19. **국제판에서 `image2video` 경로(kf2v/s2v)가 동일하게 제공되는가.** 관련 문서 스냅샷이 베이징 URL 만 예시로 든다.
20. **필수 파라미터(prompt) 누락 시의 정확한 code 문자열.** `InvalidParameter` 로 추정하나, `InternalError.Algo.InvalidParameter` 같은 접두 형태가 서드파티에서 관측된다.
21. **401 응답에 `request_id` 가 항상 포함되는가.** 호환 모드에서는 관측됐지만 네이티브 401 은 케이스에 따라 갈린다.
22. **429 에 `Retry-After` 헤더나 잔여 쿼터 헤더가 붙는가.** 문서는 "약 60초 후 회복" 서술만.
23. **레거시 경로의 QPS / 동시 태스크 수 제한이 wan2.5/2.6 에서 얼마인가.** 미러 문서는 wanx2.x 기준(QPS 2, 동시 2)만 담고 있다.
24. **wan2.6/2.7 의 `1K`/`2K`/`4K` 축약 문자열이 레거시 `image-synthesis` 경로에서도 통하는가.**
25. **워크스페이스 전용 도메인(`{WorkspaceId}.*.maas.aliyuncs.com`)이 지금 우리 계정에서 동작하는가**, 그리고 `{WorkspaceId}` 값은 콘솔 어디서 얻는가.

### 문서 원문 재확인이 필요한 것 (사람이 브라우저로)
26. 조사 전체가 프록시 차단(CONNECT 403) 하에서 이뤄져 **알리바바 공식 페이지를 한 번도 직접 열지 못했다.** 아래 5개는 배포 전 사람이 직접 대조할 것:
- `https://www.alibabacloud.com/help/en/model-studio/model-pricing`
- `https://help.aliyun.com/zh/model-studio/model-pricing`
- `https://www.alibabacloud.com/help/en/model-studio/error-code`
- `https://help.aliyun.com/zh/model-studio/error-code#apikey-error`
- Wan 영상/이미지 API 레퍼런스 4종 (t2v 신·구, i2v 신·구)
---

## 부록 A. 운영 키로 실제 재 본 결과 (실측 · 근거 등급 **A**)

위 본문은 조사(문서·SDK 소스)다. 아래는 **운영 콘솔에 들어온 `alibaba_API_KEY` 로 실제 두들겨 본 결과**다.
생성은 한 번도 걸지 않았다 — 조회와 "없는 모델 이름으로 제출" 뿐이라 돈이 나가지 않는다.
재현: `GET /api/generate?diag=alibaba` (관리자 전용)

### A-1. 키와 리전

| 항목 | 실측 |
|---|---|
| 키 지문 | `sk-ws-…3dUg` (115자 — 워크스페이스 스코프 키) |
| `dashscope-intl.aliyuncs.com` (싱가포르) | **유효** — 모든 조회 200 |
| `dashscope.aliyuncs.com` (베이징) | **401** 전부 |

본문 §0-6 이 맞았다. 같은 401 인데 본문 모양이 두 가지로 왔다 —
`/compatible-mode/` 는 봉투형 `{"error":{"code":"invalid_api_key"}}`,
네이티브는 평평형 `{"code":"InvalidApiKey"}`. 한 모양만 파싱했으면 절반을 놓쳤다.

**→ 붙일 때 베이징 호스트는 아예 쓰지 않는다.** 이 키로는 안 된다.

### A-2. 엔드포인트 경로 — 5개 전부 살아 있다

없는 모델 이름으로 제출했더니 5개 경로 **전부** `400 InvalidParameter · "Model not exist."`.
404 가 하나도 없다 = 경로도 인증도 다 맞고, 내가 넣은 가짜 이름만 거절당했다.

| 경로 | 응답 |
|---|---|
| `/api/v1/services/aigc/video-generation/video-synthesis` | 400 Model not exist. |
| `/api/v1/services/aigc/image2video/video-synthesis` | 400 Model not exist. |
| `/api/v1/services/aigc/text2image/image-synthesis` | 400 Model not exist. |
| `/api/v1/services/aigc/image2image/image-synthesis` | 400 Model not exist. |
| `/api/v1/services/aigc/image-generation/generation` | 400 Model not exist. |

`/api/v1/tasks/<없는 UUID>` → **200** `{"task_status":"UNKNOWN"}`. 본문 §0-3 예측대로다.

### A-3. 이 키로 잡히는 모델 (총 234개 중)

**Wan 영상 27개**

```
wan2.7-t2v · wan2.7-t2v-2026-04-25 · wan2.7-t2v-2026-06-12
wan2.7-i2v · wan2.7-i2v-2026-04-25 · wan2.7-r2v · wan2.7-r2v-2026-06-12 · wan2.7-videoedit
wan2.6-t2v · wan2.6-i2v · wan2.6-i2v-flash · wan2.6-r2v · wan2.6-r2v-flash
wan2.5-t2v-preview · wan2.5-i2v-preview
wan2.2-t2v-plus · wan2.2-i2v-plus · wan2.2-i2v-flash · wan2.2-kf2v-flash · wan2.2-animate-mix · wan2.2-animate-move
wan2.1-t2v-plus · wan2.1-t2v-turbo · wan2.1-i2v-plus · wan2.1-i2v-turbo · wan2.1-kf2v-plus · wan2.1-vace-plus
```

**Wan 이미지 10개**

```
wan2.7-image · wan2.7-image-pro · wan2.6-image · wan2.6-t2i
wan2.5-t2i-preview · wan2.5-i2i-preview
wan2.2-t2i-plus · wan2.2-t2i-flash · wan2.1-t2i-plus · wan2.1-t2i-turbo
```

**같은 키로 덤으로 잡히는 것** — 알리바바만 붙이면 이것들도 같이 들어온다

- 이미지: `qwen-image-3.0-pro` · `qwen-image-2.0-pro` · `qwen-image-max` · `qwen-image-edit-max` · `z-image-turbo` 등 19개
- 영상: `happyhorse-1.1-t2v / i2v / r2v` 등 7개

> ⚠ 분류에서 한 번 새었다. `r2v`(참조 이미지 → 영상) 4개가 이름에 `t2v/i2v` 가 없어서
> 영상에도 이미지에도 안 걸렸다. 오류는 안 나고 그냥 안 보인다 —
> 지금은 `wan_미분류` 칸을 따로 두어 새면 눈에 띄게 했다.

### A-4. 아직 확인 못 한 것

| 질문 | 왜 못 했나 |
|---|---|
| 모델별 **실제 단가** | 본문 §8 그대로 미확정. 같은 720p 1초가 출처마다 1.7배 갈린다. 콘솔 가격표를 보기 전엔 `MODEL_COST` 에 넣지 않는다 |
| 모델별 **개통 여부**(목록에 있어도 권한이 없을 수 있다) | 확인하려면 실존 모델 이름으로 POST 해야 한다 = 접수될 수 있다. `&models=1` 로 사람이 켤 때만 돈다 |
| **취소 API** 동작 | 태스크를 만들어야 취소해 볼 수 있다. 생성 없이는 확인 불가 |

---

## 부록 B. 내가 틀렸던 것 — 파라미터 검사는 큐 **뒤**에 돈다 (실측 · **A**)

부록 A 를 쓰고 나서 "돈 안 쓰고 개통 여부까지 보는" 방법을 하나 더 만들었다.
**실존 모델 이름 + 필수값 전부 뺌** → 값 검사에서 그 자리에서 죽으니 아무것도
안 만들어진다, 는 전제였다. 근거는 우리 실측이었다 — 없는 **모델 이름** 으로
보냈을 때 `400 Model not exist.` 가 그 자리에서 왔고 `task_id` 는 안 왔다.

**전제가 틀렸다.** DashScope 는 두 검사를 다른 자리에서 한다.

| 무엇을 틀리게 보냈나 | 언제 걸리나 | 태스크가 생기나 |
|---|---|---|
| 모델 **이름** 이 없는 것 | 제출 즉시 `400` | 안 생긴다 |
| **파라미터**(prompt 등) 누락 | **큐에 들어간 뒤** | **생긴다** (`200` + `task_id` → 나중에 `FAILED`) |

운영 실측(5건 전부):

```
POST … {model:"wan2.7-t2v", input:{}}     → 200 {"task_id":"84d9831c-…"}
GET  /api/v1/tasks/84d9831c-…             → FAILED · "Field required: input.prompt"
POST /api/v1/tasks/84d9831c-…/cancel      → 400 UnsupportedOperation
                                             "please confirm if the task is in PENDING status"
```

취소도 못 걸었다. 제출 직후(수십 ms) 걸었는데도 이미 PENDING 을 지나 있었다.
**즉 "접수되면 취소해서 되돌린다" 는 안전장치는 이 제공사에서 작동하지 않는다.**

### 그래서 얻은 것과 치른 것

- **얻음**: 5개 모델(`wan2.7-t2v` · `wan2.7-i2v` · `wan2.7-r2v` · `wan2.7-image-pro` ·
  `wan2.6-t2i`)이 전부 접수됐다 = **이 키로 열려 있다.** 개통 확인은 됐다.
- **치름**: 실제 태스크 5건. 파라미터 오류로 실패했으니 계산은 안 돌았고 과금도
  없어야 하지만, **"없어야 한다" 와 "없다" 는 다르다.** 청구는 콘솔이 정답이다.

### 덤으로 알게 된 것 — 필수 필드 이름

실패 메시지가 각 모델의 필수 입력을 그대로 알려 줬다. 연동할 때 그대로 쓴다.

| 모델 | 필수 |
|---|---|
| `wan2.7-t2v` | `input.prompt` |
| `wan2.7-r2v` | `input.media` + `input.prompt` |
| `wan2.7-image-pro` · `wan2.6-t2i` | `input.messages` ← t2i 인데 messages 다. 대화형 스키마 |

### 남긴 조치

- `models=1` 은 기본으로 안 돈다. `&confirm=creates-tasks` 를 같이 줘야 한다.
- 만든 태스크의 최종 상태는 `?diag=alibaba&task=<id>,<id>` 로 본다(조회는 무료).
- 검사(`scripts/alibaba-diag.test.mjs`)가 이 가드를 붙잡는다 — 빼면 실패한다.
