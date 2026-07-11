import { useEffect, useState, type CSSProperties } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "../ui";
import { demoContractTypes } from "../data/demo";

type CtTemplate = {
  id?: string;
  name: string;
  template_url?: string | null;
  template_name?: string | null;
};

type DocType = "PL" | "CI" | "EX" | "INV" | "CT";
type Mode = "packing" | "money" | "contract";

interface Item {
  desc: string;
  hs: string;
  qty: number | string;
  nw: number | string;
  gw: number | string;
  unit: number | string;
}
interface Clause {
  title: string;
  content: string;
}

const DOC_TYPES: { k: DocType; icon: string; label: string }[] = [
  { k: "PL", icon: "📦", label: "Packing List (PL)" },
  { k: "CI", icon: "🧾", label: "Commercial Invoice" },
  { k: "EX", icon: "📤", label: "수출신고 서류" },
  { k: "INV", icon: "💰", label: "인보이스 (Invoice)" },
  { k: "CT", icon: "✍", label: "계약서" },
];

const DOC_META: Record<
  DocType,
  { label: string; en: string; no: string; cur: string; mode: Mode; cols: string[]; note: string }
> = {
  PL: {
    label: "Packing List",
    en: "PACKING LIST",
    no: "LJ-PL-2026-0714",
    cur: "USD",
    mode: "packing",
    cols: ["No.", "Description", "HS Code", "Q’ty", "N.W (kg)", "G.W (kg)"],
    note: "Origin: Republic of Korea. This packing list is for customs clearance purposes.",
  },
  CI: {
    label: "Commercial Invoice",
    en: "COMMERCIAL INVOICE",
    no: "LJ-CI-2026-0714",
    cur: "USD",
    mode: "money",
    cols: ["No.", "Description", "HS Code", "Q’ty", "Unit Price", "Amount"],
    note: "Payment: T/T 30% deposit, balance before shipment. Terms: CIF. Origin: Republic of Korea.",
  },
  EX: {
    label: "수출신고 서류",
    en: "EXPORT DECLARATION",
    no: "LJ-EX-2026-0714",
    cur: "USD",
    mode: "money",
    cols: ["란", "품목", "HS부호", "수량", "신고가격", "중량"],
    note: "세관 신고용 · 결제방법 T/T · 인도조건 CIF · 원산지 대한민국. 관세사 검토 후 전자신고 제출.",
  },
  INV: {
    label: "인보이스",
    en: "INVOICE",
    no: "LJ-INV-2026-0714",
    cur: "USD",
    mode: "money",
    cols: ["No.", "Item", "Q’ty", "Unit Price", "Amount", ""],
    note: "Due within 30 days of B/L date. Bank: KEB Hana Bank / SWIFT: KOEXKRSE.",
  },
  CT: {
    label: "계약서",
    en: "SUPPLY AGREEMENT",
    no: "LJ-CT-2026-08",
    cur: "USD",
    mode: "contract",
    cols: ["조항", "내용", "", "", "", ""],
    note: "본 계약은 대한민국 법률에 따라 해석되며, 분쟁은 대한상사중재원의 중재로 해결한다.",
  },
};

const fld: CSSProperties = {
  marginTop: 5,
  width: "100%",
  padding: "9px 11px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 8,
  fontSize: 13,
};
const lbl: CSSProperties = { fontSize: 12, color: "#6B7280", fontWeight: 600 };

const fmt = (n: number | string) =>
  "$" +
  (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Docs() {
  const flash = useToast();

  const [docType, setDocType] = useState<DocType>("PL");
  const [dfExporter, setDfExporter] = useState("LJ-BIO INC. (엘제이바이오)");
  const [dfImporter, setDfImporter] = useState("Bangkok MediTrade Co., Ltd.");
  const [dfCountry, setDfCountry] = useState("Thailand");
  const [dfDate, setDfDate] = useState("2026-07-14");
  const [docItems, setDocItems] = useState<Item[]>([
    { desc: "Hyaluronic Acid Dermal Filler 1ml", hs: "3304.99", qty: 2000, nw: 24, gw: 31, unit: 18 },
    { desc: "Hyaluronic Acid Dermal Filler 2ml", hs: "3304.99", qty: 3000, nw: 54, gw: 66, unit: 27 },
  ]);
  const [docFreight, setDocFreight] = useState<number | string>(2400);
  const [docCompany, setDocCompany] = useState("LJ-BIO INC. (엘제이바이오)");
  const [docAddress, setDocAddress] = useState("서울특별시 강남구 학동로2길 19, 2층 2741호");
  const [docRep, setDocRep] = useState("지경준");
  const [docNos, setDocNos] = useState<Record<DocType, string>>({
    PL: "LJ-PL-2026-0714",
    CI: "LJ-CI-2026-0714",
    EX: "LJ-EX-2026-0714",
    INV: "LJ-INV-2026-0714",
    CT: "LJ-CT-2026-08",
  });
  const [docNotes, setDocNotes] = useState<Record<DocType, string>>({
    PL: "총 포장 수량 / 원산지: 대한민국 (Republic of Korea). 본 패킹리스트는 통관용입니다.",
    CI: "결제조건: T/T 30% 선급, 잔금 선적 전 결제 / 인도조건: CIF. 은행: KEB Hana Bank · 계좌 123-910056-78901 · SWIFT: KOEXKRSE · 예금주: LJ-BIO INC.",
    EX: "세관 신고용 · 결제방법 T/T · 인도조건 CIF · 원산지 대한민국. 관세사 검토 후 전자신고 제출.",
    INV: "B/L 발행일로부터 30일 이내 결제. 은행: KEB Hana Bank · 계좌 123-910056-78901 · SWIFT: KOEXKRSE · 예금주: LJ-BIO INC.",
    CT: "본 계약은 대한민국 법률에 따라 해석되며, 분쟁은 대한상사중재원의 중재로 해결한다.",
  });
  const [docClauses, setDocClauses] = useState<Clause[]>([
    { title: "제1조", content: "계약 목적 — 히알루론산 필러 제품의 독점 공급" },
    { title: "제2조", content: "계약 기간 — 2026.08.01 ~ 2027.07.31 (1년, 자동갱신)" },
    { title: "제3조", content: "공급 물량 및 단가 — 별첨 단가표에 따름" },
    { title: "제4조", content: "대금 지급 — T/T 30% 선급, 잔금 선적 전 결제" },
  ]);

  // Contract templates (uploaded in 관리자 → 계약서 유형·양식 관리)
  const [ctList, setCtList] = useState<CtTemplate[]>(
    demoContractTypes.map((name) => ({ name })),
  );
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("contract_types")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data }) => data && setCtList(data as CtTemplate[]));
  }, []);

  function downloadTemplate(c: CtTemplate) {
    if (!c.template_url) return;
    const a = document.createElement("a");
    a.href = c.template_url;
    a.download = c.template_name || c.name + "_계약서";
    document.body.appendChild(a);
    a.click();
    a.remove();
    flash(c.name + " 계약서를 다운로드합니다");
  }

  const dm = DOC_META[docType];
  const contract = dm.mode === "contract";
  const money = dm.mode === "money";
  const showFreight = dm.mode === "money";

  const subtotal = docItems.reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.unit) || 0), 0);
  const freight = Number(docFreight) || 0;
  const totalQty = docItems.reduce((a, it) => a + (Number(it.qty) || 0), 0);

  const docNo = docNos[docType] || dm.no;
  const docNote = docNotes[docType] || dm.note;
  const showTotals = dm.mode !== "contract";
  const docTotal = money
    ? fmt(subtotal + freight)
    : dm.mode === "packing"
      ? totalQty.toLocaleString() + " ea"
      : "독점 공급";

  const colAlign = (i: number): CSSProperties["textAlign"] =>
    contract ? "left" : i === 1 ? "left" : i === 0 ? "center" : "right";

  const headStyle = (i: number): CSSProperties => ({
    padding: "9px 10px",
    textAlign: colAlign(i),
    fontSize: 10.5,
    fontWeight: 700,
    color: "#4A4C55",
    borderBottom: "1px solid rgba(12,15,13,0.15)",
    ...(contract && i > 1 ? { display: "none" } : null),
    ...(i === 1 ? null : { whiteSpace: "nowrap" }),
  });

  const cellStyle = (i: number): CSSProperties => ({
    padding: 10,
    fontSize: 12,
    color: "#0C0F0D",
    textAlign: colAlign(i),
    ...(i === 1 ? { lineHeight: 1.5 } : { whiteSpace: "nowrap" }),
    ...(contract && i === 0
      ? { fontWeight: 700, color: "#0E7B4E", whiteSpace: "nowrap", verticalAlign: "top" }
      : null),
    ...(contract && i > 1 ? { display: "none" } : null),
  });

  let rows: string[][];
  if (contract) {
    rows = docClauses.map((cl) => [cl.title, cl.content, "", "", "", ""]);
  } else {
    rows = docItems.map((it, i) => {
      const amt = fmt((Number(it.qty) || 0) * (Number(it.unit) || 0));
      const q = (Number(it.qty) || 0).toLocaleString();
      if (dm.mode === "packing") return [String(i + 1), it.desc, it.hs, q, String(it.nw), String(it.gw)];
      if (docType === "INV") return [String(i + 1), it.desc, q, fmt(it.unit), amt, ""];
      if (docType === "EX") return [String(i + 1), it.desc, it.hs, q, amt, (it.gw || 0) + "kg"];
      return [String(i + 1), it.desc, it.hs, q, fmt(it.unit), amt];
    });
  }

  const updItem = (idx: number, field: keyof Item, value: string) =>
    setDocItems((its) => its.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  const updClause = (idx: number, field: keyof Clause, value: string) =>
    setDocClauses((cs) => cs.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const typeSelector = (
    <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: 18 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: "#84908A", letterSpacing: "0.02em", marginBottom: 12 }}>
        문서 종류
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DOC_TYPES.map((d) => {
          const on = docType === d.k;
          return (
            <button
              key={d.k}
              onClick={() => setDocType(d.k)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                padding: "11px 13px",
                borderRadius: 10,
                border: `1px solid ${on ? "rgba(14,123,78,0.4)" : "transparent"}`,
                background: on ? "rgba(14,123,78,0.08)" : "transparent",
                color: on ? "#0E7B4E" : "#3A3C45",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16 }}>{d.icon}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{d.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // 계약서: 유형 선택 → 업로드된 양식 다운로드
  if (contract) {
    return (
      <div
        className="fade g-docs"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{typeSelector}</div>
        <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>계약서 양식 다운로드</h3>
          <p style={{ fontSize: 13, color: "#84908A", marginTop: 6, lineHeight: 1.6 }}>
            계약서 유형을 선택해 양식 파일을 다운로드하세요. 양식은{" "}
            <b>관리자 → 계약서 유형·양식 관리</b>에서 업로드합니다.
          </p>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {ctList.map((c, i) => (
              <div
                key={c.id || i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  border: "1px solid rgba(12,15,13,0.09)",
                  borderRadius: 12,
                  background: "#FAFBFA",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 18 }}>✍</span>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "#84908A", marginTop: 2 }}>
                    {c.template_url ? "📄 " + (c.template_name || "양식 파일") : "양식 미등록"}
                  </div>
                </div>
                {c.template_url ? (
                  <button
                    onClick={() => downloadTemplate(c)}
                    className="pbtn"
                    style={{
                      padding: "10px 18px",
                      border: "none",
                      borderRadius: 9,
                      background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ⭳ 다운로드
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "#9AA29C", whiteSpace: "nowrap" }}>
                    관리자 메뉴에서 업로드 필요
                  </span>
                )}
              </div>
            ))}
            {ctList.length === 0 && (
              <div style={{ padding: "36px 16px", textAlign: "center", color: "#9AA29C", fontSize: 13 }}>
                등록된 계약서 유형이 없습니다. 관리자 메뉴에서 추가하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fade g-docs"
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* LEFT COLUMN */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {typeSelector}

        {/* 발행 정보 */}
        <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: 18 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#84908A", marginBottom: 12 }}>발행 정보</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 9 }}>
              <div>
                <label style={lbl}>문서 번호</label>
                <input
                  className="fld"
                  value={docNo}
                  onChange={(e) => setDocNos({ ...docNos, [docType]: e.target.value })}
                  style={fld}
                />
              </div>
              <div>
                <label style={lbl}>발행일</label>
                <input className="fld" value={dfDate} onChange={(e) => setDfDate(e.target.value)} style={fld} />
              </div>
            </div>
            <div>
              <label style={lbl}>수출자 (Exporter)</label>
              <input className="fld" value={dfExporter} onChange={(e) => setDfExporter(e.target.value)} style={fld} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 9 }}>
              <div>
                <label style={lbl}>수입자 (Importer)</label>
                <input className="fld" value={dfImporter} onChange={(e) => setDfImporter(e.target.value)} style={fld} />
              </div>
              <div>
                <label style={lbl}>목적국</label>
                <input className="fld" value={dfCountry} onChange={(e) => setDfCountry(e.target.value)} style={fld} />
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(12,15,13,0.08)", marginTop: 3, paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7B4E", letterSpacing: "0.02em", marginBottom: 9 }}>
                발행처 (레터헤드 · 서명)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 9 }}>
                  <div>
                    <label style={lbl}>회사명</label>
                    <input
                      className="fld"
                      value={docCompany}
                      onChange={(e) => setDocCompany(e.target.value)}
                      style={fld}
                    />
                  </div>
                  <div>
                    <label style={lbl}>대표자명</label>
                    <input className="fld" value={docRep} onChange={(e) => setDocRep(e.target.value)} style={fld} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>회사 주소</label>
                  <input
                    className="fld"
                    value={docAddress}
                    onChange={(e) => setDocAddress(e.target.value)}
                    style={fld}
                  />
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(12,15,13,0.08)", marginTop: 3, paddingTop: 12 }}>
              <label style={lbl}>하단 비고 · 은행 계좌 등 (문서별 개별 저장)</label>
              <textarea
                className="fld"
                value={docNote}
                onChange={(e) => setDocNotes({ ...docNotes, [docType]: e.target.value })}
                style={{
                  ...fld,
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  minHeight: 66,
                  resize: "vertical",
                  display: "block",
                }}
              />
            </div>
          </div>
          <button
            className="pbtn"
            onClick={() => flash("문서가 생성되었습니다")}
            style={{
              marginTop: 16,
              width: "100%",
              padding: 12,
              border: "none",
              borderRadius: 10,
              background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚡ 문서 자동 생성
          </button>
        </div>

        {/* 품목 · 내용 편집 */}
        <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "#84908A" }}>품목 · 내용 편집</h4>
            {contract ? (
              <button
                className="gbtn"
                onClick={() =>
                  setDocClauses([...docClauses, { title: "제" + (docClauses.length + 1) + "조", content: "내용을 입력하세요" }])
                }
                style={editBtn}
              >
                + 조항 추가
              </button>
            ) : (
              <button
                className="gbtn"
                onClick={() =>
                  setDocItems([...docItems, { desc: "신규 품목", hs: "3304.99", qty: 1000, nw: 10, gw: 12, unit: 20 }])
                }
                style={editBtn}
              >
                + 품목 추가
              </button>
            )}
          </div>

          {!contract && (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {docItems.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    border: "1px solid rgba(12,15,13,0.09)",
                    borderRadius: 11,
                    padding: "12px 12px 11px",
                    background: "#FAFBFA",
                  }}
                >
                  <input
                    className="fld"
                    value={it.desc}
                    onChange={(e) => updItem(idx, "desc", e.target.value)}
                    placeholder="품목명"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1.5px solid rgba(12,15,13,0.12)",
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 500,
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                    <ItemField label="HS Code" value={it.hs} onChange={(v) => updItem(idx, "hs", v)} />
                    <ItemField
                      label="수량 (ea)"
                      value={it.qty}
                      inputMode="numeric"
                      onChange={(v) => updItem(idx, "qty", v)}
                    />
                    <ItemField
                      label="단가 ($)"
                      value={it.unit}
                      inputMode="decimal"
                      onChange={(v) => updItem(idx, "unit", v)}
                    />
                    <ItemField
                      label="중량 G.W (kg)"
                      value={it.gw}
                      inputMode="decimal"
                      onChange={(v) => updItem(idx, "gw", v)}
                    />
                  </div>
                  <button
                    onClick={() => setDocItems(docItems.filter((_, i) => i !== idx))}
                    title="삭제"
                    style={removeBtn}
                  >
                    ×
                  </button>
                </div>
              ))}
              {showFreight && (
                <div style={{ display: "flex", alignItems: "center", gap: 9, paddingTop: 2 }}>
                  <label style={{ fontSize: 12, color: "#4A4C55", fontWeight: 600, whiteSpace: "nowrap" }}>
                    운임 Freight (CIF) $
                  </label>
                  <input
                    className="fld"
                    value={docFreight}
                    onChange={(e) => setDocFreight(e.target.value)}
                    inputMode="decimal"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: "1.5px solid rgba(12,15,13,0.12)",
                      borderRadius: 8,
                      fontSize: 12.5,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {contract && (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {docClauses.map((cl, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    border: "1px solid rgba(12,15,13,0.09)",
                    borderRadius: 11,
                    padding: "12px 12px 11px",
                    background: "#FAFBFA",
                  }}
                >
                  <input
                    className="fld"
                    value={cl.title}
                    onChange={(e) => updClause(idx, "title", e.target.value)}
                    placeholder="조항"
                    style={{
                      width: 90,
                      padding: "7px 9px",
                      border: "1.5px solid rgba(12,15,13,0.12)",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 8,
                    }}
                  />
                  <textarea
                    className="fld"
                    value={cl.content}
                    onChange={(e) => updClause(idx, "content", e.target.value)}
                    placeholder="내용을 입력하세요"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1.5px solid rgba(12,15,13,0.12)",
                      borderRadius: 8,
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      minHeight: 54,
                      resize: "vertical",
                      display: "block",
                    }}
                  />
                  <button
                    onClick={() => setDocClauses(docClauses.filter((_, i) => i !== idx))}
                    title="삭제"
                    style={removeBtn}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN — preview */}
      <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#84908A" }}>
            미리보기 — <b style={{ color: "#0C0F0D" }}>{dm.label}</b>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="gbtn" style={previewBtn}>
              ⭳ PDF
            </button>
            <button className="gbtn" style={previewBtn}>
              🖨 인쇄
            </button>
          </div>
        </div>

        {/* DOC PAPER */}
        <div
          className="fade doc-paper"
          style={{
            background: "#fff",
            border: "1px solid rgba(12,15,13,0.14)",
            borderRadius: 6,
            padding: "44px 48px",
            boxShadow: "0 20px 50px -30px rgba(12,15,13,0.4)",
            minHeight: 560,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              paddingBottom: 20,
              borderBottom: "2px solid #0C0F0D",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk',sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                LJ<span style={{ color: "#0E7B4E" }}>-BIO</span>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3, lineHeight: 1.5 }}>
                {docCompany}
                <br />
                {docAddress}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}>{dm.en}</div>
              <div className="mono" style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                No. {docNo}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "#6B7280" }}>
                Date: {dfDate}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#84908A" }}>
                EXPORTER / SHIPPER
              </div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: "#0C0F0D" }}>{dfExporter}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#84908A" }}>
                CONSIGNEE / IMPORTER
              </div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: "#0C0F0D" }}>
                {dfImporter} ({dfCountry})
              </div>
            </div>
          </div>

          <table style={{ marginTop: 24, width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#F1F5F2" }}>
                {dm.cols.map((h, i) => (
                  <th key={i} style={headStyle(i)}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid rgba(12,15,13,0.09)" }}>
                  {r.map((c, ci) => (
                    <td key={ci} style={cellStyle(ci)}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {showTotals && (
            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: 260 }}>
                {money && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
                    <span style={{ color: "#6B7280" }}>Subtotal</span>
                    <span className="mono">{fmt(subtotal)}</span>
                  </div>
                )}
                {money && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
                    <span style={{ color: "#6B7280" }}>Freight (CIF)</span>
                    <span className="mono">{fmt(freight)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderTop: "2px solid #0C0F0D",
                    marginTop: 4,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span>TOTAL</span>
                  <span className="mono">{docTotal}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, alignItems: "end" }}>
            <div style={{ fontSize: 10.5, color: "#84908A", lineHeight: 1.6 }}>{docNote}</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#6B7280" }}>Authorized Signature</div>
              <div style={{ marginTop: 22, borderTop: "1px solid #0C0F0D", paddingTop: 6, fontSize: 12 }}>
                {docCompany} / {docRep}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const editBtn: CSSProperties = {
  padding: "5px 12px",
  border: "1px solid rgba(14,123,78,0.4)",
  borderRadius: 8,
  background: "#fff",
  color: "#0E7B4E",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const removeBtn: CSSProperties = {
  position: "absolute",
  top: 9,
  right: 9,
  width: 22,
  height: 22,
  border: "none",
  background: "rgba(196,85,62,0.1)",
  color: "#C4553E",
  borderRadius: 6,
  fontSize: 14,
  lineHeight: 1,
  cursor: "pointer",
};

const previewBtn: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid rgba(12,15,13,0.12)",
  borderRadius: 8,
  background: "#fff",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

function ItemField({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <div>
      <label style={{ fontSize: 10.5, color: "#84908A", fontWeight: 600, display: "block", marginBottom: 3 }}>
        {label}
      </label>
      <input
        className="fld"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        style={{
          width: "100%",
          padding: "7px 9px",
          border: "1.5px solid rgba(12,15,13,0.12)",
          borderRadius: 8,
          fontSize: 12,
        }}
      />
    </div>
  );
}
