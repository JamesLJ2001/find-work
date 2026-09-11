import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { progressSnapshot } from "../app/data/progress-snapshot.ts";
import {
  categoryPlanForDate,
  chinaDate,
  filterReviewIds,
  mergeRecallProgress,
  millisecondsToChinaMidnight,
  nextRecallId,
  readRecallProgress,
  recallKey,
  selectReviewDay,
  withRecallRating,
} from "../app/lib/review.ts";

const [reviewPlan, cardsA, cardsB] = await Promise.all(
  [
    new URL("../../review-plan.json", import.meta.url),
    new URL("../app/data/review-cards-a.json", import.meta.url),
    new URL("../app/data/review-cards-b.json", import.meta.url),
  ].map(async (url) => JSON.parse(await readFile(url, "utf8"))),
);
const cards = [...cardsA, ...cardsB];

test("review cards cover the complete catalog with meaningful recall content", () => {
  const cardIds = cards.map((card) => card.id);
  const catalogIds = progressSnapshot.problems.map((problem) => problem.id);

  assert.equal(cards.length, 100);
  assert.equal(new Set(cardIds).size, 100);
  assert.deepEqual([...cardIds].sort((a, b) => a - b), [...catalogIds].sort((a, b) => a - b));

  for (const card of cards) {
    assert.ok(Number.isInteger(card.id) && card.id > 0);
    assert.ok(card.prompt.length >= 20, `${card.id} needs a useful prompt`);
    assert.ok(card.example?.input?.trim(), `${card.id} needs an example input`);
    assert.ok(card.example?.output?.trim(), `${card.id} needs an example output`);
    assert.ok(card.memoryHook.length >= 8, `${card.id} needs a memory hook`);
    assert.ok(card.steps.length >= 3, `${card.id} needs concrete steps`);
    assert.ok(card.steps.every((step) => step.trim().length >= 4));
    assert.ok(card.pitfalls.length >= 2, `${card.id} needs boundary reminders`);
    assert.ok(card.pitfalls.every((pitfall) => pitfall.trim().length >= 4));
    assert.match(card.complexity.time, /O\(/);
    assert.match(card.complexity.space, /O\(/);
  }
});

test("the category calendar schedules 97 problems once and retires exactly three", () => {
  const scheduledIds = reviewPlan.days.flatMap((day) => day.problemIds);
  const retiredIds = reviewPlan.retiredProblemIds;
  const catalogIds = new Set(progressSnapshot.problems.map((problem) => problem.id));

  assert.equal(reviewPlan.catalogSize, 100);
  assert.equal(reviewPlan.scheduledProblemCount, 97);
  assert.equal(scheduledIds.length, 97);
  assert.equal(new Set(scheduledIds).size, 97);
  assert.deepEqual(retiredIds, [42, 73, 136]);
  assert.equal(new Set(retiredIds).size, 3);
  assert.ok(retiredIds.every((id) => !scheduledIds.includes(id)));
  assert.deepEqual(new Set([...scheduledIds, ...retiredIds]), catalogIds);

  assert.equal(reviewPlan.days.length, 19);
  assert.equal(reviewPlan.startDate, "2026-09-12");
  assert.equal(reviewPlan.endDate, "2026-09-30");
  for (const [index, day] of reviewPlan.days.entries()) {
    const expectedDate = new Date(Date.UTC(2026, 8, 12 + index)).toISOString().slice(0, 10);
    assert.equal(day.day, index + 1);
    assert.equal(day.date, expectedDate);
    assert.ok(day.id.trim() && day.title.trim() && day.focus.trim());
    assert.ok(day.problemIds.length > 0);
  }
  assert.ok(reviewPlan.days[7].problemIds.includes(32), "32 belongs with stack parsing");
  assert.ok(!reviewPlan.days[8].problemIds.includes(32), "32 must not leak into monotonic stack");
});

test("date selection and category plans respect the fixed daily boundary", () => {
  assert.equal(selectReviewDay(reviewPlan, "2026-09-01").date, "2026-09-12");
  assert.equal(selectReviewDay(reviewPlan, "2026-09-20").id, "monotonic-stack");
  assert.equal(selectReviewDay(reviewPlan, "2026-10-01").date, "2026-09-30");

  assert.equal(categoryPlanForDate(reviewPlan, "2026-09-11"), null);

  const first = categoryPlanForDate(reviewPlan, "2026-09-12");
  assert.equal(first.mode, "category-review");
  assert.deepEqual(first.category, {
    id: "two-pointers",
    title: "双指针",
    day: 1,
    totalDays: 19,
  });
  assert.equal(first.newProblemIds.length, 0);
  assert.deepEqual(first.reviewQueues.red.problemIds, reviewPlan.days[0].problemIds);
  assert.deepEqual(first.reviewQueues.d1.problemIds, []);
  assert.deepEqual(first.reviewQueues.d3.problemIds, []);
  assert.deepEqual(first.reviewQueues.d7.problemIds, []);
  assert.equal(first.totals.newProblems, 0);
  assert.equal(first.totals.reviewProblems, reviewPlan.days[0].problemIds.length);
  assert.equal(first.totals.totalTasks, reviewPlan.days[0].problemIds.length);

  const after = categoryPlanForDate(reviewPlan, "2026-10-08");
  assert.equal(after.date, reviewPlan.endDate);
  assert.ok(after.date < "2026-10-08", "the clamped plan must remain detectably stale");
  assert.equal(after.category.day, 19);
  assert.deepEqual(after.reviewQueues.red.problemIds, reviewPlan.days.at(-1).problemIds);
});

test("China dates and midnight delays switch at UTC+8 midnight", () => {
  const justBeforeMidnight = new Date("2026-09-11T15:59:59.500Z");
  const midnight = new Date("2026-09-11T16:00:00.000Z");
  const noon = new Date("2026-09-12T04:00:00.000Z");

  assert.equal(chinaDate(justBeforeMidnight), "2026-09-11");
  assert.equal(chinaDate(midnight), "2026-09-12");
  assert.equal(chinaDate(noon), "2026-09-12");
  assert.equal(millisecondsToChinaMidnight(justBeforeMidnight), 600);
  assert.equal(millisecondsToChinaMidnight(midnight), 86_400_100);
  assert.equal(millisecondsToChinaMidnight(noon), 43_200_100);
});

test("recall records recover from corruption and keep each plan day independent", () => {
  const empty = { schemaVersion: 1, records: {} };
  assert.deepEqual(readRecallProgress(null), empty);
  assert.deepEqual(readRecallProgress("not json"), empty);
  assert.deepEqual(readRecallProgress('{"schemaVersion":2,"records":{}}'), empty);

  const valid = {
    problemId: 283,
    planDate: "2026-09-12",
    grade: "hesitant",
    reviewedAt: "2026-09-12T01:02:03.000Z",
    draft: "左右指针的职责",
  };
  const mixed = {
    schemaVersion: 1,
    records: {
      [recallKey(valid.planDate, valid.problemId)]: valid,
      "wrong-key": valid,
      "2026-09-12:0": { ...valid, problemId: 0 },
      "2026-09-12:977": { ...valid, problemId: 977, grade: "maybe" },
      "tomorrow:80": { ...valid, problemId: 80, planDate: "tomorrow" },
      "2026-09-12:125": { ...valid, problemId: 125, reviewedAt: "never" },
      "2026-09-12:167": { ...valid, problemId: 167, draft: 123 },
    },
  };
  assert.deepEqual(readRecallProgress(JSON.stringify(mixed)).records, {
    [recallKey(valid.planDate, valid.problemId)]: valid,
  });

  const dayOne = withRecallRating(empty, valid);
  assert.deepEqual(empty, { schemaVersion: 1, records: {} }, "ratings must not mutate prior state");
  const dayTwoRecord = {
    ...valid,
    planDate: "2026-09-13",
    grade: "remembered",
    reviewedAt: "2026-09-13T01:02:03.000Z",
  };
  const twoDays = withRecallRating(dayOne, dayTwoRecord);
  assert.equal(Object.keys(twoDays.records).length, 2);
  assert.equal(twoDays.records[recallKey("2026-09-12", 283)].grade, "hesitant");
  assert.equal(twoDays.records[recallKey("2026-09-13", 283)].grade, "remembered");

  const current = withRecallRating(twoDays, {
    ...valid,
    problemId: 977,
    grade: "forgotten",
  });
  const ids = [283, 977, 80];
  assert.deepEqual(filterReviewIds(ids, current.records, "2026-09-12", "all"), ids);
  assert.deepEqual(filterReviewIds(ids, current.records, "2026-09-12", "weak"), [283, 977]);
  assert.deepEqual(filterReviewIds(ids, current.records, "2026-09-12", "unrated"), [80]);
  assert.deepEqual(filterReviewIds(ids, current.records, "2026-09-13", "weak"), []);
  assert.deepEqual(filterReviewIds(ids, current.records, "2026-09-13", "unrated"), [977, 80]);
});

test("next-card navigation finishes every eligible card exactly once per pass", () => {
  const planDate = "2026-09-12";
  const ids = [283, 977, 80, 125];
  const record = (problemId, grade = "remembered") => ({
    problemId,
    planDate,
    grade,
    reviewedAt: `2026-09-12T01:0${problemId % 10}:00.000Z`,
    draft: "口述",
  });

  const onlyLastRated = withRecallRating(
    { schemaVersion: 1, records: {} },
    record(125),
  );
  assert.equal(
    nextRecallId(ids, 125, onlyLastRated.records, planDate, "all", [125]),
    283,
    "jumping to and rating the last card must wrap to earlier unrated cards",
  );

  const resumed = withRecallRating(
    withRecallRating({ schemaVersion: 1, records: {} }, record(283)),
    record(977),
  );
  assert.equal(
    nextRecallId(ids, 977, resumed.records, planDate, "all", []),
    80,
    "a resumed first pass must skip cards already completed earlier",
  );

  const allRated = ids.reduce(
    (progress, id) => withRecallRating(progress, record(id)),
    { schemaVersion: 1, records: {} },
  );
  assert.equal(nextRecallId(ids, 283, allRated.records, planDate, "all", [283]), 977);
  assert.equal(nextRecallId(ids, 977, allRated.records, planDate, "all", [283, 977]), 80);
  assert.equal(nextRecallId(ids, 80, allRated.records, planDate, "all", [283, 977, 80]), 125);
  assert.equal(nextRecallId(ids, 125, allRated.records, planDate, "all", ids), undefined);

  const weakProgress = withRecallRating(
    withRecallRating({ schemaVersion: 1, records: {} }, record(977, "forgotten")),
    record(125, "hesitant"),
  );
  const weakIds = filterReviewIds(ids, weakProgress.records, planDate, "weak");
  assert.deepEqual(weakIds, [977, 125]);
  assert.equal(nextRecallId(weakIds, 977, weakProgress.records, planDate, "weak", [977]), 125);
  assert.equal(
    nextRecallId(weakIds, 125, weakProgress.records, planDate, "weak", weakIds),
    undefined,
    "still-forgotten grades must not create an endless replay loop",
  );

  const otherDate = "2026-09-13";
  assert.deepEqual(filterReviewIds(ids, weakProgress.records, otherDate, "weak"), []);
  const otherDateUnrated = filterReviewIds(ids, weakProgress.records, otherDate, "unrated");
  assert.deepEqual(otherDateUnrated, ids);
  assert.equal(
    nextRecallId(otherDateUnrated, 283, weakProgress.records, otherDate, "unrated", [283]),
    977,
    "grades and filters from another day must not leak into this pass",
  );
});

test("merging recall progress keeps both tabs and resolves conflicts by review time", () => {
  const older = {
    problemId: 283,
    planDate: "2026-09-12",
    grade: "forgotten",
    reviewedAt: "2026-09-12T01:00:00.000Z",
    draft: "旧答案",
  };
  const newer = {
    ...older,
    grade: "remembered",
    reviewedAt: "2026-09-12T01:05:00.000Z",
    draft: "新答案",
  };
  const persistentOtherTab = {
    problemId: 977,
    planDate: "2026-09-12",
    grade: "hesitant",
    reviewedAt: "2026-09-12T01:03:00.000Z",
    draft: "另一个标签页",
  };
  const pendingOnly = {
    problemId: 80,
    planDate: "2026-09-12",
    grade: "remembered",
    reviewedAt: "2026-09-12T01:04:00.000Z",
    draft: "待写入",
  };
  const base = {
    schemaVersion: 1,
    records: {
      [recallKey(older.planDate, older.problemId)]: older,
      [recallKey(persistentOtherTab.planDate, persistentOtherTab.problemId)]: persistentOtherTab,
    },
  };
  const pending = {
    schemaVersion: 1,
    records: {
      [recallKey(newer.planDate, newer.problemId)]: newer,
      [recallKey(pendingOnly.planDate, pendingOnly.problemId)]: pendingOnly,
    },
  };
  const baseBefore = structuredClone(base);
  const pendingBefore = structuredClone(pending);
  const merged = mergeRecallProgress(base, pending);

  assert.deepEqual(Object.keys(merged.records).sort(), [
    recallKey("2026-09-12", 80),
    recallKey("2026-09-12", 283),
    recallKey("2026-09-12", 977),
  ].sort());
  assert.deepEqual(merged.records[recallKey("2026-09-12", 283)], newer);
  assert.deepEqual(merged.records[recallKey("2026-09-12", 977)], persistentOtherTab);
  assert.deepEqual(merged.records[recallKey("2026-09-12", 80)], pendingOnly);
  assert.deepEqual(base, baseBefore, "merge must not mutate persistent state");
  assert.deepEqual(pending, pendingBefore, "merge must not mutate pending state");

  const stalePending = {
    schemaVersion: 1,
    records: { [recallKey(older.planDate, older.problemId)]: older },
  };
  const newerBase = {
    schemaVersion: 1,
    records: { [recallKey(newer.planDate, newer.problemId)]: newer },
  };
  assert.deepEqual(
    mergeRecallProgress(newerBase, stalePending).records[recallKey("2026-09-12", 283)],
    newer,
  );
});
