import { loadDashboardData } from "../../../db/dashboard";

export const dynamic = "force-dynamic";

const headers = [
  "日期",
  "题号",
  "题名",
  "专题",
  "难度",
  "是否独立写出",
  "错误原因",
  "是否二刷",
  "二刷日期",
  "备注",
];

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET() {
  const data = await loadDashboardData();
  const rows = data.attempts
    .filter((attempt) => !attempt.isVoid)
    .map((attempt) => [
      attempt.attemptedOn,
      attempt.problemId,
      attempt.recordedTitle,
      attempt.recordedTopic,
      attempt.recordedDifficulty,
      attempt.independentWrite ? "是" : "否",
      attempt.errorReason,
      attempt.isReview ? "是" : "否",
      attempt.reviewDate ?? "",
      attempt.notes,
    ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(`\uFEFF${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="progress.csv"',
    },
  });
}
