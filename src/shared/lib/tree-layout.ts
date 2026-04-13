import { hierarchy, tree } from "d3-hierarchy";
import type { TreeNode } from "@/entities/algorithm";

export interface PositionedNode {
  x: number;
  y: number;
  data: TreeNode;
  depth: number;
  children?: PositionedNode[];
  parent?: PositionedNode;
}

export interface TreeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface TreeEdge {
  source: PositionedNode;
  target: PositionedNode;
}

export interface TreeLayoutResult {
  root: PositionedNode;
  allNodes: PositionedNode[];
  allEdges: TreeEdge[];
  bounds: TreeBounds;
}

const NODE_WIDTH = 110;
const NODE_HEIGHT = 70;

export function computeTreeLayout(root: TreeNode): TreeLayoutResult {
  const rootHierarchy = hierarchy(root, (d) => d.children);

  const treeLayout = tree<TreeNode>()
    .nodeSize([NODE_WIDTH, NODE_HEIGHT])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

  treeLayout(rootHierarchy);

  const positioned = rootHierarchy as unknown as PositionedNode;

  const allNodes: PositionedNode[] = [];
  const allEdges: { source: PositionedNode; target: PositionedNode }[] = [];

  function walk(node: PositionedNode) {
    allNodes.push(node);
    if (node.children) {
      for (const child of node.children) {
        allEdges.push({ source: node, target: child });
        walk(child);
      }
    }
  }
  walk(positioned);

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const node of allNodes) {
    if (node.x < minX) minX = node.x;
    if (node.x > maxX) maxX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.y > maxY) maxY = node.y;
  }

  const padding = 60;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  return {
    root: positioned,
    allNodes,
    allEdges,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}
