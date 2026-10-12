<template>
  <div class="qw-demo">
    <FormWizard ref="wizardRef" :steps="steps" :submit="submitQuote" @submit="onSubmitted">
      <!-- ═══ 结果区：报价明细 + 生成式说明（业务渲染，插槽外放） ═══ -->
      <template #result="{ data }">
        <div class="qw-result">
          <div class="qw-result__detail">
            <h4>报价明细</h4>
            <table>
              <tbody>
                <tr><th>品类</th><td>{{ data.category }}</td></tr>
                <tr><th>规格</th><td>{{ data.spec }}</td></tr>
                <tr><th>数量</th><td>{{ data.quantity }} 件</td></tr>
                <tr><th>单价</th><td>¥{{ unitPrice }}</td></tr>
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
      交互层完整链路：分步填报价要素（每步有引导与校验，不填必填项「下一步」会被拦截）→
      提交后 Agent 检索规则计算（此处为模拟延迟）→ 前端渲染报价明细 + 逐字流式的生成式说明。
      「返回编辑」可回到任意已填步骤，数据保留。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { FormWizard } from '../src/index'
import type { WizardStep } from '../src/index'

// ── 三步报价要素（品类 → 规格数量 → 折扣条件），schema 配置 ──
const steps: WizardStep[] = [
  {
    title: '品类',
    description: '选择要报价的产品品类，Agent 将检索该品类的计价规则。',
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
    description: '填写部署规格与采购数量，数量影响阶梯单价。',
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
    ],
  },
  {
    title: '折扣条件',
    description: '填写商务折扣条件（可选），Agent 会结合规则库给出折后价与说明。',
    fields: [
      {
        name: 'discount',
        label: '折扣条件',
        type: 'select',
        placeholder: '请选择折扣档位',
        options: [
          { label: '无折扣', value: 'none' },
          { label: '批量采购 95 折', value: '0.95' },
          { label: '年度框架 9 折', value: '0.9' },
          { label: '战略客户 85 折', value: '0.85' },
        ],
      },
    ],
  },
]

// ── 模拟 Agent：检索规则计算（延迟 1.2s），返回明细所需的单价 ──
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

// ── 生成式说明：逐字流式（真实项目接 Agent 的 SSE 接口，解析器与 ai-chat 方案同一条链路） ──
const aiText = ref('')
const aiStreaming = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

function onSubmitted(data: Record<string, unknown>) {
  const text =
    `根据规则库检索，${data.category} 适用于阶梯计价规则 R-1024：采购 ${data.quantity} 件` +
    `匹配批量档位，${discountText.value !== '无' ? `叠加「${data.discount && discount.value !== 0 ? '商务折扣' : ''}」条件后` : ''}` +
    `折后合计 ¥${total.value}。该报价有效期 30 天，包含标准维保与两次现场培训；` +
    `若数量提升至下一阶梯（≥50 件），单价还可下探约 8%，建议评估集中采购。`
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

// 组件卸载时清定时器
const wizardRef = ref()
defineExpose({ wizardRef })
</script>

<style scoped>
.qw-demo {
  max-width: 720px;
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
