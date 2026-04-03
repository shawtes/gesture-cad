/** Gesture vocabulary types shared across the app. */

export type StaticGesture =
  | "point"
  | "pinch"
  | "fist"
  | "open_palm"
  | "peace"
  | "three_fingers"
  | "thumbs_up"
  | "l_shape"
  | "none"
  | "unknown";

export type TemporalGesture =
  | "swipe_left"
  | "swipe_right"
  | "swipe_up"
  | "swipe_down"
  | "pinch_drag"
  | "two_hand_pinch"
  | "two_hand_rotate";

export type Gesture = StaticGesture | TemporalGesture;

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingResult {
  landmarks: HandLandmark[];
  handedness: "Left" | "Right";
  confidence: number;
}

export interface GestureEvent {
  gesture: Gesture;
  confidence: number;
  timestamp: number;
  hand: "left" | "right" | "both";
  position?: { x: number; y: number };
}

/** Maps gestures to CAD tool activations. */
export interface GestureToolMapping {
  gesture: Gesture;
  tool: string;
  description: string;
}

export const DEFAULT_GESTURE_MAPPINGS: GestureToolMapping[] = [
  { gesture: "point", tool: "draw", description: "Draw / place point" },
  { gesture: "pinch", tool: "confirm", description: "Confirm operation" },
  { gesture: "fist", tool: "select", description: "Select object" },
  { gesture: "open_palm", tool: "pan", description: "Pan viewport" },
  { gesture: "peace", tool: "line", description: "Line tool" },
  { gesture: "three_fingers", tool: "circle", description: "Circle tool" },
  { gesture: "l_shape", tool: "rectangle", description: "Rectangle tool" },
  { gesture: "thumbs_up", tool: "apply", description: "Apply / confirm" },
  { gesture: "swipe_left", tool: "undo", description: "Undo" },
  { gesture: "swipe_right", tool: "redo", description: "Redo" },
  { gesture: "two_hand_pinch", tool: "zoom", description: "Zoom in/out" },
  { gesture: "two_hand_rotate", tool: "orbit", description: "Orbit view" },
];

// ---------- Touchscreen Gesture Engine Types ----------

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
  /** 3D world position of the hit */
  worldPosition: { x: number; y: number; z: number };
  /** Distance from camera to hit point */
  distance: number;
}

/** Context-aware action determined by hover target + gesture + tool */
export type InteractionAction =
  | "none"
  | "draw"               // Create new geometry at position
  | "select"             // Select entity/feature
  | "move"               // Move selected entity/feature
  | "extrude_interactive" // Pinch+pull to extrude
  | "pan_viewport"       // Pan the 3D viewport
  | "orbit_viewport"     // Orbit the 3D viewport
  | "zoom_viewport"      // Zoom in/out
  | "fillet_edge"        // Apply fillet to edge
  | "context_menu";      // Show context options

/** Event emitted by the gesture interaction manager */
export interface InteractionEvent {
  action: InteractionAction;
  state: TouchState;
  /** Current world position (projected to sketch plane or 3D) */
  position: { x: number; y: number; z: number };
  /** Screen-space position (NDC -1 to 1) */
  screenPosition: { x: number; y: number };
  /** What we're over */
  hitTarget: HitTarget | null;
  /** Velocity of hand movement (units per second) */
  velocity: { x: number; y: number };
  /** Which hand triggered this */
  handRole: HandRole;
  /** Delta from press start (for drag operations) */
  dragDelta?: { x: number; y: number; z: number };
  timestamp: number;
}

/** Tracked state for a single hand */
export interface TrackedHand {
  handedness: "Left" | "Right";
  role: HandRole;
  landmarks: HandLandmark[];
  gesture: StaticGesture;
  /** Index fingertip screen position (normalized 0-1) */
  screenPosition: { x: number; y: number };
  /** Pinch distance between thumb and index */
  pinchDistance: number;
  /** Is currently pinching (with hysteresis) */
  isPinching: boolean;
  confidence: number;
  timestamp: number;
}
