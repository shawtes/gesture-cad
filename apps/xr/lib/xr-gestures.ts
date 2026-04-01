/**
 * WebXR Hand Gesture Detection.
 * Operates on XR hand joint data (25 joints per hand).
 * Returns classified gestures for CAD interaction.
 */

import * as THREE from "three";

export type XRGestureType =
  | "none"
  | "pinch"
  | "grab"
  | "point"
  | "open_palm"
  | "thumbs_up";

export interface XRGestureState {
  type: XRGestureType;
  /** Position of the gesture action point (pinch midpoint, index tip, etc.) */
  position: THREE.Vector3;
  /** Confidence 0-1 */
  confidence: number;
}

// Joint name constants (W3C WebXR Hand Input spec)
const THUMB_TIP = "thumb-tip";
const INDEX_TIP = "index-finger-tip";
const MIDDLE_TIP = "middle-finger-tip";
const RING_TIP = "ring-finger-tip";
const PINKY_TIP = "pinky-finger-tip";
const INDEX_MCP = "index-finger-metacarpal";
const MIDDLE_MCP = "middle-finger-metacarpal";
const RING_MCP = "ring-finger-metacarpal";
const PINKY_MCP = "pinky-finger-metacarpal";
const WRIST = "wrist";

const PINCH_THRESHOLD = 0.02; // 2cm
const GRAB_FLEX_THRESHOLD = 0.04; // fingertip-to-MCP distance threshold

/**
 * Classify gesture from XR hand joint positions.
 * @param joints Map of joint name → THREE.Vector3 position
 */
export function classifyXRGesture(
  joints: Map<string, THREE.Vector3>
): XRGestureState {
  const thumbTip = joints.get(THUMB_TIP);
  const indexTip = joints.get(INDEX_TIP);
  const middleTip = joints.get(MIDDLE_TIP);
  const ringTip = joints.get(RING_TIP);
  const pinkyTip = joints.get(PINKY_TIP);
  const indexMcp = joints.get(INDEX_MCP);
  const middleMcp = joints.get(MIDDLE_MCP);
  const ringMcp = joints.get(RING_MCP);
  const pinkyMcp = joints.get(PINKY_MCP);
  const wrist = joints.get(WRIST);

  if (!thumbTip || !indexTip || !wrist) {
    return { type: "none", position: new THREE.Vector3(), confidence: 0 };
  }

  // Pinch: thumb-tip ↔ index-tip distance < 2cm
  const pinchDist = thumbTip.distanceTo(indexTip);
  if (pinchDist < PINCH_THRESHOLD) {
    const midpoint = new THREE.Vector3().addVectors(thumbTip, indexTip).multiplyScalar(0.5);
    return { type: "pinch", position: midpoint, confidence: 1 - pinchDist / PINCH_THRESHOLD };
  }

  // Grab: all finger tips close to their MCPs (fist)
  const isFlexed = (tip: THREE.Vector3 | undefined, mcp: THREE.Vector3 | undefined) => {
    if (!tip || !mcp) return false;
    return tip.distanceTo(mcp) < GRAB_FLEX_THRESHOLD * 3;
  };

  if (
    isFlexed(indexTip, indexMcp) &&
    isFlexed(middleTip, middleMcp) &&
    isFlexed(ringTip, ringMcp) &&
    isFlexed(pinkyTip, pinkyMcp)
  ) {
    const palmCenter = new THREE.Vector3().addVectors(indexMcp!, pinkyMcp!).multiplyScalar(0.5);
    return { type: "grab", position: palmCenter, confidence: 0.9 };
  }

  // Point: only index extended (tip far from MCP), others curled
  const indexExtended = indexTip.distanceTo(indexMcp!) > GRAB_FLEX_THRESHOLD * 4;
  const middleCurled = isFlexed(middleTip, middleMcp);
  const ringCurled = isFlexed(ringTip, ringMcp);
  const pinkyCurled = isFlexed(pinkyTip, pinkyMcp);

  if (indexExtended && middleCurled && ringCurled && pinkyCurled) {
    return { type: "point", position: indexTip.clone(), confidence: 0.85 };
  }

  // Open palm: all fingers extended
  const allExtended =
    indexExtended &&
    !isFlexed(middleTip, middleMcp) &&
    !isFlexed(ringTip, ringMcp) &&
    !isFlexed(pinkyTip, pinkyMcp);

  if (allExtended) {
    const palmCenter = new THREE.Vector3().addVectors(indexMcp!, pinkyMcp!).multiplyScalar(0.5);
    return { type: "open_palm", position: palmCenter, confidence: 0.8 };
  }

  return { type: "none", position: indexTip.clone(), confidence: 0 };
}

/**
 * Bimanual gesture detection.
 * Takes two hand gesture states and computes bimanual operations.
 */
export interface BimanualState {
  /** Distance between hands (for scale) */
  distance: number;
  /** Midpoint between hands */
  center: THREE.Vector3;
  /** Axis from left to right hand (for rotation) */
  axis: THREE.Vector3;
  /** Both hands pinching? */
  bothPinching: boolean;
  /** Both hands grabbing? */
  bothGrabbing: boolean;
}

export function detectBimanual(
  left: XRGestureState,
  right: XRGestureState
): BimanualState {
  const distance = left.position.distanceTo(right.position);
  const center = new THREE.Vector3().addVectors(left.position, right.position).multiplyScalar(0.5);
  const axis = new THREE.Vector3().subVectors(right.position, left.position).normalize();

  return {
    distance,
    center,
    axis,
    bothPinching: left.type === "pinch" && right.type === "pinch",
    bothGrabbing: left.type === "grab" && right.type === "grab",
  };
}
