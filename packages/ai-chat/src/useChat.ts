import { ref } from 'vue'
import { consumeSSEStream } from './stream.js'
import type { ChatMessage, StreamFactory } from './types.js'

export type { ChatMessage, MessageRole, MessageStatus, StreamFactory } from './types.js'
export { consumeSSEStream, fakeSSEChunks } from './stream.js'

export interface UseChatOptions {
  createStream: StreamFactory
  /** 发送时携带的历史条数上限，默认 10 */
  historyLimit?: number
}

/**
 * AI 对话组合式封装
 *
 * 职责：消息列表状态、流式增量落到对应消息的两轨字段、取消、错误终态。
 * 不负责渲染——UI 层拿 messages 自己画气泡。
 *
 * 响应式要点：push 之后必须用 `messages.value[at]` 取回响应式代理再增量修改，
 * 拿着原始对象改字段不会触发更新。
 */
export function useChat(options: UseChatOptions) {
  const { createStream, historyLimit = 10 } = options
  const messages = ref<ChatMessage[]>([])
  const streaming = ref(false)
  let controller: AbortController | null = null
  let seq = 0

  async function send(text: string) {
    const input = text.trim()
    if (streaming.value || !input) return

    messages.value.push({ id: `m-${seq++}`, role: 'user', thinking: '', content: input, status: 'done' })
    messages.value.push({ id: `m-${seq++}`, role: 'assistant', thinking: '', content: '', status: 'streaming' })
    const assistant = messages.value[messages.value.length - 1]
    streaming.value = true
    controller = new AbortController()

    const history = messages.value
      .filter((m) => m.status === 'done' && m.content)
      .slice(-historyLimit)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const result = await consumeSSEStream(
        createStream(history, { signal: controller.signal }),
        {
          onThinking: (delta) => {
            assistant.thinking += delta
          },
          onAnswer: (delta) => {
            assistant.content += delta
          },
        },
        controller.signal
      )
      assistant.status = result === 'done' ? 'done' : 'aborted'
    } catch (err) {
      const e = err as Error
      if (e.name === 'AbortError') {
        assistant.status = 'aborted'
      } else {
        assistant.status = 'error'
        assistant.error = e.message
      }
    } finally {
      streaming.value = false
      controller = null
    }
  }

  /** 停止生成：abort 后已生成内容保留，状态转 aborted */
  function stop() {
    controller?.abort()
  }

  function clear() {
    if (streaming.value) stop()
    messages.value = []
  }

  return { messages, streaming, send, stop, clear }
}
