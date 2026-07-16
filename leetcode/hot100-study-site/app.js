(function () {
  "use strict";

  const STORAGE_KEY = "hot100-study-field-guide-v1";
  const THEME_KEY = "hot100-study-theme";
  const VALID_STATUS = new Set(["unstarted", "learning", "mastered"]);
  const STATUS_LABEL = {
    unstarted: "未学习",
    learning: "学习中",
    mastered: "已掌握"
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function asText(value, fallback) {
    if (value == null || value === "") return fallback == null ? "—" : fallback;
    if (Array.isArray(value)) return value.join("、");
    if (typeof value === "object") {
      try { return JSON.stringify(value); } catch (_error) { return String(value); }
    }
    return String(value);
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    return [value];
  }

  function difficultyName(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "easy" || normalized.includes("简单")) return "简单";
    if (normalized === "hard" || normalized.includes("困难")) return "困难";
    if (normalized === "medium" || normalized.includes("中等")) return "中等";
    return value ? String(value) : "中等";
  }

  function difficultyClass(value) {
    const name = difficultyName(value);
    if (name === "困难") return "hard";
    if (name === "中等") return "medium";
    return "easy";
  }

  const rawProblems = Array.isArray(window.HOT100_PROBLEMS) ? window.HOT100_PROBLEMS : [];
  const rawCategories = Array.isArray(window.HOT100_CATEGORIES) ? window.HOT100_CATEGORIES : [];
  const solutions = window.HOT100_SOLUTIONS || {};

  const problems = rawProblems.map(function (problem, index) {
    const normalized = Object.assign({}, problem);
    normalized.id = problem.id == null ? index + 1 : problem.id;
    normalized.key = String(normalized.id);
    normalized.title = asText(problem.title, "未命名题目");
    normalized.slug = asText(problem.slug, "");
    normalized.category = asText(problem.category, "未分类");
    normalized.difficulty = difficultyName(problem.difficulty);
    normalized.method = asText(problem.method, "推荐主解");
    normalized.template = asText(problem.template, "通用模板");
    normalized.tags = asArray(problem.tags).map(String).filter(Boolean);
    normalized.essence = asText(problem.essence, "抓住状态之间的关系，保持不变量并逐步缩小问题规模。");
    normalized.why = asText(problem.why, "这个解法兼顾复杂度、可读性和面试表达，适合作为稳定主解。");
    normalized.signal = asText(problem.signal, "先观察输入结构、目标条件与可复用的局部状态。");
    normalized.time = asText(problem.time, "见代码分析");
    normalized.space = asText(problem.space, "见代码分析");
    normalized.pitfall = asText(problem.pitfall, "注意空输入、边界下标和状态更新顺序。");
    normalized.demo = problem.demo && typeof problem.demo === "object" ? problem.demo : null;
    return normalized;
  });

  let categories = rawCategories.map(function (category, index) {
    return {
      id: asText(category.id, "category-" + (index + 1)),
      name: asText(category.name || category.title, "分类 " + (index + 1)),
      title: asText(category.title || category.name, "分类 " + (index + 1)),
      count: Number(category.count) || 0,
      description: asText(category.description, "")
    };
  });

  if (!categories.length && problems.length) {
    const names = Array.from(new Set(problems.map(function (problem) { return problem.category; })));
    categories = names.map(function (name, index) {
      return { id: "category-" + (index + 1), name: name, title: name, count: 0, description: "" };
    });
  }

  function categoryFor(problem) {
    const value = String(problem.category).trim().toLowerCase();
    return categories.find(function (category) {
      return [category.id, category.name, category.title].some(function (candidate) {
        return String(candidate).trim().toLowerCase() === value;
      });
    }) || null;
  }

  function categoryKey(problem) {
    const category = categoryFor(problem);
    return category ? category.id : String(problem.category);
  }

  function categoryLabel(problem) {
    const category = categoryFor(problem);
    return category ? category.name : String(problem.category);
  }

  function freshStudy() {
    return {
      status: "unstarted",
      mastery: 0,
      favorite: false,
      notes: "",
      review: false,
      nextReview: ""
    };
  }

  function sanitizeStudy(value) {
    const source = value && typeof value === "object" ? value : {};
    const mastery = Math.max(0, Math.min(5, Number(source.mastery) || 0));
    return {
      status: VALID_STATUS.has(source.status) ? source.status : "unstarted",
      mastery: mastery,
      favorite: Boolean(source.favorite),
      notes: typeof source.notes === "string" ? source.notes.slice(0, 2000) : "",
      review: Boolean(source.review),
      nextReview: /^\d{4}-\d{2}-\d{2}$/.test(source.nextReview || "") ? source.nextReview : ""
    };
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return { version: 1, learning: {} };
      const learning = {};
      Object.keys(parsed.learning || {}).forEach(function (key) {
        learning[String(key)] = sanitizeStudy(parsed.learning[key]);
      });
      return { version: 1, learning: learning };
    } catch (_error) {
      return { version: 1, learning: {} };
    }
  }

  const store = loadStore();
  let storageWarningShown = false;

  function saveStore(showConfirmation) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      if (showConfirmation) showToast("学习记录已保存在本机");
    } catch (_error) {
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast("浏览器阻止了本地保存，请使用导出功能备份记录");
      }
    }
  }

  function getStudy(id) {
    const key = String(id);
    if (!store.learning[key]) store.learning[key] = freshStudy();
    return store.learning[key];
  }

  function updateStudy(id, patch, renderPage) {
    const key = String(id);
    store.learning[key] = sanitizeStudy(Object.assign({}, getStudy(key), patch));
    saveStore(false);
    if (renderPage !== false) {
      renderStats();
      renderCategories();
      renderProblems();
    }
  }

  const filters = {
    search: "",
    category: "all",
    difficulty: "all",
    status: "all",
    favorite: false,
    dueOnly: false
  };

  let currentProblemId = null;
  let demoStep = 0;
  let demoTimer = null;
  let demoPlaying = false;
  let notesTimer = null;
  let toastTimer = null;

  const elements = {
    categoryNav: $("#category-nav"),
    categoryFilter: $("#category-filter"),
    difficultyFilter: $("#difficulty-filter"),
    statusFilter: $("#status-filter"),
    favoriteFilter: $("#favorite-filter"),
    resetFilter: $("#reset-filter"),
    search: $("#search-input"),
    grid: $("#problem-grid"),
    empty: $("#empty-state"),
    dialog: $("#problem-dialog"),
    toast: $("#toast")
  };

  function localDate(offsetDays) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + (offsetDays || 0));
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function isDue(study) {
    return study.review && (!study.nextReview || study.nextReview <= localDate(0));
  }

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      elements.toast.classList.remove("is-visible");
    }, 2600);
  }

  function renderStats() {
    const allStudies = problems.map(function (problem) { return getStudy(problem.key); });
    const learning = allStudies.filter(function (study) { return study.status === "learning"; }).length;
    const mastered = allStudies.filter(function (study) { return study.status === "mastered"; }).length;
    const favorite = allStudies.filter(function (study) { return study.favorite; }).length;
    const due = allStudies.filter(isDue).length;
    const percent = problems.length ? Math.round(mastered / problems.length * 100) : 0;

    $("#learned-count").textContent = learning;
    $("#mastered-count").textContent = mastered;
    $("#favorite-count").textContent = favorite;
    $("#due-count").textContent = due;
    $("#mastered-percent").textContent = percent + "%";
    $("#progress-orbit").style.setProperty("--progress", (percent * 3.6) + "deg");
    $("#all-progress-text").textContent = mastered + " / " + problems.length + " 掌握";
    $("#all-count").textContent = problems.length;
  }

  function categoryProblems(category) {
    return problems.filter(function (problem) { return categoryKey(problem) === category.id; });
  }

  function renderCategories() {
    if (!elements.categoryNav) return;
    elements.categoryNav.innerHTML = categories.map(function (category, index) {
      const items = categoryProblems(category);
      const mastered = items.filter(function (problem) { return getStudy(problem.key).status === "mastered"; }).length;
      const count = items.length || category.count;
      return "<button class=\"category-link" + (filters.category === category.id ? " is-active" : "") + "\" type=\"button\" data-category=\"" + escapeHTML(category.id) + "\" title=\"" + escapeHTML(category.description || category.name) + "\"" + (filters.category === category.id ? " aria-current=\"true\"" : "") + ">" +
        "<span class=\"category-index\">" + String(index + 1).padStart(2, "0") + "</span>" +
        "<span class=\"category-copy\"><strong>" + escapeHTML(category.name) + "</strong><small>" + mastered + " / " + count + " 掌握</small></span>" +
        "<span class=\"category-count\">" + count + "</span></button>";
    }).join("");

    const allButton = $(".sidebar > .category-link[data-category='all']");
    if (allButton) {
      allButton.classList.toggle("is-active", filters.category === "all");
      if (filters.category === "all") allButton.setAttribute("aria-current", "true");
      else allButton.removeAttribute("aria-current");
    }
  }

  function renderCategoryFilter() {
    elements.categoryFilter.innerHTML = "<option value=\"all\">全部分类</option>" + categories.map(function (category) {
      return "<option value=\"" + escapeHTML(category.id) + "\">" + escapeHTML(category.name) + "</option>";
    }).join("");
    elements.categoryFilter.value = filters.category;
  }

  function matchesSearch(problem, query) {
    if (!query) return true;
    const haystack = [
      problem.id,
      problem.title,
      problem.slug,
      categoryLabel(problem),
      problem.method,
      problem.template,
      problem.essence,
      problem.signal
    ].concat(problem.tags).join(" ").toLowerCase();
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return words.every(function (word) { return haystack.includes(word); });
  }

  function filteredProblems() {
    return problems.filter(function (problem) {
      const study = getStudy(problem.key);
      if (!matchesSearch(problem, filters.search)) return false;
      if (filters.category !== "all" && categoryKey(problem) !== filters.category) return false;
      if (filters.difficulty !== "all" && problem.difficulty !== filters.difficulty) return false;
      if (filters.favorite && !study.favorite) return false;
      if (filters.status === "review") {
        if (filters.dueOnly ? !isDue(study) : !study.review) return false;
      } else if (filters.status !== "all" && study.status !== filters.status) {
        return false;
      }
      return true;
    });
  }

  function masteryDots(level) {
    let html = "<span class=\"mastery-dots\" aria-label=\"掌握度 " + level + " / 5\">";
    for (let i = 1; i <= 5; i += 1) html += "<i class=\"" + (i <= level ? "is-on" : "") + "\"></i>";
    return html + "</span>";
  }

  function problemCard(problem) {
    const study = getStudy(problem.key);
    const tags = problem.tags.slice(0, 3);
    const extra = Math.max(0, problem.tags.length - tags.length);
    return "<article class=\"problem-card\" data-status=\"" + escapeHTML(study.status) + "\">" +
      "<button class=\"card-main\" type=\"button\" data-open-problem=\"" + escapeHTML(problem.key) + "\" aria-label=\"查看第 " + escapeHTML(problem.id) + " 题 " + escapeHTML(problem.title) + "\">" +
      "<span class=\"card-meta\"><span class=\"problem-number\">LC / " + String(problem.id).padStart(3, "0") + " · " + escapeHTML(categoryLabel(problem)) + "</span><span class=\"difficulty " + difficultyClass(problem.difficulty) + "\">" + escapeHTML(problem.difficulty) + "</span></span>" +
      "<span class=\"card-title-row\"><span class=\"card-title\">" + escapeHTML(problem.title) + "</span><span class=\"favorite-star " + (study.favorite ? "is-favorite" : "") + "\" aria-hidden=\"true\">" + (study.favorite ? "★" : "☆") + "</span></span>" +
      "<span class=\"card-method\">" + escapeHTML(problem.method) + "</span>" +
      "<span class=\"card-essence\">" + escapeHTML(problem.essence) + "</span>" +
      "<span class=\"card-tags\">" + tags.map(function (tag) { return "<span># " + escapeHTML(tag) + "</span>"; }).join("") + (extra ? "<span>+" + extra + "</span>" : "") + "</span>" +
      "</button>" +
      "<footer class=\"card-footer\"><strong>" + STATUS_LABEL[study.status] + (study.review ? " · 复习" : "") + "</strong>" + masteryDots(study.mastery) + "</footer>" +
      "</article>";
  }

  function renderProblems() {
    const result = filteredProblems();
    elements.grid.innerHTML = result.map(problemCard).join("");
    elements.grid.hidden = result.length === 0;
    elements.empty.hidden = result.length !== 0;
    $("#result-count").textContent = result.length;

    let title = "全部题目";
    if (filters.category !== "all") {
      const category = categories.find(function (item) { return item.id === filters.category; });
      title = category ? category.name : "筛选结果";
    } else if (filters.status === "review" && filters.dueOnly) {
      title = "今天该复习";
    } else if (filters.search || filters.difficulty !== "all" || filters.status !== "all" || filters.favorite) {
      title = "筛选结果";
    }
    $("#list-title").textContent = title;

    const summary = [];
    if (filters.search) summary.push("关键词：“" + filters.search + "”");
    if (filters.difficulty !== "all") summary.push(filters.difficulty);
    if (filters.status !== "all") summary.push(filters.dueOnly ? "今天到期" : (filters.status === "review" ? "复习队列" : STATUS_LABEL[filters.status]));
    if (filters.favorite) summary.push("收藏");
    $("#filter-summary").textContent = summary.length ? "· " + summary.join(" · ") : "";
  }

  function setCategory(value) {
    filters.category = value;
    filters.dueOnly = false;
    elements.categoryFilter.value = value;
    renderCategories();
    renderProblems();
  }

  function resetFilters() {
    filters.search = "";
    filters.category = "all";
    filters.difficulty = "all";
    filters.status = "all";
    filters.favorite = false;
    filters.dueOnly = false;
    elements.search.value = "";
    elements.categoryFilter.value = "all";
    elements.difficultyFilter.value = "all";
    elements.statusFilter.value = "all";
    elements.favoriteFilter.setAttribute("aria-pressed", "false");
    elements.favoriteFilter.innerHTML = "<span aria-hidden=\"true\">☆</span> 仅看收藏";
    renderCategories();
    renderProblems();
  }

  function currentProblem() {
    return problems.find(function (problem) { return problem.key === String(currentProblemId); }) || null;
  }

  function getSolution(problem) {
    let value = solutions && solutions[problem.id];
    if (value == null && solutions && solutions[problem.key] != null) value = solutions[problem.key];
    if (value == null && Array.isArray(solutions)) {
      value = solutions.find(function (item) { return String(item.id) === problem.key || item.slug === problem.slug; });
    }
    if (value && typeof value === "object") value = value.code || value.python3 || value.python || value.solution;
    if (typeof value !== "string" || !value.trim()) {
      return "# 当前题目的 Python3 主解尚未载入。\n# 请确认 solutions.js 与本页面位于同一目录。";
    }
    return value.trimEnd();
  }

  const PYTHON_KEYWORDS = new Set([
    "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "False", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "None", "nonlocal", "not", "or", "pass", "raise", "return", "True", "try", "while", "with", "yield"
  ]);
  const PYTHON_BUILTINS = new Set([
    "abs", "all", "any", "bool", "dict", "enumerate", "float", "int", "len", "list", "map", "max", "min", "range", "reversed", "set", "sorted", "str", "sum", "tuple", "zip", "deque", "defaultdict", "Counter", "heapq"
  ]);

  function highlightPython(code) {
    const lines = String(code).replace(/\r\n?/g, "\n").split("\n");
    let tripleQuote = null;

    return lines.map(function (line) {
      let html = "";
      let index = 0;
      while (index < line.length) {
        if (tripleQuote) {
          const end = line.indexOf(tripleQuote, index);
          if (end === -1) {
            html += "<span class=\"tok-string\">" + escapeHTML(line.slice(index)) + "</span>";
            index = line.length;
          } else {
            html += "<span class=\"tok-string\">" + escapeHTML(line.slice(index, end + 3)) + "</span>";
            index = end + 3;
            tripleQuote = null;
          }
          continue;
        }

        const char = line[index];
        if (char === "#") {
          html += "<span class=\"tok-comment\">" + escapeHTML(line.slice(index)) + "</span>";
          break;
        }
        if (char === "'" || char === "\"") {
          const quote = char;
          const isTriple = line.slice(index, index + 3) === quote.repeat(3);
          let cursor = index + (isTriple ? 3 : 1);
          let closed = false;
          while (cursor < line.length) {
            if (line[cursor] === "\\") {
              cursor += 2;
              continue;
            }
            if (isTriple && line.slice(cursor, cursor + 3) === quote.repeat(3)) {
              cursor += 3;
              closed = true;
              break;
            }
            if (!isTriple && line[cursor] === quote) {
              cursor += 1;
              closed = true;
              break;
            }
            cursor += 1;
          }
          html += "<span class=\"tok-string\">" + escapeHTML(line.slice(index, cursor)) + "</span>";
          if (isTriple && !closed) tripleQuote = quote.repeat(3);
          index = cursor;
          continue;
        }
        if (char === "@") {
          const match = line.slice(index).match(/^@[A-Za-z_][\w.]*/);
          if (match) {
            html += "<span class=\"tok-decorator\">" + escapeHTML(match[0]) + "</span>";
            index += match[0].length;
            continue;
          }
        }
        if (/[A-Za-z_]/.test(char)) {
          const match = line.slice(index).match(/^[A-Za-z_]\w*/)[0];
          const type = PYTHON_KEYWORDS.has(match) ? "tok-keyword" : (PYTHON_BUILTINS.has(match) ? "tok-builtin" : "");
          html += type ? "<span class=\"" + type + "\">" + match + "</span>" : match;
          index += match.length;
          continue;
        }
        if (/\d/.test(char)) {
          const match = line.slice(index).match(/^(?:0[xob][\da-f]+|\d+(?:\.\d+)?)/i)[0];
          html += "<span class=\"tok-number\">" + match + "</span>";
          index += match.length;
          continue;
        }
        html += escapeHTML(char);
        index += 1;
      }
      return "<span class=\"code-line\">" + (html || " ") + "</span>";
    }).join("");
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = asText(value, "—");
  }

  function openProblem(id) {
    const problem = problems.find(function (item) { return item.key === String(id); });
    if (!problem) return;
    currentProblemId = problem.key;
    demoStep = 0;
    stopDemo();
    window.clearTimeout(notesTimer);

    setText("#dialog-number", "LC " + String(problem.id).padStart(3, "0"));
    setText("#dialog-title", problem.title);
    $("#dialog-badges").innerHTML = "<span>" + escapeHTML(problem.difficulty) + "</span><span>" + escapeHTML(categoryLabel(problem)) + "</span><span>" + escapeHTML(problem.method) + "</span>";
    setText("#detail-essence", problem.essence);
    setText("#detail-why", problem.why);
    setText("#detail-signal", problem.signal);
    setText("#detail-method", problem.method);
    setText("#detail-template", problem.template);
    setText("#detail-time", problem.time);
    setText("#detail-space", problem.space);
    setText("#detail-pitfall", problem.pitfall);
    $("#detail-tags").innerHTML = problem.tags.length ? problem.tags.map(function (tag) { return "<span># " + escapeHTML(tag) + "</span>"; }).join("") : "<span># " + escapeHTML(problem.template) + "</span>";
    $("#official-link").href = problem.slug ? "https://leetcode.cn/problems/" + encodeURIComponent(problem.slug) + "/" : "https://leetcode.cn/problemset/";
    $("#code-filename").textContent = problem.slug ? problem.slug.replace(/-/g, "_") + ".py" : "solution_" + problem.id + ".py";
    $("#solution-code").innerHTML = highlightPython(getSolution(problem));
    renderStudyPanel();
    renderDemo();
    selectTab("overview", false);

    if (typeof elements.dialog.showModal === "function") elements.dialog.showModal();
    else elements.dialog.setAttribute("open", "");
  }

  function flushNotes() {
    window.clearTimeout(notesTimer);
    const problem = currentProblem();
    const textarea = $("#study-notes");
    if (!problem || !textarea) return;
    const value = textarea.value.slice(0, 2000);
    if (value !== getStudy(problem.key).notes) updateStudy(problem.key, { notes: value }, false);
  }

  function closeDialog() {
    flushNotes();
    stopDemo();
    if (elements.dialog.open && typeof elements.dialog.close === "function") elements.dialog.close();
    else elements.dialog.removeAttribute("open");
  }

  function selectTab(name, focusTab) {
    $$(".dialog-tabs [role='tab']").forEach(function (tab) {
      const selected = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    $$(".tab-panel").forEach(function (panel) {
      const selected = panel.id === "panel-" + name;
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
    });
    if (name === "demo") renderDemo();
    else stopDemo();
    $(".dialog-body").scrollTop = 0;
  }

  function updateFavoriteButton() {
    const problem = currentProblem();
    if (!problem) return;
    const favorite = getStudy(problem.key).favorite;
    const button = $("#dialog-favorite");
    button.setAttribute("aria-pressed", String(favorite));
    button.innerHTML = "<span aria-hidden=\"true\">" + (favorite ? "★" : "☆") + "</span><span>" + (favorite ? "已收藏" : "收藏") + "</span>";
  }

  function renderStudyPanel() {
    const problem = currentProblem();
    if (!problem) return;
    const study = getStudy(problem.key);
    $$("input[name='study-status']").forEach(function (input) {
      input.checked = input.value === study.status;
    });
    $("#mastery-control").innerHTML = [1, 2, 3, 4, 5].map(function (level) {
      return "<button type=\"button\" role=\"radio\" aria-checked=\"" + String(study.mastery === level) + "\" aria-label=\"掌握程度 " + level + "\" data-mastery=\"" + level + "\" class=\"" + (level <= study.mastery ? "is-on" : "") + "\">" + level + "</button>";
    }).join("");
    $("#review-toggle").checked = study.review;
    $("#review-date").disabled = !study.review;
    $("#review-date").value = study.nextReview;
    $("#study-notes").value = study.notes;
    $("#notes-count").textContent = study.notes.length + " / 2000";
    updateFavoriteButton();
  }

  function normalizeIndexSet(value) {
    const set = new Set();
    asArray(value).forEach(function (item) {
      if (typeof item === "number" || /^-?\d+$/.test(String(item))) set.add(Number(item));
      else set.add(String(item));
    });
    return set;
  }

  function pointerMap(pointers) {
    const map = new Map();
    if (!pointers) return map;
    if (Array.isArray(pointers)) {
      pointers.forEach(function (pointer, index) {
        if (pointer && typeof pointer === "object") {
          const label = pointer.label || pointer.name || String(index + 1);
          const target = pointer.index != null ? pointer.index : pointer.value;
          const key = Number.isNaN(Number(target)) ? String(target) : Number(target);
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(String(label));
        }
      });
    } else if (typeof pointers === "object") {
      Object.keys(pointers).forEach(function (label) {
        const target = pointers[label];
        const key = Number.isNaN(Number(target)) ? String(target) : Number(target);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(label);
      });
    }
    return map;
  }

  function inRange(index, range) {
    if (!Array.isArray(range) || range.length < 2) return false;
    const left = Number(range[0]);
    const right = Number(range[1]);
    return Number.isFinite(left) && Number.isFinite(right) && index >= Math.min(left, right) && index <= Math.max(left, right);
  }

  function visualResult(step) {
    if (step.result == null || step.result === "") return "";
    return "<div class=\"visual-result\">result = " + escapeHTML(asText(step.result)) + "</div>";
  }

  function arrayValues(values, type) {
    if (typeof values === "string" && type === "string") return Array.from(values);
    if (Array.isArray(values)) return values;
    if (values && Array.isArray(values.values)) return values.values;
    return asArray(values);
  }

  function renderArrayVisual(demo, step, type) {
    const values = arrayValues(demo.values, type);
    const active = normalizeIndexSet(step.active);
    const done = normalizeIndexSet(step.done);
    const pointers = pointerMap(step.pointers);
    const visualClass = type === "string" ? "string-visual" : (type === "interval" ? "array-visual interval-visual" : "array-visual");
    const cellClass = type === "string" ? "string-cell" : "array-cell";
    const html = values.map(function (value, index) {
      const classes = [cellClass];
      if (inRange(index, step.range)) classes.push("is-range");
      if (active.has(index) || active.has(String(value))) classes.push("is-active");
      if (done.has(index) || done.has(String(value))) classes.push("is-done");
      const labels = pointers.get(index) || pointers.get(String(value)) || [];
      return "<div class=\"" + classes.join(" ") + "\">" + escapeHTML(asText(value)) + (labels.length ? "<span class=\"pointer-label\">" + escapeHTML(labels.join(" · ")) + "</span>" : "") + "<span class=\"cell-index\">" + index + "</span></div>";
    }).join("");
    return "<div class=\"" + visualClass + "\">" + html + "</div>" + visualResult(step);
  }

  function coordinateSet(value) {
    const set = new Set();
    if (Array.isArray(value) && value.length === 2 && !Array.isArray(value[0]) && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
      set.add(Number(value[0]) + "," + Number(value[1]));
      return set;
    }
    asArray(value).forEach(function (item) {
      if (Array.isArray(item) && item.length >= 2) set.add(Number(item[0]) + "," + Number(item[1]));
      else if (typeof item === "string" && /^\d+\s*,\s*\d+$/.test(item)) set.add(item.replace(/\s/g, ""));
    });
    return set;
  }

  function renderMatrixVisual(demo, step, type) {
    let matrix = Array.isArray(demo.values) ? demo.values : [];
    if (!matrix.length) matrix = [["∅"]];
    if (!Array.isArray(matrix[0])) return renderArrayVisual(demo, step, type);
    const rows = matrix.length;
    const columns = Math.max.apply(null, matrix.map(function (row) { return row.length; }));
    const active = coordinateSet(step.active);
    const done = coordinateSet(step.done);
    const probe = coordinateSet(step.probe);
    const html = [];
    matrix.forEach(function (row, rowIndex) {
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const key = rowIndex + "," + columnIndex;
        const classes = [type === "dp" ? "dp-cell" : "matrix-cell"];
        if (active.has(key)) classes.push("is-active");
        if (probe.has(key)) classes.push("is-probe");
        if (done.has(key)) classes.push("is-done");
        if (Array.isArray(step.range) && step.range.length === 4 && rowIndex >= step.range[0] && rowIndex <= step.range[2] && columnIndex >= step.range[1] && columnIndex <= step.range[3]) classes.push("is-range");
        const coordinate = type === "matrix" ? "<span class=\"matrix-index\">" + rowIndex + "," + columnIndex + "</span>" : "";
        html.push("<div class=\"" + classes.join(" ") + "\"><span class=\"matrix-value\">" + escapeHTML(asText(row[columnIndex], "")) + "</span>" + coordinate + "</div>");
      }
    });
    return "<div class=\"" + (type === "dp" ? "dp-visual" : "matrix-visual") + "\" style=\"grid-template-columns:repeat(" + columns + ",auto)\">" + html.join("") + "</div>" + visualResult(step);
  }

  function renderListVisual(demo, step) {
    const values = arrayValues(demo.values);
    const active = normalizeIndexSet(step.active);
    const done = normalizeIndexSet(step.done);
    const pointers = pointerMap(step.pointers);
    const html = values.map(function (value, index) {
      const classes = ["list-node"];
      if (inRange(index, step.range)) classes.push("is-range");
      if (active.has(index) || active.has(String(value))) classes.push("is-active");
      if (done.has(index) || done.has(String(value))) classes.push("is-done");
      const labels = pointers.get(index) || pointers.get(String(value)) || [];
      return (index ? "<span class=\"list-arrow\">→</span>" : "") + "<div class=\"" + classes.join(" ") + "\">" + escapeHTML(asText(value)) + (labels.length ? "<span class=\"pointer-label\">" + escapeHTML(labels.join(" · ")) + "</span>" : "") + "</div>";
    }).join("");
    return "<div class=\"list-visual\">" + html + "</div>" + visualResult(step);
  }

  function renderStackVisual(demo, step) {
    const values = arrayValues(demo.values);
    const active = normalizeIndexSet(step.active);
    const done = normalizeIndexSet(step.done);
    return "<div class=\"stack-visual\">" + values.map(function (value, index) {
      const classes = ["stack-item"];
      if (active.has(index) || active.has(String(value))) classes.push("is-active");
      if (done.has(index) || done.has(String(value))) classes.push("is-done");
      return "<div class=\"" + classes.join(" ") + "\">" + escapeHTML(asText(value)) + "</div>";
    }).join("") + "</div><div class=\"visual-caption\">栈顶 ↑</div>" + visualResult(step);
  }

  function isNullNode(value) {
    return value == null || ["null", "none", "#", "∅"].includes(String(value).toLowerCase());
  }

  function renderTreeVisual(demo, step, type) {
    const values = arrayValues(demo.values);
    const active = normalizeIndexSet(step.active);
    const done = normalizeIndexSet(step.done);
    const range = normalizeIndexSet(step.range);
    const width = 720;
    const slots = [];
    const parents = [];
    if (values.length) {
      slots[0] = 0;
      parents[0] = -1;
      const queue = isNullNode(values[0]) ? [] : [0];
      let cursor = 1;
      while (cursor < values.length && queue.length) {
        const parentIndex = queue.shift();
        for (let side = 0; side < 2 && cursor < values.length; side += 1) {
          slots[cursor] = slots[parentIndex] * 2 + side + 1;
          parents[cursor] = parentIndex;
          if (!isNullNode(values[cursor])) queue.push(cursor);
          cursor += 1;
        }
      }
      while (cursor < values.length) {
        slots[cursor] = cursor;
        parents[cursor] = Math.floor((cursor - 1) / 2);
        cursor += 1;
      }
    }
    const maxSlot = slots.length ? Math.max.apply(null, slots) : 0;
    const maxDepth = maxSlot ? Math.floor(Math.log2(maxSlot + 1)) : 0;
    const height = Math.max(180, 75 + maxDepth * 82);
    const positions = values.map(function (_value, index) {
      const slot = slots[index] == null ? index : slots[index];
      const depth = Math.floor(Math.log2(slot + 1));
      const offset = slot - (Math.pow(2, depth) - 1);
      return { x: (offset + 0.5) * width / Math.pow(2, depth), y: 42 + depth * 82 };
    });
    let edges = "";
    let nodes = "";
    values.forEach(function (value, index) {
      if (isNullNode(value)) return;
      if (index > 0) {
        const parent = parents[index];
        if (!isNullNode(values[parent])) edges += "<line class=\"tree-edge\" x1=\"" + positions[parent].x + "\" y1=\"" + positions[parent].y + "\" x2=\"" + positions[index].x + "\" y2=\"" + positions[index].y + "\"></line>";
      }
      const classes = ["tree-node"];
      if (range.has(index)) classes.push("is-range");
      if (active.has(index) || active.has(String(value))) classes.push("is-active");
      if (done.has(index) || done.has(String(value))) classes.push("is-done");
      const label = asText(value);
      const shortLabel = label.length > 8 ? label.slice(0, 7) + "…" : label;
      nodes += "<g class=\"" + classes.join(" ") + "\" transform=\"translate(" + positions[index].x + " " + positions[index].y + ")\"><title>" + escapeHTML(label) + "</title><circle r=\"21\"></circle><text y=\"1\">" + escapeHTML(shortLabel) + "</text></g>";
    });
    return "<svg class=\"" + (type === "heap" ? "heap-visual" : "tree-visual") + "\" viewBox=\"0 0 " + width + " " + height + "\" role=\"img\" aria-label=\"树结构演示\">" + edges + nodes + "</svg>" + visualResult(step);
  }

  function graphData(values, demo, step) {
    if (values && !Array.isArray(values) && Array.isArray(values.nodes)) {
      return { nodes: values.nodes, edges: values.edges || [] };
    }
    const rawNodes = arrayValues(values);
    const arrowEdges = rawNodes.map(function (value) {
      const match = String(value).match(/^\s*(.+?)\s*(?:→|->)\s*(.+?)\s*$/);
      return match ? [match[1], match[2]] : null;
    }).filter(Boolean);
    if (arrowEdges.length) {
      const parsedNodes = [];
      arrowEdges.forEach(function (edge) {
        edge.forEach(function (node) { if (!parsedNodes.includes(node)) parsedNodes.push(node); });
      });
      return { nodes: parsedNodes, edges: arrowEdges };
    }
    const nodes = rawNodes;
    let edges = asArray(step.edges || demo.edges).filter(Array.isArray);
    if (!edges.length) {
      edges = nodes.slice(1).map(function (_node, index) { return [index, index + 1]; });
    }
    return { nodes: nodes, edges: edges };
  }

  function renderGraphVisual(demo, step) {
    const data = graphData(demo.values, demo, step);
    const active = normalizeIndexSet(step.active);
    const done = normalizeIndexSet(step.done);
    const width = 680;
    const height = 330;
    const radius = Math.min(width, height) * .35;
    const positions = data.nodes.map(function (_node, index) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(1, data.nodes.length);
      return { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius };
    });
    const edges = data.edges.map(function (edge) {
      const fromIndex = Number.isFinite(Number(edge[0])) ? Number(edge[0]) : data.nodes.indexOf(edge[0]);
      const toIndex = Number.isFinite(Number(edge[1])) ? Number(edge[1]) : data.nodes.indexOf(edge[1]);
      if (!positions[fromIndex] || !positions[toIndex]) return "";
      return "<line class=\"graph-edge\" x1=\"" + positions[fromIndex].x + "\" y1=\"" + positions[fromIndex].y + "\" x2=\"" + positions[toIndex].x + "\" y2=\"" + positions[toIndex].y + "\" marker-end=\"url(#arrow)\"></line>";
    }).join("");
    const nodes = data.nodes.map(function (node, index) {
      const classes = ["graph-node"];
      if (active.has(index) || active.has(String(node))) classes.push("is-active");
      if (done.has(index) || done.has(String(node))) classes.push("is-done");
      const label = asText(node);
      const shortLabel = label.length > 8 ? label.slice(0, 7) + "…" : label;
      return "<g class=\"" + classes.join(" ") + "\" transform=\"translate(" + positions[index].x + " " + positions[index].y + ")\"><title>" + escapeHTML(label) + "</title><circle r=\"22\"></circle><text y=\"1\">" + escapeHTML(shortLabel) + "</text></g>";
    }).join("");
    return "<svg class=\"graph-visual\" viewBox=\"0 0 " + width + " " + height + "\" role=\"img\" aria-label=\"图结构演示\"><defs><marker id=\"arrow\" markerWidth=\"8\" markerHeight=\"8\" refX=\"22\" refY=\"3\" orient=\"auto\"><path d=\"M0,0 L0,6 L6,3 z\" fill=\"currentColor\"></path></marker></defs>" + edges + nodes + "</svg>" + visualResult(step);
  }

  function renderVisual(demo, step) {
    const type = String(demo.type || "array").toLowerCase();
    const visualDemo = Object.assign({}, demo);
    if (step.values !== undefined) visualDemo.values = step.values;
    if (!visualDemo.values && visualDemo.values !== 0) {
      return "<div class=\"visual-unavailable\"><strong>本题演示正在整理</strong>讲解、代码和学习记录仍可正常使用。</div>";
    }
    if (type === "matrix") return renderMatrixVisual(visualDemo, step, type);
    if (type === "dp" && Array.isArray(visualDemo.values) && Array.isArray(visualDemo.values[0])) return renderMatrixVisual(visualDemo, step, type);
    if (["linked-list", "linkedlist", "list"].includes(type)) return renderListVisual(visualDemo, step);
    if (type === "tree" || type === "heap") return renderTreeVisual(visualDemo, step, type);
    if (type === "graph") return renderGraphVisual(visualDemo, step);
    if (type === "stack") return renderStackVisual(visualDemo, step);
    return renderArrayVisual(visualDemo, step, type);
  }

  function demoInfo() {
    const problem = currentProblem();
    const demo = problem && problem.demo ? problem.demo : { type: "array", values: [], steps: [] };
    let steps = Array.isArray(demo.steps) ? demo.steps : [];
    if (!steps.length) steps = [{ title: "演示待补充", note: "本题的逐步状态演示正在整理，先从一句话本质和主解代码开始学习。" }];
    return { demo: demo, steps: steps };
  }

  function cloneVisualValues(values) {
    if (!Array.isArray(values)) return values;
    return values.map(function (value) {
      return Array.isArray(value) ? value.slice() : value;
    });
  }

  function gridChanges(value) {
    if (!Array.isArray(value) || !value.length) return [];
    if (value.length >= 3 && !Array.isArray(value[0])) return [value];
    return value.filter(function (change) {
      return Array.isArray(change) && change.length >= 3;
    });
  }

  function resolvedDemoStep(info, index) {
    const current = info.steps[index] || {};
    let values = cloneVisualValues(info.demo.values);
    const changedCoordinates = coordinateSet(info.demo.initialDone);

    for (let stepIndex = 0; stepIndex <= index; stepIndex += 1) {
      const item = info.steps[stepIndex] || {};
      if (item.values !== undefined) values = cloneVisualValues(item.values);
      gridChanges(item.changes).forEach(function (change) {
        const row = Number(change[0]);
        const column = Number(change[1]);
        if (
          Array.isArray(values)
          && Array.isArray(values[row])
          && column >= 0
          && column < values[row].length
        ) {
          values[row][column] = change[2];
          changedCoordinates.add(row + "," + column);
        }
      });
    }

    const done = coordinateSet(current.done);
    changedCoordinates.forEach(function (coordinate) { done.add(coordinate); });
    return Object.assign({}, current, {
      values: values,
      done: Array.from(done).map(function (coordinate) {
        return coordinate.split(",").map(Number);
      })
    });
  }

  function codeLineNumbers(value) {
    return asArray(value).map(Number).filter(function (line) {
      return Number.isInteger(line) && line > 0;
    });
  }

  function sourceCodeRows(sourceLines, value, className) {
    return codeLineNumbers(value).map(function (lineNumber) {
      const source = sourceLines[lineNumber - 1];
      if (source == null) return "";
      return "<div class=\"trace-code-line " + (className || "") + "\"><span>" +
        String(lineNumber).padStart(2, "0") + "</span><code>" +
        escapeHTML(source || " ") + "</code></div>";
    }).join("");
  }

  function renderExecutionTrace(step) {
    const container = $("#execution-trace");
    const problem = currentProblem();
    const sourceLines = problem ? getSolution(problem).split(/\r?\n/) : [];
    let codeRows = sourceCodeRows(sourceLines, step.codeLine, "");
    const skippedRows = sourceCodeRows(sourceLines, step.skippedLine, "is-skipped");

    if (!codeRows && step.code) {
      codeRows = "<div class=\"trace-code-line\"><code>" + escapeHTML(asText(step.code)) + "</code></div>";
    }

    const phase = asText(step.phase, "");
    const event = asText(step.event, "");
    const condition = asText(step.condition, "");
    const parts = [];
    if (phase || event) {
      parts.push("<div class=\"trace-meta\">" +
        (phase ? "<span>" + escapeHTML(phase) + "</span>" : "") +
        (event ? "<em>" + escapeHTML(event === "call" ? "进入调用" : (event === "return" ? "递归返回" : event)) + "</em>" : "") +
        "</div>");
    }
    if (codeRows || skippedRows) {
      parts.push("<div class=\"trace-code\">" +
        (codeRows ? "<small>本步实际执行</small>" + codeRows : "") +
        (skippedRows ? "<small class=\"trace-skipped-label\">条件不成立，本步跳过</small>" + skippedRows : "") +
        "</div>");
    }
    if (condition) parts.push("<div class=\"trace-condition\"><small>判断结果</small><strong>" + escapeHTML(condition) + "</strong></div>");

    container.hidden = parts.length === 0;
    container.innerHTML = parts.join("");
  }

  function runtimeItem(value) {
    if (Array.isArray(value)) return "(" + value.map(function (item) { return asText(item); }).join(", ") + ")";
    return asText(value);
  }

  function renderRuntimeLane(label, values, kind) {
    const items = Array.isArray(values) ? values : [];
    const content = items.length ? items.map(function (item, index) {
      const marker = kind === "queue" && index === 0 ? "<small>队首</small>" : (kind === "stack" && index === items.length - 1 ? "<small>栈顶</small>" : "");
      return "<span class=\"runtime-item " + (marker ? "is-current" : "") + "\">" + escapeHTML(runtimeItem(item)) + marker + "</span>";
    }).join("") : "<span class=\"runtime-empty\">∅</span>";
    return "<div class=\"runtime-lane\"><strong>" + escapeHTML(label) + "</strong><div>" + content + "</div></div>";
  }

  function renderRuntimeState(step) {
    const lanes = [];
    if (Object.prototype.hasOwnProperty.call(step, "queue")) lanes.push(renderRuntimeLane("FIFO 队列", step.queue, "queue"));
    if (Object.prototype.hasOwnProperty.call(step, "stack")) lanes.push(renderRuntimeLane("递归调用栈", step.stack, "stack"));
    if (Array.isArray(step.probe) && step.probe.length >= 2) {
      lanes.push(renderRuntimeLane("检查邻居", [[step.probe[0], step.probe[1]]], "probe"));
    }
    return lanes.length ? "<div class=\"runtime-state\">" + lanes.join("") + "</div>" : "";
  }

  function renderVariables(step) {
    const entries = [];
    const changed = new Set(asArray(step.changed).map(String));
    if (step.vars && typeof step.vars === "object" && !Array.isArray(step.vars)) {
      Object.keys(step.vars).forEach(function (key) { entries.push([key, step.vars[key]]); });
    } else if (Array.isArray(step.vars)) {
      step.vars.forEach(function (item, index) {
        if (item && typeof item === "object") entries.push([item.name || item.label || index + 1, item.value]);
        else entries.push([index + 1, item]);
      });
    }
    if (!entries.length && step.pointers && typeof step.pointers === "object" && !Array.isArray(step.pointers)) {
      Object.keys(step.pointers).forEach(function (key) { entries.push([key, step.pointers[key]]); });
    }
    if (step.result != null && step.result !== "") entries.push(["result", step.result]);
    $("#variable-list").innerHTML = entries.map(function (entry) {
      const isChanged = changed.has(String(entry[0])) || String(entry[1]).includes("→");
      return "<div class=\"" + (isChanged ? "is-changed" : "") + "\"><dt>" + escapeHTML(entry[0]) + "</dt><dd>" + escapeHTML(asText(entry[1])) + "</dd></div>";
    }).join("");
  }

  function renderDemo() {
    const info = demoInfo();
    demoStep = Math.max(0, Math.min(demoStep, info.steps.length - 1));
    const step = resolvedDemoStep(info, demoStep);
    $("#visual-stage").innerHTML = renderVisual(info.demo, step) + renderRuntimeState(step);
    $("#step-index").textContent = String(demoStep + 1).padStart(2, "0");
    $("#step-total").textContent = String(info.steps.length).padStart(2, "0");
    $("#step-title").textContent = asText(step.title, "步骤 " + (demoStep + 1));
    $("#step-note").textContent = asText(step.note, "观察当前状态的变化。");
    const announcedVariables = step.vars && typeof step.vars === "object" && !Array.isArray(step.vars)
      ? Object.keys(step.vars).map(function (key) {
        return key + " 等于 " + asText(step.vars[key], "");
      }).join("；")
      : "";
    const announcedRuntime = [
      Object.prototype.hasOwnProperty.call(step, "queue")
        ? "队列：" + asArray(step.queue).map(runtimeItem).join("，")
        : "",
      Object.prototype.hasOwnProperty.call(step, "stack")
        ? "调用栈：" + asArray(step.stack).map(runtimeItem).join("，")
        : ""
    ].filter(Boolean).join("。");
    const announcement = $("#demo-announcement");
    announcement.setAttribute("aria-live", demoPlaying ? "off" : "polite");
    announcement.textContent = "第 " + (demoStep + 1) + " 步，共 " + info.steps.length + " 步。" +
      asText(step.title, "") + "。" + asText(step.note, "") +
      (step.condition ? "判断结果：" + asText(step.condition, "") + "。" : "") +
      (announcedVariables ? "变量：" + announcedVariables + "。" : "") +
      (announcedRuntime ? announcedRuntime + "。" : "");
    const secondaryMarker = $("#legend-secondary-marker");
    const secondaryLabel = $("#legend-secondary-label");
    secondaryMarker.className = info.demo.secondaryLegend === "邻居检查" ? "legend-probe" : "legend-range";
    secondaryLabel.textContent = asText(info.demo.secondaryLegend, "有效范围");
    $("#legend-done-label").textContent = asText(info.demo.doneLegend, "已确定");
    renderExecutionTrace(step);
    renderVariables(step);
    $("#demo-prev").disabled = demoStep === 0;
    $("#demo-next").disabled = demoStep >= info.steps.length - 1;
    $("#demo-play").innerHTML = "<span aria-hidden=\"true\">" + (demoPlaying ? "Ⅱ" : "▶") + "</span>";
    $("#demo-play").setAttribute("aria-label", demoPlaying ? "暂停" : "播放");
    $("#step-track").innerHTML = info.steps.map(function (item, index) {
      const classes = index === demoStep ? "is-current" : (index < demoStep ? "is-past" : "");
      const label = "步骤 " + (index + 1) + "：" + asText(item.title, "");
      return "<button type=\"button\" class=\"" + classes + "\" data-step=\"" + index + "\" aria-label=\"" +
        escapeHTML(label) + "\" title=\"" + escapeHTML(label) + "\"" +
        (index === demoStep ? " aria-current=\"step\"" : "") + ">" + (index + 1) + "</button>";
    }).join("");
    const track = $("#step-track");
    const currentStepButton = track.querySelector("[aria-current='step']");
    if (currentStepButton) {
      const trackRect = track.getBoundingClientRect();
      const buttonRect = currentStepButton.getBoundingClientRect();
      if (buttonRect.left < trackRect.left || buttonRect.right > trackRect.right) {
        track.scrollLeft = Math.max(
          0,
          track.scrollLeft
            + buttonRect.left
            - trackRect.left
            - Math.floor((track.clientWidth - buttonRect.width) / 2)
        );
      }
    }
  }

  function stopDemo() {
    demoPlaying = false;
    window.clearInterval(demoTimer);
    demoTimer = null;
    const button = $("#demo-play");
    if (button) {
      button.innerHTML = "<span aria-hidden=\"true\">▶</span>";
      button.setAttribute("aria-label", "播放");
    }
  }

  function startDemo() {
    const info = demoInfo();
    if (info.steps.length <= 1) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stopDemo();
      demoStep = demoStep >= info.steps.length - 1 ? 0 : demoStep + 1;
      renderDemo();
      showToast("已按减少动态效果设置前进一步");
      return;
    }
    if (demoStep >= info.steps.length - 1) demoStep = 0;
    demoPlaying = true;
    renderDemo();
    window.clearInterval(demoTimer);
    demoTimer = window.setInterval(function () {
      const current = demoInfo();
      if (demoStep >= current.steps.length - 1) {
        stopDemo();
        renderDemo();
        return;
      }
      demoStep += 1;
      if (demoStep >= current.steps.length - 1) stopDemo();
      renderDemo();
    }, Number($("#demo-speed").value) || 1400);
  }

  function copyCode() {
    const problem = currentProblem();
    if (!problem) return;
    const code = getSolution(problem);
    function done() { showToast("Python3 代码已复制"); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(done).catch(function () { fallbackCopy(code, done); });
    } else {
      fallbackCopy(code, done);
    }
  }

  function fallbackCopy(text, callback) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      callback();
    } catch (_error) {
      showToast("复制失败，请在代码区手动复制");
    }
    textarea.remove();
  }

  function exportData() {
    const payload = {
      app: "Hot 100 模板化学习手册",
      version: 1,
      exportedAt: new Date().toISOString(),
      learning: store.learning
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hot100-study-" + localDate(0) + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    showToast("学习数据已导出");
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || !parsed.learning || typeof parsed.learning !== "object") throw new Error("invalid");
        const imported = {};
        const known = new Set(problems.map(function (problem) { return problem.key; }));
        Object.keys(parsed.learning).forEach(function (key) {
          if (!known.size || known.has(String(key))) imported[String(key)] = sanitizeStudy(parsed.learning[key]);
        });
        if (!window.confirm("导入会替换当前浏览器中的学习记录，继续吗？")) return;
        store.learning = imported;
        saveStore(false);
        renderStats();
        renderCategories();
        renderProblems();
        if (currentProblem()) renderStudyPanel();
        showToast("学习数据导入成功，共 " + Object.keys(imported).length + " 道记录");
      } catch (_error) {
        showToast("无法导入：请选择由本站导出的 JSON 文件");
      } finally {
        $("#import-file").value = "";
      }
    };
    reader.onerror = function () { showToast("文件读取失败"); };
    reader.readAsText(file, "utf-8");
  }

  function applyTheme(theme) {
    const selected = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = selected;
    $("#theme-button").setAttribute("aria-label", selected === "dark" ? "切换到浅色主题" : "切换到深色主题");
    try { localStorage.setItem(THEME_KEY, selected); } catch (_error) { /* 静默降级 */ }
  }

  function initializeTheme() {
    let theme = "";
    try { theme = localStorage.getItem(THEME_KEY) || ""; } catch (_error) { theme = ""; }
    if (!theme) theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(theme);
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      const categoryButton = event.target.closest("[data-category]");
      if (categoryButton && (categoryButton.closest(".sidebar") || categoryButton.closest("#category-nav"))) {
        setCategory(categoryButton.dataset.category);
        return;
      }
      const problemButton = event.target.closest("[data-open-problem]");
      if (problemButton) openProblem(problemButton.dataset.openProblem);
    });

    elements.search.addEventListener("input", function () {
      filters.search = elements.search.value.trim();
      renderProblems();
    });
    elements.categoryFilter.addEventListener("change", function () { setCategory(elements.categoryFilter.value); });
    elements.difficultyFilter.addEventListener("change", function () {
      filters.difficulty = elements.difficultyFilter.value;
      renderProblems();
    });
    elements.statusFilter.addEventListener("change", function () {
      filters.status = elements.statusFilter.value;
      filters.dueOnly = false;
      renderProblems();
    });
    elements.favoriteFilter.addEventListener("click", function () {
      filters.favorite = !filters.favorite;
      elements.favoriteFilter.setAttribute("aria-pressed", String(filters.favorite));
      elements.favoriteFilter.innerHTML = "<span aria-hidden=\"true\">" + (filters.favorite ? "★" : "☆") + "</span> 仅看收藏";
      renderProblems();
    });
    elements.resetFilter.addEventListener("click", resetFilters);
    $("#empty-reset").addEventListener("click", resetFilters);

    $("#show-due-button").addEventListener("click", function () {
      resetFilters();
      filters.status = "review";
      filters.dueOnly = true;
      elements.statusFilter.value = "review";
      renderProblems();
      $("#problem-list").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#dialog-close").addEventListener("click", closeDialog);
    elements.dialog.addEventListener("click", function (event) {
      if (event.target === elements.dialog) closeDialog();
    });
    elements.dialog.addEventListener("close", function () {
      flushNotes();
      stopDemo();
    });

    $$(".dialog-tabs [role='tab']").forEach(function (tab, index, tabs) {
      tab.addEventListener("click", function () { selectTab(tab.dataset.tab, false); });
      tab.addEventListener("keydown", function (event) {
        let target = index;
        if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") target = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = tabs.length - 1;
        else return;
        event.preventDefault();
        selectTab(tabs[target].dataset.tab, true);
      });
    });

    $("#dialog-favorite").addEventListener("click", function () {
      const problem = currentProblem();
      if (!problem) return;
      const next = !getStudy(problem.key).favorite;
      updateStudy(problem.key, { favorite: next });
      updateFavoriteButton();
      showToast(next ? "已加入收藏" : "已取消收藏");
    });

    $("#copy-code").addEventListener("click", copyCode);
    $("#demo-reset").addEventListener("click", function () { stopDemo(); demoStep = 0; renderDemo(); });
    $("#demo-prev").addEventListener("click", function () { stopDemo(); demoStep = Math.max(0, demoStep - 1); renderDemo(); });
    $("#demo-next").addEventListener("click", function () { stopDemo(); demoStep = Math.min(demoInfo().steps.length - 1, demoStep + 1); renderDemo(); });
    $("#demo-play").addEventListener("click", function () { if (demoPlaying) { stopDemo(); renderDemo(); } else startDemo(); });
    $("#demo-speed").addEventListener("change", function () { if (demoPlaying) startDemo(); });
    $("#step-track").addEventListener("click", function (event) {
      const step = event.target.closest("[data-step]");
      if (!step) return;
      stopDemo();
      demoStep = Number(step.dataset.step) || 0;
      renderDemo();
      const currentStep = $("#step-track").querySelector("[data-step='" + demoStep + "']");
      if (currentStep) currentStep.focus();
    });

    $("#status-control").addEventListener("change", function (event) {
      const problem = currentProblem();
      if (!problem || !event.target.matches("input[name='study-status']")) return;
      updateStudy(problem.key, { status: event.target.value });
      showToast("状态已更新为“" + STATUS_LABEL[event.target.value] + "”");
    });

    $("#mastery-control").addEventListener("click", function (event) {
      const button = event.target.closest("[data-mastery]");
      const problem = currentProblem();
      if (!button || !problem) return;
      updateStudy(problem.key, { mastery: Number(button.dataset.mastery) });
      renderStudyPanel();
    });

    $("#review-toggle").addEventListener("change", function () {
      const problem = currentProblem();
      if (!problem) return;
      const checked = $("#review-toggle").checked;
      const existing = getStudy(problem.key).nextReview;
      const nextReview = checked ? (existing || localDate(3)) : existing;
      updateStudy(problem.key, { review: checked, nextReview: nextReview });
      renderStudyPanel();
      showToast(checked ? "已加入复习队列，默认 3 天后复习" : "已移出复习队列");
    });

    $("#review-date").addEventListener("change", function () {
      const problem = currentProblem();
      if (!problem) return;
      updateStudy(problem.key, { nextReview: $("#review-date").value });
    });

    $("#study-notes").addEventListener("input", function () {
      const problem = currentProblem();
      if (!problem) return;
      const value = $("#study-notes").value.slice(0, 2000);
      $("#notes-count").textContent = value.length + " / 2000";
      window.clearTimeout(notesTimer);
      notesTimer = window.setTimeout(function () {
        updateStudy(problem.key, { notes: value }, false);
      }, 350);
    });

    $("#export-button").addEventListener("click", exportData);
    $("#import-button").addEventListener("click", function () { $("#import-file").click(); });
    $("#import-file").addEventListener("change", function () { importData($("#import-file").files[0]); });
    $("#theme-button").addEventListener("click", function () {
      applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });

    document.addEventListener("keydown", function (event) {
      const tag = event.target.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target.isContentEditable;
      if ((event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) && !isTyping && !elements.dialog.open) {
        event.preventDefault();
        elements.search.focus();
      }
      const demoSelected = $("#tab-demo").getAttribute("aria-selected") === "true";
      if (elements.dialog.open && demoSelected && !isTyping) {
        if (event.key === "ArrowLeft") { event.preventDefault(); $("#demo-prev").click(); }
        if (event.key === "ArrowRight") { event.preventDefault(); $("#demo-next").click(); }
        if (event.key === " ") { event.preventDefault(); $("#demo-play").click(); }
      }
    });
  }

  function init() {
    initializeTheme();
    renderCategoryFilter();
    renderStats();
    renderCategories();
    renderProblems();
    bindEvents();
    if (!problems.length) {
      elements.empty.hidden = false;
      elements.grid.hidden = true;
      elements.empty.querySelector("h3").textContent = "题目数据尚未载入";
      elements.empty.querySelector("p").textContent = "请确认 data.js 与 index.html 位于同一目录，并按 data.js → solutions.js → app.js 的顺序加载。";
      $("#empty-reset").hidden = true;
      showToast("未检测到 HOT100_PROBLEMS 数据");
    }
  }

  init();
}());
