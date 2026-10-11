<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PedigreeNode, TreeSlot } from './types.js'
import { buildLayers, sexLineHeight } from './layout.js'
import FamilyNode from './Node.vue'

/**
 * 家系树渲染 —— 按 deepblup3.0 系谱页（Genealogy.vue）的源机制实现：
 *
 * 布局：flex 横排 maxDepth 个"代"列（每列 flex:1），列内节点纵向 space-around
 * 均布在固定高度的容器上。数学保证上下代严格对齐：第 d 代第 i 槽的节点中线
 * 在容器高的 (i+0.5)/2^d 处，恰好是其两个亲本槽（下一代 2i、2i+1）中点的位置。
 *
 * 连线：节点自带半线拼接（Node.vue）——水平线宽 = (容器实测宽/代数 - 卡片宽)/2
 * （ResizeObserver 实测，源码同机制）；垂直线高 = 容器高/2^(depth+1)
 * （源码 2300px 下的 575/288/145/72 魔数即此通式的取整值）。
 *
 * 滚动：容器原生 overflow 滚动（源码同款，无 transform 缩放）。
 */
const props = withDefaults(
  defineProps<{
    nodes: PedigreeNode[]
    rootId: string
    maxDepth?: number
    /** 图形容器总高 px（源码为 2300 的整屏画布，这里默认收缩到文档可读尺寸） */
    height?: number
    boxWidth?: number
    boxHeight?: number
  }>(),
  { maxDepth: 5, height: 460, boxWidth: 150, boxHeight: 44 }
)

const scrollRef = ref<HTMLElement>()
const containerWidth = ref(0)
let observer: ResizeObserver | undefined

onMounted(() => {
  const el = scrollRef.value
  if (!el) return
  observer = new ResizeObserver((entries) => {
    containerWidth.value = entries[0]?.contentRect.width ?? 0
  })
  observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())

const nodeMap = computed(() => new Map(props.nodes.map((n) => [n.id, n])))
const layers = computed(() => buildLayers(props.rootId, nodeMap.value, props.maxDepth))

/** 水平半线长：(容器实测宽/代数 - 卡片宽)/2，负值兜底为 12（卡片贴边时） */
const lineWidth = computed(() =>
  Math.max(12, (containerWidth.value / props.maxDepth - props.boxWidth) / 2)
)

function nodeOf(slot: TreeSlot) {
  return slot.node ?? 'hide'
}
</script>

<template>
  <div ref="scrollRef" class="ft-scroll">
    <div class="ft-graph" :style="{ height: `${height}px` }">
      <div
        v-for="layer in layers"
        :key="`gen-${layer[0].depth}`"
        class="ft-generation"
      >
        <div
          v-for="slot in layer"
          :key="`slot-${slot.depth}-${slot.index}`"
          class="ft-slot"
        >
          <FamilyNode
            :data="nodeOf(slot)"
            :line-width="lineWidth"
            :sex-line-height="sexLineHeight(height, slot.depth)"
            :box-width="boxWidth"
            :box-height="boxHeight"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ft-scroll {
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafbfc;
}
/* flex 横排"代"列：源码 .graph-container 结构 */
.ft-graph {
  display: flex;
  min-width: 640px;
}
/* 每代一列：flex:1 等宽，纵向 space-around 均布（源码 .generation 结构） */
.ft-generation {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}
.ft-slot {
  display: flex;
  justify-content: center;
}
</style>
