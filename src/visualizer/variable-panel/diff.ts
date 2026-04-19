export function didChange(prev: unknown, curr: unknown): boolean {
  if (prev === curr) return false;
  if (typeof prev !== typeof curr) return true;
  if (typeof prev !== "object" || prev === null) return prev !== curr;
  return JSON.stringify(prev) !== JSON.stringify(curr);
}
