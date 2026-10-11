/**
 * 家系树 · 类型定义
 *
 * 数据形态：扁平节点表 + 父母指针（fatherId / motherId），
 * 与源码（deepblup3.0 系谱接口）一致——祖先方向接口给 father/mother 嵌套对象，
 * 后代方向给 fatherId/motherId + son/daughter 数组，接入时统一适配为本形态。
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

/** 布局产出的槽位：可能是空位（亲本信息缺失时的占位，渲染为 'hide'） */
export interface TreeSlot {
  node: PedigreeNode | null
  depth: number
  index: number
}
