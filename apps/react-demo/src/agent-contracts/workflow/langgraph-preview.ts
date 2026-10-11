import type {
  LangGraphEdgeConfig,
  LangGraphNodeConfig,
  LangGraphWorkflowConfig,
  WorkflowCanvas,
  WorkflowCanvasEdge,
  WorkflowCanvasNode,
  WorkflowModelConfig,
  WorkflowNodeModelConfig,
} from './workflow.types.js';

export function convertReactFlowToLangGraphConfig(
  canvas: WorkflowCanvas,
  defaultModelConfig: WorkflowModelConfig,
): LangGraphWorkflowConfig {
  const incoming = new Map<string, WorkflowCanvasEdge[]>();
  const outgoing = new Map<string, WorkflowCanvasEdge[]>();

  for (const edge of canvas.edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  return {
    version: 'langgraph-preview/v1',
    default_model_config: defaultModelConfig,
    nodes: canvas.nodes.map((node) =>
      toLangGraphNode(
        node,
        incoming.get(node.id) ?? [],
        outgoing.get(node.id) ?? [],
        defaultModelConfig,
      ),
    ),
    edges: canvas.edges.map(toLangGraphEdge),
    entry_node_ids: canvas.nodes
      .filter((node) => !incoming.has(node.id) || incoming.get(node.id)?.length === 0)
      .map((node) => stableNodeId(node)),
    terminal_node_ids: canvas.nodes
      .filter((node) => !outgoing.has(node.id) || outgoing.get(node.id)?.length === 0)
      .map((node) => stableNodeId(node)),
  };
}

function toLangGraphNode(
  node: WorkflowCanvasNode,
  incoming: WorkflowCanvasEdge[],
  outgoing: WorkflowCanvasEdge[],
  defaultModelConfig: WorkflowModelConfig,
): LangGraphNodeConfig {
  return {
    id: stableNodeId(node),
    type: node.type,
    code: node.data.code,
    name: node.data.name,
    role: node.data.role,
    prompt: node.data.prompt,
    stage: node.data.stage,
    output_format: node.data.output_format,
    model_config: resolveNodeModelConfig(node.data.model_config, defaultModelConfig),
    input_handles: uniqueStrings(incoming.map((edge) => edge.targetHandle).filter(isString)),
    output_handles: uniqueStrings(outgoing.map((edge) => edge.sourceHandle).filter(isString)),
  };
}

function toLangGraphEdge(edge: WorkflowCanvasEdge): LangGraphEdgeConfig {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    source_handle: edge.sourceHandle ?? null,
    target_handle: edge.targetHandle ?? null,
    condition: typeof edge.label === 'string' && edge.label.length > 0 ? edge.label : null,
  };
}

function resolveNodeModelConfig(
  nodeModelConfig: WorkflowNodeModelConfig,
  defaultModelConfig: WorkflowModelConfig,
): WorkflowModelConfig {
  if (nodeModelConfig.use_workflow_default) {
    return defaultModelConfig;
  }

  return {
    provider: nodeModelConfig.provider,
    model: nodeModelConfig.model,
    temperature: nodeModelConfig.temperature,
    max_tokens: nodeModelConfig.max_tokens,
    enable_thinking: nodeModelConfig.enable_thinking,
    thinking_budget: nodeModelConfig.thinking_budget,
    reasoning_effort: nodeModelConfig.reasoning_effort,
    timeout_sec: nodeModelConfig.timeout_sec,
  };
}

function stableNodeId(node: WorkflowCanvasNode): string {
  if (node.id.length > 0) {
    return node.id;
  }

  const source = `${node.data.code}-${node.data.name}`;

  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}
