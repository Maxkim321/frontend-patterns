import type { IsoDateTimeString, JsonObject } from '../shared.types.js';

export type SearchableDocumentSource =
  | 'live_yjs'
  | 'persisted_yjs'
  | 'db_snapshot'
  | 'document_blocks';

export interface SearchableDocument {
  document_id: string;
  workspace_id: string;
  title: string;
  source: SearchableDocumentSource;
  snapshot_id: string | null;
  yjs_state_vector: string | null;
  blocks: SearchableDocumentBlock[];
  updated_at: IsoDateTimeString;
}

export interface SearchableDocumentBlock {
  document_id: string;
  block_id: string;
  section_id: string | null;
  parent_block_id: string | null;
  path: string;
  node_type: string;
  order: number;
  depth: number;
  heading_level: number | null;
  heading_path: string[];
  text: string;
  preview: string;
  checksum: string;
  json: JsonObject;
  attrs?: JsonObject;
}
