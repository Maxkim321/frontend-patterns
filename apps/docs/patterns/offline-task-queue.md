# 弱网离线任务队列

## 在线 Demo

<ClientOnly>
<OfflineQueueDemo />
</ClientOnly>

> 源自本人实习经历的真实输入：动机是实习项目网络层（quotation-agent 的 request.ts）里
> 实际存在的弱网缺陷——axios 无 timeout 永久挂起、拦截器吞错把失败当成功（见下方坑 ①②）；
> 重试策略提炼自我 agent-server 项目的 LLM 请求层（指数退避 + 错误分级 + 取消穿透，上线代码）。
> 核心队列框架无关（transport / persistence 均为注入），Vue 侧只提供组合式封装 `useTaskQueue`。

## 决策层（为什么"核心 + 注入"）

上传的"编排"和"传输"是两件事：编排（槽位/退避/超时/取消/持久化）稳定不变，
传输（fetch / XHR 分片 / WebSocket）因业务而异。把传输抽象成
`(task, { signal, onProgress }) => Promise` 注入进来，队列核心零业务、纯函数可单测；
持久化同理抽象成 `load / save` 两方法接口，IndexedDB 与内存降级可替换。

## 结论

三件套（`packages/offline-task-queue/src/`）：

| 模块 | 职责 |
|---|---|
| `queue.ts` | 并发槽位 + 优先级调度 + 指数退避 + 超时 + AbortSignal 取消 + 进度节流落盘 |
| `persistence.ts` | `TaskPersistence` 接口 + IndexedDB 实现（含可用性探测）+ 内存降级 |
| `useTaskQueue.ts` | Vue 组合式封装：tasks ref + restore |

业务方用法：

```ts
const { tasks, queue, restore } = useTaskQueue({
  transport: fetchUpload,   // (task, { signal, onProgress }) => Promise
  concurrency: 5,           // 并发槽位
  maxRetries: 2,
  baseDelay: 800,           // 指数退避基数（源实现同值）：0.8s → 1.6s → 3.2s…
  taskTimeout: 300000,      // 5 分钟超时
})

onMounted(restore)          // 启动恢复：running/waiting → pending，progress 保留
queue.add([{ name: 'a.mp4', priority: 2 }])
queue.cancel(id)            // AbortController.abort()，槽位立即释放
```

## 原理讲解

### 取消：AbortController 是唯一通道

每个任务创建时挂一个 `AbortController`，`abort()` 之后：
transport 内部 `signal.aborted` 变 true 自行清理定时器/中断 fetch 并抛 `AbortError`；
队列 catch 里按 `e.name === 'AbortError'` 判别为用户取消 → **终态 canceled，不进重试**。
取消的另一个价值是槽位管理：并发槽有限，被取消任务占着槽，后面的任务全饿死。

### 断点续传：进度是持久化字段，不是内存变量

`task.progress` 落 IndexedDB；transport 拿到的 task 带着上次进度，从 `task.progress`
接着传（分片场景 = 跳过已成功分片）。写库有 IO 成本，所以按 **1% 刻度节流**：
进度没跨过新的整数刻度不写库，状态变化强制写。100% 必须立即写，防杀进程丢最终状态。

### 指数退避 + 抖动

`baseDelay * 2^retries + random(300ms)`（基数 800ms 与源实现一致）。固定间隔的问题：弱网恢复瞬间所有失败任务
同时重试，把刚恢复的网络再打挂（惊群）；指数递增天然错开，抖动进一步打散。

### 超时 = abort + 失败

`Promise.race([transport, timeoutPromise])`，超时分支先 `controller.abort()`
把在途传输停掉，再按失败进入退避。不做超时的话，hang 死的请求会永久占死槽位。

### 恢复语义

`restore()` 把库里 running/waiting 的任务重置为 pending（上次进程死了，状态不可信），
done/canceled 保留终态。对用户表现为：刷新页面，任务列表还在、进度还在、自动继续传。

## 坑

- **transport 不尊重 signal** → 取消后传输继续跑，槽位被假占用；signal 检查必须写进传输循环
- **AbortError 进了重试** → 用户点取消任务又自己复活；AbortError 必须直通终态
- **每次 onProgress 都写库** → 1 秒十几次事务，弱网设备直接卡死；按 1% 刻度节流
- **恢复时把 done 也重置了** → 已完成任务反复重传；恢复只重置非终态
- **重试不清 partial 状态** → 分片上传要按进度跳过已成功分片，否则服务端收到重复分片
- **未探测 IndexedDB 可用性** → 隐私模式直接崩；启动 try 探测，失败降级内存模式（宁可丢持久不可崩）

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `transport` | 必传 | 传输函数，尊重 signal、onProgress 汇报 0-100 |
| `concurrency` | 3 | 并发槽位数 |
| `maxRetries` | 2 | 最大重试次数（源实现 TRANSIENT_RETRYABLE 同值），耗尽转 failed |
| `baseDelay` | 800 | 退避基数 ms（源实现同值），按 2^n 递增 + 随机抖动 |
| `taskTimeout` | 300000 | 单次尝试超时 ms，超时先 abort 再进退避 |
| `persistence` | IndexedDB / 内存 | 缺省自动探测，可注入自定义实现 |
| `onChange` | 无 | 任务快照回调（浅拷贝数组，可直接进响应式框架） |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。完整章节说明见 `packages/offline-task-queue/README.md`。

> 本机实现路径：`C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/offline-task-queue/src/`
> （GitHub：`https://github.com/Maxkim321/frontend-patterns`）——提示词正文以上方 README 同名章节为准，
> 包含完整的需求规则清单，可直接复制使用。
