import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Modal, useToast } from "../ui";
import { useAuth } from "@/context/AuthContext";
import { demoMails } from "../data/demo";
import type { Mail as MailRow } from "@/types/database";
import {
  getGmailToken,
  connectGmail,
  refreshGmail,
  disconnectGmail,
  listFolder,
  getMessage,
  markRead,
  setStar,
  trash,
  sendMessage,
  downloadAttachment,
  isTokenExpired,
  type GmailToken,
  type GmailAttachment,
} from "@/lib/gmail";

const FOLDER_DEFS: [MailRow["folder"] | "starred", string][] = [
  ["inbox", "받은편지함"],
  ["starred", "별표"],
  ["sent", "보낸편지함"],
  ["drafts", "임시보관"],
  ["trash", "휴지통"],
];

type Compose = { to: string; subject: string; body: string };

/** Fields shared by demo/Supabase rows and live Gmail messages. */
type MailItem = {
  id: string;
  folder: string;
  from_name: string;
  from_email: string;
  from_init: string | null;
  avatar_bg: string;
  to_addr: string;
  subject: string;
  preview: string;
  body: string;
  unread: boolean;
  starred: boolean;
  attachments: GmailAttachment[];
  sent_at: string;
  owner_id?: string | null;
};

export default function Mail() {
  const flash = useToast();
  const { profile, session } = useAuth();
  const uid = session?.user?.id;
  const [gmail, setGmail] = useState<GmailToken | null>(() => getGmailToken(uid));
  const connected = !!gmail;

  // Re-check the token whenever the logged-in user changes (prevents one user
  // from seeing another's mailbox on a shared browser). If there's no valid
  // local token, ask the server to mint one — this is what keeps a connection
  // alive across expiry and re-login (needs the gmail-auth Edge Function).
  useEffect(() => {
    const local = getGmailToken(uid);
    if (local) {
      setGmail(local);
      return;
    }
    if (!uid || !isSupabaseConfigured) {
      setGmail(null);
      return;
    }
    let cancelled = false;
    refreshGmail(uid).then((t) => {
      if (!cancelled) setGmail(t);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Token rejected mid-use → try a silent server refresh before giving up.
  async function recover() {
    if (uid) {
      const t = await refreshGmail(uid);
      if (t) {
        setGmail(t);
        return;
      }
    }
    setGmail(null);
    flash("Gmail 연결이 만료됐어요. 다시 연결해 주세요.");
  }

  const [mails, setMails] = useState<MailItem[]>(demoMails as MailItem[]);
  const [mailFolder, setMailFolder] = useState<string>("inbox");
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const [justSent, setJustSent] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Not connected → demo seed or Supabase-stored preview mails.
  useEffect(() => {
    if (connected) return;
    if (!isSupabaseConfigured) {
      setMails(demoMails as MailItem[]);
      return;
    }
    supabase
      .from("mails")
      .select("*")
      .order("sent_at", { ascending: false })
      .then(({ data }) => data && setMails(data as MailItem[]));
  }, [connected]);

  // Connected → live Gmail for the selected folder.
  useEffect(() => {
    if (!connected || !gmail) return;
    let cancelled = false;
    setLoading(true);
    setSelectedMailId(null);
    listFolder(gmail.token, mailFolder)
      .then((list) => {
        if (!cancelled) setMails(list as MailItem[]);
      })
      .catch((e) => {
        if (cancelled) return;
        if (isTokenExpired(e)) {
          void recover();
        } else {
          flash("메일을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, gmail, mailFolder]);

  async function persist(fn: () => PromiseLike<unknown>) {
    if (!isSupabaseConfigured) return;
    try {
      await fn();
    } catch {
      /* ignore */
    }
  }

  async function doConnect() {
    const { error } = await connectGmail();
    if (error) flash("연결 실패: " + error);
  }
  function disconnect() {
    void disconnectGmail();
    setGmail(null);
    setSelectedMailId(null);
    setMails(isSupabaseConfigured ? [] : (demoMails as MailItem[]));
    flash("Gmail 연결을 해제했습니다");
  }
  function refresh() {
    if (!gmail) return;
    setLoading(true);
    listFolder(gmail.token, mailFolder)
      .then((list) => setMails(list as MailItem[]))
      .catch((e) => {
        if (isTokenExpired(e)) void recover();
      })
      .finally(() => setLoading(false));
  }

  async function onAttachment(messageId: string, att: GmailAttachment) {
    if (!connected || !gmail || !att.attachmentId) {
      flash("첨부파일은 Gmail 연결 후 다운로드할 수 있습니다.");
      return;
    }
    try {
      flash("첨부파일을 불러오는 중…");
      await downloadAttachment(gmail.token, messageId, att);
    } catch (e) {
      if (isTokenExpired(e)) {
        void recover();
      } else {
        flash("첨부파일을 불러오지 못했습니다.");
      }
    }
  }

  const mailDate = (m: MailItem) => (m.sent_at || "").slice(0, 10);
  const mailTime = (m: MailItem) =>
    justSent.has(m.id) ? "방금" : (m.sent_at || "").slice(11, 16);

  async function openMail(id: string) {
    setSelectedMailId(id);
    setMails((ms) => ms.map((m) => (m.id === id ? { ...m, unread: false } : m)));
    if (connected && gmail) {
      try {
        const full = await getMessage(gmail.token, id, mailFolder);
        setMails((ms) => ms.map((m) => (m.id === id ? (full as MailItem) : m)));
        markRead(gmail.token, id).catch(() => {});
      } catch (e) {
        if (isTokenExpired(e)) void recover();
      }
      return;
    }
    persist(() => supabase.from("mails").update({ unread: false }).eq("id", id));
  }

  function toggleStar(id: string) {
    const cur = mails.find((m) => m.id === id);
    const next = !cur?.starred;
    setMails((ms) => ms.map((m) => (m.id === id ? { ...m, starred: next } : m)));
    if (connected && gmail) {
      setStar(gmail.token, id, next).catch((e) => {
        if (isTokenExpired(e)) void recover();
      });
      return;
    }
    persist(() => supabase.from("mails").update({ starred: next }).eq("id", id));
  }

  function trashMail(id: string) {
    if (connected && gmail) {
      setMails((ms) => ms.filter((m) => m.id !== id));
      setSelectedMailId(null);
      trash(gmail.token, id).catch((e) => {
        if (isTokenExpired(e)) void recover();
      });
      flash("메일을 휴지통으로 이동했습니다");
      return;
    }
    setMails((ms) => ms.map((m) => (m.id === id ? { ...m, folder: "trash" } : m)));
    setSelectedMailId(null);
    persist(() => supabase.from("mails").update({ folder: "trash" }).eq("id", id));
    flash("메일을 휴지통으로 이동했습니다");
  }

  async function sendMail() {
    if (!compose) return;
    if (!compose.to.trim()) {
      flash("받는 사람을 입력하세요");
      return;
    }
    if (connected && gmail) {
      try {
        await sendMessage(
          gmail.token,
          gmail.email,
          compose.to,
          compose.subject || "(제목 없음)",
          compose.body || "",
        );
        setCompose(null);
        flash("메일을 보냈습니다");
        if (mailFolder === "sent") refresh();
      } catch (e) {
        if (isTokenExpired(e)) {
          void recover();
        } else {
          flash("메일 전송에 실패했습니다.");
        }
      }
      return;
    }
    // demo / preview mode
    const nid = String(
      mails.reduce((a, m) => Math.max(a, Number(m.id) || 0), 0) + 1,
    );
    const nm: MailItem = {
      id: nid,
      owner_id: profile?.id ?? null,
      folder: "sent",
      from_name: "지경준",
      from_email: "kyungjun.ji@bio-lj.com",
      from_init: "지",
      avatar_bg: "#0E7B4E",
      to_addr: compose.to,
      subject: compose.subject || "(제목 없음)",
      preview: (compose.body || "").slice(0, 60),
      body: compose.body || "",
      unread: false,
      starred: false,
      attachments: [],
      sent_at: "2026-07-11T00:00:00",
    };
    setMails((ms) => [nm, ...ms]);
    setJustSent((s) => new Set(s).add(nid));
    setCompose(null);
    setMailFolder("sent");
    setSelectedMailId(nid);
    persist(() =>
      supabase.from("mails").insert({
        owner_id: nm.owner_id,
        folder: nm.folder,
        from_name: nm.from_name,
        from_email: nm.from_email,
        from_init: nm.from_init,
        avatar_bg: nm.avatar_bg,
        to_addr: nm.to_addr,
        subject: nm.subject,
        preview: nm.preview,
        body: nm.body,
        unread: nm.unread,
        starred: nm.starred,
        attachments: nm.attachments,
      }),
    );
    flash("메일을 보냈습니다");
  }

  const inboxUnread = mails.filter((m) => m.folder === "inbox" && m.unread).length;
  const inFolder = connected
    ? mails
    : mailFolder === "starred"
      ? mails.filter((m) => m.starred && m.folder !== "trash")
      : mails.filter((m) => m.folder === mailFolder);
  const selMail = inFolder.find((m) => m.id === selectedMailId) || null;
  const folderLabel = (FOLDER_DEFS.find((f) => f[0] === mailFolder) || ["", "메일"])[1];

  return (
    <div className="fade" style={{ maxWidth: 1240, margin: "0 auto" }}>
      {/* Gmail connection banner */}
      {connected ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(14,123,78,0.06)",
            border: "1px solid rgba(14,123,78,0.22)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 16 }}>✅</span>
          <span
            style={{
              flex: 1,
              minWidth: 200,
              fontSize: 13,
              color: "#256F4C",
              fontWeight: 500,
              lineHeight: 1.55,
            }}
          >
            <b>{gmail?.email}</b> 의 Gmail이 연결되었습니다. 실제 메일함을 실시간으로
            불러옵니다. (본문·첨부는 저장하지 않습니다.)
          </span>
          <button
            onClick={refresh}
            className="gbtn"
            style={{
              padding: "8px 14px",
              border: "1px solid rgba(14,123,78,0.4)",
              borderRadius: 9,
              background: "#fff",
              color: "#0E7B4E",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ⟳ 새로고침
          </button>
          <button
            onClick={disconnect}
            className="gbtn"
            style={{
              padding: "8px 14px",
              border: "1px solid rgba(12,15,13,0.14)",
              borderRadius: 9,
              background: "#fff",
              color: "#6B7280",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            연결 해제
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(42,111,219,0.06)",
            border: "1px solid rgba(42,111,219,0.22)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 16 }}>✉</span>
          <span
            style={{
              flex: 1,
              minWidth: 200,
              fontSize: 13,
              color: "#2A4E85",
              fontWeight: 500,
              lineHeight: 1.55,
            }}
          >
            아래는 미리보기입니다. <b>내 Gmail 계정을 연결</b>하면 실제 메일함이
            표시됩니다. 메일 본문·첨부는 저장하지 않고 필요할 때 실시간으로 불러와 DB
            용량을 최소화합니다.
          </span>
          <button
            onClick={doConnect}
            className="gbtn"
            style={{
              padding: "8px 15px",
              border: "1px solid rgba(42,111,219,0.4)",
              borderRadius: 9,
              background: "#fff",
              color: "#2A6FDB",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            🔗 내 Gmail 연결
          </button>
        </div>
      )}

      <div
        className={"g-mail" + (selMail ? " mail-open" : "")}
        style={{
          height: "calc(100vh - 220px)",
          minHeight: 470,
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.07)",
          borderRadius: 18,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "322px 1fr",
        }}
      >
        {/* Left: compose btn + folders + list */}
        <div
          style={{
            borderRight: "1px solid rgba(12,15,13,0.08)",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <div style={{ padding: "16px 16px 10px" }}>
            <button
              onClick={() => setCompose({ to: "", subject: "", body: "" })}
              className="pbtn"
              style={{
                width: "100%",
                padding: 11,
                border: "none",
                borderRadius: 11,
                background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✏ 메일 쓰기
            </button>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 5,
                flexWrap: "wrap",
              }}
            >
              {FOLDER_DEFS.map(([k, label]) => {
                const active = mailFolder === k;
                const hasCount = k === "inbox" && inboxUnread > 0;
                return (
                  <span
                    key={k}
                    onClick={() => {
                      setMailFolder(k);
                      setSelectedMailId(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 13px",
                      borderRadius: 9,
                      cursor: "pointer",
                      fontSize: 13.5,
                      fontWeight: active ? 700 : 500,
                      whiteSpace: "nowrap",
                      background: active ? "rgba(14,123,78,0.1)" : "transparent",
                      color: active ? "#0E7B4E" : "#4A4C55",
                    }}
                  >
                    {label}
                    {hasCount && (
                      <span
                        style={{
                          minWidth: 17,
                          height: 17,
                          padding: "0 5px",
                          borderRadius: 20,
                          background: "#0E7B4E",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {inboxUnread}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 10px 12px" }}>
            {loading && (
              <div
                style={{
                  padding: "30px 16px",
                  textAlign: "center",
                  color: "#9AA29C",
                  fontSize: 13,
                }}
              >
                메일을 불러오는 중…
              </div>
            )}
            {!loading &&
              inFolder.map((m) => {
                const isSent = mailFolder === "sent" || mailFolder === "drafts";
                return (
                  <div
                    key={m.id}
                    onClick={() => openMail(m.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 11,
                      padding: "13px 14px",
                      borderRadius: 11,
                      cursor: "pointer",
                      marginBottom: 2,
                      background:
                        m.id === selectedMailId
                          ? "rgba(14,123,78,0.08)"
                          : "transparent",
                      borderLeft: `3px solid ${m.unread ? "#0E7B4E" : "transparent"}`,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: m.avatar_bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {m.from_init}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "baseline",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: m.unread ? 700 : 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {isSent
                            ? "받는사람: " + (m.to_addr || "(미지정)")
                            : m.from_name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#9AA29C",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {mailDate(m).slice(5)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: m.unread ? 700 : 500,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.subject || "(제목 없음)"}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "#84908A",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.preview}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 5,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(m.id);
                        }}
                        style={{
                          cursor: "pointer",
                          fontSize: 15,
                          color: m.starred ? "#E8B923" : "#C4C9C4",
                          lineHeight: 1,
                        }}
                      >
                        {m.starred ? "★" : "☆"}
                      </span>
                      {m.attachments.length > 0 && (
                        <span style={{ fontSize: 12, color: "#84908A" }}>📎</span>
                      )}
                    </div>
                  </div>
                );
              })}
            {!loading && inFolder.length === 0 && (
              <div
                style={{
                  padding: "40px 16px",
                  textAlign: "center",
                  color: "#9AA29C",
                  fontSize: 13,
                }}
              >
                {folderLabel}이 비어 있습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right: reading pane */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          {selMail ? (
            <>
              <button
                className="mail-back"
                onClick={() => setSelectedMailId(null)}
                style={{
                  alignItems: "center",
                  gap: 6,
                  margin: "12px 16px 0",
                  padding: "9px 14px",
                  border: "1px solid rgba(12,15,13,0.12)",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#0C0F0D",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                ← 목록으로
              </button>
              <div
                style={{
                  padding: "20px 26px",
                  borderBottom: "1px solid rgba(12,15,13,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <h2 style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.35 }}>
                    {selMail.subject || "(제목 없음)"}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      onClick={() => toggleStar(selMail.id)}
                      style={{
                        cursor: "pointer",
                        fontSize: 19,
                        color: selMail.starred ? "#E8B923" : "#9AA29C",
                        lineHeight: 1,
                      }}
                    >
                      {selMail.starred ? "★" : "☆"}
                    </span>
                    <span
                      onClick={() => trashMail(selMail.id)}
                      title="삭제"
                      style={{ cursor: "pointer", fontSize: 16, color: "#84908A" }}
                    >
                      🗑
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: selMail.avatar_bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {selMail.from_init}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {selMail.from_name}{" "}
                      <span
                        style={{ fontSize: 12, color: "#9AA29C", fontWeight: 400 }}
                      >
                        &lt;{selMail.from_email}&gt;
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#84908A", marginTop: 1 }}>
                      받는사람: {selMail.to_addr || (gmail?.email ?? "나")} ·{" "}
                      {mailDate(selMail)} {mailTime(selMail)}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 26px" }}>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.8,
                    color: "#2A2C33",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {selMail.body || "(내용 없음)"}
                </div>
                {selMail.attachments.length > 0 && (
                  <div
                    style={{
                      marginTop: 24,
                      paddingTop: 16,
                      borderTop: "1px solid rgba(12,15,13,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#84908A",
                        marginBottom: 10,
                      }}
                    >
                      첨부파일
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {selMail.attachments.map((a, i) => {
                        const canDownload = connected && !!a.attachmentId;
                        return (
                          <span
                            key={i}
                            onClick={() => canDownload && onAttachment(selMail.id, a)}
                            title={canDownload ? "다운로드" : undefined}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "9px 13px",
                              border: "1px solid rgba(12,15,13,0.12)",
                              borderRadius: 10,
                              fontSize: 12.5,
                              fontWeight: 500,
                              background: "#FAFBFA",
                              cursor: canDownload ? "pointer" : "default",
                              color: canDownload ? "#0E7B4E" : "#3A3C45",
                            }}
                          >
                            📎 {a.name}
                            {canDownload && <span style={{ fontSize: 13 }}>⭳</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div
                style={{
                  padding: "14px 26px",
                  borderTop: "1px solid rgba(12,15,13,0.08)",
                  display: "flex",
                  gap: 10,
                }}
              >
                <button
                  onClick={() =>
                    setCompose({
                      to: selMail.from_email,
                      subject: "Re: " + (selMail.subject || ""),
                      body:
                        "\n\n──────────\n" +
                        selMail.from_name +
                        " 님이 작성:\n" +
                        (selMail.body || ""),
                    })
                  }
                  className="pbtn"
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: 9,
                    background: "#0C0F0D",
                    color: "#fff",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ↩ 답장
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#9AA29C",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 40 }}>✉</div>
              <div style={{ fontSize: 14 }}>읽을 메일을 선택하세요</div>
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      <Modal
        open={!!compose}
        onClose={() => setCompose(null)}
        width={640}
        padded={false}
      >
        {compose && (
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
              <h2
                style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}
              >
                새 메일 작성
              </h2>
              <span
                onClick={() => setCompose(null)}
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
              style={{
                padding: "22px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: "1px solid rgba(12,15,13,0.08)",
                  paddingBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    color: "#84908A",
                    fontWeight: 600,
                    width: 56,
                  }}
                >
                  보낸사람
                </span>
                <span style={{ fontSize: 13.5, color: "#3A3C45" }}>
                  {connected
                    ? gmail?.email
                    : "지경준 <kyungjun.ji@bio-lj.com>"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "#84908A",
                    fontWeight: 600,
                    width: 56,
                  }}
                >
                  받는사람
                </span>
                <input
                  className="fld"
                  value={compose.to}
                  onChange={(e) =>
                    setCompose({ ...compose, to: e.target.value })
                  }
                  placeholder="name@example.com"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1.5px solid rgba(12,15,13,0.12)",
                    borderRadius: 9,
                    fontSize: 14,
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "#84908A",
                    fontWeight: 600,
                    width: 56,
                  }}
                >
                  제목
                </span>
                <input
                  className="fld"
                  value={compose.subject}
                  onChange={(e) =>
                    setCompose({ ...compose, subject: e.target.value })
                  }
                  placeholder="제목을 입력하세요"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1.5px solid rgba(12,15,13,0.12)",
                    borderRadius: 9,
                    fontSize: 14,
                  }}
                />
              </div>
              <textarea
                className="fld"
                value={compose.body}
                onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                placeholder="내용을 입력하세요…"
                style={{
                  width: "100%",
                  padding: "13px 14px",
                  border: "1.5px solid rgba(12,15,13,0.12)",
                  borderRadius: 10,
                  fontSize: 14,
                  lineHeight: 1.7,
                  minHeight: 200,
                  resize: "vertical",
                  display: "block",
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: connected ? "#256F4C" : "#84908A",
                  background: connected ? "rgba(14,123,78,0.06)" : "#FAFBFA",
                  borderRadius: 9,
                  padding: "10px 13px",
                  lineHeight: 1.55,
                }}
              >
                {connected ? (
                  <>
                    <b style={{ color: "#0E7B4E" }}>Gmail로 실제 발송</b>됩니다 —
                    받는 사람에게 메일이 전송됩니다.
                  </>
                ) : (
                  <>
                    실제 발송은 <b style={{ color: "#0C0F0D" }}>Gmail 연결</b> 후
                    활성화됩니다. 현재는 보낸편지함에 미리보기로 저장됩니다.
                  </>
                )}
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
                onClick={() => setCompose(null)}
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
                onClick={sendMail}
                className="pbtn"
                style={{
                  padding: "11px 26px",
                  border: "none",
                  borderRadius: 9,
                  background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ➤ 보내기
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
