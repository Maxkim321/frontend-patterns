import { defineConfig, loadEnv } from 'vitepress'

export default defineConfig(({ mode }) => {
  // 本地开发专用：火山引擎 Ark 的 key 放在 apps/docs/.env.local（已被 gitignore），
  // 通过下面的 Vite 代理在服务端注入 Authorization——key 永远不进浏览器代码、不进仓库。
  // 公网静态站（GitHub Pages）没有代理，demo 里会自动降级为模拟流。
  const env = loadEnv(mode, process.cwd(), 'ARK_')

  return {
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
          { text: 'Agent 工作流编辑器', link: '/patterns/workflow-editor' },
          { text: '分步表单向导', link: '/patterns/form-wizard' },
        ],
      },
      {
        text: 'AI 技能',
        items: [
          { text: '总览', link: '/skills/index' },
          { text: 'Vue3 代码审查', link: '/skills/vue-code-review' },
          { text: '单元测试生成', link: '/skills/unit-test-gen' },
          { text: '提交信息生成', link: '/skills/commit-message' },
          { text: 'LLM 结构化抽取', link: '/skills/llm-json-extraction' },
          { text: 'Agent 槽位收集', link: '/skills/agent-slot-filling' },
          { text: '简历拷打预演', link: '/skills/interview-grilling' },
          { text: '报错排查喂料', link: '/skills/bug-report-prompt' },
          { text: 'UI 还原（Figma MCP）', link: '/skills/ui-restore' },
        ],
      },
    ],
      outline: { level: [2, 3] },
    },
    vite: {
      server: {
        proxy: {
          '/api/ark': {
            target: 'https://ark.cn-beijing.volces.com',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/ark/, '/api/coding/v3'),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                if (env.ARK_API_KEY) {
                  proxyReq.setHeader('Authorization', `Bearer ${env.ARK_API_KEY}`)
                }
              })
            },
          },
        },
      },
    },
  }
})
