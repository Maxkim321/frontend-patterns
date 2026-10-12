<template>
  <div class="ft-demo">
    <div class="ft-demo__toolbar">
      <el-button size="small" @click="removeGreatGrandparent">模拟亲本缺失（查看空位对齐）</el-button>
      <el-button size="small" @click="reset">还原数据</el-button>
    </div>
    <FamilyTree :nodes="nodes" root-id="p-0" :max-depth="4" :row-height="96" :box-height="48" :viewport-height="380" />
    <p class="ft-demo__tip">
      根节点在顶部，每行向下追溯一代亲本；每行槽位数固定为 2^depth（1/2/4/8），
      亲本缺失的槽位只占位不渲染——上下代严格对齐，连线为绝对定位的肘形三段线
      （父底部 → 汇流线 → 子顶部），只画到实际存在的亲本。
      画布支持滚轮缩放与拖拽平移；点右上角「截图预览」：html2canvas 截整棵树，
      预览里可缩放、拖拽、下载 JPEG。
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
