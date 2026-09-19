---
场景: 需要可视化流程编排的页面（审批流 / 工单流 / 数据编排 / 营销画布），且多个业务页面要复用同一个编辑器
技术: Vue3 + @vue-flow/core + schema 驱动配置
标签: 流程图, VueFlow, 组件封装, 拖拽, 连线校验
更新时间: 2026-09-19
---

# 可视化流程图编辑器

## 决策层（为什么选 Vue Flow，而不是别的）

| 候选 | 评价 | 什么时候选它 |
|---|---|---|
| **@vue-flow/core** | Vue3 原生、声明式（自定义节点就是组件）、react-flow 同源生态 | 中等规模流程图（几十~几百节点）+ Vue 技术栈 ✅ |
| AntV X6 | 功能最全（对齐/分组/组合图），但偏命令式 API、体积大 | 超大图、强定制交互、React/Agnostic 团队 |
| LogicFlow | 偏审批流/BPMN 场景开箱即用 | 场景恰好是标准 BPMN 且不想定制 |
| 自研 SVG | 教具级 | 生产环境别碰 |

核心判断：**流程图编辑器的复杂度在"交互规则"而不是"画 SVG"**——拖拽、连线、命中、缩放这些基础能力没必要自研，选库把精力留给业务规则（校验、物料、序列化）。

## 结论

**封装范式：编辑器本体零业务逻辑，业务语义全在配置里（schema 驱动）。**
业务方只传三样东西：`materials`（物料清单）、`validators`（连线校验规则）、`initialGraph`（初始图）。

代码地图：

- `src/FlowEditor.vue` —— 通用封装组件（物料面板 + 工具栏 + 画布 + 错误提示），业务方唯一入口
- `src/useFlowEditor.ts` —— 核心逻辑：物料注册、连线校验调度、历史时机、序列化
- `src/useDndMaterial.ts` —— 物料入画布三件套（dragstart/drop/dragover）
- `src/useFlowHistory.ts` —— 快照式撤销/重做
- `src/validators.ts` —— 内置校验（防自连/防环）+ 业务校验器工厂（限出线/限入线/禁方向）

### 多业务复用怎么体现

同一个 `FlowEditor` 组件：
- 审批流配置 = 开始/审批/条件分支/结束 + 「开始禁入线、结束禁出线、分支最多 2 出线」
- 数据编排配置 = 数据源/算子/输出 + 「算子最多 2 入线、数据源最多 3 出线」
- 切换只需换 props，编辑器一行不改。demo 里有双业务一键切换。

## 原理讲解（关键机制）

### 坐标系统：为什么拖拽落点必须换算

画布有缩放和平移，鼠标的 `clientX/Y` 是屏幕坐标；画布内部节点用的是"流坐标"。直接用鼠标坐标添加节点，落点会随缩放/平移越来越偏。必须走 `screenToFlowCoordinate(clientX, clientY)` 换算——它综合了容器偏移、当前 zoom、viewport 平移量。

### 连线校验：前置拦截而不是事后删除

校验挂在 `<VueFlow :is-valid-connection>` 上，连线**建立之前**执行：返回 false 连线根本不会出现，同时把拒绝原因暴露到画布内浮动提示。内置两条强制规则（防自连、防环——防环用 DFS 沿现有边从 target 向下游走，能回到 source 即成环）；业务规则通过 `validators` 数组追加，每个校验器返回 `true | 错误字符串`。

### 撤销/重做：快照式而不是操作级

不记录"每一步操作怎么撤销"，直接在**有意义的时刻**存整图 JSON 快照：连线建立、节点拖拽结束（`nodeDragStop`）、删除节点/边、物料落画布。拖拽过程中的每一帧**不进历史**。规模在几百节点内，快照足够便宜、实现简单且不会漏状态；操作级 diff 只在超大图 + 精细需求时才值得。

### 状态绑定：id 原则同源

节点/边的身份只认稳定 id（落物料时生成），编辑器内部所有映射、序列化、历史恢复都走 id——和大数据表格"勾选绑 rowId 不绑下标"是同一条原则：**UI 顺序会变，业务身份不变**。

## 坑

- **画布容器必须有确定高度**：VueFlow 高度默认撑满父容器，父容器没高度 = 画布 0 高 = 整块白屏，控制台还不报错（最高频翻车点）
- **拖拽落点不换算坐标**：直接 `clientX/Y` 加节点，缩放/平移后落点必偏
- **连线校验放在 onConnect 之后做**：错线已经画上去了，体验差且要处理回滚；应该前置到 `isValidConnection`
- **输入框聚焦时按 Delete/Backspace 会误删节点**：VueFlow 的 deleteKeyCode 不感知焦点，节点内有表单时必须拦截（本实现节点无表单，暂未内置）
- **节点 data 塞大对象**：Vue Flow 对节点做深度响应式，几百节点 × 大 data 会拖垮拖拽帧率——大对象 `markRaw` 或只存 id 引用明细
- **样式文件没引**：`@vue-flow/core/dist/style.css` 和 `theme-default.css` 必须引，否则连线/端口错乱
- **业务切换时只换物料数组**：画布上已落的节点不会消失（它们是用户数据不是配置），需要在业务切换时决定保留还是清空

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `materials` | 必传 | 物料清单（type/label/category/ports） |
| `validators` | [] | 业务连线校验器（内置防自连/防环始终生效） |
| `initialGraph` | 空 | 初始图 |
| `height` | 480 | 画布高度 px（必须有确定值） |
| `deleteKeyCode` | Backspace/Delete | 删除键（组件内已配置） |
| 历史栈上限 | 50 | 快照式，超出丢弃最早的 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。仓库地址是「有联网能力时」的加分项。

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
> （可选）本机/联网可参考我的实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/flow-editor/src/`；本机路径
> `C:/Users/Maxkim/Desktop/frontend-patterns/packages/flow-editor/src/`
