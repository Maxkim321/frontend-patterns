<template>
  <div class="chat-demo">
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

    <div class="chat-input">
      <el-input
        v-model="draft"
        placeholder="输入问题…"
        :disabled="streaming"
        @keydown.enter="onSend"
      />
      <el-button v-if="!streaming" type="primary" @click="onSend">发送</el-button>
      <el-button v-else type="danger" @click="stop">停止</el-button>
      <el-button text @click="clear">清空</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { fakeSSEChunks, useChat } from '../src/index.js'

const draft = ref('')
const listRef = ref<HTMLElement>()

const THINKING = '用户在问知识库相关的问题，先做同义词扩展，再检索问答对，未命中则退回文档片段比对……'
const ANSWERS = [
  '基于知识库检索结果：洛阳经济智能体是搭建在数字孪生底座上的大模型应用，包含智能报价、知识库管理、智能问答三个模块。',
  '检索命中 2 条问答对与 1 篇文档。要点：知识库管理端负责语料生产（问答对 / 同义词 / 标签），问答端负责检索与生成，答案附引用来源。',
]

const { messages, streaming, send, stop, clear } = useChat({
  createStream: (_history, { signal }) =>
    fakeSSEChunks(
      THINKING,
      ANSWERS[Math.floor(Math.random() * ANSWERS.length)],
      { signal, chunkSize: 5, delayMs: 60 }
    ),
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
.chat-demo {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
.chat-list {
  height: 360px;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}
.chat-empty {
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  padding-top: 140px;
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
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
</style>
