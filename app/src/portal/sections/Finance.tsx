import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fmtKRW } from "@/lib/theme";
import { demoSegments } from "../data/demo";
import type { Segment } from "@/types/database";

export default function Finance() {
  const [segments, setSegments] = useState<Segment[]>(demoSegments);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("segments")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data }) => data && setSegments(data as Segment[]));
  }, []);

  const updFinance = (segId: string, field: "orders" | "revenue") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = String(e.target.value).replace(/[^0-9]/g, "");
    const n = Number(raw) || 0;
    setSegments((prev) => prev.map((sg) => (sg.id === segId ? { ...sg, [field]: n } : sg)));
    if (isSupabaseConfigured) {
      supabase.from("segments").update({ [field]: n }).eq("id", segId).then(() => {});
    }
  };

  const totalRev = segments.reduce((a, sg) => a + (sg.revenue || 0), 0);
  const totalOrders = segments.reduce((a, sg) => a + (sg.orders || 0), 0);
  const maxRev = Math.max(1, ...segments.map((sg) => sg.revenue || 0));
  let topSeg: Segment | null = null;
  let topRev = -1;
  segments.forEach((sg) => {
    const r = sg.revenue || 0;
    if (r > topRev) {
      topRev = r;
      topSeg = sg;
    }
  });

  const finStats = [
    { label: "총 매출 (전 부문)", value: fmtKRW(totalRev), tone: "#0E7B4E" },
    { label: "총 주문 건수", value: totalOrders.toLocaleString() + "건", tone: "#2A6FDB" },
    { label: "사업 부문 수", value: segments.length + "개", tone: "#7A4DD1" },
    { label: "최대 매출 부문", value: topSeg ? (topSeg as Segment).name : "—", tone: "#C6803A" },
  ];

  return (
    <div className="fade" style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div className="g-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 22 }}>
        {finStats.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12.5, color: "#84908A" }}>{s.label}</div>
            <div className="mono" style={{ marginTop: 8, fontSize: 22, fontWeight: 600, color: s.tone }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="g-2col" style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>사업 부문별 매출 · 주문</h3>
            <span style={{ fontSize: 12, color: "#84908A" }}>숫자를 직접 수정하세요</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
            {segments.map((sg) => {
              const revenue = sg.revenue || 0;
              const pct = Math.round((revenue / (totalRev || 1)) * 100);
              return (
                <div key={sg.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: sg.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{sg.name}</span>
                    <span className="mono" style={{ fontSize: 12, color: "#84908A" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 20, background: "rgba(12,15,13,0.06)", overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ height: "100%", width: `${Math.round((revenue / maxRev) * 100)}%`, background: sg.color, borderRadius: 20, transition: "width .4s" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{ fontSize: 11.5, color: "#84908A", fontWeight: 600, whiteSpace: "nowrap" }}>주문량</label>
                      <input
                        className="fld"
                        value={sg.orders}
                        onChange={updFinance(sg.id, "orders")}
                        inputMode="numeric"
                        style={{ width: "100%", minWidth: 0, padding: "8px 10px", border: "1.5px solid rgba(12,15,13,0.12)", borderRadius: 8, fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}
                      />
                      <span style={{ fontSize: 12, color: "#84908A" }}>건</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{ fontSize: 11.5, color: "#84908A", fontWeight: 600, whiteSpace: "nowrap" }}>매출(원)</label>
                      <input
                        className="fld"
                        value={sg.revenue}
                        onChange={updFinance(sg.id, "revenue")}
                        inputMode="numeric"
                        style={{ width: "100%", minWidth: 0, padding: "8px 10px", border: "1.5px solid rgba(12,15,13,0.12)", borderRadius: 8, fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}
                      />
                      <span className="mono" style={{ fontSize: 11.5, color: "#0E7B4E", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtKRW(revenue)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 18, padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>매출 구성 비중</h3>
          <div style={{ height: 16, borderRadius: 20, overflow: "hidden", display: "flex", background: "rgba(12,15,13,0.05)" }}>
            {segments.map((sg) => {
              const pct = Math.round(((sg.revenue || 0) / (totalRev || 1)) * 100);
              return <div key={sg.id} style={{ height: "100%", width: `${pct}%`, background: sg.color }} />;
            })}
          </div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
            {segments.map((sg) => {
              const pct = Math.round(((sg.revenue || 0) / (totalRev || 1)) * 100);
              return (
                <div key={sg.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: sg.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{sg.name}</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "#0C0F0D" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(12,15,13,0.08)", fontSize: 12, color: "#84908A", lineHeight: 1.6 }}>
            사업 부문은 <b style={{ color: "#0E7B4E" }}>관리자</b> 메뉴에서 추가·수정·삭제할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
