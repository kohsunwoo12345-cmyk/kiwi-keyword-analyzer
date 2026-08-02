# BytePlus 지원 티켓 — 씨댄스 2.0 에서 인물 사진 입력 허용 요청

씨댄스 2.0 은 제공사(BytePlus) 서버에서 인물 사진 입력을 거절합니다. 우리 코드로는 못 바꿉니다.
같은 계정·같은 사진으로 **씨댄스 2.5 는 통과**하므로, 계정 권한이 아니라 **2.0 이라는 모델 하나의 정책**입니다.
2.0 을 인물 사진에 쓰시려면 제공사에 열어 달라고 요청하는 길밖에 없습니다.

## 보내는 곳

BytePlus 콘솔 → 우측 상단 **Support** → **Submit a ticket**
- Category: `ModelArk` / `Content moderation` (없으면 `Other`)
- Subject: `Request to allow real-person image input on dreamina-seedance-2-0-260128`

## 붙여 넣을 본문 (영문)

> Hello,
>
> Our account uses ModelArk video generation via the BytePlus endpoint
> `https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks`.
>
> **Problem.** Every image-to-video request to `dreamina-seedance-2-0-260128` that contains a
> human face is rejected with:
>
> ```
> HTTP 400
> code:    InputImageSensitiveContentDetected.PrivacyInformation
> message: The request failed because the input image 'content[1]' may contain real person.
> ```
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
> **Key observation.** With the *same account*, the *same API key*, and the *same image*,
> `dreamina-seedance-2-5-260628` **accepts** the request and generates the video successfully.
> Only `dreamina-seedance-2-0-260128` rejects it. This indicates the restriction is applied
> per model, not per account.
>
> **Request.** Please enable real-person image input for `dreamina-seedance-2-0-260128` on our
> account, or tell us the required procedure (agreement, consent verification, portrait-rights
> attestation, whitelist application — whatever applies).
>
> If real-person input has been intentionally removed from Seedance 2.0 and is only available on
> Seedance 2.5 going forward, please confirm that explicitly so we can plan accordingly.
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
- **2.0 에서는 닫았고 2.5 로 옮겼다** → 인물 사진 작업은 2.5 로 하시면 됩니다. 그때는 스튜디오에서
  2.0 을 고르고 인물 사진을 넣었을 때 미리 안내하도록 바꾸겠습니다.
