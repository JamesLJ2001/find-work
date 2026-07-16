import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.createContext(context);

for (const file of ["data.js", "solutions.js"]) {
  const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  vm.runInContext(source, context, { filename: file });
}

const categories = context.window.HOT100_CATEGORIES;
const problems = context.window.HOT100_PROBLEMS;
const solutions = context.window.HOT100_SOLUTIONS;

const expectedCounts = {
  "哈希": 3,
  "双指针": 4,
  "滑动窗口": 2,
  "子串": 3,
  "普通数组": 5,
  "矩阵": 4,
  "链表": 14,
  "二叉树": 15,
  "图论": 4,
  "回溯": 8,
  "二分查找": 6,
  "栈": 5,
  "堆": 3,
  "贪心算法": 4,
  "动态规划": 10,
  "多维动态规划": 5,
  "技巧": 5,
};

const errors = [];
const ids = new Set();
const counts = Object.fromEntries(Object.keys(expectedCounts).map((name) => [name, 0]));

if (!Array.isArray(categories) || categories.length !== 17) {
  errors.push(`分类应为 17 个，实际为 ${categories?.length ?? "缺失"}`);
}
if (!Array.isArray(problems) || problems.length !== 100) {
  errors.push(`题目应为 100 道，实际为 ${problems?.length ?? "缺失"}`);
}

for (const problem of problems ?? []) {
  if (ids.has(problem.id)) errors.push(`重复题号：${problem.id}`);
  ids.add(problem.id);
  if (!(problem.category in counts)) errors.push(`未知分类：${problem.id} ${problem.category}`);
  else counts[problem.category] += 1;
  for (const field of ["title", "slug", "difficulty", "method", "template", "essence", "why", "signal", "time", "space", "pitfall"]) {
    if (!problem[field]) errors.push(`${problem.id} 缺字段 ${field}`);
  }
  if (!problem.demo || !Array.isArray(problem.demo.steps) || problem.demo.steps.length < 3) {
    errors.push(`${problem.id} 动画步骤不足 3 步`);
  }
  if (!solutions?.[problem.id]?.trim()) errors.push(`${problem.id} 缺少 Python3 解法`);
}

for (const [name, expected] of Object.entries(expectedCounts)) {
  if (counts[name] !== expected) errors.push(`${name} 应为 ${expected} 题，实际为 ${counts[name]}`);
}

const extraSolutions = Object.keys(solutions ?? {}).filter((id) => !ids.has(Number(id)));
if (extraSolutions.length) errors.push(`存在多余解法：${extraSolutions.join(", ")}`);

const detailedDemoRules = {
  200: {
    minimumSteps: 60,
    minimumConditions: 30,
    runtimeField: "stack",
    expectedResult: "2",
    expectedChanges: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 3, 0], [2, 3, 0], [2, 2, 0]],
    requiredLines: [5, 7, 8, 11, 12, 13, 14, 15, 17, 18, 19, 20, 22, 24, 25, 26, 27, 28, 29, 31, 32, 33, 35, 37, 39],
    forbiddenActualLines: [27],
  },
  994: {
    minimumSteps: 120,
    minimumConditions: 80,
    runtimeField: "queue",
    expectedResult: "4 分钟",
    expectedChanges: [[1, 0, 2], [0, 1, 2], [1, 1, 2], [0, 2, 2], [2, 1, 2], [2, 2, 2]],
    requiredLines: [6, 8, 9, 10, 12, 15, 16, 17, 18, 20, 22, 23, 24, 25, 26, 28, 29, 32, 33, 34, 35, 37, 38, 41, 42, 44],
    forbiddenActualLines: [42],
  },
};

for (const [problemId, rule] of Object.entries(detailedDemoRules)) {
  const problem = problems.find((item) => item.id === Number(problemId));
  const steps = problem?.demo?.steps ?? [];
  const sourceLineCount = (solutions?.[problemId] ?? "").split(/\r?\n/).length;
  const allChanges = [];
  const coveredLines = new Set();
  let conditionCount = 0;

  if (steps.length < rule.minimumSteps) {
    errors.push(`${problemId} 详细动画至少需要 ${rule.minimumSteps} 步，实际为 ${steps.length}`);
  }

  steps.forEach((step, index) => {
    const label = `${problemId} 动画第 ${index + 1} 步`;
    if (!step.phase) errors.push(`${label} 缺少 phase`);
    if (!step.vars || typeof step.vars !== "object") errors.push(`${label} 缺少 vars`);
    if (!Object.prototype.hasOwnProperty.call(step, rule.runtimeField)) {
      errors.push(`${label} 缺少 ${rule.runtimeField}`);
    }

    const lineNumbers = Array.isArray(step.codeLine) ? step.codeLine : [step.codeLine];
    const validLines = lineNumbers.filter((line) => Number.isInteger(Number(line)));
    if (!validLines.length) {
      errors.push(`${label} 缺少 codeLine`);
    } else if (validLines.some((line) => Number(line) < 1 || Number(line) > sourceLineCount)) {
      errors.push(`${label} 的 codeLine 超出 Python3 解法范围`);
    }
    validLines.forEach((line) => coveredLines.add(Number(line)));
    if (validLines.some((line) => rule.forbiddenActualLines.includes(Number(line)))) {
      errors.push(`${label} 把本例未执行的第 ${validLines.find((line) => rule.forbiddenActualLines.includes(Number(line)))} 行标成了实际执行`);
    }

    const skippedLineNumbers = Array.isArray(step.skippedLine) ? step.skippedLine : [step.skippedLine];
    const validSkippedLines = skippedLineNumbers.filter((line) => Number.isInteger(Number(line)));
    if (validSkippedLines.some((line) => Number(line) < 1 || Number(line) > sourceLineCount)) {
      errors.push(`${label} 的 skippedLine 超出 Python3 解法范围`);
    }
    validSkippedLines.forEach((line) => coveredLines.add(Number(line)));
    if (validSkippedLines.some((line) => validLines.map(Number).includes(Number(line)))) {
      errors.push(`${label} 的同一源码行不能既实际执行又标记为跳过`);
    }

    const changes = Array.isArray(step.changes)
      ? (Array.isArray(step.changes[0]) ? step.changes : [step.changes])
      : [];
    allChanges.push(...changes);
    if (step.condition) conditionCount += 1;
  });

  if (JSON.stringify(allChanges) !== JSON.stringify(rule.expectedChanges)) {
    errors.push(`${problemId} 动画网格变化顺序不正确：${JSON.stringify(allChanges)}`);
  }
  if (conditionCount < rule.minimumConditions) {
    errors.push(`${problemId} 动画判断分支不足 ${rule.minimumConditions} 步，实际为 ${conditionCount}`);
  }
  const missingLines = rule.requiredLines.filter((line) => !coveredLines.has(line));
  if (missingLines.length) {
    errors.push(`${problemId} 动画没有覆盖源码行：${missingLines.join(", ")}`);
  }
  if (String(steps.at(-1)?.result) !== rule.expectedResult) {
    errors.push(`${problemId} 动画最终结果应为 ${rule.expectedResult}，实际为 ${steps.at(-1)?.result ?? "缺失"}`);
  }
  if (Number(problemId) === 994 && JSON.stringify(problem?.demo?.initialDone) !== JSON.stringify([[0, 0]])) {
    errors.push("994 动画必须把初始腐烂源 (0,0) 标记为已腐烂");
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("验证通过：100 道题、17 个分类、100 份 Python3 解法，字段与动画轨迹完整。");
}
