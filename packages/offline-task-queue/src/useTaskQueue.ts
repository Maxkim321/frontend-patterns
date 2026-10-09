import { ref } from 'vue'
import { createTaskQueue } from './queue.js'
import type { QueueOptions, QueueTask } from './types.js'

/**
 * Vue 组合式封装：把核心队列接到响应式世界。
 * 核心 onChange 已做浅拷贝，直接整组替换 ref 即可触发更新。
 */
export function useTaskQueue(options: Omit<QueueOptions, 'onChange'>) {
  const tasks = ref<QueueTask[]>([])
  const ready = ref(false)

  const queue = createTaskQueue({
    ...options,
    onChange: (list) => {
      tasks.value = list
    },
  })

  /** 启动时调用：从持久层恢复任务（断点续传），完成后 ready 置真 */
  async function restore() {
    await queue.restore()
    ready.value = true
  }

  return { tasks, ready, queue, restore }
}
