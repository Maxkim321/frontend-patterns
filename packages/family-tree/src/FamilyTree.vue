<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PedigreeNode, TreeSlot } from './types.js'
import { buildLayers, buildSegments, slotWidthPercent } from './layout.js'

/**
 * 家系树渲染（纯 DOM/CSS）
 *
 * 布局：每代一行绝对定位（top = depth * rowHeight），行内槽位按百分比切分，
 * 节点卡片在槽位内水平居中；空位不渲染只留白。连接线是独立的绝对定位层。
 * 交互：滚轮缩放（transform: scale）+ 按钮拖拽（translate）。
 */
const props = withDefaults(
  defineProps<{
    nodes: PedigreeNode[]
    rootId: string
    maxDepth?: number
    rowHeight?: number
    boxHeight?: number
  }>(),
  { maxDepth: 5, rowHeight: 96, boxHeight: 48 }
)

const nodeMap = computed(() => new Map(props.nodes.map((n) => [n.id, n])))
const layers = computed(() => buildLayers(props.rootId, nodeMap.value, props.maxDepth))
const segments = computed(() =>
  buildSegments(layers.value, { rowHeight: props.rowHeight, boxHeight: props.boxHeight })
)
const totalHeight = computed(() => layers.value.length * props.rowHeight + 24)

const scale = ref(1)
function onWheel(e: WheelEvent) {
  e.preventDefault()
  scale.value = Math.min(1.6, Math.max(0.5, scale.value + (e.deltaY < 0 ? 0.08 : -0.08)))
}

const dragging = ref(false)
const translate = ref({ x: 0, y: 0 })
let start = { x: 0, y: 0 }
function onDown(e: PointerEvent) {
  dragging.value = true
  start = { x: e.clientX - translate.value.x, y: e.clientY - translate.value.y }
}
function onMove(e: PointerEvent) {
  if (!dragging.value) return
  translate.value = { x: e.clientX - start.x, y: e.clientY - start.y }
}
function onUp() {
  dragging.value = false
}

const isLastGen = (slot: TreeSlot) => slot.depth === layers.value.length - 1
</script>

<template>
  <div
    class="ft-viewport"
    :class="{ 'ft-viewport--dragging': dragging }"
    @wheel="onWheel"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointerleave="onUp"
  >
    <div
      class="ft-canvas"
      :style="{
        height: `${totalHeight}px`,
        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
      }"
    >
      <!-- 连接线层 -->
      <div
        v-for="(seg, i) in segments"
        :key="`seg-${i}`"
        class="ft-line"
        :class="`ft-line--${seg.orientation}`"
        :style="
          seg.orientation === 'vertical'
            ? { left: `${seg.x1}%`, top: `${seg.y1}px`, height: `${seg.y2 - seg.y1}px` }
            : { left: `${seg.x1}%`, width: `${seg.x2 - seg.x1}%`, top: `${seg.y1}px` }
        "
      />

      <!-- 节点层：每代一行 -->
      <template v-for="layer in layers" :key="`layer-${layer[0].depth}`">
        <div
          v-for="slot in layer"
          :key="`slot-${slot.depth}-${slot.index}`"
          class="ft-slot"
          :style="{
            top: `${slot.depth * rowHeight}px`,
            left: `${slot.index * slotWidthPercent(slot.depth)}%`,
            width: `${slotWidthPercent(slot.depth)}%`,
            height: `${rowHeight}px`,
          }"
        >
          <div
            v-if="slot.node"
            class="ft-node"
            :class="[`ft-node--${slot.node.sex}`, { 'ft-node--last': isLastGen(slot) }]"
            :style="{ height: `${boxHeight}px` }"
            @pointerdown.stop
          >
            {{ slot.node.name }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ft-viewport {
  position: relative;
  overflow: hidden;
  height: 340px;
  background: #fafbfc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: grab;
  touch-action: none;
}
.ft-viewport--dragging {
  cursor: grabbing;
}
.ft-canvas {
  position: absolute;
  top: 16px;
  left: 0;
  width: 100%;
  transform-origin: top center;
  transition: transform 0.05s linear;
}
.ft-line {
  position: absolute;
  background: #b8c6e0;
}
.ft-line--vertical {
  width: 1.5px;
}
.ft-line--horizontal {
  height: 1.5px;
}
.ft-slot {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  pointer-events: none;
}
.ft-node {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  max-width: 92%;
  padding: 0 10px;
  box-sizing: border-box;
  border-radius: 6px;
  font-size: 13px;
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: default;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ft-node--male {
  background: linear-gradient(135deg, #3d7bff, #165dff);
}
.ft-node--female {
  background: linear-gradient(135deg, #ff7d9c, #f56c8c);
}
.ft-node--last {
  outline: 1.5px dashed rgba(255, 255, 255, 0.55);
  outline-offset: -4px;
}
</style>
