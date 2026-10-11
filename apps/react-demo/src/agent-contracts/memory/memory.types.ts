import type { EditorIntent } from '../intent/intent.types.js';
import type { IsoDateTimeString } from '../shared.types.js';

export interface ShortTermMemory {
  runId: string;
  threadId: string;
  documentId: string;
  currentIntent?: EditorIntent;
  currentStep?: string;
  selectedText?: string;
  selectionRange?: unknown;
  documentSnapshotId?: string;
  outlineSnapshotId?: string;
  recentToolCalls: string[];
  recentReadBlocks: Array<{
    documentId: string;
    blockId: string;
    reason: string;
  }>;
  compactSummaryId?: string;
  agentEditId?: string;
  reviewStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  lastError?: string;
  updatedAt: IsoDateTimeString;
}

export interface LongTermMemory {
  id: string;
  workspaceId: string;
  userId: string;
  type:
    | 'writing_style'
    | 'format_rule'
    | 'project_rule'
    | 'term_rule'
    | 'template_preference'
    | 'compact_instruction';
  content: string;
  summary: string;
  source: 'user_explicit' | 'agent_observed' | 'document_pattern';
  confidence: number;
  enabled: boolean;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}
