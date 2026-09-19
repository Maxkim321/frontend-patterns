# Frontend Patterns

个人前端**方案沉淀库**（pattern library）。每条方案 = 「什么时候用 + 怎么用 + 现成代码 + 踩过的坑 + 可配置项 + 给 AI 的提示词」。

不是提示词收藏夹，而是**个人工程手册**：遇到问题直接从库里调结论和代码，也能作为上下文喂给 AI，让 AI 按你的规范生成代码。

## 结构

```
apps/docs/                 # VitePress 站点：文档 + 在线 demo
packages/<name>/           # 一个方案 = 一个包
  ├── README.md            # 决策文档（场景 / 结论 / 坑 / 配置项）
  ├── src/                 # 可复用代码
  └── demo/                # 可运行 demo
plop-templates/            # `pnpm new` 生成新方案的模板
```

## 使用

```bash
pnpm install    # 首次安装依赖
pnpm new        # 交互式生成一条新方案骨架
pnpm new:cli -- --name xxx --title "中文标题" --tags "a,b"   # 非交互式生成（脚本/AI/CI）
pnpm dev        # 启动文档站，看 demo：http://localhost:5173
pnpm build      # 构建文档站
```

新增方案的完整约定见 [AGENTS.md](./AGENTS.md)。
