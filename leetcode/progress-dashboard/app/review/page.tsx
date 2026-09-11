import { loadDashboardData } from "../../db/dashboard";
import { chinaDate } from "../lib/review";
import { reviewPlan } from "../data/review-plan";
import type { MasteryStatus } from "../lib/types";
import { ReviewWorkspace } from "./ReviewWorkspace";
import "./review.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "背诵卡 · 每天一个题型 | LeetCode 100" };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; problem?: string | string[] }>;
}) {
  const [data, query] = await Promise.all([loadDashboardData(), searchParams]);
  const requestedDate = typeof query.date === "string" ? query.date : undefined;
  const requestedId = typeof query.problem === "string" ? Number(query.problem) : undefined;
  const datedDay = reviewPlan.days.find((day) => day.date === requestedDate);
  const problemDay = requestedId ? reviewPlan.days.find((day) => day.problemIds.includes(requestedId)) : undefined;
  const initialScope = datedDay?.id ?? problemDay?.id
    ?? (requestedId && reviewPlan.retiredProblemIds.includes(requestedId) ? "retired" : "today");
  const initialProblemId = requestedId && data.problems.some((problem) => problem.id === requestedId)
    && (!datedDay || datedDay.problemIds.includes(requestedId)) ? requestedId : null;
  const mastery: Record<number, MasteryStatus> = {};
  const attempts = data.attempts.filter((attempt) => !attempt.isVoid)
    .sort((a, b) => a.attemptedOn.localeCompare(b.attemptedOn) || a.id - b.id);
  for (const attempt of attempts) mastery[attempt.problemId] = attempt.status;
  return <ReviewWorkspace key={initialScope + ":" + initialProblemId}
    problems={data.problems} mastery={mastery} initialToday={chinaDate()}
    initialScope={initialScope} initialProblemId={initialProblemId} />;
}
