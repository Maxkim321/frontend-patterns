# 查询表格封装

## 在线 Demo

<ClientOnly>
<QueryTableDemo />
</ClientOnly>

> 查询表单 + 表格 + 分页全部由配置驱动：切换「繁育数据管理 / 订单管理」两套业务，
> 同一个组件零改动。源自真实项目（deepblup3.0 畜牧数据后台）SearchTable / DataTable 的提炼。

## 决策层（为什么要 schema 驱动）

30 个长得一样的列表页，手写 = 30 份重复样板。**封装的边界是"结构"而不是"内容"**——
有哪些控件、哪些列、行上有哪些操作，全是数据（配置），组件不含任何业务字段名。

## 结论

三件套（`packages/query-table/src/`）：

| 组件 | 职责 |
|---|---|
| `SearchForm.vue` | fields 数组 → 六种控件映射；reset 回 initial 深拷贝 |
| `QueryTable.vue` | columns 数组 → text（formatter + 空值兜底）/ btn（行级权限）列 + 分页 |
| `types.ts` | 全部配置类型，业务方写配置即有提示 |

## 原理讲解

### schema → 控件映射

`v-for fields` + `v-if type` 分发控件，全部绑到同一个 `values[field.name]`。
把"写模板"变成"写数据"：新增搜索字段 = 数组加一个对象。低代码表单的最小可用形态。

### 行级按钮 = 轻量权限模型

操作列渲染「列上按钮集合 ∩ row.btns 声明的动作」。后端按行下发可用操作，
前端不写 if/else，权限收敛到数据侧。

### 重置为什么必须 cloneDeep

内部值是 initial 的深拷贝——否则清空输入会同步污染父组件的默认参数；
父组件回填联动参数走 merge 不走覆盖，否则冲掉用户正在输入的内容。

## 坑（真实项目踩过）

- **reset 不深拷贝** → 污染父组件默认参数
- **区间控件初值必须是对象**：number-range 的 v-model 绑 `values[name].startValue`，
  初值为 undefined 时渲染直接 TypeError、整棵组件树挂掉（只在 console 报错）——组件内已做归一化
- **父组件回填用覆盖** → 冲掉用户正在编辑的字段，必须 merge
- **el-select 滚动不收起**：浮层挂 body，在主滚动容器监听 scroll 后对 select 强制 blur()
- **查询条件变了不回第 1 页** → 第 5 页改搜索词可能落在空页
- **列 key 用 index** → 动态增删列时错位，用 prop
- **空值直接渲染** → 封装里统一兜底 '—— ——'
- **daterange 绑数组、number-range 绑 {startValue,endValue}** → 提交前做参数转换

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `fields[].type` | input | input/select/date/daterange/switch/number-range |
| `initial` | {} | 表单初始值，reset 回到这里 |
| `columns[].type` | text | text / btn |
| `row.btns` | 无 | 行数据声明的可用操作 |
| `showIndex` / `showSelection` | false | 序号 / 多选列 |
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
