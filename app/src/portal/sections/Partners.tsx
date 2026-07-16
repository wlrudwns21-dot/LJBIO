import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { asFiles } from "@/lib/access";
import { storeUpload, downloadAttachment } from "@/lib/storage";
import { useToast } from "../ui";
import { demoPartners, demoContractTypes, demoSegments } from "../data/demo";
import type { Partner, Segment, ContractType, Attachment } from "@/types/database";

// 계약서는 보안상 거래처에서 분리(문서관리로 이동) — 사업자등록증·통장사본만 첨부합니다.
type DocSlot = "bizReg" | "bankbook";
type EditorDocs = Record<DocSlot, Attachment[]>;

type Editor = {
  id: string | null;
  name: string;
  rep: string;
  biz_no: string;
  biz_type: string;
  biz_item: string;
  address: string;
  phone: string;
  contact_name: string;
  contact_email: string;
  deal_type: string;
  seg_id: string | null;
  contract_type: string;
  memo: string;
  docs: EditorDocs;
  addingCt?: boolean;
  ctDraft?: string;
};

const fld = {
  marginTop: 6,
  width: "100%",
  padding: "11px 13px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
} as const;
const fldSel = { ...fld, padding: "11px 10px", background: "#fff" } as const;
const lbl = { fontSize: 12.5, color: "#4A4C55", fontWeight: 600 } as const;
const sectionHdr = {
  fontSize: 11.5,
  fontWeight: 700,
  color: "#0E7B4E",
  letterSpacing: "0.03em",
} as const;

function dealStyle(t: string) {
  return t === "매출"
    ? { bg: "#E9F2EC", color: "#3E8E68" }
    : t === "매입"
      ? { bg: "#E0EDFB", color: "#2A6FDB" }
      : { bg: "#EDE7FB", color: "#6B45C9" };
}

const DOC_DEFS: [DocSlot, string, string][] = [
  ["bizReg", "사업자등록증", "사업자등록증 사본 (PDF·이미지) · 복수 첨부 가능"],
  ["bankbook", "통장 사본", "대금 정산 계좌 통장 사본 · 복수 첨부 가능"],
];
const CHIP_DEFS: [DocSlot, string][] = [
  ["bizReg", "사업자등록증"],
  ["bankbook", "통장사본"],
];

function uploadAll(files: File[]): Promise<Attachment[]> {
  return Promise.all(files.map((f) => storeUpload(f, "partners")));
}

async function persist(fn: () => PromiseLike<unknown>) {
  if (isSupabaseConfigured) await fn();
}

export default function Partners() {
  const flash = useToast();
  const [partners, setPartners] = useState<Partner[]>(demoPartners);
  const [contractTypes, setContractTypes] = useState<string[]>(demoContractTypes);
  const [segments, setSegments] = useState<Segment[]>(demoSegments);
  const [filter, setFilter] = useState("전체");
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: p } = await supabase.from("partners").select("*");
      if (p) setPartners(p as Partner[]);
      const { data: c } = await supabase.from("contract_types").select("*").order("sort");
      if (c) setContractTypes((c as ContractType[]).map((x) => x.name));
      const { data: sg } = await supabase.from("segments").select("*").order("sort");
      if (sg) setSegments(sg as Segment[]);
    })().catch(() => {});
  }, []);

  const segColor = (id: string | null) => segments.find((s) => s.id === id)?.color || "#84908A";
  const segName = (id: string | null) => segments.find((s) => s.id === id)?.name || "미분류";

  // 거래처 카드에서 문서 칩을 눌러 바로 다운로드
  async function downloadSlot(p: Partner, slot: DocSlot) {
    const files = asFiles((p.docs || {})[slot]).filter((f) => f && (f.url || f.path));
    if (!files.length) {
      flash("내려받을 파일이 없습니다. 거래처를 열어 파일을 업로드해 주세요.");
      return;
    }
    const results = await Promise.all(files.map((f) => downloadAttachment(f)));
    const fail = results.find((r) => !r.ok);
    if (fail) flash("다운로드 실패: " + (fail.error || "알 수 없는 오류"));
    else flash(files.length + "개 파일을 내려받았습니다");
  }

  const filters: [string, string][] = [
    ["전체", "전체 거래처"],
    ["매출", "매출처"],
    ["매입", "매입처"],
  ];
  const list = partners.filter((p) => filter === "전체" || (p.deal_type || "").indexOf(filter) >= 0);

  const newPartner = () =>
    setEditor({
      id: null,
      name: "",
      rep: "",
      biz_no: "",
      biz_type: "",
      biz_item: "",
      address: "",
      phone: "",
      contact_name: "",
      contact_email: "",
      deal_type: "매출",
      seg_id: segments[0]?.id || "wholesale",
      contract_type: contractTypes[0] || "",
      memo: "",
      docs: { bizReg: [], bankbook: [] },
    });

  const openPartner = (p: Partner) =>
    setEditor({
      id: p.id,
      name: p.name,
      rep: p.rep,
      biz_no: p.biz_no,
      biz_type: p.biz_type,
      biz_item: p.biz_item,
      address: p.address,
      phone: p.phone,
      contact_name: p.contact_name,
      contact_email: p.contact_email,
      deal_type: p.deal_type,
      seg_id: p.seg_id,
      contract_type: p.contract_type,
      memo: p.memo,
      docs: {
        bizReg: asFiles(p.docs?.bizReg),
        bankbook: asFiles(p.docs?.bankbook),
      },
    });

  const set = <K extends keyof Editor>(k: K, v: Editor[K]) =>
    setEditor((e) => (e ? { ...e, [k]: v } : e));

  const onDoc = (slot: DocSlot) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // 같은 파일 다시 선택 가능 + 추가 첨부
    if (!picked.length) return;
    const added = await uploadAll(picked);
    setEditor((ed) =>
      ed ? { ...ed, docs: { ...ed.docs, [slot]: [...ed.docs[slot], ...added] } } : ed,
    );
    flash(added.length + "개 문서를 첨부했습니다");
  };
  const removeDoc = (slot: DocSlot, idx: number) =>
    setEditor((ed) =>
      ed
        ? { ...ed, docs: { ...ed.docs, [slot]: ed.docs[slot].filter((_, i) => i !== idx) } }
        : ed,
    );

  const confirmAddCt = () => {
    if (!editor) return;
    const nm = (editor.ctDraft || "").trim();
    if (!nm) return;
    if (!contractTypes.includes(nm)) {
      setContractTypes((cts) => [...cts, nm]);
      persist(() =>
        supabase.from("contract_types").insert({ name: nm, sort: contractTypes.length }),
      ).catch(() => {});
    }
    set("contract_type", nm);
    setEditor((e) => (e ? { ...e, contract_type: nm, addingCt: false, ctDraft: "" } : e));
    flash("계약서 유형을 추가했습니다");
  };

  const savePartner = async () => {
    if (!editor) return;
    if (!(editor.name || "").trim()) {
      flash("상호(거래처명)를 입력하세요");
      return;
    }
    const payload = {
      name: editor.name,
      rep: editor.rep,
      biz_no: editor.biz_no,
      biz_type: editor.biz_type,
      biz_item: editor.biz_item,
      address: editor.address,
      phone: editor.phone,
      contact_name: editor.contact_name,
      contact_email: editor.contact_email,
      deal_type: editor.deal_type as Partner["deal_type"],
      seg_id: editor.seg_id,
      contract_type: editor.contract_type,
      memo: editor.memo,
      docs: editor.docs,
    };
    if (editor.id != null) {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("partners").update(payload).eq("id", editor.id);
        if (error) {
          flash("저장 실패: " + error.message);
          return; // 모달 유지 — 입력 내용 보존
        }
      }
      setPartners((ps) => ps.map((p) => (p.id === editor.id ? { ...p, ...payload } : p)));
      setEditor(null);
      flash("거래처 정보를 수정했습니다");
    } else {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("partners")
          .insert(payload)
          .select()
          .single();
        if (error) {
          flash("등록 실패: " + error.message);
          return; // 모달 유지 — 입력 내용 보존
        }
        if (data) setPartners((ps) => [data as Partner, ...ps]);
      } else {
        const nid = String(
          partners.reduce((a, p) => Math.max(a, Number(p.id) || 0), 0) + 1,
        );
        setPartners((ps) => [
          { ...payload, id: nid, created_at: "2026-07-11" } as Partner,
          ...ps,
        ]);
      }
      setEditor(null);
      flash("거래처를 등록했습니다");
    }
  };

  return (
    <div className="fade" style={{ maxWidth: 1160, margin: "0 auto" }}>
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
          onClick={newPartner}
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
          + 거래처 등록
        </button>
      </div>

      <div
        className="g-2col"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
      >
        {list.map((p) => {
          const ds = dealStyle(p.deal_type);
          const sc = segColor(p.seg_id);
          const docs = p.docs || { bizReg: null, bankbook: null };
          const docCount = CHIP_DEFS.filter(([k]) => asFiles(docs[k]).length > 0).length;
          return (
            <div
              key={p.id}
              onClick={() => openPartner(p)}
              className="lift"
              style={{
                background: "#fff",
                border: "1px solid rgba(12,15,13,0.08)",
                borderRadius: 16,
                padding: 20,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: sc,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {(p.name || "?").charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
                  <div
                    style={{
                      marginTop: 7,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 20,
                        background: ds.bg,
                        color: ds.color,
                      }}
                    >
                      {p.deal_type}
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
                      {segName(p.seg_id)}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 15,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12.5,
                  color: "#5A5C65",
                }}
              >
                {[
                  ["대표자", p.rep, false],
                  ["사업자번호", p.biz_no, true],
                  ["담당자", p.contact_name, false],
                  ["계약유형", p.contract_type, false],
                  ["전화", p.phone, true],
                ].map(([label, val, mono], i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#9AA29C", width: 66, flexShrink: 0 }}>{label}</span>
                    <span
                      className={mono ? "mono" : undefined}
                      style={
                        label === "계약유형"
                          ? { fontWeight: 600, color: "#0C0F0D" }
                          : undefined
                      }
                    >
                      {val as string}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 13,
                  borderTop: "1px solid rgba(12,15,13,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 11.5, color: "#84908A", marginRight: 2 }}>문서</span>
                {CHIP_DEFS.map(([k, label]) => {
                  const files = asFiles(docs[k]);
                  const has = files.length > 0;
                  const dlable = has && files.some((f) => f && (f.url || f.path));
                  return (
                    <span
                      key={k}
                      onClick={
                        has
                          ? (ev) => {
                              ev.stopPropagation();
                              downloadSlot(p, k);
                            }
                          : undefined
                      }
                      title={dlable ? label + " 다운로드" : undefined}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: has ? "pointer" : "default",
                        ...(has
                          ? { background: "#E9F2EC", color: "#3E8E68" }
                          : { background: "#F0F1F0", color: "#9AA29C" }),
                      }}
                    >
                      {has ? "⬇" : "○"} {label}
                      {files.length > 1 && (
                        <span style={{ opacity: 0.7 }}>({files.length})</span>
                      )}
                    </span>
                  );
                })}
                <span
                  className="mono"
                  style={{ marginLeft: "auto", fontSize: 11.5, color: "#84908A" }}
                >
                  {docCount}/2
                </span>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              padding: 50,
              textAlign: "center",
              color: "#84908A",
              fontSize: 14,
              background: "#fff",
              border: "1px solid rgba(12,15,13,0.07)",
              borderRadius: 16,
            }}
          >
            등록된 거래처가 없습니다.
          </div>
        )}
      </div>

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
            overflowY: "auto",
            padding: "30px 18px",
          }}
        >
          <div
            className="modalbox"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 680,
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
                position: "sticky",
                top: 0,
                background: "#fff",
                zIndex: 2,
              }}
            >
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {editor.id == null ? "거래처 등록" : "거래처 정보 수정"}
              </h2>
              <span
                onClick={() => setEditor(null)}
                style={{ cursor: "pointer", fontSize: 22, color: "#84908A", lineHeight: 1 }}
              >
                ×
              </span>
            </div>

            <div
              className="m-pad-lg"
              style={{
                padding: "22px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={sectionHdr}>기본 정보</div>
              <div>
                <label style={lbl}>상호 (거래처명)</label>
                <input
                  className="fld"
                  value={editor.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="예: Bangkok MediTrade Co., Ltd."
                  style={fld}
                />
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>대표자</label>
                  <input
                    className="fld"
                    value={editor.rep}
                    onChange={(e) => set("rep", e.target.value)}
                    style={fld}
                  />
                </div>
                <div>
                  <label style={lbl}>사업자등록번호</label>
                  <input
                    className="fld"
                    value={editor.biz_no}
                    onChange={(e) => set("biz_no", e.target.value)}
                    placeholder="000-00-00000"
                    style={fld}
                  />
                </div>
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>업태</label>
                  <input
                    className="fld"
                    value={editor.biz_type}
                    onChange={(e) => set("biz_type", e.target.value)}
                    placeholder="예: 도소매"
                    style={fld}
                  />
                </div>
                <div>
                  <label style={lbl}>종목</label>
                  <input
                    className="fld"
                    value={editor.biz_item}
                    onChange={(e) => set("biz_item", e.target.value)}
                    placeholder="예: 의약품"
                    style={fld}
                  />
                </div>
              </div>
              <div>
                <label style={lbl}>주소</label>
                <input
                  className="fld"
                  value={editor.address}
                  onChange={(e) => set("address", e.target.value)}
                  style={fld}
                />
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>대표 전화</label>
                  <input
                    className="fld"
                    value={editor.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    style={fld}
                  />
                </div>
                <div>
                  <label style={lbl}>거래 유형</label>
                  <select
                    className="fld"
                    value={editor.deal_type}
                    onChange={(e) => set("deal_type", e.target.value)}
                    style={fldSel}
                  >
                    <option value="매출">매출처 (판매)</option>
                    <option value="매입">매입처 (구매)</option>
                    <option value="매입·매출">매입·매출 (양방향)</option>
                  </select>
                </div>
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>담당자명</label>
                  <input
                    className="fld"
                    value={editor.contact_name}
                    onChange={(e) => set("contact_name", e.target.value)}
                    style={fld}
                  />
                </div>
                <div>
                  <label style={lbl}>담당자 이메일</label>
                  <input
                    className="fld"
                    value={editor.contact_email}
                    onChange={(e) => set("contact_email", e.target.value)}
                    style={fld}
                  />
                </div>
              </div>

              <div
                style={{
                  ...sectionHdr,
                  marginTop: 6,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(12,15,13,0.08)",
                }}
              >
                분류 · 계약
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>사업 부문</label>
                  <select
                    className="fld"
                    value={editor.seg_id || ""}
                    onChange={(e) => set("seg_id", e.target.value)}
                    style={fldSel}
                  >
                    {segments.map((sg) => (
                      <option key={sg.id} value={sg.id}>
                        {sg.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      ...lbl,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    계약서 유형{" "}
                    <span
                      onClick={() =>
                        setEditor((ed) =>
                          ed ? { ...ed, addingCt: !ed.addingCt, ctDraft: "" } : ed,
                        )
                      }
                      style={{
                        fontSize: 11.5,
                        color: "#0E7B4E",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      + 유형 추가
                    </span>
                  </label>
                  <select
                    className="fld"
                    value={editor.contract_type}
                    onChange={(e) => set("contract_type", e.target.value)}
                    style={fldSel}
                  >
                    {contractTypes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {editor.addingCt && (
                <div
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                    background: "#F4F7F5",
                    borderRadius: 10,
                    padding: "11px 13px",
                  }}
                >
                  <input
                    className="fld"
                    value={editor.ctDraft || ""}
                    onChange={(e) => set("ctDraft", e.target.value)}
                    placeholder="새 계약서 유형 이름 (예: 대리점 계약서)"
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      border: "1.5px solid rgba(12,15,13,0.12)",
                      borderRadius: 8,
                      fontSize: 13.5,
                    }}
                  />
                  <button
                    onClick={confirmAddCt}
                    className="pbtn"
                    style={{
                      padding: "9px 16px",
                      border: "none",
                      borderRadius: 8,
                      background: "#0C0F0D",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    추가
                  </button>
                  <button
                    onClick={() =>
                      setEditor((ed) => (ed ? { ...ed, addingCt: false, ctDraft: "" } : ed))
                    }
                    className="gbtn"
                    style={{
                      padding: "9px 14px",
                      border: "1px solid rgba(12,15,13,0.14)",
                      borderRadius: 8,
                      background: "#fff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    취소
                  </button>
                </div>
              )}

              <div
                style={{
                  ...sectionHdr,
                  marginTop: 6,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(12,15,13,0.08)",
                }}
              >
                첨부 문서{" "}
                <span style={{ color: "#9AA29C", fontWeight: 500 }}>
                  (사업자등록증 · 통장사본 — 각 여러 개 첨부 가능)
                </span>
              </div>
              {DOC_DEFS.map(([slot, label, hint]) => {
                const arr = editor.docs[slot];
                return (
                  <div
                    key={slot}
                    style={{
                      border: "1px solid rgba(12,15,13,0.1)",
                      borderRadius: 11,
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                          {label}
                          {arr.length > 0 && (
                            <span style={{ color: "#3E8E68", marginLeft: 6, fontSize: 12 }}>
                              {arr.length}개
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#9AA29C", marginTop: 3 }}>{hint}</div>
                      </div>
                      <label
                        className="gbtn"
                        style={{
                          padding: "8px 15px",
                          border: "1px solid rgba(14,123,78,0.4)",
                          borderRadius: 8,
                          background: "#fff",
                          color: "#0E7B4E",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        + 업로드
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.hwp,.hwpx"
                          onChange={onDoc(slot)}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                    {arr.map((d, idx) => {
                      const hasImg = !!(d.url && /^data:image\//.test(d.url));
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                            background: "#F7F9F7",
                            borderRadius: 9,
                            padding: "8px 10px",
                          }}
                        >
                          {hasImg ? (
                            <img
                              src={d.url}
                              alt={d.name}
                              style={{ width: 36, height: 36, borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 7,
                                background: "#EAF0EC",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 16,
                                flexShrink: 0,
                              }}
                            >
                              📄
                            </div>
                          )}
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "#3A3C45",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {d.name}
                          </span>
                          {(d.url || d.path) && (
                            <button
                              onClick={() => void downloadAttachment(d)}
                              className="gbtn"
                              title="다운로드"
                              style={{
                                padding: "6px 10px",
                                border: "1px solid rgba(14,123,78,0.35)",
                                borderRadius: 7,
                                background: "#fff",
                                color: "#0E7B4E",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >
                              ⬇
                            </button>
                          )}
                          <button
                            onClick={() => removeDoc(slot, idx)}
                            className="gbtn"
                            title="삭제"
                            style={{
                              padding: "6px 10px",
                              border: "1px solid rgba(196,85,62,0.3)",
                              borderRadius: 7,
                              background: "#fff",
                              color: "#C4553E",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div>
                <label style={lbl}>비고</label>
                <textarea
                  className="fld"
                  value={editor.memo}
                  onChange={(e) => set("memo", e.target.value)}
                  placeholder="거래 조건, 특이사항 등"
                  style={{
                    ...fld,
                    lineHeight: 1.6,
                    minHeight: 70,
                    resize: "vertical",
                    display: "block",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "16px 26px",
                borderTop: "1px solid rgba(12,15,13,0.08)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                position: "sticky",
                bottom: 0,
                background: "#fff",
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
                onClick={savePartner}
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
