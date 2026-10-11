import type { CSSProperties } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath } from '@xyflow/react';

import { cn } from '@/lib/utils';

import styles from './workflow-flow-edge.module.css';

const EDGE_COLOR = 'color-mix(in oklab, var(--color-foreground) 42%, transparent)';
const EDGE_TRACK_COLOR = 'color-mix(in oklab, var(--color-foreground) 9%, transparent)';

export default function WorkflowFlowEdge({
  id,
  interactionWidth,
  label,
  markerEnd,
  markerStart,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
    curvature: 0.24,
  });
  const flowStyle: CSSProperties = {
    ...style,
    stroke: selected ? 'var(--color-primary)' : EDGE_COLOR,
    strokeDasharray: '6 6',
    strokeWidth: selected ? 1.8 : 1.35,
  };

  return (
    <>
      <path
        aria-hidden
        className={styles.track}
        d={edgePath}
        style={{
          stroke: selected
            ? 'color-mix(in oklab, var(--color-primary) 18%, transparent)'
            : EDGE_TRACK_COLOR,
          strokeWidth: selected ? 4 : 2.8,
        }}
      />
      <BaseEdge
        id={id}
        className={cn(styles.flow, selected && styles.selected)}
        interactionWidth={interactionWidth ?? 24}
        markerEnd={markerEnd}
        markerStart={markerStart}
        path={edgePath}
        style={flowStyle}
      />
      {label !== undefined && label !== null ? (
        <EdgeLabelRenderer>
          <div
            className={cn(styles.label, selected && styles.selectedLabel)}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
