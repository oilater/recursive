/**
 * 2D 배열(보드)을 깊은 복사합니다.
 */
export const cloneBoard = (board: number[][]): number[][] => board.map((row) => [...row]);

/**
 * N x N 빈 보드를 생성합니다.
 */
export const createBoard = (n: number): number[][] => Array.from({ length: n }, () => Array(n).fill(0));
