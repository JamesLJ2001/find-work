import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the finished command center instead of the starter", async () => {
  const [layout, dashboard, page, css, route] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/api/dashboard/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /LeetCode 100 · 刷题作战台/);
  assert.match(dashboard, /字节最近 100/);
  assert.match(dashboard, /今日新题/);
  assert.match(dashboard, /data\.dailyPlan\.newProblemIds/);
  assert.match(dashboard, /data\.dailyPlan\.reviewQueues/);
  assert.doesNotMatch(dashboard, /120_000/);
  assert.match(dashboard, /progressVersion/);
  assert.match(dashboard, /对话记录写入后即时更新/);
  assert.match(dashboard, /每日 08:30 单独同步/);
  assert.match(dashboard, /millisecondsUntilNextMorningPlanSync/);
  assert.match(dashboard, /visibilitychange/);
  assert.match(dashboard, /今日复习队列/);
  assert.match(dashboard, /今日任务已完成/);
  assert.match(dashboard, /todayAttemptedCount \+ reviewCompletedCount/);
  assert.match(dashboard, /todayProblems\.length \+ reviewProblems\.length/);
  assert.match(dashboard, /queue-state__done/);
  assert.match(dashboard, /redReview/);
  assert.match(dashboard, /完整题库/);
  assert.match(page, /loadDashboardData/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(dashboard, /beforeReviewByProblem/);
  assert.match(dashboard, /掌握状态由/);
  assert.match(dashboard, /queue-status-chip/);
  assert.match(css, /\.queue-status-红/);
  assert.match(css, /\.queue-status-黄/);
  assert.match(css, /\.queue-status-绿/);
  assert.doesNotMatch(css, /@keyframes review-complete/);
  assert.doesNotMatch(`${layout}${dashboard}${page}`, /codex-preview|Building your site|SkeletonPreview/i);
  assert.doesNotMatch(dashboard, /studyDays\.push\(today\)/);
});

test("validates the single GitHub-backed daily execution sheet", async () => {
  const [rawPlan, loader, prompt, rawSnapshot] = await Promise.all([
    readFile(new URL("../../daily-plan.json", import.meta.url), "utf8"),
    readFile(new URL("../db/daily-plan.ts", import.meta.url), "utf8"),
    readFile(new URL("../../daily-plan-automation-prompt.md", import.meta.url), "utf8"),
    readFile(new URL("../app/data/progress-snapshot.ts", import.meta.url), "utf8"),
  ]);
  const plan = JSON.parse(rawPlan);
  const snapshot = JSON.parse(
    rawSnapshot.slice(rawSnapshot.indexOf("= {") + 2, rawSnapshot.lastIndexOf(";")).trim(),
  );
  const queues = Object.values(plan.reviewQueues);
  const reviewIds = queues.flatMap((queue) => queue.problemIds);
  const catalogIds = new Set(snapshot.problems.map((problem) => problem.id));
  const allPlannedIds = [
    ...plan.newProblemIds,
    ...reviewIds,
    ...(plan.reviewQueues.d7.poolProblemIds ?? []),
  ];

  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.timezone, "Asia/Shanghai");
  assert.equal(plan.totals.newProblems, plan.newProblemIds.length);
  assert.equal(plan.totals.reviewProblems, new Set(reviewIds).size);
  assert.equal(reviewIds.length, new Set(reviewIds).size);
  assert.equal(plan.totals.totalTasks, plan.totals.newProblems + plan.totals.reviewProblems);
  assert.ok(allPlannedIds.every((id) => catalogIds.has(id)));
  assert.match(loader, /raw\.githubusercontent\.com/);
  assert.match(loader, /isDailyPlan/);
  assert.match(loader, /AbortSignal\.timeout\(5_000\)/);
  assert.match(prompt, /唯一每日排程者/);
  assert.match(prompt, /不要创建或调用 GitHub Action/);
});

test("ships the data and storage surfaces", async () => {
  const [snapshot, schema, hosting] = await Promise.all([
    readFile(new URL("../app/data/progress-snapshot.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(snapshot, /"problems": \[/);
  assert.match(snapshot, /"attempts": \[/);
  assert.match(schema, /sqliteTable\(\s*"problems"/);
  assert.match(schema, /sqliteTable\(\s*"attempts"/);
  assert.equal(JSON.parse(hosting).d1, "DB");
});

test("runs the private local dashboard through the live development server", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.equal(
    packageJson.scripts.local,
    "vinext dev --hostname 127.0.0.1 --port 4173",
  );
});
