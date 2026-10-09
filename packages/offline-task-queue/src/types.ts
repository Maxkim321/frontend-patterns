/**
 * 弱网离线任务队列 · 类型定义
 *
 * 领域模型来自外业采集场景：任务先落本地库，队列按优先级并发上传，
 * 断网自动重试、断点续传、用户可随时取消。
 */

export type TaskStatus =
  | 'pending'   // 待上传（排队中）
  | 'running'   // 上传中
  | 'waiting'   // 重试等待（指数退避计时中）
  | 'failed'    // 重试耗尽，最终失败
  | 'done'      // 完成
  | 'canceled'  // 用户取消

export interface QueueTask {
  id: string
  name: string
  /** 总大小（字节），仅用于展示，传输行为由 transport 决定 */
  size: number
  /** 已上传百分比 0-100（持久化字段，断点续传的依据） */
  progress: number
  priority: number
  status: TaskStatus
  /** 已重试次数 */
  retries: number
  error?: string
  updatedAt: number
}

/** 传输上下文：transport 必须尊重 signal、通过 onProgress 汇报进度 */
export interface TaskContext {
  signal: AbortSignal
  onProgress: (percent: number) => void
}

/**
 * 传输函数：由业务方注入（fetch / XHR / WebSocket 分片均可）。
 * 核心队列不关心"怎么传"，只关心任务编排。
 */
export type TaskTransport = (task: QueueTask, ctx: TaskContext) => Promise<void>

/** 持久化接口：运行期状态与进度的落盘通道（IndexedDB / localStorage / 内存均可实现） */
export interface TaskPersistence {
  load(): Promise<QueueTask[]>
  save(tasks: QueueTask[]): Promise<void>
}

export interface QueueOptions {
  transport: TaskTransport
  /** 并发槽位数，默认 3 */
  concurrency?: number
  /** 最大重试次数，默认 3 */
  maxRetries?: number
  /** 首次退避间隔 ms，默认 1000，按 2^n 递增并加随机抖动 */
  baseDelay?: number
  /** 单次尝试超时 ms，默认 300000（5 分钟） */
  taskTimeout?: number
  persistence?: TaskPersistence
  /** 任何状态/进度变化都会回调（已做浅拷贝，可直接进响应式框架） */
  onChange?: (tasks: QueueTask[]) => void
}
