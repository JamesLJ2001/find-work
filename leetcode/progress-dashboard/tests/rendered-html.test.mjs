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
  assert.match(dashboard, /当天收口后由当前对话生成/);
  assert.match(dashboard, /millisecondsUntilNextDayBoundary/);
  assert.doesNotMatch(dashboard, /setInterval|08:30/);
  assert.match(dashboard, /visibilitychange/);
  assert.match(dashboard, /今日复习队列/);
  assert.match(dashboard, /今日任务已完成/);
  assert.match(dashboard, /todayAttemptedCount \+ reviewCompletedCount/);
  assert.match(dashboard, /todayProblems\.length \+ reviewProblems\.length/);
  assert.match(dashboard, /completionAfterSourceRow/);
  assert.match(dashboard, /planIsUpcoming/);
  assert.match(dashboard, /明日执行单已生成/);
  assert.match(dashboard, /queue-state__done/);
  assert.match(dashboard, /redReview/);
  assert.match(dashboard, /完整题库/);
  assert.match(page, /loadDashboardData/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(dashboard, /beforeReviewByProblem/);
  assert.match(dashboard, /掌握状态由/);
  assert.match(dashboard, /queue-status-chip/);
  assert.match(dashboard, /reviewQueues\.red\.label/);
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
  assert.ok(
    plan.completionAfterSourceRow === undefined ||
      (Number.isInteger(plan.completionAfterSourceRow) && plan.completionAfterSourceRow > 0),
  );
  assert.ok(allPlannedIds.every((id) => catalogIds.has(id)));
  assert.match(loader, /raw\.githubusercontent\.com/);
  assert.match(loader, /isDailyPlan/);
  assert.match(loader, /AbortSignal\.timeout\(5_000\)/);
  assert.match(loader, /process\.env\.NODE_ENV === "development"/);
  assert.match(loader, /repository-local/);
  assert.match(loader, /plan\.date < dateInChina\(\)/);
  assert.match(prompt, /唯一每日排程者/);
  assert.match(prompt, /只有用户在当前对话明确说/);
  assert.match(prompt, /不要创建定时任务、GitHub Action 或晚上提醒/);
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

test("balances the September 5–7 sprint while skipping the September 4 pause", async () => {
  const [markdown, rawSnapshot, rawDaily] = await Promise.all([
    readFile(new URL("../../2026-08-bytedance-100-plan.md", import.meta.url), "utf8"),
    readFile(new URL("../app/data/progress-snapshot.ts", import.meta.url), "utf8"),
    readFile(new URL("../../daily-plan.json", import.meta.url), "utf8"),
  ]);
  const snapshot = JSON.parse(
    rawSnapshot.slice(rawSnapshot.indexOf("= {") + 2, rawSnapshot.lastIndexOf(";")).trim(),
  );
  const baseline = snapshot.attempts.filter((attempt) => !attempt.isVoid && attempt.sourceRow <= 219);
  const latest = new Map(baseline.map((attempt) => [attempt.problemId, attempt]));
  const first = new Map();
  for (const attempt of baseline) {
    if (!first.has(attempt.problemId)) first.set(attempt.problemId, attempt.attemptedOn);
  }
  const section = markdown.split("## 9 月 5 日至 7 日均衡收官（最新显式覆盖）")[1]
    ?.split("## 核心 100 之外")[0];
  assert.ok(section, "the latest explicit sprint override must exist");
  assert.match(section, /9 月 4 日暂停（非有效学习日）/);
  assert.ok(baseline.every((attempt) => attempt.attemptedOn !== "2026-09-04"));
  const blocks = section.split(/### 9 月 [567] 日[^\n]*\n/).slice(1);
  assert.equal(blocks.length, 3);
  const idsFrom = (block, label) => {
    const line = block.split(/\r?\n/).find((value) => value.startsWith(`- ${label}（`));
    assert.ok(line, `missing ${label}`);
    return line.slice(line.indexOf("：") + 1).split(/[。；]/)[0].split("、")
      .map((part) => part.trim().match(/^(\d+)/)?.[1]).filter(Boolean).map(Number);
  };
  const days = blocks.map((block) => ({
    newIds: idsFrom(block, "新题"),
    queues: Object.fromEntries(["D+1", "D+3", "D+7", "额外复测"].map((label) => [label, idsFrom(block, label)])),
  }));
  const newIds = days.flatMap((day) => day.newIds);
  const unstarted = snapshot.problems.filter((problem) => !latest.has(problem.id)).map((problem) => problem.id);
  assert.equal(baseline.length, 217);
  assert.equal(latest.size, 81);
  assert.equal(new Set(newIds).size, 19);
  assert.deepEqual([...newIds].sort((a, b) => a - b), unstarted.sort((a, b) => a - b));
  const retired = new Set([42, 73, 136]);
  const catalog = new Set(snapshot.problems.map((problem) => problem.id));
  const allReviews = days.flatMap((day) => Object.values(day.queues).flat());
  const weak = [...latest.values()].filter((attempt) => attempt.status !== "绿");
  assert.equal(weak.length, 69);
  assert.ok(weak.every((attempt) => allReviews.includes(attempt.problemId)));
  for (const [index, day] of days.entries()) {
    const review = Object.values(day.queues).flat();
    const all = [...day.newIds, ...review];
    assert.equal(review.length, 29);
    assert.equal(day.newIds.length, [7, 6, 6][index]);
    assert.equal(all.length, [36, 35, 35][index]);
    assert.equal(new Set(all).size, all.length, "a day must not contain duplicate tasks");
    assert.ok(all.every((id) => catalog.has(id)));
    assert.ok(review.every((id) => !retired.has(id)));
  }
  const firstOn = (date) => [...first].filter(([, day]) => day === date).map(([id]) => id).filter((id) => !retired.has(id));
  const studyDays = [...new Set(baseline.map((attempt) => attempt.attemptedOn))].sort();
  for (const [index, date] of ["2026-09-05", "2026-09-06", "2026-09-07"].entries()) {
    studyDays.push(date);
    const sourceDates = [1, 3, 7].map((distance) => studyDays.at(-1 - distance));
    assert.deepEqual(sourceDates, [
      ["2026-09-03", "2026-08-26", "2026-08-19"],
      ["2026-09-05", "2026-08-27", "2026-08-23"],
      ["2026-09-06", "2026-09-03", "2026-08-24"],
    ][index]);
  }
  assert.deepEqual(days[0].queues["D+1"], firstOn("2026-09-03"));
  assert.deepEqual(days[0].queues["D+3"], firstOn("2026-08-26"));
  assert.deepEqual(days[0].queues["D+7"], firstOn("2026-08-19").slice(0, 2));
  assert.deepEqual(days[1].queues["D+1"], days[0].newIds);
  assert.deepEqual(days[1].queues["D+3"], firstOn("2026-08-27"));
  assert.deepEqual(days[1].queues["D+7"], firstOn("2026-08-23").slice(0, 2));
  assert.deepEqual(days[2].queues["D+1"], days[1].newIds);
  assert.deepEqual(days[2].queues["D+3"], firstOn("2026-09-03"));
  assert.deepEqual(days[2].queues["D+7"], firstOn("2026-08-24").slice(0, 2));
  const daily = JSON.parse(rawDaily);
  if (daily.date === "2026-09-05") {
    assert.equal(daily.completionAfterSourceRow, 219);
    assert.deepEqual(daily.newProblemIds, days[0].newIds);
    for (const [key, label] of Object.entries({ d1: "D+1", d3: "D+3", d7: "D+7", red: "额外复测" })) {
      assert.deepEqual(daily.reviewQueues[key].problemIds, days[0].queues[label]);
    }
  }
});
