# Agent Loop 核心项目

目标：把“能跑的 Agent Loop 基线项目”改造成能写进简历、能经得住面试追问的工程项目。

## 简历定位

不要写成“我跑通了一个开源 Agent”。要写成：

> 面向金融复杂问答场景，设计并实现可观测、可评测、可恢复的 Agent Loop 执行框架，围绕任务规划、工具调用、参数校验、异常恢复、执行轨迹和离线评测进行工程化改进。

## 阶段规划

### 第 1 阶段：基线跑通

- 跑通最小 ReAct / Tool Calling Loop
- 支持工具注册、工具调用、Observation 回填
- 保存完整 trace：输入、思考、动作、参数、工具结果、最终答案

### 第 2 阶段：问题定位

基线要记录这些问题：

- 无限循环
- 工具选择错误
- 参数抽取错误
- 查询结果为空
- 工具异常没有恢复
- 多步任务状态丢失
- 输出不可控
- 无法评测好坏

### 第 3 阶段：工程改进

- Pydantic/JSON Schema 参数校验
- 工具 precondition 检查
- step budget 和 early stop
- retry / fallback / degradation
- DAG 化执行计划
- JSONL trace 日志
- 离线评测集和指标
- 简单可视化看板

### 第 4 阶段：形成材料

- README 架构图
- 技术博客
- benchmark 报告
- 简历 bullet
- 面试追问问答

## 指标建议

| 指标 | 说明 |
|---|---|
| task_success_rate | 任务最终成功率 |
| tool_call_accuracy | 工具选择是否正确 |
| param_valid_rate | 参数格式是否正确 |
| avg_steps | 平均执行步数 |
| avg_latency | 平均响应时间 |
| retry_count | 平均重试次数 |
| fallback_rate | 兜底比例 |
| cost_per_task | 单任务成本 |
