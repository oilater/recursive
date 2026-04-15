function permutation(nums, r) {
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
}