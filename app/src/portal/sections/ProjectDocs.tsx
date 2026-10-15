import { useEffect, useRef, useState, type CSSProperties } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { isMaster } from "@/lib/access";
import { storeUpload, storedValue, attFrom, downloadAttachment } from "@/lib/storage";
import { fmtDT } from "@/lib/dates";
import { useToast } from "../ui";
import type { FileRow } from "@/types/database";

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

function extFromName(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name || "");
  return (m ? m[1] : "FILE").toUpperCase();
}
function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
function extColor(e: string): { bg: string; color: string } {
  const u = e.toUpperCase();
  if (u === "PDF") return { bg: "#FDECEC", color: "#D14343" };
  if (u === "XLSX" || u === "XLS" || u === "CSV") return { bg: "#E9F2EC", color: "#3E8E68" };
  if (u === "DOCX" || u === "DOC") return { bg: "#E0EDFB", color: "#2A6FDB" };
  if (u === "PNG" || u === "JPG" || u === "JPEG") return { bg: "#F3EDFB", color: "#8A54D1" };
  return { bg: "#EEF1EE", color: "#6B7280" };
}

/** 프로젝트 전용 문서함 — files 테이블의 project_id 로 범위를 한정합니다. */
export default function ProjectDocs({ projectId }: { projectId: string }) {
  const flash = useToast();
  const { profile } = useAuth();
  const meName = profile?.name ?? "지경준";
  const canDelete = isMaster(profile) || !isSupabaseConfigured;
  const fileRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setFiles((data as FileRow[]) || []);
        setLoading(false);
      });
  }, [projectId]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setBusy(true);
    for (const file of picked) {
      const ext = extFromName(file.name);
      const size = fmtSize(file.size);
      let storage_path = "";
      try {
        const att = await storeUpload(file, "projects/" + projectId);
        storage_path = storedValue(att);
      } catch {
        /* ignore — 저장 실패 시 경로 없이 기록 */
      }
      let row: FileRow = {
        id: genId(),
        name: file.name,
        ext,
        category: "프로젝트 문서",
        seg_id: null,
        size,
        uploader: meName,
        storage_path,
        grade: 3,
        project_id: projectId,
        created_at: new Date().toISOString(),
      };
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from("files")
            .insert({
              name: file.name,
              ext,
              category: "프로젝트 문서",
              size,
              uploader: meName,
              storage_path,
              grade: 3,
              project_id: projectId,
            })
            .select()
            .single();
          if (data) row = data as FileRow;
        } catch {
          /* ignore */
        }
      }
      setFiles((prev) => [row, ...prev]);
    }
    setBusy(false);
    flash(picked.length > 1 ? `문서 ${picked.length}개를 업로드했습니다` : "문서를 업로드했습니다");
  }

  function download(f: FileRow) {
    downloadAttachment(attFrom(f.name, f.storage_path)).then((r) => {
      if (!r.ok) flash("다운로드 실패: " + (r.error || "알 수 없는 오류"));
    });
  }

  function remove(f: FileRow) {
    if (!canDelete) {
      flash("문서 삭제는 마스터 계정만 가능합니다");
      return;
    }
    if (!window.confirm(`'${f.name}' 문서를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    flash("문서를 삭제했습니다");
    if (isSupabaseConfigured) supabase.from("files").delete().eq("id", f.id).then(() => {});
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "#84908A" }}>
          이 프로젝트에 속한 문서입니다. <b style={{ color: "#0C0F0D" }}>{files.length}</b>개
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="pbtn" style={{ padding: "10px 18px", border: "none", borderRadius: 10, background: busy ? "#9AA29C" : "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: busy ? "default" : "pointer" }}>
          {busy ? "업로드 중…" : "+ 문서 업로드"}
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={onPick} />
      </div>

      {loading ? (
        <div style={empty}>문서를 불러오는 중…</div>
      ) : files.length === 0 ? (
        <div style={empty}>등록된 문서가 없습니다. 상단의 <b>+ 문서 업로드</b>로 추가하세요.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {files.map((f) => {
            const ec = extColor(f.ext);
            return (
              <div key={f.id} className="doc-row" style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 12, padding: "12px 14px" }}>
                <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, background: ec.bg, color: ec.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{f.ext}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "#84908A", marginTop: 2 }}>
                    {f.uploader}{f.size ? " · " + f.size : ""} · {fmtDT(f.created_at)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => download(f)} className="gbtn" style={rowBtn}>↓ 다운로드</button>
                  {canDelete && (
                    <button onClick={() => remove(f)} className="gbtn" style={{ ...rowBtn, border: "1px solid rgba(196,85,62,0.3)", color: "#C4553E" }}>삭제</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const empty: CSSProperties = {
  padding: "48px 16px",
  textAlign: "center",
  color: "#9AA29C",
  fontSize: 14,
  background: "#fff",
  border: "1px solid rgba(12,15,13,0.07)",
  borderRadius: 14,
};
const rowBtn: CSSProperties = {
  padding: "8px 13px",
  border: "1px solid rgba(12,15,13,0.14)",
  borderRadius: 8,
  background: "#fff",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
