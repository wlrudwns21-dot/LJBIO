import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import "./site.css";

/* ------------------------------------------------------------------
   Scroll-reveal: faithful to the prototype — elements tagged with
   `data-reveal` slide up (translateY 26px -> 0). Content stays visible
   (opacity 1) the whole time, so nothing is ever hidden if JS fails.
------------------------------------------------------------------ */
function useReveal(rootRef: React.RefObject<HTMLDivElement | null>) {
  const location = useLocation();
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    els.forEach((el) => {
      el.style.transform = "translateY(26px)";
      el.style.transition =
        "opacity 1s cubic-bezier(.2,.7,.2,1), transform 1s cubic-bezier(.2,.7,.2,1)";
      el.style.willChange = "transform";
    });
    const reveal = (el: HTMLElement) => {
      const d = parseInt(el.getAttribute("data-delay") || "0", 10);
      el.style.transitionDelay = d + "ms";
      el.style.transform = "none";
    };
    const shown = new WeakSet<HTMLElement>();
    const check = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      els.forEach((el) => {
        if (shown.has(el)) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          shown.add(el);
          reveal(el);
        }
      });
    };
    check();
    requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}

/* Header shadow on scroll */
function useHeaderShadow(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onScroll = () => {
      const header = ref.current;
      if (!header) return;
      header.style.boxShadow =
        window.scrollY > 20 ? "0 10px 40px -28px rgba(20,21,27,0.5)" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ref]);
}

const NAV = [
  { ko: "회사소개", en: "About", to: "/about" },
  { ko: "사업영역", en: "Business", to: "/business" },
  { ko: "글로벌", en: "Global", to: "/global" },
  { ko: "문의", en: "Contact", to: "/contact" },
];

const barStyle: CSSProperties = {
  display: "block",
  width: 18,
  height: 2,
  background: "#16171B",
  borderRadius: 2,
};

function LangToggle() {
  const { lang, toggle } = useLang();
  const seg = (active: boolean): CSSProperties => ({
    padding: "3px 9px",
    borderRadius: 100,
    lineHeight: 1,
    background: active ? "#0E7B4E" : "transparent",
    color: active ? "#fff" : "#5A6560",
    transition: "background .25s, color .25s",
  });
  return (
    <button
      type="button"
      aria-label="Language"
      onClick={toggle}
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: 12,
        fontWeight: 600,
        background: "rgba(12,15,13,0.05)",
        border: "1px solid rgba(12,15,13,0.12)",
        borderRadius: 100,
        padding: "4px 5px",
        cursor: "pointer",
      }}
    >
      <span style={seg(lang === "ko")}>KO</span>
      <span style={seg(lang === "en")}>EN</span>
    </button>
  );
}

function Wordmark({ green = "#0E7B4E", size = 23 }: { green?: string; size?: number }) {
  return (
    <span
      style={{
        fontFamily: "'Space Grotesk',sans-serif",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        color: size >= 23 ? "#0C0F0D" : "#fff",
        display: "block",
        whiteSpace: "nowrap",
      }}
    >
      LJ<span style={{ color: green }}>-BIO</span>
    </span>
  );
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useReveal(rootRef);
  useHeaderShadow(headerRef);

  const closeMenu = () => setMenuOpen(false);
  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <div className="lj-site" ref={rootRef}>
      {/* NAV */}
      <header
        ref={headerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          borderBottom: "1px solid rgba(20,21,27,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "17px 44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <Link to="/" onClick={closeMenu} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Wordmark />
          </Link>

          <nav
            className={"nav-links" + (menuOpen ? " open" : "")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 42,
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {NAV.map((n) => (
              <Link
                key={n.to}
                className={"navlink" + (isActive(n.to) ? " active" : "")}
                to={n.to}
                onClick={closeMenu}
              >
                {t(n.ko, n.en)}
              </Link>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LangToggle />
            <Link
              to="/portal"
              className="navlink"
              onClick={closeMenu}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#16171B",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {t("임직원 로그인", "Staff Login")}
            </Link>
            <Link
              to="/contact"
              className="btn-primary nav-cta"
              onClick={closeMenu}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: "#0C0F0D",
                padding: "11px 22px",
                borderRadius: 100,
                letterSpacing: "-0.01em",
              }}
            >
              {t("제휴문의", "Get in Touch")}
            </Link>
            <button
              type="button"
              aria-label="메뉴"
              className="nav-toggle"
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                width: 42,
                height: 42,
                border: "1px solid rgba(20,21,27,0.14)",
                background: "rgba(20,21,27,0.05)",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 4,
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span style={barStyle} />
              <span style={barStyle} />
              <span style={barStyle} />
            </button>
          </div>
        </div>
      </header>

      {children}

      {/* FOOTER */}
      <footer style={{ background: "#0E0F12", padding: "80px 44px 44px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div
            className="m-stack"
            style={{
              display: "grid",
              gridTemplateColumns: "1.25fr 0.8fr 1.7fr",
              gap: 48,
              paddingBottom: 54,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div>
              <Wordmark green="#46D08A" size={22} />
              <p
                style={{
                  marginTop: 22,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.5)",
                  maxWidth: 330,
                }}
              >
                {t(
                  "과학으로 연결하는 글로벌 바이오·뷰티 유통 파트너. 의약품 허가 · 뷰티의료 유통 · 화장품 유통 · 바이오 의료 컨설팅.",
                  "A global bio & beauty distribution partner connected through science. Drug licensing · Aesthetic-medical distribution · Cosmetics distribution · Bio-medical consulting.",
                )}
              </p>
            </div>

            <div>
              <div
                className="mono"
                style={{ fontSize: 12, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}
              >
                SITEMAP
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13, fontSize: 15 }}>
                {NAV.map((n) => (
                  <Link key={n.to} className="navlink" style={{ color: "rgba(255,255,255,0.72)" }} to={n.to}>
                    {t(n.ko, n.en)}
                  </Link>
                ))}
                <Link className="navlink" style={{ color: "#46D08A", fontWeight: 600 }} to="/portal">
                  {t("임직원 로그인 →", "Staff Login →")}
                </Link>
              </div>
            </div>

            <div>
              <div
                className="mono"
                style={{ fontSize: 12, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}
              >
                COMPANY
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "10px 16px",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{t("상호", "Company")}</span>
                <span style={{ color: "rgba(255,255,255,0.72)" }}>{t("엘제이바이오", "LJ-BIO Inc.")}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{t("대표이사", "CEO")}</span>
                <span style={{ color: "rgba(255,255,255,0.72)" }}>{t("이일형", "Lee Il-hyung")}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{t("사업자등록번호", "Business Reg. No.")}</span>
                <span style={{ color: "rgba(255,255,255,0.72)" }}>292-38-01178</span>
                <span style={{ color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{t("주소", "Address")}</span>
                <span style={{ color: "rgba(255,255,255,0.72)" }}>
                  {t(
                    "서울특별시 강남구 학동로2길 19, 2층 2741호 (논현동, 세일빌딩)",
                    "19, Hakdong-ro 2-gil, Gangnam-gu, Seoul, Korea (Sail Bldg., #2741)",
                  )}
                </span>
                <span style={{ color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{t("이메일", "Email")}</span>
                <span style={{ color: "rgba(255,255,255,0.72)" }}>kyungjun.ji@bio-lj.com</span>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <span className="mono" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
              © {new Date().getFullYear()} LJ-BIO. ALL RIGHTS RESERVED.
            </span>
            <span className="mono" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>
              LJ-BIO INC.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
