import { ref } from 'vue'

export interface TimeSlicingOptions {
  /** 每批追加的条数，默认 50 */
  chunkSize?: number
}

/**
 * 时间切片：DOM 必须完整存在（Ctrl+F / 无障碍 / 打印）时，分批追加数据、
 * 批间让出主线程，避免一次性渲染卡死 UI。
 *
 * 关键：用自增 runId 做「最新一次请求胜出」，新任务开始即作废旧任务，
 * 解决 setTimeout 分批的竞态问题（旧结果不再污染列表）。
 */
export function useTimeSlicing<T>(options: TimeSlicingOptions = {}) {
  const chunkSize = options.chunkSize ?? 50
  const items = ref<T[]>([])
  let runId = 0

  async function run(task: () => T[] | Promise<T[]>) {
    const current = ++runId
    items.value = []

    const list = await task()
    if (current !== runId) return

    for (let i = 0; i < list.length; i += chunkSize) {
      if (current !== runId) return
      items.value = items.value.concat(list.slice(i, i + chunkSize))
      if (i + chunkSize < list.length) {
        // 让出主线程，等浏览器有机会处理输入/重绘
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  }

  /** 作废当前进行中的任务 */
  function cancel() {
    runId++
  }

  return { items, run, cancel }
}
