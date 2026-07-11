import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const fld: React.CSSProperties = {
  marginTop: 6,
  width: "100%",
  padding: "13px 14px",
  border: "1.5px solid rgba(12,15,13,0.12)",
  borderRadius: 10,
  fontSize: 14.5,
};
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#4A4C55" };

export default function Login() {
  const { login, signup, configured } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // login
  const [liEmail, setLiEmail] = useState("");
  const [liPw, setLiPw] = useState("");
  // signup
  const [su, setSu] = useState({ name: "", email: "", dept: "", role: "staff", password: "" });

  async function doLogin() {
    setErr("");
    setBusy(true);
    const { error } = await login(liEmail, liPw);
    setBusy(false);
    if (error) setErr(error);
  }
  async function doSignup() {
    setErr("");
    if (!su.name || !su.email || !su.password) {
      setErr("이름 · 이메일 · 비밀번호를 입력하세요.");
      return;
    }
    setBusy(true);
    const { error } = await signup({ ...su });
    setBusy(false);
    if (error) setErr(error);
  }

  return (
    <div
      className="fade login-grid"
      style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.15fr 1fr", background: "#05080A" }}
    >
      {/* brand panel */}
      <div
        className="login-brand"
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 60px",
          background: "linear-gradient(155deg,#0B0E0C 0%,#0A1710 60%,#06110B 100%)",
        }}
      >
        <div style={{ position: "absolute", top: -140, left: -90, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(70,208,138,0.18),transparent 62%)", filter: "blur(20px)" }} />
        <div style={{ position: "absolute", bottom: -160, right: -120, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,123,78,0.28),transparent 64%)", filter: "blur(16px)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link to="/" style={{ textDecoration: "none", fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>
            LJ<span style={{ color: "#46D08A" }}>-BIO</span>
          </Link>
          <Link
            to="/"
            className="gbtn"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", padding: "8px 15px", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            ← 홈페이지로 돌아가기
          </Link>
        </div>
        <div className="login-brand-body" style={{ position: "relative" }}>
          <div className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.18em", color: "#46D08A", marginBottom: 26, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 34, height: 1.5, background: "linear-gradient(90deg,#0E7B4E,#46D08A)", display: "inline-block" }} />
            EMPLOYEE WORKSPACE
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.14, letterSpacing: "-0.035em", color: "#fff" }}>
            엘제이바이오<br />임직원 업무 포털
          </h1>
          <p style={{ marginTop: 22, fontSize: 16, lineHeight: 1.75, color: "rgba(255,255,255,0.62)", maxWidth: 420 }}>
            업무 과제, 일정, 문서 생성, 팀 메시지, 근태까지 — 글로벌 바이오 유통 업무를 한 곳에서 관리합니다.
          </p>
          <div style={{ marginTop: 40, display: "flex", gap: 30 }}>
            <div>
              <div className="mono" style={{ fontSize: 30, fontWeight: 600, background: "linear-gradient(120deg,#0E7B4E,#46D08A)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>9</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>통합 업무 모듈</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 30, fontWeight: 600, background: "linear-gradient(120deg,#0E7B4E,#46D08A)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>中泰日</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>글로벌 수출 거점</div>
            </div>
          </div>
        </div>
        <div className="mono login-brand-foot" style={{ position: "relative", fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>
          © 2026 LJ-BIO INC. INTERNAL SYSTEM
        </div>
      </div>

      {/* form panel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, background: "#fff" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {mode === "signup" ? (
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>회원가입 신청</h2>
              <p style={{ marginTop: 10, fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
                가입 신청 후 <b style={{ color: "#0E7B4E" }}>관리자 승인</b>이 완료되어야 로그인할 수 있습니다.
              </p>
              <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={lbl}>이름</label>
                  <input className="fld" value={su.name} onChange={(e) => setSu({ ...su, name: e.target.value })} placeholder="홍길동" style={fld} />
                </div>
                <div>
                  <label style={lbl}>회사 이메일</label>
                  <input className="fld" value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })} placeholder="name@bio-lj.com" style={fld} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>부서</label>
                    <input className="fld" value={su.dept} onChange={(e) => setSu({ ...su, dept: e.target.value })} placeholder="해외영업팀" style={fld} />
                  </div>
                  <div>
                    <label style={lbl}>신청 권한</label>
                    <select className="fld" value={su.role} onChange={(e) => setSu({ ...su, role: e.target.value })} style={{ ...fld, background: "#fff" }}>
                      <option value="staff">일반 직원</option>
                      <option value="manager">팀장</option>
                      <option value="admin">관리자</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>비밀번호</label>
                  <input type="password" className="fld" value={su.password} onChange={(e) => setSu({ ...su, password: e.target.value })} placeholder="••••••••" style={fld} />
                </div>
              </div>
              {err && <div style={{ marginTop: 14, fontSize: 13, color: "#D14343" }}>{err}</div>}
              <button className="pbtn" onClick={doSignup} disabled={busy} style={btnStyle}>
                {busy ? "신청 중…" : "가입 신청하기"}
              </button>
              <div style={{ marginTop: 18, textAlign: "center", fontSize: 14, color: "#6B7280" }}>
                이미 계정이 있으신가요?{" "}
                <a onClick={() => { setMode("login"); setErr(""); }} style={{ color: "#0E7B4E", fontWeight: 600, cursor: "pointer" }}>로그인</a>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>로그인</h2>
              <p style={{ marginTop: 10, fontSize: 14, color: "#6B7280" }}>계정 정보를 입력해 업무 포털에 접속하세요.</p>
              <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={lbl}>이메일</label>
                  <input className="fld" value={liEmail} onChange={(e) => setLiEmail(e.target.value)} placeholder="kyungjun.ji@bio-lj.com" style={fld} />
                </div>
                <div>
                  <label style={lbl}>비밀번호</label>
                  <input type="password" className="fld" value={liPw} onChange={(e) => setLiPw(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && doLogin()} style={fld} />
                </div>
              </div>
              {err && <div style={{ marginTop: 14, fontSize: 13, color: "#D14343" }}>{err}</div>}
              <button className="pbtn" onClick={doLogin} disabled={busy} style={btnStyle}>
                {busy ? "접속 중…" : "로그인"}
              </button>
              {!configured && (
                <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(14,123,78,0.06)", border: "1px solid rgba(14,123,78,0.16)", borderRadius: 10, fontSize: 12.5, color: "#4A6558", lineHeight: 1.5 }}>
                  <b style={{ color: "#0E7B4E" }}>데모 안내</b> — Supabase 미설정 상태입니다. <code>.env</code> 설정 후 실제 계정으로 로그인하세요. 지금은 데모 데이터로 포털을 둘러볼 수 있습니다.
                </div>
              )}
              <div style={{ marginTop: 18, textAlign: "center", fontSize: 14, color: "#6B7280" }}>
                계정이 없으신가요?{" "}
                <a onClick={() => { setMode("signup"); setErr(""); }} style={{ color: "#0E7B4E", fontWeight: 600, cursor: "pointer" }}>회원가입 신청</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  marginTop: 22,
  width: "100%",
  padding: 14,
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(110deg,#0E7B4E,#46D08A)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
