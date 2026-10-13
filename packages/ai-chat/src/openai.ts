/**
 * OpenAI 兼容接口适配器（火山引擎 Ark / OpenAI / DeepSeek / 各家中转站通用）。
 *
 * 输入：fetch 返回的 SSE Response（chat/completions, stream: true）
 * 输出：本仓库协议流 —— data: {"type":"thinking"|"answer","delta":...} / data: [DONE]
 *
 * 字段映射：delta.reasoning_content → thinking 轨（推理模型如 glm-5.3-flash 的思考过程）；
 * delta.content → answer 轨。之后喂给 consumeSSEStream 即可与模拟流共用同一条解析链路。
 */
export async function* openAICompatToProtocol(
  res: Response,
  signal?: AbortSignal
): AsyncIterable<string> {
  if (!res.ok || !res.body) throw new Error(`OpenAI 兼容接口异常（${res.status}）`)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  while (true) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // 不完整的行留到下一轮（与 consumeSSEStream 同一套缓冲区携带）
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta ?? {}
        if (delta.reasoning_content) {
          yield `data: ${JSON.stringify({ type: 'thinking', delta: delta.reasoning_content })}\n`
        } else if (delta.content) {
          yield `data: ${JSON.stringify({ type: 'answer', delta: delta.content })}\n`
        }
      } catch {
        // 单个坏事件跳过（服务端心跳/注释行）
      }
    }
  }
  yield 'data: [DONE]\n\n'
}
