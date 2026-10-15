# Vue Monorepo Scaffold

Vue3 + pnpm workspace 脚手架：一个应用 + 多个可复用工作区包。结构对标企业级智能体项目的 monorepo 组织方式。

## 目录

```
apps/web/            应用：Vue3 + Vite + Pinia + Router
packages/utils/      @scaffold/utils 通用工具
packages/api/        @scaffold/api 请求层（超时 + 错误分级 + 弱网指数退避重试）
```

## 使用

```bash
# 方式一：tiged（推荐，只拉这个子目录）
npx tiged Maxkim321/frontend-patterns/templates/vue-monorepo-scaffold my-app
cd my-app && pnpm install && pnpm dev

# 方式二：git clone 后取目录
git clone --depth 1 https://github.com/Maxkim321/frontend-patterns.git
cp -r frontend-patterns/templates/vue-monorepo-scaffold my-app
```

拉下来后第一件事：全局搜索 `scaffold` 改成你的项目名。

## 请求层内置能力

- **超时 15s + 错误分级**：无响应（断网/超时）与 429/5xx 可重试；4xx 直接抛出不重试（重试不会好的错误不要重试）
- **指数退避**：800ms × 2^attempt，最多 2 次；取消（AbortSignal）可穿透退避等待
- **钩子**：`onRequest` 注入 token、`onError` 统一提示（401 跳登录等）

## AGENTS.md

仓库根已带 AI 协作约定（目录边界/请求层规则/命名约定）——用 ZCode/Claude Code 打开即可生效。
