import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { theme, roleLabel, roleStyle, fmtKRW } from "@/lib/theme";
import { useAuth } from "@/context/AuthContext";
import { isMaster } from "@/lib/access";
import { storeUpload, storedValue, migrateAllToStorage } from "@/lib/storage";
import { useToast } from "../ui";

function NoAccess({ label }: { label: string }) {
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
        {label}
        <br />
        권한이 필요하면 관리자에게 문의하세요.
      </p>
    </div>
  );
}
import {
  demoPending,
  demoMembers,
  demoSegments,
  demoContractTypes,
  demoMe,
} from "../data/demo";
import type { Segment, Profile } from "@/types/database";

type PendingRow = Partial<Profile> & { id: string };
type MemberRow = {
  id?: string;
  name: string;
  email: string;
  dept: string;
  role: string;
  init: string | null;
  avatar_bg: string;
  can_approve?: boolean;
  is_ceo?: boolean;
};
type CtRow = {
  id: string;
  name: string;
  template_url?: string | null;
  template_name?: string | null;
};

const PALETTE = theme.palette;

async function persist(fn: () => PromiseLike<unknown>) {
  if (isSupabaseConfigured) { try { await fn(); } catch { /* ignore */ } }
}

export default function Admin() {
  const flash = useToast();
  const { profile } = useAuth();
  const meMaster = isMaster(profile ?? { email: demoMe.email }); // 결제권한·대표자 지정은 마스터만
  const canAccess = meMaster; // 관리자 탭은 마스터(지경준)만 접근

  const [pending, setPending] = useState<PendingRow[]>(
    demoPending as PendingRow[],
  );
  const [members, setMembers] = useState<MemberRow[]>(
    demoMembers as MemberRow[],
  );
  const [segments, setSegments] = useState<Segment[]>(demoSegments);
  const [contractTypes, setContractTypes] = useState<CtRow[]>(
    demoContractTypes.map((name, i) => ({ id: "ct" + i, name })),
  );
  const [ctNewName, setCtNewName] = useState("");
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");

  async function runMigration() {
    if (migrating) return;
    setMigrating(true);
    setMigrateMsg("이전을 시작합니다…");
    try {
      const res = await migrateAllToStorage((m) => setMigrateMsg(m));
      setMigrateMsg(
        `완료 · ${res.moved}개 파일을 Storage로 이전했습니다` +
          (res.failed ? ` (실패 ${res.failed}개)` : "") +
          (res.errors && res.errors.length
            ? ` — 실패 원인: ${res.errors.join(" / ")}`
            : ""),
      );
      flash("파일 Storage 이전 완료");
    } catch {
      setMigrateMsg("이전 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setMigrating(false);
    }
  }
  const [sealImg, setSealImg] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ljbio_seal");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (p) setPending(p as PendingRow[]);
      const { data: m } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: true });
      if (m) setMembers(m as MemberRow[]);
      const { data: sg } = await supabase
        .from("segments")
        .select("*")
        .order("sort", { ascending: true });
      if (sg) setSegments(sg as Segment[]);
      const { data: ct } = await supabase
        .from("contract_types")
        .select("*")
        .order("sort", { ascending: true });
      if (ct) setContractTypes(ct as CtRow[]);
      const { data: st } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "seal")
        .maybeSingle();
      const val = (st as { value?: string } | null)?.value;
      if (val) {
        setSealImg(val);
        try {
          localStorage.setItem("ljbio_seal", val);
        } catch {
          /* ignore */
        }
      }
    })().catch(() => {});
  }, []);

  /* ---------------------------------------------------------- pending */
  function approve(p: PendingRow) {
    setPending((list) => list.filter((x) => x.id !== p.id));
    void persist(() =>
      supabase.from("profiles").update({ status: "approved" }).eq("id", p.id),
    );
    flash(p.name + " 계정을 승인했습니다");
  }
  function reject(p: PendingRow) {
    setPending((list) => list.filter((x) => x.id !== p.id));
    void persist(() =>
      supabase.from("profiles").update({ status: "rejected" }).eq("id", p.id),
    );
    flash(p.name + " 신청을 거절했습니다");
  }

  /* ------------------------------------------------------------ members */
  function deleteMember(m: MemberRow) {
    if (!window.confirm(`'${m.name}' 직원 계정을 삭제할까요? 되돌릴 수 없습니다.`))
      return;
    setMembers((list) => list.filter((x) => (x.id || x.email) !== (m.id || m.email)));
    if (m.id) void persist(() => supabase.from("profiles").delete().eq("id", m.id!));
    flash(m.name + " 계정을 삭제했습니다");
  }

  const memberKey = (m: MemberRow) => m.id || m.email;

  function toggleApprove(m: MemberRow) {
    const next = !m.can_approve;
    setMembers((list) =>
      list.map((x) => (memberKey(x) === memberKey(m) ? { ...x, can_approve: next } : x)),
    );
    if (m.id)
      void persist(() =>
        supabase.from("profiles").update({ can_approve: next }).eq("id", m.id!),
      );
    flash(m.name + (next ? " 결제 승인 권한을 부여했습니다" : " 결제 권한을 해제했습니다"));
  }

  function setCeo(m: MemberRow) {
    const makeCeo = !m.is_ceo;
    // 대표자는 1명만 — 나머지는 모두 해제
    setMembers((list) =>
      list.map((x) => ({ ...x, is_ceo: memberKey(x) === memberKey(m) ? makeCeo : false })),
    );
    void persist(async () => {
      await supabase.from("profiles").update({ is_ceo: false }).not("id", "is", null);
      if (makeCeo && m.id)
        await supabase.from("profiles").update({ is_ceo: true }).eq("id", m.id);
    });
    flash(makeCeo ? m.name + " 님을 대표자(최종 승인)로 지정했습니다" : "대표자 지정을 해제했습니다");
  }

  /* --------------------------------------------------------- segments */
  function addSegment() {
    const id = "seg" + Date.now();
    const color = PALETTE[segments.length % PALETTE.length];
    const ns: Segment = {
      id,
      name: "새 사업 부문",
      color,
      orders: 0,
      revenue: 0,
      sort: segments.length,
      created_at: "",
    };
    setSegments((s) => [...s, ns]);
    void persist(() =>
      supabase
        .from("segments")
        .insert({ id, name: ns.name, color, orders: 0, revenue: 0, sort: ns.sort }),
    );
    flash("사업 부문을 추가했습니다");
  }
  function updSegName(id: string, val: string) {
    setSegments((s) => s.map((sg) => (sg.id === id ? { ...sg, name: val } : sg)));
    void persist(() =>
      supabase.from("segments").update({ name: val }).eq("id", id),
    );
  }
  function setSegColor(id: string, color: string) {
    setSegments((s) => s.map((sg) => (sg.id === id ? { ...sg, color } : sg)));
    void persist(() =>
      supabase.from("segments").update({ color }).eq("id", id),
    );
  }
  function removeSegment(id: string) {
    setSegments((s) => s.filter((sg) => sg.id !== id));
    void persist(() => supabase.from("segments").delete().eq("id", id));
    flash("사업 부문을 삭제했습니다");
  }

  /* --------------------------------------------------- contract types */
  function addContractType() {
    const name = ctNewName.trim();
    if (!name) return;
    if (contractTypes.some((c) => c.name === name)) {
      flash("이미 등록된 유형입니다");
      return;
    }
    const id = "ct" + Date.now();
    setContractTypes((c) => [...c, { id, name }]);
    setCtNewName("");
    void persist(() =>
      supabase
        .from("contract_types")
        .insert({ id, name, sort: contractTypes.length }),
    );
    flash("계약서 유형을 추가했습니다");
  }
  function updContractType(id: string, val: string) {
    setContractTypes((c) => c.map((x) => (x.id === id ? { ...x, name: val } : x)));
    void persist(() =>
      supabase.from("contract_types").update({ name: val }).eq("id", id),
    );
  }
  function removeContractType(id: string) {
    setContractTypes((c) => c.filter((x) => x.id !== id));
    void persist(() => supabase.from("contract_types").delete().eq("id", id));
    flash("계약서 유형을 삭제했습니다");
  }
  function onCtTemplate(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    void (async () => {
      const att = await storeUpload(file, "contracts");
      const url = storedValue(att);
      setContractTypes((c) =>
        c.map((x) => (x.id === id ? { ...x, template_url: url, template_name: file.name } : x)),
      );
      await persist(() =>
        supabase
          .from("contract_types")
          .update({ template_url: url, template_name: file.name })
          .eq("id", id),
      );
      flash("계약서 양식을 업로드했습니다");
    })();
  }
  function clearCtTemplate(id: string) {
    setContractTypes((c) =>
      c.map((x) => (x.id === id ? { ...x, template_url: null, template_name: null } : x)),
    );
    void persist(() =>
      supabase
        .from("contract_types")
        .update({ template_url: null, template_name: null })
        .eq("id", id),
    );
    flash("업로드한 양식을 삭제했습니다");
  }

  /* ------------------------------------------------------------- seal */
  function onSealUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      setSealImg(url);
      try {
        localStorage.setItem("ljbio_seal", url);
      } catch {
        /* ignore */
      }
      void persist(() =>
        supabase.from("settings").upsert({ key: "seal", value: url }),
      );
      flash("회사 직인이 등록되었습니다");
    };
    r.readAsDataURL(file);
    e.target.value = "";
  }
  function clearSeal() {
    setSealImg(null);
    try {
      localStorage.removeItem("ljbio_seal");
    } catch {
      /* ignore */
    }
    void persist(() =>
      supabase.from("settings").upsert({ key: "seal", value: "" }),
    );
    flash("직인을 삭제했습니다");
  }

  /* =============================================================== view */
  if (!canAccess)
    return <NoAccess label="관리자 메뉴는 총괄 관리자(마스터) 계정만 이용할 수 있습니다." />;

  return (
    <div className="fade" style={{ maxWidth: 1160, margin: "0 auto" }}>
      {/* 파일 저장소 이전 (마스터 전용) */}
      {meMaster && (
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(12,15,13,0.07)",
            borderRadius: 16,
            padding: "18px 22px",
            marginBottom: 22,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 700 }}>
              📦 파일을 Storage로 이전{" "}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "#E9F2EC",
                  color: "#3E8E68",
                  marginLeft: 4,
                  verticalAlign: "middle",
                }}
              >
                v2 · 한글파일 지원
              </span>
            </h3>
            <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 3, lineHeight: 1.55 }}>
              기존에 DB에 저장돼 있던 문서·첨부(사업자등록증·통장사본·결재 첨부·계약서 양식·문서관리
              파일)를 Supabase Storage로 옮깁니다. DB 용량을 아끼고 로딩이 빨라집니다.
              <b> 먼저 0011_storage.sql을 실행</b>해 저장소 버킷을 만든 뒤 눌러주세요. 여러 번 눌러도
              안전합니다(이미 옮긴 파일은 건너뜀).
            </div>
            {migrateMsg && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: migrating ? "#C6803A" : "#3E8E68", fontWeight: 600 }}>
                {migrating ? "⏳ " : "✓ "}
                {migrateMsg}
              </div>
            )}
          </div>
          <button
            onClick={runMigration}
            disabled={migrating}
            className="pbtn"
            style={{
              padding: "11px 20px",
              border: "none",
              borderRadius: 10,
              background: migrating ? "#9AA29C" : "linear-gradient(110deg,#0E7B4E,#46D08A)",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: migrating ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {migrating ? "이전 중…" : "지금 이전"}
          </button>
        </div>
      )}

      {/* 가입 승인 대기 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.07)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 22,
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(12,15,13,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>가입 승인 대기</h3>
          <span
            style={{
              minWidth: 20,
              height: 20,
              padding: "0 6px",
              borderRadius: 20,
              background: "#F5A623",
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {pending.length}
          </span>
        </div>
        {pending.length > 0 ? (
          pending.map((p) => {
            const rs = roleStyle(p.role || "staff");
            return (
              <div
                key={p.id}
                className="row-h"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 22px",
                  borderTop: "1px solid rgba(12,15,13,0.06)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: p.avatar_bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {p.init}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                    {p.name}
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: rs.bg,
                        color: rs.color,
                        marginLeft: 6,
                      }}
                    >
                      {roleLabel(p.role || "staff")}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 12.5, color: "#84908A", marginTop: 3 }}
                  >
                    {p.email} · {p.dept} · 신청 {p.created_at}
                  </div>
                </div>
                <button
                  onClick={() => approve(p)}
                  className="pbtn"
                  style={{
                    padding: "9px 16px",
                    border: "none",
                    borderRadius: 9,
                    background: "#0E7B4E",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  승인
                </button>
                <button
                  onClick={() => reject(p)}
                  className="gbtn"
                  style={{
                    padding: "9px 16px",
                    border: "1px solid rgba(12,15,13,0.14)",
                    borderRadius: 9,
                    background: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  거절
                </button>
              </div>
            );
          })
        ) : (
          <div
            style={{
              padding: 34,
              textAlign: "center",
              color: "#84908A",
              fontSize: 14,
            }}
          >
            ✓ 대기 중인 가입 신청이 없습니다.
          </div>
        )}
      </div>

      {/* 직원 계정 · 권한 관리 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.07)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(12,15,13,0.07)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>직원 계정 · 권한 관리</h3>
          <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 2 }}>
            {meMaster
              ? "결제권한(전자결재 승인)·대표자(최종 승인자, 1명)는 마스터 계정만 지정할 수 있습니다."
              : "결제권한·대표자 지정은 총괄 관리자(마스터) 계정에서만 가능합니다."}
          </div>
        </div>
        <div
          className="g-members"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 120px",
            gap: 12,
            padding: "12px 22px",
            background: "rgba(12,15,13,0.03)",
            fontSize: 12,
            fontWeight: 600,
            color: "#84908A",
          }}
        >
          <span>이름 / 이메일</span>
          <span>부서</span>
          <span>권한</span>
          <span>상태</span>
        </div>
        {members.map((m, i) => {
          const rs = roleStyle(m.role);
          return (
            <div
              key={m.id || m.email || i}
              className="row-h g-members"
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 1fr 120px",
                gap: 12,
                padding: "14px 22px",
                borderTop: "1px solid rgba(12,15,13,0.06)",
                alignItems: "center",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: 11 }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: m.avatar_bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12.5,
                  }}
                >
                  {m.init}
                </span>
                <span>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      display: "block",
                    }}
                  >
                    {m.name}
                  </span>
                  <span style={{ fontSize: 11.5, color: "#84908A" }}>
                    {m.email}
                  </span>
                </span>
              </span>
              <span style={{ fontSize: 13, color: "#5A5C65" }}>{m.dept}</span>
              <span
                style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: rs.bg,
                    color: rs.color,
                  }}
                >
                  {roleLabel(m.role)}
                </span>
                {meMaster ? (
                  <>
                    <button
                      onClick={() => toggleApprove(m)}
                      title="결제(전자결재) 승인 권한"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 20,
                        cursor: "pointer",
                        border: `1px solid ${m.can_approve ? "#0E7B4E" : "rgba(12,15,13,0.16)"}`,
                        background: m.can_approve ? "#0E7B4E" : "#fff",
                        color: m.can_approve ? "#fff" : "#84908A",
                      }}
                    >
                      {m.can_approve ? "✓ 결제권한" : "결제권한"}
                    </button>
                    <button
                      onClick={() => setCeo(m)}
                      title="대표자(최종 승인자) 지정 — 1명"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 20,
                        cursor: "pointer",
                        border: `1px solid ${m.is_ceo ? "#C0392B" : "rgba(12,15,13,0.16)"}`,
                        background: m.is_ceo ? "#C0392B" : "#fff",
                        color: m.is_ceo ? "#fff" : "#84908A",
                      }}
                    >
                      {m.is_ceo ? "★ 대표자" : "대표자"}
                    </button>
                  </>
                ) : (
                  <>
                    {m.can_approve && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 20,
                          background: "#E9F2EC",
                          color: "#3E8E68",
                        }}
                      >
                        결제권한
                      </span>
                    )}
                    {m.is_ceo && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 20,
                          background: "#FDE8E8",
                          color: "#C0392B",
                        }}
                      >
                        ★ 대표자
                      </span>
                    )}
                  </>
                )}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12.5, color: "#0E7B4E", fontWeight: 600 }}>
                  ● 활성
                </span>
                <button
                  onClick={() => deleteMember(m)}
                  className="gbtn"
                  title="직원 삭제"
                  style={{
                    padding: "6px 10px",
                    border: "1px solid rgba(196,85,62,0.3)",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#C4553E",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  삭제
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {/* 사업 부문 관리 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.07)",
          borderRadius: 16,
          overflow: "hidden",
          marginTop: 22,
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(12,15,13,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>사업 부문 관리</h3>
            <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 2 }}>
              재무 현황 · 파일 관리에서 사용되는 사업 영역 카테고리
            </div>
          </div>
          <button
            className="pbtn"
            onClick={addSegment}
            style={{
              padding: "9px 15px",
              border: "none",
              borderRadius: 9,
              background: "#0C0F0D",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + 부문 추가
          </button>
        </div>
        {segments.map((sg) => (
          <div
            key={sg.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "15px 22px",
              borderTop: "1px solid rgba(12,15,13,0.06)",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 5,
                background: sg.color,
                flexShrink: 0,
              }}
            />
            <input
              className="fld"
              value={sg.name}
              onChange={(e) => updSegName(sg.id, e.target.value)}
              style={{
                flex: 1,
                minWidth: 150,
                padding: "9px 12px",
                border: "1.5px solid rgba(12,15,13,0.12)",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {PALETTE.map((c) => (
                <span
                  key={c}
                  onClick={() => setSegColor(sg.id, c)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    cursor: "pointer",
                    background: c,
                    border: `2px solid ${sg.color === c ? "#0C0F0D" : "transparent"}`,
                  }}
                />
              ))}
            </div>
            <div
              className="mono"
              style={{ fontSize: 12, color: "#84908A", whiteSpace: "nowrap" }}
            >
              {sg.orders}건 · {fmtKRW(sg.revenue)}
            </div>
            <button
              onClick={() => removeSegment(sg.id)}
              className="gbtn"
              style={{
                padding: "7px 12px",
                border: "1px solid rgba(196,85,62,0.3)",
                borderRadius: 8,
                background: "#fff",
                color: "#C4553E",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      {/* 계약서 유형 관리 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.07)",
          borderRadius: 16,
          overflow: "hidden",
          marginTop: 22,
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(12,15,13,0.07)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>계약서 유형 · 양식 관리</h3>
          <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 2 }}>
            유형을 추가·수정·삭제하고, 유형별 <b>계약서 양식 파일</b>을 업로드하세요.
            업로드한 파일은 <b>문서 생성 → 계약서</b>에서 선택해 다운로드됩니다.
          </div>
        </div>
        <div
          style={{
            padding: "16px 22px",
            display: "flex",
            gap: 9,
            alignItems: "center",
            borderBottom: "1px solid rgba(12,15,13,0.06)",
          }}
        >
          <input
            className="fld"
            value={ctNewName}
            onChange={(e) => setCtNewName(e.target.value)}
            placeholder="새 계약서 유형 이름 (예: 대리점 계약서)"
            style={{
              flex: 1,
              padding: "10px 13px",
              border: "1.5px solid rgba(12,15,13,0.12)",
              borderRadius: 9,
              fontSize: 14,
            }}
          />
          <button
            onClick={addContractType}
            className="pbtn"
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: 9,
              background: "#0C0F0D",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + 추가
          </button>
        </div>
        {contractTypes.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 22px",
              borderTop: "1px solid rgba(12,15,13,0.06)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 16 }}>✍</span>
            <input
              className="fld"
              value={c.name}
              onChange={(e) => updContractType(c.id, e.target.value)}
              style={{
                flex: 1,
                minWidth: 160,
                padding: "9px 12px",
                border: "1.5px solid rgba(12,15,13,0.12)",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
              }}
            />
            {c.template_url ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#256F4C",
                  background: "rgba(14,123,78,0.08)",
                  border: "1px solid rgba(14,123,78,0.25)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  maxWidth: 220,
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  📄 {c.template_name || "양식"}
                </span>
                <span
                  onClick={() => clearCtTemplate(c.id)}
                  title="양식 삭제"
                  style={{ cursor: "pointer", color: "#C4553E", fontWeight: 700 }}
                >
                  ×
                </span>
              </span>
            ) : null}
            <label
              className="gbtn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "7px 12px",
                border: "1px solid rgba(14,123,78,0.4)",
                borderRadius: 8,
                background: "#fff",
                color: "#0E7B4E",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {c.template_url ? "양식 교체" : "양식 업로드"}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.hwp,.hwpx,image/*"
                onChange={(e) => onCtTemplate(c.id, e)}
                style={{ display: "none" }}
              />
            </label>
            <button
              onClick={() => removeContractType(c.id)}
              className="gbtn"
              style={{
                padding: "7px 12px",
                border: "1px solid rgba(196,85,62,0.3)",
                borderRadius: 8,
                background: "#fff",
                color: "#C4553E",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      {/* 회사 직인 · 대표 날인 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(12,15,13,0.07)",
          borderRadius: 16,
          overflow: "hidden",
          marginTop: 22,
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(12,15,13,0.07)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>회사 직인 · 대표 날인</h3>
          <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 2 }}>
            전자결재 승인 시 문서에 자동으로 찍히는 직인입니다 · 대표이사{" "}
            <b style={{ color: "#0C0F0D" }}>이일형</b>
          </div>
        </div>
        <div
          style={{
            padding: 22,
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 124,
              height: 124,
              borderRadius: 14,
              border: "1.5px dashed rgba(12,15,13,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: "#FAFBFA",
              overflow: "hidden",
            }}
          >
            {sealImg ? (
              <img
                src={sealImg}
                alt="회사 직인"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  border: "3px double #C0392B",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#C0392B",
                  transform: "rotate(-8deg)",
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700 }}>엘제이바이오</div>
                <div style={{ fontSize: 15, fontWeight: 800, margin: "1px 0" }}>
                  이 일 형
                </div>
                <div style={{ fontSize: 8, fontWeight: 700 }}>代表理事印</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{
                fontSize: 13.5,
                color: "#3A3C45",
                lineHeight: 1.65,
                marginBottom: 14,
              }}
            >
              투명 배경 PNG를 권장하며, 정사각형 이미지가 가장 깔끔하게 날인됩니다.
              등록 전에는 왼쪽 <b>기본 직인</b>이 사용됩니다.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label
                className="pbtn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "11px 18px",
                  borderRadius: 10,
                  background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                직인 이미지 업로드
                <input
                  type="file"
                  accept="image/*"
                  onChange={onSealUpload}
                  style={{ display: "none" }}
                />
              </label>
              {sealImg && (
                <button
                  onClick={clearSeal}
                  className="gbtn"
                  style={{
                    padding: "11px 18px",
                    border: "1px solid rgba(12,15,13,0.14)",
                    borderRadius: 10,
                    background: "#fff",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  직인 삭제
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
