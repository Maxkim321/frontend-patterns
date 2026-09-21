# 可视化流程图编辑器

## 在线 Demo

<ClientOnly>
<FlowEditorDemo />
</ClientOnly>

> 画布已预置一条完整的 AI 审批链：开始 → AI 预审 → 条件分支（高置信自动通过 / 低置信转人工复核）→ 结束。
> 一个编辑器、两套业务配置（审批流 / 数据编排）一键切换——「支撑多业务页面复用」的现场证明。
> 试：故意让「开始」连出第二条线看校验拦截、选中按 Delete 删除、撤销/重做、切换业务。

## 业务故事：AI 公司的审批流编排

（把上面这个 demo 讲成一段真实业务叙事）

- **场景**：公司做 AI，审批系统不是纯人工——有「AI 预审」节点（大模型自动审核），低置信转人工复核。整个审批链是「AI 能力 + 人工节点」的混合工作流。
- **流程图的作用**：把这个混合工作流变成可视化、可配置的编排——运营/业务自己拖物料调整审批链，研发不用每次改代码；链路规则（谁能连谁、分支最多几条）由校验器前置拦截，配置错了当场报错，连不出非法流程。
- **AI 节点的特殊性**：AI 预审输出置信度，条件分支按阈值分流——高置信自动通过、低置信转人工。端口标签「高置信/低置信」也是物料配置的一部分，换一套业务的阈值语义整体替换。
- **一句话口径**：这套编辑器是「审批流可视化配置」的通用底座，demo 用审批流 + 数据编排两套配置证明复用性。

## 决策层（为什么选 Vue Flow）

| 候选 | 评价 | 什么时候选它 |
|---|---|---|
| **@vue-flow/core** | Vue3 原生、声明式（自定义节点就是组件）、react-flow 同源生态 | 中等规模流程图 + Vue 技术栈 ✅ |
| AntV X6 | 功能最全，但偏命令式、体积大 | 超大图、强定制交互 |
| LogicFlow | 偏 BPMN 审批场景开箱即用 | 标准审批流且不想定制 |
| 自研 SVG | 教具级 | 生产别碰 |

核心判断：编辑器的复杂度在**交互规则**而不是"画 SVG"——基础能力交给库，精力留给业务规则。

## 结论

**封装范式：编辑器本体零业务逻辑，业务语义全在配置里（schema 驱动）。**

业务方只传三样东西：

```ts
<FlowEditor
  :materials="materials"     <!-- 物料清单：type/label/category/ports -->
  :validators="validators"   <!-- 连线校验器：返回 true 或错误字符串 -->
  :initial-graph="graph"     <!-- 初始图（可选） -->
/>
```

demo 里的两套配置：

- **审批流**：开始/审批/条件分支/结束 + 开始禁入线、结束禁出线、分支最多 2 出线
- **数据编排**：数据源/算子/输出 + 算子最多 2 入线

代码地图（`packages/flow-editor/src/`）：

| 文件 | 职责 |
|---|---|
| `FlowEditor.vue` | 通用封装组件（物料面板 + 工具栏 + 画布 + 错误提示） |
| `useFlowEditor.ts` | 核心逻辑：物料注册、校验调度、历史时机、序列化 |
| `useDndMaterial.ts` | 物料入画布三件套 |
| `useFlowHistory.ts` | 快照式撤销/重做 |
| `validators.ts` | 内置校验（防自连/防环）+ 校验器工厂 |

## 原理讲解（关键机制）

### 坐标系统：为什么拖拽落点必须换算

画布有缩放和平移，鼠标 `clientX/Y` 是屏幕坐标，画布内部是"流坐标"。直接用鼠标坐标加节点，缩放/平移后落点必偏。必须走 `screenToFlowCoordinate()`——它综合了容器偏移、当前 zoom、viewport 平移量。

### 连线校验：前置拦截而不是事后删除

校验挂在 `<VueFlow :is-valid-connection>`，连线**建立之前**执行：返回 false 连线根本不出现，拒绝原因画布内浮动提示。内置两条强制规则：

- 防自连：source === target
- 防环：DFS 沿现有边从 target 向下游走，能回到 source 即成环

业务规则用校验器工厂追加（`limitOutgoing` / `maxIncoming` / `forbidDirection`），每个校验器返回 `true | 错误字符串`。

### 撤销/重做：快照式而不是操作级

在**有意义的时刻**存整图 JSON 快照：连线建立、`nodeDragStop`、删除、物料落画布。拖拽过程的每一帧**不进历史**。几百节点内快照足够便宜且不会漏状态；操作级 diff 只在超大图才值得。

### 状态绑定：id 原则同源

节点/边身份只认稳定 id——和大数据表格「勾选绑 rowId 不绑下标」同一条原则：UI 顺序会变，业务身份不变。

## 坑

- **画布容器必须有确定高度**：父容器没高度 = 画布 0 高 = 白屏且不报错（最高频翻车点）
- **拖拽落点不换算坐标**：缩放/平移后落点必偏
- **校验放 onConnect 之后**：错线已画上，体验差还要回滚；前置到 `isValidConnection`
- **输入框聚焦按 Delete 误删节点**：deleteKeyCode 不感知焦点，节点内有表单必须拦截
- **节点 data 塞大对象**：深度响应式拖垮拖拽帧率，大对象 `markRaw`
- **样式没引**：`style.css` + `theme-default.css` 必须引，否则连线/端口错乱

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `materials` | 必传 | 物料清单 |
| `validators` | [] | 业务连线校验器（内置防自连/防环始终生效） |
| `initialGraph` | 空 | 初始图 |
| `height` | 480 | 画布高度 px（必须有确定值） |
| 历史栈上限 | 50 | 快照式 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要封装一个基于 @vue-flow/core（Vue3）的可视化流程图编辑器通用组件，要求：
> 1. schema 驱动：组件本体零业务逻辑，业务方通过 props 传入三样东西——
>    materials（物料清单：type/label/category/ports 端口定义）、
>    validators（连线校验器数组，返回 true 或错误字符串）、initialGraph（初始图）。
> 2. 节点拖拽：自定义节点（slot #node-business 渲染），端口按 material.ports 配置渲染多个 Handle。
> 3. 物料入画布：左侧物料面板 HTML5 拖拽，drop 时必须用 screenToFlowCoordinate
>    把鼠标坐标换算成画布坐标（画布有缩放平移），再 addNodes。
> 4. 连线编辑：校验前置到 isValidConnection（连线建立前拦截）——
>    内置防自连、防环（DFS 沿现有边从 target 向下游走能否回到 source），
>    业务规则（限出线数/限入线数/禁方向）做成校验器工厂；拒绝原因在画布内浮动提示。
> 5. 撤销/重做：快照式历史栈，只在有意义时刻存快照——连线建立、nodeDragStop、
>    删除节点/边、物料落画布；拖拽过程帧不进历史；栈上限 50。
> 6. 必须引 @vue-flow/core/dist/style.css 和 theme-default.css；
>    画布容器必须有确定高度，否则白屏；删除键 Backspace/Delete。
> 7. 组件对外：emit change(graph)，expose getGraphJSON()/loadGraph()。
> （可选）参考我的实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/flow-editor/src/`；本机路径
> `C:/Users/Maxkim/Desktop/frontend-patterns/packages/flow-editor/src/`
