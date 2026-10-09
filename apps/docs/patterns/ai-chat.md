# AI 对话组件

## 在线 Demo

<ClientOnly>
<AiChatDemo />
</ClientOnly>

> 源自智能体产品的对话层提炼：流式渲染、思考过程与最终答案分轨、滚动跟随、
> 中断保留已生成内容。传输抽象为 `AsyncIterable<string>` 注入——SSE 解析器
> 不关心连的是真实大模型接口还是模拟流。

## 决策层（为什么"解析器 + 注入流源"）

对话组件里稳定的部分是 **SSE 解析与渲染状态机**（buffer 分帧、事件分轨、
取消语义、滚动跟随），易变的部分是**怎么连服务器**（不同网关/协议/鉴权）。
把流源抽象成 `createStream(history, { signal }) => AsyncIterable<string>`，
解析器只认 chunk 文本，换后端零改动；demo / 单测用模拟生成器即可离线跑通全链路。

## 结论

三件套（`packages/ai-chat/src/`）：

| 模块 | 职责 |
|---|---|
| `stream.ts` | SSE 分帧解析（buffer carryover）+ 事件分轨 + demo 用模拟流生成器 |
| `useChat.ts` | 消息列表状态、两轨增量落字段、发送/停止/清空 |
| `types.ts` | ChatMessage（thinking / content 双轨 + status 状态机） |

业务方用法：

```ts
const { messages, streaming, send, stop } = useChat({
  createStream: (history, { signal }) => {
    // 真实项目：fetch POST → body.getReader() → 文本增量
    return realLLMStream(history, signal)
  },
})

function stop() // abort：已生成内容保留，status 转 aborted
```

## 原理讲解

### 分帧：缓冲区携带（buffer carryover）

TCP 分片不保证按事件边界到达——一个 `data: {...}` 事件可能被切在两个 chunk 里。
按 `\n` 切行后，**最后一段必须 pop 回 buffer 拼进下一轮**；直接对整个 chunk 逐行
JSON.parse，撕裂的半截 JSON 会抛错丢事件。这是 SSE 客户端第一坑。

### 两轨消息：thinking 与 answer 分离

推理型模型的输出天然分"思考"与"答案"，前端按事件 type 落到消息的两个字段：
思考过程用 `<details>` 折叠、流式期间默认展开、答案开始后自动收起（`:open` 绑定）；
答案打字机渲染。两轨分开后，"只显示答案"的极简模式只是不渲染 thinking 字段。

### 取消语义

`AbortController` 贯穿三层：useChat 持有 controller → 传给 createStream（真实
传输要传给 fetch 的 signal）→ 传给解析器（chunk 间检查）。abort 后：
解析器抛 AbortError → useChat catch 转 `aborted` 终态 → **已生成内容保留**。
用户点"停止"的预期是"到此为止"，不是"删掉重来"。

### 滚动跟随

流式输出会持续撑高消息区，自动滚到底是对的；但用户上翻看历史时强行拉回是反交互。
判据：`scrollHeight - scrollTop - clientHeight < 阈值` 视为"在底部"才跟随，
scroll 事件里实时更新 follow 状态——用户拉离就停，拉回底部就恢复跟随。

### 响应式陷阱

push 进 `ref` 数组的对象，必须通过 `messages.value[at]` 取回响应式代理后再增量改
字段；拿着 push 前的原始对象改，Vue 追踪不到，界面不更新。

## 坑

- **不留 buffer 尾巴** → 撕裂的 JSON 直接抛错丢事件，症状是"偶尔少几个字"
- **拿原始对象改字段** → 流式期间界面静止，收尾才一次性出现
- **AbortError 被当错误处理** → 点停止弹错误提示；AbortError 是正常分支
- **滚动无条件置底** → 用户上翻被反复拉回，只能关页面
- **content 用 v-html 直渲染** → 模型输出未消毒直接 XSS；要渲染 Markdown 先过 sanitizer
- **流源没接 signal** → 点停止后网络层还在跑，流量照烧

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `createStream` | 必传 | 流源工厂：`(history, { signal }) => AsyncIterable<string>` |
| `historyLimit` | 10 | 发送时携带的历史消息条数上限 |
| 协议 | `data: {JSON}` | 事件 `{type:'thinking'\|'answer', delta}`，`data: [DONE]` 结束 |
