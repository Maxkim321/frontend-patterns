<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PedigreeNode, TreeSlot } from './types.js'
import { buildLayers, buildSegments, slotWidthPercent } from './layout.js'

/**
 * 家系树渲染：自上而下的树形（根在上，逐代向下）+ html2canvas 截图导出。
 *
 * 布局：flex 双向——外层按代分行的槽位行内 flex 均分（每槽 100/2^depth%），
 * 连线是独立的绝对定位层（肘形三段：父底部 → 汇流线 → 各子顶部，
 * x 走百分比 y 走像素，见 layout.ts buildSegments）。
 * 空槽只占位不渲染，连线只画到实际存在的亲本。
 *
 * 交互：画布滚轮缩放（0.5~1.6 钳制）+ 按钮拖拽平移（transform，不触发重排）。
 * 截图：html2canvas 截整棵树 → 预览画布（滚轮缩放/拖拽/下载），截图前临时
 * 复位画布变换，保证导出的是完整未缩放的树。
 */
const props = withDefaults(
  defineProps<{
    nodes: PedigreeNode[]
    rootId: string
    maxDepth?: number
    rowHeight?: number
    boxHeight?: number
    /** 视口高度 px（画布在视口内缩放/平移） */
    viewportHeight?: number
    /** 是否显示"截图预览"按钮（html2canvas 导出） */
    showCapture?: boolean
  }>(),
  { maxDepth: 5, rowHeight: 96, boxHeight: 48, viewportHeight: 380, showCapture: true }
)

const nodeMap = computed(() => new Map(props.nodes.map((n) => [n.id, n])))
const layers = computed(() => buildLayers(props.rootId, nodeMap.value, props.maxDepth))
const segments = computed(() =>
  buildSegments(layers.value, { rowHeight: props.rowHeight, boxHeight: props.boxHeight })
)
const totalHeight = computed(() => layers.value.length * props.rowHeight + 24)

// ── 画布缩放/拖拽（transform，不触发重排） ──
const scale = ref(1)
const translate = ref({ x: 0, y: 0 })
const dragging = ref(false)
let start = { x: 0, y: 0 }

function onWheel(e: WheelEvent) {
  e.preventDefault()
  scale.value = Math.min(1.6, Math.max(0.5, scale.value + (e.deltaY < 0 ? 0.08 : -0.08)))
}
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

// ── html2canvas 截图导出 + 预览画布 ──
const showPreview = ref(false)
const capturing = ref(false)
const previewSrc = ref('')
const previewScale = ref(1)
const previewPos = ref({ x: 0, y: 0 })
let previewDragging = false
let previewStart = { x: 0, y: 0 }

async function capture() {
  const el = canvasRef.value
  if (!el || capturing.value) return
  capturing.value = true
  try {
    // 截图前复位画布变换，导出完整未缩放的树
    const { scale: s, translate: t } = { scale: scale.value, translate: translate.value }
    scale.value = 1
    translate.value = { x: 0, y: 0 }
    await new Promise((r) => requestAnimationFrame(r))
    // 动态引入：避免 SSR 构建期加载浏览器专用库
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fafbfc' })
    scale.value = s
    translate.value = t
    previewSrc.value = canvas.toDataURL('image/jpeg', 0.92)
    previewScale.value = 1
    previewPos.value = { x: 0, y: 0 }
    showPreview.value = true
  } finally {
    capturing.value = false
  }
}

function onPreviewWheel(e: WheelEvent) {
  e.preventDefault()
  previewScale.value = Math.min(3, Math.max(0.2, previewScale.value + (e.deltaY < 0 ? 0.1 : -0.1)))
}

function onPreviewDown(e: PointerEvent) {
  previewDragging = true
  previewStart = { x: e.clientX - previewPos.value.x, y: e.clientY - previewPos.value.y }
  window.addEventListener('pointermove', onPreviewMove)
  window.addEventListener('pointerup', onPreviewUp)
}

function onPreviewMove(e: PointerEvent) {
  if (!previewDragging) return
  previewPos.value = { x: e.clientX - previewStart.x, y: e.clientY - previewStart.y }
}

function onPreviewUp() {
  previewDragging = false
  removePreviewDragListeners()
}

function removePreviewDragListeners() {
  window.removeEventListener('pointermove', onPreviewMove)
  window.removeEventListener('pointerup', onPreviewUp)
}

function closePreview() {
  showPreview.value = false
  removePreviewDragListeners()
}

function download() {
  // data: URL 的 <a download> 在部分 webview 被静默拦截；转 Blob + object URL 兼容性更好，
  // 仍不生效时（无下载管理器的内嵌浏览器）用户可右键预览图"另存为"
  try {
    const [meta, b64] = previewSrc.value.split(',')
    const mime = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'family-tree.jpg'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } catch {
    const w = window.open()
    w?.document.write(`<img src="${previewSrc.value}" alt="family-tree" />`)
  }
}

const canvasRef = ref<HTMLElement>()

onBeforeUnmount(() => removePreviewDragListeners())
</script>

<template>
  <div class="ft-wrap">
    <div
      class="ft-viewport"
      :class="{ 'ft-viewport--dragging': dragging }"
      :style="{ height: `${viewportHeight}px` }"
      @wheel="onWheel"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointerleave="onUp"
    >
      <div
        ref="canvasRef"
        class="ft-canvas"
        :style="{
          height: `${totalHeight}px`,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        }"
      >
        <!-- 绝对定位连线层（肘形三段，x% + ypx） -->
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

        <!-- 节点层：自上而下，每代一行，行内槽位 flex 均分 -->
        <div
          v-for="layer in layers"
          :key="`gen-${layer[0].depth}`"
          class="ft-row"
          :style="{ top: `${layer[0].depth * rowHeight}px`, height: `${rowHeight}px` }"
        >
          <div
            v-for="slot in layer"
            :key="`slot-${slot.depth}-${slot.index}`"
            class="ft-slot"
            :style="{ width: `${slotWidthPercent(slot.depth)}%` }"
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
        </div>
      </div>
    </div>

    <button v-if="showCapture" type="button" class="ft-capture" :disabled="capturing" @click="capture">
      {{ capturing ? '截图中…' : '截图预览' }}
    </button>

    <!-- 截图预览：滚轮缩放（0.2~3 钳制）+ 拖拽平移 -->
    <div v-if="showPreview" class="ft-preview" @wheel="onPreviewWheel">
      <div class="ft-preview__bar">
        <span>截图预览（滚轮缩放 · 拖拽平移 · 下载被拦截时右键图片另存为）</span>
        <div class="ft-preview__ops">
          <button type="button" @click="download">下载 JPEG</button>
          <button type="button" @click="closePreview">关闭</button>
        </div>
      </div>
      <div class="ft-preview__stage" @pointerdown="onPreviewDown">
        <img
          :src="previewSrc"
          :style="{
            transform: `translate(${previewPos.x}px, ${previewPos.y}px) scale(${previewScale})`,
          }"
          alt="家系树截图"
          draggable="false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ft-wrap {
  position: relative;
}
.ft-viewport {
  position: relative;
  overflow: hidden;
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
/* 每代一行：行内槽位 flex 均分（flex 双向布局的内层行） */
.ft-row {
  position: absolute;
  left: 0;
  width: 100%;
  display: flex;
}
.ft-slot {
  flex: none;
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

.ft-capture {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
.ft-capture:disabled {
  opacity: 0.6;
  cursor: wait;
}

.ft-preview {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: rgba(13, 17, 23, 0.75);
}
.ft-preview__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  color: #e6edf3;
  font-size: 13px;
}
.ft-preview__ops button {
  margin-left: 8px;
  padding: 4px 12px;
  border: 1px solid #6e7681;
  border-radius: 6px;
  background: #21262d;
  color: #e6edf3;
  cursor: pointer;
  font-size: 12px;
}
.ft-preview__stage {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
}
.ft-preview__stage:active {
  cursor: grabbing;
}
.ft-preview__stage img {
  max-width: 88%;
  max-height: 88%;
  transform-origin: center center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  user-select: none;
}
</style>
