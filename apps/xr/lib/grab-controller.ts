/**
 * Object manipulation controller for XR.
 * Handles grab-translate, bimanual scale, bimanual rotate.
 *
 * Math:
 *   Translate: model.position = grabOffset + handPosition
 *   Scale:     model.scale = initialScale × (currentHandDist / initialHandDist)
 *   Rotate:    model.quaternion = deltaQ × initialQuaternion
 *              where deltaQ is rotation from initial grip axis to current grip axis
 */

import * as THREE from "three";

export interface GrabState {
  isGrabbing: boolean;
  /** Offset from hand to model origin at grab start */
  grabOffset: THREE.Vector3;
  /** Model position at grab start */
  initialPosition: THREE.Vector3;
  /** Model scale at grab start */
  initialScale: THREE.Vector3;
  /** Model quaternion at grab start */
  initialQuaternion: THREE.Quaternion;
  /** Inter-hand distance at bimanual start */
  initialBimanualDist: number;
  /** Grip axis at bimanual start */
  initialGripAxis: THREE.Vector3;
}

export function createGrabState(): GrabState {
  return {
    isGrabbing: false,
    grabOffset: new THREE.Vector3(),
    initialPosition: new THREE.Vector3(),
    initialScale: new THREE.Vector3(1, 1, 1),
    initialQuaternion: new THREE.Quaternion(),
    initialBimanualDist: 0,
    initialGripAxis: new THREE.Vector3(1, 0, 0),
  };
}

/** Start a single-hand grab. */
export function startGrab(
  state: GrabState,
  handPosition: THREE.Vector3,
  modelPosition: THREE.Vector3,
  modelScale: THREE.Vector3,
  modelQuaternion: THREE.Quaternion
): void {
  state.isGrabbing = true;
  state.grabOffset.copy(modelPosition).sub(handPosition);
  state.initialPosition.copy(modelPosition);
  state.initialScale.copy(modelScale);
  state.initialQuaternion.copy(modelQuaternion);
}

/** Update model position during single-hand grab. */
export function updateGrab(
  state: GrabState,
  handPosition: THREE.Vector3
): THREE.Vector3 {
  return new THREE.Vector3().copy(handPosition).add(state.grabOffset);
}

/** Start a bimanual (two-hand) operation. */
export function startBimanual(
  state: GrabState,
  leftPosition: THREE.Vector3,
  rightPosition: THREE.Vector3,
  modelScale: THREE.Vector3,
  modelQuaternion: THREE.Quaternion
): void {
  state.isGrabbing = true;
  state.initialBimanualDist = leftPosition.distanceTo(rightPosition);
  state.initialGripAxis.copy(rightPosition).sub(leftPosition).normalize();
  state.initialScale.copy(modelScale);
  state.initialQuaternion.copy(modelQuaternion);
}

/** Compute scale factor from bimanual pinch distance change. */
export function computeBimanualScale(
  state: GrabState,
  currentDist: number
): number {
  if (state.initialBimanualDist <= 0) return 1;
  return currentDist / state.initialBimanualDist;
}

/**
 * Compute rotation quaternion from bimanual grip axis change.
 * Rotates from initial grip axis to current grip axis.
 */
export function computeBimanualRotation(
  state: GrabState,
  currentAxis: THREE.Vector3
): THREE.Quaternion {
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(state.initialGripAxis, currentAxis);
  return q.multiply(state.initialQuaternion);
}

/** End grab/bimanual operation. */
export function endGrab(state: GrabState): void {
  state.isGrabbing = false;
}
