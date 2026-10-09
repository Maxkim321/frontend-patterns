import DefaultTheme from 'vitepress/theme'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import AiChatDemo from '@playbook/ai-chat/demo/AiChatDemo.vue'
import BigDataTableDemo from '@playbook/big-data-table/demo/BigDataTableDemo.vue'
import FamilyTreeDemo from '@playbook/family-tree/demo/FamilyTreeDemo.vue'
import FlowEditorDemo from '@playbook/flow-editor/demo/FlowEditorDemo.vue'
import OfflineQueueDemo from '@playbook/offline-task-queue/demo/OfflineQueueDemo.vue'
import QueryTableDemo from '@playbook/query-table/demo/QueryTableDemo.vue'
import type { Theme } from 'vitepress'

// 新增方案时，在这里注册对应 demo 组件，然后在 .md 里用组件标签引入
const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(ElementPlus)
    app.component('AiChatDemo', AiChatDemo)
    app.component('BigDataTableDemo', BigDataTableDemo)
    app.component('FamilyTreeDemo', FamilyTreeDemo)
    app.component('FlowEditorDemo', FlowEditorDemo)
    app.component('OfflineQueueDemo', OfflineQueueDemo)
    app.component('QueryTableDemo', QueryTableDemo)
  },
}

export default theme
