<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PedigreeNode, TreeSlot } from './types.js'
import { buildLayers, sexLineHeight } from './layout.js'
import FamilyNode from './Node.vue'

/**
 * 家系树渲染 —— 按 deepblup3.0 系谱页（Genealogy.vue）的源机制实现：
 *
 * 布局：flex 双向布局——外层 flex 横排 maxDepth 个"代"列，列内纵向 space-around
 * 均布在固定高度的容器上（纯 HTML/CSS，无图库）。连线为绝对定位 div：
 * 节点自带半线拼接（Node.vue）——水平线宽 = (容器实测宽/代数 - 卡片宽)/2
 * （ResizeObserver 实测，源码同机制）；垂直线高 = 容器高/2^(depth+1)
 * （源码 2300px 下的 575/288/145/72 魔数即此通式的取整值）。
 *
 * 截图导出：html2canvas 截整棵树 → 预览画布支持滚轮缩放（0.2~3 钳制）与
 * 拖拽平移（对应源码的预览交互；源码的监听器泄漏与无边界缩放两个坑已修）。
 *
 * 滚动：容器原生 overflow 滚动（源码同款）。
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
    /** 是否显示"截图预览"按钮（html2canvas 导出） */
    showCapture?: boolean
  }>(),
  { maxDepth: 5, height: 460, boxWidth: 150, boxHeight: 44, showCapture: true }
)

const scrollRef = ref<HTMLElement>()
const graphRef = ref<HTMLElement>()
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
onBeforeUnmount(() => {
  observer?.disconnect()
  removePreviewDragListeners()
})

const nodeMap = computed(() => new Map(props.nodes.map((n) => [n.id, n])))
const layers = computed(() => buildLayers(props.rootId, nodeMap.value, props.maxDepth))

/** 水平半线长：(容器实测宽/代数 - 卡片宽)/2，负值兜底为 12（卡片贴边时） */
const lineWidth = computed(() =>
  Math.max(12, (containerWidth.value / props.maxDepth - props.boxWidth) / 2)
)

function nodeOf(slot: TreeSlot) {
  return slot.node ?? 'hide'
}

// ═══ html2canvas 截图导出 + 预览画布（缩放/拖拽）═══
const showPreview = ref(false)
const capturing = ref(false)
const previewSrc = ref('')
const previewScale = ref(1)
const previewPos = ref({ x: 0, y: 0 })
let previewDragging = false
let previewStart = { x: 0, y: 0 }

async function capture() {
  const el = graphRef.value
  if (!el || capturing.value) return
  capturing.value = true
  try {
    // 动态引入：避免 SSR 构建期加载浏览器专用库
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fafbfc' })
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
</script>

<template>
  <div class="ft-wrap">
    <div ref="scrollRef" class="ft-scroll">
      <div ref="graphRef" class="ft-graph" :style="{ height: `${height}px` }">
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
      <div
        class="ft-preview__stage"
        @pointerdown="onPreviewDown"
      >
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
.ft-scroll {
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafbfc;
}
/* flex 双向布局：外层行（代列）× 内层列（代内节点）——源码 .graph-container 结构 */
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
