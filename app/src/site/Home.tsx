import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import SiteChrome from "./SiteChrome";

/* faithful hero video autoplay kick (muted loop) */
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
          vid.currentTime = 1.5;
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

const gradText: CSSProperties = {
  background: "linear-gradient(110deg,#46D08A,#0E7B4E)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
const gradText2: CSSProperties = {
  background: "linear-gradient(120deg,#0E7B4E,#46D08A)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const bizCards = [
  {
    idx: "01",
    tag: "REGULATORY AFFAIRS",
    img: "/assets/biz-docs.jpg",
    ko: { h: "인허가 지원 (RA)", p: "화장품·의약품·의료기기의 까다로운 국내외 인허가 절차를 대행하여 시장 진입을 가속화합니다." },
    en: { h: "Regulatory Affairs (RA)", p: "We handle the complex domestic and overseas licensing of cosmetics, drugs, and medical devices to accelerate market entry." },
    delay: 0,
    cover: true,
  },
  {
    idx: "02",
    tag: "DISTRIBUTION & SALES",
    img: "/assets/earth-network.jpg",
    ko: { h: "유통 및 판매", p: "국내외 온·오프라인을 아우르는 체계적인 유통망을 통해 헬스케어 제품을 거래처에 안정적으로 공급합니다." },
    en: { h: "Distribution & Sales", p: "Through a systematic on/offline distribution network at home and abroad, we reliably supply healthcare products to clients." },
    delay: 80,
  },
  {
    idx: "03",
    tag: "CONSULTING & MARKETING",
    img: "/assets/biz-handshake.jpg",
    ko: { h: "컨설팅 & 마케팅", p: "시장 데이터 분석을 통한 맞춤형 마케팅 대행과 브랜드 가치 제고를 위한 토탈 컨설팅을 제공합니다." },
    en: { h: "Consulting & Marketing", p: "We provide tailored marketing services driven by market-data analysis and total consulting to elevate brand value." },
    delay: 0,
    cover: true,
  },
  {
    idx: "04",
    tag: "IT CONSULTING",
    img: "/assets/digital-network.jpg",
    ko: { h: "IT 컨설팅", p: "의약품·의료기기 통합 관리 시스템과 맞춤형 공급망 관리(SCM) 등 바이오 특화 IT 플랫폼을 기획합니다." },
    en: { h: "IT Consulting", p: "We design bio-specialized IT platforms, including integrated drug/device management systems and tailored supply-chain management (SCM)." },
    delay: 80,
  },
];

const gtr = [
  {
    ch: "中",
    img: "/assets/china.jpg",
    ko: { name: "중국", lines: ["첨단 의료기기 전문 제조 파트너십", "의료기기 및 장비 수출입 유통", "대규모 헬스케어 인프라 공급 지원"] },
    en: { name: "China", lines: ["Advanced medical-device manufacturing partnerships", "Import/export distribution of medical devices and equipment", "Support for large-scale healthcare infrastructure supply"] },
    label: "CHINA",
    delay: 0,
  },
  {
    ch: "泰",
    img: "/assets/thailand.jpg",
    ko: { name: "태국", lines: ["미용·성형 필러 제품 수출", "현지 맞춤형 IT 플랫폼 기획 및 개발", "현지 파트너사 발굴 및 네트워크 구축"] },
    en: { name: "Thailand", lines: ["Export of aesthetic and dermal-filler products", "Planning and development of localized IT platforms", "Sourcing local partners and building networks"] },
    label: "THAILAND",
    delay: 90,
  },
  {
    ch: "日",
    img: "/assets/japan.jpg",
    objPos: "center 35%",
    ko: { name: "일본", lines: ["K-뷰티 코스메틱(화장품) 수출입", "성형 의료기기 수출 및 수입 유통", "일본 내 인허가 취득 및 마케팅 전개"] },
    en: { name: "Japan", lines: ["Import/export of K-beauty cosmetics", "Export and import distribution of aesthetic medical devices", "Obtaining licenses in Japan and rolling out marketing"] },
    label: "JAPAN",
    delay: 180,
  },
];

export default function Home() {
  const { t, lang } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoAutoplay(videoRef);

  return (
    <SiteChrome>
      {/* HERO (dark) */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          background: "#05080A",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/assets/hero-poster.png"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        >
          <source src="/assets/hero-bg.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(4,7,9,0.96) 0%,rgba(4,7,9,0.9) 26%,rgba(4,7,9,0.66) 48%,rgba(4,7,9,0.36) 72%,rgba(4,7,9,0.18) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(4,7,9,0.9),rgba(4,7,9,0) 50%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(4,7,9,0.28)" }} />
        <div style={{ position: "absolute", bottom: -140, right: -140, width: 460, height: 460, background: "radial-gradient(circle,rgba(5,8,10,0.92),transparent 60%)" }} />
        <div style={{ position: "absolute", top: -160, left: -90, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle,rgba(70,208,138,0.16),transparent 62%)", filter: "blur(20px)" }} />

        <div className="m-px" style={{ position: "relative", maxWidth: 1320, margin: "0 auto", padding: "0 44px", width: "100%" }}>
          <div style={{ maxWidth: 780, paddingTop: 64 }}>
            <div data-reveal className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 600, letterSpacing: "0.18em", color: "#46D08A", marginBottom: 30 }}>
              <span style={{ width: 34, height: 1.5, background: "linear-gradient(90deg,#0E7B4E,#46D08A)", display: "inline-block" }} />
              SCIENCE-DRIVEN DISTRIBUTION
            </div>
            <h1 data-reveal style={{ fontSize: "clamp(42px,5.6vw,84px)", fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.035em", color: "#fff" }}>
              {lang === "ko" ? (
                <>바이오를<br /><span style={gradText}>과학으로 연결</span>합니다</>
              ) : (
                <>Connecting Bio<br /><span style={gradText}>Through Science</span></>
              )}
            </h1>
            <p data-reveal data-delay="120" style={{ marginTop: 30, fontSize: "clamp(17px,1.5vw,21px)", lineHeight: 1.7, color: "rgba(255,255,255,0.72)", fontWeight: 400, maxWidth: 610, letterSpacing: "-0.01em" }}>
              {t("인허가(RA)부터 유통·판매, 컨설팅, 그리고 바이오 특화 IT 솔루션까지 —", "From regulatory affairs (RA) to distribution & sales, consulting, and bio-specialized IT solutions —")}
              <br />
              {t("엘제이바이오는 중국·태국·일본을 잇는 K-바이오의 글로벌 진출 파트너입니다.", "LJ-BIO is K-bio’s global gateway partner, connecting China, Thailand, and Japan.")}
            </p>
            <div data-reveal data-delay="220" style={{ marginTop: 42, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link to="/business" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: "#fff", background: "linear-gradient(110deg,#0E7B4E,#46D08A)", padding: "16px 32px", borderRadius: 100, letterSpacing: "-0.01em" }}>
                {t("사업영역 보기", "View Business")}
                <span style={{ fontSize: 18 }}>→</span>
              </Link>
              <Link to="/about" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", fontSize: 16, fontWeight: 600, color: "#fff", background: "transparent", border: "1.5px solid rgba(255,255,255,0.28)", padding: "16px 32px", borderRadius: 100, letterSpacing: "-0.01em" }}>
                {t("회사소개", "About")}
              </Link>
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 38, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)" }}>SCROLL</span>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.18)", position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 14, background: "linear-gradient(#46D08A,transparent)", animation: "scrollcue 1.8s infinite" }} />
          </div>
        </div>
      </section>

      {/* WHO WE ARE */}
      <section style={{ position: "relative", background: "#fff", padding: "130px 44px", borderBottom: "1px solid rgba(12,15,13,0.08)" }}>
        <div className="m-stack" style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "1.08fr 1fr", gap: 84, alignItems: "center" }}>
          <div>
            <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#0E7B4E", marginBottom: 24 }}>— WHO WE ARE</div>
            <h2 data-reveal style={{ fontSize: "clamp(28px,3.2vw,46px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.03em", color: "#0C0F0D" }}>
              {lang === "ko" ? (<>새로운 도약,<br />확고한 비즈니스 네트워크</>) : (<>A New Leap,<br />A Solid Business Network</>)}
            </h2>
            <p data-reveal data-delay="90" style={{ marginTop: 28, fontSize: 18, lineHeight: 1.8, color: "#4A4C55", maxWidth: 560, letterSpacing: "-0.01em" }}>
              {lang === "ko" ? (
                <>엘제이바이오는 대구·경북 지역의 탄탄한 의약품 유통 전문기업 <b style={{ fontWeight: 600, color: "#0C0F0D" }}>‘길바이오’</b>의 검증된 노하우와 폭넓은 인프라를 바탕으로 새롭게 출범했습니다.</>
              ) : (
                <>LJ-BIO was newly launched on the proven know-how and broad infrastructure of <b style={{ fontWeight: 600, color: "#0C0F0D" }}>‘Gil-Bio’</b>, a trusted pharmaceutical-distribution specialist in the Daegu·Gyeongbuk region.</>
              )}
            </p>
            <p data-reveal data-delay="150" style={{ marginTop: 18, fontSize: 18, lineHeight: 1.8, color: "#5A5C65", maxWidth: 560, letterSpacing: "-0.01em" }}>
              {lang === "ko" ? (
                <>현재 서울을 거점으로 의약품 도매업을 활발히 전개하며, 국내 수도권 및 글로벌 해외 시장 진출을 전담하고 있습니다. 단순 유통을 넘어 <b style={{ fontWeight: 600, color: "#0E7B4E" }}>IT 기술이 접목된 선진화된 바이오 유통 솔루션</b>을 제공하는 최적의 파트너입니다.</>
              ) : (
                <>Headquartered in Seoul, we actively run pharmaceutical wholesale and lead expansion across the Korean capital region and global markets. Beyond simple distribution, we are the ideal partner delivering <b style={{ fontWeight: 600, color: "#0E7B4E" }}>advanced bio-distribution solutions powered by IT technology</b>.</>
              )}
            </p>
          </div>
          <div data-reveal data-delay="160" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(12,15,13,0.08)", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 18, overflow: "hidden" }}>
            {[
              { n: "04", sub: "Core Business Models", ko: "핵심 사업 모델", en: "Core Business Models" },
              { n: "03", sub: "中 · 泰 · 日", ko: "글로벌 거점", en: "Global Bases" },
              { n: "RA", sub: "Regulatory Affairs", ko: "인허가 전문성", en: "Regulatory Expertise" },
              { n: "IT", sub: "Bio-specialized IT", ko: "바이오 특화 솔루션", en: "Bio-specialized Solutions" },
            ].map((s) => (
              <div key={s.n} style={{ background: "#fff", padding: "36px 30px" }}>
                <div className="mono" style={{ fontSize: "clamp(36px,4vw,52px)", fontWeight: 600, lineHeight: 1, ...gradText2 }}>{s.n}</div>
                <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: "#0C0F0D" }}>{t(s.ko, s.en)}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#84908A" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MISSION & VISION (dark) */}
      <section style={{ position: "relative", background: "#0B0E0C", padding: "128px 44px", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -140, left: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,123,78,0.30),transparent 64%)", filter: "blur(20px)" }} />
        <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#46D08A", marginBottom: 22 }}>— MISSION & VISION</div>
          <h2 data-reveal style={{ fontSize: "clamp(28px,3.4vw,48px)", fontWeight: 700, lineHeight: 1.14, letterSpacing: "-0.035em", color: "#fff", maxWidth: 780 }}>
            {t("우리가 일하는 세 가지 기준", "Three Principles We Work By")}
          </h2>
          <div className="m-stack" style={{ marginTop: 58, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
            {[
              { tag: "01 — TRUST", delay: 0, ko: { h: "신뢰", p: "투명한 프로세스와 검증된 비즈니스 네트워크를 바탕으로 국내외 파트너사와 지속 가능한 동반 성장을 추구합니다." }, en: { h: "Trust", p: "Built on transparent processes and a proven business network, we pursue sustainable, shared growth with partners at home and abroad." } },
              { tag: "02 — INNOVATION", delay: 90, ko: { h: "혁신", p: "전통적 유통의 경계를 넘어, IT 솔루션을 접목한 선진화된 맞춤형 컨설팅으로 새로운 가치를 만듭니다." }, en: { h: "Innovation", p: "Going beyond traditional distribution, we create new value through advanced, tailored consulting powered by IT solutions." } },
              { tag: "03 — GLOBAL", delay: 180, ko: { h: "글로벌", p: "태국·중국·일본 등 아시아를 넘어 K-바이오의 글로벌 진출 교두보 역할을 수행합니다." }, en: { h: "Global", p: "Beyond Thailand, China, and Japan, we serve as the bridgehead for K-bio’s global expansion." } },
            ].map((c) => (
              <div key={c.tag} data-reveal data-delay={c.delay || undefined} className="mvcard" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "38px 34px 42px" }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", color: "#46D08A" }}>{c.tag}</div>
                <h3 style={{ marginTop: 16, fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: "#fff" }}>{t(c.ko.h, c.en.h)}</h3>
                <p style={{ marginTop: 14, fontSize: 15.5, lineHeight: 1.75, color: "rgba(255,255,255,0.64)" }}>{t(c.ko.p, c.en.p)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE BUSINESS MODELS */}
      <section style={{ position: "relative", background: "#EFF4F0", padding: "130px 44px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40, flexWrap: "wrap", marginBottom: 60 }}>
            <div>
              <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#0E7B4E", marginBottom: 22 }}>— CORE BUSINESS MODELS</div>
              <h2 data-reveal style={{ fontSize: "clamp(30px,3.6vw,52px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.035em", color: "#0C0F0D" }}>{t("핵심 사업 모델", "Core Business Models")}</h2>
              <p data-reveal data-delay="80" style={{ marginTop: 18, fontSize: 17, lineHeight: 1.7, color: "#5A5C65", maxWidth: 560 }}>{t("인허가부터 유통, 컨설팅, IT까지 — 네 개의 전문 영역이 유기적으로 연결되어 시장 진입을 가속합니다.", "From licensing to distribution, consulting, and IT — four specialized areas connect organically to accelerate market entry.")}</p>
            </div>
            <Link data-reveal to="/business" className="navlink" style={{ fontSize: 15, fontWeight: 600, color: "#0C0F0D", paddingBottom: 6 }}>{t("전체 보기 →", "View All →")}</Link>
          </div>

          <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24 }}>
            {bizCards.map((c) => (
              <Link key={c.idx} to="/business" data-reveal data-delay={c.delay || undefined} className="bizcard" style={{ display: "block", background: "#fff", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 22, overflow: "hidden" }}>
                <div style={{ position: "relative", height: 210, overflow: "hidden" }}>
                  <img className="bizimg" src={c.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: c.cover ? "center" : undefined }} />
                </div>
                <div style={{ padding: "34px 34px 38px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: "#0E7B4E", letterSpacing: "0.08em" }}>{c.idx}</span>
                    <span className="mono" style={{ fontSize: 12, color: "#9EA8A2", letterSpacing: "0.06em" }}>{c.tag}</span>
                  </div>
                  <h3 style={{ marginTop: 16, fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: "#0C0F0D" }}>{t(c.ko.h, c.en.h)}</h3>
                  <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.7, color: "#5A5C65" }}>{t(c.ko.p, c.en.p)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* GLOBAL TRACK RECORD (dark) */}
      <section style={{ position: "relative", background: "#0B0E0C", padding: "130px 44px", overflow: "hidden" }}>
        <div style={{ position: "absolute", bottom: -160, right: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,123,78,0.26),transparent 64%)", filter: "blur(20px)" }} />
        <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40, flexWrap: "wrap", marginBottom: 56 }}>
            <div>
              <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#46D08A", marginBottom: 22 }}>— GLOBAL TRACK RECORD</div>
              <h2 data-reveal style={{ fontSize: "clamp(30px,3.6vw,50px)", fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.035em", color: "#fff" }}>
                {lang === "ko" ? (<>아시아를 잇는<br />글로벌 사업 실적</>) : (<>Our Global<br />Track Record in Asia</>)}
              </h2>
            </div>
            <Link data-reveal to="/global" className="navlink" style={{ fontSize: 15, fontWeight: 600, color: "#fff", paddingBottom: 6 }}>{t("글로벌 사업 보기 →", "View Global →")}</Link>
          </div>

          <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
            {gtr.map((g) => (
              <div key={g.label} data-reveal data-delay={g.delay || undefined} className="gtr" style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: "#11150F", minHeight: 420, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <img className="gtrimg" src={g.img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: g.objPos }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(11,14,12,0.15) 25%,rgba(11,14,12,0.78) 62%,rgba(11,14,12,0.96))" }} />
                <div style={{ position: "relative", padding: "32px 30px 34px" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                    <span className="mono" style={{ fontSize: 50, fontWeight: 700, lineHeight: 0.8, color: "#fff" }}>{g.ch}</span>
                    <div style={{ paddingBottom: 4 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{t(g.ko.name, g.en.name)}</div>
                      <div className="mono" style={{ fontSize: 12, letterSpacing: "0.1em", color: "rgba(255,255,255,0.6)" }}>{g.label}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 11 }}>
                    {g.ko.lines.map((ln, i) => (
                      <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 14.5, lineHeight: 1.5, color: "rgba(255,255,255,0.86)" }}>
                        <span style={{ color: "#46D08A", fontWeight: 700 }}>·</span>
                        {t(ln, g.en.lines[i])}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section style={{ background: "#fff", padding: "130px 44px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#0E7B4E", marginBottom: 22 }}>— WHY LJ-BIO</div>
          <h2 data-reveal style={{ fontSize: "clamp(28px,3.4vw,46px)", fontWeight: 700, lineHeight: 1.14, letterSpacing: "-0.035em", color: "#0C0F0D", maxWidth: 760 }}>
            {lang === "ko" ? (<>왜 엘제이바이오와<br />함께해야 할까요</>) : (<>Why Partner<br />with LJ-BIO</>)}
          </h2>
          <div className="m-stack" style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "rgba(12,15,13,0.08)", borderTop: "1px solid rgba(12,15,13,0.08)", borderBottom: "1px solid rgba(12,15,13,0.08)" }}>
            {[
              { n: "01", delay: 0, ko: { h: "규제 전문성", p: "의약품·의료기기·화장품 각 카테고리의 국가별 인허가 요건을 정확히 이해하고 대응합니다." }, en: { h: "Regulatory Expertise", p: "We precisely understand and address country-specific licensing requirements for drugs, devices, and cosmetics." } },
              { n: "02", delay: 80, ko: { h: "IT 결합 혁신", p: "전통적 유통을 넘어 통합 관리 시스템과 SCM 등 바이오 특화 IT 솔루션으로 차별화합니다." }, en: { h: "IT-driven Innovation", p: "Beyond traditional distribution, we differentiate with bio-specialized IT solutions such as integrated management systems and SCM." } },
              { n: "03", delay: 160, ko: { h: "검증된 글로벌 네트워크", p: "중국·태국·일본 현지의 신뢰할 수 있는 채널과 파트너십을 통해 안정적으로 공급합니다." }, en: { h: "Proven Global Network", p: "We supply reliably through trusted local channels and partnerships in China, Thailand, and Japan." } },
            ].map((c) => (
              <div key={c.n} data-reveal data-delay={c.delay || undefined} style={{ background: "#fff", padding: "44px 36px 50px" }}>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: "#0E7B4E" }}>{c.n}</div>
                <h3 style={{ marginTop: 18, fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", color: "#0C0F0D" }}>{t(c.ko.h, c.en.h)}</h3>
                <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: "#5A5C65" }}>{t(c.ko.p, c.en.p)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", padding: "0 44px 130px", background: "#fff" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", borderRadius: 30, overflow: "hidden" }}>
          <img src="/assets/earth-network.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg,rgba(8,12,10,0.86),rgba(8,12,10,0.45))" }} />
          <div className="m-cta" style={{ position: "relative", padding: "96px 64px" }}>
            <h2 data-reveal style={{ fontSize: "clamp(30px,3.6vw,50px)", fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.035em", color: "#fff", maxWidth: 680 }}>
              {lang === "ko" ? (<>함께 성장할<br />파트너를 찾고 있습니다</>) : (<>Looking for Partners<br />to Grow Together</>)}
            </h2>
            <p data-reveal data-delay="100" style={{ marginTop: 22, fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.84)", maxWidth: 540 }}>{t("제품 유통, 시장 진입, 인허가, 컨설팅에 대한 어떤 문의든 환영합니다. 엘제이바이오가 다음 단계를 함께 설계하겠습니다.", "We welcome any inquiry about product distribution, market entry, licensing, or consulting. LJ-BIO will design the next step with you.")}</p>
            <Link data-reveal data-delay="170" to="/contact" className="btn-primary" style={{ marginTop: 38, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: "#0C0F0D", background: "#fff", padding: "16px 34px", borderRadius: 100 }}>{t("제휴·유통 문의하기", "Partnership & Distribution Inquiry")} <span>→</span></Link>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
