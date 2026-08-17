import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const leetcodeRoot = path.resolve(projectRoot, "..");
const csvPath = path.join(leetcodeRoot, "progress.csv");
const planPath = path.join(leetcodeRoot, "2026-08-bytedance-100-plan.md");
const snapshotPath = path.join(projectRoot, "app", "data", "progress-snapshot.ts");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((cells, rowIndex) => ({
    rowNumber: rowIndex + 2,
    values: Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  }));
}

function parsePlan(markdown) {
  const problems = [];
  let sortOrder = 0;

  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("| 8/")) continue;
    const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.length !== 5 || !/^8\/\d{1,2}$/.test(cells[0])) continue;

    const day = Number(cells[0].split("/")[1]);
    for (const item of cells[3].split("；")) {
      const match = item.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) continue;
      sortOrder += 1;
      problems.push({
        id: Number(match[1]),
        title: match[2].trim(),
        topic: cells[2],
        planDate: `2026-08-${String(day).padStart(2, "0")}`,
        phase: day <= 20 ? "S" : "A",
        sortOrder,
      });
    }
  }

  const ids = new Set(problems.map((problem) => problem.id));
  if (problems.length !== 100 || ids.size !== 100) {
    throw new Error(`Expected 100 unique plan problems, found ${problems.length} rows and ${ids.size} ids.`);
  }

  return problems;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function insertStatement(table, columns, rows) {
  const values = rows
    .map((row) => `(${columns.map((column) => sqlValue(row[column])).join(", ")})`)
    .join(",\n");
  return `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES\n${values};`;
}

const [csvText, planText, leetcodeResponse] = await Promise.all([
  readFile(csvPath, "utf8"),
  readFile(planPath, "utf8"),
  fetch("https://leetcode.cn/api/problems/all/"),
]);

if (!leetcodeResponse.ok) {
  throw new Error(`LeetCode metadata request failed: ${leetcodeResponse.status}`);
}

const leetcodeData = await leetcodeResponse.json();
const metadata = new Map(
  leetcodeData.stat_status_pairs.map((item) => [
    Number(item.stat.frontend_question_id),
    {
      titleSlug: item.stat.question__title_slug,
      difficulty: { 1: "简单", 2: "中等", 3: "困难" }[item.difficulty.level],
    },
  ]),
);

const csvRows = parseCsv(csvText).filter(({ values }) => values["题号"].trim());
const planProblems = parsePlan(planText);
const latestAttemptByProblem = new Map();

for (const row of csvRows) {
  latestAttemptByProblem.set(Number(row.values["题号"]), row.values);
}

const problems = planProblems.map((problem) => {
  const latest = latestAttemptByProblem.get(problem.id);
  const meta = metadata.get(problem.id);
  if (!meta?.titleSlug || !meta?.difficulty) {
    throw new Error(`Missing LeetCode metadata for problem ${problem.id}`);
  }
  return {
    ...problem,
    title: latest?.["题名"]?.trim() || problem.title,
    titleSlug: meta.titleSlug,
    url: `https://leetcode.cn/problems/${meta.titleSlug}/`,
    difficulty: meta.difficulty,
  };
});

const problemIds = new Set(problems.map((problem) => problem.id));
const attempts = csvRows.map(({ rowNumber, values }, index) => {
  const problemId = Number(values["题号"]);
  if (!problemIds.has(problemId)) {
    throw new Error(`CSV problem ${problemId} is not in the core 100 plan.`);
  }
  const status = values["备注"].trim().charAt(0);
  if (!["红", "黄", "绿"].includes(status)) {
    throw new Error(`CSV row ${rowNumber} has no valid status.`);
  }
  const id = index + 1;
  return {
    id,
    externalId: `csv-${String(id).padStart(4, "0")}`,
    problemId,
    attemptedOn: values["日期"],
    recordedTitle: values["题名"],
    recordedTopic: values["专题"],
    recordedDifficulty: values["难度"],
    status,
    independentWrite: values["是否独立写出"] === "是",
    errorReason: values["错误原因"],
    isReview: values["是否二刷"] === "是",
    reviewDate: values["二刷日期"] || null,
    notes: values["备注"],
    sourceRow: rowNumber,
    isVoid: false,
    supersedesAttemptId: null,
    correctionReason: null,
    createdAt: `${values["日期"]}T12:00:00+08:00`,
  };
});

const syncedAt = `${attempts.at(-1).attemptedOn}T23:59:59+08:00`;
const snapshot = { problems, attempts, syncedAt, source: "snapshot", stale: false };

await writeFile(
  snapshotPath,
  `import type { DashboardPayload } from "../lib/types";\n\nexport const progressSnapshot: DashboardPayload = ${JSON.stringify(snapshot, null, 2)};\n`,
  "utf8",
);

const customMigration = (await import("node:fs/promises"))
  .readdir(path.join(projectRoot, "drizzle"))
  .then((files) => files.find((file) => file.endsWith("_seed_initial_data.sql")));
const migrationName = await customMigration;

if (migrationName) {
  const problemSqlRows = problems.map((problem) => ({
    id: problem.id,
    title: problem.title,
    title_slug: problem.titleSlug,
    url: problem.url,
    topic: problem.topic,
    difficulty: problem.difficulty,
    plan_date: problem.planDate,
    phase: problem.phase,
    sort_order: problem.sortOrder,
    created_at: syncedAt,
  }));
  const attemptSqlRows = attempts.map((attempt) => ({
    id: attempt.id,
    external_id: attempt.externalId,
    problem_id: attempt.problemId,
    attempted_on: attempt.attemptedOn,
    recorded_title: attempt.recordedTitle,
    recorded_topic: attempt.recordedTopic,
    recorded_difficulty: attempt.recordedDifficulty,
    status: attempt.status,
    independent_write: attempt.independentWrite,
    error_reason: attempt.errorReason,
    is_review: attempt.isReview,
    review_date: attempt.reviewDate,
    notes: attempt.notes,
    source_row: attempt.sourceRow,
    is_void: false,
    supersedes_attempt_id: null,
    correction_reason: null,
    created_at: attempt.createdAt,
  }));
  const seedSql = [
    insertStatement("problems", Object.keys(problemSqlRows[0]), problemSqlRows),
    "--> statement-breakpoint",
    insertStatement("attempts", Object.keys(attemptSqlRows[0]), attemptSqlRows),
  ].join("\n\n");
  await writeFile(path.join(projectRoot, "drizzle", migrationName), `${seedSql}\n`, "utf8");
}

console.log(`Generated ${problems.length} problems and ${attempts.length} attempts.`);
