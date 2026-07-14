import { useEffect, useRef, useState, type CSSProperties } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "../ui";

/**
 * 인허가 조회 — 식약처(MFDS)·공정거래위원회 공공데이터 통합 검색
 *  · 최신 이슈 동향: 리콜·회수·행정처분·공급중단 최신 5건 자동 표시
 *  · 통합 인사이트: 한 번 검색으로 8개 데이터소스 동시 조회 → 위험신호 요약
 *  · 개별 조회: 소스별 맞춤 검색 필드 + 페이지네이션
 * Edge Function(mfds)을 통해 호출합니다(인증키는 서버에만 보관).
 */

type Row = Record<string, unknown>;

type Field = {
  key: string;
  label: string;
  placeholder: string;
  /** 이 필드가 매핑되는 API 파라미터 후보들 */
  params: string[];
};

type Source = {
  key: string;
  label: string;
  icon: string;
  desc: string;
  /** "서비스/오퍼레이션" 또는 "기관코드/서비스/오퍼레이션" 후보 (버전 폴백) */
  candidates: string[];
  itemParams: string[]; // 통합검색: 품목명
  entpParams: string[]; // 통합검색: 업체명
  /** 개별 조회의 맞춤 검색 필드 */
  fields: Field[];
  /** 위험신호(회수·처분·중단·부족·리콜) 여부 */
  risk?: boolean;
  /** 최신 이슈 피드에 포함 */
  feed?: boolean;
};

const SOURCES: Source[] = [
  {
    key: "drug",
    label: "의약품 허가",
    icon: "💊",
    desc: "의약품 제품(품목) 허가정보 — 허가번호·허가일·취소여부",
    candidates: [
      "DrugPrdtPrmsnInfoService06/getDrugPrdtPrmsnDtlInq05",
      "DrugPrdtPrmsnInfoService05/getDrugPrdtPrmsnDtlInq04",
      "DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq03",
      "DrugPrdtPrmsnInfoService03/getDrugPrdtPrmsnDtlInq02",
    ],
    itemParams: ["item_name"],
    entpParams: ["entp_name"],
    fields: [
      { key: "item", label: "품목명", placeholder: "예: 타이레놀", params: ["item_name"] },
      { key: "entp", label: "업체명", placeholder: "예: 한미약품", params: ["entp_name"] },
      { key: "seq", label: "품목기준코드", placeholder: "예: 200808876", params: ["item_seq"] },
    ],
  },
  {
    key: "device",
    label: "의료기기 허가",
    icon: "🩺",
    desc: "의료기기 제품(품목) 허가정보 — 허가번호·등급·허가일자",
    candidates: [
      "MdeqPrdlstInfoService02/getMdeqPrdlstInq01",
      "MdeqPrdlstInfoService01/getMdeqPrdlstInq",
      "MdeqPrdlstInfoService/getMdeqPrdlstInq",
    ],
    itemParams: ["itemName", "item_name", "ITEM_NAME"],
    entpParams: ["entpName", "entp_name", "ENTP_NAME"],
    fields: [
      { key: "item", label: "품목명", placeholder: "예: 혈압계", params: ["itemName", "item_name"] },
      { key: "entp", label: "업체명", placeholder: "예: 메디트", params: ["entpName", "entp_name"] },
      { key: "no", label: "허가번호", placeholder: "예: 제허 12-345호", params: ["itemNoFullname", "item_no", "ITEM_NO"] },
    ],
  },
  {
    key: "recall",
    label: "회수·판매중지",
    icon: "🚨",
    risk: true,
    feed: true,
    desc: "식약처 의약품 회수·판매중지 정보 — 회수사유·등급·명령일",
    candidates: [
      "MdcinRtrvlSleStpgeInfoService03/getMdcinRtrvlSleStpgeItem02",
      "MdcinRtrvlSleStpgeInfoService02/getMdcinRtrvlSleStpgeItem01",
      "MdcinRtrvlSleStpgeInfoService/getMdcinRtrvlSleStpgeItem",
    ],
    itemParams: ["Prduct", "item_name"],
    entpParams: ["Entrps", "entp_name"],
    fields: [
      { key: "item", label: "제품명", placeholder: "예: ○○정", params: ["Prduct", "item_name"] },
      { key: "entp", label: "업체명", placeholder: "예: ○○제약", params: ["Entrps", "entp_name"] },
      { key: "resn", label: "회수사유", placeholder: "예: 품질부적합", params: ["Rtrvl_Resn", "RTRVL_RESN", "rtrvlResn"] },
    ],
  },
  {
    key: "ftcRecall",
    label: "공정위 리콜",
    icon: "📢",
    risk: true,
    feed: true,
    desc: "공정거래위원회 의약품 리콜정보 — 리콜 사유·유형·일자",
    candidates: [
      "1130000/MdcineRecallInfoService2/getMdcineRecallInfo02",
      "1130000/MdcineRecallInfoService/getMdcineRecallInfo",
      "1130000/RecallInfoMdcineService/getRecallInfoMdcine",
    ],
    itemParams: ["prdctNm", "item_name", "Prduct"],
    entpParams: ["bsnmNm", "entp_name", "Entrps"],
    fields: [
      { key: "item", label: "제품명", placeholder: "예: ○○정", params: ["prdctNm", "item_name"] },
      { key: "entp", label: "업체명", placeholder: "예: ○○제약", params: ["bsnmNm", "entp_name"] },
    ],
  },
  {
    key: "adm",
    label: "행정처분",
    icon: "⚖️",
    risk: true,
    feed: true,
    desc: "식약처 의약품 행정처분 정보 — 처분명·위반내용·처분일",
    candidates: [
      "MdcinExaathrService05/getMdcinExaathrList04",
      "MdcinExaathrService04/getMdcinExaathrList03",
      "MdcinExaathrService03/getMdcinExaathrList02",
      "MdcinExaathrService01/getMdcinExaathrList",
    ],
    itemParams: ["item_name", "ITEM_NAME"],
    entpParams: ["entp_name", "ENTP_NAME"],
    fields: [
      { key: "item", label: "품목명", placeholder: "예: ○○정", params: ["item_name"] },
      { key: "entp", label: "업체명", placeholder: "예: ○○제약", params: ["entp_name"] },
      { key: "disp", label: "처분명", placeholder: "예: 판매업무정지", params: ["adm_disps_name", "ADM_DISPS_NAME"] },
    ],
  },
  {
    key: "stop",
    label: "공급중단 보고",
    icon: "📉",
    risk: true,
    feed: true,
    desc: "의약품 생산·수입·공급 중단 보고 정보",
    candidates: [
      "MdcinStopReportInfoService/getMdcinStopReportList",
      "DrugPrdcStpService/getDrugPrdcStpItem",
      "DrugPrdcStpInfoService/getDrugPrdcStpInfoList",
      "MdcinPrdcStpService/getMdcinPrdcStpList",
    ],
    itemParams: ["item_name", "itemName", "Prduct"],
    entpParams: ["entp_name", "entpName", "Entrps"],
    fields: [
      { key: "item", label: "품목명", placeholder: "예: ○○주사", params: ["item_name", "itemName"] },
      { key: "entp", label: "업체명", placeholder: "예: ○○제약", params: ["entp_name", "entpName"] },
    ],
  },
  {
    key: "shortage",
    label: "공급부족",
    icon: "⚠️",
    risk: true,
    desc: "의약품 공급부족 정보 — 부족 사유·기간",
    candidates: [
      "MdcinShtgInfoService/getMdcinShtgItem",
      "DrugShtgInfoService/getDrugShtgInfoList",
      "MdcinSplyShtgInfoService/getMdcinSplyShtgList",
    ],
    itemParams: ["item_name", "itemName", "Prduct"],
    entpParams: ["entp_name", "entpName", "Entrps"],
    fields: [
      { key: "item", label: "품목명", placeholder: "예: ○○주사", params: ["item_name", "itemName"] },
      { key: "entp", label: "업체명", placeholder: "예: ○○제약", params: ["entp_name", "entpName"] },
    ],
  },
  {
    key: "output",
    label: "생산·수입실적",
    icon: "🏭",
    desc: "의약품 생산·수입실적 현황 (생산: 백만원 · 수입: 달러)",
    candidates: [
      "MdcinPrdctnImportAcmsltService02/getMdcinPrdctnImportrstList02",
      "MdcinPrdctnImportAcmsltService01/getMdcinPrdctnImportrstList01",
      "MdcinPrdctnImportAcmsltService/getMdcinPrdctnImportrstList",
    ],
    itemParams: ["item_name", "itemName"],
    entpParams: ["entp_name", "entpName"],
    fields: [
      { key: "item", label: "품목명", placeholder: "예: ○○정", params: ["item_name", "itemName"] },
      { key: "entp", label: "업체명", placeholder: "예: ○○제약", params: ["entp_name", "entpName"] },
      { key: "year", label: "연도", placeholder: "예: 2025", params: ["year", "YEAR", "stats_yy"] },
    ],
  },
];

const FEED_SOURCES = SOURCES.filter((s) => s.feed);

/** 자주 나오는 영문 필드 → 한글 라벨 */
const LABELS: Record<string, string> = {
  ITEM_NAME: "품목명", ITEM_SEQ: "품목기준코드", ENTP_NAME: "업체명",
  ITEM_PERMIT_DATE: "허가일", PERMIT_KIND_NAME: "허가구분", CANCEL_DATE: "취소/취하일",
  CANCEL_NAME: "상태", ETC_OTC_CODE: "전문/일반", CHART: "성상",
  CLASS_NO: "분류번호", CLASS_NO_NAME: "분류명", BAR_CODE: "표준코드",
  MATERIAL_NAME: "원료성분", VALID_TERM: "유효기간", REEXAM_TARGET: "재심사대상",
  PACK_UNIT: "포장단위", MAKE_MATERIAL_FLAG: "완제/원료", ITEM_NO: "허가번호",
  PRDUCT: "제품명", ENTRPS: "업체명", RTRVL_RESN: "회수사유",
  RECALL_COMMAND_DATE: "회수명령일", RTRVL_CMND_DE: "회수명령일", GRADE: "등급",
  ENTP_NO: "업체번호", ADM_DISPS_SEQ: "처분번호", ADM_DISPS_NAME: "행정처분명",
  EXPOSE_CONT: "위반내용", ADM_DISPS_DATE: "처분일", LAST_SETTLE_DATE: "확정일",
  BEF_APPLY_LAW: "적용법령", DISPS_TERM_DATE: "처분기간",
  PRDLST_NM: "품목명", PRDLST_CD: "품목코드", PRMISN_DE: "허가일자",
  ENTP_ADDR: "주소", CLSF_NO: "분류번호", TYPE_NAME: "유형",
  PRDCTN_AMT: "생산금액(백만원)", IMPORT_AMT: "수입금액(달러)", YEAR: "연도",
  STOP_RESN: "중단사유", STOP_DE: "중단일", RPT_DE: "보고일",
  INDUTY: "업종", BIZRNO: "사업자번호", MNFCTUR_YM: "제조년월",
  prdctNm: "제품명", bsnmNm: "업체명", recallPblancDt: "리콜공표일",
  recallSe: "리콜유형", flawCn: "결함내용", rtrvlPlanCn: "회수계획",
};

const TITLE_KEYS = ["ITEM_NAME", "PRDUCT", "Prduct", "PRDLST_NM", "itemName", "ITEM_NM", "prduct", "prdctNm"];
const ENTP_KEYS = ["ENTP_NAME", "ENTRPS", "entpName", "BSSH_NM", "entrps", "bsnmNm"];
const DATE_KEYS = [
  "RECALL_COMMAND_DATE", "RTRVL_CMND_DE", "recallPblancDt", "ADM_DISPS_DATE",
  "LAST_SETTLE_DATE", "STOP_DE", "RPT_DE", "CANCEL_DATE", "ITEM_PERMIT_DATE", "PRMISN_DE",
];
const REASON_KEYS = ["RTRVL_RESN", "EXPOSE_CONT", "STOP_RESN", "flawCn", "ADM_DISPS_NAME", "recallSe"];

const fld: CSSProperties = {
  padding: "11px 13px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 9,
  fontSize: 14,
};
const lblSt: CSSProperties = { fontSize: 12, color: "#4A4C55", fontWeight: 600, marginBottom: 5, display: "block" };

function pick(row: Row, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v);
  }
  return "";
}

/** data.go.kr 응답에서 목록/총건수/결과코드 추출 */
function extract(data: unknown): { items: Row[]; total: number | null; code: string; msg: string } {
  const d = data as Record<string, unknown>;
  const resp = (d?.response ?? d) as Record<string, unknown>;
  const body = (resp?.body ?? resp) as Record<string, unknown>;
  const header = (resp?.header ?? d?.header ?? {}) as Record<string, unknown>;
  let items: unknown = body?.items ?? [];
  if (items && !Array.isArray(items)) {
    const inner = (items as Record<string, unknown>).item;
    items = inner ?? items;
  }
  if (items && !Array.isArray(items)) items = [items];
  const rows = ((items as unknown[]) || [])
    .map((x) => ((x as Record<string, unknown>)?.item ?? x) as Row)
    .filter((x) => x && typeof x === "object");
  const totalRaw = Number(body?.totalCount ?? NaN);
  return {
    items: rows,
    total: Number.isNaN(totalRaw) ? null : totalRaw,
    code: String(header?.resultCode ?? ""),
    msg: String(header?.resultMsg ?? ""),
  };
}

type SourceResult = {
  status: "ok" | "error" | "idle";
  items: Row[];
  total: number | null;
  error?: string;
};

type ParamSet = { params: string[]; value: string };

/** 후보 주소 폴백 + 성공 주소 기억 포함 단일 소스 조회 */
async function querySource(
  src: Source,
  paramSets: ParamSet[],
  pageNo: number,
  numOfRows: number,
): Promise<SourceResult> {
  const epKey = "mfds_ep_" + src.key;
  let candidates = [...src.candidates];
  try {
    const saved = localStorage.getItem(epKey);
    if (saved && candidates.includes(saved))
      candidates = [saved, ...candidates.filter((c) => c !== saved)];
  } catch { /* ignore */ }
  let lastErr = "";
  for (const path of candidates) {
    try {
      const params: Record<string, string | number> = { pageNo, numOfRows };
      for (const ps of paramSets) {
        const v = (ps.value || "").trim();
        if (v) for (const k of ps.params) params[k] = v;
      }
      const { data, error: fnErr } = await supabase.functions.invoke("mfds", {
        body: { path, params },
      });
      if (fnErr) {
        // FunctionsHttpError의 응답 본문에서 실제 원인 추출
        let msg = fnErr.message || "조회 서버 호출 실패";
        const ctx = (fnErr as { context?: Response }).context;
        if (ctx && typeof ctx.clone === "function") {
          try {
            const t = await ctx.clone().text();
            try {
              const j = JSON.parse(t) as { error?: string; message?: string; msg?: string };
              msg = j.error || j.message || j.msg || msg;
            } catch {
              if (t) msg = t.slice(0, 200);
            }
          } catch {
            /* ignore */
          }
        }
        if (/not\s*found|404/i.test(msg))
          msg = "Supabase에 'mfds' Edge Function이 없습니다. 함수 이름이 mfds인지 확인하세요.";
        throw new Error(msg);
      }
      const res = data as { ok?: boolean; data?: unknown; error?: string };
      if (!res?.ok) throw new Error(res?.error || "API 오류");
      const r = extract(res.data);
      if (r.code === "00" || r.items.length > 0 || /no\s*_?data/i.test(r.msg)) {
        try { localStorage.setItem(epKey, path); } catch { /* ignore */ }
        return { status: "ok", items: r.items, total: r.total };
      }
      lastErr = r.msg || r.code || "알 수 없는 응답";
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  return { status: "error", items: [], total: null, error: lastErr };
}

/* ============================== 카드/행 ============================== */
function ResultCard({ row, compact }: { row: Row; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const title = pick(row, TITLE_KEYS) || "(품목명 없음)";
  const entpName = pick(row, ENTP_KEYS);
  const fields = Object.entries(row).filter(
    ([, v]) => v != null && String(v).trim() !== "" && String(v).length < 4000,
  );
  const limit = compact ? 4 : 8;
  const shown = open ? fields : fields.slice(0, limit);
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(12,15,13,0.08)",
        borderRadius: 12,
        padding: compact ? "12px 14px" : "16px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: compact ? 13.5 : 15, fontWeight: 700 }}>{title}</span>
        {entpName && <span style={{ fontSize: 12, color: "#0E7B4E", fontWeight: 600 }}>{entpName}</span>}
      </div>
      <div
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: "5px 16px",
        }}
      >
        {shown.map(([k, v]) => (
          <div key={k} style={{ fontSize: 12, display: "flex", gap: 7, minWidth: 0 }}>
            <span style={{ color: "#9AA29C", flexShrink: 0 }}>{LABELS[k] || k}</span>
            <span
              style={{
                color: "#3A3C45",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: open ? "normal" : "nowrap",
                wordBreak: "break-all",
              }}
            >
              {String(v)}
            </span>
          </div>
        ))}
      </div>
      {fields.length > limit && (
        <button
          onClick={() => setOpen(!open)}
          style={{
            marginTop: 8,
            padding: "4px 11px",
            borderRadius: 7,
            border: "1px solid rgba(12,15,13,0.14)",
            background: "#fff",
            fontSize: 11.5,
            fontWeight: 600,
            color: "#5A5C65",
            cursor: "pointer",
          }}
        >
          {open ? "접기 ▲" : `전체 보기 (${fields.length}) ▼`}
        </button>
      )}
    </div>
  );
}

function FeedRow({ row }: { row: Row }) {
  const title = pick(row, TITLE_KEYS) || "(품목명 없음)";
  const entpName = pick(row, ENTP_KEYS);
  const date = pick(row, DATE_KEYS);
  const reason = pick(row, REASON_KEYS);
  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid rgba(12,15,13,0.06)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 0 }}>{title}</span>
        {entpName && <span style={{ fontSize: 11.5, color: "#0E7B4E", fontWeight: 600 }}>{entpName}</span>}
        {date && (
          <span className="mono" style={{ fontSize: 11, color: "#9AA29C", marginLeft: "auto" }}>{date}</span>
        )}
      </div>
      {reason && (
        <div
          style={{
            marginTop: 3,
            fontSize: 12,
            color: "#5A5C65",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {reason}
        </div>
      )}
    </div>
  );
}

/* ============================== 메인 ============================== */
export default function Regulatory() {
  const flash = useToast();
  const [mode, setMode] = useState<"all" | "single">("all");
  const [item, setItem] = useState("");
  const [entp, setEntp] = useState("");

  /* 최신 이슈 피드 */
  const [feed, setFeed] = useState<Record<string, SourceResult>>({});
  const [feedLoading, setFeedLoading] = useState(false);
  const feedLoaded = useRef(false);

  /* 통합 인사이트 상태 */
  const [agg, setAgg] = useState<Record<string, SourceResult>>({});
  const [aggLoading, setAggLoading] = useState(false);
  const [aggDone, setAggDone] = useState(false);

  /* 개별 조회 상태 */
  const [tabKey, setTabKey] = useState("drug");
  const tab = SOURCES.find((t) => t.key === tabKey) || SOURCES[0];
  const [vals, setVals] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  /* 최신 이슈 자동 로드 (페이지 진입 시 1회) */
  useEffect(() => {
    if (!isSupabaseConfigured || feedLoaded.current) return;
    feedLoaded.current = true;
    setFeedLoading(true);
    (async () => {
      const results = await Promise.all(
        FEED_SOURCES.map(async (s) => [s.key, await querySource(s, [], 1, 5)] as const),
      );
      setFeed(Object.fromEntries(results));
      setFeedLoading(false);
    })();
  }, []);

  const requireLive = () => {
    if (!isSupabaseConfigured) {
      flash("실서버 배포 후 사용 가능한 기능입니다");
      return false;
    }
    return true;
  };

  /* ---------------- 통합 검색 ---------------- */
  async function searchAll() {
    if (!requireLive()) return;
    if (!item.trim() && !entp.trim()) {
      flash("품목명 또는 업체명을 입력하세요");
      return;
    }
    setAggLoading(true);
    setAggDone(false);
    setAgg(Object.fromEntries(SOURCES.map((s) => [s.key, { status: "idle", items: [], total: null }])));
    const results = await Promise.all(
      SOURCES.map(async (s) =>
        [
          s.key,
          await querySource(
            s,
            [
              { params: s.itemParams, value: item },
              { params: s.entpParams, value: entp },
            ],
            1,
            5,
          ),
        ] as const,
      ),
    );
    setAgg(Object.fromEntries(results));
    setAggLoading(false);
    setAggDone(true);
  }

  /* ---------------- 개별 검색 (맞춤 필드) ---------------- */
  async function searchOne(pageNo = 1, append = false) {
    if (!requireLive()) return;
    setLoading(true);
    setError("");
    if (!append) {
      setRows([]);
      setTotal(null);
    }
    setSearched(true);
    const paramSets: ParamSet[] = tab.fields.map((f) => ({
      params: f.params,
      value: vals[tab.key + ":" + f.key] || "",
    }));
    const r = await querySource(tab, paramSets, pageNo, 20);
    if (r.status === "ok") {
      setRows((prev) => (append ? [...prev, ...r.items] : r.items));
      setTotal(r.total);
      setPage(pageNo);
    } else {
      setError(r.error || "조회에 실패했습니다");
    }
    setLoading(false);
  }

  const goSingle = (key: string) => {
    const src = SOURCES.find((s) => s.key === key);
    setMode("single");
    setTabKey(key);
    setRows([]);
    setTotal(null);
    setError("");
    setSearched(false);
    // 통합 검색어를 개별 필드로 이어받기
    if (src) {
      setVals((v) => ({
        ...v,
        [key + ":item"]: item,
        [key + ":entp"]: entp,
      }));
    }
  };

  /* 인사이트 요약 */
  const riskSources = SOURCES.filter((s) => s.risk);
  const riskHits = riskSources
    .map((s) => ({ s, r: agg[s.key] }))
    .filter(({ r }) => r?.status === "ok" && (r.total ?? r.items.length) > 0);
  const riskErrors = riskSources.filter((s) => agg[s.key]?.status === "error");
  const cnt = (r?: SourceResult) => (r?.status === "ok" ? (r.total ?? r.items.length) : 0);

  const keyGuide = /SERVICE\s*KEY|REGISTERED|인증|MFDS_API_KEY/i.test(error);

  return (
    <div className="fade" style={{ maxWidth: 1160, margin: "0 auto" }}>
      {/* 모드 전환 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(
          [
            ["all", "🔎 통합 인사이트"],
            ["single", "🗂 개별 조회"],
          ] as const
        ).map(([k, label]) => {
          const on = mode === k;
          return (
            <button
              key={k}
              onClick={() => setMode(k)}
              style={{
                padding: "9px 17px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                border: `1.5px solid ${on ? "#0E7B4E" : "rgba(12,15,13,0.14)"}`,
                background: on ? "#0E7B4E" : "#fff",
                color: on ? "#fff" : "#4A4C55",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ==================== 통합 인사이트 ==================== */}
      {mode === "all" && (
        <>
          {/* 검색 바 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(12,15,13,0.07)",
              borderRadius: 16,
              padding: "18px 20px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12.5, color: "#84908A", marginBottom: 12 }}>
              품목명·업체명으로 허가 · 회수 · 리콜 · 행정처분 · 공급중단/부족 · 실적을 한 번에 조회합니다 ·
              출처: 식약처·공정위 공공데이터
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchAll()}
                placeholder="품목/제품명 (예: 타이레놀)"
                style={{ ...fld, flex: 2, minWidth: 180 }}
              />
              <input
                value={entp}
                onChange={(e) => setEntp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchAll()}
                placeholder="업체명 (예: 한미약품)"
                style={{ ...fld, flex: 1.4, minWidth: 150 }}
              />
              <button
                onClick={searchAll}
                disabled={aggLoading}
                className="pbtn"
                style={{
                  padding: "11px 26px",
                  border: "none",
                  borderRadius: 9,
                  background: aggLoading ? "#9AA29C" : "linear-gradient(110deg,#0E7B4E,#46D08A)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: aggLoading ? "default" : "pointer",
                }}
              >
                {aggLoading ? "조회 중…" : "🔍 통합 조회"}
              </button>
            </div>
          </div>

          {/* 인사이트 요약 */}
          {aggDone && (
            <div
              style={{
                borderRadius: 16,
                padding: "18px 20px",
                marginBottom: 16,
                border: `1.5px solid ${riskHits.length ? "rgba(209,67,67,0.35)" : "rgba(14,123,78,0.3)"}`,
                background: riskHits.length ? "#FDF3F1" : "#EFF8F2",
              }}
            >
              <div
                style={{
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: riskHits.length ? "#B33B2A" : "#256F4C",
                }}
              >
                {riskHits.length
                  ? `⚠️ 위험 신호 ${riskHits.length}개 소스에서 발견`
                  : "✅ 회수·리콜·행정처분·공급중단/부족 이력이 조회되지 않았습니다"}
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: "#5A5C65", lineHeight: 1.6 }}>
                {riskHits.length > 0 &&
                  riskHits
                    .map(
                      ({ s, r }) =>
                        `${s.icon} ${s.label} ${(r!.total ?? r!.items.length).toLocaleString()}건`,
                    )
                    .join(" · ")}
                {riskErrors.length > 0 && (
                  <div style={{ marginTop: 4, color: "#9AA29C" }}>
                    ※ {riskErrors.map((s) => s.label).join("·")} 소스는 조회 실패 — 개별 조회에서 오류
                    내용을 확인하세요.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 소스별 요약 칩 */}
          {(aggLoading || aggDone) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {SOURCES.map((s) => {
                const r = agg[s.key];
                const n = cnt(r);
                const err = r?.status === "error";
                const hit = s.risk && n > 0;
                return (
                  <button
                    key={s.key}
                    onClick={() => goSingle(s.key)}
                    title="개별 조회로 이동"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 13px",
                      borderRadius: 20,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: `1.5px solid ${hit ? "#D14343" : err ? "rgba(12,15,13,0.14)" : "rgba(14,123,78,0.3)"}`,
                      background: hit ? "#FDE8E8" : "#fff",
                      color: hit ? "#B33B2A" : err ? "#9AA29C" : "#2F6349",
                    }}
                  >
                    {s.icon} {s.label}
                    {r?.status === "idle" ? <span>…</span> : err ? <span>조회불가</span> : <span>{n.toLocaleString()}건</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* 소스별 미리보기 (검색 결과) */}
          {aggDone &&
            SOURCES.map((s) => {
              const r = agg[s.key];
              if (!r || r.status !== "ok" || r.items.length === 0) return null;
              return (
                <div key={s.key} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>
                      {s.icon} {s.label}{" "}
                      <span style={{ color: "#84908A", fontWeight: 600, fontSize: 12.5 }}>
                        {(r.total ?? r.items.length).toLocaleString()}건
                      </span>
                    </h3>
                    <button
                      onClick={() => goSingle(s.key)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#0E7B4E",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      전체 보기 →
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {r.items.slice(0, 3).map((row, i) => (
                      <ResultCard key={i} row={row} compact />
                    ))}
                  </div>
                </div>
              );
            })}

          {/* ===== 최신 이슈 동향 (검색 전 기본 화면) ===== */}
          {!aggDone && !aggLoading && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>📡 최신 이슈 동향</h3>
                <span style={{ fontSize: 12, color: "#84908A" }}>
                  리콜 · 회수 · 행정처분 · 공급중단 최신 등록 5건씩
                </span>
              </div>
              {!isSupabaseConfigured ? (
                <div
                  style={{
                    padding: 34,
                    textAlign: "center",
                    color: "#84908A",
                    fontSize: 13.5,
                    background: "#fff",
                    border: "1px solid rgba(12,15,13,0.07)",
                    borderRadius: 16,
                  }}
                >
                  실서버 배포 + 인증키 등록 후 최신 이슈가 자동 표시됩니다.
                </div>
              ) : (
                <div
                  className="g-2col"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
                >
                  {FEED_SOURCES.map((s) => {
                    const r = feed[s.key];
                    return (
                      <div
                        key={s.key}
                        style={{
                          background: "#fff",
                          border: "1px solid rgba(12,15,13,0.07)",
                          borderRadius: 14,
                          padding: "14px 17px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <h4 style={{ fontSize: 13.5, fontWeight: 700 }}>
                            {s.icon} {s.label}
                          </h4>
                          <button
                            onClick={() => goSingle(s.key)}
                            style={{
                              border: "none",
                              background: "none",
                              color: "#0E7B4E",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            더 보기 →
                          </button>
                        </div>
                        {feedLoading && !r ? (
                          <div style={{ padding: "16px 0", fontSize: 12.5, color: "#84908A" }}>
                            불러오는 중…
                          </div>
                        ) : r?.status === "error" ? (
                          <div style={{ padding: "14px 0", fontSize: 12, color: "#C4553E", lineHeight: 1.5 }}>
                            조회 실패: {r.error}
                          </div>
                        ) : r && r.items.length > 0 ? (
                          r.items.slice(0, 5).map((row, i) => <FeedRow key={i} row={row} />)
                        ) : (
                          <div style={{ padding: "14px 0", fontSize: 12.5, color: "#84908A" }}>
                            최근 등록 건이 없습니다.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {aggLoading && (
            <div style={{ padding: 30, textAlign: "center", color: "#84908A", fontSize: 13.5 }}>
              8개 데이터소스를 조회하고 있습니다…
            </div>
          )}
        </>
      )}

      {/* ==================== 개별 조회 (맞춤 검색) ==================== */}
      {mode === "single" && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {SOURCES.map((t) => {
              const on = t.key === tabKey;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setTabKey(t.key);
                    setRows([]);
                    setTotal(null);
                    setError("");
                    setSearched(false);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${on ? "#0C0F0D" : "rgba(12,15,13,0.14)"}`,
                    background: on ? "#0C0F0D" : "#fff",
                    color: on ? "#fff" : "#4A4C55",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              );
            })}
          </div>

          {/* 맞춤 검색 필드 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(12,15,13,0.07)",
              borderRadius: 16,
              padding: "18px 20px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12.5, color: "#84908A", marginBottom: 12 }}>
              {tab.desc} · 출처: 공공데이터포털
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
                alignItems: "end",
              }}
            >
              {tab.fields.map((f) => (
                <div key={f.key}>
                  <label style={lblSt}>{f.label}</label>
                  <input
                    value={vals[tab.key + ":" + f.key] || ""}
                    onChange={(e) =>
                      setVals((v) => ({ ...v, [tab.key + ":" + f.key]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && searchOne(1)}
                    placeholder={f.placeholder}
                    style={{ ...fld, width: "100%" }}
                  />
                </div>
              ))}
              <button
                onClick={() => searchOne(1)}
                disabled={loading}
                className="pbtn"
                style={{
                  padding: "12px 22px",
                  border: "none",
                  borderRadius: 9,
                  background: loading ? "#9AA29C" : "linear-gradient(110deg,#0E7B4E,#46D08A)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? "조회 중…" : "🔍 조회"}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#FDF3F1",
                border: "1px solid rgba(196,85,62,0.3)",
                borderRadius: 12,
                padding: "14px 18px",
                marginBottom: 16,
                fontSize: 13,
                color: "#A6432F",
                lineHeight: 1.6,
              }}
            >
              <b>조회 실패:</b> {error}
              {keyGuide ? (
                <div style={{ marginTop: 8, color: "#5A5C65" }}>
                  ▸ 공공데이터포털(data.go.kr)에서 이 API의 <b>활용신청</b>이 승인됐는지, Supabase → Edge
                  Functions → <b>mfds → Secrets의 MFDS_API_KEY</b>가 올바른지 확인해 주세요.
                </div>
              ) : (
                <div style={{ marginTop: 8, color: "#5A5C65" }}>
                  ▸ 이 항목의 API 주소가 갱신됐을 수 있습니다. data.go.kr 활용신청 상세의{" "}
                  <b>요청주소(End Point)</b> 화면을 캡처해 보내주시면 바로 맞춰드립니다.
                </div>
              )}
            </div>
          )}

          {total != null && (
            <div style={{ fontSize: 13, color: "#5A5C65", marginBottom: 10 }}>
              총 <b style={{ color: "#0E7B4E" }}>{total.toLocaleString()}</b>건
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r, i) => (
              <ResultCard key={i} row={r} />
            ))}
          </div>

          {searched && !loading && !error && rows.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#84908A",
                fontSize: 14,
                background: "#fff",
                border: "1px solid rgba(12,15,13,0.07)",
                borderRadius: 16,
              }}
            >
              검색 결과가 없습니다. 검색어를 바꿔보세요.
            </div>
          )}
          {!searched && !error && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#84908A",
                fontSize: 14,
                background: "#fff",
                border: "1px solid rgba(12,15,13,0.07)",
                borderRadius: 16,
              }}
            >
              {tab.icon} 검색 조건을 입력하고 조회를 눌러주세요.
              <div style={{ marginTop: 6, fontSize: 12.5 }}>
                (아무것도 입력하지 않고 조회하면 최신 등록순으로 보여줍니다)
              </div>
            </div>
          )}

          {rows.length > 0 && total != null && rows.length < total && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                onClick={() => searchOne(page + 1, true)}
                disabled={loading}
                className="gbtn"
                style={{
                  padding: "11px 26px",
                  border: "1px solid rgba(14,123,78,0.4)",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#0E7B4E",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {loading ? "불러오는 중…" : "더 불러오기"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
