import { useState, type FormEvent } from "react";
import { useLang } from "@/i18n/LangContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { GIFT_PRODUCTS, priceOf, won } from "@/lib/giftProducts";
import SiteChrome from "./SiteChrome";

const GREEN = "#0E7B4E";

export default function Gift() {
  const { t } = useLang();

  const [form, setForm] = useState({
    product: "",
    quantity: 1,
    recipientName: "",
    recipientPhone: "",
    address: "",
    addressDetail: "",
    deliveryDate: "",
    senderName: "",
    senderPhone: "",
    memo: "",
  });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const upd =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const total = priceOf(form.product) * (Number(form.quantity) || 1);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problems: string[] = [];
    if (!form.product) problems.push(t("상품 선택", "product"));
    if (!form.recipientName.trim()) problems.push(t("받는 분 이름", "recipient name"));
    if (!form.recipientPhone.trim()) problems.push(t("받는 분 연락처", "recipient phone"));
    if (!form.address.trim()) problems.push(t("배송지 주소", "address"));
    if (!form.deliveryDate) problems.push(t("배송 요청일", "delivery date"));
    if (problems.length) {
      setErr(t(problems.join(", ") + " 항목을 확인해주세요.", "Please check: " + problems.join(", ") + "."));
      return;
    }
    if (!agree) {
      setErr(t("개인정보 수집 및 이용에 동의해주세요.", "Please agree to the collection and use of personal information."));
      return;
    }
    setErr("");
    setSending(true);
    if (isSupabaseConfigured) {
      const { error } = await supabase.from("gift_orders").insert({
        product: form.product,
        price: priceOf(form.product),
        quantity: Number(form.quantity) || 1,
        recipient_name: form.recipientName.trim(),
        recipient_phone: form.recipientPhone.trim(),
        recipient_address: form.address.trim(),
        address_detail: form.addressDetail.trim(),
        delivery_date: form.deliveryDate || null,
        sender_name: form.senderName.trim(),
        sender_phone: form.senderPhone.trim(),
        memo: form.memo.trim(),
      });
      setSending(false);
      if (error) {
        setErr(t("신청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "An error occurred while saving. Please try again."));
        return;
      }
    } else {
      setSending(false);
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setForm({
      product: "",
      quantity: 1,
      recipientName: "",
      recipientPhone: "",
      address: "",
      addressDetail: "",
      deliveryDate: "",
      senderName: "",
      senderPhone: "",
      memo: "",
    });
    setAgree(false);
    setErr("");
    setDone(false);
  };

  return (
    <SiteChrome>
      {/* HERO */}
      <section
        style={{
          position: "relative",
          padding: "170px 44px 70px",
          background: "#F3F0E7",
          borderBottom: "1px solid rgba(20,21,27,0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -90, right: -50, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle,rgba(180,120,40,0.16),transparent 65%)" }} />
        <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto" }}>
          <div className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: "#B07C2E", marginBottom: 22 }}>— 2026 추석 선물</div>
          <h1 style={{ fontSize: "clamp(38px,5vw,68px)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.035em", color: "#16171B" }}>{t("추석 선물 배송 신청", "Chuseok Gift Delivery")}</h1>
          <p style={{ marginTop: 24, fontSize: "clamp(16px,1.5vw,19px)", lineHeight: 1.7, color: "#5A5C65", maxWidth: 620, letterSpacing: "-0.01em" }}>
            {t("받으실 분의 정보와 배송 요청일을 입력해주세요. 정성껏 준비해 안전하게 전달해드리겠습니다.", "Enter the recipient's details and requested delivery date. We'll prepare and deliver your gift with care.")}
          </p>
        </div>
      </section>

      <section style={{ padding: "56px 24px 110px", background: "#fff" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {done ? (
            <div className="m-box" style={{ background: "#F7FAF8", border: "1px solid rgba(20,21,27,0.08)", borderRadius: 24, padding: "48px 30px", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, margin: "0 auto", borderRadius: "50%", background: "linear-gradient(120deg,#0E7B4E,#37C07F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h3 style={{ marginTop: 22, fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: "#16171B" }}>{t("배송 신청이 접수되었습니다", "Your delivery request has been received")}</h3>
              <p style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.7, color: "#6A6C75", maxWidth: 440, margin: "12px auto 0" }}>
                {t("신청해주셔서 감사합니다. 담당자가 확인 후 요청하신 날짜에 맞춰 배송을 진행합니다.", "Thank you for your request. Our team will review it and ship on your requested date.")}
              </p>
              <button onClick={reset} className="btn-primary" style={{ marginTop: 26, fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "#16171B", background: "#fff", border: "1.5px solid rgba(20,21,27,0.16)", padding: "12px 26px", borderRadius: 100, cursor: "pointer" }}>{t("다른 선물 신청하기", "Submit another request")}</button>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 34 }}>
              {/* 1. 상품 선택 */}
              <div>
                <SectionTitle n={1} title={t("상품 선택", "Select a product")} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10, marginTop: 16 }}>
                  {GIFT_PRODUCTS.map((p) => {
                    const on = form.product === p.name;
                    return (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => setForm((f) => ({ ...f, product: p.name }))}
                        style={{
                          textAlign: "left",
                          fontFamily: "inherit",
                          cursor: "pointer",
                          padding: "14px 15px",
                          borderRadius: 14,
                          border: `1.5px solid ${on ? GREEN : "rgba(20,21,27,0.12)"}`,
                          background: on ? "#EAF6EF" : "#fff",
                          boxShadow: on ? "0 6px 20px -12px rgba(14,123,78,0.5)" : "none",
                          transition: "all .15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: "#16171B" }}>{p.name}</span>
                          <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", border: `2px solid ${on ? GREEN : "rgba(20,21,27,0.2)"}`, background: on ? GREEN : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                          </span>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: GREEN }}>{won(p.price)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. 받는 분 정보 */}
              <div>
                <SectionTitle n={2} title={t("받는 분 정보", "Recipient")} />
                <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                  <Field label={t("받는 분 이름", "Name")} required value={form.recipientName} onChange={upd("recipientName")} placeholder={t("홍길동", "Recipient")} />
                  <Field label={t("받는 분 연락처", "Phone")} required value={form.recipientPhone} onChange={upd("recipientPhone")} placeholder="010-0000-0000" type="tel" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label={t("배송지 주소", "Address")} required value={form.address} onChange={upd("address")} placeholder={t("도로명 주소를 입력해주세요", "Street address")} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label={t("상세 주소", "Address detail")} value={form.addressDetail} onChange={upd("addressDetail")} placeholder={t("동/호수 등 상세 주소", "Unit, floor, etc.")} />
                  </div>
                </div>
              </div>

              {/* 3. 배송 · 수량 */}
              <div>
                <SectionTitle n={3} title={t("배송 요청일 · 수량", "Delivery date & quantity")} />
                <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                  <Field label={t("배송 요청일", "Requested delivery date")} required value={form.deliveryDate} onChange={upd("deliveryDate")} type="date" />
                  <div>
                    <label className="lbl">{t("수량", "Quantity")}</label>
                    <select className="fld" value={form.quantity} onChange={upd("quantity")}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>{n}{t("개", "")}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.product && (
                  <div style={{ marginTop: 14, padding: "14px 18px", borderRadius: 12, background: "#F3F0E7", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 14, color: "#5A5C65" }}>
                      {form.product} × {form.quantity}{t("개", "")}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#16171B" }}>{t("합계", "Total")} {won(total)}</span>
                  </div>
                )}
              </div>

              {/* 4. 보내는 분 (선택) */}
              <div>
                <SectionTitle n={4} title={t("보내는 분 · 요청사항 (선택)", "Sender & notes (optional)")} />
                <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                  <Field label={t("보내는 분 이름", "Sender name")} value={form.senderName} onChange={upd("senderName")} placeholder={t("보내는 분", "Sender")} />
                  <Field label={t("보내는 분 연락처", "Sender phone")} value={form.senderPhone} onChange={upd("senderPhone")} placeholder="010-0000-0000" type="tel" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="lbl">{t("요청사항", "Notes")}</label>
                    <textarea className="fld" rows={3} value={form.memo} onChange={upd("memo")} placeholder={t("배송 시 요청사항이 있으면 적어주세요.", "Any delivery notes?")} style={{ resize: "vertical", minHeight: 84 }} />
                  </div>
                </div>
              </div>

              {/* agree + submit */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <input id="g-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: GREEN }} />
                <label htmlFor="g-agree" style={{ fontSize: 13.5, lineHeight: 1.5, color: "#6A6C75" }}>
                  {t("개인정보 수집 및 이용에 동의합니다. 입력하신 정보는 선물 배송 목적으로만 사용됩니다.", "I agree to the collection and use of my personal information, used solely for gift delivery.")}
                </label>
              </div>
              {err && <div style={{ fontSize: 13.5, color: "#E0436A", fontWeight: 500 }}>{err}</div>}
              <button type="submit" disabled={sending} className="btn-primary" style={{ width: "100%", fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: "#fff", background: "linear-gradient(110deg,#0E7B4E,#37C07F)", border: "none", padding: 17, borderRadius: 100, cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1, letterSpacing: "-0.01em" }}>
                {sending ? t("접수 중…", "Submitting…") : t("배송 신청하기", "Submit delivery request")}
              </button>
            </form>
          )}
        </div>
      </section>
    </SiteChrome>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: "50%", background: "#16171B", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: "#16171B" }}>{title}</h2>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="lbl">
        {label} {required && <span style={{ color: GREEN }}>*</span>}
      </label>
      <input className="fld" type={type} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
