# vue-monorepo-scaffold

对标企业级智能体项目 monorepo 组织方式（apps + packages + 约定文件）的 Vue3 脚手架，拉下来即可 `pnpm dev`。

## 一条命令获取

```bash
npx tiged Maxkim321/frontend-patterns/templates/vue-monorepo-scaffold my-app
cd my-app && pnpm install && pnpm dev
```

## 目录结构

```
├── pnpm-workspace.yaml        # apps/* + packages/*
├── package.json               # 根脚本：dev / build / typecheck
├── tsconfig.base.json         # 共享 TS 基准
├── AGENTS.md                  # AI 协作约定（包边界/请求层规则/命名）
├── apps/
│   └── web/                   # Vue3 + Vite + Pinia + Router
│       └── src/main.ts        # 已接线：pinia + router + 工作区包自检
└── packages/
    ├── utils/                 # @scaffold/utils（formatDate 等）
    └── api/                   # @scaffold/api 请求层
```

## 请求层内置能力（@scaffold/api）

请求层是后端联调最先出问题的地方，模板直接内置了[弱网任务队列方案](/patterns/offline-task-queue)验证过的语义：

- **超时 15s + 错误分级**：无响应（断网/超时）与 429/5xx 走重试；4xx（鉴权/参数错）直接抛出——重试不会好的错误不要重试
- **指数退避**：800ms × 2^attempt，最多 2 次；`AbortSignal` 取消可穿透退避等待
- **钩子**：`onRequest` 注入 token、`onError` 统一提示（401 跳登录、500 toast）

```ts
import { createRequest } from '@scaffold/api'

export const request = createRequest('/api', {
  onRequest: (config) => ({ ...config, headers: { ...config.headers, token: localStorage.token } }),
  onError: (err) => { if (err.status === 401) location.href = '/login' },
})
```

## 拉取后第一件事

全局搜索 `scaffold` 替换成你的项目前缀（包名 `@scaffold/*`、title、README）。
`AGENTS.md` 已带协作约定（包之间禁止相互 import、请求必须走 @scaffold/api）——用 ZCode/Claude Code 打开即生效。
