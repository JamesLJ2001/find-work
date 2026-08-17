# LeetCode 100 刷题作战台

一个以真实作答记录为准的只读训练仪表盘。页面展示 100 道目标题的红黄绿/未开始状态、有效学习日 D+1/D+3/D+7 复习队列、当前红题、专题与难度覆盖、学习趋势，以及每道题的完整历史。

## 数据口径

- Cloudflare D1 是线上唯一数据真相。
- `problems` 保存 100 道核心题目录，`attempts` 保存每次作答和修正历史。
- 每题最新一条未作废记录决定当前颜色，不自动升级。
- 错误记录通过 `is_void`、`supersedes_attempt_id` 和 `correction_reason` 作废或替代，不物理删除。
- D+1/D+3/D+7 按有效学习日序列回溯，空白日不占序号。
- 数据库不可用时，页面自动降级到 `app/data/progress-snapshot.ts` 的带时间戳快照。

## 本地运行

```bash
npm install
npm run dev
```

常用命令：

- `npm run data:sync`：从 `../progress.csv` 和计划文件重新生成种子迁移与静态快照。
- `npm run db:generate`：在修改 D1 schema 后生成 Drizzle migration。
- `npm run build`：生成 Cloudflare Worker 兼容构建。
- `npm test`：构建并运行服务端渲染与数据结构检查。

## 写入接口

网站公开只读。`POST /api/admin/attempts` 使用 `Authorization: Bearer <ADMIN_TOKEN>` 保护，密钥只保存在本地忽略文件和 Sites 生产环境变量中，不提交到 Git。

公开下载接口：

- `/api/export.csv`
- `/api/export.json`
