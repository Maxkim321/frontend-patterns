import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Frontend Patterns',
  description: '个人前端方案沉淀库',
  lang: 'zh-CN',
  themeConfig: {
    nav: [{ text: '首页', link: '/' }],
    sidebar: [
      {
        text: '方案',
        items: [
          { text: '大数据列表/表格渲染', link: '/patterns/big-data-table' },
        ],
      },
    ],
    outline: { level: [2, 3] },
  },
})
