// Shared access / identity helpers for the employee portal.
import type { Attachment } from "@/types/database";

/** 마스터(총괄) 계정 — 모든 결재 문서를 열람하고, 결제 권한·대표자를 지정하며,
 *  문서관리에서 파일을 삭제할 수 있는 유일한 계정입니다. */
export const MASTER_EMAIL = "kyungjun.ji@bio-lj.com";

/** 대표자(is_ceo) 미지정 시 사용하는 기본 최종 승인자. */
export const DEFAULT_CEO = {
  name: "이일형",
  email: "ilhyung.lee@bio-lj.com",
  init: "이",
  avatar_bg: "#0C0F0D",
};

const norm = (e?: string | null) => (e || "").trim().toLowerCase();

export const isMaster = (p?: { email?: string | null } | null) =>
  norm(p?.email) === MASTER_EMAIL;

/** 거래처 문서 슬롯은 과거엔 단일 객체, 지금은 배열입니다. 항상 배열로 정규화. */
export function asFiles(
  v: Attachment | Attachment[] | null | undefined,
): Attachment[] {
  if (v == null) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v];
}

/** data URL(또는 URL)을 파일로 저장(다운로드). */
export function downloadFile(att: Attachment) {
  if (!att?.url) return false;
  const a = document.createElement("a");
  a.href = att.url;
  a.download = att.name || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
