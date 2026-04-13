export type StepType = "call" | "return";

export type NodeStatus = "idle" | "active" | "completed" | "backtracked";

export interface Step {
  id: number;
  type: StepType;
  codeLine: number;
  activeNodeId: string;
  activePath: string[];
  variables: Record<string, unknown>;
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

export interface InputConfig {
  type: "array" | "nk" | "single";
  label: string;
  defaults: Record<string, unknown>;
  constraints: Record<string, unknown>;
}

export type StepGenerator = (input: Record<string, unknown>) => StepGeneratorResult;

/**
 * 직렬화 가능한 알고리즘 메타데이터 (Server Component에서 사용 가능).
 * stepGenerator는 포함하지 않음.
 */
export interface AlgorithmMeta {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  code: string;
  inputConfig: InputConfig;
  isPremium: boolean;
}

/** 홈 카드 표시용 최소 데이터 */
export interface AlgorithmCardData {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  isPremium: boolean;
}
