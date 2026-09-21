<template>
  <div class="fe-demo">
    <!-- 业务切换：同一编辑器，只换 materials + validators + initialGraph -->
    <div class="fe-demo-bar">
      <div class="fe-demo-switch">
        <button
          v-for="(biz, key) in businesses"
          :key="key"
          type="button"
          :class="{ active: current === key }"
          @click="current = key"
        >
          {{ key }}
        </button>
      </div>
      <span class="fe-demo-note">当前业务：{{ current }} —— 切换 = 换物料 + 校验规则 + 初始图，编辑器本体零业务逻辑</span>
      <button type="button" class="fe-demo-save" @click="showJson = !showJson">
        {{ showJson ? '隐藏' : '查看' }}图 JSON
      </button>
    </div>

    <FlowEditor
      :key="current"
      ref="editorRef"
      :materials="businesses[current].materials"
      :validators="businesses[current].validators"
      :initial-graph="businesses[current].initialGraph"
      :height="460"
    />

    <pre v-if="showJson" class="fe-demo-json">{{ json || '（点击保存按钮生成）' }}</pre>

    <p class="fe-demo-tip">
      画布已预置一条完整 AI 审批链：开始 → AI 预审 → 条件分支（高置信自动通过 / 低置信转人工复核）→ 结束。
      试：故意让「开始」连出第二条线看校验拦截、选中节点/连线按 Delete 删除、撤销/重做、切换业务看整套配置变化。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { FlowEditor, forbidDirection, limitOutgoing, maxIncoming } from '../src/index'
import type { EdgeValidator, FlowGraph, FlowGraphNode, MaterialDef, PortDef } from '../src/index'

// ---- 端口/节点工厂：初始图与物料共用同一份 ports 定义 ----
const noIn = { inputs: [] as PortDef[], outputs: [{ id: 'out', type: 'out' as const }] }
const inOut = {
  inputs: [{ id: 'in', type: 'in' as const }],
  outputs: [{ id: 'out', type: 'out' as const }],
}
const noOut = { inputs: [{ id: 'in', type: 'in' as const }], outputs: [] as PortDef[] }
const confidenceBranches = {
  inputs: [{ id: 'in', type: 'in' as const }],
  outputs: [
    { id: 'high', type: 'out' as const, label: '高置信' },
    { id: 'low', type: 'out' as const, label: '低置信' },
  ],
}

function businessNode(
  id: string,
  label: string,
  category: string,
  businessType: string,
  x: number,
  y: number,
  ports: { inputs: PortDef[]; outputs: PortDef[] }
): FlowGraphNode {
  return {
    id,
    type: 'business',
    position: { x, y },
    data: { label, category, businessType, ports },
  }
}

// ---- 业务 A：AI 审批流（主场景）----
const approvalMaterials: MaterialDef[] = [
  { type: 'start', label: '开始', category: '起止', ports: noIn },
  { type: 'ai-review', label: 'AI 预审', category: 'AI', ports: inOut },
  { type: 'condition', label: '条件分支', category: '网关', ports: confidenceBranches },
  { type: 'approve', label: '人工复核', category: '审批', ports: inOut },
  { type: 'end', label: '结束', category: '起止', ports: noOut },
]

const approvalValidators: EdgeValidator[] = [
  forbidDirection('start', 'in'),
  forbidDirection('end', 'out'),
  limitOutgoing('start', 1),
  limitOutgoing('condition', 2),
]

const approvalGraph: FlowGraph = {
  nodes: [
    businessNode('n-start', '开始', '起止', 'start', 0, 200, noIn),
    businessNode('n-ai', 'AI 预审', 'AI', 'ai-review', 240, 200, inOut),
    businessNode('n-cond', '条件分支', '网关', 'condition', 480, 200, confidenceBranches),
    businessNode('n-approve', '人工复核', '审批', 'approve', 740, 90, inOut),
    businessNode('n-end', '结束', '起止', 'end', 980, 200, noOut),
  ],
  edges: [
    { id: 'e1', source: 'n-start', sourceHandle: 'out', target: 'n-ai', targetHandle: 'in' },
    { id: 'e2', source: 'n-ai', sourceHandle: 'out', target: 'n-cond', targetHandle: 'in' },
    { id: 'e3', source: 'n-cond', sourceHandle: 'high', target: 'n-end', targetHandle: 'in' },
    { id: 'e4', source: 'n-cond', sourceHandle: 'low', target: 'n-approve', targetHandle: 'in' },
    { id: 'e5', source: 'n-approve', sourceHandle: 'out', target: 'n-end', targetHandle: 'in' },
  ],
}

// ---- 业务 B：数据编排（复用性证明）----
const etlMaterials: MaterialDef[] = [
  { type: 'source', label: '数据源', category: '输入', ports: noIn },
  { type: 'transform', label: '算子', category: '处理', ports: inOut },
  { type: 'sink', label: '输出', category: '输出', ports: noOut },
]

const etlValidators: EdgeValidator[] = [maxIncoming('transform', 2)]

const etlGraph: FlowGraph = {
  nodes: [
    businessNode('s1', '数据源', '输入', 'source', 0, 200, noIn),
    businessNode('t1', '算子', '处理', 'transform', 240, 200, inOut),
    businessNode('k1', '输出', '输出', 'sink', 480, 200, noOut),
  ],
  edges: [
    { id: 'e1', source: 's1', sourceHandle: 'out', target: 't1', targetHandle: 'in' },
    { id: 'e2', source: 't1', sourceHandle: 'out', target: 'k1', targetHandle: 'in' },
  ],
}

interface BusinessConfig {
  materials: MaterialDef[]
  validators: EdgeValidator[]
  initialGraph: FlowGraph
}

const businesses: Record<string, BusinessConfig> = {
  审批流: { materials: approvalMaterials, validators: approvalValidators, initialGraph: approvalGraph },
  数据编排: { materials: etlMaterials, validators: etlValidators, initialGraph: etlGraph },
}

const current = ref('审批流')
const showJson = ref(false)
const editorRef = ref<InstanceType<typeof FlowEditor> | null>(null)
const json = computed(() => (showJson.value ? editorRef.value?.getGraphJSON() ?? '' : ''))
</script>

<style scoped>
.fe-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fe-demo-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.fe-demo-switch {
  display: inline-flex;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  overflow: hidden;
}

.fe-demo-switch button {
  padding: 4px 14px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.fe-demo-switch button.active {
  background: #0969da;
  color: #fff;
}

.fe-demo-note {
  font-size: 12px;
  color: #57606a;
}

.fe-demo-save {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #f6f8fa;
  cursor: pointer;
  font-size: 12px;
}

.fe-demo-json {
  margin: 0;
  max-height: 200px;
  overflow: auto;
  background: #0d1117;
  color: #c9d1d9;
  border-radius: 8px;
  padding: 12px;
  font-size: 11px;
  line-height: 1.5;
}

.fe-demo-tip {
  font-size: 12px;
  color: #57606a;
  margin: 0;
}
</style>
