/**
 * LJ-BIO design tokens — extracted verbatim from the Claude Design prototype
 * (project/Portal.dc.html + the public pages). Keep these in sync with
 * src/global.css. Dark + green "science" system.
 */
export const theme = {
  ink: "#0C0F0D",
  appBg: "#EEF2EF",
  white: "#FFFFFF",

  // dark surfaces
  dark: "#0B0E0C",
  darkGreen: "#0A1710",
  darkDeep: "#06110B",
  night: "#05080A",

  // green accent ramp
  green: "#0E7B4E",
  greenBright: "#46D08A",
  green2: "#37C07F",

  // text
  muted: "#84908A",
  slate: "#4A4C55",
  gray: "#6B7280",

  // segment / category palette (used across tasks, finance, files, partners)
  palette: [
    "#2A6FDB",
    "#0E7B4E",
    "#D14D8B",
    "#C6803A",
    "#7A4DD1",
    "#1E9E5A",
    "#C4553E",
    "#D19A00",
    "#0EA5A5",
  ],

  gradient: "linear-gradient(110deg,#0E7B4E,#46D08A)",
} as const;

/** Priority pill styling (긴급 / 높음 / 보통). */
export function priorityStyle(p: string) {
  if (p === "긴급") return { bg: "#FDE8E8", color: "#D14343" };
  if (p === "높음") return { bg: "#FFF1E0", color: "#C6803A" };
  return { bg: "#E9F2EC", color: "#3E8E68" };
}

/** Task field/category badge styling (IT / 계약 / 영업 / …). */
export function fieldStyle(f: string) {
  const m: Record<string, { bg: string; color: string }> = {
    IT: { bg: "#E0EDFB", color: "#2A6FDB" },
    계약: { bg: "#EDE7FB", color: "#6B45C9" },
    영업: { bg: "#E9F2EC", color: "#3E8E68" },
    인허가: { bg: "#FDE8E8", color: "#D14343" },
    물류: { bg: "#FFF1E0", color: "#C6803A" },
    마케팅: { bg: "#FCE7F1", color: "#C43D7A" },
  };
  return m[f] || { bg: "#EEF1EE", color: "#6B7280" };
}

/** Notice tag styling (중요 / 규정 / 계약 / 인사 / 시스템). */
export function noticeTagStyle(t: string) {
  if (t === "중요") return { bg: "#FDE8E8", color: "#D14343" };
  if (t === "규정") return { bg: "#FFF1E0", color: "#C6803A" };
  if (t === "계약") return { bg: "#EDE7FB", color: "#6B45C9" };
  if (t === "인사") return { bg: "#E9F2EC", color: "#3E8E68" };
  return { bg: "#E0EDFB", color: "#2A6FDB" };
}

export function roleLabel(r: string) {
  return r === "admin" ? "관리자" : r === "manager" ? "팀장" : "직원";
}

export function roleStyle(r: string) {
  if (r === "admin") return { bg: "#EDE7FB", color: "#6B45C9" };
  if (r === "manager") return { bg: "#E0EDFB", color: "#2A6FDB" };
  return { bg: "#E9F2EC", color: "#3E8E68" };
}

/** Format a KRW number the way the prototype does (억 / 만 suffixes). */
export function fmtKRW(n: number): string {
  n = Number(n) || 0;
  if (n >= 1e8) {
    const v = n / 1e8;
    return "₩" + (v >= 100 ? Math.round(v) : v.toFixed(2).replace(/\.00$/, "")) + "억";
  }
  if (n >= 1e4) return "₩" + Math.round(n / 1e4).toLocaleString() + "만";
  return "₩" + n.toLocaleString();
}
