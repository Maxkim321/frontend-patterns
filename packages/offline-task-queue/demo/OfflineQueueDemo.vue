<template>
  <div class="oq-demo">
    <div class="oq-toolbar">
      <span class="oq-net">
        网络模拟：
        <el-switch v-model="online" active-text="在线" inactive-text="断网" />
      </span>
      <el-input-number v-model="addCount" :min="1" :max="10" size="small" />
      <el-button type="primary" size="small" @click="addTasks">添加采集任务</el-button>
      <el-button size="small" @click="queue.clearDone()">清除已完成</el-button>
      <el-button size="small" @click="restore">重置（重新从 IndexedDB 恢复）</el-button>
    </div>

    <p class="oq-tip">
      任务真实落盘到 IndexedDB（DevTools → Application → IndexedDB → offline-task-queue 可见）。
      <b>上传中途刷新页面，进度会从上次的 1% 刻度恢复</b>——这就是断点续传。
    </p>

    <div v-if="tasks.length === 0" class="oq-empty">暂无任务，点上面按钮添加</div>
    <div v-for="t in tasks" :key="t.id" class="oq-task">
      <span class="oq-name">{{ t.name }}</span>
      <el-progress
        class="oq-progress"
        :percentage="Math.round(t.progress)"
        :status="t.status === 'done' ? 'success' : t.status === 'failed' ? 'exception' : undefined"
      />
      <el-tag size="small" :type="tagType(t.status)">{{ statusText(t) }}</el-tag>
      <el-button
        v-if="['pending', 'running', 'waiting'].includes(t.status)"
        link
        type="danger"
        size="small"
        @click="queue.cancel(t.id)"
      >取消</el-button>
      <el-button
        v-if="['failed', 'canceled'].includes(t.status)"
        link
        type="primary"
        size="small"
        @click="queue.retry(t.id)"
      >重试</el-button>
      <span v-if="t.error" class="oq-error">{{ t.error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTaskQueue } from '../src/useTaskQueue.js'
import type { QueueTask, TaskStatus, TaskTransport } from '../src/index.js'

/** 网络开关：demo 用它模拟断网，transport 里真实生效 */
const online = ref(true)
const addCount = ref(3)

/**
 * 模拟传输：真实项目里换成 fetch/XHR 分片上传即可。
 * 契约与真实传输一致：尊重 signal、通过 onProgress 汇报 0-100、断网时 reject。
 */
const simulatedTransport: TaskTransport = (task, { signal, onProgress }) =>
  new Promise((resolve, reject) => {
    let p = task.progress // ← 断点续传：从持久化的进度接着传
    const timer = setInterval(() => {
      if (signal.aborted) {
        clearInterval(timer)
        reject(new DOMException('aborted', 'AbortError'))
        return
      }
      if (!online.value) {
        clearInterval(timer)
        reject(new Error('网络不可用（模拟断网）'))
        return
      }
      p += 3 + Math.random() * 9
      onProgress(Math.min(100, p))
      if (p >= 100) {
        clearInterval(timer)
        resolve()
      }
    }, 200)
  })

const { tasks, queue, restore } = useTaskQueue({
  transport: simulatedTransport,
  concurrency: 3,
  maxRetries: 3,
  baseDelay: 1500,
  taskTimeout: 60000, // demo 里放短一点，方便观察超时
})

function addTasks() {
  queue.add(
    Array.from({ length: addCount.value }, (_, i) => ({
      name: `采集任务-${Math.floor(Math.random() * 1000)}-${i + 1}.mp4`,
      size: 1024 * 1024 * (20 + Math.floor(Math.random() * 80)),
      priority: Math.floor(Math.random() * 3),
    }))
  )
}

function tagType(status: TaskStatus) {
  const map: Record<TaskStatus, 'info' | 'primary' | 'warning' | 'danger' | 'success'> = {
    pending: 'info',
    running: 'primary',
    waiting: 'warning',
    failed: 'danger',
    done: 'success',
    canceled: 'info',
  }
  return map[status]
}

function statusText(t: QueueTask) {
  const map: Record<TaskStatus, string> = {
    pending: '排队中',
    running: '上传中',
    waiting: `重试等待(${t.retries})`,
    failed: '失败',
    done: '完成',
    canceled: '已取消',
  }
  return map[t.status]
}

onMounted(restore)
</script>

<style scoped>
.oq-demo {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}
.oq-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.oq-net {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.oq-tip {
  font-size: 12px;
  color: #6b7280;
  margin: 8px 0 12px;
}
.oq-empty {
  color: #9ca3af;
  font-size: 13px;
  padding: 16px 0;
}
.oq-task {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.oq-name {
  width: 200px;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oq-progress {
  flex: 1;
}
.oq-error {
  font-size: 12px;
  color: #f56c6c;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
