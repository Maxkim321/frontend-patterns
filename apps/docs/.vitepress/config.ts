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
        ],
      },
    ],
    outline: { level: [2, 3] },
  },
})
