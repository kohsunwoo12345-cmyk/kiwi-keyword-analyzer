'use client'

import { LegalShell } from '@/components/legal/LegalShell'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  '이용약관': { en: 'Terms of Service', ja: '利用規約', zh: '服务条款' },
  '2026년 9월 1일': { en: 'September 1, 2026', ja: '2026年9月1日', zh: '2026年9月1日' },
  '본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.': {
    en: 'The Korean-language version of this document is the original. In the event of any discrepancy between the translation and the Korean version, the Korean version prevails.',
    ja: '本書面は韓国語版を原本とします。翻訳版との間に解釈の相違がある場合は、韓国語版が優先します。',
    zh: '本文件以韩语版本为准。如译文与韩语版本存在解释差异，以韩语版本为准。',
  },
  '본 이용약관은 주식회사 넥스트 바이전시가 제공하는 BYGENCY 서비스의 이용조건과 회사 및 회원의 권리·의무를 정합니다.': {
    en: 'These Terms of Service set out the conditions for using the BYGENCY service provided by NEXT BYGENCY Co., Ltd. and the rights and obligations of the Company and members.',
    ja: '本利用規約は、株式会社ネクストバイジェンシーが提供するBYGENCYサービスの利用条件、ならびに当社および会員の権利・義務を定めます。',
    zh: '本服务条款规定株式会社 NEXT BYGENCY 提供的 BYGENCY 服务的使用条件以及公司与会员的权利义务。',
  },

  '제1조 회사 정보': { en: 'Article 1 Company Information', ja: '第1条 会社情報', zh: '第1条 公司信息' },
  '상호:': { en: 'Company name:', ja: '商号：', zh: '商号：' },
  '주식회사 넥스트 바이전시': { en: 'NEXT BYGENCY Co., Ltd.', ja: '株式会社ネクストバイジェンシー', zh: '株式会社 NEXT BYGENCY' },
  '대표자:': { en: 'Representative:', ja: '代表者：', zh: '代表人：' },
  '고선우': { en: 'Ko Sun-woo', ja: 'コ・ソヌ', zh: 'Ko Sun-woo' },
  '사업자등록번호:': { en: 'Business registration number:', ja: '事業者登録番号：', zh: '营业执照号：' },
  '통신판매업 신고번호:': { en: 'Mail-order business registration number:', ja: '通信販売業申告番号：', zh: '通信销售业申报号：' },
  '사업장 주소:': { en: 'Business address:', ja: '事業場所在地：', zh: '营业场所地址：' },
  '대표 이메일:': { en: 'Main email:', ja: '代表メール：', zh: '主要邮箱：' },
  '고객센터:': { en: 'Customer support:', ja: 'カスタマーセンター：', zh: '客户中心：' },
  '개인정보 보호책임자 연락처:': { en: 'Data protection officer contact:', ja: '個人情報保護責任者連絡先：', zh: '个人信息保护负责人联系方式：' },
  '호스팅 제공자:': { en: 'Hosting provider:', ja: 'ホスティング提供者：', zh: '托管服务提供者：' },

  '제2조 정의': { en: 'Article 2 Definitions', ja: '第2条 定義', zh: '第2条 定义' },
  '“BYGENCY”란 회사가 제공하는 노드 기반 AI 영상 제작 및 관련 SaaS 서비스를 말합니다.': {
    en: '“BYGENCY” means the node-based AI video production and related SaaS services provided by the Company.',
    ja: '「BYGENCY」とは、当社が提供するノードベースのAI映像制作および関連SaaSサービスをいいます。',
    zh: '“BYGENCY”是指公司提供的基于节点的 AI 视频制作及相关 SaaS 服务。',
  },
  '“회원”이란 본 약관에 동의하고 계정을 개설한 개인 또는 법인을 말합니다.': {
    en: '“Member” means an individual or legal entity that has agreed to these Terms and opened an account.',
    ja: '「会員」とは、本規約に同意しアカウントを開設した個人または法人をいいます。',
    zh: '“会员”是指同意本条款并开设账户的个人或法人。',
  },
  '“개인회원”이란 주로 개인적 목적으로 서비스를 이용하는 자연인을 말합니다.': {
    en: '“Individual member” means a natural person who uses the service primarily for personal purposes.',
    ja: '「個人会員」とは、主に個人的な目的でサービスを利用する自然人をいいます。',
    zh: '“个人会员”是指主要出于个人目的使用服务的自然人。',
  },
  '“기업회원”이란 사업, 직업 또는 영리활동과 관련하여 서비스를 이용하는 법인, 단체, 개인사업자 또는 그 임직원을 말합니다.': {
    en: '“Business member” means a legal entity, organization, sole proprietor, or their officers and employees who use the service in connection with business, professional, or commercial activities.',
    ja: '「企業会員」とは、事業、職業または営利活動に関連してサービスを利用する法人、団体、個人事業者またはその役職員をいいます。',
    zh: '“企业会员”是指为经营、职业或营利活动而使用服务的法人、团体、个体经营者或其职员。',
  },
  '“워크스페이스”란 여러 회원이 프로젝트, 파일, 크레딧, 고객정보 및 권한을 공동으로 관리하는 작업공간을 말합니다.': {
    en: '“Workspace” means a working area where multiple members jointly manage projects, files, credits, customer information, and permissions.',
    ja: '「ワークスペース」とは、複数の会員がプロジェクト、ファイル、クレジット、顧客情報および権限を共同で管理する作業空間をいいます。',
    zh: '“工作区”是指多个会员共同管理项目、文件、积分、客户信息及权限的工作空间。',
  },
  '“입력물”이란 회원이 서비스에 입력하거나 업로드하는 문구, 프롬프트, 이미지, 영상, 음성, 음악, 파일, 고객정보, 노드 설정값 및 기타 자료를 말합니다.': {
    en: '“Input” means the text, prompts, images, videos, audio, music, files, customer information, node settings, and other materials that a member enters or uploads to the service.',
    ja: '「入力物」とは、会員がサービスに入力またはアップロードする文言、プロンプト、画像、映像、音声、音楽、ファイル、顧客情報、ノード設定値およびその他の資料をいいます。',
    zh: '“输入内容”是指会员向服务录入或上传的文字、提示词、图像、视频、音频、音乐、文件、客户信息、节点设置值及其他资料。',
  },
  '“생성물”이란 AI 또는 자동화 기능을 통해 생성·변환·분석된 영상, 이미지, 음성, 텍스트, 분석자료 및 기타 결과물을 말합니다.': {
    en: '“Output” means the videos, images, audio, text, analytical materials, and other results generated, transformed, or analyzed through AI or automation features.',
    ja: '「生成物」とは、AIまたは自動化機能を通じて生成・変換・分析された映像、画像、音声、テキスト、分析資料およびその他の成果物をいいます。',
    zh: '“生成内容”是指通过 AI 或自动化功能生成、转换或分析的视频、图像、音频、文本、分析资料及其他成果。',
  },
  '“고객 데이터”란 회원이 랜딩페이지, CRM, 협업 또는 메시지 발송 기능을 통해 수집·입력·업로드·관리하는 제3자의 개인정보 및 관련 자료를 말합니다.': {
    en: '“Customer data” means the personal information of third parties and related materials that a member collects, enters, uploads, or manages through the landing page, CRM, collaboration, or message-sending features.',
    ja: '「顧客データ」とは、会員がランディングページ、CRM、コラボレーションまたはメッセージ送信機能を通じて収集・入力・アップロード・管理する第三者の個人情報および関連資料をいいます。',
    zh: '“客户数据”是指会员通过着陆页、CRM、协作或消息发送功能收集、录入、上传或管理的第三方个人信息及相关资料。',
  },
  '“크레딧”이란 AI 생성, 분석, 메시지 발송 또는 특정 기능 사용량을 계산하기 위한 서비스 내 전자적 이용단위를 말합니다.': {
    en: '“Credits” means the electronic units of use within the service for calculating usage of AI generation, analysis, message sending, or particular features.',
    ja: '「クレジット」とは、AI生成、分析、メッセージ送信または特定機能の使用量を計算するためのサービス内の電子的利用単位をいいます。',
    zh: '“积分”是指服务内用于计算 AI 生成、分析、消息发送或特定功能使用量的电子使用单位。',
  },
  '“구독”이란 월간 또는 연간 단위로 자동 갱신되는 유료 이용계약을 말합니다.': {
    en: '“Subscription” means a paid usage contract that renews automatically on a monthly or annual basis.',
    ja: '「サブスクリプション」とは、月間または年間単位で自動更新される有料利用契約をいいます。',
    zh: '“订阅”是指按月或按年自动续订的付费使用合同。',
  },
  '“외부 서비스”란 클라우드, 외부 AI 모델, 결제, 이메일, 문자, 카카오 비즈메시지, 분석, 검색 또는 소셜 로그인 등 제3자가 제공하는 서비스를 말합니다.': {
    en: '“External services” means services provided by third parties, such as cloud, external AI models, payment, email, SMS, KakaoTalk Biz Message, analytics, search, or social login.',
    ja: '「外部サービス」とは、クラウド、外部AIモデル、決済、メール、SMS、カカオビズメッセージ、分析、検索またはソーシャルログインなど、第三者が提供するサービスをいいます。',
    zh: '“外部服务”是指云服务、外部 AI 模型、支付、电子邮件、短信、Kakao 商务消息、分析、搜索或社交登录等第三方提供的服务。',
  },

  '제3조 약관의 게시 및 효력': { en: 'Article 3 Posting and Effect of the Terms', ja: '第3条 規約の掲示および効力', zh: '第3条 条款的公示与效力' },
  '회사는 본 약관을 회원가입 화면과 서비스 내에서 쉽게 확인할 수 있도록 게시합니다.': {
    en: 'The Company posts these Terms so that they can be easily viewed on the sign-up screen and within the service.',
    ja: '当社は、本規約を会員登録画面およびサービス内で容易に確認できるように掲示します。',
    zh: '公司在注册页面及服务内公示本条款，以便轻松查阅。',
  },
  '회원은 체크박스 선택 또는 이에 준하는 전자적 방법으로 약관에 동의합니다.': {
    en: 'Members agree to the Terms by selecting a checkbox or an equivalent electronic method.',
    ja: '会員は、チェックボックスの選択またはこれに準ずる電子的方法により規約に同意します。',
    zh: '会员通过勾选复选框或与之相当的电子方式同意本条款。',
  },
  '회사는 회원이 약관을 저장하거나 출력할 수 있도록 제공합니다.': {
    en: 'The Company enables members to save or print the Terms.',
    ja: '当社は、会員が規約を保存または印刷できるように提供します。',
    zh: '公司提供会员保存或打印本条款的功能。',
  },
  '회원이 기업 또는 단체를 대신하여 가입하는 경우 해당 기업 또는 단체를 본 약관에 구속시킬 권한이 있음을 보증합니다.': {
    en: 'A member who signs up on behalf of a company or organization warrants that it has the authority to bind that company or organization to these Terms.',
    ja: '会員が企業または団体を代理して登録する場合、当該企業または団体を本規約に拘束させる権限を有することを保証します。',
    zh: '会员代表企业或团体注册时，保证其有权使该企业或团体受本条款约束。',
  },
  '개별 서비스 화면, 요금제 설명, 주문서, 기업계약서, 개인정보처리위탁 특약 및 별도 운영정책은 본 약관의 일부를 구성합니다.': {
    en: 'Individual service screens, plan descriptions, order forms, enterprise agreements, the Data Processing Addendum, and separate operational policies form part of these Terms.',
    ja: '個別のサービス画面、料金プランの説明、注文書、企業契約書、個人情報取扱委託特約および別途の運営方針は、本規約の一部を構成します。',
    zh: '各项服务页面、套餐说明、订单、企业合同、个人信息处理委托特别条款及单独的运营政策构成本条款的一部分。',
  },
  '개별 계약과 본 약관이 충돌하는 경우 개별 계약, 개인정보처리위탁 특약, 본 약관 순으로 적용합니다. 다만, 소비자에게 불리하게 법률상 권리를 제한하지 않습니다.': {
    en: 'Where an individual agreement conflicts with these Terms, the order of application is the individual agreement, the Data Processing Addendum, and then these Terms. However, this does not restrict consumers’ statutory rights to their disadvantage.',
    ja: '個別契約と本規約が矛盾する場合、個別契約、個人情報取扱委託特約、本規約の順で適用します。ただし、消費者に不利に法律上の権利を制限しません。',
    zh: '个别合同与本条款冲突时，按个别合同、个人信息处理委托特别条款、本条款的顺序适用。但不得对消费者不利地限制其法定权利。',
  },

  '제4조 약관의 변경': { en: 'Article 4 Changes to the Terms', ja: '第4条 規約の変更', zh: '第4条 条款的变更' },
  '회사는 관련 법령, 서비스 내용 및 사업정책의 변경에 따라 약관을 변경할 수 있습니다.': {
    en: 'The Company may amend the Terms in accordance with changes in applicable laws, service content, and business policies.',
    ja: '当社は、関連法令、サービス内容および事業方針の変更に応じて規約を変更することができます。',
    zh: '公司可根据相关法令、服务内容及经营政策的变化变更条款。',
  },
  '회원에게 불리하거나 중요한 변경은 원칙적으로 시행일 30일 전부터 알립니다.': {
    en: 'Changes that are unfavorable to members or material are, in principle, announced from 30 days before the effective date.',
    ja: '会員に不利または重要な変更は、原則として施行日の30日前から通知します。',
    zh: '对会员不利或重大的变更，原则上自生效日前 30 日起予以通知。',
  },
  '단순한 오탈자 수정, 회원에게 유리한 변경 또는 긴급한 법령·보안상 변경은 법령이 허용하는 범위에서 더 짧은 기간으로 알릴 수 있습니다.': {
    en: 'Mere typo corrections, changes favorable to members, or urgent legal or security changes may be announced within a shorter period to the extent permitted by law.',
    ja: '単純な誤字脱字の訂正、会員に有利な変更、または緊急の法令・セキュリティ上の変更は、法令が許容する範囲でより短い期間で通知することができます。',
    zh: '单纯的错别字更正、对会员有利的变更或紧急的法令、安全变更，可在法令允许范围内以更短的期间通知。',
  },
  '요금 인상, 무료 서비스의 유료전환, 개인정보 처리 목적의 실질적 확대 등 별도의 동의가 필요한 변경은 공지만으로 처리하지 않고 관련 법령에 따른 동의를 받습니다.': {
    en: 'Changes requiring separate consent, such as price increases, conversion of free services to paid, or a substantial expansion of the purpose of personal data processing, are not handled by mere notice; consent is obtained in accordance with applicable law.',
    ja: '料金の引き上げ、無料サービスの有料化、個人情報の処理目的の実質的な拡大など、別途の同意が必要な変更は、告知のみで処理せず、関連法令に基づく同意を取得します。',
    zh: '涨价、免费服务转为付费、个人信息处理目的的实质性扩大等需另行同意的变更，不以公告方式处理，而是依照相关法令取得同意。',
  },
  '회원이 변경된 약관에 동의하지 않으면 시행일 전에 구독을 해지하고 회원 탈퇴를 요청할 수 있습니다.': {
    en: 'If a member does not agree to the amended Terms, the member may cancel the subscription and request withdrawal before the effective date.',
    ja: '会員が変更後の規約に同意しない場合、施行日前にサブスクリプションを解約し、退会を請求することができます。',
    zh: '会员不同意变更后的条款的，可在生效日前解除订阅并申请退会。',
  },
  '단순히 서비스를 계속 이용했다는 사실만으로 법령상 명시적 동의가 필요한 사항에 동의한 것으로 간주하지 않습니다.': {
    en: 'The mere fact of continued use of the service is not deemed consent to matters that require express consent under the law.',
    ja: '単にサービスを継続して利用したという事実のみをもって、法令上明示的な同意が必要な事項に同意したものとはみなしません。',
    zh: '仅凭继续使用服务这一事实，不视为对法令上需要明示同意的事项表示同意。',
  },

  '제5조 서비스 이용자격': { en: 'Article 5 Eligibility to Use the Service', ja: '第5条 サービス利用資格', zh: '第5条 服务使用资格' },
  '회원은 만 18세 이상이어야 합니다.': {
    en: 'Members must be at least 18 years old.',
    ja: '会員は満18歳以上でなければなりません。',
    zh: '会员须年满 18 周岁。',
  },
  '만 18세 미만인 사람은 회원가입 및 서비스 이용이 허용되지 않습니다.': {
    en: 'Persons under 18 years of age are not permitted to sign up for or use the service.',
    ja: '満18歳未満の者は、会員登録およびサービスの利用が許可されません。',
    zh: '未满 18 周岁者不得注册及使用服务。',
  },
  '회원은 법률상 유효한 계약을 체결할 능력이 있어야 합니다.': {
    en: 'Members must have the legal capacity to enter into a valid contract.',
    ja: '会員は、法律上有効な契約を締結する能力を有していなければなりません。',
    zh: '会员须具备订立法律上有效合同的能力。',
  },
  '국제 제재, 수출통제 또는 현지 법률에 따라 서비스 제공이 금지된 국가·지역 또는 대상자에게는 서비스가 제한될 수 있습니다.': {
    en: 'The service may be restricted for countries, regions, or persons to whom provision is prohibited under international sanctions, export controls, or local law.',
    ja: '国際制裁、輸出管理または現地法令によりサービスの提供が禁止された国・地域または対象者には、サービスが制限される場合があります。',
    zh: '对于依据国际制裁、出口管制或当地法律禁止提供服务的国家、地区或对象，服务可能受到限制。',
  },
  '회사는 특정 국가에서 현지 법률 준수를 위한 준비가 완료되지 않은 경우 신규 가입, 결제, CRM 발송 또는 특정 기능을 제한할 수 있습니다.': {
    en: 'Where preparations for local legal compliance have not been completed in a particular country, the Company may restrict new sign-ups, payment, CRM sending, or specific features.',
    ja: '当社は、特定の国において現地法令遵守のための準備が完了していない場合、新規登録、決済、CRM送信または特定機能を制限することができます。',
    zh: '在特定国家尚未完成当地法律合规准备的情况下，公司可限制新注册、支付、CRM 发送或特定功能。',
  },

  '제6조 회원가입': { en: 'Article 6 Membership Registration', ja: '第6条 会員登録', zh: '第6条 会员注册' },
  '회원은 정확하고 최신의 정보를 제공해야 합니다.': {
    en: 'Members must provide accurate and up-to-date information.',
    ja: '会員は、正確かつ最新の情報を提供しなければなりません。',
    zh: '会员须提供准确、最新的信息。',
  },
  '타인의 이메일, 전화번호, 사업자정보 또는 신원을 도용해서는 안 됩니다.': {
    en: 'Members must not misappropriate another person’s email, phone number, business information, or identity.',
    ja: '他人のメール、電話番号、事業者情報または身元を盗用してはなりません。',
    zh: '不得盗用他人的电子邮箱、电话号码、营业信息或身份。',
  },
  '회사는 이메일 또는 휴대전화 인증, 기업 도메인 확인, 사업자 확인 및 추가 보안절차를 요구할 수 있습니다.': {
    en: 'The Company may require email or mobile phone verification, corporate domain verification, business verification, and additional security procedures.',
    ja: '当社は、メールまたは携帯電話認証、企業ドメイン確認、事業者確認および追加のセキュリティ手続を求めることができます。',
    zh: '公司可要求进行电子邮箱或手机验证、企业域名确认、营业者确认及其他安全程序。',
  },
  '회사는 다음 사유가 있는 경우 가입을 거절하거나 사후에 취소할 수 있습니다.': {
    en: 'The Company may refuse registration or cancel it afterward in the following cases.',
    ja: '当社は、次の事由がある場合、登録を拒否し、または事後に取り消すことができます。',
    zh: '在下列情形下，公司可拒绝注册或事后取消注册。',
  },
  '가. 허위정보를 제공한 경우': {
    en: 'a. Where false information was provided',
    ja: 'ア．虚偽の情報を提供した場合',
    zh: '甲. 提供虚假信息的情形',
  },
  '나. 타인의 정보를 무단으로 사용한 경우': {
    en: 'b. Where another person’s information was used without authorization',
    ja: 'イ．他人の情報を無断で使用した場合',
    zh: '乙. 未经授权使用他人信息的情形',
  },
  '다. 과거 중대한 약관 위반으로 이용이 제한된 경우': {
    en: 'c. Where use was previously restricted due to a serious breach of the Terms',
    ja: 'ウ．過去に重大な規約違反により利用が制限された場合',
    zh: '丙. 曾因重大违反条款而被限制使用的情形',
  },
  '라. 불법 스팸, 사기 또는 권리침해 목적으로 가입한 정황이 있는 경우': {
    en: 'd. Where there are indications of signing up for the purpose of illegal spam, fraud, or infringement of rights',
    ja: 'エ．違法なスパム、詐欺または権利侵害を目的として登録した状況がある場合',
    zh: '丁. 有迹象表明为非法垃圾信息、欺诈或侵权目的而注册的情形',
  },
  '마. 적용 법률상 서비스 제공이 금지된 경우': {
    en: 'e. Where provision of the service is prohibited under applicable law',
    ja: 'オ．適用法令上、サービスの提供が禁止されている場合',
    zh: '戊. 依适用法律禁止提供服务的情形',
  },
  '바. 시스템 안정성 또는 다른 이용자에게 중대한 위험을 초래할 우려가 있는 경우': {
    en: 'f. Where there is a risk of causing serious harm to system stability or to other users',
    ja: 'カ．システムの安定性または他の利用者に重大な危険をもたらすおそれがある場合',
    zh: '己. 可能对系统稳定性或其他用户造成重大风险的情形',
  },

  '제7조 계정 및 보안': { en: 'Article 7 Accounts and Security', ja: '第7条 アカウントおよびセキュリティ', zh: '第7条 账户与安全' },
  '회원은 계정과 비밀번호를 안전하게 관리할 책임이 있습니다.': {
    en: 'Members are responsible for securely managing their accounts and passwords.',
    ja: '会員は、アカウントおよびパスワードを安全に管理する責任を負います。',
    zh: '会员有责任妥善保管账户与密码。',
  },
  '회원은 계정을 판매, 임대, 양도 또는 무단 공유해서는 안 됩니다.': {
    en: 'Members must not sell, lease, transfer, or share their accounts without authorization.',
    ja: '会員は、アカウントを販売、賃貸、譲渡または無断で共有してはなりません。',
    zh: '会员不得出售、出租、转让或擅自共享账户。',
  },
  '기업용 요금제가 아닌 계정을 여러 사람이 공동으로 사용해서는 안 됩니다.': {
    en: 'Accounts that are not on an enterprise plan must not be used jointly by multiple persons.',
    ja: '企業向け料金プランではないアカウントを複数人で共同利用してはなりません。',
    zh: '非企业套餐的账户不得由多人共同使用。',
  },
  '계정 도용 또는 보안사고가 의심되면 즉시 비밀번호를 변경하고 회사에 알려야 합니다.': {
    en: 'If account theft or a security incident is suspected, members must immediately change their password and notify the Company.',
    ja: 'アカウントの盗用またはセキュリティインシデントが疑われる場合、直ちにパスワードを変更し、当社に通知しなければなりません。',
    zh: '如怀疑账户被盗用或发生安全事件，须立即更改密码并通知公司。',
  },
  '회사는 비정상 로그인, 대량 발송, 자동화 공격 또는 계정 도용이 의심되는 경우 인증을 추가로 요구하거나 계정을 일시 제한할 수 있습니다.': {
    en: 'Where abnormal logins, mass sending, automated attacks, or account theft are suspected, the Company may require additional authentication or temporarily restrict the account.',
    ja: '当社は、異常なログイン、大量送信、自動化された攻撃またはアカウントの盗用が疑われる場合、追加の認証を求め、またはアカウントを一時的に制限することができます。',
    zh: '在怀疑存在异常登录、大量发送、自动化攻击或账户盗用的情况下，公司可要求追加验证或临时限制账户。',
  },
  '회원의 고의 또는 과실 없이 발생한 사고에 관한 책임은 관련 법률에 따릅니다.': {
    en: 'Liability for incidents occurring without the member’s intent or negligence follows applicable law.',
    ja: '会員の故意または過失なく発生した事故に関する責任は、関連法令に従います。',
    zh: '因非会员故意或过失而发生的事故的责任，依相关法律确定。',
  },

  '제8조 워크스페이스와 팀 관리': { en: 'Article 8 Workspaces and Team Management', ja: '第8条 ワークスペースとチーム管理', zh: '第8条 工作区与团队管理' },
  '워크스페이스 소유자와 관리자는 구성원을 초대하고 역할과 접근권한을 설정할 수 있습니다.': {
    en: 'Workspace owners and administrators may invite members and set roles and access rights.',
    ja: 'ワークスペースの所有者および管理者は、メンバーを招待し、役割とアクセス権限を設定することができます。',
    zh: '工作区所有者与管理员可邀请成员并设置角色和访问权限。',
  },
  '기업회원은 최소 권한 원칙에 따라 고객 데이터, 결제정보 및 프로젝트 접근권한을 설정해야 합니다.': {
    en: 'Business members must set access rights to customer data, payment information, and projects in accordance with the principle of least privilege.',
    ja: '企業会員は、最小権限の原則に従い、顧客データ、決済情報およびプロジェクトへのアクセス権限を設定しなければなりません。',
    zh: '企业会员须依最小权限原则设置客户数据、支付信息及项目的访问权限。',
  },
  '워크스페이스 소유자는 구성원이 생성·업로드한 자료에 접근하거나 이를 삭제할 수 있습니다.': {
    en: 'Workspace owners may access or delete materials created or uploaded by members.',
    ja: 'ワークスペースの所有者は、メンバーが作成・アップロードした資料にアクセスし、またはこれを削除することができます。',
    zh: '工作区所有者可访问或删除成员创建、上传的资料。',
  },
  '구성원은 기업 워크스페이스에서 생성하거나 업로드한 자료가 해당 기업의 관리 대상이 될 수 있음을 이해해야 합니다.': {
    en: 'Members must understand that materials they create or upload in an enterprise workspace may become subject to that company’s control.',
    ja: 'メンバーは、企業ワークスペースで作成またはアップロードした資料が当該企業の管理対象となり得ることを理解しなければなりません。',
    zh: '成员应理解其在企业工作区中创建或上传的资料可能成为该企业的管理对象。',
  },
  '퇴사자 또는 계약 종료자의 접근권한을 지체 없이 회수하는 것은 기업회원의 책임입니다.': {
    en: 'It is the business member’s responsibility to revoke, without delay, the access rights of departing employees or persons whose contracts have ended.',
    ja: '退職者または契約終了者のアクセス権限を遅滞なく回収することは、企業会員の責任です。',
    zh: '及时收回离职人员或合同终止人员的访问权限，是企业会员的责任。',
  },
  '워크스페이스 소유권 분쟁이 발생하면 회사는 객관적인 계약·결제·도메인·법인 증빙자료를 요구할 수 있습니다.': {
    en: 'If a dispute over workspace ownership arises, the Company may request objective evidence such as contracts, payment, domain, and corporate records.',
    ja: 'ワークスペースの所有権に関する紛争が生じた場合、当社は客観的な契約・決済・ドメイン・法人の証憑資料を求めることができます。',
    zh: '发生工作区所有权争议时，公司可要求提供合同、支付、域名、法人等客观证明资料。',
  },

  '제9조 서비스의 내용': { en: 'Article 9 Contents of the Service', ja: '第9条 サービスの内容', zh: '第9条 服务内容' },
  '회사는 다음 기능의 전부 또는 일부를 제공합니다.': {
    en: 'The Company provides all or part of the following features.',
    ja: '当社は、次の機能の全部または一部を提供します。',
    zh: '公司提供以下功能的全部或部分。',
  },
  '노드 기반 AI 영상 생성 및 편집': {
    en: 'Node-based AI video generation and editing',
    ja: 'ノードベースのAI映像生成および編集',
    zh: '基于节点的 AI 视频生成与编辑',
  },
  '이미지·텍스트·음성 기반 영상 생성': {
    en: 'Image-, text-, and voice-based video generation',
    ja: '画像・テキスト・音声ベースの映像生成',
    zh: '基于图像、文本、语音的视频生成',
  },
  'AI 숏폼 및 광고 소재 제작': {
    en: 'AI short-form and advertising creative production',
    ja: 'AIショートフォームおよび広告素材の制作',
    zh: 'AI 短视频及广告素材制作',
  },
  '템플릿, 워크플로 및 자동화 기능': {
    en: 'Templates, workflows, and automation features',
    ja: 'テンプレート、ワークフローおよび自動化機能',
    zh: '模板、工作流及自动化功能',
  },
  '랜딩페이지 및 신청폼 제작': {
    en: 'Landing page and application form creation',
    ja: 'ランディングページおよび申込フォームの作成',
    zh: '着陆页及申请表制作',
  },
  '리드·고객정보 수집 및 CRM 관리': {
    en: 'Lead and customer information collection and CRM management',
    ja: 'リード・顧客情報の収集およびCRM管理',
    zh: '线索、客户信息收集及 CRM 管理',
  },
  '이메일, SMS, LMS, MMS 및 카카오 비즈메시지 발송 연동': {
    en: 'Integration for sending email, SMS, LMS, MMS, and KakaoTalk Biz Message',
    ja: 'メール、SMS、LMS、MMSおよびカカオビズメッセージ送信の連携',
    zh: '电子邮件、SMS、LMS、MMS 及 Kakao 商务消息发送对接',
  },
  '캠페인 및 전환 성과 분석': {
    en: 'Campaign and conversion performance analysis',
    ja: 'キャンペーンおよびコンバージョン成果の分析',
    zh: '活动及转化绩效分析',
  },
  '팀 프로젝트, 댓글, 승인 및 권한관리': {
    en: 'Team projects, comments, approvals, and permission management',
    ja: 'チームプロジェクト、コメント、承認および権限管理',
    zh: '团队项目、评论、审批及权限管理',
  },
  '네이버 블로그 관련 공개 데이터 분석': {
    en: 'Analysis of public data related to Naver Blog',
    ja: 'Naverブログ関連の公開データ分析',
    zh: 'Naver 博客相关公开数据分析',
  },
  '네이버 플레이스 관련 공개 순위 추적 및 변화 분석': {
    en: 'Tracking of public rankings related to Naver Place and analysis of changes',
    ja: 'Naverプレイス関連の公開順位追跡および変動分析',
    zh: 'Naver Place 相关公开排名追踪及变化分析',
  },
  '외부 API, 소셜 계정 및 광고 플랫폼 연동': {
    en: 'Integration with external APIs, social accounts, and advertising platforms',
    ja: '外部API、ソーシャルアカウントおよび広告プラットフォームの連携',
    zh: '外部 API、社交账户及广告平台对接',
  },
  '크레딧 및 구독 관리': {
    en: 'Credit and subscription management',
    ja: 'クレジットおよびサブスクリプションの管理',
    zh: '积分及订阅管理',
  },
  '기타 회사가 추가하는 기능': {
    en: 'Other features added by the Company',
    ja: 'その他、当社が追加する機能',
    zh: '公司增设的其他功能',
  },
  '네이버 관련 분석 기능은 네이버 또는 그 계열사가 보증하거나 후원하는 서비스가 아니며, 회사는 네이버의 공식 정책·API·접근 제한을 준수합니다.': {
    en: 'The Naver-related analysis features are not services endorsed or sponsored by Naver or its affiliates, and the Company complies with Naver’s official policies, APIs, and access restrictions.',
    ja: 'Naver関連の分析機能は、Naverまたはその関係会社が保証または後援するサービスではなく、当社はNaverの公式ポリシー・API・アクセス制限を遵守します。',
    zh: 'Naver 相关分析功能并非由 Naver 或其关联公司担保或赞助的服务，公司遵守 Naver 的官方政策、API 及访问限制。',
  },

  '제10조 서비스 변경과 베타 기능': { en: 'Article 10 Service Changes and Beta Features', ja: '第10条 サービスの変更とベータ機能', zh: '第10条 服务变更与测试功能' },
  '회사는 기능을 추가, 개선, 변경 또는 종료할 수 있습니다.': {
    en: 'The Company may add, improve, change, or discontinue features.',
    ja: '当社は、機能を追加、改善、変更または終了することができます。',
    zh: '公司可增加、改进、变更或终止功能。',
  },
  '회원의 유료 이용에 중대한 영향을 주는 기능 종료는 합리적인 기간 전에 알립니다.': {
    en: 'Discontinuation of features that materially affect members’ paid use is announced a reasonable period in advance.',
    ja: '会員の有料利用に重大な影響を与える機能の終了は、合理的な期間前に通知します。',
    zh: '对会员付费使用有重大影响的功能终止，将在合理期间前予以通知。',
  },
  '베타, 미리보기 또는 실험 기능은 오류가 있거나 예고 없이 변경될 수 있습니다.': {
    en: 'Beta, preview, or experimental features may contain errors or change without notice.',
    ja: 'ベータ、プレビューまたは実験的機能には、不具合があり、または予告なく変更される場合があります。',
    zh: '测试版、预览版或实验性功能可能存在错误或在无预告的情况下变更。',
  },
  '회사는 베타 기능을 중요한 의사결정이나 유일한 업무 수단으로 사용하지 말 것을 권고합니다.': {
    en: 'The Company recommends that beta features not be used for important decisions or as the sole means of conducting business.',
    ja: '当社は、ベータ機能を重要な意思決定または唯一の業務手段として使用しないことを推奨します。',
    zh: '公司建议不要将测试功能用于重要决策或作为唯一的业务手段。',
  },
  '유료 핵심 기능이 중대한 기간 동안 제공되지 않은 경우 회사는 적용 법률과 환불정책에 따라 이용기간 연장, 크레딧 복구 또는 환불을 제공합니다.': {
    en: 'Where a paid core feature is unavailable for a significant period, the Company provides an extension of the usage period, restoration of credits, or a refund in accordance with applicable law and the refund policy.',
    ja: '有料の中核機能が重大な期間にわたり提供されなかった場合、当社は適用法令および返金方針に従い、利用期間の延長、クレジットの復旧または返金を提供します。',
    zh: '如付费核心功能在相当长的期间内未能提供，公司将依适用法律及退款政策提供使用期限延长、积分恢复或退款。',
  },

  '제11조 AI 서비스의 특성': { en: 'Article 11 Characteristics of the AI Service', ja: '第11条 AIサービスの特性', zh: '第11条 AI 服务的特性' },
  'AI 생성물은 확률적 방법으로 만들어지며, 동일한 입력에도 다른 결과가 생성될 수 있습니다.': {
    en: 'AI output is produced by probabilistic methods, and different results may be generated even from the same input.',
    ja: 'AI生成物は確率的な方法で生成され、同一の入力であっても異なる結果が生成される場合があります。',
    zh: 'AI 生成内容以概率方法产生，即使输入相同也可能生成不同结果。',
  },
  '생성물은 사실과 다르거나 부정확하거나 불완전할 수 있습니다.': {
    en: 'Output may be untrue, inaccurate, or incomplete.',
    ja: '生成物は、事実と異なり、不正確または不完全である場合があります。',
    zh: '生成内容可能与事实不符、不准确或不完整。',
  },
  '생성물이 기존 콘텐츠와 유사하게 만들어질 가능성을 완전히 배제할 수 없습니다.': {
    en: 'The possibility that output may be created similar to existing content cannot be entirely ruled out.',
    ja: '生成物が既存のコンテンツと類似して生成される可能性を完全に排除することはできません。',
    zh: '无法完全排除生成内容与现有内容相似的可能性。',
  },
  '회사는 생성물의 독창성, 특정 목적 적합성, 법적 이용 가능성, 상업적 성공, 광고 성과 또는 제3자의 권리를 침해하지 않는다는 점을 보증하지 않습니다.': {
    en: 'The Company does not warrant the originality of output, its fitness for a particular purpose, its legal usability, commercial success, advertising performance, or that it does not infringe third-party rights.',
    ja: '当社は、生成物の独創性、特定目的への適合性、法的な利用可能性、商業的成功、広告成果、または第三者の権利を侵害しないことを保証しません。',
    zh: '公司不保证生成内容的独创性、特定用途适用性、合法可用性、商业成功、广告效果，也不保证不侵犯第三方权利。',
  },
  '회원은 생성물을 공개·배포·광고·판매하기 전에 사실관계, 품질, 저작권, 초상권, 퍼블리시티권, 상표권, 음원 권리 및 표시의무를 직접 검토해야 합니다.': {
    en: 'Before publishing, distributing, advertising, or selling output, members must themselves review the facts, quality, copyright, portrait rights, rights of publicity, trademark rights, music rights, and labeling obligations.',
    ja: '会員は、生成物を公開・配布・広告・販売する前に、事実関係、品質、著作権、肖像権、パブリシティ権、商標権、音源の権利および表示義務を自ら検討しなければなりません。',
    zh: '会员在公开、传播、宣传或销售生成内容前，须自行审查事实、质量、著作权、肖像权、公开权、商标权、音源权利及标示义务。',
  },
  '의료, 법률, 금융, 채용, 보험, 신용, 교육입학 또는 공공서비스 제공에 영향을 미치는 중요한 판단을 AI 생성물만으로 내려서는 안 됩니다.': {
    en: 'Important decisions affecting the provision of medical, legal, financial, hiring, insurance, credit, educational admission, or public services must not be made on the basis of AI output alone.',
    ja: '医療、法律、金融、採用、保険、信用、教育の入学または公共サービスの提供に影響を与える重要な判断を、AI生成物のみで下してはなりません。',
    zh: '不得仅凭 AI 生成内容作出影响医疗、法律、金融、招聘、保险、信用、教育录取或公共服务提供的重要判断。',
  },
  '회사는 안전, 권리보호 및 법령 준수를 위해 입력물 또는 생성물을 자동 또는 수동 방식으로 검사할 수 있습니다.': {
    en: 'The Company may inspect inputs or outputs by automated or manual means for safety, rights protection, and legal compliance.',
    ja: '当社は、安全、権利保護および法令遵守のため、入力物または生成物を自動または手動の方法で検査することができます。',
    zh: '公司为安全、权利保护及合规，可通过自动或人工方式检查输入内容或生成内容。',
  },

  '제12조 AI 이용 고지와 생성물 표시': { en: 'Article 12 AI Use Notice and Output Labeling', ja: '第12条 AI利用の告知と生成物の表示', zh: '第12条 AI 使用告知与生成内容标示' },
  '회사는 서비스가 생성형 AI를 이용한다는 사실을 이용자가 알 수 있도록 표시합니다.': {
    en: 'The Company indicates, so that users can be aware, that the service uses generative AI.',
    ja: '当社は、サービスが生成AIを利用している事実を利用者が認識できるように表示します。',
    zh: '公司予以标示，使用户知晓服务使用生成式 AI。',
  },
  '회사는 관련 법률과 기술 표준에 따라 생성물에 사람이 인식할 수 있는 표시 또는 기계 판독 가능한 메타데이터·워터마크를 적용할 수 있습니다.': {
    en: 'In accordance with applicable law and technical standards, the Company may apply human-perceptible labels or machine-readable metadata or watermarks to output.',
    ja: '当社は、関連法令および技術標準に従い、生成物に人が認識できる表示または機械可読のメタデータ・ウォーターマークを適用することができます。',
    zh: '公司可依相关法律及技术标准，对生成内容施加人可识别的标示或机器可读的元数据、水印。',
  },
  '회원은 AI로 생성되거나 실제처럼 조작된 영상, 이미지 또는 음성을 공개할 때 적용 법률에 따른 “AI 생성”, “AI로 조작됨” 또는 이에 준하는 표시를 해야 합니다.': {
    en: 'When publishing videos, images, or audio that are AI-generated or manipulated to appear real, members must apply a label such as “AI-generated,” “manipulated by AI,” or an equivalent, as required by applicable law.',
    ja: '会員は、AIで生成され、または実際のように加工された映像、画像または音声を公開する際、適用法令に従い「AI生成」「AIにより加工」またはこれに準ずる表示を行わなければなりません。',
    zh: '会员在公开由 AI 生成或经处理使其看似真实的视频、图像或音频时，须依适用法律作出“AI 生成”“经 AI 处理”或与之相当的标示。',
  },
  '실제 인물의 얼굴, 음성 또는 행동을 합성한 콘텐츠는 시청자가 인공지능으로 생성·조작된 사실을 명확히 알 수 있도록 표시해야 합니다.': {
    en: 'Content that synthesizes a real person’s face, voice, or actions must be labeled so that viewers can clearly recognize that it was AI-generated or manipulated.',
    ja: '実在の人物の顔、音声または行動を合成したコンテンツは、視聴者が人工知能により生成・加工された事実を明確に認識できるように表示しなければなりません。',
    zh: '合成真实人物面部、声音或行为的内容，须予以标示，使观看者能够清楚知晓其为人工智能生成或处理。',
  },
  '풍자, 예술 또는 창작물이라도 이용자가 실제 사실로 오인할 위험이 있는 경우 적절한 표시를 해야 합니다.': {
    en: 'Even for satire, art, or creative works, appropriate labeling must be applied where there is a risk that users may mistake them for actual facts.',
    ja: '風刺、芸術または創作物であっても、利用者が実際の事実と誤認するおそれがある場合には、適切な表示を行わなければなりません。',
    zh: '即使是讽刺、艺术或创作作品，如存在使用户误认为真实事实的风险，也须作出适当标示。',
  },
  '회원은 워터마크, 출처정보, 안전표시 또는 기계 판독 가능한 출처정보를 제거하거나 훼손해서는 안 됩니다. 다만, 법률 또는 회사가 명시적으로 허용한 경우는 제외합니다.': {
    en: 'Members must not remove or damage watermarks, provenance information, safety labels, or machine-readable provenance information, except where expressly permitted by law or by the Company.',
    ja: '会員は、ウォーターマーク、出所情報、安全表示または機械可読の出所情報を除去または毀損してはなりません。ただし、法律または当社が明示的に許可した場合を除きます。',
    zh: '会员不得移除或损毁水印、来源信息、安全标示或机器可读的来源信息；但法律或公司明确许可的情形除外。',
  },

  '제13조 입력물의 권리': { en: 'Article 13 Rights in Inputs', ja: '第13条 入力物の権利', zh: '第13条 输入内容的权利' },
  '회원은 자신이 보유한 입력물에 관한 권리를 유지합니다.': {
    en: 'Members retain the rights in the inputs they hold.',
    ja: '会員は、自らが保有する入力物に関する権利を保持します。',
    zh: '会员保留其所持有的输入内容的权利。',
  },
  '회원은 입력물을 서비스에 제공할 권한과 적법한 처리 근거가 있음을 보증합니다.': {
    en: 'Members warrant that they have the authority to provide the inputs to the service and a lawful basis for processing.',
    ja: '会員は、入力物をサービスに提供する権限および適法な処理の根拠を有することを保証します。',
    zh: '会员保证其有权向服务提供输入内容并具有合法的处理依据。',
  },
  '회원은 입력물에 포함된 인물의 얼굴, 음성, 개인정보, 저작물, 상표, 음악 및 기타 권리에 대해 필요한 허가를 확보해야 합니다.': {
    en: 'Members must obtain the necessary permissions for the faces, voices, personal information, copyrighted works, trademarks, music, and other rights of persons included in the inputs.',
    ja: '会員は、入力物に含まれる人物の顔、音声、個人情報、著作物、商標、音楽およびその他の権利について、必要な許可を確保しなければなりません。',
    zh: '会员须就输入内容中所含人物的面部、声音、个人信息、作品、商标、音乐及其他权利取得必要许可。',
  },
  '회원은 미성년자의 얼굴·음성·개인정보를 포함한 콘텐츠를 처리할 경우 보호자의 유효한 동의와 현지 법률상 요건을 충족해야 합니다.': {
    en: 'Where members process content containing a minor’s face, voice, or personal information, they must satisfy the valid consent of a guardian and the requirements under local law.',
    ja: '会員は、未成年者の顔・音声・個人情報を含むコンテンツを処理する場合、保護者の有効な同意および現地法令上の要件を満たさなければなりません。',
    zh: '会员处理含有未成年人面部、声音、个人信息的内容时，须满足监护人的有效同意及当地法律的要求。',
  },
  '회사는 서비스 제공, 생성 요청 처리, 저장, 백업, 보안, 오류 수정 및 법적 의무 이행에 필요한 범위에서만 입력물을 이용할 수 있는 제한적 권한을 부여받습니다.': {
    en: 'The Company is granted a limited right to use inputs only to the extent necessary for providing the service, processing generation requests, storage, backup, security, error correction, and fulfilling legal obligations.',
    ja: '当社は、サービスの提供、生成リクエストの処理、保存、バックアップ、セキュリティ、エラー修正および法的義務の履行に必要な範囲でのみ入力物を利用できる限定的な権限を付与されます。',
    zh: '公司仅在提供服务、处理生成请求、存储、备份、安全、纠错及履行法律义务所必需的范围内，获得使用输入内容的有限权限。',
  },
  '회사는 회원의 별도 선택 동의가 없는 한 입력물과 생성물을 범용 AI 모델 학습 목적으로 사용하지 않습니다.': {
    en: 'Unless the member gives separate opt-in consent, the Company does not use inputs and outputs for the purpose of training general-purpose AI models.',
    ja: '当社は、会員の別途のオプトイン同意がない限り、入力物および生成物を汎用AIモデルの学習目的で使用しません。',
    zh: '除非会员另行选择同意，公司不将输入内容与生成内容用于通用 AI 模型的训练目的。',
  },
  '고객 데이터는 어떠한 경우에도 회사의 범용 AI 모델 학습이나 광고 타기팅에 사용하지 않습니다.': {
    en: 'Customer data is not used, in any case, for training the Company’s general-purpose AI models or for advertising targeting.',
    ja: '顧客データは、いかなる場合であっても、当社の汎用AIモデルの学習または広告ターゲティングに使用しません。',
    zh: '客户数据在任何情况下均不用于公司通用 AI 模型的训练或广告定向。',
  },

  '제14조 생성물의 권리': { en: 'Article 14 Rights in Outputs', ja: '第14条 生成物の権利', zh: '第14条 生成内容的权利' },
  '관련 법률과 외부 AI 사업자의 조건이 허용하는 범위에서 회사는 회원이 적법하게 생성한 생성물에 대해 소유권을 주장하지 않습니다.': {
    en: 'To the extent permitted by applicable law and the terms of external AI providers, the Company does not claim ownership of output lawfully generated by members.',
    ja: '関連法令および外部AI事業者の条件が許容する範囲において、当社は会員が適法に生成した生成物について所有権を主張しません。',
    zh: '在相关法律及外部 AI 服务商条件允许的范围内，公司不对会员合法生成的生成内容主张所有权。',
  },
  '생성물에 저작권 또는 독점권이 성립하는지 여부는 국가, 생성 방식 및 사람의 창작적 기여도에 따라 달라질 수 있습니다.': {
    en: 'Whether copyright or exclusive rights arise in output may vary depending on the country, the method of generation, and the degree of human creative contribution.',
    ja: '生成物に著作権または独占権が成立するか否かは、国、生成方式および人の創作的寄与度により異なる場合があります。',
    zh: '生成内容是否成立著作权或专有权，可能因国家、生成方式及人的创作性贡献程度而有所不同。',
  },
  '회사는 동일하거나 유사한 생성물이 다른 회원에게 생성되지 않는다는 독점성을 보장하지 않습니다.': {
    en: 'The Company does not guarantee exclusivity such that identical or similar output will not be generated for other members.',
    ja: '当社は、同一または類似の生成物が他の会員に生成されないという独占性を保証しません。',
    zh: '公司不保证不会为其他会员生成相同或相似的生成内容的专有性。',
  },
  '회원은 생성물을 상업적으로 이용하기 전에 요금제별 이용범위와 외부 모델·음원·템플릿의 라이선스를 확인해야 합니다.': {
    en: 'Before using output commercially, members must check the scope of use for each plan and the licenses of external models, music sources, and templates.',
    ja: '会員は、生成物を商業的に利用する前に、料金プランごとの利用範囲および外部モデル・音源・テンプレートのライセンスを確認しなければなりません。',
    zh: '会员在商业使用生成内容前，须确认各套餐的使用范围及外部模型、音源、模板的许可。',
  },
  '무료 또는 체험 요금제의 생성물에는 워터마크, 해상도, 상업적 이용 또는 다운로드 제한이 적용될 수 있으며 해당 제한은 결제 전에 표시합니다.': {
    en: 'Output on free or trial plans may be subject to watermarks and restrictions on resolution, commercial use, or downloading, and such restrictions are displayed before payment.',
    ja: '無料または体験料金プランの生成物には、ウォーターマーク、解像度、商業利用またはダウンロードの制限が適用される場合があり、当該制限は決済前に表示します。',
    zh: '免费或体验套餐的生成内容可能受水印、分辨率、商业使用或下载限制，且该等限制在付款前予以显示。',
  },

  '제15조 금지되는 콘텐츠와 행위': { en: 'Article 15 Prohibited Content and Conduct', ja: '第15条 禁止されるコンテンツおよび行為', zh: '第15条 禁止的内容与行为' },
  '회원은 서비스를 이용하여 다음 행위를 해서는 안 됩니다.': {
    en: 'Members must not use the service to engage in the following conduct.',
    ja: '会員は、サービスを利用して次の行為を行ってはなりません。',
    zh: '会员不得利用服务从事下列行为。',
  },
  '법령을 위반하거나 범죄를 조장하는 행위': {
    en: 'Conduct that violates the law or promotes crime',
    ja: '法令に違反し、または犯罪を助長する行為',
    zh: '违反法令或助长犯罪的行为',
  },
  '아동·청소년 성착취물 또는 미성년자를 성적으로 묘사하는 콘텐츠': {
    en: 'Child or youth sexual exploitation material or content that sexually depicts minors',
    ja: '児童・青少年の性搾取物または未成年者を性的に描写するコンテンツ',
    zh: '儿童、青少年性剥削物或对未成年人进行性描绘的内容',
  },
  '동의 없는 성적 합성물, 불법 촬영물 또는 성적 괴롭힘': {
    en: 'Non-consensual sexual synthetic material, illegal filming, or sexual harassment',
    ja: '同意のない性的合成物、違法撮影物または性的嫌がらせ',
    zh: '未经同意的性合成物、非法拍摄物或性骚扰',
  },
  '인물의 동의나 적법한 근거 없이 얼굴 또는 음성을 복제하여 사칭·기망하는 행위': {
    en: 'Impersonating or deceiving by replicating a person’s face or voice without their consent or a lawful basis',
    ja: '人物の同意または適法な根拠なく顔または音声を複製してなりすまし・欺罔する行為',
    zh: '未经人物同意或无合法依据复制其面部或声音进行冒充、欺骗的行为',
  },
  '사기, 피싱, 투자사기, 신분도용 또는 허위 추천 콘텐츠': {
    en: 'Fraud, phishing, investment scams, identity theft, or false endorsement content',
    ja: '詐欺、フィッシング、投資詐欺、身元盗用または虚偽の推薦コンテンツ',
    zh: '欺诈、钓鱼、投资诈骗、身份盗用或虚假推荐内容',
  },
  '선거 방해, 유권자 기망 또는 공공기관 사칭': {
    en: 'Election interference, deception of voters, or impersonation of public institutions',
    ja: '選挙妨害、有権者の欺罔または公的機関のなりすまし',
    zh: '妨害选举、欺骗选民或冒充公共机构',
  },
  '실제 인물이 하지 않은 발언이나 행동을 한 것처럼 오인시키는 콘텐츠를 표시 없이 공개하는 행위': {
    en: 'Publishing, without a label, content that misleads people into believing a real person made statements or took actions they did not',
    ja: '実在の人物が行っていない発言や行動を行ったかのように誤認させるコンテンツを、表示なく公開する行為',
    zh: '未加标示地公开使人误认为真实人物作出其未曾作出的言论或行为的内容',
  },
  '폭력, 테러, 자살 또는 심각한 위해를 구체적으로 조장하는 행위': {
    en: 'Conduct that specifically promotes violence, terrorism, suicide, or serious harm',
    ja: '暴力、テロ、自殺または深刻な危害を具体的に助長する行為',
    zh: '具体助长暴力、恐怖主义、自杀或严重危害的行为',
  },
  '명예훼손, 협박, 스토킹, 괴롭힘 또는 차별': {
    en: 'Defamation, threats, stalking, harassment, or discrimination',
    ja: '名誉毀損、脅迫、ストーキング、嫌がらせまたは差別',
    zh: '诽谤、恐吓、跟踪、骚扰或歧视',
  },
  '타인의 저작권, 상표권, 초상권, 퍼블리시티권, 영업비밀 또는 개인정보 침해': {
    en: 'Infringement of another person’s copyright, trademark rights, portrait rights, rights of publicity, trade secrets, or personal information',
    ja: '他人の著作権、商標権、肖像権、パブリシティ権、営業秘密または個人情報の侵害',
    zh: '侵犯他人的著作权、商标权、肖像权、公开权、商业秘密或个人信息',
  },
  '의료인, 전문가, 공공기관 또는 유명인이 제품을 보증한 것처럼 허위로 합성하는 행위': {
    en: 'Falsely synthesizing content to make it appear that a medical professional, expert, public institution, or celebrity has endorsed a product',
    ja: '医療従事者、専門家、公的機関または著名人が製品を保証したかのように虚偽に合成する行為',
    zh: '虚假合成使医疗人员、专家、公共机构或名人看似为产品背书的行为',
  },
  '스팸, 불법 광고, 무단 전화권유 또는 수신거부 회피': {
    en: 'Spam, illegal advertising, unauthorized telemarketing, or circumvention of opt-outs',
    ja: 'スパム、違法広告、無断の電話勧誘または受信拒否の回避',
    zh: '垃圾信息、非法广告、未经授权的电话推销或规避拒收',
  },
  '구매·임대·스크래핑·자동생성한 연락처로 메시지를 발송하는 행위': {
    en: 'Sending messages to contacts that were purchased, leased, scraped, or automatically generated',
    ja: '購入・賃貸・スクレイピング・自動生成した連絡先にメッセージを送信する行為',
    zh: '向购买、租用、抓取或自动生成的联系人发送消息的行为',
  },
  '악성코드, 랜섬웨어, 계정탈취 또는 보안 공격': {
    en: 'Malware, ransomware, account takeover, or security attacks',
    ja: 'マルウェア、ランサムウェア、アカウント乗っ取りまたはセキュリティ攻撃',
    zh: '恶意代码、勒索软件、账户劫持或安全攻击',
  },
  '서비스의 안전장치, 사용량 제한, 워터마크 또는 접근통제를 우회하는 행위': {
    en: 'Circumventing the service’s safeguards, usage limits, watermarks, or access controls',
    ja: 'サービスの安全装置、使用量制限、ウォーターマークまたはアクセス制御を回避する行為',
    zh: '规避服务的安全装置、用量限制、水印或访问控制的行为',
  },
  '모델 또는 시스템을 역설계하거나 무단으로 데이터를 대량 추출하는 행위': {
    en: 'Reverse-engineering the models or systems or extracting data in bulk without authorization',
    ja: 'モデルまたはシステムをリバースエンジニアリングし、または無断でデータを大量に抽出する行為',
    zh: '对模型或系统进行逆向工程或未经授权大量提取数据的行为',
  },
  '서비스에 과도한 부하를 발생시키는 자동화 요청': {
    en: 'Automated requests that impose an excessive load on the service',
    ja: 'サービスに過度の負荷を発生させる自動化リクエスト',
    zh: '对服务造成过度负载的自动化请求',
  },
  '차별적 채용·신용·주택·보험·교육 판단을 자동화하는 행위': {
    en: 'Automating discriminatory decisions in hiring, credit, housing, insurance, or education',
    ja: '差別的な採用・信用・住宅・保険・教育の判断を自動化する行為',
    zh: '将招聘、信用、住房、保险、教育方面的歧视性判断自动化的行为',
  },
  '불법 생체인식, 대규모 감시 또는 개인 추적': {
    en: 'Illegal biometric identification, mass surveillance, or tracking of individuals',
    ja: '違法な生体認証、大規模な監視または個人の追跡',
    zh: '非法生物识别、大规模监控或对个人的追踪',
  },
  '회사가 공개한 추가 안전정책을 위반하는 행위': {
    en: 'Conduct that violates additional safety policies published by the Company',
    ja: '当社が公開した追加の安全ポリシーに違反する行為',
    zh: '违反公司公布的其他安全政策的行为',
  },

  '제16조 콘텐츠 검토와 조치': { en: 'Article 16 Content Review and Measures', ja: '第16条 コンテンツの検討と措置', zh: '第16条 内容审查与处置' },
  '회사는 모든 콘텐츠를 사전에 검토할 의무를 부담하지 않습니다.': {
    en: 'The Company is under no obligation to review all content in advance.',
    ja: '当社は、すべてのコンテンツを事前に検討する義務を負いません。',
    zh: '公司不承担事先审查所有内容的义务。',
  },
  '회사는 위법 또는 약관 위반이 의심되는 입력물·생성물을 차단, 삭제, 격리 또는 검토할 수 있습니다.': {
    en: 'The Company may block, delete, quarantine, or review inputs or outputs suspected of being unlawful or in breach of the Terms.',
    ja: '当社は、違法または規約違反が疑われる入力物・生成物を遮断、削除、隔離または検討することができます。',
    zh: '公司可对涉嫌违法或违反条款的输入内容、生成内容进行拦截、删除、隔离或审查。',
  },
  '급박한 피해를 막기 위해 필요한 경우 사전 통지 없이 조치할 수 있습니다.': {
    en: 'Where necessary to prevent imminent harm, the Company may take measures without prior notice.',
    ja: '差し迫った被害を防ぐために必要な場合、事前の通知なく措置することができます。',
    zh: '为防止紧迫损害而有必要时，可在无事先通知的情况下采取处置。',
  },
  '회사는 가능한 경우 회원에게 조치 사유와 이의제기 방법을 알립니다.': {
    en: 'Where possible, the Company informs the member of the reason for the measure and how to object.',
    ja: '当社は、可能な場合、会員に措置の理由および異議申立ての方法を通知します。',
    zh: '在可能的情况下，公司告知会员处置理由及提出异议的方法。',
  },
  '회사는 법령에 따라 수사기관, 법원 또는 규제기관의 적법한 요청에 협조할 수 있습니다.': {
    en: 'The Company may cooperate with lawful requests from investigative agencies, courts, or regulators in accordance with the law.',
    ja: '当社は、法令に従い、捜査機関、裁判所または規制機関の適法な要請に協力することができます。',
    zh: '公司可依法配合侦查机关、法院或监管机关的合法请求。',
  },
  '회원은 권리침해 신고에 필요한 정보를 성실히 제출해야 합니다.': {
    en: 'Members must faithfully submit the information necessary for reporting rights infringement.',
    ja: '会員は、権利侵害の申告に必要な情報を誠実に提出しなければなりません。',
    zh: '会员须诚实提交侵权举报所需的信息。',
  },

  '제17조 CRM 및 랜딩페이지 서비스의 역할': { en: 'Article 17 Roles in CRM and Landing Page Services', ja: '第17条 CRMおよびランディングページサービスの役割', zh: '第17条 CRM 及着陆页服务的角色' },
  '회원이 랜딩페이지와 CRM을 통해 고객 데이터를 수집·이용하는 경우 회원은 원칙적으로 개인정보처리자 또는 데이터 컨트롤러이고, 회사는 회원의 지시에 따라 처리하는 수탁자 또는 프로세서입니다.': {
    en: 'Where a member collects and uses customer data through landing pages and CRM, the member is, in principle, the personal information controller or data controller, and the Company is the processor that processes on the member’s instructions.',
    ja: '会員がランディングページおよびCRMを通じて顧客データを収集・利用する場合、会員は原則として個人情報取扱者またはデータコントローラーであり、当社は会員の指示に従って処理する受託者またはプロセッサーです。',
    zh: '会员通过着陆页与 CRM 收集、使用客户数据时，会员原则上为个人信息处理者或数据控制者，公司为依会员指示处理的受托者或处理者。',
  },
  '회원은 고객 데이터 처리의 목적, 법적 근거, 동의문구, 보유기간 및 정보주체 권리 대응에 책임을 집니다.': {
    en: 'Members are responsible for the purpose, legal basis, consent wording, retention period, and handling of data subject rights for the processing of customer data.',
    ja: '会員は、顧客データ処理の目的、法的根拠、同意文言、保有期間および情報主体の権利対応に責任を負います。',
    zh: '会员对客户数据处理的目的、法律依据、同意文案、保存期限及信息主体权利应对负责。',
  },
  '회사가 제공하는 동의문구나 템플릿은 일반적 작성 편의를 위한 것이며 회원의 업종과 국가에 대한 법률자문이 아닙니다.': {
    en: 'Any consent wording or templates provided by the Company are for general drafting convenience and do not constitute legal advice for the member’s industry or country.',
    ja: '当社が提供する同意文言やテンプレートは、一般的な作成の便宜のためのものであり、会員の業種および国に対する法的助言ではありません。',
    zh: '公司提供的同意文案或模板仅为一般拟稿便利之用，并非针对会员所处行业与国家的法律意见。',
  },
  '회원은 자신의 상호, 연락처 및 개인정보처리방침을 랜딩페이지에 명확히 표시해야 합니다.': {
    en: 'Members must clearly display their company name, contact information, and privacy policy on their landing pages.',
    ja: '会員は、自身の商号、連絡先および個人情報処理方針をランディングページに明確に表示しなければなりません。',
    zh: '会员须在着陆页明确标示自身的商号、联系方式及隐私政策。',
  },
  '회사는 회원을 대신하여 고객 데이터의 적법성을 판단하거나 동의를 자동으로 유효하게 만들어 주지 않습니다.': {
    en: 'The Company does not, on the member’s behalf, determine the lawfulness of customer data or automatically render consent valid.',
    ja: '当社は、会員に代わって顧客データの適法性を判断し、または同意を自動的に有効にすることはありません。',
    zh: '公司不代会员判断客户数据的合法性，也不会自动使同意生效。',
  },

  '제18조 광고성 정보 발송': { en: 'Article 18 Sending Advertising Information', ja: '第18条 広告性情報の送信', zh: '第18条 广告性信息发送' },
  '회원은 광고성 정보를 보내기 전에 수신자의 유효한 동의를 확보해야 합니다.': {
    en: 'Before sending advertising information, members must obtain the recipient’s valid consent.',
    ja: '会員は、広告性情報を送信する前に、受信者の有効な同意を確保しなければなりません。',
    zh: '会员在发送广告性信息前，须取得接收人的有效同意。',
  },
  '회원은 수신동의를 입증할 수 있는 원문, 일시, IP, 채널, 발송주체 및 철회이력을 보관해야 합니다.': {
    en: 'Members must retain the original text, date and time, IP, channel, sending party, and withdrawal history that can prove consent to receive.',
    ja: '会員は、受信同意を立証できる原文、日時、IP、チャネル、送信主体および撤回履歴を保管しなければなりません。',
    zh: '会员须保存能够证明接收同意的原文、时间、IP、渠道、发送主体及撤回记录。',
  },
  '회원은 수신거부, 동의 철회 및 DNC 등록 여부를 발송 전에 확인해야 합니다.': {
    en: 'Members must check for opt-outs, withdrawals of consent, and DNC registration before sending.',
    ja: '会員は、受信拒否、同意の撤回およびDNC登録の有無を送信前に確認しなければなりません。',
    zh: '会员须在发送前确认拒收、同意撤回及 DNC 登记情况。',
  },
  '회원은 발신자의 정확한 명칭과 연락처, 광고 표시 및 무료 수신거부 방법을 메시지에 포함해야 합니다.': {
    en: 'Members must include in the message the sender’s exact name and contact details, an advertising label, and a free opt-out method.',
    ja: '会員は、送信者の正確な名称と連絡先、広告表示および無料の受信拒否方法をメッセージに含めなければなりません。',
    zh: '会员须在消息中包含发送者的准确名称与联系方式、广告标示及免费拒收方式。',
  },
  '대한민국 수신자에게 야간 광고를 발송하는 경우 별도의 야간 광고 수신동의를 확보해야 합니다.': {
    en: 'When sending nighttime advertisements to recipients in the Republic of Korea, members must obtain separate consent to receive nighttime advertisements.',
    ja: '大韓民国の受信者に夜間広告を送信する場合、別途の夜間広告受信同意を確保しなければなりません。',
    zh: '向大韩民国接收人发送夜间广告时，须另行取得夜间广告接收同意。',
  },
  '회원은 대한민국 광고 수신동의 여부를 법령상 주기에 따라 확인해야 합니다.': {
    en: 'Members must confirm consent to receive advertisements in the Republic of Korea at the intervals required by law.',
    ja: '会員は、大韓民国の広告受信同意の有無を法令上の周期に従って確認しなければなりません。',
    zh: '会员须按法令规定的周期确认大韩民国的广告接收同意情况。',
  },
  '캐나다 수신자에게 상업적 전자메시지를 보내는 경우 적용 법률상 동의, 발신자 정보 및 수신거부 요건을 충족해야 합니다.': {
    en: 'When sending commercial electronic messages to recipients in Canada, members must satisfy the consent, sender information, and opt-out requirements under applicable law.',
    ja: 'カナダの受信者に商業的電子メッセージを送信する場合、適用法令上の同意、送信者情報および受信拒否の要件を満たさなければなりません。',
    zh: '向加拿大接收人发送商业电子信息时，须满足适用法律的同意、发送者信息及拒收要求。',
  },
  '호주 수신자에게 상업적 메시지를 보내는 경우 동의 증빙을 보유하고 발신자 정보와 유효한 수신거부 방법을 제공해야 합니다.': {
    en: 'When sending commercial messages to recipients in Australia, members must hold proof of consent and provide sender information and a valid opt-out method.',
    ja: 'オーストラリアの受信者に商業的メッセージを送信する場合、同意の証跡を保有し、送信者情報および有効な受信拒否方法を提供しなければなりません。',
    zh: '向澳大利亚接收人发送商业信息时，须保有同意证明并提供发送者信息及有效的拒收方式。',
  },
  '싱가포르 전화번호에 마케팅 메시지를 보내는 경우 유효한 동의가 없는 한 DNC 등록부 확인 등 현지 요건을 준수해야 합니다.': {
    en: 'When sending marketing messages to Singapore phone numbers, members must comply with local requirements such as checking the DNC registry unless valid consent exists.',
    ja: 'シンガポールの電話番号にマーケティングメッセージを送信する場合、有効な同意がない限り、DNC登録簿の確認など現地の要件を遵守しなければなりません。',
    zh: '向新加坡电话号码发送营销信息时，除非存在有效同意，否则须遵守查询 DNC 登记簿等当地要求。',
  },
  '미국 수신자에게 자동 문자·전화 마케팅을 보내는 경우 필요한 서면동의, 발송자별 동의 및 합리적인 방식의 철회 요청을 처리해야 합니다.': {
    en: 'When sending automated text or call marketing to recipients in the United States, members must handle the required written consent, per-sender consent, and reasonable withdrawal requests.',
    ja: '米国の受信者に自動SMS・電話マーケティングを送信する場合、必要な書面同意、送信者ごとの同意および合理的な方法による撤回請求を処理しなければなりません。',
    zh: '向美国接收人发送自动短信、电话营销时，须处理必要的书面同意、按发送者的同意及以合理方式提出的撤回请求。',
  },
  '회사는 수신거부 키워드, 차단목록, 발송한도, 발신번호 인증 및 사전검수 기능을 적용할 수 있습니다.': {
    en: 'The Company may apply opt-out keywords, block lists, sending limits, sender-number verification, and pre-screening features.',
    ja: '当社は、受信拒否キーワード、ブロックリスト、送信上限、発信番号認証および事前審査機能を適用することができます。',
    zh: '公司可适用拒收关键词、屏蔽名单、发送限额、发送号码认证及事前审核功能。',
  },
  '회사는 위법 발송이 의심되면 발송을 중단하고 회원에게 동의 증빙을 요구할 수 있습니다.': {
    en: 'Where illegal sending is suspected, the Company may halt sending and require the member to provide proof of consent.',
    ja: '当社は、違法な送信が疑われる場合、送信を中止し、会員に同意の証跡を求めることができます。',
    zh: '如怀疑存在违法发送，公司可中止发送并要求会员提供同意证明。',
  },

  '제19조 알림톡과 정보성 메시지': { en: 'Article 19 Alimtalk and Informational Messages', ja: '第19条 アラームトークと情報性メッセージ', zh: '第19条 通知消息与信息性消息' },
  '알림톡은 주문, 결제, 배송, 예약, 계약, 보안, 계정 및 서비스 이용에 필요한 정보성 메시지에 사용해야 합니다.': {
    en: 'Alimtalk must be used for informational messages necessary for orders, payments, delivery, reservations, contracts, security, accounts, and service use.',
    ja: 'アラームトークは、注文、決済、配送、予約、契約、セキュリティ、アカウントおよびサービス利用に必要な情報性メッセージに使用しなければなりません。',
    zh: '通知消息须用于订单、支付、配送、预约、合同、安全、账户及服务使用所需的信息性消息。',
  },
  '쿠폰, 할인, 이벤트, 구매 권유 또는 서비스 홍보가 포함되면 광고성 정보로 분류될 수 있습니다.': {
    en: 'If a message includes coupons, discounts, events, purchase solicitations, or service promotion, it may be classified as advertising information.',
    ja: 'クーポン、割引、イベント、購入勧誘またはサービス宣伝が含まれる場合、広告性情報に分類される場合があります。',
    zh: '如包含优惠券、折扣、活动、购买招揽或服务宣传，可能被归类为广告性信息。',
  },
  '회원은 광고성 메시지를 정보성 메시지로 위장해서는 안 됩니다.': {
    en: 'Members must not disguise advertising messages as informational messages.',
    ja: '会員は、広告性メッセージを情報性メッセージに偽装してはなりません。',
    zh: '会员不得将广告性消息伪装成信息性消息。',
  },
  '회사 또는 메시지 제공자는 템플릿을 심사하거나 발송을 거절할 수 있습니다.': {
    en: 'The Company or the message provider may review templates or refuse sending.',
    ja: '当社またはメッセージ提供者は、テンプレートを審査し、または送信を拒否することができます。',
    zh: '公司或消息提供者可审核模板或拒绝发送。',
  },
  '심사를 통과했다는 사실만으로 메시지가 법적으로 적법하다는 보장은 되지 않습니다.': {
    en: 'The mere fact that a message has passed review does not guarantee that it is legally compliant.',
    ja: '審査を通過したという事実のみをもって、メッセージが法的に適法であることが保証されるものではありません。',
    zh: '仅凭通过审核这一事实，并不保证消息在法律上合规。',
  },

  '제20조 분석 및 순위 추적': { en: 'Article 20 Analytics and Ranking Tracking', ja: '第20条 分析および順位追跡', zh: '第20条 分析与排名追踪' },
  '검색, 블로그, 플레이스 및 마케팅 분석 결과는 수집 시점과 데이터 접근 가능성에 따라 달라질 수 있습니다.': {
    en: 'Search, blog, Place, and marketing analytics results may vary depending on the time of collection and data availability.',
    ja: '検索、ブログ、プレイスおよびマーケティング分析の結果は、収集時点およびデータへのアクセス可能性により異なる場合があります。',
    zh: '搜索、博客、Place 及营销分析结果可能因采集时点与数据可获取性而有所不同。',
  },
  '회사는 특정 검색순위, 노출, 매출, 조회수 또는 광고성과를 보장하지 않습니다.': {
    en: 'The Company does not guarantee any particular search ranking, exposure, sales, views, or advertising performance.',
    ja: '当社は、特定の検索順位、露出、売上、閲覧数または広告成果を保証しません。',
    zh: '公司不保证特定的搜索排名、曝光、销售额、浏览量或广告效果。',
  },
  '외부 플랫폼의 정책, 알고리즘, API 또는 화면구조 변경으로 분석이 지연되거나 중단될 수 있습니다.': {
    en: 'Analysis may be delayed or interrupted due to changes in external platforms’ policies, algorithms, APIs, or screen structures.',
    ja: '外部プラットフォームのポリシー、アルゴリズム、APIまたは画面構造の変更により、分析が遅延または中断される場合があります。',
    zh: '因外部平台的政策、算法、API 或页面结构变更，分析可能延迟或中断。',
  },
  '회원은 분석 결과를 참고자료로만 사용하고 중요한 의사결정을 별도로 검토해야 합니다.': {
    en: 'Members must use analysis results only as reference material and review important decisions separately.',
    ja: '会員は、分析結果を参考資料としてのみ使用し、重要な意思決定は別途検討しなければなりません。',
    zh: '会员须仅将分析结果作为参考资料，并对重要决策另行审查。',
  },
  '회원은 외부 플랫폼의 접근제한, 로봇정책, API 약관 및 상표정책을 준수해야 합니다.': {
    en: 'Members must comply with external platforms’ access restrictions, robot policies, API terms, and trademark policies.',
    ja: '会員は、外部プラットフォームのアクセス制限、ロボットポリシー、API規約および商標ポリシーを遵守しなければなりません。',
    zh: '会员须遵守外部平台的访问限制、机器人政策、API 条款及商标政策。',
  },

  '제21조 외부 서비스': { en: 'Article 21 External Services', ja: '第21条 外部サービス', zh: '第21条 外部服务' },
  '서비스 일부는 외부 AI, 클라우드, 결제, 통신 및 분석 제공자에 의존할 수 있습니다.': {
    en: 'Parts of the service may depend on external AI, cloud, payment, communications, and analytics providers.',
    ja: 'サービスの一部は、外部のAI、クラウド、決済、通信および分析の提供者に依存する場合があります。',
    zh: '部分服务可能依赖外部 AI、云、支付、通信及分析提供者。',
  },
  '외부 서비스에는 해당 제공자의 별도 약관과 정책이 적용될 수 있습니다.': {
    en: 'External services may be subject to the separate terms and policies of the relevant provider.',
    ja: '外部サービスには、当該提供者の別途の規約およびポリシーが適用される場合があります。',
    zh: '外部服务可能适用相关提供者的单独条款与政策。',
  },
  '회사는 회원에게 중대한 영향을 미치는 주요 외부 서비스와 개인정보 처리현황을 개인정보처리방침 또는 재수탁자 목록에 공개합니다.': {
    en: 'The Company discloses the major external services that materially affect members and the status of personal data processing in its privacy policy or sub-processor list.',
    ja: '当社は、会員に重大な影響を及ぼす主要な外部サービスおよび個人情報の処理状況を、個人情報処理方針または再受託者リストに公開します。',
    zh: '公司在隐私政策或次级处理者名单中公开对会员有重大影响的主要外部服务及个人信息处理状况。',
  },
  '외부 서비스의 장애로 BYGENCY 기능이 영향을 받을 수 있습니다.': {
    en: 'BYGENCY features may be affected by failures of external services.',
    ja: '外部サービスの障害により、BYGENCYの機能が影響を受ける場合があります。',
    zh: '外部服务的故障可能影响 BYGENCY 的功能。',
  },
  '회사는 합리적인 대체조치를 취하지만 외부 사업자의 통제 범위를 벗어난 장애를 완전히 방지한다고 보증하지 않습니다.': {
    en: 'The Company takes reasonable alternative measures but does not warrant that it can completely prevent failures beyond the control of external providers.',
    ja: '当社は、合理的な代替措置を講じますが、外部事業者の管理の範囲を超える障害を完全に防止することを保証しません。',
    zh: '公司会采取合理的替代措施，但不保证能完全防止超出外部服务商控制范围的故障。',
  },

  '제22조 요금제': { en: 'Article 22 Plans', ja: '第22条 料金プラン', zh: '第22条 套餐' },
  '서비스는 무료, 체험, 크레딧, 월간 구독, 연간 구독 또는 기업계약 방식으로 제공될 수 있습니다.': {
    en: 'The service may be provided on a free, trial, credit, monthly subscription, annual subscription, or enterprise contract basis.',
    ja: 'サービスは、無料、体験、クレジット、月間サブスクリプション、年間サブスクリプションまたは企業契約の方式で提供される場合があります。',
    zh: '服务可通过免费、体验、积分、月度订阅、年度订阅或企业合同方式提供。',
  },
  '가격, 통화, 세금, 제공 크레딧, 기능 제한, 이용기간 및 자동갱신 여부는 결제 전에 표시합니다.': {
    en: 'The price, currency, taxes, credits provided, feature limits, usage period, and whether auto-renewal applies are displayed before payment.',
    ja: '価格、通貨、税金、提供クレジット、機能制限、利用期間および自動更新の有無は、決済前に表示します。',
    zh: '价格、货币、税费、所提供积分、功能限制、使用期限及是否自动续订，在付款前予以显示。',
  },
  '회원은 결제 전에 최종 결제금액을 확인해야 합니다.': {
    en: 'Members must confirm the final payment amount before payment.',
    ja: '会員は、決済前に最終決済金額を確認しなければなりません。',
    zh: '会员须在付款前确认最终支付金额。',
  },
  '기업회원의 견적서, 주문서 또는 별도 계약에는 별도 가격과 조건이 적용될 수 있습니다.': {
    en: 'Separate prices and conditions may apply to a business member’s quotation, order form, or separate contract.',
    ja: '企業会員の見積書、注文書または別途契約には、別途の価格および条件が適用される場合があります。',
    zh: '企业会员的报价单、订单或单独合同可能适用另行约定的价格与条件。',
  },
  '표시 오류가 명백한 경우 회사는 결제를 취소하고 전액 환불하거나 회원의 동의를 받아 올바른 가격으로 계약을 체결할 수 있습니다.': {
    en: 'Where a display error is obvious, the Company may cancel the payment and issue a full refund, or, with the member’s consent, conclude the contract at the correct price.',
    ja: '表示の誤りが明白な場合、当社は決済を取り消して全額返金し、または会員の同意を得て正しい価格で契約を締結することができます。',
    zh: '如显示错误明显，公司可取消付款并全额退款，或经会员同意按正确价格订立合同。',
  },

  '제23조 크레딧': { en: 'Article 23 Credits', ja: '第23条 クレジット', zh: '第23条 积分' },
  '크레딧은 서비스 이용량을 계산하기 위한 단위이며 현금, 예금, 전자화폐 또는 투자상품이 아닙니다.': {
    en: 'Credits are a unit for calculating service usage and are not cash, deposits, electronic currency, or an investment product.',
    ja: 'クレジットは、サービス利用量を計算するための単位であり、現金、預金、電子マネーまたは投資商品ではありません。',
    zh: '积分是用于计算服务使用量的单位，并非现金、存款、电子货币或投资商品。',
  },
  '크레딧은 회사가 명시적으로 허용한 경우를 제외하고 양도, 판매 또는 현금 교환할 수 없습니다.': {
    en: 'Credits may not be transferred, sold, or exchanged for cash except where expressly permitted by the Company.',
    ja: 'クレジットは、当社が明示的に許可した場合を除き、譲渡、販売または現金への交換をすることはできません。',
    zh: '除公司明确许可外，积分不得转让、出售或兑换现金。',
  },
  '크레딧 소모량은 모델, 해상도, 영상 길이, 처리시간, 메시지 유형 및 기능에 따라 달라질 수 있습니다.': {
    en: 'Credit consumption may vary depending on the model, resolution, video length, processing time, message type, and feature.',
    ja: 'クレジットの消費量は、モデル、解像度、映像の長さ、処理時間、メッセージの種類および機能により異なる場合があります。',
    zh: '积分消耗量可能因模型、分辨率、视频时长、处理时间、消息类型及功能而有所不同。',
  },
  '예상 소모 크레딧은 실행 전에 가능한 범위에서 표시합니다.': {
    en: 'The estimated credit consumption is displayed, to the extent possible, before execution.',
    ja: '予想消費クレジットは、実行前に可能な範囲で表示します。',
    zh: '预计消耗积分在执行前于可能范围内予以显示。',
  },
  '생성 작업이 기술적 오류로 완료되지 않으면 사용된 크레딧을 자동 또는 확인 후 복구합니다.': {
    en: 'If a generation task is not completed due to a technical error, the credits used are restored automatically or after verification.',
    ja: '生成作業が技術的なエラーにより完了しなかった場合、使用されたクレジットを自動または確認後に復旧します。',
    zh: '如生成任务因技术错误未能完成，将自动或经确认后恢复已使用的积分。',
  },
  '회원의 입력 오류, 결과에 대한 단순 불만, 금지 콘텐츠 요청 또는 회원이 중도 취소한 작업은 법률이나 별도 정책에서 달리 정하지 않는 한 크레딧 복구 대상이 아닐 수 있습니다.': {
    en: 'A member’s input error, mere dissatisfaction with results, request for prohibited content, or a task cancelled midway by the member may not be eligible for credit restoration unless otherwise provided by law or a separate policy.',
    ja: '会員の入力ミス、結果に対する単なる不満、禁止コンテンツの要求または会員が途中で取り消した作業は、法律または別途の方針で別段の定めがない限り、クレジット復旧の対象とならない場合があります。',
    zh: '会员的输入错误、对结果的单纯不满、请求禁止内容或会员中途取消的任务，除法律或另行政策另有规定外，可能不属于积分恢复的对象。',
  },
  '유료 크레딧의 유효기간:': { en: 'Validity period of paid credits:', ja: '有料クレジットの有効期間：', zh: '付费积分的有效期：' },
  '보너스·이벤트 크레딧의 유효기간: 지급 화면에 별도 표시': {
    en: 'Validity period of bonus and event credits: displayed separately on the grant screen',
    ja: 'ボーナス・イベントクレジットの有効期間：付与画面に別途表示',
    zh: '奖励、活动积分的有效期：在发放页面另行显示',
  },
  '유효기간은 구매 전에 명확히 표시하며, 회사가 임의로 이미 지급된 유료 크레딧의 유효기간을 소급하여 단축하지 않습니다.': {
    en: 'The validity period is clearly displayed before purchase, and the Company does not arbitrarily shorten, retroactively, the validity period of paid credits already granted.',
    ja: '有効期間は購入前に明確に表示し、当社が既に付与された有料クレジットの有効期間を任意に遡及して短縮することはありません。',
    zh: '有效期在购买前明确显示，公司不会擅自追溯缩短已发放付费积分的有效期。',
  },
  '구독 해지 시 이미 구매한 별도 유료 크레딧의 처리방법은 구매 당시 고지한 조건을 따릅니다.': {
    en: 'Upon cancellation of a subscription, the treatment of separately purchased paid credits already bought follows the conditions notified at the time of purchase.',
    ja: 'サブスクリプション解約時、既に購入した別途の有料クレジットの取扱いは、購入時に告知した条件に従います。',
    zh: '解除订阅时，已购买的另行付费积分的处理方式，遵循购买当时告知的条件。',
  },

  '제24조 정기구독과 자동갱신': { en: 'Article 24 Recurring Subscriptions and Auto-Renewal', ja: '第24条 定期購読と自動更新', zh: '第24条 定期订阅与自动续订' },
  '월간 또는 연간 구독은 회원이 해지할 때까지 자동으로 갱신됩니다.': {
    en: 'Monthly or annual subscriptions renew automatically until the member cancels.',
    ja: '月間または年間のサブスクリプションは、会員が解約するまで自動的に更新されます。',
    zh: '月度或年度订阅在会员解除前自动续订。',
  },
  '결제주기, 다음 결제일 및 다음 결제금액은 결제 화면과 계정 설정에서 확인할 수 있습니다.': {
    en: 'The billing cycle, next payment date, and next payment amount can be viewed on the payment screen and in account settings.',
    ja: '決済周期、次回決済日および次回決済金額は、決済画面およびアカウント設定で確認できます。',
    zh: '结算周期、下次付款日及下次付款金额可在付款页面与账户设置中查看。',
  },
  '회원은 다음 갱신 전에 계정 설정에서 구독을 해지할 수 있습니다.': {
    en: 'Members may cancel their subscription in account settings before the next renewal.',
    ja: '会員は、次回の更新前に、アカウント設定でサブスクリプションを解約することができます。',
    zh: '会员可在下次续订前于账户设置中解除订阅。',
  },
  '해지는 원칙적으로 다음 결제주기부터 효력이 발생하며 현재 결제기간 종료일까지 서비스를 이용할 수 있습니다.': {
    en: 'Cancellation, in principle, takes effect from the next billing cycle, and the service may be used until the end of the current billing period.',
    ja: '解約は、原則として次回の決済周期から効力を生じ、現在の決済期間の終了日までサービスを利用できます。',
    zh: '解除原则上自下一结算周期起生效，会员可使用服务至当前结算期结束之日。',
  },
  '회사는 법률상 요구되는 경우 갱신 전 알림을 제공합니다.': {
    en: 'The Company provides a pre-renewal notice where required by law.',
    ja: '当社は、法律上要求される場合、更新前の通知を提供します。',
    zh: '在法律要求的情况下，公司提供续订前通知。',
  },
  '결제 실패 시 회사는 합리적인 기간 동안 결제를 재시도하고 회원에게 결제수단 변경을 요청할 수 있습니다.': {
    en: 'If payment fails, the Company may retry payment for a reasonable period and request the member to change the payment method.',
    ja: '決済が失敗した場合、当社は合理的な期間、決済を再試行し、会員に決済手段の変更を求めることができます。',
    zh: '付款失败时，公司可在合理期间内重试付款，并要求会员变更支付方式。',
  },
  '결제가 계속 실패하면 구독 또는 유료 기능이 제한될 수 있습니다.': {
    en: 'If payment continues to fail, the subscription or paid features may be restricted.',
    ja: '決済が引き続き失敗する場合、サブスクリプションまたは有料機能が制限される場合があります。',
    zh: '如付款持续失败，订阅或付费功能可能受到限制。',
  },
  '가격 인상 또는 무료에서 유료로 전환하는 경우 회사는 관련 법률에 따라 사전에 변경내용을 알리고 필요한 동의를 받습니다.': {
    en: 'In the case of a price increase or conversion from free to paid, the Company notifies the changes in advance and obtains the necessary consent in accordance with applicable law.',
    ja: '価格の引き上げまたは無料から有料への転換の場合、当社は関連法令に従い、事前に変更内容を通知し、必要な同意を取得します。',
    zh: '涨价或由免费转为付费时，公司依相关法律事先告知变更内容并取得必要同意。',
  },
  '회원의 명시적 동의 없이 추가 유료상품을 결제하거나 미리 선택된 부가상품을 청구하지 않습니다.': {
    en: 'The Company does not charge for additional paid products or bill for pre-selected add-ons without the member’s express consent.',
    ja: '会員の明示的な同意なく、追加の有料商品を決済し、または事前に選択された付加商品を請求することはありません。',
    zh: '未经会员明示同意，不会对追加付费商品扣款或对预先勾选的附加商品收费。',
  },

  '제25조 세금과 환율': { en: 'Article 25 Taxes and Exchange Rates', ja: '第25条 税金と為替レート', zh: '第25条 税费与汇率' },
  '표시가격에 세금이 포함되는지 여부를 결제 전에 표시합니다.': {
    en: 'Whether taxes are included in the displayed price is shown before payment.',
    ja: '表示価格に税金が含まれるか否かを、決済前に表示します。',
    zh: '在付款前显示标示价格是否含税。',
  },
  '국제결제에는 카드사 또는 금융기관의 환율과 해외결제 수수료가 적용될 수 있습니다.': {
    en: 'International payments may be subject to the exchange rate of the card company or financial institution and overseas payment fees.',
    ja: '国際決済には、カード会社または金融機関の為替レートおよび海外決済手数料が適用される場合があります。',
    zh: '国际支付可能适用发卡机构或金融机构的汇率及境外支付手续费。',
  },
  '기업회원은 세금계산서, 송장 또는 부가가치세 번호 등 필요한 정보를 정확히 제공해야 합니다.': {
    en: 'Business members must accurately provide the necessary information such as tax invoices, invoices, or VAT numbers.',
    ja: '企業会員は、税金計算書、インボイスまたは付加価値税番号など、必要な情報を正確に提供しなければなりません。',
    zh: '企业会员须准确提供税务发票、发票或增值税号等所需信息。',
  },
  '원천징수 의무가 있는 기업회원은 법률상 필요한 증빙을 회사에 제공해야 합니다.': {
    en: 'A business member with a withholding obligation must provide the Company with the evidence required by law.',
    ja: '源泉徴収義務のある企業会員は、法律上必要な証憑を当社に提供しなければなりません。',
    zh: '负有代扣代缴义务的企业会员，须向公司提供法律所需的凭证。',
  },

  '제26조 대한민국 소비자의 청약철회': { en: 'Article 26 Withdrawal of Subscription by Consumers in the Republic of Korea', ja: '第26条 大韓民国の消費者の申込撤回', zh: '第26条 大韩民国消费者的撤回订购' },
  '대한민국 소비자는 관계 법령에서 정한 기간과 방법에 따라 청약철회를 할 수 있습니다.': {
    en: 'Consumers in the Republic of Korea may withdraw their subscription in accordance with the period and method prescribed by the relevant laws.',
    ja: '大韓民国の消費者は、関係法令で定める期間および方法に従い、申込撤回をすることができます。',
    zh: '大韩民国消费者可依相关法令规定的期间与方法撤回订购。',
  },
  '디지털콘텐츠 또는 서비스의 제공이 개시되지 않은 경우 결제일 또는 계약내용을 받은 날부터 7일 이내에 청약철회를 요청할 수 있습니다.': {
    en: 'Where provision of the digital content or service has not commenced, withdrawal may be requested within 7 days from the date of payment or the date the contract terms were received.',
    ja: 'デジタルコンテンツまたはサービスの提供が開始されていない場合、決済日または契約内容を受領した日から7日以内に申込撤回を請求することができます。',
    zh: '如数字内容或服务的提供尚未开始，可自付款日或收到合同内容之日起 7 日内请求撤回订购。',
  },
  '회원의 명시적 요청으로 디지털콘텐츠 또는 크레딧 제공이 개시되고, 회사가 청약철회 제한 사실을 명확히 고지하며 시험사용 또는 이에 준하는 조치를 제공한 경우 법률이 허용하는 범위에서 청약철회가 제한될 수 있습니다.': {
    en: 'Where provision of digital content or credits has commenced at the member’s express request, and the Company has clearly notified the restriction on withdrawal and provided a trial use or equivalent measure, withdrawal may be restricted to the extent permitted by law.',
    ja: '会員の明示的な請求によりデジタルコンテンツまたはクレジットの提供が開始され、当社が申込撤回制限の事実を明確に告知し、試用またはこれに準ずる措置を提供した場合、法律が許容する範囲で申込撤回が制限される場合があります。',
    zh: '如经会员明示请求已开始提供数字内容或积分，且公司已明确告知撤回订购受限的事实并提供试用或与之相当的措施，则可在法律允许范围内限制撤回订购。',
  },
  '가분적인 서비스 또는 크레딧 중 사용되지 않은 부분은 적용 법률에 따라 환불 대상이 될 수 있습니다.': {
    en: 'The unused portion of a divisible service or credits may be eligible for a refund in accordance with applicable law.',
    ja: '可分的なサービスまたはクレジットのうち、使用されていない部分は、適用法令に従い返金の対象となる場合があります。',
    zh: '可分割服务或积分中未使用的部分，可依适用法律成为退款对象。',
  },
  '서비스 내용이 표시·광고 또는 계약과 다르거나 중대한 하자가 있는 경우 회원은 법령에 따른 기간 내 계약해제, 환불 또는 보완을 요구할 수 있습니다.': {
    en: 'Where the service content differs from the display, advertisement, or contract, or has a material defect, the member may demand rescission, a refund, or remediation within the period prescribed by law.',
    ja: 'サービス内容が表示・広告または契約と異なり、または重大な瑕疵がある場合、会員は法令に基づく期間内に契約解除、返金または補完を求めることができます。',
    zh: '如服务内容与标示、广告或合同不符或存在重大瑕疵，会员可在法令规定的期间内要求解除合同、退款或补正。',
  },
  '청약철회를 부당하게 방해하는 표시나 절차를 두지 않습니다.': {
    en: 'The Company does not put in place displays or procedures that unfairly obstruct withdrawal.',
    ja: '申込撤回を不当に妨害する表示や手続は設けません。',
    zh: '不设置不当妨碍撤回订购的标示或程序。',
  },

  '제27조 EU·EEA·영국 소비자의 철회권': { en: 'Article 27 Right of Withdrawal for EU/EEA/UK Consumers', ja: '第27条 EU・EEA・英国の消費者の撤回権', zh: '第27条 欧盟/欧洲经济区/英国消费者的撤回权' },
  'EU·EEA 또는 영국의 소비자는 적용 법률에 따라 온라인 서비스 계약 체결일부터 원칙적으로 14일 이내에 철회할 수 있습니다.': {
    en: 'Consumers in the EU/EEA or the UK may, under applicable law, withdraw in principle within 14 days from the date of concluding the online service contract.',
    ja: 'EU・EEAまたは英国の消費者は、適用法令に従い、オンラインサービス契約の締結日から原則として14日以内に撤回することができます。',
    zh: '欧盟/欧洲经济区或英国的消费者可依适用法律，原则上自订立在线服务合同之日起 14 日内撤回。',
  },
  '소비자가 철회기간 중 서비스 제공을 즉시 시작해 달라고 명시적으로 요청한 경우, 철회 시점까지 제공된 서비스에 상응하는 금액이 공제될 수 있습니다.': {
    en: 'Where the consumer has expressly requested that provision of the service begin immediately during the withdrawal period, an amount corresponding to the service provided up to the time of withdrawal may be deducted.',
    ja: '消費者が撤回期間中にサービスの提供を直ちに開始するよう明示的に請求した場合、撤回時点までに提供されたサービスに相当する金額が控除される場合があります。',
    zh: '如消费者在撤回期间明示请求立即开始提供服务，则可扣除相当于至撤回时点已提供服务的金额。',
  },
  '디지털 콘텐츠 또는 크레딧의 즉시 제공에 소비자가 명시적으로 동의하고 철회권 제한 또는 상실을 확인한 경우 적용 법률이 허용하는 범위에서 철회권이 제한될 수 있습니다.': {
    en: 'Where the consumer has expressly consented to the immediate provision of digital content or credits and acknowledged the restriction or loss of the right of withdrawal, the right of withdrawal may be restricted to the extent permitted by applicable law.',
    ja: 'デジタルコンテンツまたはクレジットの即時提供に消費者が明示的に同意し、撤回権の制限または喪失を確認した場合、適用法令が許容する範囲で撤回権が制限される場合があります。',
    zh: '如消费者明示同意即时提供数字内容或积分并确认撤回权受限或丧失，则可在适用法律允许范围内限制撤回权。',
  },
  '회사는 동의 내용을 내구성 있는 매체로 제공하고 관련 기록을 보관합니다.': {
    en: 'The Company provides the content of the consent on a durable medium and retains the related records.',
    ja: '当社は、同意内容を耐久性のある媒体で提供し、関連記録を保管します。',
    zh: '公司以持久性介质提供同意内容并保存相关记录。',
  },
  '현지의 강행 소비자보호법이 본 조보다 유리한 권리를 제공하면 해당 법률이 우선합니다.': {
    en: 'Where local mandatory consumer protection law provides more favorable rights than this Article, that law prevails.',
    ja: '現地の強行的消費者保護法が本条より有利な権利を提供する場合、当該法律が優先します。',
    zh: '如当地强制性消费者保护法提供比本条更有利的权利，则以该法律为准。',
  },

  '제28조 일반 환불정책': { en: 'Article 28 General Refund Policy', ja: '第28条 一般返金方針', zh: '第28条 一般退款政策' },
  '유료 서비스를 전혀 사용하지 않은 회원이 결제 후 7일 이내에 환불을 요청하면 법령 및 결제수단상 제한이 없는 한 전액 환불합니다.': {
    en: 'If a member who has not used the paid service at all requests a refund within 7 days of payment, a full refund is provided unless restricted by law or the payment method.',
    ja: '有料サービスを全く使用していない会員が決済後7日以内に返金を請求した場合、法令および決済手段上の制限がない限り、全額返金します。',
    zh: '完全未使用付费服务的会员在付款后 7 日内请求退款的，除法令及支付方式上有限制外，全额退款。',
  },
  '크레딧이나 유료 기능을 일부 사용한 경우 사용한 부분의 정상가격 또는 합리적인 비례금액을 공제하고 나머지를 환불할 수 있습니다.': {
    en: 'Where credits or paid features have been partly used, the normal price of the used portion or a reasonable pro-rata amount may be deducted and the remainder refunded.',
    ja: 'クレジットまたは有料機能を一部使用した場合、使用した部分の通常価格または合理的な比例金額を控除し、残額を返金することができます。',
    zh: '如已部分使用积分或付费功能，可扣除已使用部分的正常价格或合理的按比例金额后退还其余。',
  },
  '무료 또는 보너스 크레딧은 환불금액에 포함되지 않습니다.': {
    en: 'Free or bonus credits are not included in the refund amount.',
    ja: '無料またはボーナスクレジットは、返金額に含まれません。',
    zh: '免费或奖励积分不计入退款金额。',
  },
  '회사의 귀책으로 서비스를 이용하지 못한 경우 해당 기간, 영향받은 기능 및 장애 정도에 따라 이용기간 연장, 크레딧 복구 또는 환불을 제공합니다.': {
    en: 'Where the service could not be used due to the Company’s fault, an extension of the usage period, restoration of credits, or a refund is provided depending on the period, the features affected, and the extent of the failure.',
    ja: '当社の帰責によりサービスを利用できなかった場合、当該期間、影響を受けた機能および障害の程度に応じて、利用期間の延長、クレジットの復旧または返金を提供します。',
    zh: '如因公司过错而无法使用服务，将根据相关期间、受影响功能及故障程度提供使用期限延长、积分恢复或退款。',
  },
  '회원의 단순 변심, 기대와 다른 생성 결과, 권리 없는 콘텐츠 업로드 또는 약관 위반으로 사용이 제한된 경우 환불이 제한될 수 있습니다. 다만, 법률상 환불권을 배제하지 않습니다.': {
    en: 'Refunds may be restricted where use has been restricted due to a member’s mere change of mind, generation results differing from expectations, uploading content without rights, or breach of the Terms. However, this does not exclude statutory refund rights.',
    ja: '会員の単なる心変わり、期待と異なる生成結果、権利のないコンテンツのアップロードまたは規約違反により使用が制限された場合、返金が制限される場合があります。ただし、法律上の返金権を排除しません。',
    zh: '如因会员单纯改变主意、生成结果与预期不符、上传无权利内容或违反条款而被限制使用，退款可能受限。但不排除法定退款权。',
  },
  '연간 구독의 중도해지는 사용기간, 제공된 할인, 사용 크레딧 및 현지 소비자법을 고려해 환불액을 계산합니다.': {
    en: 'For early cancellation of an annual subscription, the refund amount is calculated taking into account the period of use, discounts provided, credits used, and local consumer law.',
    ja: '年間サブスクリプションの中途解約は、使用期間、提供された割引、使用クレジットおよび現地の消費者法を考慮して返金額を計算します。',
    zh: '年度订阅的中途解除，将综合考虑使用期间、所提供折扣、已使用积分及当地消费者法计算退款额。',
  },
  '환불은 원칙적으로 원래 결제수단으로 처리합니다.': {
    en: 'Refunds are, in principle, processed to the original payment method.',
    ja: '返金は、原則として元の決済手段で処理します。',
    zh: '退款原则上通过原支付方式处理。',
  },
  '환불 처리기간은 결제사와 금융기관의 사정에 따라 달라질 수 있으며 회사는 처리 요청 사실을 회원에게 알립니다.': {
    en: 'The refund processing period may vary depending on the circumstances of the payment company and financial institution, and the Company informs the member that a processing request has been made.',
    ja: '返金処理期間は、決済会社および金融機関の事情により異なる場合があり、当社は処理請求の事実を会員に通知します。',
    zh: '退款处理期间可能因支付公司与金融机构的情况而不同，公司会将已提出处理请求的事实告知会员。',
  },
  '회사의 고의 또는 중대한 과실, 법정 청약철회, 중대한 서비스 하자에 관한 책임을 본 조로 제한하지 않습니다.': {
    en: 'This Article does not limit liability for the Company’s intent or gross negligence, statutory withdrawal, or material service defects.',
    ja: '当社の故意または重大な過失、法定の申込撤回、重大なサービスの瑕疵に関する責任を本条により制限しません。',
    zh: '本条不限制关于公司故意或重大过失、法定撤回订购、重大服务瑕疵的责任。',
  },

  '제29조 회원의 해지 및 탈퇴': { en: 'Article 29 Member’s Cancellation and Withdrawal', ja: '第29条 会員の解約および退会', zh: '第29条 会员的解除与退会' },
  '회원은 계정 설정에서 구독을 해지하거나 회원 탈퇴를 신청할 수 있습니다.': {
    en: 'Members may cancel their subscription or apply for withdrawal in account settings.',
    ja: '会員は、アカウント設定でサブスクリプションを解約し、または退会を申請することができます。',
    zh: '会员可在账户设置中解除订阅或申请退会。',
  },
  '탈퇴 전에 프로젝트, 생성물, 고객 데이터 및 결제자료를 내보내야 합니다.': {
    en: 'Before withdrawal, members must export their projects, outputs, customer data, and payment records.',
    ja: '退会前に、プロジェクト、生成物、顧客データおよび決済資料をエクスポートしなければなりません。',
    zh: '退会前须导出项目、生成内容、客户数据及支付资料。',
  },
  '탈퇴 신청 시 진행 중인 생성 작업과 예약 발송은 취소될 수 있습니다.': {
    en: 'Upon application for withdrawal, ongoing generation tasks and scheduled sends may be cancelled.',
    ja: '退会申請時、進行中の生成作業および予約送信は取り消される場合があります。',
    zh: '申请退会时，进行中的生成任务与预约发送可能被取消。',
  },
  '회사는 탈퇴 후 30일 동안 복구기간을 제공한 뒤 데이터를 삭제할 수 있습니다.': {
    en: 'The Company may delete data after providing a 30-day recovery period following withdrawal.',
    ja: '当社は、退会後30日間の復旧期間を提供した後、データを削除することができます。',
    zh: '公司可在退会后提供 30 天恢复期后删除数据。',
  },
  '법령상 보존이 필요한 정보, 사기·보안 조사자료, 수신거부 목록 및 분쟁 관련 자료는 필요한 범위에서 별도로 보관할 수 있습니다.': {
    en: 'Information required to be retained by law, fraud and security investigation materials, opt-out lists, and dispute-related materials may be stored separately to the extent necessary.',
    ja: '法令上保存が必要な情報、詐欺・セキュリティ調査資料、受信拒否リストおよび紛争関連資料は、必要な範囲で別途保管することができます。',
    zh: '法令要求保存的信息、欺诈与安全调查资料、拒收名单及争议相关资料，可在必要范围内单独保存。',
  },
  '수신거부 목록은 다시 광고를 보내지 않기 위한 최소한의 정보로 보관할 수 있습니다.': {
    en: 'Opt-out lists may be retained as minimal information for the purpose of not sending advertisements again.',
    ja: '受信拒否リストは、再び広告を送信しないための最小限の情報として保管することができます。',
    zh: '拒收名单可作为不再发送广告所需的最小信息予以保存。',
  },

  '제30조 회사의 이용제한 및 해지': { en: 'Article 30 The Company’s Use Restriction and Termination', ja: '第30条 当社の利用制限および解約', zh: '第30条 公司的使用限制与解除' },
  '회사는 다음 사유가 있는 경우 경고, 기능 제한, 발송 정지, 계정 정지 또는 계약 해지를 할 수 있습니다.': {
    en: 'The Company may issue a warning, restrict features, suspend sending, suspend the account, or terminate the contract in the following cases.',
    ja: '当社は、次の事由がある場合、警告、機能制限、送信停止、アカウント停止または契約解約を行うことができます。',
    zh: '在下列情形下，公司可予以警告、功能限制、停止发送、暂停账户或解除合同。',
  },
  '가. 본 약관 또는 법령 위반': {
    en: 'a. Breach of these Terms or the law',
    ja: 'ア．本規約または法令の違反',
    zh: '甲. 违反本条款或法令',
  },
  '나. 동의 없는 대량 광고 발송': {
    en: 'b. Mass sending of advertisements without consent',
    ja: 'イ．同意のない大量広告の送信',
    zh: '乙. 未经同意大量发送广告',
  },
  '다. 결제 사기 또는 부당한 지급거절': {
    en: 'c. Payment fraud or improper chargebacks',
    ja: 'ウ．決済詐欺または不当な支払拒否',
    zh: '丙. 支付欺诈或不当拒付',
  },
  '라. 타인의 권리 또는 안전에 중대한 침해': {
    en: 'd. Serious infringement of another person’s rights or safety',
    ja: 'エ．他人の権利または安全に対する重大な侵害',
    zh: '丁. 严重侵害他人权利或安全',
  },
  '마. 시스템 공격 또는 제한 우회': {
    en: 'e. System attacks or circumvention of restrictions',
    ja: 'オ．システム攻撃または制限の回避',
    zh: '戊. 攻击系统或规避限制',
  },
  '바. 국제제재 또는 법적 명령': {
    en: 'f. International sanctions or legal orders',
    ja: 'カ．国際制裁または法的命令',
    zh: '己. 国际制裁或法律命令',
  },
  '사. 반복적인 권리침해 신고': {
    en: 'g. Repeated reports of rights infringement',
    ja: 'キ．反復的な権利侵害の申告',
    zh: '庚. 反复的侵权举报',
  },
  '아. 서비스 또는 다른 이용자에게 즉각적인 위험 발생': {
    en: 'h. Immediate danger to the service or other users',
    ja: 'ク．サービスまたは他の利用者への即時的な危険の発生',
    zh: '辛. 对服务或其他用户产生即时危险',
  },
  '긴급하지 않은 경우 회사는 원칙적으로 사전 통지와 시정 기회를 제공합니다.': {
    en: 'In non-urgent cases, the Company, in principle, provides prior notice and an opportunity to cure.',
    ja: '緊急でない場合、当社は原則として事前の通知および是正の機会を提供します。',
    zh: '在非紧急情形下，公司原则上提供事先通知及改正机会。',
  },
  '긴급한 피해, 법적 명령, 보안사고 또는 증거인멸 위험이 있는 경우 사전 통지 없이 조치할 수 있습니다.': {
    en: 'Where there is urgent harm, a legal order, a security incident, or a risk of destruction of evidence, the Company may act without prior notice.',
    ja: '緊急の被害、法的命令、セキュリティインシデントまたは証拠隠滅の危険がある場合、事前の通知なく措置することができます。',
    zh: '如存在紧急损害、法律命令、安全事件或毁灭证据的风险，可在无事先通知的情况下采取处置。',
  },
  '회원은 회사의 조치에 이의를 제기할 수 있습니다.': {
    en: 'Members may object to the Company’s measures.',
    ja: '会員は、当社の措置に対して異議を申し立てることができます。',
    zh: '会员可对公司的处置提出异议。',
  },
  '약관 위반으로 계약이 해지되더라도 소비자에게 부여되는 강행법상 환불권은 제한되지 않습니다.': {
    en: 'Even if the contract is terminated for breach of the Terms, the mandatory statutory refund rights granted to consumers are not restricted.',
    ja: '規約違反により契約が解約された場合であっても、消費者に付与される強行法上の返金権は制限されません。',
    zh: '即使因违反条款而解除合同，消费者依强制性法律享有的退款权亦不受限制。',
  },

  '제31조 서비스 가용성과 유지보수': { en: 'Article 31 Service Availability and Maintenance', ja: '第31条 サービスの可用性と保守', zh: '第31条 服务可用性与维护' },
  '회사는 서비스의 안정적 제공을 위해 합리적으로 노력합니다.': {
    en: 'The Company makes reasonable efforts to provide the service stably.',
    ja: '当社は、サービスの安定的な提供のために合理的に努力します。',
    zh: '公司为稳定提供服务作出合理努力。',
  },
  '점검, 업데이트, 외부 서비스 장애, 통신 장애, 천재지변, 전쟁, 규제조치 또는 보안사고로 서비스가 일시 중단될 수 있습니다.': {
    en: 'The service may be temporarily suspended due to maintenance, updates, external service failures, communication failures, natural disasters, war, regulatory measures, or security incidents.',
    ja: '点検、アップデート、外部サービスの障害、通信障害、天災地変、戦争、規制措置またはセキュリティインシデントにより、サービスが一時的に中断される場合があります。',
    zh: '因检修、更新、外部服务故障、通信故障、天灾、战争、监管措施或安全事件，服务可能临时中断。',
  },
  '예정된 점검은 가능한 범위에서 미리 알립니다.': {
    en: 'Scheduled maintenance is announced in advance to the extent possible.',
    ja: '予定された点検は、可能な範囲で事前に通知します。',
    zh: '预定的检修在可能范围内提前通知。',
  },
  '별도 기업용 SLA가 없는 한 특정 가동률 또는 무중단 서비스를 보증하지 않습니다.': {
    en: 'Unless there is a separate enterprise SLA, no specific uptime or uninterrupted service is guaranteed.',
    ja: '別途の企業向けSLAがない限り、特定の稼働率または無停止のサービスを保証しません。',
    zh: '除另有企业级 SLA 外，不保证特定的可用率或不间断服务。',
  },
  '회사는 데이터 손실 방지를 위해 합리적인 백업을 수행하지만 회원도 중요한 자료를 별도로 보관해야 합니다.': {
    en: 'The Company performs reasonable backups to prevent data loss, but members must also store important materials separately.',
    ja: '当社は、データ損失防止のために合理的なバックアップを実施しますが、会員も重要な資料を別途保管しなければなりません。',
    zh: '公司为防止数据丢失进行合理备份，但会员也须另行保存重要资料。',
  },

  '제32조 보증의 제한': { en: 'Article 32 Limitation of Warranties', ja: '第32条 保証の制限', zh: '第32条 保证的限制' },
  '회사는 관련 법률상 배제할 수 없는 보증과 책임을 배제하지 않습니다.': {
    en: 'The Company does not exclude warranties and liabilities that cannot be excluded under applicable law.',
    ja: '当社は、関連法令上排除できない保証および責任を排除しません。',
    zh: '公司不排除相关法律上不可排除的保证与责任。',
  },
  '법률이 허용하는 범위에서 서비스는 현재 제공 가능한 상태로 제공됩니다.': {
    en: 'To the extent permitted by law, the service is provided on an “as available” basis.',
    ja: '法律が許容する範囲で、サービスは現在提供可能な状態で提供されます。',
    zh: '在法律允许的范围内，服务按现有可提供状态提供。',
  },
  '회사는 특정 매출, 순위, 조회수, 전환율, 광고성과 또는 사업성과를 보증하지 않습니다.': {
    en: 'The Company does not guarantee any particular sales, ranking, views, conversion rate, advertising performance, or business results.',
    ja: '当社は、特定の売上、順位、閲覧数、コンバージョン率、広告成果または事業成果を保証しません。',
    zh: '公司不保证特定的销售额、排名、浏览量、转化率、广告效果或经营业绩。',
  },
  '회사는 회원이 제공한 자료의 정확성 또는 적법성을 보증하지 않습니다.': {
    en: 'The Company does not warrant the accuracy or lawfulness of materials provided by members.',
    ja: '当社は、会員が提供した資料の正確性または適法性を保証しません。',
    zh: '公司不保证会员所提供资料的准确性或合法性。',
  },
  '무료·베타 기능은 유료 핵심 서비스보다 제한된 보증이 적용될 수 있습니다.': {
    en: 'Free and beta features may be subject to more limited warranties than paid core services.',
    ja: '無料・ベータ機能には、有料の中核サービスより制限された保証が適用される場合があります。',
    zh: '免费、测试功能可能适用比付费核心服务更有限的保证。',
  },

  '제33조 책임의 범위': { en: 'Article 33 Scope of Liability', ja: '第33条 責任の範囲', zh: '第33条 责任范围' },
  '회사의 고의 또는 중대한 과실로 발생한 손해, 생명·신체 손해 및 법률상 제한할 수 없는 책임은 제한하지 않습니다.': {
    en: 'The Company does not limit liability for damage caused by its intent or gross negligence, damage to life or body, or liability that cannot be limited by law.',
    ja: '当社の故意または重大な過失により生じた損害、生命・身体の損害および法律上制限できない責任は制限しません。',
    zh: '对因公司故意或重大过失造成的损害、生命及身体损害以及法律上不可限制的责任，不予限制。',
  },
  '개인 소비자에 대해서는 해당 국가의 강행 소비자보호법이 우선합니다.': {
    en: 'For individual consumers, the mandatory consumer protection law of the relevant country prevails.',
    ja: '個人消費者については、当該国の強行的消費者保護法が優先します。',
    zh: '对于个人消费者，以相关国家的强制性消费者保护法为准。',
  },
  '기업회원에 대해 법률이 허용하는 범위에서 회사의 총 책임은 손해 발생 원인이 된 사건 직전 12개월 동안 기업회원이 회사에 실제 지급한 이용료 총액을 한도로 합니다.': {
    en: 'For business members, to the extent permitted by law, the Company’s total liability is limited to the total amount of fees actually paid by the business member to the Company during the 12 months immediately preceding the event giving rise to the damage.',
    ja: '企業会員に対して、法律が許容する範囲で、当社の総責任は、損害の発生原因となった事象の直前12か月間に企業会員が当社に実際に支払った利用料の総額を限度とします。',
    zh: '对于企业会员，在法律允许的范围内，公司的总责任以引起损害的事件之前 12 个月内企业会员向公司实际支付的使用费总额为限。',
  },
  '기업회원에 대해 회사는 특별손해, 간접손해, 결과손해, 영업손실, 기대이익 상실 또는 데이터 손실에 책임을 지지 않습니다. 다만, 회사가 해당 손해를 고의 또는 중대한 과실로 발생시킨 경우와 법률상 제한할 수 없는 경우는 제외합니다.': {
    en: 'For business members, the Company is not liable for special, indirect, or consequential damages, loss of business, loss of anticipated profits, or loss of data, except where the Company caused such damage by intent or gross negligence and where it cannot be limited by law.',
    ja: '企業会員に対して、当社は特別損害、間接損害、結果損害、営業損失、期待利益の喪失またはデータの損失について責任を負いません。ただし、当社が当該損害を故意または重大な過失により発生させた場合および法律上制限できない場合を除きます。',
    zh: '对于企业会员，公司不对特别损害、间接损害、结果性损害、营业损失、预期利益损失或数据丢失承担责任；但公司因故意或重大过失造成该等损害的情形以及法律上不可限制的情形除外。',
  },
  '여러 청구가 발생하더라도 동일한 원인 또는 관련된 일련의 사건에서 발생한 경우 하나의 책임한도가 적용될 수 있습니다.': {
    en: 'Even if multiple claims arise, a single liability cap may apply where they arise from the same cause or a related series of events.',
    ja: '複数の請求が生じた場合であっても、同一の原因または関連する一連の事象から生じた場合、単一の責任限度が適用される場合があります。',
    zh: '即使发生多项请求，如源于同一原因或相关联的一系列事件，可适用单一责任限额。',
  },
  '본 조는 회사의 고의, 중대한 과실, 비밀유지 위반, 회사의 지식재산권 침해 또는 법률상 제한이 금지되는 책임에는 적용되지 않습니다.': {
    en: 'This Article does not apply to the Company’s intent, gross negligence, breach of confidentiality, the Company’s infringement of intellectual property rights, or liability whose limitation is prohibited by law.',
    ja: '本条は、当社の故意、重大な過失、秘密保持義務違反、当社による知的財産権の侵害、または法律上制限が禁止される責任には適用されません。',
    zh: '本条不适用于公司的故意、重大过失、违反保密义务、公司侵犯知识产权，或法律禁止限制的责任。',
  },

  '제34조 기업회원의 배상책임': { en: 'Article 34 Business Member’s Indemnification Liability', ja: '第34条 企業会員の賠償責任', zh: '第34条 企业会员的赔偿责任' },
  '기업회원은 다음 사유로 회사 또는 제3자에게 발생한 손해와 합리적인 비용을 배상해야 합니다.': {
    en: 'Business members must indemnify the Company or third parties for damage and reasonable costs arising from the following causes.',
    ja: '企業会員は、次の事由により当社または第三者に生じた損害および合理的な費用を賠償しなければなりません。',
    zh: '企业会员须就下列事由给公司或第三方造成的损害及合理费用予以赔偿。',
  },
  '가. 고객 데이터를 적법한 근거 없이 수집·사용한 경우': {
    en: 'a. Where customer data was collected or used without a lawful basis',
    ja: 'ア．顧客データを適法な根拠なく収集・使用した場合',
    zh: '甲. 无合法依据收集、使用客户数据的情形',
  },
  '나. 동의 없는 광고 또는 불법 스팸을 발송한 경우': {
    en: 'b. Where advertisements without consent or illegal spam were sent',
    ja: 'イ．同意のない広告または違法なスパムを送信した場合',
    zh: '乙. 发送未经同意的广告或非法垃圾信息的情形',
  },
  '다. 입력물 또는 생성물이 제3자의 권리를 침해한 경우': {
    en: 'c. Where inputs or outputs infringed third-party rights',
    ja: 'ウ．入力物または生成物が第三者の権利を侵害した場合',
    zh: '丙. 输入内容或生成内容侵犯第三方权利的情形',
  },
  '라. 불법 콘텐츠 또는 사칭 콘텐츠를 제작·배포한 경우': {
    en: 'd. Where illegal content or impersonation content was created or distributed',
    ja: 'エ．違法コンテンツまたはなりすましコンテンツを制作・配布した場合',
    zh: '丁. 制作、传播非法内容或冒充内容的情形',
  },
  '마. 기업회원의 법령 또는 약관 위반': {
    en: 'e. The business member’s breach of the law or the Terms',
    ja: 'オ．企業会員の法令または規約の違反',
    zh: '戊. 企业会员违反法令或条款',
  },
  '회사는 청구 사실을 기업회원에게 알리고 방어에 합리적으로 협조합니다.': {
    en: 'The Company notifies the business member of the claim and reasonably cooperates in the defense.',
    ja: '当社は、請求の事実を企業会員に通知し、防御に合理的に協力します。',
    zh: '公司将请求事实告知企业会员，并合理配合抗辩。',
  },
  '기업회원은 회사의 동의 없이 회사에 의무나 책임을 부담시키는 합의를 해서는 안 됩니다.': {
    en: 'Business members must not enter into any settlement that imposes obligations or liabilities on the Company without the Company’s consent.',
    ja: '企業会員は、当社の同意なく、当社に義務または責任を負わせる合意をしてはなりません。',
    zh: '未经公司同意，企业会员不得达成使公司承担义务或责任的和解。',
  },
  '본 조는 개인 소비자에게 적용되지 않습니다.': {
    en: 'This Article does not apply to individual consumers.',
    ja: '本条は、個人消費者には適用されません。',
    zh: '本条不适用于个人消费者。',
  },

  '제35조 비밀유지': { en: 'Article 35 Confidentiality', ja: '第35条 秘密保持', zh: '第35条 保密' },
  '각 당사자는 상대방으로부터 비공개로 제공받은 기술, 영업, 고객 및 보안정보를 비밀로 유지합니다.': {
    en: 'Each party keeps confidential the technical, business, customer, and security information provided by the other party on a non-public basis.',
    ja: '各当事者は、相手方から非公開で提供された技術、営業、顧客およびセキュリティ情報を秘密として保持します。',
    zh: '各方对从对方以非公开方式获得的技术、经营、客户及安全信息予以保密。',
  },
  '공개된 정보, 수령 전에 적법하게 보유한 정보, 독자 개발한 정보 또는 제3자로부터 적법하게 받은 정보는 비밀정보에서 제외합니다.': {
    en: 'Information that is public, lawfully held before receipt, independently developed, or lawfully received from a third party is excluded from confidential information.',
    ja: '公開された情報、受領前に適法に保有していた情報、独自に開発した情報または第三者から適法に受領した情報は、秘密情報から除外します。',
    zh: '已公开的信息、在接收前合法持有的信息、独立开发的信息或从第三方合法获得的信息，不属于保密信息。',
  },
  '법률 또는 법원의 명령으로 공개해야 하는 경우 가능한 범위에서 상대방에게 사전 통지합니다.': {
    en: 'Where disclosure is required by law or court order, prior notice is given to the other party to the extent possible.',
    ja: '法律または裁判所の命令により開示しなければならない場合、可能な範囲で相手方に事前に通知します。',
    zh: '如因法律或法院命令须予披露，在可能范围内事先通知对方。',
  },
  '회사 직원과 수탁자는 업무상 필요한 범위에서만 비밀정보에 접근하며 비밀유지의무를 부담합니다.': {
    en: 'The Company’s employees and processors access confidential information only to the extent necessary for their work and bear confidentiality obligations.',
    ja: '当社の従業員および受託者は、業務上必要な範囲でのみ秘密情報にアクセスし、秘密保持義務を負います。',
    zh: '公司员工与受托者仅在业务必要范围内访问保密信息，并承担保密义务。',
  },

  '제36조 지식재산권': { en: 'Article 36 Intellectual Property Rights', ja: '第36条 知的財産権', zh: '第36条 知识产权' },
  '서비스, 소프트웨어, UI, 노드 시스템, 템플릿, 상표 및 회사가 제공하는 콘텐츠에 관한 권리는 회사 또는 정당한 권리자에게 있습니다.': {
    en: 'Rights in the service, software, UI, node system, templates, trademarks, and content provided by the Company belong to the Company or the rightful holders.',
    ja: 'サービス、ソフトウェア、UI、ノードシステム、テンプレート、商標および当社が提供するコンテンツに関する権利は、当社または正当な権利者に帰属します。',
    zh: '服务、软件、UI、节点系统、模板、商标及公司提供的内容的相关权利，归属于公司或正当权利人。',
  },
  '회원은 계약기간 동안 서비스 이용에 필요한 비독점적이고 양도 불가능한 제한적 이용권을 부여받습니다.': {
    en: 'Members are granted a non-exclusive, non-transferable, limited right of use necessary for using the service during the contract period.',
    ja: '会員は、契約期間中、サービスの利用に必要な非独占的かつ譲渡不可能な限定的利用権を付与されます。',
    zh: '会员在合同期间获得使用服务所需的非独占、不可转让的有限使用权。',
  },
  '회원은 서비스의 복제, 재판매, 역설계, 경쟁 모델 학습을 위한 대량 추출 또는 상표의 무단 사용을 해서는 안 됩니다.': {
    en: 'Members must not copy or resell the service, reverse-engineer it, extract data in bulk to train competing models, or use trademarks without authorization.',
    ja: '会員は、サービスの複製、再販売、リバースエンジニアリング、競合モデル学習のための大量抽出または商標の無断使用をしてはなりません。',
    zh: '会员不得复制、转售服务，不得进行逆向工程、为训练竞争模型而大量提取数据，或擅自使用商标。',
  },
  '회원이 개선 의견을 제공하는 경우 회사는 개인을 식별하지 않는 범위에서 이를 서비스 개선에 이용할 수 있습니다.': {
    en: 'Where a member provides improvement feedback, the Company may use it to improve the service to the extent that it does not identify individuals.',
    ja: '会員が改善意見を提供する場合、当社は個人を識別しない範囲でこれをサービスの改善に利用することができます。',
    zh: '会员提供改进意见时，公司可在不识别个人的范围内将其用于改进服务。',
  },

  '제37조 권리침해 신고': { en: 'Article 37 Reporting Rights Infringement', ja: '第37条 権利侵害の申告', zh: '第37条 侵权举报' },
  '권리침해 신고에는 다음 정보를 포함해야 합니다.': {
    en: 'A rights infringement report must include the following information.',
    ja: '権利侵害の申告には、次の情報を含めなければなりません。',
    zh: '侵权举报须包含以下信息。',
  },
  '신고자의 성명 또는 법인명': {
    en: 'The reporter’s name or corporate name',
    ja: '申告者の氏名または法人名',
    zh: '举报人的姓名或法人名称',
  },
  '연락처': { en: 'Contact information', ja: '連絡先', zh: '联系方式' },
  '권리의 근거': { en: 'The basis of the right', ja: '権利の根拠', zh: '权利依据' },
  '침해가 의심되는 콘텐츠의 위치': {
    en: 'The location of the content suspected of infringement',
    ja: '侵害が疑われるコンテンツの所在',
    zh: '涉嫌侵权内容的位置',
  },
  '침해 사유': { en: 'The grounds for infringement', ja: '侵害の事由', zh: '侵权事由' },
  '사실에 근거한 신고라는 확인': {
    en: 'Confirmation that the report is based on fact',
    ja: '事実に基づく申告であることの確認',
    zh: '确认举报基于事实',
  },
  '필요한 경우 위임장': {
    en: 'A power of attorney, if necessary',
    ja: '必要な場合、委任状',
    zh: '必要时的委托书',
  },
  '신고처:': { en: 'Reporting contact:', ja: '申告先：', zh: '举报处：' },
  '회사는 신고를 검토하여 콘텐츠 제한, 자료 요청, 반론 기회 제공 및 계정 조치를 할 수 있습니다.': {
    en: 'The Company may review the report and restrict content, request materials, provide an opportunity to rebut, and take account measures.',
    ja: '当社は、申告を検討し、コンテンツの制限、資料の要請、反論の機会の提供およびアカウントの措置を行うことができます。',
    zh: '公司可对举报进行审查，并采取内容限制、要求提供资料、提供申辩机会及账户处置。',
  },
  '악의적이거나 허위인 신고로 발생한 손해는 신고자가 부담할 수 있습니다.': {
    en: 'Damage arising from malicious or false reports may be borne by the reporter.',
    ja: '悪意または虚偽の申告により生じた損害は、申告者が負担する場合があります。',
    zh: '因恶意或虚假举报造成的损害，可由举报人承担。',
  },

  '제38조 개인정보': { en: 'Article 38 Personal Information', ja: '第38条 個人情報', zh: '第38条 个人信息' },
  '회사는 개인정보처리방침과 개인정보처리위탁 특약에 따라 개인정보를 처리합니다.': {
    en: 'The Company processes personal information in accordance with the Privacy Policy and the Data Processing Addendum.',
    ja: '当社は、個人情報処理方針および個人情報取扱委託特約に従って個人情報を処理します。',
    zh: '公司依隐私政策与个人信息处理委托特别条款处理个人信息。',
  },
  '기업회원이 고객 데이터를 처리하는 경우 기업회원은 개인정보처리자 또는 컨트롤러로서의 책임을 부담하고 회사는 합의된 범위에서 수탁자 또는 프로세서 역할을 수행합니다.': {
    en: 'Where a business member processes customer data, the business member bears responsibility as the personal information controller or controller, and the Company performs the role of processor within the agreed scope.',
    ja: '企業会員が顧客データを処理する場合、企業会員は個人情報取扱者またはコントローラーとしての責任を負い、当社は合意された範囲で受託者またはプロセッサーの役割を果たします。',
    zh: '企业会员处理客户数据时，企业会员承担作为个人信息处理者或控制者的责任，公司在约定范围内履行受托者或处理者的角色。',
  },

  '제39조 통지': { en: 'Article 39 Notices', ja: '第39条 通知', zh: '第39条 通知' },
  '회사는 가입 이메일, 서비스 내 알림, 팝업 또는 공지사항으로 통지할 수 있습니다.': {
    en: 'The Company may give notice by the registration email, in-service notifications, pop-ups, or announcements.',
    ja: '当社は、登録メール、サービス内通知、ポップアップまたはお知らせにより通知することができます。',
    zh: '公司可通过注册邮箱、服务内通知、弹窗或公告进行通知。',
  },
  '결제, 보안, 약관의 중대한 변경, 개인정보 침해 또는 서비스 종료와 같이 중요한 사항은 개별 통지를 원칙으로 합니다.': {
    en: 'Important matters such as payment, security, material changes to the Terms, personal data breaches, or service discontinuation are, in principle, notified individually.',
    ja: '決済、セキュリティ、規約の重大な変更、個人情報侵害またはサービス終了のような重要な事項は、個別通知を原則とします。',
    zh: '支付、安全、条款的重大变更、个人信息侵害或服务终止等重要事项，原则上进行个别通知。',
  },
  '회원은 이메일과 연락처를 최신 상태로 유지해야 합니다.': {
    en: 'Members must keep their email and contact information up to date.',
    ja: '会員は、メールおよび連絡先を最新の状態に保たなければなりません。',
    zh: '会员须使电子邮箱与联系方式保持最新。',
  },

  '제40조 준거법과 분쟁해결': { en: 'Article 40 Governing Law and Dispute Resolution', ja: '第40条 準拠法と紛争解決', zh: '第40条 准据法与争议解决' },
  '본 약관은 대한민국 법률을 준거법으로 합니다.': {
    en: 'These Terms are governed by the laws of the Republic of Korea.',
    ja: '本規約は、大韓民国の法律を準拠法とします。',
    zh: '本条款以大韩民国法律为准据法。',
  },
  '개인 소비자가 거주 국가의 강행법에 따라 더 유리한 권리를 가지는 경우 해당 권리를 제한하지 않습니다.': {
    en: 'Where an individual consumer has more favorable rights under the mandatory law of their country of residence, those rights are not restricted.',
    ja: '個人消費者が居住国の強行法に基づきより有利な権利を有する場合、当該権利を制限しません。',
    zh: '如个人消费者依其居住国的强制性法律享有更有利的权利，不予限制该等权利。',
  },
  '기업회원과 회사 사이의 분쟁은 서울중앙지방법원을 제1심 전속 관할법원으로 합니다.': {
    en: 'Disputes between a business member and the Company are subject to the exclusive jurisdiction of the Seoul Central District Court as the court of first instance.',
    ja: '企業会員と当社との間の紛争は、ソウル中央地方裁判所を第一審の専属管轄裁判所とします。',
    zh: '企业会员与公司之间的争议，以首尔中央地方法院为第一审专属管辖法院。',
  },
  '소비자는 관련 법률에 따라 자신의 주소지를 관할하는 법원 또는 법정 소비자분쟁 해결절차를 이용할 수 있습니다.': {
    en: 'Consumers may use the court having jurisdiction over their address or statutory consumer dispute resolution procedures in accordance with applicable law.',
    ja: '消費者は、関連法令に従い、自身の住所地を管轄する裁判所または法定の消費者紛争解決手続を利用することができます。',
    zh: '消费者可依相关法律利用其住所地管辖法院或法定的消费者争议解决程序。',
  },
  '회사와 회원은 소송 전에 고객센터를 통한 협의를 우선적으로 시도합니다.': {
    en: 'The Company and members first attempt consultation through customer support before litigation.',
    ja: '当社と会員は、訴訟前にカスタマーセンターを通じた協議を優先的に試みます。',
    zh: '公司与会员在诉讼前优先尝试通过客户中心进行协商。',
  },
  '본 약관은 소비자에게 강제 중재나 집단소송 포기를 일률적으로 강요하지 않습니다.': {
    en: 'These Terms do not uniformly impose mandatory arbitration or a waiver of class actions on consumers.',
    ja: '本規約は、消費者に対して強制仲裁または集団訴訟の放棄を一律に強要しません。',
    zh: '本条款不一律强制消费者接受强制仲裁或放弃集体诉讼。',
  },

  '제41조 언어': { en: 'Article 41 Language', ja: '第41条 言語', zh: '第41条 语言' },
  '본 약관은 한국어와 영어 및 회사가 제공하는 다른 언어로 제공될 수 있습니다.': {
    en: 'These Terms may be provided in Korean, English, and other languages provided by the Company.',
    ja: '本規約は、韓国語、英語および当社が提供するその他の言語で提供される場合があります。',
    zh: '本条款可以韩语、英语及公司提供的其他语言提供。',
  },
  '대한민국 기업회원과의 관계에서는 한국어본을 기준으로 합니다.': {
    en: 'In relations with business members in the Republic of Korea, the Korean version prevails.',
    ja: '大韓民国の企業会員との関係においては、韓国語版を基準とします。',
    zh: '在与大韩民国企业会员的关系中，以韩语版本为准。',
  },
  '다른 국가의 소비자에게 현지 법률상 현지어본이 요구되거나 현지어본이 더 유리한 권리를 제공하는 경우 해당 법률과 현지어본이 우선할 수 있습니다.': {
    en: 'For consumers in other countries, where a local-language version is required by local law or provides more favorable rights, that law and the local-language version may prevail.',
    ja: '他国の消費者に対して、現地法令上、現地語版が要求され、または現地語版がより有利な権利を提供する場合、当該法律および現地語版が優先する場合があります。',
    zh: '对于其他国家的消费者，如当地法律要求当地语言版本或当地语言版本提供更有利的权利，则该法律及当地语言版本可优先适用。',
  },

  '제42조 기타': { en: 'Article 42 Miscellaneous', ja: '第42条 その他', zh: '第42条 其他' },
  '본 약관의 일부가 무효이더라도 나머지 조항은 계속 유효합니다.': {
    en: 'Even if part of these Terms is invalid, the remaining provisions remain in effect.',
    ja: '本規約の一部が無効であっても、残りの条項は引き続き有効です。',
    zh: '即使本条款的部分内容无效，其余条款仍继续有效。',
  },
  '회사가 권리를 즉시 행사하지 않았다고 해서 그 권리를 포기한 것은 아닙니다.': {
    en: 'The Company’s failure to exercise a right immediately does not constitute a waiver of that right.',
    ja: '当社が権利を直ちに行使しなかったとしても、当該権利を放棄したものではありません。',
    zh: '公司未立即行使权利，并不构成放弃该权利。',
  },
  '회원은 회사의 사전 서면 동의 없이 계약상 지위를 양도할 수 없습니다.': {
    en: 'Members may not assign their contractual position without the Company’s prior written consent.',
    ja: '会員は、当社の事前の書面による同意なく、契約上の地位を譲渡することはできません。',
    zh: '未经公司事先书面同意，会员不得转让其合同地位。',
  },
  '회사는 합병, 영업양도 또는 조직개편과 관련하여 회원의 권리를 부당하게 침해하지 않는 범위에서 계약상 지위를 이전할 수 있습니다.': {
    en: 'In connection with a merger, business transfer, or reorganization, the Company may transfer its contractual position to the extent that it does not unfairly infringe members’ rights.',
    ja: '当社は、合併、営業譲渡または組織再編に関連して、会員の権利を不当に侵害しない範囲で、契約上の地位を移転することができます。',
    zh: '公司可在合并、营业转让或组织重整中，在不当侵害会员权利的范围内转让其合同地位。',
  },
  '본 약관은 별도 서면 계약이 없는 한 서비스 이용에 관한 당사자 간 전체 합의를 구성합니다.': {
    en: 'Unless there is a separate written contract, these Terms constitute the entire agreement between the parties regarding use of the service.',
    ja: '本規約は、別途の書面契約がない限り、サービスの利用に関する当事者間の完全な合意を構成します。',
    zh: '除另有书面合同外，本条款构成双方之间关于服务使用的完整协议。',
  },

  '별지 1. AI 콘텐츠 안전정책': { en: 'Appendix 1. AI Content Safety Policy', ja: '別紙1．AIコンテンツ安全ポリシー', zh: '附件 1. AI 内容安全政策' },
  '1. 실제 인물 합성': { en: '1. Synthesis of Real Persons', ja: '1．実在の人物の合成', zh: '1. 真实人物合成' },
  '실제 인물의 얼굴 또는 음성을 이용하려면 다음 중 하나를 충족해야 합니다.': {
    en: 'To use a real person’s face or voice, one of the following must be satisfied.',
    ja: '実在の人物の顔または音声を利用するには、次のいずれかを満たさなければなりません。',
    zh: '使用真实人物的面部或声音，须满足以下之一。',
  },
  '본인의 얼굴 또는 음성': {
    en: 'One’s own face or voice',
    ja: '本人の顔または音声',
    zh: '本人的面部或声音',
  },
  '대상자로부터 명시적이고 증명 가능한 허가를 받은 경우': {
    en: 'Where explicit and verifiable permission has been obtained from the subject',
    ja: '対象者から明示的かつ証明可能な許可を得た場合',
    zh: '已从对象方取得明示且可证明的许可的情形',
  },
  '법률상 정당한 보도, 비평, 연구, 풍자 또는 공익 목적이 인정되는 경우': {
    en: 'Where a legally legitimate purpose of reporting, criticism, research, satire, or public interest is recognized',
    ja: '法律上正当な報道、批評、研究、風刺または公益目的が認められる場合',
    zh: '在法律上正当的报道、评论、研究、讽刺或公益目的获得认可的情形',
  },
  '라이선스가 부여된 배우, 모델 또는 스톡 자료': {
    en: 'Licensed actors, models, or stock materials',
    ja: 'ライセンスが付与された俳優、モデルまたはストック素材',
    zh: '已获授权的演员、模特或素材库资料',
  },
  '실제 인물이 하지 않은 말이나 행동을 한 것처럼 표현하면 AI 생성·조작 사실을 명확히 표시해야 합니다.': {
    en: 'If a real person is portrayed as making statements or taking actions they did not, the fact of AI generation or manipulation must be clearly labeled.',
    ja: '実在の人物が行っていない発言や行動を行ったかのように表現する場合、AI生成・加工の事実を明確に表示しなければなりません。',
    zh: '如表现为真实人物作出其未曾作出的言论或行为，须明确标示 AI 生成、处理的事实。',
  },
  '2. 미성년자': { en: '2. Minors', ja: '2．未成年者', zh: '2. 未成年人' },
  '미성년자가 포함된 콘텐츠는 보호자의 적법한 동의와 법적 근거가 있는 경우에만 처리할 수 있습니다.': {
    en: 'Content involving minors may be processed only where there is lawful consent of a guardian and a legal basis.',
    ja: '未成年者が含まれるコンテンツは、保護者の適法な同意および法的根拠がある場合にのみ処理することができます。',
    zh: '含有未成年人的内容，仅在具有监护人合法同意及法律依据时方可处理。',
  },
  '미성년자의 성적 묘사, 착취, 유인, 수치심 유발 또는 신체를 성인 콘텐츠에 합성하는 행위는 금지됩니다.': {
    en: 'The sexual depiction, exploitation, grooming, or humiliation of minors, or the synthesis of their bodies into adult content, is prohibited.',
    ja: '未成年者の性的描写、搾取、誘引、羞恥心の誘発または身体を成人コンテンツに合成する行為は禁止されます。',
    zh: '禁止对未成年人进行性描绘、剥削、诱骗、引发羞耻或将其身体合成到成人内容中的行为。',
  },
  '3. 정치·공공정보': { en: '3. Political and Public Information', ja: '3．政治・公共情報', zh: '3. 政治与公共信息' },
  '후보자, 선거관리기관, 정부기관 또는 언론사를 사칭하거나 유권자의 투표시간·장소·방법에 관해 허위정보를 전달해서는 안 됩니다.': {
    en: 'Impersonating candidates, election management bodies, government agencies, or media outlets, or conveying false information about voters’ voting time, place, or method, is prohibited.',
    ja: '候補者、選挙管理機関、政府機関または報道機関になりすまし、または有権者の投票時間・場所・方法に関して虚偽の情報を伝達してはなりません。',
    zh: '不得冒充候选人、选举管理机构、政府机构或媒体机构，或就选民的投票时间、地点、方式传达虚假信息。',
  },
  '공익·풍자 콘텐츠라도 합성 사실을 명확히 표시해야 합니다.': {
    en: 'Even for public-interest or satire content, the fact of synthesis must be clearly labeled.',
    ja: '公益・風刺コンテンツであっても、合成の事実を明確に表示しなければなりません。',
    zh: '即使是公益、讽刺内容，也须明确标示合成的事实。',
  },
  '4. 광고': { en: '4. Advertising', ja: '4．広告', zh: '4. 广告' },
  '전문가, 의료인, 유명인 또는 일반인이 실제로 사용·추천하지 않은 상품을 추천한 것처럼 합성해서는 안 됩니다.': {
    en: 'Content must not be synthesized to make it appear that an expert, medical professional, celebrity, or ordinary person has recommended a product they did not actually use or recommend.',
    ja: '専門家、医療従事者、著名人または一般人が実際に使用・推薦していない商品を推薦したかのように合成してはなりません。',
    zh: '不得合成使专家、医疗人员、名人或普通人看似推荐其实际未使用、未推荐的商品。',
  },
  'AI 모델이나 가상 인물을 광고에 사용하는 경우 관련 표시광고법과 업종별 광고 규정을 준수해야 합니다.': {
    en: 'When using AI models or virtual persons in advertising, the relevant labeling and advertising laws and industry-specific advertising regulations must be complied with.',
    ja: 'AIモデルや仮想人物を広告に使用する場合、関連する表示広告法および業種別の広告規制を遵守しなければなりません。',
    zh: '在广告中使用 AI 模型或虚拟人物时，须遵守相关标示广告法及各行业的广告规定。',
  },
  '5. 이의제기': { en: '5. Objections', ja: '5．異議申立て', zh: '5. 异议' },
  '콘텐츠 또는 계정 제한에 이의가 있는 회원은': {
    en: 'A member who objects to a content or account restriction may',
    ja: 'コンテンツまたはアカウントの制限に異議がある会員は、',
    zh: '对内容或账户限制有异议的会员，可',
  },
  '으로 소명자료를 제출할 수 있습니다.': {
    en: ' submit supporting materials to.',
    ja: 'に釈明資料を提出することができます。',
    zh: '提交说明材料至。',
  },

  '별지 2. CRM 및 광고 발송 운영정책': { en: 'Appendix 2. CRM and Advertising Sending Operational Policy', ja: '別紙2．CRMおよび広告送信運営ポリシー', zh: '附件 2. CRM 及广告发送运营政策' },
  '1. 허용되는 목록': { en: '1. Permitted Lists', ja: '1．許可されるリスト', zh: '1. 允许的名单' },
  '수신자가 직접 동의한 목록': {
    en: 'Lists to which recipients have directly consented',
    ja: '受信者が直接同意したリスト',
    zh: '接收人直接同意的名单',
  },
  '법률상 허용되는 기존 거래관계 목록': {
    en: 'Lists of existing business relationships permitted by law',
    ja: '法律上許容される既存の取引関係リスト',
    zh: '法律允许的现有交易关系名单',
  },
  '기업회원이 적법한 처리 근거를 입증할 수 있는 목록': {
    en: 'Lists for which the business member can demonstrate a lawful basis for processing',
    ja: '企業会員が適法な処理根拠を立証できるリスト',
    zh: '企业会员能够证明合法处理依据的名单',
  },
  '2. 금지되는 목록': { en: '2. Prohibited Lists', ja: '2．禁止されるリスト', zh: '2. 禁止的名单' },
  '구매하거나 임대한 명단': {
    en: 'Purchased or leased lists',
    ja: '購入または賃貸した名簿',
    zh: '购买或租用的名单',
  },
  '웹사이트, 지도, SNS 또는 온라인 게시판에서 수집한 연락처': {
    en: 'Contacts collected from websites, maps, social media, or online bulletin boards',
    ja: 'ウェブサイト、地図、SNSまたはオンライン掲示板から収集した連絡先',
    zh: '从网站、地图、社交媒体或在线论坛收集的联系人',
  },
  '자동으로 생성한 전화번호 또는 이메일': {
    en: 'Automatically generated phone numbers or emails',
    ja: '自動的に生成した電話番号またはメール',
    zh: '自动生成的电话号码或电子邮箱',
  },
  '수신동의 출처와 문구를 입증할 수 없는 목록': {
    en: 'Lists for which the source and wording of consent to receive cannot be proven',
    ja: '受信同意の出所および文言を立証できないリスト',
    zh: '无法证明接收同意来源与文案的名单',
  },
  '수신거부·철회 목록': {
    en: 'Opt-out and withdrawal lists',
    ja: '受信拒否・撤回リスト',
    zh: '拒收、撤回名单',
  },
  '아동·청소년 대상 무단 마케팅 목록': {
    en: 'Unauthorized marketing lists targeting children or youth',
    ja: '児童・青少年を対象とした無断マーケティングリスト',
    zh: '针对儿童、青少年的未经授权营销名单',
  },
  '출처가 불법이거나 불명확한 데이터': {
    en: 'Data whose source is illegal or unclear',
    ja: '出所が違法または不明確なデータ',
    zh: '来源非法或不明确的数据',
  },
  '3. 메시지 필수 요소': { en: '3. Mandatory Message Elements', ja: '3．メッセージの必須要素', zh: '3. 消息必备要素' },
  '광고성 메시지임을 알리는 표시': {
    en: 'A label indicating that it is an advertising message',
    ja: '広告性メッセージであることを知らせる表示',
    zh: '表明其为广告性消息的标示',
  },
  '실제 광고주 또는 발송자의 명칭': {
    en: 'The name of the actual advertiser or sender',
    ja: '実際の広告主または送信者の名称',
    zh: '实际广告主或发送者的名称',
  },
  '연락 가능한 정보': {
    en: 'Reachable contact information',
    ja: '連絡可能な情報',
    zh: '可联系的信息',
  },
  '이해하기 쉬운 수신거부 방법': {
    en: 'An easy-to-understand opt-out method',
    ja: '理解しやすい受信拒否方法',
    zh: '易于理解的拒收方式',
  },
  '수신거부 비용이 발생하지 않는 방법': {
    en: 'A method that does not incur opt-out costs',
    ja: '受信拒否費用が発生しない方法',
    zh: '不产生拒收费用的方式',
  },
  '허위 또는 기만적인 제목과 발신정보 금지': {
    en: 'Prohibition of false or deceptive subject lines and sender information',
    ja: '虚偽または欺瞞的な件名および発信情報の禁止',
    zh: '禁止虚假或欺骗性的标题与发送信息',
  },
  '단축URL 사용 시 목적지 투명성 확보': {
    en: 'Ensuring destination transparency when using shortened URLs',
    ja: '短縮URL使用時の遷移先の透明性確保',
    zh: '使用短链接时确保目标地址透明',
  },
  '4. 수신거부': { en: '4. Opt-Out', ja: '4．受信拒否', zh: '4. 拒收' },
  'STOP, 수신거부, 거부 등의 합리적인 철회 표현을 처리해야 합니다.': {
    en: 'Reasonable withdrawal expressions such as STOP, opt-out, and reject must be processed.',
    ja: 'STOP、受信拒否、拒否などの合理的な撤回表現を処理しなければなりません。',
    zh: '须处理 STOP、拒收、拒绝等合理的撤回表述。',
  },
  '철회 요청은 가능한 한 즉시 모든 관련 발송시스템에 반영해야 합니다.': {
    en: 'Withdrawal requests must be reflected in all relevant sending systems as immediately as possible.',
    ja: '撤回請求は、可能な限り直ちにすべての関連する送信システムに反映しなければなりません。',
    zh: '撤回请求须尽可能立即反映到所有相关发送系统。',
  },
  '철회자를 다시 마케팅 목록에 자동 등록하면 안 됩니다.': {
    en: 'Those who have withdrawn must not be automatically re-registered to marketing lists.',
    ja: '撤回者を再びマーケティングリストに自動登録してはなりません。',
    zh: '不得将已撤回者自动重新登记到营销名单。',
  },
  '철회 확인 메시지는 광고 내용을 포함하지 않는 1회의 처리 확인에 한정합니다.': {
    en: 'A withdrawal confirmation message is limited to a single processing confirmation that contains no advertising content.',
    ja: '撤回確認メッセージは、広告内容を含まない1回の処理確認に限定します。',
    zh: '撤回确认消息仅限于不含广告内容的一次处理确认。',
  },
  '수신거부 목록은 광고 방지를 위한 최소 정보만 보관합니다.': {
    en: 'Opt-out lists retain only the minimum information needed to prevent advertising.',
    ja: '受信拒否リストは、広告防止のための最小限の情報のみを保管します。',
    zh: '拒收名单仅保存防止广告所需的最小信息。',
  },
  '5. 계정 제재': { en: '5. Account Sanctions', ja: '5．アカウント制裁', zh: '5. 账户处罚' },
  '다음에 해당하면 발송 기능이 즉시 정지될 수 있습니다.': {
    en: 'The sending function may be suspended immediately in the following cases.',
    ja: '次に該当する場合、送信機能が直ちに停止される場合があります。',
    zh: '符合下列情形的，发送功能可能被立即停止。',
  },
  '신고율 또는 차단율이 비정상적으로 높은 경우': {
    en: 'Where the report rate or block rate is abnormally high',
    ja: '申告率またはブロック率が異常に高い場合',
    zh: '举报率或屏蔽率异常高的情形',
  },
  '발신번호를 위조한 경우': {
    en: 'Where the sender number has been falsified',
    ja: '発信番号を偽造した場合',
    zh: '伪造发送号码的情形',
  },
  '동의 증빙을 제출하지 못한 경우': {
    en: 'Where proof of consent could not be submitted',
    ja: '同意の証跡を提出できなかった場合',
    zh: '未能提交同意证明的情形',
  },
  '불법 상품 또는 사기성 광고를 발송한 경우': {
    en: 'Where illegal products or fraudulent advertisements were sent',
    ja: '違法商品または詐欺的広告を送信した場合',
    zh: '发送非法商品或欺诈性广告的情形',
  },
  '수신거부를 반복적으로 무시한 경우': {
    en: 'Where opt-outs were repeatedly ignored',
    ja: '受信拒否を反復的に無視した場合',
    zh: '反复无视拒收的情形',
  },
  '메시지 사업자 또는 규제기관이 차단을 요청한 경우': {
    en: 'Where a message provider or regulator has requested blocking',
    ja: 'メッセージ事業者または規制機関が遮断を要請した場合',
    zh: '消息服务商或监管机关请求屏蔽的情形',
  },
}

export function TermsContent() {
  const t = useT(M)
  return (
    <LegalShell title={t('이용약관')} effective={t('2026년 9월 1일')}>
      <p className="text-sm opacity-70">{t('본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.')}</p>
      <p className="lead">{t('본 이용약관은 주식회사 넥스트 바이전시가 제공하는 BYGENCY 서비스의 이용조건과 회사 및 회원의 권리·의무를 정합니다.')}</p>

      <h2>{t('제1조 회사 정보')}</h2>
      <ol>
        <li><strong>{t('상호:')}</strong> {t('주식회사 넥스트 바이전시')}</li>
        <li><strong>{t('대표자:')}</strong> {t('고선우')}</li>
        <li><strong>{t('사업자등록번호:')}</strong> <span className="ph">[추후 입력]</span></li>
        <li><strong>{t('통신판매업 신고번호:')}</strong> <span className="ph">[추후 입력]</span></li>
        <li><strong>{t('사업장 주소:')}</strong> <span className="ph">[추후 입력]</span></li>
        <li><strong>{t('대표 이메일:')}</strong> <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a></li>
        <li><strong>{t('고객센터:')}</strong> <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a></li>
        <li><strong>{t('개인정보 보호책임자 연락처:')}</strong> <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a></li>
        <li><strong>{t('호스팅 제공자:')}</strong> <span className="ph">[추후 입력]</span></li>
      </ol>

      <h2>{t('제2조 정의')}</h2>
      <ol>
        <li>{t('“BYGENCY”란 회사가 제공하는 노드 기반 AI 영상 제작 및 관련 SaaS 서비스를 말합니다.')}</li>
        <li>{t('“회원”이란 본 약관에 동의하고 계정을 개설한 개인 또는 법인을 말합니다.')}</li>
        <li>{t('“개인회원”이란 주로 개인적 목적으로 서비스를 이용하는 자연인을 말합니다.')}</li>
        <li>{t('“기업회원”이란 사업, 직업 또는 영리활동과 관련하여 서비스를 이용하는 법인, 단체, 개인사업자 또는 그 임직원을 말합니다.')}</li>
        <li>{t('“워크스페이스”란 여러 회원이 프로젝트, 파일, 크레딧, 고객정보 및 권한을 공동으로 관리하는 작업공간을 말합니다.')}</li>
        <li>{t('“입력물”이란 회원이 서비스에 입력하거나 업로드하는 문구, 프롬프트, 이미지, 영상, 음성, 음악, 파일, 고객정보, 노드 설정값 및 기타 자료를 말합니다.')}</li>
        <li>{t('“생성물”이란 AI 또는 자동화 기능을 통해 생성·변환·분석된 영상, 이미지, 음성, 텍스트, 분석자료 및 기타 결과물을 말합니다.')}</li>
        <li>{t('“고객 데이터”란 회원이 랜딩페이지, CRM, 협업 또는 메시지 발송 기능을 통해 수집·입력·업로드·관리하는 제3자의 개인정보 및 관련 자료를 말합니다.')}</li>
        <li>{t('“크레딧”이란 AI 생성, 분석, 메시지 발송 또는 특정 기능 사용량을 계산하기 위한 서비스 내 전자적 이용단위를 말합니다.')}</li>
        <li>{t('“구독”이란 월간 또는 연간 단위로 자동 갱신되는 유료 이용계약을 말합니다.')}</li>
        <li>{t('“외부 서비스”란 클라우드, 외부 AI 모델, 결제, 이메일, 문자, 카카오 비즈메시지, 분석, 검색 또는 소셜 로그인 등 제3자가 제공하는 서비스를 말합니다.')}</li>
      </ol>

      <h2>{t('제3조 약관의 게시 및 효력')}</h2>
      <ol>
        <li>{t('회사는 본 약관을 회원가입 화면과 서비스 내에서 쉽게 확인할 수 있도록 게시합니다.')}</li>
        <li>{t('회원은 체크박스 선택 또는 이에 준하는 전자적 방법으로 약관에 동의합니다.')}</li>
        <li>{t('회사는 회원이 약관을 저장하거나 출력할 수 있도록 제공합니다.')}</li>
        <li>{t('회원이 기업 또는 단체를 대신하여 가입하는 경우 해당 기업 또는 단체를 본 약관에 구속시킬 권한이 있음을 보증합니다.')}</li>
        <li>{t('개별 서비스 화면, 요금제 설명, 주문서, 기업계약서, 개인정보처리위탁 특약 및 별도 운영정책은 본 약관의 일부를 구성합니다.')}</li>
        <li>{t('개별 계약과 본 약관이 충돌하는 경우 개별 계약, 개인정보처리위탁 특약, 본 약관 순으로 적용합니다. 다만, 소비자에게 불리하게 법률상 권리를 제한하지 않습니다.')}</li>
      </ol>

      <h2>{t('제4조 약관의 변경')}</h2>
      <ol>
        <li>{t('회사는 관련 법령, 서비스 내용 및 사업정책의 변경에 따라 약관을 변경할 수 있습니다.')}</li>
        <li>{t('회원에게 불리하거나 중요한 변경은 원칙적으로 시행일 30일 전부터 알립니다.')}</li>
        <li>{t('단순한 오탈자 수정, 회원에게 유리한 변경 또는 긴급한 법령·보안상 변경은 법령이 허용하는 범위에서 더 짧은 기간으로 알릴 수 있습니다.')}</li>
        <li>{t('요금 인상, 무료 서비스의 유료전환, 개인정보 처리 목적의 실질적 확대 등 별도의 동의가 필요한 변경은 공지만으로 처리하지 않고 관련 법령에 따른 동의를 받습니다.')}</li>
        <li>{t('회원이 변경된 약관에 동의하지 않으면 시행일 전에 구독을 해지하고 회원 탈퇴를 요청할 수 있습니다.')}</li>
        <li>{t('단순히 서비스를 계속 이용했다는 사실만으로 법령상 명시적 동의가 필요한 사항에 동의한 것으로 간주하지 않습니다.')}</li>
      </ol>

      <h2>{t('제5조 서비스 이용자격')}</h2>
      <ol>
        <li>{t('회원은 만 18세 이상이어야 합니다.')}</li>
        <li>{t('만 18세 미만인 사람은 회원가입 및 서비스 이용이 허용되지 않습니다.')}</li>
        <li>{t('회원은 법률상 유효한 계약을 체결할 능력이 있어야 합니다.')}</li>
        <li>{t('국제 제재, 수출통제 또는 현지 법률에 따라 서비스 제공이 금지된 국가·지역 또는 대상자에게는 서비스가 제한될 수 있습니다.')}</li>
        <li>{t('회사는 특정 국가에서 현지 법률 준수를 위한 준비가 완료되지 않은 경우 신규 가입, 결제, CRM 발송 또는 특정 기능을 제한할 수 있습니다.')}</li>
      </ol>

      <h2>{t('제6조 회원가입')}</h2>
      <ol>
        <li>{t('회원은 정확하고 최신의 정보를 제공해야 합니다.')}</li>
        <li>{t('타인의 이메일, 전화번호, 사업자정보 또는 신원을 도용해서는 안 됩니다.')}</li>
        <li>{t('회사는 이메일 또는 휴대전화 인증, 기업 도메인 확인, 사업자 확인 및 추가 보안절차를 요구할 수 있습니다.')}</li>
        <li>
          {t('회사는 다음 사유가 있는 경우 가입을 거절하거나 사후에 취소할 수 있습니다.')}
          <ul>
            <li>{t('가. 허위정보를 제공한 경우')}</li>
            <li>{t('나. 타인의 정보를 무단으로 사용한 경우')}</li>
            <li>{t('다. 과거 중대한 약관 위반으로 이용이 제한된 경우')}</li>
            <li>{t('라. 불법 스팸, 사기 또는 권리침해 목적으로 가입한 정황이 있는 경우')}</li>
            <li>{t('마. 적용 법률상 서비스 제공이 금지된 경우')}</li>
            <li>{t('바. 시스템 안정성 또는 다른 이용자에게 중대한 위험을 초래할 우려가 있는 경우')}</li>
          </ul>
        </li>
      </ol>

      <h2>{t('제7조 계정 및 보안')}</h2>
      <ol>
        <li>{t('회원은 계정과 비밀번호를 안전하게 관리할 책임이 있습니다.')}</li>
        <li>{t('회원은 계정을 판매, 임대, 양도 또는 무단 공유해서는 안 됩니다.')}</li>
        <li>{t('기업용 요금제가 아닌 계정을 여러 사람이 공동으로 사용해서는 안 됩니다.')}</li>
        <li>{t('계정 도용 또는 보안사고가 의심되면 즉시 비밀번호를 변경하고 회사에 알려야 합니다.')}</li>
        <li>{t('회사는 비정상 로그인, 대량 발송, 자동화 공격 또는 계정 도용이 의심되는 경우 인증을 추가로 요구하거나 계정을 일시 제한할 수 있습니다.')}</li>
        <li>{t('회원의 고의 또는 과실 없이 발생한 사고에 관한 책임은 관련 법률에 따릅니다.')}</li>
      </ol>

      <h2>{t('제8조 워크스페이스와 팀 관리')}</h2>
      <ol>
        <li>{t('워크스페이스 소유자와 관리자는 구성원을 초대하고 역할과 접근권한을 설정할 수 있습니다.')}</li>
        <li>{t('기업회원은 최소 권한 원칙에 따라 고객 데이터, 결제정보 및 프로젝트 접근권한을 설정해야 합니다.')}</li>
        <li>{t('워크스페이스 소유자는 구성원이 생성·업로드한 자료에 접근하거나 이를 삭제할 수 있습니다.')}</li>
        <li>{t('구성원은 기업 워크스페이스에서 생성하거나 업로드한 자료가 해당 기업의 관리 대상이 될 수 있음을 이해해야 합니다.')}</li>
        <li>{t('퇴사자 또는 계약 종료자의 접근권한을 지체 없이 회수하는 것은 기업회원의 책임입니다.')}</li>
        <li>{t('워크스페이스 소유권 분쟁이 발생하면 회사는 객관적인 계약·결제·도메인·법인 증빙자료를 요구할 수 있습니다.')}</li>
      </ol>

      <h2>{t('제9조 서비스의 내용')}</h2>
      <p>{t('회사는 다음 기능의 전부 또는 일부를 제공합니다.')}</p>
      <ol>
        <li>{t('노드 기반 AI 영상 생성 및 편집')}</li>
        <li>{t('이미지·텍스트·음성 기반 영상 생성')}</li>
        <li>{t('AI 숏폼 및 광고 소재 제작')}</li>
        <li>{t('템플릿, 워크플로 및 자동화 기능')}</li>
        <li>{t('랜딩페이지 및 신청폼 제작')}</li>
        <li>{t('리드·고객정보 수집 및 CRM 관리')}</li>
        <li>{t('이메일, SMS, LMS, MMS 및 카카오 비즈메시지 발송 연동')}</li>
        <li>{t('캠페인 및 전환 성과 분석')}</li>
        <li>{t('팀 프로젝트, 댓글, 승인 및 권한관리')}</li>
        <li>{t('네이버 블로그 관련 공개 데이터 분석')}</li>
        <li>{t('네이버 플레이스 관련 공개 순위 추적 및 변화 분석')}</li>
        <li>{t('외부 API, 소셜 계정 및 광고 플랫폼 연동')}</li>
        <li>{t('크레딧 및 구독 관리')}</li>
        <li>{t('기타 회사가 추가하는 기능')}</li>
      </ol>
      <p>{t('네이버 관련 분석 기능은 네이버 또는 그 계열사가 보증하거나 후원하는 서비스가 아니며, 회사는 네이버의 공식 정책·API·접근 제한을 준수합니다.')}</p>

      <h2>{t('제10조 서비스 변경과 베타 기능')}</h2>
      <ol>
        <li>{t('회사는 기능을 추가, 개선, 변경 또는 종료할 수 있습니다.')}</li>
        <li>{t('회원의 유료 이용에 중대한 영향을 주는 기능 종료는 합리적인 기간 전에 알립니다.')}</li>
        <li>{t('베타, 미리보기 또는 실험 기능은 오류가 있거나 예고 없이 변경될 수 있습니다.')}</li>
        <li>{t('회사는 베타 기능을 중요한 의사결정이나 유일한 업무 수단으로 사용하지 말 것을 권고합니다.')}</li>
        <li>{t('유료 핵심 기능이 중대한 기간 동안 제공되지 않은 경우 회사는 적용 법률과 환불정책에 따라 이용기간 연장, 크레딧 복구 또는 환불을 제공합니다.')}</li>
      </ol>

      <h2>{t('제11조 AI 서비스의 특성')}</h2>
      <ol>
        <li>{t('AI 생성물은 확률적 방법으로 만들어지며, 동일한 입력에도 다른 결과가 생성될 수 있습니다.')}</li>
        <li>{t('생성물은 사실과 다르거나 부정확하거나 불완전할 수 있습니다.')}</li>
        <li>{t('생성물이 기존 콘텐츠와 유사하게 만들어질 가능성을 완전히 배제할 수 없습니다.')}</li>
        <li>{t('회사는 생성물의 독창성, 특정 목적 적합성, 법적 이용 가능성, 상업적 성공, 광고 성과 또는 제3자의 권리를 침해하지 않는다는 점을 보증하지 않습니다.')}</li>
        <li>{t('회원은 생성물을 공개·배포·광고·판매하기 전에 사실관계, 품질, 저작권, 초상권, 퍼블리시티권, 상표권, 음원 권리 및 표시의무를 직접 검토해야 합니다.')}</li>
        <li>{t('의료, 법률, 금융, 채용, 보험, 신용, 교육입학 또는 공공서비스 제공에 영향을 미치는 중요한 판단을 AI 생성물만으로 내려서는 안 됩니다.')}</li>
        <li>{t('회사는 안전, 권리보호 및 법령 준수를 위해 입력물 또는 생성물을 자동 또는 수동 방식으로 검사할 수 있습니다.')}</li>
      </ol>

      <h2>{t('제12조 AI 이용 고지와 생성물 표시')}</h2>
      <ol>
        <li>{t('회사는 서비스가 생성형 AI를 이용한다는 사실을 이용자가 알 수 있도록 표시합니다.')}</li>
        <li>{t('회사는 관련 법률과 기술 표준에 따라 생성물에 사람이 인식할 수 있는 표시 또는 기계 판독 가능한 메타데이터·워터마크를 적용할 수 있습니다.')}</li>
        <li>{t('회원은 AI로 생성되거나 실제처럼 조작된 영상, 이미지 또는 음성을 공개할 때 적용 법률에 따른 “AI 생성”, “AI로 조작됨” 또는 이에 준하는 표시를 해야 합니다.')}</li>
        <li>{t('실제 인물의 얼굴, 음성 또는 행동을 합성한 콘텐츠는 시청자가 인공지능으로 생성·조작된 사실을 명확히 알 수 있도록 표시해야 합니다.')}</li>
        <li>{t('풍자, 예술 또는 창작물이라도 이용자가 실제 사실로 오인할 위험이 있는 경우 적절한 표시를 해야 합니다.')}</li>
        <li>{t('회원은 워터마크, 출처정보, 안전표시 또는 기계 판독 가능한 출처정보를 제거하거나 훼손해서는 안 됩니다. 다만, 법률 또는 회사가 명시적으로 허용한 경우는 제외합니다.')}</li>
      </ol>

      <h2>{t('제13조 입력물의 권리')}</h2>
      <ol>
        <li>{t('회원은 자신이 보유한 입력물에 관한 권리를 유지합니다.')}</li>
        <li>{t('회원은 입력물을 서비스에 제공할 권한과 적법한 처리 근거가 있음을 보증합니다.')}</li>
        <li>{t('회원은 입력물에 포함된 인물의 얼굴, 음성, 개인정보, 저작물, 상표, 음악 및 기타 권리에 대해 필요한 허가를 확보해야 합니다.')}</li>
        <li>{t('회원은 미성년자의 얼굴·음성·개인정보를 포함한 콘텐츠를 처리할 경우 보호자의 유효한 동의와 현지 법률상 요건을 충족해야 합니다.')}</li>
        <li>{t('회사는 서비스 제공, 생성 요청 처리, 저장, 백업, 보안, 오류 수정 및 법적 의무 이행에 필요한 범위에서만 입력물을 이용할 수 있는 제한적 권한을 부여받습니다.')}</li>
        <li>{t('회사는 회원의 별도 선택 동의가 없는 한 입력물과 생성물을 범용 AI 모델 학습 목적으로 사용하지 않습니다.')}</li>
        <li>{t('고객 데이터는 어떠한 경우에도 회사의 범용 AI 모델 학습이나 광고 타기팅에 사용하지 않습니다.')}</li>
      </ol>

      <h2>{t('제14조 생성물의 권리')}</h2>
      <ol>
        <li>{t('관련 법률과 외부 AI 사업자의 조건이 허용하는 범위에서 회사는 회원이 적법하게 생성한 생성물에 대해 소유권을 주장하지 않습니다.')}</li>
        <li>{t('생성물에 저작권 또는 독점권이 성립하는지 여부는 국가, 생성 방식 및 사람의 창작적 기여도에 따라 달라질 수 있습니다.')}</li>
        <li>{t('회사는 동일하거나 유사한 생성물이 다른 회원에게 생성되지 않는다는 독점성을 보장하지 않습니다.')}</li>
        <li>{t('회원은 생성물을 상업적으로 이용하기 전에 요금제별 이용범위와 외부 모델·음원·템플릿의 라이선스를 확인해야 합니다.')}</li>
        <li>{t('무료 또는 체험 요금제의 생성물에는 워터마크, 해상도, 상업적 이용 또는 다운로드 제한이 적용될 수 있으며 해당 제한은 결제 전에 표시합니다.')}</li>
      </ol>

      <h2>{t('제15조 금지되는 콘텐츠와 행위')}</h2>
      <p>{t('회원은 서비스를 이용하여 다음 행위를 해서는 안 됩니다.')}</p>
      <ol>
        <li>{t('법령을 위반하거나 범죄를 조장하는 행위')}</li>
        <li>{t('아동·청소년 성착취물 또는 미성년자를 성적으로 묘사하는 콘텐츠')}</li>
        <li>{t('동의 없는 성적 합성물, 불법 촬영물 또는 성적 괴롭힘')}</li>
        <li>{t('인물의 동의나 적법한 근거 없이 얼굴 또는 음성을 복제하여 사칭·기망하는 행위')}</li>
        <li>{t('사기, 피싱, 투자사기, 신분도용 또는 허위 추천 콘텐츠')}</li>
        <li>{t('선거 방해, 유권자 기망 또는 공공기관 사칭')}</li>
        <li>{t('실제 인물이 하지 않은 발언이나 행동을 한 것처럼 오인시키는 콘텐츠를 표시 없이 공개하는 행위')}</li>
        <li>{t('폭력, 테러, 자살 또는 심각한 위해를 구체적으로 조장하는 행위')}</li>
        <li>{t('명예훼손, 협박, 스토킹, 괴롭힘 또는 차별')}</li>
        <li>{t('타인의 저작권, 상표권, 초상권, 퍼블리시티권, 영업비밀 또는 개인정보 침해')}</li>
        <li>{t('의료인, 전문가, 공공기관 또는 유명인이 제품을 보증한 것처럼 허위로 합성하는 행위')}</li>
        <li>{t('스팸, 불법 광고, 무단 전화권유 또는 수신거부 회피')}</li>
        <li>{t('구매·임대·스크래핑·자동생성한 연락처로 메시지를 발송하는 행위')}</li>
        <li>{t('악성코드, 랜섬웨어, 계정탈취 또는 보안 공격')}</li>
        <li>{t('서비스의 안전장치, 사용량 제한, 워터마크 또는 접근통제를 우회하는 행위')}</li>
        <li>{t('모델 또는 시스템을 역설계하거나 무단으로 데이터를 대량 추출하는 행위')}</li>
        <li>{t('서비스에 과도한 부하를 발생시키는 자동화 요청')}</li>
        <li>{t('차별적 채용·신용·주택·보험·교육 판단을 자동화하는 행위')}</li>
        <li>{t('불법 생체인식, 대규모 감시 또는 개인 추적')}</li>
        <li>{t('회사가 공개한 추가 안전정책을 위반하는 행위')}</li>
      </ol>

      <h2>{t('제16조 콘텐츠 검토와 조치')}</h2>
      <ol>
        <li>{t('회사는 모든 콘텐츠를 사전에 검토할 의무를 부담하지 않습니다.')}</li>
        <li>{t('회사는 위법 또는 약관 위반이 의심되는 입력물·생성물을 차단, 삭제, 격리 또는 검토할 수 있습니다.')}</li>
        <li>{t('급박한 피해를 막기 위해 필요한 경우 사전 통지 없이 조치할 수 있습니다.')}</li>
        <li>{t('회사는 가능한 경우 회원에게 조치 사유와 이의제기 방법을 알립니다.')}</li>
        <li>{t('회사는 법령에 따라 수사기관, 법원 또는 규제기관의 적법한 요청에 협조할 수 있습니다.')}</li>
        <li>{t('회원은 권리침해 신고에 필요한 정보를 성실히 제출해야 합니다.')}</li>
      </ol>

      <h2>{t('제17조 CRM 및 랜딩페이지 서비스의 역할')}</h2>
      <ol>
        <li>{t('회원이 랜딩페이지와 CRM을 통해 고객 데이터를 수집·이용하는 경우 회원은 원칙적으로 개인정보처리자 또는 데이터 컨트롤러이고, 회사는 회원의 지시에 따라 처리하는 수탁자 또는 프로세서입니다.')}</li>
        <li>{t('회원은 고객 데이터 처리의 목적, 법적 근거, 동의문구, 보유기간 및 정보주체 권리 대응에 책임을 집니다.')}</li>
        <li>{t('회사가 제공하는 동의문구나 템플릿은 일반적 작성 편의를 위한 것이며 회원의 업종과 국가에 대한 법률자문이 아닙니다.')}</li>
        <li>{t('회원은 자신의 상호, 연락처 및 개인정보처리방침을 랜딩페이지에 명확히 표시해야 합니다.')}</li>
        <li>{t('회사는 회원을 대신하여 고객 데이터의 적법성을 판단하거나 동의를 자동으로 유효하게 만들어 주지 않습니다.')}</li>
      </ol>

      <h2>{t('제18조 광고성 정보 발송')}</h2>
      <ol>
        <li>{t('회원은 광고성 정보를 보내기 전에 수신자의 유효한 동의를 확보해야 합니다.')}</li>
        <li>{t('회원은 수신동의를 입증할 수 있는 원문, 일시, IP, 채널, 발송주체 및 철회이력을 보관해야 합니다.')}</li>
        <li>{t('회원은 수신거부, 동의 철회 및 DNC 등록 여부를 발송 전에 확인해야 합니다.')}</li>
        <li>{t('회원은 발신자의 정확한 명칭과 연락처, 광고 표시 및 무료 수신거부 방법을 메시지에 포함해야 합니다.')}</li>
        <li>{t('대한민국 수신자에게 야간 광고를 발송하는 경우 별도의 야간 광고 수신동의를 확보해야 합니다.')}</li>
        <li>{t('회원은 대한민국 광고 수신동의 여부를 법령상 주기에 따라 확인해야 합니다.')}</li>
        <li>{t('캐나다 수신자에게 상업적 전자메시지를 보내는 경우 적용 법률상 동의, 발신자 정보 및 수신거부 요건을 충족해야 합니다.')}</li>
        <li>{t('호주 수신자에게 상업적 메시지를 보내는 경우 동의 증빙을 보유하고 발신자 정보와 유효한 수신거부 방법을 제공해야 합니다.')}</li>
        <li>{t('싱가포르 전화번호에 마케팅 메시지를 보내는 경우 유효한 동의가 없는 한 DNC 등록부 확인 등 현지 요건을 준수해야 합니다.')}</li>
        <li>{t('미국 수신자에게 자동 문자·전화 마케팅을 보내는 경우 필요한 서면동의, 발송자별 동의 및 합리적인 방식의 철회 요청을 처리해야 합니다.')}</li>
        <li>{t('회사는 수신거부 키워드, 차단목록, 발송한도, 발신번호 인증 및 사전검수 기능을 적용할 수 있습니다.')}</li>
        <li>{t('회사는 위법 발송이 의심되면 발송을 중단하고 회원에게 동의 증빙을 요구할 수 있습니다.')}</li>
      </ol>

      <h2>{t('제19조 알림톡과 정보성 메시지')}</h2>
      <ol>
        <li>{t('알림톡은 주문, 결제, 배송, 예약, 계약, 보안, 계정 및 서비스 이용에 필요한 정보성 메시지에 사용해야 합니다.')}</li>
        <li>{t('쿠폰, 할인, 이벤트, 구매 권유 또는 서비스 홍보가 포함되면 광고성 정보로 분류될 수 있습니다.')}</li>
        <li>{t('회원은 광고성 메시지를 정보성 메시지로 위장해서는 안 됩니다.')}</li>
        <li>{t('회사 또는 메시지 제공자는 템플릿을 심사하거나 발송을 거절할 수 있습니다.')}</li>
        <li>{t('심사를 통과했다는 사실만으로 메시지가 법적으로 적법하다는 보장은 되지 않습니다.')}</li>
      </ol>

      <h2>{t('제20조 분석 및 순위 추적')}</h2>
      <ol>
        <li>{t('검색, 블로그, 플레이스 및 마케팅 분석 결과는 수집 시점과 데이터 접근 가능성에 따라 달라질 수 있습니다.')}</li>
        <li>{t('회사는 특정 검색순위, 노출, 매출, 조회수 또는 광고성과를 보장하지 않습니다.')}</li>
        <li>{t('외부 플랫폼의 정책, 알고리즘, API 또는 화면구조 변경으로 분석이 지연되거나 중단될 수 있습니다.')}</li>
        <li>{t('회원은 분석 결과를 참고자료로만 사용하고 중요한 의사결정을 별도로 검토해야 합니다.')}</li>
        <li>{t('회원은 외부 플랫폼의 접근제한, 로봇정책, API 약관 및 상표정책을 준수해야 합니다.')}</li>
      </ol>

      <h2>{t('제21조 외부 서비스')}</h2>
      <ol>
        <li>{t('서비스 일부는 외부 AI, 클라우드, 결제, 통신 및 분석 제공자에 의존할 수 있습니다.')}</li>
        <li>{t('외부 서비스에는 해당 제공자의 별도 약관과 정책이 적용될 수 있습니다.')}</li>
        <li>{t('회사는 회원에게 중대한 영향을 미치는 주요 외부 서비스와 개인정보 처리현황을 개인정보처리방침 또는 재수탁자 목록에 공개합니다.')}</li>
        <li>{t('외부 서비스의 장애로 BYGENCY 기능이 영향을 받을 수 있습니다.')}</li>
        <li>{t('회사는 합리적인 대체조치를 취하지만 외부 사업자의 통제 범위를 벗어난 장애를 완전히 방지한다고 보증하지 않습니다.')}</li>
      </ol>

      <h2>{t('제22조 요금제')}</h2>
      <ol>
        <li>{t('서비스는 무료, 체험, 크레딧, 월간 구독, 연간 구독 또는 기업계약 방식으로 제공될 수 있습니다.')}</li>
        <li>{t('가격, 통화, 세금, 제공 크레딧, 기능 제한, 이용기간 및 자동갱신 여부는 결제 전에 표시합니다.')}</li>
        <li>{t('회원은 결제 전에 최종 결제금액을 확인해야 합니다.')}</li>
        <li>{t('기업회원의 견적서, 주문서 또는 별도 계약에는 별도 가격과 조건이 적용될 수 있습니다.')}</li>
        <li>{t('표시 오류가 명백한 경우 회사는 결제를 취소하고 전액 환불하거나 회원의 동의를 받아 올바른 가격으로 계약을 체결할 수 있습니다.')}</li>
      </ol>

      <h2>{t('제23조 크레딧')}</h2>
      <ol>
        <li>{t('크레딧은 서비스 이용량을 계산하기 위한 단위이며 현금, 예금, 전자화폐 또는 투자상품이 아닙니다.')}</li>
        <li>{t('크레딧은 회사가 명시적으로 허용한 경우를 제외하고 양도, 판매 또는 현금 교환할 수 없습니다.')}</li>
        <li>{t('크레딧 소모량은 모델, 해상도, 영상 길이, 처리시간, 메시지 유형 및 기능에 따라 달라질 수 있습니다.')}</li>
        <li>{t('예상 소모 크레딧은 실행 전에 가능한 범위에서 표시합니다.')}</li>
        <li>{t('생성 작업이 기술적 오류로 완료되지 않으면 사용된 크레딧을 자동 또는 확인 후 복구합니다.')}</li>
        <li>{t('회원의 입력 오류, 결과에 대한 단순 불만, 금지 콘텐츠 요청 또는 회원이 중도 취소한 작업은 법률이나 별도 정책에서 달리 정하지 않는 한 크레딧 복구 대상이 아닐 수 있습니다.')}</li>
        <li><strong>{t('유료 크레딧의 유효기간:')}</strong> <span className="ph">[추후 입력]</span></li>
        <li>{t('보너스·이벤트 크레딧의 유효기간: 지급 화면에 별도 표시')}</li>
        <li>{t('유효기간은 구매 전에 명확히 표시하며, 회사가 임의로 이미 지급된 유료 크레딧의 유효기간을 소급하여 단축하지 않습니다.')}</li>
        <li>{t('구독 해지 시 이미 구매한 별도 유료 크레딧의 처리방법은 구매 당시 고지한 조건을 따릅니다.')}</li>
      </ol>

      <h2>{t('제24조 정기구독과 자동갱신')}</h2>
      <ol>
        <li>{t('월간 또는 연간 구독은 회원이 해지할 때까지 자동으로 갱신됩니다.')}</li>
        <li>{t('결제주기, 다음 결제일 및 다음 결제금액은 결제 화면과 계정 설정에서 확인할 수 있습니다.')}</li>
        <li>{t('회원은 다음 갱신 전에 계정 설정에서 구독을 해지할 수 있습니다.')}</li>
        <li>{t('해지는 원칙적으로 다음 결제주기부터 효력이 발생하며 현재 결제기간 종료일까지 서비스를 이용할 수 있습니다.')}</li>
        <li>{t('회사는 법률상 요구되는 경우 갱신 전 알림을 제공합니다.')}</li>
        <li>{t('결제 실패 시 회사는 합리적인 기간 동안 결제를 재시도하고 회원에게 결제수단 변경을 요청할 수 있습니다.')}</li>
        <li>{t('결제가 계속 실패하면 구독 또는 유료 기능이 제한될 수 있습니다.')}</li>
        <li>{t('가격 인상 또는 무료에서 유료로 전환하는 경우 회사는 관련 법률에 따라 사전에 변경내용을 알리고 필요한 동의를 받습니다.')}</li>
        <li>{t('회원의 명시적 동의 없이 추가 유료상품을 결제하거나 미리 선택된 부가상품을 청구하지 않습니다.')}</li>
      </ol>

      <h2>{t('제25조 세금과 환율')}</h2>
      <ol>
        <li>{t('표시가격에 세금이 포함되는지 여부를 결제 전에 표시합니다.')}</li>
        <li>{t('국제결제에는 카드사 또는 금융기관의 환율과 해외결제 수수료가 적용될 수 있습니다.')}</li>
        <li>{t('기업회원은 세금계산서, 송장 또는 부가가치세 번호 등 필요한 정보를 정확히 제공해야 합니다.')}</li>
        <li>{t('원천징수 의무가 있는 기업회원은 법률상 필요한 증빙을 회사에 제공해야 합니다.')}</li>
      </ol>

      <h2>{t('제26조 대한민국 소비자의 청약철회')}</h2>
      <ol>
        <li>{t('대한민국 소비자는 관계 법령에서 정한 기간과 방법에 따라 청약철회를 할 수 있습니다.')}</li>
        <li>{t('디지털콘텐츠 또는 서비스의 제공이 개시되지 않은 경우 결제일 또는 계약내용을 받은 날부터 7일 이내에 청약철회를 요청할 수 있습니다.')}</li>
        <li>{t('회원의 명시적 요청으로 디지털콘텐츠 또는 크레딧 제공이 개시되고, 회사가 청약철회 제한 사실을 명확히 고지하며 시험사용 또는 이에 준하는 조치를 제공한 경우 법률이 허용하는 범위에서 청약철회가 제한될 수 있습니다.')}</li>
        <li>{t('가분적인 서비스 또는 크레딧 중 사용되지 않은 부분은 적용 법률에 따라 환불 대상이 될 수 있습니다.')}</li>
        <li>{t('서비스 내용이 표시·광고 또는 계약과 다르거나 중대한 하자가 있는 경우 회원은 법령에 따른 기간 내 계약해제, 환불 또는 보완을 요구할 수 있습니다.')}</li>
        <li>{t('청약철회를 부당하게 방해하는 표시나 절차를 두지 않습니다.')}</li>
      </ol>

      <h2>{t('제27조 EU·EEA·영국 소비자의 철회권')}</h2>
      <ol>
        <li>{t('EU·EEA 또는 영국의 소비자는 적용 법률에 따라 온라인 서비스 계약 체결일부터 원칙적으로 14일 이내에 철회할 수 있습니다.')}</li>
        <li>{t('소비자가 철회기간 중 서비스 제공을 즉시 시작해 달라고 명시적으로 요청한 경우, 철회 시점까지 제공된 서비스에 상응하는 금액이 공제될 수 있습니다.')}</li>
        <li>{t('디지털 콘텐츠 또는 크레딧의 즉시 제공에 소비자가 명시적으로 동의하고 철회권 제한 또는 상실을 확인한 경우 적용 법률이 허용하는 범위에서 철회권이 제한될 수 있습니다.')}</li>
        <li>{t('회사는 동의 내용을 내구성 있는 매체로 제공하고 관련 기록을 보관합니다.')}</li>
        <li>{t('현지의 강행 소비자보호법이 본 조보다 유리한 권리를 제공하면 해당 법률이 우선합니다.')}</li>
      </ol>

      <h2>{t('제28조 일반 환불정책')}</h2>
      <ol>
        <li>{t('유료 서비스를 전혀 사용하지 않은 회원이 결제 후 7일 이내에 환불을 요청하면 법령 및 결제수단상 제한이 없는 한 전액 환불합니다.')}</li>
        <li>{t('크레딧이나 유료 기능을 일부 사용한 경우 사용한 부분의 정상가격 또는 합리적인 비례금액을 공제하고 나머지를 환불할 수 있습니다.')}</li>
        <li>{t('무료 또는 보너스 크레딧은 환불금액에 포함되지 않습니다.')}</li>
        <li>{t('회사의 귀책으로 서비스를 이용하지 못한 경우 해당 기간, 영향받은 기능 및 장애 정도에 따라 이용기간 연장, 크레딧 복구 또는 환불을 제공합니다.')}</li>
        <li>{t('회원의 단순 변심, 기대와 다른 생성 결과, 권리 없는 콘텐츠 업로드 또는 약관 위반으로 사용이 제한된 경우 환불이 제한될 수 있습니다. 다만, 법률상 환불권을 배제하지 않습니다.')}</li>
        <li>{t('연간 구독의 중도해지는 사용기간, 제공된 할인, 사용 크레딧 및 현지 소비자법을 고려해 환불액을 계산합니다.')}</li>
        <li>{t('환불은 원칙적으로 원래 결제수단으로 처리합니다.')}</li>
        <li>{t('환불 처리기간은 결제사와 금융기관의 사정에 따라 달라질 수 있으며 회사는 처리 요청 사실을 회원에게 알립니다.')}</li>
        <li>{t('회사의 고의 또는 중대한 과실, 법정 청약철회, 중대한 서비스 하자에 관한 책임을 본 조로 제한하지 않습니다.')}</li>
      </ol>

      <h2>{t('제29조 회원의 해지 및 탈퇴')}</h2>
      <ol>
        <li>{t('회원은 계정 설정에서 구독을 해지하거나 회원 탈퇴를 신청할 수 있습니다.')}</li>
        <li>{t('탈퇴 전에 프로젝트, 생성물, 고객 데이터 및 결제자료를 내보내야 합니다.')}</li>
        <li>{t('탈퇴 신청 시 진행 중인 생성 작업과 예약 발송은 취소될 수 있습니다.')}</li>
        <li>{t('회사는 탈퇴 후 30일 동안 복구기간을 제공한 뒤 데이터를 삭제할 수 있습니다.')}</li>
        <li>{t('법령상 보존이 필요한 정보, 사기·보안 조사자료, 수신거부 목록 및 분쟁 관련 자료는 필요한 범위에서 별도로 보관할 수 있습니다.')}</li>
        <li>{t('수신거부 목록은 다시 광고를 보내지 않기 위한 최소한의 정보로 보관할 수 있습니다.')}</li>
      </ol>

      <h2>{t('제30조 회사의 이용제한 및 해지')}</h2>
      <ol>
        <li>
          {t('회사는 다음 사유가 있는 경우 경고, 기능 제한, 발송 정지, 계정 정지 또는 계약 해지를 할 수 있습니다.')}
          <ul>
            <li>{t('가. 본 약관 또는 법령 위반')}</li>
            <li>{t('나. 동의 없는 대량 광고 발송')}</li>
            <li>{t('다. 결제 사기 또는 부당한 지급거절')}</li>
            <li>{t('라. 타인의 권리 또는 안전에 중대한 침해')}</li>
            <li>{t('마. 시스템 공격 또는 제한 우회')}</li>
            <li>{t('바. 국제제재 또는 법적 명령')}</li>
            <li>{t('사. 반복적인 권리침해 신고')}</li>
            <li>{t('아. 서비스 또는 다른 이용자에게 즉각적인 위험 발생')}</li>
          </ul>
        </li>
        <li>{t('긴급하지 않은 경우 회사는 원칙적으로 사전 통지와 시정 기회를 제공합니다.')}</li>
        <li>{t('긴급한 피해, 법적 명령, 보안사고 또는 증거인멸 위험이 있는 경우 사전 통지 없이 조치할 수 있습니다.')}</li>
        <li>{t('회원은 회사의 조치에 이의를 제기할 수 있습니다.')}</li>
        <li>{t('약관 위반으로 계약이 해지되더라도 소비자에게 부여되는 강행법상 환불권은 제한되지 않습니다.')}</li>
      </ol>

      <h2>{t('제31조 서비스 가용성과 유지보수')}</h2>
      <ol>
        <li>{t('회사는 서비스의 안정적 제공을 위해 합리적으로 노력합니다.')}</li>
        <li>{t('점검, 업데이트, 외부 서비스 장애, 통신 장애, 천재지변, 전쟁, 규제조치 또는 보안사고로 서비스가 일시 중단될 수 있습니다.')}</li>
        <li>{t('예정된 점검은 가능한 범위에서 미리 알립니다.')}</li>
        <li>{t('별도 기업용 SLA가 없는 한 특정 가동률 또는 무중단 서비스를 보증하지 않습니다.')}</li>
        <li>{t('회사는 데이터 손실 방지를 위해 합리적인 백업을 수행하지만 회원도 중요한 자료를 별도로 보관해야 합니다.')}</li>
      </ol>

      <h2>{t('제32조 보증의 제한')}</h2>
      <ol>
        <li>{t('회사는 관련 법률상 배제할 수 없는 보증과 책임을 배제하지 않습니다.')}</li>
        <li>{t('법률이 허용하는 범위에서 서비스는 현재 제공 가능한 상태로 제공됩니다.')}</li>
        <li>{t('회사는 특정 매출, 순위, 조회수, 전환율, 광고성과 또는 사업성과를 보증하지 않습니다.')}</li>
        <li>{t('회사는 회원이 제공한 자료의 정확성 또는 적법성을 보증하지 않습니다.')}</li>
        <li>{t('무료·베타 기능은 유료 핵심 서비스보다 제한된 보증이 적용될 수 있습니다.')}</li>
      </ol>

      <h2>{t('제33조 책임의 범위')}</h2>
      <ol>
        <li>{t('회사의 고의 또는 중대한 과실로 발생한 손해, 생명·신체 손해 및 법률상 제한할 수 없는 책임은 제한하지 않습니다.')}</li>
        <li>{t('개인 소비자에 대해서는 해당 국가의 강행 소비자보호법이 우선합니다.')}</li>
        <li>{t('기업회원에 대해 법률이 허용하는 범위에서 회사의 총 책임은 손해 발생 원인이 된 사건 직전 12개월 동안 기업회원이 회사에 실제 지급한 이용료 총액을 한도로 합니다.')}</li>
        <li>{t('기업회원에 대해 회사는 특별손해, 간접손해, 결과손해, 영업손실, 기대이익 상실 또는 데이터 손실에 책임을 지지 않습니다. 다만, 회사가 해당 손해를 고의 또는 중대한 과실로 발생시킨 경우와 법률상 제한할 수 없는 경우는 제외합니다.')}</li>
        <li>{t('여러 청구가 발생하더라도 동일한 원인 또는 관련된 일련의 사건에서 발생한 경우 하나의 책임한도가 적용될 수 있습니다.')}</li>
        <li>{t('본 조는 회사의 고의, 중대한 과실, 비밀유지 위반, 회사의 지식재산권 침해 또는 법률상 제한이 금지되는 책임에는 적용되지 않습니다.')}</li>
      </ol>

      <h2>{t('제34조 기업회원의 배상책임')}</h2>
      <ol>
        <li>
          {t('기업회원은 다음 사유로 회사 또는 제3자에게 발생한 손해와 합리적인 비용을 배상해야 합니다.')}
          <ul>
            <li>{t('가. 고객 데이터를 적법한 근거 없이 수집·사용한 경우')}</li>
            <li>{t('나. 동의 없는 광고 또는 불법 스팸을 발송한 경우')}</li>
            <li>{t('다. 입력물 또는 생성물이 제3자의 권리를 침해한 경우')}</li>
            <li>{t('라. 불법 콘텐츠 또는 사칭 콘텐츠를 제작·배포한 경우')}</li>
            <li>{t('마. 기업회원의 법령 또는 약관 위반')}</li>
          </ul>
        </li>
        <li>{t('회사는 청구 사실을 기업회원에게 알리고 방어에 합리적으로 협조합니다.')}</li>
        <li>{t('기업회원은 회사의 동의 없이 회사에 의무나 책임을 부담시키는 합의를 해서는 안 됩니다.')}</li>
        <li>{t('본 조는 개인 소비자에게 적용되지 않습니다.')}</li>
      </ol>

      <h2>{t('제35조 비밀유지')}</h2>
      <ol>
        <li>{t('각 당사자는 상대방으로부터 비공개로 제공받은 기술, 영업, 고객 및 보안정보를 비밀로 유지합니다.')}</li>
        <li>{t('공개된 정보, 수령 전에 적법하게 보유한 정보, 독자 개발한 정보 또는 제3자로부터 적법하게 받은 정보는 비밀정보에서 제외합니다.')}</li>
        <li>{t('법률 또는 법원의 명령으로 공개해야 하는 경우 가능한 범위에서 상대방에게 사전 통지합니다.')}</li>
        <li>{t('회사 직원과 수탁자는 업무상 필요한 범위에서만 비밀정보에 접근하며 비밀유지의무를 부담합니다.')}</li>
      </ol>

      <h2>{t('제36조 지식재산권')}</h2>
      <ol>
        <li>{t('서비스, 소프트웨어, UI, 노드 시스템, 템플릿, 상표 및 회사가 제공하는 콘텐츠에 관한 권리는 회사 또는 정당한 권리자에게 있습니다.')}</li>
        <li>{t('회원은 계약기간 동안 서비스 이용에 필요한 비독점적이고 양도 불가능한 제한적 이용권을 부여받습니다.')}</li>
        <li>{t('회원은 서비스의 복제, 재판매, 역설계, 경쟁 모델 학습을 위한 대량 추출 또는 상표의 무단 사용을 해서는 안 됩니다.')}</li>
        <li>{t('회원이 개선 의견을 제공하는 경우 회사는 개인을 식별하지 않는 범위에서 이를 서비스 개선에 이용할 수 있습니다.')}</li>
      </ol>

      <h2>{t('제37조 권리침해 신고')}</h2>
      <p>{t('권리침해 신고에는 다음 정보를 포함해야 합니다.')}</p>
      <ol>
        <li>{t('신고자의 성명 또는 법인명')}</li>
        <li>{t('연락처')}</li>
        <li>{t('권리의 근거')}</li>
        <li>{t('침해가 의심되는 콘텐츠의 위치')}</li>
        <li>{t('침해 사유')}</li>
        <li>{t('사실에 근거한 신고라는 확인')}</li>
        <li>{t('필요한 경우 위임장')}</li>
      </ol>
      <p><strong>{t('신고처:')}</strong> <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a></p>
      <p>{t('회사는 신고를 검토하여 콘텐츠 제한, 자료 요청, 반론 기회 제공 및 계정 조치를 할 수 있습니다.')}</p>
      <p>{t('악의적이거나 허위인 신고로 발생한 손해는 신고자가 부담할 수 있습니다.')}</p>

      <h2>{t('제38조 개인정보')}</h2>
      <p>{t('회사는 개인정보처리방침과 개인정보처리위탁 특약에 따라 개인정보를 처리합니다.')}</p>
      <p>{t('기업회원이 고객 데이터를 처리하는 경우 기업회원은 개인정보처리자 또는 컨트롤러로서의 책임을 부담하고 회사는 합의된 범위에서 수탁자 또는 프로세서 역할을 수행합니다.')}</p>

      <h2>{t('제39조 통지')}</h2>
      <ol>
        <li>{t('회사는 가입 이메일, 서비스 내 알림, 팝업 또는 공지사항으로 통지할 수 있습니다.')}</li>
        <li>{t('결제, 보안, 약관의 중대한 변경, 개인정보 침해 또는 서비스 종료와 같이 중요한 사항은 개별 통지를 원칙으로 합니다.')}</li>
        <li>{t('회원은 이메일과 연락처를 최신 상태로 유지해야 합니다.')}</li>
      </ol>

      <h2>{t('제40조 준거법과 분쟁해결')}</h2>
      <ol>
        <li>{t('본 약관은 대한민국 법률을 준거법으로 합니다.')}</li>
        <li>{t('개인 소비자가 거주 국가의 강행법에 따라 더 유리한 권리를 가지는 경우 해당 권리를 제한하지 않습니다.')}</li>
        <li>{t('기업회원과 회사 사이의 분쟁은 서울중앙지방법원을 제1심 전속 관할법원으로 합니다.')}</li>
        <li>{t('소비자는 관련 법률에 따라 자신의 주소지를 관할하는 법원 또는 법정 소비자분쟁 해결절차를 이용할 수 있습니다.')}</li>
        <li>{t('회사와 회원은 소송 전에 고객센터를 통한 협의를 우선적으로 시도합니다.')}</li>
        <li>{t('본 약관은 소비자에게 강제 중재나 집단소송 포기를 일률적으로 강요하지 않습니다.')}</li>
      </ol>

      <h2>{t('제41조 언어')}</h2>
      <ol>
        <li>{t('본 약관은 한국어와 영어 및 회사가 제공하는 다른 언어로 제공될 수 있습니다.')}</li>
        <li>{t('대한민국 기업회원과의 관계에서는 한국어본을 기준으로 합니다.')}</li>
        <li>{t('다른 국가의 소비자에게 현지 법률상 현지어본이 요구되거나 현지어본이 더 유리한 권리를 제공하는 경우 해당 법률과 현지어본이 우선할 수 있습니다.')}</li>
      </ol>

      <h2>{t('제42조 기타')}</h2>
      <ol>
        <li>{t('본 약관의 일부가 무효이더라도 나머지 조항은 계속 유효합니다.')}</li>
        <li>{t('회사가 권리를 즉시 행사하지 않았다고 해서 그 권리를 포기한 것은 아닙니다.')}</li>
        <li>{t('회원은 회사의 사전 서면 동의 없이 계약상 지위를 양도할 수 없습니다.')}</li>
        <li>{t('회사는 합병, 영업양도 또는 조직개편과 관련하여 회원의 권리를 부당하게 침해하지 않는 범위에서 계약상 지위를 이전할 수 있습니다.')}</li>
        <li>{t('본 약관은 별도 서면 계약이 없는 한 서비스 이용에 관한 당사자 간 전체 합의를 구성합니다.')}</li>
      </ol>

      <h2>{t('별지 1. AI 콘텐츠 안전정책')}</h2>

      <h3>{t('1. 실제 인물 합성')}</h3>
      <p>{t('실제 인물의 얼굴 또는 음성을 이용하려면 다음 중 하나를 충족해야 합니다.')}</p>
      <ol>
        <li>{t('본인의 얼굴 또는 음성')}</li>
        <li>{t('대상자로부터 명시적이고 증명 가능한 허가를 받은 경우')}</li>
        <li>{t('법률상 정당한 보도, 비평, 연구, 풍자 또는 공익 목적이 인정되는 경우')}</li>
        <li>{t('라이선스가 부여된 배우, 모델 또는 스톡 자료')}</li>
      </ol>
      <p>{t('실제 인물이 하지 않은 말이나 행동을 한 것처럼 표현하면 AI 생성·조작 사실을 명확히 표시해야 합니다.')}</p>

      <h3>{t('2. 미성년자')}</h3>
      <p>{t('미성년자가 포함된 콘텐츠는 보호자의 적법한 동의와 법적 근거가 있는 경우에만 처리할 수 있습니다.')}</p>
      <p>{t('미성년자의 성적 묘사, 착취, 유인, 수치심 유발 또는 신체를 성인 콘텐츠에 합성하는 행위는 금지됩니다.')}</p>

      <h3>{t('3. 정치·공공정보')}</h3>
      <p>{t('후보자, 선거관리기관, 정부기관 또는 언론사를 사칭하거나 유권자의 투표시간·장소·방법에 관해 허위정보를 전달해서는 안 됩니다.')}</p>
      <p>{t('공익·풍자 콘텐츠라도 합성 사실을 명확히 표시해야 합니다.')}</p>

      <h3>{t('4. 광고')}</h3>
      <p>{t('전문가, 의료인, 유명인 또는 일반인이 실제로 사용·추천하지 않은 상품을 추천한 것처럼 합성해서는 안 됩니다.')}</p>
      <p>{t('AI 모델이나 가상 인물을 광고에 사용하는 경우 관련 표시광고법과 업종별 광고 규정을 준수해야 합니다.')}</p>

      <h3>{t('5. 이의제기')}</h3>
      <p>{t('콘텐츠 또는 계정 제한에 이의가 있는 회원은')} <a href="mailto:ceo@nextbygency.com">ceo@nextbygency.com</a>{t('으로 소명자료를 제출할 수 있습니다.')}</p>

      <h2>{t('별지 2. CRM 및 광고 발송 운영정책')}</h2>

      <h3>{t('1. 허용되는 목록')}</h3>
      <ol>
        <li>{t('수신자가 직접 동의한 목록')}</li>
        <li>{t('법률상 허용되는 기존 거래관계 목록')}</li>
        <li>{t('기업회원이 적법한 처리 근거를 입증할 수 있는 목록')}</li>
      </ol>

      <h3>{t('2. 금지되는 목록')}</h3>
      <ol>
        <li>{t('구매하거나 임대한 명단')}</li>
        <li>{t('웹사이트, 지도, SNS 또는 온라인 게시판에서 수집한 연락처')}</li>
        <li>{t('자동으로 생성한 전화번호 또는 이메일')}</li>
        <li>{t('수신동의 출처와 문구를 입증할 수 없는 목록')}</li>
        <li>{t('수신거부·철회 목록')}</li>
        <li>{t('아동·청소년 대상 무단 마케팅 목록')}</li>
        <li>{t('출처가 불법이거나 불명확한 데이터')}</li>
      </ol>

      <h3>{t('3. 메시지 필수 요소')}</h3>
      <ol>
        <li>{t('광고성 메시지임을 알리는 표시')}</li>
        <li>{t('실제 광고주 또는 발송자의 명칭')}</li>
        <li>{t('연락 가능한 정보')}</li>
        <li>{t('이해하기 쉬운 수신거부 방법')}</li>
        <li>{t('수신거부 비용이 발생하지 않는 방법')}</li>
        <li>{t('허위 또는 기만적인 제목과 발신정보 금지')}</li>
        <li>{t('단축URL 사용 시 목적지 투명성 확보')}</li>
      </ol>

      <h3>{t('4. 수신거부')}</h3>
      <ol>
        <li>{t('STOP, 수신거부, 거부 등의 합리적인 철회 표현을 처리해야 합니다.')}</li>
        <li>{t('철회 요청은 가능한 한 즉시 모든 관련 발송시스템에 반영해야 합니다.')}</li>
        <li>{t('철회자를 다시 마케팅 목록에 자동 등록하면 안 됩니다.')}</li>
        <li>{t('철회 확인 메시지는 광고 내용을 포함하지 않는 1회의 처리 확인에 한정합니다.')}</li>
        <li>{t('수신거부 목록은 광고 방지를 위한 최소 정보만 보관합니다.')}</li>
      </ol>

      <h3>{t('5. 계정 제재')}</h3>
      <p>{t('다음에 해당하면 발송 기능이 즉시 정지될 수 있습니다.')}</p>
      <ol>
        <li>{t('신고율 또는 차단율이 비정상적으로 높은 경우')}</li>
        <li>{t('발신번호를 위조한 경우')}</li>
        <li>{t('동의 증빙을 제출하지 못한 경우')}</li>
        <li>{t('불법 상품 또는 사기성 광고를 발송한 경우')}</li>
        <li>{t('수신거부를 반복적으로 무시한 경우')}</li>
        <li>{t('메시지 사업자 또는 규제기관이 차단을 요청한 경우')}</li>
      </ol>
    </LegalShell>
  )
}
