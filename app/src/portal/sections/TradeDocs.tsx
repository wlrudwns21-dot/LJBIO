import { useEffect, useRef, useState, type CSSProperties } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Modal, useToast } from "../ui";

/**
 * 무역 문서 생성기 — 구매발주서(PO) · 상업송장(CIJ) · 견적서(QT)
 *  · 업로드된 실제 양식(A4)을 충실히 재현
 *  · 문서 위의 모든 텍스트를 직접 클릭해 수정 (회사명 포함 전부)
 *  · 저장/불러오기/재편집/새로저장 (generated_docs)
 *  · 인쇄·PDF: A4 크기 고정 (@page A4)
 */

export type TradeDocType = "PO" | "CIJ" | "QT";

/* ============================== 데이터 모델 ============================== */
type PoItem = { desc: string; sub: string; unit: number; qty: number };
type PoData = {
  coName: string; coAddr1: string; coAddr2: string; coContact: string;
  poNo: string; date: string;
  vCompany: string; vAddress: string; vAttn: string; vTel: string;
  sCompany: string; sAddress: string; sAttn: string; sTel: string;
  curSymbol: string; curCode: string;
  items: PoItem[];
  tIncoterms: string; tPayment: string; tCurrency: string;
  tDelivery: string; tOrigin: string; tShelf: string;
  buyerScript: string; buyerTitle: string; buyerCompany: string;
  sellerTitle: string; sellerCompany: string;
};
type CiItem = { marks: string; desc: string; hs: string; qty: number; unit: number };
type CiData = {
  title: string;
  shipper: string; invoiceNo: string;
  consignee: string; payTerms: string; priceTerms: string;
  curCode: string;
  items: CiItem[];
  say: string;
  remarks: string;
  signCompany: string; signScript: string;
};
type QtItem = { kind: "main" | "detail"; desc: string; qty: string; total: number };
type QtData = {
  coName: string; coTag: string; coAddr: string; coEmail: string; coTel: string;
  ref: string; date: string;
  clName: string; clAddr: string; clAttn: string;
  curCode: string;
  items: QtItem[];
  grandLabel: string; grandCur: string; grandValue: string;
  remarks: string; rateNote: string;
  bank1: string; bank2: string; bank3: string;
  signScript: string;
  footL: string; footR: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const PO_DEFAULT: PoData = {
  coName: "LJ BIO Co., Ltd.",
  coAddr1: "2F, Unit 2741, 19 Hakdong-ro 2-gil,",
  coAddr2: "Gangnam-gu, Seoul, Republic of Korea",
  coContact: "Tel: +82-10-8082-9924 | Email: kyungjun.ji@bio-lj.com",
  poNo: "PO-2026-01", date: today(),
  vCompany: "CGBIO CO., LTD.",
  vAddress: "1 Sangwon 12-gil, Seongdong-gu, Seoul, Republic of Korea",
  vAttn: "June.K (유주은)", vTel: "",
  sCompany: "LERMAN COSME CO., LTD.",
  sAddress: "270-272 Suapa Road, Pomprab District, Bangkok 10100, Thailand",
  sAttn: "", sTel: "",
  curSymbol: "₩", curCode: "KRW",
  items: [
    { desc: "AiLEENE Vol 1 (Box / 1.0cc * 2 Syringes)", sub: "Hyaluronic Acid Dermal Filler with Lidocaine", unit: 24000, qty: 500 },
    { desc: "AiLEENE Vol 2 (Box / 1.0cc * 2 Syringes)", sub: "Hyaluronic Acid Dermal Filler with Lidocaine", unit: 24000, qty: 1750 },
  ],
  tIncoterms: "EXW (Incoterms 2010/2020)",
  tPayment: "- 50% Advance Payment (T/T)\n- 50% Before Completion of delivery (T/T)",
  tCurrency: "KRW",
  tDelivery: "Within 30 days of PO acceptance",
  tOrigin: "Republic of Korea",
  tShelf: "Minimum 75% remaining upon delivery",
  buyerScript: "Lee Il Hyeong",
  buyerTitle: "Lee Il Hyeong / CEO", buyerCompany: "LJ BIO Co., Ltd.",
  sellerTitle: "CEO", sellerCompany: "CGBIO Co., LTD.",
};

const CI_DEFAULT: CiData = {
  title: "COMMERCIAL INVOICE",
  shipper: "LJ BIO\n2F, Unit 2741, 19 Hakdong-ro 2-gil, Gangnam-gu, Seoul, 06110,\nRepublic of Korea\nkyungjun.ji@bio-lj.com\n+82-10-8082-9924",
  invoiceNo: "QT-2026-01 / " + today(),
  consignee: "Bloom Delight Clinic (Tomokazu Shibata)\n〒160-0022 Tokyo, Shinjuku City, Shinjuku, 3 Chome−8−9 平生ビルディング 6階",
  payTerms: "DDP", priceTerms: "",
  curCode: "USD",
  items: [
    { marks: "C/NO.1-6\nASSORTED", desc: "Belluna Breast Massager (Med.Device Grade, Size: L)", hs: "HS CODE: 9019.10-000", qty: 6, unit: 1580 },
    { marks: "C/NO.1-6\nASSORTED", desc: "Easydew MD Cream (Skin Barrier Barrier, 85g)", hs: "HS CODE: 3304.99-000", qty: 6, unit: 20 },
  ],
  say: "",
  remarks: "ORIGIN: REPUBLIC OF KOREA\nMADE IN KOREA\nPREFERENTIAL TARIFF TREATMENT UNDER RCEP AGREEMENT IS CLAIMED.\nCOMBINED PACKING: BELLUNA MASSAGER AND MD CREAM ARE PACKED TOGETHER IN THE SAME CARTON (C/NO. 1-6).",
  signCompany: "LJ BIO", signScript: "Lee All Hyeong",
};

const QT_DEFAULT: QtData = {
  coName: "LJ BIO", coTag: "OFFICIAL TRADE SOLUTION",
  coAddr: "2F, UNIT 2741, 19 HAKDONG-RO 2-GIL, GANGNAM-GU,\nSEOUL, 06110, REPUBLIC OF KOREA",
  coEmail: "kyungjun.ji@bio-lj.com", coTel: "+82-10-8082-9924",
  ref: "QT-2026-001", date: today(),
  clName: "BLOOM DELIGHT CLINIC",
  clAddr: "〒160-0022 TOKYO, SHINJUKU CITY, SHINJUKU, 3 CHOME−8−9 平生ビルディング 6階",
  clAttn: "Attention: Tomokazu Shibata",
  curCode: "USD",
  items: [
    { kind: "main", desc: "BELUNA BREAST MASSAGER SET", qty: "4", total: 6400 },
    { kind: "main", desc: "LOGISTICS / CUSTOMS / TAX", qty: "1", total: 2726 },
    { kind: "detail", desc: "Logistics - INC-NRT (KOR-JP) & DDP TAX", qty: "", total: 1410 },
    { kind: "detail", desc: "Administrative Expenses", qty: "", total: 441 },
    { kind: "detail", desc: "TAX (in JP)", qty: "", total: 875 },
    { kind: "main", desc: "COMMOSSION (10%) + BANK FEE", qty: "1", total: 740 },
  ],
  grandLabel: "CONVERTED GRAND TOTAL", grandCur: "JPY", grandValue: "1,565,142.24",
  remarks: "Rate: 1 USD = 1,495.2 KRW = 158.64 JPY\nPlease remit the payment to the bank account of our local\ncontract partner in Japan",
  rateNote: "* EXCHANGE RATE APPLIED: 1 USD = 158.64 JPY",
  bank1: "GMO AOZORA NET BANK, LTD. (0310)   |   SWIFT: -",
  bank2: "A/C NO. 2391175",
  bank3: "BENEFICIARY. VILUB (DO) [ｹﾞｲﾌﾞ(ﾄﾞ)]",
  signScript: "Lee All Hyeong",
  footL: "PREMIUM DOCUMENT SYSTEM V9.0", footR: "© 2026 LJ BIO GROUP",
};

const DEFAULTS: Record<TradeDocType, unknown> = { PO: PO_DEFAULT, CIJ: CI_DEFAULT, QT: QT_DEFAULT };
export const TRADE_LABEL: Record<TradeDocType, string> = {
  PO: "구매발주서 (Purchase Order)",
  CIJ: "상업송장 (Commercial Invoice)",
  QT: "견적서 (Quotation)",
};

/* ============================== 유틸 ============================== */
const num = (s: string) => Number(String(s).replace(/[^\d.-]/g, "")) || 0;
const fmtInt = (n: number) => (Number(n) || 0).toLocaleString("en-US");
const fmt2 = (n: number) =>
  (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 클릭해서 바로 수정하는 텍스트 (blur 시 반영) */
function E({
  v, on, style, numeric, block,
}: {
  v: string; on: (s: string) => void; style?: CSSProperties; numeric?: boolean; block?: boolean;
}) {
  const Tag = block ? "div" : "span";
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const t = e.currentTarget.innerText.replace(/\n+$/, "");
        on(numeric ? String(num(t)) : t);
      }}
      style={{
        outline: "none", cursor: "text", minWidth: 8, display: block ? "block" : "inline-block",
        whiteSpace: "pre-wrap", ...style,
      }}
    >
      {v}
    </Tag>
  );
}

function useSeal(): string | null {
  const [seal] = useState<string | null>(() => {
    try { return localStorage.getItem("ljbio_seal"); } catch { return null; }
  });
  return seal;
}

function Seal({ seal, size = 66, style }: { seal: string | null; size?: number; style?: CSSProperties }) {
  if (seal)
    return (
      <img src={seal} alt="직인" style={{ width: size, height: size, objectFit: "contain", opacity: 0.88, pointerEvents: "none", ...style }} />
    );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", border: "2.5px double #C0392B",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      color: "#C0392B", transform: "rotate(-8deg)", pointerEvents: "none", background: "rgba(255,255,255,0.3)", ...style,
    }}>
      <div style={{ fontSize: size * 0.11, fontWeight: 700 }}>엘제이바이오</div>
      <div style={{ fontSize: size * 0.17, fontWeight: 800 }}>이일형</div>
      <div style={{ fontSize: size * 0.09, fontWeight: 700 }}>代表理事印</div>
    </div>
  );
}

const script: CSSProperties = { fontFamily: "'Brush Script MT','Segoe Script','Snell Roundhand',cursive" };
const rowDel: CSSProperties = {
  position: "absolute", left: -26, top: "50%", transform: "translateY(-50%)",
  width: 20, height: 20, borderRadius: 6, border: "1px solid rgba(196,85,62,0.4)",
  background: "#fff", color: "#C4553E", fontSize: 12, fontWeight: 700, cursor: "pointer", lineHeight: 1,
};

/* ============================== PO 양식 ============================== */
function PoSheet({ d, set, seal, sealOn, delItem }: {
  d: PoData; set: (p: Partial<PoData>) => void; seal: string | null; sealOn: boolean;
  delItem: (i: number) => void;
}) {
  const setItem = (i: number, p: Partial<PoItem>) =>
    set({ items: d.items.map((it, j) => (j === i ? { ...it, ...p } : it)) });
  const totalQty = d.items.reduce((a, it) => a + (Number(it.qty) || 0), 0);
  const totalAmt = d.items.reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.unit) || 0), 0);
  const box: CSSProperties = { border: "1px solid #cfd4d9" };
  const boxHead: CSSProperties = {
    background: "#f1f3f5", border: "1px solid #cfd4d9", padding: "5px 10px",
    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.02em",
  };
  const kv: CSSProperties = { display: "flex", gap: 8, padding: "4px 10px", fontSize: 11 };
  const kvK: CSSProperties = { fontWeight: 700, width: 62, flexShrink: 0 };
  const th: CSSProperties = {
    border: "1px solid #222", background: "#f1f3f5", padding: "7px 8px",
    fontSize: 10.5, fontWeight: 700, textAlign: "center",
  };
  const td: CSSProperties = { border: "1px solid #222", padding: "8px 10px", fontSize: 11, verticalAlign: "middle" };
  const termK: CSSProperties = { fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" };
  const termV: CSSProperties = { fontSize: 10.5, color: "#333" };

  return (
    <div style={{ padding: "14mm 12mm", fontFamily: "'Pretendard Variable',Pretendard,Inter,sans-serif", color: "#111" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <E v={d.coName} on={(v) => set({ coName: v })} style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.01em" }} />
          <div style={{ marginTop: 5, fontSize: 9.5, color: "#666", lineHeight: 1.5 }}>
            <E v={d.coAddr1} on={(v) => set({ coAddr1: v })} block />
            <E v={d.coAddr2} on={(v) => set({ coAddr2: v })} block />
            <E v={d.coContact} on={(v) => set({ coContact: v })} block />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", borderBottom: "3px solid #111", paddingBottom: 2 }}>
            PURCHASE ORDER
          </div>
          <div style={{ marginTop: 10, fontSize: 11, display: "grid", gridTemplateColumns: "auto auto", gap: "4px 18px", justifyContent: "end" }}>
            <b>PO No.:</b>
            <E v={d.poNo} on={(v) => set({ poNo: v })} className-ignore="" style={{ fontFamily: "monospace", fontWeight: 700 }} />
            <b>Date:</b>
            <E v={d.date} on={(v) => set({ date: v })} style={{ fontWeight: 600 }} />
          </div>
        </div>
      </div>

      <div style={{ borderTop: "3px solid #111", margin: "12px 0 14px" }} />

      {/* VENDOR / SHIP TO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {(
          [
            ["VENDOR (SUPPLIER)", "vCompany", "vAddress", "vAttn", "vTel"],
            ["SHIP TO (CONSIGNEE)", "sCompany", "sAddress", "sAttn", "sTel"],
          ] as const
        ).map(([head, kc, ka, kat, kt]) => (
          <div key={head}>
            <div style={boxHead}>{head}</div>
            <div style={{ ...box, borderTop: "none", paddingBottom: 4 }}>
              <div style={kv}><span style={kvK}>Company:</span><E v={d[kc]} on={(v) => set({ [kc]: v } as Partial<PoData>)} style={{ fontWeight: 700 }} /></div>
              <div style={kv}><span style={kvK}>Address:</span><E v={d[ka]} on={(v) => set({ [ka]: v } as Partial<PoData>)} /></div>
              <div style={kv}><span style={kvK}>Attn:</span><E v={d[kat]} on={(v) => set({ [kat]: v } as Partial<PoData>)} /></div>
              <div style={kv}><span style={kvK}>Tel:</span><E v={d[kt]} on={(v) => set({ [kt]: v } as Partial<PoData>)} /></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "2px solid #111", margin: "14px 0" }} />

      {/* 품목 표 */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 34 }}>#</th>
            <th style={th}>Description</th>
            <th style={{ ...th, width: 92 }}>Unit Price<br />({d.curCode})</th>
            <th style={{ ...th, width: 88 }}>Qty<br />(Pcs)</th>
            <th style={{ ...th, width: 110 }}>Amount<br />({d.curCode})</th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((it, i) => (
            <tr key={i} style={{ position: "relative" }}>
              <td style={{ ...td, textAlign: "center", position: "relative" }}>
                <button className="no-print" title="행 삭제" style={rowDel} onClick={() => delItem(i)}>×</button>
                {i + 1}
              </td>
              <td style={td}>
                <E v={it.desc} on={(v) => setItem(i, { desc: v })} style={{ fontWeight: 700, fontSize: 11 }} block />
                <E v={it.sub} on={(v) => setItem(i, { sub: v })} style={{ fontSize: 9.5, color: "#777", marginTop: 2 }} block />
              </td>
              <td style={{ ...td, textAlign: "center" }}>
                <E v={String(it.unit)} on={(v) => setItem(i, { unit: num(v) })} numeric style={{ fontFamily: "monospace" }} />
              </td>
              <td style={{ ...td, textAlign: "center", background: "#fbfcf4" }}>
                <E v={String(it.qty)} on={(v) => setItem(i, { qty: num(v) })} numeric style={{ color: "#2456d9", fontWeight: 700, fontFamily: "monospace" }} />
              </td>
              <td style={{ ...td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                {fmtInt((Number(it.qty) || 0) * (Number(it.unit) || 0))}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ ...td, textAlign: "right", fontWeight: 800, fontSize: 10.5, background: "#f1f3f5" }}>
              TOTAL QUANTITY
            </td>
            <td style={{ ...td, textAlign: "center", color: "#2456d9", fontWeight: 800, fontFamily: "monospace" }}>
              {fmtInt(totalQty)}
            </td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800, fontFamily: "monospace" }}>
              <E v={d.curSymbol} on={(v) => set({ curSymbol: v })} /> {fmtInt(totalAmt)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* TERMS */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, borderBottom: "2px solid #111", paddingBottom: 4, marginBottom: 8 }}>
          TERMS &amp; CONDITIONS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 26px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "108px 1fr", gap: "5px 8px" }}>
            <span style={termK}>· Incoterms:</span><E v={d.tIncoterms} on={(v) => set({ tIncoterms: v })} style={termV} />
            <span style={termK}>· Payment Terms:</span><E v={d.tPayment} on={(v) => set({ tPayment: v })} style={{ ...termV, color: "#888" }} block />
            <span style={termK}>· Currency:</span><E v={d.tCurrency} on={(v) => set({ tCurrency: v })} style={termV} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "5px 8px" }}>
            <span style={termK}>· Delivery Date:</span><E v={d.tDelivery} on={(v) => set({ tDelivery: v })} style={termV} />
            <span style={termK}>· Origin:</span><E v={d.tOrigin} on={(v) => set({ tOrigin: v })} style={termV} />
            <span style={termK}>· Shelf Life:</span><E v={d.tShelf} on={(v) => set({ tShelf: v })} style={termV} />
          </div>
        </div>
      </div>

      {/* 서명 */}
      <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, padding: "0 24px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700 }}>Authorized by (Buyer)</div>
          <div style={{ position: "relative", height: 58, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <E v={d.buyerScript} on={(v) => set({ buyerScript: v })} style={{ ...script, fontSize: 26 }} />
            {sealOn && (
              <div style={{ position: "absolute", right: "14%", bottom: -8 }}>
                <Seal seal={seal} size={58} />
              </div>
            )}
          </div>
          <div style={{ borderTop: "2px solid #111", marginTop: 4, paddingTop: 6 }}>
            <E v={d.buyerTitle} on={(v) => set({ buyerTitle: v })} style={{ fontSize: 11, fontWeight: 700 }} block />
            <E v={d.buyerCompany} on={(v) => set({ buyerCompany: v })} style={{ fontSize: 9.5, color: "#888", marginTop: 2 }} block />
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700 }}>Accepted by (Seller)</div>
          <div style={{ height: 58 }} />
          <div style={{ borderTop: "2px solid #111", marginTop: 4, paddingTop: 6 }}>
            <E v={d.sellerTitle} on={(v) => set({ sellerTitle: v })} style={{ fontSize: 11, fontWeight: 700 }} block />
            <E v={d.sellerCompany} on={(v) => set({ sellerCompany: v })} style={{ fontSize: 9.5, color: "#888", marginTop: 2 }} block />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== CI 양식 ============================== */
function CiSheet({ d, set, seal, sealOn, delItem }: {
  d: CiData; set: (p: Partial<CiData>) => void; seal: string | null; sealOn: boolean;
  delItem: (i: number) => void;
}) {
  const setItem = (i: number, p: Partial<CiItem>) =>
    set({ items: d.items.map((it, j) => (j === i ? { ...it, ...p } : it)) });
  const totalQty = d.items.reduce((a, it) => a + (Number(it.qty) || 0), 0);
  const totalAmt = d.items.reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.unit) || 0), 0);
  const sayText = d.say || `${d.curCode} ${fmt2(totalAmt)} ONLY`;
  const cellHead: CSSProperties = { fontSize: 8.5, fontWeight: 700, letterSpacing: "0.03em", color: "#333", borderBottom: "1px solid #999", paddingBottom: 2, marginBottom: 4 };
  const th: CSSProperties = { border: "1.5px solid #111", padding: "8px 6px", fontSize: 10, fontWeight: 800, textAlign: "center", letterSpacing: "0.02em" };
  const td: CSSProperties = { border: "1.5px solid #111", padding: "9px 10px", fontSize: 10.5, verticalAlign: "middle" };

  return (
    <div style={{ fontFamily: "'Pretendard Variable',Pretendard,'Noto Sans KR',sans-serif", color: "#111", position: "relative", padding: "0 0 10mm" }}>
      {/* 상하단 검정 바 */}
      <div style={{ height: "7mm", background: "#111" }} />
      <div style={{ padding: "8mm 12mm 0" }}>
        <div style={{ textAlign: "center" }}>
          <E v={d.title} on={(v) => set({ title: v })} style={{ fontSize: 25, fontWeight: 900, letterSpacing: "0.01em" }} />
          <div style={{ width: 340, height: 5, background: "#111", margin: "6px auto 0" }} />
        </div>

        {/* 4분할 박스 */}
        <div style={{ marginTop: 18, border: "1.5px solid #111", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ padding: "8px 10px", borderRight: "1.5px solid #111", minHeight: 92 }}>
            <div style={cellHead}>1. SHIPPER / EXPORTER</div>
            <E v={d.shipper} on={(v) => set({ shipper: v })} style={{ fontSize: 10.5, lineHeight: 1.45 }} block />
          </div>
          <div style={{ padding: "8px 10px", minHeight: 92 }}>
            <div style={cellHead}>8. INVOICE NO. &amp; DATE</div>
            <E v={d.invoiceNo} on={(v) => set({ invoiceNo: v })} style={{ fontSize: 11.5, fontWeight: 800 }} block />
          </div>
          <div style={{ padding: "8px 10px", borderRight: "1.5px solid #111", borderTop: "1.5px solid #111", minHeight: 84 }}>
            <div style={cellHead}>2. CONSIGNEE</div>
            <E v={d.consignee} on={(v) => set({ consignee: v })} style={{ fontSize: 10.5, lineHeight: 1.45 }} block />
          </div>
          <div style={{ padding: "8px 10px", borderTop: "1.5px solid #111", minHeight: 84 }}>
            <div style={cellHead}>PAYMENT TERMS</div>
            <E v={d.payTerms} on={(v) => set({ payTerms: v })} style={{ fontSize: 11, fontWeight: 700 }} block />
            <div style={{ ...cellHead, marginTop: 8 }}>PRICE TERMS (INCOTERMS)</div>
            <E v={d.priceTerms} on={(v) => set({ priceTerms: v })} style={{ fontSize: 11, fontWeight: 700, minHeight: 14 }} block />
          </div>
        </div>

        {/* 품목 표 */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 92 }}>MARKS</th>
              <th style={th}>DESCRIPTION OF GOODS</th>
              <th style={{ ...th, width: 56 }}>QTY</th>
              <th style={{ ...th, width: 88 }}>UNIT PRICE</th>
              <th style={{ ...th, width: 104 }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it, i) => (
              <tr key={i}>
                <td style={{ ...td, textAlign: "center", fontWeight: 700, fontSize: 9.5, position: "relative" }}>
                  <button className="no-print" title="행 삭제" style={rowDel} onClick={() => delItem(i)}>×</button>
                  <E v={it.marks} on={(v) => setItem(i, { marks: v })} block />
                </td>
                <td style={td}>
                  <E v={it.desc} on={(v) => setItem(i, { desc: v })} style={{ fontWeight: 700 }} block />
                  <E v={it.hs} on={(v) => setItem(i, { hs: v })} style={{ fontSize: 8.5, color: "#2456d9", marginTop: 2 }} block />
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  <E v={String(it.qty)} on={(v) => setItem(i, { qty: num(v) })} numeric />
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  <E v={fmt2(it.unit)} on={(v) => setItem(i, { unit: num(v) })} numeric />
                </td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                  {fmt2((Number(it.qty) || 0) * (Number(it.unit) || 0))}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ ...td, fontStyle: "italic", fontWeight: 800 }}>
                SAY: <E v={sayText} on={(v) => set({ say: v })} style={{ color: "#2456d9" }} />
              </td>
              <td style={{ ...td, textAlign: "center", fontWeight: 800 }}>{fmtInt(totalQty)}</td>
              <td style={td}></td>
              <td style={{ ...td, textAlign: "right", fontWeight: 900, fontSize: 12.5 }}>
                {d.curCode} {fmt2(totalAmt)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* REMARKS */}
        <div style={{ marginTop: 16, border: "1.5px solid #111", padding: "7px 10px" }}>
          <div style={cellHead}>REMARKS</div>
          <E v={d.remarks} on={(v) => set({ remarks: v })} style={{ fontSize: 9.5, lineHeight: 1.6 }} block />
        </div>

        {/* 서명 */}
        <div style={{ marginTop: 26, position: "relative", width: 300 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.04em" }}>FOR AND ON BEHALF OF</div>
          <E v={d.signCompany} on={(v) => set({ signCompany: v })} style={{ fontSize: 17, fontWeight: 800, fontStyle: "italic", marginTop: 2 }} block />
          {sealOn && (
            <div style={{ position: "absolute", left: 44, top: -6 }}>
              <Seal seal={seal} size={62} />
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <E v={d.signScript} on={(v) => set({ signScript: v })} style={{ ...script, fontSize: 26 }} />
          </div>
          <div style={{ borderTop: "2.5px solid #111", width: 300, marginTop: 4, paddingTop: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.03em" }}>
            AUTHORIZED SIGNATURE
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== QT 양식 ============================== */
const QB = "#2455E6"; // 견적서 블루
function QtSheet({ d, set, seal, sealOn, delItem }: {
  d: QtData; set: (p: Partial<QtData>) => void; seal: string | null; sealOn: boolean;
  delItem: (i: number) => void;
}) {
  const setItem = (i: number, p: Partial<QtItem>) =>
    set({ items: d.items.map((it, j) => (j === i ? { ...it, ...p } : it)) });
  const heading: CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: QB,
    borderBottom: `1px solid ${QB}44`, display: "inline-block", paddingBottom: 2,
  };
  return (
    <div style={{ padding: "12mm 13mm 8mm", fontFamily: "'Pretendard Variable',Pretendard,sans-serif", color: "#20242c", display: "flex", flexDirection: "column", minHeight: "268mm" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <E v={d.coName} on={(v) => set({ coName: v })} style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.01em", color: "#1c2430" }} />
          <E v={d.coTag} on={(v) => set({ coTag: v })} style={{ fontSize: 8.5, letterSpacing: "0.42em", color: "#aab4c4", fontWeight: 700 }} block />
          <div style={{ marginTop: 12, fontSize: 9.5, color: "#5c6675", lineHeight: 1.6 }}>
            <E v={d.coAddr} on={(v) => set({ coAddr: v })} block />
          </div>
          <div style={{ marginTop: 8, fontSize: 9.5, fontWeight: 700 }}>
            <E v={d.coEmail} on={(v) => set({ coEmail: v })} style={{ color: QB }} />
            <span style={{ color: "#c0c6d0", margin: "0 8px" }}>|</span>
            <E v={d.coTel} on={(v) => set({ coTel: v })} />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: QB, letterSpacing: "-0.01em" }}>QUOTATION</div>
          <div style={{ marginTop: 8, fontSize: 10, display: "grid", gridTemplateColumns: "auto auto", gap: "3px 10px", justifyContent: "end" }}>
            <span style={{ color: "#aab4c4", fontWeight: 700, letterSpacing: "0.1em" }}>REF.</span>
            <E v={d.ref} on={(v) => set({ ref: v })} style={{ fontFamily: "monospace", fontWeight: 800 }} />
            <span style={{ color: "#aab4c4", fontWeight: 700, letterSpacing: "0.1em" }}>DATE.</span>
            <E v={d.date} on={(v) => set({ date: v })} style={{ fontFamily: "monospace", fontWeight: 800 }} />
          </div>
        </div>
      </div>

      <div style={{ borderTop: "2.5px solid #1c2430", margin: "16px 0 20px" }} />

      {/* PREPARED FOR */}
      <div>
        <span style={heading}>PREPARED FOR</span>
        <E v={d.clName} on={(v) => set({ clName: v })} style={{ fontSize: 15.5, fontWeight: 800, marginTop: 8 }} block />
        <E v={d.clAddr} on={(v) => set({ clAddr: v })} style={{ fontSize: 9.5, color: "#5c6675", marginTop: 4, lineHeight: 1.6 }} block />
        <E v={d.clAttn} on={(v) => set({ clAttn: v })} style={{ fontSize: 9.5, color: "#8a93a3", fontStyle: "italic", marginTop: 4 }} block />
      </div>

      {/* 표 */}
      <div style={{ marginTop: 18, borderTop: "2px solid #1c2430" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 130px", padding: "9px 10px", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", color: "#8a93a3" }}>
          <span>DESCRIPTION &amp; BREAKDOWN</span>
          <span style={{ textAlign: "center" }}>QTY</span>
          <span style={{ textAlign: "right" }}>TOTAL ({d.curCode})</span>
        </div>
        {d.items.map((it, i) =>
          it.kind === "main" ? (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 130px", alignItems: "center", background: "#f5f7fa", padding: "13px 10px", marginBottom: 3, position: "relative" }}>
              <button className="no-print" title="행 삭제" style={rowDel} onClick={() => delItem(i)}>×</button>
              <E v={it.desc} on={(v) => setItem(i, { desc: v })} style={{ fontSize: 12.5, fontWeight: 800, fontStyle: "italic" }} />
              <E v={it.qty} on={(v) => setItem(i, { qty: v })} style={{ textAlign: "center", fontSize: 11, fontWeight: 600 }} />
              <E v={fmt2(it.total)} on={(v) => setItem(i, { total: num(v) })} numeric style={{ textAlign: "right", fontSize: 13, fontWeight: 800, fontFamily: "monospace" }} />
            </div>
          ) : (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "56px 1fr 130px", alignItems: "center", padding: "7px 10px 7px 26px", borderBottom: "1px solid #eef0f4", position: "relative" }}>
              <button className="no-print" title="행 삭제" style={rowDel} onClick={() => delItem(i)}>×</button>
              <span style={{ fontSize: 8, letterSpacing: "0.14em", color: "#c0c6d0", fontWeight: 700 }}>DETAIL</span>
              <E v={it.desc} on={(v) => setItem(i, { desc: v })} style={{ fontSize: 9.5, color: "#5c6675", fontStyle: "italic" }} />
              <E v={fmt2(it.total)} on={(v) => setItem(i, { total: num(v) })} numeric style={{ textAlign: "right", fontSize: 9.5, color: "#8a93a3", fontFamily: "monospace" }} />
            </div>
          ),
        )}
      </div>

      {/* GRAND TOTAL */}
      <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 14 }}>
        <E v={d.grandLabel} on={(v) => set({ grandLabel: v })} style={{ fontSize: 10, letterSpacing: "0.18em", color: "#8a93a3", fontWeight: 700 }} />
        <E v={d.grandCur} on={(v) => set({ grandCur: v })} style={{ fontSize: 11, color: "#c0c6d0", fontWeight: 700 }} />
        <E v={d.grandValue} on={(v) => set({ grandValue: v })} style={{ fontSize: 30, fontWeight: 900, fontFamily: "monospace", letterSpacing: "-0.01em" }} />
      </div>

      {/* REMARKS + 서명 */}
      <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 30 }}>
        <div>
          <span style={heading}>REMARKS / NOTES</span>
          <E v={d.remarks} on={(v) => set({ remarks: v })} style={{ marginTop: 8, fontSize: 9.5, fontFamily: "monospace", lineHeight: 1.7, color: "#3a4250" }} block />
          <div style={{ marginTop: 8, borderLeft: `3px solid ${QB}`, background: "#eef3ff", padding: "6px 10px" }}>
            <E v={d.rateNote} on={(v) => set({ rateNote: v })} style={{ fontSize: 9, fontWeight: 800, color: QB, fontFamily: "monospace" }} />
          </div>
        </div>
        <div style={{ textAlign: "right", position: "relative", paddingTop: 18 }}>
          <E v={d.signScript} on={(v) => set({ signScript: v })} style={{ ...script, fontSize: 30 }} />
          {sealOn && (
            <div style={{ position: "absolute", right: -4, top: 2 }}>
              <Seal seal={seal} size={58} />
            </div>
          )}
          <div style={{ borderTop: "2.5px solid #1c2430", marginTop: 6 }} />
        </div>
      </div>

      {/* BANK + AUTHORIZED */}
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 30 }}>
        <div>
          <span style={heading}>BANK ACCOUNT DETAILS</span>
          <div style={{ marginTop: 8, fontSize: 9, fontFamily: "monospace", lineHeight: 1.8, color: "#3a4250" }}>
            <E v={d.bank1} on={(v) => set({ bank1: v })} block />
            <E v={d.bank2} on={(v) => set({ bank2: v })} style={{ fontWeight: 800 }} block />
            <E v={d.bank3} on={(v) => set({ bank3: v })} block />
          </div>
        </div>
        <div style={{ textAlign: "right", alignSelf: "end" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.22em" }}>AUTHORIZED SIGNATURE</div>
          <div style={{ fontSize: 8, letterSpacing: "0.14em", color: "#c0c6d0", marginTop: 3, fontWeight: 700 }}>
            FOR AND ON BEHALF OF {d.coName.toUpperCase()}
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{ marginTop: "auto", borderTop: "1px solid #e2e6ec", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 8, letterSpacing: "0.22em", color: "#c0c6d0", fontWeight: 700 }}>
        <E v={d.footL} on={(v) => set({ footL: v })} />
        <E v={d.footR} on={(v) => set({ footR: v })} />
      </div>
    </div>
  );
}

/* ============================== 메인 ============================== */
type SavedDoc = { id: string; doc_type: TradeDocType; title: string; data: unknown; author: string; updated_at: string };

export default function TradeDocs({ type }: { type: TradeDocType }) {
  const flash = useToast();
  const { profile } = useAuth();
  const seal = useSeal();
  const [sealOn, setSealOn] = useState(true);
  const [data, setData] = useState<unknown>(() => structuredClone(DEFAULTS[type]));
  const [docId, setDocId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState<SavedDoc[]>([]);
  const [openList, setOpenList] = useState(false);
  const typeRef = useRef(type);

  // 유형 전환 시: 새 문서 상태로
  useEffect(() => {
    if (typeRef.current !== type) {
      typeRef.current = type;
      setData(structuredClone(DEFAULTS[type]));
      setDocId(null);
      setTitle("");
    }
  }, [type]);

  const loadSaved = async () => {
    if (isSupabaseConfigured) {
      const { data: rows } = await supabase
        .from("generated_docs")
        .select("*")
        .order("updated_at", { ascending: false });
      if (rows) setSaved(rows as SavedDoc[]);
    } else {
      try { setSaved(JSON.parse(localStorage.getItem("ljbio_docs") || "[]")); } catch { setSaved([]); }
    }
  };
  useEffect(() => { loadSaved(); }, []);

  const set = (p: Record<string, unknown>) =>
    setData((d: unknown) => ({ ...(d as Record<string, unknown>), ...p }));

  /* -------- 항목 추가/삭제 -------- */
  const addItem = (kind?: string) => {
    const d = data as { items: unknown[] };
    let it: unknown;
    if (type === "PO") it = { desc: "New Item", sub: "", unit: 0, qty: 0 };
    else if (type === "CIJ") it = { marks: "C/NO.1", desc: "New Item", hs: "HS CODE: ", qty: 0, unit: 0 };
    else it = { kind: kind || "main", desc: kind === "detail" ? "Detail item" : "NEW ITEM", qty: "1", total: 0 };
    set({ items: [...d.items, it] });
  };
  const delItem = (i: number) => {
    const d = data as { items: unknown[] };
    if (d.items.length <= 1) { flash("항목은 최소 1개가 필요합니다"); return; }
    set({ items: d.items.filter((_, j) => j !== i) });
  };

  /* -------- 저장/불러오기 -------- */
  const defaultTitle = () => {
    const d = data as Record<string, string>;
    const no = d.poNo || d.invoiceNo || d.ref || "";
    return `${TRADE_LABEL[type].split(" ")[0]}_${no || today()}`;
  };

  async function save(asNew: boolean) {
    const name = window.prompt("저장할 문서 이름", title || defaultTitle());
    if (name === null) return;
    const t = name.trim() || defaultTitle();
    const row = { doc_type: type, title: t, data, author: profile?.name ?? "지경준" };
    if (isSupabaseConfigured) {
      if (docId && !asNew) {
        const { error } = await supabase
          .from("generated_docs")
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq("id", docId);
        if (error) { flash("저장 실패: " + error.message); return; }
      } else {
        const { data: ins, error } = await supabase.from("generated_docs").insert(row).select().single();
        if (error) { flash("저장 실패: " + error.message); return; }
        if (ins) setDocId((ins as SavedDoc).id);
      }
    } else {
      const list: SavedDoc[] = JSON.parse(localStorage.getItem("ljbio_docs") || "[]");
      if (docId && !asNew) {
        const i = list.findIndex((x) => x.id === docId);
        if (i >= 0) list[i] = { ...list[i], ...row, updated_at: new Date().toISOString() } as SavedDoc;
      } else {
        const id = "d" + Date.now();
        list.unshift({ id, ...row, updated_at: new Date().toISOString() } as SavedDoc);
        setDocId(id);
      }
      localStorage.setItem("ljbio_docs", JSON.stringify(list));
    }
    setTitle(t);
    flash(asNew ? "새 문서로 저장했습니다" : "저장했습니다");
    loadSaved();
  }

  function loadDoc(s: SavedDoc) {
    if (s.doc_type !== type) {
      flash("이 문서는 '" + (TRADE_LABEL[s.doc_type] || s.doc_type) + "' 유형입니다. 위에서 유형을 먼저 바꿔주세요.");
      return;
    }
    setData(structuredClone(s.data));
    setDocId(s.id);
    setTitle(s.title);
    setOpenList(false);
    flash("'" + s.title + "' 문서를 불러왔습니다");
  }

  async function removeDoc(s: SavedDoc) {
    if (!window.confirm(`'${s.title}' 문서를 삭제할까요?`)) return;
    if (isSupabaseConfigured) await supabase.from("generated_docs").delete().eq("id", s.id);
    else {
      const list: SavedDoc[] = JSON.parse(localStorage.getItem("ljbio_docs") || "[]").filter((x: SavedDoc) => x.id !== s.id);
      localStorage.setItem("ljbio_docs", JSON.stringify(list));
    }
    if (docId === s.id) setDocId(null);
    flash("삭제했습니다");
    loadSaved();
  }

  function printPdf() {
    flash("인쇄 창에서 'PDF로 저장'을 선택하면 A4 PDF로 저장됩니다");
    setTimeout(() => window.print(), 350);
  }

  const tb: CSSProperties = {
    padding: "9px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
    border: "1px solid rgba(12,15,13,0.14)", background: "#fff", color: "#3A3C45", whiteSpace: "nowrap",
  };

  return (
    <div>
      {/* 툴바 */}
      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "4px 0 14px" }}>
        <button className="pbtn" onClick={() => save(false)} style={{ ...tb, border: "none", background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff" }}>
          💾 저장{docId ? " (덮어쓰기)" : ""}
        </button>
        {docId && <button className="gbtn" onClick={() => save(true)} style={tb}>📄 새 문서로 저장</button>}
        <button className="gbtn" onClick={() => { loadSaved(); setOpenList(true); }} style={tb}>📂 저장된 문서</button>
        <button className="gbtn" onClick={printPdf} style={{ ...tb, border: "1px solid rgba(14,123,78,0.4)", color: "#0E7B4E" }}>
          🖨 인쇄 · PDF 저장 (A4)
        </button>
        <button className="gbtn" onClick={() => addItem()} style={tb}>+ 항목 추가</button>
        {type === "QT" && <button className="gbtn" onClick={() => addItem("detail")} style={tb}>+ 세부내역 추가</button>}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#4A4C55", cursor: "pointer" }}>
          <input type="checkbox" checked={sealOn} onChange={(e) => setSealOn(e.target.checked)} /> 도장 표시
        </label>
        <button
          className="gbtn"
          onClick={() => { if (window.confirm("작성 중인 내용을 지우고 새 문서를 시작할까요?")) { setData(structuredClone(DEFAULTS[type])); setDocId(null); setTitle(""); } }}
          style={{ ...tb, color: "#C4553E", border: "1px solid rgba(196,85,62,0.3)" }}
        >
          ✚ 새로 시작
        </button>
        {title && (
          <span style={{ fontSize: 12, color: "#84908A" }}>
            편집 중: <b style={{ color: "#0E7B4E" }}>{title}</b>
          </span>
        )}
      </div>
      <div className="no-print" style={{ fontSize: 12, color: "#84908A", marginBottom: 12 }}>
        ✏️ 문서 위의 <b>모든 글자(회사명 포함)를 클릭하면 바로 수정</b>됩니다 · 표의 행 왼쪽 <b>×</b>로 삭제 · 숫자를 바꾸면 합계 자동 계산
      </div>

      {/* A4 시트 */}
      <div style={{ overflowX: "auto", paddingBottom: 20 }}>
        <div id="a4doc" className="a4sheet">
          {type === "PO" && (
            <PoSheet d={data as PoData} set={set as (p: Partial<PoData>) => void} seal={seal} sealOn={sealOn} delItem={delItem} />
          )}
          {type === "CIJ" && (
            <CiSheet d={data as CiData} set={set as (p: Partial<CiData>) => void} seal={seal} sealOn={sealOn} delItem={delItem} />
          )}
          {type === "QT" && (
            <QtSheet d={data as QtData} set={set as (p: Partial<QtData>) => void} seal={seal} sealOn={sealOn} delItem={delItem} />
          )}
        </div>
      </div>

      {/* 저장된 문서 목록 */}
      <Modal open={openList} onClose={() => setOpenList(false)} width={560}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>📂 저장된 문서</h2>
        <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 4 }}>
          클릭하면 불러와서 이어서 편집할 수 있습니다.
        </div>
        <div style={{ marginTop: 14, maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {saved.map((s) => (
            <div
              key={s.id}
              className="row-h"
              onClick={() => loadDoc(s)}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 11, cursor: "pointer" }}
            >
              <span style={{ fontSize: 17 }}>{s.doc_type === "PO" ? "📋" : s.doc_type === "CIJ" ? "🧾" : "💰"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: "#84908A", marginTop: 2 }}>
                  {TRADE_LABEL[s.doc_type] || s.doc_type} · {s.author} · {String(s.updated_at).slice(0, 10)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeDoc(s); }}
                className="gbtn"
                style={{ padding: "6px 10px", border: "1px solid rgba(196,85,62,0.3)", borderRadius: 8, background: "#fff", color: "#C4553E", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
              >
                삭제
              </button>
            </div>
          ))}
          {saved.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "#9AA29C", fontSize: 13 }}>
              저장된 문서가 없습니다. 문서를 작성하고 💾 저장을 눌러보세요.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
