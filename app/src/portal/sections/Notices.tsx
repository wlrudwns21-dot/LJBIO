import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { noticeTagStyle } from "@/lib/theme";
import { Modal, useToast, Field, fieldStyle, PBtn } from "../ui";
import { demoNotices } from "../data/demo";
import type { Notice } from "@/types/database";

const NOTICE_FILTERS = ["전체", "중요", "규정", "일반"];
const NOTICE_TAGS = ["중요", "계약", "규정", "시스템", "인사"];
const TODAY = "2026-07-11";

const catOf = (t: string) => (t === "중요" ? "중요" : t === "규정" ? "규정" : "일반");

interface Editor {
  id: string | null;
  tag: string;
  title: string;
  body: string;
  author: string;
}

async function persist(fn: () => PromiseLike<unknown>) {
  if (isSupabaseConfigured) await fn();
}

export default function Notices() {
  const flash = useToast();
  const [notices, setNotices] = useState<Notice[]>(demoNotices);
  const [filter, setFilter] = useState("전체");
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setNotices(data as Notice[]));
  }, []);

  const list = notices.filter(
    (n) => filter === "전체" || catOf(n.tag) === filter || n.tag === filter,
  );

  const newNotice = () =>
    setEditor({ id: null, tag: "중요", title: "", body: "", author: "경영지원 지경준" });

  const editNotice = (n: Notice) =>
    setEditor({ id: n.id, tag: n.tag, title: n.title, body: n.body, author: n.author });

  async function removeNotice(id: string) {
    setNotices((prev) => prev.filter((n) => n.id !== id));
    await persist(() => supabase.from("notices").delete().eq("id", id));
    flash("공지를 삭제했습니다");
  }

  async function saveNotice() {
    if (!editor) return;
    if (!editor.title.trim()) {
      flash("제목을 입력하세요");
      return;
    }
    if (editor.id != null) {
      const id = editor.id;
      setNotices((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, tag: editor.tag, title: editor.title, body: editor.body, author: editor.author }
            : n,
        ),
      );
      await persist(() =>
        supabase
          .from("notices")
          .update({ tag: editor.tag, title: editor.title, body: editor.body, author: editor.author })
          .eq("id", id),
      );
      setEditor(null);
      flash("공지를 수정했습니다");
    } else {
      const row = {
        tag: editor.tag,
        title: editor.title,
        body: editor.body,
        author: editor.author || "경영지원 지경준",
        created_at: TODAY,
      };
      let created: Notice;
      if (isSupabaseConfigured) {
        const { data } = await supabase.from("notices").insert(row).select().single();
        created = data as Notice;
      } else {
        const nid = String(notices.reduce((a, n) => Math.max(a, Number(n.id) || 0), 0) + 1);
        created = { id: nid, ...row };
      }
      setNotices((prev) => [created, ...prev]);
      setEditor(null);
      flash("새 공지를 등록했습니다");
    }
  }

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {NOTICE_FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
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
          onClick={newNotice}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: 10,
            background: "#0C0F0D",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + 공지 등록
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((n) => {
          const c = noticeTagStyle(n.tag);
          return (
            <div
              key={n.id}
              className="lift"
              style={{
                background: "#fff",
                border: "1px solid rgba(12,15,13,0.07)",
                borderRadius: 14,
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: c.bg,
                    color: c.color,
                  }}
                >
                  {n.tag}
                </span>
                <span style={{ fontSize: 15.5, fontWeight: 600, flex: 1 }}>{n.title}</span>
                <span style={{ fontSize: 12.5, color: "#84908A" }}>{n.created_at}</span>
              </div>
              <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, color: "#5A5C65" }}>
                {n.body}
              </p>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12.5, color: "#84908A" }}>작성 · {n.author}</div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button
                    onClick={() => editNotice(n)}
                    className="gbtn"
                    style={{
                      padding: "6px 12px",
                      border: "1px solid rgba(12,15,13,0.14)",
                      borderRadius: 8,
                      background: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✎ 편집
                  </button>
                  <button
                    onClick={() => removeNotice(n.id)}
                    className="gbtn"
                    style={{
                      padding: "6px 12px",
                      border: "1px solid rgba(196,85,62,0.3)",
                      borderRadius: 8,
                      background: "#fff",
                      color: "#C4553E",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🗑 삭제
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!editor} onClose={() => setEditor(null)} padded={false}>
        {editor && (
          <>
            <div
              style={{
                padding: "20px 26px",
                borderBottom: "1px solid rgba(12,15,13,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {editor.id == null ? "새 공지 등록" : "공지 편집"}
              </h2>
              <span
                onClick={() => setEditor(null)}
                style={{ cursor: "pointer", fontSize: 22, color: "#84908A", lineHeight: 1 }}
              >
                ×
              </span>
            </div>
            <div
              style={{
                padding: "24px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 15,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 12 }}>
                <Field label="분류">
                  <select
                    value={editor.tag}
                    onChange={(e) => setEditor({ ...editor, tag: e.target.value })}
                    style={{ ...fieldStyle, padding: "11px 10px", background: "#fff" }}
                  >
                    {NOTICE_TAGS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="작성자">
                  <input
                    value={editor.author}
                    onChange={(e) => setEditor({ ...editor, author: e.target.value })}
                    style={fieldStyle}
                  />
                </Field>
              </div>
              <Field label="제목">
                <input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="공지 제목을 입력하세요"
                  style={fieldStyle}
                />
              </Field>
              <Field label="내용">
                <textarea
                  value={editor.body}
                  onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                  placeholder="공지 내용을 입력하세요"
                  style={{
                    ...fieldStyle,
                    lineHeight: 1.6,
                    minHeight: 120,
                    resize: "vertical",
                    display: "block",
                  }}
                />
              </Field>
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
              <PBtn onClick={saveNotice} style={{ padding: "11px 24px", borderRadius: 9, fontSize: 14 }}>
                저장
              </PBtn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
