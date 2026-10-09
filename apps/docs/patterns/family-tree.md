# 家系树可视化（BFS 分层）

## 在线 Demo

<ClientOnly>
<FamilyTreeDemo />
</ClientOnly>

> 源自种猪系谱模块提炼：输入目标个体，向上追溯多代亲本。
> 数据是"扁平节点表 + 父母指针"，渲染纯 DOM/CSS——按规模选型
> （单图最多 5 代 31 个节点，DOM 方案样式可控、交互便宜、html2canvas 可直接截图）。

## 决策层（为什么"补空位对齐"）

家系不是满二叉树——有的个体缺父/母记录。如果直接 flex 布局，
缺记录的分支会让上下代节点错位，连线对不上。本方案的锚点是：
**布局槽位永远按满二叉树切分（第 d 代 2^d 个槽），缺记录的槽位用 null 占位、
只占位不渲染**。父节点在第 d 层 index 为 i，它的父/母槽位固定是第 d+1 层的
`2i` 与 `2i+1`——这层不变量保证了所有连线几何可以纯计算得出。

## 结论

三件套（`packages/family-tree/src/`）：

| 模块 | 职责 |
|---|---|
| `layout.ts` | BFS 分层 + 满二叉树补空位 + 连接线几何（纯函数，可单测） |
| `FamilyTree.vue` | 渲染：每代绝对定位行 + 槽位百分比切分 + 肘形连接线 + 缩放拖拽 |
| `types.ts` | PedigreeNode / TreeSlot / TreeSegment |

业务方用法：

```vue
<FamilyTree :nodes="nodes" root-id="p-0" :max-depth="4" :row-height="96" :box-height="48" />
```

```ts
// nodes：扁平表，fatherId / motherId 指向上一代（祖先方向）
// 纯逻辑层也可以单独用：
const layers = buildLayers(rootId, nodeMap, 5)
const segments = buildSegments(layers, { rowHeight: 96, boxHeight: 48 })
```

## 原理讲解

### BFS 分层

队列 + 本层 size 一次消费一层，天然产出"第几代"；父槽位先父后母入队，
保证队列顺序与满二叉树的 `2i / 2i+1` 索引严格对应（BFS 序 = 堆序）。

### 补空位

每层补齐到 `2^depth` 个槽位（1/2/4/8/16…），空槽 `node: null`。
渲染时空槽不输出 DOM 内容、不绑事件；布局层照常占据位置——对齐靠的是
"位置永远存在"，而不是"内容永远存在"。

### 连接线几何（肘形三段）

对每个存在亲本的父槽位：① 父底部 → 汇流线的竖线；② 汇流横线，只覆盖
**实际存在**的子槽位左右区间；③ 汇流线 → 各子顶部的竖线。
x 全部用百分比（槽宽 = `100/2^depth`%，天然响应式），y 用像素（行高固定），
两种单位在绝对定位层混用互不干扰。

### 缩放与拖拽

缩放 = `transform: scale`（滚轮累加，钳制在 0.5~1.6）；
拖拽 = pointerdown 记起点、pointermove 算偏移写 translate。
都走 transform，不触发重排；节点上 `@pointerdown.stop`，拖画布与节点点击互不打架。

## 坑

- **不补空位直接 flex** → 缺记录分支整体错位，连线接不上
- **先母后父入队** → 与 2i/2i+1 索引错位，连线画到错误槽位
- **连接线按"两个亲本都存在"画** → 缺一个时横线悬空；必须只覆盖现存子槽位区间
- **x/y 单位混用不一致** → 全用 px 在窄屏溢出，全用 % 在行高上失效；x 用 % y 用 px 是本方案的平衡点
- **用 Canvas 重绘一切** → 这个规模 DOM 更划算：hover/点击/截图都是白来的，Canvas 全要手写
- **html2canvas 直接截** → 等 nextTick 渲染完成再转图；跨域图片要开 useCORS，清晰度靠传 scale 放大

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `nodes` | 必传 | 扁平节点表（fatherId / motherId 指向上一代） |
| `rootId` | 必传 | 目标个体 id，向上追溯 |
| `maxDepth` | 5 | 最大代数（防脏数据爆栈） |
| `rowHeight` | 96 | 每代行高 px |
| `boxHeight` | 48 | 节点卡片高度 px |
