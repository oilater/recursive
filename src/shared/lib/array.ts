/**
 * 2D 배열을 평탄화 후 특정 값의 개수를 셉니다.
 */
export const countInMatrix = (matrix: number[][], value: number): number =>
  matrix.flat().filter((v) => v === value).length;
