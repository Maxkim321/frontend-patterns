---
场景: 系谱/家系/族谱类可视化——上下代槽位必须严格对齐的血统图（畜牧育种系谱、家族族谱）
技术: Vue3 + flex 分列 + 满二叉树补空位 + 计算的肘形连线
标签: 可视化, 家系树, 层次布局, 二叉树, 源码提炼
更新时间: 2026-10-11
---

# 家系树可视化

提炼来源：deepblup3.0 畜牧数据后台的系谱页（`views/FamilyTree/Genealogy.vue` + `components/Node.vue`）——一个用纯 DOM/Flex 自绘完全二叉树的真实验证过的方案；本库在其基础上把"节点自带 div 拼线"修正为统一计算的肘形连线。

## 决策层（为什么不用图库）

| 方案 | 评价 | 什么时候选 |
|---|---|---|
| ECharts tree / relation-graph | 辐射/力学布局，**不保证上下代槽位严格对齐**，卡片样式难贴合业务（源项目 relation-graph 试过放弃、echarts 装了没用） | 通用关系图 |
| SVG 全自绘 | 灵活但要自写全套交互 | 强交互图谱 |
| **flex 分列 + 2^i 补位 + 连线几何计算**（本方案） | 槽位天然对齐、DOM 结构简单、样式随便贴 | 血统/族谱类"代际列"图 ✅ |

核心判断：家系图的特殊约束是**上下代槽位严格对齐**（父在上代第 i 槽，亲本永远在下代 2i/2i+1 槽）——这天然是满二叉树索引，flex 分列 + 补空位比图库的布局算法更直接。

## 结论

- `src/layout.ts` —— 纯函数布局：
  - `buildLayers(rootId, nodeMap, maxDepth)`：BFS 分层，把"父/母指针"的稀疏树转成按代分层的二维数组，**每层按 2^depth 补空位**（null 槽），先父后母入队保证与 2i/2i+1 对齐
  - `buildSegments(layers, { rowHeight, boxHeight })`：肘形连线几何——父底部 → 水平汇流线 → 各子顶部；x 用百分比（槽位宽 = 100/2^depth，天然响应式）、y 用像素
- `src/FamilyTree.vue` —— 渲染：按层 flex 行 + 槽位列，空槽占位不渲染卡片；`slot` 插槽外放节点卡片内容
- `src/types.ts` —— `PedigreeNode`（fatherId/motherId 指针）/ `TreeSlot` / `TreeSegment`

```ts
const layers = buildLayers(rootId, nodeMap, 5)   // 5 代 → 每层 1,2,4,8,16 槽
const segments = buildSegments(layers, { rowHeight: 120, boxHeight: 64 })
```

## 原理讲解（关键机制）

### 满二叉树槽位对齐

家系不是满二叉树（有的个体缺父/母记录），但布局要求槽位对齐：父节点在第 d 层 index 为 i，其亲本槽位**永远**是第 d+1 层的 2i 与 2i+1。BFS 时先父后母入队即可保证；稀疏处补 null 槽（UI 只占位不渲染），代价是 5 代固定 1+2+4+8+16=31 个槽位。

### 连线：从"节点自带 div 拼接"到统一计算

源项目的画法是每个节点自带左/右半截水平线 + 垂直线，靠 `space-around` 均分 + 硬编码尺寸精确对位拼出父子连线——**任何高度/边距变化都断线错位**（垂直线高 575/288/145/72 全是魔数）。本库改为 `buildSegments` 统一算出每条肘形线段的坐标，x 走百分比自适应列宽，y 走固定行高——布局参数改变只影响这一个函数。

### 两套数据字段并存（源项目实测）

祖先方向接口给 `father/mother` 嵌套对象递归；后代方向接口给 `fatherId/motherId` 指针 + `son/daughter` 子代数组。本库统一收敛为**指针 + nodeMap** 形态（`{ id, fatherId, motherId, ... }`），接入时做一次适配即可。

## 坑（源码审查实锤）

- ① `JSON.stringify(node) === '{}'` 判空节点：后端给节点加一个字段，末代裁剪逻辑全体失效
- ② Node.vue 声明 `boxWidth: required` 但父组件没传——每次渲染都报 prop 警告
- ③ 容器高 2300px、节点 92px、卡片 208px、垂直线 575/288/145/72 全是硬编码魔数，纵向永不自适应
- ④ **事件监听器泄漏**：html2canvas 预览的 mousemove/mouseup 挂在 container/body 上从不移除，多次开关预览后拖拽越来越卡
- ⑤ 截图预览缩放无 min/max clamp，能缩到无限小；用废弃的 `wheelDelta/detail` 判断方向
- ⑥ mask（血亲高亮）后原地 sort + 索引 key：点击后整列节点跳动重排；比较器遇 undefined 得 NaN
- ⑦ keep-alive 页面里 ResizeObserver 注册后从不 disconnect
- ⑧ 性别筛选参数映射 `{0:[1],1:[0]}` 是反的——UI 选"公猪"实际传母猪
- ⑨ 查询成功后 `scrollTo({top: 900})` 写死，不同屏高定位不一致
- ⑩ `deepData` 只取单支：son 非空才走 daughter，混合性别多支子代展示不全

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `maxDepth` | 5 | 展示代数（2^depth 个槽/层） |
| `rowHeight` | 120 | 每代行高 px |
| `boxHeight` | 64 | 节点卡片高 px |
| 节点内容 | slot | 插槽外放，作用域 { node } |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要实现一个家系/系谱树可视化（Vue3），约束是上下代槽位必须严格对齐（父在第 d 层
> index i，其亲本槽位永远是第 d+1 层的 2i 和 2i+1），要求：
> 1. 不用图库：flex 按代分列，每层按 2^depth 补空位（稀疏血统用 null 槽占位不渲染卡片）。
>    BFS 分层时先父后母入队，保证与满二叉树索引对齐。
> 2. 数据形态统一为指针 + nodeMap：{ id, fatherId, motherId, ... }；
>    祖先方向接口（father/mother 嵌套对象）与后代方向接口（fatherId/motherId + son/daughter
>    数组）接入时先适配成这个形态。
> 3. 连线不要"每个节点自带半截 div 拼接"（硬编码尺寸，布局一变就断线）——
>    用纯函数统一计算肘形连线段：父节点底部 → 水平汇流线 → 各子节点顶部；
>    x 用百分比（槽位宽 = 100/2^depth）天然响应式，y 用固定行高像素。
> 4. 空节点判断不要用 JSON.stringify(node)==='{}'（后端加字段就失效），用明确的 id 判空。
> 5. 节点卡片内容插槽外放；5 代 31 槽注意空槽不渲染事件与内容。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/family-tree/src/`；本机路径
> `C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/family-tree/src/`
