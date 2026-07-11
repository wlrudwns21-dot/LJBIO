/* LJ-BIO bilingual (KO/EN) engine — whitespace-insensitive matching.
   window.LJI18N.init() builds the cache + applies saved language.
   window.LJI18N.toggle() flips KO <-> EN. Preference persists in localStorage. */
(function () {
  if (window.LJI18N) return;
  // Headings / paragraphs that contain inline markup (<br>, <span>, <b>) — replaced at element level.
  var ELEMENTS = [
    ["바이오를 과학으로 연결합니다",
      'Connecting Bio<br><span style="background:linear-gradient(110deg,#46D08A,#0E7B4E);-webkit-background-clip:text;background-clip:text;color:transparent;">Through Science</span>'],
    ["새로운 도약, 확고한 비즈니스 네트워크", 'A New Leap,<br>A Solid Business Network'],
    ["엘제이바이오는 대구·경북 지역의 탄탄한 의약품 유통 전문기업 ‘길바이오’의 검증된 노하우와 폭넓은 인프라를 바탕으로 새롭게 출범했습니다.",
      'LJ-BIO was newly launched on the proven know-how and broad infrastructure of <b style="font-weight:600;color:#0C0F0D;">‘Gil-Bio’</b>, a trusted pharmaceutical-distribution specialist in the Daegu·Gyeongbuk region.'],
    ["현재 서울을 거점으로 의약품 도매업을 활발히 전개하며, 국내 수도권 및 글로벌 해외 시장 진출을 전담하고 있습니다. 단순 유통을 넘어 IT 기술이 접목된 선진화된 바이오 유통 솔루션을 제공하는 최적의 파트너입니다.",
      'Headquartered in Seoul, we actively run pharmaceutical wholesale and lead expansion across the Korean capital region and global markets. Beyond simple distribution, we are the ideal partner delivering <b style="font-weight:600;color:#0E7B4E;">advanced bio-distribution solutions powered by IT technology</b>.'],
    ["아시아를 잇는 글로벌 사업 실적", 'Our Global<br>Track Record in Asia'],
    ["왜 엘제이바이오와 함께해야 할까요", 'Why Partner<br>with LJ-BIO'],
    ["함께 성장할 파트너를 찾고 있습니다", 'Looking for Partners<br>to Grow Together'],
    ["검증된 과학으로 신뢰를 유통합니다", 'Distributing Trust<br>Through Proven Science'],
    ["아시아 핵심 시장을 잇는 유통 네트워크",
      'A Distribution Network<br><span style="background:linear-gradient(110deg,#0E7B4E,#37C07F);-webkit-background-clip:text;background-clip:text;color:transparent;">Linking Asia’s Core Markets</span>'],
    ["현지화된 전략으로 새로운 시장을 엽니다", 'Opening New Markets<br>with Localized Strategy'],
    ["아시아 진출을 준비하고 계신가요?", 'Planning to Expand<br>into Asia?']
  ];

  // Plain text fragments (no inline markup in the matched node).
  var TEXT = [
    // nav / common
    ["회사소개", "About"], ["사업영역", "Business"], ["글로벌", "Global"], ["문의", "Contact"], ["제휴문의", "Get in Touch"],
    // home hero
    ["사업영역 보기", "View Business"],
    ["인허가(RA)부터 유통·판매, 컨설팅, 그리고 바이오 특화 IT 솔루션까지 —", "From regulatory affairs (RA) to distribution & sales, consulting, and bio-specialized IT solutions —"],
    ["엘제이바이오는 중국·태국·일본을 잇는 K-바이오의 글로벌 진출 파트너입니다.", "LJ-BIO is K-bio’s global gateway partner, connecting China, Thailand, and Japan."],
    // home stat grid
    ["핵심 사업 모델", "Core Business Models"], ["글로벌 거점", "Global Bases"], ["인허가 전문성", "Regulatory Expertise"], ["바이오 특화 솔루션", "Bio-specialized Solutions"],
    // mission
    ["우리가 일하는 세 가지 기준", "Three Principles We Work By"], ["신뢰", "Trust"], ["혁신", "Innovation"],
    ["투명한 프로세스와 검증된 비즈니스 네트워크를 바탕으로 국내외 파트너사와 지속 가능한 동반 성장을 추구합니다.", "Built on transparent processes and a proven business network, we pursue sustainable, shared growth with partners at home and abroad."],
    ["전통적 유통의 경계를 넘어, IT 솔루션을 접목한 선진화된 맞춤형 컨설팅으로 새로운 가치를 만듭니다.", "Going beyond traditional distribution, we create new value through advanced, tailored consulting powered by IT solutions."],
    ["태국·중국·일본 등 아시아를 넘어 K-바이오의 글로벌 진출 교두보 역할을 수행합니다.", "Beyond Thailand, China, and Japan, we serve as the bridgehead for K-bio’s global expansion."],
    // core business
    ["인허가부터 유통, 컨설팅, IT까지 — 네 개의 전문 영역이 유기적으로 연결되어 시장 진입을 가속합니다.", "From licensing to distribution, consulting, and IT — four specialized areas connect organically to accelerate market entry."],
    ["전체 보기 →", "View All →"],
    ["인허가 지원 (RA)", "Regulatory Affairs (RA)"],
    ["화장품·의약품·의료기기의 까다로운 국내외 인허가 절차를 대행하여 시장 진입을 가속화합니다.", "We handle the complex domestic and overseas licensing of cosmetics, drugs, and medical devices to accelerate market entry."],
    ["유통 및 판매", "Distribution & Sales"],
    ["국내외 온·오프라인을 아우르는 체계적인 유통망을 통해 헬스케어 제품을 거래처에 안정적으로 공급합니다.", "Through a systematic on/offline distribution network at home and abroad, we reliably supply healthcare products to clients."],
    ["컨설팅 & 마케팅", "Consulting & Marketing"],
    ["시장 데이터 분석을 통한 맞춤형 마케팅 대행과 브랜드 가치 제고를 위한 토탈 컨설팅을 제공합니다.", "We provide tailored marketing services driven by market-data analysis and total consulting to elevate brand value."],
    ["IT 컨설팅", "IT Consulting"],
    ["의약품·의료기기 통합 관리 시스템과 맞춤형 공급망 관리(SCM) 등 바이오 특화 IT 플랫폼을 기획합니다.", "We design bio-specialized IT platforms, including integrated drug/device management systems and tailored supply-chain management (SCM)."],
    // global track record (home)
    ["글로벌 사업 보기 →", "View Global →"],
    ["중국", "China"], ["태국", "Thailand"], ["일본", "Japan"],
    ["첨단 의료기기 전문 제조 파트너십", "Advanced medical-device manufacturing partnerships"],
    ["의료기기 및 장비 수출입 유통", "Import/export distribution of medical devices and equipment"],
    ["대규모 헬스케어 인프라 공급 지원", "Support for large-scale healthcare infrastructure supply"],
    ["미용·성형 필러 제품 수출", "Export of aesthetic and dermal-filler products"],
    ["현지 맞춤형 IT 플랫폼 기획 및 개발", "Planning and development of localized IT platforms"],
    ["현지 파트너사 발굴 및 네트워크 구축", "Sourcing local partners and building networks"],
    ["K-뷰티 코스메틱(화장품) 수출입", "Import/export of K-beauty cosmetics"],
    ["성형 의료기기 수출 및 수입 유통", "Export and import distribution of aesthetic medical devices"],
    ["일본 내 인허가 취득 및 마케팅 전개", "Obtaining licenses in Japan and rolling out marketing"],
    // why
    ["규제 전문성", "Regulatory Expertise"],
    ["의약품·의료기기·화장품 각 카테고리의 국가별 인허가 요건을 정확히 이해하고 대응합니다.", "We precisely understand and address country-specific licensing requirements for drugs, devices, and cosmetics."],
    ["IT 결합 혁신", "IT-driven Innovation"],
    ["전통적 유통을 넘어 통합 관리 시스템과 SCM 등 바이오 특화 IT 솔루션으로 차별화합니다.", "Beyond traditional distribution, we differentiate with bio-specialized IT solutions such as integrated management systems and SCM."],
    ["검증된 글로벌 네트워크", "Proven Global Network"],
    ["중국·태국·일본 현지의 신뢰할 수 있는 채널과 파트너십을 통해 안정적으로 공급합니다.", "We supply reliably through trusted local channels and partnerships in China, Thailand, and Japan."],
    // home CTA
    ["제품 유통, 시장 진입, 인허가, 컨설팅에 대한 어떤 문의든 환영합니다. 엘제이바이오가 다음 단계를 함께 설계하겠습니다.", "We welcome any inquiry about product distribution, market entry, licensing, or consulting. LJ-BIO will design the next step with you."],
    ["제휴·유통 문의하기", "Partnership & Distribution Inquiry"],
    // footer
    ["과학으로 연결하는 글로벌 바이오 유통 파트너. 인허가(RA) · 유통 및 판매 · 컨설팅 & 마케팅 · 바이오 특화 IT 컨설팅.", "A global bio-distribution partner connected through science. Regulatory Affairs · Distribution & Sales · Consulting & Marketing · Bio-specialized IT consulting."],
    ["과학으로 연결하는 글로벌 바이오·뷰티 유통 파트너. 의약품 허가 · 뷰티의료 유통 · 화장품 유통 · 바이오 의료 컨설팅.", "A global bio & beauty distribution partner connected through science. Drug licensing · Aesthetic-medical distribution · Cosmetics distribution · Bio-medical consulting."],
    ["상호", "Company"], ["대표이사", "CEO"], ["사업자등록번호", "Business Reg. No."], ["주소", "Address"], ["이메일", "Email"],
    ["엘제이바이오", "LJ-BIO Inc."], ["이일형", "Lee Il-hyung"],
    ["서울특별시 강남구 학동로2길 19, 2층 2741호 (논현동, 세일빌딩)", "19, Hakdong-ro 2-gil, Gangnam-gu, Seoul, Korea (Sail Bldg., #2741)"],
    // about
    ["엘제이바이오는 의약품·뷰티의료·화장품 영역에서 인허가, 유통, 컨설팅을 아우르는 글로벌 바이오 유통 전문 기업입니다.", "LJ-BIO is a global bio-distribution specialist spanning licensing, distribution, and consulting across pharmaceuticals, aesthetic medicine, and cosmetics."],
    ["우리는 단순한 유통을 넘어, 제품과 시장 사이의 복잡한 규제와 신뢰의 간극을 메우는 일을 합니다. 각국의 규제 환경을 깊이 이해하고, 검증된 제품과 파트너를 연결하여 새로운 시장의 기회를 만듭니다.", "Beyond simple distribution, we bridge the complex gaps of regulation and trust between products and markets. We deeply understand each country’s regulatory environment and connect proven products and partners to create new market opportunities."],
    ["과학적 엄밀함과 글로벌 네트워크를 바탕으로, 엘제이바이오는 바이오·뷰티 산업의 가장 신뢰받는 유통 파트너가 되고자 합니다.", "Grounded in scientific rigor and a global network, LJ-BIO aims to become the most trusted distribution partner in the bio and beauty industries."],
    ["우리가 일하는 원칙", "Our Working Principles"],
    ["정품 유통과 투명한 절차로 파트너의 신뢰에 보답합니다.", "We honor our partners’ trust through genuine-product distribution and transparent processes."],
    ["전문성", "Expertise"],
    ["규제와 시장에 대한 깊은 이해로 정확한 솔루션을 제시합니다.", "We deliver precise solutions through deep understanding of regulation and markets."],
    ["연결", "Connection"],
    ["제품과 시장, 사람과 기회를 잇는 가교가 됩니다.", "We become the bridge linking products to markets and people to opportunities."],
    ["책임", "Responsibility"],
    ["건강과 직결된 산업에서 높은 기준의 품질을 지킵니다.", "In an industry tied directly to health, we uphold the highest quality standards."],
    ["엘제이바이오, 한눈에", "LJ-BIO at a Glance"],
    ["의약품 허가 · 뷰티의료 유통 · 화장품 유통 · 바이오 의료 컨설팅", "Drug licensing · Aesthetic-medical distribution · Cosmetics distribution · Bio-medical consulting"],
    ["자세히 보기", "Learn more"],
    ["글로벌 네트워크", "Global Network"],
    ["중국 · 태국 · 일본을 잇는 아시아 핵심 시장 유통 네트워크", "A distribution network across Asia’s core markets — China, Thailand, and Japan"],
    ["엘제이바이오와의 협력이 궁금하시다면 언제든 연락 주세요.", "Curious about partnering with LJ-BIO? Reach out anytime."],
    ["문의하기", "Contact Us"],
    // business
    ["엘제이바이오는 인허가부터 유통, 컨설팅까지 — 바이오·뷰티 산업의 가치사슬 전반을 연결합니다. 다섯 개의 전문 영역이 유기적으로 협력하여 고객의 시장 진입을 가속합니다.", "From licensing to distribution and consulting, LJ-BIO connects the entire value chain of the bio and beauty industries. Five specialized areas work organically together to accelerate clients’ market entry."],
    ["05 IT 컨설팅", "05 IT Consulting"],
    ["의약품·의료기기 통합 관리 시스템과 맞춤형 공급망 관리(SCM)를 비롯해, 바이오 산업에 특화된 IT 플랫폼을 기획·구축합니다. IT 기술을 접목한 선진화된 유통 솔루션으로 차별화된 가치를 제공합니다.", "We plan and build bio-specialized IT platforms — including integrated drug/device management systems and tailored supply-chain management (SCM). With advanced distribution solutions powered by IT, we deliver differentiated value."],
    ["의약품·의료기기 통합 관리 시스템 구축", "Integrated drug/device management system development"],
    ["맞춤형 공급망 관리(SCM) 솔루션", "Tailored supply-chain management (SCM) solutions"],
    ["바이오 특화 IT 플랫폼 기획 및 개발", "Bio-specialized IT platform planning & development"],
    ["01 의약품 허가", "01 Drug Licensing"], ["02 뷰티의료 유통", "02 Aesthetic-Medical Dist."], ["03 화장품 유통", "03 Cosmetics Dist."], ["04 바이오 의료 컨설팅", "04 Bio-Medical Consulting"],
    ["의약품 허가", "Drug Licensing"],
    ["복잡한 글로벌 규제 환경 속에서 의약품의 인허가 전 과정을 전략적으로 설계하고 실행합니다. 각국 규제기관의 요건을 정확히 분석하여 빠르고 안정적인 시장 등록을 지원합니다.", "We strategically design and execute the entire drug-licensing process within complex global regulations, precisely analyzing each agency’s requirements to support fast, stable market registration."],
    ["국가별 인허가 전략 수립 및 규제 컨설팅", "Country-specific licensing strategy & regulatory consulting"],
    ["품목허가·등록 서류 준비 및 제출 대행", "Preparation & submission of product approval/registration documents"],
    ["규제기관 커뮤니케이션 및 사후 변경 관리", "Regulatory-agency communication & post-approval change management"],
    ["뷰티의료 유통", "Aesthetic-Medical Distribution"],
    ["에스테틱·메디컬 디바이스와 시술 제품을 검증된 채널을 통해 병의원과 클리닉에 안정적으로 공급합니다. 제품의 품질과 정품 유통 관리에 최우선 가치를 둡니다.", "We reliably supply aesthetic and medical devices and procedure products to hospitals and clinics through verified channels, placing top priority on product quality and genuine-distribution control."],
    ["에스테틱·메디컬 디바이스 유통", "Aesthetic & medical device distribution"],
    ["시술용 소재 및 소모품 공급", "Supply of procedure materials & consumables"],
    ["병의원·클리닉 채널 관리 및 교육 지원", "Clinic channel management & training support"],
    ["화장품 유통", "Cosmetics Distribution"],
    ["검증된 K-뷰티 브랜드를 글로벌 시장과 연결합니다. 현지 규제 대응부터 온·오프라인 채널 운영까지, 브랜드의 해외 진출 전 과정을 함께합니다.", "We connect proven K-beauty brands with global markets, supporting the entire overseas-expansion journey from local regulatory response to on/offline channel operations."],
    ["K-뷰티 브랜드 글로벌 수출·유통", "Global export & distribution of K-beauty brands"],
    ["현지 규제 대응 및 제품 인증 지원", "Local regulatory response & product certification support"],
    ["온·오프라인 유통 채널 운영", "On/offline distribution channel operations"],
    ["바이오 의료 컨설팅", "Bio-Medical Consulting"],
    ["시장 진입 전략부터 파트너십 구축, 규제·임상 자문까지 — 축적된 산업 전문성을 바탕으로 고객의 의사결정을 지원하는 종합 컨설팅을 제공합니다.", "From market-entry strategy to partnership building and regulatory/clinical advisory, we offer comprehensive consulting that supports clients’ decisions with deep industry expertise."],
    ["시장 진입 전략 및 타당성 분석", "Market-entry strategy & feasibility analysis"],
    ["파트너십·디스트리뷰터 매칭", "Partnership & distributor matching"],
    ["규제·임상·품질 자문", "Regulatory, clinical & quality advisory"],
    ["어떤 영역이든, 먼저 상담해보세요", "Whatever the area, let’s talk first"],
    ["제품과 시장에 맞는 최적의 솔루션을 함께 찾아드립니다.", "Together we’ll find the optimal solution for your product and market."],
    // global
    ["중국·태국·일본 — 빠르게 성장하는 아시아 바이오·뷰티 시장에서, 현지 규제와 채널을 깊이 이해하는 신뢰의 파트너로 함께합니다.", "China, Thailand, Japan — in Asia’s fast-growing bio and beauty markets, we partner with you as a trusted ally who deeply understands local regulations and channels."],
    ["핵심 글로벌 거점", "Core global bases"], ["통합 사업영역 연계", "Integrated business linkage"], ["허가 → 유통 → 사후관리", "Licensing → Distribution → Aftercare"],
    ["주요 진출 시장", "Key Target Markets"],
    ["각 시장의 규제 환경과 소비 특성에 맞춘 현지화 전략으로 접근합니다.", "We approach each market with a localization strategy tailored to its regulatory environment and consumer characteristics."],
    ["세계 최대 규모의 뷰티·헬스케어 소비 시장. 까다로운 인허가 요건에 대응하여 안정적인 등록과 유통을 지원합니다.", "The world’s largest beauty and healthcare consumer market. We address demanding licensing requirements to support stable registration and distribution."],
    ["의약품 등록", "Drug registration"], ["화장품 수입유통", "Cosmetics import & distribution"], ["메디컬 디바이스", "Medical devices"],
    ["동남아시아 진출의 전략적 허브. 지역 디스트리뷰터 네트워크를 통해 뷰티·웰니스 시장으로 확장합니다.", "A strategic hub for Southeast Asia. We expand into beauty and wellness markets through regional distributor networks."],
    ["FDA 인허가", "FDA licensing"], ["뷰티·웰니스 유통", "Beauty & wellness distribution"], ["지역 채널", "Regional channels"],
    ["품질과 신뢰를 중시하는 프리미엄 시장. 정밀한 규제 대응과 클리닉 채널 파트너십으로 진입합니다.", "A premium market that values quality and trust. We enter through precise regulatory response and clinic-channel partnerships."],
    ["의약외품·화장품", "Quasi-drugs & cosmetics"], ["클리닉 채널", "Clinic channels"], ["품질 파트너십", "Quality partnerships"],
    ["시장 분석", "Market Analysis"],
    ["규제 환경, 경쟁 구도, 소비자 특성을 분석하여 진입 가능성을 진단합니다.", "We analyze the regulatory landscape, competition, and consumer traits to assess entry feasibility."],
    ["인허가 · 등록", "Licensing & Registration"],
    ["국가별 요건에 맞춘 인허가 전략을 수립하고 등록 절차를 대행합니다.", "We establish country-specific licensing strategies and handle registration procedures."],
    ["유통 · 운영", "Distribution & Operations"],
    ["검증된 현지 채널을 통해 안정적으로 유통하고 사후 관리까지 지원합니다.", "We distribute reliably through verified local channels and support aftercare."],
    ["중국·태국·일본 시장 진입 전략을 엘제이바이오와 함께 설계해보세요.", "Design your market-entry strategy for China, Thailand, and Japan with LJ-BIO."],
    ["글로벌 진출 문의", "Global Inquiry"],
    // contact
    ["제품 유통, 시장 진입, 인허가, 컨설팅 — 어떤 문의든 환영합니다. 영업일 기준 2일 이내에 답변드리겠습니다.", "Product distribution, market entry, licensing, consulting — any inquiry is welcome. We’ll reply within two business days."],
    ["연락처 안내", "Contact Information"],
    ["서울특별시 강남구 학동로2길 19", "19, Hakdong-ro 2-gil, Gangnam-gu, Seoul"],
    ["2층 2741호 · Republic of Korea", "2F #2741 · Republic of Korea"],
    ["평일 09:00 – 18:00", "Weekdays 09:00 – 18:00"], ["주말·공휴일 휴무", "Closed weekends & holidays"],
    ["제휴·유통", "Partnership & Distribution"], ["바이오 컨설팅", "Bio Consulting"],
    ["이름", "Name"], ["회사 / 기관", "Company / Organization"], ["연락처", "Phone"], ["문의 유형", "Inquiry Type"], ["문의 내용", "Message"],
    ["제휴 · 유통 문의", "Partnership / Distribution"], ["의약품 허가 / 인허가", "Drug Licensing / Regulatory"],
    ["화장품 · 뷰티의료 유통", "Cosmetics / Aesthetic-Medical"], ["글로벌 진출 (중국·태국·일본)", "Global Expansion (China·Thailand·Japan)"], ["기타", "Other"],
    ["개인정보 수집 및 이용에 동의합니다. 입력하신 정보는 문의 응대 목적으로만 사용됩니다.", "I agree to the collection and use of my personal information. Your details will be used solely to respond to your inquiry."],
    ["문의 보내기", "Send Inquiry"],
    ["문의가 접수되었습니다", "Your inquiry has been received"],
    ["소중한 문의 감사합니다. 담당자가 확인 후 영업일 기준 2일 이내에 회신드리겠습니다.", "Thank you for your inquiry. Our team will review it and reply within two business days."],
    ["다른 문의하기", "Send another inquiry"]
  ];

  // input/textarea placeholders (attribute-level)
  var PH = [
    ["홍길동", "John Doe"],
    ["회사명", "Company name"],
    ["문의하실 내용을 자유롭게 작성해주세요.", "Feel free to write your inquiry here."]
  ];

  function norm(s) { return (s || "").replace(/\s+/g, "").trim(); }
  var elMap = {}, txtMap = {}, phMap = {};
  ELEMENTS.forEach(function (p) { elMap[norm(p[0])] = p[1]; });
  TEXT.forEach(function (p) { txtMap[norm(p[0])] = p[1]; });
  PH.forEach(function (p) { phMap[norm(p[0])] = p[1]; });

  var entries = [];
  var seenEl = new WeakSet(), seenNode = new WeakSet(), seenPh = new WeakSet();

  // Cumulative scan — safe to run many times; dedup is closure-local (survives stale DOM).
  function scan() {
    var heads = document.querySelectorAll("h1,h2,h3,p");
    for (var i = 0; i < heads.length; i++) {
      var el = heads[i];
      if (seenEl.has(el)) continue;
      var k = norm(el.textContent);
      if (elMap[k]) { seenEl.add(el); entries.push({ t: "el", el: el, ko: el.innerHTML, en: elMap[k] }); }
    }
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (seenNode.has(n)) continue;
      var pe = n.parentElement;
      if (!pe) continue;
      var tag = pe.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") continue;
      var anc = pe, skip = false;
      while (anc) { if (seenEl.has(anc)) { skip = true; break; } anc = anc.parentElement; }
      if (skip) continue;
      var raw = n.nodeValue, k2 = norm(raw);
      if (k2 && txtMap[k2]) {
        seenNode.add(n);
        var lead = (raw.match(/^\s*/) || [""])[0];
        var trail = (raw.match(/\s*$/) || [""])[0];
        entries.push({ t: "txt", node: n, ko: raw, en: lead + txtMap[k2] + trail });
      }
    }
    var phs = document.querySelectorAll("[placeholder]");
    for (var j = 0; j < phs.length; j++) {
      var e = phs[j];
      if (seenPh.has(e)) continue;
      var pk = norm(e.getAttribute("placeholder"));
      if (phMap[pk]) { seenPh.add(e); entries.push({ t: "ph", el: e, ko: e.getAttribute("placeholder"), en: phMap[pk] }); }
    }
  }

  function apply(lang) {
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i], v = (lang === "en") ? e.en : e.ko;
      try {
        if (e.t === "el") e.el.innerHTML = v;
        else if (e.t === "txt") e.node.nodeValue = v;
        else e.el.setAttribute("placeholder", v);
      } catch (x) {}
    }
    try { localStorage.setItem("lj_lang", lang); } catch (x) {}
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "ko");
    updateToggle(lang);
    window.__ljLang = lang;
  }

  function updateToggle(lang) {
    var lt = document.getElementById("langToggle");
    if (!lt) return;
    var ko = lt.querySelector('[data-l="ko"]'), en = lt.querySelector('[data-l="en"]');
    if (!ko || !en) return;
    function on(s) { s.style.background = "#0E7B4E"; s.style.color = "#fff"; }
    function off(s) { s.style.background = "transparent"; s.style.color = "#5A6560"; }
    if (lang === "en") { on(en); off(ko); } else { on(ko); off(en); }
  }

  function getLang() { try { return localStorage.getItem("lj_lang") || "ko"; } catch (x) { return "ko"; } }

  function refresh() { scan(); apply(getLang()); }

  window.LJI18N = {
    init: function () {
      refresh();
      [200, 600, 1200, 2200, 3500].forEach(function (d) { setTimeout(refresh, d); });
    },
    apply: function (l) { scan(); apply(l); },
    toggle: function () { scan(); apply(getLang() === "en" ? "ko" : "en"); }
  };
})();
