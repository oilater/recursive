"use client";

import { useReducer, useEffect, useRef } from "react";
import type { Step } from "@/algorithm";

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

interface State {
  currentIndex: number;
  isPlaying: boolean;
  speed: Speed;
}

type Action =
  | { type: "STEP_FORWARD"; max: number }
  | { type: "STEP_BACKWARD" }
  | { type: "JUMP_TO"; index: number; max: number }
  | { type: "JUMP_TO_START" }
  | { type: "JUMP_TO_END"; max: number }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_SPEED"; speed: Speed }
  | { type: "RESET" }
  | { type: "AUTO_STEP"; max: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "STEP_FORWARD":
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, action.max) };
    case "STEP_BACKWARD":
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case "JUMP_TO":
      return { ...state, currentIndex: Math.max(0, Math.min(action.index, action.max)) };
    case "JUMP_TO_START":
      return { ...state, currentIndex: 0 };
    case "JUMP_TO_END":
      return { ...state, currentIndex: action.max };
    case "PLAY":
      return { ...state, isPlaying: true };
    case "PAUSE":
      return { ...state, isPlaying: false };
    case "TOGGLE_PLAY":
      return { ...state, isPlaying: !state.isPlaying };
    case "SET_SPEED":
      return { ...state, speed: action.speed };
    case "RESET":
      return { currentIndex: 0, isPlaying: false, speed: state.speed };
    case "AUTO_STEP":
      if (state.currentIndex >= action.max) return { ...state, isPlaying: false };
      return { ...state, currentIndex: state.currentIndex + 1 };
  }
}

const initialState: State = { currentIndex: 0, isPlaying: false, speed: 1 };

export function useAlgorithmPlayer(steps: Step[]): AlgorithmPlayer {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stepsRef = useRef(steps);

  useEffect(function syncStepsRef() {
    stepsRef.current = steps;
  }, [steps]);

  const totalSteps = steps.length;
  const lastIndex = Math.max(0, totalSteps - 1);

  useEffect(function resetOnStepsChange() {
    dispatch({ type: "RESET" });
  }, [totalSteps]);

  useEffect(function autoPlayInterval() {
    if (!state.isPlaying || totalSteps === 0) return;

    const interval = setInterval(() => {
      dispatch({ type: "AUTO_STEP", max: stepsRef.current.length - 1 });
    }, 800 / state.speed);

    return function cleanup() {
      clearInterval(interval);
    };
  }, [state.isPlaying, state.speed, totalSteps]);

  return {
    currentIndex: state.currentIndex,
    currentStep: steps[state.currentIndex],
    totalSteps,
    isPlaying: state.isPlaying,
    speed: state.speed,
    isAtStart: state.currentIndex === 0,
    isAtEnd: state.currentIndex >= lastIndex,
    stepForward: () => dispatch({ type: "STEP_FORWARD", max: lastIndex }),
    stepBackward: () => dispatch({ type: "STEP_BACKWARD" }),
    jumpTo: (index: number) => dispatch({ type: "JUMP_TO", index, max: lastIndex }),
    jumpToStart: () => dispatch({ type: "JUMP_TO_START" }),
    jumpToEnd: () => dispatch({ type: "JUMP_TO_END", max: lastIndex }),
    play: () => dispatch({ type: "PLAY" }),
    pause: () => dispatch({ type: "PAUSE" }),
    togglePlay: () => dispatch({ type: "TOGGLE_PLAY" }),
    setSpeed: (speed: Speed) => dispatch({ type: "SET_SPEED", speed }),
    reset: () => dispatch({ type: "RESET" }),
  };
}
