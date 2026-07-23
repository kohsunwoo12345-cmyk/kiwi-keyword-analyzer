'use client'

import { LegalShell } from '@/components/legal/LegalShell'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  '개인정보처리방침': { en: 'Privacy Policy', ja: 'プライバシーポリシー', zh: '隐私政策' },
  '2026년 9월 1일': { en: 'September 1, 2026', ja: '2026年9月1日', zh: '2026年9月1日' },

  '본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.': {
    en: 'The Korean-language version of this document is the original. In the event of any discrepancy between the translation and the Korean version, the Korean version prevails.',
    ja: '本書面は韓国語版を原本とします。翻訳版との間に解釈の相違がある場合は、韓国語版が優先します。',
    zh: '本文件以韩语版本为准。如译文与韩语版本存在解释差异，以韩语版本为准。',
  },

  '주식회사 넥스트 바이전시(이하 “회사”)는 BYGENCY 이용자의 개인정보를 중요하게 생각하며 적용되는 개인정보 보호 법령을 준수합니다.': {
    en: 'Next Bygency Inc. (the “Company”) values the personal information of BYGENCY users and complies with the applicable personal information protection laws.',
    ja: '株式会社ネクストバイジェンシー（以下「当社」）は、BYGENCY利用者の個人情報を重要視し、適用される個人情報保護法令を遵守します。',
    zh: 'Next Bygency 株式会社（以下称“公司”）重视 BYGENCY 用户的个人信息，并遵守适用的个人信息保护法律法规。',
  },
  '본 개인정보처리방침은 회사가 BYGENCY 웹사이트, 애플리케이션, AI 영상 생성, 랜딩페이지, CRM, 메시지 발송, 분석 및 협업 서비스를 제공하면서 개인정보를 어떻게 처리하는지 설명합니다.': {
    en: 'This Privacy Policy explains how the Company processes personal information in providing the BYGENCY website, applications, AI video generation, landing pages, CRM, message delivery, analytics, and collaboration services.',
    ja: '本プライバシーポリシーは、当社がBYGENCYのウェブサイト、アプリケーション、AI動画生成、ランディングページ、CRM、メッセージ配信、分析および協業サービスを提供するにあたり、個人情報をどのように取り扱うかを説明します。',
    zh: '本隐私政策说明公司在提供 BYGENCY 网站、应用程序、AI 视频生成、着陆页、CRM、消息发送、分析及协作服务时如何处理个人信息。',
  },

  '1. 개인정보처리자': { en: '1. Personal Information Controller', ja: '1. 個人情報取扱事業者', zh: '1. 个人信息处理者' },
  '상호:': { en: 'Company name:', ja: '商号：', zh: '公司名称：' },
  '주식회사 넥스트 바이전시': { en: 'Next Bygency Inc.', ja: '株式会社ネクストバイジェンシー', zh: 'Next Bygency 株式会社' },
  '대표자:': { en: 'Representative:', ja: '代表者：', zh: '法定代表人：' },
  '고선우': { en: 'Ko Seon-woo', ja: 'コ・ソヌ', zh: 'Ko Seon-woo' },
  '주소:': { en: 'Address:', ja: '住所：', zh: '地址：' },
  '대표 이메일:': { en: 'General email:', ja: '代表メール：', zh: '主要邮箱：' },
  '개인정보 보호책임자:': { en: 'Data Protection Officer:', ja: '個人情報保護責任者：', zh: '个人信息保护负责人：' },
  '개인정보 문의 이메일:': { en: 'Privacy inquiry email:', ja: '個人情報お問い合わせメール：', zh: '个人信息咨询邮箱：' },
  '전화번호:': { en: 'Phone:', ja: '電話番号：', zh: '电话号码：' },
  'EU·EEA 대리인:': { en: 'EU/EEA representative:', ja: 'EU・EEA代理人：', zh: '欧盟·欧洲经济区代理人：' },
  '영국 대리인:': { en: 'UK representative:', ja: '英国代理人：', zh: '英国代理人：' },
  '대한민국 국내대리인:': { en: 'Domestic representative in the Republic of Korea:', ja: '韓国国内代理人：', zh: '韩国境内代理人：' },
  '회사가 해외사업자인 경우에만 해당': {
    en: 'Applicable only where the Company is a foreign business operator',
    ja: '当社が海外事業者である場合にのみ該当',
    zh: '仅在公司为境外经营者时适用',
  },

  '2. 회사의 역할': { en: '2. The Company’s Role', ja: '2. 当社の役割', zh: '2. 公司的角色' },
  '회사가 회원 계정, 결제, 고객지원, 보안 및 회사 자체 마케팅을 위해 개인정보 처리 목적과 방법을 결정하는 경우 회사는 개인정보처리자 또는 데이터 컨트롤러입니다.': {
    en: 'Where the Company determines the purposes and means of processing personal information for member accounts, payment, customer support, security, and the Company’s own marketing, the Company acts as the personal information controller or data controller.',
    ja: '当社が会員アカウント、決済、カスタマーサポート、セキュリティおよび当社自身のマーケティングのために個人情報の処理目的および方法を決定する場合、当社は個人情報取扱事業者またはデータコントローラーです。',
    zh: '当公司为会员账户、支付、客户支持、安全及公司自身营销而决定个人信息处理目的和方法时，公司为个人信息处理者或数据控制者。',
  },
  '기업회원이 랜딩페이지·CRM·메시지 발송 기능을 통해 자신의 고객 데이터를 처리하고 회사가 기업회원의 지시에 따라 처리하는 경우 기업회원은 개인정보처리자 또는 컨트롤러이고 회사는 수탁자 또는 프로세서입니다.': {
    en: 'Where a corporate member processes its own customer data through the landing page, CRM, and message delivery features and the Company processes it under the corporate member’s instructions, the corporate member is the personal information controller or controller and the Company is the processor.',
    ja: '企業会員がランディングページ・CRM・メッセージ配信機能を通じて自らの顧客データを処理し、当社が企業会員の指示に従って処理する場合、企業会員は個人情報取扱事業者またはコントローラーであり、当社は受託者またはプロセッサーです。',
    zh: '当企业会员通过着陆页、CRM、消息发送功能处理其自身的客户数据，且公司依据企业会员的指示进行处理时，企业会员为个人信息处理者或控制者，公司为受托方或处理者。',
  },
  '기업회원의 고객 데이터에는 본 개인정보처리방침과 함께 기업회원이 정보주체에게 제공하는 개인정보처리방침이 적용됩니다.': {
    en: 'A corporate member’s customer data is governed by this Privacy Policy together with the privacy policy that the corporate member provides to its data subjects.',
    ja: '企業会員の顧客データには、本プライバシーポリシーとともに、企業会員が情報主体に提供するプライバシーポリシーが適用されます。',
    zh: '企业会员的客户数据除适用本隐私政策外，还适用企业会员向信息主体提供的隐私政策。',
  },
  '기업회원이 고객정보를 적법하게 수집·이용하는지 여부에 관한 일차적 책임은 해당 기업회원에게 있습니다.': {
    en: 'Primary responsibility for whether a corporate member lawfully collects and uses customer information rests with that corporate member.',
    ja: '企業会員が顧客情報を適法に収集・利用しているか否かに関する一次的責任は、当該企業会員にあります。',
    zh: '企业会员是否合法收集、使用客户信息的首要责任由该企业会员承担。',
  },

  '3. 처리하는 개인정보': { en: '3. Personal Information We Process', ja: '3. 取り扱う個人情報', zh: '3. 处理的个人信息' },

  '3.1 회원가입 및 계정정보': { en: '3.1 Sign-up and Account Information', ja: '3.1 会員登録およびアカウント情報', zh: '3.1 注册及账户信息' },
  '필수 또는 일반 항목: 이메일 주소, 비밀번호 암호화값, 표시 이름, 회원 식별번호, 국가, 언어, 회원 유형, 가입일시, 계정 상태': {
    en: 'Required or general items: email address, encrypted password value, display name, member ID number, country, language, member type, sign-up date and time, account status',
    ja: '必須または一般項目：メールアドレス、パスワードの暗号化値、表示名、会員識別番号、国、言語、会員種別、登録日時、アカウント状態',
    zh: '必需或一般项目：邮箱地址、密码加密值、显示名称、会员识别号、国家、语言、会员类型、注册时间、账户状态',
  },
  '기업회원 추가 항목: 회사명, 부서명, 직책, 담당자명, 업무용 전화번호, 사업자정보, 워크스페이스 정보': {
    en: 'Additional items for corporate members: company name, department name, job title, contact person name, business phone number, business registration information, workspace information',
    ja: '企業会員の追加項目：会社名、部署名、役職、担当者名、業務用電話番号、事業者情報、ワークスペース情報',
    zh: '企业会员附加项目：公司名称、部门名称、职务、负责人姓名、办公电话号码、营业主体信息、工作区信息',
  },

  '3.2 인증정보': { en: '3.2 Authentication Information', ja: '3.2 認証情報', zh: '3.2 认证信息' },
  '이메일 인증기록, 휴대전화 인증기록, 소셜 로그인 사업자가 제공하는 계정 식별값, 다중인증 설정정보': {
    en: 'Email verification records, mobile phone verification records, account identifiers provided by social login providers, multi-factor authentication settings',
    ja: 'メール認証記録、携帯電話認証記録、ソーシャルログイン事業者が提供するアカウント識別値、多要素認証の設定情報',
    zh: '邮箱验证记录、手机验证记录、社交登录提供商提供的账户识别值、多重认证设置信息',
  },
  '회사는 소셜 로그인 비밀번호를 수집하지 않습니다.': {
    en: 'The Company does not collect social login passwords.',
    ja: '当社はソーシャルログインのパスワードを収集しません。',
    zh: '公司不收集社交登录密码。',
  },

  '3.3 결제 및 거래정보': { en: '3.3 Payment and Transaction Information', ja: '3.3 決済および取引情報', zh: '3.3 支付及交易信息' },
  '요금제, 결제금액, 통화, 결제일, 구독상태, 청구주소, 세금정보, 거래번호, 환불기록, 결제수단의 일부 식별정보': {
    en: 'Plan, payment amount, currency, payment date, subscription status, billing address, tax information, transaction number, refund records, partial identifying information of the payment method',
    ja: '料金プラン、決済金額、通貨、決済日、サブスクリプション状態、請求先住所、税務情報、取引番号、返金記録、決済手段の一部識別情報',
    zh: '套餐、支付金额、货币、支付日期、订阅状态、账单地址、税务信息、交易编号、退款记录、支付方式的部分识别信息',
  },
  '신용카드 전체 번호와 보안코드는 원칙적으로 결제대행사가 처리하며 회사는 전체 카드정보를 직접 저장하지 않습니다.': {
    en: 'Full credit card numbers and security codes are, as a rule, handled by the payment gateway, and the Company does not directly store full card information.',
    ja: 'クレジットカードの全番号およびセキュリティコードは原則として決済代行会社が処理し、当社はカード情報の全部を直接保存しません。',
    zh: '信用卡完整卡号和安全码原则上由支付代理机构处理，公司不直接存储完整的卡片信息。',
  },

  '3.4 서비스 이용정보': { en: '3.4 Service Usage Information', ja: '3.4 サービス利用情報', zh: '3.4 服务使用信息' },
  '로그인 일시, IP 주소, 기기·브라우저 정보, 운영체제, 쿠키 식별자, 방문 화면, 클릭·기능 이용기록, 오류기록, 생성 요청시간, 사용 크레딧, API 이용기록': {
    en: 'Login date and time, IP address, device and browser information, operating system, cookie identifiers, pages visited, click and feature usage records, error logs, generation request times, credits used, API usage records',
    ja: 'ログイン日時、IPアドレス、端末・ブラウザ情報、オペレーティングシステム、Cookie識別子、閲覧画面、クリック・機能利用記録、エラー記録、生成リクエスト時刻、使用クレジット、API利用記録',
    zh: '登录时间、IP 地址、设备及浏览器信息、操作系统、Cookie 标识符、访问页面、点击及功能使用记录、错误记录、生成请求时间、使用积分、API 使用记录',
  },

  '3.5 AI 입력물과 생성물': { en: '3.5 AI Inputs and Outputs', ja: '3.5 AI入力物と生成物', zh: '3.5 AI 输入内容与生成内容' },
  '프롬프트, 노드 설정값, 업로드한 이미지·영상·음성·음악·문서, 참조파일, 생성 결과물, 생성 과정의 기술정보, 안전성 검사 결과, 이용자 피드백': {
    en: 'Prompts, node settings, uploaded images, videos, audio, music, and documents, reference files, generated outputs, technical information from the generation process, safety review results, user feedback',
    ja: 'プロンプト、ノード設定値、アップロードした画像・動画・音声・音楽・文書、参照ファイル、生成結果物、生成過程の技術情報、安全性検査結果、利用者フィードバック',
    zh: '提示词、节点设置值、上传的图片·视频·语音·音乐·文档、参考文件、生成结果、生成过程的技术信息、安全性检查结果、用户反馈',
  },

  '3.6 CRM 및 랜딩페이지 데이터': { en: '3.6 CRM and Landing Page Data', ja: '3.6 CRMおよびランディングページデータ', zh: '3.6 CRM 及着陆页数据' },
  '기업회원이 입력하거나 최종 이용자로부터 수집하는 이름, 전화번호, 이메일 주소, 회사명, 직책, 상담내용, 캠페인 정보, 동의기록, 발송기록, 수신거부기록 및 기업회원이 설정한 추가 항목': {
    en: 'Names, phone numbers, email addresses, company names, job titles, inquiry content, campaign information, consent records, delivery records, opt-out records that a corporate member enters or collects from end users, and additional items configured by the corporate member',
    ja: '企業会員が入力し、または最終利用者から収集する氏名、電話番号、メールアドレス、会社名、役職、相談内容、キャンペーン情報、同意記録、配信記録、受信拒否記録、および企業会員が設定した追加項目',
    zh: '企业会员录入或从最终用户处收集的姓名、电话号码、邮箱地址、公司名称、职务、咨询内容、活动信息、同意记录、发送记录、拒收记录，以及企业会员设置的附加项目',
  },
  '회사는 기업회원에게 주민등록번호, 금융계좌 비밀번호, 건강정보 또는 불필요한 민감정보를 수집하지 않도록 요구합니다.': {
    en: 'The Company requires corporate members not to collect resident registration numbers, financial account passwords, health information, or unnecessary sensitive information.',
    ja: '当社は企業会員に対し、住民登録番号、金融口座のパスワード、健康情報または不要な機微情報を収集しないよう求めます。',
    zh: '公司要求企业会员不得收集居民登记号、金融账户密码、健康信息或不必要的敏感信息。',
  },

  '3.7 메시지 발송정보': { en: '3.7 Message Delivery Information', ja: '3.7 メッセージ配信情報', zh: '3.7 消息发送信息' },
  '수신자 전화번호 또는 이메일 주소, 발신번호, 메시지 내용, 발송시간, 성공·실패 여부, 통신사·메시지 사업자의 처리결과, 수신거부 및 동의 철회 기록': {
    en: 'Recipient phone numbers or email addresses, sender numbers, message content, delivery times, success/failure status, processing results from carriers and messaging providers, opt-out and consent withdrawal records',
    ja: '受信者の電話番号またはメールアドレス、発信番号、メッセージ内容、配信時刻、成功・失敗の有無、通信事業者・メッセージ事業者の処理結果、受信拒否および同意撤回の記録',
    zh: '收件人电话号码或邮箱地址、发送号码、消息内容、发送时间、成功·失败情况、运营商·消息服务商的处理结果、拒收及撤回同意记录',
  },

  '3.8 협업정보': { en: '3.8 Collaboration Information', ja: '3.8 協業情報', zh: '3.8 协作信息' },
  '워크스페이스, 구성원, 역할, 초대기록, 프로젝트, 댓글, 승인기록, 파일 변경이력': {
    en: 'Workspaces, members, roles, invitation records, projects, comments, approval records, file change history',
    ja: 'ワークスペース、メンバー、役割、招待記録、プロジェクト、コメント、承認記録、ファイル変更履歴',
    zh: '工作区、成员、角色、邀请记录、项目、评论、审批记录、文件变更历史',
  },

  '3.9 외부 서비스 연동정보': { en: '3.9 External Service Integration Information', ja: '3.9 外部サービス連携情報', zh: '3.9 外部服务对接信息' },
  '회원이 연동한 소셜 계정, 광고계정, 네이버 관련 계정 또는 API 토큰, 공개 게시물·플레이스·블로그 식별정보, 연동 권한과 만료일': {
    en: 'Social accounts, advertising accounts, Naver-related accounts or API tokens linked by the member, identifiers for public posts, Place listings, and blogs, and integration permissions and expiration dates',
    ja: '会員が連携したソーシャルアカウント、広告アカウント、Naver関連アカウントまたはAPIトークン、公開投稿・プレイス・ブログの識別情報、連携権限と有効期限',
    zh: '会员对接的社交账户、广告账户、Naver 相关账户或 API 令牌、公开帖子·地点·博客识别信息、对接权限与到期日',
  },
  '회사는 필요한 권한만 요청하며 회원은 외부 서비스의 설정에서 연동을 해제할 수 있습니다.': {
    en: 'The Company requests only the necessary permissions, and members may revoke the integration in the settings of the external service.',
    ja: '当社は必要な権限のみを要求し、会員は外部サービスの設定から連携を解除できます。',
    zh: '公司仅请求必要的权限，会员可在外部服务的设置中解除对接。',
  },

  '3.10 고객지원정보': { en: '3.10 Customer Support Information', ja: '3.10 カスタマーサポート情報', zh: '3.10 客户支持信息' },
  '문의내용, 첨부파일, 통화 또는 채팅기록, 계정 확인정보, 분쟁 및 처리결과': {
    en: 'Inquiry content, attachments, call or chat records, account verification information, disputes and their resolution',
    ja: 'お問い合わせ内容、添付ファイル、通話またはチャット記録、アカウント確認情報、紛争および処理結果',
    zh: '咨询内容、附件、通话或聊天记录、账户确认信息、争议及处理结果',
  },

  '4. 민감정보와 생체정보': { en: '4. Sensitive Information and Biometric Information', ja: '4. 機微情報と生体情報', zh: '4. 敏感信息与生物识别信息' },
  '회사는 원칙적으로 민감정보를 회원가입에 요구하지 않습니다.': {
    en: 'As a rule, the Company does not require sensitive information for sign-up.',
    ja: '当社は原則として機微情報を会員登録の際に要求しません。',
    zh: '公司原则上不要求在注册时提供敏感信息。',
  },
  '회원이 얼굴 또는 음성을 포함한 파일을 업로드할 경우 해당 자료는 AI 콘텐츠 생성을 위해 처리될 수 있습니다.': {
    en: 'Where a member uploads a file containing a face or voice, such material may be processed for AI content generation.',
    ja: '会員が顔または音声を含むファイルをアップロードした場合、当該資料はAIコンテンツ生成のために処理されることがあります。',
    zh: '会员上传包含人脸或语音的文件时，该资料可能被用于 AI 内容生成的处理。',
  },
  '회사는 얼굴·음성을 개인을 고유하게 식별하기 위한 생체인증 또는 생체식별 목적으로 사용하지 않습니다. 별도 기능을 도입하는 경우 사전 고지와 필요한 동의를 받습니다.': {
    en: 'The Company does not use faces or voices for biometric authentication or biometric identification to uniquely identify an individual. If a separate feature is introduced, the Company will provide prior notice and obtain the necessary consent.',
    ja: '当社は顔・音声を個人を一意に識別するための生体認証または生体識別の目的で使用しません。別途の機能を導入する場合は、事前告知と必要な同意を取得します。',
    zh: '公司不将人脸·语音用于唯一识别个人的生物识别认证或生物识别目的。如引入单独功能，将事先告知并取得必要的同意。',
  },
  '회원은 타인의 얼굴, 음성, 건강, 정치적 견해, 종교, 성생활, 유전정보 또는 기타 민감정보를 업로드하기 전에 적법한 근거와 필요한 동의를 확보해야 합니다.': {
    en: 'Before uploading another person’s face, voice, health, political opinions, religion, sex life, genetic information, or other sensitive information, a member must secure a lawful basis and the necessary consent.',
    ja: '会員は、他人の顔、音声、健康、政治的見解、宗教、性生活、遺伝情報またはその他の機微情報をアップロードする前に、適法な根拠と必要な同意を確保しなければなりません。',
    zh: '会员在上传他人的人脸、语音、健康、政治观点、宗教、性生活、遗传信息或其他敏感信息之前，必须取得合法依据和必要的同意。',
  },
  '민감정보가 불필요한 경우 업로드하지 않아야 하며 회사는 위험한 정보의 삭제 또는 마스킹을 요청할 수 있습니다.': {
    en: 'Sensitive information should not be uploaded where it is unnecessary, and the Company may request the deletion or masking of risky information.',
    ja: '機微情報が不要な場合はアップロードしてはならず、当社は危険な情報の削除またはマスキングを要請することができます。',
    zh: '在不必要的情况下不应上传敏感信息，公司可要求删除或遮蔽存在风险的信息。',
  },

  '5. 개인정보 처리 목적과 법적 근거': { en: '5. Purposes and Legal Bases for Processing Personal Information', ja: '5. 個人情報の処理目的と法的根拠', zh: '5. 个人信息处理目的与法律依据' },

  '5.1 회원가입 및 계정 운영': { en: '5.1 Sign-up and Account Operation', ja: '5.1 会員登録およびアカウント運営', zh: '5.1 注册及账户运营' },
  '목적:': { en: 'Purpose:', ja: '目的：', zh: '目的：' },
  '회원 식별, 가입, 인증, 로그인, 계정관리, 워크스페이스 제공': {
    en: 'Member identification, sign-up, authentication, login, account management, workspace provision',
    ja: '会員識別、登録、認証、ログイン、アカウント管理、ワークスペースの提供',
    zh: '会员识别、注册、认证、登录、账户管理、工作区提供',
  },
  '법적 근거:': { en: 'Legal basis:', ja: '法的根拠：', zh: '法律依据：' },
  '계약 체결 및 이행, 회원의 요청에 따른 계약 전 조치, 적용 법률상 필요한 경우 동의': {
    en: 'Conclusion and performance of the contract, pre-contractual measures at the member’s request, and consent where required under applicable law',
    ja: '契約の締結および履行、会員の要請に基づく契約前の措置、適用法上必要な場合の同意',
    zh: '合同的订立及履行、应会员请求采取的合同前措施、适用法律要求时的同意',
  },

  '5.2 AI 및 SaaS 기능 제공': { en: '5.2 Provision of AI and SaaS Features', ja: '5.2 AIおよびSaaS機能の提供', zh: '5.2 AI 及 SaaS 功能提供' },
  'AI 요청 처리, 콘텐츠 생성, 저장, 다운로드, 프로젝트 관리, 기술지원': {
    en: 'Processing AI requests, content generation, storage, download, project management, technical support',
    ja: 'AIリクエストの処理、コンテンツ生成、保存、ダウンロード、プロジェクト管理、技術サポート',
    zh: 'AI 请求处理、内容生成、存储、下载、项目管理、技术支持',
  },
  '계약 이행': { en: 'Performance of the contract', ja: '契約の履行', zh: '合同的履行' },

  '5.3 결제 및 회계': { en: '5.3 Payment and Accounting', ja: '5.3 決済および会計', zh: '5.3 支付及会计' },
  '결제, 정기구독, 세금계산서, 환불, 거래기록 보관': {
    en: 'Payment, subscription, tax invoices, refunds, retention of transaction records',
    ja: '決済、定期購読、税金計算書、返金、取引記録の保管',
    zh: '支付、定期订阅、税务发票、退款、交易记录保存',
  },
  '계약 이행 및 법적 의무 준수': {
    en: 'Performance of the contract and compliance with legal obligations',
    ja: '契約の履行および法的義務の遵守',
    zh: '合同的履行及法律义务的遵守',
  },

  '5.4 보안과 부정 이용 방지': { en: '5.4 Security and Prevention of Misuse', ja: '5.4 セキュリティと不正利用の防止', zh: '5.4 安全与防止滥用' },
  '계정도용, 사기, 스팸, 악성코드, 보안공격 및 약관 위반 탐지': {
    en: 'Detection of account takeover, fraud, spam, malware, security attacks, and violations of the terms',
    ja: 'アカウント乗っ取り、詐欺、スパム、マルウェア、セキュリティ攻撃および規約違反の検知',
    zh: '检测账户盗用、欺诈、垃圾信息、恶意代码、安全攻击及违反条款的行为',
  },
  '법적 의무, 회사와 이용자의 정당한 이익, 계약 이행': {
    en: 'Legal obligations, the legitimate interests of the Company and users, and performance of the contract',
    ja: '法的義務、当社および利用者の正当な利益、契約の履行',
    zh: '法律义务、公司与用户的正当利益、合同的履行',
  },

  '5.5 고객지원': { en: '5.5 Customer Support', ja: '5.5 カスタマーサポート', zh: '5.5 客户支持' },
  '문의 확인, 장애처리, 분쟁해결, 품질관리': {
    en: 'Handling inquiries, resolving incidents, dispute resolution, quality management',
    ja: 'お問い合わせ対応、障害処理、紛争解決、品質管理',
    zh: '咨询处理、故障处理、争议解决、质量管理',
  },
  '계약 이행, 법적 의무, 정당한 이익': {
    en: 'Performance of the contract, legal obligations, legitimate interests',
    ja: '契約の履行、法的義務、正当な利益',
    zh: '合同的履行、法律义务、正当利益',
  },

  '5.6 마케팅': { en: '5.6 Marketing', ja: '5.6 マーケティング', zh: '5.6 营销' },
  '프로모션, 할인, 이벤트, 신기능 및 마케팅 성과분석': {
    en: 'Promotions, discounts, events, new features, and marketing performance analysis',
    ja: 'プロモーション、割引、イベント、新機能およびマーケティング成果分析',
    zh: '促销、折扣、活动、新功能及营销效果分析',
  },
  '이용자의 선택 동의 또는 현지 법률이 허용하는 기존 거래관계': {
    en: 'The user’s opt-in consent or an existing business relationship permitted by local law',
    ja: '利用者の選択同意または現地法が許容する既存の取引関係',
    zh: '用户的选择同意或当地法律允许的既有交易关系',
  },

  '5.7 분석 쿠키': { en: '5.7 Analytics Cookies', ja: '5.7 分析Cookie', zh: '5.7 分析 Cookie' },
  '서비스 이용통계, 화면 개선, 오류분석': {
    en: 'Service usage statistics, screen improvement, error analysis',
    ja: 'サービス利用統計、画面改善、エラー分析',
    zh: '服务使用统计、界面改进、错误分析',
  },
  '동의가 필요한 국가에서는 이용자의 동의, 그 밖의 경우 회사의 정당한 이익 또는 적용 법률상 허용되는 근거': {
    en: 'The user’s consent in countries where consent is required, and otherwise the Company’s legitimate interests or a basis permitted under applicable law',
    ja: '同意が必要な国では利用者の同意、その他の場合は当社の正当な利益または適用法上許容される根拠',
    zh: '在需要同意的国家为用户的同意，其他情形下为公司的正当利益或适用法律允许的依据',
  },

  '5.8 AI 품질 개선과 학습': { en: '5.8 AI Quality Improvement and Training', ja: '5.8 AI品質改善と学習', zh: '5.8 AI 质量改进与训练' },
  '오류분석, 안전성 평가, 기능 및 모델 개선': {
    en: 'Error analysis, safety evaluation, improvement of features and models',
    ja: 'エラー分析、安全性評価、機能およびモデルの改善',
    zh: '错误分析、安全性评估、功能及模型改进',
  },
  '이용자의 별도 선택 동의 또는 완전히 익명화되어 개인정보가 아닌 정보': {
    en: 'The user’s separate opt-in consent, or fully anonymized information that is not personal information',
    ja: '利用者の別途の選択同意、または完全に匿名化され個人情報に該当しない情報',
    zh: '用户的单独选择同意，或完全匿名化而非个人信息的信息',
  },
  '회사는 회원의 별도 동의 없이 고객 데이터 또는 AI 입력·생성물을 범용 모델 학습에 사용하지 않습니다.': {
    en: 'The Company does not use customer data or AI inputs and outputs for training general-purpose models without the member’s separate consent.',
    ja: '当社は会員の別途の同意なく、顧客データまたはAI入力・生成物を汎用モデルの学習に使用しません。',
    zh: '未经会员单独同意，公司不将客户数据或 AI 输入·生成内容用于通用模型的训练。',
  },

  '5.9 법적 의무와 권리보호': { en: '5.9 Legal Obligations and Protection of Rights', ja: '5.9 法的義務と権利保護', zh: '5.9 法律义务与权利保护' },
  '법령, 법원 명령, 규제기관 요청, 권리침해 대응 및 법적 청구의 제기·방어': {
    en: 'Laws, court orders, requests from regulators, responding to rights infringements, and the establishment and defense of legal claims',
    ja: '法令、裁判所の命令、規制機関の要請、権利侵害への対応および法的請求の提起・防御',
    zh: '法律法规、法院命令、监管机构要求、应对权利侵害及法律请求的提出·抗辩',
  },
  '법적 의무, 정당한 이익 및 법적 청구 관련 처리': {
    en: 'Legal obligations, legitimate interests, and processing related to legal claims',
    ja: '法的義務、正当な利益および法的請求に関連する処理',
    zh: '法律义务、正当利益及与法律请求相关的处理',
  },

  '6. 자동으로 수집되는 정보': { en: '6. Automatically Collected Information', ja: '6. 自動的に収集される情報', zh: '6. 自动收集的信息' },
  '회사는 서비스 이용 과정에서 IP 주소, 기기정보, 브라우저정보, 접속시간, 이용기록, 쿠키, 오류 및 보안로그를 수집할 수 있습니다.': {
    en: 'In the course of service use, the Company may collect IP addresses, device information, browser information, access times, usage records, cookies, and error and security logs.',
    ja: '当社はサービス利用の過程で、IPアドレス、端末情報、ブラウザ情報、接続時刻、利用記録、Cookie、エラーおよびセキュリティログを収集することがあります。',
    zh: '公司在服务使用过程中可能收集 IP 地址、设备信息、浏览器信息、访问时间、使用记录、Cookie、错误及安全日志。',
  },
  '회사는 이러한 정보를 다음 목적으로 처리합니다.': {
    en: 'The Company processes such information for the following purposes.',
    ja: '当社はこれらの情報を次の目的で処理します。',
    zh: '公司出于以下目的处理此类信息。',
  },
  '로그인 유지': { en: 'Maintaining login sessions', ja: 'ログインの維持', zh: '维持登录状态' },
  '보안과 부정 이용 방지': { en: 'Security and prevention of misuse', ja: 'セキュリティと不正利用の防止', zh: '安全与防止滥用' },
  '서비스 오류 분석': { en: 'Service error analysis', ja: 'サービスのエラー分析', zh: '服务错误分析' },
  '이용량 계산': { en: 'Calculating usage', ja: '利用量の計算', zh: '使用量计算' },
  '지역별 법률 및 언어 적용': { en: 'Applying region-specific laws and languages', ja: '地域別の法律および言語の適用', zh: '按地区适用法律及语言' },
  '이용자 동의를 받은 분석 또는 맞춤형 기능': {
    en: 'Analytics or personalized features for which the user has consented',
    ja: '利用者の同意を得た分析またはパーソナライズ機能',
    zh: '经用户同意的分析或个性化功能',
  },
  '정확한 위치정보는 별도 기능에서 필요하고 이용자가 허용한 경우에만 처리합니다.': {
    en: 'Precise location information is processed only where required by a specific feature and where the user has permitted it.',
    ja: '正確な位置情報は、別途の機能で必要とされ、かつ利用者が許可した場合にのみ処理します。',
    zh: '精确位置信息仅在特定功能需要且用户允许时才予以处理。',
  },

  '7. 개인정보 수집 출처': { en: '7. Sources of Personal Information Collection', ja: '7. 個人情報の収集出所', zh: '7. 个人信息收集来源' },
  '회사는 다음 경로로 개인정보를 수집합니다.': {
    en: 'The Company collects personal information through the following channels.',
    ja: '当社は次の経路で個人情報を収集します。',
    zh: '公司通过以下渠道收集个人信息。',
  },
  '회원이 직접 입력하거나 업로드': { en: 'Direct entry or upload by the member', ja: '会員による直接入力またはアップロード', zh: '会员直接录入或上传' },
  '기업 워크스페이스 관리자가 구성원 정보를 제공': {
    en: 'A corporate workspace administrator providing member information',
    ja: '企業ワークスペース管理者によるメンバー情報の提供',
    zh: '企业工作区管理员提供成员信息',
  },
  '기업회원이 고객 데이터를 업로드': { en: 'A corporate member uploading customer data', ja: '企業会員による顧客データのアップロード', zh: '企业会员上传客户数据' },
  '소셜 로그인 및 외부 연동 서비스': { en: 'Social login and external integration services', ja: 'ソーシャルログインおよび外部連携サービス', zh: '社交登录及外部对接服务' },
  '결제대행사, 문자·이메일 발송사 및 통신 사업자': {
    en: 'Payment gateways, SMS and email delivery providers, and telecommunications carriers',
    ja: '決済代行会社、SMS・メール配信会社および通信事業者',
    zh: '支付代理机构、短信·邮件发送商及通信运营商',
  },
  '서비스 이용 과정에서 자동 생성': { en: 'Automatic generation in the course of service use', ja: 'サービス利用の過程での自動生成', zh: '在服务使用过程中自动生成' },
  '법률이 허용하는 공개 출처': { en: 'Public sources permitted by law', ja: '法律が許容する公開出所', zh: '法律允许的公开来源' },
  '공개된 정보라는 이유만으로 이를 무제한 마케팅에 이용하지 않습니다.': {
    en: 'The Company does not use information for unlimited marketing merely because it is publicly available.',
    ja: '公開された情報であるという理由のみで、これを無制限にマーケティングに利用することはありません。',
    zh: '公司不会仅因信息为公开信息而将其无限制地用于营销。',
  },

  '8. 개인정보의 제3자 제공': { en: '8. Provision of Personal Information to Third Parties', ja: '8. 個人情報の第三者提供', zh: '8. 个人信息向第三方提供' },
  '회사는 다음 경우를 제외하고 개인정보를 제3자의 독립적인 목적으로 제공하지 않습니다.': {
    en: 'Except in the following cases, the Company does not provide personal information for a third party’s independent purposes.',
    ja: '当社は次の場合を除き、個人情報を第三者の独立した目的で提供しません。',
    zh: '除下列情形外，公司不会为第三方的独立目的提供个人信息。',
  },
  '이용자가 별도로 동의한 경우': { en: 'Where the user has separately consented', ja: '利用者が別途同意した場合', zh: '用户单独同意的情形' },
  '계약 이행을 위해 이용자가 요청한 외부 서비스에 제공하는 경우': {
    en: 'Where provided to an external service requested by the user for performance of the contract',
    ja: '契約の履行のために利用者が要請した外部サービスに提供する場合',
    zh: '为履行合同而向用户请求的外部服务提供的情形',
  },
  '법률에 특별한 규정이 있거나 적법한 법적 요청이 있는 경우': {
    en: 'Where there is a special provision of law or a lawful legal request',
    ja: '法律に特別の規定がある場合、または適法な法的要請がある場合',
    zh: '法律有特别规定或存在合法的法律要求的情形',
  },
  '합병, 영업양도 또는 투자거래 과정에서 적절한 비밀유지와 보호조치를 적용한 경우': {
    en: 'Where appropriate confidentiality and protective measures are applied in the course of a merger, business transfer, or investment transaction',
    ja: '合併、営業譲渡または投資取引の過程で、適切な秘密保持および保護措置を適用した場合',
    zh: '在合并、营业转让或投资交易过程中采取了适当保密及保护措施的情形',
  },
  '생명 또는 안전에 급박한 위험을 방지하기 위해 법률상 허용되는 경우': {
    en: 'Where permitted by law to prevent an imminent risk to life or safety',
    ja: '生命または安全に対する切迫した危険を防止するために法律上許容される場合',
    zh: '为防止对生命或安全的紧迫危险而法律允许的情形',
  },
  '개인정보 제3자 제공이 발생하면 제공받는 자, 목적, 항목, 보유기간 및 거부권을 별도로 알리고 필요한 동의를 받습니다.': {
    en: 'Where a third-party provision of personal information occurs, the Company separately informs the data subject of the recipient, purpose, items, retention period, and right to refuse, and obtains the necessary consent.',
    ja: '個人情報の第三者提供が生じる場合、提供を受ける者、目的、項目、保有期間および拒否権を別途通知し、必要な同意を取得します。',
    zh: '发生个人信息向第三方提供时，公司将单独告知接收方、目的、项目、保存期限及拒绝权，并取得必要的同意。',
  },

  '9. 개인정보 처리위탁': { en: '9. Entrustment of Personal Information Processing', ja: '9. 個人情報の処理委託', zh: '9. 个人信息处理委托' },
  '회사는 서비스 운영을 위해 다음 업무를 위탁할 수 있습니다.': {
    en: 'The Company may entrust the following tasks for the operation of the service.',
    ja: '当社はサービス運営のために次の業務を委託することがあります。',
    zh: '公司可为服务运营委托以下业务。',
  },
  '클라우드 호스팅 및 데이터 저장': { en: 'Cloud hosting and data storage', ja: 'クラウドホスティングおよびデータ保存', zh: '云托管及数据存储' },
  'AI 영상·이미지·음성 생성': { en: 'AI video, image, and audio generation', ja: 'AI動画・画像・音声の生成', zh: 'AI 视频·图片·语音生成' },
  '결제 및 청구': { en: 'Payment and billing', ja: '決済および請求', zh: '支付及计费' },
  '이메일 발송': { en: 'Email delivery', ja: 'メール配信', zh: '邮件发送' },
  'SMS·LMS·MMS 발송': { en: 'SMS/LMS/MMS delivery', ja: 'SMS・LMS・MMSの配信', zh: 'SMS·LMS·MMS 发送' },
  '카카오 비즈메시지 발송': { en: 'Kakao Biz Message delivery', ja: 'カカオビズメッセージの配信', zh: 'Kakao 商务消息发送' },
  '고객지원': { en: 'Customer support', ja: 'カスタマーサポート', zh: '客户支持' },
  '오류분석과 모니터링': { en: 'Error analysis and monitoring', ja: 'エラー分析とモニタリング', zh: '错误分析与监控' },
  '인증 및 소셜 로그인': { en: 'Authentication and social login', ja: '認証およびソーシャルログイン', zh: '认证及社交登录' },
  '콘텐츠 안전성 검사': { en: 'Content safety review', ja: 'コンテンツの安全性検査', zh: '内容安全性检查' },
  '실제 수탁자 표는 서비스 공개 시점에 아래 형식으로 공개합니다. (수탁자 / 위탁업무 / 처리 항목 / 보유기간 / 처리 국가 / 재수탁 여부) — 현재': {
    en: 'The actual list of processors will be disclosed at the time of service launch in the format below (Processor / Entrusted task / Items processed / Retention period / Country of processing / Sub-processing). Currently',
    ja: '実際の受託者一覧は、サービス公開時点で下記の形式で公開します。（受託者／委託業務／処理項目／保有期間／処理国／再委託の有無）— 現在',
    zh: '实际的受托方清单将在服务上线时以下述格式公开。（受托方 / 委托业务 / 处理项目 / 保存期限 / 处理国家 / 是否再委托）— 目前',
  },
  '회사는 수탁자와 개인정보 보호계약을 체결하고 필요한 관리·감독을 수행합니다.': {
    en: 'The Company enters into a personal information protection agreement with processors and carries out the necessary management and supervision.',
    ja: '当社は受託者と個人情報保護契約を締結し、必要な管理・監督を行います。',
    zh: '公司与受托方签订个人信息保护协议，并进行必要的管理·监督。',
  },

  '10. 개인정보 국외이전': { en: '10. Overseas Transfer of Personal Information', ja: '10. 個人情報の国外移転', zh: '10. 个人信息跨境转移' },
  '서비스 제공 과정에서 개인정보가 국외로 이전, 저장 또는 국외에서 조회될 수 있습니다.': {
    en: 'In the course of providing the service, personal information may be transferred overseas, stored overseas, or accessed from overseas.',
    ja: 'サービス提供の過程で、個人情報が国外に移転・保存され、または国外から照会されることがあります。',
    zh: '在提供服务的过程中，个人信息可能被转移、存储至境外或从境外访问。',
  },
  '회사는 개인정보 국외이전에 대해 적용 법률상 허용되는 다음 근거 중 적절한 근거를 적용합니다.': {
    en: 'For overseas transfers of personal information, the Company applies an appropriate basis among the following bases permitted under applicable law.',
    ja: '当社は個人情報の国外移転について、適用法上許容される次の根拠のうち適切な根拠を適用します。',
    zh: '对于个人信息的跨境转移，公司在适用法律允许的下列依据中适用适当的依据。',
  },
  '정보주체의 별도 동의': { en: 'The data subject’s separate consent', ja: '情報主体の別途同意', zh: '信息主体的单独同意' },
  '정보주체와의 계약 체결·이행에 필요한 처리위탁 또는 보관과 적법한 고지': {
    en: 'Entrustment of processing or storage necessary for the conclusion and performance of a contract with the data subject, together with lawful notice',
    ja: '情報主体との契約の締結・履行に必要な処理委託または保管と、適法な告知',
    zh: '为与信息主体订立·履行合同所必需的处理委托或保管，以及合法告知',
  },
  '법률, 조약 또는 국제협정': { en: 'Laws, treaties, or international agreements', ja: '法律、条約または国際協定', zh: '法律、条约或国际协定' },
  '인정된 인증': { en: 'Recognized certification', ja: '認定された認証', zh: '经认可的认证' },
  '개인정보 보호수준에 대한 동등성 또는 적정성 결정': {
    en: 'An equivalence or adequacy decision regarding the level of personal information protection',
    ja: '個人情報保護水準に関する同等性または十分性の決定',
    zh: '关于个人信息保护水平的对等性或充分性认定',
  },
  'EU 표준계약조항, 영국 국제데이터이전 부속서 또는 기타 적절한 보호조치': {
    en: 'EU Standard Contractual Clauses, the UK International Data Transfer Addendum, or other appropriate safeguards',
    ja: 'EU標準契約条項、英国国際データ移転付属書またはその他の適切な保護措置',
    zh: '欧盟标准合同条款、英国国际数据传输附录或其他适当的保护措施',
  },
  '실제 국외이전 표(이전받는 자 / 연락처 / 이전 국가 / 이전 항목 / 이전 목적 / 이전 방법 / 보유기간 / 이전 근거 / 거부 방법 및 효과)는 서비스 공개 시점에 구체적으로 공개합니다. 이전 방법은 암호화된 네트워크 전송이며, 이전 일시는 서비스 이용 또는 해당 처리 발생 시입니다. 그 밖의 항목은 현재': {
    en: 'The actual overseas transfer table (Transferee / Contact / Country of transfer / Items transferred / Purpose of transfer / Method of transfer / Retention period / Basis of transfer / Method and effect of refusal) will be disclosed in detail at the time of service launch. The method of transfer is encrypted network transmission, and the time of transfer is upon service use or the occurrence of the relevant processing. Other items are currently',
    ja: '実際の国外移転表（移転先／連絡先／移転国／移転項目／移転目的／移転方法／保有期間／移転根拠／拒否方法および効果）は、サービス公開時点で具体的に公開します。移転方法は暗号化されたネットワーク送信であり、移転日時はサービス利用または当該処理の発生時です。その他の項目は現在',
    zh: '实际的跨境转移表（接收方 / 联系方式 / 转移国家 / 转移项目 / 转移目的 / 转移方式 / 保存期限 / 转移依据 / 拒绝方法及效果）将在服务上线时具体公开。转移方式为加密的网络传输，转移时间为服务使用或相关处理发生时。其余项目目前',
  },
  '“전 세계 서버”와 같은 포괄적 표현만 사용하지 않습니다.': {
    en: 'The Company does not rely solely on blanket expressions such as “servers worldwide.”',
    ja: '「世界中のサーバー」のような包括的な表現のみを用いることはありません。',
    zh: '公司不会仅使用诸如“全球服务器”之类的笼统表述。',
  },

  '11. AI 입력물과 생성물의 처리': { en: '11. Processing of AI Inputs and Outputs', ja: '11. AI入力物と生成物の処理', zh: '11. AI 输入内容与生成内容的处理' },
  '회사는 AI 요청을 처리하고 생성물을 제공하기 위해 입력물과 생성물을 처리합니다.': {
    en: 'The Company processes inputs and outputs in order to handle AI requests and provide outputs.',
    ja: '当社はAIリクエストを処理し、生成物を提供するために、入力物と生成物を処理します。',
    zh: '公司为处理 AI 请求并提供生成内容而处理输入内容与生成内容。',
  },
  '입력물은 회사 또는 외부 AI 제공자의 시스템으로 전송될 수 있습니다.': {
    en: 'Inputs may be transmitted to the systems of the Company or external AI providers.',
    ja: '入力物は当社または外部AI提供者のシステムに送信されることがあります。',
    zh: '输入内容可能被传输至公司或外部 AI 提供商的系统。',
  },
  '회사는 외부 AI 제공자와 기업용 또는 API 계약을 체결하고 가능한 경우 고객 데이터의 모델 학습 미사용 설정을 적용합니다.': {
    en: 'The Company enters into enterprise or API agreements with external AI providers and, where possible, applies settings that exclude customer data from model training.',
    ja: '当社は外部AI提供者と企業向けまたはAPI契約を締結し、可能な場合は顧客データをモデル学習に使用しない設定を適用します。',
    zh: '公司与外部 AI 提供商签订企业版或 API 协议，并在可能的情况下适用不将客户数据用于模型训练的设置。',
  },
  '입력물과 생성물의 저장기간은 회원의 설정, 요금제 및 외부 제공자의 처리방식에 따라 달라질 수 있으며 실제 기간을 공개합니다.': {
    en: 'The retention period of inputs and outputs may vary depending on the member’s settings, plan, and the processing methods of external providers, and the actual period will be disclosed.',
    ja: '入力物および生成物の保存期間は、会員の設定、料金プランおよび外部提供者の処理方式により異なることがあり、実際の期間を公開します。',
    zh: '输入内容与生成内容的存储期限可能因会员的设置、套餐及外部提供商的处理方式而异，公司将公开实际期限。',
  },
  '회사는 별도의 동의 없이 입력물 또는 생성물을 범용 모델 학습에 사용하지 않습니다.': {
    en: 'The Company does not use inputs or outputs for training general-purpose models without separate consent.',
    ja: '当社は別途の同意なく、入力物または生成物を汎用モデルの学習に使用しません。',
    zh: '未经单独同意，公司不将输入内容或生成内容用于通用模型的训练。',
  },
  '회사는 불법 콘텐츠, 성착취물, 악성코드, 사기, 권리침해 및 안전 위험을 탐지하기 위해 자동 필터링을 할 수 있습니다.': {
    en: 'The Company may apply automated filtering to detect illegal content, sexual exploitation material, malware, fraud, rights infringements, and safety risks.',
    ja: '当社は違法コンテンツ、性的搾取物、マルウェア、詐欺、権利侵害および安全上のリスクを検知するために、自動フィルタリングを行うことがあります。',
    zh: '公司可进行自动过滤，以检测非法内容、性剥削物、恶意代码、欺诈、权利侵害及安全风险。',
  },
  '위험도가 높은 신고나 오류는 권한 있는 담당자가 검토할 수 있습니다.': {
    en: 'High-risk reports or errors may be reviewed by authorized personnel.',
    ja: 'リスクの高い通報またはエラーは、権限を有する担当者が確認することがあります。',
    zh: '高风险的举报或错误可由获授权的人员进行审查。',
  },
  '회원은 AI 처리에 필요하지 않은 개인정보를 프롬프트나 파일에 입력하지 않아야 합니다.': {
    en: 'Members should not enter personal information that is not necessary for AI processing into prompts or files.',
    ja: '会員は、AI処理に必要でない個人情報をプロンプトやファイルに入力してはなりません。',
    zh: '会员不应将 AI 处理所不需要的个人信息录入提示词或文件中。',
  },

  '12. 고객 데이터': { en: '12. Customer Data', ja: '12. 顧客データ', zh: '12. 客户数据' },
  '기업회원은 고객 데이터의 처리 목적과 방법을 결정합니다.': {
    en: 'The corporate member determines the purposes and means of processing customer data.',
    ja: '企業会員は顧客データの処理目的および方法を決定します。',
    zh: '企业会员决定客户数据的处理目的和方法。',
  },
  '회사는 기업회원의 문서화된 지시에 따라 고객 데이터를 처리합니다.': {
    en: 'The Company processes customer data in accordance with the corporate member’s documented instructions.',
    ja: '当社は企業会員の文書化された指示に従って顧客データを処理します。',
    zh: '公司依据企业会员的书面指示处理客户数据。',
  },
  '회사는 고객 데이터를 자체 마케팅, 광고 타기팅 또는 범용 AI 학습에 사용하지 않습니다.': {
    en: 'The Company does not use customer data for its own marketing, advertising targeting, or general-purpose AI training.',
    ja: '当社は顧客データを自社のマーケティング、広告ターゲティングまたは汎用AI学習に使用しません。',
    zh: '公司不将客户数据用于自身营销、广告定向或通用 AI 训练。',
  },
  '회사는 기업회원의 지시, 계약 이행, 보안 및 법적 의무에 필요한 경우에만 고객 데이터에 접근합니다.': {
    en: 'The Company accesses customer data only where necessary for the corporate member’s instructions, performance of the contract, security, and legal obligations.',
    ja: '当社は企業会員の指示、契約の履行、セキュリティおよび法的義務に必要な場合にのみ顧客データにアクセスします。',
    zh: '公司仅在企业会员的指示、合同履行、安全及法律义务所必需时才访问客户数据。',
  },
  '기업회원은 정보주체의 열람, 정정, 삭제, 처리정지, 이동 및 동의 철회 요청에 대응해야 합니다.': {
    en: 'The corporate member must respond to data subjects’ requests for access, correction, deletion, suspension of processing, portability, and withdrawal of consent.',
    ja: '企業会員は、情報主体の閲覧、訂正、削除、処理停止、移転および同意撤回の要請に対応しなければなりません。',
    zh: '企业会员必须应对信息主体的查阅、更正、删除、停止处理、转移及撤回同意的请求。',
  },
  '회사는 기술적으로 가능한 범위에서 기업회원의 권리 대응을 지원합니다.': {
    en: 'The Company supports the corporate member’s handling of rights requests to the extent technically feasible.',
    ja: '当社は技術的に可能な範囲で、企業会員の権利対応を支援します。',
    zh: '公司在技术可行的范围内协助企业会员应对权利请求。',
  },
  '기업회원이 고객 데이터의 삭제 또는 반환을 요청하면 회사는 법률상 보존이 필요한 경우를 제외하고 계약에 따라 처리합니다.': {
    en: 'Where a corporate member requests the deletion or return of customer data, the Company processes it in accordance with the contract, except where retention is required by law.',
    ja: '企業会員が顧客データの削除または返還を要請した場合、当社は法律上保存が必要な場合を除き、契約に従って処理します。',
    zh: '企业会员请求删除或返还客户数据时，除法律要求保存的情形外，公司依据合同予以处理。',
  },

  '13. 개인정보 판매 및 공유': { en: '13. Sale and Sharing of Personal Information', ja: '13. 個人情報の販売および共有', zh: '13. 个人信息的出售及共享' },
  '회사는 개인정보를 금전적 대가를 받고 판매하지 않습니다.': {
    en: 'The Company does not sell personal information for monetary consideration.',
    ja: '当社は個人情報を金銭的対価を得て販売しません。',
    zh: '公司不会为金钱对价而出售个人信息。',
  },
  '회사는 고객 데이터를 제3자의 맞춤형 광고 목적으로 판매하거나 공유하지 않습니다.': {
    en: 'The Company does not sell or share customer data for third parties’ targeted advertising purposes.',
    ja: '当社は顧客データを第三者のパーソナライズ広告の目的で販売または共有しません。',
    zh: '公司不会为第三方的定向广告目的出售或共享客户数据。',
  },
  '회사가 향후 캘리포니아 법률상 “판매” 또는 “공유”에 해당할 수 있는 행태광고를 도입하면 사전에 개인정보처리방침을 변경하고 “내 개인정보 판매 또는 공유 거부” 기능을 제공합니다.': {
    en: 'If the Company introduces behavioral advertising that may constitute a “sale” or “sharing” under California law, it will amend this Privacy Policy in advance and provide a “Do Not Sell or Share My Personal Information” function.',
    ja: '当社が将来、カリフォルニア州法上の「販売」または「共有」に該当し得る行動ターゲティング広告を導入する場合、事前にプライバシーポリシーを変更し、「私の個人情報の販売または共有を拒否」機能を提供します。',
    zh: '若公司未来引入可能构成加利福尼亚州法律所称“出售”或“共享”的行为广告，将事先修改隐私政策并提供“拒绝出售或共享我的个人信息”功能。',
  },
  '적용 대상인 경우 회사는 유효한 Global Privacy Control 신호를 판매·공유 거부 요청으로 처리합니다.': {
    en: 'Where applicable, the Company treats a valid Global Privacy Control signal as a request to opt out of sale and sharing.',
    ja: '適用対象である場合、当社は有効なGlobal Privacy Control信号を販売・共有の拒否要請として処理します。',
    zh: '在适用的情况下，公司将有效的 Global Privacy Control 信号作为拒绝出售·共享的请求予以处理。',
  },

  '14. 개인정보 보유기간': { en: '14. Retention Period of Personal Information', ja: '14. 個人情報の保有期間', zh: '14. 个人信息保存期限' },
  '회사는 처리목적 달성 후 개인정보를 지체 없이 삭제합니다. 다만, 법령상 보존의무, 분쟁 대응 또는 보안 목적이 있는 경우 필요한 기간 동안 분리 보관할 수 있습니다.': {
    en: 'The Company deletes personal information without delay after the purpose of processing is achieved. However, where there is a statutory retention obligation or a purpose of dispute response or security, it may be stored separately for the necessary period.',
    ja: '当社は処理目的の達成後、個人情報を遅滞なく削除します。ただし、法令上の保存義務、紛争対応またはセキュリティの目的がある場合は、必要な期間、分離して保管することがあります。',
    zh: '公司在处理目的达成后不迟延地删除个人信息。但存在法令上的保存义务、争议应对或安全目的时，可在必要期间内分离保管。',
  },
  '일반 보유기준:': { en: 'General retention standards:', ja: '一般的な保有基準：', zh: '一般保存标准：' },
  '회원정보: 회원 탈퇴 또는 계약 종료 시까지. 탈퇴 후 복구 및 오류 방지를 위해 30일간 제한적으로 보관할 수 있습니다.': {
    en: 'Member information: until membership withdrawal or termination of the contract. It may be retained on a limited basis for 30 days after withdrawal for recovery and error prevention.',
    ja: '会員情報：退会または契約終了時まで。退会後、復旧およびエラー防止のため30日間に限り保管することがあります。',
    zh: '会员信息：至会员退出或合同终止时。退出后，为便于恢复及防止错误，可在 30 日内有限保管。',
  },
  'AI 프로젝트와 생성물: 회원이 삭제하거나 계약이 종료될 때까지. 삭제 후 백업본은 최대 90일 내 순차 삭제합니다.': {
    en: 'AI projects and outputs: until the member deletes them or the contract terminates. After deletion, backups are sequentially deleted within up to 90 days.',
    ja: 'AIプロジェクトと生成物：会員が削除するか契約が終了するまで。削除後、バックアップは最大90日以内に順次削除します。',
    zh: 'AI 项目与生成内容：至会员删除或合同终止时。删除后，备份将在最长 90 日内依次删除。',
  },
  '고객 데이터: 기업회원의 지시 또는 계약 종료 시까지. 계약 종료 후': {
    en: 'Customer data: until the corporate member’s instruction or termination of the contract. After termination of the contract, deleted or returned within',
    ja: '顧客データ：企業会員の指示または契約終了時まで。契約終了後',
    zh: '客户数据：至企业会员的指示或合同终止时。合同终止后于',
  },
  '내 삭제 또는 반환합니다.': { en: '.', ja: '以内に削除または返還します。', zh: '内删除或返还。' },
  '계약 또는 청약철회 기록: 대한민국 이용자의 경우 관련 법령상 5년': {
    en: 'Records of contracts or withdrawal of subscription: 5 years under the relevant laws for users in the Republic of Korea',
    ja: '契約または申込撤回の記録：韓国の利用者の場合、関連法令上5年',
    zh: '合同或撤回要约记录：对于韩国用户，依相关法令为 5 年',
  },
  '대금결제 및 재화·서비스 공급 기록: 대한민국 이용자의 경우 관련 법령상 5년': {
    en: 'Records of payment and supply of goods and services: 5 years under the relevant laws for users in the Republic of Korea',
    ja: '代金決済および財貨・サービス供給の記録：韓国の利用者の場合、関連法令上5年',
    zh: '货款支付及商品·服务供应记录：对于韩国用户，依相关法令为 5 年',
  },
  '소비자 불만 또는 분쟁처리 기록: 대한민국 이용자의 경우 관련 법령상 3년': {
    en: 'Records of consumer complaints or dispute handling: 3 years under the relevant laws for users in the Republic of Korea',
    ja: '消費者の苦情または紛争処理の記録：韓国の利用者の場合、関連法令上3年',
    zh: '消费者投诉或争议处理记录：对于韩国用户，依相关法令为 3 年',
  },
  '표시·광고 기록: 대한민국 이용자의 경우 관련 법령상 6개월': {
    en: 'Records of labeling and advertising: 6 months under the relevant laws for users in the Republic of Korea',
    ja: '表示・広告の記録：韓国の利用者の場合、関連法令上6か月',
    zh: '标示·广告记录：对于韩国用户，依相关法令为 6 个月',
  },
  '마케팅 수신동의 및 철회기록: 동의 철회 후에도 법령 준수와 분쟁 대응에 필요한 기간': {
    en: 'Records of marketing consent and withdrawal: for the period necessary for legal compliance and dispute response even after withdrawal of consent',
    ja: 'マーケティングの受信同意および撤回の記録：同意撤回後も、法令遵守および紛争対応に必要な期間',
    zh: '营销接收同意及撤回记录：即使在撤回同意后，为遵守法令及应对争议所必需的期间',
  },
  '수신거부 목록: 다시 광고를 발송하지 않기 위한 최소한의 정보로 필요한 기간': {
    en: 'Opt-out list: for the necessary period, as the minimum information required not to send advertisements again',
    ja: '受信拒否リスト：再び広告を配信しないための最小限の情報として、必要な期間',
    zh: '拒收名单：作为为不再发送广告所需的最少信息，保存必要的期间',
  },
  '보안로그: 보안사고 탐지, 조사 및 법적 의무에 필요한 기간': {
    en: 'Security logs: for the period necessary for detecting and investigating security incidents and for legal obligations',
    ja: 'セキュリティログ：セキュリティ事故の検知、調査および法的義務に必要な期間',
    zh: '安全日志：为检测、调查安全事故及履行法律义务所必需的期间',
  },
  '세무·회계자료: 각 국가의 세법과 회계법령에서 요구하는 기간': {
    en: 'Tax and accounting records: for the period required by the tax and accounting laws of each country',
    ja: '税務・会計資料：各国の税法および会計法令が要求する期間',
    zh: '税务·会计资料：各国税法及会计法令所要求的期间',
  },

  '15. 개인정보 삭제방법': { en: '15. Method of Deleting Personal Information', ja: '15. 個人情報の削除方法', zh: '15. 个人信息删除方法' },
  '전자파일은 복구가 어렵도록 안전한 방법으로 삭제합니다.': {
    en: 'Electronic files are deleted by secure methods that make recovery difficult.',
    ja: '電子ファイルは復旧が困難となるよう、安全な方法で削除します。',
    zh: '电子文件以难以恢复的安全方式删除。',
  },
  '종이문서는 분쇄 또는 소각합니다.': {
    en: 'Paper documents are shredded or incinerated.',
    ja: '紙の文書は裁断または焼却します。',
    zh: '纸质文件予以粉碎或焚烧。',
  },
  '백업 데이터는 일반 시스템에서 즉시 접근할 수 없도록 격리하고 백업 순환주기에 따라 삭제합니다.': {
    en: 'Backup data is isolated so that it cannot be immediately accessed from ordinary systems and is deleted according to the backup rotation cycle.',
    ja: 'バックアップデータは、通常のシステムから即座にアクセスできないよう隔離し、バックアップの循環周期に従って削除します。',
    zh: '备份数据予以隔离，使其无法从常规系统即时访问，并按备份轮换周期删除。',
  },
  '법령상 보존정보는 일반 이용정보와 분리해 접근권한을 제한합니다.': {
    en: 'Information retained under law is separated from ordinary usage information, with access permissions restricted.',
    ja: '法令上の保存情報は、一般の利用情報と分離し、アクセス権限を制限します。',
    zh: '依法令保存的信息与一般使用信息分离，并限制访问权限。',
  },

  '16. 이용자의 권리': { en: '16. Users’ Rights', ja: '16. 利用者の権利', zh: '16. 用户的权利' },
  '이용자는 적용 법률에 따라 다음 권리를 행사할 수 있습니다.': {
    en: 'Users may exercise the following rights in accordance with applicable law.',
    ja: '利用者は適用法に従い、次の権利を行使することができます。',
    zh: '用户可依据适用法律行使下列权利。',
  },
  '개인정보 처리 여부 확인': { en: 'Confirmation of whether personal information is processed', ja: '個人情報の処理の有無の確認', zh: '确认是否处理个人信息' },
  '개인정보 열람': { en: 'Access to personal information', ja: '個人情報の閲覧', zh: '查阅个人信息' },
  '부정확한 정보의 정정': { en: 'Correction of inaccurate information', ja: '不正確な情報の訂正', zh: '更正不准确的信息' },
  '개인정보 삭제': { en: 'Deletion of personal information', ja: '個人情報の削除', zh: '删除个人信息' },
  '처리정지 또는 제한': { en: 'Suspension or restriction of processing', ja: '処理の停止または制限', zh: '停止或限制处理' },
  '동의 철회': { en: 'Withdrawal of consent', ja: '同意の撤回', zh: '撤回同意' },
  '개인정보 이동 또는 전송': { en: 'Portability or transfer of personal information', ja: '個人情報の移転または転送', zh: '个人信息的转移或传输' },
  '직접 마케팅에 대한 반대': { en: 'Objection to direct marketing', ja: 'ダイレクトマーケティングへの異議', zh: '反对直接营销' },
  '자동화된 결정에 대한 설명 또는 거부': { en: 'Explanation of, or objection to, automated decisions', ja: '自動化された決定に対する説明または拒否', zh: '对自动化决策的说明或拒绝' },
  '개인정보 판매·공유 거부': { en: 'Opting out of the sale or sharing of personal information', ja: '個人情報の販売・共有の拒否', zh: '拒绝出售·共享个人信息' },
  '민감정보 사용 제한': { en: 'Restriction of the use of sensitive information', ja: '機微情報の使用の制限', zh: '限制敏感信息的使用' },
  '개인정보 감독기관에 민원 또는 불만 제기': {
    en: 'Filing a complaint with a personal information supervisory authority',
    ja: '個人情報監督機関への申立てまたは苦情の提起',
    zh: '向个人信息监管机构提出申诉或投诉',
  },
  '권리 행사로 인한 차별을 받지 않을 권리': {
    en: 'The right not to be discriminated against for exercising rights',
    ja: '権利行使を理由に差別を受けない権利',
    zh: '不因行使权利而受到歧视的权利',
  },
  '권리행사 방법: 계정 설정의 개인정보 메뉴 또는': {
    en: 'How to exercise rights: through the privacy menu in account settings, or by request to',
    ja: '権利行使の方法：アカウント設定の個人情報メニュー、または',
    zh: '权利行使方法：通过账户设置的个人信息菜单，或',
  },
  '으로 요청': { en: '', ja: 'へ要請', zh: '提出请求' },
  '회사는 요청자의 신원을 합리적인 방법으로 확인할 수 있습니다.': {
    en: 'The Company may verify the identity of the requester by reasonable means.',
    ja: '当社は要請者の身元を合理的な方法で確認することができます。',
    zh: '公司可以合理的方式核实请求人的身份。',
  },
  '대리인이 요청하는 경우 위임장 등 적법한 권한을 확인할 수 있습니다.': {
    en: 'Where an agent makes a request, the Company may verify lawful authority such as a power of attorney.',
    ja: '代理人が要請する場合、委任状などの適法な権限を確認することができます。',
    zh: '由代理人提出请求时，公司可核实委托书等合法授权。',
  },
  '법률상 예외가 있는 경우 요청의 전부 또는 일부가 제한될 수 있으며 회사는 가능한 범위에서 그 사유를 설명합니다.': {
    en: 'Where a legal exception applies, a request may be restricted in whole or in part, and the Company will explain the reasons to the extent possible.',
    ja: '法律上の例外がある場合、要請の全部または一部が制限されることがあり、当社は可能な範囲でその理由を説明します。',
    zh: '存在法律例外时，请求可能被全部或部分限制，公司将在可能的范围内说明理由。',
  },

  '17. 대한민국 이용자의 권리': { en: '17. Rights of Users in the Republic of Korea', ja: '17. 韓国の利用者の権利', zh: '17. 韩国用户的权利' },
  '대한민국 이용자는 개인정보 열람, 정정·삭제, 처리정지, 동의 철회, 개인정보 전송요구 및 자동화된 결정에 대한 설명·거부를 관련 법률에 따라 요청할 수 있습니다.': {
    en: 'Users in the Republic of Korea may, in accordance with the relevant laws, request access to personal information, correction and deletion, suspension of processing, withdrawal of consent, the transfer of personal information, and the explanation of, or objection to, automated decisions.',
    ja: '韓国の利用者は、関連法律に従い、個人情報の閲覧、訂正・削除、処理停止、同意撤回、個人情報の転送要求、および自動化された決定に対する説明・拒否を要請することができます。',
    zh: '韩国用户可依据相关法律请求查阅个人信息、更正·删除、停止处理、撤回同意、个人信息传输要求，以及对自动化决策的说明·拒绝。',
  },
  '개인정보 침해에 관한 상담 또는 분쟁 해결을 위해 개인정보침해 신고기관, 개인정보분쟁조정기관 및 관계 감독기관을 이용할 수 있습니다.': {
    en: 'For consultation on personal information infringement or dispute resolution, users may use the personal information infringement reporting body, the personal information dispute mediation body, and the relevant supervisory authorities.',
    ja: '個人情報侵害に関する相談または紛争解決のため、個人情報侵害申告機関、個人情報紛争調停機関および関係監督機関を利用することができます。',
    zh: '为就个人信息侵害进行咨询或解决争议，用户可利用个人信息侵害举报机构、个人信息争议调解机构及相关监管机构。',
  },
  '회사는 정보주체의 권리 행사를 이유로 부당한 불이익을 주지 않습니다.': {
    en: 'The Company does not impose any unjust disadvantage on a data subject for exercising their rights.',
    ja: '当社は情報主体の権利行使を理由に、不当な不利益を与えません。',
    zh: '公司不会因信息主体行使权利而给予不正当的不利益。',
  },

  '18. EU·EEA·영국·스위스 이용자의 권리': { en: '18. Rights of Users in the EU, EEA, UK, and Switzerland', ja: '18. EU・EEA・英国・スイスの利用者の権利', zh: '18. 欧盟·欧洲经济区·英国·瑞士用户的权利' },
  '해당 지역 이용자는 적용 법률에 따라 다음 권리를 가질 수 있습니다.': {
    en: 'Users in these regions may have the following rights in accordance with applicable law.',
    ja: '当該地域の利用者は、適用法に従い、次の権利を有することがあります。',
    zh: '上述地区的用户可依据适用法律享有下列权利。',
  },
  '열람권': { en: 'Right of access', ja: '閲覧権', zh: '查阅权' },
  '정정권': { en: 'Right to rectification', ja: '訂正権', zh: '更正权' },
  '삭제권': { en: 'Right to erasure', ja: '削除権', zh: '删除权' },
  '처리제한권': { en: 'Right to restriction of processing', ja: '処理制限権', zh: '限制处理权' },
  '데이터 이동권': { en: 'Right to data portability', ja: 'データポータビリティの権利', zh: '数据可携权' },
  '정당한 이익에 근거한 처리에 대한 반대권': {
    en: 'Right to object to processing based on legitimate interests',
    ja: '正当な利益に基づく処理に対する異議権',
    zh: '对基于正当利益的处理的反对权',
  },
  '직접 마케팅에 대한 절대적인 반대권': {
    en: 'Absolute right to object to direct marketing',
    ja: 'ダイレクトマーケティングに対する絶対的な異議権',
    zh: '对直接营销的绝对反对权',
  },
  '동의 철회권': { en: 'Right to withdraw consent', ja: '同意撤回権', zh: '撤回同意权' },
  '중대한 영향을 미치는 전적으로 자동화된 결정의 대상이 되지 않을 권리': {
    en: 'Right not to be subject to a solely automated decision that has a significant effect',
    ja: '重大な影響を及ぼす、専ら自動化された決定の対象とならない権利',
    zh: '不成为产生重大影响的完全自动化决策对象的权利',
  },
  '관할 감독기관에 이의를 제기할 권리': {
    en: 'Right to lodge a complaint with the competent supervisory authority',
    ja: '管轄監督機関に異議を申し立てる権利',
    zh: '向主管监管机构提出异议的权利',
  },
  '회사가 EU·EEA 또는 영국 밖으로 개인정보를 이전하는 경우 적정성 결정, 표준계약조항, 영국 부속서 또는 기타 적절한 보호조치를 사용합니다.': {
    en: 'Where the Company transfers personal information outside the EU, EEA, or UK, it uses adequacy decisions, Standard Contractual Clauses, the UK Addendum, or other appropriate safeguards.',
    ja: '当社がEU・EEAまたは英国外へ個人情報を移転する場合、十分性の決定、標準契約条項、英国付属書またはその他の適切な保護措置を使用します。',
    zh: '公司将个人信息转移至欧盟·欧洲经济区或英国以外时，使用充分性认定、标准合同条款、英国附录或其他适当的保护措施。',
  },
  '이용자는 적용된 보호조치의 사본 또는 요약을 요청할 수 있습니다.': {
    en: 'Users may request a copy or summary of the safeguards applied.',
    ja: '利用者は、適用された保護措置の写しまたは要約を要請することができます。',
    zh: '用户可请求获取所适用保护措施的副本或摘要。',
  },

  '19. 미국 거주자의 추가 권리': { en: '19. Additional Rights of U.S. Residents', ja: '19. 米国居住者の追加的権利', zh: '19. 美国居民的附加权利' },
  '적용되는 미국 주 개인정보법의 대상이 되는 경우 이용자는 다음 권리를 가질 수 있습니다.': {
    en: 'Where subject to an applicable U.S. state privacy law, users may have the following rights.',
    ja: '適用される米国州の個人情報保護法の対象となる場合、利用者は次の権利を有することがあります。',
    zh: '在受适用的美国州个人信息法约束的情况下，用户可享有下列权利。',
  },
  '수집·이용·공개된 개인정보의 범주와 구체적 정보 확인': {
    en: 'Confirming the categories and specific pieces of personal information collected, used, and disclosed',
    ja: '収集・利用・開示された個人情報のカテゴリーおよび具体的な情報の確認',
    zh: '确认已收集·使用·披露的个人信息类别及具体信息',
  },
  '삭제': { en: 'Deletion', ja: '削除', zh: '删除' },
  '부정확한 정보 정정': { en: 'Correction of inaccurate information', ja: '不正確な情報の訂正', zh: '更正不准确的信息' },
  '개인정보의 판매 또는 타기팅 광고 목적 공유 거부': {
    en: 'Opting out of the sale of personal information or its sharing for targeted advertising',
    ja: '個人情報の販売またはターゲティング広告目的の共有の拒否',
    zh: '拒绝出售个人信息或为定向广告目的进行共享',
  },
  '개인정보 사본 수령': { en: 'Receiving a copy of personal information', ja: '個人情報の写しの受領', zh: '获取个人信息的副本' },
  '권리행사에 대한 차별 금지': { en: 'Prohibition of discrimination for exercising rights', ja: '権利行使に対する差別の禁止', zh: '禁止因行使权利而受歧视' },
  '회사가 요청을 거절한 경우 이의제기': {
    en: 'Appealing where the Company has denied a request',
    ja: '当社が要請を拒否した場合の異議申立て',
    zh: '在公司拒绝请求时提出申诉',
  },
  '회사는 요청을 처리하기 위해 신원을 확인할 수 있습니다.': {
    en: 'The Company may verify identity in order to process a request.',
    ja: '当社は要請を処理するために身元を確認することができます。',
    zh: '公司可为处理请求而核实身份。',
  },
  '회사가 법률상 적용 대상이 아닌 경우에도 합리적인 범위에서 동일하거나 유사한 요청을 처리할 수 있습니다.': {
    en: 'Even where the Company is not subject to the law, it may handle the same or similar requests to a reasonable extent.',
    ja: '当社が法律上の適用対象でない場合であっても、合理的な範囲で同一または類似の要請を処理することがあります。',
    zh: '即使公司在法律上不属于适用对象，也可在合理范围内处理相同或类似的请求。',
  },

  '20. 아동·청소년': { en: '20. Children and Minors', ja: '20. 児童・青少年', zh: '20. 儿童·青少年' },
  'BYGENCY는 만 18세 미만의 이용자를 대상으로 하지 않습니다.': {
    en: 'BYGENCY is not directed to users under 18 years of age.',
    ja: 'BYGENCYは満18歳未満の利用者を対象としていません。',
    zh: 'BYGENCY 不面向未满 18 周岁的用户。',
  },
  '회사는 만 18세 미만인 사람으로부터 고의로 회원 개인정보를 수집하지 않습니다.': {
    en: 'The Company does not knowingly collect members’ personal information from persons under 18 years of age.',
    ja: '当社は満18歳未満の者から、故意に会員の個人情報を収集しません。',
    zh: '公司不会故意从未满 18 周岁的人处收集会员个人信息。',
  },
  '미성년자가 계정을 개설한 사실을 알게 되면 계정을 제한하고 관련 정보를 삭제합니다.': {
    en: 'If the Company becomes aware that a minor has opened an account, it restricts the account and deletes the relevant information.',
    ja: '未成年者がアカウントを開設した事実を知った場合、当社はアカウントを制限し、関連情報を削除します。',
    zh: '在得知未成年人开设账户的事实后，公司将限制该账户并删除相关信息。',
  },
  '보호자는 미성년자의 정보 삭제를': {
    en: 'A guardian may request the deletion of a minor’s information at',
    ja: '保護者は、未成年者の情報の削除を',
    zh: '监护人可就未成年人信息的删除向',
  },
  '으로 요청할 수 있습니다.': { en: '.', ja: 'へ要請することができます。', zh: '提出请求。' },
  '기업회원은 랜딩페이지로 아동의 정보를 수집하기 전에 적용 법률에 따른 보호자 동의와 추가 보호조치를 마련해야 합니다.': {
    en: 'Before collecting children’s information via a landing page, a corporate member must put in place guardian consent and additional protective measures as required by applicable law.',
    ja: '企業会員は、ランディングページで児童の情報を収集する前に、適用法に基づく保護者の同意および追加の保護措置を整えなければなりません。',
    zh: '企业会员在通过着陆页收集儿童信息之前，必须依据适用法律取得监护人同意并采取额外的保护措施。',
  },

  '21. 자동화된 결정': { en: '21. Automated Decisions', ja: '21. 自動化された決定', zh: '21. 自动化决策' },
  '회사는 스팸, 사기, 악성코드, 금지 콘텐츠 또는 계정 보안위험을 탐지하기 위해 자동화된 시스템을 사용할 수 있습니다.': {
    en: 'The Company may use automated systems to detect spam, fraud, malware, prohibited content, or account security risks.',
    ja: '当社はスパム、詐欺、マルウェア、禁止コンテンツまたはアカウントのセキュリティリスクを検知するために、自動化されたシステムを使用することがあります。',
    zh: '公司可使用自动化系统以检测垃圾信息、欺诈、恶意代码、禁止内容或账户安全风险。',
  },
  '자동화된 탐지 결과로 계정 또는 콘텐츠가 제한될 수 있습니다.': {
    en: 'As a result of automated detection, an account or content may be restricted.',
    ja: '自動化された検知の結果、アカウントまたはコンテンツが制限されることがあります。',
    zh: '自动化检测的结果可能导致账户或内容受到限制。',
  },
  '중대한 조치에 대해 회원은 사람의 검토와 이의제기를 요청할 수 있습니다.': {
    en: 'For significant measures, members may request human review and lodge an objection.',
    ja: '重大な措置について、会員は人による確認および異議申立てを要請することができます。',
    zh: '对于重大措施，会员可请求人工审查并提出异议。',
  },
  '회사는 현재 이용자의 법적 권리 또는 이에 준하는 중대한 영향을 전적으로 자동으로 결정하는 목적으로 AI 영상 생성 결과를 사용하지 않습니다.': {
    en: 'The Company does not currently use the results of AI video generation for the purpose of solely automated decisions that produce legal or similarly significant effects on users.',
    ja: '当社は現在、利用者の法的権利またはこれに準ずる重大な影響を専ら自動的に決定する目的で、AI動画生成の結果を使用していません。',
    zh: '公司目前不将 AI 视频生成结果用于完全自动地决定对用户的法律权利或类似重大影响的目的。',
  },
  '향후 그러한 기능을 도입하면 법적 근거, 처리방식, 예상 결과 및 권리행사 방법을 사전에 알립니다.': {
    en: 'If such a feature is introduced in the future, the Company will inform users in advance of the legal basis, processing method, expected results, and how to exercise their rights.',
    ja: '将来そのような機能を導入する場合、法的根拠、処理方式、予想される結果および権利行使の方法を事前に通知します。',
    zh: '若未来引入此类功能，公司将事先告知法律依据、处理方式、预期结果及权利行使方法。',
  },

  '22. 개인정보 안전성 확보조치': { en: '22. Measures to Ensure the Security of Personal Information', ja: '22. 個人情報の安全性確保措置', zh: '22. 个人信息安全保障措施' },
  '회사는 개인정보의 분실, 도난, 유출, 위조, 변조 및 무단접근을 방지하기 위해 다음 조치를 적용합니다.': {
    en: 'To prevent the loss, theft, leakage, forgery, alteration, and unauthorized access of personal information, the Company applies the following measures.',
    ja: '当社は個人情報の紛失、盗難、漏えい、偽造、変造および不正アクセスを防止するために、次の措置を適用します。',
    zh: '为防止个人信息的丢失、被盗、泄露、伪造、篡改及未经授权的访问，公司采取以下措施。',
  },
  '개인정보 보호 내부관리계획': { en: 'Internal management plan for personal information protection', ja: '個人情報保護のための内部管理計画', zh: '个人信息保护内部管理计划' },
  '최소 권한과 역할 기반 접근통제': { en: 'Least-privilege and role-based access control', ja: '最小権限およびロールベースのアクセス制御', zh: '最小权限与基于角色的访问控制' },
  '관리자 및 중요계정 다중인증': { en: 'Multi-factor authentication for administrators and critical accounts', ja: '管理者および重要アカウントの多要素認証', zh: '管理员及重要账户的多重认证' },
  '전송구간 암호화': { en: 'Encryption in transit', ja: '転送区間の暗号化', zh: '传输过程加密' },
  '비밀번호 단방향 암호화': { en: 'One-way encryption of passwords', ja: 'パスワードの一方向暗号化', zh: '密码单向加密' },
  '저장정보 암호화 또는 이에 준하는 보호조치': {
    en: 'Encryption of stored information or equivalent protective measures',
    ja: '保存情報の暗号化またはこれに準ずる保護措置',
    zh: '存储信息加密或与之相当的保护措施',
  },
  '접근 및 변경기록 저장·점검': {
    en: 'Storage and review of access and change logs',
    ja: 'アクセスおよび変更記録の保存・点検',
    zh: '访问及变更记录的保存·检查',
  },
  '개발·운영환경 분리': { en: 'Separation of development and operational environments', ja: '開発・運用環境の分離', zh: '开发·运营环境分离' },
  '취약점 점검과 보안 업데이트': { en: 'Vulnerability assessments and security updates', ja: '脆弱性の点検とセキュリティアップデート', zh: '漏洞检查与安全更新' },
  '악성코드 및 침입 탐지': { en: 'Malware and intrusion detection', ja: 'マルウェアおよび侵入の検知', zh: '恶意代码及入侵检测' },
  '임직원 비밀유지와 개인정보 교육': {
    en: 'Confidentiality and personal information training for staff',
    ja: '役職員の秘密保持および個人情報教育',
    zh: '员工保密及个人信息培训',
  },
  '수탁자 보안평가와 계약': { en: 'Security assessment and contracts with processors', ja: '受託者のセキュリティ評価と契約', zh: '受托方安全评估与合同' },
  '백업과 재해복구': { en: 'Backup and disaster recovery', ja: 'バックアップと災害復旧', zh: '备份与灾难恢复' },
  '개인정보 최소화와 보유기간 관리': {
    en: 'Data minimization and retention period management',
    ja: '個人情報の最小化と保有期間の管理',
    zh: '个人信息最小化与保存期限管理',
  },
  '보안사고 대응절차': { en: 'Security incident response procedures', ja: 'セキュリティ事故対応手続き', zh: '安全事故应对流程' },
  '정기적인 권한 검토': { en: 'Periodic review of permissions', ja: '定期的な権限の見直し', zh: '定期权限审查' },
  '고객 데이터 논리적 분리': { en: 'Logical separation of customer data', ja: '顧客データの論理的分離', zh: '客户数据的逻辑隔离' },

  '23. 개인정보 침해사고': { en: '23. Personal Information Breach Incidents', ja: '23. 個人情報侵害事故', zh: '23. 个人信息侵害事故' },
  '회사는 개인정보 침해가 의심되면 사실관계와 영향을 조사합니다.': {
    en: 'Where a personal information breach is suspected, the Company investigates the facts and the impact.',
    ja: '当社は個人情報侵害が疑われる場合、事実関係および影響を調査します。',
    zh: '在怀疑发生个人信息侵害时，公司将调查事实关系及影响。',
  },
  '법률상 통지 의무가 있는 경우 정보주체와 감독기관에 법정기한 내 통지합니다.': {
    en: 'Where there is a statutory notification obligation, the Company notifies the data subjects and the supervisory authority within the statutory period.',
    ja: '法律上の通知義務がある場合、情報主体および監督機関に法定期限内に通知します。',
    zh: '在存在法律上的通知义务时，公司将在法定期限内通知信息主体及监管机构。',
  },
  '통지에는 가능한 범위에서 침해 항목, 발생시점, 예상 피해, 회사의 대응조치 및 이용자의 보호방법을 포함합니다.': {
    en: 'The notification includes, to the extent possible, the items breached, the time of occurrence, the anticipated harm, the Company’s response measures, and how users can protect themselves.',
    ja: '通知には、可能な範囲で、侵害された項目、発生時点、予想される被害、当社の対応措置および利用者の保護方法を含めます。',
    zh: '通知在可能的范围内包括被侵害的项目、发生时间、预期损害、公司的应对措施及用户的自我保护方法。',
  },
  '기업회원의 고객 데이터에 침해가 발생하면 회사는 개인정보처리위탁 특약에 따라 기업회원에게 부당한 지연 없이 알립니다.': {
    en: 'Where a breach occurs in a corporate member’s customer data, the Company notifies the corporate member without undue delay in accordance with the Data Processing Addendum.',
    ja: '企業会員の顧客データに侵害が発生した場合、当社は個人情報取扱委託特約に従い、企業会員に不当な遅延なく通知します。',
    zh: '在企业会员的客户数据发生侵害时，公司将依据个人信息处理委托特别条款，不无理延迟地通知企业会员。',
  },

  '24. 쿠키와 유사기술': { en: '24. Cookies and Similar Technologies', ja: '24. Cookieおよび類似技術', zh: '24. Cookie 与类似技术' },
  '회사는 쿠키, 로컬스토리지, SDK, 픽셀 및 유사기술을 사용할 수 있습니다.': {
    en: 'The Company may use cookies, local storage, SDKs, pixels, and similar technologies.',
    ja: '当社はCookie、ローカルストレージ、SDK、ピクセルおよび類似技術を使用することがあります。',
    zh: '公司可使用 Cookie、本地存储、SDK、像素及类似技术。',
  },
  '필수 쿠키: 로그인, 세션, 보안, 부하분산, 동의설정 저장': {
    en: 'Essential cookies: login, session, security, load balancing, and storing consent settings',
    ja: '必須Cookie：ログイン、セッション、セキュリティ、負荷分散、同意設定の保存',
    zh: '必需 Cookie：登录、会话、安全、负载均衡、保存同意设置',
  },
  '기능 쿠키: 언어, 화면설정, 편의기능': {
    en: 'Functional cookies: language, display settings, and convenience features',
    ja: '機能Cookie：言語、画面設定、利便機能',
    zh: '功能 Cookie：语言、界面设置、便利功能',
  },
  '분석 쿠키: 방문, 기능 이용, 오류 및 성능분석': {
    en: 'Analytics cookies: visits, feature usage, and error and performance analysis',
    ja: '分析Cookie：訪問、機能利用、エラーおよびパフォーマンス分析',
    zh: '分析 Cookie：访问、功能使用、错误及性能分析',
  },
  '광고 쿠키: 맞춤형 광고와 광고성과 측정': {
    en: 'Advertising cookies: personalized advertising and measurement of ad performance',
    ja: '広告Cookie：パーソナライズ広告および広告成果の測定',
    zh: '广告 Cookie：个性化广告与广告效果衡量',
  },
  '비필수 쿠키는 동의가 필요한 지역에서 이용자가 동의하기 전 설치하지 않습니다.': {
    en: 'In regions where consent is required, non-essential cookies are not installed before the user consents.',
    ja: '同意が必要な地域では、非必須Cookieは利用者が同意する前に設置しません。',
    zh: '在需要同意的地区，非必需 Cookie 在用户同意之前不予安装。',
  },
  '이용자는 쿠키 설정 메뉴에서 목적별로 동의를 변경할 수 있습니다.': {
    en: 'Users may change their consent by purpose in the cookie settings menu.',
    ja: '利用者はCookie設定メニューから、目的別に同意を変更することができます。',
    zh: '用户可在 Cookie 设置菜单中按目的更改同意。',
  },

  '25. 개인정보처리방침 변경': { en: '25. Changes to the Privacy Policy', ja: '25. プライバシーポリシーの変更', zh: '25. 隐私政策的变更' },
  '회사는 법령, 서비스 또는 개인정보 처리방식의 변경에 따라 본 방침을 변경할 수 있습니다.': {
    en: 'The Company may amend this Policy in response to changes in laws, the service, or its personal information processing methods.',
    ja: '当社は法令、サービスまたは個人情報の処理方式の変更に応じて、本方針を変更することがあります。',
    zh: '公司可根据法令、服务或个人信息处理方式的变更而变更本政策。',
  },
  '중요한 변경은 시행일 전에 개별 통지하거나 서비스 내에 눈에 띄게 공지합니다.': {
    en: 'Material changes will be notified individually before the effective date or prominently announced within the service.',
    ja: '重要な変更は、施行日前に個別に通知するか、サービス内に目立つ形で告知します。',
    zh: '重大变更将在生效日前单独通知，或在服务内醒目公告。',
  },
  '별도 동의가 필요한 변경은 공지만으로 처리하지 않고 필요한 동의를 받습니다.': {
    en: 'Changes requiring separate consent are not handled by announcement alone; the Company obtains the necessary consent.',
    ja: '別途の同意が必要な変更は、告知のみで処理せず、必要な同意を取得します。',
    zh: '需要单独同意的变更不会仅以公告方式处理，公司将取得必要的同意。',
  },
  '이전 버전과 변경일을 확인할 수 있도록 보관합니다.': {
    en: 'The Company retains prior versions and the dates of changes so that they can be reviewed.',
    ja: '以前のバージョンおよび変更日を確認できるよう保管します。',
    zh: '公司予以保存，以便查阅以往版本及变更日期。',
  },

  '26. 문의처': { en: '26. Contact', ja: '26. お問い合わせ先', zh: '26. 联系方式' },
  '이메일:': { en: 'Email:', ja: 'メール：', zh: '邮箱：' },
}

export function PrivacyContent() {
  const t = useT(M)
  return (
    <LegalShell title={t('개인정보처리방침')} effective={t('2026년 9월 1일')}>
      <p className="text-sm opacity-70">
        {t('본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.')}
      </p>
      <p className="lead">
        {t('주식회사 넥스트 바이전시(이하 “회사”)는 BYGENCY 이용자의 개인정보를 중요하게 생각하며 적용되는 개인정보 보호 법령을 준수합니다.')}
      </p>
      <p className="lead">
        {t('본 개인정보처리방침은 회사가 BYGENCY 웹사이트, 애플리케이션, AI 영상 생성, 랜딩페이지, CRM, 메시지 발송, 분석 및 협업 서비스를 제공하면서 개인정보를 어떻게 처리하는지 설명합니다.')}
      </p>

      <h2>{t('1. 개인정보처리자')}</h2>
      <p><strong>{t('상호:')}</strong> {t('주식회사 넥스트 바이전시')}</p>
      <p><strong>{t('대표자:')}</strong> {t('고선우')}</p>
      <p><strong>{t('주소:')}</strong> <span className="ph">[추후 입력]</span></p>
      <p><strong>{t('대표 이메일:')}</strong> <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a></p>
      <p><strong>{t('개인정보 보호책임자:')}</strong> {t('고선우')}</p>
      <p><strong>{t('개인정보 문의 이메일:')}</strong> <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a></p>
      <p><strong>{t('전화번호:')}</strong> <span className="ph">[추후 입력]</span></p>
      <p><strong>{t('EU·EEA 대리인:')}</strong> <span className="ph">[해당 시 추후 입력]</span></p>
      <p><strong>{t('영국 대리인:')}</strong> <span className="ph">[해당 시 추후 입력]</span></p>
      <p><strong>{t('대한민국 국내대리인:')}</strong> {t('회사가 해외사업자인 경우에만 해당')}</p>

      <h2>{t('2. 회사의 역할')}</h2>
      <ol>
        <li>{t('회사가 회원 계정, 결제, 고객지원, 보안 및 회사 자체 마케팅을 위해 개인정보 처리 목적과 방법을 결정하는 경우 회사는 개인정보처리자 또는 데이터 컨트롤러입니다.')}</li>
        <li>{t('기업회원이 랜딩페이지·CRM·메시지 발송 기능을 통해 자신의 고객 데이터를 처리하고 회사가 기업회원의 지시에 따라 처리하는 경우 기업회원은 개인정보처리자 또는 컨트롤러이고 회사는 수탁자 또는 프로세서입니다.')}</li>
        <li>{t('기업회원의 고객 데이터에는 본 개인정보처리방침과 함께 기업회원이 정보주체에게 제공하는 개인정보처리방침이 적용됩니다.')}</li>
        <li>{t('기업회원이 고객정보를 적법하게 수집·이용하는지 여부에 관한 일차적 책임은 해당 기업회원에게 있습니다.')}</li>
      </ol>

      <h2>{t('3. 처리하는 개인정보')}</h2>

      <h3>{t('3.1 회원가입 및 계정정보')}</h3>
      <p>{t('필수 또는 일반 항목: 이메일 주소, 비밀번호 암호화값, 표시 이름, 회원 식별번호, 국가, 언어, 회원 유형, 가입일시, 계정 상태')}</p>
      <p>{t('기업회원 추가 항목: 회사명, 부서명, 직책, 담당자명, 업무용 전화번호, 사업자정보, 워크스페이스 정보')}</p>

      <h3>{t('3.2 인증정보')}</h3>
      <p>{t('이메일 인증기록, 휴대전화 인증기록, 소셜 로그인 사업자가 제공하는 계정 식별값, 다중인증 설정정보')}</p>
      <p>{t('회사는 소셜 로그인 비밀번호를 수집하지 않습니다.')}</p>

      <h3>{t('3.3 결제 및 거래정보')}</h3>
      <p>{t('요금제, 결제금액, 통화, 결제일, 구독상태, 청구주소, 세금정보, 거래번호, 환불기록, 결제수단의 일부 식별정보')}</p>
      <p>{t('신용카드 전체 번호와 보안코드는 원칙적으로 결제대행사가 처리하며 회사는 전체 카드정보를 직접 저장하지 않습니다.')}</p>

      <h3>{t('3.4 서비스 이용정보')}</h3>
      <p>{t('로그인 일시, IP 주소, 기기·브라우저 정보, 운영체제, 쿠키 식별자, 방문 화면, 클릭·기능 이용기록, 오류기록, 생성 요청시간, 사용 크레딧, API 이용기록')}</p>

      <h3>{t('3.5 AI 입력물과 생성물')}</h3>
      <p>{t('프롬프트, 노드 설정값, 업로드한 이미지·영상·음성·음악·문서, 참조파일, 생성 결과물, 생성 과정의 기술정보, 안전성 검사 결과, 이용자 피드백')}</p>

      <h3>{t('3.6 CRM 및 랜딩페이지 데이터')}</h3>
      <p>{t('기업회원이 입력하거나 최종 이용자로부터 수집하는 이름, 전화번호, 이메일 주소, 회사명, 직책, 상담내용, 캠페인 정보, 동의기록, 발송기록, 수신거부기록 및 기업회원이 설정한 추가 항목')}</p>
      <p>{t('회사는 기업회원에게 주민등록번호, 금융계좌 비밀번호, 건강정보 또는 불필요한 민감정보를 수집하지 않도록 요구합니다.')}</p>

      <h3>{t('3.7 메시지 발송정보')}</h3>
      <p>{t('수신자 전화번호 또는 이메일 주소, 발신번호, 메시지 내용, 발송시간, 성공·실패 여부, 통신사·메시지 사업자의 처리결과, 수신거부 및 동의 철회 기록')}</p>

      <h3>{t('3.8 협업정보')}</h3>
      <p>{t('워크스페이스, 구성원, 역할, 초대기록, 프로젝트, 댓글, 승인기록, 파일 변경이력')}</p>

      <h3>{t('3.9 외부 서비스 연동정보')}</h3>
      <p>{t('회원이 연동한 소셜 계정, 광고계정, 네이버 관련 계정 또는 API 토큰, 공개 게시물·플레이스·블로그 식별정보, 연동 권한과 만료일')}</p>
      <p>{t('회사는 필요한 권한만 요청하며 회원은 외부 서비스의 설정에서 연동을 해제할 수 있습니다.')}</p>

      <h3>{t('3.10 고객지원정보')}</h3>
      <p>{t('문의내용, 첨부파일, 통화 또는 채팅기록, 계정 확인정보, 분쟁 및 처리결과')}</p>

      <h2>{t('4. 민감정보와 생체정보')}</h2>
      <ol>
        <li>{t('회사는 원칙적으로 민감정보를 회원가입에 요구하지 않습니다.')}</li>
        <li>{t('회원이 얼굴 또는 음성을 포함한 파일을 업로드할 경우 해당 자료는 AI 콘텐츠 생성을 위해 처리될 수 있습니다.')}</li>
        <li>{t('회사는 얼굴·음성을 개인을 고유하게 식별하기 위한 생체인증 또는 생체식별 목적으로 사용하지 않습니다. 별도 기능을 도입하는 경우 사전 고지와 필요한 동의를 받습니다.')}</li>
        <li>{t('회원은 타인의 얼굴, 음성, 건강, 정치적 견해, 종교, 성생활, 유전정보 또는 기타 민감정보를 업로드하기 전에 적법한 근거와 필요한 동의를 확보해야 합니다.')}</li>
        <li>{t('민감정보가 불필요한 경우 업로드하지 않아야 하며 회사는 위험한 정보의 삭제 또는 마스킹을 요청할 수 있습니다.')}</li>
      </ol>

      <h2>{t('5. 개인정보 처리 목적과 법적 근거')}</h2>

      <h3>{t('5.1 회원가입 및 계정 운영')}</h3>
      <p><strong>{t('목적:')}</strong> {t('회원 식별, 가입, 인증, 로그인, 계정관리, 워크스페이스 제공')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('계약 체결 및 이행, 회원의 요청에 따른 계약 전 조치, 적용 법률상 필요한 경우 동의')}</p>

      <h3>{t('5.2 AI 및 SaaS 기능 제공')}</h3>
      <p><strong>{t('목적:')}</strong> {t('AI 요청 처리, 콘텐츠 생성, 저장, 다운로드, 프로젝트 관리, 기술지원')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('계약 이행')}</p>

      <h3>{t('5.3 결제 및 회계')}</h3>
      <p><strong>{t('목적:')}</strong> {t('결제, 정기구독, 세금계산서, 환불, 거래기록 보관')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('계약 이행 및 법적 의무 준수')}</p>

      <h3>{t('5.4 보안과 부정 이용 방지')}</h3>
      <p><strong>{t('목적:')}</strong> {t('계정도용, 사기, 스팸, 악성코드, 보안공격 및 약관 위반 탐지')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('법적 의무, 회사와 이용자의 정당한 이익, 계약 이행')}</p>

      <h3>{t('5.5 고객지원')}</h3>
      <p><strong>{t('목적:')}</strong> {t('문의 확인, 장애처리, 분쟁해결, 품질관리')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('계약 이행, 법적 의무, 정당한 이익')}</p>

      <h3>{t('5.6 마케팅')}</h3>
      <p><strong>{t('목적:')}</strong> {t('프로모션, 할인, 이벤트, 신기능 및 마케팅 성과분석')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('이용자의 선택 동의 또는 현지 법률이 허용하는 기존 거래관계')}</p>

      <h3>{t('5.7 분석 쿠키')}</h3>
      <p><strong>{t('목적:')}</strong> {t('서비스 이용통계, 화면 개선, 오류분석')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('동의가 필요한 국가에서는 이용자의 동의, 그 밖의 경우 회사의 정당한 이익 또는 적용 법률상 허용되는 근거')}</p>

      <h3>{t('5.8 AI 품질 개선과 학습')}</h3>
      <p><strong>{t('목적:')}</strong> {t('오류분석, 안전성 평가, 기능 및 모델 개선')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('이용자의 별도 선택 동의 또는 완전히 익명화되어 개인정보가 아닌 정보')}</p>
      <p>{t('회사는 회원의 별도 동의 없이 고객 데이터 또는 AI 입력·생성물을 범용 모델 학습에 사용하지 않습니다.')}</p>

      <h3>{t('5.9 법적 의무와 권리보호')}</h3>
      <p><strong>{t('목적:')}</strong> {t('법령, 법원 명령, 규제기관 요청, 권리침해 대응 및 법적 청구의 제기·방어')}</p>
      <p><strong>{t('법적 근거:')}</strong> {t('법적 의무, 정당한 이익 및 법적 청구 관련 처리')}</p>

      <h2>{t('6. 자동으로 수집되는 정보')}</h2>
      <p>{t('회사는 서비스 이용 과정에서 IP 주소, 기기정보, 브라우저정보, 접속시간, 이용기록, 쿠키, 오류 및 보안로그를 수집할 수 있습니다.')}</p>
      <p>{t('회사는 이러한 정보를 다음 목적으로 처리합니다.')}</p>
      <ol>
        <li>{t('로그인 유지')}</li>
        <li>{t('보안과 부정 이용 방지')}</li>
        <li>{t('서비스 오류 분석')}</li>
        <li>{t('이용량 계산')}</li>
        <li>{t('지역별 법률 및 언어 적용')}</li>
        <li>{t('이용자 동의를 받은 분석 또는 맞춤형 기능')}</li>
      </ol>
      <p>{t('정확한 위치정보는 별도 기능에서 필요하고 이용자가 허용한 경우에만 처리합니다.')}</p>

      <h2>{t('7. 개인정보 수집 출처')}</h2>
      <p>{t('회사는 다음 경로로 개인정보를 수집합니다.')}</p>
      <ol>
        <li>{t('회원이 직접 입력하거나 업로드')}</li>
        <li>{t('기업 워크스페이스 관리자가 구성원 정보를 제공')}</li>
        <li>{t('기업회원이 고객 데이터를 업로드')}</li>
        <li>{t('소셜 로그인 및 외부 연동 서비스')}</li>
        <li>{t('결제대행사, 문자·이메일 발송사 및 통신 사업자')}</li>
        <li>{t('서비스 이용 과정에서 자동 생성')}</li>
        <li>{t('법률이 허용하는 공개 출처')}</li>
      </ol>
      <p>{t('공개된 정보라는 이유만으로 이를 무제한 마케팅에 이용하지 않습니다.')}</p>

      <h2>{t('8. 개인정보의 제3자 제공')}</h2>
      <p>{t('회사는 다음 경우를 제외하고 개인정보를 제3자의 독립적인 목적으로 제공하지 않습니다.')}</p>
      <ol>
        <li>{t('이용자가 별도로 동의한 경우')}</li>
        <li>{t('계약 이행을 위해 이용자가 요청한 외부 서비스에 제공하는 경우')}</li>
        <li>{t('법률에 특별한 규정이 있거나 적법한 법적 요청이 있는 경우')}</li>
        <li>{t('합병, 영업양도 또는 투자거래 과정에서 적절한 비밀유지와 보호조치를 적용한 경우')}</li>
        <li>{t('생명 또는 안전에 급박한 위험을 방지하기 위해 법률상 허용되는 경우')}</li>
      </ol>
      <p>{t('개인정보 제3자 제공이 발생하면 제공받는 자, 목적, 항목, 보유기간 및 거부권을 별도로 알리고 필요한 동의를 받습니다.')}</p>

      <h2>{t('9. 개인정보 처리위탁')}</h2>
      <p>{t('회사는 서비스 운영을 위해 다음 업무를 위탁할 수 있습니다.')}</p>
      <ol>
        <li>{t('클라우드 호스팅 및 데이터 저장')}</li>
        <li>{t('AI 영상·이미지·음성 생성')}</li>
        <li>{t('결제 및 청구')}</li>
        <li>{t('이메일 발송')}</li>
        <li>{t('SMS·LMS·MMS 발송')}</li>
        <li>{t('카카오 비즈메시지 발송')}</li>
        <li>{t('고객지원')}</li>
        <li>{t('오류분석과 모니터링')}</li>
        <li>{t('인증 및 소셜 로그인')}</li>
        <li>{t('콘텐츠 안전성 검사')}</li>
      </ol>
      <p>{t('실제 수탁자 표는 서비스 공개 시점에 아래 형식으로 공개합니다. (수탁자 / 위탁업무 / 처리 항목 / 보유기간 / 처리 국가 / 재수탁 여부) — 현재')} <span className="ph">[추후 입력]</span></p>
      <p>{t('회사는 수탁자와 개인정보 보호계약을 체결하고 필요한 관리·감독을 수행합니다.')}</p>

      <h2>{t('10. 개인정보 국외이전')}</h2>
      <p>{t('서비스 제공 과정에서 개인정보가 국외로 이전, 저장 또는 국외에서 조회될 수 있습니다.')}</p>
      <p>{t('회사는 개인정보 국외이전에 대해 적용 법률상 허용되는 다음 근거 중 적절한 근거를 적용합니다.')}</p>
      <ol>
        <li>{t('정보주체의 별도 동의')}</li>
        <li>{t('정보주체와의 계약 체결·이행에 필요한 처리위탁 또는 보관과 적법한 고지')}</li>
        <li>{t('법률, 조약 또는 국제협정')}</li>
        <li>{t('인정된 인증')}</li>
        <li>{t('개인정보 보호수준에 대한 동등성 또는 적정성 결정')}</li>
        <li>{t('EU 표준계약조항, 영국 국제데이터이전 부속서 또는 기타 적절한 보호조치')}</li>
      </ol>
      <p>{t('실제 국외이전 표(이전받는 자 / 연락처 / 이전 국가 / 이전 항목 / 이전 목적 / 이전 방법 / 보유기간 / 이전 근거 / 거부 방법 및 효과)는 서비스 공개 시점에 구체적으로 공개합니다. 이전 방법은 암호화된 네트워크 전송이며, 이전 일시는 서비스 이용 또는 해당 처리 발생 시입니다. 그 밖의 항목은 현재')} <span className="ph">[추후 입력]</span>.</p>
      <p>{t('“전 세계 서버”와 같은 포괄적 표현만 사용하지 않습니다.')}</p>

      <h2>{t('11. AI 입력물과 생성물의 처리')}</h2>
      <ol>
        <li>{t('회사는 AI 요청을 처리하고 생성물을 제공하기 위해 입력물과 생성물을 처리합니다.')}</li>
        <li>{t('입력물은 회사 또는 외부 AI 제공자의 시스템으로 전송될 수 있습니다.')}</li>
        <li>{t('회사는 외부 AI 제공자와 기업용 또는 API 계약을 체결하고 가능한 경우 고객 데이터의 모델 학습 미사용 설정을 적용합니다.')}</li>
        <li>{t('입력물과 생성물의 저장기간은 회원의 설정, 요금제 및 외부 제공자의 처리방식에 따라 달라질 수 있으며 실제 기간을 공개합니다.')}</li>
        <li>{t('회사는 별도의 동의 없이 입력물 또는 생성물을 범용 모델 학습에 사용하지 않습니다.')}</li>
        <li>{t('회사는 불법 콘텐츠, 성착취물, 악성코드, 사기, 권리침해 및 안전 위험을 탐지하기 위해 자동 필터링을 할 수 있습니다.')}</li>
        <li>{t('위험도가 높은 신고나 오류는 권한 있는 담당자가 검토할 수 있습니다.')}</li>
        <li>{t('회원은 AI 처리에 필요하지 않은 개인정보를 프롬프트나 파일에 입력하지 않아야 합니다.')}</li>
      </ol>

      <h2>{t('12. 고객 데이터')}</h2>
      <ol>
        <li>{t('기업회원은 고객 데이터의 처리 목적과 방법을 결정합니다.')}</li>
        <li>{t('회사는 기업회원의 문서화된 지시에 따라 고객 데이터를 처리합니다.')}</li>
        <li>{t('회사는 고객 데이터를 자체 마케팅, 광고 타기팅 또는 범용 AI 학습에 사용하지 않습니다.')}</li>
        <li>{t('회사는 기업회원의 지시, 계약 이행, 보안 및 법적 의무에 필요한 경우에만 고객 데이터에 접근합니다.')}</li>
        <li>{t('기업회원은 정보주체의 열람, 정정, 삭제, 처리정지, 이동 및 동의 철회 요청에 대응해야 합니다.')}</li>
        <li>{t('회사는 기술적으로 가능한 범위에서 기업회원의 권리 대응을 지원합니다.')}</li>
        <li>{t('기업회원이 고객 데이터의 삭제 또는 반환을 요청하면 회사는 법률상 보존이 필요한 경우를 제외하고 계약에 따라 처리합니다.')}</li>
      </ol>

      <h2>{t('13. 개인정보 판매 및 공유')}</h2>
      <ol>
        <li>{t('회사는 개인정보를 금전적 대가를 받고 판매하지 않습니다.')}</li>
        <li>{t('회사는 고객 데이터를 제3자의 맞춤형 광고 목적으로 판매하거나 공유하지 않습니다.')}</li>
        <li>{t('회사가 향후 캘리포니아 법률상 “판매” 또는 “공유”에 해당할 수 있는 행태광고를 도입하면 사전에 개인정보처리방침을 변경하고 “내 개인정보 판매 또는 공유 거부” 기능을 제공합니다.')}</li>
        <li>{t('적용 대상인 경우 회사는 유효한 Global Privacy Control 신호를 판매·공유 거부 요청으로 처리합니다.')}</li>
      </ol>

      <h2>{t('14. 개인정보 보유기간')}</h2>
      <p>{t('회사는 처리목적 달성 후 개인정보를 지체 없이 삭제합니다. 다만, 법령상 보존의무, 분쟁 대응 또는 보안 목적이 있는 경우 필요한 기간 동안 분리 보관할 수 있습니다.')}</p>
      <p>{t('일반 보유기준:')}</p>
      <ol>
        <li>{t('회원정보: 회원 탈퇴 또는 계약 종료 시까지. 탈퇴 후 복구 및 오류 방지를 위해 30일간 제한적으로 보관할 수 있습니다.')}</li>
        <li>{t('AI 프로젝트와 생성물: 회원이 삭제하거나 계약이 종료될 때까지. 삭제 후 백업본은 최대 90일 내 순차 삭제합니다.')}</li>
        <li>{t('고객 데이터: 기업회원의 지시 또는 계약 종료 시까지. 계약 종료 후')} <span className="ph">[추후 입력]</span> {t('내 삭제 또는 반환합니다.')}</li>
        <li>{t('계약 또는 청약철회 기록: 대한민국 이용자의 경우 관련 법령상 5년')}</li>
        <li>{t('대금결제 및 재화·서비스 공급 기록: 대한민국 이용자의 경우 관련 법령상 5년')}</li>
        <li>{t('소비자 불만 또는 분쟁처리 기록: 대한민국 이용자의 경우 관련 법령상 3년')}</li>
        <li>{t('표시·광고 기록: 대한민국 이용자의 경우 관련 법령상 6개월')}</li>
        <li>{t('마케팅 수신동의 및 철회기록: 동의 철회 후에도 법령 준수와 분쟁 대응에 필요한 기간')}</li>
        <li>{t('수신거부 목록: 다시 광고를 발송하지 않기 위한 최소한의 정보로 필요한 기간')}</li>
        <li>{t('보안로그: 보안사고 탐지, 조사 및 법적 의무에 필요한 기간')}</li>
        <li>{t('세무·회계자료: 각 국가의 세법과 회계법령에서 요구하는 기간')}</li>
      </ol>

      <h2>{t('15. 개인정보 삭제방법')}</h2>
      <ol>
        <li>{t('전자파일은 복구가 어렵도록 안전한 방법으로 삭제합니다.')}</li>
        <li>{t('종이문서는 분쇄 또는 소각합니다.')}</li>
        <li>{t('백업 데이터는 일반 시스템에서 즉시 접근할 수 없도록 격리하고 백업 순환주기에 따라 삭제합니다.')}</li>
        <li>{t('법령상 보존정보는 일반 이용정보와 분리해 접근권한을 제한합니다.')}</li>
      </ol>

      <h2>{t('16. 이용자의 권리')}</h2>
      <p>{t('이용자는 적용 법률에 따라 다음 권리를 행사할 수 있습니다.')}</p>
      <ol>
        <li>{t('개인정보 처리 여부 확인')}</li>
        <li>{t('개인정보 열람')}</li>
        <li>{t('부정확한 정보의 정정')}</li>
        <li>{t('개인정보 삭제')}</li>
        <li>{t('처리정지 또는 제한')}</li>
        <li>{t('동의 철회')}</li>
        <li>{t('개인정보 이동 또는 전송')}</li>
        <li>{t('직접 마케팅에 대한 반대')}</li>
        <li>{t('자동화된 결정에 대한 설명 또는 거부')}</li>
        <li>{t('개인정보 판매·공유 거부')}</li>
        <li>{t('민감정보 사용 제한')}</li>
        <li>{t('개인정보 감독기관에 민원 또는 불만 제기')}</li>
        <li>{t('권리 행사로 인한 차별을 받지 않을 권리')}</li>
      </ol>
      <p>{t('권리행사 방법: 계정 설정의 개인정보 메뉴 또는')} <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a>{t('으로 요청')}</p>
      <p>{t('회사는 요청자의 신원을 합리적인 방법으로 확인할 수 있습니다.')}</p>
      <p>{t('대리인이 요청하는 경우 위임장 등 적법한 권한을 확인할 수 있습니다.')}</p>
      <p>{t('법률상 예외가 있는 경우 요청의 전부 또는 일부가 제한될 수 있으며 회사는 가능한 범위에서 그 사유를 설명합니다.')}</p>

      <h2>{t('17. 대한민국 이용자의 권리')}</h2>
      <p>{t('대한민국 이용자는 개인정보 열람, 정정·삭제, 처리정지, 동의 철회, 개인정보 전송요구 및 자동화된 결정에 대한 설명·거부를 관련 법률에 따라 요청할 수 있습니다.')}</p>
      <p>{t('개인정보 침해에 관한 상담 또는 분쟁 해결을 위해 개인정보침해 신고기관, 개인정보분쟁조정기관 및 관계 감독기관을 이용할 수 있습니다.')}</p>
      <p>{t('회사는 정보주체의 권리 행사를 이유로 부당한 불이익을 주지 않습니다.')}</p>

      <h2>{t('18. EU·EEA·영국·스위스 이용자의 권리')}</h2>
      <p>{t('해당 지역 이용자는 적용 법률에 따라 다음 권리를 가질 수 있습니다.')}</p>
      <ol>
        <li>{t('열람권')}</li>
        <li>{t('정정권')}</li>
        <li>{t('삭제권')}</li>
        <li>{t('처리제한권')}</li>
        <li>{t('데이터 이동권')}</li>
        <li>{t('정당한 이익에 근거한 처리에 대한 반대권')}</li>
        <li>{t('직접 마케팅에 대한 절대적인 반대권')}</li>
        <li>{t('동의 철회권')}</li>
        <li>{t('중대한 영향을 미치는 전적으로 자동화된 결정의 대상이 되지 않을 권리')}</li>
        <li>{t('관할 감독기관에 이의를 제기할 권리')}</li>
      </ol>
      <p>{t('회사가 EU·EEA 또는 영국 밖으로 개인정보를 이전하는 경우 적정성 결정, 표준계약조항, 영국 부속서 또는 기타 적절한 보호조치를 사용합니다.')}</p>
      <p>{t('이용자는 적용된 보호조치의 사본 또는 요약을 요청할 수 있습니다.')}</p>

      <h2>{t('19. 미국 거주자의 추가 권리')}</h2>
      <p>{t('적용되는 미국 주 개인정보법의 대상이 되는 경우 이용자는 다음 권리를 가질 수 있습니다.')}</p>
      <ol>
        <li>{t('수집·이용·공개된 개인정보의 범주와 구체적 정보 확인')}</li>
        <li>{t('삭제')}</li>
        <li>{t('부정확한 정보 정정')}</li>
        <li>{t('개인정보의 판매 또는 타기팅 광고 목적 공유 거부')}</li>
        <li>{t('민감정보 사용 제한')}</li>
        <li>{t('개인정보 사본 수령')}</li>
        <li>{t('권리행사에 대한 차별 금지')}</li>
        <li>{t('회사가 요청을 거절한 경우 이의제기')}</li>
      </ol>
      <p>{t('회사는 요청을 처리하기 위해 신원을 확인할 수 있습니다.')}</p>
      <p>{t('회사가 법률상 적용 대상이 아닌 경우에도 합리적인 범위에서 동일하거나 유사한 요청을 처리할 수 있습니다.')}</p>

      <h2>{t('20. 아동·청소년')}</h2>
      <ol>
        <li>{t('BYGENCY는 만 18세 미만의 이용자를 대상으로 하지 않습니다.')}</li>
        <li>{t('회사는 만 18세 미만인 사람으로부터 고의로 회원 개인정보를 수집하지 않습니다.')}</li>
        <li>{t('미성년자가 계정을 개설한 사실을 알게 되면 계정을 제한하고 관련 정보를 삭제합니다.')}</li>
        <li>{t('보호자는 미성년자의 정보 삭제를')} <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a>{t('으로 요청할 수 있습니다.')}</li>
        <li>{t('기업회원은 랜딩페이지로 아동의 정보를 수집하기 전에 적용 법률에 따른 보호자 동의와 추가 보호조치를 마련해야 합니다.')}</li>
      </ol>

      <h2>{t('21. 자동화된 결정')}</h2>
      <ol>
        <li>{t('회사는 스팸, 사기, 악성코드, 금지 콘텐츠 또는 계정 보안위험을 탐지하기 위해 자동화된 시스템을 사용할 수 있습니다.')}</li>
        <li>{t('자동화된 탐지 결과로 계정 또는 콘텐츠가 제한될 수 있습니다.')}</li>
        <li>{t('중대한 조치에 대해 회원은 사람의 검토와 이의제기를 요청할 수 있습니다.')}</li>
        <li>{t('회사는 현재 이용자의 법적 권리 또는 이에 준하는 중대한 영향을 전적으로 자동으로 결정하는 목적으로 AI 영상 생성 결과를 사용하지 않습니다.')}</li>
        <li>{t('향후 그러한 기능을 도입하면 법적 근거, 처리방식, 예상 결과 및 권리행사 방법을 사전에 알립니다.')}</li>
      </ol>

      <h2>{t('22. 개인정보 안전성 확보조치')}</h2>
      <p>{t('회사는 개인정보의 분실, 도난, 유출, 위조, 변조 및 무단접근을 방지하기 위해 다음 조치를 적용합니다.')}</p>
      <ol>
        <li>{t('개인정보 보호 내부관리계획')}</li>
        <li>{t('최소 권한과 역할 기반 접근통제')}</li>
        <li>{t('관리자 및 중요계정 다중인증')}</li>
        <li>{t('전송구간 암호화')}</li>
        <li>{t('비밀번호 단방향 암호화')}</li>
        <li>{t('저장정보 암호화 또는 이에 준하는 보호조치')}</li>
        <li>{t('접근 및 변경기록 저장·점검')}</li>
        <li>{t('개발·운영환경 분리')}</li>
        <li>{t('취약점 점검과 보안 업데이트')}</li>
        <li>{t('악성코드 및 침입 탐지')}</li>
        <li>{t('임직원 비밀유지와 개인정보 교육')}</li>
        <li>{t('수탁자 보안평가와 계약')}</li>
        <li>{t('백업과 재해복구')}</li>
        <li>{t('개인정보 최소화와 보유기간 관리')}</li>
        <li>{t('보안사고 대응절차')}</li>
        <li>{t('정기적인 권한 검토')}</li>
        <li>{t('고객 데이터 논리적 분리')}</li>
      </ol>

      <h2>{t('23. 개인정보 침해사고')}</h2>
      <ol>
        <li>{t('회사는 개인정보 침해가 의심되면 사실관계와 영향을 조사합니다.')}</li>
        <li>{t('법률상 통지 의무가 있는 경우 정보주체와 감독기관에 법정기한 내 통지합니다.')}</li>
        <li>{t('통지에는 가능한 범위에서 침해 항목, 발생시점, 예상 피해, 회사의 대응조치 및 이용자의 보호방법을 포함합니다.')}</li>
        <li>{t('기업회원의 고객 데이터에 침해가 발생하면 회사는 개인정보처리위탁 특약에 따라 기업회원에게 부당한 지연 없이 알립니다.')}</li>
      </ol>

      <h2>{t('24. 쿠키와 유사기술')}</h2>
      <p>{t('회사는 쿠키, 로컬스토리지, SDK, 픽셀 및 유사기술을 사용할 수 있습니다.')}</p>
      <ol>
        <li>{t('필수 쿠키: 로그인, 세션, 보안, 부하분산, 동의설정 저장')}</li>
        <li>{t('기능 쿠키: 언어, 화면설정, 편의기능')}</li>
        <li>{t('분석 쿠키: 방문, 기능 이용, 오류 및 성능분석')}</li>
        <li>{t('광고 쿠키: 맞춤형 광고와 광고성과 측정')}</li>
      </ol>
      <p>{t('비필수 쿠키는 동의가 필요한 지역에서 이용자가 동의하기 전 설치하지 않습니다.')}</p>
      <p>{t('이용자는 쿠키 설정 메뉴에서 목적별로 동의를 변경할 수 있습니다.')}</p>

      <h2>{t('25. 개인정보처리방침 변경')}</h2>
      <ol>
        <li>{t('회사는 법령, 서비스 또는 개인정보 처리방식의 변경에 따라 본 방침을 변경할 수 있습니다.')}</li>
        <li>{t('중요한 변경은 시행일 전에 개별 통지하거나 서비스 내에 눈에 띄게 공지합니다.')}</li>
        <li>{t('별도 동의가 필요한 변경은 공지만으로 처리하지 않고 필요한 동의를 받습니다.')}</li>
        <li>{t('이전 버전과 변경일을 확인할 수 있도록 보관합니다.')}</li>
      </ol>

      <h2>{t('26. 문의처')}</h2>
      <p><strong>{t('개인정보 보호책임자:')}</strong> {t('고선우')}</p>
      <p><strong>{t('이메일:')}</strong> <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a></p>
      <p><strong>{t('전화번호:')}</strong> <span className="ph">[추후 입력]</span></p>
      <p><strong>{t('주소:')}</strong> <span className="ph">[추후 입력]</span></p>
    </LegalShell>
  )
}
