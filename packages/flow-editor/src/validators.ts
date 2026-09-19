import type { EdgeValidator, FlowGraph } from './types'

/**
 * 内置校验器：禁止自连（source === target）。
 * useFlowEditor 默认强制应用，无需业务方配置。
 */
export const noSelfConnection: EdgeValidator = (c) =>
  c.source !== c.target ? true : '不允许节点连接自身'

/**
 * 内置校验器：防环。从 target 沿现有边向下游走，
 * 若能回到 source，则这条连线会成环。
 * useFlowEditor 默认强制应用，无需业务方配置。
 */
export const noCycle: EdgeValidator = (c, graph: FlowGraph): true | string => {
  if (c.source === c.target) return true // 自连交给 noSelfConnection
  const next = new Map<string, string[]>()
  for (const e of graph.edges) {
    if (!next.has(e.source)) next.set(e.source, [])
    next.get(e.source)!.push(e.target)
  }
  const visited = new Set<string>()
  const stack = [c.target]
  while (stack.length) {
    const cur = stack.pop()!
    if (cur === c.source) return '不允许形成环路'
    if (visited.has(cur)) continue
    visited.add(cur)
    for (const n of next.get(cur) ?? []) stack.push(n)
  }
  return true
}

/** 工厂：限制某类节点的最大出边数，如 limitOutgoing('condition', 2) */
export function limitOutgoing(nodeType: string, max: number): EdgeValidator {
  return (c, graph) => {
    const node = graph.nodes.find((n) => n.id === c.source)
    if (node?.type !== 'business' || (node.data as { businessType?: string }).businessType !== nodeType)
      return true
    const outCount = graph.edges.filter((e) => e.source === c.source).length
    return outCount < max ? true : `「${node.data.label}」最多允许 ${max} 条出线`
  }
}

/** 工厂：限制某类节点的最大入边数，如 maxIncoming('transform', 2) */
export function maxIncoming(nodeType: string, max: number): EdgeValidator {
  return (c, graph) => {
    const node = graph.nodes.find((n) => n.id === c.target)
    if (node?.type !== 'business' || (node.data as { businessType?: string }).businessType !== nodeType)
      return true
    const inCount = graph.edges.filter((e) => e.target === c.target).length
    return inCount < max ? true : `「${node.data.label}」最多允许 ${max} 条入线`
  }
}

/** 工厂：禁止某类节点有出边 / 入边（如开始节点不能有入线、结束节点不能有出线） */
export function forbidDirection(nodeType: string, dir: 'out' | 'in'): EdgeValidator {
  return (c, graph) => {
    const id = dir === 'out' ? c.source : c.target
    const node = graph.nodes.find((n) => n.id === id)
    if (node?.type !== 'business' || (node.data as { businessType?: string }).businessType !== nodeType)
      return true
    return dir === 'out'
      ? `「${node.data.label}」不允许有出线`
      : `「${node.data.label}」不允许有入线`
  }
}
