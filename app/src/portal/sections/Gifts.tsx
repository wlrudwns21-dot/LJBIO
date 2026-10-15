import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "../ui";
import { demoGiftOrders } from "../data/demo";
import { won } from "@/lib/giftProducts";
import { fmtDT } from "@/lib/dates";
import type { GiftOrder } from "@/types/database";

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  new: { label: "신규", bg: "#FDECEC", color: "#D14343" },
  confirmed: { label: "확인", bg: "#E0EDFB", color: "#2A6FDB" },
  shipped: { label: "배송중", bg: "#FFF2DE", color: "#B77A16" },
  done: { label: "완료", bg: "#E9F2EC", color: "#3E8E68" },
  canceled: { label: "취소", bg: "#EEF1EE", color: "#6B7280" },
};
const FLOW: GiftOrder["status"][] = ["new", "confirmed", "shipped", "done"];
const FILTERS: [string, string][] = [
  ["전체", "전체"],
  ["new", "신규"],
  ["confirmed", "확인"],
  ["shipped", "배송중"],
  ["done", "완료"],
];

export default function Gifts() {
  const flash = useToast();
  const [items, setItems] = useState<GiftOrder[]>(demoGiftOrders);
  const [filter, setFilter] = useState("전체");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("gift_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setItems(data as GiftOrder[]));
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

  function setStatus(o: GiftOrder, status: GiftOrder["status"], msg: string) {
    setItems((list) => list.map((x) => (x.id === o.id ? { ...x, status } : x)));
    void persist(() => supabase.from("gift_orders").update({ status }).eq("id", o.id));
    flash(msg);
  }
  function remove(o: GiftOrder) {
    if (!window.confirm("이 신청 건을 삭제할까요?")) return;
    setItems((list) => list.filter((x) => x.id !== o.id));
    void persist(() => supabase.from("gift_orders").delete().eq("id", o.id));
    flash("신청 건을 삭제했습니다");
  }

  const shown = items.filter((o) => filter === "전체" || o.status === filter);
  const newCount = items.filter((o) => o.status === "new").length;
  const summary = useMemo(() => {
    const active = items.filter((o) => o.status !== "canceled");
    const qty = active.reduce((s, o) => s + (o.quantity || 1), 0);
    const amount = active.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
    return { count: active.length, qty, amount };
  }, [items]);

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* summary */}
      <div className="g-toolbar" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Stat label="신청 건수" value={`${summary.count}건`} />
        <Stat label="총 수량" value={`${summary.qty}개`} />
        <Stat label="예상 금액" value={won(summary.amount)} accent />
      </div>

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
          홈페이지 <b style={{ color: "#0C0F0D" }}>추석 선물 신청</b>으로 접수된 배송 요청입니다.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.map((o) => {
          const st = STATUS[o.status] || STATUS.new;
          const nextIdx = FLOW.indexOf(o.status);
          const next = nextIdx >= 0 && nextIdx < FLOW.length - 1 ? FLOW[nextIdx + 1] : null;
          return (
            <div
              key={o.id}
              style={{
                background: "#fff",
                border: "1px solid rgba(12,15,13,0.08)",
                borderRadius: 14,
                padding: "18px 20px",
                borderLeft: `4px solid ${st.color}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{o.product}</span>
                    <span style={{ fontSize: 13, color: "#0E7B4E", fontWeight: 700 }}>× {o.quantity || 1}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 5 }}>
                    {won((o.price || 0) * (o.quantity || 1))} · 접수 {fmtDT(o.created_at)}
                  </div>
                </div>
              </div>

              {/* recipient block */}
              <div className="doc-grid4" style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                <KV label="받는 분" value={o.recipient_name} />
                <KV label="연락처" value={o.recipient_phone} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <KV label="배송지" value={`${o.recipient_address}${o.address_detail ? " " + o.address_detail : ""}`} />
                </div>
                <KV label="배송 요청일" value={o.delivery_date ? String(o.delivery_date).slice(0, 10) : "-"} strong />
                {(o.sender_name || o.sender_phone) && (
                  <KV label="보내는 분" value={`${o.sender_name || "-"}${o.sender_phone ? " · " + o.sender_phone : ""}`} />
                )}
              </div>
              {o.memo && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#F7FAF8", borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, color: "#2A2C33", whiteSpace: "pre-wrap" }}>
                  <b style={{ color: "#6B7280", fontSize: 12 }}>요청사항 </b>
                  {o.memo}
                </div>
              )}

              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {next && (
                  <button onClick={() => setStatus(o, next, `'${STATUS[next].label}' 상태로 변경했습니다`)} className="pbtn" style={{ padding: "8px 15px", border: "none", borderRadius: 8, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    {STATUS[next].label}(으)로 변경
                  </button>
                )}
                <a href={`tel:${o.recipient_phone}`} className="gbtn" style={{ ...actBtn, textDecoration: "none", color: "#2A2C33", display: "inline-block" }}>☎ 전화</a>
                {o.status !== "canceled" && (
                  <button onClick={() => setStatus(o, "canceled", "취소 처리했습니다")} className="gbtn" style={actBtn}>취소</button>
                )}
                <button onClick={() => remove(o)} className="gbtn" style={{ ...actBtn, border: "1px solid rgba(196,85,62,0.3)", color: "#C4553E" }}>삭제</button>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "#9AA29C", fontSize: 14, background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 14 }}>
            해당하는 신청 건이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: "1 1 120px", minWidth: 120, background: "#fff", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ fontSize: 12, color: "#84908A" }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, marginTop: 3, color: accent ? "#0E7B4E" : "#0C0F0D" }}>{value}</div>
    </div>
  );
}

function KV({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "#9AA29C", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, marginTop: 2, color: strong ? "#0E7B4E" : "#2A2C33", fontWeight: strong ? 700 : 500 }}>{value}</div>
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
