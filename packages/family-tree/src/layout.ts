import type { PedigreeNode, TreeSlot } from './types.js'

/**
 * BFS 层次分层：把"父母指针"的稀疏树转成按代分层的二维数组。
 *
 * 与源码（deepblup3.0 Genealogy.vue 的 createTreeLayers + fullTree）同机制：
 * 家系不是满二叉树（有的个体缺父/母记录），但布局要求上下代槽位严格
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

/**
 * 垂直连线高度通式：容器高 / 2^(depth+1)。
 *
 * 源码在 2300px 容器下硬编码 {1:575, 2:288, 3:145, 4:72}——即 2300/2^(d+1) 的
 * 取整值。这里把魔数还原成通式：任何容器高度下垂直线都精确落在两代的中线间，
 * 与 space-around 的均布数学一致（子节点中线 = 亲本槽位对的中点）。
 */
export function sexLineHeight(containerHeight: number, depth: number): number {
  return containerHeight / 2 ** (depth + 1)
}
