import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Frontend Patterns',
  description: '个人前端方案沉淀库',
  lang: 'zh-CN',
  // GitHub Pages 项目页部署在 https://<user>.github.io/frontend-patterns/ 子路径下
  base: '/frontend-patterns/',
  themeConfig: {
    nav: [{ text: '首页', link: '/' }],
    sidebar: [
      {
        text: '方案',
        items: [
          { text: '大数据列表/表格渲染', link: '/patterns/big-data-table' },
          { text: '可视化流程图编辑器', link: '/patterns/flow-editor' },
          { text: '查询表格封装', link: '/patterns/query-table' },
          { text: '弱网离线任务队列', link: '/patterns/offline-task-queue' },
          { text: 'AI 对话组件', link: '/patterns/ai-chat' },
          { text: '家系树可视化', link: '/patterns/family-tree' },
        ],
      },
    ],
    outline: { level: [2, 3] },
  },
})
