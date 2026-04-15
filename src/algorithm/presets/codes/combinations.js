function combination(n, r) {
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
}