import type {
  DocumentGlobSection,
  DocumentSearchState,
} from '../document-search/document-search.types.js';
import type { EditorIntent } from '../intent/intent.types.js';
import type { LongTermMemory } from '../memory/memory.types.js';
import type { IsoDateTimeString, JsonObject } from '../shared.types.js';

export const questionAnswerTaskTypeValues = [
  'document_qa',
  'summary',
  'follow_up',
  'explanation',
  'comparison',
  'source_lookup',
  'project_knowledge',
] as const;

export type QuestionAnswerTaskType = (typeof questionAnswerTaskTypeValues)[number];

export const questionAnswerContextLayerValues = [
  'system',
  'task',
  'document',
  'retrieved',
  'conversation',
  'memory',
  'runtime',
  'safety',
] as const;

export type QuestionAnswerContextLayer = (typeof questionAnswerContextLayerValues)[number];

export const questionAnswerContextItemKindValues = [
  'system_rule',
  'user_question',
  'task_attribute',
  'document_summary',
  'document_outline',
  'document_metadata',
  'document_business_context',
  'document_section_summary',
  'document_supplement',
  'retrieved_chunk',
  'retrieved_source',
  'conversation_summary',
  'conversation_turn',
  'conversation_relation',
  'memory_preference',
  'memory_term',
  'memory_rule',
  'runtime_config',
  'safety_rule',
] as const;

export type QuestionAnswerContextItemKind = (typeof questionAnswerContextItemKindValues)[number];

export type QuestionAnswerAnswerLanguage = 'auto' | 'zh' | 'en';

export type QuestionAnswerAnswerStyle = 'concise' | 'detailed' | 'formal' | 'practical';

export interface QuestionAnswerContextBudgetInput {
  max_tokens: number;
  reserved_output_tokens?: number;
}

export interface QuestionAnswerTaskInput {
  intent?: EditorIntent;
  task_type?: QuestionAnswerTaskType;
  question_intent?: string;
  answer_language?: QuestionAnswerAnswerLanguage;
  answer_style?: QuestionAnswerAnswerStyle;
  detail_level?: 'brief' | 'normal' | 'deep';
  cite_sources?: boolean;
}

export interface QuestionAnswerDocumentOutlineEntry {
  block_id?: string;
  section_id?: string | null;
  title: string;
  level?: number | null;
  heading_path?: string[];
  path?: string;
  block_count?: number;
}

export interface QuestionAnswerDocumentSectionSummaryInput {
  id: string;
  title: string;
  summary: string;
  section_id?: string | null;
  heading_path?: string[];
  source?: QuestionAnswerSourceReference;
}

export interface QuestionAnswerSupplementalContextInput {
  id: string;
  title?: string;
  content: string;
  priority?: number;
  source?: QuestionAnswerSourceReference;
}

export interface QuestionAnswerDocumentInput {
  document_id?: string;
  workspace_id?: string;
  title?: string;
  summary?: string;
  outline?: QuestionAnswerDocumentOutlineEntry[];
  glob_sections?: DocumentGlobSection[];
  metadata?: JsonObject;
  business_context?: string;
  section_summaries?: QuestionAnswerDocumentSectionSummaryInput[];
  supplemental_context?: QuestionAnswerSupplementalContextInput[];
}

export interface QuestionAnswerSourceReference {
  document_id?: string;
  document_title?: string;
  block_id?: string;
  section_id?: string | null;
  path?: string;
  heading_path?: string[];
  checksum?: string;
  reference_id?: string;
  score?: number;
}

export interface QuestionAnswerRetrievedContextInput {
  id: string;
  text: string;
  title?: string;
  source?: QuestionAnswerSourceReference;
  score?: number;
  priority?: number;
}

export interface QuestionAnswerConversationTurnInput {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: IsoDateTimeString;
}

export interface QuestionAnswerConversationInput {
  summary?: string;
  recent_turns?: QuestionAnswerConversationTurnInput[];
  previous_question_relation?: string;
}

export interface QuestionAnswerMemoryPreferenceInput {
  answer_language?: QuestionAnswerAnswerLanguage;
  answer_style?: QuestionAnswerAnswerStyle;
  detail_level?: 'brief' | 'normal' | 'deep';
  cite_sources?: boolean;
}

export interface QuestionAnswerMemoryInput {
  preferences?: QuestionAnswerMemoryPreferenceInput;
  project_terms?: string[];
  disabled_expressions?: string[];
  business_rules?: string[];
  long_term_memories?: LongTermMemory[];
}

export interface QuestionAnswerRuntimeInput {
  caller: 'frontend' | 'backend' | 'agent_graph' | 'eval' | 'unknown';
  mode: 'answer' | 'preview' | 'debug';
  budget: QuestionAnswerContextBudgetInput;
  cite_sources: boolean;
  strict_context: boolean;
  allow_fallback: boolean;
  max_context_items?: number;
}

export interface QuestionAnswerSafetyInput {
  rules?: string[];
  blocked_actions?: string[];
}

export interface QuestionAnswerContextInput {
  user_question: string;
  task?: QuestionAnswerTaskInput;
  document?: QuestionAnswerDocumentInput;
  retrieved_context?: QuestionAnswerRetrievedContextInput[];
  document_search_state?: DocumentSearchState;
  conversation?: QuestionAnswerConversationInput;
  memory?: QuestionAnswerMemoryInput;
  runtime?: QuestionAnswerRuntimeInput;
  safety?: QuestionAnswerSafetyInput;
}

export interface QuestionAnswerSystemContext {
  agent_role: 'question_answer_agent';
  rules: string[];
}

export interface QuestionAnswerTaskContext {
  user_question: string;
  intent: EditorIntent | null;
  task_type: QuestionAnswerTaskType;
  question_intent: string | null;
  answer_language: QuestionAnswerAnswerLanguage;
  answer_style: QuestionAnswerAnswerStyle;
  detail_level: 'brief' | 'normal' | 'deep';
  cite_sources: boolean;
}

export interface QuestionAnswerDocumentContext {
  document_id: string | null;
  workspace_id: string | null;
  title: string | null;
  summary: string | null;
  outline: QuestionAnswerDocumentOutlineEntry[];
  metadata: JsonObject | null;
  business_context: string | null;
  section_summaries: QuestionAnswerDocumentSectionSummaryInput[];
  supplemental_context: QuestionAnswerSupplementalContextInput[];
}

export interface QuestionAnswerRetrievedContext {
  items: QuestionAnswerRetrievedContextInput[];
}

export interface QuestionAnswerConversationContext {
  summary: string | null;
  recent_turns: QuestionAnswerConversationTurnInput[];
  previous_question_relation: string | null;
}

export interface QuestionAnswerMemoryContext {
  preferences: QuestionAnswerMemoryPreferenceInput | null;
  project_terms: string[];
  disabled_expressions: string[];
  business_rules: string[];
  long_term_memories: LongTermMemory[];
}

export interface QuestionAnswerRuntimeContext {
  caller: QuestionAnswerRuntimeInput['caller'];
  mode: QuestionAnswerRuntimeInput['mode'];
  budget: QuestionAnswerContextBudgetInput;
  cite_sources: boolean;
  strict_context: boolean;
  allow_fallback: boolean;
  max_context_items: number | null;
}

export interface QuestionAnswerSafetyContext {
  rules: string[];
  blocked_actions: string[];
}

export interface QuestionAnswerContextItem {
  id: string;
  layer: QuestionAnswerContextLayer;
  kind: QuestionAnswerContextItemKind;
  title: string;
  content: string;
  priority: number;
  token_estimate: number;
  required: boolean;
  source?: QuestionAnswerSourceReference;
  tags?: string[];
}

export type QuestionAnswerDiagnosticAction =
  | 'retained'
  | 'trimmed'
  | 'dropped'
  | 'deduplicated'
  | 'summary_needed';

export interface QuestionAnswerContextDiagnosticEntry {
  item_id: string;
  layer: QuestionAnswerContextLayer;
  action: QuestionAnswerDiagnosticAction;
  reason: string;
  token_estimate_before: number;
  token_estimate_after: number;
}

export interface QuestionAnswerContextDiagnostics {
  task_type: QuestionAnswerTaskType;
  budget_tokens: number;
  reserved_output_tokens: number;
  available_context_tokens: number;
  token_estimate_before: number;
  token_estimate_after: number;
  retained_count: number;
  trimmed_count: number;
  dropped_count: number;
  deduplicated_count: number;
  needs_external_summary: boolean;
  entries: QuestionAnswerContextDiagnosticEntry[];
  warnings: string[];
}

export interface QuestionAnswerPromptContext {
  system_prompt: string;
  user_prompt: string;
  context_text: string;
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
}

export interface QuestionAnswerContext {
  system: QuestionAnswerSystemContext;
  task: QuestionAnswerTaskContext;
  document: QuestionAnswerDocumentContext;
  retrieved: QuestionAnswerRetrievedContext;
  conversation: QuestionAnswerConversationContext;
  memory: QuestionAnswerMemoryContext;
  runtime: QuestionAnswerRuntimeContext;
  safety: QuestionAnswerSafetyContext;
  items: QuestionAnswerContextItem[];
  prompt_context: QuestionAnswerPromptContext;
  diagnostics: QuestionAnswerContextDiagnostics;
}
