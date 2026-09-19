export type PortType = 'in' | 'out'

/** 端口定义：节点边上的连接点 */
export interface PortDef {
  id: string
  type: PortType
  label?: string
}

/** 物料定义：左侧面板里的一个可拖入元素 */
export interface MaterialDef {
  /** 物料类型，全局唯一，如 'start' | 'approve' */
  type: string
  label: string
  /** 用于分组/配色 */
  category?: string
  ports: { inputs: PortDef[]; outputs: PortDef[] }
  /** 物料默认携带的业务数据，落成节点后存进 node.data */
  data?: Record<string, unknown>
}

/** 图节点（编辑器内部统一用 type='business' 的自定义节点渲染） */
export interface FlowGraphNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    category?: string
    ports?: { inputs: PortDef[]; outputs: PortDef[] }
    [key: string]: unknown
  }
}

/** 图边 */
export interface FlowGraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  [key: string]: unknown
}

export interface FlowGraph {
  nodes: FlowGraphNode[]
  edges: FlowGraphEdge[]
}

/** 连接候选（连线建立前的校验入参） */
export interface ConnectionCandidate {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

/**
 * 连线校验器：返回 true 表示放行，返回字符串表示拒绝并把字符串作为原因提示。
 * 业务方通过 FlowEditor 的 validators 配置注入。
 */
export type EdgeValidator = (
  candidate: ConnectionCandidate,
  graph: FlowGraph
) => true | string
