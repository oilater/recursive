"use client";

import { useMemo, useRef, useEffect } from "react";
import type { TreeNode, Step } from "@/algorithm";
import { computeTreeLayout, type PositionedNode } from "@/shared/lib/tree-layout";
import { usePannable } from "@/shared/lib/usePannable";
import * as styles from "./tree-view.css";

const NODE_MIN_W = 80;
const NODE_H = 36;
const NODE_RX = 8;
const CHAR_WIDTH = 6.5;
const NODE_PAD = 20;

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  idle: { bg: "#1e293b", text: "#94a3b8", border: "#475569" },
  active: { bg: "#1e293b", text: "#fbbf24", border: "#fbbf24" },
  completed: { bg: "#1e293b", text: "#22c55e", border: "#22c55e" },
  backtracked: { bg: "#1e293b", text: "#ef4444", border: "#ef4444" },
};

interface TreeViewProps {
  tree: TreeNode;
  currentStep: Step | undefined;
}

export function TreeView({ tree, currentStep }: TreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewBox, isDragging, handlers, setViewBox } = usePannable(containerRef);

  const layout = useMemo(() => computeTreeLayout(tree), [tree]);
  const activePathSet = useMemo(() => new Set(currentStep?.activePath ?? []), [currentStep]);
  const activeNodeId = currentStep?.activeNodeId;
  const nodeById = useMemo(() => new Map(layout.allNodes.map((n) => [n.data.id, n])), [layout]);

  useEffect(
    function updateViewBox() {
      if (isDragging) return;
      if (activeNodeId && containerRef.current) {
        const activeNode = nodeById.get(activeNodeId);
        if (activeNode) {
          const el = containerRef.current;
          const viewWidth = Math.max(400, Math.min(layout.bounds.width, el.clientWidth));
          const viewHeight = Math.max(300, Math.min(layout.bounds.height, el.clientHeight));
          setViewBox(
            `${activeNode.x - viewWidth / 2} ${activeNode.y - viewHeight / 2} ${viewWidth} ${viewHeight}`,
          );
          return;
        }
      }
      const { bounds } = layout;
      setViewBox(`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
    },
    [activeNodeId, layout, nodeById],
  );

  const getNodeStatus = (node: PositionedNode): string => {
    if (node.data.id === activeNodeId) return "active";
    if (activePathSet.has(node.data.id)) return "active";
    return node.data.status;
  };

  const isEdgeActive = (source: PositionedNode, target: PositionedNode): boolean =>
    activePathSet.has(source.data.id) && activePathSet.has(target.data.id);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      {...handlers}
    >
      <svg className={styles.svgStyle} viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {layout.allEdges.map((edge, i) => {
          const active = isEdgeActive(edge.source, edge.target);
          const sx = edge.source.x;
          const sy = edge.source.y;
          const tx = edge.target.x;
          const ty = edge.target.y;
          const midY = (sy + ty) / 2;

          return (
            <path
              key={i}
              className={styles.edgeLine}
              d={`M ${sx},${sy} C ${sx},${midY} ${tx},${midY} ${tx},${ty}`}
              stroke={active ? "#fbbf24" : "#334155"}
              strokeWidth={active ? 2.5 : 1.5}
              opacity={active ? 1 : 0.3}
            />
          );
        })}

        {layout.allNodes.map((node) => {
          const status = getNodeStatus(node);
          const isActive = status === "active";
          const colors = STATUS_COLORS[status] || STATUS_COLORS.idle;
          const inPath = activePathSet.has(node.data.id);
          const textLen = Math.max(node.data.label.length, node.data.args.length);
          const baseW = Math.max(NODE_MIN_W, textLen * CHAR_WIDTH + NODE_PAD);
          const w = isActive ? baseW + 6 : baseW;
          const h = isActive ? NODE_H + 4 : NODE_H;

          return (
            <g
              key={node.data.id}
              className={styles.nodeGroup}
              transform={`translate(${node.x}, ${node.y})`}
              opacity={isActive || inPath ? 1 : 0.25}
            >
              <rect
                className={styles.nodeCircle}
                x={-w / 2}
                y={-h / 2}
                width={w}
                height={h}
                rx={NODE_RX}
                ry={NODE_RX}
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <text
                className={styles.nodeText}
                dy="-0.3em"
                fontSize="9px"
                fill={colors.text}
                fontWeight={isActive ? 700 : 500}
              >
                {node.data.label}
              </text>
              <text className={styles.nodeText} dy="1em" fontSize="8px" fill="#94a3b8">
                {node.data.args}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
