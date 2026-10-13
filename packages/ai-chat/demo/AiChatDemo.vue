<template>
  <!-- 整体骨架 = ui-ai-assistant 的 Index.vue：左侧可折叠导航 + 右侧聊天区 -->
  <div class="uia">
    <!-- ═══ 左侧导航：展开 256px / 收起 72px（源项目同款交互） ═══ -->
    <aside class="uia-side" :class="{ 'uia-side--collapsed': collapsed }">
      <button type="button" class="uia-new" @click="onNewSession">
        <span class="uia-new__icon">＋</span>
        <span v-if="!collapsed">新建会话</span>
      </button>

      <div class="uia-entry" :class="{ active: entry === 'collect' }" @click="entry = 'collect'">
        <span class="uia-entry__icon">★</span>
        <span v-if="!collapsed">我的收藏</span>
      </div>
      <div class="uia-entry" :class="{ active: entry === 'history' }" @click="toggleHistory">
        <span class="uia-entry__icon">🕘</span>
        <span v-if="!collapsed">历史记录</span>
      </div>

      <!-- 历史会话树：按时间分组（今天 / 7天内 / 30天内 / 更早），hover 出重命名/删除 -->
      <div v-if="!collapsed && entry === 'history'" class="uia-history">
        <div v-for="group in historyGroups" :key="group.label" class="uia-history__group">
          <div class="uia-history__label">{{ group.label }}</div>
          <div
            v-for="item in group.items"
            :key="item.id"
            class="uia-history__item"
            @click="activeHistory = item.title"
          >
            <span class="uia-history__title">{{ item.title }}</span>
            <span class="uia-history__ops" v-if="activeHistory === item.title">
              <i title="重命名" @click.stop="onHistoryOp('重命名', item.title)">✎</i>
              <i title="删除" @click.stop="onHistoryOp('删除', item.title)">🗑</i>
            </span>
          </div>
        </div>
      </div>

      <button type="button" class="uia-collapse" @click="collapsed = !collapsed">
        {{ collapsed ? '»' : '«' }}
      </button>
    </aside>

    <!-- ═══ 右侧聊天区 ═══ -->
    <div class="uia-main">
      <div ref="listRef" class="chat-list" @scroll="onScroll">
        <div v-if="messages.length === 0" class="chat-empty">
          试试输入一个问题，发送后观察：思考过程增量出现 → 折叠收起 → 答案打字机输出；
          中途点"停止"，已生成内容保留。
        </div>
        <div
          v-for="m in messages"
          :key="m.id"
          class="chat-row"
          :class="m.role === 'user' ? 'chat-row--user' : 'chat-row--ai'"
        >
          <div class="chat-bubble" :class="`chat-bubble--${m.role}`">
            <details v-if="m.role === 'assistant' && m.thinking" class="chat-thinking" :open="m.status === 'streaming' && !m.content">
              <summary>思考过程</summary>
              <div class="chat-thinking__body">{{ m.thinking }}</div>
            </details>
            <div class="chat-content">
              {{ m.content }}<span v-if="m.status === 'streaming'" class="chat-cursor">▍</span>
            </div>
            <div v-if="m.status === 'aborted'" class="chat-note">已停止生成</div>
            <div v-if="m.status === 'error'" class="chat-note chat-note--error">{{ m.error }}</div>
          </div>
        </div>
      </div>

      <!-- composer：textarea + 发送/停止（源项目发送按钮是静态 div，这里补上了真实事件） -->
      <div class="chat-input">
        <textarea
          v-model="draft"
          class="chat-textarea"
          rows="2"
          placeholder="输入问题，Enter 发送…"
          :disabled="streaming"
          @keydown.enter.prevent="onSend"
        />
        <div class="chat-input__ops">
          <el-button v-if="!streaming" type="primary" size="small" @click="onSend">发送</el-button>
          <el-button v-else type="danger" size="small" @click="stop">停止</el-button>
          <el-button text size="small" @click="clear">清空</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { fakeSSEChunks, openAICompatToProtocol, useChat } from '../src/index.js'

// ═══ 侧边栏状态（源项目 Index.vue 的折叠/历史交互） ═══
const collapsed = ref(false)
const entry = ref<'collect' | 'history'>('history')
const activeHistory = ref('')

const historyGroups = [
  {
    label: '今天',
    items: [
      { id: 'h1', title: '智能体平台的报价流程' },
      { id: 'h2', title: '知识库问答对怎么维护' },
      { id: 'h3', title: '报价单导出格式问题' },
    ],
  },
  {
    label: '7天内',
    items: [
      { id: 'h4', title: '同义词词典批量导入' },
      { id: 'h5', title: '会话历史如何持久化' },
      { id: 'h6', title: '模型置信度阈值怎么定' },
    ],
  },
  {
    label: '30天内',
    items: [
      { id: 'h7', title: '私有化部署资源评估' },
      { id: 'h8', title: '答案来源引用规范' },
      { id: 'h9', title: '点踩数据的回流处理' },
    ],
  },
  {
    label: '更早',
    items: [
      { id: 'h10', title: '初版对话流式方案调研' },
      { id: 'h11', title: 'SSE 与 WebSocket 选型' },
      { id: 'h12', title: '历史会话树交互草稿' },
    ],
  },
]

function toggleHistory() {
  entry.value = 'history'
}
function onNewSession() {
  clear()
  activeHistory.value = ''
}
function onHistoryOp(op: string, title: string) {
  // 源项目这两个按钮是 console.log 空壳（坑清单 ①），这里给出真实交互的最小实现
  if (op === '删除') {
    for (const g of historyGroups) {
      const i = g.items.findIndex((x) => x.title === title)
      if (i >= 0) g.items.splice(i, 1)
    }
  } else {
    const renamed = window.prompt('重命名会话', title)
    if (renamed) {
      for (const g of historyGroups) {
        const item = g.items.find((x) => x.title === title)
        if (item) item.title = renamed
      }
    }
  }
}

// ═══ 聊天逻辑：本地 dev 走真实模型（经 Vite 代理，key 在服务端注入），失败降级模拟流 ═══
const draft = ref('')
const listRef = ref<HTMLElement>()

const MODEL = 'glm-5.3-flash'
const FALLBACK_THINKING = '（本地未配置模型代理或公网静态站）使用模拟流演示：先做同义词扩展，再检索问答对……'
const FALLBACK_ANSWER =
  '这是模拟流的回答。把仓库跑起来并在 apps/docs/.env.local 配置 ARK_API_KEY 后，这里的对话会走真实的 glm-5.3-flash 流式输出（经 Vite 代理注入鉴权，key 不进浏览器）。'

async function realStream(history: { role: string; content: string }[], signal: AbortSignal) {
  const res = await fetch('/api/ark/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            '你是「洛阳经济智能体」的产品助手（智能报价 / 知识库 / 智能问答）。简洁专业地回答用户问题；涉及报价时说明计价依据与建议。',
        },
        ...history,
      ],
      stream: true,
      temperature: 0.7,
    }),
  })
  if (!res.ok) throw new Error(`Ark ${res.status}`)
  return openAICompatToProtocol(res, signal)
}

const { messages, streaming, send, stop, clear } = useChat({
  createStream: async (history, { signal }) => {
    try {
      return await realStream(history, signal)
    } catch {
      // 静态站无代理 / 未配 key → 降级模拟流（同一条 consumeSSEStream 解析链路）
      return fakeSSEChunks(FALLBACK_THINKING, FALLBACK_ANSWER, { signal, chunkSize: 5, delayMs: 60 })
    }
  },
})

function onSend() {
  const text = draft.value
  draft.value = ''
  void send(text)
}

/* 滚动跟随：用户在底部附近才自动跟随，上翻看历史不强行拉回 */
const follow = ref(true)
function onScroll() {
  const el = listRef.value
  if (!el) return
  follow.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}
watch(
  messages,
  () => {
    if (!follow.value) return
    void nextTick(() => {
      const el = listRef.value
      if (el) el.scrollTop = el.scrollHeight
    })
  },
  { deep: true }
)
</script>

<style scoped>
.uia {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  height: 460px;
  background: #fff;
}

/* ── 侧边栏 ── */
.uia-side {
  position: relative;
  width: 256px;
  flex: none;
  border-right: 1px solid #e5e7eb;
  background: #f7f8fa;
  padding: 12px 10px;
  transition: width 0.2s;
  overflow: hidden;
}
.uia-side--collapsed {
  width: 72px;
}
.uia-new {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 10px;
}
.uia-new__icon {
  font-weight: 700;
  color: #165dff;
}
.uia-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #4b5563;
  cursor: pointer;
  white-space: nowrap;
}
.uia-entry:hover,
.uia-entry.active {
  background: #eef4ff;
  color: #165dff;
}
.uia-history {
  margin-top: 8px;
  max-height: 240px;
  overflow-y: auto;
}
.uia-history__label {
  font-size: 11px;
  color: #9ca3af;
  padding: 8px 12px 4px;
}
.uia-history__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
}
.uia-history__item:hover {
  background: #eef4ff;
}
.uia-history__title {
  overflow: hidden;
  text-overflow: ellipsis;
}
.uia-history__ops i {
  font-style: normal;
  cursor: pointer;
  margin-left: 4px;
  font-size: 11px;
}
.uia-collapse {
  position: absolute;
  right: 8px;
  bottom: 10px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
  width: 26px;
  height: 24px;
  cursor: pointer;
  color: #6b7280;
}

/* ── 聊天区 ── */
.uia-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}
.chat-empty {
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  padding-top: 150px;
}
.chat-row {
  display: flex;
  margin-bottom: 12px;
}
.chat-row--user {
  justify-content: flex-end;
}
.chat-bubble {
  max-width: 78%;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
}
.chat-bubble--user {
  background: #165dff;
  color: #fff;
}
.chat-bubble--assistant {
  background: #fff;
  border: 1px solid #e5e7eb;
}
.chat-thinking {
  margin-bottom: 6px;
  font-size: 12px;
  color: #6b7280;
}
.chat-thinking__body {
  padding: 6px 8px;
  margin-top: 4px;
  background: #f3f4f6;
  border-radius: 6px;
  white-space: pre-wrap;
}
.chat-content {
  white-space: pre-wrap;
  word-break: break-all;
}
.chat-cursor {
  animation: blink 0.8s infinite;
  color: #165dff;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.chat-note {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}
.chat-note--error {
  color: #f56c6c;
}
.chat-input {
  border-top: 1px solid #e5e7eb;
  background: #fff;
  padding: 10px 12px;
}
.chat-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
}
.chat-input__ops {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}
</style>
