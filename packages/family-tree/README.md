---
场景: 系谱/家系/族谱类可视化——上下代槽位必须严格对齐的血统图（畜牧育种系谱、家族族谱）
技术: Vue3 + 纯 HTML/CSS（flex 双向布局 + 绝对定位连线）+ html2canvas 截图导出
标签: 可视化, 家系树, 层次布局, 二叉树, 源码提炼
更新时间: 2026-10-11
---

# 家系树可视化

提炼来源：本人实习期间公司项目的畜牧数据后台（deepblup3.0）系谱页（`views/FamilyTree/Genealogy.vue` + `components/Node.vue`）——实习中实际上线运行的纯 HTML/CSS 自绘完全二叉树方案。**功能与简历一致**：BFS 层次遍历补空位、纯 HTML/CSS 渲染（flex 双向布局 + 绝对定位连线）、html2canvas 截图导出、画布拖拽缩放；渲染方向采用更常见的自上而下树形（源码为横向分列），连线几何由源码的"节点拼线"改为统一计算的肘形三段线（同一数学根基：子节点中线 = 亲本槽位对中点，布局参数变化更稳）。

## 决策层（为什么不用图库）

| 方案 | 评价 | 什么时候选 |
|---|---|---|
| ECharts tree / relation-graph | 辐射/力学布局，**不保证上下代槽位严格对齐**，卡片样式难贴合业务（源项目 relation-graph 试过放弃、echarts 装了没用） | 通用关系图 |
| SVG 全自绘 | 灵活但要自写全套交互 | 强交互图谱 |
| **flex 双向布局 + 绝对定位连线**（本方案） | 槽位天然对齐、DOM 结构简单、样式随便贴；这个规模下 DOM 比 Canvas 划算（hover/点击/截图都是白来的） | 血统/族谱类"代际"图 ✅ |
| Canvas 全自绘 | 交互全要手写 | 节点上千的巨图 |

核心判断：家系图的特殊约束是**上下代槽位严格对齐**（父在第 d 层 index i，亲本永远在下代 2i/2i+1 槽）——这天然是满二叉树索引，按代分行 + 补空位比图库的布局算法更直接。

## 结论

- `src/layout.ts` —— 纯函数布局：
  - `buildLayers(rootId, nodeMap, maxDepth)`：BFS 层次遍历，把"父/母指针"的稀疏树转成按代分层的二维数组，**每层按 2^depth 补空位**（null 槽），先父后母入队保证与 2i/2i+1 对齐
  - `buildSegments(layers, { rowHeight, boxHeight })`：绝对定位连线几何——肘形三段（父底部 → 汇流线 → 各子顶部），只覆盖实际存在的子槽位；x 全用百分比（槽宽 = 100/2^depth%，天然响应式）、y 用像素
  - `slotWidthPercent(depth)`：槽位宽度
- `src/FamilyTree.vue` —— 渲染：flex 双向布局（外层代行自上而下、行内槽位 flex 均分）、空槽占位不渲染卡片、画布滚轮缩放（0.5~1.6 钳制）+ 拖拽平移（transform 不触发重排）、内置 html2canvas 截图预览（预览内滚轮缩放 0.2~3 + 拖拽 + 下载 JPEG）
- `src/types.ts` —— `PedigreeNode`（fatherId/motherId 指针）/ `TreeSlot` / `TreeSegment`

```ts
const layers = buildLayers(rootId, nodeMap, 5)   // 每行 1/2/4/8/16 槽
const segments = buildSegments(layers, { rowHeight: 96, boxHeight: 48 })
```

## 原理讲解（关键机制）

### BFS 分层（源码 createTreeLayers + fullTree 同机制）

队列 + 本层 size 一次消费一层，天然产出"第几代"；父槽位先父后母入队，
保证队列顺序与满二叉树的 `2i / 2i+1` 索引严格对应（BFS 序 = 堆序）。

### 补空位

每行补齐到 `2^depth` 个槽位（1/2/4/8/16…），空槽 `node: null`。
渲染时空槽不输出卡片、不绑事件；布局层照常占据位置——对齐靠的是
"位置永远存在"，而不是"内容永远存在"。

### 连线几何（肘形三段，绝对定位）

对每个存在亲本的父槽位：① 父底部 → 汇流线的竖线；② 汇流横线，只覆盖
**实际存在**的子槽位左右区间；③ 汇流线 → 各子顶部的竖线。
x 全部用百分比（槽宽 = `100/2^depth`%，天然响应式），y 用像素（行高固定），
两种单位在绝对定位层混用互不干扰。数学根基：子节点中线恒等于其亲本槽位对的中点，
space-around/均分布局天然满足，所以肘形线能严丝合缝。

### 截图导出与预览画布（html2canvas）

简历同款能力：`html2canvas` 截整棵树 → 预览弹窗里滚轮缩放 + 拖拽平移 + 下载 JPEG。
实现要点：截图前**临时复位画布的缩放/平移变换**（导出完整未缩放的树，截完恢复）；
html2canvas 用 `scale: 2` 保清晰度、跨域图片开 `useCORS`；组件里**动态 import** 引入，
避免 SSR 构建期加载浏览器专用库。修掉源码的两个真实坑：预览的 mousemove/mouseup
监听器挂 window 不移除（多次开关拖拽越来越卡）→ **随拖拽结束/弹窗关闭统一移除**；
缩放无边界 → **钳制 0.2~3**。下载用 Blob URL（data: 链接在无下载管理器的 webview
里被静默拦截），预览栏提示右键另存兜底。

### 画布缩放/拖拽

缩放 = `transform: scale`（滚轮累加，钳制 0.5~1.6）；拖拽 = pointerdown 记起点、
pointermove 算偏移写 translate。都走 transform，不触发重排；节点上 `@pointerdown.stop`，
拖画布与节点点击互不打架。

## 坑

- **不补空位直接 flex** → 缺记录分支整体错位，连线接不上
- **先母后父入队** → 与 2i/2i+1 索引错位，连线画到错误槽位
- **连接线按"两个亲本都存在"画** → 缺一个时横线悬空；必须只覆盖现存子槽位区间
- **`JSON.stringify(node) === '{}'` 判空**（源码真实写法）→ 后端给节点加一个字段，末代裁剪全体失效；用明确的 id 判空
- **x/y 单位混用不一致** → 全用 px 在窄屏溢出，全用 % 在行高上失效；x 用 % y 用 px 是本方案的平衡点
- **html2canvas 直接截带 transform 的画布** → 截到的是缩放后的样子；截图前复位变换
- **html2canvas 预览的 mousemove/mouseup 不移除**（源码真实泄漏）→ 多次开关拖拽越来越卡
- **缩放无边界**（源码真实写法）→ 能缩到无限小/大，必须 clamp
- **data: URL 直接 `<a download>`** → 无下载管理器的 webview 里被静默拦截；转 Blob + object URL，右键另存兜底
- **keep-alive 页 ResizeObserver 不 disconnect** → 常驻泄漏
- **用 Canvas 重绘一切** → 这个规模 DOM 更划算：hover/点击/截图都是白来的

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `nodes` | 必传 | 扁平节点表（fatherId / motherId 指向上一代） |
| `rootId` | 必传 | 目标个体 id，向下追溯亲本 |
| `maxDepth` | 5 | 最大代数（防脏数据爆栈） |
| `rowHeight` | 96 | 每代行高 px |
| `boxHeight` | 48 | 节点卡片高度 px |
| `viewportHeight` | 380 | 画布视口高度 px |
| `showCapture` | true | 是否显示截图预览按钮 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要实现一个种猪系谱家系树可视化（Vue3），要求：
> 1. BFS 层次遍历树形数据转层级结构：扁平节点表 + 父母指针（fatherId/motherId），
>    每层按 2^depth 补空位（稀疏血统 null 占位，渲染时空槽不输出卡片），
>    父槽位先父后母入队，保证与满二叉树 2i/2i+1 索引严格对应。
> 2. 纯 HTML/CSS 渲染，不用图库：flex 双向布局（外层按代分行自上而下、
>    行内槽位 flex 均分，槽宽 = 100/2^depth%）+ 绝对定位连线层——
>    肘形三段线（父底部 → 汇流线 → 各子顶部），连线只覆盖实际存在的子槽位区间；
>    x 全用百分比、y 用像素，混用于绝对定位层。
> 3. 画布交互：滚轮缩放（transform scale，钳制范围）+ 拖拽平移（pointer 记起点算偏移），
>    节点上 @pointerdown.stop 避免拖画布误触节点。
> 4. html2canvas 截图导出：截图前复位画布变换（导出完整未缩放的树）、scale: 2 保清晰度、
>    useCORS 跨域、组件内动态 import 避免 SSR 问题；预览弹窗支持滚轮缩放（钳制）+
>    拖拽平移 + 下载 JPEG；预览的鼠标监听器随关闭移除（防泄漏）；下载用 Blob URL
>    （data: 在 webview 被静默拦截）。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/family-tree/src/`；本机路径
> `C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/family-tree/src/`
