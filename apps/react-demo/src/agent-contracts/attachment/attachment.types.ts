import type { IsoDateTimeString, JsonObject } from '../shared.types.js';

export type AgentSourceReferenceScope = 'pasted' | 'selection' | 'whole_document';

export interface AgentSourceReferenceMetadata {
  block_ids: string[];
  document_id: string;
  document_name: string;
  line_end: number;
  line_start: number;
  preview: string;
  reference_id: string;
  reference_kind: 'document';
  scope: AgentSourceReferenceScope;
  selected_text?: string;
  workspace_id: string;
}

export interface AgentAttachment {
  id: string;
  run_id?: string;
  file_url: string;
  file_name: string;
  metadata: JsonObject;
  model_image_url?: string;
  mime_type: string;
  size: number;
  media_type: 'image' | 'document' | 'audio' | 'video' | 'source' | 'unknown';
  created_at: IsoDateTimeString;
}

export interface ImageUnderstanding {
  id: string;
  run_id: string;
  attachment_id: string;
  model: string;
  enable_thinking: false;
  summary: string;
  extracted_text: string | null;
  objects: string[];
  layout: string | null;
  useful_for_editing: boolean;
  confidence: number;
  created_at: IsoDateTimeString;
}
