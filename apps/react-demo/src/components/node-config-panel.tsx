'use client';

import type {
  WorkflowAgentNodeData,
  WorkflowModelConfig,
  WorkflowModelOption,
  WorkflowNodeModelConfig,
  WorkflowOutputFormat,
} from '@docflow/agent-contracts';
import type { Node } from '@xyflow/react';
import { Settings2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { ModelSelector } from './model-selector';

const STAGE_LABELS: Record<WorkflowAgentNodeData['stage'], string> = {
  router: '意图',
  analysis: '上下文',
  generation: '执行',
  quality: '审阅',
  control: '门禁',
  memory: '记忆',
  output: '响应',
};

interface NodeConfigPanelProps {
  defaultModelConfig: WorkflowModelConfig;
  defaultVisionModel: string;
  formatOptions: WorkflowOutputFormat[];
  modelOptions: WorkflowModelOption[];
  onClose: () => void;
  onPatchNode: (patch: Partial<WorkflowAgentNodeData>) => void;
  onRemoveNode: () => void;
  selectedNode: Node<WorkflowAgentNodeData>;
}

export function NodeConfigPanel({
  defaultModelConfig,
  defaultVisionModel,
  formatOptions,
  modelOptions,
  onClose,
  onPatchNode,
  onRemoveNode,
  selectedNode,
}: NodeConfigPanelProps) {
  const isVisionNode = selectedNode.data.code === 'VI';
  const compatibleModelOptions = modelOptions.filter((option) =>
    option.capabilities.includes(isVisionNode ? 'vision' : 'text'),
  );
  const patchModelConfig = (patch: Partial<WorkflowNodeModelConfig>) => {
    const baseConfig = selectedNode.data.model_config.use_workflow_default
      ? {
          ...defaultModelConfig,
          ...(isVisionNode
            ? {
                model: defaultVisionModel,
                enable_thinking: false,
                thinking_budget: null,
                reasoning_effort: 'low' as const,
              }
            : {}),
          use_workflow_default: false,
        }
      : selectedNode.data.model_config;

    onPatchNode({
      model_config: {
        ...baseConfig,
        ...patch,
      },
    });
  };
  const modelConfig = selectedNode.data.model_config;
  const effectiveModelConfig = modelConfig.use_workflow_default ? defaultModelConfig : modelConfig;
  const selectedModel =
    isVisionNode &&
    (modelConfig.use_workflow_default ||
      !compatibleModelOptions.some((option) => option.id === modelConfig.model))
      ? defaultVisionModel
      : modelConfig.use_workflow_default
        ? defaultModelConfig.model
        : modelConfig.model;

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-l border-border/70 bg-muted/15">
      <div className="shrink-0 border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Settings2 aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">节点配置</h3>
              <p className="truncate text-xs text-muted-foreground">运行职责 / Prompt / 模型参数</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge>{selectedNode.data.code}</Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="关闭节点配置"
            >
              <X />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3.5">
          <Card className="rounded-lg border-border/70 bg-card/80 shadow-none">
            <CardContent className="flex flex-col gap-1 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{selectedNode.data.name}</p>
              <p className="text-xs text-muted-foreground">{selectedNode.data.role}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {STAGE_LABELS[selectedNode.data.stage]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {modelConfig.use_workflow_default ? '工作流默认模型' : modelConfig.model}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">节点编号</Label>
              <Input value={selectedNode.data.code} readOnly className="h-9 bg-muted" />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">阶段</Label>
              <Input
                value={STAGE_LABELS[selectedNode.data.stage]}
                readOnly
                className="h-9 bg-muted"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Agent 名称</Label>
            <Input
              className="h-9"
              value={selectedNode.data.name}
              onChange={(event) => onPatchNode({ name: event.target.value })}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">职责描述</Label>
            <Textarea
              rows={3}
              value={selectedNode.data.role}
              onChange={(event) => onPatchNode({ role: event.target.value })}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">System Prompt</Label>
            <Textarea
              rows={6}
              value={selectedNode.data.prompt}
              onChange={(event) => onPatchNode({ prompt: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">模型策略</Label>
            {isVisionNode ? (
              <Input value="视觉节点独立配置" readOnly className="h-9 bg-muted" />
            ) : (
              <Select
                value={modelConfig.use_workflow_default ? 'workflow-default' : 'node-override'}
                onValueChange={(value) =>
                  patchModelConfig({
                    use_workflow_default: value === 'workflow-default',
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>模型策略</SelectLabel>
                    <SelectItem value="workflow-default">使用工作流默认模型</SelectItem>
                    <SelectItem value="node-override">节点单独覆盖</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">模型服务商</Label>
            <Input value="SiliconFlow" readOnly className="h-9 bg-muted" />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              {isVisionNode ? '视觉模型' : '模型'}
            </Label>
            <ModelSelector
              value={selectedModel}
              options={compatibleModelOptions}
              onChange={(model) =>
                patchModelConfig({
                  model,
                  provider: 'siliconflow',
                  ...(isVisionNode
                    ? {
                        enable_thinking: false,
                        thinking_budget: null,
                        reasoning_effort: 'low' as const,
                      }
                    : {}),
                  use_workflow_default: false,
                })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Temperature</Label>
              <Input
                className="h-9"
                type="number"
                min={0}
                max={1}
                step={0.1}
                disabled={modelConfig.use_workflow_default}
                value={effectiveModelConfig.temperature}
                onChange={(event) =>
                  patchModelConfig({
                    temperature: clampNumber(Number(event.target.value), 0, 1),
                    use_workflow_default: false,
                  })
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Max Tokens</Label>
              <Input
                className="h-9"
                type="number"
                min={128}
                max={32768}
                step={64}
                disabled={modelConfig.use_workflow_default}
                value={effectiveModelConfig.max_tokens}
                onChange={(event) =>
                  patchModelConfig({
                    max_tokens: clampNumber(Number(event.target.value), 128, 32768),
                    use_workflow_default: false,
                  })
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">超时(秒)</Label>
              <Input
                className="h-9"
                type="number"
                min={5}
                max={300}
                step={1}
                disabled={modelConfig.use_workflow_default}
                value={effectiveModelConfig.timeout_sec}
                onChange={(event) =>
                  patchModelConfig({
                    timeout_sec: clampNumber(Number(event.target.value), 5, 300),
                    use_workflow_default: false,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">思考能力</Label>
              <Select
                value={effectiveModelConfig.enable_thinking ? 'enabled' : 'disabled'}
                disabled={modelConfig.use_workflow_default || isVisionNode}
                onValueChange={(value) =>
                  patchModelConfig({
                    enable_thinking: value === 'enabled',
                    thinking_budget:
                      value === 'enabled' ? (effectiveModelConfig.thinking_budget ?? 4096) : null,
                    use_workflow_default: false,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>思考能力</SelectLabel>
                    <SelectItem value="enabled">开启</SelectItem>
                    <SelectItem value="disabled">关闭</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">推理强度</Label>
              <Select
                value={effectiveModelConfig.reasoning_effort}
                disabled={modelConfig.use_workflow_default || isVisionNode}
                onValueChange={(value) =>
                  patchModelConfig({
                    reasoning_effort: value as WorkflowNodeModelConfig['reasoning_effort'],
                    use_workflow_default: false,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>推理强度</SelectLabel>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">思考预算</Label>
              <Input
                className="h-9"
                type="number"
                min={0}
                max={32768}
                step={256}
                disabled={
                  modelConfig.use_workflow_default ||
                  isVisionNode ||
                  !effectiveModelConfig.enable_thinking
                }
                value={
                  effectiveModelConfig.thinking_budget === null
                    ? ''
                    : effectiveModelConfig.thinking_budget
                }
                onChange={(event) =>
                  patchModelConfig({
                    thinking_budget:
                      event.target.value.length > 0
                        ? clampNumber(Number(event.target.value), 0, 32768)
                        : null,
                    use_workflow_default: false,
                  })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">输出格式</Label>
            <Select
              value={selectedNode.data.output_format}
              onValueChange={(value) =>
                onPatchNode({ output_format: value as WorkflowOutputFormat })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>格式</SelectLabel>
                  {formatOptions.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button variant="destructive" className="w-full" onClick={onRemoveNode}>
            删除节点
          </Button>
        </div>
      </div>
    </aside>
  );
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}
