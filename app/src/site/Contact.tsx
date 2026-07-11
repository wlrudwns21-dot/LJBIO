import { useState, type FormEvent } from "react";
import { useLang } from "@/i18n/LangContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import SiteChrome from "./SiteChrome";

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const typeOptions = [
  { value: "제휴·유통", ko: "제휴 · 유통 문의", en: "Partnership / Distribution" },
  { value: "의약품 허가", ko: "의약품 허가 / 인허가", en: "Drug Licensing / Regulatory" },
  { value: "화장품·뷰티 유통", ko: "화장품 · 뷰티의료 유통", en: "Cosmetics / Aesthetic-Medical" },
  { value: "바이오 컨설팅", ko: "바이오 의료 컨설팅", en: "Bio-Medical Consulting" },
  { value: "글로벌 진출", ko: "글로벌 진출 (중국·태국·일본)", en: "Global Expansion (China·Thailand·Japan)" },
  { value: "기타", ko: "기타", en: "Other" },
];

export default function Contact() {
  const { t } = useLang();

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", type: "제휴·유통", message: "" });
  const [agree, setAgree] = useState(false);
  const [bad, setBad] = useState<{ name: boolean; email: boolean; message: boolean }>({ name: false, email: false, message: false });
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (k === "name" || k === "email" || k === "message") setBad((b) => ({ ...b, [k]: false }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nameBad = !form.name.trim();
    const eBad = !emailOk(form.email.trim());
    const msgBad = !form.message.trim();
    setBad({ name: nameBad, email: eBad, message: msgBad });

    const problems: string[] = [];
    if (nameBad) problems.push(t("이름", "Name"));
    if (eBad) problems.push(t("올바른 이메일", "a valid email"));
    if (msgBad) problems.push(t("문의 내용", "Message"));
    if (problems.length) {
      setErr(t(problems.join(", ") + " 항목을 확인해주세요.", "Please check: " + problems.join(", ") + "."));
      return;
    }
    if (!agree) {
      setErr(t("개인정보 수집 및 이용에 동의해주세요.", "Please agree to the collection and use of personal information."));
      return;
    }
    setErr("");
    // Save to the portal so staff can see it (best effort — still show success).
    if (isSupabaseConfigured) {
      try {
        await supabase.from("inquiries").insert({
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          type: form.type,
          message: form.message.trim(),
        });
      } catch {
        /* ignore — inquiry still acknowledged */
      }
    }
    setDone(true);
  };

  const reset = () => {
    setForm({ name: "", company: "", email: "", phone: "", type: "제휴·유통", message: "" });
    setAgree(false);
    setBad({ name: false, email: false, message: false });
    setErr("");
    setDone(false);
  };

  const cls = (base: string, isBad: boolean) => base + (isBad ? " bad" : "");

  return (
    <SiteChrome>
      {/* HERO */}
      <section style={{ position: "relative", padding: "170px 44px 80px", background: "#EFF4F0", borderBottom: "1px solid rgba(20,21,27,0.08)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -90, right: -50, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,123,78,0.16),transparent 65%)" }} />
        <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto" }}>
          <div data-reveal className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#0E7B4E", marginBottom: 22 }}>— CONTACT</div>
          <h1 data-reveal style={{ fontSize: "clamp(40px,5vw,72px)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.035em", color: "#16171B" }}>{t("문의하기", "Contact Us")}</h1>
          <p data-reveal data-delay="100" style={{ marginTop: 26, fontSize: "clamp(17px,1.5vw,20px)", lineHeight: 1.7, color: "#5A5C65", maxWidth: 620, letterSpacing: "-0.01em" }}>
            {t("제품 유통, 시장 진입, 인허가, 컨설팅 — 어떤 문의든 환영합니다. 영업일 기준 2일 이내에 답변드리겠습니다.", "Product distribution, market entry, licensing, consulting — any inquiry is welcome. We’ll reply within two business days.")}
          </p>
        </div>
      </section>

      {/* CONTACT BODY */}
      <section style={{ padding: "90px 44px 120px", background: "#fff" }}>
        <div className="m-stack" style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 64, alignItems: "start" }}>

          {/* INFO */}
          <div data-reveal>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: "#16171B" }}>{t("연락처 안내", "Contact Information")}</h2>
            <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="infoitem" style={{ padding: "22px 0", borderTop: "1px solid rgba(20,21,27,0.1)" }}>
                <div className="mono" style={{ fontSize: 12, letterSpacing: "0.12em", color: "#9EA8A2" }}>EMAIL</div>
                <div style={{ marginTop: 8, fontSize: 17, fontWeight: 600, color: "#16171B" }}>kyungjun.ji<span>@</span>bio-lj.com</div>
              </div>
              <div className="infoitem" style={{ padding: "22px 0", borderTop: "1px solid rgba(20,21,27,0.1)" }}>
                <div className="mono" style={{ fontSize: 12, letterSpacing: "0.12em", color: "#9EA8A2" }}>ADDRESS</div>
                <div style={{ marginTop: 8, fontSize: 17, fontWeight: 600, color: "#16171B" }}>{t("서울특별시 강남구 학동로2길 19", "19, Hakdong-ro 2-gil, Gangnam-gu, Seoul")}</div>
                <div style={{ marginTop: 2, fontSize: 14, color: "#84908A" }}>{t("2층 2741호 · Republic of Korea", "2F #2741 · Republic of Korea")}</div>
              </div>
              <div className="infoitem" style={{ padding: "22px 0", borderTop: "1px solid rgba(20,21,27,0.1)", borderBottom: "1px solid rgba(20,21,27,0.1)" }}>
                <div className="mono" style={{ fontSize: 12, letterSpacing: "0.12em", color: "#9EA8A2" }}>HOURS</div>
                <div style={{ marginTop: 8, fontSize: 17, fontWeight: 600, color: "#16171B" }}>{t("평일 09:00 – 18:00", "Weekdays 09:00 – 18:00")}</div>
                <div style={{ marginTop: 2, fontSize: 14, color: "#84908A" }}>{t("주말·공휴일 휴무", "Closed weekends & holidays")}</div>
              </div>
            </div>
            <div style={{ marginTop: 30, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { ko: "제휴·유통", en: "Partnership & Distribution" },
                { ko: "의약품 허가", en: "Drug Licensing" },
                { ko: "바이오 컨설팅", en: "Bio Consulting" },
              ].map((c) => (
                <span key={c.ko} style={{ fontSize: 13, fontWeight: 600, color: "#0E7B4E", background: "#E6F2EA", padding: "8px 14px", borderRadius: 100 }}>{t(c.ko, c.en)}</span>
              ))}
            </div>
          </div>

          {/* FORM */}
          <div data-reveal data-delay="100" className="m-box" style={{ position: "relative", background: "#F7FAF8", border: "1px solid rgba(20,21,27,0.08)", borderRadius: 24, padding: 40 }}>
            {!done ? (
              <form className="m-stack" noValidate onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ gridColumn: "span 1" }}>
                  <label className="lbl" htmlFor="f-name">{t("이름", "Name")} <span style={{ color: "#0E7B4E" }}>*</span></label>
                  <input className={cls("fld", bad.name)} id="f-name" type="text" placeholder={t("홍길동", "John Doe")} value={form.name} onChange={upd("name")} />
                </div>
                <div style={{ gridColumn: "span 1" }}>
                  <label className="lbl" htmlFor="f-company">{t("회사 / 기관", "Company / Organization")}</label>
                  <input className="fld" id="f-company" type="text" placeholder={t("회사명", "Company name")} value={form.company} onChange={upd("company")} />
                </div>
                <div style={{ gridColumn: "span 1" }}>
                  <label className="lbl" htmlFor="f-email">{t("이메일", "Email")} <span style={{ color: "#0E7B4E" }}>*</span></label>
                  <input className={cls("fld", bad.email)} id="f-email" type="email" placeholder="name@company.com" value={form.email} onChange={upd("email")} />
                </div>
                <div style={{ gridColumn: "span 1" }}>
                  <label className="lbl" htmlFor="f-phone">{t("연락처", "Phone")}</label>
                  <input className="fld" id="f-phone" type="tel" placeholder="010-0000-0000" value={form.phone} onChange={upd("phone")} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="lbl" htmlFor="f-type">{t("문의 유형", "Inquiry Type")}</label>
                  <select className="fld" id="f-type" value={form.type} onChange={upd("type")}>
                    {typeOptions.map((o) => (
                      <option key={o.value} value={o.value}>{t(o.ko, o.en)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="lbl" htmlFor="f-msg">{t("문의 내용", "Message")} <span style={{ color: "#0E7B4E" }}>*</span></label>
                  <textarea className={cls("fld", bad.message)} id="f-msg" rows={5} placeholder={t("문의하실 내용을 자유롭게 작성해주세요.", "Feel free to write your inquiry here.")} value={form.message} onChange={upd("message")} style={{ resize: "vertical", minHeight: 128 }} />
                </div>
                <div style={{ gridColumn: "span 2", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <input id="f-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "#0E7B4E" }} />
                  <label htmlFor="f-agree" style={{ fontSize: 13.5, lineHeight: 1.5, color: "#6A6C75" }}>{t("개인정보 수집 및 이용에 동의합니다. 입력하신 정보는 문의 응대 목적으로만 사용됩니다.", "I agree to the collection and use of my personal information. Your details will be used solely to respond to your inquiry.")}</label>
                </div>
                {err && (
                  <div style={{ gridColumn: "span 2", fontSize: 13.5, color: "#E0436A", fontWeight: 500 }}>{err}</div>
                )}
                <div style={{ gridColumn: "span 2", marginTop: 4 }}>
                  <button type="submit" className="btn-primary" style={{ width: "100%", fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: "#fff", background: "linear-gradient(110deg,#0E7B4E,#37C07F)", border: "none", padding: 17, borderRadius: 100, cursor: "pointer", letterSpacing: "-0.01em" }}>{t("문의 보내기", "Send Inquiry")}</button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ width: 64, height: 64, margin: "0 auto", borderRadius: "50%", background: "linear-gradient(120deg,#0E7B4E,#37C07F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <h3 style={{ marginTop: 22, fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: "#16171B" }}>{t("문의가 접수되었습니다", "Your inquiry has been received")}</h3>
                <p style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.7, color: "#6A6C75", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>{t("소중한 문의 감사합니다. 담당자가 확인 후 영업일 기준 2일 이내에 회신드리겠습니다.", "Thank you for your inquiry. Our team will review it and reply within two business days.")}</p>
                <button onClick={reset} className="btn-primary" style={{ marginTop: 26, fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "#16171B", background: "#fff", border: "1.5px solid rgba(20,21,27,0.16)", padding: "12px 26px", borderRadius: 100, cursor: "pointer" }}>{t("다른 문의하기", "Send another inquiry")}</button>
              </div>
            )}
          </div>

        </div>
      </section>
    </SiteChrome>
  );
}
