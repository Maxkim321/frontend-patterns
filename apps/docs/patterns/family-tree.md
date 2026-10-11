# 家系树可视化（BFS 分层）

## 在线 Demo

<ClientOnly>
<FamilyTreeDemo />
</ClientOnly>

> 源自本人实习期间公司项目（畜牧数据后台 deepblup3.0）的种猪系谱模块——实际上线运行的
> 纯 DOM/CSS 自绘方案：输入目标个体，向上追溯多代亲本。
> 数据是"扁平节点表 + 父母指针"，渲染按代分列——按规模选型
> （单图最多 5 代 31 个节点，DOM 方案样式可控、交互便宜、html2canvas 可直接截图）。

## 决策层（为什么"补空位对齐"）

家系图的特殊约束是**上下代槽位严格对齐**：父节点在第 d 层 index i，亲本槽位永远是
第 d+1 层的 `2i` 与 `2i+1`——这层不变量保证了所有连线几何可以纯计算得出。
图库（ECharts tree / relation-graph）的辐射/力学布局不保证这一点，源项目试过 relation-graph 后放弃。

## 结论

按源码机制实现的三件套（`packages/family-tree/src/`）：

| 模块 | 职责 |
|---|---|
| `Node.vue` | 节点卡片（源 Node.vue 同机制）：卡片 + 左右水平半线 + 性别竖线（母向上/公向下），公蓝 #0f77cb / 母橙 #d07f34，'hide' 空槽只占位 |
| `FamilyTree.vue` | 渲染（源 Genealogy.vue 同机制）：flex 横排"代"列 + 列内 space-around 均布 + ResizeObserver 实测宽度算半线长 |
| `layout.ts` | `buildLayers`（BFS 分层 + 2^depth 补空位）+ `sexLineHeight`（源码魔数通式化） |

业务方用法：

```vue
<FamilyTree :nodes="nodes" root-id="p-0" :max-depth="4" :height="440" />
```

```ts
// nodes：扁平表，fatherId / motherId 指向上一代（祖先方向）
const layers = buildLayers(rootId, nodeMap, 5)          // 每层 1/2/4/8/16 槽
sexLineHeight(containerHeight, depth)                   // 垂直线高：容器高/2^(depth+1)
```

## 原理讲解

### BFS 分层（源码 createTreeLayers + fullTree 同机制）

队列 + 本层 size 一次消费一层，天然产出"第几代"；父槽位先父后母入队，
保证队列顺序与满二叉树的 `2i / 2i+1` 索引严格对应（BFS 序 = 堆序）。

### 补空位

每层补齐到 `2^depth` 个槽位（1/2/4/8/16…），空槽传 `'hide'`（源码同款约定）。
渲染时空槽只输出占位容器、不画卡片不画线；布局层照常占据位置——对齐靠的是
"位置永远存在"，而不是"内容永远存在"。

### 连线：节点自带半线拼接（源机制）

每个节点画自己的左/右水平半线（从卡片边缘向外延伸）+ 一条垂直线（按性别向上/向下），
相邻半线在列间距中拼成完整父子连线。两个尺寸都有通式：

- 水平线宽 = `(容器实测宽/代数 - 卡片宽) / 2`——ResizeObserver 实测（源码同机制）
- 垂直线高 = `容器高 / 2^(depth+1)`——源码在 2300px 容器下硬编码的 575/288/145/72
  就是这个通式的取整值，本实现把它还原成公式，任何容器高度都对得上

数学根基：第 d 代第 i 槽的节点中线在容器高 `(i+0.5)/2^d` 处，恰好等于其两个亲本
槽位（下一代 2i、2i+1）中点的位置——space-around 均布天然满足。

### 截图导出与预览画布（html2canvas）

简历同款能力：html2canvas 截整棵树 → 预览弹窗滚轮缩放（0.2~3 钳制）+ 拖拽平移 + 下载 JPEG。
修掉源码两个真实坑：监听器挂 window 不移除（多次开关越来越卡）→ 随关闭统一移除；缩放无边界 → 钳制。
组件内动态 import 引入 html2canvas，避免 SSR 构建期加载浏览器专用库。

## 坑（源自源码审查）

- **不补空位直接 flex** → 缺记录分支整体错位，连线接不上
- **先母后父入队** → 与 2i/2i+1 索引错位，连线画到错误槽位
- **`JSON.stringify(node) === '{}'` 判空** → 后端给节点加一个字段，末代裁剪全体失效；用明确的 id 判空
- **垂直线高硬编码 575/288/145/72** → 只在 2300px 容器成立；通式 = 容器高/2^(depth+1)
- **水平线宽不定宽** → 列宽变化半线接不上；ResizeObserver 实测（源码同机制）
- **html2canvas 预览的 mousemove/mouseup 不移除** → 多次开关拖拽越来越卡（源码真实泄漏）
- **缩放无 min/max clamp** → 能缩到无限小/大
- **mask 后原地 sort + 索引 key** → 点击后整列节点跳动
- **keep-alive 页 ResizeObserver 不 disconnect** → 常驻泄漏

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `nodes` | 必传 | 扁平节点表（fatherId / motherId 指向上一代） |
| `rootId` | 必传 | 目标个体 id，向右追溯亲本 |
| `maxDepth` | 5 | 最大代数（防脏数据爆栈） |
| `height` | 460 | 图形容器总高 px（源码整屏 2300，文档演示收缩） |
| `boxWidth` / `boxHeight` | 150 / 44 | 节点卡片尺寸 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。完整章节说明见 `packages/family-tree/README.md`。

> 本机实现路径：`C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/family-tree/src/`
> （GitHub：`https://github.com/Maxkim321/frontend-patterns`）——提示词正文以上方 README 同名章节为准，
> 包含完整的需求规则清单，可直接复制使用。
