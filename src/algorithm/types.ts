export type StepType = "call" | "return";

export type NodeStatus = "idle" | "active" | "completed" | "backtracked";

export interface Frame {
  funcName: string;
  variables: Record<string, unknown>;
}

export interface Step {
  id: number;
  type: StepType;
  codeLine: number;
  activeNodeId: string;
  activePath: string[];
  frames: Frame[];
  description: string;
}

export interface TreeNode {
  id: string;
  label: string;
  args: string;
  children: TreeNode[];
  status: NodeStatus;
}

export interface StepGeneratorResult {
  steps: Step[];
  tree: TreeNode;
}

export type Difficulty = "easy" | "medium" | "hard";

export type Category = "recursion" | "sorting" | "search" | "graph" | "dp";

export interface PresetAlgorithm {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  category: Category;
  code: string;
  defaultArgs: unknown[];
}

export interface AlgorithmCardData {
  id: string;
  name: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
}
