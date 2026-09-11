"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { reviewCards } from "../data/review-cards";
import { reviewPlan } from "../data/review-plan";
import { chinaDate, filterReviewIds, millisecondsToChinaMidnight, nextRecallId, recallKey, selectReviewDay } from "../lib/review";
import type { RecallGrade, RecallRecord, ReviewCard } from "../lib/review";
import { saveRecall, useRecallProgress } from "../lib/recall-storage";
import type { MasteryStatus, ProblemRecord } from "../lib/types";

const cardById = new Map(reviewCards.map((card) => [card.id, card]));
const gradeLabels: Record<RecallGrade, string> = {
  remembered: "会了", hesitant: "模糊", forgotten: "忘了",
};
const gradeHints: Record<RecallGrade, string> = {
  remembered: "能完整讲出步骤和边界", hesitant: "模型记得，细节卡住", forgotten: "需要重新建立思路",
};
type PracticeFilter = "all" | "unrated" | "weak";

function shortDate(date: string) {
  const [, month, day] = date.split("-");
  return Number(month) + "/" + Number(day);
}

function FlashCard({
  card, problem, mastery, saved, ready, onRate,
}: {
  card: ReviewCard;
  problem: ProblemRecord;
  mastery?: MasteryStatus;
  saved?: RecallRecord;
  ready: boolean;
  onRate: (grade: RecallGrade, draft: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState(saved?.draft ?? "");
  return (
    <article className="recall-card panel" aria-labelledby="recall-title">
      <div className="recall-card-meta">
        <span>NO. {String(problem.id).padStart(3, "0")}</span>
        <div>
          <span className={"difficulty difficulty-" + problem.difficulty}>{problem.difficulty}</span>
          <span className={"recall-code-state status-" + mastery}>代码记录 · {mastery ?? "未开始"}</span>
        </div>
      </div>
      <h2 id="recall-title">{problem.id}. {problem.title}</h2>
      <div className="recall-prompt">
        <div className="recall-label-row">
          <h3>题干摘要</h3>
          <a href={problem.url} target="_blank" rel="noreferrer">查看力扣原题 ↗</a>
        </div>
        <p>{card.prompt}</p>
        <dl className="recall-example">
          <div><dt>输入</dt><dd><code>{card.example.input}</code></dd></div>
          <div><dt>输出</dt><dd><code>{card.example.output}</code></dd></div>
        </dl>
        <p className="recall-source-note">题干按原题改写，供闭卷回忆；完整约束见原题。</p>
      </div>
      <div className="recall-draft">
        <label htmlFor="recall-draft">先讲思路，再翻面</label>
        <span>用什么模型 → 怎么做 → 注意什么边界 → 复杂度</span>
        <textarea
          id="recall-draft" value={draft} maxLength={5000} disabled={!ready}
          placeholder="也可以先写下自己的思路（可选，随自评保存）"
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
        />
      </div>
      <button
        type="button" className="primary-button recall-reveal" disabled={!ready}
        aria-expanded={revealed} aria-controls="recall-answer"
        onClick={() => setRevealed(!revealed)}
      >
        {revealed ? "收起思路，再回忆一次 ↑" : "我想好了，翻面看思路 ↓"}
      </button>
      {revealed && (
        <section className="recall-answer" id="recall-answer" aria-label="参考思路">
          <span className="eyebrow">核对思路</span>
          <p className="recall-hook">{card.memoryHook}</p>
          <h3>解题步骤</h3>
          <ol>{card.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
          <h3>容易忘的地方</h3>
          <ul>{card.pitfalls.map((pitfall, index) => <li key={index}>{pitfall}</li>)}</ul>
          <dl className="recall-complexity">
            <div><dt>时间复杂度</dt><dd>{card.complexity.time}</dd></div>
            <div><dt>额外空间</dt><dd>{card.complexity.space}</dd></div>
          </dl>
        </section>
      )}
      <fieldset className="recall-ratings" disabled={!revealed || !ready}>
        <legend>这次口述怎么样？{!revealed && "先翻面核对，再自评"}</legend>
        <div>
          {(["forgotten", "hesitant", "remembered"] as RecallGrade[]).map((grade) => (
            <button
              key={grade} type="button" className={"recall-grade grade-" + grade}
              onClick={() => onRate(grade, draft)}
              title={gradeHints[grade]}
            >
              <b>{gradeLabels[grade]}</b><small>{gradeHints[grade]}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <p className="recall-footnote">自评后进入下一题。口述记忆与代码掌握分开记录；独立写出后再更新红黄绿。</p>
    </article>
  );
}

export function ReviewWorkspace({
  problems, mastery, initialToday, initialScope = "today", initialProblemId = null,
}: {
  problems: ProblemRecord[];
  mastery: Record<number, MasteryStatus>;
  initialToday: string;
  initialScope?: string;
  initialProblemId?: number | null;
}) {
  const [today, setToday] = useState(initialToday);
  const [scope, setScope] = useState(initialScope);
  const [filter, setFilter] = useState<PracticeFilter>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<number | null>(initialProblemId);
  const [finished, setFinished] = useState(false);
  const [visited, setVisited] = useState<number[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const { progress, ready, warning } = useRecallProgress();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const updateDate = () => {
      setToday(chinaDate());
      clearTimeout(timer);
      timer = setTimeout(updateDate, millisecondsToChinaMidnight());
    };
    timer = setTimeout(updateDate, millisecondsToChinaMidnight());
    const whenVisible = () => { if (document.visibilityState === "visible") updateDate(); };
    document.addEventListener("visibilitychange", whenVisible);
    try {
      const saved = localStorage.getItem("algo-ops-theme");
      document.documentElement.dataset.theme = saved === "light" || saved === "dark"
        ? saved : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch { /* Practice remains available with blocked storage. */ }
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", whenVisible); };
  }, []);

  const defaultDay = selectReviewDay(reviewPlan, today);
  const day = scope === "all" || scope === "retired"
    ? null : scope === "today" ? defaultDay : reviewPlan.days.find((item) => item.id === scope) ?? defaultDay;
  const planDate = day?.date ?? "library";
  const problemById = new Map(problems.map((problem) => [problem.id, problem]));
  const scopeIds = day?.problemIds ?? (scope === "retired" ? reviewPlan.retiredProblemIds : problems.map((problem) => problem.id));
  const scopeRecords = { ...progress.records };
  if (!day) {
    for (const record of Object.values(progress.records)) {
      const key = recallKey("library", record.problemId);
      if (!scopeRecords[key] || record.reviewedAt > scopeRecords[key].reviewedAt) scopeRecords[key] = record;
    }
  }
  const normalized = search.trim().toLowerCase();
  const visibleIds = filterReviewIds(scopeIds, scopeRecords, planDate, filter).filter((id) => {
    const problem = problemById.get(id);
    return problem && cardById.has(id) && (!normalized || String(id).includes(normalized) || problem.title.toLowerCase().includes(normalized));
  });
  const currentId = activeId !== null && visibleIds.includes(activeId)
    ? activeId : visibleIds.find((id) => !scopeRecords[recallKey(planDate, id)]) ?? visibleIds[0];
  const currentIndex = visibleIds.indexOf(currentId);
  const card = cardById.get(currentId);
  const problem = problemById.get(currentId);
  const reviewed = scopeIds.filter((id) => scopeRecords[recallKey(planDate, id)]);
  const weak = filterReviewIds(scopeIds, scopeRecords, planDate, "weak");
  const remembered = reviewed.length - weak.length;
  const selectedTitle = day?.title ?? (scope === "retired" ? "已退役 · 主动查阅" : "全部 100 张卡片");

  function changeScope(next: string) {
    setScope(next); setFilter("all"); setSearch(""); setActiveId(null); setFinished(false); setVisited([]); setAnnouncement("");
  }

  function changeFilter(next: PracticeFilter) {
    setFilter(next); setActiveId(null); setFinished(false); setVisited([]);
  }

  function rate(grade: RecallGrade, draft: string) {
    if (!ready || !problem) return;
    const saved = saveRecall({ problemId: currentId, planDate, grade, reviewedAt: new Date().toISOString(), draft });
    setAnnouncement(problem.id + "「" + problem.title + "」已标记为" + gradeLabels[grade] + (saved ? "，已保存。" : "，仅暂存，请导出。"));
    const next = nextRecallId(visibleIds, currentId, scopeRecords, planDate, filter, visited);
    setVisited([...visited, currentId]);
    if (next !== undefined) setActiveId(next);
    else setFinished(true);
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify({ ...progress, exportedAt: new Date().toISOString(), planVersion: reviewPlan.version }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "leetcode-recall-" + today + ".json";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("algo-ops-theme", next); } catch { /* Optional preference. */ }
  }

  return (
    <main className="recall-shell">
      <header className="topbar recall-topbar">
        <Link className="brand" href="/" aria-label="返回刷题作战台">
          <span className="brand-mark">A/O</span>
          <span><b>ALGO / RECALL</b><small>LEETCODE 100 · 第二遍</small></span>
        </Link>
        <nav aria-label="复习导航">
          <Link href="/">作答记录</Link>
          <a href="#review-calendar">19 天计划</a>
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label="切换深浅主题">◐</button>
        </nav>
      </header>
      <div className="recall-content">
        <section className="recall-hero">
          <div>
            <span className="eyebrow">第二遍 · 2026.09.12 — 09.30</span>
            <h1>每天一类，<br className="recall-mobile-break" />把思路讲清楚。</h1>
            <p>先看题目回忆，再翻面核对。今天只专注一个题型。</p>
          </div>
          <div className="recall-hero-stat"><strong>100</strong><span>张背诵卡</span><small>19 天 · 97 道计划内题</small></div>
        </section>
        <section className="recall-routine" aria-label="每日复习方法">
          <div><b>01</b><span>看题口述<small>每题 1–2 分钟</small></span></div>
          <div><b>02</b><span>翻面核对<small>模型 · 步骤 · 边界</small></span></div>
          <div><b>03</b><span>薄弱题重写<small>本类选 2–3 道</small></span></div>
        </section>

        <div className="recall-workspace">
          <aside className="recall-sidebar">
            <section className="panel recall-day-panel">
              <label htmlFor="review-category">选择复习范围</label>
              <select id="review-category" value={scope} onChange={(event) => changeScope(event.target.value)}>
                <option value="today">{today < reviewPlan.startDate ? "明天开始" : today > reviewPlan.endDate ? "本轮已结束" : "今日类别"} · {defaultDay.title}</option>
                {reviewPlan.days.map((item) => <option key={item.id} value={item.id}>Day {item.day} · {shortDate(item.date)} · {item.title}</option>)}
                <option value="all">全部 100 张卡片</option>
                <option value="retired">已退役 3 题（主动查阅）</option>
              </select>
              <span className="eyebrow recall-day-label">
                {day ? "DAY " + String(day.day).padStart(2, "0") + " / 19 · " + shortDate(day.date) : "CARD LIBRARY"}
              </span>
              <h2>{selectedTitle}</h2>
              <p>{day?.focus ?? (scope === "retired" ? reviewPlan.retiredReason : "按题号或题名查阅，也可以练习跨类别回忆。")}</p>
              {day && day.date > today && <p className="recall-date-note">这是 {shortDate(day.date)} 的计划，现在可以提前预习。</p>}
              {day && day.date < today && <p className="recall-date-note">{today > reviewPlan.endDate ? "本轮日期已结束，可选择任意类别继续巩固。" : "正在补练此前类别，可切回今日类别。"}</p>}
              <div className="recall-progress-line"><span>本类口述自评</span><strong>{reviewed.length} / {scopeIds.length}</strong></div>
              <progress value={reviewed.length} max={scopeIds.length} aria-label="已完成口述自评" />
              <div className="recall-tally"><span>会了 {remembered}</span><span>待巩固 {weak.length}</span><span>未练 {scopeIds.length - reviewed.length}</span></div>
            </section>
            <section className="panel recall-roster" aria-label="当前题单">
              <div className="recall-roster-head"><h3>本组题单</h3><span>{scopeIds.length} 题</span></div>
              <ol>
                {scopeIds.map((id) => {
                  const item = problemById.get(id);
                  const grade = scopeRecords[recallKey(planDate, id)]?.grade;
                  return item && (
                    <li key={id}>
                      <button type="button" aria-current={currentId === id && !finished ? "true" : undefined}
                        onClick={() => { setActiveId(id); setFilter("all"); setSearch(""); setFinished(false); }}>
                        <span>{id}. {item.title}</span>
                        <small className={grade ? "grade-text-" + grade : ""}>{grade ? gradeLabels[grade] : "未练"}</small>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          </aside>

          <section className="recall-main" aria-label="背诵卡练习">
            <div className="recall-toolbar">
              <label className="recall-search"><span className="sr-only">搜索题号或题名</span>
                <input type="search" placeholder="搜索题号或题名…" value={search}
                  onChange={(event) => { setSearch(event.target.value); setActiveId(null); setFinished(false); setVisited([]); }} />
              </label>
              <div className="recall-filters" role="group" aria-label="口述状态筛选">
                {([["all", "全部"], ["unrated", "未练"], ["weak", "模糊 / 忘了"]] as const).map(([value, label]) => (
                  <button type="button" key={value} aria-pressed={filter === value} onClick={() => changeFilter(value)}>{label}</button>
                ))}
              </div>
            </div>
            {warning && <p className="recall-warning" role="alert">{warning}</p>}
            <p className="recall-announcement" role="status" aria-live="polite">{announcement || "题干和例子在正面；想好后再看解题步骤。"}</p>
            {finished ? (
              <section className="recall-finish panel" aria-labelledby="recall-finish-title">
                <span className="eyebrow">这一组翻完了</span>
                <h2 id="recall-finish-title">{selectedTitle} · 再把薄弱点练稳</h2>
                <p>本组已自评 {reviewed.length}/{scopeIds.length} 题，其中 {weak.length} 题还需要巩固。口述之后，选本类 2–3 道闭卷写代码。</p>
                <div className="recall-finish-actions">
                  <button className="primary-button" type="button" disabled={!weak.length} onClick={() => { setSearch(""); changeFilter("weak"); }}>再练本组模糊 / 忘了的题</button>
                  <button className="secondary-button" type="button" onClick={() => { setSearch(""); changeFilter("all"); }}>重新看本组全部题</button>
                </div>
              </section>
            ) : card && problem ? (
              <FlashCard
                key={scope + ":" + planDate + ":" + filter + ":" + currentId + ":" + ready}
                card={card} problem={problem} mastery={mastery[currentId]}
                saved={scopeRecords[recallKey(planDate, currentId)]} ready={ready} onRate={rate}
              />
            ) : (
              <section className="recall-empty panel">
                <h2>{filter === "weak" && !search ? "本组暂时没有模糊或忘记的题" : "没有匹配的卡片"}</h2>
                <p>可以清空搜索或切回全部卡片继续练习。</p>
                <button className="secondary-button" type="button" onClick={() => { setSearch(""); changeFilter("all"); }}>显示本组全部题</button>
              </section>
            )}
            {!finished && visibleIds.length > 0 && (
              <div className="recall-pagination">
                <button type="button" className="secondary-button" disabled={currentIndex <= 0}
                  onClick={() => setActiveId(visibleIds[currentIndex - 1])}>← 上一题</button>
                <span>{currentIndex + 1} / {visibleIds.length}</span>
                <button type="button" className="secondary-button" disabled={currentIndex >= visibleIds.length - 1}
                  onClick={() => setActiveId(visibleIds[currentIndex + 1])}>下一题 →</button>
              </div>
            )}
            <div className="recall-save-note">
              <p>口述自评保存在当前浏览器，刷新可继续；代码掌握状态仍以实际作答记录为准。</p>
              <button type="button" className="text-button" onClick={exportProgress} disabled={!ready}>导出口述记录 ↓</button>
            </div>
          </section>
        </div>

        <details className="recall-calendar panel" id="review-calendar">
          <summary><span>查看完整 19 天计划</span><small>9/12 — 9/30 · 每天一个类别</small></summary>
          <p className="recall-calendar-intro">每天先过本类所有背诵卡，再闭卷重写薄弱题，建议预留 45–75 分钟。未完成时可手动选择原类别继续。</p>
          <ol>
            {reviewPlan.days.map((item) => {
              const count = item.problemIds.filter((id) => progress.records[recallKey(item.date, id)]).length;
              return (
                <li key={item.id} className={item.date === today ? "is-today" : ""}>
                  <div className="recall-calendar-meta"><span>DAY {String(item.day).padStart(2, "0")} · {shortDate(item.date)}</span><span>{count}/{item.problemIds.length} 已自评</span></div>
                  <button type="button" onClick={() => { changeScope(item.id); document.querySelector(".recall-workspace")?.scrollIntoView({ block: "start" }); }}>{item.title} ↗</button>
                  <p>{item.problemIds.map((id) => id + " " + problemById.get(id)?.title).join(" · ")}</p>
                </li>
              );
            })}
          </ol>
          <p className="recall-retired-note">计划内 97 题；42 接雨水、73 矩阵置零、136 只出现一次的数字沿用退役设置，保留在 100 张卡片库中供主动查阅。</p>
        </details>
      </div>
    </main>
  );
}
