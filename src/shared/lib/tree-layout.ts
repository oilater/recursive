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

const CHAR_WIDTH = 6.5;
const NODE_PAD = 24;
const MIN_NODE_WIDTH = 90;
const NODE_HEIGHT = 70;

function estimateMaxNodeWidth(root: TreeNode): number {
  let maxLen = 0;
  function walk(node: TreeNode) {
    const len = Math.max(node.label.length, node.args.length);
    if (len > maxLen) maxLen = len;
    node.children.forEach(walk);
  }
  walk(root);
  return Math.max(MIN_NODE_WIDTH, maxLen * CHAR_WIDTH + NODE_PAD);
}

export function computeTreeLayout(root: TreeNode): TreeLayoutResult {
  const rootHierarchy = hierarchy(root, (d) => d.children);
  const nodeWidth = estimateMaxNodeWidth(root) + 16;

  const treeLayout = tree<TreeNode>()
    .nodeSize([nodeWidth, NODE_HEIGHT])
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
