import {
  useEffect,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { priorityStyle, fieldStyle } from "@/lib/theme";
import { Modal, useToast } from "../ui";
import { taskPct, taskStatus, nextStageStatus } from "../data/taskUtils";
import { demoTasks, demoMembers } from "../data/demo";
import type {
  TaskFull,
  TaskStage,
  TaskComment,
  StageStatus,
  TaskStatus,
} from "@/types/database";

type Member = { name: string; dept: string; init: string | null; avatar_bg: string };

const TASK_FILTERS = ["전체", "IT", "계약", "영업", "인허가", "물류", "마케팅"];

const COLUMNS: { st: "todo" | "doing" | "review" | "done"; label: string; color: string }[] = [
  { st: "todo", label: "대기", color: "#84908A" },
  { st: "doing", label: "진행 중", color: "#2A6FDB" },
  { st: "review", label: "검토", color: "#C6803A" },
  { st: "done", label: "완료", color: "#0E7B4E" },
];

const ST_LABEL: Record<StageStatus, string> = { done: "완료", doing: "진행 중", todo: "대기" };
const ST_COL: Record<StageStatus, { bg: string; color: string }> = {
  done: { bg: "#E9F2EC", color: "#3E8E68" },
  doing: { bg: "#E0EDFB", color: "#2A6FDB" },
  todo: { bg: "#EEF1EE", color: "#6B7280" },
};

type Editor = {
  id: string | null;
  title: string;
  field: string;
  priority: string;
  due: string;
  assignee: string;
  country: string;
};

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

const inputStyle: CSSProperties = {
  marginTop: 6,
  width: "100%",
  padding: "11px 13px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
};
const selectStyle: CSSProperties = {
  marginTop: 6,
  width: "100%",
  padding: "11px 10px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
  background: "#fff",
};
const labelStyle: CSSProperties = { fontSize: 12.5, color: "#4A4C55", fontWeight: 600 };

export default function Tasks() {
  const toast = useToast();
  const { profile } = useAuth();
  // 댓글 작성자 = 로그인한 사용자 (데모 모드에서만 지경준)
  const meName = profile?.name ?? "지경준";
  const meInit = profile?.init ?? meName.charAt(0);
  const meBg = profile?.avatar_bg ?? "#0E7B4E";
  const [tasks, setTasks] = useState<TaskFull[]>(demoTasks);
  const [taskFilter, setTaskFilter] = useState("전체");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // 담당자 후보: 실제 가입·승인된 직원만 (미설정 시 데모 명단)
  const [members, setMembers] = useState<Member[]>(demoMembers as Member[]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("tasks")
      .select("*, stages:task_stages(*, comments:task_comments(*))")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTasks(data as unknown as TaskFull[]);
      });
    supabase
      .from("profiles")
      .select("name,dept,init,avatar_bg")
      .eq("status", "approved")
      .then(({ data }) => data && setMembers(data as Member[]));
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

  const sel = tasks.find((t) => t.id === selectedTaskId) || null;
  const filtered = tasks.filter((t) => taskFilter === "전체" || t.field === taskFilter);

  /* ---------------------------------------------------------- mutations */
  function cycleStage(taskId: string, idx: number) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const stage = task.stages[idx];
    const next = nextStageStatus(stage.status);
    setTasks((prev) =>
      prev.map((t) =>
        t.id !== taskId
          ? t
          : { ...t, stages: t.stages.map((s, i) => (i === idx ? { ...s, status: next } : s)) },
      ),
    );
    persist(() => supabase.from("task_stages").update({ status: next }).eq("id", stage.id));
  }

  // 칸반 상태(대기/진행중/검토/완료)를 담당자가 직접 지정
  function setTaskStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    persist(() => supabase.from("tasks").update({ status }).eq("id", taskId));
  }

  /* ------------------------------------------------------- 단계(스텝) 편집 */
  async function addStage(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const sort = task.stages.length;
    const name = "새 단계 " + (sort + 1);
    let stage: TaskStage & { comments: TaskComment[] } = {
      id: genId(),
      task_id: taskId,
      name,
      status: "todo" as StageStatus,
      sort,
      comments: [],
    };
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from("task_stages")
          .insert({ task_id: taskId, name, status: "todo", sort })
          .select()
          .single();
        if (data) stage = { ...(data as TaskStage), comments: [] };
      } catch {
        /* ignore */
      }
    }
    setTasks((prev) =>
      prev.map((t) => (t.id !== taskId ? t : { ...t, stages: [...t.stages, stage] })),
    );
  }

  function removeStage(taskId: string, idx: number) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.stages.length <= 1) {
      toast("단계는 최소 1개가 필요합니다");
      return;
    }
    const stage = task.stages[idx];
    if (!window.confirm(`'${stage.name}' 단계를 삭제할까요? 이 단계의 코멘트도 함께 삭제됩니다.`))
      return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id !== taskId ? t : { ...t, stages: t.stages.filter((_, i) => i !== idx) },
      ),
    );
    persist(() => supabase.from("task_stages").delete().eq("id", stage.id));
  }

  // 이름 편집: 입력 중에는 로컬만, 포커스 아웃 시 저장
  function renameStage(taskId: string, idx: number, name: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id !== taskId
          ? t
          : { ...t, stages: t.stages.map((s, i) => (i === idx ? { ...s, name } : s)) },
      ),
    );
  }
  function commitStage(taskId: string, idx: number) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const stage = task.stages[idx];
    persist(() =>
      supabase.from("task_stages").update({ name: stage.name }).eq("id", stage.id),
    );
  }

  async function addComment(taskId: string, idx: number) {
    const key = taskId + ":" + idx;
    const text = (drafts[key] || "").trim();
    if (!text) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const stage = task.stages[idx];
    let comment: TaskComment = {
      id: genId(),
      stage_id: stage.id,
      author: meName,
      init: meInit,
      avatar_bg: meBg,
      body: text,
      created_at: "방금",
    };
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from("task_comments")
          .insert({ stage_id: stage.id, author: meName, init: meInit, avatar_bg: meBg, body: text })
          .select()
          .single();
        if (data) comment = data as TaskComment;
      } catch {
        /* ignore */
      }
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              stages: t.stages.map((s, i) =>
                i === idx ? { ...s, comments: [...s.comments, comment] } : s,
              ),
            },
      ),
    );
    setDrafts((d) => ({ ...d, [key]: "" }));
  }

  function newTask() {
    setEditor({
      id: null,
      title: "",
      field: "IT",
      priority: "보통",
      due: "2026-08-01",
      assignee: members[0]?.name || "",
      country: "",
    });
  }

  function editTask() {
    if (!sel) return;
    setEditor({
      id: sel.id,
      title: sel.title,
      field: sel.field,
      priority: sel.priority,
      due: sel.due || "",
      assignee: sel.assignee,
      country: sel.country,
    });
    setSelectedTaskId(null);
  }

  function deleteTask() {
    if (!sel) return;
    const id = sel.id;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTaskId(null);
    toast("과제를 삭제했습니다");
    persist(() => supabase.from("tasks").delete().eq("id", id));
  }

  async function saveTask() {
    const te = editor;
    if (!te) return;
    if (!te.title.trim()) {
      toast("과제명을 입력하세요");
      return;
    }
    if (te.id != null) {
      const patch = {
        title: te.title,
        field: te.field,
        priority: te.priority as TaskFull["priority"],
        due: te.due,
        assignee: te.assignee,
        country: te.country,
      };
      setTasks((prev) => prev.map((t) => (t.id === te.id ? { ...t, ...patch } : t)));
      setEditor(null);
      toast("과제를 수정했습니다");
      persist(() => supabase.from("tasks").update(patch).eq("id", te.id as string));
      return;
    }
    const country = te.country || te.field;
    const stageNames = ["준비", "진행", "완료"];
    if (isSupabaseConfigured) {
      try {
        const { data: t } = await supabase
          .from("tasks")
          .insert({
            title: te.title,
            country,
            field: te.field,
            assignee: te.assignee,
            priority: te.priority,
            due: te.due,
          })
          .select()
          .single();
        if (t) {
          const { data: st } = await supabase
            .from("task_stages")
            .insert(stageNames.map((name, i) => ({ task_id: t.id, name, status: "todo", sort: i })))
            .select();
          const stages = ((st as TaskStage[]) || []).map((s) => ({ ...s, comments: [] }));
          setTasks((prev) => [{ ...(t as TaskFull), stages }, ...prev]);
        }
        setEditor(null);
        toast("새 과제를 등록했습니다");
        return;
      } catch {
        /* fall through to local */
      }
    }
    const tid = genId();
    const nt: TaskFull = {
      id: tid,
      title: te.title,
      country,
      field: te.field,
      assignee: te.assignee,
      priority: te.priority as TaskFull["priority"],
      due: te.due,
      status: "todo",
      created_at: "",
      stages: stageNames.map((name, i) => ({
        id: genId(),
        task_id: tid,
        name,
        status: "todo" as StageStatus,
        sort: i,
        comments: [],
      })),
    };
    setTasks((prev) => [nt, ...prev]);
    setEditor(null);
    toast("새 과제를 등록했습니다");
  }

  /* ---------------------------------------------------------- render */
  return (
    <div className="fade" style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div
        className="g-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {TASK_FILTERS.map((f) => {
            const on = taskFilter === f;
            return (
              <button
                key={f}
                onClick={() => setTaskFilter(f)}
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
                {f}
              </button>
            );
          })}
        </div>
        <button
          className="pbtn"
          onClick={newTask}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: 10,
            background: "#0C0F0D",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 새 과제
        </button>
      </div>

      <div
        className="g-kanban"
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, alignItems: "start" }}
      >
        {COLUMNS.map((col) => {
          const items = filtered.filter((t) => taskStatus(t) === col.st);
          return (
            <div
              key={col.st}
              style={{
                background: "rgba(12,15,13,0.03)",
                border: "1px solid rgba(12,15,13,0.06)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 4px" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: col.color }} />
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{col.label}</span>
                <span className="mono" style={{ fontSize: 12, color: "#84908A" }}>
                  {items.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((t) => {
                  const p = priorityStyle(t.priority);
                  const fs = fieldStyle(t.field);
                  const commentCount = t.stages.reduce((a, s) => a + s.comments.length, 0);
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="lift"
                      style={{
                        background: "#fff",
                        border: "1px solid rgba(12,15,13,0.08)",
                        borderRadius: 12,
                        padding: 14,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: fs.bg, color: fs.color }}>
                            {t.field}
                          </span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: p.bg, color: p.color }}>
                            {t.priority}
                          </span>
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: "#84908A" }}>
                          {t.country}
                        </span>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{t.title}</div>
                      <div style={{ marginTop: 12, height: 6, borderRadius: 20, background: "rgba(12,15,13,0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: taskPct(t), background: "linear-gradient(90deg,#0E7B4E,#46D08A)" }} />
                      </div>
                      <div style={{ marginTop: 11, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5A5C65" }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#0E7B4E,#46D08A)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                            {t.assignee.charAt(0)}
                          </span>
                          {t.assignee}
                        </span>
                        <span style={{ fontSize: 11.5, color: "#84908A" }}>💬 {commentCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============ TASK DETAIL MODAL ============ */}
      <Modal open={!!sel} onClose={() => setSelectedTaskId(null)} width={640} padded={false}>
        {sel && <TaskDetail
          task={sel}
          drafts={drafts}
          setDrafts={setDrafts}
          onClose={() => setSelectedTaskId(null)}
          onEdit={editTask}
          onDelete={deleteTask}
          onStatus={(st) => setTaskStatus(sel.id, st)}
          onToggle={(idx) => cycleStage(sel.id, idx)}
          onSend={(idx) => addComment(sel.id, idx)}
          onAddStage={() => addStage(sel.id)}
          onRemoveStage={(idx) => removeStage(sel.id, idx)}
          onRenameStage={(idx, name) => renameStage(sel.id, idx, name)}
          onCommitStage={(idx) => commitStage(sel.id, idx)}
        />}
      </Modal>

      {/* ============ TASK EDITOR MODAL ============ */}
      <Modal open={!!editor} onClose={() => setEditor(null)} width={540} padded={false}>
        {editor && (
          <div>
            <div style={{ padding: "20px 26px", borderBottom: "1px solid rgba(12,15,13,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {editor.id == null ? "새 과제 등록" : "과제 편집"}
              </h2>
              <span onClick={() => setEditor(null)} style={{ cursor: "pointer", fontSize: 22, color: "#84908A", lineHeight: 1 }}>
                ×
              </span>
            </div>
            <div className="m-pad-lg" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 15 }}>
              <div>
                <label style={labelStyle}>과제명</label>
                <input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="예: 중국 첨단 의료기기 NMPA 인허가"
                  style={inputStyle}
                />
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>분야</label>
                  <select value={editor.field} onChange={(e) => setEditor({ ...editor, field: e.target.value })} style={selectStyle}>
                    {["IT", "계약", "영업", "인허가", "물류", "마케팅"].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>우선순위</label>
                  <select value={editor.priority} onChange={(e) => setEditor({ ...editor, priority: e.target.value })} style={selectStyle}>
                    {["긴급", "높음", "보통"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>국가 · 분류</label>
                  <input
                    value={editor.country}
                    onChange={(e) => setEditor({ ...editor, country: e.target.value })}
                    placeholder="예: CN · 의료기기"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>마감일</label>
                  <input
                    type="date"
                    value={editor.due}
                    onChange={(e) => setEditor({ ...editor, due: e.target.value })}
                    placeholder="2026-08-01"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>
                  주요 담당자 <span style={{ color: "#84908A", fontWeight: 500 }}>(등록 직원 중 선택)</span>
                </label>
                <select value={editor.assignee} onChange={(e) => setEditor({ ...editor, assignee: e.target.value })} style={selectStyle}>
                  {members.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} · {m.dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ padding: "16px 26px", borderTop: "1px solid rgba(12,15,13,0.08)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setEditor(null)}
                className="gbtn"
                style={{ padding: "11px 20px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 9, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={saveTask}
                className="pbtn"
                style={{ padding: "11px 24px", border: "none", borderRadius: 9, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                저장
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------- detail modal body */
function TaskDetail({
  task,
  drafts,
  setDrafts,
  onClose,
  onEdit,
  onDelete,
  onStatus,
  onToggle,
  onSend,
  onAddStage,
  onRemoveStage,
  onRenameStage,
  onCommitStage,
}: {
  task: TaskFull;
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (st: TaskStatus) => void;
  onToggle: (idx: number) => void;
  onSend: (idx: number) => void;
  onAddStage: () => void;
  onRemoveStage: (idx: number) => void;
  onRenameStage: (idx: number, name: string) => void;
  onCommitStage: (idx: number) => void;
}) {
  const p = priorityStyle(task.priority);
  const fs = fieldStyle(task.field);
  const cur = taskStatus(task);
  return (
    <div>
      <div className="m-pad-md" style={{ position: "sticky", top: 0, background: "#fff", padding: "24px 30px 18px", borderBottom: "1px solid rgba(12,15,13,0.08)", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: fs.bg, color: fs.color }}>{task.field}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: p.bg, color: p.color }}>{task.priority}</span>
              <span className="mono" style={{ fontSize: 12, color: "#84908A" }}>{task.country}</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{task.title}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button onClick={onEdit} className="gbtn" style={{ padding: "7px 13px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 8, background: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              ✎ 편집
            </button>
            <button onClick={onDelete} className="gbtn" style={{ padding: "7px 13px", border: "1px solid rgba(196,85,62,0.3)", borderRadius: 8, background: "#fff", color: "#C4553E", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              🗑 삭제
            </button>
            <span onClick={onClose} style={{ cursor: "pointer", fontSize: 24, color: "#84908A", lineHeight: 1, marginLeft: 4 }}>
              ×
            </span>
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 26, flexWrap: "wrap", fontSize: 13 }}>
          <div>
            <span style={{ color: "#84908A" }}>담당자</span> <b style={{ marginLeft: 6 }}>{task.assignee}</b>
          </div>
          <div>
            <span style={{ color: "#84908A" }}>마감</span> <b style={{ marginLeft: 6 }}>{task.due}</b>
          </div>
          <div>
            <span style={{ color: "#84908A" }}>진행률</span> <b style={{ marginLeft: 6, color: "#0E7B4E" }}>{taskPct(task)}</b>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "#84908A", fontWeight: 600, marginBottom: 8 }}>상태 변경</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {COLUMNS.map((col) => {
              const on = cur === col.st;
              return (
                <button
                  key={col.st}
                  onClick={() => onStatus(col.st)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `1.5px solid ${on ? col.color : "rgba(12,15,13,0.14)"}`,
                    background: on ? col.color : "#fff",
                    color: on ? "#fff" : "#5A5C65",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "#fff" : col.color }} />
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="m-pad-lg" style={{ padding: "24px 30px 40px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#84908A", letterSpacing: "0.02em", marginBottom: 16 }}>단계별 진행 · 코멘트</h3>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {task.stages.map((s, idx) => {
            const done = s.status === "done";
            const doing = s.status === "doing";
            const c = ST_COL[s.status];
            const key = task.id + ":" + idx;
            const dotStyle: CSSProperties = done
              ? { background: "#0E7B4E", color: "#fff" }
              : doing
                ? { background: "#fff", color: "#2A6FDB", border: "2px solid #2A6FDB" }
                : { background: "#fff", color: "#84908A", border: "2px solid rgba(12,15,13,0.16)" };
            return (
              <div key={s.id} style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    onClick={() => onToggle(idx)}
                    style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, ...dotStyle }}
                  >
                    {done ? "✓" : idx + 1}
                  </div>
                  {idx < task.stages.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 24, background: done ? "#0E7B4E" : "rgba(12,15,13,0.12)" }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      value={s.name}
                      onChange={(e) => onRenameStage(idx, e.target.value)}
                      onBlur={() => onCommitStage(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      title="단계 이름 (클릭하여 수정)"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: done || doing ? "#0C0F0D" : "#84908A",
                        border: "1px solid transparent",
                        borderRadius: 7,
                        padding: "4px 8px",
                        marginLeft: -8,
                        background: "transparent",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid rgba(12,15,13,0.14)";
                        e.target.style.background = "#fff";
                      }}
                      onBlurCapture={(e) => {
                        e.target.style.border = "1px solid transparent";
                        e.target.style.background = "transparent";
                      }}
                    />
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: c.bg, color: c.color, flexShrink: 0 }}>{ST_LABEL[s.status]}</span>
                    <button
                      onClick={() => onRemoveStage(idx)}
                      title="단계 삭제"
                      style={{
                        flexShrink: 0,
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        border: "1px solid rgba(196,85,62,0.28)",
                        background: "#fff",
                        color: "#C4553E",
                        fontSize: 14,
                        lineHeight: 1,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                  {s.comments.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {s.comments.map((cm: TaskComment) => (
                        <div key={cm.id} style={{ display: "flex", gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: cm.avatar_bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                            {cm.init}
                          </div>
                          <div style={{ flex: 1, background: "#F4F7F5", borderRadius: 12, borderTopLeftRadius: 3, padding: "10px 13px" }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{cm.author}</span>
                              <span style={{ fontSize: 11, color: "#9AA29C" }}>{cm.created_at}</span>
                            </div>
                            <div style={{ marginTop: 3, fontSize: 13, lineHeight: 1.5, color: "#3A3C45" }}>{cm.body}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <input
                      value={drafts[key] || ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onSend(idx);
                        }
                      }}
                      placeholder="코멘트 남기기…"
                      style={{ flex: 1, padding: "9px 13px", border: "1.5px solid rgba(12,15,13,0.12)", borderRadius: 20, fontSize: 13 }}
                    />
                    <button
                      onClick={() => onSend(idx)}
                      className="pbtn"
                      style={{ padding: "0 16px", border: "none", borderRadius: 20, background: "#0E7B4E", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      등록
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={onAddStage}
          className="gbtn"
          style={{
            marginTop: 4,
            marginLeft: 46,
            padding: "9px 16px",
            border: "1.5px dashed rgba(14,123,78,0.4)",
            borderRadius: 10,
            background: "rgba(14,123,78,0.04)",
            color: "#0E7B4E",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 단계 추가
        </button>
      </div>
    </div>
  );
}
