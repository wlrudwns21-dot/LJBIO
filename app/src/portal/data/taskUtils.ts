import type { TaskFull, StageStatus } from "@/types/database";

export function taskPct(t: TaskFull): string {
  const d = t.stages.filter((s) => s.status === "done").length;
  return Math.round((d / Math.max(1, t.stages.length)) * 100) + "%";
}

export function taskStatus(t: TaskFull): "todo" | "doing" | "review" | "done" {
  const done = t.stages.filter((s) => s.status === "done").length;
  if (done === 0) return "todo";
  if (done === t.stages.length) return "done";
  if (t.stages.some((s) => s.status === "doing")) return "doing";
  return "review";
}

export const nextStageStatus = (s: StageStatus): StageStatus =>
  s === "todo" ? "doing" : s === "doing" ? "done" : "todo";
