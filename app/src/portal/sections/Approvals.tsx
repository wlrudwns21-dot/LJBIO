import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { isMaster, DEFAULT_CEO } from "@/lib/access";
import { storeUpload, downloadAttachment } from "@/lib/storage";
import { useToast } from "../ui";
import { demoApprovals, demoSegments, demoMe, demoMembers } from "../data/demo";
import type { Approval, Segment, ApprovalStep, Attachment } from "@/types/database";

/** 결재선 후보/대표자로 쓰는 직원 최소 형태 */
type Approver = {
  name: string;
  email: string;
  init: string | null;
  avatar_bg: string;
  dept?: string;
  role?: string;
  can_approve?: boolean;
  is_ceo?: boolean;
};

const TODAY_STR = "2026-07-11";
const stepFrom = (m: Approver, isCeo = false): ApprovalStep => ({
  name: m.name,
  email: m.email,
  init: m.init,
  avatar_bg: m.avatar_bg,
  role_label: m.dept || "",
  is_ceo: isCeo,
  status: "pending",
  acted_at: null,
});
const sameUser = (s: { email?: string; name?: string }, me: { email?: string; name?: string }) =>
  (!!s.email && !!me.email && s.email.toLowerCase() === me.email.toLowerCase()) ||
  (!!s.name && s.name === me.name);
const currentStepIdx = (a: Approval) =>
  (a.approval_line || []).findIndex((s) => s.status === "pending");

/* ------------------------------------------------------------------ meta */
const apTypeMeta: Record<
  string,
  { icon: string; bg: string; color: string; label: string }
> = {
  지출: { icon: "💰", bg: "#FDE8E8", color: "#D14343", label: "지출결의" },
  구매: { icon: "🛒", bg: "#FFF1E0", color: "#C6803A", label: "구매발주" },
  계약: { icon: "✍", bg: "#EDE7FB", color: "#6B45C9", label: "계약검토" },
  수출서류: { icon: "📤", bg: "#E9F2EC", color: "#3E8E68", label: "수출서류" },
  일반: { icon: "📄", bg: "#E0EDFB", color: "#2A6FDB", label: "일반품의" },
};

const stMeta: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "승인 대기", bg: "#FFF4E0", color: "#C6803A" },
  approved: { label: "승인 완료", bg: "#E9F2EC", color: "#3E8E68" },
  rejected: { label: "반려", bg: "#FDE8E8", color: "#D14343" },
};

const TODAY = new Date("2026-07-11");
const dday = (due: string | null) =>
  Math.round((new Date(due || "2026-07-11").getTime() - TODAY.getTime()) / 86400000);

const selStyle: CSSProperties = {
  marginTop: 6,
  width: "100%",
  padding: "11px 10px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
  background: "#fff",
};
const inStyle: CSSProperties = {
  marginTop: 6,
  width: "100%",
  padding: "11px 13px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
};
const lblStyle: CSSProperties = {
  fontSize: 12.5,
  color: "#4A4C55",
  fontWeight: 600,
};

type Editor = {
  id: string | null;
  type: string;
  title: string;
  segId: string;
  amount: string;
  due: string;
  content: string;
  line: string[]; // 결재선(선택한 승인자 이메일, 순서대로) — 대표자는 자동으로 맨 끝
  attachments: Attachment[];
};

export default function Approvals() {
  const { profile } = useAuth();
  const me = (profile ?? demoMe) as Approver & { role?: string };
  const meIsAdmin = me.role === "admin";
  const meIsMaster = isMaster(me);
  const flash = useToast();

  const [approvals, setApprovals] = useState<Approval[]>(demoApprovals);
  const [segments, setSegments] = useState<Segment[]>(demoSegments);
  const [members, setMembers] = useState<Approver[]>(demoMembers as Approver[]);
  const [filter, setFilter] = useState<string>("전체");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [sealImg] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ljbio_seal");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: a } = await supabase
        .from("approvals")
        .select("*")
        .order("created_at", { ascending: false });
      if (a) setApprovals(a as Approval[]);
      const { data: sg } = await supabase
        .from("segments")
        .select("*")
        .order("sort", { ascending: true });
      if (sg) setSegments(sg as Segment[]);
      const { data: mm } = await supabase
        .from("profiles")
        .select("name,email,init,avatar_bg,dept,role,can_approve,is_ceo")
        .eq("status", "approved")
        .order("created_at", { ascending: true });
      if (mm) setMembers(mm as Approver[]);
    })().catch(() => {});
  }, []);

  const ceo: Approver = members.find((m) => m.is_ceo) || (DEFAULT_CEO as Approver);
  // 결재선 후보: 결제 권한이 있는 직원 (대표자는 자동으로 맨 끝에 붙으므로 제외)
  const approvers = members.filter((m) => m.can_approve && !m.is_ceo);

  async function persist(fn: () => PromiseLike<unknown>) {
    if (isSupabaseConfigured) { try { await fn(); } catch { /* ignore */ } }
  }

  const segName = (id: string | null) =>
    segments.find((s) => s.id === id)?.name || "미분류";
  const segColor = (id: string | null) =>
    segments.find((s) => s.id === id)?.color || "#84908A";

  // 열람: 마스터(지경준)는 전체 · 그 외에는 상신자 본인 또는 결재선에 포함된 승인자만
  const canSee = (a: Approval) =>
    meIsMaster ||
    a.drafter === me.name ||
    (a.approval_line || []).some((s) => sameUser(s, me));

  const visible = useMemo(
    () => approvals.filter(canSee),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvals, meIsMaster, me.name, me.email],
  );
  const filtered = visible.filter(
    (a) => filter === "전체" || a.status === filter,
  );

  const filters: [string, string][] = [
    ["전체", "전체"],
    ["pending", "대기"],
    ["approved", "승인"],
    ["rejected", "반려"],
  ];

  /* ------------------------------------------------------------- actions */
  function newApproval() {
    setEditor({
      id: null,
      type: "지출",
      title: "",
      segId: segments[0]?.id || "wholesale",
      amount: "",
      due: "2026-07-20",
      content: "",
      line: [],
      attachments: [],
    });
  }

  function toggleLine(email: string) {
    setEditor((ed) => {
      if (!ed) return ed;
      const has = ed.line.includes(email);
      return { ...ed, line: has ? ed.line.filter((e) => e !== email) : [...ed.line, email] };
    });
  }

  async function onEditorFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    const added = await Promise.all(picked.map((f) => storeUpload(f, "approvals")));
    setEditor((ed) => (ed ? { ...ed, attachments: [...ed.attachments, ...added] } : ed));
  }

  /** 결재선 구성: 선택한 승인자(순서대로) + 대표자(항상 맨 끝 최종 승인) */
  function buildLine(emails: string[]): ApprovalStep[] {
    const picked = emails
      .map((em) => approvers.find((m) => m.email === em))
      .filter(Boolean)
      .map((m) => stepFrom(m as Approver));
    return [...picked, stepFrom(ceo, true)];
  }

  function saveApproval() {
    if (!editor) return;
    if (!(editor.title || "").trim()) {
      flash("제목을 입력하세요");
      return;
    }
    if (editor.id != null) {
      const id = editor.id;
      const patch = {
        type: editor.type,
        title: editor.title,
        seg_id: editor.segId,
        amount: editor.amount,
        due: editor.due,
        content: editor.content,
        attachments: editor.attachments,
        approval_line: buildLine(editor.line),
      };
      setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      persist(() => supabase.from("approvals").update(patch).eq("id", id));
      setEditor(null);
      flash("결재 문서를 수정했습니다");
    } else {
      const nseq = approvals.reduce((m, x) => Math.max(m, x.seq), 0) + 1;
      const na: Approval = {
        id: String(Date.now()),
        seq: nseq,
        type: editor.type,
        title: editor.title,
        seg_id: editor.segId,
        drafter: me.name,
        drafter_id: null,
        d_init: (me as { init?: string | null }).init || "지",
        d_bg: (me as { avatar_bg?: string }).avatar_bg || "#0E7B4E",
        amount: editor.amount || "—",
        due: editor.due,
        content: editor.content,
        status: "pending",
        approver: null,
        approved_at: null,
        attachments: editor.attachments,
        approval_line: buildLine(editor.line),
        created_at: TODAY_STR,
      };
      setApprovals((prev) => [na, ...prev]);
      persist(async () => {
        const { seq, type, title, seg_id, drafter, d_init, d_bg, amount, due, content, status, attachments, approval_line } = na;
        const { data } = await supabase
          .from("approvals")
          .insert({ seq, type, title, seg_id, drafter, d_init, d_bg, amount, due, content, status, attachments, approval_line })
          .select()
          .single();
        if (data)
          setApprovals((prev) =>
            prev.map((a) => (a.id === na.id ? (data as Approval) : a)),
          );
      });
      setEditor(null);
      flash("결재를 상신했습니다");
    }
  }

  /** 현재 단계 승인/반려 — 마지막(대표자) 승인 시 문서가 최종 승인 처리됩니다. */
  function decide(a: Approval, action: "approved" | "rejected", comment = "") {
    const line = [...(a.approval_line || [])];
    const idx = currentStepIdx(a);
    if (idx < 0) return;
    line[idx] = {
      ...line[idx],
      status: action,
      acted_at: TODAY_STR,
      comment: comment.trim() || null,
    };
    const isLast = idx === line.length - 1;
    let status: Approval["status"] = a.status;
    let approver = a.approver;
    let approved_at = a.approved_at;
    if (action === "rejected") {
      status = "rejected";
      approver = me.name;
      approved_at = TODAY_STR;
    } else if (isLast) {
      status = "approved";
      approver = ceo.name;
      approved_at = TODAY_STR;
    }
    const patch = { approval_line: line, status, approver, approved_at };
    setApprovals((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...patch } : x)));
    persist(() => supabase.from("approvals").update(patch).eq("id", a.id));
    flash(
      action === "rejected"
        ? "결재를 반려했습니다"
        : isLast
          ? "최종 승인 및 날인이 완료되었습니다"
          : line[idx].name + " 단계 승인 완료 — 다음 결재자에게 넘어갑니다",
    );
  }

  const sel = approvals.find((a) => a.id === selId) || null;

  /* ------------------------------------------------------------- render */
  return (
    <div className="fade" style={{ maxWidth: 1160, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(14,123,78,0.06)",
          border: "1px solid rgba(14,123,78,0.2)",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 16 }}>🔒</span>
        <span
          style={{
            fontSize: 13,
            color: "#2F6349",
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          결재 문서는 <b>상신자 본인</b>, <b>결재선 승인자</b>, <b>총괄 관리자</b>만
          열람할 수 있습니다. 결재선 순서대로 승인되며, <b>대표자 최종 승인</b> 시
          회사 직인이 자동 날인됩니다.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {filters.map(([k, label]) => {
            const on = filter === k;
            return (
              <span
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
              </span>
            );
          })}
        </div>
        <button
          className="pbtn"
          onClick={newApproval}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 결재 상신
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((a) => {
          const tm = apTypeMeta[a.type] || apTypeMeta["일반"];
          const st = stMeta[a.status];
          const dd = dday(a.due);
          let due: { label: string; color: string; bg: string };
          if (a.status === "pending") {
            if (dd < 0)
              due = { label: "기한 초과 " + -dd + "일", color: "#D14343", bg: "#FDE8E8" };
            else if (dd === 0)
              due = { label: "오늘 마감", color: "#D14343", bg: "#FDE8E8" };
            else if (dd <= 2)
              due = { label: "D-" + dd + " 임박", color: "#C6803A", bg: "#FFF1E0" };
            else due = { label: "D-" + dd, color: "#6B7280", bg: "#EEF1EE" };
          } else {
            due = {
              label: a.approved_at || a.due || "",
              color: "#84908A",
              bg: "#EEF1EE",
            };
          }
          const sc = segColor(a.seg_id);
          return (
            <div
              key={a.id}
              onClick={() => setSelId(a.id)}
              className="lift"
              style={{
                background: "#fff",
                border: "1px solid rgba(12,15,13,0.08)",
                borderRadius: 16,
                padding: "18px 20px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 11,
                    flexShrink: 0,
                    background: tm.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 19,
                  }}
                >
                  {tm.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      flexWrap: "wrap",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 20,
                        background: tm.bg,
                        color: tm.color,
                      }}
                    >
                      {tm.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 9px",
                        borderRadius: 20,
                        background: sc + "1F",
                        color: sc,
                      }}
                    >
                      {segName(a.seg_id)}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>
                    {a.title}
                  </div>
                  <div
                    style={{
                      marginTop: 9,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      fontSize: 12.5,
                      color: "#84908A",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: a.d_bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {a.d_init}
                      </span>
                      {a.drafter}
                    </span>
                    <span>상신 {a.created_at}</span>
                    <span
                      className="mono"
                      style={{ color: "#0C0F0D", fontWeight: 600 }}
                    >
                      {a.amount}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "4px 11px",
                      borderRadius: 20,
                      background: st.bg,
                      color: st.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {st.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 6,
                      background: due.bg,
                      color: due.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {due.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              padding: 50,
              textAlign: "center",
              color: "#84908A",
              fontSize: 14,
              background: "#fff",
              border: "1px solid rgba(12,15,13,0.07)",
              borderRadius: 16,
            }}
          >
            해당 상태의 결재 문서가 없습니다.
          </div>
        )}
      </div>

      {/* ============ APPROVAL EDITOR MODAL ============ */}
      {editor && (
        <div
          className="modalwrap"
          onClick={() => setEditor(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 210,
            background: "rgba(6,10,8,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px 18px",
            overflowY: "auto",
          }}
        >
          <div
            className="modalbox"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 580,
              maxWidth: "100%",
              margin: "auto 0",
              background: "#fff",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 26px",
                borderBottom: "1px solid rgba(12,15,13,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                {editor.id == null ? "새 결재 상신" : "결재 문서 편집"}
              </h2>
              <span
                onClick={() => setEditor(null)}
                style={{
                  cursor: "pointer",
                  fontSize: 22,
                  color: "#84908A",
                  lineHeight: 1,
                }}
              >
                ×
              </span>
            </div>
            <div
              className="m-pad-lg"
              style={{
                padding: "24px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 15,
              }}
            >
              <div
                className="g-form2"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={lblStyle}>문서 종류</label>
                  <select
                    className="fld"
                    value={editor.type}
                    onChange={(e) =>
                      setEditor({ ...editor, type: e.target.value })
                    }
                    style={selStyle}
                  >
                    <option value="지출">지출/비용 결의서</option>
                    <option value="구매">구매 발주 요청</option>
                    <option value="계약">계약 검토/체결 요청</option>
                    <option value="수출서류">수출 서류 승인 (PL/CI 등)</option>
                    <option value="일반">일반 품의서</option>
                  </select>
                </div>
                <div>
                  <label style={lblStyle}>사업 부문</label>
                  <select
                    className="fld"
                    value={editor.segId}
                    onChange={(e) =>
                      setEditor({ ...editor, segId: e.target.value })
                    }
                    style={selStyle}
                  >
                    {segments.map((sg) => (
                      <option key={sg.id} value={sg.id}>
                        {sg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={lblStyle}>제목</label>
                <input
                  className="fld"
                  value={editor.title}
                  onChange={(e) =>
                    setEditor({ ...editor, title: e.target.value })
                  }
                  placeholder="예: 상하이 보세창고 임대료 지출 결의"
                  style={inStyle}
                />
              </div>
              <div
                className="g-form2"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={lblStyle}>
                    금액{" "}
                    <span style={{ color: "#84908A", fontWeight: 500 }}>
                      (선택)
                    </span>
                  </label>
                  <input
                    className="fld"
                    value={editor.amount}
                    onChange={(e) =>
                      setEditor({ ...editor, amount: e.target.value })
                    }
                    placeholder="₩ 0 / USD 0"
                    style={inStyle}
                  />
                </div>
                <div>
                  <label style={lblStyle}>처리 기한</label>
                  <input
                    className="fld"
                    type="date"
                    value={editor.due}
                    onChange={(e) =>
                      setEditor({ ...editor, due: e.target.value })
                    }
                    placeholder="2026-07-20"
                    style={inStyle}
                  />
                </div>
              </div>
              <div>
                <label style={lblStyle}>내용</label>
                <textarea
                  className="fld"
                  value={editor.content}
                  onChange={(e) =>
                    setEditor({ ...editor, content: e.target.value })
                  }
                  placeholder="결재 요청 사유 및 상세 내용을 입력하세요"
                  style={{
                    ...inStyle,
                    lineHeight: 1.6,
                    minHeight: 110,
                    resize: "vertical",
                    display: "block",
                  }}
                />
              </div>

              {/* 결재선 — 결제 권한 직원 중 순서대로 선택 (대표자는 자동으로 맨 끝) */}
              <div>
                <label style={lblStyle}>
                  결재선{" "}
                  <span style={{ color: "#84908A", fontWeight: 500 }}>
                    (결제 권한 직원 중 선택 · 대표자 최종 승인 자동 추가)
                  </span>
                </label>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {approvers.length === 0 && (
                    <span style={{ fontSize: 12.5, color: "#9AA29C" }}>
                      결제 권한이 지정된 직원이 없습니다. (관리자 → 계정관리에서 지정)
                    </span>
                  )}
                  {approvers.map((m) => {
                    const on = editor.line.includes(m.email);
                    const order = editor.line.indexOf(m.email) + 1;
                    return (
                      <button
                        key={m.email}
                        type="button"
                        onClick={() => toggleLine(m.email)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 13px",
                          borderRadius: 20,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: `1.5px solid ${on ? "#0E7B4E" : "rgba(12,15,13,0.14)"}`,
                          background: on ? "#0E7B4E" : "#fff",
                          color: on ? "#fff" : "#4A4C55",
                        }}
                      >
                        {on && (
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.25)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {order}
                          </span>
                        )}
                        {m.name}
                        <span style={{ opacity: 0.7, fontWeight: 500 }}>· {m.dept}</span>
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "#3E8E68",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <b>결재 순서:</b> 상신({me.name})
                  {editor.line.map((em) => {
                    const m = approvers.find((x) => x.email === em);
                    return <span key={em}>→ {m?.name || em}</span>;
                  })}
                  <span>→ 대표자({ceo.name}) 최종</span>
                </div>
              </div>

              {/* 첨부 문서 */}
              <div>
                <label
                  style={{
                    ...lblStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  첨부 문서
                  <label
                    className="gbtn"
                    style={{
                      fontSize: 12,
                      color: "#0E7B4E",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid rgba(14,123,78,0.4)",
                      borderRadius: 8,
                      padding: "5px 11px",
                    }}
                  >
                    + 파일 추가
                    <input
                      type="file"
                      multiple
                      onChange={onEditorFiles}
                      style={{ display: "none" }}
                    />
                  </label>
                </label>
                {editor.attachments.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
                    {editor.attachments.map((att, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          background: "#F7F9F7",
                          borderRadius: 8,
                          padding: "7px 11px",
                          fontSize: 12.5,
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>📎</span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontWeight: 600,
                            color: "#3A3C45",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {att.name}
                        </span>
                        <span
                          onClick={() =>
                            setEditor((ed) =>
                              ed
                                ? { ...ed, attachments: ed.attachments.filter((_, j) => j !== i) }
                                : ed,
                            )
                          }
                          style={{ cursor: "pointer", color: "#C4553E", fontWeight: 700 }}
                        >
                          ×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#84908A",
                  background: "#FAFBFA",
                  borderRadius: 9,
                  padding: "11px 14px",
                  lineHeight: 1.6,
                }}
              >
                상신자 <b style={{ color: "#0C0F0D" }}>{me.name}</b> · 최종 승인{" "}
                <b style={{ color: "#0C0F0D" }}>대표자 {ceo.name}</b> · 상신자
                본인과 결재선에 포함된 승인자만 열람할 수 있습니다.
              </div>
            </div>
            <div
              style={{
                padding: "16px 26px",
                borderTop: "1px solid rgba(12,15,13,0.08)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
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
                onClick={saveApproval}
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
                상신하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ APPROVAL DETAIL MODAL ============ */}
      {sel && (
        <ApprovalDetail
          a={sel}
          me={me}
          meIsMaster={meIsMaster}
          ceoName={ceo.name}
          sealImg={sealImg}
          segName={segName}
          segColor={segColor}
          onClose={() => setSelId(null)}
          onEdit={() => {
            setEditor({
              id: sel.id,
              type: sel.type,
              title: sel.title,
              segId: sel.seg_id || "",
              amount: sel.amount,
              due: sel.due || "",
              content: sel.content,
              line: (sel.approval_line || [])
                .filter((s) => !s.is_ceo)
                .map((s) => s.email),
              attachments: sel.attachments || [],
            });
            setSelId(null);
          }}
          onApprove={(c) => decide(sel, "approved", c)}
          onReject={(c) => decide(sel, "rejected", c)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- detail modal */
function ApprovalDetail({
  a,
  me,
  meIsMaster,
  ceoName,
  sealImg,
  segName,
  segColor,
  onClose,
  onEdit,
  onApprove,
  onReject,
}: {
  a: Approval;
  me: { name?: string; email?: string };
  meIsMaster: boolean;
  ceoName: string;
  sealImg: string | null;
  segName: (id: string | null) => string;
  segColor: (id: string | null) => string;
  onClose: () => void;
  onEdit: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
}) {
  const [opinion, setOpinion] = useState("");
  const tm = apTypeMeta[a.type] || apTypeMeta["일반"];
  const isApproved = a.status === "approved";
  const isRejected = a.status === "rejected";
  const isPending = a.status === "pending";
  const statusLabel = isApproved
    ? "승인 완료"
    : isRejected
      ? "반려됨"
      : "승인 대기";
  const statusColor = isApproved ? "#3E8E68" : isRejected ? "#D14343" : "#C6803A";
  const statusBg = isApproved ? "#E9F2EC" : isRejected ? "#FDE8E8" : "#FFF4E0";
  const sc = segColor(a.seg_id);
  const line = a.approval_line || [];
  const curIdx = line.findIndex((s) => s.status === "pending");
  const curStep = curIdx >= 0 ? line[curIdx] : null;
  // 현재 결재 단계의 승인자 본인(또는 마스터)만 결재할 수 있습니다.
  const canAct =
    isPending &&
    !!curStep &&
    (meIsMaster ||
      (!!curStep.email && !!me.email && curStep.email.toLowerCase() === me.email.toLowerCase()) ||
      curStep.name === me.name);
  const curIsCeo = !!curStep?.is_ceo;
  const attachments = a.attachments || [];

  return (
    <div
      className="modalwrap"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(6,10,8,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        padding: "30px 18px",
      }}
    >
      <div
        className="modalbox doc-paper"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 720,
          maxWidth: "100%",
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 28px",
            borderBottom: "1px solid rgba(12,15,13,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 11px",
                borderRadius: 20,
                background: tm.bg,
                color: tm.color,
              }}
            >
              {tm.icon} {tm.label}
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: "4px 11px",
                borderRadius: 20,
                background: statusBg,
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isPending && (
              <button
                onClick={onEdit}
                className="gbtn"
                style={{
                  padding: "7px 13px",
                  border: "1px solid rgba(12,15,13,0.14)",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✎ 편집
              </button>
            )}
            <span
              onClick={onClose}
              style={{
                cursor: "pointer",
                fontSize: 24,
                color: "#84908A",
                lineHeight: 1,
              }}
            >
              ×
            </span>
          </div>
        </div>

        <div className="m-pad-lg" style={{ padding: "30px 34px 8px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="mono" style={{ fontSize: 12, color: "#84908A" }}>
                {"LJ-AP-2026-" + String(a.seq).padStart(4, "0")}
              </div>
              <h1
                className="doc-title"
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  marginTop: 8,
                }}
              >
                품 의 서
              </h1>
            </div>
            <div
              style={{
                display: "flex",
                border: "1px solid #0C0F0D",
                flexShrink: 0,
                maxWidth: "100%",
                overflowX: "auto",
              }}
            >
              <div
                style={{
                  width: 34,
                  flexShrink: 0,
                  background: "#F4F7F5",
                  borderRight: "1px solid rgba(12,15,13,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "6px 0",
                }}
              >
                <span
                  style={{
                    writingMode: "vertical-rl",
                    letterSpacing: "0.14em",
                  }}
                >
                  결 재
                </span>
              </div>
              <div
                style={{
                  width: 92,
                  flexShrink: 0,
                  borderRight: "1px solid rgba(12,15,13,0.35)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: 5,
                    borderBottom: "1px solid rgba(12,15,13,0.35)",
                    background: "#F4F7F5",
                  }}
                >
                  상신
                </div>
                <div
                  style={{
                    height: 92,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    {a.drafter}
                  </span>
                </div>
              </div>
              {line.map((s, i) => {
                const last = i === line.length - 1;
                const appr = s.status === "approved";
                const rej = s.status === "rejected";
                const isCur = i === curIdx;
                return (
                  <div
                    key={i}
                    style={{
                      width: 92,
                      flexShrink: 0,
                      borderRight: last ? "none" : "1px solid rgba(12,15,13,0.35)",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: 5,
                        borderBottom: "1px solid rgba(12,15,13,0.35)",
                        background: s.is_ceo ? "#EFF6F1" : "#F4F7F5",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.is_ceo ? "대표자" : s.role_label || "결재"}
                    </div>
                    <div
                      style={{
                        height: 92,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        background: isCur && isPending ? "#FFFBF2" : undefined,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4C55" }}>
                        {s.name}
                      </span>
                      {appr && s.is_ceo && sealImg && (
                        <img
                          src={sealImg}
                          alt="직인"
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%)",
                            width: 70,
                            height: 70,
                            objectFit: "contain",
                            opacity: 0.9,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      {appr && s.is_ceo && !sealImg && (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%) rotate(-9deg)",
                            width: 66,
                            height: 66,
                            borderRadius: "50%",
                            border: "2.5px double #C0392B",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#C0392B",
                            background: "rgba(255,255,255,0.35)",
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{ fontSize: 7, fontWeight: 700 }}>엘제이바이오</div>
                          <div style={{ fontSize: 11, fontWeight: 800, margin: "1px 0" }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: 6, fontWeight: 700 }}>代表理事印</div>
                        </div>
                      )}
                      {appr && !s.is_ceo && (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%) rotate(-8deg)",
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            border: "2px solid #0E7B4E",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#0E7B4E",
                            fontSize: 12,
                            fontWeight: 800,
                            background: "rgba(255,255,255,0.3)",
                            pointerEvents: "none",
                          }}
                        >
                          승인
                        </div>
                      )}
                      {rej && (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%) rotate(-10deg)",
                            padding: "3px 8px",
                            border: "2px solid #C0392B",
                            borderRadius: 6,
                            color: "#C0392B",
                            fontSize: 13,
                            fontWeight: 800,
                            letterSpacing: "0.1em",
                            pointerEvents: "none",
                          }}
                        >
                          반려
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <h2
            style={{
              fontSize: 19,
              fontWeight: 700,
              marginTop: 26,
              lineHeight: 1.4,
            }}
          >
            {a.title}
          </h2>
          <div style={{ marginTop: 18, borderTop: "2px solid #0C0F0D" }}>
            <div
              className="doc-grid4"
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 120px 1fr",
                borderBottom: "1px solid rgba(12,15,13,0.14)",
              }}
            >
              <div style={cellHead}>사업 부문</div>
              <div style={{ ...cellVal, borderRight: cellBorder }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 10px",
                    borderRadius: 20,
                    background: sc + "1F",
                    color: sc,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {segName(a.seg_id)}
                </span>
              </div>
              <div style={cellHead}>금액</div>
              <div
                className="mono"
                style={{ ...cellVal, fontWeight: 600, borderRight: "none" }}
              >
                {a.amount}
              </div>
            </div>
            <div
              className="doc-grid4"
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 120px 1fr",
                borderBottom: "1px solid rgba(12,15,13,0.14)",
              }}
            >
              <div style={cellHead}>상신자</div>
              <div style={{ ...cellVal, borderRight: cellBorder }}>
                {a.drafter}
              </div>
              <div style={cellHead}>상신일</div>
              <div style={{ ...cellVal, borderRight: "none" }}>
                {a.created_at}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                borderBottom: "1px solid rgba(12,15,13,0.14)",
              }}
            >
              <div style={cellHead}>처리 기한</div>
              <div
                style={{
                  ...cellVal,
                  fontWeight: 600,
                  color: "#C6803A",
                  borderRight: "none",
                }}
              >
                {a.due}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#84908A",
                letterSpacing: "0.02em",
                marginBottom: 9,
              }}
            >
              내용
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "#2A2C33",
                whiteSpace: "pre-wrap",
              }}
            >
              {a.content}
            </div>
          </div>
          {attachments.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#84908A",
                  letterSpacing: "0.02em",
                  marginBottom: 9,
                }}
              >
                첨부 문서 ({attachments.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      border: "1px solid rgba(12,15,13,0.1)",
                      borderRadius: 9,
                      padding: "9px 12px",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>📎</span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#3A3C45",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {att.name}
                    </span>
                    {(att.url || att.path) && (
                      <button
                        onClick={() => void downloadAttachment(att)}
                        className="gbtn"
                        style={{
                          padding: "6px 12px",
                          border: "1px solid rgba(14,123,78,0.35)",
                          borderRadius: 8,
                          background: "#fff",
                          color: "#0E7B4E",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        ⬇ 다운로드
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 결재 의견 (승인/반려 시 남긴 코멘트) */}
          {line.some((s) => s.comment) && (
            <div style={{ marginTop: 22 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#84908A",
                  letterSpacing: "0.02em",
                  marginBottom: 9,
                }}
              >
                결재 의견
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {line
                  .filter((s) => s.comment)
                  .map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 10,
                        background: s.status === "rejected" ? "#FDF3F1" : "#F4F7F5",
                        borderRadius: 10,
                        padding: "10px 13px",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: s.avatar_bg || "#84908A",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {s.init || s.name.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                          {s.name}
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              color: s.status === "rejected" ? "#C4553E" : "#3E8E68",
                            }}
                          >
                            {s.status === "rejected" ? "반려" : "승인"}
                            {s.acted_at ? " · " + s.acted_at : ""}
                          </span>
                        </div>
                        <div style={{ marginTop: 3, fontSize: 13, lineHeight: 1.55, color: "#3A3C45", whiteSpace: "pre-wrap" }}>
                          {s.comment}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {isPending && curStep && (
            <div
              style={{
                marginTop: 20,
                fontSize: 12.5,
                color: "#8A5A16",
                background: "#FFF7E8",
                border: "1px solid rgba(198,128,58,0.28)",
                borderRadius: 10,
                padding: "11px 15px",
                lineHeight: 1.5,
              }}
            >
              ⏳ 현재 결재 차례:{" "}
              <b style={{ color: "#0C0F0D" }}>
                {curStep.name}
                {curStep.is_ceo ? " (대표자 최종)" : ""}
              </b>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "#84908A",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#FAFBFA",
              borderRadius: 10,
              padding: "12px 15px",
              lineHeight: 1.5,
            }}
          >
            🔒 이 문서는 상신자{" "}
            <b style={{ color: "#0C0F0D" }}>{a.drafter}</b>, 결재선 승인자, 그리고
            총괄 관리자만 열람할 수 있습니다.
          </div>
        </div>

        {canAct && (
          <div
            className="m-pad-md"
            style={{
              marginTop: 18,
              padding: "16px 28px",
              borderTop: "1px solid rgba(12,15,13,0.08)",
              background: "#FAFBFA",
            }}
          >
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#4A4C55" }}>
              결재 의견 <span style={{ color: "#9AA29C", fontWeight: 500 }}>(선택 · 승인/반려와 함께 기록됩니다)</span>
            </label>
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              placeholder="예: 검토 완료, 승인합니다 / 견적서 재확인 후 재상신 바랍니다"
              style={{
                marginTop: 6,
                width: "100%",
                minHeight: 64,
                padding: "10px 13px",
                border: "1.5px solid rgba(12,15,13,0.12)",
                borderRadius: 10,
                fontSize: 13.5,
                lineHeight: 1.55,
                resize: "vertical",
                display: "block",
                background: "#fff",
              }}
            />
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => onReject(opinion)}
                className="gbtn"
                style={{
                  padding: "12px 22px",
                  border: "1px solid rgba(196,85,62,0.35)",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#C4553E",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                반려
              </button>
              <button
                onClick={() => onApprove(opinion)}
                className="pbtn"
                style={{
                  padding: "12px 26px",
                  border: "none",
                  borderRadius: 10,
                  background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {curIsCeo ? "✓ 최종 승인 및 날인" : "✓ 이 단계 승인"}
              </button>
            </div>
          </div>
        )}
        {!isPending && (
          <div
            style={{
              marginTop: 18,
              padding: "14px 28px",
              borderTop: "1px solid rgba(12,15,13,0.08)",
              background: "#FAFBFA",
              fontSize: 12.5,
              color: "#84908A",
            }}
          >
            {(a.approved_at || "") +
              " · " +
              (a.approver || ceoName) +
              " · " +
              statusLabel}
          </div>
        )}
      </div>
    </div>
  );
}

const cellBorder = "1px solid rgba(12,15,13,0.1)";
const cellHead: CSSProperties = {
  padding: "11px 14px",
  fontSize: 12.5,
  fontWeight: 700,
  background: "#F7F9F7",
  borderRight: cellBorder,
};
const cellVal: CSSProperties = {
  padding: "11px 14px",
  fontSize: 13.5,
  display: "flex",
  alignItems: "center",
};
