# 查询表格封装

## 在线 Demo

<ClientOnly>
<QueryTableDemo />
</ClientOnly>

> 源自本人实习期间公司项目（报价智能体 quotation-agent）中封装并落地使用的 QaTable，
> 去业务化沉淀。「报价单管理 / 问答管理」两套业务切换，同一组件零改动——金额标色、
> 状态标签、操作按钮全是业务方插槽（插槽名 = 列 prop），组件只管结构。
> 配套的查询表单 SearchForm 同源同风格：fields 数组按 type 映射六种控件。

## 决策层（为什么"配置 + 插槽"）

列表页之间差异最大的是**单元格渲染**——纯配置要么内置类型爆炸、要么不灵活。
本方案的平衡点：**组件管结构（表格/分页/勾选/序号），业务方管内容（插槽）**，
插槽名直接用列 prop，`<template #amount="{ row }">` 即可接管任意一列。

## 结论

三件套（`packages/query-table/src/`）：

| 组件 | 职责 |
|---|---|
| `QueryTable.vue` | tableHeader 定结构 + isSlot 外放渲染 + 跨页勾选/单选/跨页序号 + 内置分页 |
| `SearchForm.vue` | fields 数组 → 六种控件映射；reset 回 initial 深拷贝、父组件回填走 merge |
| `types.ts` | 全部配置类型（Header/SearchField 等） |

业务方用法：

```vue
<QueryTable :tableHeader="tableHeader" :tableData="rows" :total="total"
  :current-page="page" :page-size="pageSize"
  @change-page="onPageChange" @change-size="onSizeChange">
  <template #amount="{ row }">¥{{ row.amount.toLocaleString() }}</template>
  <template #operation="{ row }">…</template>
</QueryTable>
```

## 原理讲解

### 动态插槽：插槽名 = 列 prop

```
<slot v-if="item.isSlot" :name="item.prop" :row="scope.row" :value="scope.row[item.prop]" />
```

"哪列可定制"变成数据（isSlot 布尔），业务方 `#amount` / `#status` / `#operation`
与配置一一对应——结构复用与渲染自由的关键平衡。

### 跨页勾选：reserve-selection 依赖 row-key

没有稳定业务 id，跨页保留就是假的（翻回来勾选丢失或错行）。
本组件 row-key 取 `row.id`（后台表都有 id 的约定）；勾选状态受控
（selectRows 父组件持有，watch 回填），清空走 defineExpose 暴露的 clearSelectionFn。

### 单选列的 @click.prevent.stop

el-checkbox 自带点击翻转，外层再手动切 = 点一下翻转两次。
阻断原生行为后，由 check 字段单一数据源驱动（changeRadio 全表翻转：
其他行置 false、当前行取反），并 setCurrentRow 保持高亮同步。

### 分页半受控

组件内部 page/size 只是 props 的镜像（watchEffect 同步）：翻页/改尺寸只 emit
`changePage` / `changeSize`，由父组件发请求回流 tableData/total。搜索条件变化时
父组件把 currentPage 拨回 1，watchEffect 让页面跟着回 1——查询和翻页天然联动。

### 序号跨页连续

`(page-1) * pageSize + index + 1`，否则每页都从 1 开始。

## 坑

- **reserve-selection 没配 row-key** → 跨页勾选保留失效，两者必须成对出现
- **单选不复位原生行为** → 点一下翻转两次，必须 `@click.prevent.stop`
- **跨页序号直接用 type=index** → 每页都从 1 开始
- **受控回填注意 toggle 语义** → `toggleRowSelection` 第二参缺省是"切换"，重复回填会把已选行翻掉——回填前先 clear 再逐行 set true 更稳
- **查询条件变了不回第 1 页** → 可能落在空页
- **reset 不深拷贝** → 污染父组件默认参数
- **区间控件初值必须是对象** → number-range 的 v-model 绑 `values[name].startValue`，
  初值 undefined 直接 TypeError、整棵组件树挂掉（只在 console 报错），组件内已做归一化
- **父组件回填用覆盖** → 冲掉用户正在编辑的字段，必须 merge
- **el-select 滚动不收起** → 浮层挂 body，主滚动容器监听 scroll 后强制 blur()

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `tableHeader[].isSlot` | false | 内容插槽（名 = prop） |
| `tableHeader[].isHeadSlot` | false | 表头插槽（名 = `${prop}-header`） |
| `isSelection` / `isRadio` | false | 多选列 / 单选列 |
| `selectFn` | `() => true` | 多选行禁用函数 |
| `selectRows` | [] | 受控勾选（父组件持有） |
| `radioParam` | 'id' | 单选唯一键字段 |
| `isSort` | false | 序号列（跨页连续） |
| `noPage` | false | 关闭内置分页 |
| `cellHeight` | '58px' | 单元格高度 |
| `fields[].type` | input | 六种控件映射 |
| `initial` | {} | 表单初始值，reset 回到这里 |

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
> 下 `packages/query-table/src/`
