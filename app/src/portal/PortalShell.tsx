import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { roleLabel } from "@/lib/theme";
import { isMaster } from "@/lib/access";
import { SECTIONS, type SectionKey } from "./sections/registry";
import { SectionNavContext } from "./nav";

type Badges = Partial<Record<string, number>>;

const DEMO_BADGES: Badges = { chat: 5, mail: 2, approvals: 3, hr: 2, admin: 3, inquiries: 1 };

/** 계정별 새 항목 뱃지 — 각 섹션의 '마지막 확인 시각(section_seen)' 이후
 *  등록된 건수를 세고, 그 계정이 메뉴를 열면 확인 시각을 갱신해 뱃지를 지웁니다.
 *  계정마다 확인 기록이 달라 뱃지도 계정별로 다르게 표시됩니다. */
const SEEN_DEFS: {
  key: SectionKey;
  table: string;
  /** 본인이 등록한 건 제외하는 필터 */
  exclude?: (q: any, me: { id: string; name: string }) => any;
}[] = [
  { key: "notices", table: "notices" },
  { key: "inquiries", table: "inquiries" },
  { key: "tasks", table: "tasks" },
  { key: "schedule", table: "calendar_events" },
  { key: "chat", table: "messages", exclude: (q, me) => q.neq("sender_id", me.id) },
  { key: "approvals", table: "approvals", exclude: (q, me) => q.neq("drafter", me.name) },
  { key: "files", table: "files", exclude: (q, me) => q.neq("uploader", me.name) },
  { key: "partners", table: "partners" },
  { key: "hr", table: "leaves", exclude: (q, me) => q.neq("name", me.name) },
];

const EPOCH = "1970-01-01T00:00:00Z";

function useNavBadges(profile: { id: string; name: string } | null) {
  const [b, setB] = useState<Badges>(isSupabaseConfigured ? {} : DEMO_BADGES);

  useEffect(() => {
    if (!isSupabaseConfigured || !profile?.id) return;
    let stop = false;
    const load = async () => {
      try {
        const { data: seenRows } = await supabase
          .from("section_seen")
          .select("section,seen_at")
          .eq("profile_id", profile.id);
        const seen = Object.fromEntries(
          ((seenRows || []) as { section: string; seen_at: string }[]).map((r) => [
            r.section,
            r.seen_at,
          ]),
        );
        const counts = await Promise.all([
          ...SEEN_DEFS.map(async (d) => {
            let q: any = supabase
              .from(d.table)
              .select("*", { count: "exact", head: true })
              .gt("created_at", seen[d.key] || EPOCH);
            if (d.exclude) q = d.exclude(q, profile);
            const { count } = await q;
            return [d.key, count || 0] as const;
          }),
          // 관리자: 가입 승인 대기(처리 전까지 유지) · 메일: 안 읽음
          (async () => {
            const { count } = await supabase
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending");
            return ["admin", count || 0] as const;
          })(),
          (async () => {
            const { count } = await supabase
              .from("mails")
              .select("*", { count: "exact", head: true })
              .eq("folder", "inbox")
              .eq("unread", true);
            return ["mail", count || 0] as const;
          })(),
        ]);
        if (!stop) setB(Object.fromEntries(counts));
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 60000); // 1분마다 갱신
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [profile?.id]);

  const markSeen = (k: SectionKey) => {
    setB((prev) => (prev[k] ? { ...prev, [k]: 0 } : prev));
    if (isSupabaseConfigured && profile?.id && SEEN_DEFS.some((d) => d.key === k)) {
      supabase
        .from("section_seen")
        .upsert({ profile_id: profile.id, section: k, seen_at: new Date().toISOString() })
        .then(() => {});
    }
  };

  return { badges: b, markSeen };
}

export default function PortalShell() {
  const { profile, logout } = useAuth();
  const [section, setSection] = useState<SectionKey>("dashboard");
  const [drawer, setDrawer] = useState(false);
  const { badges, markSeen } = useNavBadges(
    profile ? { id: profile.id, name: profile.name } : null,
  );

  const me = profile ?? {
    name: "지경준",
    role: "admin" as const,
    dept: "경영지원",
    init: "지",
    email: "kyungjun.ji@bio-lj.com",
  };
  const meInit = me.init || me.name.charAt(0);
  const isManagerUp = me.role === "admin" || me.role === "manager";
  const meIsMaster = isMaster(me);
  // 파일 관리·재무 현황은 팀장급 이상만, 관리자 메뉴는 마스터(지경준)만 노출
  const navSections = SECTIONS.filter((s) => {
    if (s.key === "files" || s.key === "finance") return isManagerUp;
    if (s.key === "admin") return meIsMaster;
    return true;
  });

  const active = useMemo(
    () => SECTIONS.find((s) => s.key === section) || SECTIONS[0],
    [section],
  );
  const Active = active.Component;

  const go = (k: SectionKey) => {
    setSection(k);
    setDrawer(false);
    markSeen(k); // 이 계정의 확인 기록 → 뱃지 제거 (계정별 독립)
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside
        className={"app-sidebar" + (drawer ? " open" : "")}
        style={{
          width: 250,
          flexShrink: 0,
          background: "#0B0E0C",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ padding: "24px 22px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 21,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            LJ<span style={{ color: "#46D08A" }}>-BIO</span>
          </Link>
          <div className="mono" style={{ marginTop: 3, fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>
            WORKSPACE
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          {navSections.map((s) => {
            const on = s.key === section;
            const badge = badges[s.key] || 0;
            return (
              <a
                key={s.key}
                className="navitem"
                onClick={() => go(s.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 13px",
                  borderRadius: 11,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: on ? 600 : 500,
                  color: on ? "#fff" : "rgba(255,255,255,0.62)",
                  background: on
                    ? "linear-gradient(110deg,rgba(14,123,78,0.9),rgba(70,208,138,0.55))"
                    : "transparent",
                }}
              >
                <span style={{ width: 20, textAlign: "center", fontSize: 15 }}>{s.icon}</span>
                <span style={{ flex: 1 }}>{s.nav}</span>
                {badge > 0 && (
                  <span
                    style={{
                      minWidth: 19,
                      height: 19,
                      padding: "0 5px",
                      borderRadius: 20,
                      background: "#0E7B4E",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(135deg,#0E7B4E,#46D08A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            {meInit}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {me.name}
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
              {roleLabel(me.role)} · {me.dept}
            </div>
          </div>
          <span onClick={() => logout()} title="로그아웃" style={{ cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 17 }}>
            ⏻
          </span>
        </div>
      </aside>
      <div className={"sb-overlay" + (drawer ? " open" : "")} onClick={() => setDrawer(false)} />

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#EEF2EF" }}>
        <header
          className="app-topbar"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(18px)",
            borderBottom: "1px solid rgba(12,15,13,0.08)",
            padding: "14px 30px",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <button
            className="nav-burger"
            aria-label="메뉴"
            onClick={() => setDrawer(true)}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              border: "1px solid rgba(12,15,13,0.12)",
              background: "#fff",
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 4,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span style={{ display: "block", width: 17, height: 2, background: "#0C0F0D", borderRadius: 2 }} />
            <span style={{ display: "block", width: 17, height: 2, background: "#0C0F0D", borderRadius: 2 }} />
            <span style={{ display: "block", width: 17, height: 2, background: "#0C0F0D", borderRadius: 2 }} />
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>{active.title}</div>
            <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 1 }}>{active.sub}</div>
          </div>
          <div style={{ flex: 1 }} />
          <Link
            to="/"
            className="gbtn topbar-home"
            title="고객 홈페이지로 이동"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              textDecoration: "none",
              padding: "9px 15px",
              border: "1px solid rgba(12,15,13,0.14)",
              borderRadius: 10,
              background: "#fff",
              color: "#0C0F0D",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            🌐 고객 홈페이지
          </Link>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(135deg,#0E7B4E,#46D08A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {meInit}
          </div>
        </header>

        <main className="app-main" style={{ flex: 1, overflowY: "auto", padding: 30 }}>
          <SectionNavContext.Provider value={go}>
            <Active />
          </SectionNavContext.Provider>
        </main>
      </div>
    </div>
  );
}
