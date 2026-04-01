"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import React from "react";
import type { SketchEntity } from "./sketch-entities";

// ---------- Tool types ----------
export type ToolId =
  | "select"
  | "draw"
  | "line"
  | "circle"
  | "rect"
  | "pan"
  | "confirm"
  | "extrude"
  | "undo"
  | "redo"
  | "zoom"
  | "orbit"
  | "apply";

// ---------- State ----------
export interface CADState {
  activeTool: ToolId;
  entities: SketchEntity[];
  undoStack: SketchEntity[][];
  redoStack: SketchEntity[][];
}

const initialState: CADState = {
  activeTool: "select",
  entities: [],
  undoStack: [],
  redoStack: [],
};

// ---------- Actions ----------
export type CADAction =
  | { type: "SET_TOOL"; tool: ToolId }
  | { type: "ADD_ENTITY"; entity: SketchEntity }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_ALL" };

function cadReducer(state: CADState, action: CADAction): CADState {
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, activeTool: action.tool };

    case "ADD_ENTITY":
      return {
        ...state,
        undoStack: [...state.undoStack, state.entities],
        redoStack: [],
        entities: [...state.entities, action.entity],
      };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.entities],
        entities: prev,
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.entities],
        entities: next,
      };
    }

    case "CLEAR_ALL":
      return {
        ...state,
        undoStack: [...state.undoStack, state.entities],
        redoStack: [],
        entities: [],
      };

    default:
      return state;
  }
}

// ---------- Context ----------
const CADStateContext = createContext<CADState>(initialState);
const CADDispatchContext = createContext<Dispatch<CADAction>>(() => {});

export function CADStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cadReducer, initialState);
  return React.createElement(
    CADStateContext.Provider,
    { value: state },
    React.createElement(CADDispatchContext.Provider, { value: dispatch }, children)
  );
}

export function useCADState() {
  return useContext(CADStateContext);
}

export function useCADDispatch() {
  return useContext(CADDispatchContext);
}
