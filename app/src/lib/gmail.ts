/**
 * Gmail integration — connects a company Google Workspace account via Supabase
 * Google OAuth and talks to the Gmail REST API directly from the browser.
 *
 * DB-minimal by design: we store NOTHING from Gmail in our database. The only
 * thing persisted locally is the short-lived Google access token (in
 * localStorage), used to fetch messages live on demand.
 *
 * Note: Supabase does not auto-refresh the Google provider token, so it lasts
 * ~1 hour. When it expires, the user re-clicks "Gmail 연결" (usually silent if
 * the Google session is still active).
 */
import { supabase } from "@/lib/supabase";
import { theme } from "@/lib/theme";

const TOKEN_KEY = "ljbio_gmail";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailToken {
  token: string;
  email: string;
  exp: number;
}

export interface GmailMessage {
  id: string;
  folder: string;
  from_name: string;
  from_email: string;
  from_init: string;
  avatar_bg: string;
  to_addr: string;
  subject: string;
  preview: string;
  body: string;
  unread: boolean;
  starred: boolean;
  attachments: { name: string }[];
  sent_at: string;
}

/* --------------------------------------------------------------- token store */
export function getGmailToken(): GmailToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as GmailToken;
    if (!t.token || Date.now() > t.exp) return null;
    return t;
  } catch {
    return null;
  }
}

/** Called from the auth layer whenever a Google provider_token appears. */
export function storeGmailToken(token: string, email: string) {
  const t: GmailToken = { token, email, exp: Date.now() + 55 * 60 * 1000 };
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}

export function clearGmailToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------- OAuth connect */
const SCOPES = [
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

/** Kicks off the Google OAuth redirect that grants Gmail access. */
export async function connectGmail(): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: SCOPES,
      redirectTo: window.location.origin + "/portal",
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  return error ? { error: error.message } : {};
}

/* --------------------------------------------------------------- REST helper */
class TokenExpired extends Error {}

async function gfetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + token,
      ...(init?.headers || {}),
    },
  });
  if (res.status === 401) {
    clearGmailToken();
    throw new TokenExpired("TOKEN_EXPIRED");
  }
  if (!res.ok) throw new Error("Gmail API " + res.status);
  return res.json();
}

export function isTokenExpired(e: unknown) {
  return e instanceof TokenExpired;
}

/* -------------------------------------------------------------- mapping/util */
const LABEL: Record<string, string> = {
  inbox: "INBOX",
  sent: "SENT",
  drafts: "DRAFT",
  trash: "TRASH",
  starred: "STARRED",
};

function colorFor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return theme.palette[h % theme.palette.length];
}

function header(m: any, name: string): string {
  const hs = m?.payload?.headers || [];
  const hit = hs.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
  return hit?.value || "";
}

function parseFrom(v: string): { name: string; email: string } {
  const m = v.match(/^\s*(.*?)\s*<(.+?)>\s*$/);
  if (m) return { name: (m[1] || "").replace(/["']/g, "").trim() || m[2], email: m[2] };
  return { name: v || "(알 수 없음)", email: v };
}

function b64urlDecode(data: string): string {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
  } catch {
    try {
      return atob(b64);
    } catch {
      return "";
    }
  }
}

function b64urlEncode(str: string): string {
  const utf8 = unescape(encodeURIComponent(str));
  return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findPart(parts: any[], mime: string): any {
  for (const p of parts || []) {
    if (p.mimeType === mime && p.body?.data) return p;
    if (p.parts) {
      const nested = findPart(p.parts, mime);
      if (nested) return nested;
    }
  }
  return null;
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data)
    return b64urlDecode(payload.body.data);
  if (payload.mimeType === "text/html" && payload.body?.data)
    return stripHtml(b64urlDecode(payload.body.data));
  if (payload.parts) {
    const plain = findPart(payload.parts, "text/plain");
    if (plain) return b64urlDecode(plain.body.data);
    const html = findPart(payload.parts, "text/html");
    if (html) return stripHtml(b64urlDecode(html.body.data));
  }
  return "";
}

function collectAttachments(payload: any): { name: string }[] {
  const out: { name: string }[] = [];
  (function walk(p: any) {
    if (!p) return;
    if (p.filename && p.filename.length > 0) out.push({ name: p.filename });
    (p.parts || []).forEach(walk);
  })(payload);
  return out;
}

function toMessage(m: any, folder: string): GmailMessage {
  const from = parseFrom(header(m, "From"));
  const labels: string[] = m.labelIds || [];
  return {
    id: m.id,
    folder,
    from_name: from.name,
    from_email: from.email,
    from_init: (from.name || "?").charAt(0).toUpperCase(),
    avatar_bg: colorFor(from.email),
    to_addr: header(m, "To"),
    subject: header(m, "Subject") || "(제목 없음)",
    preview: (m.snippet || "").replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
    body: "",
    unread: labels.includes("UNREAD"),
    starred: labels.includes("STARRED"),
    attachments: [],
    sent_at: m.internalDate
      ? new Date(Number(m.internalDate)).toISOString()
      : new Date(0).toISOString(),
  };
}

/* ------------------------------------------------------------------- actions */
/** List up to 25 messages for a folder (metadata only — fast). */
export async function listFolder(token: string, folder: string): Promise<GmailMessage[]> {
  const label = LABEL[folder] || "INBOX";
  const list = await gfetch(token, `/messages?maxResults=25&labelIds=${label}`);
  const ids: string[] = (list.messages || []).map((x: any) => x.id);
  const full = await Promise.all(
    ids.map((id) =>
      gfetch(
        token,
        `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      ),
    ),
  );
  return full.map((m) => toMessage(m, folder));
}

/** Fetch the full body + attachments for one message and mark it read. */
export async function getMessage(token: string, id: string, folder: string): Promise<GmailMessage> {
  const m = await gfetch(token, `/messages/${id}?format=full`);
  const base = toMessage(m, folder);
  base.body = extractBody(m.payload) || m.snippet || "(내용 없음)";
  base.attachments = collectAttachments(m.payload);
  return base;
}

export async function markRead(token: string, id: string) {
  await gfetch(token, `/messages/${id}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  });
}

export async function setStar(token: string, id: string, starred: boolean) {
  await gfetch(token, `/messages/${id}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      starred ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] },
    ),
  });
}

export async function trash(token: string, id: string) {
  await gfetch(token, `/messages/${id}/trash`, { method: "POST" });
}

export async function sendMessage(
  token: string,
  from: string,
  to: string,
  subject: string,
  body: string,
) {
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
  await gfetch(token, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64urlEncode(raw) }),
  });
}
