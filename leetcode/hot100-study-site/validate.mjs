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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("验证通过：100 道题、17 个分类、100 份 Python3 解法，字段与动画轨迹完整。");
}
