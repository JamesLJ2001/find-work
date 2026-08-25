# LeetCode 100 刷题作战台

一个以真实作答记录为准的只读训练仪表盘。页面展示 100 道目标题的红黄绿/未开始状态、当天唯一执行单、当前红题、专题与难度覆盖、学习趋势，以及每道题的完整历史。

## 数据口径

- Cloudflare D1 是线上唯一数据真相。
- `problems` 保存 100 道核心题目录，`attempts` 保存每次作答和修正历史。
- 每题最新一条未作废记录决定当前颜色，不自动升级。
- 错误记录通过 `is_void`、`supersedes_attempt_id` 和 `correction_reason` 作废或替代，不物理删除。
- 早晚定时任务均已删除。用户在当天学习结束或接近结束时通知当前 Codex 对话，由该对话计算下一学习日的新题和 D+1/D+3/D+7/专项与红题复测，并写入 GitHub 上的 `../daily-plan.json`。
- GitHub 只保存和同步执行单，不负责计算；网页不再自行计算另一套队列。
- 对话新增作答记录后，`data:sync` 会更新本地进度版本；本地开发页直接读取仓库执行单并通过热更新立即显示，不等待 GitHub 网络请求，也不做全天定时轮询。
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

## 每日手动收口

用户说“今天结束”“差不多了”或“安排明天”后，当前 Codex 对话按 [`../daily-plan-automation-prompt.md`](../daily-plan-automation-prompt.md) 中保留的计算规则读取 GitHub main 最新计划与 `progress.csv`，更新下一学习日的 `daily-plan.json`，回读校验后再返回唯一清单。

网页不做全天轮询，也不等待固定时刻。对话修改本地数据后通过开发热更新即时显示；切回网页标签页时会刷新一次，预先生成的明日执行单会在跨过零点后自动转为 LIVE。无需任何定时任务或 GitHub Action。

## 写入接口

网站公开只读。`POST /api/admin/attempts` 使用 `Authorization: Bearer <ADMIN_TOKEN>` 保护，密钥只保存在本地忽略文件和 Sites 生产环境变量中，不提交到 Git。

公开下载接口：

- `/api/export.csv`
- `/api/export.json`
