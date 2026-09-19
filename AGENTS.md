# Frontend Patterns 仓库约定

这是个人前端方案沉淀库（pattern library）。AI 和人在新增 / 修改方案时都遵循本文件。

## 目录结构

- `packages/<name>/`：**一个方案 = 一个包**，`name` 用 kebab-case（如 `big-data-table`）。
  - `README.md`：决策文档，**必须有**，章节见下。
  - `src/`：可复用代码，从 `index.ts` 统一导出。
  - `demo/`：可运行示例（Vue 3 SFC）。
- `apps/docs/`：VitePress 站点，展示文档 + 在线 demo。
- `plop-templates/`：`pnpm new` 生成新方案用的模板，不要手动改生成结果，改模板。

## README 必填章节（顺序固定）

1. **frontmatter**：`场景` / `技术` / `标签` / `更新时间`。
2. **决策层**：什么时候用这个方案、为什么不选别的方案（对照表优先）。
3. **结论**：方案要点 + 指向 `src/` 具体文件。
4. **坑**：踩过的坑、容易犯的错。
5. **配置项**：哪些地方可参数化（含默认值）。
6. **给 AI 的提示词**：**必须自包含**——把关键决策、参数、默认值全部内联在提示词里，
   保证粘贴到任何项目的 AI 都能独立生效；末尾附一行本机 `src/` 的**绝对路径**（不是仓库内相对路径），
   供有文件读取权限的 AI 加载实现；仓库推到远程后可换成 URL。
7. **原理讲解**（可选，推荐）：为什么这么做、怎么处理的、优化效果如何衡量。
   效果尽量给可复现的量级（如「1 万行 DOM 里真实存在的行始终只有 ~34 个」），不给凭空的毫秒数。

## 新增一条方案的步骤

1. 生成骨架：交互式 `pnpm new`；非交互（脚本/AI/CI）用 `pnpm new:cli -- --name xxx --title "中文标题" --tags "a,b"`。
2. 填 README，**以 `packages/big-data-table` 这条满分样板为基准**（结构、措辞、章节照抄）。
3. 写 `src/` 代码，从 `index.ts` 导出。
4. 写 `demo/`，能在文档站里直接跑。
5. 在 `apps/docs/.vitepress/config.ts` 注册侧边栏；demo 组件在 `apps/docs/.vitepress/theme/index.ts` 用 `enhanceApp` 注册。
6. `pnpm dev` 验证 demo 能跑、文档能看。

## 命名与风格约定

- 组合式函数用 `useXxx` 命名；Web Worker 文件用 `*.worker.ts` 命名。
- 勾选 / 状态**永远绑定稳定的业务 id，不绑数组下标**（排序筛选会打乱下标）。
- 耗时计算（筛选 / 排序 / 搜索）丢进 Web Worker；worker **只回传 id 列表**，不回传完整对象。
- 数据量小时（几百条以内）优先主线程直接算，避免 worker 序列化开销。

## 给 AI 的用法

用户说「我要做 XX」时：先读本文件理解结构 → 找 `packages/` 里相关方案 → 按其 README 的决策层判断 + 复用其 `src/` 代码。若没有现成方案，按上面步骤新增一条。
