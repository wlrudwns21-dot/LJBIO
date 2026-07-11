import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import SiteChrome from "./SiteChrome";

function useVideoAutoplay(ref: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    vid.muted = true;
    vid.setAttribute("muted", "");
    const tryPlay = () => {
      const p = vid.play();
      if (p && p.catch) p.catch(() => {});
    };
    const seekNice = () => {
      if (vid.paused) {
        try {
          vid.currentTime = Math.max(0, (vid.duration || 10) * 0.45);
        } catch {
          /* ignore */
        }
      }
    };
    const kick = () => {
      tryPlay();
      setTimeout(seekNice, 400);
    };
    kick();
    vid.addEventListener("canplay", kick, { once: true });
    vid.addEventListener("loadeddata", kick, { once: true });
    window.addEventListener("pointerdown", tryPlay, { once: true });
  }, [ref]);
}

const values = [
  { n: "01", key: "TRUST", delay: 0, ko: { h: "신뢰", p: "정품 유통과 투명한 절차로 파트너의 신뢰에 보답합니다." }, en: { h: "Trust", p: "We honor our partners’ trust through genuine-product distribution and transparent processes." } },
  { n: "02", key: "EXPERTISE", delay: 70, ko: { h: "전문성", p: "규제와 시장에 대한 깊은 이해로 정확한 솔루션을 제시합니다." }, en: { h: "Expertise", p: "We deliver precise solutions through deep understanding of regulation and markets." } },
  { n: "03", key: "CONNECTION", delay: 140, ko: { h: "연결", p: "제품과 시장, 사람과 기회를 잇는 가교가 됩니다." }, en: { h: "Connection", p: "We become the bridge linking products to markets and people to opportunities." } },
  { n: "04", key: "RESPONSIBILITY", delay: 210, ko: { h: "책임", p: "건강과 직결된 산업에서 높은 기준의 품질을 지킵니다." }, en: { h: "Responsibility", p: "In an industry tied directly to health, we uphold the highest quality standards." } },
];

const overlay: CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(160deg,rgba(22,23,27,0.30),rgba(22,23,27,0.78))" };

export default function About() {
  const { t, lang } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoAutoplay(videoRef);

  return (
    <SiteChrome>
      {/* HERO */}
      <section style={{ position: "relative", padding: "170px 44px 96px", background: "#EFF4F0", borderBottom: "1px solid rgba(20,21,27,0.08)", overflow: "hidden" }}>
        <img src="/assets/green-molecule.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(95deg,rgba(239,244,240,0.97) 0%,rgba(239,244,240,0.9) 40%,rgba(239,244,240,0.62) 70%,rgba(239,244,240,0.32) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(239,244,240,0.5),rgba(239,244,240,0) 40%)" }} />
        <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#0E7B4E", marginBottom: 22 }}>— ABOUT US</div>
          <h1 data-reveal style={{ fontSize: "clamp(40px,5vw,72px)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.035em", color: "#16171B" }}>{t("회사소개", "About")}</h1>
          <p data-reveal data-delay="100" style={{ marginTop: 26, fontSize: "clamp(18px,1.6vw,22px)", lineHeight: 1.65, color: "#3C3E47", maxWidth: 760, letterSpacing: "-0.015em", fontWeight: 500 }}>
            {t("엘제이바이오는 의약품·뷰티의료·화장품 영역에서 인허가, 유통, 컨설팅을 아우르는 글로벌 바이오 유통 전문 기업입니다.", "LJ-BIO is a global bio-distribution specialist spanning licensing, distribution, and consulting across pharmaceuticals, aesthetic medicine, and cosmetics.")}
          </p>
        </div>
      </section>

      {/* VISION */}
      <section style={{ padding: "120px 44px", background: "#fff", borderBottom: "1px solid rgba(20,21,27,0.08)" }}>
        <div className="m-stack" style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 74, alignItems: "center" }}>
          <div data-reveal className="m-media" style={{ position: "relative", borderRadius: 24, overflow: "hidden", height: 480, background: "#0B0E0C" }}>
            <video ref={videoRef} autoPlay muted loop playsInline preload="auto" poster="/assets/about-poster.png" style={{ width: "100%", height: "100%", objectFit: "cover" }}>
              <source src="/assets/about-video.mp4" type="video/mp4" />
            </video>
          </div>
          <div>
            <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#84908A", marginBottom: 22 }}>— OUR VISION</div>
            <h2 data-reveal style={{ fontSize: "clamp(28px,3.2vw,46px)", fontWeight: 700, lineHeight: 1.18, letterSpacing: "-0.035em", color: "#16171B" }}>
              {lang === "ko" ? (<>검증된 과학으로<br />신뢰를 유통합니다</>) : (<>Distributing Trust<br />Through Proven Science</>)}
            </h2>
            <p data-reveal data-delay="100" style={{ marginTop: 24, fontSize: 17, lineHeight: 1.8, color: "#5A5C65" }}>
              {t("우리는 단순한 유통을 넘어, 제품과 시장 사이의 복잡한 규제와 신뢰의 간극을 메우는 일을 합니다. 각국의 규제 환경을 깊이 이해하고, 검증된 제품과 파트너를 연결하여 새로운 시장의 기회를 만듭니다.", "Beyond simple distribution, we bridge the complex gaps of regulation and trust between products and markets. We deeply understand each country’s regulatory environment and connect proven products and partners to create new market opportunities.")}
            </p>
            <p data-reveal data-delay="160" style={{ marginTop: 18, fontSize: 17, lineHeight: 1.8, color: "#5A5C65" }}>
              {t("과학적 엄밀함과 글로벌 네트워크를 바탕으로, 엘제이바이오는 바이오·뷰티 산업의 가장 신뢰받는 유통 파트너가 되고자 합니다.", "Grounded in scientific rigor and a global network, LJ-BIO aims to become the most trusted distribution partner in the bio and beauty industries.")}
            </p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section style={{ padding: "120px 44px", background: "#EFF4F0", borderBottom: "1px solid rgba(20,21,27,0.08)" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#0E7B4E", marginBottom: 22 }}>— CORE VALUES</div>
          <h2 data-reveal style={{ fontSize: "clamp(26px,3vw,42px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#16171B" }}>{t("우리가 일하는 원칙", "Our Working Principles")}</h2>
          <div className="m-stack" style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            {values.map((v) => (
              <div key={v.n} data-reveal data-delay={v.delay || undefined} className="valcard" style={{ background: "#fff", border: "1px solid rgba(20,21,27,0.08)", borderRadius: 22, padding: "34px 30px 38px" }}>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: "#0E7B4E" }}>{v.n}</div>
                <h3 style={{ marginTop: 18, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#16171B" }}>{t(v.ko.h, v.en.h)}</h3>
                <div className="mono" style={{ fontSize: 12, letterSpacing: "0.1em", color: "#9EA8A2", marginTop: 4 }}>{v.key}</div>
                <p style={{ marginTop: 14, fontSize: 14.5, lineHeight: 1.7, color: "#6A6C75" }}>{t(v.ko.p, v.en.p)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK OVERVIEW */}
      <section style={{ padding: "120px 44px", background: "#fff" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#84908A", marginBottom: 22 }}>— AT A GLANCE</div>
          <h2 data-reveal style={{ fontSize: "clamp(26px,3vw,42px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#16171B", marginBottom: 48 }}>{t("엘제이바이오, 한눈에", "LJ-BIO at a Glance")}</h2>
          <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <Link data-reveal to="/business" className="qlink" style={{ display: "block", position: "relative", borderRadius: 24, overflow: "hidden", minHeight: 300 }}>
              <img src="/assets/silver-bubbles.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={overlay} />
              <div style={{ position: "relative", padding: 42, display: "flex", flexDirection: "column", height: "100%", minHeight: 300, justifyContent: "flex-end" }}>
                <div className="mono" style={{ fontSize: 12, letterSpacing: "0.14em", color: "rgba(255,255,255,0.75)" }}>04 AREAS</div>
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.025em" }}>{t("사업영역", "Business")}</div>
                <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.78)", maxWidth: 340 }}>{t("의약품 허가 · 뷰티의료 유통 · 화장품 유통 · 바이오 의료 컨설팅", "Drug licensing · Aesthetic-medical distribution · Cosmetics distribution · Bio-medical consulting")}</p>
                <span style={{ marginTop: 18, fontSize: 15, fontWeight: 600, color: "#fff" }}>{t("자세히 보기", "Learn more")} <span className="qarrow" style={{ display: "inline-block" }}>→</span></span>
              </div>
            </Link>
            <Link data-reveal data-delay="90" to="/global" className="qlink" style={{ display: "block", position: "relative", borderRadius: 24, overflow: "hidden", minHeight: 300 }}>
              <img src="/assets/earth-network.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={overlay} />
              <div style={{ position: "relative", padding: 42, display: "flex", flexDirection: "column", height: "100%", minHeight: 300, justifyContent: "flex-end" }}>
                <div className="mono" style={{ fontSize: 12, letterSpacing: "0.14em", color: "rgba(255,255,255,0.75)" }}>3 MARKETS</div>
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.025em" }}>{t("글로벌 네트워크", "Global Network")}</div>
                <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.78)", maxWidth: 340 }}>{t("중국 · 태국 · 일본을 잇는 아시아 핵심 시장 유통 네트워크", "A distribution network across Asia’s core markets — China, Thailand, and Japan")}</p>
                <span style={{ marginTop: 18, fontSize: 15, fontWeight: 600, color: "#fff" }}>{t("자세히 보기", "Learn more")} <span className="qarrow" style={{ display: "inline-block" }}>→</span></span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", padding: "0 44px 130px", background: "#fff" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", borderRadius: 30, overflow: "hidden", background: "#16171B" }}>
          <div style={{ position: "absolute", top: -120, right: -80, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,123,78,0.30),transparent 65%)" }} />
          <div className="m-cta" style={{ position: "relative", padding: "90px 64px" }}>
            <h2 data-reveal style={{ fontSize: "clamp(28px,3.4vw,46px)", fontWeight: 700, lineHeight: 1.14, letterSpacing: "-0.035em", color: "#fff", maxWidth: 620 }}>
              {lang === "ko" ? (<>함께 성장할<br />파트너를 찾고 있습니다</>) : (<>Looking for Partners<br />to Grow Together</>)}
            </h2>
            <p data-reveal data-delay="100" style={{ marginTop: 20, fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.72)", maxWidth: 520 }}>{t("엘제이바이오와의 협력이 궁금하시다면 언제든 연락 주세요.", "Curious about partnering with LJ-BIO? Reach out anytime.")}</p>
            <Link data-reveal data-delay="170" to="/contact" className="btn-primary" style={{ marginTop: 36, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: "#16171B", background: "#fff", padding: "16px 34px", borderRadius: 100 }}>{t("문의하기", "Contact Us")} <span>→</span></Link>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
