function subsets(nums) {
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
}