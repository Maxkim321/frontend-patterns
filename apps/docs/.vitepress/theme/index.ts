import DefaultTheme from 'vitepress/theme'
import BigDataTableDemo from '@playbook/big-data-table/demo/BigDataTableDemo.vue'
import FlowEditorDemo from '@playbook/flow-editor/demo/FlowEditorDemo.vue'
import type { Theme } from 'vitepress'

// 新增方案时，在这里注册对应 demo 组件，然后在 .md 里用组件标签引入
const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('BigDataTableDemo', BigDataTableDemo)
    app.component('FlowEditorDemo', FlowEditorDemo)
  },
}

export default theme
