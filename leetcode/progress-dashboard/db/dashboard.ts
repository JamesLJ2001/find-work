import { asc } from "drizzle-orm";
import { progressSnapshot } from "../app/data/progress-snapshot";
import type { DashboardPayload } from "../app/lib/types";
import { getDb } from "./index";
import { loadDailyPlan } from "./daily-plan";
import { attempts, problems } from "./schema";

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "数据库暂时不可用";
}

export async function loadDashboardData(): Promise<DashboardPayload> {
  const dailyPlan = await loadDailyPlan();

  try {
    const db = await getDb();
    const [problemRows, attemptRows] = await Promise.all([
      db.select().from(problems).orderBy(asc(problems.sortOrder)),
      db.select().from(attempts).orderBy(asc(attempts.id)),
    ]);

    if (problemRows.length === 0) {
      throw new Error("数据库尚未完成初始化");
    }

    return {
      problems: problemRows,
      attempts: attemptRows,
      dailyPlan,
      syncedAt: new Date().toISOString(),
      source: "database",
      stale: false,
    };
  } catch (error) {
    return {
      ...progressSnapshot,
      dailyPlan,
      source: "snapshot",
      stale: true,
      fallbackReason: messageFrom(error),
    };
  }
}
