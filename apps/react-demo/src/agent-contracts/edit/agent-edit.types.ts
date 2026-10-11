import type { IntentRiskLevel } from '../intent/intent.types.js';
import type { IsoDateTimeString, JsonObject } from '../shared.types.js';

export const agentEditOperationTypeValues = [
  'insert_after_block',
  'insert_before_block',
  'replace_block',
  'replace_blocks',
  'replace_selection',
  'delete_block',
  'format_block',
  'format_blocks',
  'add_comment',
] as const;

export type AgentEditOperationType = (typeof agentEditOperationTypeValues)[number];

export const agentCommentSeverityValues = ['info', 'warning', 'risk'] as const;

export type AgentCommentSeverity = (typeof agentCommentSeverityValues)[number];

export interface AgentEditTarget {
  document_id: string;
  block_id?: string;
  block_ids?: string[];
  section_id?: string;
  selection_id?: string;
}

export interface AgentEditOperation {
  id: string;
  type: AgentEditOperationType;
  target: AgentEditTarget;
  markdown: string | null;
  rationale: string;
  expected_text_before?: string;
  expected_text_after?: string;
  expected_checksum?: string;
  comment?: string;
  severity?: AgentCommentSeverity;
  format?: JsonObject;
  attrs?: JsonObject;
}

export interface TrackChangeActor {
  type: 'user' | 'agent';
  id: string;
  name: string;
  runId?: string;
}

export interface AgentEditProposal {
  id: string;
  run_id: string;
  document_id: string;
  base_snapshot_id: string | null;
  yjs_state_vector: string | null;
  intent: string;
  actor: TrackChangeActor;
  reason: string;
  risk_level: IntentRiskLevel;
  status: 'draft' | 'validated' | 'conflicted' | 'applied' | 'rejected' | 'failed';
  operations: AgentEditOperation[];
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export type TrackChangeSource = 'manual' | 'agent';

export type TrackChangeStatus = 'pending' | 'accepted' | 'rejected';

export interface AgentTrackChangeSummary {
  run_id: string;
  proposal_id: string;
  source: TrackChangeSource;
  status: TrackChangeStatus;
  pending_count: number;
  accepted_count: number;
  rejected_count: number;
}
