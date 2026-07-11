import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "../ui";
import { demoEvents } from "../data/demo";
import type { CalendarEvent } from "@/types/database";

// Left-border / accent color per event type
const EVENT_COLOR: Record<string, string> = {
  회의: "#2A6FDB",
  마감: "#D14343",
  출장: "#C6803A",
  점검: "#84908A",
  제출: "#0E7B4E",
};

// Calendar chip background + text color per event type
const EV_BG: Record<string, { bg: string; color: string }> = {
  회의: { bg: "#E0EDFB", color: "#2A6FDB" },
  마감: { bg: "#FDE8E8", color: "#D14343" },
  출장: { bg: "#FFF1E0", color: "#C6803A" },
  점검: { bg: "#EEF1EE", color: "#6B7280" },
  제출: { bg: "#E9F2EC", color: "#3E8E68" },
};

// Short calendar-cell events keyed by day-of-month (July 2026)
const EV_BY_DAY: Record<number, { title: string; type: string }[]> = {
  11: [{ title: "화상회의", type: "회의" }],
  14: [{ title: "선적 마감", type: "마감" }],
  15: [{ title: "시스템 점검", type: "점검" }],
  18: [{ title: "일본 출장", type: "출장" }],
  22: [{ title: "자료 제출", type: "제출" }],
  24: [{ title: "김서연 연차", type: "출장" }],
  25: [{ title: "영업 회의", type: "회의" }],
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function Schedule() {
  const flash = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>(demoEvents);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true })
      .then(({ data }) => {
        if (data) setEvents(data as CalendarEvent[]);
      });
  }, []);

  // July 2026 starts on a Wednesday → offset 3, 31 days, today = 11.
  const OFFSET = 3;
  const DIM = 31;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - OFFSET + 1;
    const inMonth = day >= 1 && day <= DIM;
    const today = day === 11;
    const chips = inMonth
      ? (EV_BY_DAY[day] || []).map((e) => ({
          title: e.title,
          bg: EV_BG[e.type].bg,
          color: EV_BG[e.type].color,
        }))
      : [];
    return {
      key: i,
      day: inMonth ? String(day) : "",
      chips,
      today,
      inMonth,
      numColor: today ? "#0E7B4E" : inMonth ? "#0C0F0D" : "transparent",
      border: today ? "#0E7B4E" : "rgba(12,15,13,0.06)",
      bg: today ? "rgba(14,123,78,0.06)" : inMonth ? "#fff" : "transparent",
    };
  });

  return (
    <div
      className="fade g-schedule"
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* Calendar */}
      <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 18, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>2026년 7월</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="gbtn" style={{ width: 34, height: 34, border: "1px solid rgba(12,15,13,0.12)", borderRadius: 9, background: "#fff", cursor: "pointer" }}>‹</button>
            <button className="gbtn" style={{ width: 34, height: 34, border: "1px solid rgba(12,15,13,0.12)", borderRadius: 9, background: "#fff", cursor: "pointer" }}>›</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#84908A", paddingBottom: 6 }}>{w}</div>
          ))}
          {cells.map((c) => (
            <div
              key={c.key}
              style={{
                minHeight: 82,
                borderRadius: 10,
                padding: "7px 8px",
                border: `1px solid ${c.border}`,
                background: c.bg,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: c.numColor }}>{c.day}</div>
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                {c.chips.map((ev, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 5px",
                      borderRadius: 5,
                      background: ev.bg,
                      color: ev.color,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button
          className="pbtn"
          onClick={() => flash("일정 추가")}
          style={{
            padding: 13,
            border: "none",
            borderRadius: 12,
            background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 일정 추가
        </button>
        <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>다가오는 일정</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {events.map((e) => {
              const color = EVENT_COLOR[e.type] || "#84908A";
              return (
                <div key={e.id} style={{ display: "flex", gap: 12 }}>
                  <div style={{ textAlign: "center", minWidth: 38 }}>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600, color }}>{e.day}</div>
                    <div style={{ fontSize: 9.5, color: "#84908A" }}>{e.mon}</div>
                  </div>
                  <div style={{ flex: 1, borderLeft: `2px solid ${color}`, paddingLeft: 11 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                    <div style={{ fontSize: 11.5, color: "#84908A", marginTop: 2 }}>{e.time} · {e.type}</div>
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
