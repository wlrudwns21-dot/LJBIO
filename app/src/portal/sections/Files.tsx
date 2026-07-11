import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "../ui";
import { demoFiles, demoSegments, demoMe } from "../data/demo";
import type { FileRow, Segment } from "@/types/database";

function extStyle(e: string) {
  return e === "PDF"
    ? { bg: "#FDE8E8", color: "#D14343" }
    : e === "XLS"
      ? { bg: "#E4F5EA", color: "#1E9E5A" }
      : e === "DOC"
        ? { bg: "#E0EDFB", color: "#2A6FDB" }
        : { bg: "#EEF1EE", color: "#6B7280" };
}

function catStyle(c: string) {
  return (
    (
      {
        인허가: { bg: "#FDE8E8", color: "#D14343" },
        수출서류: { bg: "#E9F2EC", color: "#3E8E68" },
        규정: { bg: "#FFF1E0", color: "#C6803A" },
        계약: { bg: "#EDE7FB", color: "#6B45C9" },
        견적: { bg: "#E0EDFB", color: "#2A6FDB" },
      } as Record<string, { bg: string; color: string }>
    )[c] || { bg: "#EEF1EE", color: "#6B7280" }
  );
}

export default function Files() {
  const flash = useToast();
  const [files, setFiles] = useState<FileRow[]>(demoFiles);
  const [segments, setSegments] = useState<Segment[]>(demoSegments);
  const [segFilter, setSegFilter] = useState<string>("전체");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: sg } = await supabase.from("segments").select("*").order("sort");
      if (sg) setSegments(sg as Segment[]);
      const { data: f } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });
      if (f) setFiles(f as FileRow[]);
    })().catch(() => {});
  }, []);

  const segColor = (id: string | null) =>
    segments.find((x) => x.id === id)?.color || "#84908A";
  const segName = (id: string | null) =>
    segments.find((x) => x.id === id)?.name || "미분류";

  const chips = [
    { id: "전체", name: "전체 부문", color: "#0C0F0D" },
    ...segments,
  ];

  const filtered = files.filter(
    (f) => segFilter === "전체" || f.seg_id === segFilter,
  );

  async function addFile() {
    const seg =
      (segFilter !== "전체" ? segFilter : segments[0]?.id) || "wholesale";
    const nf: FileRow = {
      id: "f" + Date.now(),
      name: "신규_업로드_문서_" + (files.length + 1) + ".pdf",
      ext: "PDF",
      category: "수출서류",
      seg_id: seg,
      size: "1.2 MB",
      uploader: demoMe.name,
      storage_path: null,
      created_at: "2026-07-11",
    };
    setFiles([nf, ...files]);
    flash("파일이 업로드되었습니다");
    if (isSupabaseConfigured) {
      await supabase
        .from("files")
        .insert({
          name: nf.name,
          ext: nf.ext,
          category: nf.category,
          seg_id: nf.seg_id,
          size: nf.size,
          uploader: nf.uploader,
        })
        .then(() => {});
    }
  }

  const gridCols = "1fr 132px 100px 72px 90px 104px 34px";

  return (
    <div className="fade" style={{ maxWidth: 1160, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {chips.map((sg) => {
          const active = segFilter === sg.id;
          return (
            <span
              key={sg.id}
              onClick={() => setSegFilter(sg.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: `1px solid ${active ? "#0C0F0D" : "rgba(12,15,13,0.14)"}`,
                background: active ? "#0C0F0D" : "#fff",
                color: active ? "#fff" : "#4A4C55",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: sg.color,
                  display: sg.id === "전체" ? "none" : undefined,
                }}
              />
              {sg.name}
            </span>
          );
        })}
      </div>

      <div
        onClick={addFile}
        className="gbtn"
        style={{
          border: "2px dashed rgba(14,123,78,0.35)",
          borderRadius: 16,
          padding: 34,
          textAlign: "center",
          cursor: "pointer",
          background: "rgba(14,123,78,0.03)",
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 30 }}>📤</div>
        <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600 }}>
          파일을 끌어다 놓거나 클릭하여 업로드
        </div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: "#84908A" }}>
          선택한 사업 부문에 저장됩니다 · PDF · XLSX · DOCX · 이미지 — 최대 50MB
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.07)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          className="g-files"
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: 12,
            padding: "13px 22px",
            background: "rgba(12,15,13,0.03)",
            fontSize: 12,
            fontWeight: 600,
            color: "#84908A",
          }}
        >
          <span>파일명</span>
          <span>사업 부문</span>
          <span>분류</span>
          <span>크기</span>
          <span>업로더</span>
          <span>수정일</span>
          <span></span>
        </div>

        {filtered.map((f) => {
          const e = extStyle(f.ext);
          const c = catStyle(f.category);
          const sc = segColor(f.seg_id);
          return (
            <div
              key={f.id}
              className="row-h g-files"
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: 12,
                padding: "15px 22px",
                borderTop: "1px solid rgba(12,15,13,0.06)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  fontSize: 14,
                  fontWeight: 500,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: 9,
                    background: e.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: e.color,
                  }}
                >
                  {f.ext}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.name}
                </span>
              </span>
              <span style={{ fontSize: 12.5 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: sc + "1F",
                    color: sc,
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                >
                  {segName(f.seg_id)}
                </span>
              </span>
              <span style={{ fontSize: 12.5 }}>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 6,
                    background: c.bg,
                    color: c.color,
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                >
                  {f.category}
                </span>
              </span>
              <span className="mono" style={{ fontSize: 12.5, color: "#5A5C65" }}>
                {f.size}
              </span>
              <span style={{ fontSize: 12.5, color: "#5A5C65" }}>{f.uploader}</span>
              <span style={{ fontSize: 12.5, color: "#84908A" }}>
                {(f as { date?: string }).date || f.created_at}
              </span>
              <span
                style={{
                  fontSize: 15,
                  color: "#84908A",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                ⋯
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#84908A",
              fontSize: 14,
            }}
          >
            이 사업 부문에 등록된 파일이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
