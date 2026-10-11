'use client';

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  convertReactFlowToLangGraphConfig,
  DEFAULT_WORKFLOW_AGENT_LIBRARY,
  getWorkflowAgentByCode,
  type WorkflowAgentNodeData,
  type WorkflowAgentStage,
  type WorkflowCanvas,
  type WorkflowCanvasEdge,
  type WorkflowCanvasNode,
  type WorkflowData,
  type WorkflowModelCatalog,
  type WorkflowOutputFormat,
} from '@docflow/agent-contracts/workflow';
import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type DefaultEdgeOptions,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  MarkerType,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import {
  ArrowLeft,
  Code2,
  Copy,
  Database,
  GitBranch,
  GitMerge,
  type LucideIcon,
  Play,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useTheme } from '@/components/theme-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { workflowApi } from '@/services/workflows';

import WorkflowFlowEdge from './edges/workflow-flow-edge';
import { AgentFlowNode } from './nodes/agent-flow-node';
import { NodeConfigPanel } from './node-config-panel';

hljs.registerLanguage('json', json);

const DEFAULT_EDGE_STYLE = {
  stroke: 'color-mix(in oklab, var(--color-foreground) 42%, transparent)',
  strokeDasharray: '6 6',
  strokeWidth: 1.35,
} as const;

const DEFAULT_EDGE_OPTIONS = {
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    height: 14,
    width: 14,
  },
  style: DEFAULT_EDGE_STYLE,
  type: 'workflowFlow',
} satisfies DefaultEdgeOptions;

const NODE_TYPES: NodeTypes = { agentFlow: AgentFlowNode };
const EDGE_TYPES: EdgeTypes = { workflowFlow: WorkflowFlowEdge };

const FORMAT_OPTIONS: WorkflowOutputFormat[] = ['json', 'markdown', 'text'];

const STAGE_LABELS: Record<WorkflowAgentStage, string> = {
  router: '意图',
  analysis: '上下文',
  generation: '执行',
  quality: '审阅',
  control: '门禁',
  memory: '记忆',
  output: '响应',
};

const STAGE_ORDER: WorkflowAgentStage[] = [
  'router',
  'analysis',
  'generation',
  'quality',
  'control',
  'memory',
  'output',
];

const STAGE_ICONS: Record<WorkflowAgentStage, LucideIcon> = {
  router: GitBranch,
  analysis: Search,
  generation: Sparkles,
  quality: ShieldCheck,
  control: GitMerge,
  memory: Database,
  output: Send,
};

const STAGE_BUTTON_CLASSES: Record<WorkflowAgentStage, string> = {
  router:
    'border-violet-200/80 bg-card text-foreground hover:border-violet-300 hover:bg-violet-50 dark:border-violet-400/25 dark:bg-card dark:hover:border-violet-400/45 dark:hover:bg-violet-500/10',
  analysis:
    'border-emerald-200/80 bg-card text-foreground hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-400/25 dark:bg-card dark:hover:border-emerald-400/45 dark:hover:bg-emerald-500/10',
  generation:
    'border-blue-200/80 bg-card text-foreground hover:border-blue-300 hover:bg-blue-50 dark:border-blue-400/25 dark:bg-card dark:hover:border-blue-400/45 dark:hover:bg-blue-500/10',
  quality:
    'border-rose-200/80 bg-card text-foreground hover:border-rose-300 hover:bg-rose-50 dark:border-rose-400/25 dark:bg-card dark:hover:border-rose-400/45 dark:hover:bg-rose-500/10',
  control:
    'border-slate-300/80 bg-card text-foreground hover:border-slate-400 hover:bg-slate-50 dark:border-slate-400/25 dark:bg-card dark:hover:border-slate-300/45 dark:hover:bg-slate-400/10',
  memory:
    'border-cyan-200/80 bg-card text-foreground hover:border-cyan-300 hover:bg-cyan-50 dark:border-cyan-400/25 dark:bg-card dark:hover:border-cyan-400/45 dark:hover:bg-cyan-500/10',
  output:
    'border-amber-200/80 bg-card text-foreground hover:border-amber-300 hover:bg-amber-50 dark:border-amber-400/25 dark:bg-card dark:hover:border-amber-400/45 dark:hover:bg-amber-500/10',
};

const STAGE_ICON_CLASSES: Record<WorkflowAgentStage, string> = {
  router: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  analysis: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  generation: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  quality: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
  control: 'bg-slate-200 text-slate-700 dark:bg-slate-400/24 dark:text-slate-200',
  memory: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200',
  output: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
};

interface WorkflowStudioEditorProps {
  modelCatalog: WorkflowModelCatalog;
  workflow: WorkflowData;
}

export function WorkflowStudioEditor({ modelCatalog, workflow }: WorkflowStudioEditorProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const flowColorMode = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [workflowName, setWorkflowName] = useState(workflow.name);
  const [defaultModelConfig, setDefaultModelConfig] = useState(workflow.default_model_config);
  const [nodes, setNodes, onNodesChange] = useNodesState(toReactFlowNodes(workflow.canvas));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toReactFlowEdges(workflow.canvas));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [counter, setCounter] = useState(workflow.canvas.nodes.length + 1);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [viewMode, setViewMode] = useState<'canvas' | 'code'>('canvas');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<
    Node<WorkflowAgentNodeData>,
    Edge
  > | null>(null);
  const flowThemeStyle = useMemo<CSSProperties>(() => {
    if (flowColorMode === 'dark') {
      return {
        '--xy-controls-button-background-color': '#101117',
        '--xy-controls-button-background-color-hover': '#181b24',
        '--xy-controls-button-color': '#f4f4f5',
        '--xy-controls-button-color-hover': '#ffffff',
        '--xy-controls-button-border-color': 'rgba(244, 244, 245, 0.16)',
        '--xy-controls-box-shadow': '0 10px 28px rgba(0, 0, 0, 0.5)',
      } as CSSProperties;
    }

    return {
      '--xy-controls-button-background-color': '#ffffff',
      '--xy-controls-button-background-color-hover': '#f4f4f5',
      '--xy-controls-button-color': '#18181b',
      '--xy-controls-button-color-hover': '#09090b',
      '--xy-controls-button-border-color': 'rgba(24, 24, 27, 0.08)',
      '--xy-controls-box-shadow': '0 8px 20px rgba(15, 23, 42, 0.15)',
    } as CSSProperties;
  }, [flowColorMode]);
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const groupedAgents = useMemo(() => {
    const keyword = libraryQuery.trim().toLowerCase();
    const filteredAgents = keyword
      ? DEFAULT_WORKFLOW_AGENT_LIBRARY.filter((agent) =>
          `${agent.code} ${agent.name} ${agent.role} ${STAGE_LABELS[agent.stage]}`
            .toLowerCase()
            .includes(keyword),
        )
      : DEFAULT_WORKFLOW_AGENT_LIBRARY;

    return STAGE_ORDER.map((stage) => ({
      stage,
      items: filteredAgents.filter((agent) => agent.stage === stage),
    })).filter((group) => group.items.length > 0);
  }, [libraryQuery]);
  const canvasSnapshot = useMemo(
    () => createCanvasSnapshot(nodes, edges, flowInstance),
    [edges, flowInstance, nodes],
  );
  const reactFlowCode = useMemo(() => JSON.stringify(canvasSnapshot, null, 2), [canvasSnapshot]);
  const langGraphCode = useMemo(
    () =>
      JSON.stringify(
        convertReactFlowToLangGraphConfig(canvasSnapshot, defaultModelConfig),
        null,
        2,
      ),
    [canvasSnapshot, defaultModelConfig],
  );

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<WorkflowAgentNodeData>>[]) => {
      onNodesChange(changes);

      if (changes.some((change) => change.type !== 'select')) {
        markDirty();
      }
    },
    [markDirty, onNodesChange],
  );
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      onEdgesChange(changes);

      if (changes.some((change) => change.type !== 'select')) {
        markDirty();
      }
    },
    [markDirty, onEdgesChange],
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: DEFAULT_EDGE_STYLE,
          },
          currentEdges,
        ),
      );
      markDirty();
    },
    [markDirty, setEdges],
  );
  const addAgentNode = useCallback(
    (agentCode: string, dropPosition?: { x: number; y: number }) => {
      const agent = getWorkflowAgentByCode(agentCode);
      const id = `${agent.code.toLowerCase()}-${counter}`;
      const col = nodes.length % 3;
      const row = Math.floor(nodes.length / 3);
      const position = dropPosition ?? {
        x: 140 + col * 330,
        y: 140 + row * 210,
      };

      setNodes((currentNodes) => [
        ...currentNodes,
        {
          id,
          type: 'agentFlow',
          position,
          data: {
            ...agent,
            model_config: {
              ...agent.model_config,
            },
          },
        },
      ]);
      setSelectedNodeId(id);
      setCounter((value) => value + 1);
      markDirty();
    },
    [counter, markDirty, nodes.length, setNodes],
  );
  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, agentCode: string) => {
      event.dataTransfer.setData('application/x-agent-code', agentCode);
      event.dataTransfer.effectAllowed = 'move';
    },
    [],
  );
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!flowInstance) {
        return;
      }

      const agentCode = event.dataTransfer.getData('application/x-agent-code');

      if (!agentCode) {
        return;
      }

      const position = flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addAgentNode(agentCode, position);
    },
    [addAgentNode, flowInstance],
  );
  const patchSelectedNode = useCallback(
    (patch: Partial<WorkflowAgentNodeData>) => {
      if (!selectedNodeId) {
        return;
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== selectedNodeId) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              ...patch,
            },
          };
        }),
      );
      markDirty();
    },
    [markDirty, selectedNodeId, setNodes],
  );
  const removeSelectedNode = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
    markDirty();
  }, [markDirty, selectedNodeId, setEdges, setNodes]);
  const handleWorkflowNameChange = (value: string) => {
    setWorkflowName(value);
    setIsDirty(true);
  };
  const copyCode = useCallback((value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success('已复制');
  }, []);
  const handleBack = () => {
    if (isDirty && !window.confirm('当前工作流有未保存修改，确认离开？')) {
      return;
    }

    router.push('/dashboard/workflow', { scroll: false });
  };
  const handleSave = async () => {
    setIsSaving(true);

    const result = await workflowApi.updateWorkflow(workflow.id, {
      name: workflowName,
      canvas: createCanvasSnapshot(nodes, edges, flowInstance),
      default_model_config: defaultModelConfig,
    });

    setIsSaving(false);

    if (result.error || !result.data?.data) {
      toast.error(result.error ?? '工作流保存失败');

      return;
    }

    setWorkflowName(result.data.data.name);
    setDefaultModelConfig(result.data.data.default_model_config);
    setIsDirty(false);
    toast.success('工作流已保存');
  };

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card/85 backdrop-blur">
        <div className="flex h-12 w-full items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleBack}
              aria-label="返回工作流列表"
            >
              <ArrowLeft />
            </Button>
            <Input
              value={workflowName}
              onChange={(event) => handleWorkflowNameChange(event.target.value)}
              className="h-8 w-48 border-transparent bg-transparent px-1 text-base font-semibold shadow-none sm:w-64 lg:w-80"
              aria-label="工作流名称"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant={viewMode === 'code' ? 'outline' : 'secondary'}
              size="sm"
              onClick={() =>
                setViewMode((currentViewMode) => (currentViewMode === 'code' ? 'canvas' : 'code'))
              }
              aria-label={viewMode === 'code' ? '切换到画布模式' : '切换到代码模式'}
            >
              {viewMode === 'code' ? (
                <Play data-icon="inline-start" />
              ) : (
                <Code2 data-icon="inline-start" />
              )}
              {viewMode === 'code' ? '画布' : 'Code'}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !isDirty}>
              <Save data-icon="inline-start" />
              {isSaving ? '保存中' : '保存'}
            </Button>
          </div>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-hidden bg-background">
        <div
          className={cn(
            'grid h-full min-h-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm',
            selectedNode
              ? 'grid-cols-[300px_minmax(0,1fr)_350px]'
              : 'grid-cols-[300px_minmax(0,1fr)]',
          )}
        >
          <aside className="overflow-y-auto border-r border-border/70 bg-muted/15">
            <div className="sticky top-0 z-10 border-b border-border/70 bg-card/95 p-3 backdrop-blur">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">节点库</h3>
                  <p className="text-xs text-muted-foreground">当前 DocFlow 运行时节点</p>
                </div>
                <Badge variant="outline">{DEFAULT_WORKFLOW_AGENT_LIBRARY.length}</Badge>
              </div>
              <Input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="搜索节点名称 / 编号 / 职责"
                className="h-8 bg-background"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>按运行阶段分组</span>
                <span>点击或拖拽添加</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-3">
              {groupedAgents.length > 0 ? (
                groupedAgents.map((group) => (
                  <section key={group.stage}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {STAGE_LABELS[group.stage]}
                      </span>
                      <span className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {group.items.length}
                      </span>
                      <Separator className="flex-1" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {group.items.map((agent) => {
                        const StageIcon = STAGE_ICONS[agent.stage];

                        return (
                          <Button
                            key={agent.code}
                            variant="outline"
                            size="sm"
                            onClick={() => addAgentNode(agent.code)}
                            draggable
                            onDragStart={(event) => onDragStart(event, agent.code)}
                            className={cn(
                              'h-auto w-full justify-start rounded-lg border px-2.5 py-2 text-left shadow-none',
                              STAGE_BUTTON_CLASSES[agent.stage],
                            )}
                          >
                            <div className="flex w-full items-start gap-2">
                              <span
                                className={cn(
                                  'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md',
                                  STAGE_ICON_CLASSES[agent.stage],
                                )}
                              >
                                <StageIcon className="size-3.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-semibold">
                                    {agent.name}
                                  </span>
                                  <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-medium opacity-75 dark:bg-white/10">
                                    {agent.code}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-xs opacity-80">{agent.role}</p>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </section>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-background/70 p-3 text-xs text-muted-foreground">
                  未找到匹配节点，换个关键词试试。
                </div>
              )}
            </div>
          </aside>

          <div className="relative h-full min-h-0 min-w-0 bg-background">
            {viewMode === 'code' ? (
              <div className="grid h-full min-h-0 grid-cols-2 overflow-hidden">
                <CodePreview
                  title="ReactFlow 原始画布数据"
                  code={reactFlowCode}
                  onCopy={copyCode}
                />
                <CodePreview title="LangGraph 配置预览" code={langGraphCode} onCopy={copyCode} />
              </div>
            ) : (
              <>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px)] bg-size-[28px_28px] opacity-25 dark:opacity-18"
                />

                <ReactFlow
                  className="h-full! w-full! bg-transparent!"
                  colorMode={flowColorMode}
                  style={flowThemeStyle}
                  nodes={nodes}
                  edges={edges}
                  connectionLineStyle={DEFAULT_EDGE_STYLE}
                  defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                  defaultMarkerColor={DEFAULT_EDGE_STYLE.stroke}
                  edgeTypes={EDGE_TYPES}
                  elevateEdgesOnSelect
                  nodeTypes={NODE_TYPES}
                  onInit={(instance) => setFlowInstance(instance)}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onConnect={onConnect}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                  onPaneClick={() => setSelectedNodeId(null)}
                  fitView
                  fitViewOptions={{ padding: 0.08, maxZoom: 0.95 }}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={28}
                    size={1}
                    color="color-mix(in oklab, var(--color-foreground) 18%, transparent)"
                  />
                  <MiniMap
                    pannable
                    zoomable
                    className="rounded-lg! border! border-border/70! bg-card/90!"
                    nodeColor={(node) => stageColor((node.data as WorkflowAgentNodeData).stage)}
                  />
                  <Controls
                    showInteractive={false}
                    className="rounded-lg! border! border-border/70! bg-card/90! shadow-sm backdrop-blur [&_button]:border-border/70 [&_button]:bg-card/85 [&_button]:text-foreground [&_button:hover]:bg-muted [&_button:hover]:text-foreground [&_svg]:text-foreground"
                  />
                </ReactFlow>
              </>
            )}
          </div>

          {selectedNode ? (
            <NodeConfigPanel
              defaultModelConfig={defaultModelConfig}
              defaultVisionModel={modelCatalog.default_vision_model}
              formatOptions={FORMAT_OPTIONS}
              modelOptions={modelCatalog.list}
              onClose={() => setSelectedNodeId(null)}
              onPatchNode={patchSelectedNode}
              onRemoveNode={removeSelectedNode}
              selectedNode={selectedNode}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function CodePreview({
  code,
  onCopy,
  title,
}: {
  code: string;
  onCopy: (value: string) => void;
  title: string;
}) {
  const highlightedCode = useMemo(() => hljs.highlight(code, { language: 'json' }).value, [code]);

  return (
    <div className="flex min-h-0 flex-col border-r border-border/70 last:border-r-0">
      <div className="flex items-center justify-between border-b border-border/70 bg-background/95 px-3 py-2">
        <p className="text-xs text-muted-foreground">{title}</p>
        <Button type="button" variant="outline" size="xs" onClick={() => onCopy(code)}>
          <Copy data-icon="inline-start" />
          复制
        </Button>
      </div>
      <pre className="syntax-highlight min-h-0 flex-1 overflow-auto p-4! text-xs! leading-5!">
        <code
          className="hljs language-json"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
}

function toReactFlowNodes(canvas: WorkflowCanvas): Node<WorkflowAgentNodeData>[] {
  return canvas.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      model_config: {
        ...node.data.model_config,
      },
    },
  }));
}

function toReactFlowEdges(canvas: WorkflowCanvas): Edge[] {
  const nodesById = new Map(canvas.nodes.map((node) => [node.id, node]));

  return canvas.edges.map((edge) => {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);
    const useHorizontalHandles =
      edge.sourceHandle == null &&
      edge.targetHandle == null &&
      sourceNode !== undefined &&
      targetNode !== undefined &&
      targetNode.position.x - sourceNode.position.x >= 120;

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: useHorizontalHandles ? 'branch-right' : edge.sourceHandle,
      targetHandle: useHorizontalHandles ? 'branch-left' : edge.targetHandle,
      label: edge.label,
      animated: true,
      style: edge.style as CSSProperties | undefined,
      labelStyle: edge.labelStyle as CSSProperties | undefined,
      labelBgPadding: edge.labelBgPadding,
      labelBgBorderRadius: edge.labelBgBorderRadius,
      labelBgStyle: edge.labelBgStyle as CSSProperties | undefined,
    };
  });
}

function createCanvasSnapshot(
  nodes: Node<WorkflowAgentNodeData>[],
  edges: Edge[],
  flowInstance: ReactFlowInstance<Node<WorkflowAgentNodeData>, Edge> | null,
): WorkflowCanvas {
  return {
    nodes: nodes.map(toWorkflowCanvasNode),
    edges: edges.map(toWorkflowCanvasEdge),
    ...(flowInstance ? { viewport: flowInstance.getViewport() } : {}),
  };
}

function toWorkflowCanvasNode(node: Node<WorkflowAgentNodeData>): WorkflowCanvasNode {
  return {
    id: node.id,
    type: 'agentFlow',
    position: node.position,
    data: {
      ...node.data,
      model_config: {
        ...node.data.model_config,
      },
    },
  };
}

function toWorkflowCanvasEdge(edge: Edge): WorkflowCanvasEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: typeof edge.label === 'string' ? edge.label : undefined,
    animated: edge.animated,
    style: toStyleRecord(edge.style),
    labelStyle: toStyleRecord(edge.labelStyle),
    labelBgPadding: Array.isArray(edge.labelBgPadding)
      ? [Number(edge.labelBgPadding[0]), Number(edge.labelBgPadding[1])]
      : undefined,
    labelBgBorderRadius:
      typeof edge.labelBgBorderRadius === 'number' ? edge.labelBgBorderRadius : undefined,
    labelBgStyle: toStyleRecord(edge.labelBgStyle),
  };
}

function toStyleRecord(
  style: CSSProperties | undefined,
): Record<string, string | number> | undefined {
  if (!style) return undefined;

  const entries = Object.entries(style).filter(
    (entry): entry is [string, string | number] =>
      typeof entry[1] === 'string' || typeof entry[1] === 'number',
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function stageColor(stage: WorkflowAgentStage): string {
  if (stage === 'router') return '#8b5cf6';
  if (stage === 'analysis') return '#10b981';
  if (stage === 'generation') return '#3b82f6';
  if (stage === 'quality') return '#f43f5e';
  if (stage === 'control') return '#64748b';
  if (stage === 'memory') return '#06b6d4';

  return '#f59e0b';
}
