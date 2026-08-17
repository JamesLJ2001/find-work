import { env } from "cloudflare:workers";
import type { MasteryStatus } from "../../../lib/types";

type RuntimeEnv = {
  DB?: D1Database;
  ADMIN_TOKEN?: string;
};

type AttemptInput = {
  externalId?: string;
  problemId?: number;
  attemptedOn?: string;
  status?: MasteryStatus;
  independentWrite?: boolean;
  errorReason?: string;
  isReview?: boolean;
  reviewDate?: string | null;
  notes?: string;
  supersedesAttemptId?: number | null;
  correctionReason?: string | null;
};

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const runtime = env as unknown as RuntimeEnv;
  const expected = runtime.ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || !supplied || supplied !== expected) return unauthorized();
  if (!runtime.DB) {
    return Response.json({ error: "database unavailable" }, { status: 503 });
  }

  const input = (await request.json()) as AttemptInput;
  const problemId = Number(input.problemId);
  const attemptedOn = input.attemptedOn?.trim() ?? "";
  const status = input.status;
  if (!Number.isInteger(problemId) || !/^\d{4}-\d{2}-\d{2}$/.test(attemptedOn)) {
    return Response.json({ error: "problemId and attemptedOn are required" }, { status: 400 });
  }
  if (!status || !["红", "黄", "绿"].includes(status)) {
    return Response.json({ error: "status must be 红, 黄, or 绿" }, { status: 400 });
  }

  const problem = await runtime.DB.prepare(
    "SELECT id, title, topic, difficulty FROM problems WHERE id = ?",
  )
    .bind(problemId)
    .first<{ id: number; title: string; topic: string; difficulty: string }>();
  if (!problem) return Response.json({ error: "unknown problem" }, { status: 404 });

  const externalId = input.externalId?.trim() || `api-${crypto.randomUUID()}`;
  const statements: D1PreparedStatement[] = [];
  if (input.supersedesAttemptId) {
    if (!input.correctionReason?.trim()) {
      return Response.json({ error: "correctionReason is required" }, { status: 400 });
    }
    statements.push(
      runtime.DB.prepare(
        "UPDATE attempts SET is_void = 1, correction_reason = ? WHERE id = ? AND is_void = 0",
      ).bind(input.correctionReason.trim(), input.supersedesAttemptId),
    );
  }

  statements.push(
    runtime.DB.prepare(
      `INSERT INTO attempts (
        external_id, problem_id, attempted_on, recorded_title, recorded_topic,
        recorded_difficulty, status, independent_write, error_reason, is_review,
        review_date, notes, source_row, is_void, supersedes_attempt_id,
        correction_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?)`,
    ).bind(
      externalId,
      problemId,
      attemptedOn,
      problem.title,
      problem.topic,
      problem.difficulty,
      status,
      input.independentWrite ? 1 : 0,
      input.errorReason?.trim() ?? "",
      input.isReview ? 1 : 0,
      input.reviewDate || null,
      input.notes?.trim() ?? "",
      input.supersedesAttemptId || null,
      input.correctionReason?.trim() || null,
      new Date().toISOString(),
    ),
  );

  await runtime.DB.batch(statements);
  const attempt = await runtime.DB.prepare("SELECT * FROM attempts WHERE external_id = ?")
    .bind(externalId)
    .first();
  return Response.json({ attempt }, { status: 201 });
}
