/**
 * AI 对话组件 · 类型定义
 *
 * 消息分两轨：thinking（思考过程，可折叠展示）与 content（最终答案）。
 * 流式期间 status = streaming，两侧内容都允许为空串起步、增量追加。
 */

export type MessageRole = 'user' | 'assistant'

export type MessageStatus = 'streaming' | 'done' | 'aborted' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  /** 思考过程（流式增量追加） */
  thinking: string
  /** 最终答案（流式增量追加） */
  content: string
  status: MessageStatus
  error?: string
}

/** SSE 事件负载：一次增量 */
export interface StreamEvent {
  type: 'thinking' | 'answer'
  delta: string
}

export interface StreamHandlers {
  onThinking(delta: string): void
  onAnswer(delta: string): void
}

/**
 * 流源：给定历史与取消信号，产出原始 chunk 文本流。
 * 真实项目里包 fetch + ReadableStream；demo 里用模拟生成器。
 * 抽象成 AsyncIterable<string> 是为了把"SSE 解析"和"怎么连服务器"解耦。
 */
export type StreamFactory = (
  history: Array<Pick<ChatMessage, 'role' | 'content'>>,
  ctx: { signal: AbortSignal }
) => AsyncIterable<string>
