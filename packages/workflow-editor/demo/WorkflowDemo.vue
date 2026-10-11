<template>
  <div class="wf-demo">
    <div class="wf-toolbar">
      <el-tag size="small">数据 = DocFlow 默认工作流画布（真实数据）</el-tag>
      <el-button size="small" type="primary" @click="showLangGraph = !showLangGraph">
        {{ showLangGraph ? '返回画布' : '转 LangGraph 配置' }}
      </el-button>
      <el-button v-if="selected" size="small" @click="toggleDefault(selected)">
        {{ selected.data.model_config.use_workflow_default ? '改用节点专属模型' : '改回工作流默认模型' }}
      </el-button>
    </div>

    <!-- LangGraph 配置预览（真实转换器输出） -->
    <div v-if="showLangGraph" class="wf-langgraph">
      <div class="wf-langgraph__meta">
        entry 节点：{{ langgraph.entry_node_ids.join('、') || '（无）' }} ·
        terminal 节点：{{ langgraph.terminal_node_ids.join('、') || '（无）' }} ·
        version：{{ langgraph.version }}
      </div>
      <pre class="wf-langgraph__code">{{ langgraphJSON }}</pre>
    </div>

    <!-- 画布：按 Agent 阶段分列 -->
    <template v-else>
      <div class="wf-canvas">
        <div
          v-for="stage in stageOrder"
          :key="stage"
          class="wf-column"
        >
          <div class="wf-column__title">{{ stageLabel(stage) }}</div>
          <div
            v-for="node in nodesInStage(stage)"
            :key="node.id"
            class="wf-node"
            :class="{ 'wf-node--selected': selectedId === node.id }"
            @click="selectedId = node.id"
          >
            <div class="wf-node__name">{{ node.data.name }}</div>
            <div class="wf-node__model">
              {{ node.data.model_config.use_workflow_default ? '默认模型' : node.data.model_config.model.split('/').pop() }}
            </div>
          </div>
        </div>
      </div>

      <!-- 节点详情（配置面板精简版） -->
      <div v-if="selected" class="wf-panel">
        <div class="wf-panel__row"><span class="k">agent code</span><b>{{ selected.data.code }}</b></div>
        <div class="wf-panel__row"><span class="k">角色</span>{{ selected.data.role }}</div>
        <div class="wf-panel__row"><span class="k">阶段</span>{{ selected.data.stage }}</div>
        <div class="wf-panel__row"><span class="k">输出格式</span>{{ selected.data.output_format }}</div>
        <div class="wf-panel__row"><span class="k">模型策略</span>
          {{ selected.data.model_config.use_workflow_default
            ? '跟随工作流默认（use_workflow_default: true）'
            : '节点专属：' + selected.data.model_config.model + ' / temperature ' + selected.data.model_config.temperature }}
        </div>
        <div class="wf-panel__row"><span class="k">prompt</span><i class="prompt">{{ selected.data.prompt.slice(0, 80) }}…</i></div>
      </div>
      <div v-else class="wf-hint">点击节点查看配置 → 再点「转 LangGraph 配置」看真实转换器输出</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  convertReactFlowToLangGraphConfig,
  DEFAULT_DOCFLOW_WORKFLOW_CANVAS,
  DEFAULT_WORKFLOW_MODEL_CONFIG,
  type WorkflowCanvasNode,
  type WorkflowAgentStage,
} from '../src/index.js'

const canvas = ref(structuredClone(DEFAULT_DOCFLOW_WORKFLOW_CANVAS))

const stageOrder: WorkflowAgentStage[] = [
  'analysis', 'control', 'generation', 'memory', 'output', 'quality', 'router',
]
const stageLabels: Record<string, string> = {
  analysis: '分析', control: '控制', generation: '生成',
  memory: '记忆', output: '输出', quality: '质量', router: '路由',
}
const stageLabel = (s: string) => stageLabels[s] ?? s

const stageOrderIndex = new Map(stageOrder.map((s, i) => [s, i]))
const selectedId = ref<string | null>(null)
const selected = computed(() =>
  canvas.value.nodes.find((n) => n.id === selectedId.value) ?? null
)

function nodesInStage(stage: WorkflowAgentStage) {
  return canvas.value.nodes
    .filter((n) => n.data.stage === stage)
    .sort((a, b) => a.position.x - b.position.x)
}

function toggleDefault(node: WorkflowCanvasNode) {
  node.data.model_config.use_workflow_default = !node.data.model_config.use_workflow_default
}

/** 真实转换器：画布 → LangGraph 配置 */
const langgraph = computed(() =>
  convertReactFlowToLangGraphConfig(canvas.value, DEFAULT_WORKFLOW_MODEL_CONFIG)
)
const langgraphJSON = computed(() => JSON.stringify(langgraph.value, null, 2))
</script>

<style scoped>
.wf-demo {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
}
.wf-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.wf-canvas {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
}
.wf-column {
  flex: none;
  width: 168px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fafbfc;
  border: 1px dashed #dbe2ec;
  border-radius: 6px;
  padding: 8px;
  min-height: 200px;
}
.wf-column__title {
  font-size: 12px;
  font-weight: 600;
  color: #4e7282;
  text-align: center;
}
.wf-node {
  background: #fff;
  border: 1px solid #c9d6ea;
  border-radius: 6px;
  padding: 7px 9px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.wf-node--selected {
  border-color: #165dff;
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.15);
}
.wf-node__name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}
.wf-node__model {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}
.wf-panel {
  margin-top: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
  background: #fff;
}
.wf-panel__row {
  font-size: 12px;
  margin-bottom: 5px;
  display: flex;
  gap: 8px;
}
.wf-panel__row .k {
  color: #6b7280;
  flex: none;
  width: 80px;
}
.wf-panel__row .prompt {
  color: #9ca3af;
}
.wf-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
}
.wf-langgraph__meta {
  font-size: 12px;
  color: #4e7282;
  background: #f0f5fb;
  border-radius: 4px;
  padding: 6px 10px;
  margin-bottom: 8px;
}
.wf-langgraph__code {
  background: #0d1117;
  color: #c9d1d9;
  border-radius: 6px;
  padding: 12px;
  font-size: 11px;
  line-height: 1.55;
  overflow: auto;
  max-height: 420px;
  margin: 0;
}
</style>
