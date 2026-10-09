# 查询表格封装

## 在线 Demo

<ClientOnly>
<QueryTableDemo />
</ClientOnly>

> 源自洛阳智能体项目（quotation-agent 报价智能体）的 QaTable 提炼。
> 「报价单管理 / 问答管理」两套业务切换，同一组件零改动——金额标色、状态标签、操作按钮
> 全是业务方插槽（插槽名 = 列 prop），组件只管结构。

## 决策层（为什么"配置 + 插槽"）

列表页之间差异最大的是**单元格渲染**——纯配置要么内置类型爆炸、要么不灵活。
本方案的平衡点：**组件管结构（表格/分页/勾选/序号），业务方管内容（插槽）**，
插槽名直接用列 prop，`<template #amount="{ row }">` 即可接管任意一列。

## 结论

三件套（`packages/query-table/src/`）：

| 组件 | 职责 |
|---|---|
| `QueryTable.vue` | columns 定结构 + isSlot 外放渲染 + 跨页勾选/单选/跨页序号 + 内置分页 |
| `SearchForm.vue` | fields 数组 → 六种控件映射；reset 回 initial 深拷贝、父组件回填走 merge |
| `types.ts` | 全部配置类型 |

业务方用法：

```vue
<QueryTable :columns="columns" :rows="rows" :total="total"
  :page="page" :page-size="pageSize" @page-change="onPageChange">
  <template #amount="{ row }">¥{{ row.amount.toLocaleString() }}</template>
  <template #operation="{ row }">…</template>
</QueryTable>
```

## 原理讲解

### 动态插槽：插槽名 = 列 prop

```
<slot :name="col.prop" :row="scope.row" :value="scope.row[col.prop]" />
```

"哪列可定制"变成数据（isSlot 布尔），业务方 `#amount` / `#status` / `#operation`
与配置一一对应——结构复用与渲染自由的关键平衡。

### 跨页勾选：reserve-selection 依赖 row-key

没有稳定业务 id，跨页保留就是假的（翻回来勾选丢失或错行）。
配套：勾选受控（selectedRows 父组件持有，watch 回填），清空走 defineExpose。

### 单选列的 @click.prevent.stop

el-checkbox 自带点击翻转，外层再手动切 = 点一下翻转两次。
阻断原生行为后由单一数据源（选中行唯一键比对）驱动。

### 序号跨页连续

`(page-1) * pageSize + index + 1`，否则每页都从 1 开始。

## 坑

- **reserve-selection 没配 row-key** → 跨页勾选保留失效，两者必须成对出现
- **单选不复位原生行为** → 点一下翻转两次，必须 `@click.prevent.stop`
- **跨页序号直接用 type=index** → 每页都从 1 开始
- **reset 不深拷贝** → 污染父组件默认参数
- **区间控件初值必须是对象** → number-range 的 v-model 绑 `values[name].startValue`，
  初值 undefined 直接 TypeError、整棵组件树挂掉（只在 console 报错），组件内已做归一化
- **父组件回填用覆盖** → 冲掉用户正在编辑的字段，必须 merge
- **查询条件变了不回第 1 页** → 可能落在空页
- **el-select 滚动不收起** → 浮层挂 body，主滚动容器监听 scroll 后强制 blur()

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `columns[].isSlot` | false | 内容插槽（名 = prop） |
| `columns[].isHeadSlot` | false | 表头插槽（名 = `${prop}-header`） |
| `rowKey` | 无 | 跨页保留勾选必须提供 |
| `showSelection` / `showRadio` | false | 多选 / 单选列 |
| `radioParam` | 'id' | 单选唯一键字段 |
| `showIndex` | false | 序号列（跨页连续） |
| `fields[].type` | input | 六种控件映射 |
| `initial` | {} | 表单初始值 |

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
