export type WorkflowAgentStage =
  | 'analysis'
  | 'control'
  | 'generation'
  | 'memory'
  | 'output'
  | 'quality'
  | 'router';

export type WorkflowOutputFormat = 'json' | 'markdown' | 'text';

export type WorkflowModelProvider = 'siliconflow';

export type WorkflowReasoningEffort = 'low' | 'medium' | 'high';

export interface WorkflowModelConfig {
  enable_thinking: boolean;
  max_tokens: number;
  model: string;
  provider: WorkflowModelProvider;
  reasoning_effort: WorkflowReasoningEffort;
  temperature: number;
  thinking_budget: number | null;
  timeout_sec: number;
}

export interface WorkflowNodeModelConfig extends WorkflowModelConfig {
  use_workflow_default: boolean;
}

export interface WorkflowAgentNodeData extends Record<string, unknown> {
  code: string;
  label: string;
  model_config: WorkflowNodeModelConfig;
  name: string;
  output_format: WorkflowOutputFormat;
  prompt: string;
  role: string;
  stage: WorkflowAgentStage;
}

export interface WorkflowCanvasPosition {
  x: number;
  y: number;
}

export interface WorkflowCanvasNode {
  data: WorkflowAgentNodeData;
  id: string;
  position: WorkflowCanvasPosition;
  type: 'agentFlow';
}

export interface WorkflowCanvasEdge {
  animated?: boolean;
  id: string;
  label?: string;
  labelBgBorderRadius?: number;
  labelBgPadding?: [number, number];
  labelBgStyle?: Record<string, string | number>;
  labelStyle?: Record<string, string | number>;
  source: string;
  sourceHandle?: string | null;
  style?: Record<string, string | number>;
  target: string;
  targetHandle?: string | null;
}

export interface WorkflowCanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowCanvas {
  edges: WorkflowCanvasEdge[];
  nodes: WorkflowCanvasNode[];
  viewport?: WorkflowCanvasViewport;
}

export type WorkflowStatus = 'active' | 'archived' | 'draft';

export interface WorkflowData {
  canvas: WorkflowCanvas;
  default_model_config: WorkflowModelConfig;
  description: string | null;
  entry_workspace_id: string;
  id: string;
  name: string;
  node_count: number;
  status: WorkflowStatus;
  template_key: string | null;
  updated_at: string;
}

export interface WorkflowListData {
  list: WorkflowData[];
}

export type WorkflowModelOptionSource = 'custom' | 'fallback' | 'remote';

export type WorkflowModelCapability = 'text' | 'vision';

export interface WorkflowModelOption {
  capabilities: WorkflowModelCapability[];
  description: string;
  group: string;
  id: string;
  label: string;
  provider: WorkflowModelProvider;
  source: WorkflowModelOptionSource;
  tags: string[];
}

export interface WorkflowModelCatalog {
  default_model: string;
  default_vision_model: string;
  list: WorkflowModelOption[];
  provider: WorkflowModelProvider;
  source: 'fallback' | 'remote';
}

export interface LangGraphNodeConfig {
  code: string;
  id: string;
  input_handles: string[];
  model_config: WorkflowModelConfig;
  name: string;
  output_format: WorkflowOutputFormat;
  output_handles: string[];
  prompt: string;
  role: string;
  stage: WorkflowAgentStage;
  type: string;
}

export interface LangGraphEdgeConfig {
  condition: string | null;
  id: string;
  source: string;
  source_handle: string | null;
  target: string;
  target_handle: string | null;
}

export interface LangGraphWorkflowConfig {
  default_model_config: WorkflowModelConfig;
  edges: LangGraphEdgeConfig[];
  entry_node_ids: string[];
  nodes: LangGraphNodeConfig[];
  terminal_node_ids: string[];
  version: 'langgraph-preview/v1';
}
