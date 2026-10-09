<template>
  <div class="qt-demo">
    <!-- 业务切换：同一套 SearchForm + QueryTable，只换配置与插槽内容 -->
    <div class="qt-demo-bar">
      <div class="qt-demo-switch">
        <button
          v-for="key in Object.keys(businesses)"
          :key="key"
          type="button"
          :class="{ active: current === key }"
          @click="current = key"
        >
          {{ key }}
        </button>
      </div>
      <span class="qt-demo-note">
        列渲染权通过插槽外放：{{ current }} 的金额/状态/操作列都是业务方插槽（插槽名 = 列 prop）
      </span>
    </div>

    <SearchForm
      :key="current"
      ref="formRef"
      :fields="biz.fields"
      :initial="biz.initial"
      :buttons="[{ name: 'search', label: '查询', type: 'primary' }, { name: 'reset', label: '重置' }]"
      @action="onAction"
    />

    <QueryTable
      :key="current"
      :columns="biz.columns"
      :rows="rows"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      row-key="id"
      show-index
      show-tooltip
      @page-change="onPageChange"
    >
      <!-- ═══ 报价单业务的插槽渲染（插槽名 = 列 prop）═══ -->
      <template v-if="current === '报价单管理'" #amount="{ row }">
        <span :style="{ color: (row.amount as number) > 50000 ? '#cf222e' : '#1a7f37', fontWeight: 600 }">
          ¥{{ (row.amount as number).toLocaleString() }}
        </span>
      </template>
      <template v-if="current === '报价单管理'" #status="{ row }">
        <span
          class="qt-tag"
          :style="{
            background: row.status === '已成交' ? '#dafbe1' : row.status === '报价中' ? '#ddf4ff' : '#ffebe9',
            color: row.status === '已成交' ? '#1a7f37' : row.status === '报价中' ? '#0969da' : '#cf222e',
          }"
        >{{ row.status }}</span>
      </template>
      <template v-if="current === '报价单管理'" #operation="{ row }">
        <el-text type="primary" class="qt-link" @click="onRowAction('编辑报价单', row)">编辑</el-text>
        <el-text type="danger" class="qt-link" @click="onRowAction('删除报价单', row)">删除</el-text>
      </template>

      <!-- ═══ 问答管理业务的插槽渲染 ═══ -->
      <template v-if="current === '问答管理'" #question="{ row }">
        <span class="qt-strong">{{ row.question }}</span>
      </template>
      <template v-if="current === '问答管理'" #status="{ row }">
        <span
          class="qt-tag"
          :style="{
            background: row.status === '已采纳' ? '#dafbe1' : '#fff8c5',
            color: row.status === '已采纳' ? '#1a7f37' : '#9a6700',
          }"
        >{{ row.status }}</span>
      </template>
      <template v-if="current === '问答管理'" #feedback="{ row }">
        <span>👍 {{ row.likes }} · 👎 {{ row.dislikes }}</span>
      </template>
      <template v-if="current === '问答管理'" #operation="{ row }">
        <el-text type="primary" class="qt-link" @click="onRowAction('查看答案', row)">查看</el-text>
      </template>
    </QueryTable>

    <p class="qt-demo-tip">最近一次操作：{{ lastAction || '（还没有操作）' }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SearchForm, QueryTable } from '../src/index'
import type { QueryColumn, SearchField, SearchParams } from '../src/index'

// ══════ 假后端：数据 + 过滤 + 分页 ══════
interface QuoteRow extends Record<string, unknown> {
  id: number
  quoteNo: string
  customer: string
  product: string
  amount: number
  status: string
  date: string
}
interface QaRow extends Record<string, unknown> {
  id: number
  question: string
  answerBy: string
  asker: string
  status: string
  likes: number
  dislikes: number
}

function fakeQuery<T extends Record<string, unknown>>(
  pool: T[],
  match: (r: T) => boolean,
  page: number,
  pageSize: number
) {
  return new Promise<{ rows: T[]; total: number }>((resolve) => {
    setTimeout(() => {
      const list = pool.filter(match)
      resolve({ rows: list.slice((page - 1) * pageSize, page * pageSize), total: list.length })
    }, 300)
  })
}

// ══════ 业务 A：报价单管理（quotation-agent 主业务）══════
const quotePool: QuoteRow[] = Array.from({ length: 43 }, (_, i) => ({
  id: i + 1,
  quoteNo: `QT-2026${String(9000 + i)}`,
  customer: `客户${['华信', '中科', '蓝天', '远景'][i % 4]}${i}号`,
  product: ['智能体平台-标准版', '智能体平台-旗舰版', '私有化部署', '咨询实施'][i % 4],
  amount: 8000 + i * 6100,
  status: ['报价中', '已成交', '已关闭'][i % 3],
  date: `2026-0${(i % 9) + 1}-1${i % 9}`,
}))

const quoteFields: SearchField[] = [
  { name: 'keyword', label: '报价单号', type: 'input', placeholder: '支持回车查询' },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    clearable: true,
    options: [
      { label: '报价中', value: '报价中' },
      { label: '已成交', value: '已成交' },
      { label: '已关闭', value: '已关闭' },
    ],
  },
  { name: 'amount', label: '金额区间', type: 'number-range' },
]

const quoteColumns: QueryColumn[] = [
  { prop: 'quoteNo', label: '报价单号', minWidth: 130 },
  { prop: 'customer', label: '客户', minWidth: 130 },
  { prop: 'product', label: '产品', minWidth: 160, showTooltip: true },
  { prop: 'amount', label: '金额', isSlot: true, minWidth: 120 },
  { prop: 'status', label: '状态', isSlot: true, minWidth: 90 },
  { prop: 'date', label: '报价日期', minWidth: 120 },
  { prop: 'operation', label: '操作', isSlot: true, fixed: 'right', width: 110 },
]

// ══════ 业务 B：问答管理（system-management / qa-management）══════
const qaPool: QaRow[] = Array.from({ length: 31 }, (_, i) => ({
  id: i + 1,
  question: `关于产品参数的问题${i + 1}（智能体部署方式？）`,
  answerBy: `答案来源-${['知识库', '人工', '模型'][i % 3]}`,
  asker: `用户${i + 1}`,
  status: i % 2 === 0 ? '已采纳' : '待审核',
  likes: (i * 7) % 40,
  dislikes: i % 5,
}))

const qaFields: SearchField[] = [
  { name: 'keyword', label: '问题', type: 'input', placeholder: '回车查询' },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    clearable: true,
    options: [
      { label: '已采纳', value: '已采纳' },
      { label: '待审核', value: '待审核' },
    ],
  },
]

const qaColumns: QueryColumn[] = [
  { prop: 'question', label: '问题', isSlot: true, minWidth: 240, showTooltip: true },
  { prop: 'answerBy', label: '答案来源', minWidth: 110 },
  { prop: 'asker', label: '提问人', minWidth: 100 },
  { prop: 'status', label: '状态', isSlot: true, minWidth: 90 },
  { prop: 'feedback', label: '点赞/点踩', isSlot: true, minWidth: 110 },
  { prop: 'operation', label: '操作', isSlot: true, fixed: 'right', width: 80 },
]

const businesses = {
  报价单管理: {
    fields: quoteFields,
    columns: quoteColumns,
    initial: {} as SearchParams,
    pool: quotePool,
    match: (r: QuoteRow, p: SearchParams) => {
      const kw = String(p.keyword ?? '')
      const status = String(p.status ?? '')
      const range = p.amount as { startValue?: number; endValue?: number } | undefined
      return (
        (!kw || r.quoteNo.includes(kw)) &&
        (!status || r.status === status) &&
        (!range?.startValue || r.amount >= range.startValue) &&
        (!range?.endValue || r.amount <= range.endValue)
      )
    },
  },
  问答管理: {
    fields: qaFields,
    columns: qaColumns,
    initial: {} as SearchParams,
    pool: qaPool,
    match: (r: QaRow, p: SearchParams) => {
      const kw = String(p.keyword ?? '')
      const status = String(p.status ?? '')
      return (!kw || r.question.includes(kw)) && (!status || r.status === status)
    },
  },
} satisfies Record<
  string,
  { fields: SearchField[]; columns: QueryColumn[]; initial: SearchParams; pool: Record<string, unknown>[]; match: (r: Record<string, unknown>, p: SearchParams) => boolean }
>

const current = ref<keyof typeof businesses>('报价单管理')
const biz = computed(() => businesses[current.value])

const rows = ref<Record<string, unknown>[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const lastAction = ref('')
let lastParams: SearchParams = {}

async function query(p = page.value, s = pageSize.value) {
  loading.value = true
  const { rows: r, total: t } = await fakeQuery(biz.value.pool, (row) => biz.value.match(row, lastParams), p, s)
  rows.value = r
  total.value = t
  page.value = p
  pageSize.value = s
  loading.value = false
}

function onAction(name: string, params: SearchParams) {
  lastAction.value = `${name}：${JSON.stringify(params)}`
  lastParams = name === 'reset' ? {} : params
  query(1, pageSize.value) // 查询条件变化必须回到第 1 页
}

function onPageChange(p: { page: number; pageSize: number }) {
  query(p.page, p.pageSize)
}

function onRowAction(action: string, row: Record<string, unknown>) {
  lastAction.value = `${action}：${JSON.stringify(row)}`
}

query()
</script>

<style scoped>
.qt-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qt-demo-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.qt-demo-switch {
  display: inline-flex;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  overflow: hidden;
}

.qt-demo-switch button {
  padding: 4px 14px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.qt-demo-switch button.active {
  background: #0969da;
  color: #fff;
}

.qt-demo-note {
  font-size: 12px;
  color: #57606a;
}

.qt-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 18px;
}

.qt-link {
  cursor: pointer;
  margin-right: 10px;
}

.qt-strong {
  font-weight: 600;
}

.qt-demo-tip {
  font-size: 12px;
  color: #57606a;
  margin: 0;
}
</style>
