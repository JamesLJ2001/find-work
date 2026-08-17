import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the finished command center instead of the starter", async () => {
  const [layout, dashboard, page, css] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /LeetCode 100 · 刷题作战台/);
  assert.match(dashboard, /字节最近 100/);
  assert.match(dashboard, /今日复习队列/);
  assert.match(dashboard, /完整题库/);
  assert.match(page, /loadDashboardData/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.doesNotMatch(`${layout}${dashboard}${page}`, /codex-preview|Building your site|SkeletonPreview/i);
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
