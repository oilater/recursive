"use client";

import { useEffect, useRef } from "react";

export function useScrollActiveIntoView<T extends HTMLElement>(key: string | null) {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [key]);
  return ref;
}
