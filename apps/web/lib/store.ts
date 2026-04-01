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
import type { SketchConstraint } from "./constraints";

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
  constraints: SketchConstraint[];
  constraintStatus: "idle" | "solved" | "failed" | "overconstrained";
  undoStack: { entities: SketchEntity[]; constraints: SketchConstraint[] }[];
  redoStack: { entities: SketchEntity[]; constraints: SketchConstraint[] }[];
}

const initialState: CADState = {
  activeTool: "select",
  entities: [],
  constraints: [],
  constraintStatus: "idle",
  undoStack: [],
  redoStack: [],
};

// ---------- Actions ----------
export type CADAction =
  | { type: "SET_TOOL"; tool: ToolId }
  | { type: "ADD_ENTITY"; entity: SketchEntity }
  | { type: "ADD_CONSTRAINTS"; constraints: SketchConstraint[] }
  | { type: "UPDATE_ENTITIES_FROM_SOLVER"; entities: SketchEntity[]; status: CADState["constraintStatus"] }
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
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints }],
        redoStack: [],
        entities: [...state.entities, action.entity],
      };

    case "ADD_CONSTRAINTS":
      return {
        ...state,
        constraints: [...state.constraints, ...action.constraints],
      };

    case "UPDATE_ENTITIES_FROM_SOLVER":
      return {
        ...state,
        entities: action.entities,
        constraintStatus: action.status,
      };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { entities: state.entities, constraints: state.constraints }],
        entities: prev.entities,
        constraints: prev.constraints,
        constraintStatus: prev.constraints.length > 0 ? "solved" : "idle",
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints }],
        entities: next.entities,
        constraints: next.constraints,
        constraintStatus: next.constraints.length > 0 ? "solved" : "idle",
      };
    }

    case "CLEAR_ALL":
      return {
        ...state,
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints }],
        redoStack: [],
        entities: [],
        constraints: [],
        constraintStatus: "idle",
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
