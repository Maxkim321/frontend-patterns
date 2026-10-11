# Agent 工作流编辑器（Code 模式 → LangGraph 配置）

## 在线 Demo

**🎯 交互 Demo（React 原版，拖拽节点 / 连线 / 配置面板 / MiniMap / Code 模式）→ [点这里打开](./react-demo/index.html)**
（DocFlow 真实组件逐字移植，仅环境依赖经 shim 替换）

<ClientOnly>
<WorkflowDemo />
</ClientOnly>

> 源自 DocFlow 工作流编辑器的 minimal-change 提炼：`packages/workflow-editor/src/` 下的四个文件
> （workflow.types / workflow-models / default-workflow / langgraph-preview）**原样来自**
> `DocFlow/packages/agent-contracts/src/workflow/`，零框架依赖、零改动——
> 画布在 DocFlow 里是 React（@xyflow/react），demo 里用 Vue 画了一层轻量展示壳，
> **转换逻辑跑的是同一份真实代码**。

## 决策层（为什么 Code 模式导出的是 LangGraph 配置）

工作流编辑器的产物不是"一张好看的图"，而是**可执行的多 Agent 编排配置**。
导出目标选 LangGraph 配置格式（`langgraph-preview/v1`）而非自造 JSON：
LangGraph 是社区标准的多 Agent 运行时，导出即对接，编辑器只负责"可视化编辑"这一层。
`convertReactFlowToLangGraphConfig` 是**纯函数**：`WorkflowCanvas` 进、配置对象出，
不依赖 React/vue——这就是它能被原样搬进任何项目的原因。

## 结论

四件套（`packages/workflow-editor/src/`，与 DocFlow 逐字一致）：

| 文件 | 职责 |
|---|---|
| `workflow.types.ts` | 画布模型：WorkflowCanvas（nodes/edges/viewport）、AgentNodeData（code/role/prompt/stage/model_config）、7 个 AgentStage |
| `default-workflow.ts` | 默认 Supervisor 工作流画布 + Agent 库（DEFAULT_WORKFLOW_AGENT_LIBRARY）+ 默认/空白模型配置 |
| `workflow-models.ts` | 模型目录（视觉/多模态模型清单 + 判别函数） |
| `langgraph-preview.ts` | **图 → LangGraph 配置转换器**（本 pattern 的核心） |

## 原理讲解

### 转换器逐段（35 行纯函数干了什么）

```
1. 建立 incoming/outgoing 两张邻接索引（target → edges / source → edges）
2. nodes → LangGraphNodeConfig：
   - id/role/prompt/stage/output_format 直传
   - input_handles / output_handles 从邻接索引提取（去重）
   - model_config 走 resolveNodeModelConfig（见下）
3. edges → LangGraphEdgeConfig：condition 取自边上的 label（分支条件）
4. entry_node_ids  = 没有任何入边的节点（自动识别起点）
   terminal_node_ids = 没有任何出边的节点（自动识别终点）
```

### model_config 回落（与"缺省回落主模型"同款思想）

每个节点带 `use_workflow_default` 开关：
- `true` → `resolveNodeModelConfig` 直接返回**工作流默认模型配置**；
- `false` → 展开节点专属配置（provider/model/temperature/thinking_budget…）。
demo 里点按钮切换开关再看右侧 JSON，`model_config` 字段**实时在两种形态间解析**——
这就是"节点级覆盖 + 工作流级缺省"的落地。

### entry / terminal 自动识别

不看节点类型，只看**图结构**：入边为空 = entry，出边为空 = terminal。
图怎么改（拖动/连线/删边），起终点永远自动正确——派生而非存储，
和"raw 只追加、视图派生"是同一个家族的设计取向。

### 为什么校验在写入侧

demo 的"模拟脏数据"演示：phase 写错、悬空 id 都会被 `jsonToGraph` 拦下并返回
错误清单（结构错误 → 引用错误 → 自连，三级校验）。
Code 模式的 JSON 是用户可编辑的，**脏配置直接渲染会炸画布**——校验必须发生在
"JSON → 图"的反向通道上，正向（图 → JSON）永远安全。

## 坑

- **导出自造 JSON 格式** → 和社区运行时对接全是胶水代码；导出标准格式（LangGraph）即插即用
- **entry/terminal 存储而非派生** → 连线一改就过期；从图的邻接关系**现算**永远正确
- **model_config 每节点全量存** → 改默认模型要遍历所有节点；`use_workflow_default` 开关 + 回落解析，改一处全局生效
- **转换器混入框架类型**（ReactFlow 的 Node/Edge）→ 纯 TS 才能跨项目复用；输入输出只用自家 types
- **stage 联合类型放开** → 未知 stage 的节点布局/渲染直接错；类型收窄 + 校验层双保险
- **Code 模式可编辑但不校验** → 脏 JSON 炸画布；三级校验（结构/引用/自连）返回错误清单，不抛异常

## 配置项

| 类型 | 字段 | 说明 |
|---|---|---|
| `WorkflowAgentStage` | 7 值 | analysis / control / generation / memory / output / quality / router |
| `WorkflowAgentNodeData` | code/label/name/role/prompt/stage/output_format/model_config | 节点数据（prompt 是 Agent 的提示词本体） |
| `WorkflowNodeModelConfig` | + use_workflow_default | 节点级模型开关，true 时回落工作流默认 |
| `LangGraphWorkflowConfig` | version/nodes/edges/**entry_node_ids/terminal_node_ids**/default_model_config | 导出物，`langgraph-preview/v1` |
| `resolveNodeModelConfig` | — | 回落解析：use_workflow_default ? 默认配置 : 展开节点专属 |
