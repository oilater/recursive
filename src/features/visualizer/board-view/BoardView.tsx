"use client";

import type { Step } from "@/entities/algorithm";
import * as styles from "./board-view.css";

interface BoardViewProps {
  currentStep: Step | undefined;
  n: number;
}

export function BoardView({ currentStep, n }: BoardViewProps) {
  const board =
    (currentStep?.variables?.board as number[][] | undefined) ?? Array.from({ length: n }, () => Array(n).fill(0));

  const currentRow = currentStep?.variables?.row as number | undefined;
  const currentCol = currentStep?.variables?.col as number | undefined;
  const safe = currentStep?.variables?.safe as boolean | undefined;

  // Determine attacked cells
  const attacked = new Set<string>();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === 1) {
        // Mark row, column, diagonals
        for (let i = 0; i < n; i++) {
          attacked.add(`${r}-${i}`);
          attacked.add(`${i}-${c}`);
          if (r + i < n && c + i < n) attacked.add(`${r + i}-${c + i}`);
          if (r + i < n && c - i >= 0) attacked.add(`${r + i}-${c - i}`);
          if (r - i >= 0 && c + i < n) attacked.add(`${r - i}-${c + i}`);
          if (r - i >= 0 && c - i >= 0) attacked.add(`${r - i}-${c - i}`);
        }
      }
    }
  }

  function getCellStyle(row: number, col: number) {
    const isQueen = board[row][col] === 1;
    const isCurrent = row === currentRow && col === currentCol;
    const isLight = (row + col) % 2 === 0;
    const isAttacked = attacked.has(`${row}-${col}`) && !isQueen;

    let bg: string;
    if (isCurrent) {
      bg = safe === false ? "#ef444480" : "#fbbf2480";
    } else if (isQueen) {
      bg = "#22c55e40";
    } else if (isAttacked) {
      bg = isLight ? "#ef444415" : "#ef444420";
    } else {
      bg = isLight ? "#1e293b" : "#0f172a";
    }

    return { backgroundColor: bg };
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        {n} x {n} 체스보드
      </div>
      <div className={styles.board} style={{ gridTemplateColumns: `repeat(${n}, 36px)` }}>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className={styles.cell} style={getCellStyle(r, c)}>
              {cell === 1 ? "♛" : ""}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
