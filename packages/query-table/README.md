---
场景: 后台系统的列表页（搜索区 + 表格 + 分页），几十个页面长一个样、只有字段和列不同，且各页面的单元格渲染差异大（金额/状态标签/操作按钮）
技术: Vue3 + Element Plus + schema 驱动 + 动态插槽外放
标签: 表格, 表单, 组件封装, ElementPlus, 插槽, 后台系统
更新时间: 2026-10-18
---

# 查询表格封装

源自本人实习期间公司项目的真实封装——报价智能体（quotation-agent）中的 QaTable / PaginationBar，在系统管理（问答对/角色/用户/同义词库/日志）等多个页面落地使用，这里是**API 与公司原版对齐**的去业务化沉淀（tableHeader / tableData / isSlot / changePage / changeSize……）。**配置驱动结构、插槽外放渲染**。配套的查询表单 SearchForm 同源同风格——公司列表页搜索区当时是逐页手写的内联写法，SearchForm 是提炼时把它 schema 化的产物。

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

- `QueryTable.vue` —— 配置驱动表格 + 插槽外放（API 同公司原版 QaTable）：
  - `tableHeader` 配置结构（label/prop/type/width/minWidth/isHeadSlot/isSlot/align/fixed/showOverflowTooltip）
  - 列上开 `isSlot: true` → 内容插槽名 = `prop`，作用域 `{ row, value }`；`isHeadSlot: true` → 表头插槽名 = `${prop}-header`
  - 多选列 `reserve-selection` 跨页保留勾选，row-key 写死 `row.id`（公司约定后台表都有 id），`selectRows` 受控 + `clearSelectionFn` 暴露
  - 单选列（checkbox 样式，`radioParam` 指定唯一键，check 字段单一数据源）
  - 序号跨页连续：`(page-1) * pageSize + index + 1`（开关沿用公司原版命名 `isSort`）
  - 内置分页半受控（`noPage` 可关）：内部 page/size 镜像 props（watchEffect 同步），翻页/改尺寸 emit `changePage` / `changeSize`
- `SearchForm.vue` —— schema 驱动查询表单（提炼新增）：`fields` 数组按 `type` 映射六种控件（input/select/date/daterange/switch/number-range），内置 search/reset，reset 回 `initial` 深拷贝、父组件回填走 merge
- `types.ts` —— 全部配置类型（Header/SearchField 等），业务方写配置即有类型提示

业务方用法（demo 双业务切换 = 两套配置 + 各自的插槽模板）：

```vue
<QueryTable :tableHeader="tableHeader" :tableData="rows" :total="total"
  :current-page="page" :page-size="pageSize"
  @change-page="onPageChange" @change-size="onSizeChange">
  <!-- 插槽名 = 列 prop，完全接管该列渲染 -->
  <template #amount="{ row }">¥{{ row.amount.toLocaleString() }}</template>
  <template #operation="{ row }">…编辑/删除…</template>
</QueryTable>
```

## 原理讲解（关键机制）

### 动态插槽：插槽名 = 列 prop

`v-for tableHeader` 渲染 `el-table-column`，列上 `isSlot` 开启时列的默认插槽被转发：

```
<slot v-if="item.isSlot" :name="item.prop" :row="scope.row" :value="scope.row[item.prop]" />
```

Vue 的动态插槽名让"哪列可定制"变成**数据**（isSlot 布尔），业务方模板里 `#amount`、`#status`、`#operation` 与配置一一对应。未开启插槽的列走默认渲染（`qt-table-cell` 单行 ellipsis 截断）。这是"结构复用 + 渲染自由"的关键平衡点。

### 跨页勾选：reserve-selection 依赖 row-key

el-table 的 `reserve-selection` 让翻页后勾选保留——但它靠 `row-key` 识别"同一行"。**没有稳定业务 id，跨页保留就是假的**（翻回来勾选丢失或错行）。公司原版写死 `:row-key="row => row.id"` 并默认开启 reserve（后台表全有 id 的约定）；勾选状态受控（`selectRows` 由父组件持有，watch 回填 `toggleRowSelection`），清空通过 `defineExpose` 暴露 `clearSelectionFn` 给父组件。

### 单选列为什么要 @click.prevent.stop

用 el-checkbox 冒充单选：它自带点击翻转行为，外层再手动切一次就是"点一下翻转两次"。阻断原生行为（`@click.prevent.stop`）后由**单一数据源**驱动——initData 给每行补 `check: false` 字段，changeRadio 全表翻转（其他行置 false、当前行取反）并 `setCurrentRow` 保持高亮同步。

### 分页半受控

组件内部的 page/size 只是 props 的镜像（watchEffect 同步）：用户翻页/改尺寸时组件只 emit `changePage` / `changeSize`，由父组件发请求回流 `tableData` / `total`。搜索条件变化时父组件把 `currentPage` 拨回 1，watchEffect 让页面跟着回 1——**查询和翻页天然联动**，不会出现"第 5 页改搜索词落在空页"。

### schema → 控件映射

查询表单 `v-for fields` + `v-if type` 分发到对应控件，全部绑到同一个 `values[field.name]`。把"写模板"变成"写数据"：新增搜索字段 = 往数组加一个对象。

## 坑

- **reserve-selection 没配 row-key**：跨页勾选保留失效，翻页回来勾选全丢——两者必须成对出现
- **单选不复位原生行为**：el-checkbox 自带翻转 + 手动翻转 = 点一下翻转两次，必须 `@click.prevent.stop`
- **跨页序号直接用 type=index**：每页都从 1 开始，要按 `(page-1)*pageSize + index + 1` 算连续序号
- **受控回填用 toggle 语义**：公司原版 `toggleRowSelection(row, undefined)` 是"切换"而非"设为 true"，重复回填会翻转已选行——pattern 按原样保留并标注，重构时应先 clear 再逐行 set true
- **查询条件变了不回第 1 页**：在第 5 页改搜索词可能落在空页，search 时必须重置 page=1
- **reset 不深拷贝**：清空输入直接污染父组件的默认参数（用 lodash `cloneDeep` 回拷）
- **区间控件的初值必须是对象**：number-range 的 v-model 绑 `values[name].startValue`，初值若是 `undefined` 渲染时直接 TypeError、整棵组件树挂掉且只在 console 报错。封装内部要做结构归一化
- **父组件回填参数用覆盖**：把用户正在编辑的其他字段冲掉，必须 merge
- **el-select 滚动不收起**：下拉浮层挂在 body 上，在主滚动容器监听 scroll 后对 select 强制 `blur()`

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `tableHeader[].isSlot` | false | 开启内容插槽（插槽名 = prop） |
| `tableHeader[].isHeadSlot` | false | 开启表头插槽（插槽名 = `${prop}-header`） |
| `isSelection` / `isRadio` | false | 多选列 / 单选列 |
| `selectFn` | `() => true` | 多选行禁用函数（返回 false 不可勾选） |
| `selectRows` | [] | 受控勾选（父组件持有） |
| `radioParam` | 'id' | 单选行的唯一键字段 |
| `isSort` | false | 序号列（跨页连续；公司原版命名） |
| `noPage` | false | 关闭内置分页 |
| `cellHeight` | '58px' | 单元格高度 |
| `fields[].type` | input | 六种控件映射 |
| `initial` | {} | 表单初始值，reset 回到这里 |
| 分页 pageSizes | [5,10,20,50,100] | 尺寸切换 |

## 与公司原版的差异（诚实标注）

- 分页条用 `el-pagination` 替代公司内部的 `PaginationBar`（自研 391 行、带跳页输入），事件对齐为 `changePage` / `changeSize`（数字）
- 公司原版 `changeSelection` 事件签名带第二个 row 参数，但 el-table 的 `selection-change` 只回传 selection——pattern 修正为只发 selection
- 公司原版 `Header.fixed` 声明为 boolean、`width` 声明为 string，但视图里实际混传 `'right'` 和数字（esbuild 不做类型检查所以没报错）——pattern 按运行时真值放宽为 `boolean | 'left' | 'right'` 与 `string | number`
- SearchForm 为提炼新增：公司列表页搜索区是页面内联写法，pattern 将其 schema 化
- 删除公司版未使用的 props（`rows` 冗余别名）、未使用的 `selection` 中间变量等死代码

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要封装一个 Vue3 + Element Plus 的查询表格通用组件（表格 + 分页，配套 schema 搜索表单），要求：
> 1. 表格结构配置驱动：tableHeader 数组（label/prop/type/width/minWidth/isHeadSlot/isSlot/align/fixed/showOverflowTooltip）。
> 2. 渲染通过插槽外放：列配置 isSlot: true 后内容插槽名 = 列 prop、作用域 { row, value }，
>    isHeadSlot: true 后表头插槽名 = `${prop}-header`；未开启插槽的列默认渲染（ellipsis 单行截断）。
>    组件管结构（表格骨架/分页/勾选/序号），业务方管内容。
> 3. 多选列 reserve-selection 跨页保留勾选，row-key 写死 row.id（后台表都有 id）；
>    勾选受控（selectRows 由父组件持有，watch 回填 toggleRowSelection，
>    defineExpose clearSelectionFn 供父组件清空）。
> 4. 单选列用 el-checkbox 冒充，外层 @click.prevent.stop 阻断其自带翻转，
>    initData 给每行补 check 字段，changeRadio 全表翻转（其他行 false、当前行取反）+ setCurrentRow。
> 5. 序号列跨页连续：(page-1)*pageSize + index + 1。
> 6. 分页半受控：内部 page/size 用 watchEffect 镜像 props.currentPage/pageSize，
>    翻页/改尺寸 emit changePage/changeSize（数字），父组件发请求回流；
>    搜索条件变化必须把 currentPage 拨回 1。
> 7. 搜索表单 schema 驱动：fields 数组按 type 映射 input/select/date/daterange/switch/number-range，
>    全部 v-model 绑统一 values 对象；内部值是 initial 的深拷贝（reset 用 cloneDeep 回拷），
>    父组件对 initial 的变更走 merge；number-range 字段渲染前做结构归一化。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/query-table/src/`；本机路径
> `C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/query-table/src/`
