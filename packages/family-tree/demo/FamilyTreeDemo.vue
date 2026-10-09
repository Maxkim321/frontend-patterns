<template>
  <div class="ft-demo">
    <div class="ft-demo__toolbar">
      <el-tag size="small">滚轮缩放 / 按住拖拽</el-tag>
      <el-button size="small" @click="removeGreatGrandparent">模拟亲本缺失（查看空位对齐）</el-button>
      <el-button size="small" @click="reset">还原数据</el-button>
    </div>
    <FamilyTree :nodes="nodes" root-id="p-0" :max-depth="4" :row-height="96" :box-height="48" />
    <p class="ft-demo__tip">
      根节点是目标个体，每层向上追溯一代亲本；每代槽位数固定为 2^depth（1/2/4/8），
      亲本缺失的槽位只占位不渲染——上下代节点严格对齐，连线只画到实际存在的亲本。
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FamilyTree } from '../src/index.js'
import type { PedigreeNode } from '../src/index.js'

/**
 * 种猪系谱示例：fatherId / motherId 指向上一代（祖先方向）。
 * 第 3 代故意缺一部分亲本记录，用于演示空位补齐。
 */
const baseNodes: PedigreeNode[] = [
  { id: 'p-0', name: '长白 308', sex: 'male', fatherId: 'p-1', motherId: 'p-2' },
  { id: 'p-1', name: '杜洛克 101', sex: 'male', fatherId: 'p-3', motherId: 'p-4' },
  { id: 'p-2', name: '长白 205', sex: 'female', fatherId: 'p-5', motherId: 'p-6' },
  { id: 'p-3', name: '杜洛克 77', sex: 'male', fatherId: 'g-1', motherId: 'g-2' },
  { id: 'p-4', name: '大约克 12', sex: 'female' },
  { id: 'p-5', name: '皮特兰 9', sex: 'male', fatherId: 'g-3' },
  { id: 'p-6', name: '长白 33', sex: 'female' },
  { id: 'g-1', name: '杜洛克 51', sex: 'male' },
  { id: 'g-2', name: '杜洛克 66', sex: 'female' },
  { id: 'g-3', name: '皮特兰 21', sex: 'male' },
]

const nodes = ref<PedigreeNode[]>(structuredClone(baseNodes))

function removeGreatGrandparent() {
  nodes.value = nodes.value.filter((n) => !['g-1', 'g-2'].includes(n.id))
}
function reset() {
  nodes.value = structuredClone(baseNodes)
}
</script>

<style scoped>
.ft-demo__toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.ft-demo__tip {
  font-size: 12px;
  color: #6b7280;
  margin-top: 10px;
}
</style>
