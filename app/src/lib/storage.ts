// Supabase Storage helpers — 파일을 DB(base64)가 아니라 'documents' 버킷에 저장합니다.
// 데모 모드(!isSupabaseConfigured)에서는 저장소가 없으므로 data URL로 대체합니다.
import { supabase, isSupabaseConfigured } from "./supabase";
import { asFiles } from "./access";
import type { Attachment } from "@/types/database";

export const BUCKET = "documents";

const rnd = () => Math.random().toString(36).slice(2, 10);

export function isDataUrl(s?: string | null): boolean {
  return !!s && s.startsWith("data:");
}
/** 저장된 문자열이 실제 Storage 경로인지(= data URL도 http도 아님) */
export function isStoragePath(s?: string | null): boolean {
  return !!s && !s.startsWith("data:") && !/^https?:\/\//.test(s);
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => resolve("");
    r.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = (head.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(b64 || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes as unknown as BlobPart], { type: mime });
}

// Storage 오브젝트 키는 ASCII만 허용됩니다(한글 파일명은 "Invalid key" 오류).
// 원본 파일명(한글 포함)은 DB의 name 필드에 그대로 보존되고, 여기선 키만 안전화합니다.
function safeName(name: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name || "");
  const ext = m ? "." + m[1].toLowerCase() : "";
  let base = (m ? (name || "").slice(0, m.index) : name || "")
    .replace(/[^A-Za-z0-9._-]+/g, "-") // 비ASCII·공백·특수문자 → '-'
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 48);
  if (!/[A-Za-z0-9]/.test(base)) base = ""; // 영문/숫자가 하나도 없으면 'file' 사용
  return (base || "file") + ext;
}

/** Storage에 업로드. { path, error } 반환 (실패 시 path=null, error=사유) */
export async function uploadToStorage(
  blob: Blob,
  folder: string,
  name: string,
): Promise<{ path: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { path: null, error: "no-storage" };
  const path = `${folder}/${Date.now()}-${rnd()}-${safeName(name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: false,
    contentType: blob.type || undefined,
  });
  if (error) return { path: null, error: error.message || String(error) };
  return { path, error: null };
}

/** 업로드용: 라이브면 Storage 경로를, 데모/실패면 data URL을 담은 첨부를 반환 */
export async function storeUpload(file: File, folder: string): Promise<Attachment> {
  if (isSupabaseConfigured) {
    const { path } = await uploadToStorage(file, folder, file.name);
    if (path) return { name: file.name, path };
  }
  return { name: file.name, url: await fileToDataUrl(file) };
}

/** 단일값 컬럼(files.storage_path, contract_types.template_url)에 저장할 문자열 */
export function storedValue(att: Attachment): string {
  return att.path || att.url || "";
}
/** 단일값 컬럼 문자열 → 첨부 객체 (경로/데이터URL 자동 구분) */
export function attFrom(name: string, stored?: string | null): Attachment {
  if (!stored) return { name };
  return isDataUrl(stored) ? { name, url: stored } : { name, path: stored };
}

function triggerDownload(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const isMobile = () =>
  typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/** 첨부 다운로드 — 모바일은 서명 URL(다운로드 강제)로, 데스크톱은 blob 저장으로 */
export async function downloadAttachment(att?: Attachment | null): Promise<boolean> {
  if (!att) return false;

  if (att.path && isSupabaseConfigured) {
    if (isMobile()) {
      // 사용자 제스처 유지를 위해 빈 탭을 먼저 열고, 서명 URL을 넣습니다.
      const w = window.open("", "_blank");
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(att.path, 120, { download: att.name || true });
      const url = data?.signedUrl;
      if (url) {
        if (w) w.location.href = url;
        else window.location.href = url;
        return true;
      }
      if (w) w.close();
      return false;
    }
    // 데스크톱: 인증 다운로드 후 파일로 저장
    const { data, error } = await supabase.storage.from(BUCKET).download(att.path);
    if (error || !data) return false;
    const url = URL.createObjectURL(data);
    triggerDownload(url, att.name);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  if (att.url) {
    // 레거시 data URL
    if (isMobile()) {
      window.open(att.url, "_blank");
      return true;
    }
    triggerDownload(att.url, att.name);
    return true;
  }
  return false;
}

/** 이미지 미리보기용 서명 URL (data URL이면 그대로, Storage면 서명 URL) */
export async function previewUrl(att?: Attachment | null): Promise<string | null> {
  if (!att) return null;
  if (att.url) return att.url;
  if (att.path && isSupabaseConfigured) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(att.path, 300);
    return data?.signedUrl || null;
  }
  return null;
}

/** 기존 DB(base64) 파일들을 Storage로 이전. 이미 이전된 항목은 건너뜁니다. */
export async function migrateAllToStorage(
  log: (msg: string) => void,
): Promise<{ moved: number; failed: number; errors: string[] }> {
  if (!isSupabaseConfigured) return { moved: 0, failed: 0, errors: [] };
  let moved = 0;
  let failed = 0;
  const errors: string[] = [];
  const noteErr = (msg: string) => {
    if (msg && errors.length < 5 && !errors.includes(msg)) errors.push(msg);
  };
  const move = async (dataUrl: string, folder: string, name: string) => {
    try {
      const { path, error } = await uploadToStorage(dataUrlToBlob(dataUrl), folder, name);
      if (path) {
        moved++;
        return path;
      }
      if (error) noteErr(error);
    } catch (e) {
      noteErr((e as { message?: string })?.message || String(e));
    }
    failed++;
    return null;
  };

  // 1) 문서관리 파일
  const { data: files } = await supabase.from("files").select("id,name,storage_path");
  for (const f of (files as { id: string; name: string; storage_path: string | null }[]) || []) {
    if (isDataUrl(f.storage_path)) {
      const path = await move(f.storage_path as string, "files", f.name || "file");
      if (path) await supabase.from("files").update({ storage_path: path }).eq("id", f.id);
    }
  }
  log("문서관리 파일 이전 완료");

  // 2) 거래처 문서
  const { data: partners } = await supabase.from("partners").select("id,docs");
  for (const p of (partners as { id: string; docs: Record<string, unknown> }[]) || []) {
    const docs = (p.docs || {}) as Record<string, unknown>;
    let changed = false;
    for (const slot of ["bizReg", "bankbook", "contract"]) {
      const arr = asFiles(docs[slot] as Attachment | Attachment[] | null);
      const out: Attachment[] = [];
      for (const a of arr) {
        if (isDataUrl(a?.url)) {
          const path = await move(a.url as string, `partners/${p.id}`, a.name || "doc");
          out.push(path ? { name: a.name, path } : a);
          changed = changed || !!path;
        } else out.push(a);
      }
      docs[slot] = out;
    }
    if (changed) await supabase.from("partners").update({ docs }).eq("id", p.id);
  }
  log("거래처 문서 이전 완료");

  // 3) 전자결재 첨부
  const { data: apps } = await supabase.from("approvals").select("id,attachments");
  for (const ap of (apps as { id: string; attachments: Attachment[] }[]) || []) {
    const arr = ap.attachments || [];
    let changed = false;
    const out: Attachment[] = [];
    for (const a of arr) {
      if (isDataUrl(a?.url)) {
        const path = await move(a.url as string, `approvals/${ap.id}`, a.name || "file");
        out.push(path ? { name: a.name, path } : a);
        changed = changed || !!path;
      } else out.push(a);
    }
    if (changed) await supabase.from("approvals").update({ attachments: out }).eq("id", ap.id);
  }
  log("전자결재 첨부 이전 완료");

  // 4) 계약서 양식
  const { data: cts } = await supabase
    .from("contract_types")
    .select("id,name,template_url,template_name");
  for (const c of (cts as { id: string; name: string; template_url: string | null; template_name: string | null }[]) || []) {
    if (isDataUrl(c.template_url)) {
      const path = await move(c.template_url as string, "contracts", c.template_name || c.name || "template");
      if (path) await supabase.from("contract_types").update({ template_url: path }).eq("id", c.id);
    }
  }
  log("계약서 양식 이전 완료");

  return { moved, failed, errors };
}
