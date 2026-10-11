import type {
  SearchableDocumentBlock,
  SearchableDocumentSource,
} from './searchable-document.types.js';

export interface DocumentGlobInput {
  document_id: string;
  node_types?: string[];
  section_id?: string;
  path_prefix?: string;
  head_limit: number;
}

export interface DocumentGlobSection {
  block_id: string;
  section_id: string | null;
  title: string;
  level: number | null;
  heading: string;
  heading_level: number | null;
  path: string;
  heading_path: string[];
  children_count: number;
  block_count: number;
}

export interface DocumentGlobResult {
  document_id: string;
  source: SearchableDocumentSource;
  source_block_count: number;
  returned_block_count: number;
  sections: DocumentGlobSection[];
  blocks: DocumentGlobBlock[];
}

export interface DocumentGlobBlock {
  block_id: string;
  section_id: string | null;
  path: string;
  node_type: string;
  order: number;
  depth: number;
  heading_path: string[];
  preview: string;
  checksum: string;
}

export interface DocumentGrepInput {
  document_id: string;
  patterns: string[];
  regex: boolean;
  case_sensitive: boolean;
  node_types?: string[];
  head_limit: number;
}

export interface DocumentGrepHit {
  document_id: string;
  block_id: string;
  section_id: string | null;
  path: string;
  node_type: string;
  heading_path: string[];
  pattern: string;
  line: number;
  match_start: number;
  match_end: number;
  preview: string;
  checksum: string;
}

export interface DocumentGrepResult {
  document_id: string;
  source: SearchableDocumentSource;
  hit_count: number;
  truncated: boolean;
  hits: DocumentGrepHit[];
}

export interface DocumentReadInput {
  document_id: string;
  block_ids?: string[];
  section_id?: string;
  selection_id?: string;
  before_blocks: number;
  after_blocks: number;
  head_limit: number;
  max_chars?: number;
  format?: 'plain' | 'markdown';
}

export interface DocumentReadResult {
  document_id: string;
  source: SearchableDocumentSource;
  blocks: SearchableDocumentBlock[];
  text: string;
  char_count: number;
  truncated: boolean;
}

export interface DocumentSearchPlan {
  queries: string[];
  scope: 'current_document' | 'workspace_documents';
}

export interface DocumentContextSelection {
  selected_block_ids: string[];
  reason: string;
}

export interface RecentReadBlock {
  document_id: string;
  block_id: string;
  reason: string;
}

export interface DocumentSearchState {
  search_queries: string[];
  scope: 'current_document' | 'workspace_documents';
  source: SearchableDocumentSource | null;
  base_snapshot_id: string | null;
  yjs_state_vector: string | null;
  glob_results: DocumentGlobResult[];
  grep_results: DocumentGrepResult[];
  read_results: DocumentReadResult[];
  selected_block_ids: string[];
  selection_reason: string | null;
  recent_read_blocks: RecentReadBlock[];
}
