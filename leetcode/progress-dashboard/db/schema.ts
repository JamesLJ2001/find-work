import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const problems = sqliteTable(
  "problems",
  {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    titleSlug: text("title_slug").notNull(),
    url: text("url").notNull(),
    topic: text("topic").notNull(),
    difficulty: text("difficulty", {
      enum: ["简单", "中等", "困难"],
    }).notNull(),
    planDate: text("plan_date").notNull(),
    phase: text("phase", { enum: ["S", "A"] }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("problems_sort_order_uidx").on(table.sortOrder),
    index("problems_plan_date_idx").on(table.planDate),
    index("problems_topic_idx").on(table.topic),
  ],
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    externalId: text("external_id").notNull(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "restrict" }),
    attemptedOn: text("attempted_on").notNull(),
    recordedTitle: text("recorded_title").notNull(),
    recordedTopic: text("recorded_topic").notNull(),
    recordedDifficulty: text("recorded_difficulty").notNull(),
    status: text("status", { enum: ["红", "黄", "绿"] }).notNull(),
    independentWrite: integer("independent_write", { mode: "boolean" })
      .notNull()
      .default(false),
    errorReason: text("error_reason").notNull().default(""),
    isReview: integer("is_review", { mode: "boolean" })
      .notNull()
      .default(false),
    reviewDate: text("review_date"),
    notes: text("notes").notNull().default(""),
    sourceRow: integer("source_row"),
    isVoid: integer("is_void", { mode: "boolean" }).notNull().default(false),
    supersedesAttemptId: integer("supersedes_attempt_id"),
    correctionReason: text("correction_reason"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("attempts_external_id_uidx").on(table.externalId),
    index("attempts_problem_date_idx").on(table.problemId, table.attemptedOn),
    index("attempts_date_idx").on(table.attemptedOn),
    index("attempts_status_idx").on(table.status),
  ],
);
