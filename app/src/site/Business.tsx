import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import SiteChrome from "./SiteChrome";

const areas = [
  {
    id: "a01",
    idx: "01",
    tag: "REGULATORY AFFAIRS",
    img: "/assets/biz-docs.jpg",
    objPos: "center",
    reverse: false,
    ko: { h: "의약품 허가", p: "복잡한 글로벌 규제 환경 속에서 의약품의 인허가 전 과정을 전략적으로 설계하고 실행합니다. 각국 규제기관의 요건을 정확히 분석하여 빠르고 안정적인 시장 등록을 지원합니다." },
    en: { h: "Drug Licensing", p: "We strategically design and execute the entire drug-licensing process within complex global regulations, precisely analyzing each agency’s requirements to support fast, stable market registration." },
    services: [
      { ko: "국가별 인허가 전략 수립 및 규제 컨설팅", en: "Country-specific licensing strategy & regulatory consulting" },
      { ko: "품목허가·등록 서류 준비 및 제출 대행", en: "Preparation & submission of product approval/registration documents" },
      { ko: "규제기관 커뮤니케이션 및 사후 변경 관리", en: "Regulatory-agency communication & post-approval change management" },
    ],
  },
  {
    id: "a02",
    idx: "02",
    tag: "AESTHETIC & MEDICAL",
    img: "/assets/medical-beauty.jpg",
    objPos: "center 28%",
    reverse: true,
    ko: { h: "뷰티의료 유통", p: "에스테틱·메디컬 디바이스와 시술 제품을 검증된 채널을 통해 병의원과 클리닉에 안정적으로 공급합니다. 제품의 품질과 정품 유통 관리에 최우선 가치를 둡니다." },
    en: { h: "Aesthetic-Medical Distribution", p: "We reliably supply aesthetic and medical devices and procedure products to hospitals and clinics through verified channels, placing top priority on product quality and genuine-distribution control." },
    services: [
      { ko: "에스테틱·메디컬 디바이스 유통", en: "Aesthetic & medical device distribution" },
      { ko: "시술용 소재 및 소모품 공급", en: "Supply of procedure materials & consumables" },
      { ko: "병의원·클리닉 채널 관리 및 교육 지원", en: "Clinic channel management & training support" },
    ],
  },
  {
    id: "a03",
    idx: "03",
    tag: "COSMETICS",
    img: "/assets/mask-face.jpg",
    objPos: "center",
    reverse: false,
    ko: { h: "화장품 유통", p: "검증된 K-뷰티 브랜드를 글로벌 시장과 연결합니다. 현지 규제 대응부터 온·오프라인 채널 운영까지, 브랜드의 해외 진출 전 과정을 함께합니다." },
    en: { h: "Cosmetics Distribution", p: "We connect proven K-beauty brands with global markets, supporting the entire overseas-expansion journey from local regulatory response to on/offline channel operations." },
    services: [
      { ko: "K-뷰티 브랜드 글로벌 수출·유통", en: "Global export & distribution of K-beauty brands" },
      { ko: "현지 규제 대응 및 제품 인증 지원", en: "Local regulatory response & product certification support" },
      { ko: "온·오프라인 유통 채널 운영", en: "On/offline distribution channel operations" },
    ],
  },
  {
    id: "a04",
    idx: "04",
    tag: "BIO-MEDICAL CONSULTING",
    img: "/assets/biz-handshake.jpg",
    objPos: "center",
    reverse: true,
    ko: { h: "바이오 의료 컨설팅", p: "시장 진입 전략부터 파트너십 구축, 규제·임상 자문까지 — 축적된 산업 전문성을 바탕으로 고객의 의사결정을 지원하는 종합 컨설팅을 제공합니다." },
    en: { h: "Bio-Medical Consulting", p: "From market-entry strategy to partnership building and regulatory/clinical advisory, we offer comprehensive consulting that supports clients’ decisions with deep industry expertise." },
    services: [
      { ko: "시장 진입 전략 및 타당성 분석", en: "Market-entry strategy & feasibility analysis" },
      { ko: "파트너십·디스트리뷰터 매칭", en: "Partnership & distributor matching" },
      { ko: "규제·임상·품질 자문", en: "Regulatory, clinical & quality advisory" },
    ],
  },
  {
    id: "a05",
    idx: "05",
    tag: "IT CONSULTING",
    img: "/assets/digital-network.jpg",
    objPos: "center",
    reverse: false,
    ko: { h: "IT 컨설팅", p: "의약품·의료기기 통합 관리 시스템과 맞춤형 공급망 관리(SCM)를 비롯해, 바이오 산업에 특화된 IT 플랫폼을 기획·구축합니다. IT 기술을 접목한 선진화된 유통 솔루션으로 차별화된 가치를 제공합니다." },
    en: { h: "IT Consulting", p: "We plan and build bio-specialized IT platforms — including integrated drug/device management systems and tailored supply-chain management (SCM). With advanced distribution solutions powered by IT, we deliver differentiated value." },
    services: [
      { ko: "의약품·의료기기 통합 관리 시스템 구축", en: "Integrated drug/device management system development" },
      { ko: "맞춤형 공급망 관리(SCM) 솔루션", en: "Tailored supply-chain management (SCM) solutions" },
      { ko: "바이오 특화 IT 플랫폼 기획 및 개발", en: "Bio-specialized IT platform planning & development" },
    ],
  },
];

const pills = [
  { href: "#a01", ko: "01 의약품 허가", en: "01 Drug Licensing" },
  { href: "#a02", ko: "02 뷰티의료 유통", en: "02 Aesthetic-Medical Dist." },
  { href: "#a03", ko: "03 화장품 유통", en: "03 Cosmetics Dist." },
  { href: "#a04", ko: "04 바이오 의료 컨설팅", en: "04 Bio-Medical Consulting" },
  { href: "#a05", ko: "05 IT 컨설팅", en: "05 IT Consulting" },
];

export default function Business() {
  const { t } = useLang();

  return (
    <SiteChrome>
      {/* PAGE HERO */}
      <section style={{ position: "relative", padding: "170px 44px 90px", background: "#EFF4F0", borderBottom: "1px solid rgba(20,21,27,0.08)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -60, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,123,78,0.16),transparent 65%)" }} />
        <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#0E7B4E", marginBottom: 22 }}>— BUSINESS AREAS</div>
          <h1 data-reveal style={{ fontSize: "clamp(40px,5vw,72px)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.035em", color: "#16171B" }}>{t("사업영역", "Business")}</h1>
          <p data-reveal data-delay="100" style={{ marginTop: 26, fontSize: "clamp(17px,1.5vw,20px)", lineHeight: 1.7, color: "#5A5C65", maxWidth: 620, letterSpacing: "-0.01em" }}>
            {t("엘제이바이오는 인허가부터 유통, 컨설팅까지 — 바이오·뷰티 산업의 가치사슬 전반을 연결합니다. 다섯 개의 전문 영역이 유기적으로 협력하여 고객의 시장 진입을 가속합니다.", "From licensing to distribution and consulting, LJ-BIO connects the entire value chain of the bio and beauty industries. Five specialized areas work organically together to accelerate clients’ market entry.")}
          </p>
          <div data-reveal data-delay="180" style={{ marginTop: 44, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {pills.map((p) => (
              <a key={p.href} href={p.href} className="mono" style={{ fontSize: 13, fontWeight: 600, color: "#16171B", background: "#fff", border: "1px solid rgba(20,21,27,0.12)", padding: "10px 18px", borderRadius: 100 }}>
                {t(p.ko, p.en)}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* AREA DETAILS */}
      {areas.map((a) => {
        const media = (
          <div data-reveal="" className="m-media" style={{ order: a.reverse ? 1 : undefined, position: "relative", borderRadius: 24, overflow: "hidden", height: 460 }}>
            <img className="detimg" src={a.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: a.objPos }} />
          </div>
        );
        const text = (
          <div data-reveal data-delay="100" style={{ order: a.reverse ? 2 : undefined }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "#0E7B4E" }}>{a.idx}</span>
              <span className="mono" style={{ fontSize: 12, letterSpacing: "0.12em", color: "#9EA8A2" }}>{a.tag}</span>
            </div>
            <h2 style={{ marginTop: 16, fontSize: "clamp(28px,3vw,40px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#16171B" }}>{t(a.ko.h, a.en.h)}</h2>
            <p style={{ marginTop: 18, fontSize: 17, lineHeight: 1.75, color: "#5A5C65" }}>{t(a.ko.p, a.en.p)}</p>
            <div style={{ marginTop: 30, display: "flex", flexDirection: "column", borderTop: "1px solid rgba(20,21,27,0.1)" }}>
              {a.services.map((s, i) => (
                <div key={i} className="svc" style={{ padding: "16px 0", borderBottom: i < a.services.length - 1 ? "1px solid rgba(20,21,27,0.1)" : undefined, fontSize: 16, fontWeight: 500, color: "#16171B" }}>
                  {t(s.ko, s.en)}
                </div>
              ))}
            </div>
          </div>
        );
        return (
          <section key={a.id} id={a.id} style={{ scrollMarginTop: 90, padding: "110px 44px", background: "#fff", borderBottom: "1px solid rgba(20,21,27,0.08)" }}>
            <div className="detgroup m-stack" style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 74, alignItems: "center" }}>
              {a.reverse ? (
                <>
                  {text}
                  {media}
                </>
              ) : (
                <>
                  {media}
                  {text}
                </>
              )}
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section style={{ position: "relative", padding: "120px 44px", background: "#16171B", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, left: -80, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,123,78,0.28),transparent 65%)" }} />
        <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto", textAlign: "center" }}>
          <h2 data-reveal style={{ fontSize: "clamp(28px,3.4vw,46px)", fontWeight: 700, lineHeight: 1.14, letterSpacing: "-0.035em", color: "#fff" }}>{t("어떤 영역이든, 먼저 상담해보세요", "Whatever the area, let’s talk first")}</h2>
          <p data-reveal data-delay="100" style={{ marginTop: 20, fontSize: 18, color: "rgba(255,255,255,0.62)", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>{t("제품과 시장에 맞는 최적의 솔루션을 함께 찾아드립니다.", "Together we’ll find the optimal solution for your product and market.")}</p>
          <Link data-reveal data-delay="160" to="/contact" className="btn-primary" style={{ marginTop: 36, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: "#16171B", background: "#fff", padding: "16px 34px", borderRadius: 100 }}>{t("문의하기", "Contact Us")} <span>→</span></Link>
        </div>
      </section>
    </SiteChrome>
  );
}
