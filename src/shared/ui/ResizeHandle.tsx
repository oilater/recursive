"use client";

import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
}

export function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const handleMouseDown = useCallback(
    function startResize(e: React.MouseEvent) {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;

      function handleMouseMove(ev: MouseEvent) {
        if (!dragging.current) return;
        const currentPos = direction === "horizontal" ? ev.clientX : ev.clientY;
        const delta = currentPos - lastPos.current;
        lastPos.current = currentPos;
        onResize(delta);
      }

      function handleMouseUp() {
        dragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [direction, onResize]
  );

  const isHorizontal = direction === "horizontal";

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: isHorizontal ? "6px" : "100%",
        height: isHorizontal ? "100%" : "6px",
        cursor: isHorizontal ? "col-resize" : "row-resize",
        background: "transparent",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: isHorizontal ? "2px" : "50%",
          top: isHorizontal ? "50%" : "2px",
          transform: isHorizontal ? "translateY(-50%)" : "translateX(-50%)",
          width: isHorizontal ? "2px" : "40px",
          height: isHorizontal ? "40px" : "2px",
          borderRadius: "2px",
          backgroundColor: "var(--color-border)",
          transition: "background-color 0.15s",
        }}
      />
    </div>
  );
}
