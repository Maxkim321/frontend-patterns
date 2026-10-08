---
场景: 后台管理系统的列表页（搜索区 + 表格 + 分页），几十个页面长一个样、只有字段和列不同
技术: Vue3 + Element Plus + schema 驱动配置
标签: 表格, 表单, 组件封装, ElementPlus, 后台系统
更新时间: 2026-09-19
---

# 查询表格封装

源自真实项目（deepblup3.0 畜牧数据管理后台）的 SearchTable / DataTable 组件提炼，去掉了业务与设计系统耦合。

## 决策层（为什么要 schema 驱动）

后台系统 30 个列表页，手写每页意味着 30 份重复的 `<el-form>` + `<el-table>` + `<el-pagination>` 样板，改一次空值样式要改 30 处。

| 方案 | 评价 | 什么时候选 |
|---|---|---|
| 每页手写 | 灵活但重复劳动巨大、样式漂移 | 只有 2~3 个页面 |
| **schema 驱动封装**（本方案） | 一个字段对象 = 一个控件，一列对象 = 一列；样板归零，样式收敛 | 列表页 > 5 个 ✅ |
| 直接上 ProComponents / avue | 能力全，但样式定制受限、学习成本 | 新项目且接受其设计语言 |

核心判断：**封装的边界是"结构"而不是"内容"**——搜索区有哪些控件、表格有哪些列、行上有哪些操作，全部是数据（配置）；拿到什么数据渲染什么界面，组件本身不含任何业务字段名。

## 结论

三件套（代码在 `src/`）：

- `SearchForm.vue` —— schema 驱动查询表单：`fields` 配置数组（input/select/date/daterange/switch/number-range 六种控件按 `type` 映射），`buttons` 配置动作，内置 search/reset 语义，reset 回到 `initial` 深拷贝
- `QueryTable.vue` —— 配置驱动表格 + 分页：`columns` 数组（text 列带 formatter 与空值兜底；btn 操作列的按钮集合配置在列上、**显隐由行数据 `row.btns` 决定**）
- `types.ts` —— 全部配置的类型定义，业务方写配置即有类型提示

业务方用法（demo 里的双业务切换就是两个配置对象）：

```vue
<SearchForm :fields="fields" :initial="initial" @action="onAction" />
<QueryTable :columns="columns" :rows="rows" :total="total"
  :page="page" :page-size="pageSize" @page-change="onPageChange"
  @row-action="onRowAction" />
```

## 原理讲解（关键机制）

### schema → 控件的映射

`v-for fields` + `v-if item.type` 分发到对应控件，每个控件 `v-model` 绑到同一个 `values[field.name]`。本质是**把"写模板"变成"写数据"**：新增一个搜索字段 = 往数组加一个对象，不动组件代码。这是低代码表单的最小可用形态。

### 行级按钮 = 轻量权限模型

操作列渲染的是「列上配置的按钮集合 ∩ 行数据 `row.btns` 声明的动作」。后端每行下发自己可用的操作名——状态是"待审核"的行才有 `audit` 按钮，前端不写 if/else，权限收敛到数据侧。换业务时按钮集合跟着配置走，组件零改动。

### 重置为什么必须 cloneDeep

表单内部值是 `initial` 的深拷贝。如果直接引用，用户清空输入会**同步改掉父组件的默认查询参数**（父组件下次打开弹窗预填就没了）；同理父组件后续对 `initial` 的变更是 **merge** 而不是覆盖——父组件常在查询后回填联动参数，覆盖会把用户正在输入的内容冲掉。

## 坑（真实项目踩过）

- **reset 不深拷贝**：清空输入直接污染父组件的默认参数（见上，原代码用 lodash `cloneDeep` 解决）
- **区间控件的初值必须是对象**：number-range 的 v-model 绑 `values[name].startValue`，
  初值若是 `undefined` 渲染时直接 TypeError、整棵组件树挂掉且只在 console 报错。
  封装内部要做结构归一化（渲染前保证 `{startValue, endValue}`），或业务方 initial 里预置该键
- **父组件回填参数用覆盖**：把用户正在编辑的其他字段冲掉，必须 merge
- **el-select 下拉在页面滚动时不收起**：下拉面板是挂在 body 的浮层，容器滚动它跟着跑。原项目的解法是在主滚动容器上监听 scroll，回调里把所有 select `blur()` 强制收起
- **查询条件变了不回第 1 页**：在第 5 页改搜索词，可能正好落在空页——业务方在 search 时必须重置 page=1
- **列 key 不稳定**：`el-table-column` 用 `prop` 做 key，用 index 会在列配置动态增删时错位
- **空值直接渲染**：接口返回 null 显示空白，统一兜底 `'—— ——'`（在封装里做，别散在各页面）
- **日期范围值结构**：daterange 绑定的是数组 `[start, end]`、number-range 绑定 `{startValue, endValue}`——参数名提交前要做一层转换，别把组件内部结构直接丢给后端

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `fields[].type` | input | 六种控件映射 |
| `initial` | {} | 表单初始值/默认值，reset 回到这里 |
| `columns[].type` | text | text / btn |
| `columns[].formatter` | 无 | text 列展示转换 |
| `row.btns` | 无 | 行数据声明的可用操作（与列 btns 取交集渲染） |
| `showIndex` / `showSelection` | false | 序号列 / 多选列 |
| 分页 pageSizes | [10,20,50] | 尺寸切换 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要封装一个 Vue3 + Element Plus 的查询表格通用组件（搜索表单 + 表格 + 分页三件套），要求：
> 1. schema 驱动：SearchForm 接收 fields 数组（name/label/type，type 映射
>    input/select/date/daterange/switch/number-range 控件，v-model 绑统一 values 对象），
>    新增搜索字段只加配置不改组件；buttons 配置查询/重置/自定义动作。
> 2. 表单内部值是 initial 的深拷贝（reset 用 cloneDeep 回拷，绝不直接改父组件状态）；
>    父组件对 initial 的后续变更走 merge 合并进当前值。
> 3. QueryTable 接收 columns 数组：text 列带 formatter 与空值兜底 '—— ——'；
>    btn 操作列的按钮集合配置在列上，实际显隐由行数据 row.btns 数组决定（轻量行级权限），
>    点击 emit('row-action', {action, row})。
> 4. 分页状态由父组件持有：page/pageSize props + page-change 事件；
>    搜索条件变化时业务方必须把 page 重置为 1。
> 5. el-table-column 的 key 用 prop 不用 index；el-select 滚动不收起的坑
>    （浮层挂 body）可在主滚动容器监听 scroll 后对 select 做 blur()。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/query-table/src/`；本机路径
> `C:/Users/Maxkim/Desktop/frontend-patterns/packages/query-table/src/`
