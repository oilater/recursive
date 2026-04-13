"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Step } from "@/entities/algorithm";

export type Speed = 0.5 | 1 | 2 | 4;

export interface AlgorithmPlayer {
  currentIndex: number;
  currentStep: Step | undefined;
  totalSteps: number;
  isPlaying: boolean;
  speed: Speed;
  isAtStart: boolean;
  isAtEnd: boolean;
  stepForward: () => void;
  stepBackward: () => void;
  jumpTo: (index: number) => void;
  jumpToStart: () => void;
  jumpToEnd: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: Speed) => void;
  reset: () => void;
}

export function useAlgorithmPlayer(steps: Step[]): AlgorithmPlayer {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const stepsRef = useRef(steps);

  useEffect(
    function syncStepsRef() {
      stepsRef.current = steps;
    },
    [steps]
  );

  const totalSteps = steps.length;
  const currentStep = steps[currentIndex];
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex >= totalSteps - 1;

  const stepForward = useCallback((): void => {
    setCurrentIndex((i) => Math.min(i + 1, stepsRef.current.length - 1));
  }, []);

  const stepBackward = useCallback((): void => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const jumpTo = useCallback(
    (index: number): void => {
      setCurrentIndex(Math.max(0, Math.min(index, totalSteps - 1)));
    },
    [totalSteps]
  );

  const jumpToStart = useCallback((): void => {
    setCurrentIndex(0);
  }, []);

  const jumpToEnd = useCallback((): void => {
    setCurrentIndex(Math.max(0, totalSteps - 1));
  }, [totalSteps]);

  const play = useCallback((): void => setIsPlaying(true), []);
  const pause = useCallback((): void => setIsPlaying(false), []);
  const togglePlay = useCallback((): void => setIsPlaying((p) => !p), []);

  const reset = useCallback((): void => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  useEffect(
    function autoPlayInterval() {
      if (!isPlaying || totalSteps === 0) return;

      const interval = setInterval(() => {
        setCurrentIndex((i) => {
          if (i >= stepsRef.current.length - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 800 / speed);

      return function cleanup() {
        clearInterval(interval);
      };
    },
    [isPlaying, speed, totalSteps]
  );

  useEffect(
    function resetOnStepsChange() {
      setCurrentIndex(0);
      setIsPlaying(false);
    },
    [totalSteps]
  );

  return useMemo(
    (): AlgorithmPlayer => ({
      currentIndex,
      currentStep,
      totalSteps,
      isPlaying,
      speed,
      isAtStart,
      isAtEnd,
      stepForward,
      stepBackward,
      jumpTo,
      jumpToStart,
      jumpToEnd,
      play,
      pause,
      togglePlay,
      setSpeed,
      reset,
    }),
    [currentIndex, currentStep, totalSteps, isPlaying, speed, isAtStart, isAtEnd]
  );
}
