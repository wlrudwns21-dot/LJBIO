import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Modal, useToast } from "../ui";
import { demoConversations, demoMembers, demoMe } from "../data/demo";
import type { Conversation } from "@/types/database";

type Member = { name: string; email: string; dept: string; init: string | null; avatar_bg: string };
type Creator = { mode: "dm" | "group"; name: string; memberEmail: string };

type ChatMsg = {
  author?: string;
  init?: string | null;
  avatar_bg?: string;
  body: string;
  created_at: string;
  me?: boolean;
};

type Conv = Conversation & {
  online?: boolean;
  unread?: number;
  last?: string;
  messages: ChatMsg[];
};

const cloneDemo = (): Conv[] =>
  demoConversations.map((d) => ({
    ...d,
    messages: d.messages.map((m) => ({ ...m })) as ChatMsg[],
  }));

export default function Chat() {
  const { profile } = useAuth();
  const flash = useToast();
  const [convs, setConvs] = useState<Conv[]>(cloneDemo);
  const [activeId, setActiveId] = useState<string>(demoConversations[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [threadOpen, setThreadOpen] = useState(false); // mobile: show thread full-screen
  const [members, setMembers] = useState<Member[]>(demoMembers as Member[]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myEmail = profile?.email ?? demoMe.email;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: cs } = await supabase
        .from("conversations")
        .select("*")
        .order("sort", { ascending: true });
      if (!cs) return;
      const list: Conv[] = [];
      for (const c of cs as Conversation[]) {
        const { data: ms } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: true });
        const messages: ChatMsg[] = (ms || []).map((m: any) => ({
          author: m.author,
          init: m.init,
          avatar_bg: m.avatar_bg,
          body: m.body,
          created_at: m.created_at,
          me: profile ? m.sender_id === profile.id : false,
        }));
        list.push({
          ...c,
          unread: 0,
          last: messages[messages.length - 1]?.created_at ?? "",
          messages,
        });
      }
      setConvs(list);
      setActiveId((id) => (list.some((c) => c.id === id) ? id : list[0]?.id ?? ""));
    })().catch(() => {});
  }, [profile]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("profiles")
      .select("name,email,dept,init,avatar_bg")
      .eq("status", "approved")
      .then(({ data }) => data && setMembers(data as Member[]));
  }, []);

  async function createConv() {
    if (!creator) return;
    const maxSort = convs.reduce((a, c) => Math.max(a, c.sort || 0), 0);
    let row: Omit<Conversation, "id" | "created_at">;
    if (creator.mode === "group") {
      const nm = creator.name.trim();
      if (!nm) {
        flash("대화방 이름을 입력하세요");
        return;
      }
      row = {
        name: nm,
        is_group: true,
        role_label: "",
        init: nm.charAt(0),
        avatar_bg: "#0C0F0D",
        members: 1,
        sort: maxSort + 1,
      };
    } else {
      const m = members.find((x) => x.email === creator.memberEmail);
      if (!m) {
        flash("대화 상대를 선택하세요");
        return;
      }
      if (convs.some((c) => !c.is_group && c.name === m.name)) {
        flash("이미 대화방이 있습니다");
        return;
      }
      row = {
        name: m.name,
        is_group: false,
        role_label: m.dept || "",
        init: m.init || m.name.charAt(0),
        avatar_bg: m.avatar_bg || "#7A4DD1",
        members: 0,
        sort: maxSort + 1,
      };
    }
    if (isSupabaseConfigured) {
      const { data } = await supabase.from("conversations").insert(row).select().single();
      if (data) {
        const c = { ...(data as Conversation), messages: [], unread: 0, last: "" } as Conv;
        setConvs((prev) => [...prev, c]);
        setActiveId(c.id);
      }
    } else {
      const c = {
        ...row,
        id: "c" + Date.now(),
        created_at: "",
        messages: [],
        unread: 0,
        last: "",
      } as Conv;
      setConvs((prev) => [...prev, c]);
      setActiveId(c.id);
    }
    setCreator(null);
    flash("대화방을 만들었습니다");
  }

  const active = convs.find((c) => c.id === activeId) || convs[0];
  const isGroup = !!active?.is_group;

  function scrollToBottom() {
    setTimeout(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }

  useEffect(() => {
    scrollToBottom();
  }, [activeId]);

  function openConv(id: string) {
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setActiveId(id);
    setThreadOpen(true);
  }

  function deleteConv(id: string) {
    const target = convs.find((c) => c.id === id);
    if (!target) return;
    if (!window.confirm(`'${target.name}' 채팅방을 삭제할까요? 대화 내용도 함께 삭제됩니다.`))
      return;
    const rest = convs.filter((c) => c.id !== id);
    setConvs(rest);
    setActiveId((cur) => (cur === id ? rest[0]?.id ?? "" : cur));
    if (isSupabaseConfigured) {
      // messages are removed via ON DELETE CASCADE
      supabase.from("conversations").delete().eq("id", id).then(() => {});
    }
    flash("채팅방을 삭제했습니다");
  }

  async function send() {
    const body = draft.trim();
    if (!body || !active) return;
    const msg: ChatMsg = { me: true, body, created_at: "방금" };
    setConvs((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? { ...c, messages: [...c.messages, msg], last: "방금" }
          : c,
      ),
    );
    setDraft("");
    scrollToBottom();
    if (isSupabaseConfigured) {
      await supabase.from("messages").insert({
        conversation_id: active.id,
        sender_id: profile?.id ?? null,
        author: profile?.name ?? "",
        init: profile?.init ?? null,
        avatar_bg: profile?.avatar_bg ?? "#84908A",
        body,
      });
    }
  }

  const activeStatus = isGroup
    ? `👥 임직원 ${active?.members || 0}명 참여`
    : active?.online
      ? "● 온라인"
      : "오프라인";

  return (
    <div
      className={"fade g-chat" + (threadOpen ? " chat-open" : "")}
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        height: "calc(100vh - 152px)",
        background: "#fff",
        border: "1px solid rgba(12,15,13,0.07)",
        borderRadius: 18,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "288px 1fr",
      }}
    >
      {/* conversation list */}
      <div className="chat-list" style={{ borderRight: "1px solid rgba(12,15,13,0.08)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "18px 18px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>메시지</h3>
            <button
              className="pbtn"
              onClick={() => setCreator({ mode: "dm", name: "", memberEmail: "" })}
              style={{ padding: "7px 12px", border: "none", borderRadius: 8, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              + 새 대화
            </button>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, background: "rgba(12,15,13,0.05)", borderRadius: 9, padding: "8px 11px" }}>
            <span style={{ color: "#84908A" }}>⌕</span>
            <input placeholder="직원 검색…" style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, width: "100%" }} />
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 12px" }}>
          {convs.map((d) => {
            const lastMsg = d.messages[d.messages.length - 1];
            const preview =
              (d.is_group && lastMsg?.author ? lastMsg.author + ": " : "") + (lastMsg?.body || "");
            const showOnline = d.online && !d.is_group;
            return (
              <div
                key={d.id}
                onClick={() => openConv(d.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: 11,
                  borderRadius: 12,
                  cursor: "pointer",
                  marginBottom: 2,
                  background: d.id === activeId ? "rgba(14,123,78,0.08)" : "transparent",
                }}
              >
                <div style={{ position: "relative", width: 42, height: 42, flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: d.avatar_bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>
                    {d.init}
                  </div>
                  {showOnline && (
                    <span style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#46D08A", border: "2px solid #fff" }} />
                  )}
                  {d.is_group && (
                    <span style={{ position: "absolute", bottom: -2, right: -2, width: 17, height: 17, borderRadius: "50%", background: "#46D08A", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
                      👥
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap" }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: "#84908A", whiteSpace: "nowrap" }}>{d.last}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#84908A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                    {preview}
                  </div>
                </div>
                {!!d.unread && (
                  <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 20, background: "#0E7B4E", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {d.unread}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* active conversation */}
      <div className="chat-thread" style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        <div style={{ padding: "15px 22px", borderBottom: "1px solid rgba(12,15,13,0.08)", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="chat-back"
            onClick={() => setThreadOpen(false)}
            aria-label="목록"
            style={{ alignItems: "center", justifyContent: "center", width: 34, height: 34, flexShrink: 0, border: "1px solid rgba(12,15,13,0.12)", borderRadius: 9, background: "#fff", fontSize: 16, cursor: "pointer" }}
          >
            ‹
          </button>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: active?.avatar_bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
            {active?.init}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{active?.name}</div>
            <div style={{ fontSize: 12, color: "#46D08A", fontWeight: 500 }}>{activeStatus}</div>
          </div>
          <div style={{ flex: 1 }} />
          {active && (
            <button
              onClick={() => deleteConv(active.id)}
              className="gbtn"
              title="채팅방 삭제"
              style={{
                padding: "8px 13px",
                border: "1px solid rgba(196,85,62,0.3)",
                borderRadius: 9,
                background: "#fff",
                color: "#C4553E",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🗑 삭제
            </button>
          )}
        </div>

        <div
          id="chatScroll"
          ref={scrollRef}
          style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 24, background: "#F6F8F6", display: "flex", flexDirection: "column", gap: 12 }}
        >
          {active?.messages.map((m, i) => {
            const showSender = isGroup && !m.me;
            return (
              <div key={i} style={{ display: "flex", gap: 9, justifyContent: m.me ? "flex-end" : "flex-start" }}>
                {showSender && (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.avatar_bg || "#84908A", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, alignSelf: "flex-end" }}>
                    {m.init}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: m.me ? "flex-end" : "flex-start", maxWidth: "74%", minWidth: 0 }}>
                  {showSender && (
                    <div style={{ fontSize: 11.5, color: "#84908A", fontWeight: 600, marginBottom: 3, paddingLeft: 3 }}>
                      {m.author}
                    </div>
                  )}
                  <div
                    style={{
                      padding: "11px 15px",
                      fontSize: 14,
                      lineHeight: 1.5,
                      borderRadius: 16,
                      wordBreak: "break-word",
                      ...(m.me
                        ? { background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", borderBottomRightRadius: 4 }
                        : { background: "#fff", color: "#0C0F0D", border: "1px solid rgba(12,15,13,0.08)", borderBottomLeftRadius: 4 }),
                    }}
                  >
                    {m.body}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#9AA29C", marginTop: 4, textAlign: m.me ? "right" : "left" }}>
                    {m.created_at}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(12,15,13,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
          <input
            className="fld"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            placeholder="메시지를 입력하세요…"
            style={{ flex: 1, padding: "12px 15px", border: "1.5px solid rgba(12,15,13,0.12)", borderRadius: 22, fontSize: 14 }}
          />
          <button
            className="pbtn"
            onClick={() => send()}
            style={{ width: 44, height: 44, border: "none", borderRadius: "50%", background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 17, cursor: "pointer", flexShrink: 0 }}
          >
            ➤
          </button>
        </div>
      </div>

      <Modal open={!!creator} onClose={() => setCreator(null)} width={460}>
        {creator && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>새 대화 시작</h2>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              {(["dm", "group"] as const).map((mode) => {
                const on = creator.mode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setCreator({ ...creator, mode })}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 9,
                      border: `1.5px solid ${on ? "#0E7B4E" : "rgba(12,15,13,0.12)"}`,
                      background: on ? "rgba(14,123,78,0.08)" : "#fff",
                      color: on ? "#0E7B4E" : "#4A4C55",
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {mode === "dm" ? "1:1 대화" : "그룹 채팅"}
                  </button>
                );
              })}
            </div>

            {creator.mode === "group" ? (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#4A4C55" }}>대화방 이름</label>
                <input
                  value={creator.name}
                  onChange={(e) => setCreator({ ...creator, name: e.target.value })}
                  placeholder="예: 태국 수출 TF"
                  autoFocus
                  style={{ marginTop: 5, width: "100%", padding: "11px 13px", border: "1.5px solid rgba(12,15,13,0.12)", borderRadius: 9, fontSize: 14 }}
                />
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#4A4C55" }}>대화 상대 선택</label>
                <div style={{ marginTop: 8, maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {members
                    .filter((m) => m.email !== myEmail)
                    .map((m) => {
                      const sel = creator.memberEmail === m.email;
                      return (
                        <div
                          key={m.email}
                          onClick={() => setCreator({ ...creator, memberEmail: m.email })}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                            padding: "9px 11px",
                            borderRadius: 10,
                            cursor: "pointer",
                            border: `1.5px solid ${sel ? "#0E7B4E" : "transparent"}`,
                            background: sel ? "rgba(14,123,78,0.06)" : "transparent",
                          }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: m.avatar_bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                            {m.init || m.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: 11.5, color: "#84908A" }}>{m.dept}</div>
                          </div>
                          {sel && <span style={{ color: "#0E7B4E", fontWeight: 700 }}>✓</span>}
                        </div>
                      );
                    })}
                  {members.filter((m) => m.email !== myEmail).length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", color: "#9AA29C", fontSize: 13 }}>
                      대화할 직원이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setCreator(null)}
                className="gbtn"
                style={{ padding: "11px 20px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 9, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={createConv}
                className="pbtn"
                style={{ padding: "11px 24px", border: "none", borderRadius: 9, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                대화방 만들기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
