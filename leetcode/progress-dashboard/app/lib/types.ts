export type MasteryStatus = "红" | "黄" | "绿";

export type ProblemRecord = {
  id: number;
  title: string;
  titleSlug: string;
  url: string;
  topic: string;
  difficulty: "简单" | "中等" | "困难";
  planDate: string;
  phase: "S" | "A";
  sortOrder: number;
};

export type AttemptRecord = {
  id: number;
  externalId: string;
  problemId: number;
  attemptedOn: string;
  recordedTitle: string;
  recordedTopic: string;
  recordedDifficulty: string;
  status: MasteryStatus;
  independentWrite: boolean;
  errorReason: string;
  isReview: boolean;
  reviewDate: string | null;
  notes: string;
  sourceRow: number | null;
  isVoid: boolean;
  supersedesAttemptId: number | null;
  correctionReason: string | null;
  createdAt: string;
};

export type DashboardPayload = {
  problems: ProblemRecord[];
  attempts: AttemptRecord[];
  syncedAt: string;
  source: "database" | "snapshot";
  stale: boolean;
  fallbackReason?: string;
};
