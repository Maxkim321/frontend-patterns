'use client';

import { memo } from 'react';
import type { WorkflowAgentNodeData } from '@docflow/agent-contracts';
import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';

import { cn } from '@/lib/utils';

const stageStyles: Record<
  WorkflowAgentNodeData['stage'],
  { accent: string; border: string; title: string }
> = {
  router: {
    border: 'border-violet-300/70 dark:border-violet-400/35',
    title: 'text-violet-700 dark:text-violet-200',
    accent: 'bg-violet-500! dark:bg-violet-300!',
  },
  analysis: {
    border: 'border-emerald-300/70 dark:border-emerald-400/35',
    title: 'text-emerald-700 dark:text-emerald-200',
    accent: 'bg-emerald-500! dark:bg-emerald-300!',
  },
  generation: {
    border: 'border-blue-300/70 dark:border-blue-400/35',
    title: 'text-blue-700 dark:text-blue-200',
    accent: 'bg-blue-500! dark:bg-blue-300!',
  },
  quality: {
    border: 'border-rose-300/70 dark:border-rose-400/35',
    title: 'text-rose-700 dark:text-rose-200',
    accent: 'bg-rose-500! dark:bg-rose-300!',
  },
  control: {
    border: 'border-slate-300/80 dark:border-slate-400/35',
    title: 'text-slate-700 dark:text-slate-200',
    accent: 'bg-slate-600! dark:bg-slate-300!',
  },
  output: {
    border: 'border-amber-300/70 dark:border-amber-400/35',
    title: 'text-amber-700 dark:text-amber-200',
    accent: 'bg-amber-500! dark:bg-amber-300!',
  },
  memory: {
    border: 'border-cyan-300/70 dark:border-cyan-400/35',
    title: 'text-cyan-700 dark:text-cyan-200',
    accent: 'bg-cyan-500! dark:bg-cyan-300!',
  },
};

const HANDLE_CLASS_NAME =
  'size-2.5! border-2! border-card! shadow-sm transition-transform group-hover:scale-110';

export const AgentFlowNode = memo(
  ({ data: nodeData, selected }: NodeProps<Node<WorkflowAgentNodeData>>) => {
    const style = stageStyles[nodeData.stage];

    return (
      <div
        className={cn(
          'group w-[228px] overflow-hidden rounded-xl border bg-card/95 shadow-[0_12px_30px_-22px_color-mix(in_oklab,var(--color-foreground)_42%,transparent)] backdrop-blur-sm transition-[border-color,box-shadow] duration-200 hover:shadow-[0_16px_34px_-20px_color-mix(in_oklab,var(--color-foreground)_48%,transparent)]',
          style.border,
          selected && 'ring-2 ring-primary/45 shadow-lg',
        )}
      >
        <div className={cn('h-0.5 w-full opacity-90', style.accent)} />
        <div className="flex flex-col gap-2.5 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className={cn('size-1.5 shrink-0 rounded-full', style.accent)} />
              <span className={cn('truncate text-[11px] font-semibold', style.title)}>
                {nodeData.label}
              </span>
            </div>
            <span className="shrink-0 rounded-md border border-border/60 bg-muted/55 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-muted-foreground">
              {nodeData.code}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="truncate text-[13px] font-semibold leading-5 text-foreground">
              {nodeData.name}
            </div>
            <div className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
              {nodeData.role}
            </div>
          </div>
        </div>
        <Handle
          type="target"
          position={Position.Top}
          className={cn(HANDLE_CLASS_NAME, style.accent)}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn(HANDLE_CLASS_NAME, style.accent)}
        />
        <Handle
          type="source"
          id="branch-right"
          position={Position.Right}
          className={cn(HANDLE_CLASS_NAME, style.accent)}
        />
        <Handle
          type="target"
          id="branch-left"
          position={Position.Left}
          className={cn(HANDLE_CLASS_NAME, style.accent)}
        />
      </div>
    );
  },
);

AgentFlowNode.displayName = 'AgentFlowNode';
