import { ref } from 'vue'

/**
 * 快照式历史栈（撤销/重做）。
 * 设计取舍：不做操作级 diff，直接存整图 JSON 快照——
 * 流程图规模（几十~几百节点）下快照足够便宜，实现简单且不会漏状态。
 * 调用方在「有意义的时刻」push：连线建立、节点拖拽结束、删除、落物料，
 * 而不是拖拽过程中的每一帧。
 */
export function useFlowHistory(
  getSnapshot: () => unknown,
  restore: (snapshot: never) => void,
  limit = 50
) {
  const past: string[] = []
  const future: string[] = []
  const canUndo = ref(false)
  const canRedo = ref(false)

  function sync() {
    canUndo.value = past.length > 0
    canRedo.value = future.length > 0
  }

  function push() {
    past.push(JSON.stringify(getSnapshot()))
    if (past.length > limit) past.shift()
    future.length = 0
    sync()
  }

  function undo() {
    if (!past.length) return
    future.push(JSON.stringify(getSnapshot()))
    restore(JSON.parse(past.pop()!))
    sync()
  }

  function redo() {
    if (!future.length) return
    past.push(JSON.stringify(getSnapshot()))
    restore(JSON.parse(future.pop()!))
    sync()
  }

  return { push, undo, redo, canUndo, canRedo }
}
