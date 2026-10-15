/** 날짜 표시 헬퍼 — DB timestamptz(ISO)든 날짜 문자열이든 깔끔하게. */
export const fmtD = (s?: string | null) => (s ? String(s).slice(0, 10) : "");

/** 작성 시간까지: "2026-08-14 09:30" */
export const fmtDT = (s?: string | null) => {
  if (!s) return "";
  // ISO/타임스탬프가 아닌 자유형 문자열("7/2 10:12", "방금" 등)은 그대로 표시
  if (!/\d{4}/.test(String(s))) return String(s);
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s).slice(0, 16);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
