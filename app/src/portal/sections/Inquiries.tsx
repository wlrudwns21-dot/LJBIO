import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "../ui";
import { demoInquiries } from "../data/demo";
import type { Inquiry } from "@/types/database";

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  new: { label: "신규", bg: "#FDECEC", color: "#D14343" },
  read: { label: "확인", bg: "#E0EDFB", color: "#2A6FDB" },
  replied: { label: "응대완료", bg: "#E9F2EC", color: "#3E8E68" },
  archived: { label: "보관", bg: "#EEF1EE", color: "#6B7280" },
};
const FILTERS: [string, string][] = [
  ["전체", "전체"],
  ["new", "신규"],
  ["read", "확인"],
  ["replied", "응대완료"],
];

export default function Inquiries() {
  const flash = useToast();
  const [items, setItems] = useState<Inquiry[]>(demoInquiries);
  const [filter, setFilter] = useState("전체");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setItems(data as Inquiry[]));
  }, []);

  async function persist(fn: () => PromiseLike<unknown>) {
    if (isSupabaseConfigured) {
      try {
        await fn();
      } catch {
        /* ignore */
      }
    }
  }

  function setStatus(iq: Inquiry, status: Inquiry["status"], msg: string) {
    setItems((list) => list.map((x) => (x.id === iq.id ? { ...x, status } : x)));
    void persist(() => supabase.from("inquiries").update({ status }).eq("id", iq.id));
    flash(msg);
  }
  function remove(iq: Inquiry) {
    if (!window.confirm("이 문의를 삭제할까요?")) return;
    setItems((list) => list.filter((x) => x.id !== iq.id));
    void persist(() => supabase.from("inquiries").delete().eq("id", iq.id));
    flash("문의를 삭제했습니다");
  }

  const shown = items.filter((i) => filter === "전체" || i.status === filter);
  const newCount = items.filter((i) => i.status === "new").length;

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {FILTERS.map(([k, label]) => {
          const on = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: "8px 15px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${on ? "#0C0F0D" : "rgba(12,15,13,0.14)"}`,
                background: on ? "#0C0F0D" : "#fff",
                color: on ? "#fff" : "#4A4C55",
              }}
            >
              {label}
              {k === "new" && newCount > 0 ? ` ${newCount}` : ""}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, color: "#84908A" }}>
          홈페이지 <b style={{ color: "#0C0F0D" }}>문의하기</b>로 접수된 고객 문의입니다.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.map((iq) => {
          const st = STATUS[iq.status] || STATUS.new;
          const date = (iq.created_at || "").slice(0, 10);
          const time = (iq.created_at || "").slice(11, 16);
          return (
            <div
              key={iq.id}
              style={{
                background: "#fff",
                border: "1px solid rgba(12,15,13,0.08)",
                borderRadius: 14,
                padding: "18px 20px",
                borderLeft: `4px solid ${st.color}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{iq.name}</span>
                    {iq.company && (
                      <span style={{ fontSize: 13, color: "#84908A" }}>· {iq.company}</span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    {iq.type && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: "#EEF1EE", color: "#6B7280" }}>
                        {iq.type}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 5 }}>
                    ✉ {iq.email}
                    {iq.phone ? ` · ☎ ${iq.phone}` : ""} · {date} {time}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: "#2A2C33", whiteSpace: "pre-wrap" }}>
                {iq.message}
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={`mailto:${iq.email}?subject=${encodeURIComponent("[LJ-BIO] 문의 회신")}`}
                  onClick={() => iq.status === "new" && setStatus(iq, "read", "확인 처리했습니다")}
                  className="pbtn"
                  style={{ padding: "8px 15px", border: "none", borderRadius: 8, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
                >
                  ✉ 이메일 답장
                </a>
                {iq.status === "new" && (
                  <button onClick={() => setStatus(iq, "read", "확인 처리했습니다")} className="gbtn" style={actBtn}>확인</button>
                )}
                {iq.status !== "replied" && (
                  <button onClick={() => setStatus(iq, "replied", "응대완료로 표시했습니다")} className="gbtn" style={actBtn}>응대완료</button>
                )}
                <button onClick={() => remove(iq)} className="gbtn" style={{ ...actBtn, border: "1px solid rgba(196,85,62,0.3)", color: "#C4553E" }}>삭제</button>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "#9AA29C", fontSize: 14, background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 14 }}>
            해당하는 문의가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

const actBtn: React.CSSProperties = {
  padding: "8px 15px",
  border: "1px solid rgba(12,15,13,0.14)",
  borderRadius: 8,
  background: "#fff",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};
