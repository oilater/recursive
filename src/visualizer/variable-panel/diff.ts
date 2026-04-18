export function didChange(prev: unknown, curr: unknown): boolean {
  if (prev === curr) return false;
  if (typeof prev !== typeof curr) return true;
  if (typeof prev !== "object" || prev === null) return prev !== curr;
  return JSON.stringify(prev) !== JSON.stringify(curr);
}

export function cellChanged(prevArr: unknown, currArr: unknown[], index: number): boolean {
  if (!Array.isArray(prevArr)) return true;
  if (index >= prevArr.length) return true;
  return JSON.stringify(prevArr[index]) !== JSON.stringify(currArr[index]);
}

export function cell2dChanged(
  prevArr: unknown,
  row: number,
  col: number,
  value: unknown,
): boolean {
  if (!Array.isArray(prevArr)) return true;
  if (row >= prevArr.length) return true;
  const prevRow = prevArr[row];
  if (!Array.isArray(prevRow)) return true;
  if (col >= prevRow.length) return true;
  return JSON.stringify(prevRow[col]) !== JSON.stringify(value);
}
