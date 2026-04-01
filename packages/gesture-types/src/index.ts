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
