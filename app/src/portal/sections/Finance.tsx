import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fmtKRW } from "@/lib/theme";
import { fmtD } from "@/lib/dates";
import { useAuth } from "@/context/AuthContext";
import { isMaster } from "@/lib/access";
import { storeUpload, storedValue, attFrom, downloadAttachment } from "@/lib/storage";
import { Modal, useToast } from "../ui";
import { demoSegments, demoFinTxns, demoFinAccounts, demoPartners } from "../data/demo";
import type { Segment, FinTxn, FinAccount, AcctType } from "@/types/database";

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

const ACCT_TYPES: AcctType[] = ["수익", "비용", "자산", "부채", "자본", "분배"];
const ACCOUNTS: Record<AcctType, string[]> = {
  수익: ["상품매출", "용역매출", "수수료수익", "이자수익", "기타수익"],
  비용: ["매출원가", "급여", "성과급", "상여금", "임차료", "지급수수료", "광고선전비", "여비교통비", "통신비", "소모품비", "복리후생비", "세금과공과", "감가상각비", "이자비용", "기타비용"],
  자산: ["현금및현금성자산", "보통예금", "매출채권", "미수금", "재고자산", "선급금", "비품", "임차보증금"],
  부채: ["매입채무", "미지급금", "예수금", "단기차입금", "장기차입금"],
  자본: ["자본금", "이익잉여금", "자본잉여금"],
  분배: ["이익분배", "배당금", "성과급", "상여금", "사내유보", "기타분배"],
};
const TYPE_COLOR: Record<AcctType, { bg: string; color: string }> = {
  수익: { bg: "#E9F2EC", color: "#0E7B4E" },
  비용: { bg: "#FDECEC", color: "#D14343" },
  자산: { bg: "#E0EDFB", color: "#2A6FDB" },
  부채: { bg: "#FFF2DE", color: "#B77A16" },
  자본: { bg: "#F3EDFB", color: "#7A4DD1" },
  분배: { bg: "#E6F6F4", color: "#0C9488" },
};

const fmtWon = (n: number) => (Number(n) || 0).toLocaleString("ko-KR") + "원";
const toNum = (s: string) => Number(String(s).replace(/[^0-9]/g, "")) || 0;

type Editor = {
  id: string | null;
  tx_date: string;
  seg_id: string | null;
  acct_type: AcctType;
  account: string;
  partner: string;
  amount: string;
  memo: string;
  file: File | null;
  saveName: string;
  attachment: string | null;
  attachment_name: string;
  voucher: boolean;
  status: string;
  requester: string;
};

/** 성과급·상여금처럼 비용/이익처분 양쪽으로 처리 가능한 계정 */
const DUAL_ACCOUNTS = ["성과급", "상여금"];
const pickBtn = (on: boolean): CSSProperties => ({ flex: 1, padding: "10px 10px", border: `1.5px solid ${on ? "#0E7B4E" : "rgba(12,15,13,0.14)"}`, borderRadius: 9, background: on ? "#0E7B4E" : "#fff", color: on ? "#fff" : "#5A5C65", fontSize: 12.5, fontWeight: 600, cursor: "pointer", lineHeight: 1.35, textAlign: "center" });

const lbl: CSSProperties = { fontSize: 12.5, color: "#4A4C55", fontWeight: 600 };
const fld: CSSProperties = { marginTop: 6, width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid rgba(12,15,13,0.12)", borderRadius: 9, fontSize: 14 };

export default function Finance() {
  const { profile } = useAuth();
  const toast = useToast();
  const role = profile?.role ?? "admin";
  const canAccess = role === "admin" || role === "manager";
  /** 거래내역·지출결의·재무제표 등 상세 재무는 마스터(지경준) + 대표자(is_ceo)만 열람.
   *  데모(Supabase 미설정)는 마스터 계정으로 로그인한 것으로 간주. */
  const canFinDetail = !isSupabaseConfigured || isMaster(profile) || !!profile?.is_ceo;
  const meName = profile?.name ?? "지경준";

  const [segments, setSegments] = useState<Segment[]>(demoSegments);
  const [txns, setTxns] = useState<FinTxn[]>(isSupabaseConfigured ? [] : demoFinTxns);
  const [accounts, setAccounts] = useState<FinAccount[]>(isSupabaseConfigured ? [] : demoFinAccounts);
  const [acctMgr, setAcctMgr] = useState(false);
  const [newAcct, setNewAcct] = useState<{ acct_type: AcctType; name: string; seg_id: string | null }>({ acct_type: "비용", name: "", seg_id: null });
  const [partnerNames, setPartnerNames] = useState<string[]>(isSupabaseConfigured ? [] : demoPartners.map((p) => p.name));
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [tab, setTab] = useState<"overview" | "ledger" | "voucher" | "statements">("overview");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 필터
  const [year, setYear] = useState<string>("전체");
  const [segFilter, setSegFilter] = useState<string>("전체");
  const [typeFilter, setTypeFilter] = useState<string>("전체");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: sg } = await supabase.from("segments").select("*").order("sort");
      if (sg) setSegments(sg as Segment[]);
      const { data: tx } = await supabase.from("fin_transactions").select("*").order("tx_date", { ascending: false });
      if (tx) setTxns(tx as FinTxn[]);
      const { data: ac } = await supabase.from("fin_accounts").select("*").order("sort");
      if (ac) setAccounts(ac as FinAccount[]);
      const { data: pt } = await supabase.from("partners").select("name").order("name");
      if (pt) setPartnerNames((pt as { name: string }[]).map((x) => x.name));
    })().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const segName = (id: string | null) => segments.find((s) => s.id === id)?.name || "공통/전사";
  const segColor = (id: string | null) => segments.find((s) => s.id === id)?.color || "#84908A";

  const years = useMemo(() => {
    const ys = new Set<string>();
    txns.forEach((t) => t.tx_date && ys.add(t.tx_date.slice(0, 4)));
    ys.add(String(new Date().getFullYear()));
    return ["전체", ...Array.from(ys).sort().reverse()];
  }, [txns]);

  const inYear = (t: FinTxn) => year === "전체" || (t.tx_date || "").slice(0, 4) === year;
  const periodTxns = useMemo(() => txns.filter(inYear), [txns, year]);

  async function persist(fn: () => PromiseLike<unknown>) {
    if (isSupabaseConfigured) { try { await fn(); } catch { /* ignore */ } }
  }

  // 계정과목 옵션 = 사용자 등록 계정(해당 부문/공통) + 기본 프리셋
  const acctOptions = (type: AcctType, seg: string | null) => {
    const custom = accounts.filter((a) => a.acct_type === type && (!a.seg_id || a.seg_id === seg)).map((a) => a.name);
    return Array.from(new Set([...custom, ...ACCOUNTS[type]]));
  };

  async function addAccount() {
    if (!newAcct.name.trim()) { toast("계정과목명을 입력하세요"); return; }
    const base = { acct_type: newAcct.acct_type, name: newAcct.name.trim(), seg_id: newAcct.seg_id, sort: accounts.length };
    let saved: FinAccount = { id: genId(), created_at: "", ...base };
    if (isSupabaseConfigured) {
      try { const { data } = await supabase.from("fin_accounts").insert(base).select().single(); if (data) saved = data as FinAccount; } catch { /* local */ }
    }
    setAccounts((prev) => [...prev, saved]);
    setNewAcct({ ...newAcct, name: "" });
    toast("계정과목을 추가했습니다");
  }
  function removeAccount(a: FinAccount) {
    setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    void persist(() => supabase.from("fin_accounts").delete().eq("id", a.id));
    toast("계정과목을 삭제했습니다");
  }

  /* --------------------------------------------------- 거래 추가/편집/삭제 */
  function newTxn(preset?: Partial<Editor>) {
    const today = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    setEditor({
      id: null,
      tx_date: `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`,
      seg_id: segments[0]?.id ?? null,
      acct_type: "수익",
      account: ACCOUNTS["수익"][0],
      partner: "",
      amount: "",
      memo: "",
      file: null,
      saveName: "",
      attachment: null,
      attachment_name: "",
      voucher: false,
      status: "",
      requester: meName,
      ...preset,
    });
  }
  function newVoucher() {
    newTxn({ voucher: true, acct_type: "비용", account: ACCOUNTS["비용"][0], status: "대기" });
  }
  function editTxn(t: FinTxn) {
    setEditor({
      id: t.id, tx_date: (t.tx_date || "").slice(0, 10), seg_id: t.seg_id, acct_type: t.acct_type,
      account: t.account, partner: t.partner, amount: String(t.amount || ""), memo: t.memo,
      file: null, saveName: t.attachment_name || "", attachment: t.attachment, attachment_name: t.attachment_name,
      voucher: !!t.is_voucher, status: t.status || "", requester: t.requester || "",
    });
  }
  function setVoucherStatus(t: FinTxn, status: string, msg: string) {
    setTxns((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
    toast(msg);
    void persist(() => supabase.from("fin_transactions").update({ status }).eq("id", t.id));
  }
  function deleteTxn(t: FinTxn) {
    if (!window.confirm(`'${t.account} · ${fmtWon(t.amount)}' 거래를 삭제할까요?`)) return;
    setTxns((prev) => prev.filter((x) => x.id !== t.id));
    toast("거래를 삭제했습니다");
    void persist(() => supabase.from("fin_transactions").delete().eq("id", t.id));
  }

  async function saveTxn() {
    const e = editor;
    if (!e) return;
    if (!e.account.trim()) { toast("계정과목을 입력하세요"); return; }
    const amount = toNum(e.amount);
    if (amount <= 0) { toast("금액을 입력하세요"); return; }
    setBusy(true);
    let attachment = e.attachment;
    let attachment_name = e.attachment_name;
    if (e.file) {
      const saveName = (e.saveName.trim() || e.file.name);
      try {
        const att = await storeUpload(e.file, "finance");
        attachment = storedValue(att);
        attachment_name = saveName;
        // 파일 관리에도 동일하게 보이도록 files 테이블에 등록
        const ext = (/\.([a-z0-9]+)$/i.exec(e.file.name)?.[1] || "FILE").toUpperCase();
        const size = e.file.size < 1024 * 1024 ? `${Math.round(e.file.size / 1024)} KB` : `${(e.file.size / 1048576).toFixed(1)} MB`;
        await persist(() => supabase.from("files").insert({
          name: saveName, ext, category: "재무", seg_id: e.seg_id, size,
          uploader: meName, storage_path: attachment, grade: 3, tag: "재무/" + e.account.trim(),
        }));
      } catch { /* keep going without file */ }
    }
    const row = {
      tx_date: e.tx_date, seg_id: e.seg_id, acct_type: e.acct_type, account: e.account.trim(),
      partner: e.partner.trim(), amount, memo: e.memo.trim(), attachment, attachment_name,
      is_voucher: e.voucher, status: e.voucher ? (e.status || "대기") : "", requester: e.voucher ? e.requester : "",
    };
    if (e.id) {
      setTxns((prev) => prev.map((x) => (x.id === e.id ? { ...x, ...row } : x)));
      await persist(() => supabase.from("fin_transactions").update(row).eq("id", e.id as string));
      toast("거래를 수정했습니다");
    } else {
      let saved: FinTxn = { id: genId(), created_by: meName, created_at: new Date().toISOString(), ...row } as FinTxn;
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.from("fin_transactions").insert({ ...row, created_by: meName }).select().single();
          if (data) saved = data as FinTxn;
        } catch { /* local fallback */ }
      }
      setTxns((prev) => [saved, ...prev]);
      toast("거래를 등록했습니다");
    }
    setBusy(false);
    setEditor(null);
  }

  /* --------------------------------------------------- 집계 (장부 = 일반거래 + 지급완료된 지출결의) */
  const bookTxns = useMemo(() => periodTxns.filter((t) => !t.is_voucher || t.status === "지급완료"), [periodTxns]);
  const sumBy = (pred: (t: FinTxn) => boolean) => bookTxns.filter(pred).reduce((a, t) => a + (t.amount || 0), 0);
  const totalRev = sumBy((t) => t.acct_type === "수익");
  const totalExp = sumBy((t) => t.acct_type === "비용");
  const netProfit = totalRev - totalExp;
  const totalAsset = sumBy((t) => t.acct_type === "자산");
  const totalLiab = sumBy((t) => t.acct_type === "부채");
  const totalEquity = sumBy((t) => t.acct_type === "자본");
  const totalDist = sumBy((t) => t.acct_type === "분배");
  const undistributed = netProfit - totalDist;
  const distBySeg = useMemo(() => segments.map((sg) => ({ sg, amt: bookTxns.filter((t) => t.seg_id === sg.id && t.acct_type === "분배").reduce((a, t) => a + t.amount, 0) })).filter((x) => x.amt > 0), [segments, bookTxns]);

  const segStats = useMemo(() => {
    return segments.map((sg) => {
      const rev = bookTxns.filter((t) => t.seg_id === sg.id && t.acct_type === "수익").reduce((a, t) => a + t.amount, 0);
      const exp = bookTxns.filter((t) => t.seg_id === sg.id && t.acct_type === "비용").reduce((a, t) => a + t.amount, 0);
      const cnt = bookTxns.filter((t) => t.seg_id === sg.id).length;
      return { sg, rev, exp, net: rev - exp, cnt };
    });
  }, [segments, bookTxns]);
  const segRevMax = Math.max(1, ...segStats.map((s) => s.rev));

  const byAccount = (type: AcctType): [string, number][] => {
    const m = new Map<string, number>();
    bookTxns.filter((t) => t.acct_type === type).forEach((t) => {
      const k = t.account || "(미지정)";
      m.set(k, (m.get(k) || 0) + t.amount);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };

  const shownLedger = txns.filter((t) => inYear(t) && (!t.is_voucher || t.status === "지급완료") && (segFilter === "전체" || (segFilter === "none" ? !t.seg_id : t.seg_id === segFilter)) && (typeFilter === "전체" || t.acct_type === typeFilter));
  const voucherTxns = txns.filter((t) => t.is_voucher && inYear(t));
  const V_COLOR: Record<string, { bg: string; color: string }> = {
    대기: { bg: "#FFF2DE", color: "#B77A16" }, 승인: { bg: "#E0EDFB", color: "#2A6FDB" },
    반려: { bg: "#FDECEC", color: "#D14343" }, 지급완료: { bg: "#E9F2EC", color: "#3E8E68" },
  };

  if (!canAccess)
    return (
      <div className="fade" style={{ maxWidth: 560, margin: "60px auto 0", textAlign: "center", background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 18, padding: "48px 32px" }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 14 }}>접근 권한이 없습니다</h3>
        <p style={{ fontSize: 14, color: "#84908A", marginTop: 10, lineHeight: 1.6 }}>
          재무 현황은 <b>팀장급 이상</b>만 이용할 수 있습니다.
        </p>
      </div>
    );

  return (
    <div className="fade" style={{ maxWidth: 1240, margin: "0 auto" }}>
      {/* 상단: 탭 + 기간 + 등록 */}
      <div className="g-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "inline-flex", background: "rgba(12,15,13,0.05)", borderRadius: 10, padding: 3, flexWrap: "wrap" }}>
          <Seg on={tab === "overview"} onClick={() => setTab("overview")} label="부문 현황" />
          {canFinDetail && <Seg on={tab === "ledger"} onClick={() => setTab("ledger")} label="거래 내역" />}
          {canFinDetail && <Seg on={tab === "voucher"} onClick={() => setTab("voucher")} label="지출결의" />}
          {canFinDetail && <Seg on={tab === "statements"} onClick={() => setTab("statements")} label="재무제표" />}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={selStyle}>
            {years.map((y) => <option key={y} value={y}>{y === "전체" ? "전체 기간" : y + "년"}</option>)}
          </select>
          {canFinDetail && <button onClick={() => setAcctMgr(true)} className="gbtn" style={{ padding: "10px 14px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 10, background: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>계정 관리</button>}
          {canFinDetail && <button onClick={() => newTxn()} className="pbtn" style={{ padding: "10px 16px", border: "none", borderRadius: 10, background: "#0C0F0D", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ 거래 등록</button>}
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="g-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <Stat label="총 매출(수익)" value={fmtKRW(totalRev)} tone="#0E7B4E" />
        <Stat label="총 비용(지출)" value={fmtKRW(totalExp)} tone="#D14343" />
        <Stat label="영업이익(순이익)" value={fmtKRW(netProfit)} tone={netProfit >= 0 ? "#0E7B4E" : "#D14343"} />
        <Stat label="거래 건수" value={periodTxns.length.toLocaleString() + "건"} tone="#2A6FDB" />
      </div>

      {loading && <div style={emptyBox}>재무 데이터를 불러오는 중…</div>}

      {/* ===================== 부문 현황 ===================== */}
      {tab === "overview" && (
        <div className="g-2col" style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20, alignItems: "start" }}>
          <Card title="사업 부문별 매출 · 손익" sub="거래 등록과 자동 연동됩니다">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {segStats.map(({ sg, rev, exp, net, cnt }) => (
                <div key={sg.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: sg.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{sg.name}</span>
                    <span className="mono" style={{ fontSize: 12.5, color: "#0E7B4E", fontWeight: 700 }}>{fmtKRW(rev)}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 20, background: "rgba(12,15,13,0.06)", overflow: "hidden", marginBottom: 7 }}>
                    <div style={{ height: "100%", width: `${Math.round((rev / segRevMax) * 100)}%`, background: sg.color, borderRadius: 20, transition: "width .4s" }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#84908A", flexWrap: "wrap", alignItems: "center" }}>
                    <span>비용 <b style={{ color: "#D14343" }}>{fmtKRW(exp)}</b></span>
                    <span>순이익 <b style={{ color: net >= 0 ? "#0E7B4E" : "#D14343" }}>{fmtKRW(net)}</b></span>
                    <span>거래 <b style={{ color: "#0C0F0D" }}>{cnt}건</b></span>
                    {canFinDetail && <button onClick={() => { setTab("ledger"); setSegFilter(sg.id); }} style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#2A6FDB", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>내역 보기 →</button>}
                  </div>
                </div>
              ))}
              {segStats.every((s) => s.rev === 0 && s.cnt === 0) && (
                <div style={{ fontSize: 13.5, color: "#84908A", padding: "8px 0" }}>아직 등록된 거래가 없습니다. <b>+ 거래 등록</b>으로 매출·비용을 입력하면 부문별로 자동 집계됩니다.</div>
              )}
            </div>
          </Card>

          <Card title="매출 구성 비중">
            <div style={{ height: 16, borderRadius: 20, overflow: "hidden", display: "flex", background: "rgba(12,15,13,0.05)" }}>
              {segStats.map(({ sg, rev }) => <div key={sg.id} style={{ height: "100%", width: `${Math.round((rev / (totalRev || 1)) * 100)}%`, background: sg.color }} />)}
            </div>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
              {segStats.map(({ sg, rev }) => (
                <div key={sg.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: sg.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{sg.name}</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{Math.round((rev / (totalRev || 1)) * 100)}%</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(12,15,13,0.08)", fontSize: 12, color: "#84908A", lineHeight: 1.6 }}>
              사업 부문은 <b style={{ color: "#0E7B4E" }}>관리자</b> 메뉴에서, 매출·비용은 <b style={{ color: "#0E7B4E" }}>거래 등록</b>으로 관리합니다.
            </div>
          </Card>
        </div>
      )}

      {/* ===================== 거래 내역 ===================== */}
      {tab === "ledger" && canFinDetail && (
        <div>
          <div className="g-toolbar" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            <select value={segFilter} onChange={(e) => setSegFilter(e.target.value)} style={selStyle}>
              <option value="전체">전체 부문</option>
              {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              <option value="none">공통/전사</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selStyle}>
              <option value="전체">전체 구분</option>
              {ACCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 13, color: "#84908A" }}>{shownLedger.length}건</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shownLedger.map((t) => {
              const tc = TYPE_COLOR[t.acct_type];
              const income = t.acct_type === "수익";
              return (
                <div key={t.id} className="doc-row" style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 12, padding: "13px 15px", flexWrap: "wrap" }}>
                  <div className="mono" style={{ minWidth: 68, fontSize: 12.5, color: "#5A5C65" }}>{fmtD(t.tx_date)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: tc.bg, color: tc.color, flexShrink: 0 }}>{t.acct_type}</span>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.account}{t.partner ? <span style={{ color: "#84908A", fontWeight: 500 }}> · {t.partner}</span> : null}</div>
                    <div style={{ fontSize: 12, color: "#9AA29C", marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: segColor(t.seg_id) }} />{segName(t.seg_id)}</span>
                      {t.memo && <span>· {t.memo}</span>}
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: income ? "#0E7B4E" : t.acct_type === "비용" ? "#D14343" : t.acct_type === "분배" ? "#0C9488" : "#0C0F0D", whiteSpace: "nowrap" }}>
                    {income ? "+" : (t.acct_type === "비용" || t.acct_type === "분배") ? "−" : ""}{fmtWon(t.amount)}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {t.attachment && (
                      <button onClick={() => downloadAttachment(attFrom(t.attachment_name || "첨부", t.attachment)).then((r) => !r.ok && toast("다운로드 실패"))} className="gbtn" title="첨부 다운로드" style={iconBtn}>📎</button>
                    )}
                    <button onClick={() => editTxn(t)} className="gbtn" title="수정" style={iconBtn}>✎</button>
                    <button onClick={() => deleteTxn(t)} className="gbtn" title="삭제" style={{ ...iconBtn, color: "#C4553E", borderColor: "rgba(196,85,62,0.3)" }}>🗑</button>
                  </div>
                </div>
              );
            })}
            {!loading && shownLedger.length === 0 && (
              <div style={emptyBox}>해당하는 거래가 없습니다. <b>+ 거래 등록</b>으로 추가하세요.</div>
            )}
          </div>
        </div>
      )}

      {/* ===================== 지출결의 ===================== */}
      {tab === "voucher" && canFinDetail && (
        <div>
          <div className="g-toolbar" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            <div style={{ fontSize: 13.5, color: "#5A5C65" }}>지출 전 결의서를 등록하고 <b>승인 → 지급완료</b> 시 재무제표에 반영됩니다.</div>
            <div style={{ flex: 1 }} />
            <button onClick={newVoucher} className="pbtn" style={{ padding: "10px 16px", border: "none", borderRadius: 10, background: "#0C0F0D", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>+ 지출결의 등록</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {voucherTxns.map((t) => {
              const st = V_COLOR[t.status || "대기"] || V_COLOR["대기"];
              return (
                <div key={t.id} style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 12, padding: "14px 16px", borderLeft: `4px solid ${st.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: st.bg, color: st.color }}>{t.status || "대기"}</span>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t.account}{t.partner ? <span style={{ color: "#84908A", fontWeight: 500 }}> · {t.partner}</span> : null}</span>
                    <span className="mono" style={{ marginLeft: "auto", fontSize: 15, fontWeight: 700, color: "#D14343" }}>{fmtWon(t.amount)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9AA29C", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="mono">{fmtD(t.tx_date)}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: segColor(t.seg_id) }} />{segName(t.seg_id)}</span>
                    {t.requester && <span>· 신청 {t.requester}</span>}
                    {t.memo && <span>· {t.memo}</span>}
                  </div>
                  <div style={{ marginTop: 11, display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {(t.status === "대기" || !t.status) && <button onClick={() => setVoucherStatus(t, "승인", "결의를 승인했습니다")} className="pbtn" style={vBtnP}>승인</button>}
                    {t.status === "승인" && <button onClick={() => setVoucherStatus(t, "지급완료", "지급완료 — 재무제표에 반영됩니다")} className="pbtn" style={{ ...vBtnP, background: "linear-gradient(110deg,#0E7B4E,#46D08A)" }}>지급완료</button>}
                    {t.status !== "반려" && t.status !== "지급완료" && <button onClick={() => setVoucherStatus(t, "반려", "반려했습니다")} className="gbtn" style={vBtn}>반려</button>}
                    {t.status === "반려" && <button onClick={() => setVoucherStatus(t, "대기", "대기로 되돌렸습니다")} className="gbtn" style={vBtn}>되돌리기</button>}
                    {t.attachment && <button onClick={() => downloadAttachment(attFrom(t.attachment_name || "첨부", t.attachment)).then((r) => !r.ok && toast("다운로드 실패"))} className="gbtn" style={vBtn}>📎 증빙</button>}
                    <button onClick={() => editTxn(t)} className="gbtn" style={vBtn}>✎ 수정</button>
                    <button onClick={() => deleteTxn(t)} className="gbtn" style={{ ...vBtn, color: "#C4553E", borderColor: "rgba(196,85,62,0.3)" }}>삭제</button>
                  </div>
                </div>
              );
            })}
            {!loading && voucherTxns.length === 0 && <div style={emptyBox}>등록된 지출결의가 없습니다. <b>+ 지출결의 등록</b>으로 지출 예정 비용을 올리세요.</div>}
          </div>
        </div>
      )}

      {/* ===================== 재무제표 ===================== */}
      {tab === "statements" && canFinDetail && (
        <div className="g-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          <Card title="손익계산서" sub={year === "전체" ? "전체 기간" : year + "년"}>
            <StmtSection title="매출 · 수익" rows={byAccount("수익")} total={totalRev} color="#0E7B4E" />
            <StmtSection title="비용 · 지출" rows={byAccount("비용")} total={totalExp} color="#D14343" />
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "2px solid rgba(12,15,13,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>당기순이익</span>
              <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: netProfit >= 0 ? "#0E7B4E" : "#D14343" }}>{fmtWon(netProfit)}</span>
            </div>
          </Card>

          <Card title="재무상태표" sub={year === "전체" ? "전체 기간" : year + "년 기준"}>
            <StmtSection title="자산" rows={byAccount("자산")} total={totalAsset} color="#2A6FDB" />
            <StmtSection title="부채" rows={byAccount("부채")} total={totalLiab} color="#B77A16" />
            <StmtSection title="자본" rows={byAccount("자본")} total={totalEquity} color="#7A4DD1" />
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "2px solid rgba(12,15,13,0.12)", display: "flex", flexDirection: "column", gap: 6 }}>
              <Row label="부채 + 자본" value={fmtWon(totalLiab + totalEquity)} bold />
              <div style={{ fontSize: 12, color: totalAsset === totalLiab + totalEquity ? "#0E7B4E" : "#B77A16" }}>
                {totalAsset === totalLiab + totalEquity ? "✓ 자산 = 부채 + 자본 (대차 일치)" : `⚠ 자산과 부채+자본 차이 ${fmtWon(Math.abs(totalAsset - (totalLiab + totalEquity)))}`}
              </div>
            </div>
          </Card>

          <div style={{ gridColumn: "1 / -1" }}>
            <Card title="이익 분배" sub="당기순이익을 성과급·배당 등으로 분배 기록">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                <MiniStat label="당기순이익" value={fmtWon(netProfit)} color="#0E7B4E" />
                <MiniStat label="분배 합계" value={fmtWon(totalDist)} color="#0C9488" />
                <MiniStat label="미분배 이익" value={fmtWon(undistributed)} color={undistributed >= 0 ? "#2A6FDB" : "#D14343"} />
                <button onClick={() => newTxn({ acct_type: "분배", account: "이익분배", amount: String(Math.max(0, undistributed)) })} className="pbtn" style={{ marginLeft: "auto", padding: "10px 16px", border: "none", borderRadius: 10, background: "linear-gradient(110deg,#0C9488,#37C0B0)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ 이익 분배 기록</button>
              </div>
              {byAccount("분배").length === 0 ? (
                <div style={{ fontSize: 13, color: "#84908A", padding: "4px 0" }}>아직 분배 내역이 없습니다. <b>+ 이익 분배 기록</b>으로 성과급·배당금·사내유보 등을 기록하세요.</div>
              ) : (
                <div className="g-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0C9488", marginBottom: 6 }}>항목별 분배</div>
                    {byAccount("분배").map(([acct, amt]) => <Row key={acct} label={acct} value={fmtWon(amt)} />)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0C9488", marginBottom: 6 }}>사업부문별 분배</div>
                    {distBySeg.length === 0 && <div style={{ fontSize: 12.5, color: "#9AA29C" }}>공통/전사 분배만 있습니다</div>}
                    {distBySeg.map(({ sg, amt }) => (
                      <div key={sg.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                        <span style={{ fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: sg.color }} />{sg.name}</span>
                        <span className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: "#0C9488" }}>{fmtWon(amt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <Card title="사업 부문별 손익">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 420 }}>
                  <thead>
                    <tr style={{ color: "#84908A", fontSize: 12 }}>
                      <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>부문</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>매출</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>비용</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>순이익</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segStats.map(({ sg, rev, exp, net }) => (
                      <tr key={sg.id} style={{ borderTop: "1px solid rgba(12,15,13,0.06)" }}>
                        <td style={{ padding: "9px 8px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: sg.color }} />{sg.name}</span></td>
                        <td className="mono" style={{ textAlign: "right", padding: "9px 8px", color: "#0E7B4E" }}>{fmtWon(rev)}</td>
                        <td className="mono" style={{ textAlign: "right", padding: "9px 8px", color: "#D14343" }}>{fmtWon(exp)}</td>
                        <td className="mono" style={{ textAlign: "right", padding: "9px 8px", fontWeight: 700, color: net >= 0 ? "#0E7B4E" : "#D14343" }}>{fmtWon(net)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid rgba(12,15,13,0.12)", fontWeight: 700 }}>
                      <td style={{ padding: "9px 8px" }}>합계</td>
                      <td className="mono" style={{ textAlign: "right", padding: "9px 8px", color: "#0E7B4E" }}>{fmtWon(totalRev)}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "9px 8px", color: "#D14343" }}>{fmtWon(totalExp)}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "9px 8px", color: netProfit >= 0 ? "#0E7B4E" : "#D14343" }}>{fmtWon(netProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===================== 거래 등록/편집 모달 ===================== */}
      <Modal open={!!editor} onClose={() => setEditor(null)} width={520} padded={false}>
        {editor && (
          <div>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(12,15,13,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 19, fontWeight: 700 }}>{editor.voucher ? (editor.id ? "지출결의 수정" : "지출결의 등록") : (editor.id ? "거래 수정" : "거래 등록")}</h2>
              <span onClick={() => setEditor(null)} style={{ cursor: "pointer", fontSize: 22, color: "#84908A", lineHeight: 1 }}>×</span>
            </div>
            <div className="m-pad-lg" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "68vh", overflowY: "auto" }}>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>거래일</label><input type="date" value={editor.tx_date} onChange={(e) => setEditor({ ...editor, tx_date: e.target.value })} style={fld} /></div>
                <div><label style={lbl}>구분</label>
                  <select value={editor.acct_type} onChange={(e) => { const at = e.target.value as AcctType; setEditor({ ...editor, acct_type: at, account: ACCOUNTS[at][0] }); }} style={fld}>
                    {ACCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>계정과목</label>
                  <input list="acct-list" value={editor.account} onChange={(e) => setEditor({ ...editor, account: e.target.value })} placeholder="선택 또는 직접 입력" style={fld} />
                  <datalist id="acct-list">{acctOptions(editor.acct_type, editor.seg_id).map((a) => <option key={a} value={a} />)}</datalist>
                </div>
                <div><label style={lbl}>사업 부문</label>
                  <select value={editor.seg_id ?? "none"} onChange={(e) => setEditor({ ...editor, seg_id: e.target.value === "none" ? null : e.target.value })} style={fld}>
                    {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="none">공통 / 전사</option>
                  </select>
                </div>
              </div>
              {DUAL_ACCOUNTS.includes(editor.account.trim()) && (
                <div style={{ background: "#F7FAF8", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#4A4C55", marginBottom: 8 }}>처리 방식 — {editor.account.trim()}을(를) 어떻게 반영할까요?</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => setEditor({ ...editor, acct_type: "비용" })} style={pickBtn(editor.acct_type === "비용")}>비용(판관비)<br /><span style={{ fontSize: 11, opacity: 0.85 }}>순이익 차감</span></button>
                    <button type="button" onClick={() => setEditor({ ...editor, acct_type: "분배" })} style={pickBtn(editor.acct_type === "분배")}>이익 처분<br /><span style={{ fontSize: 11, opacity: 0.85 }}>순이익 영향 없음</span></button>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#84908A", marginTop: 8, lineHeight: 1.5 }}>매월 지급하는 급여성 상여는 <b>비용</b>, 결산 후 이익을 나눠주는 성과급은 <b>이익 처분</b>으로 선택하세요.</div>
                </div>
              )}
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>거래처 <span style={{ color: "#84908A", fontWeight: 500 }}>(거래처 관리에서 선택)</span></label>
                  <input list="partner-list" value={editor.partner} onChange={(e) => setEditor({ ...editor, partner: e.target.value })} placeholder="거래처 선택 또는 입력" style={fld} />
                  <datalist id="partner-list">{partnerNames.map((n) => <option key={n} value={n} />)}</datalist>
                </div>
                <div><label style={lbl}>금액 (원)</label><input inputMode="numeric" value={editor.amount ? toNum(editor.amount).toLocaleString("ko-KR") : ""} onChange={(e) => setEditor({ ...editor, amount: e.target.value })} placeholder="0" style={{ ...fld, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }} /></div>
              </div>
              {editor.voucher && (
                <div><label style={lbl}>신청자</label><input value={editor.requester} onChange={(e) => setEditor({ ...editor, requester: e.target.value })} placeholder="신청자 이름" style={fld} /></div>
              )}
              <div><label style={lbl}>메모 <span style={{ color: "#84908A", fontWeight: 500 }}>(선택)</span></label><input value={editor.memo} onChange={(e) => setEditor({ ...editor, memo: e.target.value })} placeholder="적요" style={fld} /></div>
              <div>
                <label style={lbl}>증빙 첨부 <span style={{ color: "#84908A", fontWeight: 500 }}>(세금계산서·영수증 등 · 파일관리에도 함께 저장)</span></label>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => fileRef.current?.click()} className="gbtn" style={{ padding: "9px 14px", border: "1.5px solid rgba(12,15,13,0.14)", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>파일 선택</button>
                  <span style={{ fontSize: 13, color: "#5A5C65", wordBreak: "break-all" }}>{editor.file ? editor.file.name : editor.attachment_name || "선택된 파일 없음"}</span>
                  <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditor({ ...editor, file: f, saveName: editor.saveName || f.name.replace(/\.[^.]+$/, "") }); e.target.value = ""; }} />
                </div>
                {editor.file && (
                  <div style={{ marginTop: 10 }}>
                    <label style={lbl}>저장 파일명 <span style={{ color: "#84908A", fontWeight: 500 }}>(파일관리에 표시될 이름)</span></label>
                    <input value={editor.saveName} onChange={(e) => setEditor({ ...editor, saveName: e.target.value })} placeholder="예: 2026-09 임차료 세금계산서" style={fld} />
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(12,15,13,0.08)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setEditor(null)} className="gbtn" style={{ padding: "11px 20px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 9, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button onClick={saveTxn} disabled={busy} className="pbtn" style={{ padding: "11px 24px", border: "none", borderRadius: 9, background: busy ? "#9AA29C" : "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer" }}>{busy ? "저장 중…" : "저장"}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================== 계정 관리 모달 ===================== */}
      <Modal open={acctMgr} onClose={() => setAcctMgr(false)} width={560} padded={false}>
        <div>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(12,15,13,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 19, fontWeight: 700 }}>계정과목 관리</h2>
            <span onClick={() => setAcctMgr(false)} style={{ cursor: "pointer", fontSize: 22, color: "#84908A", lineHeight: 1 }}>×</span>
          </div>
          <div className="m-pad-lg" style={{ padding: "20px 24px", maxHeight: "70vh", overflowY: "auto" }}>
            {/* 추가 폼 */}
            <div style={{ background: "#F7FAF8", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#4A4C55", marginBottom: 10 }}>새 계정과목 등록</div>
              <div className="g-form2" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.4fr 1fr", gap: 10 }}>
                <select value={newAcct.acct_type} onChange={(e) => setNewAcct({ ...newAcct, acct_type: e.target.value as AcctType })} style={fld}>
                  {ACCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={newAcct.name} onChange={(e) => setNewAcct({ ...newAcct, name: e.target.value })} placeholder="계정과목명 (예: 임상시험비)" onKeyDown={(e) => e.key === "Enter" && addAccount()} style={fld} />
                <select value={newAcct.seg_id ?? "none"} onChange={(e) => setNewAcct({ ...newAcct, seg_id: e.target.value === "none" ? null : e.target.value })} style={fld}>
                  <option value="none">공통</option>
                  {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={addAccount} className="pbtn" style={{ marginTop: 10, padding: "9px 18px", border: "none", borderRadius: 9, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>+ 추가</button>
            </div>
            {/* 등록된 계정 목록 */}
            {ACCT_TYPES.map((t) => {
              const list = accounts.filter((a) => a.acct_type === t);
              if (list.length === 0) return null;
              const tc = TYPE_COLOR[t];
              return (
                <div key={t} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tc.color, marginBottom: 6 }}>{t}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {list.map((a) => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid rgba(12,15,13,0.08)", borderRadius: 9 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                        <span style={{ fontSize: 12, color: "#84908A" }}>{a.seg_id ? segName(a.seg_id) : "공통"}</span>
                        <button onClick={() => removeAccount(a)} className="gbtn" style={{ marginLeft: "auto", width: 28, height: 28, border: "1px solid rgba(196,85,62,0.3)", borderRadius: 7, background: "#fff", color: "#C4553E", fontSize: 13, cursor: "pointer", lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {accounts.length === 0 && <div style={{ fontSize: 13, color: "#84908A", padding: "8px 0" }}>등록된 사용자 계정과목이 없습니다. 위에서 사업부문별 비용 계정 등을 추가하세요. (기본 계정과목은 거래 등록 시 그대로 제공됩니다.)</div>}
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(12,15,13,0.08)", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setAcctMgr(false)} className="pbtn" style={{ padding: "11px 24px", border: "none", borderRadius: 9, background: "#0C0F0D", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>완료</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- small components ---------------- */
function Seg({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} style={{ padding: "7px 15px", border: "none", borderRadius: 8, background: on ? "#fff" : "transparent", color: on ? "#0C0F0D" : "#84908A", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{label}</button>;
}
function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ fontSize: 12.5, color: "#84908A" }}>{label}</div>
      <div className="mono" style={{ marginTop: 7, fontSize: 21, fontWeight: 600, color: tone }}>{value}</div>
    </div>
  );
}
function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 18, padding: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
        {sub && <span style={{ fontSize: 12, color: "#84908A" }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#F7FAF8", border: "1px solid rgba(12,15,13,0.06)", borderRadius: 12, padding: "10px 16px", minWidth: 120 }}>
      <div style={{ fontSize: 11.5, color: "#84908A" }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}
function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
      <span style={{ fontSize: 13.5, fontWeight: bold ? 700 : 400, color: "#3A3C45" }}>{label}</span>
      <span className="mono" style={{ fontSize: 13.5, fontWeight: bold ? 700 : 500, color: color || "#0C0F0D" }}>{value}</span>
    </div>
  );
}
function StmtSection({ title, rows, total, color }: { title: string; rows: [string, number][]; total: number; color: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.02em", marginBottom: 6 }}>{title}</div>
      {rows.length === 0 && <div style={{ fontSize: 12.5, color: "#9AA29C", padding: "3px 0" }}>해당 내역 없음</div>}
      {rows.map(([acct, amt]) => <Row key={acct} label={acct} value={amt.toLocaleString("ko-KR")} />)}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0 0", marginTop: 4, borderTop: "1px solid rgba(12,15,13,0.08)" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{title} 합계</span>
        <span className="mono" style={{ fontSize: 13.5, fontWeight: 700, color }}>{total.toLocaleString("ko-KR")}원</span>
      </div>
    </div>
  );
}

const selStyle: CSSProperties = { padding: "9px 12px", border: "1.5px solid rgba(12,15,13,0.12)", borderRadius: 9, fontSize: 13.5, background: "#fff", fontWeight: 600 };
const iconBtn: CSSProperties = { width: 32, height: 32, border: "1px solid rgba(12,15,13,0.14)", borderRadius: 8, background: "#fff", color: "#5A5C65", fontSize: 13, cursor: "pointer", lineHeight: 1 };
const vBtn: CSSProperties = { padding: "7px 13px", border: "1px solid rgba(12,15,13,0.14)", borderRadius: 8, background: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "#4A4C55" };
const vBtnP: CSSProperties = { padding: "7px 14px", border: "none", borderRadius: 8, background: "#2A6FDB", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
const emptyBox: CSSProperties = { padding: "44px 16px", textAlign: "center", color: "#9AA29C", fontSize: 14, background: "#fff", border: "1px solid rgba(12,15,13,0.07)", borderRadius: 14 };
