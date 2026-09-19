<template>
  <div class="vt">
    <div class="vt-toolbar">
      <input v-model="keyword" class="vt-search" placeholder="搜索关键词（如城市/名字）" />
      <span class="vt-meta">共 {{ total }} 行 · 已选 {{ selectedCount }}</span>
      <span v-if="useWorker && workerFallback" class="vt-fallback">Worker 不可用，已回退主线程</span>
    </div>

    <div class="vt-header">
      <div class="vt-cell vt-check">
        <input type="checkbox" :checked="isAllSelected" @change="toggleAll" />
      </div>
      <div
        v-for="col in columns"
        :key="col.key"
        class="vt-cell"
        :class="{ sortable: col.sortable }"
        :style="{ width: col.width + 'px' }"
        @click="col.sortable && sortBy(col.key)"
      >
        {{ col.label }}
        <span v-if="col.sortable" class="vt-sort">
          {{ sortField === col.key ? (sortOrder === 'asc' ? '▲' : '▼') : '↕' }}
        </span>
      </div>
    </div>

    <div class="vt-viewport" :style="{ height: viewportHeight + 'px' }" @scroll="onScroll">
      <div class="vt-spacer" :style="{ height: totalHeight + 'px' }">
        <div class="vt-rows" :style="{ transform: `translateY(${offsetY}px)` }">
          <div
            v-for="row in visibleRows"
            :key="row.id"
            class="vt-row"
            :style="{ height: rowHeight + 'px' }"
          >
            <div class="vt-cell vt-check">
              <input
                type="checkbox"
                :checked="isSelected(row.id)"
                @change="toggleRow(row.id)"
              />
            </div>
            <div
              v-for="col in columns"
              :key="col.key"
              class="vt-cell"
              :style="{ width: col.width + 'px' }"
            >
              {{ row[col.key] }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useBigDataTable } from '../src/index'
import type { TableRow } from '../src/types'

const props = withDefaults(
  defineProps<{
    source: TableRow[]
    useWorker?: boolean
    rowHeight?: number
    viewportHeight?: number
    buffer?: number
  }>(),
  {
    useWorker: false,
    rowHeight: 40,
    viewportHeight: 560,
    buffer: 20,
  }
)

const columns = [
  { key: 'id', label: 'ID', width: 90 },
  { key: 'name', label: '名称', width: 200 },
  { key: 'age', label: '年龄', width: 100, sortable: true },
  { key: 'city', label: '城市', width: 160 },
  { key: 'score', label: '分数', width: 120, sortable: true },
]

const {
  keyword,
  sortField,
  sortOrder,
  sortBy,
  total,
  visibleRows,
  onScroll,
  totalHeight,
  offsetY,
  workerFallback,
  selectedCount,
  isSelected,
  toggleRow,
  toggleAll,
  isAllSelected,
} = useBigDataTable(toRef(props, 'source'), {
  rowHeight: props.rowHeight,
  viewportHeight: props.viewportHeight,
  buffer: props.buffer,
  useWorker: props.useWorker,
})
</script>

<style scoped>
.vt {
  font-size: 14px;
  color: #1f2328;
  border: 1px solid #e3e6ea;
  border-radius: 8px;
  overflow: hidden;
}

.vt-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f6f8fa;
  border-bottom: 1px solid #e3e6ea;
}

.vt-search {
  padding: 6px 10px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  width: 240px;
}

.vt-meta {
  color: #57606a;
}

.vt-fallback {
  color: #9a6700;
  background: #fff8c5;
  border: 1px solid #d4a72c66;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
}

.vt-header,
.vt-row {
  display: flex;
  align-items: center;
}

.vt-header {
  background: #f6f8fa;
  border-bottom: 1px solid #e3e6ea;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.vt-header .vt-cell {
  border-right: 1px solid #e3e6ea;
}

.vt-cell {
  flex: none;
  padding: 0 12px;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 40px;
  line-height: 40px;
}

.vt-check {
  width: 44px;
}

.vt-sort {
  color: #0969da;
  font-size: 11px;
}

.vt-header .sortable {
  cursor: pointer;
  user-select: none;
}

.vt-viewport {
  overflow-y: auto;
  position: relative;
}

.vt-spacer {
  position: relative;
}

.vt-rows {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  will-change: transform;
}

.vt-row {
  border-bottom: 1px solid #eef0f2;
}

.vt-row:hover {
  background: #f6f8fa;
}
</style>
