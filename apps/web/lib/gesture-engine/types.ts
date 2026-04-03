/**
 * Touchscreen gesture engine types.
 * Local definitions to avoid workspace package resolution issues.
 * These mirror and extend the types in packages/gesture-types.
 */

/** Touch state machine states for direct spatial manipulation */
export type TouchState = "idle" | "hover" | "press" | "drag" | "release";

/** Hand role assignment for multi-hand interaction */
export type HandRole = "dominant" | "non_dominant" | "unassigned";

/** What the cursor is currently over */
export type HitTargetType = "empty" | "entity" | "entity_endpoint" | "entity_edge" | "feature_face" | "feature_edge" | "gizmo";

export interface HitTarget {
  type: HitTargetType;
  entityId?: string;
  featureId?: string;
  worldPosition: { x: number; y: number; z: number };
  distance: number;
}

/** Context-aware action determined by hover target + gesture + tool */
export type InteractionAction =
  | "none"
  | "draw"
  | "select"
  | "move"
  | "extrude_interactive"
  | "pan_viewport"
  | "orbit_viewport"
  | "zoom_viewport"
  | "fillet_edge"
  | "context_menu";

/** Event emitted by the gesture interaction manager */
export interface InteractionEvent {
  action: InteractionAction;
  state: TouchState;
  position: { x: number; y: number; z: number };
  screenPosition: { x: number; y: number };
  hitTarget: HitTarget | null;
  velocity: { x: number; y: number };
  handRole: HandRole;
  dragDelta?: { x: number; y: number; z: number };
  timestamp: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type StaticGesture =
  | "point" | "pinch" | "fist" | "open_palm" | "peace"
  | "three_fingers" | "thumbs_up" | "l_shape" | "none" | "unknown";

/** Tracked state for a single hand */
export interface TrackedHand {
  handedness: "Left" | "Right";
  role: HandRole;
  landmarks: HandLandmark[];
  gesture: StaticGesture;
  screenPosition: { x: number; y: number };
  pinchDistance: number;
  isPinching: boolean;
  confidence: number;
  timestamp: number;
}
