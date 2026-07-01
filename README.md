# find-work：郎朗 2027 届秋招作战仓库

这个仓库用于统一维护：简历版本、项目材料、LeetCode 进度、目标岗位画像、公司时间线、JD 分析、面试复盘和 Agent Loop 核心项目。

## 推荐日常命令

```bash
# 生成招聘提醒日历和看板数据
python scripts/make_calendar.py

# 查看未来 14 天提醒
python scripts/daily_digest.py

# 本地启动静态看板
cd dashboard && python -m http.server 8000
```

然后浏览器打开：`http://localhost:8000`

## 目录说明

- `docs/`：候选人资料卡、每日/每周模板、Prompt 模板
- `resume/`：简历版本，不放身份证、公司内部材料、敏感信息
- `projects/agent-loop/`：Agent Loop 核心竞争力项目材料
- `leetcode/`：刷题进度、错题卡
- `recruitment/`：目标岗位总表、原始岗位资料、投递追踪
- `jd_inbox/`：临时保存 JD 原文，后续让 ChatGPT/Codex 做分析
- `scripts/`：日历生成、每日摘要等自动化脚本
- `dashboard/`：本地静态招聘看板

## 安全约定

1. 不提交公司内部代码、数据库截图、接口地址、token、密钥。
2. 不提交真实用户日志；Bad Case 必须脱敏。
3. 个人手机号、邮箱可在简历 PDF 中保留，但不要在公开网页看板里展示。
4. 如果仓库是公开仓库，`resume/` 建议只放脱敏版。
