export function itemAt(maybeArr: unknown, i: number): unknown {
  return Array.isArray(maybeArr) ? maybeArr[i] : undefined;
}
