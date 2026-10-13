<template>
  <div class="cq">
    <div ref="listRef" class="cq-list" @scroll="onScroll">
      <div v-if="messages.length === 0" class="cq-empty">
        试试直接说需求：「我要 30 台服务器，主要跑算法，预算 5W」——
        Agent 会像顾问一样逐项确认（对话里直接点选项），收集完在对话里出报价。
      </div>

      <template v-for="m in messages" :key="m.id">
        <!-- 用户消息 -->
        <div v-if="m.role === 'user'" class="cq-row cq-row--user">
          <div class="cq-bubble cq-bubble--user">{{ m.text }}</div>
        </div>

        <!-- 助手文本（含流式） -->
        <div v-else-if="m.kind === 'text'" class="cq-row">
          <div class="cq-bubble cq-bubble--ai">
            {{ m.text }}<span v-if="m.streaming" class="cq-cursor">▍</span>
          </div>
        </div>

        <!-- 内联选项组件：对话里直接点选 -->
        <div v-else-if="m.kind === 'options'" class="cq-row">
          <div class="cq-bubble cq-bubble--ai">
            <div class="cq-q">{{ m.text }}</div>
            <div class="cq-chips">
              <button
                v-for="o in m.options"
                :key="o.value"
                type="button"
                class="cq-chip"
                :disabled="m.locked"
                @click="onPick(m, o)"
              >
                {{ o.label }}
              </button>
            </div>
            <div v-if="m.locked" class="cq-picked">已选：{{ m.pickedLabel }}</div>
          </div>
        </div>
        <!-- 报价卡片：对话里直接出表格 + 生成式说明 -->
        <div v-else-if="m.kind === 'quote'" class="cq-row">
          <div class="cq-quote">
            <h4>报价明细</h4>
            <table>
              <tbody>
                <tr><th>品类</th><td>{{ quote.category }}</td></tr>
                <tr v-if="quote.deployEnv"><th>部署环境</th><td>{{ quote.deployEnv }}</td></tr>
                <tr v-if="quote.purpose"><th>用途</th><td>{{ quote.purpose }}</td></tr>
                <tr><th>数量</th><td>{{ quote.quantity }} 台</td></tr>
                <tr><th>折扣</th><td>{{ discountText }}</td></tr>
                <tr v-if="quote.budget"><th>预算</th><td>¥{{ Number(quote.budget).toLocaleString() }}</td></tr>
                <tr class="cq-total"><th>合计</th><td>¥{{ total }}</td></tr>
                <tr v-if="quote.budget">
                  <th>预算对比</th>
                  <td :style="{ color: withinBudget ? '#1a7f37' : '#cf222e' }">
                    {{ withinBudget ? '预算内 ✓' : `超出预算 ¥${(totalNum - Number(quote.budget)).toLocaleString()}` }}
                  </td>
                </tr>
              </tbody>
            </table>
            <h4>生成式说明 <span class="cq-badge">Agent 生成</span></h4>
            <p class="cq-explain">{{ explainText }}<span v-if="explainStreaming" class="cq-cursor">▍</span></p>
          </div>
        </div>
      </template>
    </div>

    <div class="cq-input">
      <textarea
        v-model="draft"
        class="cq-textarea"
        rows="1"
        placeholder="直接说你的需求，Enter 发送…"
        :disabled="thinking"
        @keydown.enter.prevent="onSend"
      />
      <el-button type="primary" size="small" :loading="thinking" @click="onSend">
        {{ thinking ? '思考中' : '发送' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'

/**
 * 对话式报价（slot-filling）：整个收集过程发生在一段对话里。
 *
 * 协议：每轮把「对话历史 + 已收集槽位」发给模型，要求严格返回 JSON——
 * { extracted: {...本轮抽到的槽位}, reply: "只问一个问题的话术",
 *   options: [{label,value}] | null, }（done 由前端本地判定，不信任模型）。
 * 前端职责：渲染 reply 文本；options 非空渲染成**内联选项芯片**（点选即回复）；
 * extracted 合并进槽位；本地判齐 → 对话里直接出报价表格卡片 + 流式生成式说明。
 * 这就是"生成式 UI"：对话流里嵌交互组件，而不是聊天框下面挂一张传统表单。
 */
interface ChatMsg {
  id: number
  role: 'user' | 'assistant'
  kind: 'text' | 'options' | 'quote'
  text: string
  options?: { label: string; value: string }[]
  /** options 消息点选后写入哪个槽位 */
  slot?: string
  pickedLabel?: string
  locked?: boolean
  streaming?: boolean
}

const listRef = ref<HTMLElement>()
const draft = ref('')
const thinking = ref(false)
const messages = reactive<ChatMsg[]>([])
let seq = 0

const slots = reactive<Record<string, unknown>>({})
const MODEL = 'glm-5.3-flash'

function push(msg: Omit<ChatMsg, 'id'>) {
  messages.push({ id: seq++, ...msg })
  void scrollFollow()
}

/* ── 槽位齐不齐：本地判定（不信任模型的 done 字段） ── */
function requiredMissing(): string | null {
  if (!slots.category) return 'category'
  if (!slots.quantity) return 'quantity'
  if (slots.category === '私有化' && !slots.deployEnv) return 'deployEnv'
  if (slots.category === '服务' && !slots.duration) return 'duration'
  return null
}

/* ── 每轮调用模型：抽取 + 决定下一个问题 ── */
async function agentTurn(userText?: string) {
  thinking.value = true
  try {
    if (userText) push({ role: 'user', kind: 'text', text: userText })
    const history = messages
      .filter((m) => m.kind === 'text' || (m.kind === 'options' && m.pickedLabel))
      .map((m) => ({ role: m.role, content: m.kind === 'options' ? `[已选] ${m.pickedLabel}` : m.text }))
    const res = await fetch('/api/ark/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              '你是「洛阳经济智能体」的报价收集顾问，用对话逐项收集报价槽位。\n' +
              '知识库：品类单价——标准版 8 万、旗舰版 15 万、私有化 30 万、咨询实施服务 5 万；数量 ≥50 台有阶梯 85 折；' +
              '私有化必须确认部署环境（阿里云/华为云/本地 IDC）；服务必须确认周期。\n' +
              '已收集槽位（JSON）：' + JSON.stringify(slots) + '\n' +
              '用户最新话语可能一次给出多个槽位，能抽的都抽。然后：\n' +
              '① 若还有必填槽位缺失，reply 里只问最关键的那一个；若该问题适合选择，options 给 2~4 个候选（value 与槽位取值一致），不适合选择就 null 让用户自由回答；\n' +
              '② 严格输出一个 JSON 对象（禁止 markdown 代码块）：' +
              '{"extracted":{"category":"标准版|旗舰版|私有化|服务|null","quantity":数字或null,"purpose":字符串或null,"budget":数字或null,"deployEnv":"阿里云|华为云|本地 IDC|null","duration":"1 个月|3 个月|6 个月|null","discount":"none|0.95|0.9|0.85|null"},"reply":"话术","slot":"options 对应的槽位名或 null","options":[{"label":"候选","value":"槽位取值"}]或null}\n' +
              '槽位名只能是：category / quantity / deployEnv / duration / discount / purpose / budget。\n' +
              '抽不到的槽位填 null，不要编造；不要重复问已收集的槽位。',
          },
          ...history,
        ],
      }),
    })
    if (!res.ok) throw new Error(`Ark ${res.status}`)
    const json = await res.json()
    let raw = json.choices?.[0]?.message?.content ?? ''
    raw = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    // 合并抽取结果
    for (const [k, v] of Object.entries(parsed.extracted ?? {})) {
      if (v !== null && v !== '' && slots[k] === undefined) slots[k] = v
    }
    // 回复 + 可选的内联选项芯片（带显式槽位名，点选写对地方）
    push({
      role: 'assistant',
      kind: parsed.options?.length ? 'options' : 'text',
      slot: parsed.slot ?? undefined,
      text: parsed.reply ?? '',
      options: parsed.options ?? undefined,
    })
  } catch (e) {
    push({ role: 'assistant', kind: 'text', text: `（连接 Agent 失败：${(e as Error).message}，请重试）` })
  } finally {
    thinking.value = false
    // 本地判定：齐了 → 直接在对话里出报价，不再问
    if (!requiredMissing()) void finishQuote()
  }
}

/* ── 选项芯片点选：写入显式声明的槽位，作为用户回复进入下一轮 ── */
function onPick(msg: ChatMsg, o: { label: string; value: string }) {
  msg.locked = true
  msg.pickedLabel = o.label
  if (msg.slot) slots[msg.slot] = o.value
  void scrollFollow()
  void agentTurn(o.label)
}

function onSend() {
  const text = draft.value.trim()
  if (!text || thinking.value) return
  draft.value = ''
  void agentTurn(text)
}

/* ── 收集齐 → 对话里出报价卡片 + 流式生成式说明 ── */
const quote = reactive<Record<string, unknown>>({})
const explainText = ref('')
const explainStreaming = ref(false)

const BASE: Record<string, number> = { 标准版: 80000, 旗舰版: 150000, 私有化: 300000, 服务: 50000 }
const totalNum = computed(
  () => Math.round((BASE[quote.category as string] ?? 0) * Number(quote.quantity ?? 0) * discount.value) || 0
)
const total = computed(() => totalNum.value.toLocaleString())
const discount = computed(() => {
  const q = Number(quote.quantity ?? 0)
  if (q >= 50) return 0.85
  const d = Number(quote.discount ?? 'none')
  return d === 0 || isNaN(d) ? 1 : d === 1 ? 1 : d || 1
})
const discountText = computed(() => (discount.value === 1 ? '无' : `${discount.value * 10} 折`))
const withinBudget = computed(() => !quote.budget || totalNum.value <= Number(quote.budget))

async function finishQuote() {
  Object.assign(quote, slots)
  push({ role: 'assistant', kind: 'quote', text: '' })
  // 流式生成式说明（真实模型）
  const msg = messages[messages.length - 1]
  void scrollFollow()
  explainStreaming.value = true
  try {
    const brief =
      `报价：品类=${quote.category}，数量=${quote.quantity} 台，单价 ¥${(BASE[quote.category as string] ?? 0).toLocaleString()}，` +
      `折扣 ${discountText.value}，合计 ¥${total.value}` +
      (quote.budget ? `，客户预算 ¥${Number(quote.budget).toLocaleString()}（${withinBudget.value ? '预算内' : '超预算'}）` : '') +
      (quote.purpose ? `，用途：${quote.purpose}` : '') +
      (quote.deployEnv ? `，部署：${quote.deployEnv}` : '')
    const res = await fetch('/api/ark/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        messages: [
          { role: 'system', content: '你是报价助手，根据要素生成 100 字以内报价说明：计价依据 + 预算结论 + 一条建议。直接输出文字。' },
          { role: 'user', content: brief },
        ],
        stream: true,
      }),
    })
    if (!res.ok) throw new Error(String(res.status))
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const payload = t.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta ?? {}
          if (delta.reasoning_content) continue // 思考过程不进说明正文
          if (delta.content) {
            explainText.value += delta.content
            msg.text = explainText.value
            void scrollFollow()
          }
        } catch { /* 跳过坏事件 */ }
      }
    }
  } catch {
    explainText.value = `合计 ¥${total.value}（${discountText.value}），报价有效期 30 天。` +
      (withinBudget.value ? '在客户预算内。' : '超出客户预算，建议调整数量或档位。')
    msg.text = explainText.value
  } finally {
    explainStreaming.value = false
    msg.streaming = false
  }
}

/* ── 滚动跟随 ── */
const follow = ref(true)
function onScroll() {
  const el = listRef.value
  if (!el) return
  follow.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}
function scrollFollow() {
  if (!follow.value) return
  void nextTick(() => {
    const el = listRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

// 开场：本地固定话术 + 品类选项芯片（不走模型——Ark 会拒绝只有 system 没有 user 消息的请求）
push({
  role: 'assistant',
  kind: 'options',
  slot: 'category',
  text: '您好！我来帮您出一份报价。您要采购哪个品类？（也可以直接一句话描述需求）',
  options: [
    { label: '智能体平台-标准版', value: '标准版' },
    { label: '智能体平台-旗舰版', value: '旗舰版' },
    { label: '私有化部署', value: '私有化' },
    { label: '咨询实施服务', value: '服务' },
  ],
})
</script>

<style scoped>
.cq {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.cq-list {
  height: 420px;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}
.cq-empty {
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  padding-top: 60px;
  line-height: 1.8;
}
.cq-row {
  display: flex;
  margin-bottom: 12px;
}
.cq-row--user {
  justify-content: flex-end;
}
.cq-bubble {
  max-width: 82%;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  line-height: 1.6;
}
.cq-bubble--user {
  background: #165dff;
  color: #fff;
}
.cq-bubble--ai {
  background: #fff;
  border: 1px solid #e5e7eb;
}
.cq-q {
  margin-bottom: 8px;
}
.cq-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cq-chip {
  padding: 4px 12px;
  border: 1px solid #165dff88;
  border-radius: 14px;
  background: #f0f6ff;
  color: #165dff;
  cursor: pointer;
  font-size: 12px;
}
.cq-chip:disabled {
  opacity: 0.55;
  cursor: default;
}
.cq-picked {
  margin-top: 6px;
  font-size: 11px;
  color: #8b949e;
}
.cq-quote {
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
}
.cq-quote h4 {
  margin: 0 0 8px;
  font-size: 13px;
}
.cq-quote table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}
.cq-quote th,
.cq-quote td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid #eef0f2;
  color: #374151;
}
.cq-quote th {
  width: 90px;
  color: #6b7280;
  font-weight: 500;
}
.cq-total td {
  font-weight: 700;
  color: #cf222e;
  font-size: 14px;
}
.cq-badge {
  font-size: 11px;
  font-weight: 400;
  color: #8250df;
  background: #fbefff;
  border-radius: 8px;
  padding: 1px 8px;
  margin-left: 6px;
}
.cq-explain {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #374151;
  background: #f6f8fa;
  border-left: 3px solid #8250df;
  padding: 8px 10px;
  border-radius: 0 6px 6px 0;
  min-height: 20px;
}
.cq-cursor {
  color: #8250df;
  animation: cq-blink 0.8s infinite;
}
@keyframes cq-blink {
  50% {
    opacity: 0;
  }
}
.cq-input {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #e5e7eb;
  align-items: flex-end;
}
.cq-textarea {
  flex: 1;
  box-sizing: border-box;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
}
</style>
