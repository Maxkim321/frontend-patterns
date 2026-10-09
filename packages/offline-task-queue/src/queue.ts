import type {
  QueueOptions,
  QueueTask,
  TaskPersistence,
  TaskTransport,
} from './types.js'
import { createMemoryPersistence, detectIndexedDB, createIndexedDBPersistence } from './persistence.js'

export type { QueueOptions, QueueTask, TaskTransport, TaskPersistence } from './types.js'
export { createMemoryPersistence, createIndexedDBPersistence, detectIndexedDB } from './persistence.js'

interface RunningEntry {
  controller: AbortController
  /** 上次持久化到的整数进度，1% 粒度节流写库 */
  persistedAt: number
}

/**
 * 弱网离线任务队列（框架无关核心）
 *
 * 职责边界：本队列只做"编排"——并发槽位、优先级调度、指数退避、超时、取消、进度节流落盘。
 * 怎么传（HTTP/分片/WS）由注入的 transport 决定；存到哪由注入的 persistence 决定。
 *
 * 不变量：
 * - 同一任务同时只有一个在途尝试（controller 一对一）；
 * - 取消（abort）永远优先于重试：AbortError 直接终态 canceled，不进退避；
 * - 状态变更与 ≥1% 的进度变化都会触发持久化（1% 阈值平衡 IO 与断点粒度）。
 */
export function createTaskQueue(options: QueueOptions) {
  const {
    transport,
    concurrency = 3,
    maxRetries = 3,
    baseDelay = 1000,
    taskTimeout = 300000,
  } = options

  const persistence: TaskPersistence =
    options.persistence ?? (detectIndexedDB() ? createIndexedDBPersistence() : createMemoryPersistence())

  const tasks = new Map<string, QueueTask>()
  const running = new Map<string, RunningEntry>()
  let runningCount = 0
  let seq = 0

  const emit = () => options.onChange?.(snapshot())
  const snapshot = () =>
    [...tasks.values()]
      .map((t) => ({ ...t }))
      .sort((a, b) => b.priority - a.priority || a.updatedAt - b.updatedAt)

  const persist = () => {
    void persistence.save([...tasks.values()])
  }

  const patch = (id: string, part: Partial<QueueTask>, force = false) => {
    const task = tasks.get(id)
    if (!task) return
    Object.assign(task, part, { updatedAt: Date.now() })
    // 进度持久化节流：只有跨过新的 1% 刻度或状态变化才写库
    const entry = running.get(id)
    if (entry && !force) {
      const tick = Math.floor(task.progress)
      if (tick === entry.persistedAt) return
      entry.persistedAt = tick
    }
    persist()
    emit()
  }

  /** 带超时的尝试：超时即 abort 在途传输，按失败进入退避 */
  async function attempt(task: QueueTask, controller: AbortController): Promise<void> {
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        controller.abort()
        reject(new Error(`任务超时（${taskTimeout}ms），已中止`))
      }, taskTimeout)
    })
    try {
      await Promise.race([
        transport(task, {
          signal: controller.signal,
          onProgress: (p) => patch(task.id, { progress: Math.min(100, Math.max(0, p)) }),
        }),
        timeoutPromise,
      ])
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer)
    }
  }

  /** 指数退避 + 随机抖动：1s → 2s → 4s…，抖动避免恢复瞬间惊群 */
  const backoffDelay = (retries: number) =>
    baseDelay * 2 ** retries + Math.floor(Math.random() * 300)

  async function runTask(task: QueueTask) {
    const controller = new AbortController()
    running.set(task.id, { controller, persistedAt: Math.floor(task.progress) })
    runningCount++
    patch(task.id, { status: 'running', error: undefined })

    try {
      await attempt(task, controller)
      patch(task.id, { status: 'done', progress: 100 })
    } catch (err) {
      const e = err as Error
      if (controller.signal.aborted && e.name === 'AbortError') {
        // 用户主动取消：终态，不进重试
        patch(task.id, { status: 'canceled', error: '已取消' })
      } else if (task.retries < maxRetries) {
        const delay = backoffDelay(task.retries)
        patch(task.id, { status: 'waiting', retries: task.retries + 1, error: e.message })
        setTimeout(() => {
          patch(task.id, { status: 'pending' })
          schedule()
        }, delay)
      } else {
        patch(task.id, { status: 'failed', error: e.message })
      }
    } finally {
      running.delete(task.id)
      runningCount--
      schedule()
    }
  }

  /** 调度：按优先级从 pending 里补满并发槽 */
  function schedule() {
    if (runningCount >= concurrency) return
    const next = [...tasks.values()]
      .filter((t) => t.status === 'pending')
      .sort((a, b) => b.priority - a.priority || a.updatedAt - b.updatedAt)
      .slice(0, concurrency - runningCount)
    for (const t of next) void runTask(t)
  }

  return {
    /** 批量加任务（已在队列中的 id 跳过） */
    add(items: Array<{ name: string; size?: number; priority?: number }>): string[] {
      const ids: string[] = []
      for (const it of items) {
        const id = `task-${Date.now()}-${seq++}`
        tasks.set(id, {
          id,
          name: it.name,
          size: it.size ?? 0,
          progress: 0,
          priority: it.priority ?? 0,
          status: 'pending',
          retries: 0,
          updatedAt: Date.now(),
        })
        ids.push(id)
      }
      persist()
      emit()
      schedule()
      return ids
    },
    /** 取消：abort 在途请求；排队/等待中的直接终态 */
    cancel(id: string) {
      const task = tasks.get(id)
      if (!task) return
      const entry = running.get(id)
      if (entry) {
        entry.controller.abort() // runTask 的 catch 里收尾
      } else if (task.status === 'pending' || task.status === 'waiting') {
        patch(id, { status: 'canceled', error: '已取消' }, true)
      }
    },
    cancelAll() {
      for (const t of tasks.values()) if (t.status !== 'done') this.cancel(t.id)
    },
    /** 手动重试：failed/canceled 的任务清零计数重新入队 */
    retry(id: string) {
      const task = tasks.get(id)
      if (!task || (task.status !== 'failed' && task.status !== 'canceled')) return
      patch(id, { status: 'pending', retries: 0, error: undefined }, true)
      schedule()
    },
    clearDone() {
      for (const t of [...tasks.values()]) {
        if (t.status === 'done') tasks.delete(t.id)
      }
      persist()
      emit()
    },
    /**
     * 断点恢复：启动时调用。库里 running/waiting 的任务重置为 pending，
     * progress 保留——transport 从 task.progress 接着传（跳过已成功分片）。
     */
    async restore() {
      for (const t of await persistence.load()) {
        tasks.set(t.id, {
          ...t,
          status: t.status === 'done' || t.status === 'canceled' ? t.status : 'pending',
        })
      }
      emit()
      schedule()
    },
    snapshot,
  }
}
