import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Modal, useToast } from "../ui";
import { demoEvents } from "../data/demo";
import type { CalendarEvent } from "@/types/database";

const EVENT_COLOR: Record<string, string> = {
  회의: "#2A6FDB",
  마감: "#D14343",
  출장: "#C6803A",
  점검: "#84908A",
  제출: "#0E7B4E",
  기타: "#7A4DD1",
};
const EV_BG: Record<string, { bg: string; color: string }> = {
  회의: { bg: "#E0EDFB", color: "#2A6FDB" },
  마감: { bg: "#FDE8E8", color: "#D14343" },
  출장: { bg: "#FFF1E0", color: "#C6803A" },
  점검: { bg: "#EEF1EE", color: "#6B7280" },
  제출: { bg: "#E9F2EC", color: "#3E8E68" },
  기타: { bg: "#EDE7FB", color: "#6B45C9" },
};
const TYPES = ["회의", "마감", "출장", "점검", "제출", "기타"];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MON_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const bg = (t: string) => EV_BG[t] || EV_BG["기타"];

type Editor = { id?: string; title: string; type: string; event_date: string; time: string };
const fld: React.CSSProperties = {
  marginTop: 5,
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
};
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#4A4C55" };

export default function Schedule() {
  const flash = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>(demoEvents);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Default view = month of the seed data (falls back to now).
  const seed = demoEvents[0]?.event_date ? new Date(demoEvents[0].event_date) : new Date();
  const [viewYear, setViewYear] = useState(seed.getFullYear());
  const [viewMonth, setViewMonth] = useState(seed.getMonth()); // 0-11

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true })
      .then(({ data }) => data && setEvents(data as CalendarEvent[]));
  }, []);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  const eventsOn = (dateStr: string) =>
    events.filter((e) => (e.event_date || "").slice(0, 10) === dateStr);

  async function save() {
    if (!editor) return;
    if (!editor.title.trim()) {
      flash("제목을 입력하세요");
      return;
    }
    const row = {
      title: editor.title.trim(),
      type: editor.type,
      event_date: editor.event_date,
      time: editor.time.trim() || "종일",
    };
    if (editor.id) {
      setEvents((prev) =>
        prev.map((e) => (e.id === editor.id ? ({ ...e, ...row } as CalendarEvent) : e)),
      );
      if (isSupabaseConfigured)
        await supabase.from("calendar_events").update(row).eq("id", editor.id);
      flash("일정을 수정했습니다");
    } else {
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from("calendar_events")
          .insert(row)
          .select()
          .single();
        if (data) setEvents((prev) => [...prev, data as CalendarEvent]);
      } else {
        setEvents((prev) => [
          ...prev,
          { ...row, id: "e" + Date.now(), day: null, mon: null, created_at: "" } as CalendarEvent,
        ]);
      }
      flash("일정을 추가했습니다");
    }
    setEditor(null);
  }
  async function del() {
    if (!editor?.id) return;
    const id = editor.id;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (isSupabaseConfigured) await supabase.from("calendar_events").delete().eq("id", id);
    setEditor(null);
    flash("일정을 삭제했습니다");
  }

  const openNew = (dateStr: string) =>
    setEditor({ title: "", type: "회의", event_date: dateStr, time: "" });
  const openEdit = (e: CalendarEvent) =>
    setEditor({
      id: e.id,
      title: e.title,
      type: e.type,
      event_date: (e.event_date || todayStr).slice(0, 10),
      time: e.time || "",
    });

  // build 42-cell grid for the viewed month
  const offset = new Date(viewYear, viewMonth, 1).getDay();
  const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1;
    const inMonth = day >= 1 && day <= dim;
    const dateStr = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    const isToday = inMonth && dateStr === todayStr;
    return { key: i, day, inMonth, dateStr, isToday, dayEvents: inMonth ? eventsOn(dateStr) : [] };
  });

  // upcoming list: from today forward; if none, show all (sorted)
  const sorted = [...events].sort((a, b) =>
    (a.event_date || "").localeCompare(b.event_date || ""),
  );
  const future = sorted.filter((e) => (e.event_date || "") >= todayStr);
  const upcoming = (future.length ? future : sorted).slice(0, 8);

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
          <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {viewYear}년 {viewMonth + 1}월
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={prevMonth} className="gbtn" style={navBtn}>‹</button>
            <button
              onClick={() => {
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
              }}
              className="gbtn"
              style={{ ...navBtn, width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 600 }}
            >
              오늘
            </button>
            <button onClick={nextMonth} className="gbtn" style={navBtn}>›</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#84908A", paddingBottom: 6 }}>
              {w}
            </div>
          ))}
          {cells.map((c) => (
            <div
              key={c.key}
              onClick={() => c.inMonth && openNew(c.dateStr)}
              title={c.inMonth ? "클릭해 일정 추가" : undefined}
              style={{
                minHeight: 82,
                borderRadius: 10,
                padding: "7px 8px",
                border: `1px solid ${c.isToday ? "#0E7B4E" : "rgba(12,15,13,0.06)"}`,
                background: c.isToday ? "rgba(14,123,78,0.06)" : c.inMonth ? "#fff" : "transparent",
                cursor: c.inMonth ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: c.isToday ? "#0E7B4E" : c.inMonth ? "#0C0F0D" : "transparent",
                }}
              >
                {c.inMonth ? c.day : ""}
              </div>
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                {c.dayEvents.map((ev) => {
                  const s = bg(ev.type);
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(ev);
                      }}
                      title={`${ev.title} · ${ev.time || ""}`}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 5px",
                        borderRadius: 5,
                        background: s.bg,
                        color: s.color,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                      }}
                    >
                      {ev.title}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button
          className="pbtn"
          onClick={() =>
            openNew(
              // default new-event date to today if it's in view, else the 1st of the viewed month
              todayStr.startsWith(`${viewYear}-${pad2(viewMonth + 1)}`)
                ? todayStr
                : `${viewYear}-${pad2(viewMonth + 1)}-01`,
            )
          }
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {upcoming.map((e) => {
              const color = EVENT_COLOR[e.type] || "#84908A";
              const d = e.event_date ? new Date(e.event_date) : null;
              return (
                <div
                  key={e.id}
                  className="row-h"
                  onClick={() => openEdit(e)}
                  style={{ display: "flex", gap: 12, padding: "7px 6px", borderRadius: 9, cursor: "pointer" }}
                >
                  <div style={{ textAlign: "center", minWidth: 38 }}>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600, color }}>
                      {d ? d.getDate() : e.day}
                    </div>
                    <div style={{ fontSize: 9.5, color: "#84908A" }}>
                      {d ? MON_ABBR[d.getMonth()] : e.mon}
                    </div>
                  </div>
                  <div style={{ flex: 1, borderLeft: `2px solid ${color}`, paddingLeft: 11 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                    <div style={{ fontSize: 11.5, color: "#84908A", marginTop: 2 }}>
                      {e.time} · {e.type}
                    </div>
                  </div>
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <div style={{ padding: "24px 8px", textAlign: "center", color: "#9AA29C", fontSize: 13 }}>
                등록된 일정이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor modal */}
      <Modal open={!!editor} onClose={() => setEditor(null)} width={460}>
        {editor && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {editor.id ? "일정 수정" : "새 일정"}
            </h2>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>제목</label>
                <input
                  className="fld"
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="예: 중국 파트너사 화상회의"
                  style={fld}
                  autoFocus
                />
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>날짜</label>
                  <input
                    type="date"
                    className="fld"
                    value={editor.event_date}
                    onChange={(e) => setEditor({ ...editor, event_date: e.target.value })}
                    style={fld}
                  />
                </div>
                <div>
                  <label style={lbl}>유형</label>
                  <select
                    className="fld"
                    value={editor.type}
                    onChange={(e) => setEditor({ ...editor, type: e.target.value })}
                    style={{ ...fld, background: "#fff" }}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>시간</label>
                <input
                  className="fld"
                  value={editor.time}
                  onChange={(e) => setEditor({ ...editor, time: e.target.value })}
                  placeholder="예: 오후 3:00 / 종일"
                  style={fld}
                />
              </div>
            </div>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
              {editor.id && (
                <button
                  onClick={del}
                  className="gbtn"
                  style={{
                    padding: "11px 16px",
                    border: "1px solid rgba(196,85,62,0.3)",
                    borderRadius: 9,
                    background: "#fff",
                    color: "#C4553E",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🗑 삭제
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setEditor(null)}
                className="gbtn"
                style={{
                  padding: "11px 20px",
                  border: "1px solid rgba(12,15,13,0.14)",
                  borderRadius: 9,
                  background: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={save}
                className="pbtn"
                style={{
                  padding: "11px 24px",
                  border: "none",
                  borderRadius: 9,
                  background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {editor.id ? "저장" : "추가"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  border: "1px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  background: "#fff",
  cursor: "pointer",
  fontSize: 16,
};
