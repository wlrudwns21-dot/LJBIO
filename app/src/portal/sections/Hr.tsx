import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Modal, useToast } from "../ui";
import { demoLeaves, demoMe } from "../data/demo";
import type { Leave, ApprovalStatus } from "@/types/database";

type NewReq = { type: string; range: string; days: string; reason: string };
const fld: React.CSSProperties = {
  marginTop: 5,
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
};
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#4A4C55" };

function typeStyle(t: string): { bg: string; color: string } {
  if (t === "출장") return { bg: "#FFF1E0", color: "#C6803A" };
  if (t.includes("반차")) return { bg: "#E0EDFB", color: "#2A6FDB" };
  return { bg: "#E9F2EC", color: "#3E8E68" };
}

export default function Hr() {
  const flash = useToast();
  const { profile } = useAuth();
  const me = {
    name: profile?.name ?? demoMe.name,
    dept: profile?.dept ?? demoMe.dept,
    init: profile?.init ?? demoMe.init,
    avatar_bg: profile?.avatar_bg ?? "#0E7B4E",
  };
  const [leaves, setLeaves] = useState<Leave[]>(demoLeaves);
  const [newReq, setNewReq] = useState<NewReq | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("leaves")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setLeaves(data as Leave[]));
  }, []);

  async function submitLeave() {
    if (!newReq) return;
    if (!newReq.range.trim()) {
      flash("기간을 입력하세요 (예: 8/5 ~ 8/7)");
      return;
    }
    const base = {
      name: me.name,
      dept: me.dept,
      init: me.init,
      avatar_bg: me.avatar_bg,
      type: newReq.type,
      range: newReq.range.trim(),
      days: newReq.days.trim() || "-",
      status: "pending" as const,
    };
    if (isSupabaseConfigured) {
      const { data } = await supabase.from("leaves").insert(base).select().single();
      if (data) setLeaves((prev) => [data as Leave, ...prev]);
    } else {
      setLeaves((prev) => [
        { ...base, id: "l" + Date.now(), created_at: "" } as Leave,
        ...prev,
      ]);
    }
    setNewReq(null);
    flash(newReq.type + " 신청이 접수되었습니다 (승인 대기)");
  }

  async function decide(l: Leave, status: ApprovalStatus, msg: string) {
    setLeaves((prev) => prev.map((x) => (x.id === l.id ? { ...x, status } : x)));
    flash(msg);
    if (isSupabaseConfigured) {
      await supabase.from("leaves").update({ status }).eq("id", l.id);
    }
  }

  const hrStats = [
    { label: "승인 대기", value: String(leaves.filter((l) => l.status === "pending").length), color: "#C6803A" },
    { label: "이번 달 휴가", value: String(leaves.filter((l) => l.type.includes("연차") || l.type.includes("반차")).length), color: "#2A6FDB" },
    { label: "예정 출장", value: String(leaves.filter((l) => l.type === "출장").length), color: "#0E7B4E" },
    { label: "잔여 연차 (본인)", value: "11일", color: "#0C0F0D" },
  ];

  const absenceList = leaves.filter((l) => l.status !== "rejected");

  return (
    <div className="fade" style={{ maxWidth: 1160, margin: "0 auto" }}>
      <div className="g-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 22 }}>
        {hrStats.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12.5, color: "#84908A" }}>{s.label}</div>
            <div className="mono" style={{ marginTop: 8, fontSize: 26, fontWeight: 600, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="g-2col" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(12,15,13,0.07)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>휴가 · 출장 신청 현황</h3>
            <button className="pbtn" onClick={() => setNewReq({ type: "연차", range: "", days: "", reason: "" })} style={{ padding: "9px 15px", border: "none", borderRadius: 9, background: "#0C0F0D", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>+ 신청</button>
          </div>
          {leaves.map((h) => {
            const t = typeStyle(h.type);
            const st = h.status;
            const stBg = st === "approved" ? "#E9F2EC" : "#FDE8E8";
            const stColor = st === "approved" ? "#3E8E68" : "#D14343";
            return (
              <div key={h.id} className="row-h" style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 22px", borderTop: "1px solid rgba(12,15,13,0.06)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: h.avatar_bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{h.init}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{h.name} <span style={{ fontWeight: 500, color: "#84908A", fontSize: 12.5 }}>· {h.dept}</span></div>
                  <div style={{ fontSize: 12.5, color: "#5A5C65", marginTop: 2 }}>
                    <span style={{ padding: "1px 7px", borderRadius: 5, background: t.bg, color: t.color, fontWeight: 600, fontSize: 11, marginRight: 6 }}>{h.type}</span>
                    {h.range} · {h.days}
                  </div>
                </div>
                {st === "pending" ? (
                  <div style={{ display: "flex", gap: 7 }}>
                    <button onClick={() => decide(h, "approved", `${h.name} ${h.type} 승인 완료`)} className="pbtn" style={{ padding: "7px 13px", border: "none", borderRadius: 8, background: "#0E7B4E", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>승인</button>
                    <button onClick={() => decide(h, "rejected", `${h.name} ${h.type} 반려`)} className="gbtn" style={{ padding: "7px 13px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>반려</button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12.5, fontWeight: 600, padding: "5px 11px", borderRadius: 20, background: stBg, color: stColor }}>{st === "approved" ? "승인됨" : "반려됨"}</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>이번 달 팀 부재 현황</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {absenceList.map((a) => {
              const t = typeStyle(a.type);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ minWidth: 52, textAlign: "center", padding: 6, borderRadius: 8, background: t.bg }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{a.range.split(" ")[0]}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#84908A" }}>{a.type} · {a.range}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={!!newReq} onClose={() => setNewReq(null)} width={480}>
        {newReq && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>휴가 · 출장 신청</h2>
            <p style={{ marginTop: 8, fontSize: 13, color: "#84908A" }}>
              신청자: <b style={{ color: "#0C0F0D" }}>{me.name}</b> · {me.dept}
            </p>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>유형</label>
                <select
                  className="fld"
                  value={newReq.type}
                  onChange={(e) => setNewReq({ ...newReq, type: e.target.value })}
                  style={{ ...fld, background: "#fff" }}
                >
                  <option value="연차">연차</option>
                  <option value="반차">반차</option>
                  <option value="출장">출장</option>
                  <option value="병가">병가</option>
                  <option value="경조사">경조사</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>기간</label>
                  <input
                    className="fld"
                    value={newReq.range}
                    onChange={(e) => setNewReq({ ...newReq, range: e.target.value })}
                    placeholder="예: 8/5 ~ 8/7"
                    style={fld}
                  />
                </div>
                <div>
                  <label style={lbl}>일수</label>
                  <input
                    className="fld"
                    value={newReq.days}
                    onChange={(e) => setNewReq({ ...newReq, days: e.target.value })}
                    placeholder="예: 3일"
                    style={fld}
                  />
                </div>
              </div>
              <div>
                <label style={lbl}>사유 (선택)</label>
                <textarea
                  className="fld"
                  value={newReq.reason}
                  onChange={(e) => setNewReq({ ...newReq, reason: e.target.value })}
                  placeholder="사유를 입력하세요"
                  style={{ ...fld, minHeight: 72, resize: "vertical", display: "block" }}
                />
              </div>
            </div>
            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setNewReq(null)}
                className="gbtn"
                style={{ padding: "11px 20px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 9, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={submitLeave}
                className="pbtn"
                style={{ padding: "11px 24px", border: "none", borderRadius: 9, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                신청하기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
