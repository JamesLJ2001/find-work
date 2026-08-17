"use client";

import { useEffect, useMemo, useState } from "react";
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
  sourceDate,
  description,
  problems,
  latestByProblem,
}: {
  label: string;
  sourceDate?: string;
  description: string;
  problems: ProblemRecord[];
  latestByProblem: Map<number, AttemptRecord>;
}) {
  return (
    <article className="queue-card panel">
      <div className="queue-card__head">
        <div>
          <span className="eyebrow">{label}</span>
          <h3>{sourceDate ? `${shortDate(sourceDate)} 来源批次` : "暂无来源批次"}</h3>
        </div>
        <span className="queue-count">{problems.length}</span>
      </div>
      <p>{description}</p>
      <div className="queue-list">
        {problems.length ? (
          problems.map((problem) => {
            const status = statusFrom(latestByProblem.get(problem.id));
            return (
              <a href={problem.url} target="_blank" rel="noreferrer" key={problem.id}>
                <span className={`status-dot status-${status}`} aria-hidden="true" />
                <b>{problem.id}</b>
                <span>{problem.title}</span>
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

    const today = dateInChina();
    const studyDays = Array.from(new Set(activeAttempts.map((attempt) => attempt.attemptedOn)));
    if (!studyDays.includes(today)) studyDays.push(today);
    studyDays.sort();
    const currentDayIndex = studyDays.indexOf(today);
    const sourceAt = (offset: number) => studyDays[currentDayIndex - offset];
    const problemsFirstSeenOn = (date?: string) =>
      date
        ? data.problems.filter((problem) => firstDateByProblem.get(problem.id) === date)
        : [];

    const d1Date = sourceAt(1);
    const d3Date = sourceAt(3);
    const d7Date = sourceAt(7);
    const d1 = problemsFirstSeenOn(d1Date);
    const d3 = problemsFirstSeenOn(d3Date);
    const d7Pool = problemsFirstSeenOn(d7Date);
    const d7 = d7Pool.slice(0, 2);

    const redProblems = data.problems.filter((problem) => latestByProblem.get(problem.id)?.status === "红");

    const dayStats = studyDays
      .filter((date) => date <= today)
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
      d1Date,
      d3Date,
      d7Date,
      d1,
      d3,
      d7,
      d7Pool,
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

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.ok) setData((await response.json()) as DashboardPayload);
    } finally {
      setIsRefreshing(false);
    }
  };

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
          <button className="text-button" type="button" onClick={refresh} disabled={isRefreshing}>
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
                <a className="primary-button" href="#today">执行今日任务</a>
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
                <span className="eyebrow">TODAY · {model.today}</span>
                <h2>今日战情</h2>
              </div>
              <span className="live-dot">LIVE</span>
            </div>
            <div className="brief-number">
              <strong>{model.d1.length + model.d3.length + model.d7.length + model.redProblems.length}</strong>
              <span>项复习动作（含红题队列）</span>
            </div>
            <dl className="brief-list">
              <div><dt>D+1</dt><dd>{model.d1.length ? `${model.d1.length} 题口述` : "来源日无首次题"}</dd></div>
              <div><dt>D+3</dt><dd>{model.d3.length} 题按状态复写</dd></div>
              <div><dt>D+7</dt><dd>{model.d7.length} / {model.d7Pool.length} 题盲写抽查</dd></div>
              <div><dt>高危</dt><dd>{model.redProblems.length} 道红题待攻克</dd></div>
            </dl>
            <p className="freshness">最近同步：{formatSyncTime(data.syncedAt)} · {data.stale ? "数据库异常，当前为可用快照" : "数据正常"}</p>
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

        <section className="section" id="today">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SPACED REPETITION</span>
              <h2>今日复习队列</h2>
            </div>
            <p>按有效学习日回溯，空白日不占 D 序号；D+7 固定抽来源批次前两题。</p>
          </div>
          <div className="queue-grid">
            <QueueCard label="D+1" sourceDate={model.d1Date} description="口述思路与关键代码；绿色题无需完整重写。" problems={model.d1} latestByProblem={model.latestByProblem} />
            <QueueCard label="D+3" sourceDate={model.d3Date} description="红黄题从空白重写；绿色题只抽查边界。" problems={model.d3} latestByProblem={model.latestByProblem} />
            <QueueCard label="D+7" sourceDate={model.d7Date} description={`来源批次共 ${model.d7Pool.length} 题，今日抽两题完整盲写。`} problems={model.d7} latestByProblem={model.latestByProblem} />
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
