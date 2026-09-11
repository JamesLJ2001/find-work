import type { DailyPlanDocument } from "./types";

export type ReviewCard = {
  id: number;
  prompt: string;
  example: { input: string; output: string };
  memoryHook: string;
  steps: string[];
  pitfalls: string[];
  complexity: { time: string; space: string };
};

export type ReviewDay = {
  day: number;
  date: string;
  id: string;
  title: string;
  problemIds: number[];
  focus: string;
};

export type ReviewPlan = {
  schemaVersion: number;
  version: string;
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  generatedAt: string;
  sourceCommit: string;
  completionAfterSourceRow: number;
  catalogSize: number;
  scheduledProblemCount: number;
  retiredProblemIds: number[];
  retiredReason: string;
  dailyRoutine: string[];
  days: ReviewDay[];
};

export type RecallGrade = "remembered" | "hesitant" | "forgotten";
export type RecallRecord = {
  problemId: number;
  planDate: string;
  grade: RecallGrade;
  reviewedAt: string;
  draft: string;
};
export type RecallProgress = {
  schemaVersion: 1;
  records: Record<string, RecallRecord>;
};

export function chinaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function millisecondsToChinaMidnight(now = new Date()): number {
  return new Date(`${chinaDate(now)}T00:00:00+08:00`).getTime() + 86_400_000 - now.getTime() + 100;
}

export function selectReviewDay(plan: ReviewPlan, today: string): ReviewDay {
  return plan.days.find((day) => day.date >= today) ?? plan.days[plan.days.length - 1];
}

export function categoryPlanForDate(plan: ReviewPlan, today: string): DailyPlanDocument | null {
  if (today < plan.startDate) return null;
  const day = selectReviewDay(plan, today);
  const instruction = `${day.focus} 先背诵卡口述，再选本类模糊或忘记的题闭卷重写；不混入其他类别。`;
  return {
    schemaVersion: 1,
    mode: "category-review",
    category: { id: day.id, title: day.title, day: day.day, totalDays: plan.days.length },
    planVersion: `${plan.version}.day-${day.day}`,
    date: day.date,
    timezone: "Asia/Shanghai",
    generatedAt: plan.generatedAt,
    generator: "Codex category review calendar",
    source: {
      repository: "JamesLJ2001/find-work", branch: "main",
      planFile: "leetcode/review-plan.json", progressFile: "leetcode/progress.csv",
      sourceCommit: plan.sourceCommit,
    },
    completionSource: "leetcode/progress.csv",
    completionAfterSourceRow: plan.completionAfterSourceRow,
    newProblemIds: [],
    reviewsOptional: false,
    reviewQueues: {
      d1: { label: "D+1", sourceDate: null, problemIds: [], instruction: "本轮按类别复习。" },
      d3: { label: "D+3", sourceDate: null, problemIds: [], instruction: "本轮按类别复习。" },
      d7: { label: "D+7", sourceDate: null, problemIds: [], instruction: "本轮按类别复习。" },
      red: { label: "专项预热与额外复测", sourceDate: null, problemIds: day.problemIds, instruction },
    },
    totals: { newProblems: 0, reviewProblems: day.problemIds.length, totalTasks: day.problemIds.length },
  };
}

export function recallKey(planDate: string, problemId: number): string {
  return `${planDate}:${problemId}`;
}

export function readRecallProgress(raw: string | null): RecallProgress {
  const empty: RecallProgress = { schemaVersion: 1, records: {} };
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw);
    if (value?.schemaVersion !== 1 || !value.records || typeof value.records !== "object" || Array.isArray(value.records)) return empty;
    const records: Record<string, RecallRecord> = {};
    for (const [key, item] of Object.entries(value.records)) {
      if (!item || typeof item !== "object") continue;
      const record = item as RecallRecord;
      if (!Number.isInteger(record.problemId) || record.problemId <= 0) continue;
      if (!["remembered", "hesitant", "forgotten"].includes(record.grade)) continue;
      if (typeof record.planDate !== "string" || !/^(\d{4}-\d{2}-\d{2}|library)$/.test(record.planDate)) continue;
      if (key !== recallKey(record.planDate, record.problemId)) continue;
      if (typeof record.reviewedAt !== "string" || !Number.isFinite(Date.parse(record.reviewedAt))) continue;
      if (typeof record.draft !== "string") continue;
      records[key] = record;
    }
    return { schemaVersion: 1, records };
  } catch {
    return empty;
  }
}

export function withRecallRating(progress: RecallProgress, record: RecallRecord): RecallProgress {
  return { schemaVersion: 1, records: { ...progress.records, [recallKey(record.planDate, record.problemId)]: record } };
}

export function mergeRecallProgress(base: RecallProgress, pending: RecallProgress): RecallProgress {
  const records = { ...base.records };
  for (const [key, record] of Object.entries(pending.records)) {
    if (!records[key] || record.reviewedAt > records[key].reviewedAt) records[key] = record;
  }
  return { schemaVersion: 1, records };
}

export function nextRecallId(
  ids: number[], currentId: number, records: RecallProgress["records"],
  planDate: string, filter: "all" | "unrated" | "weak", visited: number[],
): number | undefined {
  const index = ids.indexOf(currentId);
  const remainingOrder = [...ids.slice(index + 1), ...ids.slice(0, index)];
  const hasUnrated = ids.some((id) => !records[recallKey(planDate, id)]);
  return remainingOrder.find((id) => !visited.includes(id)
    && (filter !== "all" || !hasUnrated || !records[recallKey(planDate, id)]));
}

export function filterReviewIds(
  ids: number[], records: RecallProgress["records"], planDate: string,
  filter: "all" | "unrated" | "weak",
): number[] {
  return ids.filter((id) => {
    const grade = records[recallKey(planDate, id)]?.grade;
    return filter === "all" || (filter === "unrated" ? !grade : grade === "hesitant" || grade === "forgotten");
  });
}
