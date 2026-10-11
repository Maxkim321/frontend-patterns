---
场景: AI 产品对话界面（智能体客服/问答助手），要流式输出、思考过程与回答分轨渲染、可中断
技术: Vue3 + fetch ReadableStream + SSE 解析器（框架无关）
标签: AI, 对话, 流式, SSE, 中断, 组件封装
更新时间: 2026-10-11
---

# AI 对话组件

UI 骨架与交互设计来自本人实习期间公司项目的 AI 助手组件（ui-ai-assistant：侧边栏 + 历史会话树 + 输入区）；流式解析与状态层是我在其接口约定基础上补全的沉淀实现（源项目骨架当时尚未接流式）。坑清单大量来自对该项目源码的审查。

## 决策层（为什么拆成"解析器 + useChat"两层）

| 方案 | 评价 | 什么时候选 |
|---|---|---|
| 组件里直接 fetch + onmessage 拼字符串 | 能跑，但 JSON 撕裂、取消、历史、状态机全搅在模板逻辑里 | 一次性 demo |
| **解析器（框架无关）+ useChat（响应式）**（本方案） | 解析器可单测可复用（React 项目也能拿去用），UI 层拿 messages 自由画气泡 | 正式 AI 对话产品 ✅ |
| Vercel AI SDK / 现成方案 | 能力全 | React 项目或接受其抽象 |

核心判断：**流式对话的复杂度在"协议解析"和"状态机"，不在气泡 UI**——把这两层抽出来，UI 随便换。

## 结论

demo 的 UI 按 ui-ai-assistant 源项目骨架实现（折叠侧边栏 256/72px + 新建会话 + 分组历史会话树 + composer；历史重命名/删除补了真实交互——源项目是 console.log 空壳）。核心两层：

- `src/stream.ts` —— SSE 解析器（框架无关）：`consumeSSEStream(chunks, handlers, signal)`，输入任意 `AsyncIterable<string>`（真实项目 = fetch body reader 的文本增量），事件协议 `data: {JSON}` / `data: [DONE]`；`fakeSSEChunks` 供 demo/测试构造分片流
- `src/useChat.ts` —— Vue 组合式：消息列表、流式增量落到消息的**两轨字段**（thinking/answer 分开）、取消、错误终态、历史裁剪
- `src/types.ts` —— `ChatMessage`（status 状态机）/ `StreamEvent` / `StreamFactory`

```ts
const { messages, streaming, send, stop } = useChat({
  createStream: (history, { signal }) =>
    fetch('/api/chat', { method: 'POST', body: JSON.stringify({ history }), signal })
      .then((res) => res.body!.pipeThrough(new TextDecoderStream()) as unknown as AsyncIterable<string>),
})
```

## 原理讲解（关键机制）

### SSE 解析的缓冲区携带（最核心的一题）

TCP 分片**不保证按事件边界到达**——一个事件的 JSON 可能被切在两个 chunk 里。解析器按 `\n` 切行后，最后一段（可能不完整）必须 pop 回 buffer 拼到下一轮；否则 `JSON.parse` 撕裂的半截直接抛错丢事件。demo 的 `fakeSSEChunks` 特意制造"一个 chunk 里塞多个事件、最后一个不带回车"的情况验证这一点。

### 两轨字段：thinking 与 answer 分开增量

消息对象上 `thinking` / `content` 两个独立累加字段，UI 可以分区渲染（思考过程折叠/灰显）。比单字段拼接后前端再拆分稳定得多。

### 响应式陷阱：push 之后取回代理

`messages.value.push(obj)` 之后必须用 `messages.value[at]` 取回**响应式代理**再增量修改字段；拿着 push 进去的原始对象改字段，Vue 不会触发更新。这是流式增量场景最容易踩的响应式坑。

### 取消贯穿全链路

一个 `AbortController` 同时喂给 `createStream`（断 fetch）和解析循环（`signal.aborted` 即抛 AbortError），停止按钮一步到位；catch 里区分 AbortError（终态 aborted）和真错误（终态 error）。

## 坑

**来自源项目 ui-ai-assistant 源码审查的实锤：**

- ① 发送按钮是纯样式 div，无 @click 无 emit——UI 骨架先行但事件层缺失，"能看不能用"
- ② 路由导入大小写与真实文件不一致（`AiChat.vue` vs 实际 `aiChat.vue`）：Windows 大小写不敏感能跑，Linux 构建 404
- ③ 跨包相对路径深引用 `../../../../../packages/ui-ai-assistant/...` 绕过 workspace 依赖，包一挪就断
- ④ Vue2 的 `.sync` 语法残留（Vue3 应为 `v-model:xxx`）
- ⑤ SCSS 变量隐式依赖宿主 vite `additionalData` 注入——包脱离主应用无法独立编译
- ⑥ markdown 皮肤样式已备好但没有渲染器依赖，AI 输出的 markdown 实际渲染不了
- ⑦ SSE 走 vite dev 代理可能被缓冲（SSE 需要 flushHeaders / 不 buffer，或前端直连）

**流式实现的通用坑：**

- ⑧ 按 chunk 直接 JSON.parse——事件被 TCP 分片撕裂必炸，要缓冲区携带
- ⑨ 单个坏事件终止整个流——服务端会发心跳/注释行，坏事件应跳过不中断
- ⑩ 历史消息把 streaming/error 状态的消息也送回后端——只送 done 的
- ⑪ 用户上滑看历史时强制滚底——要做"用户滚动方向检测"，向上即暂停跟随

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `historyLimit` | 10 | 发送时携带的 done 消息条数上限 |
| `chunkSize` | 6 | demo 假流每 chunk 的事件数（制造分片用） |
| `delayMs` | 60 | demo 假流节奏 |
| 消息 status | streaming/done/aborted/error | 渲染状态机 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要实现一个 Vue3 的 AI 对话组件（流式输出 + 可中断），要求：
> 1. 分层：SSE 解析器做成框架无关纯函数 consumeSSEStream(chunks, handlers, signal)，
>    输入任意 AsyncIterable<string>，事件协议 data: {JSON} / data: [DONE]；
>    useChat 只管消息列表状态，UI 层拿 messages 自画气泡。
> 2. SSE 解析必须做缓冲区携带：TCP 分片不保证事件边界，按 \n 切行后最后一段
>    pop 回 buffer 拼到下一轮，否则 JSON.parse 撕裂半截直接抛错丢事件；
>    单个坏事件跳过不终止整流（服务端会发心跳）。
> 3. 消息对象两轨字段：thinking 与 content 分开累加增量，支持思考过程分区渲染；
>    status 状态机 streaming/done/aborted/error。
> 4. 取消：一个 AbortController 同时喂给 fetch 和解析循环，停止一步到位；
>    AbortError 归为 aborted 终态而非 error。
> 5. 响应式陷阱：push 进数组后必须用 messages.value[at] 取回代理再增量改字段，
>    拿原始对象改不触发更新。
> 6. 历史裁剪：只把 status=done 的消息送回后端，上限 historyLimit（默认 10）。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/ai-chat/src/`；本机路径
> `C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/ai-chat/src/`
