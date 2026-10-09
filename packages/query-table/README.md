---
场景: 后台系统的列表页（搜索区 + 表格 + 分页），几十个页面长一个样、只有字段和列不同，且各页面的单元格渲染差异大（金额/状态标签/操作按钮）
技术: Vue3 + Element Plus + schema 驱动 + 动态插槽外放
标签: 表格, 表单, 组件封装, ElementPlus, 插槽, 后台系统
更新时间: 2026-09-19
---

# 查询表格封装

源自洛阳智能体项目（quotation-agent 报价智能体）的 QaTable / PaginationBar 组件提炼：**配置驱动结构、插槽外放渲染**。配套的查询表单 SearchForm 同源同风格。

## 决策层（为什么"配置 + 插槽"而不是纯配置）

后台系统 30 个列表页，手写每页意味着 30 份重复的 `<el-form>` + `<el-table>` + `<el-pagination>` 样板。但列表页之间差异最大的恰恰是**单元格渲染**（金额要标色、状态要标签、操作列按钮各异）——纯配置要么把每种渲染都做成内置类型（组件爆炸），要么做不灵活。

| 方案 | 评价 | 什么时候选 |
|---|---|---|
| 每页手写 | 灵活但重复劳动巨大、样式漂移 | 只有 2~3 个页面 |
| 纯配置渲染（内置列类型） | 样板归零，但渲染类型要不停往组件里加 | 单元格形态少且固定 |
| **配置定结构 + 插槽外放渲染**（本方案） | 结构复用（表格/分页/勾选/序号全内置），渲染自由（插槽名 = 列 prop） | 列表页多且渲染形态多样 ✅ |
| 直接上 ProComponents / avue | 能力全，但样式定制受限 | 新项目且接受其设计语言 |

核心判断：**组件管"结构"（表格骨架、分页、勾选、跨页序号），业务方管"内容"（插槽）**——插槽名直接用列的 prop，业务方在模板里 `<template #amount="{ row }">` 就能接管任意一列。

## 结论

三件套（代码在 `src/`）：

- `QueryTable.vue` —— 配置驱动表格 + 插槽外放：
  - `columns` 配置结构（prop/label/width/fixed/align/showTooltip）
  - 列上开 `isSlot: true` → 内容插槽名 = `prop`，作用域 `{ row, value }`；`isHeadSlot: true` → 表头插槽名 = `${prop}-header`
  - 多选列 `reserve-selection` 跨页保留勾选（依赖 row-key），`selectedRows` 受控 + `clearSelection` 暴露
  - 单选列（checkbox 样式，`radioParam` 指定唯一键）
  - 序号跨页连续：`(page-1)*pageSize + index + 1`
  - 内置分页（`noPage` 可关）
- `SearchForm.vue` —— schema 驱动查询表单：`fields` 数组按 `type` 映射六种控件（input/select/date/daterange/switch/number-range），内置 search/reset，reset 回 `initial` 深拷贝、父组件回填走 merge
- `types.ts` —— 全部配置类型，业务方写配置即有类型提示

业务方用法（demo 双业务切换 = 两套配置 + 各自的插槽模板）：

```vue
<QueryTable :columns="columns" :rows="rows" :total="total"
  :page="page" :page-size="pageSize" @page-change="onPageChange">
  <!-- 插槽名 = 列 prop，完全接管该列渲染 -->
  <template #amount="{ row }">¥{{ row.amount.toLocaleString() }}</template>
  <template #operation="{ row }">…编辑/删除…</template>
</QueryTable>
```

## 原理讲解（关键机制）

### 动态插槽：插槽名 = 列 prop

`v-for columns` 渲染 `el-table-column`，列上 `isSlot` 开启时列的默认插槽被转发：

```
<slot :name="col.prop" :row="scope.row" :value="scope.row[col.prop]" />
```

Vue 的动态插槽名让"哪列可定制"变成**数据**（isSlot 布尔），业务方模板里 `#amount`、`#status`、`#operation` 与配置一一对应。未开启插槽的列走默认渲染 + 空值兜底 `—— ——`。这是"结构复用 + 渲染自由"的关键平衡点。

### 跨页勾选：reserve-selection 依赖 row-key

el-table 的 `reserve-selection` 让翻页后勾选保留——但它靠 `row-key` 识别"同一行"。**没有稳定业务 id，跨页保留就是假的**（翻回来勾选丢失或错行）。配套设计：勾选状态受控（`selectedRows` 由父组件持有，watch 回填 `toggleRowSelection`），清空通过 `defineExpose` 暴露给父组件。

### 单选列为什么要 @click.prevent.stop

用 el-checkbox 冒充单选：它自带点击翻转行为，外层再手动切一次就是"点一下翻转两次"。阻断原生行为（`@click.prevent.stop`）后由**单一数据源**（当前选中行的唯一键比对）驱动显示。

### schema → 控件映射

查询表单 `v-for fields` + `v-if type` 分发到对应控件，全部绑到同一个 `values[field.name]`。把"写模板"变成"写数据"：新增搜索字段 = 往数组加一个对象。

## 坑

- **reserve-selection 没配 row-key**：跨页勾选保留失效，翻页回来勾选全丢——两者必须成对出现
- **单选不复位原生行为**：el-checkbox 自带翻转 + 手动翻转 = 点一下翻转两次，必须 `@click.prevent.stop`
- **跨页序号直接用 type=index**：每页都从 1 开始，要按 `(page-1)*pageSize + index + 1` 算连续序号
- **reset 不深拷贝**：清空输入直接污染父组件的默认参数（用 lodash `cloneDeep` 回拷）
- **区间控件的初值必须是对象**：number-range 的 v-model 绑 `values[name].startValue`，初值若是 `undefined` 渲染时直接 TypeError、整棵组件树挂掉且只在 console 报错。封装内部要做结构归一化
- **父组件回填参数用覆盖**：把用户正在编辑的其他字段冲掉，必须 merge
- **查询条件变了不回第 1 页**：在第 5 页改搜索词可能落在空页，search 时必须重置 page=1
- **el-select 滚动不收起**：下拉浮层挂在 body 上，在主滚动容器监听 scroll 后对 select 强制 `blur()`

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `columns[].isSlot` | false | 开启内容插槽（插槽名 = prop） |
| `columns[].isHeadSlot` | false | 开启表头插槽（插槽名 = `${prop}-header`） |
| `rowKey` | 无 | 跨页保留勾选必须提供 |
| `showSelection` / `showRadio` | false | 多选列 / 单选列 |
| `radioParam` | 'id' | 单选行的唯一键字段 |
| `selectedRows` | [] | 受控勾选（父组件持有） |
| `showIndex` | false | 序号列（跨页连续） |
| `noPage` | false | 关闭内置分页 |
| `fields[].type` | input | 六种控件映射 |
| `initial` | {} | 表单初始值，reset 回到这里 |
| 分页 pageSizes | [10,20,50] | 尺寸切换 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要封装一个 Vue3 + Element Plus 的查询表格通用组件（搜索表单 + 表格 + 分页三件套），要求：
> 1. 表格结构配置驱动：columns 数组（prop/label/width/fixed/align/showTooltip）。
> 2. 渲染通过插槽外放：列配置 isSlot: true 后内容插槽名 = 列 prop、作用域 { row, value }，
>    isHeadSlot: true 后表头插槽名 = `${prop}-header`；未开启插槽的列默认渲染并做空值兜底。
>    组件管结构（表格骨架/分页/勾选/序号），业务方管内容。
> 3. 多选列用 reserve-selection 跨页保留勾选，必须同时提供 row-key；
>    勾选受控（selectedRows 由父组件持有，watch 回填 toggleRowSelection，
>    defineExpose clearSelection 供父组件清空）。
> 4. 单选列用 el-checkbox 冒充，外层 @click.prevent.stop 阻断其自带翻转，
>    由当前选中行的唯一键（radioParam，默认 id）单一数据源驱动。
> 5. 序号列跨页连续：(page-1)*pageSize + index + 1。
> 6. 搜索表单 schema 驱动：fields 数组按 type 映射 input/select/date/daterange/switch/number-range，
>    全部 v-model 绑统一 values 对象；内部值是 initial 的深拷贝（reset 用 cloneDeep 回拷），
>    父组件对 initial 的变更走 merge；number-range 字段渲染前做结构归一化（值必须是
>    {startValue, endValue}，否则 v-model 绑 undefined 属性直接崩渲染）。
> 7. 分页状态由父组件持有：page/pageSize props + page-change 事件；搜索条件变化必须重置 page=1。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/query-table/src/`；本机路径
> `C:/Users/Maxkim/Desktop/frontend-patterns/packages/query-table/src/`
