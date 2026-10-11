import type { AgentAttachment, ImageUnderstanding } from '../attachment/attachment.types.js';
import type { ContextBudgetResult } from '../context/context.types.js';
import type {
  DocumentGlobResult,
  DocumentGrepResult,
  DocumentReadResult,
} from '../document-search/document-search.types.js';
import type { AgentEditProposal, AgentTrackChangeSummary } from '../edit/agent-edit.types.js';
import type { AgentEditConflictEvent, AgentError } from '../errors/agent-error.types.js';
import type { IntentEnvelope, IntentRiskLevel } from '../intent/intent.types.js';
import type { IsoDateTimeString, JsonObject } from '../shared.types.js';

export const agentRunStatusValues = [
  'idle',
  'running',
  'vision_processing',
  'intent_routing',
  'searching_document',
  'reasoning',
  'proposing_edit',
  'applying_yjs',
  'track_changes_ready',
  'compacting',
  'waiting_review',
  'completed',
  'failed',
  'cancelled',
] as const;

export type AgentRunStatus = (typeof agentRunStatusValues)[number];

export const agentTaskPlanStepStatusValues = [
  'pending',
  'running',
  'done',
  'failed',
  'cancelled',
] as const;

export type AgentTaskPlanStepStatus = (typeof agentTaskPlanStepStatusValues)[number];

export const agentRunEventTypeValues = [
  'run_started',
  'user_message',
  'task_plan_started',
  'task_plan_updated',
  'run_summary_created',
  'intent_detected',
  'workflow_node_started',
  'workflow_node_finished',
  'workflow_node_failed',
  'run_checkpoint_created',
  'policy_gate_started',
  'policy_gate_passed',
  'policy_gate_blocked',
  'human_approval_requested',
  'human_approval_resolved',
  'model_call_started',
  'model_call_finished',
  'model_call_retrying',
  'model_call_timed_out',
  'model_thinking_delta',
  'model_thinking_done',
  'model_answer_delta',
  'system_process_summary',
  'memory_loaded',
  'memory_writeback',
  'tool_call_started',
  'tool_call_finished',
  'tool_call_retrying',
  'tool_call_timed_out',
  'tool_call_failed',
  'rate_limit_backoff',
  'document_glob_started',
  'document_glob_finished',
  'document_grep_started',
  'document_grep_finished',
  'document_read_started',
  'document_read_finished',
  'context_budget_updated',
  'micro_compaction_started',
  'auto_compaction_started',
  'manual_compaction_started',
  'micro_compaction_finished',
  'auto_compaction_finished',
  'manual_compaction_finished',
  'context_restored',
  'context_blocked',
  'vision_processing_started',
  'vision_finished',
  'edit_proposed',
  'applied_to_yjs',
  'agent_edit_conflict',
  'track_changes_ready',
  'accepted',
  'rejected',
  'stream_interrupted',
  'stream_resumed',
  'run_paused',
  'run_resumed',
  'run_completed',
  'cancelled',
  'failed',
] as const;

export type AgentRunEventType = (typeof agentRunEventTypeValues)[number];

export type AgentRuntimeStage =
  | 'intent_detection'
  | 'vision'
  | 'document_search'
  | 'context_compaction'
  | 'reasoning'
  | 'edit_proposal'
  | 'yjs_apply'
  | 'memory'
  | 'summary'
  | 'workflow';

export type AgentApprovalDecision = 'approved' | 'cancelled' | 'edited' | 'expired' | 'rejected';

export type AgentApprovalResolutionSource = 'system' | 'user';

export interface AgentHumanApprovalOption {
  id: string;
  label: string;
  description?: string;
  destructive?: boolean;
}

export interface AgentTaskPlanStep {
  detail?: string;
  id: string;
  status: AgentTaskPlanStepStatus;
  title: string;
}

export interface AgentRunSummaryMetric {
  detail?: string;
  label: string;
  value: string;
}

export interface AgentRunSummarySection {
  items: string[];
  title: string;
}

export interface AgentRunEventBase {
  id: string;
  run_id: string;
  sequence: number;
  created_at: IsoDateTimeString;
}

export type AgentRunEvent =
  | (AgentRunEventBase & {
      type: 'run_started';
      status: AgentRunStatus;
      document_id: string;
      model: string;
      attachments: AgentAttachment[];
    })
  | (AgentRunEventBase & {
      type: 'user_message';
      content: string;
    })
  | (AgentRunEventBase & {
      type: 'task_plan_started' | 'task_plan_updated';
      completed_count: number;
      current_step_id: string | null;
      steps: AgentTaskPlanStep[];
      title: string;
      total_count: number;
    })
  | (AgentRunEventBase & {
      type: 'run_summary_created';
      headline: string;
      metrics: AgentRunSummaryMetric[];
      sections: AgentRunSummarySection[];
    })
  | (AgentRunEventBase & {
      type: 'intent_detected';
      intent: IntentEnvelope;
    })
  | (AgentRunEventBase & {
      type: 'workflow_node_started';
      node_id: string;
      node_name: string;
      stage: AgentRuntimeStage;
      summary: string;
    })
  | (AgentRunEventBase & {
      type: 'workflow_node_finished';
      node_id: string;
      node_name: string;
      stage: AgentRuntimeStage;
      summary: string;
      duration_ms: number;
    })
  | (AgentRunEventBase & {
      type: 'workflow_node_failed';
      node_id: string;
      node_name: string;
      stage: AgentRuntimeStage;
      error: AgentError;
    })
  | (AgentRunEventBase & {
      type: 'run_checkpoint_created';
      checkpoint_id: string;
      event_count: number;
      label: string;
      reason: string;
    })
  | (AgentRunEventBase & {
      type: 'policy_gate_started';
      gate_id: string;
      action: string;
      risk_level: IntentRiskLevel;
      scope: string;
      summary: string;
    })
  | (AgentRunEventBase & {
      type: 'policy_gate_passed';
      gate_id: string;
      decision: 'allowed' | 'allowed_with_review';
      summary: string;
    })
  | (AgentRunEventBase & {
      type: 'policy_gate_blocked';
      gate_id: string;
      reason: string;
      error: AgentError;
    })
  | (AgentRunEventBase & {
      type: 'human_approval_requested';
      approval_id: string;
      title: string;
      description: string;
      required_by: AgentRuntimeStage;
      risk_level: IntentRiskLevel;
      options: AgentHumanApprovalOption[];
      expires_at?: IsoDateTimeString;
    })
  | (AgentRunEventBase & {
      type: 'human_approval_resolved';
      approval_id: string;
      decision: AgentApprovalDecision;
      resolved_by: AgentApprovalResolutionSource;
      summary: string;
    })
  | (AgentRunEventBase & {
      type: 'model_call_started';
      model: string;
      purpose: AgentRuntimeStage;
      max_tokens?: number;
      timeout_ms?: number;
    })
  | (AgentRunEventBase & {
      type: 'model_call_finished';
      model: string;
      purpose: AgentRuntimeStage;
      latency_ms: number;
      output_token_estimate?: number;
    })
  | (AgentRunEventBase & {
      type: 'model_call_retrying';
      model: string;
      purpose: AgentRuntimeStage;
      attempt: number;
      max_attempts: number;
      retry_after_ms: number;
      error: AgentError;
    })
  | (AgentRunEventBase & {
      type: 'model_call_timed_out';
      model: string;
      purpose: AgentRuntimeStage;
      timeout_ms: number;
      elapsed_ms: number;
      error: AgentError;
    })
  | (AgentRunEventBase & {
      type: 'model_thinking_delta';
      reasoning_content: string;
    })
  | (AgentRunEventBase & {
      type: 'model_thinking_done';
      reasoning_content: string;
      model: string;
    })
  | (AgentRunEventBase & {
      type: 'model_answer_delta';
      delta: string;
    })
  | (AgentRunEventBase & {
      type: 'system_process_summary';
      summary: string;
    })
  | (AgentRunEventBase & {
      type: 'memory_loaded';
      short_term_count: number;
      long_term_count: number;
    })
  | (AgentRunEventBase & {
      type: 'memory_writeback';
      candidate_count: number;
      promoted_count: number;
    })
  | (AgentRunEventBase & {
      type: 'tool_call_started';
      tool_name: string;
      summary: string;
      safe_args: JsonObject;
    })
  | (AgentRunEventBase & {
      type: 'tool_call_finished';
      tool_name: string;
      summary: string;
      token_estimate: number;
    })
  | (AgentRunEventBase & {
      type: 'tool_call_retrying';
      tool_name: string;
      summary: string;
      attempt: number;
      max_attempts: number;
      retry_after_ms: number;
      error: AgentError;
    })
  | (AgentRunEventBase & {
      type: 'tool_call_timed_out';
      tool_name: string;
      timeout_ms: number;
      elapsed_ms: number;
      attempt: number;
      error: AgentError;
    })
  | (AgentRunEventBase & {
      type: 'tool_call_failed';
      tool_name: string;
      summary: string;
      attempt: number;
      error: AgentError;
    })
  | (AgentRunEventBase & {
      type: 'rate_limit_backoff';
      provider: string;
      scope: AgentRuntimeStage;
      attempt: number;
      max_attempts: number;
      retry_after_ms: number;
      error: AgentError;
    })
  | (AgentRunEventBase & {
      type: 'document_glob_started';
      scope: 'current_document' | 'workspace_documents';
    })
  | (AgentRunEventBase & {
      type: 'document_glob_finished';
      result: DocumentGlobResult;
    })
  | (AgentRunEventBase & {
      type: 'document_grep_started';
      queries: string[];
      scope: 'current_document' | 'workspace_documents';
    })
  | (AgentRunEventBase & {
      type: 'document_grep_finished';
      result: DocumentGrepResult;
    })
  | (AgentRunEventBase & {
      type: 'document_read_started';
      target_count: number;
    })
  | (AgentRunEventBase & {
      type: 'document_read_finished';
      result: DocumentReadResult;
    })
  | (AgentRunEventBase & {
      type: 'context_budget_updated';
      budget: ContextBudgetResult;
    })
  | (AgentRunEventBase & {
      type: 'micro_compaction_started' | 'auto_compaction_started' | 'manual_compaction_started';
      summary: string;
    })
  | (AgentRunEventBase & {
      type: 'micro_compaction_finished' | 'auto_compaction_finished' | 'manual_compaction_finished';
      summary_id: string;
      token_estimate_before: number;
      token_estimate_after: number;
    })
  | (AgentRunEventBase & {
      type: 'context_restored';
      summary: string;
      restored_block_count: number;
      restored_token_estimate: number;
    })
  | (AgentRunEventBase & {
      type: 'context_blocked';
      token_estimate: number;
      blocking_threshold: number;
      message: string;
    })
  | (AgentRunEventBase & {
      type: 'vision_processing_started';
      attachment_count: number;
      model: string;
    })
  | (AgentRunEventBase & {
      type: 'vision_finished';
      understanding: ImageUnderstanding;
    })
  | (AgentRunEventBase & {
      type: 'edit_proposed';
      proposal: AgentEditProposal;
    })
  | (AgentRunEventBase & {
      type: 'applied_to_yjs';
      proposal_id: string;
      operation_id?: string;
      yjs_state_vector: string;
    })
  | (AgentRunEventBase & {
      type: 'agent_edit_conflict';
      conflict: AgentEditConflictEvent;
    })
  | (AgentRunEventBase & {
      type: 'track_changes_ready' | 'accepted' | 'rejected';
      track_changes: AgentTrackChangeSummary;
    })
  | (AgentRunEventBase & {
      type: 'stream_interrupted';
      source: 'model' | 'sse' | 'tool' | 'workflow';
      last_sequence: number;
      reason: string;
    })
  | (AgentRunEventBase & {
      type: 'stream_resumed';
      source: 'model' | 'sse' | 'tool' | 'workflow';
      resumed_from_sequence: number;
      replayed_count: number;
    })
  | (AgentRunEventBase & {
      type: 'run_paused';
      reason: string;
      resumable: boolean;
    })
  | (AgentRunEventBase & {
      type: 'run_resumed';
      reason: string;
    })
  | (AgentRunEventBase & {
      type: 'run_completed';
      status: 'completed';
      summary: string;
    })
  | (AgentRunEventBase & {
      type: 'cancelled';
      status: 'cancelled';
      reason: string;
    })
  | (AgentRunEventBase & {
      type: 'failed';
      status: 'failed';
      error: AgentError;
    });

export function isTerminalAgentRunStatus(status: AgentRunStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}
