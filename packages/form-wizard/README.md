---
场景: 要素多、有依赖关系的复杂提交（智能报价 / 工单创建 / 配置开通），分步引导填写，提交后由服务端 Agent 计算并返回结果
技术: Vue3 + Element Plus + schema 驱动步骤 + 提交状态机
标签: 表单, 向导, 分步, 组件封装, 智能报价, Agent
更新时间: 2026-10-11
---

# 分步表单向导

出处说明（诚实版）：源自洛阳经济智能体项目（quotation-agent）的智能报价模块——源码中 `views/smart-quote/SmartQuoteView.vue` 是规划中的占位页（代码注释原话："后续可用于报价单、参数选择和结果对比"），向导交互层当时未落地。本方案是该交互层的**完整实现沉淀**：分步填报价要素 → 提交 → 服务端 Agent 检索规则计算 → 前端渲染报价明细 + 生成式说明。demo 即按这个业务场景做的可运行版本。

## 面试口径（R2：智能报价你做了什么？）

> 我参与前端交互层。核心问题是：报价要素不是固定的——不同品类要收集的参数完全不同，私有化要问部署环境、旗舰版要问并发实例、数量到了阶梯阈值折扣档位会变。所以我做的不是写死的步骤表单，而是**规则/Agent 驱动的动态表单**：前端是 schema 渲染器，字段带依赖声明（deps）和动态选项（options 可以是按当前数据求值的函数），用户每填一项，后面的字段集合跟着变；隐藏字段的残留值会被剔除、不进提交数据。填完提交，服务端 Agent 检索规则计算，前端渲染报价明细加一段生成式说明（流式输出）。Agent 的编排逻辑在服务端，我负责交互和结果渲染。

demo 就是这段话的可运行版本：选私有化才出现部署环境、数量 ≥50 件折扣档位自动变多，每一步都能当场演示。

## 决策层（为什么分步向导，而不是一页长表单）

| 方案 | 评价 | 什么时候选 |
|---|---|---|
| 一页长表单 | 全部字段一屏铺开，报价要素 + 商务条件 10+ 字段，压迫感强、易漏填 | 字段 ≤ 5 个 |
| **分步向导**（本方案） | 按认知顺序拆步（品类 → 规格数量 → 折扣），每步只关注 1~2 个决策，校验边界清晰 | 字段多且有先后依赖 ✅ |
| 对话式收集（AI 逐项问） | 体验新颖但效率低、不可跳改 | 轻量咨询场景 |

核心判断：**报价是"结构化输入 + 规则计算"**，用户要的是高效填完，不是聊天——分步向导降低单步认知负担，同时保证提交数据的结构化（Agent 规则检索需要确定的字段名和类型）。

## 结论

- `src/useWizard.ts` —— 框架无关核心：当前步索引、数据聚合、分步校验、提交状态机（idle → submitting → done/error）
- `src/FormWizard.vue` —— 封装组件：步骤条（可点击回退已填步骤）+ schema 渲染当前步 + 分步校验拦截 + 提交防重；`#result` 插槽外放结果区（报价明细、生成式说明都是业务渲染），`#step-<index>` 插槽可完全接管某一步
- `src/types.ts` —— `WizardStep` / `WizardField`（required + 自定义 validate）/ `StepValidation`

```ts
const steps: WizardStep[] = [
  { title: '品类', fields: [{ name: 'category', label: '产品品类', type: 'select', required: true, options }] },
  { title: '规格与数量', fields: [
    { name: 'spec', label: '规格说明', type: 'textarea', required: true,
      validate: (v) => (String(v).length >= 10 ? true : '规格描述至少 10 个字') },
    { name: 'quantity', label: '采购数量', type: 'number', required: true },
  ]},
]
```

## 原理讲解（关键机制）

### 校验边界：只校验当前步

点「下一步」时才校验**当前步**的字段（required + 自定义 validate），绝不整表校验——用户填到第 2 步时不该被第 3 步的必填项拦住。错误是字段级的（name → 错误信息），显示在对应控件下方。

### 条件字段：Agent 驱动的字段集合（动态表单的核心）

报价要素不是固定的——不同品类要问的参数不同。前端做 **schema 渲染器**，字段集合由依赖声明决定：

- `deps: { field, includes }`：品类选了"私有化"才渲染"部署环境"，选了"旗舰版"才渲染"并发实例"
- `deps: { when: (data) => Number(data.quantity) >= 50 }`：数量到阶梯阈值才出现"阶梯折扣申请"
- `options` 支持函数形态：`(data) => options`——折扣档位随数量动态增减（Agent 检索到的阶梯规则）

三条配套纪律：**隐藏字段不参与校验**（否则被条件藏起来的 required 字段会把人卡死在当前步）、
**隐藏字段的残留值不进提交数据**（用户先选私有化填了部署环境、又改成服务，残留的部署环境若提交就是脏数据）、
**校验与渲染共用同一份可见性判断**（visibleFields 同时喂模板和校验器，不会出现"看得见却没校验/校验了却看不见"）。
服务端完全体是 Agent 每轮返回下一步 schema、前端只渲染——同一思路的服务端版本，切换成本只在数据来源。

### 数据贯穿，最后提交

所有步骤共享同一个 `data` 对象，最后一步「提交报价」才整体提交——每步不单独提交，避免中间态脏数据进后端。返回编辑（`editFrom`）保留已填数据、状态回 idle，改完重新提交。

### 提交状态机防重复

`idle → submitting → done/error`：submitting 期间按钮 loading 且 `submit()` 直接返回 false（防重复点击把同一单提交两次）；reject 时状态回 error 并显示原因，数据不丢，可直接重试。

### 生成式说明的流式渲染

提交成功后，Agent 返回的生成式说明用**逐字流式**渲染（demo 用打字机模拟；真实项目接 SSE 接口，解析器与「AI 对话组件」方案是同一个 `consumeSSEStream`——对话和报价说明复用同一条流式链路，这是 workspace 包拆分的收益）。

### 真实模型接入（本地开发）

demo 的生成式说明支持真实模型流式（火山引擎 Ark，OpenAI 兼容协议，`glm-5.3-flash`），安全姿势三件套：
① key 放 `apps/docs/.env.local`（gitignore，永不进仓库）；② Vite 代理 `/api/ark` 转发到
`ark.cn-beijing.volces.com/api/coding/v3` 并在 `proxyReq` 钩子**服务端注入** Authorization——
key 不进浏览器 bundle；③ fetch 失败（公网静态站无代理）自动降级为本地打字机模拟，站点永远可演示。
适配器 `openAICompatToProtocol`（来自 `@playbook/ai-chat`，跨包复用）把 OpenAI 兼容 SSE 转成本仓库的
thinking/answer 双轨协议——对话与报价说明复用同一条解析链路。

## 坑

- **条件字段参与校验**：被 deps 隐藏的 required 字段若还校验，用户会被看不见的字段卡死在当前步——校验范围必须是可见字段
- **隐藏字段的残留值进提交数据**：改过品类后旧参数还在 payload 里，后端按脏数据计算——提交前按可见集合剔除
- **整表校验**：next 时校验所有步 → 用户在第 1 步就被第 3 步的必填拦住，体验灾难
- **每步单独提交**：中间态（品类填了、数量没填）进了后端，要额外做草稿/作废逻辑
- **提交不加状态机**：双击「提交报价」= 同一单计算两次；submitting 期间必须禁点
- **返回编辑丢数据**：结果页点"返回修改"如果 reset 了 data，用户全部重填——editFrom 保留数据只回退状态
- **步骤条只能前进**：用户想改第 1 步的字段必须一路"上一步"点回去——已完成的步骤应可点击直达
- **生成式说明没做中断/复用**：长文案打字机在组件卸载后还在 setInterval（定时器泄漏），要在卸载时清理
- **校验错误不落在字段上**：只弹 toast 不标字段，用户找不到哪错了；错误必须跟随控件

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `steps[].fields[].type` | input | input / textarea / select / number |
| `fields[].required` | false | next 时校验当前步必填 |
| `fields[].validate` | 无 | 业务校验，返回 true 或错误字符串 |
| `fields[].deps` | 无 | 条件显示：field/includes 精确匹配或 when 函数；隐藏字段不校验、不进提交 |
| `fields[].options` | 无 | 静态数组或 `(data) => options` 函数（动态选项集合） |
| 提交状态机 | idle/submitting/done/error | 防重复提交 |
| `#result` 插槽 | 无 | 结果区完全由业务方渲染 |
| `#step-<index>` 插槽 | 无 | 接管某一步的渲染 |

## 给 AI 的提示词

自包含版：不依赖本仓库也能生效，可直接粘贴到任何项目。

> 我要实现一个 Vue3 分步表单向导组件（智能报价场景：分步填要素 → 提交 → Agent 计算 → 结果渲染），要求：
> 1. schema 驱动：steps 数组（title/description/fields），字段 type 映射 input/textarea/select/number
>    控件，全部绑同一个 data 对象；新增字段只加配置。
> 2. **Agent 驱动的字段集合**：字段带 deps 依赖声明（{field, includes} 精确匹配或 {when: data => boolean}
>    函数判断），条件不满足的字段不渲染；options 支持函数形态 (data) => options（折扣档位随数量变化）；
>    隐藏字段不参与校验、其残留值在提交 payload 中剔除——前端是 schema 渲染器，字段集合由
>    已填内容/规则决定。
> 3. 校验边界：只在「下一步/提交」时校验当前步**可见**字段（required + 自定义 validate，
>    返回 true 或错误字符串），错误信息显示在对应控件下方，绝不整表校验。
> 4. 数据贯穿：所有步骤共享 data，最后一步才整体提交；editFrom 保留数据回到任意已填步骤。
> 5. 提交状态机 idle→submitting→done/error：submitting 期间禁点防重复提交；
>    reject 显示原因且数据不丢可重试。
> 6. 步骤条：已完成步骤可点击回退直达；进度条随步数推进。
> 7. 渲染外放：#result 插槽渲染提交结果（如报价明细 + Agent 生成式说明的流式输出），
>    #step-<index> 插槽可接管任意一步。
> （可选）参考实现：GitHub `https://github.com/Maxkim321/frontend-patterns`
> 下 `packages/form-wizard/src/`；本机路径
> `C:/Users/Maxkim/Desktop/冲刺秋招/项目/frontend-patterns/packages/form-wizard/src/`
