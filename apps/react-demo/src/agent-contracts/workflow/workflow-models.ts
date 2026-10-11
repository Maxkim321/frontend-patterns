export const WORKFLOW_VISION_MODEL_IDS = [
  'moonshotai/Kimi-K2.7-Code',
  'Pro/moonshotai/Kimi-K2.6',
  'nex-agi/Nex-N2-Pro',
  'Qwen/Qwen3.6-35B-A3B',
  'Qwen/Qwen3-VL-32B-Instruct',
  'Qwen/Qwen3-VL-32B-Thinking',
  'Qwen/Qwen3-VL-8B-Instruct',
  'PaddlePaddle/PaddleOCR-VL-1.5',
] as const;

export const WORKFLOW_TEXT_AND_VISION_MODEL_IDS = [
  'moonshotai/Kimi-K2.7-Code',
  'Pro/moonshotai/Kimi-K2.6',
  'nex-agi/Nex-N2-Pro',
  'Qwen/Qwen3.6-35B-A3B',
] as const;

export type WorkflowVisionModel = (typeof WORKFLOW_VISION_MODEL_IDS)[number];

export const DEFAULT_WORKFLOW_VISION_MODEL: WorkflowVisionModel = 'Qwen/Qwen3-VL-32B-Instruct';

export function isWorkflowVisionModel(model: string): model is WorkflowVisionModel {
  return WORKFLOW_VISION_MODEL_IDS.some((visionModel) => visionModel === model);
}

export function isWorkflowTextAndVisionModel(model: string): boolean {
  return WORKFLOW_TEXT_AND_VISION_MODEL_IDS.some((multimodalModel) => multimodalModel === model);
}
