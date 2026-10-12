/**
 * 家系树 · 类型定义
 *
 * 数据形态：扁平节点表 + 父母指针（fatherId / motherId），
 * 由后端按个体下发——比嵌套树结构好传输、好校验。
 * 每个个体恰好两个亲本槽位（父 / 母），所以整棵树是"稀疏满二叉树"。
 */

export type Sex = 'male' | 'female'

export interface PedigreeNode {
  id: string
  name: string
  sex: Sex
  fatherId?: string
  motherId?: string
}

/** 布局产出的槽位：可能是空位（亲本信息缺失时的占位） */
export interface TreeSlot {
  node: PedigreeNode | null
  depth: number
  index: number
}

/** 连接线段（百分比 x + 像素 y 的混合坐标系，见 FamilyTree.vue 说明） */
export interface TreeSegment {
  /** x 起点百分比（相对容器宽） */
  x1: number
  x2: number
  /** y 起终点像素（相对容器顶） */
  y1: number
  y2: number
  orientation: 'horizontal' | 'vertical'
}
