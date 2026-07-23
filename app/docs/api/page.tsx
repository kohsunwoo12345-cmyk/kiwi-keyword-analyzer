'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  KeyRound, Copy, Check, Terminal, Globe, Code2, Cpu, Coins, ShieldCheck,
  Video, Image as ImageIcon, ListChecks, ArrowRight, ExternalLink, Plug,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useT, type Dict } from '@/lib/i18n'

const STUDIO_URL = '/studio-nvc-prv-8b3k2/'

const M: Dict = {
  '복사됨': { en: 'Copied', ja: 'コピー済み', zh: '已复制' },
  '복사': { en: 'Copy', ja: 'コピー', zh: '复制' },

  // nav
  '개요': { en: 'Overview', ja: '概要', zh: '概览' },
  'API 키 발급': { en: 'Get API key', ja: 'APIキー発行', zh: '获取 API 密钥' },
  '인증': { en: 'Authentication', ja: '認証', zh: '认证' },
  '이미지 생성': { en: 'Image generation', ja: '画像生成', zh: '图像生成' },
  '영상 생성': { en: 'Video generation', ja: '動画生成', zh: '视频生成' },
  '상태 확인': { en: 'Check status', ja: 'ステータス確認', zh: '状态查询' },
  '모델 목록': { en: 'Model list', ja: 'モデル一覧', zh: '模型列表' },
  '모델별 호출 예시': { en: 'Examples by model', ja: 'モデル別呼び出し例', zh: '各模型调用示例' },
  '언어별 예시': { en: 'Examples by language', ja: '言語別サンプル', zh: '各语言示例' },
  '요청 한도': { en: 'Rate limits', ja: 'リクエスト上限', zh: '请求限额' },
  '크레딧·과금': { en: 'Credits & billing', ja: 'クレジット・課金', zh: '积分与计费' },
  '오류': { en: 'Errors', ja: 'エラー', zh: '错误' },

  // model groups
  '영상 모델': { en: 'Video models', ja: '動画モデル', zh: '视频模型' },
  '이미지 모델': { en: 'Image models', ja: '画像モデル', zh: '图像模型' },

  // model notes
  '오디오 포함 지원. seconds 5~8.': { en: 'Audio output supported. seconds 5–8.', ja: 'オーディオ出力対応。seconds 5〜8。', zh: '支持音频输出。seconds 5~8。' },
  '첫 프레임 이미지(firstFrame) 필수.': { en: 'First-frame image (firstFrame) required.', ja: '最初のフレーム画像（firstFrame）が必須。', zh: '需提供首帧图像（firstFrame）。' },
  '텍스트→영상. firstFrame 넣으면 이미지→영상.': { en: 'Text→video. Add firstFrame for image→video.', ja: 'テキスト→動画。firstFrame を指定すると画像→動画。', zh: '文本→视频。加入 firstFrame 即为图像→视频。' },
  '텍스트→영상 / 이미지→영상 모델명 구분.': { en: 'Separate model names for text→video / image→video.', ja: 'テキスト→動画 / 画像→動画でモデル名が異なる。', zh: '文本→视频 / 图像→视频 使用不同模型名。' },
  'firstFrame 지원(이미지→영상).': { en: 'Supports firstFrame (image→video).', ja: 'firstFrame 対応（画像→動画）。', zh: '支持 firstFrame（图像→视频）。' },
  'firstFrame/last frame 지원.': { en: 'Supports firstFrame / last frame.', ja: 'firstFrame / last frame 対応。', zh: '支持 firstFrame / last frame。' },
  '레퍼런스 최대 12장(refImages) 지원.': { en: 'Up to 12 reference images (refImages) supported.', ja: '参照画像を最大12枚（refImages）まで対応。', zh: '最多支持 12 张参考图（refImages）。' },
  '고품질 텍스트 렌더링. 1.5 / Image / Mini 도 동일 provider.': { en: 'High-quality text rendering. 1.5 / Image / Mini use the same provider.', ja: '高品質なテキストレンダリング。1.5 / Image / Mini も同じ provider。', zh: '高质量文字渲染。1.5 / Image / Mini 同属该 provider。' },
  '단일 이미지 생성.': { en: 'Single image generation.', ja: '単一画像の生成。', zh: '单张图像生成。' },
  'Kontext(레퍼런스 편집) 모델은 refImage 사용.': { en: 'The Kontext (reference-editing) model uses refImage.', ja: 'Kontext（参照編集）モデルは refImage を使用。', zh: 'Kontext（参考编辑）模型使用 refImage。' },

  // hero
  'BYGENCY 생성 API': { en: 'BYGENCY Generation API', ja: 'BYGENCY 生成 API', zh: 'BYGENCY 生成 API' },
  '노드형 AI 영상 플랜': { en: 'Node-based AI Video plan', ja: 'ノード型 AI 動画プラン', zh: '节点式 AI 视频套餐' },
  '회원은 API 키 하나로': { en: 'members, with a single API key,', ja: '会員は API キー 1 つで', zh: '会员用一个 API 密钥' },
  '이미지·영상 모든 모델': { en: 'all image and video models', ja: '画像・動画のすべてのモデル', zh: '所有图像与视频模型' },
  '을 직접 호출할 수 있습니다. 생성 1건마다': { en: 'can be called directly. For each generation,', ja: 'を直接呼び出せます。生成 1 件ごとに', zh: '均可直接调用。每生成 1 次，' },
  '본인 계정 크레딧': { en: 'your own account credits', ja: 'ご自身のアカウントのクレジット', zh: '本人账户积分' },
  '에서 스튜디오와 동일하게 차감됩니다.': { en: 'are deducted, just as in the studio.', ja: 'から、スタジオと同じように差し引かれます。', zh: '会像在工作室中一样被扣除。' },
  'MCP 연동은 여기': { en: 'MCP integration here', ja: 'MCP 連携はこちら', zh: 'MCP 集成看这里' },

  // overview
  'BYGENCY 생성 API는 단순한': { en: 'The BYGENCY Generation API is a plain', ja: 'BYGENCY 生成 API はシンプルな', zh: 'BYGENCY 生成 API 只是一个简单的' },
  '엔드포인트입니다. 하나의 엔드포인트로 이미지·영상을 모두 다룹니다.': { en: 'endpoint. A single endpoint handles both images and video.', ja: 'エンドポイントです。1 つのエンドポイントで画像・動画をすべて扱います。', zh: '端点。用一个端点同时处理图像与视频。' },
  '이미지 생성 → 즉시 URL 반환': { en: 'Image generation → returns URL immediately', ja: '画像生成 → URL を即時返却', zh: '图像生成 → 立即返回 URL' },
  '영상 생성 시작 → task 반환': { en: 'Start video generation → returns task', ja: '動画生成を開始 → task を返却', zh: '开始视频生成 → 返回 task' },
  'task로 영상 완료·URL 확인': { en: 'Check video completion & URL via task', ja: 'task で動画の完了・URL を確認', zh: '通过 task 查询视频完成情况与 URL' },
  'API 키 하나로 모든 모델 호출': { en: 'Call every model with one API key', ja: 'API キー 1 つで全モデルを呼び出し', zh: '用一个 API 密钥调用所有模型' },
  '모든 요청은 HTTPS로만 받습니다.': { en: 'All requests are accepted over HTTPS only.', ja: 'すべてのリクエストは HTTPS のみで受け付けます。', zh: '所有请求仅通过 HTTPS 接收。' },

  // key issuance
  '1. API 키 발급': { en: '1. Get API key', ja: '1. APIキー発行', zh: '1. 获取 API 密钥' },
  '스튜디오': { en: 'Studio', ja: 'スタジオ', zh: '工作室' },
  '좌측 하단': { en: 'bottom-left', ja: '左下の', zh: '左下角' },
  '프로필': { en: 'Profile', ja: 'プロフィール', zh: '个人资料' },
  'API 연결': { en: 'API connection', ja: 'API 連携', zh: 'API 连接' },
  '탭에서 키를 만듭니다.': { en: 'tab to create a key.', ja: 'タブでキーを作成します。', zh: '标签页中创建密钥。' },
  '키는': { en: 'The key is', ja: 'キーは', zh: '密钥' },
  '생성 시 한 번만': { en: 'only once, at creation', ja: '作成時に一度だけ', zh: '仅在创建时一次' },
  '전체가 표시됩니다.': { en: 'displayed in full.', ja: '全体が表示されます。', zh: '会完整显示。' },
  '이후에는 다시 볼 수 없으니': { en: 'you can’t view it again afterward, so', ja: '以降は再表示できないため', zh: '之后无法再次查看，因此' },
  '안전한 곳에 보관하세요.': { en: 'store it somewhere safe.', ja: '安全な場所に保管してください。', zh: '请妥善保管。' },
  '회원당': { en: 'Per member,', ja: '会員ごとに', zh: '每位会员' },
  '최대 20개': { en: 'up to 20', ja: '最大 20 個', zh: '最多 20 个' },
  '까지 만들 수 있고, 언제든 폐기(revoke)할 수 있습니다.': { en: 'can be created, and revoked anytime.', ja: 'まで作成でき、いつでも破棄（revoke）できます。', zh: '，可随时吊销（revoke）。' },
  '키': { en: 'A single key', ja: 'キー', zh: '密钥' },
  '1개로 이미지·영상 모든 모델': { en: 'calls all image and video models', ja: '1 つで画像・動画のすべてのモデル', zh: '一个即可调用所有图像与视频模型' },
  '을 호출합니다. 모델별로 키를 나눌 필요가 없습니다.': { en: '. No need to split keys per model.', ja: 'を呼び出します。モデルごとにキーを分ける必要はありません。', zh: '。无需为每个模型分开密钥。' },
  '보유자만 발급·사용할 수 있습니다.': { en: 'can be issued and used only by plan holders.', ja: 'の保有者のみ発行・利用できます。', zh: '仅持有者可签发和使用。' },
  '✓ 현재 로그인되어 있습니다. 스튜디오 프로필 → API 연결 탭에서 바로 발급하세요.': { en: '✓ You’re currently logged in. Issue one right away from Studio Profile → API connection tab.', ja: '✓ 現在ログイン中です。スタジオのプロフィール → API 連携タブからすぐに発行できます。', zh: '✓ 您当前已登录。请前往 工作室 个人资料 → API 连接 标签页立即签发。' },
  '키를 발급하려면 먼저': { en: 'To issue a key, first', ja: 'キーを発行するには、まず', zh: '要签发密钥，请先' },
  '로그인': { en: 'Log in', ja: 'ログイン', zh: '登录' },
  '하세요.': { en: '.', ja: 'してください。', zh: '。' },

  // auth
  '2. 인증': { en: '2. Authentication', ja: '2. 認証', zh: '2. 认证' },
  '모든 요청 헤더에': { en: 'In every request header, add', ja: 'すべてのリクエストヘッダーに', zh: '在每个请求头中加入' },
  '를 넣습니다. 키가 없거나 틀리면': { en: '. If the key is missing or wrong,', ja: 'を追加します。キーがない、または誤っていると', zh: '。若密钥缺失或错误，' },
  '플랜이 없으면': { en: 'if there’s no plan,', ja: 'プランがない場合は', zh: '若没有套餐，' },
  '으로 거부됩니다.': { en: 'it’s rejected.', ja: 'で拒否されます。', zh: '则会被拒绝。' },
  'Authorization 헤더': { en: 'Authorization header', ja: 'Authorization ヘッダー', zh: 'Authorization 请求头' },

  // image
  '3. 이미지 생성': { en: '3. Image generation', ja: '3. 画像生成', zh: '3. 图像生成' },
  '이미지는 즉시 결과 URL을 반환합니다.': { en: 'Images return the result URL immediately.', ja: '画像は結果 URL を即時返却します。', zh: '图像会立即返回结果 URL。' },
  'POST /api/v1/generate — 이미지': { en: 'POST /api/v1/generate — Image', ja: 'POST /api/v1/generate — 画像', zh: 'POST /api/v1/generate — 图像' },
  '필드': { en: 'Field', ja: 'フィールド', zh: '字段' },
  '설명': { en: 'Description', ja: '説明', zh: '说明' },
  '"image" (이미지) / "video" (영상). 생략 시 provider·model로 자동 판별': { en: '"image" / "video". Auto-detected from provider·model if omitted', ja: '"image"（画像）/ "video"（動画）。省略時は provider・model から自動判定', zh: '"image"（图像）/ "video"（视频）。省略时根据 provider·model 自动判定' },
  '제공사 코드 (아래 모델 목록 참고). 필수': { en: 'Provider code (see model list below). Required', ja: '提供元コード（下のモデル一覧参照）。必須', zh: '提供方代码（参见下方模型列表）。必填' },
  '모델 표시명. 생략 시 provider 기본 모델': { en: 'Model display name. Defaults to the provider’s base model if omitted', ja: 'モデル表示名。省略時は provider の既定モデル', zh: '模型显示名。省略时使用 provider 默认模型' },
  '생성 프롬프트. 필수': { en: 'Generation prompt. Required', ja: '生成プロンプト。必須', zh: '生成提示词。必填' },
  '레퍼런스/편집 이미지 URL (선택)': { en: 'Reference/edit image URL (optional)', ja: '参照／編集画像 URL（任意）', zh: '参考/编辑图像 URL（可选）' },
  '피해야 할 요소 (선택)': { en: 'Elements to avoid (optional)', ja: '避けたい要素（任意）', zh: '需避免的元素（可选）' },

  // video
  '4. 영상 생성': { en: '4. Video generation', ja: '4. 動画生成', zh: '4. 视频生成' },
  '영상은 즉시 완료되지 않습니다.': { en: 'Video isn’t completed instantly.', ja: '動画はすぐには完了しません。', zh: '视频不会立即完成。' },
  '로 시작하면': { en: 'When you start with', ja: 'で開始すると', zh: '开始后' },
  '(상태 확인 주소)를 돌려줍니다. 과금은': { en: '(a status-check URL) is returned. Billing', ja: '（ステータス確認 URL）を返します。課金は', zh: '（状态查询地址），返回。计费' },
  '시작 시 1회': { en: 'once, at start', ja: '開始時に 1 回', zh: '仅在开始时 1 次' },
  '만 발생합니다.': { en: 'occurs only.', ja: 'のみ発生します。', zh: '发生。' },
  'POST /api/v1/generate — 영상': { en: 'POST /api/v1/generate — Video', ja: 'POST /api/v1/generate — 動画', zh: 'POST /api/v1/generate — 视频' },
  '제공사·모델 (아래 목록). 필수': { en: 'Provider & model (see list below). Required', ja: '提供元・モデル（下の一覧）。必須', zh: '提供方与模型（见下方列表）。必填' },
  '영상 길이(초). 모델별 5~10초 지원': { en: 'Video length (seconds). 5–10s depending on model', ja: '動画の長さ（秒）。モデルにより 5〜10 秒対応', zh: '视频时长（秒）。各模型支持 5~10 秒' },
  '첫 프레임 이미지 URL (일부 모델 필수)': { en: 'First-frame image URL (required for some models)', ja: '最初のフレーム画像 URL（一部モデルで必須）', zh: '首帧图像 URL（部分模型必填）' },
  'true 시 오디오 포함(지원 모델). 추가 과금': { en: 'Includes audio when true (supported models). Extra charge', ja: 'true でオーディオを含む（対応モデル）。追加課金', zh: '为 true 时包含音频（支持的模型）。额外计费' },
  'true면 실제 호출·과금 없이 페이로드만 미리보기': { en: 'When true, previews the payload only, without a real call or charge', ja: 'true の場合、実際の呼び出し・課金なしでペイロードのみをプレビュー', zh: '为 true 时，仅预览负载，不实际调用或计费' },

  // polling
  '5. 영상 상태 확인 (폴링)': { en: '5. Check video status (polling)', ja: '5. 動画ステータス確認（ポーリング）', zh: '5. 视频状态查询（轮询）' },
  '응답의': { en: 'The response’s', ja: 'レスポンスの', zh: '响应中的' },
  '쿼리를 그대로': { en: 'query as-is to', ja: 'クエリをそのまま', zh: '查询原样附加到' },
  '에 붙여 15~30초 간격으로 확인합니다.': { en: ', checking every 15–30 seconds.', ja: 'に付けて 15〜30 秒間隔で確認します。', zh: '，每 15~30 秒查询一次。' },
  '추가 과금 없음.': { en: 'No extra charge.', ja: '追加課金なし。', zh: '无额外计费。' },
  'GET /api/v1/generate — 상태 확인': { en: 'GET /api/v1/generate — Check status', ja: 'GET /api/v1/generate — ステータス確認', zh: 'GET /api/v1/generate — 状态查询' },

  // models
  '6. 지원 모델': { en: '6. Supported models', ja: '6. 対応モデル', zh: '6. 支持的模型' },
  'model (예)': { en: 'model (e.g.)', ja: 'model（例）', zh: 'model（示例）' },
  '값은 스튜디오에 표시되는 모델 이름과 동일합니다. 최신 목록·단가는 스튜디오 생성 화면에서 확인하세요.': { en: 'values match the model names shown in the studio. Check the latest list and pricing on the studio’s generation screen.', ja: 'の値はスタジオに表示されるモデル名と同じです。最新の一覧・単価はスタジオの生成画面で確認してください。', zh: '的值与工作室中显示的模型名相同。最新列表与单价请在工作室的生成界面查看。' },

  // by model
  '7. 모델별 호출 예시': { en: '7. Examples by model', ja: '7. モデル別呼び出し例', zh: '7. 各模型调用示例' },
  '각 모델의': { en: 'Each model’s', ja: '各モデルの', zh: '各模型的' },
  '값과 자주 쓰는 필드입니다. 모두': { en: 'values and commonly used fields. Send them all to', ja: 'の値とよく使うフィールドです。すべて', zh: '值和常用字段。全部发送到' },
  '에 아래 JSON 바디로 보냅니다.': { en: 'with the JSON body below.', ja: 'に、以下の JSON ボディで送信します。', zh: '，使用下方 JSON 请求体。' },
  '영상 모델 응답은': { en: 'Video model responses return', ja: '動画モデルのレスポンスは', zh: '视频模型的响应返回' },
  '(상태 확인 주소)을 반환합니다. 위': { en: '(a status-check URL). In', ja: '（ステータス確認 URL）を返します。上の', zh: '（状态查询地址）。在上方' },
  '에서 폴링해 최종': { en: 'above, poll to get the final', ja: 'でポーリングして最終的な', zh: '中轮询以获取最终' },
  '을 받으세요. 이미지 모델은 응답에': { en: '. For image models, the', ja: 'を受け取ってください。画像モデルはレスポンスに', zh: '。图像模型的响应中' },
  '이 바로 담깁니다.': { en: 'is included directly in the response.', ja: 'がそのまま含まれます。', zh: '会直接包含。' },

  // sdk
  '8. 언어별 예시': { en: '8. Examples by language', ja: '8. 言語別サンプル', zh: '8. 各语言示例' },

  // limits
  '9. 요청 한도 (남용 방지)': { en: '9. Rate limits (abuse prevention)', ja: '9. リクエスト上限（不正利用防止）', zh: '9. 请求限额（防滥用）' },
  '서비스 보호를 위해 계정 단위로 요청 한도가 적용됩니다. 초과 시': { en: 'To protect the service, rate limits apply per account. When exceeded,', ja: 'サービス保護のため、アカウント単位でリクエスト上限が適用されます。超過時は', zh: '为保护服务，按账户应用请求限额。超出时，' },
  '와': { en: 'and', ja: 'と', zh: '和' },
  '(초) 헤더를 반환합니다. 여러 키를 만들어도 한도는': { en: '(seconds) headers are returned. Even with multiple keys, the limit is', ja: '（秒）ヘッダーを返します。複数のキーを作成しても上限は', zh: '（秒）请求头。即使创建多个密钥，限额也' },
  '계정 합산': { en: 'summed per account', ja: 'アカウント合算', zh: '按账户合计' },
  '으로 계산되어 우회할 수 없습니다.': { en: ', so it can’t be bypassed.', ja: 'として計算され、回避できません。', zh: '计算，无法绕过。' },
  '구분': { en: 'Category', ja: '区分', zh: '类别' },
  '한도': { en: 'Limit', ja: '上限', zh: '限额' },
  '생성(POST) · 분당': { en: 'Generation (POST) · per minute', ja: '生成（POST）· 毎分', zh: '生成（POST）· 每分钟' },
  '생성(POST) · 시간당': { en: 'Generation (POST) · per hour', ja: '生成（POST）· 毎時', zh: '生成（POST）· 每小时' },
  '생성(POST) · 일일': { en: 'Generation (POST) · per day', ja: '生成（POST）· 1 日', zh: '生成（POST）· 每日' },
  '동시 진행 중 생성': { en: 'Concurrent generations in progress', ja: '同時進行中の生成', zh: '同时进行中的生成' },
  '상태 조회(GET) · 분당': { en: 'Status check (GET) · per minute', ja: 'ステータス照会（GET）· 毎分', zh: '状态查询（GET）· 每分钟' },
  '20회': { en: '20', ja: '20 回', zh: '20 次' },
  '300회': { en: '300', ja: '300 回', zh: '300 次' },
  '2,000회': { en: '2,000', ja: '2,000 回', zh: '2,000 次' },
  '3건': { en: '3', ja: '3 件', zh: '3 个' },
  '120회': { en: '120', ja: '120 回', zh: '120 次' },
  '429를 받으면': { en: 'When you get a 429, wait the', ja: '429 を受け取ったら', zh: '收到 429 时，等待' },
  '초만큼 기다린 뒤 재시도하세요(지수 백오프 권장).': { en: 'seconds before retrying (exponential backoff recommended).', ja: '秒だけ待ってから再試行してください（指数バックオフ推奨）。', zh: '秒后再重试（建议指数退避）。' },
  '폐기(revoke)된 키는 즉시': { en: 'A revoked key is immediately rejected with', ja: '破棄（revoke）されたキーは即座に', zh: '被吊销（revoke）的密钥会立即以' },
  '로 거부되고, 잔액이 부족하면 생성 전에': { en: ', and if the balance is insufficient, before generating it’s blocked with', ja: 'で拒否され、残高が不足していると生成前に', zh: '拒绝；若余额不足，生成前会以' },
  '로 막힙니다(크레딧 마이너스 불가).': { en: '(credits can’t go negative).', ja: 'で止まります（クレジットはマイナス不可）。', zh: '阻止（积分不可为负）。' },
  '상태 조회(GET)는 15~30초 간격을 권장합니다. 과도한 폴링은 429를 유발합니다.': { en: 'A 15–30 second interval is recommended for status checks (GET). Excessive polling triggers 429.', ja: 'ステータス照会（GET）は 15〜30 秒間隔を推奨します。過度なポーリングは 429 を引き起こします。', zh: '状态查询（GET）建议间隔 15~30 秒。过度轮询会触发 429。' },

  // credits
  '10. 크레딧·과금': { en: '10. Credits & billing', ja: '10. クレジット・課金', zh: '10. 积分与计费' },
  '생성 1건마다': { en: 'For each generation,', ja: '生成 1 件ごとに', zh: '每生成 1 次，' },
  '키 소유자 본인 계정': { en: 'the key owner’s own account', ja: 'キー所有者本人のアカウント', zh: '密钥持有者本人的账户' },
  '에서 크레딧이 차감됩니다(스튜디오와 동일 단가·배수).': { en: 'credits are deducted from (same unit price & multiplier as the studio).', ja: 'からクレジットが差し引かれます（スタジオと同じ単価・倍率）。', zh: '扣除积分（与工作室相同的单价与倍率）。' },
  '생성': { en: 'Generation', ja: '生成', zh: '生成' },
  '전에 잔액을 확인': { en: 'checks the balance beforehand', ja: '前に残高を確認', zh: '前会先检查余额' },
  '해 부족하면': { en: ', and if insufficient,', ja: 'し、不足していれば', zh: '，若不足，' },
  '로 거부합니다(크레딧 마이너스 없음).': { en: 'it’s rejected (no negative credits).', ja: 'で拒否します（クレジットのマイナスなし）。', zh: '则拒绝（积分不会为负）。' },
  '영상은': { en: 'Video is', ja: '動画は', zh: '视频' },
  '시작 시 1회만': { en: 'only once at start', ja: '開始時に 1 回のみ', zh: '仅在开始时 1 次' },
  '차감되고, 상태 확인(GET) 반복은 추가 과금이 없습니다.': { en: 'deducted, and repeated status checks (GET) incur no extra charge.', ja: '差し引かれ、ステータス確認（GET）の繰り返しに追加課金はありません。', zh: '扣费，重复的状态查询（GET）不产生额外费用。' },
  '로 차감액·잔액을 확인합니다.': { en: 'show the amount charged and remaining balance.', ja: 'で差引額・残高を確認します。', zh: '查看扣费金额与余额。' },
  '제공사 API 키(Veo·Runway·Seedance 등)는': { en: 'Provider API keys (Veo, Runway, Seedance, etc.) are', ja: '提供元の API キー（Veo・Runway・Seedance など）は', zh: '提供方 API 密钥（Veo、Runway、Seedance 等）' },
  '서버에만': { en: 'only on the server', ja: 'サーバー上のみ', zh: '仅存于服务器' },
  '있고 응답에 노출되지 않습니다.': { en: 'and are never exposed in responses.', ja: 'にあり、レスポンスには公開されません。', zh: '，不会在响应中暴露。' },
  '크레딧 충전·요금제 보기': { en: 'Top up credits & view plans', ja: 'クレジット購入・料金プランを見る', zh: '充值积分与查看套餐' },

  // errors
  '11. 오류 코드': { en: '11. Error codes', ja: '11. エラーコード', zh: '11. 错误代码' },
  '상황': { en: 'Situation', ja: '状況', zh: '情况' },
  'API 키 없음/오류 — "유효한 API 키가 필요합니다"': { en: 'Missing/invalid API key — "A valid API key is required"', ja: 'API キーがない／不正 — 「有効な API キーが必要です」', zh: 'API 密钥缺失/错误 —「需要有效的 API 密钥」' },
  '노드형 AI 영상 플랜이 아님': { en: 'Not on the Node-based AI Video plan', ja: 'ノード型 AI 動画プランではない', zh: '非节点式 AI 视频套餐' },
  '크레딧 부족 — need·have 함께 반환': { en: 'Insufficient credits — returns need & have', ja: 'クレジット不足 — need・have を併せて返却', zh: '积分不足 — 一并返回 need·have' },
  '요청 한도 초과 — Retry-After(초) 헤더 참고': { en: 'Rate limit exceeded — see the Retry-After (seconds) header', ja: 'リクエスト上限超過 — Retry-After（秒）ヘッダー参照', zh: '超出请求限额 — 参见 Retry-After（秒）请求头' },
  'model/provider 누락 등 잘못된 요청': { en: 'Bad request, e.g. missing model/provider', ja: 'model/provider の欠落など不正なリクエスト', zh: '请求错误，如缺少 model/provider' },
  '제공사 미설정/서버 오류': { en: 'Provider not configured / server error', ja: '提供元未設定／サーバーエラー', zh: '提供方未配置/服务器错误' },

  // cta
  '준비됐나요? 스튜디오에서 API 키를 발급하고 바로 호출하세요.': { en: 'Ready? Issue an API key in the studio and start calling right away.', ja: '準備はいいですか？スタジオで API キーを発行して、すぐに呼び出しましょう。', zh: '准备好了吗？在工作室签发 API 密钥并立即调用。' },
  '호출 예시 보기': { en: 'See call examples', ja: '呼び出し例を見る', zh: '查看调用示例' },
}

/* 복사 가능한 코드 블록 */
function Code({ children, label }: { children: string; label?: string }) {
  const t = useT(M)
  const [ok, setOk] = useState(false)
  function copy() {
    try {
      navigator.clipboard.writeText(children).then(() => { setOk(true); setTimeout(() => setOk(false), 1400) })
    } catch { /* noop */ }
  }
  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[#0b0f1a]">
      {label && <div className="border-b border-[var(--border-soft)] px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-[var(--text-dim)]">{label}</div>}
      <button onClick={copy} className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-white/10">
        {ok ? <><Check size={12} /> {t('복사됨')}</> : <><Copy size={12} /> {t('복사')}</>}
      </button>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-slate-200"><code>{children}</code></pre>
    </div>
  )
}

function Anchor({ id }: { id: string }) { return <span id={id} className="relative -top-24 block" aria-hidden /> }

export default function ApiDocsPage() {
  const t = useT(M)
  const [origin, setOrigin] = useState('https://bygency.co')
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch('/api/account/api-keys', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!(d && d.ok)))
      .catch(() => setLoggedIn(false))
  }, [])

  const base = origin + '/api/v1/generate'

  const nav = [
    ['overview', '개요'], ['key', 'API 키 발급'], ['auth', '인증'],
    ['image', '이미지 생성'], ['video', '영상 생성'], ['poll', '상태 확인'],
    ['models', '모델 목록'], ['bymodel', '모델별 호출 예시'], ['sdk', '언어별 예시'],
    ['limits', '요청 한도'], ['credits', '크레딧·과금'], ['errors', '오류'],
  ]

  // provider·model·설명·요청 바디(JSON) — 모델별 실제 호출 예시
  const modelExamples: { group: string; items: { name: string; provider: string; body: string; note: string }[] }[] = [
    {
      group: '영상 모델',
      items: [
        { name: 'Google Veo 3.1', provider: 'google', note: '오디오 포함 지원. seconds 5~8.',
          body: `{
  "kind": "video",
  "provider": "google",
  "model": "Google Veo 3.1",
  "prompt": "빗속을 달리는 오토바이, 네온 반사, 시네마틱",
  "seconds": 8,
  "ratio": "16:9",
  "audio": true
}` },
        { name: 'Runway Gen-4', provider: 'runway', note: '첫 프레임 이미지(firstFrame) 필수.',
          body: `{
  "kind": "video",
  "provider": "runway",
  "model": "Runway Gen-4",
  "prompt": "카메라가 천천히 전진하는 미래 도시",
  "firstFrame": "https://example.com/first.jpg",
  "seconds": 10,
  "ratio": "16:9"
}` },
        { name: 'Seedance 2.0', provider: 'seedance', note: '텍스트→영상. firstFrame 넣으면 이미지→영상.',
          body: `{
  "kind": "video",
  "provider": "seedance",
  "model": "Seedance 2.0",
  "prompt": "파도가 부서지는 해안 절벽, 드론 샷",
  "seconds": 5,
  "ratio": "16:9"
}` },
        { name: 'Kling 2.1 Master', provider: 'kling', note: '텍스트→영상 / 이미지→영상 모델명 구분.',
          body: `{
  "kind": "video",
  "provider": "kling",
  "model": "Kling 2.1 Master (텍스트→영상)",
  "prompt": "벚꽃이 흩날리는 골목을 걷는 사람",
  "seconds": 5,
  "ratio": "9:16"
}` },
        { name: 'MiniMax Hailuo 02', provider: 'hailuo', note: 'firstFrame 지원(이미지→영상).',
          body: `{
  "kind": "video",
  "provider": "hailuo",
  "model": "MiniMax Hailuo 02",
  "prompt": "질주하는 치타를 따라가는 트래킹 샷",
  "seconds": 6,
  "ratio": "16:9"
}` },
        { name: 'Luma Ray 2', provider: 'luma', note: 'firstFrame/last frame 지원.',
          body: `{
  "kind": "video",
  "provider": "luma",
  "model": "Luma Ray 2",
  "prompt": "구름 위를 나는 고래, 몽환적",
  "seconds": 5,
  "ratio": "16:9"
}` },
      ],
    },
    {
      group: '이미지 모델',
      items: [
        { name: 'Nano Banana', provider: 'nanobanana', note: '레퍼런스 최대 12장(refImages) 지원.',
          body: `{
  "kind": "image",
  "provider": "nanobanana",
  "model": "Nano Banana",
  "prompt": "미니멀한 제품 광고컷, 파스텔 배경",
  "refImage": "https://example.com/ref.jpg"
}` },
        { name: 'GPT Image 2', provider: 'openai', note: '고품질 텍스트 렌더링. 1.5 / Image / Mini 도 동일 provider.',
          body: `{
  "kind": "image",
  "provider": "openai",
  "model": "GPT Image 2",
  "prompt": "\\"OPEN\\" 네온 간판이 있는 카페 외관, 저녁"
}` },
        { name: 'Grok Imagine', provider: 'xai', note: '단일 이미지 생성.',
          body: `{
  "kind": "image",
  "provider": "xai",
  "model": "Grok Imagine",
  "prompt": "우주를 배경으로 한 사이버펑크 도시"
}` },
        { name: 'Flux 1.1 Pro Ultra', provider: 'flux', note: 'Kontext(레퍼런스 편집) 모델은 refImage 사용.',
          body: `{
  "kind": "image",
  "provider": "flux",
  "model": "Flux 1.1 Pro Ultra",
  "prompt": "초현실적인 숲속 유리 오두막, 황금빛 조명"
}` },
      ],
    },
  ]

  const videoModels: [string, string][] = [
    ['google', 'Google Veo 3.1'],
    ['runway', 'Runway Gen-4'],
    ['seedance', 'Seedance 2.0 / 2.0 Fast / 1.5 Pro / 1.0 Pro / Lite'],
    ['kling', 'Kling 2.1 Master / 2.0 Master / 1.6 Pro / 1.6 Standard'],
    ['hailuo', 'MiniMax Hailuo 02 / T2V-01 / I2V-01 Director'],
    ['luma', 'Luma Ray 2 / Ray Flash 2 / Ray 1.6'],
  ]
  const imageModels: [string, string][] = [
    ['nanobanana', 'Nano Banana'],
    ['openai', 'GPT Image 2 / 1.5 / Image / Mini'],
    ['xai', 'Grok Imagine'],
    ['flux', 'Flux 1.1 Pro Ultra / 1.1 Pro / Pro / Dev / Kontext'],
  ]

  return (
    <div className="site-dark min-h-screen overflow-x-clip">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-14">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-blue-700/25 blur-[130px]" />
        <div className="relative mx-auto max-w-5xl px-5">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[12px] font-semibold text-blue-300">
            <KeyRound size={13} /> Developer Docs · REST API
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{t('BYGENCY 생성 API')}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--text-soft)]">
            <b className="text-slate-200">{t('노드형 AI 영상 플랜')}</b> {t('회원은 API 키 하나로')} <b className="text-slate-200">{t('이미지·영상 모든 모델')}</b>{t('을 직접 호출할 수 있습니다. 생성 1건마다')} <b className="text-blue-300">{t('본인 계정 크레딧')}</b>{t('에서 스튜디오와 동일하게 차감됩니다.')}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={STUDIO_URL} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110">
              {t('API 키 발급')} <ArrowRight size={15} />
            </Link>
            <Link href="/docs/mcp" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              {t('MCP 연동은 여기')} <Plug size={14} />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl gap-10 px-5 pb-24 lg:flex">
        {/* 목차 */}
        <aside className="hidden w-44 flex-shrink-0 lg:block">
          <nav className="sticky top-28 space-y-1">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-soft)] transition hover:bg-white/5 hover:text-white">{t(label)}</a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-14">
          {/* 개요 */}
          <section>
            <Anchor id="overview" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Cpu size={20} className="text-blue-400" /> {t('개요')}</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              {t('BYGENCY 생성 API는 단순한')} <b className="text-slate-200">REST(HTTP)</b> {t('엔드포인트입니다. 하나의 엔드포인트로 이미지·영상을 모두 다룹니다.')}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                [<ImageIcon key="i" size={16} />, 'POST /api/v1/generate', '이미지 생성 → 즉시 URL 반환'],
                [<Video key="v" size={16} />, 'POST /api/v1/generate', '영상 생성 시작 → task 반환'],
                [<ListChecks key="c" size={16} />, 'GET /api/v1/generate', 'task로 영상 완료·URL 확인'],
                [<KeyRound key="m" size={16} />, 'Bearer bg_live_…', 'API 키 하나로 모든 모델 호출'],
              ].map(([ic, name, desc]) => (
                <div key={name as string} className="rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4">
                  <div className="flex items-center gap-2 font-mono text-[13px] font-bold text-blue-300">{ic}{name}</div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-soft)]">{t(desc as string)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4 text-[13px] text-[var(--text-soft)]">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
              <div><b className="text-slate-200">Base URL.</b> <code className="font-mono text-[12.5px] text-blue-300">{base}</code> — {t('모든 요청은 HTTPS로만 받습니다.')}</div>
            </div>
          </section>

          {/* 키 발급 */}
          <section>
            <Anchor id="key" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><KeyRound size={20} className="text-blue-400" /> {t('1. API 키 발급')}</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              <Link href={STUDIO_URL} className="text-blue-300 underline">{t('스튜디오')}</Link> → {t('좌측 하단')} <b className="text-slate-200">{t('프로필')}</b> → <b className="text-slate-200">{t('API 연결')}</b> {t('탭에서 키를 만듭니다.')}
            </p>
            <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-[var(--text-soft)]">
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('키는')} <b className="text-slate-200">{t('생성 시 한 번만')}</b> {t('전체가 표시됩니다.')} <b className="text-rose-300">{t('이후에는 다시 볼 수 없으니')}</b> {t('안전한 곳에 보관하세요.')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('회원당')} <b className="text-slate-200">{t('최대 20개')}</b>{t('까지 만들 수 있고, 언제든 폐기(revoke)할 수 있습니다.')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('키')} <b className="text-slate-200">{t('1개로 이미지·영상 모든 모델')}</b>{t('을 호출합니다. 모델별로 키를 나눌 필요가 없습니다.')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('키는')} <b className="text-slate-200">{t('노드형 AI 영상 플랜')}</b> {t('보유자만 발급·사용할 수 있습니다.')}</li>
            </ul>
            <p className="mt-4 text-[13px] text-[var(--text-dim)]">
              {loggedIn === true && t('✓ 현재 로그인되어 있습니다. 스튜디오 프로필 → API 연결 탭에서 바로 발급하세요.')}
              {loggedIn === false && <>{t('키를 발급하려면 먼저')} <Link href="/login" className="text-blue-300 underline">{t('로그인')}</Link>{t('하세요.')}</>}
            </p>
          </section>

          {/* 인증 */}
          <section>
            <Anchor id="auth" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ShieldCheck size={20} className="text-blue-400" /> {t('2. 인증')}</h2>
            <p className="text-[14.5px] leading-relaxed text-[var(--text-soft)]">
              {t('모든 요청 헤더에')} <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-slate-200">Authorization: Bearer &lt;API 키&gt;</code> {t('를 넣습니다. 키가 없거나 틀리면')} <b>401</b>, {t('플랜이 없으면')} <b>403</b>{t('으로 거부됩니다.')}
            </p>
            <Code label={t('Authorization 헤더')}>{`Authorization: Bearer bg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
          </section>

          {/* 이미지 */}
          <section>
            <Anchor id="image" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ImageIcon size={20} className="text-blue-400" /> {t('3. 이미지 생성')}</h2>
            <p className="text-[13.5px] text-[var(--text-soft)]"><code className="font-mono text-[12.5px] text-blue-300">POST /api/v1/generate</code> — {t('이미지는 즉시 결과 URL을 반환합니다.')}</p>
            <Code label={t('POST /api/v1/generate — 이미지')}>{`curl -X POST "${base}" \\
  -H "Authorization: Bearer $BYGENCY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "kind": "image",
    "provider": "nanobanana",
    "model": "Nano Banana",
    "prompt": "네온 사인이 있는 밤거리, 시네마틱",
    "refImage": "https://example.com/ref.jpg"
  }'

# 응답
{
  "ok": true,
  "url": "https://.../result.png",
  "credits_charged": 3,
  "credits_remaining": 1997
}`}</Code>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">{t('필드')}</th><th className="px-4 py-2.5 font-semibold">{t('설명')}</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    ['kind', '"image" (이미지) / "video" (영상). 생략 시 provider·model로 자동 판별'],
                    ['provider', '제공사 코드 (아래 모델 목록 참고). 필수'],
                    ['model', '모델 표시명. 생략 시 provider 기본 모델'],
                    ['prompt', '생성 프롬프트. 필수'],
                    ['refImage', '레퍼런스/편집 이미지 URL (선택)'],
                    ['negative', '피해야 할 요소 (선택)'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{a}</td><td className="px-4 py-2.5">{t(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 영상 */}
          <section>
            <Anchor id="video" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Video size={20} className="text-blue-400" /> {t('4. 영상 생성')}</h2>
            <p className="text-[13.5px] text-[var(--text-soft)]">{t('영상은 즉시 완료되지 않습니다.')} <code className="font-mono text-[12.5px] text-blue-300">POST</code> {t('로 시작하면')} <code className="font-mono text-[12.5px]">task</code>{t('(상태 확인 주소)를 돌려줍니다. 과금은')} <b className="text-slate-200">{t('시작 시 1회')}</b>{t('만 발생합니다.')}</p>
            <Code label={t('POST /api/v1/generate — 영상')}>{`curl -X POST "${base}" \\
  -H "Authorization: Bearer $BYGENCY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "kind": "video",
    "provider": "seedance",
    "model": "Seedance 2.0",
    "prompt": "질주하는 스포츠카, 해질녘 도로",
    "seconds": 5,
    "ratio": "16:9",
    "firstFrame": "https://example.com/first.jpg"
  }'

# 응답
{
  "ok": true,
  "statusUrl": "/api/generate?provider=seedance&task=...",
  "credits_charged": 15,
  "credits_remaining": 1982
}`}</Code>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">{t('필드')}</th><th className="px-4 py-2.5 font-semibold">{t('설명')}</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    ['provider / model', '제공사·모델 (아래 목록). 필수'],
                    ['prompt', '생성 프롬프트. 필수'],
                    ['seconds', '영상 길이(초). 모델별 5~10초 지원'],
                    ['ratio', '"16:9" / "9:16" / "1:1"'],
                    ['firstFrame', '첫 프레임 이미지 URL (일부 모델 필수)'],
                    ['audio', 'true 시 오디오 포함(지원 모델). 추가 과금'],
                    ['dryRun', 'true면 실제 호출·과금 없이 페이로드만 미리보기'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{a}</td><td className="px-4 py-2.5">{t(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 폴링 */}
          <section>
            <Anchor id="poll" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ListChecks size={20} className="text-blue-400" /> {t('5. 영상 상태 확인 (폴링)')}</h2>
            <p className="text-[13.5px] text-[var(--text-soft)]">{t('응답의')} <code className="font-mono text-[12.5px]">statusUrl</code> {t('쿼리를 그대로')} <code className="font-mono text-[12.5px] text-blue-300">GET /api/v1/generate</code>{t('에 붙여 15~30초 간격으로 확인합니다.')} <b className="text-slate-200">{t('추가 과금 없음.')}</b></p>
            <Code label={t('GET /api/v1/generate — 상태 확인')}>{`curl "${base}?provider=seedance&task=..." \\
  -H "Authorization: Bearer $BYGENCY_API_KEY"

# 진행 중
{ "status": "generating" }
# 완료
{ "status": "succeeded", "url": "https://.../video.mp4" }`}</Code>
          </section>

          {/* 모델 목록 */}
          <section>
            <Anchor id="models" />
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white"><Cpu size={20} className="text-blue-400" /> {t('6. 지원 모델')}</h2>

            <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Video size={16} className="text-blue-400" /> {t('영상 모델')}</h3>
            <div className="mb-6 overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">provider</th><th className="px-4 py-2.5 font-semibold">{t('model (예)')}</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {videoModels.map(([p, m]) => (
                    <tr key={p} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{p}</td><td className="px-4 py-2.5">{m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-slate-100"><ImageIcon size={16} className="text-blue-400" /> {t('이미지 모델')}</h3>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">provider</th><th className="px-4 py-2.5 font-semibold">{t('model (예)')}</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {imageModels.map(([p, m]) => (
                    <tr key={p} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{p}</td><td className="px-4 py-2.5">{m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12.5px] text-[var(--text-dim)]"><code className="font-mono">model</code> {t('값은 스튜디오에 표시되는 모델 이름과 동일합니다. 최신 목록·단가는 스튜디오 생성 화면에서 확인하세요.')}</p>
          </section>

          {/* 모델별 호출 예시 */}
          <section>
            <Anchor id="bymodel" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Code2 size={20} className="text-blue-400" /> {t('7. 모델별 호출 예시')}</h2>
            <p className="mb-4 text-[13.5px] text-[var(--text-soft)]">{t('각 모델의')} <code className="font-mono text-[12px]">provider</code>·<code className="font-mono text-[12px]">model</code> {t('값과 자주 쓰는 필드입니다. 모두')} <code className="font-mono text-[12px] text-blue-300">POST {base}</code> {t('에 아래 JSON 바디로 보냅니다.')}</p>
            {modelExamples.map((grp) => (
              <div key={grp.group} className="mb-6">
                <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-slate-100">
                  {grp.group === '영상 모델' ? <Video size={16} className="text-blue-400" /> : <ImageIcon size={16} className="text-blue-400" />}
                  {t(grp.group)}
                </h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {grp.items.map((m) => (
                    <div key={m.name} className="rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] font-bold text-blue-300">{m.name}</span>
                        <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] text-[var(--text-dim)]">{m.provider}</span>
                      </div>
                      <p className="mb-1 text-[12px] text-[var(--text-soft)]">{t(m.note)}</p>
                      <Code>{m.body}</Code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border-soft)] bg-white/[.02] p-4 text-[13px] text-[var(--text-soft)]">
              <ListChecks size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
              <div>{t('영상 모델 응답은')} <code className="font-mono text-[12px]">statusUrl</code>{t('(상태 확인 주소)을 반환합니다. 위')} <a href="#poll" className="text-blue-300 underline">{t('상태 확인')}</a>{t('에서 폴링해 최종')} <code className="font-mono text-[12px]">url</code> {t('을 받으세요. 이미지 모델은 응답에')} <code className="font-mono text-[12px]">url</code> {t('이 바로 담깁니다.')}</div>
            </div>
          </section>

          {/* 언어별 예시 */}
          <section>
            <Anchor id="sdk" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Code2 size={20} className="text-blue-400" /> {t('8. 언어별 예시')}</h2>

            <h3 className="mb-1 mt-4 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Code2 size={16} className="text-blue-400" /> JavaScript (fetch)</h3>
            <Code label="node / browser">{`const KEY = process.env.BYGENCY_API_KEY;
const BASE = "${base}";

// 1) 이미지 — 즉시 결과
const img = await fetch(BASE, {
  method: "POST",
  headers: { "Authorization": "Bearer " + KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ provider: "nanobanana", model: "Nano Banana", prompt: "노을 지는 해변" }),
}).then(r => r.json());
console.log(img.url, img.credits_charged);

// 2) 영상 — 시작 후 폴링
const start = await fetch(BASE, {
  method: "POST",
  headers: { "Authorization": "Bearer " + KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ provider: "seedance", model: "Seedance 2.0", prompt: "질주하는 말", seconds: 5 }),
}).then(r => r.json());

let done;
while (true) {
  await new Promise(s => setTimeout(s, 15000));
  const q = start.statusUrl.split("?")[1];
  done = await fetch(BASE + "?" + q, { headers: { "Authorization": "Bearer " + KEY } }).then(r => r.json());
  if (done.status === "succeeded" || done.url) break;
}
console.log(done.url);`}</Code>

            <h3 className="mb-1 mt-6 flex items-center gap-2 text-[15px] font-bold text-slate-100"><Terminal size={16} className="text-blue-400" /> Python (requests)</h3>
            <Code label="python">{`import os, time, requests

KEY = os.environ["BYGENCY_API_KEY"]
BASE = "${base}"
H = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# 이미지
img = requests.post(BASE, headers=H, json={
    "provider": "nanobanana", "model": "Nano Banana", "prompt": "노을 지는 해변"
}).json()
print(img["url"], img["credits_charged"])

# 영상 (시작 → 폴링)
start = requests.post(BASE, headers=H, json={
    "provider": "seedance", "model": "Seedance 2.0", "prompt": "질주하는 말", "seconds": 5
}).json()
q = start["statusUrl"].split("?", 1)[1]
while True:
    time.sleep(15)
    r = requests.get(f"{BASE}?{q}", headers=H).json()
    if r.get("status") == "succeeded" or r.get("url"):
        print(r.get("url")); break`}</Code>
          </section>

          {/* 요청 한도 */}
          <section>
            <Anchor id="limits" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ShieldCheck size={20} className="text-blue-400" /> {t('9. 요청 한도 (남용 방지)')}</h2>
            <p className="mb-3 text-[13.5px] text-[var(--text-soft)]">{t('서비스 보호를 위해 계정 단위로 요청 한도가 적용됩니다. 초과 시')} <b className="text-slate-200">HTTP 429</b> {t('와')} <code className="font-mono text-[12px]">Retry-After</code>{t('(초) 헤더를 반환합니다. 여러 키를 만들어도 한도는')} <b className="text-slate-200">{t('계정 합산')}</b>{t('으로 계산되어 우회할 수 없습니다.')}</p>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">{t('구분')}</th><th className="px-4 py-2.5 font-semibold">{t('한도')}</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    ['생성(POST) · 분당', '20회'],
                    ['생성(POST) · 시간당', '300회'],
                    ['생성(POST) · 일일', '2,000회'],
                    ['동시 진행 중 생성', '3건'],
                    ['상태 조회(GET) · 분당', '120회'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5">{t(a)}</td><td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{t(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 space-y-2 text-[13.5px] leading-relaxed text-[var(--text-soft)]">
              <li className="flex gap-2.5"><Check size={16} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('429를 받으면')} <code className="font-mono text-[12px]">Retry-After</code> {t('초만큼 기다린 뒤 재시도하세요(지수 백오프 권장).')}</li>
              <li className="flex gap-2.5"><Check size={16} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('폐기(revoke)된 키는 즉시')} <b>401</b>{t('로 거부되고, 잔액이 부족하면 생성 전에')} <b>402</b>{t('로 막힙니다(크레딧 마이너스 불가).')}</li>
              <li className="flex gap-2.5"><Check size={16} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('상태 조회(GET)는 15~30초 간격을 권장합니다. 과도한 폴링은 429를 유발합니다.')}</li>
            </ul>
          </section>

          {/* 크레딧 */}
          <section>
            <Anchor id="credits" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><Coins size={20} className="text-blue-400" /> {t('10. 크레딧·과금')}</h2>
            <ul className="space-y-2.5 text-[14px] leading-relaxed text-[var(--text-soft)]">
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('생성 1건마다')} <b className="text-slate-200">{t('키 소유자 본인 계정')}</b>{t('에서 크레딧이 차감됩니다(스튜디오와 동일 단가·배수).')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('생성')} <b className="text-slate-200">{t('전에 잔액을 확인')}</b>{t('해 부족하면')} <b>402</b>{t('로 거부합니다(크레딧 마이너스 없음).')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('영상은')} <b className="text-slate-200">{t('시작 시 1회만')}</b> {t('차감되고, 상태 확인(GET) 반복은 추가 과금이 없습니다.')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('응답의')} <code className="font-mono text-[12.5px]">credits_charged</code>·<code className="font-mono text-[12.5px]">credits_remaining</code> {t('로 차감액·잔액을 확인합니다.')}</li>
              <li className="flex gap-2.5"><Check size={17} className="mt-0.5 flex-shrink-0 text-blue-400" /> {t('제공사 API 키(Veo·Runway·Seedance 등)는')} <b className="text-slate-200">{t('서버에만')}</b> {t('있고 응답에 노출되지 않습니다.')}</li>
            </ul>
            <Link href="/pricing" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue-300 hover:underline">{t('크레딧 충전·요금제 보기')} <ArrowRight size={15} /></Link>
          </section>

          {/* 오류 */}
          <section>
            <Anchor id="errors" />
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-white"><ShieldCheck size={20} className="text-blue-400" /> {t('11. 오류 코드')}</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[.03] text-[var(--text-dim)]">
                  <tr><th className="px-4 py-2.5 font-semibold">HTTP</th><th className="px-4 py-2.5 font-semibold">{t('상황')}</th></tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {[
                    ['401', 'API 키 없음/오류 — "유효한 API 키가 필요합니다"'],
                    ['403', '노드형 AI 영상 플랜이 아님'],
                    ['402', '크레딧 부족 — need·have 함께 반환'],
                    ['429', '요청 한도 초과 — Retry-After(초) 헤더 참고'],
                    ['400', 'model/provider 누락 등 잘못된 요청'],
                    ['500', '제공사 미설정/서버 오류'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-t border-[var(--border-soft)]">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-300">{a}</td><td className="px-4 py-2.5">{t(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[.08] to-sky-500/[.05] p-6 text-center">
            <p className="text-[15px] font-semibold text-slate-100">{t('준비됐나요? 스튜디오에서 API 키를 발급하고 바로 호출하세요.')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href={STUDIO_URL} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">{t('API 키 발급')} <KeyRound size={14} /></Link>
              <a href="#image" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">{t('호출 예시 보기')} <ExternalLink size={14} /></a>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
