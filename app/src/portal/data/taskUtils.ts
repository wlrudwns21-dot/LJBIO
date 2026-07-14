import type { TaskFull, StageStatus } from "@/types/database";

export function taskPct(t: TaskFull): string {
  const d = t.stages.filter((s) => s.status === "done").length;
  return Math.round((d / Math.max(1, t.stages.length)) * 100) + "%";
}

export function taskStatus(t: TaskFull): "todo" | "doing" | "review" | "done" {
  // 담당자가 직접 지정한 상태를 우선합니다. (없으면 단계 진행도로 추정 — 과거 데이터 대비)
  if (t.status) return t.status;
  const done = t.stages.filter((s) => s.status === "done").length;
  if (done === 0) return "todo";
  if (done === t.stages.length) return "done";
  if (t.stages.some((s) => s.status === "doing")) return "doing";
  return "review";
}

export const nextStageStatus = (s: StageStatus): StageStatus =>
  s === "todo" ? "doing" : s === "doing" ? "done" : "todo";
