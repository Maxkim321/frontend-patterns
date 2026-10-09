import type { PedigreeNode, TreeSegment, TreeSlot } from './types.js'

/**
 * BFS 层次分层：把"父母指针"的稀疏树转成按代分层的二维数组。
 *
 * 关键点：家系不是满二叉树（有的个体缺父/母记录），但布局要求上下代槽位严格
 * 对齐——父节点在第 d 层的 index 为 i，它的两个亲本槽位永远是第 d+1 层的
 * 2i 与 2i+1。所以每层按 2^depth 补空位（null 占位），UI 层空位只占位不渲染。
 */
export function buildLayers(
  rootId: string,
  nodeMap: Map<string, PedigreeNode>,
  maxDepth = 5
): TreeSlot[][] {
  const layers: TreeSlot[][] = []
  let queue: Array<string | null> = [rootId]

  for (let depth = 0; depth < maxDepth && queue.some((id) => id !== null); depth++) {
    const width = 2 ** depth
    const layer: TreeSlot[] = []
    const next: Array<string | null> = []

    for (let i = 0; i < width; i++) {
      const id = queue[i] ?? null
      const node = id ? nodeMap.get(id) ?? null : null
      layer.push({ node, depth, index: i })
      // 先父后母入队，保证与 2i / 2i+1 的满二叉树索引对齐
      next.push(node?.fatherId ?? null, node?.motherId ?? null)
    }

    layers.push(layer)
    queue = next
  }
  return layers
}

export interface TreeGeometryOptions {
  /** 每代行高 px */
  rowHeight: number
  /** 节点卡片高度 px */
  boxHeight: number
}

/**
 * 连接线几何：对每个"至少有一个亲本槽位有节点"的父节点，
 * 生成 父底部 → 水平汇流线 → 各子顶 的三段线（肘形连接）。
 *
 * 坐标系：x 用百分比（槽位宽 = 100/2^depth %，天然响应式），
 * y 用像素（行高固定）。水平线只覆盖"实际存在子节点"的区间。
 */
export function buildSegments(
  layers: TreeSlot[][],
  opts: TreeGeometryOptions
): TreeSegment[] {
  const { rowHeight, boxHeight } = opts
  const segments: TreeSegment[] = []

  const centerX = (depth: number, index: number) => {
    const slotWidth = 100 / 2 ** depth
    return (index + 0.5) * slotWidth
  }
  const parentBottomY = (depth: number) => depth * rowHeight + boxHeight
  const childTopY = (depth: number) => depth * rowHeight
  const midY = (depth: number) => parentBottomY(depth) + (rowHeight - boxHeight) / 2

  for (let d = 0; d < layers.length - 1; d++) {
    layers[d].forEach((slot) => {
      if (!slot.node) return
      const childSlots = [2 * slot.index, 2 * slot.index + 1]
        .map((i) => layers[d + 1][i])
        .filter((s): s is TreeSlot => !!s && !!s.node)
      if (childSlots.length === 0) return

      const px = centerX(d, slot.index)
      const py1 = parentBottomY(d)
      const my = midY(d)
      // 父 → 汇流线
      segments.push({ x1: px, x2: px, y1: py1, y2: my, orientation: 'vertical' })
      // 汇流线：覆盖现存子节点的左右区间
      const xs = childSlots.map((s) => centerX(d + 1, s.index))
      segments.push({
        x1: Math.min(...xs),
        x2: Math.max(...xs),
        y1: my,
        y2: my,
        orientation: 'horizontal',
      })
      // 汇流线 → 各子顶部
      for (const cx of xs) {
        segments.push({ x1: cx, x2: cx, y1: my, y2: childTopY(d + 1), orientation: 'vertical' })
      }
    })
  }
  return segments
}

/** 槽位宽度百分比 */
export const slotWidthPercent = (depth: number) => 100 / 2 ** depth
