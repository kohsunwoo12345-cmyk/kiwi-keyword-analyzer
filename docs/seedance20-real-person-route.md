# 씨댄스 2.0 에 실사 인물 사진을 넣는 공식 통로

> ⚠ 앞선 판단 정정 — 나는 예전에 "실인물 자산 통로는 이 계정에 없다" 고 보고했다. **그건 틀렸다.**
> 그때 나는 API 주소를 여러 개 지어내어 Bearer 키로 찔러 보고, 전부 대조군과 같은 답이 오길래
> "그런 통로가 없다" 고 결론지었다. 실제로는 그 기능이 **API 주소가 아니라 콘솔 기능**이고,
> **별도 권한을 먼저 열어야 메뉴 자체가 보인다.** 지어낸 주소로는 영원히 못 찾을 물건이었다.
> (사장님이 "Real-Human Assets 메뉴가 안 보인다" 고 하신 것도 같은 이유다 — 권한이 먼저다)

## 확인된 사실

- 씨댄스 2.0 **표준 모델은 실사 인물 사진 입력을 전부 막는다.** 이건 우리 계정만의 문제가 아니라
  힉스필드를 포함한 거의 모든 서비스가 같은 벽을 만난다. 표준 모델만 노출하기 때문이다.
- 우리가 실측한 것: 같은 사진을 **첫 프레임 / 외형 참고 / 역할 표시 없이 / 워터마크 켬** 을
  **실어 보내기·주소** 두 방식으로 각각, 총 8번 던졌고 8번 다 같은 코드로 거절당했다.
  → **요청 모양으로는 절대 안 열린다.** 이건 확정이다.
- 바이트댄스가 문서로 인정하는 길은 세 가지뿐이다.
  ① 미리 등록된 가상 인물(디지털 캐릭터 라이브러리)
  ② **AI 로 만든 가상 인물 사진** — 공식이 권하는 길.
     ⚠ **단, "AI 로 만들었으면 통과" 가 아니다.** 검열은 출처를 못 가린다 — 사실감만 본다.
       AI 로 만든 가상 인물이라도 사진처럼 사실적이면 똑같이 막힌다(사장님 사례로 확인).
       통과하려면 **화풍 자체가 사진이 아니어야** 한다(일러스트·애니메이션·3D 렌더·유화 등).
  ③ **실인물 자산 등록(asset ID)** — 권리 증빙을 내고 계정 자산 라이브러리에 등록

## ③ 이 우리가 가야 할 길 — BytePlus 공식 문서가 있다

| 문서 | 내용 |
|---|---|
| [Dreamina Seedance 2.0 Advanced Creation Rights](https://docs.byteplus.com/en/docs/modelark/2377608) | **고급 창작 권한** — 이걸 먼저 열어야 아래 메뉴가 나온다 |
| [Add Real-Human Assets to ModelArk Library](https://docs.byteplus.com/en/docs/ModelArk/2315856) | **실인물 자산 등록** — 권리 증빙을 내고 얼굴을 계정 라이브러리에 올린다 |
| [Digital character library](https://docs.byteplus.com/en/docs/ModelArk/2223965) | 가상 인물 라이브러리(①) |

### 순서

1. **BytePlus 콘솔 → ModelArk** 에서 **Dreamina Seedance 2.0 Advanced Creation Rights** 를 신청/구매한다.
   → 이게 없으면 "Real-Human Assets" 메뉴가 아예 안 보인다. 사장님이 못 찾으신 이유가 이것이다.
2. 권한이 열리면 **Asset Library(자산 라이브러리) → 실인물 자산 추가** 로 인물 사진을 등록한다.
   · 필요한 것: 사진 속 본인의 **초상 사용 동의서**(연예인·모델이면 소속사 계약서),
     본인 확인 절차. 심사가 붙는다(중국 볼케이노 기준 1~3영업일).
3. 승인되면 **자산 ID** 가 나온다. 생성 요청에서 사진 파일 대신 그 ID 를 참조한다.
   (볼케이노 표기는 `asset://<ID>`)

### 권한이 열리면 내가 할 일

자산 ID 를 받아 오는 순간 스튜디오에 붙이겠다 — 지금은 사진을 그대로 보내지만,
등록된 인물이면 사진 대신 자산 ID 를 보내도록 바꾸면 된다. 코드 쪽은 준비돼 있다.
**자산 ID 하나만 주시면 그날 붙인다.**

## 그때까지 지금 되는 것

- **화풍이 사진이 아닌 인물** — 일러스트·애니메이션·3D 렌더·유화.
  ⚠ "AI 로 만들었다" 는 것만으로는 안 된다. 실제로 AI 로 만든 사실적인 인물이 막혔다.
  사진을 만드는 단계에서 프롬프트에 화풍을 박아야 한다
  (예: `flat illustration`, `anime style`, `3D render, stylized`, `oil painting`).
- **얼굴이 안 나오거나 작게 나오는 사진**(전신·뒷모습·측면) 은 지금도 된다.

## 안 하는 것

인터넷에 도는 방법 중에 "사진에 노이즈·필름그레인을 넣거나 흐리게 해서 얼굴 인식을 피한다" 는
것이 있다. **그건 안 만든다.** 초상권을 보호하려고 있는 장치를 속이는 일이고,
제공사 문서도 "같은 인물 사진을 가려서 통과할 때까지 다시 던지는 것" 을 금지한다.
우리가 갈 길은 권한을 정식으로 여는 ③ 이다.

## 참고한 곳

- BytePlus ModelArk 공식 문서 (위 표)
- [Seedance 2.0 face limit: the 3 legit workarounds](https://seedance2.so/blog/seedance-2-real-face-workaround)
- [Seedance 2.0 API 가 실인물을 지원하는가](https://blog.laozhang.ai/en/posts/seedance-2-api-real-people)
- [Seedance 2.0 私域素材库(가상 인물 / 실인물)](https://docs.apiyi.com/api-capabilities/seedance2/asset-library)
- [MindStudio — Seedance 2.0 content restrictions](https://www.mindstudio.ai/blog/seedance-2-0-content-restrictions-workarounds)
