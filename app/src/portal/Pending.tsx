import { useAuth } from "@/context/AuthContext";
import { roleLabel } from "@/lib/theme";

export default function Pending() {
  const { profile, logout, refreshProfile } = useAuth();
  return (
    <div
      className="fade"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        background: "linear-gradient(155deg,#0B0E0C 0%,#0A1710 60%,#06110B 100%)",
      }}
    >
      <div style={{ position: "relative", width: "100%", maxWidth: 520, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "52px 48px", textAlign: "center", backdropFilter: "blur(8px)" }}>
        <div style={{ width: 78, height: 78, margin: "0 auto", borderRadius: "50%", background: "rgba(70,208,138,0.14)", border: "1px solid rgba(70,208,138,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#46D08A", animation: "pulse 1.6s infinite" }} />
        </div>
        <div className="mono" style={{ marginTop: 26, fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", color: "#46D08A" }}>PENDING APPROVAL</div>
        <h2 style={{ marginTop: 12, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>관리자 승인 대기 중</h2>
        <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.62)" }}>
          가입 신청이 접수되었습니다.<br />관리자가 계정을 승인하면 로그인이 가능합니다.
        </p>
        <div style={{ marginTop: 28, padding: "18px 22px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, textAlign: "left", display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 18px", fontSize: 13.5 }}>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>이름</span>
          <span style={{ color: "#fff" }}>{profile?.name || "—"}</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>이메일</span>
          <span style={{ color: "#fff" }}>{profile?.email || "—"}</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>부서 / 권한</span>
          <span style={{ color: "#fff" }}>{(profile?.dept || "—") + " / " + roleLabel(profile?.role || "staff")}</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>상태</span>
          <span style={{ color: "#F5A623", fontWeight: 600 }}>● 승인 대기</span>
        </div>
        <button className="pbtn" onClick={() => refreshProfile()} style={{ marginTop: 28, width: "100%", padding: 14, border: "none", borderRadius: 10, background: "linear-gradient(110deg,#0E7B4E,#46D08A)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          승인 상태 새로고침
        </button>
        <div style={{ marginTop: 16 }}>
          <a onClick={() => logout()} style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>← 로그인 화면으로</a>
        </div>
      </div>
    </div>
  );
}
