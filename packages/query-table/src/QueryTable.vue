<template>
  <div class="qf-table">
    <el-table
      v-loading="loading"
      ref="multipleTableRef"
      :data="initData"
      style="width: 100%"
      :row-key="rowKey"
      :show-overflow-tooltip="showTooltip"
      :header-cell-style="{ height: cellHeight }"
      :cell-style="{ height: cellHeight }"
      :max-height="maxHeight"
      :height="height"
      @selection-change="handleSelectionChange"
    >
      <!-- 多选列：reserve-selection 跨页保留勾选，依赖写死的 row-key = row.id -->
      <el-table-column
        v-if="isSelection"
        type="selection"
        :selectable="selectFn"
        :reserve-selection="true"
        align="center"
        width="90"
      />

      <!-- 单选列：checkbox 样式，@click.prevent.stop 阻断 el-checkbox 自带翻转，由 check 单一数据源驱动 -->
      <el-table-column v-if="isRadio" width="55">
        <template #default="{ row }">
          <el-checkbox
            v-model="row.check"
            class="radio-checkbox"
            @click.prevent.stop="changeRadio(row)"
          />
        </template>
      </el-table-column>

      <!-- 序号列：跨页连续，(page-1)*size + $index + 1 -->
      <el-table-column v-if="isSort" label="序号" type="index" align="left" width="80">
        <template #default="scope">
          <span>{{ computedIndex(scope.$index) }}</span>
        </template>
      </el-table-column>

      <el-table-column
        v-for="item in tableHeader"
        :key="item.prop"
        :type="item.type"
        :prop="item.prop"
        :label="item.label"
        :min-width="item.minWidth"
        :width="item.width"
        :fixed="item.fixed"
        :align="item.align || 'left'"
        :show-overflow-tooltip="item.showOverflowTooltip"
      >
        <!-- 表头插槽：插槽名 = `${prop}-header`，:column 递出 el-table 列实例 -->
        <template #header="scope">
          <slot
            v-if="item.isHeadSlot"
            :name="item.prop ? item.prop + '-header' : 'default'"
            :column="scope.column"
          />
          <div v-else>{{ item.label }}</div>
        </template>

        <!-- 内容插槽：插槽名 = prop，作用域 { row, value }；未开启则兜底渲染 -->
        <template #default="scope">
          <slot
            v-if="item.isSlot"
            :name="item.prop ? item.prop : 'default'"
            :row="scope.row"
            :value="scope.row[item.prop]"
          />
          <div v-else class="qt-table-cell">{{ scope.row[item.prop] }}</div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页（半受控）：内部 page/size 镜像 props（watchEffect 同步），翻页/改尺寸只 emit 给父组件发请求 -->
    <div v-show="!noPage && total" class="qf-pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        :page-sizes="pageSizes ?? [5, 10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handleCurrentChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'
import type { Header } from './types'

/**
 * 配置驱动 + 插槽外放的表格（实习项目 QaTable 的去业务化沉淀）：
 *
 * 1. 插槽外放：列配置 isSlot / isHeadSlot 后，渲染权交给业务方，插槽名 = 列 prop
 *    （表头 = `${prop}-header`）。组件不预判任何业务形态（金额/状态/操作……），
 *    业务方 <template #amount="{ row }"> 自由渲染。
 * 2. 跨页勾选：reserve-selection 写死开启，依赖 row-key = row.id
 *    （后台表都有 id）；没有稳定 id 的表不能开多选。
 * 3. 受控勾选：selectRows 由父组件持有，watch 回填 toggleRowSelection；
 *    clearSelectionFn 通过 defineExpose 提供给父组件（如删除后清空）。
 * 4. 单选列：el-checkbox 自带点击翻转，外层 @click.prevent.stop 阻断后由组件
 *    单一数据源（check 字段全表翻转）驱动，避免"点一下翻转两次"。
 * 5. 序号跨页连续：(page-1) * size + $index + 1。
 * 6. 分页半受控：内部 page/size 镜像 props.currentPage/pageSize（watchEffect 同步），
 *    翻页/改尺寸 emit changePage/changeSize，由父组件发请求回流 tableData/total——
 *    搜索条件变化时父组件把 currentPage 拨回 1，页面跟着回 1。
 */
type Obj = Record<string, any>

const props = withDefaults(
  defineProps<{
    tableHeader: Header[] // 列配置
    tableData: Obj[] // 表格数据
    selectRows?: Obj[] // 选中行（受控，父组件持有）
    total?: number // 总条数
    currentPage?: number // 当前页
    pageSize?: number // 每页条数
    maxHeight?: string // 最大高度
    height?: string // 高度
    noPage?: boolean // 是否关闭分页
    isSort?: boolean // 序号列开关
    loading?: boolean // 是否加载中
    showTooltip?: boolean // 溢出 tooltip 全文
    isSelection?: boolean // 多选列开关
    isRadio?: boolean // 单选列开关
    /** 多选行禁用函数（返回 false 的行不可勾选） */
    selectFn?: (row: Obj) => boolean
    /** 单选行唯一键字段，默认 'id' */
    radioParam?: string
    /** 单元格高度 */
    cellHeight?: string
    /** 每页条数选项 */
    pageSizes?: number[]
  }>(),
  {
    selectRows: undefined,
    total: 0,
    currentPage: 1,
    pageSize: 10,
    isSort: false,
    isSelection: false,
    isRadio: false,
    radioParam: 'id',
    selectFn: () => true,
    showTooltip: true,
    cellHeight: '58px',
    pageSizes: undefined,
  }
)

const emits = defineEmits<{
  (e: 'changeSize', val: number): void
  (e: 'changePage', val: number): void
  (e: 'changeSelection', selection: Obj[]): void
  (e: 'changeRadio', row: Obj): void
}>()

const multipleTableRef = ref()
const rowKey = (row: Obj) => row.id

// 单选模式给每行补 check 字段（单一数据源），tableData 变化即重建
const initData = ref<Obj[]>()
watch(
  () => props.tableData,
  () => {
    initData.value = props.isRadio
      ? props.tableData.map(item => ({ ...item, check: false }))
      : props.tableData
  },
  { immediate: true, deep: true }
)

// 受控勾选回填：父组件 selectRows 变化 → 同步到表格
watch(
  () => props.selectRows,
  () => {
    if (props.selectRows?.length) {
      props.selectRows.forEach(row => multipleTableRef.value!.toggleRowSelection(row, undefined))
    } else {
      multipleTableRef.value!.clearSelection()
    }
  },
  { deep: true }
)

// 分页内部镜像，props 变化（如搜索后拨回第 1 页）时同步
const page = ref<number>(1)
const size = ref<number>(10)
watchEffect(() => {
  page.value = props.currentPage
  size.value = props.pageSize
})

const handleSelectionChange = (selection: Obj[]) => emits('changeSelection', selection)
const handleSizeChange = (val: number) => emits('changeSize', val)
const handleCurrentChange = (val: number) => emits('changePage', val)

// 计算跨页连续序号
const computedIndex = (val: number) => (page.value - 1) * size.value + val + 1

// 单选：阻断原生翻转后手动全表翻转 check（其他行置 false、当前行取反）
const changeRadio = (row: Obj) => {
  multipleTableRef.value!.setCurrentRow(row)
  initData.value = initData.value!.map((item: Obj) => {
    if (item[props.radioParam] !== row[props.radioParam]) {
      item.check = false
    } else {
      item.check = !row.check
    }
    return item
  })
  emits('changeRadio', row)
}

/** 供父组件清空勾选（删除/重置后调用） */
const clearSelectionFn = () => {
  multipleTableRef.value!.clearSelection()
}
defineExpose({ clearSelectionFn })
</script>

<style scoped>
.qt-table-cell {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qf-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 32px;
}
</style>
