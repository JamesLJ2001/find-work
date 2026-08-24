import repositoryPlan from "../../daily-plan.json";
import type {
  DailyPlanDocument,
  DailyPlanQueue,
  DailyPlanSnapshot,
} from "../app/lib/types";

const REMOTE_PLAN_URL =
  "https://raw.githubusercontent.com/JamesLJ2001/find-work/main/leetcode/daily-plan.json";

function dateInChina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => Number.isInteger(item) && Number(item) > 0)
  );
}

function isQueue(value: unknown): value is DailyPlanQueue {
  if (!isRecord(value)) return false;
  return (
    typeof value.label === "string" &&
    (typeof value.sourceDate === "string" || value.sourceDate === null) &&
    isNumberArray(value.problemIds) &&
    (value.poolProblemIds === undefined || isNumberArray(value.poolProblemIds)) &&
    typeof value.instruction === "string"
  );
}

function isDailyPlan(value: unknown): value is DailyPlanDocument {
  if (!isRecord(value) || !isRecord(value.source) || !isRecord(value.reviewQueues)) {
    return false;
  }
  if (!isRecord(value.totals)) return false;

  const queues = value.reviewQueues;
  const queueValues = [queues.d1, queues.d3, queues.d7, queues.red];
  if (!queueValues.every(isQueue)) return false;

  const reviewIds = queueValues.flatMap((queue) => queue.problemIds);
  const uniqueReviewIds = new Set(reviewIds);
  const totals = value.totals;

  return (
    value.schemaVersion === 1 &&
    typeof value.planVersion === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(value.date)) &&
    value.timezone === "Asia/Shanghai" &&
    typeof value.generatedAt === "string" &&
    typeof value.generator === "string" &&
    typeof value.completionSource === "string" &&
    (value.completionAfterSourceRow === undefined ||
      (Number.isInteger(value.completionAfterSourceRow) &&
        Number(value.completionAfterSourceRow) > 0)) &&
    isNumberArray(value.newProblemIds) &&
    typeof value.source.repository === "string" &&
    typeof value.source.branch === "string" &&
    typeof value.source.planFile === "string" &&
    typeof value.source.progressFile === "string" &&
    typeof value.source.sourceCommit === "string" &&
    uniqueReviewIds.size === reviewIds.length &&
    totals.newProblems === value.newProblemIds.length &&
    totals.reviewProblems === uniqueReviewIds.size &&
    totals.totalTasks === totals.newProblems + totals.reviewProblems
  );
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "未知同步错误";
}

function snapshot(
  plan: DailyPlanDocument,
  syncSource: DailyPlanSnapshot["syncSource"],
  warning?: string,
): DailyPlanSnapshot {
  const stale = plan.date !== dateInChina();
  return {
    ...plan,
    fetchedAt: new Date().toISOString(),
    syncSource,
    stale,
    warning:
      warning ??
      (stale ? `执行单日期为 ${plan.date}，今天的执行单尚未生成。` : undefined),
  };
}

export async function loadDailyPlan(): Promise<DailyPlanSnapshot> {
  try {
    const response = await fetch(`${REMOTE_PLAN_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`GitHub 执行单请求失败（HTTP ${response.status}）`);
    }

    const plan: unknown = await response.json();
    if (!isDailyPlan(plan)) {
      throw new Error("GitHub 执行单结构或合计校验失败");
    }
    return snapshot(plan, "github");
  } catch (error) {
    const fallback: unknown = repositoryPlan;
    if (!isDailyPlan(fallback)) {
      throw new Error("仓库内置执行单结构无效");
    }
    return snapshot(
      fallback,
      "repository-fallback",
      `暂时无法读取 GitHub 最新执行单：${messageFrom(error)}`,
    );
  }
}
