import { useEffect, useState, type CSSProperties } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { isMaster } from "@/lib/access";
import { storeUpload, storedValue, attFrom, downloadAttachment } from "@/lib/storage";
import { useToast } from "../ui";
import { demoFiles, demoSegments, demoMe, demoPartners, demoMembers } from "../data/demo";
import type { FileRow, Segment } from "@/types/database";

/** 문서 유형 — '거래계약'은 거래처별, '일반재무'는 태그로 구분합니다. */
const CATEGORIES = ["거래계약", "일반재무", "인허가", "수출서류", "규정", "견적"];

/** 보안등급 — 1(기밀·제한) · 2(관리자) · 3(전체) */
const GRADES: { g: number; label: string; short: string; bg: string; color: string; hint: string }[] = [
  { g: 3, label: "기밀 3급 · 전체 열람", short: "3급", bg: "#E9F2EC", color: "#3E8E68", hint: "파일관리 접근 가능한 전체(팀장급 이상)가 열람합니다." },
  { g: 2, label: "기밀 2급 · 관리자", short: "2급", bg: "#FFF1E0", color: "#C6803A", hint: "관리자(admin) 이상만 열람합니다." },
  { g: 1, label: "기밀 1급 · 제한", short: "1급", bg: "#FDE8E8", color: "#D14343", hint: "마스터·대표와 아래에서 지정한 개별 인원만 열람합니다." },
];
const gradeMeta = (g?: number) => GRADES.find((x) => x.g === (g ?? 3)) || GRADES[0];

type Member = { name: string; email: string; role?: string; is_ceo?: boolean };

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
        거래계약: { bg: "#EDE7FB", color: "#6B45C9" },
        일반재무: { bg: "#E0EDFB", color: "#2A6FDB" },
        인허가: { bg: "#FDE8E8", color: "#D14343" },
        수출서류: { bg: "#E9F2EC", color: "#3E8E68" },
        규정: { bg: "#FFF1E0", color: "#C6803A" },
        견적: { bg: "#E0EDFB", color: "#2A6FDB" },
        계약: { bg: "#EDE7FB", color: "#6B45C9" },
      } as Record<string, { bg: string; color: string }>
    )[c] || { bg: "#EEF1EE", color: "#6B7280" }
  );
}

function extFromName(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  const e = (m ? m[1] : "").toLowerCase();
  if (e === "pdf") return "PDF";
  if (e === "xls" || e === "xlsx" || e === "csv") return "XLS";
  if (e === "doc" || e === "docx" || e === "hwp" || e === "hwpx" || e === "ppt" || e === "pptx")
    return "DOC";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(e)) return "IMG";
  return e ? e.toUpperCase().slice(0, 3) : "FILE";
}
function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
}
type Upload = {
  saveName: string;
  ext: string;
  size: string;
  file: File;
  category: string;
  segId: string;
  partner: string;
  tag: string;
  grade: number;
  allowed: string[];
};

const fld: CSSProperties = {
  marginTop: 6,
  width: "100%",
  padding: "11px 13px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
};
const fldSel: CSSProperties = { ...fld, padding: "11px 10px", background: "#fff" };
const lbl: CSSProperties = { fontSize: 12.5, color: "#4A4C55", fontWeight: 600 };

export default function Files() {
  const flash = useToast();
  const { profile } = useAuth();
  const me = profile ?? demoMe;
  const role = profile?.role ?? "admin"; // demo mode → admin
  const canAccess = role === "admin" || role === "manager";
  const meMaster = isMaster(me);
  const meCeo = !!(profile as { is_ceo?: boolean } | null)?.is_ceo;
  const meEmail = ((me as { email?: string }).email || "").toLowerCase();
  const canDelete = meMaster; // 문서 삭제는 마스터(지경준)만
  const canGrade = meMaster || role === "admin"; // 보안등급 변경은 관리자·마스터
  const live = isSupabaseConfigured; // 실서버 모드면 더미 대신 로딩 표시
  const [loading, setLoading] = useState(live);
  const [files, setFiles] = useState<FileRow[]>(live ? [] : demoFiles);
  const [segments, setSegments] = useState<Segment[]>(demoSegments);
  const [partnerNames, setPartnerNames] = useState<string[]>(
    demoPartners.map((p) => p.name),
  );
  const [members, setMembers] = useState<Member[]>(demoMembers as Member[]);
  const [segFilter, setSegFilter] = useState<string>("전체");
  const [upload, setUpload] = useState<Upload | null>(null);
  const [secEdit, setSecEdit] = useState<{ id: string; grade: number; allowed: string[] } | null>(null);

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
      const { data: pt } = await supabase.from("partners").select("name").order("name");
      if (pt) setPartnerNames((pt as { name: string }[]).map((x) => x.name));
      const { data: mm } = await supabase
        .from("profiles")
        .select("name,email,role,is_ceo")
        .eq("status", "approved")
        .order("created_at");
      if (mm) setMembers(mm as Member[]);
    })()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 보안등급별 열람 권한 (파일관리 접근은 이미 팀장급 이상으로 제한됨)
  function canView(f: FileRow): boolean {
    const g = f.grade ?? 3;
    if (g >= 3) return true;
    if (g === 2) return meMaster || role === "admin";
    // 기밀 1급
    if (meMaster || meCeo) return true;
    return (f.allowed || []).map((x) => String(x).toLowerCase()).includes(meEmail);
  }

  const segColor = (id: string | null) =>
    segments.find((x) => x.id === id)?.color || "#84908A";
  const segName = (id: string | null) =>
    segments.find((x) => x.id === id)?.name || "미분류";

  const chips = [{ id: "전체", name: "전체 부문", color: "#0C0F0D" }, ...segments];
  const filtered = files.filter(
    (f) => (segFilter === "전체" || f.seg_id === segFilter) && canView(f),
  );

  /* ---------------------------------------------------------- upload */
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-picking the same file
    if (!f) return; // 파일이 없으면 아무 것도 만들지 않습니다 (빈 문서 방지)
    const seg = (segFilter !== "전체" ? segFilter : segments[0]?.id) || "wholesale";
    setUpload({
      saveName: f.name,
      ext: extFromName(f.name),
      size: fmtSize(f.size),
      file: f,
      category: "거래계약",
      segId: seg,
      partner: partnerNames[0] || "",
      tag: "",
      grade: 3,
      allowed: [],
    });
  }

  async function confirmUpload() {
    if (!upload) return;
    let name = upload.saveName.trim();
    if (!name) {
      flash("저장할 파일명을 입력하세요");
      return;
    }
    // 확장자 표기가 없으면 원본 확장자를 붙여 알아보기 쉽게
    if (!/\.[a-z0-9]+$/i.test(name) && /\.[a-z0-9]+$/i.test(upload.saveName)) {
      name += upload.saveName.slice(upload.saveName.lastIndexOf("."));
    }
    const partner = upload.category === "거래계약" ? upload.partner : "";
    const tag = upload.category === "일반재무" ? upload.tag.trim() : "";
    const grade = upload.grade;
    // 기밀 1급: 업로더 본인도 자동 포함(자기 문서를 못 보는 상황 방지)
    const allowed =
      grade === 1
        ? Array.from(new Set([...upload.allowed, meEmail].filter(Boolean)))
        : [];
    // 파일 내용을 Storage에 업로드하고 경로만 DB에 저장 (데모면 data URL)
    const att = await storeUpload(upload.file, "files");
    const nf: FileRow = {
      id: "f" + Date.now(),
      name,
      ext: upload.ext,
      category: upload.category,
      seg_id: upload.segId,
      size: upload.size,
      uploader: me.name,
      storage_path: storedValue(att) || null,
      partner,
      tag,
      grade,
      allowed,
      created_at: new Date().toISOString().slice(0, 10),
    };
    setFiles((prev) => [nf, ...prev]);
    setUpload(null);
    flash("파일이 업로드되었습니다");
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from("files")
          .insert({
            name: nf.name,
            ext: nf.ext,
            category: nf.category,
            seg_id: nf.seg_id,
            size: nf.size,
            uploader: nf.uploader,
            storage_path: nf.storage_path,
            partner,
            tag,
            grade,
            allowed,
          })
          .select()
          .single();
        if (data) setFiles((prev) => prev.map((x) => (x.id === nf.id ? (data as FileRow) : x)));
      } catch {
        /* ignore */
      }
    }
  }

  function download(f: FileRow) {
    downloadAttachment(attFrom(f.name, f.storage_path)).then((ok) => {
      if (!ok) flash("이 문서에는 내려받을 파일이 없습니다");
    });
  }

  function saveGrade() {
    if (!secEdit) return;
    const { id, grade } = secEdit;
    const allowed = grade === 1 ? secEdit.allowed : [];
    setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, grade, allowed } : x)));
    setSecEdit(null);
    flash("보안등급을 변경했습니다");
    if (isSupabaseConfigured)
      supabase.from("files").update({ grade, allowed }).eq("id", id).then(() => {});
  }

  function remove(f: FileRow) {
    if (!canDelete) return;
    if (!window.confirm(`'${f.name}' 문서를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    flash("문서를 삭제했습니다");
    if (isSupabaseConfigured)
      supabase.from("files").delete().eq("id", f.id).then(() => {});
  }

  const gridCols = "1fr 116px 84px 58px 76px 82px 112px";

  if (!canAccess) {
    return (
      <div
        className="fade"
        style={{
          maxWidth: 560,
          margin: "60px auto 0",
          textAlign: "center",
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.07)",
          borderRadius: 18,
          padding: "48px 32px",
        }}
      >
        <div style={{ fontSize: 40 }}>🔒</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 14 }}>접근 권한이 없습니다</h3>
        <p style={{ fontSize: 14, color: "#84908A", marginTop: 10, lineHeight: 1.6 }}>
          파일 관리는 <b>팀장급 이상</b>만 이용할 수 있습니다.
          <br />
          권한이 필요하면 관리자에게 문의하세요.
        </p>
      </div>
    );
  }

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

      <label
        className="gbtn"
        style={{
          display: "block",
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
          클릭하여 파일을 선택해 업로드
        </div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: "#84908A" }}>
          저장 파일명 · 유형 · 사업 부문을 지정해 저장합니다 · PDF · XLSX · DOCX · 이미지
        </div>
        <input
          type="file"
          onChange={onPick}
          style={{ display: "none" }}
          accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.hwp,.hwpx,.ppt,.pptx,image/*"
        />
      </label>

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
          <span style={{ textAlign: "right" }}>관리</span>
        </div>

        {filtered.map((f) => {
          const e = extStyle(f.ext);
          const c = catStyle(f.category);
          const sc = segColor(f.seg_id);
          const badge = f.partner || f.tag;
          const gm = gradeMeta(f.grade);
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
                    fontSize: 12,
                    fontWeight: 700,
                    color: e.color,
                  }}
                >
                  {f.ext}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.name}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: 5,
                        background: gm.bg,
                        color: gm.color,
                      }}
                    >
                      🔒 {gm.short}
                    </span>
                    {badge && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: f.partner ? "#6B45C9" : "#2A6FDB",
                        }}
                      >
                        {f.partner ? "🏢 " : "🏷 "}
                        {badge}
                      </span>
                    )}
                  </span>
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                <button
                  onClick={() => download(f)}
                  className="gbtn"
                  title="다운로드"
                  style={{
                    padding: "6px 9px",
                    border: "1px solid rgba(14,123,78,0.35)",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#0E7B4E",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  ⬇
                </button>
                {canGrade && (
                  <button
                    onClick={() =>
                      setSecEdit({ id: f.id, grade: f.grade ?? 3, allowed: f.allowed || [] })
                    }
                    className="gbtn"
                    title="보안등급 변경"
                    style={{
                      padding: "6px 9px",
                      border: "1px solid rgba(12,15,13,0.16)",
                      borderRadius: 8,
                      background: "#fff",
                      color: "#5A5C65",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    🔒
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => remove(f)}
                    className="gbtn"
                    title="삭제 (마스터 전용)"
                    style={{
                      padding: "6px 9px",
                      border: "1px solid rgba(196,85,62,0.3)",
                      borderRadius: 8,
                      background: "#fff",
                      color: "#C4553E",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    🗑
                  </button>
                )}
              </span>
            </div>
          );
        })}

        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#84908A",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                border: "2px solid rgba(14,123,78,0.25)",
                borderTopColor: "#0E7B4E",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }}
            />
            데이터를 불러오는 중…
          </div>
        ) : (
          filtered.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#84908A",
                fontSize: 14,
              }}
            >
              등록된 파일이 없습니다.
            </div>
          )
        )}
      </div>

      {/* ============ 업로드 · 저장 설정 모달 ============ */}
      {upload && (
        <div
          className="modalwrap"
          onClick={() => setUpload(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 210,
            background: "rgba(6,10,8,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflowY: "auto",
            padding: "40px 18px",
          }}
        >
          <div
            className="modalbox"
            onClick={(ev) => ev.stopPropagation()}
            style={{
              width: 520,
              maxWidth: "100%",
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
              <h2 style={{ fontSize: 19, fontWeight: 700 }}>문서 저장</h2>
              <span
                onClick={() => setUpload(null)}
                style={{ cursor: "pointer", fontSize: 22, color: "#84908A", lineHeight: 1 }}
              >
                ×
              </span>
            </div>
            <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 15 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#F4F7F5",
                  borderRadius: 10,
                  padding: "10px 13px",
                  fontSize: 12.5,
                  color: "#3E8E68",
                  fontWeight: 600,
                }}
              >
                📎 원본: {upload.saveName} · {upload.size}
              </div>
              <div>
                <label style={lbl}>저장 파일명</label>
                <input
                  value={upload.saveName}
                  onChange={(e) => setUpload({ ...upload, saveName: e.target.value })}
                  placeholder="예: 방콕메디_공급계약서_2026"
                  style={fld}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>유형</label>
                  <select
                    value={upload.category}
                    onChange={(e) => setUpload({ ...upload, category: e.target.value })}
                    style={fldSel}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>사업 부문</label>
                  <select
                    value={upload.segId}
                    onChange={(e) => setUpload({ ...upload, segId: e.target.value })}
                    style={fldSel}
                  >
                    {segments.map((sg) => (
                      <option key={sg.id} value={sg.id}>
                        {sg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {upload.category === "거래계약" && (
                <div>
                  <label style={lbl}>
                    거래처 <span style={{ color: "#84908A", fontWeight: 500 }}>(거래처별 구분)</span>
                  </label>
                  {partnerNames.length > 0 ? (
                    <select
                      value={upload.partner}
                      onChange={(e) => setUpload({ ...upload, partner: e.target.value })}
                      style={fldSel}
                    >
                      {partnerNames.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={upload.partner}
                      onChange={(e) => setUpload({ ...upload, partner: e.target.value })}
                      placeholder="거래처명 입력"
                      style={fld}
                    />
                  )}
                </div>
              )}

              {upload.category === "일반재무" && (
                <div>
                  <label style={lbl}>
                    태그 <span style={{ color: "#84908A", fontWeight: 500 }}>(예: 급여, 세금계산서, 임대료)</span>
                  </label>
                  <input
                    value={upload.tag}
                    onChange={(e) => setUpload({ ...upload, tag: e.target.value })}
                    placeholder="태그를 입력하세요"
                    style={fld}
                  />
                </div>
              )}

              {/* 보안등급 */}
              <div>
                <label style={lbl}>보안등급</label>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {GRADES.map((gr) => {
                    const on = upload.grade === gr.g;
                    return (
                      <button
                        key={gr.g}
                        type="button"
                        onClick={() => setUpload({ ...upload, grade: gr.g })}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 9,
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          border: `1.5px solid ${on ? gr.color : "rgba(12,15,13,0.14)"}`,
                          background: on ? gr.bg : "#fff",
                          color: on ? gr.color : "#5A5C65",
                        }}
                      >
                        🔒 기밀 {gr.g}급
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: "#84908A" }}>
                  {gradeMeta(upload.grade).hint}
                </div>
                {upload.grade === 1 && (
                  <div style={{ marginTop: 10 }}>
                    <label style={lbl}>
                      개별 열람 허용{" "}
                      <span style={{ color: "#84908A", fontWeight: 500 }}>
                        (마스터·대표는 자동 포함)
                      </span>
                    </label>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
                      {members
                        .filter((m) => !isMaster(m) && !m.is_ceo)
                        .map((m) => {
                          const on = upload.allowed.includes(m.email);
                          return (
                            <button
                              key={m.email}
                              type="button"
                              onClick={() =>
                                setUpload({
                                  ...upload,
                                  allowed: on
                                    ? upload.allowed.filter((x) => x !== m.email)
                                    : [...upload.allowed, m.email],
                                })
                              }
                              style={{
                                padding: "6px 12px",
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                border: `1.5px solid ${on ? "#0E7B4E" : "rgba(12,15,13,0.14)"}`,
                                background: on ? "#0E7B4E" : "#fff",
                                color: on ? "#fff" : "#4A4C55",
                              }}
                            >
                              {on ? "✓ " : ""}
                              {m.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
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
                onClick={() => setUpload(null)}
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
                onClick={confirmUpload}
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
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 보안등급 변경 모달 ============ */}
      {secEdit && (
        <div
          className="modalwrap"
          onClick={() => setSecEdit(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 210,
            background: "rgba(6,10,8,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflowY: "auto",
            padding: "50px 18px",
          }}
        >
          <div
            className="modalbox"
            onClick={(ev) => ev.stopPropagation()}
            style={{ width: 480, maxWidth: "100%", background: "#fff", borderRadius: 18, overflow: "hidden" }}
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
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>🔒 보안등급 변경</h2>
              <span
                onClick={() => setSecEdit(null)}
                style={{ cursor: "pointer", fontSize: 22, color: "#84908A", lineHeight: 1 }}
              >
                ×
              </span>
            </div>
            <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {GRADES.map((gr) => {
                  const on = secEdit.grade === gr.g;
                  return (
                    <button
                      key={gr.g}
                      type="button"
                      onClick={() => setSecEdit({ ...secEdit, grade: gr.g })}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 9,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: `1.5px solid ${on ? gr.color : "rgba(12,15,13,0.14)"}`,
                        background: on ? gr.bg : "#fff",
                        color: on ? gr.color : "#5A5C65",
                      }}
                    >
                      🔒 기밀 {gr.g}급
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11.5, color: "#84908A" }}>{gradeMeta(secEdit.grade).hint}</div>
              {secEdit.grade === 1 && (
                <div>
                  <label style={lbl}>
                    개별 열람 허용{" "}
                    <span style={{ color: "#84908A", fontWeight: 500 }}>(마스터·대표는 자동 포함)</span>
                  </label>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
                    {members
                      .filter((m) => !isMaster(m) && !m.is_ceo)
                      .map((m) => {
                        const on = secEdit.allowed.includes(m.email);
                        return (
                          <button
                            key={m.email}
                            type="button"
                            onClick={() =>
                              setSecEdit({
                                ...secEdit,
                                allowed: on
                                  ? secEdit.allowed.filter((x) => x !== m.email)
                                  : [...secEdit.allowed, m.email],
                              })
                            }
                            style={{
                              padding: "6px 12px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              border: `1.5px solid ${on ? "#0E7B4E" : "rgba(12,15,13,0.14)"}`,
                              background: on ? "#0E7B4E" : "#fff",
                              color: on ? "#fff" : "#4A4C55",
                            }}
                          >
                            {on ? "✓ " : ""}
                            {m.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
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
                onClick={() => setSecEdit(null)}
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
                onClick={saveGrade}
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
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
