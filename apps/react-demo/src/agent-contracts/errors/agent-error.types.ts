import type { IsoDateTimeString, JsonObject } from '../shared.types.js';

export const agentErrorTypeValues = [
  'invalid_intent',
  'document_not_found',
  'document_search_failed',
  'context_blocked',
  'model_failed',
  'model_timed_out',
  'vision_failed',
  'tool_failed',
  'tool_timed_out',
  'rate_limited',
  'policy_blocked',
  'approval_rejected',
  'approval_expired',
  'stream_interrupted',
  'workflow_failed',
  'workflow_timed_out',
  'edit_validation_failed',
  'edit_conflict',
  'yjs_apply_failed',
  'track_change_review_failed',
] as const;

export type AgentErrorType = (typeof agentErrorTypeValues)[number];

export interface AgentError {
  type: AgentErrorType;
  message: string;
  retryable: boolean;
  created_at: IsoDateTimeString;
  code?: string;
  details?: JsonObject;
  provider?: string;
  status_code?: number;
}

export interface AgentEditConflictEvent {
  run_id: string;
  proposal_id: string;
  document_id: string;
  conflict_type:
    | 'base_snapshot_changed'
    | 'yjs_state_vector_changed'
    | 'block_missing'
    | 'section_missing'
    | 'selection_missing'
    | 'target_text_changed'
    | 'stale_db_snapshot'
    | 'unknown';
  message: string;
  created_at: IsoDateTimeString;
}
