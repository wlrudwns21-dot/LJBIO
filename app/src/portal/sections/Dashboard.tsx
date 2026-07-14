import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { priorityStyle, fieldStyle, noticeTagStyle } from "@/lib/theme";
import { Card } from "../ui";
import { useSectionNav } from "../nav";
import { taskPct, taskStatus } from "../data/taskUtils";
import {
  demoTasks,
  demoNotices,
  demoEvents,
  demoLeaves,
  demoPending,
  demoConversations,
} from "../data/demo";
import type { TaskFull, Notice, CalendarEvent } from "@/types/database";

type DashEvent = CalendarEvent & { day?: string | null; mon?: string | null };

const EVENT_COLOR: Record<string, string> = {
  회의: "#2A6FDB",
  마감: "#D14343",
  출장: "#C6803A",
  점검: "#84908A",
  제출: "#0E7B4E",
};

export default function Dashboard() {
  const go = useSectionNav();
  // 실서버 모드에서는 더미 대신 빈 상태에서 시작해 로딩 후 실데이터로 채웁니다.
  const live = isSupabaseConfigured;
  const [tasks, setTasks] = useState<TaskFull[]>(live ? [] : demoTasks);
  const [notices, setNotices] = useState<Notice[]>(live ? [] : demoNotices);
  const [events, setEvents] = useState<DashEvent[]>(
    live ? [] : (demoEvents as DashEvent[]),
  );
  const [pendingCount, setPendingCount] = useState(live ? 0 : demoPending.length);
  const [pendingLeaves, setPendingLeaves] = useState(
    live ? 0 : demoLeaves.filter((l) => l.status === "pending").length,
  );
  const [loading, setLoading] = useState(live);
  const unread = demoConversations.reduce((a, d) => a + (d.unread || 0), 0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: t } = await supabase
        .from("tasks")
        .select("*, stages:task_stages(*, comments:task_comments(*))")
        .order("created_at", { ascending: false });
      if (t) setTasks(t as unknown as TaskFull[]);
      const { data: n } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (n) setNotices(n as Notice[]);
      const { data: ev } = await supabase
        .from("calendar_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (ev) setEvents(ev as DashEvent[]);
      const { count: pc } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending");
      setPendingCount(pc || 0);
      const { count: lc } = await supabase.from("leaves").select("*", { count: "exact", head: true }).eq("status", "pending");
      setPendingLeaves(lc || 0);
    })()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = tasks.filter((t) => taskStatus(t) !== "done");
  const stats = [
    { label: "진행 중 과제", value: String(active.length), delta: "▲ 2 이번 주", tone: "#0E7B4E" },
    { label: "이번 주 마감", value: "3", delta: "긴급 1건", tone: "#C6803A" },
    { label: "승인 대기", value: String(pendingCount + pendingLeaves), delta: "가입·휴가 포함", tone: "#84908A" },
    { label: "안 읽은 메시지", value: String(unread), delta: "2개 대화", tone: "#2A6FDB" },
  ];
  const dashTasks = active.slice(0, 4);
  const dashEvents = events.slice(0, 4);
  const dashNotices = notices.slice(0, 4);

  return (
    <div className="fade" style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div className="g-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 12.5, color: "#84908A", fontWeight: 500 }}>{s.label}</div>
            <div className="mono" style={{ marginTop: 10, fontSize: 30, fontWeight: 600, color: "#0C0F0D" }}>{s.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: s.tone, fontWeight: 600 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="g-2col" style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <Card style={{ borderRadius: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>진행 중인 업무 과제</h3>
            <a onClick={() => go("tasks")} style={{ fontSize: 13, color: "#0E7B4E", fontWeight: 600, cursor: "pointer" }}>전체 보기 →</a>
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {loading && (
              <div style={{ padding: "12px 0", fontSize: 13, color: "#84908A" }}>불러오는 중…</div>
            )}
            {!loading && dashTasks.length === 0 && (
              <div style={{ padding: "12px 0", fontSize: 13, color: "#84908A" }}>진행 중인 과제가 없습니다.</div>
            )}
            {dashTasks.map((t) => {
              const p = priorityStyle(t.priority);
              const fs = fieldStyle(t.field);
              return (
                <div key={t.id} onClick={() => go("tasks")} className="row-h" style={{ cursor: "pointer", padding: 14, border: "1px solid rgba(12,15,13,0.07)", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</div>
                    <span style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: fs.bg, color: fs.color, whiteSpace: "nowrap" }}>{t.field}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: p.bg, color: p.color, whiteSpace: "nowrap" }}>{t.priority}</span>
                    </span>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 7, borderRadius: 20, background: "rgba(12,15,13,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: taskPct(t), background: "linear-gradient(90deg,#0E7B4E,#46D08A)", borderRadius: 20 }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: "#84908A" }}>{taskPct(t)}</span>
                    <span style={{ fontSize: 12, color: "#84908A" }}>{t.assignee}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ borderRadius: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>오늘 · 다가오는 일정</h3>
              <a onClick={() => go("schedule")} style={{ fontSize: 13, color: "#0E7B4E", fontWeight: 600, cursor: "pointer" }}>캘린더 →</a>
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
              {loading ? (
                <div style={{ padding: "18px 0", fontSize: 13, color: "#84908A" }}>
                  일정을 불러오는 중…
                </div>
              ) : dashEvents.length === 0 ? (
                <div style={{ padding: "18px 0", fontSize: 13, color: "#84908A" }}>
                  예정된 일정이 없습니다.
                </div>
              ) : (
                dashEvents.map((e) => (
                  <div key={e.id} style={{ display: "flex", gap: 14, padding: "11px 0", borderBottom: "1px solid rgba(12,15,13,0.06)" }}>
                    <div style={{ textAlign: "center", minWidth: 42 }}>
                      <div className="mono" style={{ fontSize: 17, fontWeight: 600, color: "#0E7B4E" }}>{e.day}</div>
                      <div style={{ fontSize: 10, color: "#84908A" }}>{e.mon}</div>
                    </div>
                    <div style={{ borderLeft: `2px solid ${EVENT_COLOR[e.type] || "#84908A"}`, paddingLeft: 12 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: "#84908A", marginTop: 2 }}>{e.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          <div style={{ background: "linear-gradient(150deg,#0B0E0C,#0A1710)", borderRadius: 18, padding: 24, color: "#fff" }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "#46D08A" }}>QUICK ACTIONS</div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "📄 문서 생성", k: "docs" as const },
                { label: "🏖 휴가 신청", k: "hr" as const },
                { label: "📁 파일 업로드", k: "files" as const },
                { label: "💬 메시지", k: "chat" as const },
              ].map((b) => (
                <button key={b.k} className="gbtn" onClick={() => go(b.k)} style={{ padding: 12, border: "1px solid rgba(255,255,255,0.16)", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Card style={{ marginTop: 22, borderRadius: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>공지사항</h3>
          <a onClick={() => go("notices")} style={{ fontSize: 13, color: "#0E7B4E", fontWeight: 600, cursor: "pointer" }}>전체 보기 →</a>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
          {loading && (
            <div style={{ padding: "12px 8px", fontSize: 13, color: "#84908A" }}>불러오는 중…</div>
          )}
          {!loading && dashNotices.length === 0 && (
            <div style={{ padding: "12px 8px", fontSize: 13, color: "#84908A" }}>등록된 공지가 없습니다.</div>
          )}
          {dashNotices.map((n) => {
            const c = noticeTagStyle(n.tag);
            return (
              <div key={n.id} className="row-h" style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 8px", borderBottom: "1px solid rgba(12,15,13,0.06)", cursor: "pointer" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>{n.tag}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{n.title}</span>
                <span style={{ fontSize: 12.5, color: "#84908A" }}>{(n as any).date || n.created_at}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
