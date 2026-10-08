<template>
  <div class="qf-table">
    <el-table
      v-loading="loading"
      :data="rows"
      :border="border"
      stripe
      :row-key="rowKey"
      style="width: 100%"
      @selection-change="(rs: Record<string, unknown>[]) => emit('selection-change', rs)"
    >
      <el-table-column v-if="showSelection" type="selection" width="44" align="center" />
      <el-table-column v-if="showIndex" type="index" label="序号" width="60" align="center" />

      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :min-width="col.minWidth"
        :fixed="col.fixed"
        :show-overflow-tooltip="col.showTooltip"
        align="center"
      >
        <!-- 文本列：formatter + 空值兜底 -->
        <template v-if="col.type !== 'btn'" #default="{ row }">
          <span>{{ col.formatter ? col.formatter(row) : (row[col.prop] ?? '—— ——') }}</span>
        </template>

        <!-- 操作列：可渲染按钮集合配置在列上，显隐由行数据 row.btns 决定 -->
        <template v-else #default="{ row }">
          <el-button
            v-for="btn in col.btns ?? []"
            :key="btn.name"
            :type="btn.type"
            :plain="btn.plain"
            size="small"
            link
            @click="emit('row-action', { action: btn.name, row })"
          >
            {{ btn.label }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 0" class="qf-pagination">
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="(p: number) => emit('page-change', { page: p, pageSize })"
        @size-change="(s: number) => emit('page-change', { page: 1, pageSize: s })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QueryColumn } from './types'

/**
 * 配置驱动的表格 + 分页。设计要点（源自真实项目 DataTable 的提炼）：
 * 1. 操作列的按钮显隐由【行数据】决定（row.btns 数组声明这一行有哪些动作），
 *    按钮集合配置在列上——两者交集才渲染。这等价于一个轻量的行级权限模型：
 *    后端下发每行的可用操作，前端不硬编码 if/else。
 * 2. 文本列统一空值兜底 '—— ——'，formatter 只做展示转换。
 * 3. 分页状态由父组件持有（page/pageSize + page-change 事件），
 *    查询参数变化时父组件负责把 page 重置为 1。
 */
defineProps<{
  columns: QueryColumn[]
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  loading?: boolean
  border?: boolean
  rowKey?: string
  showSelection?: boolean
  showIndex?: boolean
}>()

const emit = defineEmits<{
  'page-change': [p: { page: number; pageSize: number }]
  'row-action': [a: { action: string; row: Record<string, unknown> }]
  'selection-change': [rows: Record<string, unknown>[]]
}>()
</script>

<style scoped>
.qf-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 4px;
}
</style>
