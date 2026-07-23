'use client'

import { LegalShell } from '@/components/legal/LegalShell'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  '지역별 적용 부속서': { en: 'Regional Annex', ja: '地域別適用附属書', zh: '地区适用附录' },
  '2026년 9월 1일': { en: 'September 1, 2026', ja: '2026年9月1日', zh: '2026年9月1日' },
  '본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.': {
    en: 'The Korean-language version of this document is the original. In the event of any discrepancy between the translation and the Korean version, the Korean version prevails.',
    ja: '本書面は韓国語版を原本とします。翻訳版との間に解釈の相違がある場合は、韓国語版が優先します。',
    zh: '本文件以韩语版本为准。如译文与韩语版本存在解释差异，以韩语版本为准。',
  },
  '본 부속서는 BYGENCY가 각 지역·국가에서 서비스를 제공할 때 적용되는 추가 개인정보·마케팅·소비자 보호 기준을 정합니다.': {
    en: 'This Annex sets out additional privacy, marketing, and consumer protection standards that apply when BYGENCY provides services in each region or country.',
    ja: '本附属書は、BYGENCYが各地域・国でサービスを提供する際に適用される追加の個人情報・マーケティング・消費者保護基準を定めます。',
    zh: '本附录规定 BYGENCY 在各地区·国家提供服务时适用的额外的个人信息·营销·消费者保护标准。',
  },

  '1. 대한민국': { en: '1. Republic of Korea', ja: '1. 大韓民国', zh: '1. 大韩民国' },
  '필수 처리와 선택 동의를 구분합니다.': { en: 'Distinguish between mandatory processing and optional consent.', ja: '必須処理と任意同意を区分します。', zh: '区分必要处理与可选同意。' },
  '마케팅 채널별 동의를 분리합니다.': { en: 'Separate consent by marketing channel.', ja: 'マーケティングチャネルごとに同意を分離します。', zh: '按营销渠道分别取得同意。' },
  '야간 광고 동의를 별도로 받습니다.': { en: 'Obtain separate consent for nighttime advertising.', ja: '夜間広告の同意を別途取得します。', zh: '另行取得夜间广告同意。' },
  '광고 수신동의 여부를 법정 주기에 따라 확인합니다.': { en: 'Confirm advertising opt-in status at statutory intervals.', ja: '広告の受信同意の有無を法定の周期に従って確認します。', zh: '按法定周期确认广告接收同意状态。' },
  '국외이전 근거와 상세 정보를 공개합니다.': { en: 'Disclose the grounds and details for cross-border transfers.', ja: '国外移転の根拠と詳細情報を公開します。', zh: '公开跨境转移的依据及详细信息。' },
  '전자상거래 청약철회, 정기결제 및 디지털콘텐츠 규정을 적용합니다.': { en: 'Apply e-commerce rules on withdrawal of subscription, recurring payments, and digital content.', ja: '電子商取引の申込撤回、定期決済、およびデジタルコンテンツの規定を適用します。', zh: '适用电子商务的撤回订约、定期付款及数字内容规定。' },
  'AI 서비스 및 생성물에 필요한 고지·표시를 적용합니다.': { en: 'Apply the notices and labeling required for AI services and generated content.', ja: 'AIサービスおよび生成物に必要な告知・表示を適用します。', zh: '对 AI 服务及生成物适用必要的告知·标示。' },

  '2. EU·EEA': { en: '2. EU·EEA', ja: '2. EU・EEA', zh: '2. 欧盟·欧洲经济区' },
  'GDPR 법적 근거를 처리 목적별로 기록합니다.': { en: 'Record the GDPR legal basis for each processing purpose.', ja: 'GDPRの法的根拠を処理目的ごとに記録します。', zh: '按处理目的记录 GDPR 法律依据。' },
  '비필수 쿠키는 사전 동의 후 설치합니다.': { en: 'Install non-essential cookies only after prior consent.', ja: '非必須Cookieは事前同意の後に設置します。', zh: '非必要 Cookie 在事先同意后安装。' },
  '직접 마케팅 반대 요청을 즉시 반영합니다.': { en: 'Give immediate effect to objections to direct marketing.', ja: 'ダイレクトマーケティングへの反対請求を直ちに反映します。', zh: '立即执行对直接营销的反对请求。' },
  '필요한 경우 EU 대리인과 개인정보 보호책임자를 지정합니다.': { en: 'Where necessary, appoint an EU representative and a data protection officer.', ja: '必要な場合、EU代理人と個人情報保護責任者を指定します。', zh: '必要时指定欧盟代表与个人信息保护负责人。' },
  '국제이전에 적정성 결정 또는 표준계약조항을 적용합니다.': { en: 'Apply an adequacy decision or standard contractual clauses to international transfers.', ja: '国際移転には十分性認定または標準契約条項を適用します。', zh: '对国际转移适用充分性决定或标准合同条款。' },
  '소비자에게 14일 철회권과 디지털 서비스 즉시 이행 동의를 제공합니다.': { en: 'Provide consumers with a 14-day right of withdrawal and consent to immediate performance of digital services.', ja: '消費者に14日間の撤回権とデジタルサービスの即時履行への同意を提供します。', zh: '向消费者提供14天撤回权及数字服务立即履行的同意。' },
  'AI 생성·조작 콘텐츠에 적용되는 표시와 기계 판독 가능한 마킹을 적용합니다.': { en: 'Apply the labeling and machine-readable marking required for AI-generated or manipulated content.', ja: 'AI生成・操作コンテンツに適用される表示と機械可読なマーキングを適用します。', zh: '对 AI 生成·操纵内容适用相应标示及机器可读标记。' },

  '3. 영국': { en: '3. United Kingdom', ja: '3. 英国', zh: '3. 英国' },
  'UK GDPR과 PECR에 따른 개인정보·마케팅·쿠키 요건을 적용합니다.': { en: 'Apply personal data, marketing, and cookie requirements under the UK GDPR and PECR.', ja: 'UK GDPRおよびPECRに基づく個人情報・マーケティング・Cookie要件を適用します。', zh: '适用 UK GDPR 及 PECR 规定的个人信息·营销·Cookie 要求。' },
  '필요한 경우 영국 대리인을 지정합니다.': { en: 'Where necessary, appoint a UK representative.', ja: '必要な場合、英国代理人を指定します。', zh: '必要时指定英国代表。' },
  '국제이전에 영국의 적정성 규정, IDTA 또는 UK Addendum을 적용합니다.': { en: 'Apply the UK adequacy regulations, the IDTA, or the UK Addendum to international transfers.', ja: '国際移転には英国の十分性規則、IDTA、またはUK Addendumを適用します。', zh: '对国际转移适用英国的充分性规定、IDTA 或 UK Addendum。' },
  '소비자 계약과 구독 관련 영국 강행법을 우선 적용합니다.': { en: 'Give priority to UK mandatory laws on consumer contracts and subscriptions.', ja: '消費者契約および購読に関する英国の強行法を優先適用します。', zh: '优先适用有关消费者合同及订阅的英国强制性法律。' },

  '4. 미국': { en: '4. United States', ja: '4. 米国', zh: '4. 美国' },
  '적용되는 연방 및 주 개인정보법을 국가·주 단위로 평가합니다.': { en: 'Assess applicable federal and state privacy laws at the national and state level.', ja: '適用される連邦および州の個人情報法を国・州単位で評価します。', zh: '按国家·州层级评估适用的联邦及州个人信息法。' },
  '캘리포니아 적용 대상인 경우 수집 시 고지, 개인정보 권리, 판매·공유 거부, GPC 및 비차별 절차를 제공합니다.': { en: 'Where subject to California law, provide notice at collection, privacy rights, opt-out of sale or sharing, GPC, and non-discrimination procedures.', ja: 'カリフォルニア州の適用対象である場合、収集時の告知、個人情報の権利、販売・共有の拒否、GPC、および非差別手続を提供します。', zh: '在属于加利福尼亚州适用对象的情况下，提供收集时告知、个人信息权利、拒绝出售·共享、GPC 及非歧视程序。' },
  '상업 이메일은 정확한 발신정보, 기만적이지 않은 제목, 실제 주소 및 수신거부 방법을 포함합니다.': { en: 'Commercial emails include accurate sender information, non-deceptive subject lines, a physical address, and an opt-out method.', ja: '商業メールは、正確な発信者情報、欺瞞的でない件名、実在する住所、および受信拒否の方法を含みます。', zh: '商业电子邮件应包含准确的发件人信息、非欺骗性的主题、真实地址及退订方式。' },
  '자동 문자·전화 마케팅은 적용되는 서면동의와 철회 요건을 준수합니다.': { en: 'Automated text and call marketing complies with applicable written consent and opt-out requirements.', ja: '自動SMS・電話マーケティングは、適用される書面同意および撤回要件を遵守します。', zh: '自动短信·电话营销遵守适用的书面同意及撤回要求。' },
  '아동 대상 서비스로 운영하지 않으며 만 18세 미만 가입을 금지합니다.': { en: 'We do not operate the service for children and prohibit registration by anyone under 18.', ja: '児童向けサービスとして運営せず、満18歳未満の登録を禁止します。', zh: '不作为面向儿童的服务运营，并禁止未满18周岁者注册。' },
  '생체정보를 처리하는 경우 주별 생체정보법을 별도 검토합니다.': { en: 'Where biometric information is processed, review state-specific biometric laws separately.', ja: '生体情報を処理する場合、州ごとの生体情報法を別途検討します。', zh: '在处理生物识别信息时，另行审查各州的生物识别信息法。' },

  '5. 캐나다': { en: '5. Canada', ja: '5. カナダ', zh: '5. 加拿大' },
  '상업적 전자메시지 발송 전 명시적 또는 법률상 인정되는 묵시적 동의를 확보합니다.': { en: 'Obtain express or legally recognized implied consent before sending commercial electronic messages.', ja: '商業的電子メッセージの送信前に、明示的または法律上認められる黙示的同意を確保します。', zh: '在发送商业电子讯息前，取得明示或法律认可的默示同意。' },
  '발송자 신원과 연락처를 표시합니다.': { en: 'Identify the sender and provide contact information.', ja: '送信者の身元と連絡先を表示します。', zh: '标明发送者身份及联系方式。' },
  '작동하는 수신거부 방법을 제공합니다.': { en: 'Provide a functioning opt-out method.', ja: '機能する受信拒否の方法を提供します。', zh: '提供可正常使用的退订方式。' },
  '동의 증빙을 보관합니다.': { en: 'Retain proof of consent.', ja: '同意の証跡を保管します。', zh: '保存同意的证明。' },
  '캐나다에서 수신되는 메시지는 해외 발송이라도 현지 규정을 적용하도록 CRM을 설정합니다.': { en: 'Configure the CRM so that local rules apply to messages received in Canada, even if sent from abroad.', ja: 'カナダで受信されるメッセージは、海外からの送信であっても現地規定を適用するようCRMを設定します。', zh: '将 CRM 设置为：在加拿大接收的讯息即使从海外发送也适用当地规定。' },

  '6. 호주': { en: '6. Australia', ja: '6. オーストラリア', zh: '6. 澳大利亚' },
  '상업적 이메일과 문자 발송 전 유효한 동의를 확보합니다.': { en: 'Obtain valid consent before sending commercial emails and text messages.', ja: '商業的メールおよびSMSの送信前に、有効な同意を確保します。', zh: '在发送商业电子邮件及短信前，取得有效同意。' },
  '발신자를 정확히 표시합니다.': { en: 'Identify the sender accurately.', ja: '発信者を正確に表示します。', zh: '准确标明发送者。' },
  '쉽고 무료인 수신거부 방법을 제공합니다.': { en: 'Provide an easy and free opt-out method.', ja: '簡単で無料の受信拒否の方法を提供します。', zh: '提供简便且免费的退订方式。' },
  '수신거부 요청을 현지 법정기한 내 처리합니다.': { en: 'Process opt-out requests within the local statutory deadline.', ja: '受信拒否の請求を現地の法定期限内に処理します。', zh: '在当地法定期限内处理退订请求。' },
  '제3자에게 발송을 맡기더라도 광고주가 동의 증빙을 보유합니다.': { en: 'Even when sending is delegated to a third party, the advertiser retains proof of consent.', ja: '第三者に送信を委託する場合でも、広告主が同意の証跡を保有します。', zh: '即使委托第三方发送，广告主仍保有同意的证明。' },

  '7. 싱가포르': { en: '7. Singapore', ja: '7. シンガポール', zh: '7. 新加坡' },
  '개인정보 보호책임자를 지정합니다.': { en: 'Appoint a data protection officer.', ja: '個人情報保護責任者を指定します。', zh: '指定个人信息保护负责人。' },
  '전화번호 마케팅은 유효한 동의가 없는 한 DNC 등록부를 확인합니다.': { en: 'For phone-number marketing, check the DNC Registry unless valid consent exists.', ja: '電話番号を用いたマーケティングは、有効な同意がない限りDNC登録簿を確認します。', zh: '电话号码营销在没有有效同意的情况下须查询 DNC 登记册。' },
  '발송자 식별정보와 수신거부 방법을 제공합니다.': { en: 'Provide sender identification and an opt-out method.', ja: '送信者の識別情報と受信拒否の方法を提供します。', zh: '提供发送者识别信息及退订方式。' },
  'DNC 확인 유효기간과 철회 요청을 관리합니다.': { en: 'Manage the validity period of DNC checks and withdrawal requests.', ja: 'DNC確認の有効期間と撤回請求を管理します。', zh: '管理 DNC 查询的有效期限及撤回请求。' },

  '8. 일본': { en: '8. Japan', ja: '8. 日本', zh: '8. 日本' },
  '개인정보 이용 목적을 가능한 한 구체적으로 공개합니다.': { en: 'Disclose the purposes of personal data use as specifically as possible.', ja: '個人情報の利用目的をできる限り具体的に公開します。', zh: '尽可能具体地公开个人信息的利用目的。' },
  '외국 제3자 제공 또는 국외이전 시 현지법상 정보제공 및 동의 요건을 검토합니다.': { en: 'For provision to foreign third parties or cross-border transfers, review the information-provision and consent requirements under local law.', ja: '外国の第三者への提供または国外移転の際は、現地法上の情報提供および同意要件を検討します。', zh: '向外国第三方提供或跨境转移时，审查当地法律的信息提供及同意要求。' },
  '마케팅 이메일은 수신동의, 발신자 표시 및 수신거부 요건을 적용합니다.': { en: 'Marketing emails apply opt-in, sender identification, and opt-out requirements.', ja: 'マーケティングメールには、受信同意、発信者表示、および受信拒否の要件を適用します。', zh: '营销电子邮件适用接收同意、发送者标示及退订要求。' },
  '민감정보와 제3자 제공 기록을 적절히 관리합니다.': { en: 'Appropriately manage records of sensitive information and third-party provision.', ja: '要配慮情報および第三者提供の記録を適切に管理します。', zh: '妥善管理敏感信息及第三方提供记录。' },

  '9. 브라질': { en: '9. Brazil', ja: '9. ブラジル', zh: '9. 巴西' },
  'LGPD의 처리 근거와 정보주체 권리를 적용합니다.': { en: 'Apply the LGPD processing bases and data subject rights.', ja: 'LGPDの処理根拠およびデータ主体の権利を適用します。', zh: '适用 LGPD 的处理依据及数据主体权利。' },
  '필요한 경우 현지 데이터보호 담당 연락창구를 제공합니다.': { en: 'Where necessary, provide a local data protection contact point.', ja: '必要な場合、現地のデータ保護担当の連絡窓口を提供します。', zh: '必要时提供当地数据保护联络窗口。' },
  '국제이전 근거를 문서화합니다.': { en: 'Document the grounds for international transfers.', ja: '国際移転の根拠を文書化します。', zh: '将国际转移的依据文书化。' },
  '동의는 구체적이고 자유롭게 제공되도록 하며 철회를 지원합니다.': { en: 'Ensure consent is specific and freely given, and support withdrawal.', ja: '同意は具体的かつ自由に提供されるようにし、撤回を支援します。', zh: '确保同意具体且自由作出，并支持撤回。' },

  '10. 기타 국가': { en: '10. Other Countries', ja: '10. その他の国', zh: '10. 其他国家' },
  '특정 국가를 대상으로 광고, 현지 통화 결제, 현지 전화번호 발송, 현지 도메인, 현지 언어 마케팅 또는 현지 영업활동을 시작하기 전에 다음 사항을 검토합니다.': {
    en: 'Before starting advertising targeting a specific country, local-currency payments, sending from local phone numbers, a local domain, local-language marketing, or local business activities, we review the following.',
    ja: '特定の国を対象とした広告、現地通貨での決済、現地電話番号からの送信、現地ドメイン、現地言語のマーケティング、または現地での営業活動を開始する前に、次の事項を検討します。',
    zh: '在针对特定国家开展广告、本地货币支付、本地电话号码发送、本地域名、本地语言营销或本地营业活动之前，审查以下事项。',
  },
  '개인정보 보호법 적용 여부': { en: 'Applicability of privacy laws', ja: '個人情報保護法の適用の有無', zh: '个人信息保护法的适用与否' },
  '현지 대리인 또는 데이터보호책임자 지정': { en: 'Appointment of a local representative or data protection officer', ja: '現地代理人またはデータ保護責任者の指定', zh: '当地代表或数据保护负责人的指定' },
  '데이터 국외이전 또는 현지 저장 의무': { en: 'Cross-border data transfer or local storage obligations', ja: 'データの国外移転または現地保存の義務', zh: '数据跨境转移或本地存储义务' },
  '통신·문자·이메일 발송 등록': { en: 'Registration for telecom, SMS, and email sending', ja: '通信・SMS・メール送信の登録', zh: '通信·短信·电子邮件发送登记' },
  '소비자 철회·환불·자동갱신 규칙': { en: 'Consumer withdrawal, refund, and auto-renewal rules', ja: '消費者の撤回・返金・自動更新のルール', zh: '消费者撤回·退款·自动续订规则' },
  '세금과 전자상거래 신고': { en: 'Tax and e-commerce reporting', ja: '税金および電子商取引の申告', zh: '税务及电子商务申报' },
  'AI 생성물 표시': { en: 'Labeling of AI-generated content', ja: 'AI生成物の表示', zh: 'AI 生成物标示' },
  '콘텐츠 검열·불법정보 규정': { en: 'Content moderation and illegal-information rules', ja: 'コンテンツの検閲・違法情報の規定', zh: '内容审查·非法信息规定' },
  '생체정보 및 얼굴·음성 합성 규정': { en: 'Rules on biometric information and face or voice synthesis', ja: '生体情報および顔・音声合成の規定', zh: '生物识别信息及人脸·语音合成规定' },
  '현지어 약관 제공 의무': { en: 'Obligation to provide terms in the local language', ja: '現地語での規約提供義務', zh: '以当地语言提供条款的义务' },
  '검토가 완료되지 않은 국가는 CRM 발송, 현지 결제 또는 신규가입을 제한할 수 있습니다.': {
    en: 'For countries where review is not complete, we may restrict CRM sending, local payments, or new registrations.',
    ja: '検討が完了していない国では、CRM送信、現地決済、または新規登録を制限することがあります。',
    zh: '对于尚未完成审查的国家，我们可能限制 CRM 发送、本地支付或新用户注册。',
  },
}

export function RegionalContent() {
  const t = useT(M)
  return (
    <LegalShell title={t('지역별 적용 부속서')} effective={t('2026년 9월 1일')}>
      <p className="text-sm opacity-70">
        {t('본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.')}
      </p>

      <p className="lead">
        {t('본 부속서는 BYGENCY가 각 지역·국가에서 서비스를 제공할 때 적용되는 추가 개인정보·마케팅·소비자 보호 기준을 정합니다.')}
      </p>

      <h2>{t('1. 대한민국')}</h2>
      <ol>
        <li>{t('필수 처리와 선택 동의를 구분합니다.')}</li>
        <li>{t('마케팅 채널별 동의를 분리합니다.')}</li>
        <li>{t('야간 광고 동의를 별도로 받습니다.')}</li>
        <li>{t('광고 수신동의 여부를 법정 주기에 따라 확인합니다.')}</li>
        <li>{t('국외이전 근거와 상세 정보를 공개합니다.')}</li>
        <li>{t('전자상거래 청약철회, 정기결제 및 디지털콘텐츠 규정을 적용합니다.')}</li>
        <li>{t('AI 서비스 및 생성물에 필요한 고지·표시를 적용합니다.')}</li>
      </ol>

      <h2>{t('2. EU·EEA')}</h2>
      <ol>
        <li>{t('GDPR 법적 근거를 처리 목적별로 기록합니다.')}</li>
        <li>{t('비필수 쿠키는 사전 동의 후 설치합니다.')}</li>
        <li>{t('직접 마케팅 반대 요청을 즉시 반영합니다.')}</li>
        <li>{t('필요한 경우 EU 대리인과 개인정보 보호책임자를 지정합니다.')}</li>
        <li>{t('국제이전에 적정성 결정 또는 표준계약조항을 적용합니다.')}</li>
        <li>{t('소비자에게 14일 철회권과 디지털 서비스 즉시 이행 동의를 제공합니다.')}</li>
        <li>{t('AI 생성·조작 콘텐츠에 적용되는 표시와 기계 판독 가능한 마킹을 적용합니다.')}</li>
      </ol>

      <h2>{t('3. 영국')}</h2>
      <ol>
        <li>{t('UK GDPR과 PECR에 따른 개인정보·마케팅·쿠키 요건을 적용합니다.')}</li>
        <li>{t('필요한 경우 영국 대리인을 지정합니다.')}</li>
        <li>{t('국제이전에 영국의 적정성 규정, IDTA 또는 UK Addendum을 적용합니다.')}</li>
        <li>{t('소비자 계약과 구독 관련 영국 강행법을 우선 적용합니다.')}</li>
      </ol>

      <h2>{t('4. 미국')}</h2>
      <ol>
        <li>{t('적용되는 연방 및 주 개인정보법을 국가·주 단위로 평가합니다.')}</li>
        <li>{t('캘리포니아 적용 대상인 경우 수집 시 고지, 개인정보 권리, 판매·공유 거부, GPC 및 비차별 절차를 제공합니다.')}</li>
        <li>{t('상업 이메일은 정확한 발신정보, 기만적이지 않은 제목, 실제 주소 및 수신거부 방법을 포함합니다.')}</li>
        <li>{t('자동 문자·전화 마케팅은 적용되는 서면동의와 철회 요건을 준수합니다.')}</li>
        <li>{t('아동 대상 서비스로 운영하지 않으며 만 18세 미만 가입을 금지합니다.')}</li>
        <li>{t('생체정보를 처리하는 경우 주별 생체정보법을 별도 검토합니다.')}</li>
      </ol>

      <h2>{t('5. 캐나다')}</h2>
      <ol>
        <li>{t('상업적 전자메시지 발송 전 명시적 또는 법률상 인정되는 묵시적 동의를 확보합니다.')}</li>
        <li>{t('발송자 신원과 연락처를 표시합니다.')}</li>
        <li>{t('작동하는 수신거부 방법을 제공합니다.')}</li>
        <li>{t('동의 증빙을 보관합니다.')}</li>
        <li>{t('캐나다에서 수신되는 메시지는 해외 발송이라도 현지 규정을 적용하도록 CRM을 설정합니다.')}</li>
      </ol>

      <h2>{t('6. 호주')}</h2>
      <ol>
        <li>{t('상업적 이메일과 문자 발송 전 유효한 동의를 확보합니다.')}</li>
        <li>{t('발신자를 정확히 표시합니다.')}</li>
        <li>{t('쉽고 무료인 수신거부 방법을 제공합니다.')}</li>
        <li>{t('수신거부 요청을 현지 법정기한 내 처리합니다.')}</li>
        <li>{t('제3자에게 발송을 맡기더라도 광고주가 동의 증빙을 보유합니다.')}</li>
      </ol>

      <h2>{t('7. 싱가포르')}</h2>
      <ol>
        <li>{t('개인정보 보호책임자를 지정합니다.')}</li>
        <li>{t('전화번호 마케팅은 유효한 동의가 없는 한 DNC 등록부를 확인합니다.')}</li>
        <li>{t('발송자 식별정보와 수신거부 방법을 제공합니다.')}</li>
        <li>{t('DNC 확인 유효기간과 철회 요청을 관리합니다.')}</li>
      </ol>

      <h2>{t('8. 일본')}</h2>
      <ol>
        <li>{t('개인정보 이용 목적을 가능한 한 구체적으로 공개합니다.')}</li>
        <li>{t('외국 제3자 제공 또는 국외이전 시 현지법상 정보제공 및 동의 요건을 검토합니다.')}</li>
        <li>{t('마케팅 이메일은 수신동의, 발신자 표시 및 수신거부 요건을 적용합니다.')}</li>
        <li>{t('민감정보와 제3자 제공 기록을 적절히 관리합니다.')}</li>
      </ol>

      <h2>{t('9. 브라질')}</h2>
      <ol>
        <li>{t('LGPD의 처리 근거와 정보주체 권리를 적용합니다.')}</li>
        <li>{t('필요한 경우 현지 데이터보호 담당 연락창구를 제공합니다.')}</li>
        <li>{t('국제이전 근거를 문서화합니다.')}</li>
        <li>{t('동의는 구체적이고 자유롭게 제공되도록 하며 철회를 지원합니다.')}</li>
      </ol>

      <h2>{t('10. 기타 국가')}</h2>
      <p>
        {t('특정 국가를 대상으로 광고, 현지 통화 결제, 현지 전화번호 발송, 현지 도메인, 현지 언어 마케팅 또는 현지 영업활동을 시작하기 전에 다음 사항을 검토합니다.')}
      </p>
      <ol>
        <li>{t('개인정보 보호법 적용 여부')}</li>
        <li>{t('현지 대리인 또는 데이터보호책임자 지정')}</li>
        <li>{t('데이터 국외이전 또는 현지 저장 의무')}</li>
        <li>{t('통신·문자·이메일 발송 등록')}</li>
        <li>{t('소비자 철회·환불·자동갱신 규칙')}</li>
        <li>{t('세금과 전자상거래 신고')}</li>
        <li>{t('AI 생성물 표시')}</li>
        <li>{t('콘텐츠 검열·불법정보 규정')}</li>
        <li>{t('생체정보 및 얼굴·음성 합성 규정')}</li>
        <li>{t('현지어 약관 제공 의무')}</li>
      </ol>
      <p>
        {t('검토가 완료되지 않은 국가는 CRM 발송, 현지 결제 또는 신규가입을 제한할 수 있습니다.')}
      </p>
    </LegalShell>
  )
}
