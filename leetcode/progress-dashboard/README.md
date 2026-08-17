# LeetCode 100 刷题作战台

一个以真实作答记录为准的只读训练仪表盘。页面展示 100 道目标题的红黄绿/未开始状态、当天唯一执行单、当前红题、专题与难度覆盖、学习趋势，以及每道题的完整历史。

## 数据口径

- Cloudflare D1 是线上唯一数据真相。
- `problems` 保存 100 道核心题目录，`attempts` 保存每次作答和修正历史。
- 每题最新一条未作废记录决定当前颜色，不自动升级。
- 错误记录通过 `is_void`、`supersedes_attempt_id` 和 `correction_reason` 作废或替代，不物理删除。
- 早上 8:30 的 ChatGPT 定时任务是每日排程的唯一计算者，把新题和 D+1/D+3/D+7/红题复测写入 GitHub 上的 `../daily-plan.json`。
- GitHub 只保存和同步执行单，不负责计算；网页每两分钟读取一次同一文件，不再自行计算另一套队列。
- 执行单只决定“今天做什么”，是否完成仍由真实作答记录判断。
- 执行单日期不是今天或 GitHub 同步失败时，页面明确显示提示，不使用旧计划冒充今日计划。
- 数据库不可用时，页面自动降级到 `app/data/progress-snapshot.ts` 的带时间戳快照。

## 本地运行

```bash
npm install
npm run local
```

常用命令：

- `npm run data:sync`：从 `../progress.csv` 和计划文件重新生成种子迁移与静态快照。
- `npm run db:generate`：在修改 D1 schema 后生成 Drizzle migration。
- `npm run build`：生成 Cloudflare Worker 兼容构建。
- `npm test`：构建并运行服务端渲染与数据结构检查。

## 每日自动同步

现有早上 8:30 定时任务应使用 [`../daily-plan-automation-prompt.md`](../daily-plan-automation-prompt.md) 中的完整提示词。任务每天读取 GitHub main 的最新计划与 `progress.csv`，更新 `daily-plan.json`，回读校验后再发送聊天提醒。

网页服务保持运行时会每两分钟检查 GitHub 最新执行单；切回网页标签页时也会立即刷新。无需晚上任务，也无需 GitHub Action。

## 写入接口

网站公开只读。`POST /api/admin/attempts` 使用 `Authorization: Bearer <ADMIN_TOKEN>` 保护，密钥只保存在本地忽略文件和 Sites 生产环境变量中，不提交到 Git。

公开下载接口：

- `/api/export.csv`
- `/api/export.json`
