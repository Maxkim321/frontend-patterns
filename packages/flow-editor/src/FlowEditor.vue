<template>
  <div class="fe" :style="{ height: height + 'px' }">
    <!-- 物料面板：业务方通过 materials 配置，编辑器不感知业务语义 -->
    <aside class="fe-palette">
      <div class="fe-palette-title">物料</div>
      <div
        v-for="m in materials"
        :key="m.type"
        class="fe-material"
        draggable="true"
        @dragstart="dnd.onDragStart($event, m)"
      >
        <span class="fe-dot" :style="{ background: colorOf(m.category) }" />
        <div class="fe-m-text">
          <div class="fe-m-label">{{ m.label }}</div>
          <div v-if="m.category" class="fe-m-cat">{{ m.category }}</div>
        </div>
      </div>
      <p class="fe-hint">拖入右侧画布</p>
    </aside>

    <!-- 画布：容器必须有确定高度，否则 VueFlow 高度为 0 白屏 -->
    <div class="fe-main">
      <div class="fe-toolbar">
        <button type="button" :disabled="!canUndo" title="撤销" @click="undo()">↩ 撤销</button>
        <button type="button" :disabled="!canRedo" title="重做" @click="redo()">↪ 重做</button>
        <button type="button" title="清空画布" @click="clearGraph()">清空</button>
        <button type="button" title="适配视图" @click="fitView({ padding: 0.2, duration: 200 })">适配</button>
        <span class="fe-count">{{ nodes.length }} 节点 · {{ edges.length }} 连线</span>
      </div>

      <div
        class="fe-canvas-wrap"
        :style="{ height: `calc(100% - ${toolbarHeight}px)` }"
        @drop="dnd.onDrop"
        @dragover="dnd.onDragOver"
      >
        <VueFlow
          :id="vueFlowId"
          v-model:nodes="nodes"
          v-model:edges="edges"
          :is-valid-connection="isValidConnection"
          :delete-key-code="['Backspace', 'Delete']"
          :min-zoom="0.3"
          :max-zoom="1.6"
          fit-view-on-init
        >
          <Background :gap="18" pattern-color="#e2e6ea" />

          <!-- 自定义业务节点：端口由 material.ports 配置驱动渲染 -->
          <template #node-business="p">
            <div class="fe-node" :style="{ '--fe-node-color': colorOf(p.data.category) }">
              <Handle
                v-for="(port, i) in p.data.ports?.inputs || []"
                :key="port.id"
                type="target"
                :id="port.id"
                :position="Position.Left"
                class="fe-handle"
                :style="{ top: handleOffset(i, p.data.ports.inputs.length) }"
              />
              <div class="fe-node-label">{{ p.data.label }}</div>
              <div v-if="p.data.category" class="fe-node-cat">{{ p.data.category }}</div>
              <Handle
                v-for="(port, i) in p.data.ports?.outputs || []"
                :key="port.id"
                type="source"
                :id="port.id"
                :position="Position.Right"
                class="fe-handle fe-handle-out"
                :style="{ top: handleOffset(i, p.data.ports.outputs.length) }"
              />
              <!-- 端口标签（如条件分支的「高置信/低置信」），与端口同偏移 -->
              <template v-for="(port, i) in p.data.ports?.outputs || []" :key="'pl-' + port.id">
                <span
                  v-if="port.label"
                  class="fe-port-label-out"
                  :style="{ top: handleOffset(i, p.data.ports.outputs.length) }"
                >{{ port.label }}</span>
              </template>
            </div>
          </template>
        </VueFlow>

        <!-- 连线校验失败的原因提示 -->
        <transition name="fe-fade">
          <div v-if="lastError" class="fe-error">{{ lastError }}</div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef, watch } from 'vue'
import { VueFlow, Handle, Position } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { useFlowEditor } from './useFlowEditor'
import type { EdgeValidator, FlowGraph, MaterialDef } from './types'

const props = withDefaults(
  defineProps<{
    /** 物料清单（响应式，业务切换直接换数组） */
    materials: MaterialDef[]
    /** 业务连线校验器 */
    validators?: EdgeValidator[]
    /** 初始图 */
    initialGraph?: FlowGraph
    /** 画布高度（容器必须有确定高度） */
    height?: number
  }>(),
  { height: 480 }
)

const emit = defineEmits<{
  /** 图发生变化（节点/边增删、拖拽结束） */
  change: [graph: FlowGraph]
}>()

const editor = useFlowEditor({
  materials: toRef(props, 'materials'),
  validators: toRef(props, 'validators'),
  initialGraph: props.initialGraph,
})

const { vueFlowId, nodes, edges, lastError, dnd } = editor
const undo = editor.undo
const redo = editor.redo
const canUndo = editor.canUndo
const canRedo = editor.canRedo
const clearGraph = editor.clearGraph
const fitView = editor.fitView

const toolbarHeight = 42

// 图变化的统一出口（业务方拿去自动保存 / 触发下游校验）
watch(
  () => JSON.stringify([nodes.value, edges.value]),
  () => emit('change', { nodes: nodes.value, edges: edges.value })
)

function colorOf(category?: string) {
  const map: Record<string, string> = {
    起止: '#8b8fa3',
    审批: '#0969da',
    AI: '#8250df',
    网关: '#b08800',
    输入: '#0969da',
    处理: '#8250df',
    输出: '#1a7f37',
  }
  return map[category ?? ''] ?? '#6e7781'
}

function handleOffset(index: number, total: number) {
  return `${((index + 1) / (total + 1)) * 100}%`
}

defineExpose({
  getGraphJSON: editor.getGraphJSON,
  loadGraph: editor.loadGraph,
})
</script>

<style scoped>
.fe {
  display: flex;
  border: 1px solid #e3e6ea;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.fe-palette {
  width: 168px;
  flex: none;
  border-right: 1px solid #e3e6ea;
  padding: 10px;
  overflow-y: auto;
  background: #f6f8fa;
}

.fe-palette-title {
  font-size: 12px;
  font-weight: 600;
  color: #57606a;
  margin-bottom: 8px;
}

.fe-material {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
  margin-bottom: 6px;
  cursor: grab;
  user-select: none;
}

.fe-material:active {
  cursor: grabbing;
}

.fe-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

.fe-m-label {
  font-size: 13px;
  line-height: 1.2;
}

.fe-m-cat {
  font-size: 11px;
  color: #8b949e;
}

.fe-hint {
  font-size: 11px;
  color: #8b949e;
  margin-top: 8px;
}

.fe-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fe-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid #e3e6ea;
  background: #f6f8fa;
}

.fe-toolbar button {
  padding: 3px 10px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.fe-toolbar button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.fe-count {
  margin-left: auto;
  font-size: 12px;
  color: #57606a;
}

.fe-canvas-wrap {
  position: relative;
}

.fe-node {
  position: relative;
  min-width: 120px;
  padding: 10px 14px;
  background: #fff;
  border: 1.5px solid var(--fe-node-color, #6e7781);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  font-size: 13px;
}

.fe-port-label-out {
  position: absolute;
  right: -52px;
  transform: translateY(-50%);
  width: 46px;
  font-size: 10px;
  line-height: 1.3;
  text-align: center;
  color: #0969da;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 3px;
  padding: 1px 2px;
  pointer-events: none;
}

.fe-node-label {
  font-weight: 600;
}

.fe-node-cat {
  font-size: 11px;
  color: #8b949e;
  margin-top: 2px;
}

.fe-node.selected {
  box-shadow: 0 0 0 2px #0969da55;
}

.fe-handle {
  width: 9px;
  height: 9px;
  background: var(--fe-node-color, #6e7781);
  border: 1.5px solid #fff;
}

.fe-error {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  background: #ffebe9;
  color: #cf222e;
  border: 1px solid #ff818266;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  white-space: nowrap;
}

.fe-fade-enter-active,
.fe-fade-leave-active {
  transition: opacity 0.2s;
}

.fe-fade-enter-from,
.fe-fade-leave-to {
  opacity: 0;
}
</style>
