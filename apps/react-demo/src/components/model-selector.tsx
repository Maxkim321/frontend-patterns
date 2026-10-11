'use client';

import { useMemo, useState } from 'react';
import type { WorkflowModelOption } from '@docflow/agent-contracts';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const HISTORICAL_MODEL_CAPABILITIES: WorkflowModelOption['capabilities'] = ['text'];

interface ModelSelectorProps {
  disabled?: boolean;
  onChange: (model: string) => void;
  options: WorkflowModelOption[];
  value: string;
}

export function ModelSelector({ disabled = false, onChange, options, value }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const resolvedOptions = useMemo(() => {
    if (options.some((option) => option.id === value)) {
      return options;
    }

    return [
      {
        capabilities: HISTORICAL_MODEL_CAPABILITIES,
        id: value,
        label: value,
        provider: 'siliconflow' as const,
        group: '历史 / 自定义',
        source: 'custom' as const,
        description: '当前工作流保存的历史模型，后端动态列表中暂未返回。',
        tags: ['历史'],
      },
      ...options,
    ];
  }, [options, value]);
  const selectedOption = resolvedOptions.find((option) => option.id === value);
  const groups = useMemo(() => groupModelOptions(resolvedOptions), [resolvedOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-between px-3 text-left font-normal"
          aria-expanded={open}
          disabled={disabled}
        >
          <span className="min-w-0 truncate text-sm">
            {selectedOption ? selectedOption.label : value}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索模型" className="h-8" />
          <CommandList className="max-h-60">
            <CommandEmpty>未找到模型</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.id} ${option.label} ${option.group} ${option.description} ${option.tags.join(' ')}`}
                    onSelect={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className="gap-2 py-1.5"
                  >
                    <Check
                      className={cn(
                        'size-3.5 shrink-0',
                        option.id === value ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm">{option.label}</span>
                        <Badge
                          variant={option.source === 'remote' ? 'secondary' : 'outline'}
                          className="h-4 shrink-0 px-1 text-[10px]"
                        >
                          {formatSource(option.source)}
                        </Badge>
                      </div>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {option.id}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function groupModelOptions(options: WorkflowModelOption[]): Array<{
  label: string;
  options: WorkflowModelOption[];
}> {
  const groupMap = new Map<string, WorkflowModelOption[]>();

  for (const option of options) {
    groupMap.set(option.group, [...(groupMap.get(option.group) ?? []), option]);
  }

  return Array.from(groupMap.entries()).map(([label, groupOptions]) => ({
    label,
    options: groupOptions,
  }));
}

function formatSource(source: WorkflowModelOption['source']): string {
  if (source === 'remote') return '在线';
  if (source === 'custom') return '历史';

  return '内置';
}
