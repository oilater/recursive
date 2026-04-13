import { registerAlgorithm } from "@/entities/algorithm";
import type { PresetAlgorithm } from "@/entities/algorithm";

const presets: PresetAlgorithm[] = [
  {
    id: "permutations",
    name: "순열 (Permutations)",
    description: "n개 중 r개를 순서 있게 선택합니다",
    difficulty: "easy",
    defaultArgs: [[1, 2, 3], 2],
    code: `function permutation(nums, r) {
  const result = [];
  const used = Array(nums.length).fill(false);
  function dfs(current) {
    if (current.length === r) {
      result.push([...current]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(nums[i]);
      dfs(current);
      current.pop();
      used[i] = false;
    }
  }
  dfs([]);
  return result;
}`,
  },
  {
    id: "combinations",
    name: "조합 (Combinations)",
    description: "n개 중 r개를 순서 없이 선택합니다",
    difficulty: "easy",
    defaultArgs: [4, 2],
    code: `function combination(n, r) {
  const result = [];
  function dfs(start, current) {
    if (current.length === r) {
      result.push([...current]);
      return;
    }
    for (let i = start; i <= n; i++) {
      current.push(i);
      dfs(i + 1, current);
      current.pop();
    }
  }
  dfs(1, []);
  return result;
}`,
  },
  {
    id: "subsets",
    name: "부분집합 (Subsets)",
    description: "주어진 배열의 모든 부분집합을 구합니다",
    difficulty: "easy",
    defaultArgs: [[1, 2, 3]],
    code: `function subsets(nums) {
  const result = [];
  function dfs(index, current) {
    result.push([...current]);
    for (let i = index; i < nums.length; i++) {
      current.push(nums[i]);
      dfs(i + 1, current);
      current.pop();
    }
  }
  dfs(0, []);
  return result;
}`,
  },
];

export function initializeAlgorithms(): void {
  for (const preset of presets) {
    registerAlgorithm(preset);
  }
}
