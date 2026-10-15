import { useEffect, useState, type CSSProperties } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Modal, useToast } from "../ui";
import Tasks from "./Tasks";
import ProjectDocs from "./ProjectDocs";
import { demoProjects, demoTasks, demoFiles } from "../data/demo";
import type { Project } from "@/types/database";

const COLORS = ["#0E7B4E", "#2A6FDB", "#C6803A", "#8A54D1", "#D14343", "#0C9488", "#B45309", "#6B7280"];
const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

type Counts = Record<string, { tasks: number; files: number }>;
type Editor = { id: string | null; name: string; description: string; color: string };

const labelStyle: CSSProperties = { fontSize: 12.5, color: "#4A4C55", fontWeight: 600 };
const inputStyle: CSSProperties = { marginTop: 6, width: "100%", padding: "11px 13px", border: "1.5px solid rgba(12,15,13,0.12)", borderRadius: 9, fontSize: 14 };

export default function Projects() {
  const toast = useToast();
  const { profile } = useAuth();
  const meName = profile?.name ?? "지경준";

  const [projects, setProjects] = useState<Project[]>(isSupabaseConfigured ? [] : demoProjects);
  const [counts, setCounts] = useState<Counts>({});
  const [unassigned, setUnassigned] = useState(0);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  // null = 프로젝트 목록 · "none" = 미분류 업무 · Project = 해당 프로젝트 작업공간
  const [active, setActive] = useState<Project | "none" | null>(null);
  const [tab, setTab] = useState<"tasks" | "docs">("tasks");
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const c: Counts = {};
      demoProjects.forEach((p) => (c[p.id] = { tasks: 0, files: 0 }));
      demoTasks.forEach((t) => t.project_id && c[t.project_id] && c[t.project_id].tasks++);
      demoFiles.forEach((f) => f.project_id && c[f.project_id] && c[f.project_id].files++);
      setCounts(c);
      setUnassigned(demoTasks.filter((t) => !t.project_id).length);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: ps } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      const list = (ps as Project[]) || [];
      setProjects(list);
      const { data: ts } = await supabase.from("tasks").select("id,project_id");
      const { data: fs } = await supabase.from("files").select("id,project_id");
      const c: Counts = {};
      list.forEach((p) => (c[p.id] = { tasks: 0, files: 0 }));
      let un = 0;
      ((ts as { project_id: string | null }[]) || []).forEach((t) => {
        if (t.project_id && c[t.project_id]) c[t.project_id].tasks++;
        else if (!t.project_id) un++;
      });
      ((fs as { project_id: string | null }[]) || []).forEach((f) => {
        if (f.project_id && c[f.project_id]) c[f.project_id].files++;
      });
      setCounts(c);
      setUnassigned(un);
      setLoading(false);
    })();
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

  function newProject() {
    setEditor({ id: null, name: "", description: "", color: COLORS[0] });
  }
  function editProject(p: Project) {
    setEditor({ id: p.id, name: p.name, description: p.description, color: p.color });
  }

  async function saveProject() {
    const e = editor;
    if (!e) return;
    if (!e.name.trim()) {
      toast("프로젝트명을 입력하세요");
      return;
    }
    if (e.id) {
      const patch = { name: e.name.trim(), description: e.description.trim(), color: e.color };
      setProjects((prev) => prev.map((p) => (p.id === e.id ? { ...p, ...patch } : p)));
      setActive((a) => (a && a !== "none" && a.id === e.id ? { ...a, ...patch } : a));
      setEditor(null);
      toast("프로젝트를 수정했습니다");
      void persist(() => supabase.from("projects").update(patch).eq("id", e.id as string));
      return;
    }
    const base = { name: e.name.trim(), description: e.description.trim(), color: e.color, created_by: meName };
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from("projects").insert(base).select().single();
        if (data) {
          setProjects((prev) => [data as Project, ...prev]);
          setCounts((c) => ({ ...c, [(data as Project).id]: { tasks: 0, files: 0 } }));
          setEditor(null);
          toast("새 프로젝트를 만들었습니다");
          return;
        }
      } catch {
        /* fall through */
      }
    }
    const np: Project = { id: genId(), status: "active", created_at: new Date().toISOString(), ...base };
    setProjects((prev) => [np, ...prev]);
    setCounts((c) => ({ ...c, [np.id]: { tasks: 0, files: 0 } }));
    setEditor(null);
    toast("새 프로젝트를 만들었습니다");
  }

  function deleteProject(p: Project) {
    if (!window.confirm(`'${p.name}' 프로젝트를 삭제할까요?\n(프로젝트에 속한 과제·문서는 '미분류'로 남습니다.)`)) return;
    setProjects((prev) => prev.filter((x) => x.id !== p.id));
    if (active && active !== "none" && active.id === p.id) setActive(null);
    toast("프로젝트를 삭제했습니다");
    void persist(() => supabase.from("projects").delete().eq("id", p.id));
  }

  /* ----------------------------------------------------------- 작업공간 */
  if (active) {
    const isNone = active === "none";
    const proj = isNone ? null : active;
    return (
      <div className="fade" style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* 작업공간 헤더 */}
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={() => setActive(null)}
            className="gbtn"
            style={{ padding: "7px 14px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            ← 프로젝트 목록
          </button>
          <div className="g-toolbar" style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, flexShrink: 0, background: proj?.color || "#84908A" }} />
              <div style={{ minWidth: 0 }}>
                <h2 className="doc-title" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  {isNone ? "미분류 업무" : proj!.name}
                </h2>
                {!isNone && proj!.description && (
                  <div style={{ fontSize: 13, color: "#84908A", marginTop: 3 }}>{proj!.description}</div>
                )}
              </div>
            </div>
            {!isNone && (
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => editProject(proj!)} className="gbtn" style={{ padding: "8px 13px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 8, background: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>✎ 편집</button>
                <button onClick={() => deleteProject(proj!)} className="gbtn" style={{ padding: "8px 13px", border: "1px solid rgba(196,85,62,0.3)", borderRadius: 8, background: "#fff", color: "#C4553E", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>🗑 삭제</button>
              </div>
            )}
          </div>

          {/* 탭 */}
          <div style={{ marginTop: 16, display: "flex", gap: 6, borderBottom: "1.5px solid rgba(12,15,13,0.08)" }}>
            <TabBtn on={tab === "tasks"} onClick={() => setTab("tasks")} label="📋 업무 과제" />
            {!isNone && <TabBtn on={tab === "docs"} onClick={() => setTab("docs")} label="📁 문서" />}
          </div>
        </div>

        {/* 탭 내용 */}
        {tab === "tasks" || isNone ? (
          <Tasks projectId={isNone ? "none" : proj!.id} />
        ) : (
          <ProjectDocs projectId={proj!.id} />
        )}

        <ProjectEditorModal editor={editor} setEditor={setEditor} onSave={saveProject} />
      </div>
    );
  }

  /* ----------------------------------------------------------- 프로젝트 목록 */
  return (
    <div className="fade" style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div className="g-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div style={{ fontSize: 13.5, color: "#5A5C65" }}>
          프로젝트를 선택해 <b>업무 과제</b>와 <b>문서</b>를 관리하세요.
        </div>
        <button onClick={newProject} className="pbtn" style={{ padding: "10px 18px", border: "none", borderRadius: 10, background: "#0C0F0D", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          + 새 프로젝트
        </button>
      </div>

      {loading ? (
        <div style={emptyBox}>프로젝트를 불러오는 중…</div>
      ) : (
        <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {projects.map((p) => {
            const c = counts[p.id] || { tasks: 0, files: 0 };
            return (
              <div
                key={p.id}
                onClick={() => {
                  setActive(p);
                  setTab("tasks");
                }}
                className="lift"
                style={{ position: "relative", cursor: "pointer", background: "#fff", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 16, padding: 18, overflow: "hidden" }}
              >
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: p.color }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3, flex: 1, minWidth: 0 }}>{p.name}</h3>
                </div>
                {p.description && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#6A6C75", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</div>
                )}
                <div style={{ marginTop: 14, display: "flex", gap: 14, fontSize: 12.5, color: "#5A5C65" }}>
                  <span>📋 과제 <b style={{ color: "#0C0F0D" }}>{c.tasks}</b></span>
                  <span>📁 문서 <b style={{ color: "#0C0F0D" }}>{c.files}</b></span>
                </div>
              </div>
            );
          })}

          {/* 미분류 업무 */}
          <div
            onClick={() => {
              setActive("none");
              setTab("tasks");
            }}
            className="lift"
            style={{ cursor: "pointer", background: "rgba(12,15,13,0.02)", border: "1.5px dashed rgba(12,15,13,0.16)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", justifyContent: "center" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#84908A", flexShrink: 0 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#5A5C65" }}>미분류 업무</h3>
            </div>
            <div style={{ marginTop: 8, fontSize: 12.5, color: "#84908A" }}>
              프로젝트에 속하지 않은 과제 · <b style={{ color: "#0C0F0D" }}>{unassigned}</b>개
            </div>
          </div>

          {projects.length === 0 && (
            <div style={{ gridColumn: "1 / -1", ...emptyBox }}>
              아직 프로젝트가 없습니다. <b>+ 새 프로젝트</b>로 첫 프로젝트를 만들어보세요.
            </div>
          )}
        </div>
      )}

      <ProjectEditorModal editor={editor} setEditor={setEditor} onSave={saveProject} />
    </div>
  );
}

function TabBtn({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        border: "none",
        borderBottom: `2.5px solid ${on ? "#0E7B4E" : "transparent"}`,
        background: "transparent",
        color: on ? "#0C0F0D" : "#84908A",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        marginBottom: -1.5,
      }}
    >
      {label}
    </button>
  );
}

function ProjectEditorModal({
  editor,
  setEditor,
  onSave,
}: {
  editor: Editor | null;
  setEditor: (e: Editor | null) => void;
  onSave: () => void;
}) {
  return (
    <Modal open={!!editor} onClose={() => setEditor(null)} width={480} padded={false}>
      {editor && (
        <div>
          <div style={{ padding: "20px 26px", borderBottom: "1px solid rgba(12,15,13,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 19, fontWeight: 700 }}>{editor.id == null ? "새 프로젝트" : "프로젝트 편집"}</h2>
            <span onClick={() => setEditor(null)} style={{ cursor: "pointer", fontSize: 22, color: "#84908A", lineHeight: 1 }}>×</span>
          </div>
          <div className="m-pad-lg" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 15 }}>
            <div>
              <label style={labelStyle}>프로젝트명</label>
              <input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="예: 중국 NMPA 인허가 2026" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>설명 <span style={{ color: "#84908A", fontWeight: 500 }}>(선택)</span></label>
              <textarea value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} placeholder="프로젝트 개요를 적어주세요." rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} />
            </div>
            <div>
              <label style={labelStyle}>색상</label>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLORS.map((c) => {
                  const on = editor.color === c;
                  return (
                    <span
                      key={c}
                      onClick={() => setEditor({ ...editor, color: c })}
                      style={{ width: 30, height: 30, borderRadius: 8, background: c, cursor: "pointer", border: on ? "3px solid #0C0F0D" : "3px solid transparent", boxShadow: on ? "0 0 0 1px #fff inset" : "none" }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ padding: "16px 26px", borderTop: "1px solid rgba(12,15,13,0.08)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setEditor(null)} className="gbtn" style={{ padding: "11px 20px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 9, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>취소</button>
            <button onClick={onSave} className="pbtn" style={{ padding: "11px 24px", border: "none", borderRadius: 9, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>저장</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const emptyBox: CSSProperties = {
  padding: "48px 16px",
  textAlign: "center",
  color: "#9AA29C",
  fontSize: 14,
  background: "#fff",
  border: "1px solid rgba(12,15,13,0.07)",
  borderRadius: 14,
};
