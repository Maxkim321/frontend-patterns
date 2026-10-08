<template>
  <div class="qt-demo">
    <!-- 业务切换：同一套 SearchForm + QueryTable，只换 fields/columns 配置 -->
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
      <span class="qt-demo-note">查询表单 + 表格 + 分页全部由配置驱动，切换业务 = 换配置</span>
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
      @page-change="onPageChange"
      @row-action="onRowAction"
    />

    <p class="qt-demo-tip">
      最近一次操作：{{ lastAction || '（还没有操作）' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SearchForm, QueryTable } from '../src/index'
import type { QueryColumn, SearchField, SearchParams } from '../src/index'

// ---- 假后端：57 行数据 + 过滤 + 分页 ----
interface BizRow extends Record<string, unknown> {
  id: number
  name: string
  breed: string
  status: string
  weight: number
  date: string
  btns: string[]
}

const pool: BizRow[] = Array.from({ length: 57 }, (_, i) => ({
  id: i + 1,
  name: `样本-${String(i + 1).padStart(3, '0')}`,
  breed: ['荷斯坦', '西门塔尔', '安格斯'][i % 3],
  status: ['在群', '离群', '待定'][i % 3],
  weight: 320 + ((i * 17) % 260),
  date: `2026-0${(i % 9) + 1}-1${i % 9}`,
  // 行级按钮由数据下发（轻量行级权限模型）
  btns: i % 3 === 1 ? ['detail', 'edit'] : ['detail'],
}))

function fakeQuery(params: SearchParams, page: number, pageSize: number) {
  return new Promise<{ rows: BizRow[]; total: number }>((resolve) => {
    setTimeout(() => {
      let list = pool
      const kw = String(params.keyword ?? '')
      const breed = String(params.breed ?? '')
      const status = String(params.status ?? '')
      const range = params.weight as { startValue?: number; endValue?: number } | undefined
      if (kw) list = list.filter((r) => r.name.includes(kw))
      if (breed) list = list.filter((r) => r.breed === breed)
      if (status) list = list.filter((r) => r.status === status)
      if (range?.startValue != null) list = list.filter((r) => r.weight >= range.startValue!)
      if (range?.endValue != null) list = list.filter((r) => r.weight <= range.endValue!)
      resolve({ rows: list.slice((page - 1) * pageSize, page * pageSize), total: list.length })
    }, 300)
  })
}

// ---- 业务 A：繁育数据管理（源自真实项目域）----
const breedFields: SearchField[] = [
  { name: 'keyword', label: '样本名称', type: 'input', placeholder: '支持回车查询' },
  {
    name: 'breed',
    label: '品种',
    type: 'select',
    clearable: true,
    options: [
      { label: '荷斯坦', value: '荷斯坦' },
      { label: '西门塔尔', value: '西门塔尔' },
      { label: '安格斯', value: '安格斯' },
    ],
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    clearable: true,
    options: [
      { label: '在群', value: '在群' },
      { label: '离群', value: '离群' },
      { label: '待定', value: '待定' },
    ],
  },
  { name: 'weight', label: '体重区间', type: 'number-range' },
]

const breedColumns: QueryColumn[] = [
  { prop: 'name', label: '样本名称', minWidth: 120 },
  { prop: 'breed', label: '品种', minWidth: 100 },
  { prop: 'status', label: '状态', minWidth: 90 },
  { prop: 'weight', label: '体重(kg)', minWidth: 100 },
  { prop: 'date', label: '测定日期', minWidth: 120 },
  {
    prop: 'actions',
    label: '操作',
    type: 'btn',
    fixed: 'right',
    minWidth: 130,
    btns: [
      { name: 'detail', label: '详情', type: 'primary' },
      { name: 'edit', label: '编辑', type: 'warning' },
    ],
  },
]

// ---- 业务 B：订单管理 ----
const orderFields: SearchField[] = [
  { name: 'keyword', label: '订单号', type: 'input', placeholder: '回车查询' },
  {
    name: 'status',
    label: '订单状态',
    type: 'select',
    clearable: true,
    options: [
      { label: '已支付', value: '已支付' },
      { label: '已发货', value: '已发货' },
      { label: '已关闭', value: '已关闭' },
    ],
  },
  { name: 'date', label: '下单日期', type: 'daterange' },
]

const orderColumns: QueryColumn[] = [
  { prop: 'name', label: '订单号', minWidth: 140 },
  { prop: 'status', label: '状态', minWidth: 100 },
  { prop: 'date', label: '下单日期', minWidth: 120 },
  {
    prop: 'actions',
    label: '操作',
    type: 'btn',
    fixed: 'right',
    minWidth: 130,
    btns: [
      { name: 'detail', label: '查看', type: 'primary' },
      { name: 'edit', label: '改地址', type: 'warning' },
    ],
  },
]

const businesses = {
  繁育数据管理: {
    fields: breedFields,
    columns: breedColumns,
    initial: { status: '在群' } as SearchParams,
  },
  订单管理: {
    fields: orderFields,
    columns: orderColumns,
    initial: {} as SearchParams,
  },
} satisfies Record<string, { fields: SearchField[]; columns: QueryColumn[]; initial: SearchParams }>

const current = ref<keyof typeof businesses>('繁育数据管理')
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
  const { rows: r, total: t } = await fakeQuery(lastParams, p, s)
  rows.value = r
  total.value = t
  page.value = p
  pageSize.value = s
  loading.value = false
}

function onAction(name: string, params: SearchParams) {
  lastAction.value = `${name}：${JSON.stringify(params)}`
  if (name === 'search') {
    lastParams = params
    query(1, pageSize.value) // 查询条件变化必须回到第 1 页
  } else if (name === 'reset') {
    lastParams = {}
    query(1, pageSize.value)
  }
}

function onPageChange(p: { page: number; pageSize: number }) {
  query(p.page, p.pageSize)
}

function onRowAction(a: { action: string; row: Record<string, unknown> }) {
  lastAction.value = `行操作 ${a.action}：${JSON.stringify(a.row)}`
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

.qt-demo-tip {
  font-size: 12px;
  color: #57606a;
  margin: 0;
}
</style>
