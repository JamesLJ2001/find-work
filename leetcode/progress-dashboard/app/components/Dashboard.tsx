"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { progressVersion } from "../data/progress-version";
import type {
  AttemptRecord,
  DashboardPayload,
  MasteryStatus,
  ProblemRecord,
} from "../lib/types";

type DisplayStatus = MasteryStatus | "灰";
type StatusFilter = DisplayStatus | "全部";

const statusOrder: DisplayStatus[] = ["绿", "黄", "红", "灰"];
const statusLabels: Record<DisplayStatus, string> = {
  绿: "已掌握",
  黄: "有思路",
  红: "未掌握",
  灰: "未开始",
};

function dateInChina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function millisecondsUntilNextDayBoundary() {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 15, 0);
  return next.getTime() - now.getTime();
}

function shortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusFrom(attempt?: AttemptRecord): DisplayStatus {
  return attempt?.status ?? "灰";
}

function compareAttempts(left: AttemptRecord, right: AttemptRecord) {
  const dateCompare = left.attemptedOn.localeCompare(right.attemptedOn);
  return dateCompare === 0 ? left.id - right.id : dateCompare;
}

function QueueCard({
  label,
  title,
  sourceDate,
  description,
  problems,
  latestByProblem,
  beforeReviewByProblem,
  reviewedToday,
}: {
  label: string;
  title?: string;
  sourceDate?: string;
  description: string;
  problems: ProblemRecord[];
  latestByProblem: Map<number, AttemptRecord>;
  beforeReviewByProblem: Map<number, AttemptRecord>;
  reviewedToday: Set<number>;
}) {
  const completedCount = problems.filter((problem) => reviewedToday.has(problem.id)).length;

  return (
    <article className="queue-card panel">
      <div className="queue-card__head">
        <div>
          <span className="eyebrow">{label}</span>
          <h3>{title ?? (sourceDate ? `${shortDate(sourceDate)} 来源批次` : "暂无来源批次")}</h3>
        </div>
        <span className="queue-count">
          {problems.length ? `${completedCount}/${problems.length}` : "—"}
        </span>
      </div>
      <p>{description}</p>
      <div className="queue-list">
        {problems.length ? (
          problems.map((problem) => {
            const beforeStatus = statusFrom(beforeReviewByProblem.get(problem.id));
            const afterStatus = statusFrom(latestByProblem.get(problem.id));
            const reviewed = reviewedToday.has(problem.id);
            return (
              <a
                className={reviewed ? "is-complete" : "is-pending"}
                href={problem.url}
                target="_blank"
                rel="noreferrer"
                key={problem.id}
              >
                <span className={`status-dot status-${afterStatus}`} aria-hidden="true" />
                <b>{problem.id}</b>
                <span>{problem.title}</span>
                <strong
                  className="queue-state"
                  aria-label={
                    reviewed
                      ? `掌握状态由${beforeStatus}变为${afterStatus}`
                      : `复习前状态${beforeStatus}，待复习`
                  }
                >
                  <span className={`queue-status-chip queue-status-${beforeStatus}`}>
                    {beforeStatus}
                  </span>
                  {reviewed ? (
                    <>
                      <span className="queue-state__arrow" aria-hidden="true">→</span>
                      <span className={`queue-status-chip queue-status-${afterStatus}`}>
                        {afterStatus}
                      </span>
                      <span className="queue-state__done" aria-hidden="true">✓</span>
                    </>
                  ) : (
                    <span className="queue-state__pending">待复习</span>
                  )}
                </strong>
              </a>
            );
          })
        ) : (
          <span className="empty-line">这一天没有新题首次作答，不生成机械复习。</span>
        )}
      </div>
    </article>
  );
}

function ProblemHistory({
  problem,
  attempts,
  onClose,
}: {
  problem: ProblemRecord;
  attempts: AttemptRecord[];
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="history-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="history-head">
          <div>
            <span className="eyebrow">完整作答历史 · {attempts.length} 条</span>
            <h2 id="history-title">
              {problem.id}. {problem.title}
            </h2>
            <p>{problem.topic} · {problem.difficulty}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭历史详情">
            ×
          </button>
        </div>

        <div className="history-timeline">
          {attempts.length ? (
            attempts.map((attempt) => (
              <article className={`history-entry ${attempt.isVoid ? "is-void" : ""}`} key={attempt.id}>
                <div className="history-entry__top">
                  <span className={`status-pill status-${attempt.status}`}>{attempt.status} · {statusLabels[attempt.status]}</span>
                  <time>{attempt.attemptedOn}</time>
                </div>
                <div className="history-flags">
                  <span>{attempt.independentWrite ? "独立写出" : "未独立写出"}</span>
                  {attempt.isReview && <span>复测</span>}
                  {attempt.isVoid && <span>已作废</span>}
                </div>
                {attempt.errorReason && (
                  <div className="history-copy">
                    <b>卡点</b>
                    <p>{attempt.errorReason}</p>
                  </div>
                )}
                {attempt.notes && (
                  <div className="history-copy">
                    <b>结论</b>
                    <p>{attempt.notes}</p>
                  </div>
                )}
                {attempt.correctionReason && (
                  <div className="history-copy">
                    <b>修正原因</b>
                    <p>{attempt.correctionReason}</p>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="drawer-empty">这道题还没有作答记录。</div>
          )}
        </div>

        <a className="primary-button drawer-link" href={problem.url} target="_blank" rel="noreferrer">
          去 LeetCode 作答 ↗
        </a>
      </aside>
    </div>
  );
}

export function Dashboard({ initialData }: { initialData: DashboardPayload }) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全部");
  const [topicFilter, setTopicFilter] = useState("全部");
  const [difficultyFilter, setDifficultyFilter] = useState("全部");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const loadedProgressVersion = useRef(progressVersion);
  const pageSize = 20;

  useEffect(() => {
    const saved = window.localStorage.getItem("algo-ops-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const nextTheme = saved === "light" || saved === "dark" ? saved : preferred;
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const model = useMemo(() => {
    const activeAttempts = data.attempts.filter((attempt) => !attempt.isVoid).sort(compareAttempts);
    const latestByProblem = new Map<number, AttemptRecord>();
    const firstDateByProblem = new Map<number, string>();
    const attemptsByProblem = new Map<number, AttemptRecord[]>();

    for (const attempt of data.attempts) {
      const history = attemptsByProblem.get(attempt.problemId) ?? [];
      history.push(attempt);
      attemptsByProblem.set(attempt.problemId, history);
    }
    for (const history of attemptsByProblem.values()) history.sort(compareAttempts).reverse();

    for (const attempt of activeAttempts) {
      latestByProblem.set(attempt.problemId, attempt);
      if (!firstDateByProblem.has(attempt.problemId)) firstDateByProblem.set(attempt.problemId, attempt.attemptedOn);
    }

    const counts: Record<DisplayStatus, number> = { 红: 0, 黄: 0, 绿: 0, 灰: 0 };
    for (const problem of data.problems) counts[statusFrom(latestByProblem.get(problem.id))] += 1;

    const topics = Array.from(new Set(data.problems.map((problem) => problem.topic)));
    const topicStats = topics.map((topic) => {
      const problems = data.problems.filter((problem) => problem.topic === topic);
      const topicCounts: Record<DisplayStatus, number> = { 红: 0, 黄: 0, 绿: 0, 灰: 0 };
      for (const problem of problems) topicCounts[statusFrom(latestByProblem.get(problem.id))] += 1;
      return { topic, total: problems.length, counts: topicCounts };
    });

    const difficultyStats = ["简单", "中等", "困难"].map((difficulty) => {
      const problems = data.problems.filter((problem) => problem.difficulty === difficulty);
      const answered = problems.filter((problem) => latestByProblem.has(problem.id)).length;
      const green = problems.filter((problem) => latestByProblem.get(problem.id)?.status === "绿").length;
      return { difficulty, total: problems.length, answered, green };
    });

    const actualToday = dateInChina();
    const planIsCurrent = data.dailyPlan.date === actualToday;
    const planIsUpcoming = data.dailyPlan.date > actualToday;
    const planIsVisible = planIsCurrent || planIsUpcoming;
    const today = planIsVisible ? data.dailyPlan.date : actualToday;
    const problemById = new Map(data.problems.map((problem) => [problem.id, problem]));
    const problemsFromIds = (ids: number[]) =>
      ids.flatMap((id) => {
        const problem = problemById.get(id);
        return problem ? [problem] : [];
      });
    const todayProblems = planIsVisible
      ? problemsFromIds(data.dailyPlan.newProblemIds)
      : [];
    const completionAfterSourceRow = planIsVisible
      ? data.dailyPlan.completionAfterSourceRow
      : undefined;
    const currentSessionAttempts = activeAttempts.filter(
      (attempt) =>
        attempt.attemptedOn === today &&
        (completionAfterSourceRow === undefined ||
          attempt.sourceRow > completionAfterSourceRow),
    );
    const attemptedToday = new Set(
      currentSessionAttempts.map((attempt) => attempt.problemId),
    );
    const todayAttemptedCount = todayProblems.filter((problem) =>
      attemptedToday.has(problem.id),
    ).length;
    const reviewedToday = new Set(
      currentSessionAttempts
        .filter((attempt) => attempt.isReview)
        .map((attempt) => attempt.problemId),
    );
    const beforeReviewByProblem = new Map<number, AttemptRecord>();
    for (const attempt of activeAttempts) {
      const happenedBeforeSession = completionAfterSourceRow === undefined
        ? attempt.attemptedOn < today
        : attempt.sourceRow <= completionAfterSourceRow;
      if (happenedBeforeSession) {
        beforeReviewByProblem.set(attempt.problemId, attempt);
      }
    }
    const studyDays = Array.from(new Set(activeAttempts.map((attempt) => attempt.attemptedOn)));
    studyDays.sort();

    const queues = data.dailyPlan.reviewQueues;
    const d1Date = planIsVisible ? queues.d1.sourceDate ?? undefined : undefined;
    const d3Date = planIsVisible ? queues.d3.sourceDate ?? undefined : undefined;
    const d7Date = planIsVisible ? queues.d7.sourceDate ?? undefined : undefined;
    const d1 = planIsVisible ? problemsFromIds(queues.d1.problemIds) : [];
    const d3 = planIsVisible ? problemsFromIds(queues.d3.problemIds) : [];
    const d7 = planIsVisible ? problemsFromIds(queues.d7.problemIds) : [];
    const d7Pool = planIsVisible
      ? problemsFromIds(queues.d7.poolProblemIds ?? queues.d7.problemIds)
      : [];
    const redReview = planIsVisible ? problemsFromIds(queues.red.problemIds) : [];
    const reviewProblems = Array.from(
      new Map(
        [...d1, ...d3, ...d7, ...redReview].map((problem) => [problem.id, problem]),
      ).values(),
    );
    const reviewCompletedCount = reviewProblems.filter((problem) =>
      reviewedToday.has(problem.id),
    ).length;
    const todayCompletedCount = todayAttemptedCount + reviewCompletedCount;
    const todayTaskCount = todayProblems.length + reviewProblems.length;

    const redProblems = data.problems.filter((problem) => latestByProblem.get(problem.id)?.status === "红");

    const dayStats = studyDays
      .filter((date) => date <= actualToday)
      .map((date) => ({
        date,
        attempts: activeAttempts.filter((attempt) => attempt.attemptedOn === date).length,
        first: Array.from(firstDateByProblem.values()).filter((firstDate) => firstDate === date).length,
        cumulative: Array.from(firstDateByProblem.values()).filter((firstDate) => firstDate <= date).length,
      }));

    return {
      activeAttempts,
      latestByProblem,
      attemptsByProblem,
      counts,
      topicStats,
      difficultyStats,
      topics,
      today,
      planIsCurrent,
      planIsUpcoming,
      planIsVisible,
      todayProblems,
      attemptedToday,
      todayAttemptedCount,
      reviewedToday,
      beforeReviewByProblem,
      d1Date,
      d3Date,
      d7Date,
      d1,
      d3,
      d7,
      d7Pool,
      redReview,
      reviewProblems,
      reviewCompletedCount,
      todayCompletedCount,
      todayTaskCount,
      redProblems,
      dayStats,
    };
  }, [data]);

  const filteredProblems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return data.problems.filter((problem) => {
      const status = statusFrom(model.latestByProblem.get(problem.id));
      const matchesSearch =
        !normalized ||
        String(problem.id).includes(normalized) ||
        problem.title.toLowerCase().includes(normalized);
      return (
        matchesSearch &&
        (statusFilter === "全部" || status === statusFilter) &&
        (topicFilter === "全部" || problem.topic === topicFilter) &&
        (difficultyFilter === "全部" || problem.difficulty === difficultyFilter)
      );
    });
  }, [data.problems, difficultyFilter, model.latestByProblem, search, statusFilter, topicFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProblems.length / pageSize));
  const visibleProblems = filteredProblems.slice((page - 1) * pageSize, page * pageSize);
  const answered = data.problems.length - model.counts.灰;
  const progressDegrees = statusOrder.reduce(
    (state, status) => {
      const next = state.previous + (model.counts[status] / data.problems.length) * 100;
      state.stops.push(`var(--${status === "绿" ? "green" : status === "黄" ? "amber" : status === "红" ? "red" : "muted"}) ${state.previous}% ${next}%`);
      state.previous = next;
      return state;
    },
    { stops: [] as string[], previous: 0 },
  ).stops.join(", ");

  const selectedProblem = selectedId === null ? undefined : data.problems.find((problem) => problem.id === selectedId);

  const toggleTheme = () => {
    const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("algo-ops-theme", nextTheme);
  };

  const refresh = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const response = await fetch(`/api/dashboard?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (response.ok) setData((await response.json()) as DashboardPayload);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (loadedProgressVersion.current === progressVersion) return;
    loadedProgressVersion.current = progressVersion;
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    const syncInBackground = () => void refresh(false);
    const dayBoundaryTimeout = window.setTimeout(
      syncInBackground,
      millisecondsUntilNextDayBoundary(),
    );

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") syncInBackground();
    };
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.clearTimeout(dayBoundaryTimeout);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [data.dailyPlan.date, refresh]);

  const maxDailyAttempts = Math.max(...model.dayStats.map((day) => day.attempts), 1);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回作战台顶部">
          <span className="brand-mark">A/O</span>
          <span>
            <b>ALGO / OPS</b>
            <small>LEETCODE 100 COMMAND CENTER</small>
          </span>
        </a>
        <div className="topbar-actions">
          <span className={`source-badge ${data.stale ? "is-stale" : ""}`}>
            <i /> {data.source === "database" ? "D1 数据库" : "静态快照"}
          </span>
          <span
            className={`source-badge ${
              data.dailyPlan.stale || data.dailyPlan.syncSource !== "github"
                ? "is-stale"
                : ""
            }`}
          >
            <i /> 执行单 · {data.dailyPlan.syncSource === "github" ? "GitHub" : "仓库回退"}
          </span>
          <button className="text-button" type="button" onClick={() => void refresh()} disabled={isRefreshing}>
            {isRefreshing ? "同步中…" : "同步"}
          </button>
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label="切换深浅主题">
            ◐
          </button>
        </div>
      </header>

      <div className="content" id="top">
        <section className="hero-grid">
          <article className="progress-command panel">
            <div className="progress-copy">
              <span className="eyebrow">MISSION PROGRESS · 目标掌握 100%</span>
              <h1>字节最近 100<br />刷题作战台</h1>
              <p>只认真实作答记录。红色是尚未建立模型，黄色是已有思路但代码不稳，绿色是独立通过。</p>
              <div className="hero-actions">
                <a className="primary-button" href="#today">
                  {model.planIsUpcoming ? "查看明日任务" : "执行今日任务"}
                </a>
                <a className="secondary-button" href="#problem-bank">查看完整题库</a>
              </div>
            </div>
            <div className="progress-orbit" style={{ background: `conic-gradient(${progressDegrees})` }}>
              <div className="progress-orbit__inner">
                <strong>{answered}</strong>
                <span>/ {data.problems.length}</span>
                <small>已作答</small>
              </div>
            </div>
          </article>

          <aside className="today-brief panel">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">{model.planIsUpcoming ? "NEXT" : "TODAY"} · {model.today}</span>
                <h2>{model.planIsUpcoming ? "明日战情" : "今日战情"}</h2>
              </div>
              <span className={`live-dot ${model.planIsVisible ? "" : "is-stale"}`}>
                {model.planIsCurrent ? "LIVE" : model.planIsUpcoming ? "PREVIEW" : "WAIT"}
              </span>
            </div>
            <div className="brief-number">
              <strong>{model.todayCompletedCount}/{model.todayTaskCount}</strong>
              <span>{model.planIsUpcoming ? "项明日任务已完成" : "项今日任务已完成"}</span>
            </div>
            <dl className="brief-list">
              <div><dt>新题</dt><dd>{model.todayAttemptedCount} / {model.todayProblems.length} 已作答</dd></div>
              <div><dt>D+1</dt><dd>{model.d1.length ? `${model.d1.length} 题口述` : "来源日无首次题"}</dd></div>
              <div><dt>D+3</dt><dd>{model.d3.length} 题按状态复写</dd></div>
              <div><dt>D+7</dt><dd>{model.d7.length} / {model.d7Pool.length} 题盲写抽查</dd></div>
              <div>
                <dt>{data.dailyPlan.reviewQueues.red.label === "红题复测" ? "红题" : "专项"}</dt>
                <dd>{model.redReview.length} 道待处理</dd>
              </div>
            </dl>
            <p className="freshness">
              执行单生成：{formatSyncTime(data.dailyPlan.generatedAt)} · 当天收口后由当前对话生成
              <br />
              作答数据同步：{formatSyncTime(data.syncedAt)} · 对话记录写入后即时更新
            </p>
          </aside>
        </section>

        <section className="status-grid" aria-label="掌握状态统计">
          {statusOrder.map((status) => (
            <article className={`status-card panel status-card-${status}`} key={status}>
              <div><span className={`status-dot status-${status}`} />{statusLabels[status]}</div>
              <strong>{model.counts[status]}</strong>
              <small>{Math.round((model.counts[status] / data.problems.length) * 100)}% OF TOTAL</small>
            </article>
          ))}
        </section>

        {(data.dailyPlan.warning || !model.planIsCurrent) && (
          <section className="plan-alert" role="status">
            <b>{model.planIsCurrent ? "执行单同步提示" : model.planIsUpcoming ? "明日执行单已生成" : "今日执行单尚未生成"}</b>
            <span>
              {data.dailyPlan.warning ??
                (model.planIsUpcoming
                  ? `当前预览 ${data.dailyPlan.date} 的执行单；到达该日期后会自动转为 LIVE。`
                  : `当前读取到 ${data.dailyPlan.date} 的执行单，请在当前对话中生成今天的版本。`)}
            </span>
          </section>
        )}

        <section className="section today-mission" id="today">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {model.planIsUpcoming ? "NEXT" : "TODAY"}&apos;S MISSION · {model.today} · {data.dailyPlan.planVersion}
              </span>
              <h2>{model.planIsUpcoming ? "明日新题" : "今日新题"} · {model.todayProblems.length}</h2>
            </div>
            <p>题单由当前对话在上一学习日收口时写入 GitHub；“已作答”与颜色仍按真实作答记录判断。</p>
          </div>
          <div className="today-task-grid">
            {model.todayProblems.length ? (
              model.todayProblems.map((problem, index) => {
                const status = statusFrom(model.latestByProblem.get(problem.id));
                const attempted = model.attemptedToday.has(problem.id);
                return (
                  <a
                    className={`today-task-card panel ${attempted ? "is-attempted" : "is-pending"}`}
                    href={problem.url}
                    target="_blank"
                    rel="noreferrer"
                    key={problem.id}
                  >
                    <div className="today-task-card__top">
                      <span className="today-task-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className={`table-status status-${status}`}>
                        <i aria-hidden="true" /> {statusLabels[status]}
                      </span>
                    </div>
                    <h3>{problem.id}. {problem.title}</h3>
                    <p>{problem.topic}</p>
                    <div className="today-task-card__foot">
                      <span className={`difficulty difficulty-${problem.difficulty}`}>{problem.difficulty}</span>
                      <strong>{attempted ? "今日已作答" : "待作答 →"}</strong>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="today-empty panel">
                {model.planIsVisible ? "这份执行单没有新题。" : "等待今天的执行单同步后显示。"}
              </div>
            )}
          </div>
        </section>

        <section className="section" id="review">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SPACED REPETITION</span>
              <h2>{model.planIsUpcoming ? "明日复习队列" : "今日复习队列"}</h2>
            </div>
            <p>右侧标签表示今天是否复习；左侧圆点表示当前掌握程度，两种状态互不替代。</p>
          </div>
          <div className="queue-grid">
            <QueueCard label="D+1" sourceDate={model.d1Date} description={data.dailyPlan.reviewQueues.d1.instruction} problems={model.d1} latestByProblem={model.latestByProblem} beforeReviewByProblem={model.beforeReviewByProblem} reviewedToday={model.reviewedToday} />
            <QueueCard label="D+3" sourceDate={model.d3Date} description={data.dailyPlan.reviewQueues.d3.instruction} problems={model.d3} latestByProblem={model.latestByProblem} beforeReviewByProblem={model.beforeReviewByProblem} reviewedToday={model.reviewedToday} />
            <QueueCard label="D+7" sourceDate={model.d7Date} description={`${data.dailyPlan.reviewQueues.d7.instruction} 来源题池共 ${model.d7Pool.length} 题。`} problems={model.d7} latestByProblem={model.latestByProblem} beforeReviewByProblem={model.beforeReviewByProblem} reviewedToday={model.reviewedToday} />
            <QueueCard label={data.dailyPlan.reviewQueues.red.label} title={data.dailyPlan.reviewQueues.red.label === "红题复测" ? "日初红题池" : "专项与日初红题池"} description={data.dailyPlan.reviewQueues.red.instruction} problems={model.redReview} latestByProblem={model.latestByProblem} beforeReviewByProblem={model.beforeReviewByProblem} reviewedToday={model.reviewedToday} />
          </div>
        </section>

        <section className="section risk-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">RISK REGISTER</span>
              <h2>当前红题 · {model.redProblems.length}</h2>
            </div>
            <p>最新一次明确记录仍为红色；讲懂或抄过不等于掌握。</p>
          </div>
          <div className="risk-list panel">
            {model.redProblems.map((problem, index) => {
              const attempt = model.latestByProblem.get(problem.id);
              return (
                <button type="button" onClick={() => setSelectedId(problem.id)} key={problem.id}>
                  <span className="risk-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="risk-title"><b>{problem.id}. {problem.title}</b><small>{problem.topic} · {problem.difficulty}</small></span>
                  <span className="risk-reason">{attempt?.errorReason || "尚未形成稳定解法"}</span>
                  <span className="risk-arrow">→</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="analytics-grid section">
          <article className="panel topic-panel">
            <div className="panel-title-row">
              <div><span className="eyebrow">TOPIC COVERAGE</span><h2>专题掌握率</h2></div>
              <span className="legend-note">绿色 / 专题总题数</span>
            </div>
            <div className="topic-bars">
              {model.topicStats.map(({ topic, total, counts }) => (
                <div className="topic-row" key={topic}>
                  <div><b>{topic}</b><span>{counts.绿}/{total}</span></div>
                  <div className="segmented-bar" aria-label={`${topic}：绿 ${counts.绿}，黄 ${counts.黄}，红 ${counts.红}，灰 ${counts.灰}`}>
                    {statusOrder.map((status) => counts[status] > 0 && (
                      <i className={`bar-${status}`} style={{ width: `${(counts[status] / total) * 100}%` }} key={status} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel difficulty-panel">
            <div className="panel-title-row"><div><span className="eyebrow">DIFFICULTY MIX</span><h2>难度覆盖</h2></div></div>
            <div className="difficulty-bars">
              {model.difficultyStats.map((item) => (
                <div className="difficulty-column" key={item.difficulty}>
                  <div className="difficulty-track">
                    <i style={{ height: `${(item.answered / item.total) * 100}%` }} />
                    <em style={{ height: `${(item.green / item.total) * 100}%` }} />
                  </div>
                  <b>{item.difficulty}</b>
                  <span>{item.answered}/{item.total} 已做</span>
                  <small>{item.green} 绿</small>
                </div>
              ))}
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-title-row">
              <div><span className="eyebrow">TRAINING LOG</span><h2>有效学习日</h2></div>
              <span className="legend-note">柱高 = 当日记录数</span>
            </div>
            <div className="activity-chart">
              {model.dayStats.map((day) => (
                <div className="activity-day" key={day.date} title={`${day.date}：${day.attempts} 条记录，累计 ${day.cumulative} 道`}>
                  <span>{day.attempts}</span>
                  <div><i style={{ height: `${Math.max(8, (day.attempts / maxDailyAttempts) * 100)}%` }} /></div>
                  <small>{shortDate(day.date)}</small>
                </div>
              ))}
            </div>
            <div className="chart-foot"><span>有效学习日 {model.dayStats.length}</span><span>历史作答记录 {model.activeAttempts.length}</span></div>
          </article>
        </section>

        <section className="section" id="problem-bank">
          <div className="section-heading bank-heading">
            <div><span className="eyebrow">PROBLEM INDEX</span><h2>完整题库</h2></div>
            <div className="export-actions">
              <a href="/api/export.csv">下载 CSV</a>
              <a href="/api/export.json">下载 JSON</a>
            </div>
          </div>

          <div className="bank-panel panel">
            <div className="filters">
              <label className="search-box">
                <span>⌕</span>
                <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="搜索题号或题名" aria-label="搜索题号或题名" />
              </label>
              <label><span>状态</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as StatusFilter); setPage(1); }}><option>全部</option>{["红", "黄", "绿", "灰"].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span>专题</span><select value={topicFilter} onChange={(event) => { setTopicFilter(event.target.value); setPage(1); }}><option>全部</option>{model.topics.map((topic) => <option key={topic}>{topic}</option>)}</select></label>
              <label><span>难度</span><select value={difficultyFilter} onChange={(event) => { setDifficultyFilter(event.target.value); setPage(1); }}><option>全部</option><option>简单</option><option>中等</option><option>困难</option></select></label>
            </div>

            <div className="problem-table-wrap">
              <table className="problem-table">
                <thead><tr><th>状态</th><th>题目</th><th>专题</th><th>难度</th><th>最近作答</th><th>记录</th></tr></thead>
                <tbody>
                  {visibleProblems.map((problem) => {
                    const latest = model.latestByProblem.get(problem.id);
                    const status = statusFrom(latest);
                    const historyCount = model.attemptsByProblem.get(problem.id)?.length ?? 0;
                    return (
                      <tr key={problem.id}>
                        <td><span className={`table-status status-${status}`}><i />{status}</span></td>
                        <td><button className="problem-name" type="button" onClick={() => setSelectedId(problem.id)}><b>{problem.id}</b><span>{problem.title}</span></button></td>
                        <td>{problem.topic}</td>
                        <td><span className={`difficulty difficulty-${problem.difficulty}`}>{problem.difficulty}</span></td>
                        <td>{latest?.attemptedOn ?? "—"}</td>
                        <td><button className="history-button" type="button" onClick={() => setSelectedId(problem.id)}>{historyCount} 条 →</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>显示 {filteredProblems.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredProblems.length)} / {filteredProblems.length}</span>
              <div>
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>上一页</button>
                <span>{page} / {pageCount}</span>
                <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>下一页</button>
              </div>
            </div>
          </div>
        </section>

        <footer>
          <span>ALGO / OPS · 每次失败都保留证据</span>
          <span>数据口径：每题最新一条未作废记录决定颜色</span>
        </footer>
      </div>

      {selectedProblem && (
        <ProblemHistory
          problem={selectedProblem}
          attempts={model.attemptsByProblem.get(selectedProblem.id) ?? []}
          onClose={() => setSelectedId(null)}
        />
      )}
    </main>
  );
}
