# 家系树可视化（BFS 分层）

## 在线 Demo

<ClientOnly>
<FamilyTreeDemo />
</ClientOnly>

> 源自本人实习期间公司项目（畜牧数据后台 deepblup3.0）的种猪系谱模块——实际上线运行的
> 纯 HTML/CSS 自绘方案：输入目标个体，向上追溯多代亲本。
> 功能与简历一致：BFS 分层补空位、flex 双向布局 + 绝对定位连线、画布拖拽缩放、html2canvas 截图导出。

## 决策层（为什么"补空位对齐"）

家系图的特殊约束是**上下代槽位严格对齐**：父节点在第 d 层 index i，亲本槽位永远是
第 d+1 层的 `2i` 与 `2i+1`——这层不变量保证了所有连线几何可以纯计算得出。
图库（ECharts tree / relation-graph）的辐射/力学布局不保证这一点，源项目试过 relation-graph 后放弃。

## 结论

三件套（`packages/family-tree/src/`）：

| 模块 | 职责 |
|---|---|
| `layout.ts` | BFS 分层 + 满二叉树补空位 + 肘形连线几何（纯函数，可单测） |
| `FamilyTree.vue` | 渲染：flex 双向布局（代行自上而下、行内槽位均分）+ 绝对定位连线层 + 画布缩放拖拽 + html2canvas 截图预览 |
| `types.ts` | PedigreeNode / TreeSlot / TreeSegment |

业务方用法：

```vue
<FamilyTree :nodes="nodes" root-id="p-0" :max-depth="4" :row-height="96" :box-height="48" />
```

```ts
// nodes：扁平表，fatherId / motherId 指向上一代（祖先方向）
const layers = buildLayers(rootId, nodeMap, 5)
const segments = buildSegments(layers, { rowHeight: 96, boxHeight: 48 })
```

## 原理讲解

### BFS 分层

队列 + 本层 size 一次消费一层，天然产出"第几代"；父槽位先父后母入队，
保证队列顺序与满二叉树的 `2i / 2i+1` 索引严格对应（BFS 序 = 堆序）。

### 补空位

每行补齐到 `2^depth` 个槽位（1/2/4/8/16…），空槽 `node: null`。
渲染时空槽不输出卡片、不绑事件；布局层照常占据位置——对齐靠的是
"位置永远存在"，而不是"内容永远存在"。

### 连线几何（肘形三段，绝对定位）

对每个存在亲本的父槽位：① 父底部 → 汇流线的竖线；② 汇流横线，只覆盖
**实际存在**的子槽位左右区间；③ 汇流线 → 各子顶部的竖线。
x 全用百分比（槽宽 = `100/2^depth`%，天然响应式），y 用像素（行高固定）。
数学根基：子节点中线恒等于亲本槽位对的中点，均分布局天然满足。

### 画布缩放/拖拽

缩放 = `transform: scale`（滚轮累加，钳制 0.5~1.6）；拖拽 = pointerdown 记起点、
pointermove 算偏移写 translate。都走 transform 不触发重排；节点上 `@pointerdown.stop`，
拖画布与节点点击互不打架。

### 截图导出与预览画布（html2canvas）

截图前**临时复位画布变换**（导出完整未缩放的树，截完恢复）；`scale: 2` 保清晰度、
跨域开 `useCORS`、组件内动态 import 避免 SSR 问题。预览弹窗滚轮缩放（0.2~3 钳制）+
拖拽平移 + 下载 JPEG；监听器随关闭移除（修掉源码的真实泄漏）；下载用 Blob URL
（data: 链接在无下载管理器的 webview 被静默拦截）。

## 坑

- **不补空位直接 flex** → 缺记录分支整体错位，连线接不上
- **先母后父入队** → 与 2i/2i+1 索引错位，连线画到错误槽位
- **连接线按"两个亲本都存在"画** → 缺一个时横线悬空；必须只覆盖现存子槽位区间
- **`JSON.stringify(node) === '{}'` 判空**（源码真实写法）→ 后端加字段就失效；用明确的 id 判空
- **x/y 单位混用不一致** → x 用 % y 用 px 是平衡点
- **html2canvas 直接截带 transform 的画布** → 截到缩放后的样子；截图前复位变换
- **预览监听器挂 window 不移除**（源码真实泄漏）→ 多次开关拖拽越来越卡
- **缩放无边界**（源码真实写法）→ 必须 clamp
- **data: URL 直接 `<a download>`** → webview 里被静默拦截；转 Blob + 右键另存兜底
- **keep-alive 页 ResizeObserver 不 disconnect** → 常驻泄漏
- **用 Canvas 重绘一切** → 这个规模 DOM 更划算：hover/点击/截图都是白来的

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `nodes` | 必传 | 扁平节点表（fatherId / motherId 指向上一代） |
| `rootId` | 必传 | 目标个体 id，向下追溯 |
| `maxDepth` | 5 | 最大代数（防脏数据爆栈） |
| `rowHeight` | 96 | 每代行高 px |
| `boxHeight` | 48 | 节点卡片高度 px |
| `viewportHeight` | 380 | 画布视口高度 px |
| `showCapture` | true | 是否显示截图预览按钮 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。完整章节说明见 `packages/family-tree/README.md`。

> 本机实现路径：`C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/family-tree/src/`
> （GitHub：`https://github.com/Maxkim321/frontend-patterns`）——提示词正文以上方 README 同名章节为准，
> 包含完整的需求规则清单，可直接复制使用。
