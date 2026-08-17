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

export type DailyPlanQueue = {
  label: "D+1" | "D+3" | "D+7" | "红题复测";
  sourceDate: string | null;
  problemIds: number[];
  poolProblemIds?: number[];
  instruction: string;
};

export type DailyPlanDocument = {
  schemaVersion: 1;
  planVersion: string;
  date: string;
  timezone: "Asia/Shanghai";
  generatedAt: string;
  generator: string;
  source: {
    repository: string;
    branch: string;
    planFile: string;
    progressFile: string;
    sourceCommit: string;
  };
  completionSource: string;
  newProblemIds: number[];
  reviewQueues: {
    d1: DailyPlanQueue;
    d3: DailyPlanQueue;
    d7: DailyPlanQueue;
    red: DailyPlanQueue;
  };
  totals: {
    newProblems: number;
    reviewProblems: number;
    totalTasks: number;
  };
};

export type DailyPlanSnapshot = DailyPlanDocument & {
  fetchedAt: string;
  syncSource: "github" | "repository-fallback";
  stale: boolean;
  warning?: string;
};

export type DashboardPayload = {
  problems: ProblemRecord[];
  attempts: AttemptRecord[];
  dailyPlan: DailyPlanSnapshot;
  syncedAt: string;
  source: "database" | "snapshot";
  stale: boolean;
  fallbackReason?: string;
};
