---
场景: 弱网/移动端下"必须最终成功"的异步任务——大文件上传、表单提交、消息发送，失败不能丢、刷新不能断
技术: 框架无关核心 + Vue3 组合式封装 + IndexedDB 持久化
标签: 弱网, 离线, 任务队列, 重试, 断点续传, IndexedDB
更新时间: 2026-10-11
---

# 弱网离线任务队列

重试机制的提炼来源：mcp-browser-analyzer 项目 agent-server 的 LLM 请求重试实现（`core/llm-providers.js`，指数退避 + 错误分级 + 取消穿透）；为什么要封装则来自业务项目的真实教训（见坑 ①②）。

## 决策层（为什么要自己封装队列）

| 方案 | 评价 | 什么时候够用 |
|---|---|---|
| 直接调 API | 弱网失败即丢失，刷新页面任务全没了 | 强网内网小请求 |
| axios-retry 类拦截器 | 只有"单次请求的重试"，没有持久化、并发控制、进度、断点 | 偶发抖动的查询请求 |
| **队列核心 + 注入传输/持久化**（本方案） | 编排与执行解耦：并发、优先级、退避、超时、取消、断点续传全在队列层 | 上传/提交类"必须最终成功"的任务 ✅ |

核心判断：**重试不是"失败再调一次"，而是"任务生命周期管理"**——任务要活过页面刷新（持久化）、要控制并发（别把弱网打更堵）、要能取消、要可观测进度。

## 结论

职责边界：**本队列只做"编排"，怎么传和存到哪都由注入决定**。

- `src/queue.ts` —— 框架无关核心：并发槽位、优先级调度、指数退避 + 抖动、超时、取消、进度节流落盘
- `src/persistence.ts` —— 持久层：IndexedDB（自动检测）/ 内存 两套实现，同一 `TaskPersistence` 接口
- `src/useTaskQueue.ts` —— Vue 组合式封装：核心 `onChange` 浅拷贝整组替换 ref
- `src/types.ts` —— `QueueTask`（status 七态机）/ `TaskTransport` / `TaskPersistence`

```ts
const { tasks, queue, restore } = useTaskQueue({
  transport: async (task, { signal, onProgress }) => { /* 真实上传 */ },
})
await restore()          // 启动恢复：running→pending，progress 保留
queue.add([{ name: '报告.pdf', size: 1024 ** 2, priority: 5 }])
```

## 原理讲解（关键机制）

### 指数退避 + 随机抖动

`baseDelay * 2^retries + rand(0~300ms)`：1s → 2s → 4s。指数拉开间隔给服务恢复时间；**抖动避免恢复瞬间的惊群**——所有失败任务同一时刻重发等于二次打挂。

### 错误分级：不是所有失败都值得重试

4xx（鉴权/参数错）和用户取消重试多少次都一样失败，直接终态；只有 429 / 5xx / 网络层失败（fetch TypeError）进退避。"重试不会好的错误不要重试"。

### 取消永远优先于重试

每次重试前检查 `signal.aborted`——**取消要能穿透退避等待期**，用户点取消后连"正在等下一轮"的任务都不会再发起，直接终态 canceled。

### 断点续传：进度节流落盘

状态变更 + 跨过 1% 刻度的进度变化才写 IndexedDB（平衡 IO 与断点粒度）。`restore()` 把刷新前 running/waiting 的任务重置回 pending 但**保留 progress**，transport 拿着 `task.progress` 从断点接着传（如跳过已成功分片）。

## 坑

- ① **axios 不设 timeout = 永久挂起**（默认 0）：弱网下请求无限等——原业务项目 `request.ts` 真实缺陷
- ② **错误拦截器"吞错"**：无响应分支（断网/超时）只弹 toast 不 `Promise.reject`，调用方 await 拿到 undefined，**失败被上层当成功**——弱网没测过的典型产物（同文件真实 bug）
- ③ 重试不看错误类型：4xx 重试无意义还放大流量
- ④ 退避不加抖动：服务恢复瞬间所有任务齐发，二次打挂
- ⑤ 取消穿透不了退避：用户取消了，sleep 里的 setTimeout 又把任务拉起来
- ⑥ 进度每次变更都写库：1% 一 progress，高频 IO；要节流
- ⑦ restore 不重置 running 状态：刷新后任务永远卡在"上传中"

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `concurrency` | 3 | 并发槽位数 |
| `maxRetries` | 3 | 自动重试上限 |
| `baseDelay` | 1000 | 退避基数（×2^retries） |
| `taskTimeout` | 300000 | 单次尝试超时（超时即 abort，按失败进退避） |
| `persistence` | 自动 | IndexedDB 可用则用之，否则内存 |
| 进度节流 | 1% | 跨刻度才写库 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要实现一个弱网离线任务队列（大文件上传/表单提交场景），要求：
> 1. 职责分离：队列核心只做编排（并发槽位、优先级调度、指数退避+随机抖动、单任务超时、取消），
>    怎么传输由注入的 transport(task, {signal, onProgress}) 决定，存哪由注入的
>    persistence（save/load 接口，IndexedDB 或内存实现）决定。
> 2. 重试策略：baseDelay × 2^retries + 随机抖动（防恢复瞬间惊群）；错误分级——
>    只有 429/5xx/网络层 TypeError 进退避，4xx 和用户取消直接终态；
>    每次重试前检查 signal.aborted，取消要穿透退避等待期。
> 3. 断点续传：任务状态与进度持久化到 IndexedDB，进度按 1% 刻度节流写库；
>    启动 restore() 把 running/waiting 重置为 pending 并保留 progress，
>    transport 从 task.progress 断点续传（如跳过已成功分片）。
> 4. 单任务超时用 Promise.race + AbortController：超时先 abort 在途传输再按失败进退避。
> 5. Vue 封装：核心 onChange 输出浅拷贝快照，useTaskQueue 整组替换 ref 触发更新。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/offline-task-queue/src/`；本机路径
> `C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/offline-task-queue/src/`
