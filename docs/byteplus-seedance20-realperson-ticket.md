# BytePlus 지원 티켓 — 씨댄스 2.0 이 AI 로 만든 얼굴을 실제 인물로 오탐함

씨댄스 2.0 은 제공사(BytePlus) 서버에서 인물 사진 입력을 거절합니다. 우리 코드로는 못 바꿉니다.

세 가지가 이 티켓의 근거입니다.
1. **넣은 사진은 AI 로 만든 것이고 실제 인물이 아닙니다.** 그런데도 2.0 은 `may contain real person`
   으로 거절합니다 — 오탐(false positive)입니다.
2. **같은 계정·같은 사진이 다른 씨댄스 엔드포인트에서는 통과한 적이 있습니다.**
   모델 한계가 아니라 켜고 끌 수 있는 설정이라는 뜻입니다.
   ⚠ 그 엔드포인트(2.5)는 정식 출시 전이라 지금은 개통이 안 됩니다 — 대안이 못 됩니다.
   근거로만 씁니다.
3. **다른 서비스(Higgsfield · Figma Weave 등)는 씨댄스 2.0 으로 인물 사진 영상을 상용으로 팝니다.**
   그러니 2.0 에 그 기능이 없는 게 아니라, 우리 계정에만 안 열려 있는 것입니다.
   → 그래서 요청은 "기능을 만들어 달라" 가 아니라 **"우리 계정에도 같은 설정을 켜 달라"** 입니다.

## 보내는 곳

BytePlus 콘솔 → 우측 상단 **Support** → **Submit a ticket**
- Category: `ModelArk` / `Content moderation` (없으면 `Other`)
- Subject: `False positive: AI-generated face rejected as "real person" on dreamina-seedance-2-0-260128`

## 붙여 넣을 본문 (영문)

> Hello,
>
> Our account uses ModelArk video generation via the BytePlus endpoint
> `https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks`.
>
> **Problem.** Image-to-video requests to `dreamina-seedance-2-0-260128` are rejected with:
>
> ```
> HTTP 400
> code:    InputImageSensitiveContentDetected.PrivacyInformation
> message: The request failed because the input image 'content[1]' may contain real person.
> ```
>
> **This is a false positive.** The input image is **AI-generated**. It is not a photograph, and
> no real person is depicted — there is no identifiable individual and therefore no portrait-rights
> or consent issue. The moderation appears to trigger on photorealism alone rather than on the
> presence of an actual person.
>
> **What we already verified on our side.** The same image, same model, same prompt was submitted
> in four different accepted request shapes. All four were rejected with the identical code:
>
> | # | Image delivery | Role in `content[]` | Result |
> |---|---|---|---|
> | 1 | base64 data URI | `first_frame` | 400, same code |
> | 2 | public HTTPS URL | `first_frame` | 400, same code |
> | 3 | base64 data URI | `reference_image` | 400, same code |
> | 4 | public HTTPS URL | `reference_image` | 400, same code |
>
> So this is not a malformed-request issue.
>
> **Key observation 1.** With the *same account*, the *same API key*, and the *same image*,
> `dreamina-seedance-2-5-260628` **accepts** the request and generates the video successfully.
> Only `dreamina-seedance-2-0-260128` rejects it. This indicates the restriction is a
> per-model configuration, not a model capability limit.
>
> **Key observation 2.** Several commercial products (e.g. Higgsfield, Figma Weave) offer
> photo-to-video with human subjects on Seedance 2.0 today. So the capability clearly exists
> on 2.0 — it simply is not enabled for our account.
>
> We are therefore not asking for a new feature. We are asking for the same configuration
> that other Seedance 2.0 integrators already have. Note that Seedance 2.5 is not a workaround
> for us — it is not generally available and cannot be activated on our account.
>
> **Request.** Please either
> (a) fix / relax the false positive so AI-generated faces are not rejected as real persons on
>     `dreamina-seedance-2-0-260128`, or
> (b) enable real-person image input for this model on our account, or
> (c) tell us the required procedure (agreement, consent verification, portrait-rights
>     attestation, whitelist application — whatever applies).
>
> If real-person input has been intentionally removed from Seedance 2.0 and is only available on
> a newer model going forward, please confirm that explicitly, and tell us what our account
> needs to do to obtain real-person image input on a generally-available model.
>
> **Reference**
> - Account / API key: (콘솔에 보이는 계정 ID 를 여기에 적으세요)
> - Region / host: `ark.ap-southeast.bytepluses.com`
> - Blocked model: `dreamina-seedance-2-0-260128`
> - Working model (same image): `dreamina-seedance-2-5-260628`
> - Example Request id: `02178`
> - Approximate time of the failing call: (실패한 날짜·시각을 적으세요)
>
> Thank you.

## 답이 오면

- **열어 준다** → 코드 수정 없이 그날부터 2.0 에서 인물 사진이 됩니다. 우리 쪽에서 바꿀 게 없습니다.
- **절차를 준다(동의서·초상권 확인 등)** → 그 절차를 알려 주시면 스튜디오에 필요한 화면을 붙이겠습니다.
- **2.0 에서는 닫았다** → 그러면 정식 출시된 모델 중에서 인물 입력이 열리는 것이 무엇인지,
  우리 계정이 무엇을 해야 하는지 되물어야 합니다. 그 답이 오면 그대로 붙이겠습니다.

## 티켓을 기다리는 동안

⚠ 씨댄스 2.5 는 대안이 못 됩니다 — 정식 출시 전이라 이 계정에서 개통이 안 됩니다.

- **AI 로 사진을 만드시는 단계라면** 화풍을 바꾸는 것도 방법입니다. 사실적인 인물 사진 대신
  일러스트·3D 렌더·애니메이션 화풍으로 만들면 2.0 도 받습니다 — 실제 사람으로 보이지 않기 때문입니다.
  (검열을 속이는 게 아니라, 애초에 실제 인물 사진이 아닌 그림이 되는 것입니다)
