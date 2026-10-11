---
场景: 系谱/家系/族谱类可视化——上下代槽位必须严格对齐的血统图（畜牧育种系谱、家族族谱）
技术: Vue3 + flex 分列 + 满二叉树补空位 + 节点自带半线拼接
标签: 可视化, 家系树, 层次布局, 二叉树, 源码提炼
更新时间: 2026-10-11
---

# 家系树可视化

提炼来源：本人实习期间公司项目的畜牧数据后台（deepblup3.0）系谱页（`views/FamilyTree/Genealogy.vue` + `components/Node.vue`）——实习中实际上线运行的纯 DOM/Flex 自绘完全二叉树方案。**本库按源码机制实现**（flex 分列 + 节点自带半线拼接 + 'hide' 空槽 + 性别配色），并把源码的连线魔数（575/288/145/72）通式化。

## 决策层（为什么不用图库）

| 方案 | 评价 | 什么时候选 |
|---|---|---|
| ECharts tree / relation-graph | 辐射/力学布局，**不保证上下代槽位严格对齐**，卡片样式难贴合业务（源项目 relation-graph 试过放弃、echarts 装了没用） | 通用关系图 |
| SVG 全自绘 | 灵活但要自写全套交互 | 强交互图谱 |
| **flex 分列 + 2^i 补位 + 连线几何计算**（本方案） | 槽位天然对齐、DOM 结构简单、样式随便贴 | 血统/族谱类"代际列"图 ✅ |

核心判断：家系图的特殊约束是**上下代槽位严格对齐**（父在上代第 i 槽，亲本永远在下代 2i/2i+1 槽）——这天然是满二叉树索引，flex 分列 + 补空位比图库的布局算法更直接。

## 结论

- `src/Node.vue` —— 节点卡片（源 Node.vue 同机制）：卡片 + 左右水平半线 + 性别竖线（母向上/公向下），公蓝 #0f77cb / 母橙 #d07f34，`'hide'` 空槽只占位
- `src/FamilyTree.vue` —— 渲染（源 Genealogy.vue 同机制）：flex 横排"代"列、列内 space-around 均布、ResizeObserver 实测容器宽算半线长、原生 overflow 滚动
- `src/layout.ts` —— `buildLayers`（BFS 分层 + 2^depth 补空位）+ `sexLineHeight`（垂直线高 = 容器高/2^(depth+1)，源码魔数的通式）
- `src/types.ts` —— `PedigreeNode`（fatherId/motherId 指针）/ `TreeSlot` / `TreeSegment`

```ts
const layers = buildLayers(rootId, nodeMap, 5)   // 每层 1/2/4/8/16 槽
sexLineHeight(containerHeight, depth)            // 垂直线高：容器高/2^(depth+1)
```

## 原理讲解（关键机制）

### 满二叉树槽位对齐

家系不是满二叉树（有的个体缺父/母记录），但布局要求槽位对齐：父节点在第 d 层 index 为 i，其亲本槽位**永远**是第 d+1 层的 2i 与 2i+1。BFS 时先父后母入队即可保证；稀疏处补 null 槽（UI 只占位不渲染），代价是 5 代固定 1+2+4+8+16=31 个槽位。

### 连线：节点自带半线拼接（源机制）

每个节点画自己的左/右水平半线（从卡片边缘向外）+ 一条垂直线（按性别向上/向下），
相邻半线在列间距中拼成完整父子连线——这是源码的画法。两个尺寸都有通式：

- 水平线宽 = `(容器实测宽/代数 - 卡片宽) / 2`，ResizeObserver 实测（源码同机制）
- 垂直线高 = `容器高 / 2^(depth+1)`——源码在 2300px 容器下硬编码的 575/288/145/72
  即此通式的取整值，本实现还原成公式

数学根基：第 d 代第 i 槽的节点中线在容器高 `(i+0.5)/2^d` 处，恰好等于其两个亲本
槽位（下一代 2i、2i+1）中点的位置——space-around 均布天然满足，所以半线拼接能严丝合缝。

### 两套数据字段并存（源项目实测）

祖先方向接口给 `father/mother` 嵌套对象递归；后代方向接口给 `fatherId/motherId` 指针 + `son/daughter` 子代数组。本库统一收敛为**指针 + nodeMap** 形态（`{ id, fatherId, motherId, ... }`），接入时做一次适配即可。

## 坑（源码审查实锤）

- ① `JSON.stringify(node) === '{}'` 判空节点：后端给节点加一个字段，末代裁剪逻辑全体失效
- ② Node.vue 声明 `boxWidth: required` 但父组件没传——每次渲染都报 prop 警告
- ③ 容器高 2300px、节点 92px、卡片 208px、垂直线 575/288/145/72 全是硬编码魔数，纵向永不自适应——本实现把垂直线魔数通式化为容器高/2^(depth+1)，其余尺寸参数化
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
| `height` | 460 | 图形容器总高 px |
| `boxWidth` / `boxHeight` | 150 / 44 | 节点卡片尺寸 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要实现一个家系/系谱树可视化（Vue3），约束是上下代槽位必须严格对齐（父在第 d 层
> index i，其亲本槽位永远是第 d+1 层的 2i 和 2i+1），要求：
> 1. 不用图库：flex 按代分列，每层按 2^depth 补空位（稀疏血统用 null 槽占位不渲染卡片）。
>    BFS 分层时先父后母入队，保证与满二叉树索引对齐。
> 2. 数据形态统一为指针 + nodeMap：{ id, fatherId, motherId, ... }；
>    祖先方向接口（father/mother 嵌套对象）与后代方向接口（fatherId/motherId + son/daughter
>    数组）接入时先适配成这个形态。
> 3. 连线按源机制"节点自带半线拼接"：水平线宽 = (容器实测宽/代数 - 卡片宽)/2
>    （ResizeObserver 实测）；垂直线高 = 容器高/2^(depth+1)（源码 2300px 容器下
>    575/288/145/72 魔数的通式）；垂直线方向按性别（母向上/公向下，公蓝 #0f77cb、
>    母橙 #d07f34）；空槽传 'hide' 只占位不渲染卡片与连线。
> 4. 空节点判断不要用 JSON.stringify(node)==='{}'（后端加字段就失效），用明确的 id 判空。
> 5. 节点卡片内容插槽外放；5 代 31 槽注意空槽不渲染事件与内容。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/family-tree/src/`；本机路径
> `C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/family-tree/src/`
