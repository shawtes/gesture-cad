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
import type { Feature } from "./features";
import type { NamedParameter } from "./parameters";
import { createDefaultParameters } from "./parameters";

// ---------- Tool types ----------
export type ToolId =
  | "select"
  | "draw"
  | "line"
  | "circle"
  | "rect"
  | "arc"
  | "spline"
  | "ellipse"
  | "slot"
  | "polygon"
  | "trim"
  | "offset"
  | "construction"
  | "pan"
  | "confirm"
  | "extrude"
  | "revolve_tool"
  | "undo"
  | "redo"
  | "zoom"
  | "orbit"
  | "apply"
  | "union"
  | "subtract"
  | "intersect"
  | "fillet"
  | "chamfer"
  | "shell"
  | "draft"
  | "hole"
  | "rib"
  | "split"
  | "thicken"
  | "helix"
  | "linear_pattern"
  | "circular_pattern"
  | "curve_pattern"
  | "mirror"
  | "sweep"
  | "loft"
  | "dimension"
  | "custom_plane"
  | "sketch_3d"
  | "emboss"
  | "center_rect"
  | "three_point_circle"
  | "tangent_arc"
  | "sketch_text"
  | "sketch_linear_pattern"
  | "sketch_circular_pattern"
  | "use_project"
  | "external_thread"
  | "modify_fillet"
  | "move_face"
  | "delete_face"
  | "replace_face"
  | "offset_face"
  | "delete_part"
  | "transform_part"
  | "mate_connector"
  | "construction_axis"
  | "construction_point"
  | "frame_tool"
  // Blender 3D character pipeline tools
  | "edit_mode"
  | "sculpt_mode"
  | "vertex_select"
  | "edge_select"
  | "face_select"
  | "mesh_extrude"
  | "mesh_subdivide"
  | "loop_cut"
  | "knife"
  | "inset"
  | "bevel"
  | "mesh_mirror"
  | "catmull_clark"
  | "skin_modifier"
  | "sculpt_grab"
  | "sculpt_smooth"
  | "sculpt_inflate"
  | "sculpt_pinch"
  | "sculpt_crease"
  | "sculpt_flatten"
  | "uv_unwrap"
  | "uv_edit"
  | "seam_mark"
  | "texture_paint"
  | "vertex_paint"
  | "material_edit"
  | "shader_edit"
  | "add_bone"
  | "bone_edit"
  | "ik_setup"
  | "weight_paint"
  | "morph_target"
  | "auto_rig"
  | "keyframe_add"
  | "timeline"
  | "graph_editor"
  | "nla_edit"
  | "play_animation"
  | "path_trace"
  | "post_process"
  | "lighting_rig"
  | "render_capture"
  | "asset_library";

/** Sketch plane: standard planes, custom plane by ID, or "3d" for freeform 3D sketching */
export type SketchPlaneId = "xz" | "xy" | "yz" | "3d" | string;

// ---------- State ----------
/** Interaction mode for the viewport */
export type InteractionMode = "object" | "edit" | "sculpt" | "weight_paint" | "texture_paint" | "uv_edit";

/** Selection mode within edit mode */
export type EditSelectionMode = "vertex" | "edge" | "face";

export interface CADState {
  activeTool: ToolId;
  entities: SketchEntity[];
  constraints: SketchConstraint[];
  constraintStatus: "idle" | "solved" | "failed" | "overconstrained";
  features: Feature[];
  selectedFeatureId: string | null;
  /** Currently selected entity IDs (multi-select with shift) */
  selectedEntityIds: string[];
  /** Entity ID currently hovered by the gesture cursor */
  hoveredEntityId: string | null;
  sketchPlane: SketchPlaneId;
  parameters: NamedParameter[];
  customPlanes: { id: string; name: string; normal: [number, number, number]; offset: number }[];
  namedViews: { id: string; name: string; position: [number, number, number]; target: [number, number, number] }[];
  undoStack: { entities: SketchEntity[]; constraints: SketchConstraint[]; features: Feature[] }[];
  redoStack: { entities: SketchEntity[]; constraints: SketchConstraint[]; features: Feature[] }[];
  // Blender 3D pipeline state
  interactionMode: InteractionMode;
  editSelectionMode: EditSelectionMode;
  /** Active brush for sculpt mode */
  sculptBrush: "grab" | "smooth" | "inflate" | "pinch" | "crease" | "flatten";
  sculptRadius: number;
  sculptStrength: number;
  /** Animation playback state */
  isAnimationPlaying: boolean;
  animationTime: number;
  animationFps: number;
  /** Active panel tabs */
  bottomPanel: "none" | "timeline" | "graph_editor" | "nla" | "uv_editor" | "shader_editor";
}

const initialState: CADState = {
  activeTool: "select",
  entities: [],
  constraints: [],
  constraintStatus: "idle",
  features: [],
  selectedFeatureId: null,
  selectedEntityIds: [],
  hoveredEntityId: null,
  sketchPlane: "xz" as SketchPlaneId,
  parameters: createDefaultParameters(),
  customPlanes: [],
  namedViews: [],
  undoStack: [],
  redoStack: [],
  // Blender 3D pipeline defaults
  interactionMode: "object" as InteractionMode,
  editSelectionMode: "vertex" as EditSelectionMode,
  sculptBrush: "grab" as const,
  sculptRadius: 50,
  sculptStrength: 0.5,
  isAnimationPlaying: false,
  animationTime: 0,
  animationFps: 24,
  bottomPanel: "none" as const,
};

// ---------- Actions ----------
export type CADAction =
  | { type: "SET_TOOL"; tool: ToolId }
  | { type: "ADD_ENTITY"; entity: SketchEntity }
  | { type: "ADD_CONSTRAINTS"; constraints: SketchConstraint[] }
  | { type: "UPDATE_ENTITIES_FROM_SOLVER"; entities: SketchEntity[]; status: CADState["constraintStatus"] }
  | { type: "ADD_FEATURE"; feature: Feature }
  | { type: "UPDATE_FEATURE"; id: string; updates: Partial<Feature> }
  | { type: "SELECT_FEATURE"; id: string | null }
  | { type: "TOGGLE_FEATURE_VISIBILITY"; id: string }
  | { type: "SET_SKETCH_PLANE"; plane: SketchPlaneId }
  | { type: "SET_PARAMETER"; name: string; value: number; expression?: string }
  | { type: "ADD_PARAMETER"; param: NamedParameter }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_ALL" }
  // Touchscreen gesture engine actions
  | { type: "SELECT_ENTITY"; entityId: string }
  | { type: "DESELECT_ALL" }
  | { type: "HOVER_ENTITY"; entityId: string | null }
  | { type: "MOVE_ENTITY"; entityId: string; dx: number; dz: number }
  | { type: "REMOVE_ENTITY"; entityId: string }
  | { type: "TOGGLE_CONSTRUCTION"; entityId: string }
  | { type: "REPLACE_ENTITIES"; oldId: string; newEntities: SketchEntity[] }
  | { type: "REORDER_FEATURE"; fromIndex: number; toIndex: number }
  | { type: "ADD_CUSTOM_PLANE"; plane: { id: string; name: string; normal: [number, number, number]; offset: number } }
  | { type: "ADD_NAMED_VIEW"; view: { id: string; name: string; position: [number, number, number]; target: [number, number, number] } }
  | { type: "DELETE_NAMED_VIEW"; id: string }
  // Blender 3D pipeline actions
  | { type: "SET_INTERACTION_MODE"; mode: InteractionMode }
  | { type: "SET_EDIT_SELECTION_MODE"; mode: EditSelectionMode }
  | { type: "SET_SCULPT_BRUSH"; brush: CADState["sculptBrush"] }
  | { type: "SET_SCULPT_PARAMS"; radius?: number; strength?: number }
  | { type: "SET_ANIMATION_PLAYING"; playing: boolean }
  | { type: "SET_ANIMATION_TIME"; time: number }
  | { type: "SET_ANIMATION_FPS"; fps: number }
  | { type: "SET_BOTTOM_PANEL"; panel: CADState["bottomPanel"] };

function cadReducer(state: CADState, action: CADAction): CADState {
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, activeTool: action.tool };

    case "ADD_ENTITY":
      return {
        ...state,
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        redoStack: [],
        entities: [...state.entities, action.entity],
      };

    case "ADD_FEATURE":
      return {
        ...state,
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        redoStack: [],
        features: [...state.features, action.feature],
      };

    case "UPDATE_FEATURE":
      return {
        ...state,
        features: state.features.map((f) =>
          f.id === action.id ? { ...f, ...action.updates } : f
        ),
      };

    case "SELECT_FEATURE":
      return { ...state, selectedFeatureId: action.id };

    case "TOGGLE_FEATURE_VISIBILITY":
      return {
        ...state,
        features: state.features.map((f) =>
          f.id === action.id ? { ...f, visible: !f.visible } : f
        ),
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

    case "SET_SKETCH_PLANE":
      return { ...state, sketchPlane: action.plane };

    case "SET_PARAMETER":
      return {
        ...state,
        parameters: state.parameters.map((p) =>
          p.name === action.name
            ? { ...p, value: action.value, expression: action.expression }
            : p
        ),
      };

    case "ADD_PARAMETER":
      return {
        ...state,
        parameters: [...state.parameters, action.param],
      };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        entities: prev.entities,
        constraints: prev.constraints,
        features: prev.features,
        constraintStatus: prev.constraints.length > 0 ? "solved" : "idle",
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        entities: next.entities,
        constraints: next.constraints,
        features: next.features,
        constraintStatus: next.constraints.length > 0 ? "solved" : "idle",
      };
    }

    case "CLEAR_ALL":
      return {
        ...state,
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        redoStack: [],
        entities: [],
        constraints: [],
        features: [],
        constraintStatus: "idle",
      };

    // Touchscreen gesture engine actions
    case "SELECT_ENTITY": {
      const id = action.entityId;
      const already = state.selectedEntityIds.includes(id);
      return {
        ...state,
        selectedEntityIds: already
          ? state.selectedEntityIds.filter((e) => e !== id)
          : [...state.selectedEntityIds, id],
      };
    }

    case "DESELECT_ALL":
      return { ...state, selectedEntityIds: [], selectedFeatureId: null };

    case "HOVER_ENTITY":
      return { ...state, hoveredEntityId: action.entityId };

    case "MOVE_ENTITY": {
      return {
        ...state,
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        redoStack: [],
        entities: state.entities.map((e) => {
          if (e.id !== action.entityId) return e;
          switch (e.type) {
            case "point":
              return { ...e, x: e.x + action.dx, z: e.z + action.dz };
            case "line":
              return { ...e, x1: e.x1 + action.dx, z1: e.z1 + action.dz, x2: e.x2 + action.dx, z2: e.z2 + action.dz };
            case "circle":
              return { ...e, cx: e.cx + action.dx, cz: e.cz + action.dz };
            case "rect":
              return { ...e, x1: e.x1 + action.dx, z1: e.z1 + action.dz, x2: e.x2 + action.dx, z2: e.z2 + action.dz };
            case "arc":
              return { ...e, x1: e.x1 + action.dx, z1: e.z1 + action.dz, mx: e.mx + action.dx, mz: e.mz + action.dz, x2: e.x2 + action.dx, z2: e.z2 + action.dz };
            case "spline":
              return { ...e, points: e.points.map((v, i) => i % 2 === 0 ? v + action.dx : v + action.dz) };
            case "ellipse":
              return { ...e, cx: e.cx + action.dx, cz: e.cz + action.dz };
            case "slot":
              return { ...e, x1: e.x1 + action.dx, z1: e.z1 + action.dz, x2: e.x2 + action.dx, z2: e.z2 + action.dz };
            case "polygon":
              return { ...e, cx: e.cx + action.dx, cz: e.cz + action.dz };
            default:
              return e;
          }
        }),
      };
    }

    case "REMOVE_ENTITY":
      return {
        ...state,
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        redoStack: [],
        entities: state.entities.filter((e) => e.id !== action.entityId),
        selectedEntityIds: state.selectedEntityIds.filter((id) => id !== action.entityId),
      };

    case "TOGGLE_CONSTRUCTION":
      return {
        ...state,
        entities: state.entities.map((e) =>
          e.id === action.entityId ? { ...e, isConstruction: !e.isConstruction } : e
        ),
      };

    case "REPLACE_ENTITIES": {
      // Replace one entity with multiple (used by trim/split operations)
      const idx = state.entities.findIndex((e) => e.id === action.oldId);
      if (idx === -1) return state;
      const newEntities = [...state.entities];
      newEntities.splice(idx, 1, ...action.newEntities);
      return {
        ...state,
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        redoStack: [],
        entities: newEntities,
      };
    }

    case "REORDER_FEATURE": {
      const newFeatures = [...state.features];
      const [moved] = newFeatures.splice(action.fromIndex, 1);
      newFeatures.splice(action.toIndex, 0, moved);
      return {
        ...state,
        undoStack: [...state.undoStack, { entities: state.entities, constraints: state.constraints, features: state.features }],
        redoStack: [],
        features: newFeatures,
      };
    }

    case "ADD_CUSTOM_PLANE":
      return { ...state, customPlanes: [...state.customPlanes, action.plane] };

    case "ADD_NAMED_VIEW":
      return { ...state, namedViews: [...state.namedViews, action.view] };
    case "DELETE_NAMED_VIEW":
      return { ...state, namedViews: state.namedViews.filter((v) => v.id !== action.id) };

    // Blender 3D pipeline reducers
    case "SET_INTERACTION_MODE":
      return { ...state, interactionMode: action.mode };
    case "SET_EDIT_SELECTION_MODE":
      return { ...state, editSelectionMode: action.mode };
    case "SET_SCULPT_BRUSH":
      return { ...state, sculptBrush: action.brush };
    case "SET_SCULPT_PARAMS":
      return {
        ...state,
        ...(action.radius !== undefined && { sculptRadius: action.radius }),
        ...(action.strength !== undefined && { sculptStrength: action.strength }),
      };
    case "SET_ANIMATION_PLAYING":
      return { ...state, isAnimationPlaying: action.playing };
    case "SET_ANIMATION_TIME":
      return { ...state, animationTime: action.time };
    case "SET_ANIMATION_FPS":
      return { ...state, animationFps: action.fps };
    case "SET_BOTTOM_PANEL":
      return { ...state, bottomPanel: action.panel };

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
