import type { StreamEvent, StreamHandlers } from './types.js'

/**
 * SSE 流解析器（框架无关）
 *
 * 输入：任意 AsyncIterable<string>（真实项目 = fetch body reader 的文本增量；
 * demo = 模拟生成器）。协议：每事件一行 `data: {JSON}`，`data: [DONE]` 结束。
 *
 * 关键机制——缓冲区携带（buffer carryover）：
 * TCP 分片不保证按事件边界到达，一个事件的 JSON 可能被切在两个 chunk 里。
 * 所以按 \n 切完行后，最后一段（可能不完整）必须 pop 回 buffer 拼到下一轮，
 * 否则 JSON.parse 撕裂的半截会直接抛错丢事件。
 */
export async function consumeSSEStream(
  chunks: AsyncIterable<string>,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<'done' | 'aborted'> {
  let buffer = ''
  for await (const chunk of chunks) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // 不完整的行留到下一轮
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      if (payload === '[DONE]') return 'done'
      try {
        const event = JSON.parse(payload) as StreamEvent
        if (event.type === 'thinking') handlers.onThinking(event.delta)
        else if (event.type === 'answer') handlers.onAnswer(event.delta)
      } catch {
        // 单个坏事件跳过，不终止整个流（服务端偶尔会发心跳/注释行）
      }
    }
  }
  return 'done'
}

/** 供 demo / 测试用：把一段完整文本打包成合法的 SSE chunk 序列 */
export function fakeSSEChunks(
  thinking: string,
  answer: string,
  opts: { signal?: AbortSignal; chunkSize?: number; delayMs?: number } = {}
): AsyncIterable<string> {
  const { signal, chunkSize = 6, delayMs = 60 } = opts
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  async function* gen(): AsyncIterable<string> {
    const events: StreamEvent[] = [
      ...[...thinking].map((ch) => ({ type: 'thinking', delta: ch }) as StreamEvent),
      ...[...answer].map((ch) => ({ type: 'answer', delta: ch }) as StreamEvent),
      { type: 'answer', delta: '' },
    ]
    let i = 0
    while (i < events.length) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
      const batch = events.slice(i, i + chunkSize)
      // 一个 chunk 里塞多个事件，最后一个事件故意不带回车——制造"事件被分片"的真实情况
      yield batch.map((e) => `data: ${JSON.stringify(e)}\n`).join('')
      i += chunkSize
    }
    yield 'data: [DONE]\n\n'
    void delayMs
    await sleep(0)
  }
  return gen()
}
