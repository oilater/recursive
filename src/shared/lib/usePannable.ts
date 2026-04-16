import { useRef, useState } from "react";

interface PannableState {
  viewBox: string;
  isDragging: boolean;
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
  setViewBox: (vb: string) => void;
}

function parseViewBox(vb: string): [number, number, number, number] {
  const p = vb.split(" ").map(Number);
  return [p[0], p[1], p[2], p[3]];
}

export function usePannable(
  containerRef: React.RefObject<HTMLElement | null>,
  initialViewBox = "0 0 800 400",
): PannableState {
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; vb: [number, number, number, number] } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, vb: parseViewBox(viewBox) };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current || !containerRef.current) return;
    const el = containerRef.current;
    const [vbX, vbY, vbW, vbH] = dragStart.current.vb;
    const scaleX = vbW / el.clientWidth;
    const scaleY = vbH / el.clientHeight;
    const dx = (dragStart.current.x - e.clientX) * scaleX;
    const dy = (dragStart.current.y - e.clientY) * scaleY;
    setViewBox(`${vbX + dx} ${vbY + dy} ${vbW} ${vbH}`);
  };

  const onMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  return {
    viewBox,
    isDragging,
    handlers: { onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp },
    setViewBox,
  };
}
