import { ref, toValue, watch } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useDndMaterial } from './useDndMaterial'
import { useFlowHistory } from './useFlowHistory'
import { noCycle, noSelfConnection } from './validators'
import type {
  ConnectionCandidate,
  EdgeValidator,
  FlowGraph,
  FlowGraphEdge,
  FlowGraphNode,
  MaterialDef,
} from './types'

let uid = 0
let seq = 0

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`
}

export interface FlowEditorOptions {
  /** 物料清单（支持响应式：业务切换时直接换数组） */
  materials: MaterialDef[] | (() => MaterialDef[])
  /** 业务连线校验器（防自连/防环内置强制，无需配置） */
  validators?: EdgeValidator[] | (() => EdgeValidator[])
  /** 初始图（历史记录可回放编辑场景） */
  initialGraph?: FlowGraph
}

/**
 * 流程图编辑器核心逻辑。与 UI 解耦：
 * FlowEditor.vue 是默认封装，业务方也可以拿着它自己组装 UI。
 *
 * 内置强制校验：防自连、防环。业务校验通过 validators 注入，
 * 返回 true 放行 / 返回字符串拒绝（字符串会作为原因暴露在 error 事件里）。
 */
export function useFlowEditor(options: FlowEditorOptions) {
  const vueFlowId = `flow-editor-${++uid}`

  const {
    addNodes,
    addEdges,
    screenToFlowCoordinate,
    onConnect,
    onNodeDragStop,
    onNodesChange,
    onEdgesChange,
    fitView,
  } = useVueFlow({ id: vueFlowId })

  const nodes = ref<FlowGraphNode[]>(options.initialGraph?.nodes ?? [])
  const edges = ref<FlowGraphEdge[]>(options.initialGraph?.edges ?? [])
  const lastError = ref('')

  const history = useFlowHistory(
    () => ({ nodes: nodes.value, edges: edges.value }),
    (snap) => {
      const g = snap as unknown as FlowGraph
      nodes.value = g.nodes
      edges.value = g.edges
    }
  )

  /** 全量校验一条候选连线：内置（自连/环）+ 业务 validators */
  function validateConnection(candidate: ConnectionCandidate): true | string {
    const graph: FlowGraph = { nodes: nodes.value, edges: edges.value }
    for (const v of [noSelfConnection, noCycle]) {
      const r = v(candidate, graph)
      if (r !== true) return r
    }
    for (const v of toValue(options.validators) ?? []) {
      const r = v(candidate, graph)
      if (r !== true) return r
    }
    return true
  }

  /** 传给 <VueFlow :is-valid-connection>：连线建立前拦截，拒绝时同步错误原因 */
  function isValidConnection(candidate: ConnectionCandidate): boolean {
    const r = validateConnection(candidate)
    if (r !== true) {
      lastError.value = r
      return false
    }
    lastError.value = ''
    return true
  }

  /** 物料落画布：按 type 找物料定义，生成业务节点 */
  function addMaterial(type: string, position: { x: number; y: number }) {
    const m = toValue(options.materials).find((item) => item.type === type)
    if (!m) return
    addNodes({
      id: genId(type),
      type: 'business',
      position,
      data: {
        ...m.data,
        label: m.label,
        category: m.category,
        businessType: m.type,
        ports: m.ports,
      },
    } as FlowGraphNode)
    history.push()
  }

  const dnd = useDndMaterial({
    screenToFlow: (pos) => screenToFlowCoordinate(pos),
    onDropMaterial: addMaterial,
  })

  // 有意义的时刻才存快照（连线/拖拽结束/删除），拖拽过程帧不进历史
  onConnect((params) => {
    addEdges({
      ...params,
      id: genId('edge'),
    } as FlowGraphEdge)
    history.push()
  })
  onNodeDragStop(() => history.push())
  onNodesChange((changes) => {
    if (changes.some((c) => c.type === 'remove')) history.push()
  })
  onEdgesChange((changes) => {
    if (changes.some((c) => c.type === 'remove')) history.push()
  })

  function getGraphJSON(): string {
    return JSON.stringify({ nodes: nodes.value, edges: edges.value }, null, 2)
  }

  function loadGraph(graph: FlowGraph) {
    nodes.value = graph.nodes
    edges.value = graph.edges
    history.push()
  }

  function clearGraph() {
    nodes.value = []
    edges.value = []
    history.push()
  }

  watch([nodes, edges], () => {
    // 预留给业务方的数据出口（如自动保存）
  })

  return {
    /** 传给 <VueFlow :id> 的实例 id */
    vueFlowId,
    nodes,
    edges,
    lastError,
    dnd,
    isValidConnection,
    addMaterial,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    getGraphJSON,
    loadGraph,
    clearGraph,
    fitView,
  }
}
