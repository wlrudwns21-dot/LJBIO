import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "../ui";
import { demoLeaves } from "../data/demo";
import type { Leave, ApprovalStatus } from "@/types/database";

function typeStyle(t: string): { bg: string; color: string } {
  if (t === "출장") return { bg: "#FFF1E0", color: "#C6803A" };
  if (t.includes("반차")) return { bg: "#E0EDFB", color: "#2A6FDB" };
  return { bg: "#E9F2EC", color: "#3E8E68" };
}

export default function Hr() {
  const flash = useToast();
  const [leaves, setLeaves] = useState<Leave[]>(demoLeaves);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("leaves")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setLeaves(data as Leave[]));
  }, []);

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
            <button className="pbtn" onClick={() => flash("휴가/출장 신청 (데모)")} style={{ padding: "9px 15px", border: "none", borderRadius: 9, background: "#0C0F0D", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>+ 신청</button>
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
    </div>
  );
}
