import type { IsoDateTimeString, JsonObject } from '../shared.types.js';

export const COMPACTABLE_AGENT_TOOLS = ['document_glob', 'document_grep', 'document_read'] as const;

export type CompactableAgentTool = (typeof COMPACTABLE_AGENT_TOOLS)[number];

export interface ContextBudgetResult {
  max_tokens: number;
  used_tokens: number;
  remaining_tokens: number;
  usage_ratio: number;
  auto_compact_threshold: number;
  blocking_threshold: number;
  blocking_limit_reached: boolean;
  micro_compaction_required: boolean;
  auto_compaction_required: boolean;
}

export interface CompactableToolResult {
  id: string;
  tool_name: string;
  token_estimate: number;
  compactable_text: string;
  metadata?: JsonObject;
}

export interface AgentCompactSummary {
  id: string;
  run_id: string;
  source_event_ids: string[];
  summary: string;
  restored_block_ids: string[];
  token_estimate_before: number;
  token_estimate_after: number;
  created_at: IsoDateTimeString;
}
