# 脚手架

这一层沉淀的是**可下载使用的项目框架**——比代码方案更重：拉下来就是能跑的工程，而不是要自己拼的片段。

获取方式（三种任选）：

```bash
# 推荐：tiged 只拉某个模板子目录
npx tiged Maxkim321/frontend-patterns/templates/<模板名> my-app

# 或 git clone 后取目录
git clone --depth 1 https://github.com/Maxkim321/frontend-patterns.git
cp -r frontend-patterns/templates/<模板名> my-app
```

（不想用命令行：GitHub 仓库页面 Code → Download ZIP，解压取 `templates/` 下对应目录。）

## 模板列表

| 模板 | 内容 | 状态 |
|---|---|---|
| [vue-monorepo-scaffold](/templates/vue-monorepo-scaffold) | pnpm workspace：Vue3 应用 + utils/api 工作区包（请求层内置弱网重试/错误分级）+ AGENTS.md 协作约定 | ✅ 可用 |
| vue-admin-scaffold | 后台管理单应用：RBAC 路由权限 + layout + 查询表格（query-table 方案）内置 | 规划中 |
| component-lib-scaffold | 组件库开发模板：vite lib mode + dts 产物 + 文档站 | 规划中 |
