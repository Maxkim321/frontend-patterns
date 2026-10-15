---
场景: 给组件 / 组合式函数补单元测试（Vitest + Vue Test Utils）
标签: 测试, Vitest, Vue3
---

# 单元测试生成

> 来源：库内方案实战（big-data-table / form-wizard 的测试要点提炼）。测试生成的关键是**把"该测什么"喂给 AI**——让它自己想，它会只测 happy path。

## 什么时候用

- 新写的组合式函数 / 组件要补测试
- 修了一个 bug，想加回归用例锁住

## 提示词（复制即用）

```text
你是测试工程师，为下面的 Vue3 代码写 Vitest 单元测试（组件用 @vue/test-utils，纯函数/组合式直接调用）。

【该测什么——按优先级】
1. 边界输入：空数组/空对象/null/undefined/0/空串
2. 竞态：连续调用时旧结果覆盖新结果（用 fake timers / 手动 resolve 顺序控制）
3. 错误路径：Promise reject、接口报错时状态是否正确（loading 复位、错误信息）
4. 状态机：idle→loading→done/error 每次转移
5. 最后才是 happy path

【要求】
- 每个 test 只测一个行为，命名用中文描述行为："空列表时返回空而不是报错"
- mock 掉网络层（vi.stubGlobal / msw），不测真实请求
- 用 vi.useFakeTimers 控制定时器/防抖
- 断言行为而不是实现（断言渲染结果/返回值，不断言内部调用了什么私有方法）
- 输出可直接运行的完整测试文件，import 路径按我给的项目结构写

【代码】
（粘贴源码）

【已有测试（避免重复覆盖）】
（可选：粘贴已有测试文件）
```

## 使用要点

- **测试清单自己出、代码让 AI 写**：AI 自由发挥时 80% 的用例是 happy path 变体，价值极低
- 竞态用例的写法：把两个 Promise 的 resolve 顺序手动控制（先发起 A，再发起 B，先 resolve B，断言最终展示的是 B）
- 组合式函数依赖 onUnmounted 清理时，测试里要包一层组件挂载或用 `withSetup` 辅助工具，否则清理逻辑测不到
- 生成后先跑一遍，把通不过的用例连报错喂回 AI 修——不要手工改它的测试
