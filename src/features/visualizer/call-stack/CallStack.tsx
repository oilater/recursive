"use client";

import { useMemo } from "react";
import type { Step, TreeNode } from "@/entities/algorithm";
import { Badge } from "@/shared/ui";
import { EmptyState } from "@/shared/ui";
import * as styles from "./call-stack.css";

interface CallStackProps {
  currentStep: Step | undefined;
  tree: TreeNode;
}

interface StackFrame {
  nodeId: string;
  label: string;
  args: string;
  depth: number;
}

function buildNodeMap(tree: TreeNode): Map<string, TreeNode> {
  const map = new Map<string, TreeNode>();
  function walk(node: TreeNode) {
    map.set(node.id, node);
    node.children.forEach(walk);
  }
  walk(tree);
  return map;
}

export function CallStack({ currentStep, tree }: CallStackProps) {
  const nodeMap = useMemo(() => buildNodeMap(tree), [tree]);

  const frames: StackFrame[] = useMemo(() => {
    if (!currentStep?.activePath) return [];
    return currentStep.activePath.map((nodeId, i) => {
      const node = nodeMap.get(nodeId);
      return { nodeId, label: node?.label ?? "?", args: node?.args ?? "", depth: i };
    });
  }, [currentStep, nodeMap]);

  if (!currentStep) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>콜스택</div>
        <EmptyState message="스텝을 실행하면 콜스택이 표시됩니다" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        콜스택
        <span className={styles.depthBadge}>depth: {frames.length - 1}</span>
        <Badge variant={currentStep.type === "return" ? "return" : "call"}>
          {currentStep.type === "return" ? "RETURN" : "CALL"}
        </Badge>
      </div>
      {frames.map((frame, i) => {
        const isTop = i === frames.length - 1;
        return (
          <div key={frame.nodeId} className={isTop ? styles.frameActive : styles.frame}>
            {Array.from({ length: frame.depth }).map((_, j) => (
              <span key={j} className={styles.frameIndent} />
            ))}
            <span className={styles.frameArrow}>{isTop ? ">" : "|"}</span>
            <span>
              {frame.label}({frame.args})
            </span>
          </div>
        );
      })}
    </div>
  );
}
