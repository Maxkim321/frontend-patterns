import type { MaterialDef } from './types'

export const DND_MIME = 'application/x-flow-material'

/**
 * 物料入画布：HTML5 拖拽的三件套。
 * 关键点：drop 的鼠标坐标必须用 screenToFlowCoordinate 换算成画布坐标
 * （画布有缩放和平移，直接用 clientX/Y 落点必偏）。
 */
export function useDndMaterial(options: {
  /** 由调用方提供：useVueFlow 的 screenToFlowCoordinate */
  screenToFlow: (pos: { x: number; y: number }) => { x: number; y: number }
  /** 落画布回调：type 是物料 type，pos 是换算后的画布坐标 */
  onDropMaterial: (type: string, pos: { x: number; y: number }) => void
}) {
  /** 物料面板元素上绑定：@dragstart */
  function onDragStart(e: DragEvent, material: MaterialDef) {
    e.dataTransfer?.setData(DND_MIME, material.type)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  /** 画布容器上绑定：@drop */
  function onDrop(e: DragEvent) {
    const type = e.dataTransfer?.getData(DND_MIME)
    if (!type) return
    const pos = options.screenToFlow({ x: e.clientX, y: e.clientY })
    options.onDropMaterial(type, pos)
  }

  /** 画布容器上绑定：@dragover（必须 preventDefault 才允许 drop） */
  function onDragOver(e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  }

  return { onDragStart, onDrop, onDragOver }
}
