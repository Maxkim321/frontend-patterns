import type { IsoDateTimeString, JsonObject } from '../shared.types.js';

export const editorIntentValues = [
  'chat',
  'ask_document',
  'review_only',
  'rewrite_selection',
  'rewrite_document',
  'continue_writing',
  'insert_content',
  'format_document',
  'manual_compact',
] as const;

export type EditorIntent = (typeof editorIntentValues)[number];

export const writeModeValues = ['none', 'proposal_only', 'agent_edit_to_yjs'] as const;

export type WriteMode = (typeof writeModeValues)[number];

export const editScopeValues = [
  'none',
  'selection',
  'current_block',
  'current_section',
  'whole_document',
  'new_block',
] as const;

export type EditScope = (typeof editScopeValues)[number];

export const intentRiskLevelValues = ['low', 'medium', 'high'] as const;

export type IntentRiskLevel = (typeof intentRiskLevelValues)[number];

export const agentAnswerModeValues = [
  'direct_answer',
  'document_qa',
  'edit_proposal',
  'long_form_draft',
] as const;

export type AgentAnswerMode = (typeof agentAnswerModeValues)[number];

export interface IntentEnvelope {
  intent: EditorIntent;
  confidence: number;
  write_mode: WriteMode;
  edit_scope: EditScope;
  answer_mode: AgentAnswerMode;
  needs_long_answer: boolean;
  needs_document_context: boolean;
  needs_selection_context: boolean;
  needs_vision_context: boolean;
  needs_document_search: boolean;
  needs_context_compaction: boolean;
  search_queries: string[];
  risk_level: IntentRiskLevel;
  missing_slots: string[];
  user_goal: string;
  execution_hint: string;
  created_at: IsoDateTimeString;
  attributes?: JsonObject;
}

export function isWriteIntent(intent: EditorIntent): boolean {
  return (
    intent === 'rewrite_selection' ||
    intent === 'rewrite_document' ||
    intent === 'continue_writing' ||
    intent === 'insert_content' ||
    intent === 'format_document'
  );
}

export function writesToYjs(writeMode: WriteMode): boolean {
  return writeMode === 'agent_edit_to_yjs';
}
