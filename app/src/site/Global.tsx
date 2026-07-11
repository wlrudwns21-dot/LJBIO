import { type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import SiteChrome from "./SiteChrome";

const gradText: CSSProperties = {
  background: "linear-gradient(110deg,#0E7B4E,#37C07F)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
const statNum: CSSProperties = {
  fontSize: "clamp(30px,3.4vw,44px)",
  fontWeight: 600,
  background: "linear-gradient(120deg,#0E7B4E,#37C07F)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const heroStats = [
  { n: "3", ko: "핵심 글로벌 거점", en: "Core global bases" },
  { n: "4", ko: "통합 사업영역 연계", en: "Integrated business linkage" },
  { n: "360°", ko: "허가 → 유통 → 사후관리", en: "Licensing → Distribution → Aftercare" },
];

const markets = [
  {
    ch: "中",
    img: "/assets/china.jpg",
    objPos: "center",
    label: "CHINA",
    delay: 0,
    ko: { name: "중국", p: "세계 최대 규모의 뷰티·헬스케어 소비 시장. 까다로운 인허가 요건에 대응하여 안정적인 등록과 유통을 지원합니다." },
    en: { name: "China", p: "The world’s largest beauty and healthcare consumer market. We address demanding licensing requirements to support stable registration and distribution." },
    chips: [
      { ko: "의약품 등록", en: "Drug registration" },
      { ko: "화장품 수입유통", en: "Cosmetics import & distribution" },
      { ko: "메디컬 디바이스", en: "Medical devices" },
    ],
  },
  {
    ch: "泰",
    img: "/assets/thailand.jpg",
    objPos: "center",
    label: "THAILAND",
    delay: 90,
    ko: { name: "태국", p: "동남아시아 진출의 전략적 허브. 지역 디스트리뷰터 네트워크를 통해 뷰티·웰니스 시장으로 확장합니다." },
    en: { name: "Thailand", p: "A strategic hub for Southeast Asia. We expand into beauty and wellness markets through regional distributor networks." },
    chips: [
      { ko: "FDA 인허가", en: "FDA licensing" },
      { ko: "뷰티·웰니스 유통", en: "Beauty & wellness distribution" },
      { ko: "지역 채널", en: "Regional channels" },
    ],
  },
  {
    ch: "日",
    img: "/assets/japan.jpg",
    objPos: "center 35%",
    label: "JAPAN",
    delay: 180,
    ko: { name: "일본", p: "품질과 신뢰를 중시하는 프리미엄 시장. 정밀한 규제 대응과 클리닉 채널 파트너십으로 진입합니다." },
    en: { name: "Japan", p: "A premium market that values quality and trust. We enter through precise regulatory response and clinic-channel partnerships." },
    chips: [
      { ko: "의약외품·화장품", en: "Quasi-drugs & cosmetics" },
      { ko: "클리닉 채널", en: "Clinic channels" },
      { ko: "품질 파트너십", en: "Quality partnerships" },
    ],
  },
];

const steps = [
  { s: "STEP 01", delay: 0, ko: { h: "시장 분석", p: "규제 환경, 경쟁 구도, 소비자 특성을 분석하여 진입 가능성을 진단합니다." }, en: { h: "Market Analysis", p: "We analyze the regulatory landscape, competition, and consumer traits to assess entry feasibility." } },
  { s: "STEP 02", delay: 80, ko: { h: "인허가 · 등록", p: "국가별 요건에 맞춘 인허가 전략을 수립하고 등록 절차를 대행합니다." }, en: { h: "Licensing & Registration", p: "We establish country-specific licensing strategies and handle registration procedures." } },
  { s: "STEP 03", delay: 160, ko: { h: "유통 · 운영", p: "검증된 현지 채널을 통해 안정적으로 유통하고 사후 관리까지 지원합니다." }, en: { h: "Distribution & Operations", p: "We distribute reliably through verified local channels and support aftercare." } },
];

export default function Global() {
  const { t, lang } = useLang();

  return (
    <SiteChrome>
      {/* HERO (dark) */}
      <section style={{ position: "relative", padding: "180px 44px 110px", background: "#16171B", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, right: -80, width: 540, height: 540, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,123,78,0.28),transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: -160, left: -120, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle,rgba(55,192,127,0.20),transparent 65%)" }} />
        <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#37C07F", marginBottom: 24 }}>— GLOBAL NETWORK</div>
          <h1 data-reveal style={{ fontSize: "clamp(40px,5vw,74px)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.035em", color: "#fff", maxWidth: 900 }}>
            {lang === "ko" ? (<>아시아 핵심 시장을<br /><span style={gradText}>잇는 유통 네트워크</span></>) : (<>A Distribution Network<br /><span style={gradText}>Linking Asia’s Core Markets</span></>)}
          </h1>
          <p data-reveal data-delay="100" style={{ marginTop: 28, fontSize: "clamp(17px,1.5vw,20px)", lineHeight: 1.75, color: "rgba(255,255,255,0.62)", maxWidth: 620, letterSpacing: "-0.01em" }}>
            {t("중국·태국·일본 — 빠르게 성장하는 아시아 바이오·뷰티 시장에서, 현지 규제와 채널을 깊이 이해하는 신뢰의 파트너로 함께합니다.", "China, Thailand, Japan — in Asia’s fast-growing bio and beauty markets, we partner with you as a trusted ally who deeply understands local regulations and channels.")}
          </p>
          <div data-reveal data-delay="170" style={{ marginTop: 48, display: "flex", gap: 54, flexWrap: "wrap" }}>
            {heroStats.map((s) => (
              <div key={s.n}>
                <div className="mono" style={statNum}>{s.n}</div>
                <div style={{ marginTop: 6, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>{t(s.ko, s.en)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKETS */}
      <section style={{ padding: "120px 44px", background: "#EFF4F0", borderBottom: "1px solid rgba(20,21,27,0.08)" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <h2 data-reveal style={{ fontSize: "clamp(26px,3vw,40px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#16171B", marginBottom: 14 }}>{t("주요 진출 시장", "Key Target Markets")}</h2>
          <p data-reveal data-delay="80" style={{ fontSize: 17, color: "#6A6C75", marginBottom: 56 }}>{t("각 시장의 규제 환경과 소비 특성에 맞춘 현지화 전략으로 접근합니다.", "We approach each market with a localization strategy tailored to its regulatory environment and consumer characteristics.")}</p>

          <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 26 }}>
            {markets.map((m) => (
              <div key={m.label} data-reveal data-delay={m.delay || undefined} className="mktcard" style={{ background: "#fff", border: "1px solid rgba(20,21,27,0.08)", borderRadius: 24, overflow: "hidden" }}>
                <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                  <img className="mktimg" src={m.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: m.objPos }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(22,23,27,0) 40%,rgba(22,23,27,0.55))" }} />
                  <div style={{ position: "absolute", left: 26, bottom: 18, display: "flex", alignItems: "flex-end", gap: 14 }}>
                    <span className="mono" style={{ fontSize: 56, fontWeight: 700, lineHeight: 0.8, color: "#fff" }}>{m.ch}</span>
                    <div style={{ paddingBottom: 4 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{t(m.ko.name, m.en.name)}</div>
                      <div className="mono" style={{ fontSize: 12, letterSpacing: "0.1em", color: "rgba(255,255,255,0.7)" }}>{m.label}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "28px 28px 32px" }}>
                  <p style={{ fontSize: 15, lineHeight: 1.7, color: "#5A5C65", minHeight: 84 }}>{t(m.ko.p, m.en.p)}</p>
                  <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {m.chips.map((c, i) => (
                      <span key={i} className="chip" style={{ fontSize: 12.5, fontWeight: 600, color: "#0E7B4E", background: "#E6F2EA", padding: "7px 13px", borderRadius: 100 }}>{t(c.ko, c.en)}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPROACH */}
      <section style={{ padding: "120px 44px", background: "#fff" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#84908A", marginBottom: 22 }}>— OUR APPROACH</div>
          <h2 data-reveal style={{ fontSize: "clamp(26px,3.2vw,44px)", fontWeight: 700, lineHeight: 1.16, letterSpacing: "-0.035em", color: "#16171B", maxWidth: 760 }}>
            {lang === "ko" ? (<>현지화된 전략으로<br />새로운 시장을 엽니다</>) : (<>Opening New Markets<br />with Localized Strategy</>)}
          </h2>
          <div className="m-stack" style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "rgba(20,21,27,0.08)", borderTop: "1px solid rgba(20,21,27,0.08)", borderBottom: "1px solid rgba(20,21,27,0.08)" }}>
            {steps.map((st) => (
              <div key={st.s} data-reveal data-delay={st.delay || undefined} style={{ background: "#fff", padding: "42px 34px 48px" }}>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: "#0E7B4E" }}>{st.s}</div>
                <h3 style={{ marginTop: 16, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#16171B" }}>{t(st.ko.h, st.en.h)}</h3>
                <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.7, color: "#6A6C75" }}>{t(st.ko.p, st.en.p)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", padding: "0 44px 130px", background: "#fff" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", borderRadius: 30, overflow: "hidden" }}>
          <img src="/assets/earth-network.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg,rgba(22,23,27,0.78),rgba(22,23,27,0.30))" }} />
          <div className="m-cta" style={{ position: "relative", padding: "90px 64px" }}>
            <h2 data-reveal style={{ fontSize: "clamp(28px,3.4vw,46px)", fontWeight: 700, lineHeight: 1.14, letterSpacing: "-0.035em", color: "#fff", maxWidth: 620 }}>
              {lang === "ko" ? (<>아시아 진출을<br />준비하고 계신가요?</>) : (<>Planning to Expand<br />into Asia?</>)}
            </h2>
            <p data-reveal data-delay="100" style={{ marginTop: 20, fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.82)", maxWidth: 520 }}>{t("중국·태국·일본 시장 진입 전략을 엘제이바이오와 함께 설계해보세요.", "Design your market-entry strategy for China, Thailand, and Japan with LJ-BIO.")}</p>
            <Link data-reveal data-delay="170" to="/contact" className="btn-primary" style={{ marginTop: 36, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: "#16171B", background: "#fff", padding: "16px 34px", borderRadius: 100 }}>{t("글로벌 진출 문의", "Global Inquiry")} <span>→</span></Link>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
