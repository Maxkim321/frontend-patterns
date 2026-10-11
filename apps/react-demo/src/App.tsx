import { WorkflowStudioEditor } from './components/workflow-studio-editor'
import { Toaster } from './shims/toast'
import {
  DEFAULT_DOCFLOW_WORKFLOW_CANVAS,
  DEFAULT_WORKFLOW_MODEL_CONFIG,
  type WorkflowData,
} from './agent-contracts'

/**
 * demo 数据：直接用 agent-contracts 里导出的真实默认画布 + 默认模型配置，
 * 不依赖 DocFlow 后端（原版从 workflowApi 拉取，这里替换为本地数据）。
 */
const demoWorkflow = {
  id: 'demo-supervisor',
  name: 'DocFlow Supervisor 工作流',
  description: null,
  entry_workspace_id: 'demo',
  node_count: DEFAULT_DOCFLOW_WORKFLOW_CANVAS.nodes.length,
  status: 'draft',
  canvas: structuredClone(DEFAULT_DOCFLOW_WORKFLOW_CANVAS),
  default_model_config: structuredClone(DEFAULT_WORKFLOW_MODEL_CONFIG),
} as unknown as WorkflowData

const demoCatalog = {
  default_model: 'moonshotai/Kimi-K2.7-Code',
  default_vision_model: 'Qwen/Qwen3-VL-32B-Instruct',
  provider: 'siliconflow' as const,
  source: 'fallback' as const,
  list: [
    ['moonshotai/Kimi-K2.7-Code', 'Kimi K2.7 Code', ['text']],
    ['Pro/moonshotai/Kimi-K2.6', 'Kimi K2.6', ['text']],
    ['nex-agi/Nex-N2-Pro', 'Nex N2 Pro', ['text']],
    ['Qwen/Qwen3.6-35B-A3B', 'Qwen3.6 35B A3B', ['text']],
    ['Qwen/Qwen3-VL-32B-Instruct', 'Qwen3-VL 32B Instruct', ['vision', 'text']],
    ['Qwen/Qwen3-VL-32B-Thinking', 'Qwen3-VL 32B Thinking', ['vision', 'text']],
    ['Qwen/Qwen3-VL-8B-Instruct', 'Qwen3-VL 8B Instruct', ['vision', 'text']],
    ['PaddlePaddle/PaddleOCR-VL-1.5', 'PaddleOCR VL 1.5', ['vision']],
  ].map(([id, label, caps]) => ({
    id: id as string,
    label: label as string,
    provider: 'siliconflow' as const,
    capabilities: caps as string[],
    group: 'SiliconFlow',
    source: 'fallback' as const,
    tags: [],
    description: '',
  })),
}

export default function App() {
  return (
    <div className="h-screen">
      <WorkflowStudioEditor workflow={demoWorkflow} modelCatalog={demoCatalog} />
      <Toaster />
    </div>
  )
}
