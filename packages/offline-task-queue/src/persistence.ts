import type { QueueTask, TaskPersistence } from './types.js'

/** 内存实现：降级模式 / 测试用 */
export function createMemoryPersistence(): TaskPersistence {
  let store: QueueTask[] = []
  return {
    async load() {
      return store.map((t) => ({ ...t }))
    },
    async save(tasks) {
      store = tasks.map((t) => ({ ...t }))
    },
  }
}

/**
 * IndexedDB 实现：真实落盘，关浏览器不丢。
 *
 * 设计取舍：
 * - 一个 object store（keyPath: 'id'），任务数组整体覆盖写（clear + putAll 同事务）。
 *   任务量级在千级，整表覆盖比逐条 diff 简单且够快；万级以上应换成按 id 增量 put。
 * - load 返回的任务用于"断点恢复"：progress 保留、running/waiting 状态由队列重置为 pending。
 */
export function createIndexedDBPersistence(
  dbName = 'offline-task-queue',
  storeName = 'tasks'
): TaskPersistence {
  let dbPromise: Promise<IDBDatabase> | null = null

  function open(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(storeName)) {
          req.result.createObjectStore(storeName, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
    })
    return dbPromise
  }

  return {
    async load() {
      const db = await open()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const req = tx.objectStore(storeName).getAll()
        req.onsuccess = () => resolve((req.result ?? []) as QueueTask[])
        req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
      })
    },
    async save(tasks) {
      const db = await open()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.clear()
        for (const t of tasks) store.put(t)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
      })
    },
  }
}

/** 可用性探测：隐私模式下 IndexedDB 可能被禁，启动时先探测再选持久层 */
export function detectIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}
