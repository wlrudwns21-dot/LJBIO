import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { theme, roleLabel, roleStyle, fmtKRW } from "@/lib/theme";
import { useToast } from "../ui";
import {
  demoPending,
  demoMembers,
  demoSegments,
  demoContractTypes,
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
};
type CtRow = { id: string; name: string };

const PALETTE = theme.palette;

async function persist(fn: () => PromiseLike<unknown>) {
  if (isSupabaseConfigured) { try { await fn(); } catch { /* ignore */ } }
}

export default function Admin() {
  const flash = useToast();

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
  return (
    <div className="fade" style={{ maxWidth: 1160, margin: "0 auto" }}>
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
              <span>
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
              </span>
              <span
                style={{ fontSize: 12.5, color: "#0E7B4E", fontWeight: 600 }}
              >
                ● 활성
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
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>계약서 유형 관리</h3>
          <div style={{ fontSize: 12.5, color: "#84908A", marginTop: 2 }}>
            거래처 등록 시 선택하는 계약서 유형 목록입니다 · 직접 추가·수정·삭제
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
              gap: 14,
              padding: "13px 22px",
              borderTop: "1px solid rgba(12,15,13,0.06)",
            }}
          >
            <span style={{ fontSize: 16 }}>✍</span>
            <input
              className="fld"
              value={c.name}
              onChange={(e) => updContractType(c.id, e.target.value)}
              style={{
                flex: 1,
                padding: "9px 12px",
                border: "1.5px solid rgba(12,15,13,0.12)",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
              }}
            />
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
