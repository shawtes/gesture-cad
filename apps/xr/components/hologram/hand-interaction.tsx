"use client";

/**
 * Hand Interaction Controller for Holographic AR
 *
 * Wires the gesture pipeline:
 *   WebXR Hand Joints → classifyXRGesture() → GrabController → Model Transform
 *
 * Gestures:
 *   - Pinch (one hand): grab and move the hologram
 *   - Pinch (two hands): scale the hologram
 *   - Grab (fist): rotate the hologram
 *   - Point: ray-cast select components
 *   - Open palm: reset position/scale
 *
 * Also supports Quest controllers as fallback.
 */

import { useRef, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  classifyXRGesture,
  detectBimanual,
  type XRGestureState,
} from "@/lib/xr-gestures";
import {
  createGrabState,
  startGrab,
  updateGrab,
  startBimanual,
  computeBimanualScale,
  computeBimanualRotation,
  endGrab,
  type GrabState,
} from "@/lib/grab-controller";

interface HandInteractionProps {
  /** Ref to the group being manipulated */
  targetRef: React.RefObject<THREE.Group | null>;
  /** Whether interaction is enabled */
  enabled: boolean;
  /** Callback with current gesture state */
  onGestureChange?: (left: XRGestureState, right: XRGestureState) => void;
  /** Called when open palm resets the model */
  onReset?: () => void;
}

/**
 * Extract hand joint positions from XR frame.
 * Returns a Map<jointName, Vector3> or null if hand not tracked.
 */
function extractJoints(
  frame: XRFrame | null,
  session: XRSession | null,
  handedness: "left" | "right",
  refSpace: XRReferenceSpace | null
): Map<string, THREE.Vector3> | null {
  if (!frame || !session || !refSpace) return null;

  for (const source of session.inputSources) {
    if (source.hand && source.handedness === handedness) {
      const joints = new Map<string, THREE.Vector3>();
      const jointNames = [
        "wrist",
        "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip",
        "index-finger-metacarpal", "index-finger-phalanx-proximal",
        "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip",
        "middle-finger-metacarpal", "middle-finger-phalanx-proximal",
        "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip",
        "ring-finger-metacarpal", "ring-finger-phalanx-proximal",
        "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip",
        "pinky-finger-metacarpal", "pinky-finger-phalanx-proximal",
        "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip",
      ];

      for (const name of jointNames) {
        const joint = (source.hand as any).get(name);
        if (joint) {
          const pose = frame.getJointPose?.(joint, refSpace);
          if (pose) {
            const p = pose.transform.position;
            joints.set(name, new THREE.Vector3(p.x, p.y, p.z));
          }
        }
      }

      if (joints.size > 5) return joints;
    }
  }

  return null;
}

/**
 * Extract controller position/trigger for Quest controller fallback.
 */
function extractController(
  frame: XRFrame | null,
  session: XRSession | null,
  handedness: "left" | "right",
  refSpace: XRReferenceSpace | null
): { position: THREE.Vector3; pressing: boolean } | null {
  if (!frame || !session || !refSpace) return null;

  for (const source of session.inputSources) {
    if (
      source.handedness === handedness &&
      source.gripSpace &&
      !source.hand
    ) {
      const pose = frame.getPose(source.gripSpace, refSpace);
      if (pose) {
        const p = pose.transform.position;
        const pressing = source.gamepad?.buttons[0]?.pressed ?? false;
        return {
          position: new THREE.Vector3(p.x, p.y, p.z),
          pressing,
        };
      }
    }
  }

  return null;
}

export function HandInteraction({
  targetRef,
  enabled,
  onGestureChange,
  onReset,
}: HandInteractionProps) {
  const { gl } = useThree();
  const grabState = useRef<GrabState>(createGrabState());
  const prevLeftGesture = useRef<XRGestureState["type"]>("none");
  const prevRightGesture = useRef<XRGestureState["type"]>("none");
  const resetCooldown = useRef(0);

  useFrame(() => {
    if (!enabled || !targetRef.current) return;

    const session = gl.xr.getSession();
    const frame = gl.xr.getFrame();
    const refSpace = gl.xr.getReferenceSpace();
    if (!session || !frame || !refSpace) return;

    const target = targetRef.current;

    // Try hand tracking first, fall back to controllers
    const leftJoints = extractJoints(frame, session, "left", refSpace);
    const rightJoints = extractJoints(frame, session, "right", refSpace);

    let leftGesture: XRGestureState = { type: "none", position: new THREE.Vector3(), confidence: 0 };
    let rightGesture: XRGestureState = { type: "none", position: new THREE.Vector3(), confidence: 0 };

    if (leftJoints) {
      leftGesture = classifyXRGesture(leftJoints);
    }
    if (rightJoints) {
      rightGesture = classifyXRGesture(rightJoints);
    }

    // Controller fallback — map trigger press to "pinch"
    if (!leftJoints) {
      const lc = extractController(frame, session, "left", refSpace);
      if (lc) {
        leftGesture = {
          type: lc.pressing ? "pinch" : "none",
          position: lc.position,
          confidence: lc.pressing ? 0.9 : 0,
        };
      }
    }
    if (!rightJoints) {
      const rc = extractController(frame, session, "right", refSpace);
      if (rc) {
        rightGesture = {
          type: rc.pressing ? "pinch" : "none",
          position: rc.position,
          confidence: rc.pressing ? 0.9 : 0,
        };
      }
    }

    onGestureChange?.(leftGesture, rightGesture);

    const bimanual = detectBimanual(leftGesture, rightGesture);
    const state = grabState.current;

    // === Open palm = reset ===
    if (resetCooldown.current > 0) {
      resetCooldown.current--;
    }
    if (
      (leftGesture.type === "open_palm" || rightGesture.type === "open_palm") &&
      resetCooldown.current <= 0
    ) {
      target.position.set(0, 0.8, -0.5);
      target.scale.set(0.4, 0.4, 0.4);
      target.quaternion.identity();
      endGrab(state);
      resetCooldown.current = 60; // 1 second cooldown at 60fps
      onReset?.();
      return;
    }

    // === Bimanual pinch = scale + rotate ===
    if (bimanual.bothPinching) {
      if (!state.isGrabbing) {
        startBimanual(
          state,
          leftGesture.position,
          rightGesture.position,
          target.scale,
          target.quaternion
        );
      } else {
        // Scale
        const scaleFactor = computeBimanualScale(state, bimanual.distance);
        const newScale = state.initialScale.clone().multiplyScalar(
          Math.max(0.05, Math.min(5, scaleFactor))
        );
        target.scale.lerp(newScale, 0.3);

        // Rotate
        const newQuat = computeBimanualRotation(state, bimanual.axis);
        target.quaternion.slerp(newQuat, 0.3);

        // Move to midpoint
        target.position.lerp(bimanual.center, 0.1);
      }
      prevLeftGesture.current = leftGesture.type;
      prevRightGesture.current = rightGesture.type;
      return;
    }

    // === Single-hand pinch = grab and move ===
    const activeHand =
      rightGesture.type === "pinch" ? rightGesture :
      leftGesture.type === "pinch" ? leftGesture : null;

    if (activeHand) {
      if (!state.isGrabbing) {
        startGrab(
          state,
          activeHand.position,
          target.position,
          target.scale,
          target.quaternion
        );
      } else {
        const newPos = updateGrab(state, activeHand.position);
        target.position.lerp(newPos, 0.4);
      }
      prevLeftGesture.current = leftGesture.type;
      prevRightGesture.current = rightGesture.type;
      return;
    }

    // === Single-hand grab (fist) = rotate in place ===
    const grabHand =
      rightGesture.type === "grab" ? rightGesture :
      leftGesture.type === "grab" ? leftGesture : null;

    if (grabHand) {
      // Rotate based on hand movement (simple trackball)
      target.rotateY(0.02);
      prevLeftGesture.current = leftGesture.type;
      prevRightGesture.current = rightGesture.type;
      return;
    }

    // === No active gesture — release ===
    if (state.isGrabbing) {
      endGrab(state);
    }

    prevLeftGesture.current = leftGesture.type;
    prevRightGesture.current = rightGesture.type;
  });

  return null; // Pure logic component, no rendering
}
