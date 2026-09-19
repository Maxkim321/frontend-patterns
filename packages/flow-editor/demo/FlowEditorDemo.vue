<template>
  <div class="fe-demo">
    <!-- 业务切换：同一编辑器，只换 materials + validators 配置 -->
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
      <span class="fe-demo-note">当前业务：{{ current }} —— 编辑器本体零业务逻辑，业务语义全在配置里</span>
      <button type="button" class="fe-demo-save" @click="showJson = !showJson">
        {{ showJson ? '隐藏' : '查看' }}图 JSON
      </button>
    </div>

    <FlowEditor
      ref="editorRef"
      :materials="businesses[current].materials"
      :validators="businesses[current].validators"
      :initial-graph="businesses[current].initialGraph"
      :height="460"
    />

    <pre v-if="showJson" class="fe-demo-json">{{ json || '（点击保存按钮生成）' }}</pre>

    <p class="fe-demo-tip">
      试一下：从左侧拖物料进画布 → 从节点右侧圆点连线到下一个节点 →
      试着让「开始」连出两条线或连一个环，看校验拦截 →
      选中节点/连线按 Delete 删除 → 撤销/重做 → 切换业务看物料和校验规则变化。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { FlowEditor, forbidDirection, limitOutgoing, maxIncoming } from '../src/index'
import type { EdgeValidator, MaterialDef } from '../src/index'

interface BusinessConfig {
  materials: MaterialDef[]
  validators: EdgeValidator[]
  initialGraph?: never
}

// ---- 业务 A：审批流 ----
const approvalMaterials: MaterialDef[] = [
  { type: 'start', label: '开始', category: '起止', ports: { inputs: [], outputs: [{ id: 'out', type: 'out' }] } },
  { type: 'approve', label: '审批节点', category: '审批', ports: { inputs: [{ id: 'in', type: 'in' }], outputs: [{ id: 'out', type: 'out' }] } },
  {
    type: 'condition',
    label: '条件分支',
    category: '网关',
    ports: {
      inputs: [{ id: 'in', type: 'in' }],
      outputs: [
        { id: 'yes', type: 'out', label: '是' },
        { id: 'no', type: 'out', label: '否' },
      ],
    },
  },
  { type: 'end', label: '结束', category: '起止', ports: { inputs: [{ id: 'in', type: 'in' }], outputs: [] } },
]

const approvalValidators: EdgeValidator[] = [
  forbidDirection('start', 'in'),
  forbidDirection('end', 'out'),
  limitOutgoing('start', 1),
  limitOutgoing('condition', 2),
]

// ---- 业务 B：数据编排 ----
const etlMaterials: MaterialDef[] = [
  { type: 'source', label: '数据源', category: '输入', ports: { inputs: [], outputs: [{ id: 'out', type: 'out' }] } },
  { type: 'transform', label: '算子', category: '处理', ports: { inputs: [{ id: 'in', type: 'in' }], outputs: [{ id: 'out', type: 'out' }] } },
  { type: 'sink', label: '输出', category: '输出', ports: { inputs: [{ id: 'in', type: 'in' }], outputs: [] } },
]

const etlValidators: EdgeValidator[] = [maxIncoming('transform', 2)]

const businesses: Record<string, Omit<BusinessConfig, 'initialGraph'>> = {
  审批流: { materials: approvalMaterials, validators: approvalValidators },
  数据编排: { materials: etlMaterials, validators: etlValidators },
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
