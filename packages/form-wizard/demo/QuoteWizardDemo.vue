<template>
  <div class="qw-demo">
    <!-- ═══ 自然语言入口：一句话描述需求 → LLM 抽取结构化要素 → 表单预填、只补缺口 ═══ -->
    <div class="qw-nl">
      <div class="qw-nl__head">
        <span class="qw-ai-badge">对话式收集</span>
        <span>用一句话描述采购需求，AI 解析后自动预填表单——你只需补齐它没听懂的缺口</span>
      </div>
      <div class="qw-nl__row">
        <textarea
          v-model="nlText"
          class="qw-nl__input"
          rows="2"
          placeholder="例如：想采购 60 件私有化部署，放在本地 IDC，3 节点集群，含一年维保"
        />
        <el-button type="primary" :loading="parsing" @click="onParse">
          {{ parsing ? '解析中…' : 'AI 解析并预填' }}
        </el-button>
      </div>
      <p v-if="parseStatus" class="qw-nl__status" :class="{ 'qw-nl__status--err': parseError }">
        {{ parseStatus }}
      </p>
    </div>

    <FormWizard ref="wizardRef" :steps="steps" :submit="submitQuote" @submit="onSubmitted">
      <!-- ═══ 结果区：报价明细 + 生成式说明（业务渲染，插槽外放） ═══ -->
      <template #result="{ data }">
        <div class="qw-result">
          <div class="qw-result__detail">
            <h4>报价明细</h4>
            <table>
              <tbody>
                <tr><th>品类</th><td>{{ data.category }}</td></tr>
                <tr v-if="data.deployEnv"><th>部署环境</th><td>{{ data.deployEnv }}</td></tr>
                <tr v-if="data.instances"><th>并发实例</th><td>{{ data.instances }} 个</td></tr>
                <tr v-if="data.duration"><th>服务周期</th><td>{{ data.duration }}</td></tr>
                <tr><th>规格</th><td>{{ data.spec }}</td></tr>
                <tr><th>数量</th><td>{{ data.quantity }} 件</td></tr>
                <tr><th>折扣</th><td>{{ discountText }}</td></tr>
                <tr class="qw-total"><th>合计</th><td>¥{{ total }}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="qw-result__ai">
            <h4>生成式说明 <span class="qw-ai-badge">Agent 生成</span></h4>
            <p class="qw-ai-text">{{ aiText }}<span v-if="aiStreaming" class="qw-cursor">▍</span></p>
          </div>
        </div>
      </template>
    </FormWizard>
    <p class="qw-demo-tip">
      Agent 驱动的动态表单：一句话描述需求 → AI 抽取要素自动预填（对话式收集）；
      选「私有化」才出现部署环境、数量填到 50 件折扣档位自动变多（字段集合由已填内容决定）；
      提交后 Agent 检索规则计算，前端渲染明细 + 逐字流式的生成式说明。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { FormWizard } from '../src/index'
import type { WizardStep } from '../src/index'
// 跨包复用（workspace 包直引源码）：OpenAI 兼容适配器与 ai-chat 方案共用同一条解析链路
import { openAICompatToProtocol } from '@playbook/ai-chat/src/index.js'

// ── 报价要素：条件字段（deps）+ 动态选项（options 函数）——Agent/规则决定字段集合 ──
const steps: WizardStep[] = [
  {
    title: '品类',
    description: '选择要报价的产品品类——它决定后面要收集哪些参数。',
    fields: [
      {
        name: 'category',
        label: '产品品类',
        type: 'select',
        required: true,
        placeholder: '请选择品类',
        options: [
          { label: '智能体平台-标准版', value: '标准版' },
          { label: '智能体平台-旗舰版', value: '旗舰版' },
          { label: '私有化部署', value: '私有化' },
          { label: '咨询实施服务', value: '服务' },
        ],
      },
    ],
  },
  {
    title: '规格与数量',
    description: '通用规格之外，不同品类需要的参数不同——由品类动态决定。',
    fields: [
      {
        name: 'spec',
        label: '规格说明',
        type: 'textarea',
        required: true,
        placeholder: '如：3 个智能体实例 / 50 万 tokens / 含一年维保',
        validate: (v) => (String(v).length >= 10 ? true : '规格描述至少 10 个字，便于 Agent 匹配规则'),
      },
      {
        name: 'quantity',
        label: '采购数量',
        type: 'number',
        required: true,
        suffix: '件',
        validate: (v) => (Number(v) > 0 ? true : '数量必须大于 0'),
      },
      // ── 条件字段：按品类动态出现（Agent 检索该品类的计价要素）──
      {
        name: 'deployEnv',
        label: '部署环境',
        type: 'select',
        required: true,
        placeholder: '请选择部署环境',
        deps: { field: 'category', includes: ['私有化'] },
        options: [
          { label: '阿里云', value: '阿里云' },
          { label: '华为云', value: '华为云' },
          { label: '本地 IDC', value: '本地 IDC' },
        ],
      },
      {
        name: 'instances',
        label: '并发实例数',
        type: 'number',
        required: true,
        suffix: '个',
        deps: { field: 'category', includes: ['旗舰版'] },
      },
      {
        name: 'duration',
        label: '服务周期',
        type: 'select',
        required: true,
        placeholder: '请选择服务周期',
        deps: { field: 'category', includes: ['服务'] },
        options: [
          { label: '1 个月', value: '1 个月' },
          { label: '3 个月', value: '3 个月' },
          { label: '6 个月', value: '6 个月' },
        ],
      },
    ],
  },
  {
    title: '折扣条件',
    description: '折扣档位随数量变化（阶梯规则由 Agent 检索）。',
    fields: [
      {
        name: 'discount',
        label: '折扣条件',
        type: 'select',
        placeholder: '请选择折扣档位',
        // 动态选项：数量达到阶梯阈值（≥50 件）时，Agent 检索出额外档位
        options: (data) => {
          const base = [
            { label: '无折扣', value: 'none' },
            { label: '批量采购 95 折', value: '0.95' },
            { label: '年度框架 9 折', value: '0.9' },
          ]
          return Number(data.quantity) >= 50
            ? [...base, { label: '阶梯采购 85 折（≥50 件）', value: '0.85' }]
            : base
        },
      },
      // 数量达到阶梯才出现的申请项
      {
        name: 'tierRequest',
        label: '阶梯折扣申请说明',
        type: 'textarea',
        required: true,
        placeholder: '简述采购计划，供 Agent 匹配阶梯规则',
        deps: { when: (data) => Number(data.quantity) >= 50 },
      },
    ],
  },
]

// ── 自然语言 → 结构化抽取 → 表单预填（对话式收集 + 分步向导的合体） ──
const wizardRef = ref<InstanceType<typeof FormWizard>>()
const nlText = ref('')
const parsing = ref(false)
const parseStatus = ref('')
const parseError = ref(false)

const CATEGORY_MAP: Record<string, string> = {
  '标准版': '标准版', '旗舰版': '旗舰版', '私有化': '私有化', '服务': '服务',
  '智能体平台-标准版': '标准版', '智能体平台-旗舰版': '旗舰版',
  '私有化部署': '私有化', '咨询实施服务': '服务',
}
const DEPLOY_MAP: Record<string, string> = {
  '阿里云': '阿里云', '华为云': '华为云', '本地 IDC': '本地 IDC', '本地IDC': '本地 IDC',
}

async function onParse() {
  const text = nlText.value.trim()
  if (!text || parsing.value) return
  parsing.value = true
  parseError.value = false
  parseStatus.value = ''
  try {
    const res = await fetch('/api/ark/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-5.3-flash',
        messages: [
          {
            role: 'system',
            content:
              '你是报价要素信息抽取器。从用户描述中抽取字段，严格输出一个 JSON 对象（禁止 markdown 代码块），schema：' +
              '{"category":"标准版|旗舰版|私有化|服务 之一","quantity":正整数或null,"spec":"规格描述字符串或null","deployEnv":"阿里云|华为云|本地 IDC 之一或null"}。' +
              '无法确定的字段填 null，不要编造。',
          },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
      }),
    })
    if (!res.ok) throw new Error(`Ark ${res.status}`)
    const json = await res.json()
    let raw = json.choices?.[0]?.message?.content ?? ''
    raw = raw.replace(/```json|```/g, '').trim() // 宽容解析：剥掉可能的代码块围栏
    const extracted = JSON.parse(raw)
    // 枚举值归一：抽取结果可能是中文标签，映射回表单 value
    const mapped: Record<string, unknown> = {}
    if (extracted.category && CATEGORY_MAP[extracted.category]) mapped.category = CATEGORY_MAP[extracted.category]
    if (typeof extracted.quantity === 'number' && extracted.quantity > 0) mapped.quantity = extracted.quantity
    if (extracted.spec) mapped.spec = extracted.spec
    if (extracted.deployEnv && DEPLOY_MAP[extracted.deployEnv]) mapped.deployEnv = DEPLOY_MAP[extracted.deployEnv]
    if (Object.keys(mapped).length === 0) {
      parseStatus.value = '没从这句话里抽到可用的报价要素，换个说法试试（要包含品类/数量）'
      parseError.value = true
      return
    }
    const stepIndex = wizardRef.value?.prefill(mapped) ?? 0
    const filled = Object.keys(mapped)
      .map((k) => `${k}=${mapped[k]}`)
      .join('，')
    const stepTitle = steps[stepIndex]?.title ?? ''
    parseStatus.value = `已抽取并预填：${filled} —— 跳到第 ${stepIndex + 1} 步「${stepTitle}」，补齐剩余项即可提交`
  } catch (e) {
    parseStatus.value = `解析失败（${(e as Error).message}），可手动分步填写`
    parseError.value = true
  } finally {
    parsing.value = false
  }
}

// ── 模拟 Agent：检索规则计算（延迟 1.2s）──
const unitPrice = ref(0)
const submitted = ref<Record<string, unknown>>({})

function submitQuote(data: Record<string, unknown>) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      const base: Record<string, number> = { 标准版: 80000, 旗舰版: 150000, 私有化: 300000, 服务: 50000 }
      unitPrice.value = base[data.category as string] ?? 0
      submitted.value = { ...data }
      resolve()
    }, 1200)
  })
}

const discount = computed(() => Number(submitted.value.discount ?? 'none'))
const discountText = computed(() => (discount.value === 0 ? '无' : `${discount.value * 10} 折`))
const total = computed(() =>
  Math.round(unitPrice.value * Number(submitted.value.quantity ?? 0) * (discount.value || 1)).toLocaleString()
)

// ── 生成式说明：优先走真实模型（Vite 代理注入鉴权），失败降级为打字机模拟 ──
const aiText = ref('')
const aiStreaming = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

function fallbackText(data: Record<string, unknown>) {
  const cond = data.deployEnv
    ? `部署于${data.deployEnv}`
    : data.instances
      ? `并发 ${data.instances} 实例`
      : data.duration
        ? `服务周期 ${data.duration}`
        : '标准配置'
  const tier =
    Number(data.quantity) >= 50
      ? '已命中阶梯规则 R-2048（≥50 件），在基础折扣上再降一档'
      : '未达阶梯阈值，按基础档位计价'
  return (
    `根据规则库检索，${data.category} 适用于阶梯计价规则 R-1024（${cond}）：` +
    `${tier}，${discountText.value !== '无' ? `叠加商务条件后折后合计 ¥${total.value}。` : `合计 ¥${total.value}。`}` +
    `报价有效期 30 天，含标准维保；若数量提升至下一阶梯（≥50 件），单价还可下探约 8%，建议评估集中采购。`
  )
}

function typewriter(text: string) {
  aiText.value = ''
  aiStreaming.value = true
  clearInterval(timer)
  let i = 0
  timer = setInterval(() => {
    aiText.value = text.slice(0, ++i)
    if (i >= text.length) {
      aiStreaming.value = false
      clearInterval(timer)
    }
  }, 30)
}

async function onSubmitted(data: Record<string, unknown>) {
  aiText.value = ''
  aiStreaming.value = true
  clearInterval(timer)
  const brief =
    `报价要素：品类=${data.category}；规格=${data.spec}；数量=${data.quantity} 件；` +
    `单价 ¥${unitPrice.value.toLocaleString()}；折扣=${discountText.value}；合计 ¥${total.value}。` +
    (data.deployEnv ? `部署环境=${data.deployEnv}。` : '') +
    (data.instances ? `并发实例=${data.instances}。` : '') +
    (data.tierRequest ? `阶梯申请=${data.tierRequest}。` : '')
  try {
    const res = await fetch('/api/ark/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-5.3-flash',
        messages: [
          {
            role: 'system',
            content:
              '你是「洛阳经济智能体」的报价助手。根据用户给出的报价要素与规则检索结果，生成 100 字以内的报价说明：说明计价依据 + 一条业务建议。直接输出说明文字，不要 markdown、不要寒暄。',
          },
          { role: 'user', content: brief },
        ],
        stream: true,
        temperature: 0.5,
      }),
    })
    let got = false
    for await (const chunk of openAICompatToProtocol(res)) {
      const j = JSON.parse(chunk.slice(5).trim())
      if (j.type === 'answer') {
        aiText.value += j.delta
        got = true
      }
    }
    if (!got) throw new Error('空响应')
    aiStreaming.value = false
  } catch {
    // 静态站无代理 / 未配 key → 降级为本地打字机模拟
    typewriter(fallbackText(data))
  }
}

// 降级打字机的定时器：组件卸载时清理
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.qw-demo {
  max-width: 720px;
}

.qw-nl {
  border: 1px solid #8250df44;
  background: #fbfaff;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.qw-nl__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}
.qw-nl__row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.qw-nl__input {
  flex: 1;
  box-sizing: border-box;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
}
.qw-nl__status {
  margin: 0;
  font-size: 12px;
  color: #1a7f37;
}
.qw-nl__status--err {
  color: #cf222e;
}

.qw-result {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qw-result__detail h4,
.qw-result__ai h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #1f2937;
}

.qw-ai-badge {
  font-size: 11px;
  font-weight: 400;
  color: #8250df;
  background: #fbefff;
  border-radius: 8px;
  padding: 1px 8px;
  margin-left: 6px;
}

.qw-result__detail table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.qw-result__detail th,
.qw-result__detail td {
  text-align: left;
  padding: 7px 10px;
  border-bottom: 1px solid #eef0f2;
  color: #374151;
}

.qw-result__detail th {
  width: 90px;
  color: #6b7280;
  font-weight: 500;
}

.qw-total td {
  font-weight: 700;
  color: #cf222e;
  font-size: 15px;
}

.qw-ai-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: #374151;
  background: #f6f8fa;
  border-left: 3px solid #8250df;
  padding: 10px 12px;
  border-radius: 0 8px 8px 0;
  min-height: 60px;
}

.qw-cursor {
  color: #8250df;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.qw-demo-tip {
  font-size: 12px;
  color: #6b7280;
  margin: 12px 0 0;
}
</style>
