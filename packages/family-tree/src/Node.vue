<script setup lang="ts">
import type { PedigreeNode } from './types.js'

/**
 * 家系树节点卡片 —— 按 deepblup3.0 系谱页 components/Node.vue 的源机制实现：
 *
 * - 卡片 + 自带连线：每个节点画自己的左/右水平半线（.ft-line-x，top:50%）和一条
 *   垂直线（.ft-sex-line），相邻节点的半线在列间距中拼接成完整的父子连线。
 * - 垂直线方向按性别：母猪（female）从节点中线向上，公猪（male）向下——
 *   与源码 sex 0=母/1=公 的画线方向一致。
 * - 性别配色取自源码：公猪 #0f77cb（蓝）、母猪 #d07f34（橙）。
 * - 空槽：data 传 'hide' 时只渲染占位容器（源码同款约定），不画卡片不画线。
 */
const props = defineProps<{
  /** 节点数据；'hide' 表示空槽（只占位） */
  data: PedigreeNode | 'hide'
  /** 水平半线长度 px：由容器实测，(容器宽/代数 - 卡片宽)/2 */
  lineWidth: number
  /** 垂直线高度 px：容器高 / 2^(depth+1) */
  sexLineHeight: number
  boxWidth?: number
  boxHeight?: number
}>()
</script>

<template>
  <div
    v-if="data !== 'hide'"
    class="ft-node"
    :style="{ '--box-w': `${boxWidth}px` }"
  >
    <!-- 左右水平半线：从卡片左右边缘向外延伸，与邻列的半线拼接 -->
    <div class="ft-line-x ft-line-x--left" :style="{ width: `${lineWidth}px` }" />
    <div class="ft-line-x ft-line-x--right" :style="{ width: `${lineWidth}px` }" />
    <!-- 垂直线：按性别向上/向下延伸到亲本行的汇流位 -->
    <div
      class="ft-sex-line"
      :class="data.sex === 'male' ? 'ft-sex-line--down' : 'ft-sex-line--up'"
      :style="{ height: `${sexLineHeight}px` }"
    />
    <div
      class="ft-box"
      :class="data.sex === 'male' ? 'ft-box--male' : 'ft-box--female'"
      :style="{ width: `${boxWidth}px`, height: `${boxHeight}px` }"
    >
      <span class="ft-name">{{ data.name }}</span>
    </div>
  </div>
  <div v-else class="ft-node ft-node--hide" />
</template>

<style scoped>
.ft-node {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 水平半线：锚定在卡片左右边缘（卡片居中，边缘 = 50% ± 卡片宽/2） */
.ft-line-x {
  position: absolute;
  top: 50%;
  height: 1px;
  background: #b9c6dd;
  pointer-events: none;
}
.ft-line-x--left {
  right: calc(50% + var(--box-w) / 2);
}
.ft-line-x--right {
  left: calc(50% + var(--box-w) / 2);
}

/* 垂直线：母猪向上、公猪向下（源码画线方向），从卡片竖直中线出发 */
.ft-sex-line {
  position: absolute;
  left: 50%;
  width: 1px;
  background: #b9c6dd;
  pointer-events: none;
}
.ft-sex-line--up {
  bottom: 50%;
}
.ft-sex-line--down {
  top: 50%;
}

.ft-box {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 6px;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.ft-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}
.ft-box--male {
  border: 1px solid #0f77cb55;
}
.ft-box--male::before {
  background: #0f77cb;
}
.ft-box--female {
  border: 1px solid #d07f3455;
}
.ft-box--female::before {
  background: #d07f34;
}
.ft-name {
  font-size: 13px;
  color: #1d2129;
  padding: 0 8px 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
