<template>
  <div class="demo-wrap">
    <div class="demo-controls">
      <label>
        <input v-model="useWorker" type="checkbox" />
        使用 Web Worker 计算（重挂载生效）
      </label>
      <span class="demo-note">当前 {{ rowCount.toLocaleString() }} 行 · 模式：{{ useWorker ? '虚拟滚动 + Worker' : '虚拟滚动（主线程计算）' }}</span>
      <button type="button" @click="regenerate">重新生成数据</button>
    </div>

    <VirtualTable
      :key="useWorker ? 'worker' : 'main'"
      :source="source"
      :use-worker="useWorker"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import VirtualTable from './VirtualTable.vue'
import type { TableRow } from '../src/types'

const useWorker = ref(false)
const rowCount = 10000

const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安']
const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十']

function generate(count: number): TableRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${names[i % names.length]}${i}`,
    age: 18 + (i % 50),
    city: cities[i % cities.length],
    score: Math.round(Math.random() * 100),
  }))
}

const source = ref<TableRow[]>(generate(rowCount))

function regenerate() {
  source.value = generate(rowCount)
}
</script>

<style scoped>
.demo-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
}

.demo-note {
  color: #57606a;
}

.demo-controls button {
  padding: 6px 14px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #f6f8fa;
  cursor: pointer;
}
</style>
